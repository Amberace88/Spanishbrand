-- Leaner storefront listing (Supabase free-plan egress). Same signature and row shape as 20261001000011,
-- so the app needs no change; it only returns less:
--  * images: no alt text / variant link (cards fall back to the product name; the product page loads its own
--    full record) — still the first 4 so collection pages find a LIFESTYLE hero;
--  * non-personalisable products: one row per colour/price for the first 6 colours (what a card shows) plus
--    the first cheapest and first dearest row (the "desde" price and whether it varies), instead of every colour —
--    all-colour garments carried up to 48 colours × size premiums, the bulk of the ~4 MB payload.
-- Personalisable bases keep every active variant (the designer / Personaliza need all sizes).
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
           (select coalesce(jsonb_agg(jsonb_build_object('url', i.url, 'sort', i.sort, 'kind', i.kind) order by i.sort), '[]'::jsonb)
              from product_images i where i.product_id = p.id and i.sort < 4 and i.kind <> 'PRINT_FILE') as product_images,
           case when p.personalization is not null then
             (select coalesce(jsonb_agg(to_jsonb(v) order by v.sort), '[]'::jsonb)
                from (select id, variant_name, size, color, color_hex, retail_price, compare_at_price, active, stock_status, sort
                        from product_variants pv where pv.product_id = p.id and pv.active) v)
           else
             (select coalesce(jsonb_agg(to_jsonb(v) - 'ckey' - 'csort' - 'rk' - 'mn' - 'mx' - 'pn' order by v.sort), '[]'::jsonb)
                from (select d.*,
                             dense_rank() over (order by d.csort, d.ckey) as rk,
                             min(d.retail_price) over () as mn,
                             max(d.retail_price) over () as mx,
                             row_number() over (partition by d.retail_price order by d.sort) as pn
                        from (select distinct on (coalesce(color_hex, color, ''), retail_price)
                                     id, size, color, color_hex, retail_price, active, stock_status, sort,
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
