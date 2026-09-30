-- =====================================================================
-- Hardening (post-review):
--  * Out-of-stock on one variant no longer pauses the whole product;
--    per-variant stock is enforced in cart/checkout. Discontinued variants
--    are excluded from the active set.
--  * RLS: user_roles managed by SUPER_ADMIN only; PII/payment tables readable
--    only by ADMIN / CUSTOMER_SUPPORT (not every staff role).
--  * Gelato generic product creation is not supported (template-only).
-- =====================================================================

create or replace function public.product_eligibility(p_product_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.products%rowtype;
  m public.product_provider_mappings%rowtype;
  failures text[] := '{}';
  v_active_variants int;
  v_mapped_variants int;
  v_sellable_variants int;
  v_unpriced_variants int;
  v_images int;
  v_order_api boolean;
  v_provider_active boolean;
begin
  select * into p from public.products where id = p_product_id;
  if not found then
    return jsonb_build_object('eligible', false, 'failures', jsonb_build_array('PRODUCT_NOT_FOUND'));
  end if;

  select * into m from public.product_provider_mappings
   where product_id = p_product_id and role = 'PRIMARY' and active;

  if not found then
    failures := array_append(failures, 'NO_PRIMARY_PROVIDER_MAPPING');
  else
    select coalesce(bool_or(pc.supported), false) into v_order_api
      from public.provider_capabilities pc
     where pc.provider_id = m.provider_id and pc.capability = 'order_api';
    select active into v_provider_active from public.providers where id = m.provider_id;

    if not coalesce(v_provider_active, false) then failures := array_append(failures, 'PROVIDER_INACTIVE'); end if;
    if not coalesce(v_order_api, false) then failures := array_append(failures, 'PROVIDER_NO_ORDER_API'); end if;
    if coalesce(m.provider_product_id, '') = '' then failures := array_append(failures, 'MISSING_PROVIDER_PRODUCT_ID'); end if;
    if m.print_config is null or m.print_config = '{}'::jsonb then failures := array_append(failures, 'MISSING_PRINT_CONFIG'); end if;
    if coalesce(m.fulfillment_method, '') = '' then failures := array_append(failures, 'MISSING_FULFILLMENT_METHOD'); end if;
    if not m.approved then failures := array_append(failures, 'MAPPING_NOT_APPROVED'); end if;
    if m.test_passed_at is null then failures := array_append(failures, 'FULFILLMENT_TEST_NOT_PASSED'); end if;

    -- active = not deactivated and not discontinued (at our side or the provider's)
    select count(*) into v_active_variants
      from public.product_variants v
      left join public.variant_provider_mappings vm on vm.variant_id = v.id and vm.mapping_id = m.id
     where v.product_id = p_product_id and v.active and v.stock_status <> 'DISCONTINUED'
       and coalesce(vm.status, 'ACTIVE') <> 'DISCONTINUED';

    -- mapped regardless of temporary stock state
    select count(*) into v_mapped_variants
      from public.product_variants v
      join public.variant_provider_mappings vm on vm.variant_id = v.id and vm.mapping_id = m.id
     where v.product_id = p_product_id and v.active and v.stock_status <> 'DISCONTINUED'
       and vm.status <> 'DISCONTINUED' and coalesce(vm.provider_variant_id, '') <> '';

    select count(*) into v_sellable_variants
      from public.product_variants v
      join public.variant_provider_mappings vm on vm.variant_id = v.id and vm.mapping_id = m.id
     where v.product_id = p_product_id and v.active and v.stock_status not in ('DISCONTINUED','OUT_OF_STOCK')
       and vm.status = 'ACTIVE';

    if v_active_variants = 0 then failures := array_append(failures, 'NO_ACTIVE_VARIANTS'); end if;
    if v_mapped_variants < v_active_variants then failures := array_append(failures, 'UNMAPPED_VARIANTS'); end if;
    if v_active_variants > 0 and v_sellable_variants = 0 then failures := array_append(failures, 'ALL_VARIANTS_OUT_OF_STOCK'); end if;

    select count(*) into v_unpriced_variants from public.product_variants v
     where v.product_id = p_product_id and v.active and v.stock_status <> 'DISCONTINUED'
       and coalesce(v.production_cost, p.production_cost) is null;
    if v_unpriced_variants > 0 then failures := array_append(failures, 'MISSING_PRODUCTION_COST'); end if;
  end if;

  if p.retail_price is null or p.retail_price <= 0 then failures := array_append(failures, 'MISSING_RETAIL_PRICE'); end if;
  select count(*) into v_images from public.product_images where product_id = p_product_id and kind <> 'PRINT_FILE';
  if v_images = 0 then failures := array_append(failures, 'MISSING_IMAGES'); end if;
  if coalesce(trim(p.name), '') = '' or coalesce(trim(p.slug), '') = '' or coalesce(trim(p.description), '') = '' then
    failures := array_append(failures, 'INCOMPLETE_CONTENT');
  end if;
  if not p.brand_approved then failures := array_append(failures, 'NOT_BRAND_APPROVED'); end if;

  return jsonb_build_object('eligible', coalesce(array_length(failures, 1), 0) = 0, 'failures', to_jsonb(failures), 'checked_at', now());
end $$;

-- Cart/order guard: the specific variant must be sellable (not out of stock / discontinued)
create or replace function public.guard_order_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (p.status = 'PUBLISHED' and p.fulfillment_eligible and v.active and v.product_id = p.id
          and v.stock_status not in ('OUT_OF_STOCK','DISCONTINUED'))
    into ok
    from public.products p join public.product_variants v on v.id = new.variant_id
   where p.id = new.product_id;
  if not coalesce(ok, false) then
    raise exception 'Product % / variant % is not purchasable (not API-fulfillable)', new.product_id, new.variant_id
      using errcode = 'P0001';
  end if;
  return new;
end $$;

-- RLS: role management only by SUPER_ADMIN
drop policy if exists staff_all on public.user_roles;
drop policy if exists staff_read on public.user_roles;
create policy super_admin_all on public.user_roles for all to authenticated
  using (public.has_staff_role(array['SUPER_ADMIN'])) with check (public.has_staff_role(array['SUPER_ADMIN']));
create policy own_roles on public.user_roles for select to authenticated using (user_id = auth.uid());

-- RLS: PII / payments / raw payloads only for ADMIN + CUSTOMER_SUPPORT
do $$
declare t text;
begin
  foreach t in array array['customers','customer_events','orders','order_items','order_events','shipments','tracking_events',
    'payments','refunds','carts','cart_items','email_events','gdpr_requests','newsletter_subscribers','profiles',
    'webhook_events','audit_logs','fulfillment_orders','fulfillment_items','fulfillment_errors','discount_usage','creator_commissions'] loop
    execute format('drop policy if exists staff_read on public.%I', t);
    execute format('create policy staff_read_restricted on public.%I for select to authenticated using (public.has_staff_role(array[''ADMIN'',''CUSTOMER_SUPPORT'']))', t);
  end loop;
end $$;

update public.provider_capabilities set supported = false, notes = 'Template-only (templates made in Gelato UI) — generic creation unsupported'
 where provider_id = 'gelato' and capability = 'product_creation_api';
