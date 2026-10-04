# Print audit — 2026-10-04

Owner report: on live Fútbol PRO products (Colores de Sevilla hoodie · SEVILLA 41, Colores de Barcelona tee ·
BARCELONA 08, Colores de Madrid rojiblanco tee · MADRID 28, Colores de Gijón hoodie · GIJÓN 33) the giant back
numbers ran to the print-area edges, the wear texture ate the strokes and on hoodies the hood and seams hid parts.
This audit checks **every active design on every product it is built on** for that class of defect.

## Method

* **Real renderer, pixels** — `tests/print-audit-render.test.tsx` (manual) renders every active design, front and back,
  in print mode exactly as the catalog builder does (all-over jerseys: the marks over the pattern), 600 × 800 px
  (0.5 mm/px on a 12 in print area), and measures the ink box (alpha > 24), ink in the hoodie pocket band, thin
  strokes (ink lost to a 1 mm opening) and worn ink. Phase `before` = raw layers (what was printed until now),
  phase `after` = the layers each product prints now. Mugs, posters, stickers, cushions… crop to the content and
  centre it with fixed margins (`render.tsx`), so they cannot touch the edge; they are covered by the thin-text check.
* **Geometry, CI** — `src/lib/catalog/print-safety.ts` computes the real ink box of every layer (font metrics for
  text, `art-ink.json` for illustrations) and `tests/print-audit.test.ts` fails CI when any product of any active
  design leaves its zone, text runs into another element, or text / outlines are too small to print.

### Flags

| code | rule |
|---|---|
| EDGE | ink closer than 4 % to an edge of the print area (all-over panels: inside 12 % / 10 %) |
| HOOD | hoodie back starting in the top 10 % (hood seam) |
| POCKET | hoodie front: art over 30 % tall running into the bottom 28 % (kangaroo pocket) |
| TEXT_OVERFLOW | text wider than its box that runs into another element |
| THIN_TEXT / THIN_STROKE | cap height < 2.5 mm / outline < 0.35 mm as printed on that garment |
| THIN (pixels) | > 12 % of the ink is finer than 1 mm |

### Safe zones (margins: left / top / right / bottom)

| zone | blueprints | margins |
|---|---|---|
| frontal | tee, sweat, womtee, womsweat, womcrop, kids, toddler, baby, oversize tee, tote, apron | 5 / 4 / 5 / 4 % |
| frontal sudadera | hoodie, kidshoodie, hoodieoversize | 6 / 4 / 6 / **28 %** (pocket) |
| espalda | tee, sweat, womtee, womsweat, kids, oversize tee | 8 / 5 / 8 / 5 % |
| espalda sudadera | hoodie, hoodieoversize | 8 / **10** / 8 / 5 % (hood) |
| panel sublimado | jersey (marks over the pattern) | 12 / 12 / 12 / 10 % |

`fitLayers` leaves a design untouched when its ink is inside the zone; otherwise it scales the whole design
uniformly (never up) and moves it inside, keeping the horizontal centre and the top where they fit. The print
file, the mockup source (`/api/catalog/mockup-art?…&b=<blueprint>`) and the design version all use the same
effective layers.

## Result

* 445 renders (196 clean, **249 flagged before**): EDGE 164 · POCKET 147 · HOOD 46 · THIN 3.
* After the fixes: **0 flags** on the pixel audit and on the geometric audit (CI).
* 256 designs print differently now → **1015 published products** are queued for a zero-downtime rebuild
  (248 forced by the REBUILD list: the redrawn Fútbol PRO line). By product: hoodie 218, tee 139, sweat 111, womtee 100, tote 60, kids 55, framed 48, mug 48, poster 48, teeoversize 42, womcrop 37, hoodieoversize 37, kidshoodie 15, womsweat 13, toddler 12, jersey 10, baby 10, apron 6, flag 3, bandana 2, tumbler 1.
* Contact sheets (before | after, safe zone dashed): `/tmp/claude-0/-home-claude-spanishbrand/3017eefa-a49c-5440-a700-89e530796fc5/scratchpad/print-audit/contact-01…14.png`.

### Redrawn art

* **Fútbol PRO** (`node scripts/futbol-art.mjs`): city backs `fp-ciudad-*-espalda` — city name and number as one block
  from 11 % down, numeral 1900 → 1370 px (−28 %), ≤ 75 % of the width, wear 0.36 → 0.10, dark outlines (invisible on
  black, e.g. Sevilla) swapped for a readable colour; Campeones backs (`campeones-mundo-*-espalda`: 26 at 1190 px in
  one block; `campeones-espalda-*`: halftone and type inside the seams); jersey panels (`camiseta-*-dorsal` numeral
  −28 %, `-frente` smaller); city fronts (shirt and name inside the seams, lighter wear); Bufanda de Campeones and
  Siempre Contigo (scarves end with their fringe inside the print area instead of running off the edges); Afición
  · Estadio (stadium inside). All other pieces: wear capped at 0.30 and an automatic safe area in `out()`
  (8 % sides, 6 % top on fronts / 10 % on backs) that scales any piece drawn beyond it and logs it.
* **Statement**: `st-espalda-sol-pecho` chest sun redrawn with 12 broad rays (the 24 tapered rays printed under 1 mm).
* **Familia**: `pequeno-leon`, `pequeno-leon-noche` — PEQUEÑO / LEÓN re-spaced (the wide word ran into the lion).
* Statement, Sabiduría and León art had no art-level defect beyond edges / pocket (handled by the zones): the spray /
  stencil textures that the pixel audit marks as worn are the style of those pieces and their strokes stay ≥ 1 mm.

## Rebuild of published products

`designVersion(design, bp)` hashes what product `p:<design>:<bp>` prints (effective front + back layers, poster
background, render mode, content hash of each static illustration from `art-ink.json`, `RENDER_REV`). The builder
records it (`state.designVersion`, plus `state.rebuildTag`) when it renders the print files. Products built before
versions existed are compared with `design-version-baseline.json` (the versions as of this audit, pre-fix).

`rebuildCandidates` = done jobs whose recorded/baseline version differs from the current one, or whose design is in
`REBUILD` with a tag the product was not built with. With the switch on (**/admin/catalogo → “Reconstruir diseños
modificados (N)”**, stored in `brand_settings.settings.catalogRebuild`), each catalog cron run starts **at most one**
replacement and only while fewer than two are in flight, so new products keep progressing. The replacement is built
next to the live product and takes over its slug when it publishes (the old one is archived, orders intact).

After changing any art: run its script, then `node scripts/art-ink.mjs` (CI checks the manifest).

## Flagged designs (before → fix)

Margins = ink margins left/top/right/bottom in % of the print area, before → after (strictest garment).

| design | side | before | margins before → after | fix |
|---|---|---|---|---|
| arte-alhambra | frente | EDGE l=3.0% r=3.0% · POCKET hasta 76% | 3/4/3/24 → 6/4/6/29 (hoodie) | zona segura en el render |
| arte-alhambra-doble | espalda | EDGE l=3.0% r=3.0% · HOOD t=6.4% | 3/6/3/22 → 8/10/8/26 (hoodie) | zona segura en el render |
| arte-barca | frente | EDGE l=3.0% r=3.0% | 3/8/3/28 → 6/8/6/32 (hoodie) | zona segura en el render |
| arte-castellers | frente | POCKET hasta 76% | 18/4/18/24 → 20/4/20/28 (hoodie) | zona segura en el render |
| arte-chiringuito | frente | EDGE l=3.0% r=3.0% | 3/7/3/27 → 6/7/6/31 (hoodie) | zona segura en el render |
| arte-churros | frente | EDGE l=3.0% r=3.0% · POCKET hasta 74% | 3/7/3/27 → 6/7/6/31 (hoodie) | zona segura en el render |
| arte-ciclista | frente | POCKET hasta 76% | 6/4/6/24 → 8/4/8/28 (hoodie) | zona segura en el render |
| arte-estadio | frente | EDGE l=3.0% r=3.0% · POCKET hasta 76% | 3/4/3/24 → 6/4/6/29 (hoodie) | zona segura en el render |
| arte-estadio-doble | espalda | EDGE l=3.0% r=3.0% · HOOD t=6.4% | 3/6/3/22 → 8/10/8/26 (hoodie) | zona segura en el render |
| arte-fallas | frente | POCKET hasta 76% | 11/4/11/24 → 13/4/13/28 (hoodie) | zona segura en el render |
| arte-fallas-doble | espalda | HOOD t=4.0% | 9/4/9/20 → 9/10/9/14 (hoodie) | zona segura en el render |
| arte-faro | frente | EDGE l=3.0% r=3.0% · POCKET hasta 76% | 3/4/3/24 → 6/4/6/29 (hoodie) | zona segura en el render |
| arte-faro-doble | espalda | EDGE l=3.0% r=3.0% · HOOD t=6.1% | 3/6/3/22 → 8/10/8/26 (hoodie) | zona segura en el render |
| arte-feria | frente | POCKET hasta 76% | 8/4/8/24 → 11/4/11/28 (hoodie) | zona segura en el render |
| arte-flamenca | frente | POCKET hasta 76% | 11/4/11/24 → 13/4/13/28 (hoodie) | zona segura en el render |
| arte-flamenca-doble | espalda | HOOD t=4.0% | 9/4/9/20 → 9/10/9/14 (hoodie) | zona segura en el render |
| arte-galeon | frente | EDGE l=3.0% r=3.0% · POCKET hasta 74% | 3/6/3/26 → 6/6/6/30 (hoodie) | zona segura en el render |
| arte-galeon-doble | espalda | EDGE l=3.0% r=3.0% · HOOD t=7.7% | 3/8/3/24 → 8/10/8/29 (hoodie) | zona segura en el render |
| arte-guitarra | frente | POCKET hasta 76% | 5/4/5/24 → 7/4/7/28 (hoodie) | zona segura en el render |
| arte-jamon | frente | EDGE l=3.0% r=3.0% | 3/11/3/31 → 6/11/6/35 (hoodie) | zona segura en el render |
| arte-moto | frente | POCKET hasta 76% | 6/4/6/24 → 8/4/8/28 (hoodie) | zona segura en el render |
| arte-olivo | frente | EDGE l=3.0% r=3.0% · POCKET hasta 74% | 3/7/3/27 → 6/7/6/31 (hoodie) | zona segura en el render |
| arte-padel | frente | POCKET hasta 76% | 7/4/7/24 → 10/4/10/28 (hoodie) | zona segura en el render |
| arte-paella | frente | EDGE l=3.0% r=3.0% | 3/7/3/27 → 6/7/6/32 (hoodie) | zona segura en el render |
| arte-peregrino | frente | EDGE l=3.0% r=3.0% · POCKET hasta 76% | 3/4/3/24 → 6/4/6/29 (hoodie) | zona segura en el render |
| arte-portero | frente | EDGE l=3.0% r=3.0% | 3/12/3/32 → 6/12/6/35 (hoodie) | zona segura en el render |
| arte-pueblo-blanco | frente | POCKET hasta 76% | 7/4/7/24 → 10/4/10/28 (hoodie) | zona segura en el render |
| arte-quijote | frente | POCKET hasta 76% | 10/4/10/24 → 12/4/12/28 (hoodie) | zona segura en el render |
| arte-quijote-doble | espalda | HOOD t=4.0% | 8/4/8/20 → 8/10/8/15 (hoodie) | zona segura en el render |
| arte-rally | frente | EDGE l=3.0% r=3.0% · POCKET hasta 75% | 3/6/3/26 → 6/6/6/30 (hoodie) | zona segura en el render |
| arte-sanfermin | frente | POCKET hasta 76% | 8/4/8/24 → 10/4/10/28 (hoodie) | zona segura en el render |
| arte-toro | frente | EDGE l=3.0% r=3.0% | 3/8/3/28 → 6/8/6/32 (hoodie) | zona segura en el render |
| arte-toro-doble | espalda | EDGE l=3.0% r=3.0% | 3/10/3/26 → 8/10/8/33 (hoodie) | zona segura en el render |
| arte-vermut | frente | EDGE l=3.0% r=3.0% | 3/9/3/29 → 6/9/6/33 (hoodie) | zona segura en el render |
| arte-vino | frente | EDGE l=3.0% r=3.0% · POCKET hasta 75% | 3/5/3/25 → 6/5/6/29 (hoodie) | zona segura en el render |
| ciudad-alicante-cartel | frente | POCKET hasta 80% | 7/10/7/20 → 9/4/9/28 (hoodie) | zona segura en el render |
| ciudad-alicante-cartel-claro | frente | POCKET hasta 80% | 7/10/7/20 → 9/4/9/28 (hoodie) | zona segura en el render |
| ciudad-bilbao-cartel | frente | POCKET hasta 83% | 7/7/7/17 → 12/4/12/28 (hoodie) | zona segura en el render |
| ciudad-bilbao-cartel-claro | frente | POCKET hasta 83% | 7/7/7/17 → 12/4/12/28 (hoodie) | zona segura en el render |
| ciudad-cadiz-cartel | frente | POCKET hasta 85% | 7/6/7/15 → 13/4/13/28 (hoodie) | zona segura en el render |
| ciudad-cadiz-cartel-claro | frente | POCKET hasta 85% | 7/6/7/15 → 13/4/13/28 (hoodie) | zona segura en el render |
| ciudad-granada-cartel | frente | POCKET hasta 81% | 7/9/7/19 → 9/4/9/28 (hoodie) | zona segura en el render |
| ciudad-granada-cartel-claro | frente | POCKET hasta 81% | 7/9/7/19 → 9/4/9/28 (hoodie) | zona segura en el render |
| ciudad-las-palmas-cartel | frente | EDGE t=2.0% | 7/2/7/12 → 7/4/7/10 (tee) | zona segura en el render |
| ciudad-madrid-cartel | frente | POCKET hasta 81% | 7/9/7/19 → 10/4/10/28 (hoodie) | zona segura en el render |
| ciudad-madrid-cartel-claro | frente | POCKET hasta 81% | 7/9/7/19 → 10/4/10/28 (hoodie) | zona segura en el render |
| ciudad-malaga-cartel | frente | POCKET hasta 82% | 7/8/7/18 → 11/4/11/28 (hoodie) | zona segura en el render |
| ciudad-malaga-cartel-claro | frente | POCKET hasta 82% | 7/8/7/18 → 11/4/11/28 (hoodie) | zona segura en el render |
| ciudad-sevilla-cartel | frente | POCKET hasta 81% | 7/8/7/19 → 10/4/10/28 (hoodie) | zona segura en el render |
| ciudad-sevilla-cartel-claro | frente | POCKET hasta 81% | 7/8/7/19 → 10/4/10/28 (hoodie) | zona segura en el render |
| fp-aficion-estadio | frente | EDGE l=2.0% r=2.0% · POCKET hasta 96% | 2/6/2/5 → 16/4/16/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-bufanda-espana | frente | EDGE l=2.0% r=2.0% · POCKET hasta 85% | 2/6/2/15 → 14/4/14/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-barcelona | espalda | EDGE l=8.2% r=8.2% | 8/13/8/28 → 20/15/20/43 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-barcelona | frente | EDGE t=10.9% | 15/11/15/59 → 19/14/19/59 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-bilbao | espalda | EDGE l=6.7% r=6.7% | 7/13/7/28 → 19/15/19/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-bilbao | frente | EDGE t=11.0% | 25/11/19/57 → 27/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-cadiz | espalda | EDGE l=9.3% r=9.3% | 9/13/9/28 → 21/15/21/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-cadiz | frente | EDGE t=10.9% | 33/11/19/57 → 35/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-coruna | espalda | EDGE l=9.2% r=9.0% | 9/13/9/28 → 20/15/20/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-coruna | frente | EDGE t=11.0% | 20/11/19/57 → 23/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-donostia | espalda | EDGE l=7.8% r=7.8% | 8/13/8/28 → 20/15/20/42 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-donostia | frente | EDGE t=10.9% | 15/11/15/57 → 19/14/19/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-madrid | espalda | EDGE l=8.3% r=8.2% | 8/13/8/28 → 20/15/20/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-madrid | frente | EDGE t=11.0% | 21/11/19/57 → 23/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-madrid-rojiblanco | espalda | EDGE l=8.3% r=8.2% | 8/13/8/28 → 20/15/20/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-madrid-rojiblanco | frente | EDGE t=11.0% | 21/11/19/57 → 23/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-sevilla | espalda | EDGE l=6.8% r=7.0% | 7/13/7/28 → 19/15/19/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-sevilla | frente | EDGE t=11.0% | 21/11/19/57 → 24/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-sevilla-verdiblanco | espalda | EDGE l=6.8% r=7.0% | 7/13/7/28 → 19/15/19/41 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-sevilla-verdiblanco | frente | EDGE t=11.0% | 21/11/19/57 → 24/14/23/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-valencia | espalda | EDGE l=6.7% r=6.7% | 7/13/7/28 → 19/15/19/42 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-camiseta-valencia | frente | EDGE t=11.0% | 15/11/15/57 → 19/14/19/58 (jersey) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-bandas | frente | POCKET hasta 81% | 5/6/5/19 → 10/4/10/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-espalda-dia | espalda | HOOD t=3.9% | 5/4/5/8 → 12/11/12/26 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-espalda-noche | espalda | HOOD t=3.9% | 5/4/5/8 → 12/11/12/26 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-mundo-dia | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.3% | 2/6/2/5 → 14/11/14/21 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-mundo-dia | frente | POCKET hasta 88% | 4/5/4/12 → 12/4/12/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-mundo-noche | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.3% | 2/6/2/5 → 14/11/14/21 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-mundo-noche | frente | POCKET hasta 88% | 4/5/4/12 → 12/4/12/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-script-dia | frente | EDGE l=2.5% r=1.5% · POCKET hasta 86% | 3/6/2/14 → 9/4/9/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-campeones-script-noche | frente | EDGE l=2.5% r=1.5% · POCKET hasta 86% | 3/6/2/14 → 9/4/9/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-alicante | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/33 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-alicante | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-barcelona | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/35 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-barcelona | frente | EDGE l=3.3% t=3.5% r=3.3% b=0.0% · POCKET hasta 100% | 3/4/3/0 → 18/4/18/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-bilbao | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/33 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-bilbao | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-cadiz | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-cadiz | frente | EDGE t=3.4% b=0.0% · POCKET hasta 100% | 4/3/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-coruna | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-coruna | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-donostia | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/34 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-donostia | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-elche | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-elche | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-getafe | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-getafe | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-gijon | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-gijon | frente | EDGE t=3.4% b=0.0% · POCKET hasta 100% | 4/3/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-girona | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-girona | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-granada | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-granada | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-las-palmas | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/36 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-las-palmas | frente | EDGE l=3.3% t=3.5% r=3.3% b=1.6% · POCKET hasta 98% | 3/4/3/2 → 17/4/17/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-madrid | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-madrid | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-madrid-rojiblanco | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-madrid-rojiblanco | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-malaga | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-malaga | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-mallorca | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/35 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-mallorca | frente | EDGE l=3.3% t=3.5% r=3.3% b=0.0% · POCKET hasta 100% | 3/4/3/0 → 18/4/18/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-oviedo | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/31 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-oviedo | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-pamplona | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/34 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-pamplona | frente | EDGE l=3.3% t=3.5% r=3.3% b=0.0% · POCKET hasta 100% | 3/4/3/0 → 18/4/18/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-santander | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/35 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-santander | frente | EDGE l=3.3% t=3.5% r=3.3% b=0.0% · POCKET hasta 100% | 3/4/3/0 → 18/4/18/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-sevilla | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/33 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-sevilla | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-sevilla-verdiblanco | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/33 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-sevilla-verdiblanco | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-valencia | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/35 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-valencia | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-valladolid | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/37 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-valladolid | frente | EDGE l=3.3% t=3.5% r=3.3% b=0.5% · POCKET hasta 100% | 3/4/3/1 → 17/4/17/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-vigo | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-vigo | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-villarreal | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.6% | 2/7/2/11 → 13/11/12/33 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-villarreal | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-vitoria | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.8% | 2/7/2/11 → 13/11/12/32 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-vitoria | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-zaragoza | espalda | EDGE l=2.0% r=2.0% · HOOD t=6.6% | 2/7/2/11 → 13/11/12/34 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-ciudad-zaragoza | frente | EDGE t=3.5% b=0.0% · POCKET hasta 100% | 4/4/4/0 → 19/4/19/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-domingo-de-partido | frente | POCKET hasta 86% | 6/8/6/14 → 12/4/12/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-dos-estrellas-dia | frente | EDGE l=3.3% r=3.3% · POCKET hasta 88% | 3/6/3/12 → 12/4/12/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-dos-estrellas-noche | frente | EDGE l=3.3% r=3.3% · POCKET hasta 88% | 3/6/3/12 → 12/4/12/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-dos-fechas-dia | frente | EDGE l=3.3% r=3.3% · POCKET hasta 76% | 3/4/3/24 → 8/6/8/30 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-dos-fechas-noche | frente | EDGE l=3.3% r=3.3% · POCKET hasta 76% | 3/4/3/24 → 8/6/8/30 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-futuro-diez | frente | EDGE l=2.0% r=2.0% · POCKET hasta 86% | 2/6/2/14 → 9/4/9/28 (kidshoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-hasta-el-final | frente | EDGE l=2.3% r=2.3% · POCKET hasta 86% | 2/6/2/14 → 10/4/10/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-mi-equipo-dia | frente | EDGE l=3.0% r=3.0% · POCKET hasta 94% | 3/5/3/6 → 14/4/14/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-mi-equipo-noche | frente | EDGE l=3.0% r=3.0% · POCKET hasta 94% | 3/5/3/6 → 14/4/14/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-mi-primer-partido | frente | POCKET hasta 88% | 5/6/5/12 → 13/4/13/28 (kidshoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-noventa-minutos | frente | EDGE l=2.3% t=3.6% r=2.2% | 2/4/2/40 → 8/6/8/44 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-pequeno-campeon-dia | frente | EDGE t=1.6% · POCKET hasta 89% | 7/2/7/11 → 16/4/16/28 (kidshoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-pequeno-campeon-noche | frente | EDGE t=1.6% · POCKET hasta 89% | 7/2/7/11 → 16/4/16/28 (kidshoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-retro-90-espana | frente | POCKET hasta 81% | 6/8/6/20 → 9/4/9/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-retro-balon | frente | POCKET hasta 96% | 5/8/5/4 → 15/4/15/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-retro-club-de-barrio | frente | POCKET hasta 79% | 6/8/6/22 → 8/4/8/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-retro-portero | frente | POCKET hasta 81% | 6/8/6/19 → 9/4/9/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| fp-siempre-contigo | frente | EDGE l=2.0% r=2.0% · POCKET hasta 81% | 2/6/2/19 → 10/4/10/28 (hoodie) | arte redibujado (futbol-art.mjs) + zona |
| leon-coronado | frente | EDGE b=3.6% · POCKET hasta 96% | 14/5/14/4 → 23/4/23/28 (hoodie) | zona segura en el render |
| leon-coronado-noche | frente | EDGE b=3.6% · POCKET hasta 96% | 14/5/14/4 → 23/4/23/28 (hoodie) | zona segura en el render |
| leon-espalda | espalda | EDGE t=1.5% · HOOD t=1.5% | 11/2/11/20 → 11/10/11/12 (hoodie) | zona segura en el render |
| leon-espalda-claro | espalda | EDGE t=1.5% · HOOD t=1.5% | 11/2/11/20 → 11/10/11/12 (hoodie) | zona segura en el render |
| leon-real | frente | POCKET hasta 84% | 6/10/6/16 → 9/4/9/28 (hoodie) | zona segura en el render |
| leon-real-claro | frente | POCKET hasta 82% | 5/7/5/18 → 9/4/9/28 (hoodie) | zona segura en el render |
| mejor-abuelo | frente | POCKET hasta 80% | 28/7/28/20 → 30/4/30/28 (hoodie) | zona segura en el render |
| oficio-abogacia-arte | frente | POCKET hasta 78% | 9/6/9/22 → 12/4/12/28 (hoodie) | zona segura en el render |
| oficio-abogacia-cartel | frente | POCKET hasta 74% | 7/15/7/26 → 7/13/7/29 (hoodie) | zona segura en el render |
| oficio-bomberos-arte | frente | POCKET hasta 78% | 9/6/9/22 → 11/4/11/28 (hoodie) | zona segura en el render |
| oficio-camion-arte | frente | POCKET hasta 78% | 5/10/5/22 → 6/5/6/29 (hoodie) | zona segura en el render |
| oficio-campo-arte | frente | POCKET hasta 78% | 8/6/8/22 → 10/4/10/28 (hoodie) | zona segura en el render |
| oficio-campo-cartel | frente | EDGE t=1.9% · POCKET hasta 88% | 7/2/7/12 → 16/4/16/28 (hoodie) | zona segura en el render |
| oficio-cocina-arte | frente | POCKET hasta 78% | 17/6/17/22 → 19/4/19/28 (hoodie) | zona segura en el render |
| oficio-cocina-cartel | frente | POCKET hasta 77% | 7/13/7/23 → 7/7/7/29 (hoodie) | zona segura en el render |
| oficio-construccion-arte | frente | POCKET hasta 78% | 11/6/11/22 → 14/4/14/28 (hoodie) | zona segura en el render |
| oficio-docente-arte | frente | POCKET hasta 78% | 11/6/11/22 → 13/4/13/28 (hoodie) | zona segura en el render |
| oficio-docente-cartel | frente | POCKET hasta 74% | 7/15/7/26 → 7/13/7/28 (hoodie) | zona segura en el render |
| oficio-electricidad-arte | frente | POCKET hasta 78% | 12/6/12/22 → 15/4/15/28 (hoodie) | zona segura en el render |
| oficio-enfermeria-arte | frente | POCKET hasta 78% | 9/6/9/22 → 12/4/12/28 (hoodie) | zona segura en el render |
| oficio-farmacia-arte | frente | POCKET hasta 78% | 5/9/5/22 → 6/4/6/29 (hoodie) | zona segura en el render |
| oficio-hosteleria-arte | frente | POCKET hasta 78% | 7/6/7/22 → 10/4/10/28 (hoodie) | zona segura en el render |
| oficio-informatica-arte | frente | POCKET hasta 78% | 7/6/7/22 → 10/4/10/28 (hoodie) | zona segura en el render |
| oficio-mecanica-arte | frente | POCKET hasta 78% | 9/6/9/22 → 12/4/12/28 (hoodie) | zona segura en el render |
| oficio-medicina-arte | frente | POCKET hasta 78% | 6/6/6/22 → 9/4/9/28 (hoodie) | zona segura en el render |
| oficio-peluqueria-arte | frente | POCKET hasta 79% | 13/6/13/21 → 17/4/17/30 (hoodie) | zona segura en el render |
| oficio-policia-arte | frente | POCKET hasta 78% | 6/6/6/22 → 9/4/9/28 (hoodie) | zona segura en el render |
| oficio-policia-cartel | frente | POCKET hasta 84% | 7/6/7/16 → 13/4/13/28 (hoodie) | zona segura en el render |
| oficio-taxi-arte | frente | POCKET hasta 78% | 5/6/5/22 → 8/4/8/28 (hoodie) | zona segura en el render |
| oficio-taxi-cartel | frente | POCKET hasta 74% | 7/15/7/26 → 7/13/7/29 (hoodie) | zona segura en el render |
| oficio-veterinaria-arte | frente | POCKET hasta 78% | 12/6/12/22 → 14/4/14/28 (hoodie) | zona segura en el render |
| pequeno-leon | frente | POCKET hasta 80% | 17/7/17/20 → 21/4/21/29 (kidshoodie) | capas reespaciadas |
| pequeno-leon-noche | frente | POCKET hasta 80% | 17/7/17/20 → 21/4/21/29 (kidshoodie) | capas reespaciadas |
| sab-al-mal-tiempo | frente | EDGE t=2.5% · POCKET hasta 86% | 12/3/13/14 → 20/5/20/28 (hoodie) | zona segura en el render |
| sab-al-mal-tiempo-noche | frente | EDGE t=2.5% · POCKET hasta 86% | 12/3/13/14 → 20/5/20/28 (hoodie) | zona segura en el render |
| sab-buen-arbol | frente | EDGE t=2.0% · POCKET hasta 83% | 9/2/8/17 → 16/4/16/29 (hoodie) | zona segura en el render |
| sab-campeon-siesta | frente | EDGE l=2.8% | 3/14/4/35 → 5/14/6/37 (baby) | zona segura en el render |
| sab-chaqueta-por-si-acaso | frente | EDGE t=0.0% | 8/0/8/15 → 8/5/8/7 (tee) | zona segura en el render |
| sab-corazon-rojigualdo | frente | POCKET hasta 78% | 10/7/10/22 → 12/4/12/29 (hoodie) | zona segura en el render |
| sab-de-toda-la-vida | frente | POCKET hasta 84% | 8/4/8/17 → 14/4/14/28 (hoodie) | zona segura en el render |
| sab-de-toda-la-vida-noche | frente | POCKET hasta 84% | 8/4/8/17 → 14/4/14/28 (hoodie) | zona segura en el render |
| sab-dientes-mentira | frente | EDGE l=2.8% | 3/7/4/29 → 6/7/6/32 (kidshoodie) | zona segura en el render |
| sab-hecho-con-alma | frente | POCKET hasta 76% | 10/8/11/24 → 11/4/11/28 (hoodie) | zona segura en el render |
| sab-hecho-con-alma-noche | frente | POCKET hasta 76% | 10/8/11/24 → 11/4/11/28 (hoodie) | zona segura en el render |
| sab-hecho-con-amor | frente | POCKET hasta 76% | 7/8/6/24 → 7/4/7/28 (kidshoodie) | zona segura en el render |
| sab-mil-acentos | frente | POCKET hasta 76% | 8/12/8/24 → 8/9/8/28 (hoodie) | zona segura en el render |
| sab-mil-acentos-noche | frente | POCKET hasta 76% | 8/12/8/24 → 8/9/8/28 (hoodie) | zona segura en el render |
| sab-pequena-matona | frente | EDGE l=2.8% | 3/15/4/36 → 6/14/7/39 (kidshoodie) | zona segura en el render |
| sab-pequena-matona-noche | frente | EDGE l=2.8% | 3/15/4/36 → 6/14/7/39 (kidshoodie) | zona segura en el render |
| sab-pequeno-maton | frente | EDGE l=2.8% | 3/13/4/34 → 6/12/6/37 (kidshoodie) | zona segura en el render |
| sab-pequeno-maton-noche | frente | EDGE l=2.8% | 3/13/4/34 → 6/12/6/37 (kidshoodie) | zona segura en el render |
| st-abanico-de-feria | frente | POCKET hasta 88% | 4/16/4/12 → 7/4/7/28 (hoodie) | zona segura en el render |
| st-brocha-espana-dia | frente | EDGE l=2.0% r=2.0% | 2/8/2/20 → 6/6/6/28 (hoodie) | zona segura en el render |
| st-brocha-espana-noche | frente | EDGE l=2.0% r=2.0% | 2/8/2/20 → 6/6/6/28 (hoodie) | zona segura en el render |
| st-brocha-leon-dia | frente | EDGE l=2.0% r=2.0% · POCKET hasta 81% | 2/9/2/20 → 6/6/6/28 (hoodie) | zona segura en el render |
| st-brocha-leon-noche | frente | EDGE l=2.0% r=2.0% · POCKET hasta 81% | 2/9/2/20 → 6/6/6/28 (hoodie) | zona segura en el render |
| st-brocha-toro-dia | frente | EDGE l=2.0% r=2.0% · POCKET hasta 90% | 2/10/2/10 → 9/4/9/28 (hoodie) | zona segura en el render |
| st-brocha-toro-noche | frente | EDGE l=2.0% r=2.0% · POCKET hasta 90% | 2/10/2/10 → 9/4/9/28 (hoodie) | zona segura en el render |
| st-collage-alhambra | frente | EDGE r=0.0% · POCKET hasta 94% | 4/5/0/6 → 16/4/12/28 (hoodie) | zona segura en el render |
| st-collage-flamenca | frente | EDGE r=0.0% · POCKET hasta 94% | 5/5/0/6 → 16/4/11/28 (hoodie) | zona segura en el render |
| st-collage-galeon | frente | EDGE r=0.0% · POCKET hasta 93% | 5/5/0/7 → 16/4/11/28 (hoodie) | zona segura en el render |
| st-collage-leon | frente | EDGE r=0.2% · POCKET hasta 93% | 4/5/0/7 → 15/4/11/28 (hoodie) | zona segura en el render |
| st-collage-quijote | frente | EDGE r=0.0% · POCKET hasta 93% | 5/6/0/7 → 15/4/11/28 (hoodie) | zona segura en el render |
| st-collage-toro | frente | EDGE r=0.0% · POCKET hasta 94% | 5/6/0/6 → 16/4/11/28 (hoodie) | zona segura en el render |
| st-espalda-34 | espalda | EDGE l=3.5% r=0.5% | 4/14/1/13 → 8/14/8/22 (hoodie) | zona segura en el render |
| st-espalda-abanico | espalda | EDGE l=2.2% r=2.7% | 2/16/3/14 → 8/16/8/22 (hoodie) | zona segura en el render |
| st-espalda-alhambra | espalda | HOOD t=9.4% | 6/9/6/12 → 8/10/8/14 (hoodie) | zona segura en el render |
| st-espalda-galeon | espalda | EDGE l=2.0% r=2.0% | 2/11/2/14 → 8/11/8/23 (hoodie) | zona segura en el render |
| st-espalda-leon | espalda | HOOD t=5.1% | 5/5/5/5 → 8/10/8/6 (hoodie) | zona segura en el render |
| st-espalda-mediterraneo | espalda | EDGE l=1.7% r=2.3% | 2/18/2/21 → 8/18/8/29 (hoodie) | zona segura en el render |
| st-espalda-sol | espalda | EDGE l=2.0% r=2.0% · HOOD t=4.9% | 2/5/2/4 → 8/10/8/10 (hoodie) | pecho redibujado (rayos anchos) + zona |
| st-espalda-sol | frente | THIN 17% | 62/5/18/73 → 62/5/17/70 (hoodie) | pecho redibujado (rayos anchos) + zona |
| st-espalda-toro | espalda | HOOD t=9.1% | 6/9/6/6 → 8/10/8/9 (hoodie) | zona segura en el render |
| st-espalda-varsity | espalda | HOOD t=7.1% | 6/7/6/20 → 8/10/8/21 (hoodie) | zona segura en el render |
| st-grafiti-rojo-y-gualda | frente | EDGE l=2.7% r=1.3% | 3/6/1/25 → 6/6/6/31 (hoodie) | zona segura en el render |
| st-hecho-en-espana | frente | EDGE r=0.0% | 6/9/0/28 → 6/9/6/32 (hoodie) | zona segura en el render |
| st-muro-de-tags | espalda | EDGE l=2.2% t=2.1% r=1.8% b=1.9% · HOOD t=2.1% | 2/2/2/2 → 8/10/8/6 (hoodie) | zona segura en el render |
| st-postal-canarias | frente | EDGE l=3.0% r=3.3% | 3/12/3/14 → 5/12/5/17 (tee) | zona segura en el render |
| st-postal-costa-blanca | frente | EDGE l=3.0% r=3.2% | 3/12/3/13 → 5/12/5/16 (tee) | zona segura en el render |
| st-postal-costa-del-sol | frente | EDGE l=3.0% r=3.3% | 3/12/3/13 → 5/12/5/16 (tee) | zona segura en el render |
| st-postal-espana | frente | EDGE l=2.0% t=1.8% r=2.0% | 2/2/2/17 → 5/4/5/19 (tee) | zona segura en el render |
| st-postal-galicia | frente | EDGE l=3.5% t=0.4% r=0.5% | 4/0/1/14 → 5/4/5/15 (tee) | zona segura en el render |
| st-postal-ibiza | frente | EDGE l=2.0% t=1.8% r=2.0% | 2/2/2/16 → 5/4/5/19 (tee) | zona segura en el render |
| st-postal-madrid | frente | EDGE l=2.0% t=1.8% r=2.0% | 2/2/2/16 → 5/4/5/19 (tee) | zona segura en el render |
| st-postal-sevilla | frente | EDGE l=2.0% t=1.8% r=2.0% | 2/2/2/16 → 5/4/5/19 (tee) | zona segura en el render |
| st-reyes-del-barrio | frente | POCKET hasta 88% | 10/12/10/12 → 14/4/14/28 (hoodie) | zona segura en el render |
| st-rojo-y-gualda-pintado | frente | EDGE l=2.0% r=2.0% | 2/14/2/28 → 6/14/6/33 (hoodie) | zona segura en el render |
| st-salpicado | frente | EDGE l=2.0% t=1.6% r=2.0% · POCKET hasta 81% | 2/2/2/20 → 9/4/9/28 (hoodie) | zona segura en el render |
| st-sangre-roja | frente | EDGE l=2.0% r=2.0% · POCKET hasta 95% | 2/9/2/5 → 12/4/12/28 (hoodie) | zona segura en el render |
| st-sol-a-brocha | frente | EDGE l=1.7% t=0.6% r=2.3% · POCKET hasta 94% | 2/1/2/6 → 14/4/15/28 (hoodie) | zona segura en el render |
| st-spray-26 | frente | POCKET hasta 78% | 6/4/5/22 → 10/4/8/28 (hoodie) | zona segura en el render |
| st-spray-espana | frente | EDGE l=2.5% r=1.5% | 3/14/2/31 → 6/14/6/36 (hoodie) | zona segura en el render |
| st-spray-muro | frente | EDGE l=3.3% r=3.5% · POCKET hasta 81% | 3/9/4/19 → 6/4/6/28 (hoodie) | zona segura en el render |
| st-spray-toro | frente | EDGE b=0.0% · POCKET hasta 100% | 10/6/10/0 → 21/4/21/28 (hoodie) | zona segura en el render |
| st-stencil-leon-dia | frente | POCKET hasta 89% · THIN 13% | 6/5/6/11 → 14/4/14/28 (hoodie) | zona segura en el render |
| st-stencil-leon-noche | frente | POCKET hasta 89% · THIN 13% | 6/5/6/11 → 14/4/14/28 (hoodie) | zona segura en el render |
