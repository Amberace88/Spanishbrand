-- =====================================================================
-- 7. Printify + Prodigi providers (capabilities confirmed from official API docs).
-- =====================================================================
insert into public.providers (id, name, type, active, config) values
  ('printify','Printify','POD',true,'{"api_base":"https://api.printify.com/v1"}'),
  ('prodigi','Prodigi','POD',true,'{"api_base":"https://api.prodigi.com/v4.0"}')
on conflict (id) do nothing;

insert into public.provider_capabilities (provider_id, capability, supported, notes) values
  ('printify','catalog_api',true,'GET /catalog/blueprints.json'),
  ('printify','product_api',true,'GET /catalog/blueprints/{id}.json'),
  ('printify','variant_api',true,'GET /catalog/blueprints/{id}/print_providers/{pp}/variants.json'),
  ('printify','order_api',true,'POST /shops/{shop}/orders.json + send_to_production'),
  ('printify','cost_estimate_api',true,'POST /shops/{shop}/orders/shipping.json; production cost from shop products'),
  ('printify','cancel_api',true,'POST /shops/{shop}/orders/{id}/cancel.json'),
  ('printify','shipping_api',true,'POST /shops/{shop}/orders/shipping.json'),
  ('printify','tracking_api',true,'order.shipments[]'),
  ('printify','webhook_api',true,'shop webhooks'),
  ('printify','webhook_registration_api',true,'POST /shops/{shop}/webhooks.json'),
  ('printify','webhook_signature',false,'secret token in URL + re-fetch order'),
  ('printify','stock_api',false,null),
  ('printify','mockup_api',true,'shop product images'),
  ('printify','product_creation_api',true,'POST /shops/{shop}/products.json'),
  ('prodigi','catalog_api',false,'per-SKU GET /products/{sku} only'),
  ('prodigi','product_api',true,'GET /products/{sku}'),
  ('prodigi','variant_api',true,'product.variants[].attributes'),
  ('prodigi','order_api',true,'POST /orders'),
  ('prodigi','cost_estimate_api',true,'POST /quotes'),
  ('prodigi','cancel_api',true,'POST /orders/{id}/actions/cancel'),
  ('prodigi','shipping_api',true,'POST /quotes per shipping method'),
  ('prodigi','tracking_api',true,'order.shipments[].tracking'),
  ('prodigi','webhook_api',true,'CloudEvents callbacks (callbackUrl per order)'),
  ('prodigi','webhook_registration_api',true,'callbackUrl per order'),
  ('prodigi','webhook_signature',false,'secret token in URL + re-fetch order'),
  ('prodigi','stock_api',false,null),
  ('prodigi','mockup_api',false,null),
  ('prodigi','product_creation_api',false,null)
on conflict (provider_id, capability) do nothing;
