-- =====================================================================
-- 4. Growth: brand ROJO Y GUALDA, themes (sport / life), personalization,
--    club membership + points, B2B quotes, gift cards, creator applications.
-- Idempotent: safe to run more than once.
-- =====================================================================

-- ---------- Brand ----------
update public.brands set name = 'ROJO Y GUALDA' where id = '5b1e0000-0000-4000-8000-000000000001';
update public.brand_settings set
  brand_name = 'ROJO Y GUALDA',
  brand_tagline = 'Orgullo español. Hecho para llevarlo.',
  brand_description = 'Marca española de orgullo, identidad y estilo de vida: fútbol, pueblo, fiesta, Mediterráneo y herencia. Diseños propios fabricados bajo pedido en Europa.',
  primary_color = '#0D0D0D', secondary_color = '#FFFFFF', accent_color = '#E3051B',
  supported_languages = array['es','en','de'],
  updated_at = now()
where brand_id = '5b1e0000-0000-4000-8000-000000000001';

-- ---------- Categories ----------
insert into public.categories (brand_id, code, name, sort, translations)
select v.* from (values
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'KIDS','Niños',12,'{"en":"Kids","de":"Kinder"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'PETS','Mascotas',13,'{"en":"Pets","de":"Haustiere"}'::jsonb)
) as v(brand_id, code, name, sort, translations)
where exists (select 1 from public.brands where id = '5b1e0000-0000-4000-8000-000000000001')
on conflict (brand_id, code) do nothing;

-- ---------- Theme collections (what matters in Spain). No official club/league marks. ----------
insert into public.collections (brand_id, slug, name, tagline, story, status, featured, sort, launch_phase, seo_title, seo_description, metadata)
select v.* from (values
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'futbol','AFICIÓN','El fútbol se vive en la grada, en el bar y en la calle.',
   'Diseños de afición sin escudos oficiales: dorsales, gradas, estadios de barrio y la cultura del fútbol que nos une. Personaliza tu camiseta con nombre y número.',
   'ACTIVE',false,20,1,'Camisetas de fútbol y afición','Camisetas, sudaderas y regalos de afición al fútbol. Personaliza con tu nombre y dorsal.','{"group":"sport"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'padel','PÁDEL','El deporte que se juega en cada barrio.',
   'Para los de la pista de las ocho de la tarde: gorras, camisetas técnicas, toallas y botellas con diseño propio.',
   'ACTIVE',false,21,1,'Ropa y regalos de pádel','Camisetas, gorras y accesorios de pádel con diseño español.','{"group":"sport"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'ciclismo','CICLISMO','Puertos de montaña y salidas de domingo.',
   'Homenaje a los puertos míticos, las grupetas de domingo y el café de mitad de ruta.',
   'ACTIVE',false,22,1,'Ciclismo','Camisetas, pósters y regalos para ciclistas.','{"group":"sport"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'mi-pueblo','MI PUEBLO','Tu pueblo, en tu camiseta.',
   'El sitio donde pasaste los veranos, la peña, las fiestas de agosto. Escribe el nombre de tu pueblo y lo convertimos en camiseta, sudadera, taza o póster.',
   'ACTIVE',true,23,1,'Camisetas personalizadas de tu pueblo','Camisetas, sudaderas, tazas y pósters con el nombre de tu pueblo.','{"group":"life","personalizable":true}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'fiestas','FIESTAS','Fallas, Hogueras, ferias y verbenas.',
   'Diseños para las fiestas grandes y las de tu barrio: camisetas de peña, pañuelos, tazas y pósters.',
   'ACTIVE',false,24,1,'Fiestas de España','Camisetas de peña y regalos para Fallas, Hogueras, ferias y fiestas patronales.','{"group":"life"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'playa','PLAYA','Verano, chiringuito y Mediterráneo.',
   'Toallas, bolsas, gorras y camisetas para el verano en la costa.',
   'ACTIVE',false,25,1,'Playa y verano','Toallas, bolsas y ropa de verano con diseño mediterráneo.','{"group":"life"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'tapas','TAPAS & VERMUT','La hora del vermut es sagrada.',
   'Delantales, tazas y pósters para los que cocinan, invitan y alargan la sobremesa.',
   'ACTIVE',false,26,1,'Tapas, vermut y cocina','Delantales, tazas y regalos de cocina española.','{"group":"life"}'::jsonb),
  ('5b1e0000-0000-4000-8000-000000000001'::uuid,'camino','CAMINO','Buen Camino hasta Santiago.',
   'Para peregrinos y los que sueñan con serlo: camisetas, bolsas y recuerdos del Camino de Santiago.',
   'ACTIVE',false,27,1,'Camino de Santiago','Camisetas y regalos del Camino de Santiago.','{"group":"life"}'::jsonb)
) as v(brand_id, slug, name, tagline, story, status, featured, sort, launch_phase, seo_title, seo_description, metadata)
where exists (select 1 from public.brands where id = '5b1e0000-0000-4000-8000-000000000001')
on conflict (brand_id, slug) do update set metadata = excluded.metadata;

update public.collections set metadata = metadata || '{"group":"core"}'::jsonb where slug in ('espana','heritage','mediterraneo') and brand_id = '5b1e0000-0000-4000-8000-000000000001';
update public.collections set metadata = metadata || '{"group":"sport"}'::jsonb where slug = 'motor' and brand_id = '5b1e0000-0000-4000-8000-000000000001';

-- ---------- Personalization ----------
-- products.personalization: {"type":"jersey|text|pueblo","fields":[{"key":"name","label":"Nombre","maxLength":12}, ...],
--                            "placement":"back","extra_price":5}
alter table public.products add column if not exists personalization jsonb;
alter table public.cart_items add column if not exists personalization jsonb not null default '{}'::jsonb;
alter table public.cart_items add column if not exists personalization_key text not null default '';
alter table public.cart_items drop constraint if exists cart_items_cart_id_variant_id_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cart_items_cart_variant_perso_key') then
    alter table public.cart_items add constraint cart_items_cart_variant_perso_key unique (cart_id, variant_id, personalization_key);
  end if;
end $$;
alter table public.order_items add column if not exists personalization jsonb not null default '{}'::jsonb;
alter table public.order_items add column if not exists print_files jsonb not null default '[]'::jsonb;

-- Rendered print files must be fetchable by the print providers.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('print-files', 'print-files', true) on conflict (id) do nothing;
  end if;
end $$;

-- ---------- Club membership ----------
create sequence if not exists public.member_number_seq start 1;
alter table public.customers add column if not exists member_number bigint unique;
alter table public.customers add column if not exists member_since timestamptz;
alter table public.customers add column if not exists points int not null default 0;
alter table public.customers add column if not exists birthday date;

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points int not null,
  reason text not null check (reason in ('ORDER','REFUND','SIGNUP','BIRTHDAY','ADJUSTMENT','REDEEM')),
  created_at timestamptz not null default now(),
  unique (order_id, reason)
);
create index if not exists points_ledger_customer_idx on public.points_ledger(customer_id);

-- Join the club: idempotent, returns the member number.
create or replace function public.join_club(p_customer_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  select member_number into n from public.customers where id = p_customer_id;
  if n is not null then return n; end if;
  update public.customers
     set member_number = nextval('public.member_number_seq'), member_since = now(), updated_at = now()
   where id = p_customer_id and member_number is null
  returning member_number into n;
  if n is not null then
    insert into public.points_ledger (customer_id, points, reason) values (p_customer_id, 50, 'SIGNUP');
    update public.customers set points = points + 50 where id = p_customer_id;
  end if;
  return n;
end $$;
revoke all on function public.join_club(uuid) from public, anon, authenticated;

-- Award points once per paid order (1 point per euro of merchandise).
create or replace function public.award_order_points(p_order_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare c uuid; pts int; inserted int;
begin
  select o.customer_id, floor(o.subtotal - coalesce(o.discount, 0))::int into c, pts
    from public.orders o where o.id = p_order_id and o.payment_status = 'PAID';
  if c is null or pts is null or pts <= 0 then return 0; end if;
  if not exists (select 1 from public.customers where id = c and member_number is not null) then return 0; end if;
  insert into public.points_ledger (customer_id, order_id, points, reason) values (c, p_order_id, pts, 'ORDER')
  on conflict (order_id, reason) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then update public.customers set points = points + pts where id = c; return pts; end if;
  return 0;
end $$;
revoke all on function public.award_order_points(uuid) from public, anon, authenticated;

alter table public.drops add column if not exists members_only boolean not null default false;

-- ---------- B2B / events quotes ----------
create table if not exists public.b2b_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  company text not null,
  contact_name text not null,
  email extensions.citext not null,
  phone text,
  type text not null check (type in ('BAR_RESTAURANT','FIESTA_PENA','SPORTS_CLUB','COMPANY','EVENT','SCHOOL','OTHER')),
  quantity int check (quantity is null or quantity > 0),
  products text,
  deadline date,
  message text,
  status text not null default 'NEW' check (status in ('NEW','CONTACTED','QUOTED','WON','LOST')),
  created_at timestamptz not null default now()
);

-- ---------- Gift cards (redeemed as a single-use fixed discount code) ----------
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  code extensions.citext unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR',
  purchaser_email extensions.citext not null,
  recipient_email extensions.citext not null,
  recipient_name text,
  sender_name text,
  message text,
  stripe_checkout_session_id text unique,
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','REDEEMED','CANCELLED')),
  discount_id uuid references public.discounts(id) on delete set null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Creator / designer applications ----------
alter table public.creators drop constraint if exists creators_status_check;
alter table public.creators add constraint creators_status_check check (status in ('PENDING','ACTIVE','PAUSED','REJECTED','ARCHIVED'));
alter table public.creators add column if not exists kind text check (kind in ('DESIGNER','INFLUENCER','AFFILIATE'));
alter table public.creators add column if not exists handle text;
alter table public.creators add column if not exists platform text;
alter table public.creators add column if not exists audience_size int;
alter table public.creators add column if not exists portfolio_url text;
alter table public.creators add column if not exists application_message text;

-- ---------- RLS for new tables (server writes with service role; staff reads) ----------
alter table public.points_ledger enable row level security;
alter table public.b2b_requests enable row level security;
alter table public.gift_cards enable row level security;
do $$
declare t text;
begin
  foreach t in array array['points_ledger','b2b_requests','gift_cards'] loop
    execute format('drop policy if exists staff_read_restricted on public.%I', t);
    execute format('create policy staff_read_restricted on public.%I for select to authenticated using (public.has_staff_role(array[''ADMIN'',''CUSTOMER_SUPPORT'']))', t);
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.has_staff_role(array[''ADMIN''])) with check (public.has_staff_role(array[''ADMIN'']))', t);
  end loop;
end $$;
drop policy if exists own_points on public.points_ledger;
create policy own_points on public.points_ledger for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = auth.uid()));
