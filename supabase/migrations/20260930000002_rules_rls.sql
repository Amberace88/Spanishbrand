-- =====================================================================
-- HARD SYSTEM RULE: API_FULFILLMENT_ELIGIBILITY must be TRUE to publish
-- Mirrors src/lib/products/eligibility.ts — DB is the last line of defense.
-- =====================================================================

create or replace function public.product_eligibility(p_product_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.products%rowtype;
  m public.product_provider_mappings%rowtype;
  failures text[] := '{}';
  v_active_variants int;
  v_mapped_variants int;
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

    select count(*) into v_active_variants from public.product_variants v
     where v.product_id = p_product_id and v.active and v.stock_status <> 'DISCONTINUED';

    select count(*) into v_mapped_variants
      from public.product_variants v
      join public.variant_provider_mappings vm on vm.variant_id = v.id and vm.mapping_id = m.id
     where v.product_id = p_product_id and v.active and vm.status = 'ACTIVE'
       and coalesce(vm.provider_variant_id, '') <> '';

    if v_active_variants = 0 then failures := array_append(failures, 'NO_ACTIVE_VARIANTS'); end if;
    if v_mapped_variants < v_active_variants then failures := array_append(failures, 'UNMAPPED_VARIANTS'); end if;

    select count(*) into v_unpriced_variants from public.product_variants v
     where v.product_id = p_product_id and v.active
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

  return jsonb_build_object(
    'eligible', coalesce(array_length(failures, 1), 0) = 0,
    'failures', to_jsonb(failures),
    'checked_at', now()
  );
end $$;

-- Recompute eligibility (called by app after mapping/variant changes)
create or replace function public.refresh_product_eligibility(p_product_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  r := public.product_eligibility(p_product_id);
  update public.products
     set fulfillment_eligible = (r->>'eligible')::boolean,
         eligibility_report = r,
         eligibility_checked_at = now(),
         -- a published product that lost eligibility is pulled from sale immediately
         status = case when status = 'PUBLISHED' and not (r->>'eligible')::boolean then 'PAUSED' else status end
   where id = p_product_id;
  return r;
end $$;

-- Guard: products can only enter/stay PUBLISHED when eligible
create or replace function public.guard_product_publish()
returns trigger language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if new.status = 'PUBLISHED' then
    r := public.product_eligibility(new.id);
    -- evaluate row-level fields from NEW (they may not be committed yet)
    if new.retail_price is null or new.retail_price <= 0 or not new.brand_approved
       or coalesce(trim(new.description), '') = '' or not (r->>'eligible')::boolean then
      raise exception 'API_FULFILLMENT_ELIGIBILITY = FALSE for product %: %', new.id, r->'failures'
        using errcode = 'P0001';
    end if;
    new.fulfillment_eligible := true;
    new.eligibility_report := r;
    new.eligibility_checked_at := now();
    if new.published_at is null then new.published_at := now(); end if;
  end if;
  return new;
end $$;

create trigger trg_products_publish_guard
  before insert or update of status, retail_price, brand_approved, description on public.products
  for each row execute function public.guard_product_publish();

-- Guard: cannot sell a product that is not PUBLISHED + eligible
create or replace function public.guard_order_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (p.status = 'PUBLISHED' and p.fulfillment_eligible and v.active and v.product_id = p.id)
    into ok
    from public.products p join public.product_variants v on v.id = new.variant_id
   where p.id = new.product_id;
  if not coalesce(ok, false) then
    raise exception 'Product % / variant % is not purchasable (not API-fulfillable)', new.product_id, new.variant_id
      using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger trg_order_items_guard before insert on public.order_items
  for each row execute function public.guard_order_item();

create trigger trg_cart_items_guard before insert or update on public.cart_items
  for each row execute function public.guard_order_item();

-- Enforceable limited quantity (only when limited_type = 'QUANTITY')
create or replace function public.reserve_limited_quantity(p_product_id uuid, p_qty int)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated int;
begin
  update public.products
     set limited_sold = limited_sold + p_qty
   where id = p_product_id
     and (limited_type is distinct from 'QUANTITY' or limited_sold + p_qty <= limited_quantity);
  get diagnostics updated = row_count;
  return updated = 1;
end $$;

-- Customer stats & segment after paid order
create or replace function public.recalc_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare n int; s numeric; last timestamptz;
begin
  select count(*), coalesce(sum(total), 0), max(paid_at) into n, s, last
    from public.orders where customer_id = p_customer_id and payment_status in ('PAID','PARTIALLY_REFUNDED');
  update public.customers set
    total_orders = n, total_spent = s, last_order_at = last,
    customer_segment = case
      when n = 0 then 'NEW'
      when s >= 500 then 'HIGH_VALUE'
      when n >= 5 then 'VIP'
      when n >= 2 then 'REPEAT_CUSTOMER'
      else 'FIRST_PURCHASE' end
  where id = p_customer_id;
end $$;

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic counters
create or replace function public.increment_creator_clicks(p_creator_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.creators set total_clicks = total_clicks + 1 where id = p_creator_id;
$$;

-- =====================================================================
-- ANALYTICS VIEWS (security_invoker so RLS applies)
-- =====================================================================
create or replace view public.v_content_performance with (security_invoker = true) as
select c.id as content_id, c.brand_id, c.title, c.type, c.platform, c.product_id, c.collection_id,
       c.drop_id, c.campaign_id, c.creator_id,
       coalesce(sum(m.views),0) as views, coalesce(sum(m.likes),0) as likes,
       coalesce(sum(m.comments),0) as comments, coalesce(sum(m.shares),0) as shares,
       coalesce(sum(m.saves),0) as saves, coalesce(sum(m.clicks),0) as clicks,
       coalesce(sum(m.orders),0) as orders, coalesce(sum(m.revenue),0) as revenue,
       case when coalesce(sum(m.views),0) > 0 then round(sum(m.clicks)::numeric / sum(m.views), 4) end as ctr,
       case when coalesce(sum(m.clicks),0) > 0 then round(sum(m.orders)::numeric / sum(m.clicks), 4) end as conversion_rate
  from public.content c left join public.content_metrics m on m.content_id = c.id
 group by c.id;

create or replace view public.v_product_performance with (security_invoker = true) as
select p.id as product_id, p.brand_id, p.name, p.collection_id, p.status,
       coalesce(sum(oi.quantity),0) as units_sold,
       coalesce(sum(oi.total),0) as gross_revenue,
       coalesce(sum(oi.production_cost * oi.quantity),0) as production_cost_total,
       count(distinct o.id) as orders
  from public.products p
  left join public.order_items oi on oi.product_id = p.id
  left join public.orders o on o.id = oi.order_id and o.payment_status in ('PAID','PARTIALLY_REFUNDED')
 group by p.id;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Server code uses the service role (bypasses RLS) and never exposes it.
-- Policies below cover direct client access (anon / authenticated).
-- =====================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Staff: full access (role-gated)
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'create policy staff_all on public.%I for all to authenticated using (public.has_staff_role(array[''ADMIN''])) with check (public.has_staff_role(array[''ADMIN'']))', t);
    execute format(
      'create policy staff_read on public.%I for select to authenticated using (public.has_staff_role(null))', t);
  end loop;
end $$;

-- Public (anon + authenticated) editorial reads — no costs, no provider data
create policy public_read on public.brand_settings for select to anon, authenticated using (true);
create policy public_read on public.categories for select to anon, authenticated using (active);
create policy public_read on public.collections for select to anon, authenticated using (status = 'ACTIVE');
create policy public_read on public.drops for select to anon, authenticated using (status in ('SCHEDULED','LIVE','ENDED'));
create policy public_read on public.community_posts for select to anon, authenticated using (status in ('OPEN','CLOSED','PUBLISHED'));
create policy public_read on public.community_comments for select to anon, authenticated using (status = 'APPROVED');
create policy public_read on public.reviews for select to anon, authenticated using (status = 'APPROVED');
create policy public_read on public.content for select to anon, authenticated using (status = 'PUBLISHED' and type = 'JOURNAL');

-- Customers: own data only
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own_customer on public.customers for select to authenticated using (user_id = auth.uid());
create policy own_orders on public.orders for select to authenticated
  using (customer_id in (select id from public.customers where user_id = auth.uid()));
create policy own_order_items on public.order_items for select to authenticated
  using (order_id in (select o.id from public.orders o join public.customers c on c.id = o.customer_id where c.user_id = auth.uid()));
create policy own_shipments on public.shipments for select to authenticated
  using (order_id in (select o.id from public.orders o join public.customers c on c.id = o.customer_id where c.user_id = auth.uid()));
create policy own_votes on public.community_votes for select to authenticated using (user_id = auth.uid());
create policy own_gdpr on public.gdpr_requests for select to authenticated using (user_id = auth.uid());

-- Views & functions: lock down execution
revoke all on function public.product_eligibility(uuid) from public, anon;
revoke all on function public.refresh_product_eligibility(uuid) from public, anon, authenticated;
revoke all on function public.reserve_limited_quantity(uuid, int) from public, anon, authenticated;
revoke all on function public.recalc_customer(uuid) from public, anon, authenticated;
revoke all on function public.increment_creator_clicks(uuid) from public, anon, authenticated;
