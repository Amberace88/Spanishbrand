-- Storefront listing with colour data for the merchandising engine (src/lib/catalog/merch.ts).
-- Same signature and row shape as 20261003000001 plus two small fields, so older app builds keep working:
--  * images: `color` — the garment colour of each of the first 4 photos (from its variant), so cards can tell
--    a black mockup from a light-blue one;
--  * variants (non-personalisable): `image` — the first photo of that colour (set by the catalog builder),
--    only for the first 4 colours, so a card can lead with the most striking colour instead of whichever
--    colour the provider rendered first. ~130 bytes × ≤4 per garment: a few hundred KB per full listing read,
--    once per hour per the shared data cache (see queries.ts).
-- The app degrades gracefully without this migration (photos inherit the first variant's colour).
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
           (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('url', i.url, 'sort', i.sort, 'kind', i.kind, 'color', pv.color)) order by i.sort), '[]'::jsonb)
              from product_images i left join product_variants pv on pv.id = i.variant_id
             where i.product_id = p.id and i.sort < 4 and i.kind <> 'PRINT_FILE') as product_images,
           case when p.personalization is not null then
             (select coalesce(jsonb_agg(to_jsonb(v) order by v.sort), '[]'::jsonb)
                from (select id, variant_name, size, color, color_hex, retail_price, compare_at_price, active, stock_status, sort
                        from product_variants pv where pv.product_id = p.id and pv.active) v)
           else
             (select coalesce(jsonb_agg((to_jsonb(v) - 'ckey' - 'csort' - 'rk' - 'mn' - 'mx' - 'pn' - 'img') || case when v.rk <= 4 and v.img is not null then jsonb_build_object('image', v.img) else '{}'::jsonb end order by v.sort), '[]'::jsonb)
                from (select d.*,
                             dense_rank() over (order by d.csort, d.ckey) as rk,
                             min(d.retail_price) over () as mn,
                             max(d.retail_price) over () as mx,
                             row_number() over (partition by d.retail_price order by d.sort) as pn
                        from (select distinct on (coalesce(color_hex, color, ''), retail_price)
                                     id, size, color, color_hex, retail_price, active, stock_status, sort, image as img,
                                     coalesce(color_hex, color, '') as ckey,
                                     min(sort) over (partition by coalesce(color_hex, color, '')) as csort
                                from product_variants pv where pv.product_id = p.id and pv.active
                               order by coalesce(color_hex, color, ''), retail_price, sort) d) v
               where v.rk <= 6 or (v.pn = 1 and (v.retail_price = v.mn or v.retail_price = v.mx)))
           end as product_variants
    from products p
    where p.brand_id = p_brand and p.status = 'PUBLISHED' and p.fulfillment_eligible and p.visibility = 'PUBLIC'
  ) x;
$$;
