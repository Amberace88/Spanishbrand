-- =====================================================================
-- SPANISH IDENTITY & LIFESTYLE BRAND — BRAND OS CORE SCHEMA
-- API-first POD commerce. Multi-brand ready (brand_id on core entities).
-- Hard rule: only API-fulfillable products may be PUBLISHED / sold.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- BRANDS
-- ---------------------------------------------------------------------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brand_settings (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  brand_name text not null,
  brand_tagline text,
  brand_description text,
  brand_logo text,
  brand_favicon text,
  primary_color text not null default '#0B0B0C',
  secondary_color text not null default '#F4EFE6',
  accent_color text not null default '#B3122E',
  founded_year int,
  social_links jsonb not null default '{}'::jsonb,
  default_language text not null default 'es',
  supported_languages text[] not null default array['es','en'],
  default_currency text not null default 'EUR',
  supported_countries text[] not null default array['ES'],
  support_email text,
  legal_entity jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger trg_brand_settings_updated before update on public.brand_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- USERS / PROFILES / ROLES (RBAC)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext,
  full_name text,
  phone text,
  language text default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.roles (
  code text primary key check (code in ('SUPER_ADMIN','ADMIN','CONTENT_MANAGER','CUSTOMER_SUPPORT','ANALYST')),
  name text not null,
  description text
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  role text not null references public.roles(code),
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id, role)
);

-- Security-definer role check used by RLS (avoids recursive policies)
create or replace function public.has_staff_role(p_roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (p_roles is null or ur.role = any(p_roles) or ur.role = 'SUPER_ADMIN')
  );
$$;

-- ---------------------------------------------------------------------
-- CATEGORIES / COLLECTIONS
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  code text not null,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  sort int not null default 0,
  active boolean not null default true,
  translations jsonb not null default '{}'::jsonb,
  unique (brand_id, code)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text not null,
  name text not null,
  tagline text,
  story text,
  hero_image text,
  accent_color text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','ARCHIVED')),
  featured boolean not null default false,
  sort int not null default 0,
  launch_phase int not null default 1,
  seo_title text,
  seo_description text,
  og_image text,
  translations jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);
create trigger trg_collections_updated before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- FULFILLMENT PROVIDERS
-- ---------------------------------------------------------------------
create table public.providers (
  id text primary key,                          -- 'printful', 'gelato', ...
  name text not null,
  type text not null default 'POD' check (type in ('POD','WAREHOUSE')),
  active boolean not null default true,
  health_status text not null default 'UNKNOWN' check (health_status in ('ONLINE','DEGRADED','OFFLINE','ERROR','UNKNOWN')),
  last_health_check_at timestamptz,
  last_sync_at timestamptz,
  last_webhook_at timestamptz,
  auto_routing_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,    -- NON-secret config only
  created_at timestamptz not null default now()
);

create table public.provider_capabilities (
  provider_id text not null references public.providers(id) on delete cascade,
  capability text not null check (capability in (
    'catalog_api','product_api','variant_api','order_api','shipping_api','tracking_api',
    'webhook_api','webhook_registration_api','webhook_signature','stock_api','mockup_api',
    'product_creation_api','cost_estimate_api','cancel_api')),
  supported boolean not null default false,
  notes text,
  verified_at timestamptz default now(),
  primary key (provider_id, capability)
);

create table public.provider_products (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers(id) on delete cascade,
  external_id text not null,
  title text not null,
  type text,
  brand text,
  model text,
  internal_category_code text,
  image text,
  techniques jsonb not null default '[]'::jsonb,
  placements jsonb not null default '[]'::jsonb,
  variant_count int not null default 0,
  discontinued boolean not null default false,
  available boolean not null default true,
  eligible boolean not null default false,
  eligibility_report jsonb not null default '{}'::jsonb,
  review_status text not null default 'IMPORTED' check (review_status in ('IMPORTED','APPROVED','REJECTED')),
  min_cost numeric(12,2),
  currency text,
  raw jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_id)
);
create trigger trg_provider_products_updated before update on public.provider_products
  for each row execute function public.set_updated_at();

create table public.provider_variants (
  id uuid primary key default gen_random_uuid(),
  provider_product_id uuid not null references public.provider_products(id) on delete cascade,
  provider_id text not null references public.providers(id) on delete cascade,
  external_id text not null,
  name text,
  size text,
  color text,
  color_code text,
  cost numeric(12,2),
  currency text,
  in_stock boolean,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','OUT_OF_STOCK','DISCONTINUED','UNKNOWN')),
  availability jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  unique (provider_id, external_id)
);

create table public.provider_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers(id) on delete cascade,
  kind text not null default 'CATALOG',
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCESS','PARTIAL','FAILED')),
  stats jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.provider_health_checks (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers(id) on delete cascade,
  status text not null check (status in ('ONLINE','DEGRADED','OFFLINE','ERROR','UNKNOWN')),
  latency_ms int,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  sku text,
  description text,
  short_description text,
  story text,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  drop_id uuid,
  product_type text not null,                         -- e.g. TSHIRT, HOODIE, POSTER, MUG
  status text not null default 'DRAFT' check (status in (
    'DRAFT','IMPORTED','REVIEW','APPROVED','READY_FOR_CONFIGURATION','READY_FOR_FULFILLMENT',
    'PUBLISHED','PAUSED','OUT_OF_STOCK','PROVIDER_UNAVAILABLE','ARCHIVED')),
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC','HIDDEN','PRIVATE')),
  featured boolean not null default false,
  limited boolean not null default false,
  limited_type text check (limited_type in ('TIME','COLLECTION','DESIGN','SEASONAL','QUANTITY')),
  limited_quantity int,                               -- only enforceable when limited_type = 'QUANTITY'
  limited_sold int not null default 0,
  limited_until timestamptz,
  supplier_id text references public.providers(id),
  primary_provider text references public.providers(id),
  backup_provider text references public.providers(id),
  provider_product_id text,
  provider_sync_product_id text,
  fulfillment_eligible boolean not null default false,
  brand_approved boolean not null default false,
  eligibility_report jsonb not null default '{}'::jsonb,
  eligibility_checked_at timestamptz,
  production_cost numeric(12,2),
  shipping_cost numeric(12,2),
  retail_price numeric(12,2),
  compare_at_price numeric(12,2),
  currency text not null default 'EUR',
  tax_class text not null default 'standard',
  margin_target numeric(5,2),
  tags text[] not null default '{}',
  mockups jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  translations jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  og_image text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug),
  check (retail_price is null or retail_price >= 0),
  check (not (limited_type = 'QUANTITY' and (limited_quantity is null or limited_quantity <= 0)))
);
create index products_status_idx on public.products (brand_id, status);
create index products_collection_idx on public.products (collection_id);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  variant_name text not null,
  size text,
  color text,
  color_hex text,
  material text,
  production_cost numeric(12,2),
  retail_price numeric(12,2),
  compare_at_price numeric(12,2),
  currency text not null default 'EUR',
  availability text not null default 'AVAILABLE' check (availability in ('AVAILABLE','UNAVAILABLE')),
  stock_status text not null default 'ON_DEMAND' check (stock_status in ('ON_DEMAND','IN_STOCK','OUT_OF_STOCK','DISCONTINUED')),
  provider_status text not null default 'UNKNOWN' check (provider_status in ('ACTIVE','OUT_OF_STOCK','DISCONTINUED','UNKNOWN')),
  weight_grams int,
  dimensions jsonb,
  image text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);
create trigger trg_product_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  url text not null,
  alt text,
  kind text not null default 'IMAGE' check (kind in ('IMAGE','MOCKUP','LIFESTYLE','PRINT_FILE')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- Provider mapping (one row per product×provider, role PRIMARY/BACKUP)
create table public.product_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id text not null references public.providers(id),
  role text not null check (role in ('PRIMARY','BACKUP')),
  provider_product_id text not null,
  provider_sync_product_id text,
  fulfillment_method text,                 -- DTG, EMBROIDERY, SUBLIMATION, DIGITAL, ...
  print_config jsonb,                      -- placements, file URLs, options
  approved boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  test_passed_at timestamptz,              -- last successful test fulfillment flow (estimate/quote)
  test_result jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, provider_id),
  unique (product_id, role)
);
create trigger trg_ppm_updated before update on public.product_provider_mappings
  for each row execute function public.set_updated_at();

create table public.variant_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid not null references public.product_provider_mappings(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  provider_variant_id text not null,
  provider_variant_external_id text,
  files jsonb,                               -- per-variant print files override
  production_cost numeric(12,2),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','OUT_OF_STOCK','DISCONTINUED')),
  created_at timestamptz not null default now(),
  unique (mapping_id, variant_id)
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort int not null default 0,
  primary key (collection_id, product_id)
);

-- ---------------------------------------------------------------------
-- DROPS
-- ---------------------------------------------------------------------
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  number int,
  description text,
  collection_id uuid references public.collections(id) on delete set null,
  campaign_id uuid,
  hero_image text,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'DRAFT' check (status in ('DRAFT','SCHEDULED','LIVE','ENDED','ARCHIVED')),
  featured boolean not null default false,
  limited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);
create trigger trg_drops_updated before update on public.drops
  for each row execute function public.set_updated_at();
alter table public.products add constraint products_drop_fk foreign key (drop_id) references public.drops(id) on delete set null;

create table public.drop_products (
  drop_id uuid not null references public.drops(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort int not null default 0,
  primary key (drop_id, product_id)
);

-- ---------------------------------------------------------------------
-- CUSTOMERS / CRM
-- ---------------------------------------------------------------------
create table public.customer_segments (
  code text primary key check (code in ('NEW','FIRST_PURCHASE','REPEAT_CUSTOMER','VIP','HIGH_VALUE','INACTIVE')),
  name text not null,
  rule jsonb not null default '{}'::jsonb
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email extensions.citext not null,
  name text,
  phone text,
  country text,
  language text default 'es',
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid(),
  total_orders int not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_order_at timestamptz,
  customer_segment text not null default 'NEW' references public.customer_segments(code),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, email)
);
create index customers_user_idx on public.customers (user_id);
create trigger trg_customers_updated before update on public.customers
  for each row execute function public.set_updated_at();

create table public.customer_events (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index customer_events_customer_idx on public.customer_events (customer_id, created_at desc);

-- ---------------------------------------------------------------------
-- CREATORS / AFFILIATES / CAMPAIGNS
-- ---------------------------------------------------------------------
create table public.creators (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  email extensions.citext,
  code text not null,
  commission_rate numeric(5,4) not null default 0.10 check (commission_rate >= 0 and commission_rate <= 1),
  customer_discount_rate numeric(5,4) not null default 0 check (customer_discount_rate >= 0 and customer_discount_rate <= 1),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ARCHIVED')),
  total_clicks int not null default 0,
  total_orders int not null default 0,
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (brand_id, code)
);

create table public.creator_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  slug text not null unique,
  target_path text not null default '/',
  campaign_id uuid,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  slug text not null,
  utm_campaign text,
  collection_id uuid references public.collections(id) on delete set null,
  drop_id uuid references public.drops(id) on delete set null,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','PAUSED','ENDED')),
  starts_at timestamptz,
  ends_at timestamptz,
  budget numeric(12,2),
  created_at timestamptz not null default now(),
  unique (brand_id, slug)
);
alter table public.drops add constraint drops_campaign_fk foreign key (campaign_id) references public.campaigns(id) on delete set null;
alter table public.creator_links add constraint creator_links_campaign_fk foreign key (campaign_id) references public.campaigns(id) on delete set null;

-- ---------------------------------------------------------------------
-- DISCOUNTS
-- ---------------------------------------------------------------------
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  code extensions.citext not null,
  type text not null check (type in ('PERCENT','FIXED')),
  value numeric(12,2) not null check (value > 0),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  uses int not null default 0,
  min_subtotal numeric(12,2),
  creator_id uuid references public.creators(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (brand_id, code)
);

-- ---------------------------------------------------------------------
-- CARTS
-- ---------------------------------------------------------------------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  session_id text,
  email extensions.citext,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CHECKOUT_STARTED','CONVERTED','ABANDONED','EXPIRED')),
  currency text not null default 'EUR',
  country text,
  discount_code extensions.citext,
  creator_id uuid references public.creators(id) on delete set null,
  checkout_started_at timestamptz,
  abandoned_notified_at timestamptz,
  converted_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_carts_updated before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  quantity int not null check (quantity > 0 and quantity <= 20),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ---------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  order_number bigint not null unique default nextval('public.order_number_seq'),
  customer_id uuid references public.customers(id) on delete set null,
  cart_id uuid references public.carts(id) on delete set null,
  status text not null default 'PENDING_PAYMENT' check (status in (
    'PENDING_PAYMENT','PAID','PROCESSING','SENT_TO_PROVIDER','PROVIDER_ACCEPTED','IN_PRODUCTION',
    'SHIPPED','DELIVERED','FAILED','FULFILLMENT_FAILED','CANCELLED','REFUNDED','REQUIRES_REVIEW')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','EXPIRED')),
  fulfillment_status text not null default 'UNFULFILLED' check (fulfillment_status in (
    'UNFULFILLED','WAITING','PROCESSING','SENT_TO_PROVIDER','PROVIDER_ACCEPTED','IN_PRODUCTION',
    'PARTIALLY_SHIPPED','SHIPPED','DELIVERED','FAILED','CANCELLED','REQUIRES_REVIEW')),
  provider text references public.providers(id),         -- set when single-provider order
  provider_order_id text,
  currency text not null default 'EUR',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  prices_include_tax boolean not null default true,
  customer_email extensions.citext not null,
  customer_name text,
  customer_phone text,
  shipping_address jsonb,
  billing_address jsonb,
  shipping_method text,
  tracking_number text,
  tracking_url text,
  carrier text,
  locale text not null default 'es',
  discount_code extensions.citext,
  creator_id uuid references public.creators(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  review_reason text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (brand_id, status);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();
alter table public.carts add constraint carts_order_fk foreign key (converted_order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  variant_name text,
  sku text,
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total numeric(12,2) not null,
  production_cost numeric(12,2),
  tax_amount numeric(12,2) not null default 0,
  image text,
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null,
  from_status text,
  to_status text,
  message text,
  data jsonb not null default '{}'::jsonb,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Fulfillment group per provider (supports multi-provider orders)
create table public.fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id text not null references public.providers(id),
  mapping_role text not null default 'PRIMARY' check (mapping_role in ('PRIMARY','BACKUP','MANUAL')),
  status text not null default 'PENDING' check (status in (
    'PENDING','SUBMITTING','SENT_TO_PROVIDER','PROVIDER_ACCEPTED','IN_PRODUCTION','PARTIALLY_SHIPPED',
    'SHIPPED','DELIVERED','FAILED','RETRY_SCHEDULED','REQUIRES_REVIEW','CANCELLED')),
  provider_order_id text,
  provider_status text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  last_error text,
  cost_total numeric(12,2),
  shipping_cost numeric(12,2),
  currency text,
  submitted_at timestamptz,
  accepted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, provider_id)
);
create index fulfillment_orders_retry_idx on public.fulfillment_orders (status, next_retry_at);
create index fulfillment_orders_provider_order_idx on public.fulfillment_orders (provider_id, provider_order_id);
create trigger trg_fulfillment_orders_updated before update on public.fulfillment_orders
  for each row execute function public.set_updated_at();

create table public.fulfillment_items (
  id uuid primary key default gen_random_uuid(),
  fulfillment_order_id uuid not null references public.fulfillment_orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  provider_product_id text,
  provider_variant_id text not null,
  quantity int not null check (quantity > 0),
  files jsonb,
  unique (fulfillment_order_id, order_item_id)
);

create table public.fulfillment_errors (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  fulfillment_order_id uuid references public.fulfillment_orders(id) on delete cascade,
  provider text references public.providers(id),
  error_code text,
  error_message text not null,
  endpoint text,
  http_status int,
  request_id text,
  payload jsonb,
  retry_count int not null default 0,
  permanent boolean not null default false,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index fulfillment_errors_open_idx on public.fulfillment_errors (resolved, created_at desc);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  fulfillment_order_id uuid not null references public.fulfillment_orders(id) on delete cascade,
  provider_shipment_id text not null,
  carrier text,
  service text,
  tracking_number text,
  tracking_url text,
  status text not null default 'SHIPPED' check (status in ('PENDING','SHIPPED','IN_TRANSIT','DELIVERED','RETURNED','EXCEPTION')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_min date,
  estimated_delivery_max date,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fulfillment_order_id, provider_shipment_id)
);

create table public.tracking_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  description text,
  occurred_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- WEBHOOKS (idempotent)
-- ---------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean,
  processed boolean not null default false,
  processed_at timestamptz,
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------
-- PAYMENTS / REFUNDS
-- ---------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'stripe',
  provider_payment_id text not null,
  amount numeric(12,2) not null,
  currency text not null,
  status text not null check (status in ('PENDING','SUCCEEDED','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  fee numeric(12,2),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null,
  reason text,
  provider_refund_id text unique,
  status text not null default 'PENDING' check (status in ('PENDING','SUCCEEDED','FAILED')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.discount_usage (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (discount_id, order_id)
);

create table public.creator_commissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  base_amount numeric(12,2) not null,
  rate numeric(5,4) not null,
  amount numeric(12,2) not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','PAID','VOID')),
  created_at timestamptz not null default now(),
  unique (creator_id, order_id)
);

-- ---------------------------------------------------------------------
-- CONTENT ENGINE
-- ---------------------------------------------------------------------
create table public.content (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  type text not null check (type in ('PRODUCT','LIFESTYLE','HERITAGE','CULTURE','MOTOR','MEDITERRANEAN','COMMUNITY','UGC','CREATOR','DROP','LIMITED','EXPERIMENTAL','JOURNAL')),
  title text not null,
  slug text,
  platform text check (platform in ('TIKTOK','INSTAGRAM','FACEBOOK','PINTEREST','YOUTUBE','EMAIL','WEBSITE','OTHER')),
  status text not null default 'IDEA' check (status in ('IDEA','DRAFT','APPROVED','SCHEDULED','PUBLISHED','ARCHIVED')),
  hook text,
  script text,
  caption text,
  cta text,
  hashtags text[] not null default '{}',
  body text,
  cover_image text,
  external_url text,
  product_id uuid references public.products(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  drop_id uuid references public.drops(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  creator_id uuid references public.creators(id) on delete set null,
  ai_generation_id uuid,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index content_slug_uq on public.content (brand_id, slug) where slug is not null;
create trigger trg_content_updated before update on public.content
  for each row execute function public.set_updated_at();

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  url text not null,
  kind text not null default 'IMAGE' check (kind in ('IMAGE','VIDEO','AUDIO','DOCUMENT')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.content_metrics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  date date not null,
  views int not null default 0,
  likes int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  saves int not null default 0,
  clicks int not null default 0,
  orders int not null default 0,
  revenue numeric(12,2) not null default 0,
  contribution_margin numeric(12,2),
  source text not null default 'MANUAL' check (source in ('MANUAL','INTERNAL','PLATFORM_API')),
  unique (content_id, date)
);

create table public.campaign_content (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  primary key (campaign_id, content_id)
);
create table public.campaign_products (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (campaign_id, product_id)
);

-- ---------------------------------------------------------------------
-- COMMUNITY
-- ---------------------------------------------------------------------
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  type text not null check (type in ('POLL','DESIGN_VOTE','COLLECTION_VOTE','SUBMISSION','HIGHLIGHT','DISCUSSION')),
  title text not null,
  body text,
  image text,
  options jsonb not null default '[]'::jsonb,   -- [{key,label,image}]
  status text not null default 'DRAFT' check (status in ('DRAFT','OPEN','CLOSED','ARCHIVED','PENDING_REVIEW','PUBLISHED','REJECTED')),
  result jsonb,
  closes_at timestamptz,
  author_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.community_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  option_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);
create unique index community_votes_user_uq on public.community_votes (post_id, user_id) where user_id is not null;
create unique index community_votes_session_uq on public.community_votes (post_id, session_id) where session_id is not null;

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);

-- REVIEWS (real only — verified purchases)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  verified_purchase boolean not null default false,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANALYTICS / EMAIL / AUDIT / AI / AUTOMATION
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  brand_id uuid not null references public.brands(id) on delete cascade,
  event text not null check (event in (
    'page_view','product_view','collection_view','search','add_to_cart','remove_from_cart',
    'checkout_started','payment_started','purchase','refund','email_open','email_click',
    'content_view','content_click','creator_click','campaign_click','vote')),
  user_id uuid,
  session_id text,
  product_id uuid,
  collection_id uuid,
  campaign_id uuid,
  creator_id uuid,
  content_id uuid,
  order_id uuid,
  value numeric(12,2),
  path text,
  referrer text,
  utm jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_event_idx on public.analytics_events (brand_id, event, created_at desc);
create index analytics_events_product_idx on public.analytics_events (product_id, event);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  email extensions.citext not null,
  template text not null,
  status text not null check (status in ('QUEUED','SENT','FAILED','SKIPPED_NO_CONSENT','SKIPPED_NOT_CONFIGURED','OPENED','CLICKED','BOUNCED','COMPLAINED')),
  provider_message_id text,
  order_id uuid references public.orders(id) on delete set null,
  dedupe_key text unique,
  error text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  brand_id uuid references public.brands(id) on delete set null,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('PRODUCT','COLLECTION','CONTENT','CAMPAIGN','BUSINESS_QUESTION')),
  input jsonb not null,
  output jsonb,
  model text,
  status text not null default 'DRAFT' check (status in ('DRAFT','APPROVED','REJECTED','APPLIED','FAILED')),
  error text,
  created_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSED','FAILED')),
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index automation_events_status_idx on public.automation_events (status, created_at);

-- ---------------------------------------------------------------------
-- TAX / SHIPPING CONFIG
-- ---------------------------------------------------------------------
create table public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  region text,                               -- e.g. 'CN' (Canarias) needs special handling
  tax_class text not null default 'standard',
  rate numeric(6,4) not null check (rate >= 0 and rate < 1),
  name text not null,
  active boolean not null default true,
  requires_review boolean not null default false,
  notes text,
  unique (country, region, tax_class)
);

create table public.shipping_rules (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  country_codes text[] not null,
  provider_id text references public.providers(id),
  method text not null default 'STANDARD',
  base_rate numeric(12,2) not null,
  per_additional_item numeric(12,2) not null default 0,
  free_over numeric(12,2),
  min_days int,
  max_days int,
  active boolean not null default true,
  sort int not null default 0
);

-- ---------------------------------------------------------------------
-- GDPR
-- ---------------------------------------------------------------------
create table public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email extensions.citext not null,
  type text not null check (type in ('EXPORT','DELETE')),
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','COMPLETED','REJECTED')),
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  email extensions.citext not null,
  language text default 'es',
  consent_text text not null,
  consent_at timestamptz not null default now(),
  source text,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid(),
  unique (brand_id, email)
);
