-- 9. Tapas & Vermut → Tapas & Vino; Profesiones collection (designs come from the catalog builder).
update public.collections set name = 'TAPAS & VINO', tagline = 'Un vino, unas tapas y la mejor compañía.'
where slug = 'tapas';
insert into public.collections (brand_id, slug, name, tagline, story, status, featured, sort, seo_title, seo_description)
select b.id, 'profesiones', 'PROFESIONES', 'Orgullo de oficio: sanidad, emergencias, taxi, campo, cocina y más.',
  'Una línea para la gente que mueve el país cada día. Cada diseño existe con el sello de la casa o limpio, y puedes añadir tu nombre o cambiar el texto en «Diseña en este estilo».',
  'ACTIVE', true, 12, 'Camisetas de profesiones: sanidad, bomberos, taxi, cocina…',
  'Camisetas, sudaderas y tazas para médicos, enfermería, bomberos, taxistas, camioneros, docentes, cocineros y más. Personalizables con tu nombre.'
from public.brands b where b.id = '5b1e0000-0000-4000-8000-000000000001'
on conflict do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261001000009','wine_professions') on conflict do nothing;
select slug, name from public.collections where slug in ('tapas','profesiones');
-- Estilo militar
insert into public.collections (brand_id, slug, name, tagline, story, status, featured, sort, seo_title, seo_description)
select b.id, 'militar', 'ESTILO MILITAR', 'Camuflaje, parches y orgullo de servicio.',
  'Inspiración militar sin emblemas oficiales: camuflajes, parches de bandera y homenajes a quienes sirvieron.',
  'ACTIVE', false, 13, 'Camisetas estilo militar: camuflaje y parches de España',
  'Camisetas, sudaderas y tazas de estilo militar: camuflaje, parche de bandera, veteranos y más.'
from public.brands b where b.id = '5b1e0000-0000-4000-8000-000000000001'
on conflict do nothing;
