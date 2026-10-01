-- Storefront listing in one round trip: products with their first images and one variant per
-- colour/price (all variants for personalisable bases). Replaces a client-side join that pulled
-- every size × colour row (≈100k rows) and stalled cold server instances.
create or replace function public.listing_products(p_brand uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.published_at desc nulls last, x.id), '[]'::jsonb)
  from (
    select p.id, p.name, p.slug, p.short_description, p.retail_price, p.compare_at_price, p.currency, p.product_type,
           p.limited, p.limited_type, p.limited_until, p.limited_quantity, p.limited_sold, p.personalization, p.tags,
           p.updated_at, p.featured, p.published_at, jsonb_build_object('catalog', jsonb_build_object('design', p.metadata->'catalog'->>'design')) as metadata,
           (select jsonb_build_object('code', c.code) from categories c where c.id = p.category_id) as categories,
           (select jsonb_build_object('slug', co.slug, 'name', co.name) from collections co where co.id = p.collection_id) as collections,
           (select coalesce(jsonb_agg(jsonb_build_object('url', i.url, 'alt', i.alt, 'sort', i.sort, 'kind', i.kind, 'variant_id', i.variant_id) order by i.sort), '[]'::jsonb)
              from product_images i where i.product_id = p.id and i.sort < 4 and i.kind <> 'PRINT_FILE') as product_images,
           case when p.personalization is not null then
             (select coalesce(jsonb_agg(to_jsonb(v) order by v.sort), '[]'::jsonb)
                from (select id, variant_name, size, color, color_hex, retail_price, compare_at_price, active, stock_status, sort
                        from product_variants pv where pv.product_id = p.id and pv.active) v)
           else
             (select coalesce(jsonb_agg(to_jsonb(v) order by v.sort), '[]'::jsonb)
                from (select distinct on (coalesce(color_hex, color, ''), retail_price)
                             id, size, color, color_hex, retail_price, active, stock_status, sort
                        from product_variants pv where pv.product_id = p.id and pv.active
                        order by coalesce(color_hex, color, ''), retail_price, sort) v)
           end as product_variants
    from products p
    where p.brand_id = p_brand and p.status = 'PUBLISHED' and p.fulfillment_eligible and p.visibility = 'PUBLIC'
  ) x;
$$;
