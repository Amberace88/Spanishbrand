-- =====================================================================
-- 8. Returns (devoluciones): withdrawal (desistimiento, art. 102-108 TRLGDCU) and
--    product issues (defect / damage / wrong item) with photo evidence that can be
--    forwarded to the print provider to recover the cost.
-- =====================================================================
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  rma text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_email citext not null,
  type text not null check (type in ('ISSUE','WITHDRAWAL')),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','NEED_INFO','APPROVED','AWAITING_RETURN','RECEIVED','RESOLVED','REJECTED','CANCELLED')),
  resolution text check (resolution in ('REFUND','REPRINT','EXCHANGE','STORE_CREDIT')),
  exchange_note text,
  contact jsonb not null default '{}'::jsonb,          -- name, phone
  address jsonb,                                       -- for reprints / exchanges
  description text,
  declarations jsonb not null default '{}'::jsonb,     -- accepted statements with timestamp (evidence)
  delivered_at timestamptz,                            -- receipt date used for deadlines
  withdrawal_deadline timestamptz,                     -- delivered + 14 days
  return_deadline timestamptz,                         -- request + 14 days (art. 108.1)
  provider_deadline timestamptz,                       -- provider claim window (30 days from delivery)
  provider_id text,
  provider_order_id text,
  provider_claim jsonb not null default '{}'::jsonb,   -- status, ref, submitted_at, recovered_amount
  return_tracking text,
  refund_amount numeric(10,2),
  deduction_amount numeric(10,2),
  admin_notes text,
  customer_message text,
  ip inet,
  user_agent text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists return_requests_brand_idx on public.return_requests (brand_id, status, created_at desc);
create index if not exists return_requests_order_idx on public.return_requests (order_id);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  quantity int not null check (quantity > 0),
  reason text not null,
  personalized boolean not null default false,
  details text
);
create index if not exists return_items_return_idx on public.return_items (return_id);

create table if not exists public.return_photos (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  path text not null,
  kind text not null default 'other',
  created_at timestamptz not null default now()
);
create index if not exists return_photos_return_idx on public.return_photos (return_id);

create table if not exists public.return_events (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  type text not null,
  message text,
  visible_to_customer boolean not null default false,
  actor_email text,
  created_at timestamptz not null default now()
);
create index if not exists return_events_return_idx on public.return_events (return_id, created_at);

drop trigger if exists trg_return_requests_updated on public.return_requests;
create trigger trg_return_requests_updated before update on public.return_requests
  for each row execute function public.set_updated_at();

alter table public.return_requests enable row level security;
alter table public.return_items enable row level security;
alter table public.return_photos enable row level security;
alter table public.return_events enable row level security;
do $$
declare t text;
begin
  foreach t in array array['return_requests','return_items','return_photos','return_events'] loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.has_staff_role(array[''ADMIN'',''CUSTOMER_SUPPORT''])) with check (public.has_staff_role(array[''ADMIN'',''CUSTOMER_SUPPORT'']))', t);
  end loop;
end $$;

-- private bucket for evidence photos (server uploads with the service role; staff view via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('returns', 'returns', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false;

insert into supabase_migrations.schema_migrations (version, name) values ('20261001000008','returns') on conflict do nothing;
