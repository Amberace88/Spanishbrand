-- =====================================================================
-- 5. Comercio solidario: the brand donates a fixed amount per item sold to
--    registered non-profits. Customers choose the cause; nothing extra is charged.
--    Partner names are only shown publicly once an agreement is signed.
-- =====================================================================

create table if not exists public.cause_partners (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  cause text not null check (cause in ('VETERANOS','MAYORES','INFANCIA','ANIMALES')),
  name text not null,
  legal_form text,                 -- Fundación / Asociación de utilidad pública …
  registry_number text,            -- Registro Nacional de Asociaciones / Registro de Fundaciones
  website text,
  donate_url text,                 -- direct donations go to the partner, never through the shop
  logo text,
  agreement_signed boolean not null default false,
  agreement_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cause_reports (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  period date not null,            -- first day of the month
  cause text not null check (cause in ('VETERANOS','MAYORES','INFANCIA','ANIMALES')),
  partner_id uuid references public.cause_partners(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  certificate_url text,            -- donation certificate issued by the partner
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (brand_id, period, cause)
);

-- Donation per item sold (brand money), configurable in Admin → Ajustes.
update public.brand_settings
   set settings = coalesce(settings, '{}'::jsonb) || '{"donation_per_item": 1.00}'::jsonb
 where brand_id = '5b1e0000-0000-4000-8000-000000000001' and not (coalesce(settings, '{}'::jsonb) ? 'donation_per_item');

-- Aggregated, non-personal totals for the public transparency page.
create or replace function public.cause_totals(p_brand uuid, p_from timestamptz, p_to timestamptz)
returns table (cause text, items bigint, orders bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(o.metadata->>'cause', 'SIN_ELEGIR') as cause,
         coalesce(sum(i.quantity), 0)::bigint as items,
         count(distinct o.id)::bigint as orders
    from public.orders o
    join public.order_items i on i.order_id = o.id
   where o.brand_id = p_brand
     and o.payment_status in ('PAID', 'PARTIALLY_REFUNDED')
     and o.created_at >= p_from and o.created_at < p_to
   group by 1
$$;
revoke all on function public.cause_totals(uuid, timestamptz, timestamptz) from public, anon, authenticated;

alter table public.cause_partners enable row level security;
alter table public.cause_reports enable row level security;
drop policy if exists public_read on public.cause_partners;
create policy public_read on public.cause_partners for select to anon, authenticated using (active and agreement_signed);
drop policy if exists public_read on public.cause_reports;
create policy public_read on public.cause_reports for select to anon, authenticated using (published);
do $$
declare t text;
begin
  foreach t in array array['cause_partners','cause_reports'] loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.has_staff_role(array[''ADMIN''])) with check (public.has_staff_role(array[''ADMIN'']))', t);
  end loop;
end $$;

-- Club: redeem points atomically (returns false if the balance is insufficient).
create or replace function public.redeem_points(p_customer_id uuid, p_points int) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok int;
begin
  if p_points <= 0 then return false; end if;
  update public.customers set points = points - p_points, updated_at = now()
   where id = p_customer_id and member_number is not null and points >= p_points;
  get diagnostics ok = row_count;
  if ok = 1 then
    insert into public.points_ledger (customer_id, points, reason) values (p_customer_id, -p_points, 'REDEEM');
    return true;
  end if;
  return false;
end $$;
revoke all on function public.redeem_points(uuid, int) from public, anon, authenticated;
