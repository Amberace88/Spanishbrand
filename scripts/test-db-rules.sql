-- DB rule tests: run against a disposable database (scripts/test-db.sh)
\set ON_ERROR_STOP 1
do $$
declare b uuid := '5b1e0000-0000-4000-8000-000000000001'; p uuid; v uuid; m uuid; ok boolean;
begin
  insert into products (brand_id, name, slug, product_type, description, retail_price)
  values (b, 'Test Tee', 'test-tee', 'TSHIRT', 'desc', 39.90) returning id into p;

  -- 1. publishing an ineligible product must fail
  begin
    update products set status = 'PUBLISHED' where id = p;
    raise exception 'TEST FAILED: ineligible product was published';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'PASS 1: ineligible publish blocked (%)', left(sqlerrm, 90);
  end;

  -- 2. cart/order items for unpublished product must fail
  insert into product_variants (product_id, variant_name, size, color, production_cost) values (p, 'M / Black', 'M', 'Black', 12.5) returning id into v;
  begin
    insert into orders (brand_id, customer_email) values (b, 'a@b.c');
    insert into order_items (order_id, product_id, variant_id, product_name, quantity, unit_price, total)
      select id, p, v, 'x', 1, 39.9, 39.9 from orders limit 1;
    raise exception 'TEST FAILED: unpublished product sold';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
    raise notice 'PASS 2: order item for unpublished product blocked';
  end;

  -- 3. fully configured product publishes
  insert into product_provider_mappings (product_id, provider_id, role, provider_product_id, fulfillment_method, print_config, approved, test_passed_at)
  values (p, 'printful', 'PRIMARY', '71', 'DTG', '{"files":[{"type":"front","url":"https://x/y.png"}]}', true, now()) returning id into m;
  insert into variant_provider_mappings (mapping_id, variant_id, provider_variant_id) values (m, v, '4012');
  insert into product_images (product_id, url) values (p, 'https://x/img.jpg');
  update products set brand_approved = true where id = p;
  update products set status = 'PUBLISHED' where id = p;
  select fulfillment_eligible into ok from products where id = p;
  if not ok then raise exception 'TEST FAILED: eligible flag not set'; end if;
  raise notice 'PASS 3: eligible product published';

  -- 4. losing eligibility pauses a published product
  update variant_provider_mappings set status = 'DISCONTINUED' where variant_id = v;
  perform refresh_product_eligibility(p);
  if (select status from products where id = p) <> 'PAUSED' then raise exception 'TEST FAILED: not paused'; end if;
  raise notice 'PASS 4: product auto-paused when eligibility lost';

  -- 5. provider without order_api cannot be eligible
  update variant_provider_mappings set status = 'ACTIVE' where variant_id = v;
  update provider_capabilities set supported = false where provider_id = 'printful' and capability = 'order_api';
  if (refresh_product_eligibility(p)->>'eligible')::boolean then raise exception 'TEST FAILED: no order_api still eligible'; end if;
  update provider_capabilities set supported = true where provider_id = 'printful' and capability = 'order_api';
  raise notice 'PASS 5: provider without order_api blocks eligibility';

  -- 6. webhook idempotency: unique(provider, event_id)
  insert into webhook_events (provider, event_id, event_type, payload) values ('stripe', 'evt_1', 't', '{}');
  begin
    insert into webhook_events (provider, event_id, event_type, payload) values ('stripe', 'evt_1', 't', '{}');
    raise exception 'TEST FAILED: duplicate webhook stored';
  exception when unique_violation then raise notice 'PASS 6: duplicate webhook rejected';
  end;

  -- 7. limited quantity enforcement
  update products set limited = true, limited_type = 'QUANTITY', limited_quantity = 2 where id = p;
  if not reserve_limited_quantity(p, 2) then raise exception 'TEST FAILED: reserve 2'; end if;
  if reserve_limited_quantity(p, 1) then raise exception 'TEST FAILED: oversold limited'; end if;
  raise notice 'PASS 7: limited quantity enforced';
end $$;
