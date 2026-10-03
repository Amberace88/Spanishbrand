/**
 * Catalog quality audit (manual): renders every library design to a small preview and measures how much
 * of the print area its main element fills. Skipped unless AUDIT_OUT is set:
 *   AUDIT_OUT=/tmp/audit npx vitest run tests/catalog-audit.test.tsx
 * Writes AUDIT_OUT/<slug>.png, AUDIT_OUT/audit.json and two contact sheets (kept / retired).
 * Illustrations that live only in storage (art-*, prof-*) are replaced by a hatched placeholder of the
 * same aspect (the sandbox cannot reach storage) — their geometry is still exact.
 */
import { describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { DESIGNS as ALL_DESIGNS, type Design } from "@/lib/catalog/designs";
import { auditDesign, RETIRED_DESIGNS } from "@/lib/catalog/retired";
import manifest from "@/lib/catalog/art-manifest.json";

const OUT = process.env.AUDIT_OUT;
const W = 240, H = 320;

async function placeholder(name: string) {
  const a = (manifest as Record<string, number>)[name] ?? 1;
  const w = 600, h = Math.round(w * a);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" fill="#b58a3a"/><rect x="12" width="12" height="24" fill="#8e2a2a"/></pattern></defs><rect width="100%" height="100%" rx="30" fill="url(#p)" opacity="0.85"/><rect x="${w * 0.1}" y="${h / 2 - 40}" width="${w * 0.8}" height="80" fill="#111"/><text x="50%" y="${h / 2 + 14}" font-size="40" font-family="sans-serif" fill="#fff" text-anchor="middle">${name}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe.skipIf(!OUT)("catalog audit", () => {
  it("renders and classifies every design", async () => {
    mkdirSync(OUT!, { recursive: true });
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (u: string | URL) => {
      const m = String(u).match(/\/([a-z0-9-]+)\.png/);
      if (m) return new Response(new Uint8Array(await placeholder(m[1])), { status: 200 });
      return realFetch(u);
    });
    const { renderDesign } = await import("@/lib/catalog/render");
    const rows: (ReturnType<typeof auditDesign> & { slug: string; name: string; collection: string; file: string; ink: { w: number; h: number; cover: number } })[] = [];
    const tiles: { slug: string; buf: Buffer; retired: boolean; label: string }[] = [];
    for (const d of ALL_DESIGNS as Design[]) {
      const bg = d.tone === "dark" ? "#141414" : "#f3ead7";
      let png: Buffer;
      try {
        png = await renderDesign(d, { width: W, height: H, mode: "print" });
      } catch (e) {
        png = await sharp({ create: { width: W, height: H, channels: 4, background: "#ff00ff" } }).png().toBuffer();
        console.warn(d.slug, String(e));
      }
      // ink bounding box / coverage from the alpha channel
      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1, inked = 0;
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] > 24) {
            inked++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      const ink = { w: +((x1 - x0 + 1) / info.width).toFixed(2), h: +((y1 - y0 + 1) / info.height).toFixed(2), cover: +(inked / (info.width * info.height)).toFixed(3) };
      const tile = await sharp({ create: { width: W, height: H, channels: 4, background: bg } }).composite([{ input: png }]).png().toBuffer();
      const file = `${d.slug}.png`;
      writeFileSync(path.join(OUT!, file), tile);
      const a = auditDesign(d);
      rows.push({ slug: d.slug, name: d.name, collection: d.collection, file, ink, ...a });
      tiles.push({ slug: d.slug, buf: tile, retired: RETIRED_DESIGNS.has(d.slug), label: d.slug });
    }
    writeFileSync(path.join(OUT!, "audit.json"), JSON.stringify(rows, null, 1));

    // contact sheets: 12 per row, slug under each tile
    const sheet = async (list: typeof tiles, name: string, title: string) => {
      const cols = 12, tw = 160, th = 213, lh = 22, pad = 6, head = 60;
      const rowsN = Math.ceil(list.length / cols);
      const width = cols * (tw + pad) + pad, height = head + rowsN * (th + lh + pad) + pad;
      const comps: { input: Buffer; left: number; top: number }[] = [];
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${head}"><text x="12" y="40" font-size="30" font-family="sans-serif" font-weight="bold" fill="#111">${esc(title)}</text></svg>`), left: 0, top: 0 });
      for (let i = 0; i < list.length; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const left = pad + c * (tw + pad), top = head + r * (th + lh + pad);
        comps.push({ input: await sharp(list[i].buf).resize(tw, th).png().toBuffer(), left, top });
        comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${lh}"><text x="2" y="15" font-size="11" font-family="sans-serif" fill="#111">${esc(list[i].label.slice(0, 28))}</text></svg>`), left, top: top + th });
      }
      await sharp({ create: { width, height, channels: 4, background: "#ffffff" } }).composite(comps).png().toFile(path.join(OUT!, name));
    };
    const kept = tiles.filter((t) => !t.retired), retired = tiles.filter((t) => t.retired);
    await sheet(kept, "contact-kept.png", `KEEP — ${kept.length} designs`);
    await sheet(retired, "contact-retired.png", `RETIRE — ${retired.length} designs`);
    expect(rows.length).toBe(ALL_DESIGNS.length);

    // AUDIT_WRITE=1 also regenerates docs/catalog-audit.md and the archive SQL from the explicit list
    if (process.env.AUDIT_WRITE) {
      const root = path.resolve(__dirname, "..");
      const slugs = [...RETIRED_DESIGNS].sort();
      const series = [...new Set(rows.map((r) => r.series))];
      const count = (s: string, v: string) => rows.filter((r) => r.series === s && r.verdict === v).length;
      const pct = (v: number) => `${Math.round(v * 100)}%`;
      const md = [
        "# Catalog audit — which designs the shop keeps",
        "",
        "Generated by `AUDIT_OUT=<dir> AUDIT_WRITE=1 npx vitest run tests/catalog-audit.test.tsx` (renders every library design with the print renderer, writes previews + contact sheets to `<dir>`).",
        "",
        "## Rule",
        "",
        "A design stays only if its **main element fills the print area**:",
        "",
        "- **big art** — an illustration or brand mark (author art `art-*`/`prof-*`, Fútbol PRO `fp-*`, the lion / crown / logo marks) at ≥ 55 % of the print width and ≥ 28 % of its height; the flat house icons (sun, waves, castle, wine glass…) never count as big art, or",
        "- **big type** — a text line ≥ 60 % of the width at display size (font size ≥ 11 % of the canvas height), or",
        "- **embroidery** (small by nature) or a **calendar** (12 full sheets), or",
        "- one of the **curated series** (León, lookbook, Arte, Oficios · Arte, Refranero/Sabiduría, Fútbol PRO, Familia).",
        "",
        "Retired by series: profession seal + minimal (superseded by «· Arte» and the new «· Cartel»), the coordinate city badges (superseded by the new «Ciudad · Cartel» posters), the old football looks bufanda / moderno / estadio (superseded by Fútbol PRO «Colores de mi ciudad»). Visual-check overrides are listed in `RETIRE_OVERRIDES` (src/lib/catalog/retired.ts).",
        "",
        "Previews of storage-only illustrations (art-*, prof-*) use a placeholder of the same aspect in the sandbox; their geometry is exact.",
        "",
        "## Summary",
        "",
        "| series | kept | retired |",
        "|---|---:|---:|",
        ...series.map((s) => `| ${s} | ${count(s, "KEEP")} | ${count(s, "RETIRE")} |`),
        `| **total** | **${rows.filter((r) => r.verdict === "KEEP").length}** | **${rows.filter((r) => r.verdict === "RETIRE").length}** |`,
        "",
        "## Designs",
        "",
        "| slug | name | series | verdict | reason | main art (w × h) | main text (w × size) |",
        "|---|---|---|---|---|---|---|",
        ...rows.map((r) => `| \`${r.slug}\` | ${r.name.replace(/\|/g, "/")} | ${r.series} | ${r.verdict === "KEEP" ? "KEEP" : "**RETIRE**"} | ${r.reason.replace(/\|/g, "/")} | ${r.artW ? `${pct(r.artW)} × ${pct(r.artH)}${r.artRich ? "" : " (icono)"}` : "—"} | ${r.textW ? `${pct(r.textW)} × ${pct(r.textH)}` : "—"} |`),
        "",
      ].join("\n");
      writeFileSync(path.join(root, "docs", "catalog-audit.md"), md);
      const arr = `array[\n${slugs.map((s) => `  '${s}'`).join(",\n")}\n]`;
      const sql = [
        "-- Archive the products of retired library designs (src/lib/catalog/retired.ts, docs/catalog-audit.md).",
        "-- MANUAL: review the preview, then run the transaction. The storefront already hides these products",
        "-- in code (listing filter + 308 redirects on product pages); this only makes the DB match.",
        "-- Generated by tests/catalog-audit.test.tsx (AUDIT_WRITE=1). Do not edit the slug list by hand.",
        "",
        "-- 1) PREVIEW: products per retired design and status (nothing changes)",
        "select metadata->'catalog'->>'design' as design, status, count(*) as products",
        "  from public.products",
        ` where metadata->'catalog'->>'design' = any(${arr})`,
        " group by 1, 2",
        " order by 1, 2;",
        "",
        "select status, count(*) as products",
        "  from public.products",
        ` where metadata->'catalog'->>'design' = any(${arr})`,
        " group by 1;",
        "",
        "-- 2) ARCHIVE (status is a text column with a CHECK list that includes 'ARCHIVED'; see 20260930000001_core_schema.sql)",
        "begin;",
        "update public.products",
        "   set status = 'ARCHIVED', featured = false",
        ` where metadata->'catalog'->>'design' = any(${arr})`,
        "   and status <> 'ARCHIVED';",
        "",
        "-- catalog jobs of retired designs that never produced a product: drop them so the admin queue is clean",
        "-- (buildPlan no longer plans them; finished jobs keep their row for history)",
        "delete from public.catalog_jobs",
        " where kind = 'PRODUCT'",
        "   and product_id is null",
        "   and split_part(key, ':', 1) = 'p'",
        ` and split_part(key, ':', 2) = any(${arr});`,
        "commit;",
        "",
        "-- 3) After running: revalidate the storefront cache tag \"listing\" (or wait ≤ 1 h) so cached lists refresh.",
        "",
      ].join("\n");
      mkdirSync(path.join(root, "supabase", "manual"), { recursive: true });
      writeFileSync(path.join(root, "supabase", "manual", "archive-retired-designs.sql"), sql);
    }
  }, 900_000);
});
