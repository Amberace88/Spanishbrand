-- 10. Catalog builder: per-job lease so several runners (browser + server cron) never work on the same job.
alter table public.catalog_jobs add column if not exists locked_until timestamptz;
create index if not exists catalog_jobs_pending_idx on public.catalog_jobs (brand_id, phase) where phase not in ('done','failed');
insert into supabase_migrations.schema_migrations (version, name) values ('20261001000010','catalog_locks') on conflict do nothing;
select count(*) filter (where locked_until is null) as unlocked from public.catalog_jobs;
