-- =====================================================================
-- 6. Catalog builder: resumable jobs that turn the brand design library into
--    real provider products (print files, variants, mappings, mockups, publish).
-- =====================================================================
create table if not exists public.catalog_jobs (
  key text primary key,                         -- res:<blueprint> | p:<design>:<blueprint> | b:<blueprint> | t:<template>:<blueprint>
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null check (kind in ('RESOLVE','PRODUCT')),
  phase text not null default 'new',
  product_id uuid references public.products(id) on delete set null,
  state jsonb not null default '{}'::jsonb,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalog_jobs_brand_idx on public.catalog_jobs (brand_id, kind, phase);

drop trigger if exists trg_catalog_jobs_updated on public.catalog_jobs;
create trigger trg_catalog_jobs_updated before update on public.catalog_jobs
  for each row execute function public.set_updated_at();

alter table public.catalog_jobs enable row level security;
drop policy if exists staff_all on public.catalog_jobs;
create policy staff_all on public.catalog_jobs for all to authenticated
  using (public.has_staff_role(array['ADMIN'])) with check (public.has_staff_role(array['ADMIN']));
