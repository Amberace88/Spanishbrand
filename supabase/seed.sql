-- =====================================================================
-- SEED — configuration & editorial data only.
-- No fake products, no fake inventory, no fake reviews, no fake analytics.
-- Products enter via provider catalog sync → admin approval → eligibility.
-- =====================================================================

insert into public.brands (id, slug, name)
values ('5b1e0000-0000-4000-8000-000000000001', 'main', 'HISPANIA')
on conflict (id) do nothing;

insert into public.brand_settings (brand_id, brand_name, brand_tagline, brand_description, founded_year,
  default_language, supported_languages, default_currency, supported_countries, social_links, settings)
values ('5b1e0000-0000-4000-8000-000000000001',
  'HISPANIA',
  'Identidad española. Estilo mediterráneo.',
  'Marca española de identidad, herencia y estilo de vida. Colecciones que cuentan historias: ciudades, motor, Mediterráneo y cultura.',
  2026, 'es', array['es','en','fr','de','it','pt'], 'EUR',
  array['ES','PT','FR','DE','IT','NL','BE','AT','IE'],
  '{"instagram":"","tiktok":"","youtube":"","pinterest":""}'::jsonb,
  '{"payment_fee_percent":0.015,"payment_fee_fixed":0.25,"refund_reserve_percent":0.02,"prices_include_tax":true,"abandoned_cart_hours":4}'::jsonb)
on conflict (brand_id) do nothing;

insert into public.roles (code, name, description) values
  ('SUPER_ADMIN','Super admin','Full control including users and roles'),
  ('ADMIN','Admin','Products, orders, providers, settings'),
  ('CONTENT_MANAGER','Content manager','Content, collections, AI studio'),
  ('CUSTOMER_SUPPORT','Customer support','Orders and customers'),
  ('ANALYST','Analyst','Read-only analytics')
on conflict (code) do nothing;

insert into public.customer_segments (code, name, rule) values
  ('NEW','Nuevo','{"orders":0}'),
  ('FIRST_PURCHASE','Primera compra','{"orders":1}'),
  ('REPEAT_CUSTOMER','Cliente recurrente','{"orders_gte":2}'),
  ('VIP','VIP','{"orders_gte":5}'),
  ('HIGH_VALUE','Alto valor','{"spent_gte":500}'),
  ('INACTIVE','Inactivo','{"days_since_last_order_gte":180}')
on conflict (code) do nothing;

insert into public.categories (brand_id, code, name, sort, translations) values
  ('5b1e0000-0000-4000-8000-000000000001','APPAREL','Ropa',1,'{"en":"Apparel"}'),
  ('5b1e0000-0000-4000-8000-000000000001','HEADWEAR','Gorras',2,'{"en":"Headwear"}'),
  ('5b1e0000-0000-4000-8000-000000000001','BAGS','Bolsas',3,'{"en":"Bags"}'),
  ('5b1e0000-0000-4000-8000-000000000001','TECH_ACCESSORIES','Tecnología',4,'{"en":"Tech"}'),
  ('5b1e0000-0000-4000-8000-000000000001','DRINKWARE','Tazas y botellas',5,'{"en":"Drinkware"}'),
  ('5b1e0000-0000-4000-8000-000000000001','WALL_ART','Arte y pósters',6,'{"en":"Wall art"}'),
  ('5b1e0000-0000-4000-8000-000000000001','HOME_LIVING','Hogar',7,'{"en":"Home"}'),
  ('5b1e0000-0000-4000-8000-000000000001','STATIONERY','Papelería',8,'{"en":"Stationery"}'),
  ('5b1e0000-0000-4000-8000-000000000001','CALENDARS','Calendarios',9,'{"en":"Calendars"}'),
  ('5b1e0000-0000-4000-8000-000000000001','COLLECTIBLES','Coleccionables',10,'{"en":"Collectibles"}'),
  ('5b1e0000-0000-4000-8000-000000000001','OTHER_POD','Otros',11,'{"en":"Other"}')
on conflict (brand_id, code) do nothing;

insert into public.collections (brand_id, slug, name, tagline, story, accent_color, status, featured, sort, launch_phase, seo_title, seo_description) values
  ('5b1e0000-0000-4000-8000-000000000001','espana','ESPAÑA','Un país. Mil formas de llevarlo.',
   'La colección esencial. Líneas limpias, rojo y oro contenidos, y una identidad que no necesita gritar.',
   '#B3122E','ACTIVE',true,1,1,'Colección España','Ropa y estilo de vida con identidad española.'),
  ('5b1e0000-0000-4000-8000-000000000001','heritage','HERITAGE','Lo que heredamos, lo que llevamos.',
   'Tipografía clásica, escudos reinterpretados y la memoria de oficios, puertos y caminos.',
   '#A8894F','ACTIVE',true,2,1,'Colección Heritage','Herencia y cultura española en clave contemporánea.'),
  ('5b1e0000-0000-4000-8000-000000000001','mediterraneo','MEDITERRÁNEO','Sal, luz y tiempo lento.',
   'Azules profundos, cal blanca y tardes largas. Para la playa, el viaje y la terraza.',
   '#1B2A4A','ACTIVE',true,3,1,'Colección Mediterráneo','Estilo de vida mediterráneo: ropa, hogar y viaje.'),
  ('5b1e0000-0000-4000-8000-000000000001','motor','MOTOR','Curvas, gasolina y carretera nacional.',
   'Un homenaje a la cultura del motor en España: circuitos, puertos de montaña y clásicos de garaje.',
   '#0B0B0C','ACTIVE',true,4,1,'Colección Motor','Cultura del motor española en ropa y arte.'),
  ('5b1e0000-0000-4000-8000-000000000001','1492','1492','Una fecha. Una referencia histórica.',
   'Colección de referencia histórica. 1492 no es el año de fundación de la marca.',
   '#A8894F','DRAFT',false,5,2,'Colección 1492','Referencia histórica en diseño contemporáneo.'),
  ('5b1e0000-0000-4000-8000-000000000001','madrid','MADRID','De Madrid al cielo.',null,'#B3122E','DRAFT',false,6,2,null,null),
  ('5b1e0000-0000-4000-8000-000000000001','valencia','VALENCIA','Luz, huerta y mar.',null,'#E07A1F','DRAFT',false,7,2,null,null),
  ('5b1e0000-0000-4000-8000-000000000001','alicante','ALICANTE','La millor terreta del món.',null,'#1B2A4A','DRAFT',false,8,2,null,null),
  ('5b1e0000-0000-4000-8000-000000000001','cities','CIUDADES','Mapas, barrios y códigos postales.',null,'#0B0B0C','DRAFT',false,9,2,null,null),
  ('5b1e0000-0000-4000-8000-000000000001','founders','FOUNDERS','Para los primeros.',null,'#A8894F','DRAFT',false,10,2,null,null),
  ('5b1e0000-0000-4000-8000-000000000001','limited-editions','EDICIONES LIMITADAS','Por tiempo limitado. Sin falsas urgencias.',null,'#B3122E','DRAFT',false,11,2,null,null)
on conflict (brand_id, slug) do nothing;

-- Providers & verified capabilities (from official docs, 2026-09)
insert into public.providers (id, name, type, active, config) values
  ('printful','Printful','POD',true,'{"api_base":"https://api.printful.com","api_version":"v1"}'),
  ('gelato','Gelato','POD',true,'{"order_api_base":"https://order.gelatoapis.com","product_api_base":"https://product.gelatoapis.com"}')
on conflict (id) do nothing;

insert into public.provider_capabilities (provider_id, capability, supported, notes) values
  ('printful','catalog_api',true,'GET /products, GET /categories'),
  ('printful','product_api',true,'GET /products/{id}'),
  ('printful','variant_api',true,'GET /products/variant/{id}'),
  ('printful','order_api',true,'POST /orders?confirm=true, GET /orders/{id}'),
  ('printful','cost_estimate_api',true,'POST /orders/estimate-costs'),
  ('printful','cancel_api',true,'DELETE /orders/{id} (not in inreview/inprocess)'),
  ('printful','shipping_api',true,'POST /shipping/rates'),
  ('printful','tracking_api',true,'order.shipments[] + package_shipped webhook'),
  ('printful','webhook_api',true,'v1 webhooks'),
  ('printful','webhook_registration_api',true,'POST /webhooks'),
  ('printful','webhook_signature',false,'v1 has no signature — secret token in URL + re-fetch order'),
  ('printful','stock_api',true,'variant availability_status + stock_updated webhook'),
  ('printful','mockup_api',true,'POST /mockup-generator/create-task/{id}'),
  ('printful','product_creation_api',true,'POST /store/products (sync products)'),
  ('gelato','catalog_api',true,'GET /v3/catalogs, POST /v3/catalogs/{uid}/products:search'),
  ('gelato','product_api',true,'GET /v3/products/{productUid}'),
  ('gelato','variant_api',true,'productUid encodes the variant'),
  ('gelato','order_api',true,'POST /v4/orders'),
  ('gelato','cost_estimate_api',true,'POST /v4/orders:quote'),
  ('gelato','cancel_api',true,'POST /v4/orders/{id}:cancel'),
  ('gelato','shipping_api',true,'quote shipmentMethods + GET shipment-methods'),
  ('gelato','tracking_api',true,'order.shipment.packages[] + tracking webhooks'),
  ('gelato','webhook_api',true,'Configured in Gelato API portal'),
  ('gelato','webhook_registration_api',false,'No API — register in portal'),
  ('gelato','webhook_signature',false,'No signing — secret token in URL + re-fetch order'),
  ('gelato','stock_api',true,'POST /v3/stock/region-availability'),
  ('gelato','mockup_api',false,'No standalone mockup API'),
  ('gelato','product_creation_api',true,'Only from UI-made templates (ecommerce API)')
on conflict (provider_id, capability) do nothing;

-- VAT (standard rates). Legal/accounting validation required before production.
insert into public.tax_rates (country, region, tax_class, rate, name, requires_review, notes) values
  ('ES', null, 'standard', 0.21, 'IVA 21%', false, null),
  ('ES', 'CN', 'standard', 0.00, 'Canarias (IGIC — no IVA)', true, 'Canarias/Ceuta/Melilla outside EU VAT area; customs & IGIC apply'),
  ('ES', 'CE', 'standard', 0.00, 'Ceuta (IPSI)', true, null),
  ('ES', 'ML', 'standard', 0.00, 'Melilla (IPSI)', true, null),
  ('PT', null, 'standard', 0.23, 'IVA 23%', false, null),
  ('FR', null, 'standard', 0.20, 'TVA 20%', false, null),
  ('DE', null, 'standard', 0.19, 'MwSt 19%', false, null),
  ('IT', null, 'standard', 0.22, 'IVA 22%', false, null),
  ('NL', null, 'standard', 0.21, 'BTW 21%', false, null),
  ('BE', null, 'standard', 0.21, 'TVA/BTW 21%', false, null),
  ('AT', null, 'standard', 0.20, 'USt 20%', false, null),
  ('IE', null, 'standard', 0.23, 'VAT 23%', false, null)
on conflict (country, region, tax_class) do nothing;

-- Configured fallback shipping rules (used only when provider real-time rates unavailable)
insert into public.shipping_rules (brand_id, name, country_codes, method, base_rate, per_additional_item, free_over, min_days, max_days, sort) values
  ('5b1e0000-0000-4000-8000-000000000001','España peninsular y Baleares', array['ES'], 'STANDARD', 4.95, 1.50, 75, 3, 7, 1),
  ('5b1e0000-0000-4000-8000-000000000001','Unión Europea', array['PT','FR','DE','IT','NL','BE','AT','IE'], 'STANDARD', 6.95, 2.00, 100, 4, 10, 2);
