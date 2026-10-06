# Cloudflare Workers migration (branch `cloudflare`)

Status: **builds and runs locally on Workers (`wrangler dev`); nothing has been deployed.** `main` and the Netlify
site are untouched. This branch still builds and runs on Netlify (`npm run build`), so it can be merged later
without breaking Netlify.

Read §7 (degraded features) before switching production: customer **personalization print files** and **catalog
builder print files** cannot be produced inside a Worker's 128 MB memory.

---

## 1. What changed

| Area | Change |
|---|---|
| Adapter | `@opennextjs/cloudflare` 1.20.8 + `wrangler` 4.147 (devDependencies). `open-next.config.ts`, `wrangler.jsonc`. |
| Worker entry | `cloudflare/worker.ts` wraps the generated OpenNext handler (`.open-next/worker.js`), adds `scheduled()` (cron) and installs the WASM image codecs. `cloudflare/cron.ts` holds the cron → job mapping. |
| Images (sharp) | All sharp calls moved behind `src/lib/image` (`imageOps()`). Node/Netlify keeps the **identical sharp call chains** (`sharp-ops.ts`); Workers uses WASM codecs (`wasm-ops.ts` + `cloudflare/image-codecs.ts`). Selected at runtime. |
| Memory guards | `assertFitsRuntime()` in `renderDesign` / `renderPrintFile` / `composePrintFiles`: on Workers, surfaces > 4.2 MP throw a normal error instead of crashing the isolate. No-op on Node. |
| Catalog cron | `/api/cron/catalog` runs 1 parallel worker on Workers (4 on Node). |
| Stripe | Webhook uses `constructEventAsync` (+ `createSubtleCryptoProvider()` on Workers). Client uses `Stripe.createFetchHttpClient()` on Workers. Node behaviour unchanged. |
| Tests | `tests/image-ops.test.ts` (WASM path vs sharp, pixel comparison), `tests/cloudflare-cron.test.ts`. |
| Scripts | `cf:build`, `cf:preview`, `cf:deploy`, `cf:typecheck`. |
| Ignored | `.open-next/`, `.wrangler/`, `.dev.vars*`. |

Not changed: features, UI, Supabase schema/RPC/RLS, POD integrations' logic, `netlify.toml`, `netlify/functions/*`.

---

## 2. Commands

```bash
npm ci
npm run cf:build            # = npx opennextjs-cloudflare build   (runs `next build`, then bundles for Workers)
npm run cf:preview          # build + wrangler dev --port 8790     (needs .dev.vars, see §4)
npm run cf:typecheck        # type-check cloudflare/*.ts
npm run cf:deploy           # build + opennextjs-cloudflare deploy (DON'T run until §5 is done)
```

Local preview with fake values: create a git-ignored `.dev.vars` with placeholders (names in §4). With a fake
Supabase URL every DB call fails DNS, so pages render their empty/fallback states slowly (14–28 s) — expected.

---

## 3. Workers Builds (Cloudflare dashboard → Workers → `rojoygualda` → Settings → Build)

| Setting | Value |
|---|---|
| Git repository | `Amberace88/spanishbrand` |
| Production branch | `cloudflare` (later `main`, once Netlify is retired) |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Root directory | `/` |
| Build variables | the `NEXT_PUBLIC_*` values (§4) — they are inlined into the bundle at build time |
| Node | Workers Builds default (22). Pin with build variable `NODE_VERSION=22` if needed. |

Each push to the branch builds and deploys (Workers Builds is free within its build-minute allowance; it does not
use Netlify credits). Commits on this branch carry `[skip netlify]` so Netlify does not build them.

---

## 4. Environment variables

### Build time (Workers Builds → *Build variables*) — **also add them as runtime variables**

`src/lib/env.ts` reads `process.env[name]` dynamically on the server, which Next.js does **not** inline, so these
must exist in both places.

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://rojoygualda.com` (also the base for server-side fetches of `/fonts/print/*` and `/catalog/art/*`) |
| `NEXT_PUBLIC_SUPABASE_URL` | also feeds `next.config.ts` (`images.remotePatterns`, `/catalog/art` rewrite) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |
| `NEXT_PUBLIC_PAYMENT_BIZUM` | optional (`1` shows the Bizum badge) |

### Runtime (Worker → Settings → *Variables and Secrets*; use **Secret** type for keys)

`wrangler secret put <NAME>` or the dashboard. Same names as Netlify:

`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTFUL_API_KEY`,
`PRINTFUL_STORE_ID`, `PRINTFUL_WEBHOOK_SECRET`, `GELATO_API_KEY`, `GELATO_WEBHOOK_SECRET`, `PRINTIFY_API_TOKEN`,
`PRINTIFY_SHOP_ID`, `PRINTIFY_WEBHOOK_SECRET`, `PRODIGI_API_KEY`, `PRODIGI_SANDBOX`, `PRODIGI_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`, `AI_PROVIDER_API_KEY`, `AI_MODEL`, `CRON_SECRET`, `ADMIN_EMAILS`, `BRAND_ID`,
optional `MOCKUP_ART_FROM_SITE`.

Netlify-only variables (`URL`, `DEPLOY_URL`, `DEPLOY_PRIME_URL`, `DEPLOY_ID`, `COMMIT_REF`) do not exist on
Workers; the code already falls back to `NEXT_PUBLIC_SITE_URL` / an empty version string.

> **`CRON_SECRET` is the cron on/off switch.** `scheduled()` does nothing while it is unset. Keep it unset on the
> Worker until the Netlify scheduled functions are switched off (§6), otherwise both hosts run the jobs against
> the same database.

---

## 5. One-time Cloudflare setup (before the first deploy)

1. **Plan: Workers Paid ($5/month) is required.**
   - The Worker is **6.2 MiB gzip** (24.5 MiB raw) — the free plan allows 3 MiB.
   - Free plan CPU is 10 ms per request; server rendering a Next.js page, WASM image work and cron jobs need far
     more. `wrangler.jsonc` sets `limits.cpu_ms = 300000` (5 min, paid only).
   - Paid includes 10 M requests + 30 M CPU-ms per month; well above this shop's traffic.
2. **Cache storage** (free tiers are enough):
   ```bash
   npx wrangler r2 bucket create rojoygualda-opennext-cache
   npx wrangler d1 create rojoygualda-tag-cache     # paste database_id into wrangler.jsonc, or let deploy auto-provision
   ```
   `opennextjs-cloudflare deploy` populates the cache and creates the D1 table.
3. **Images** (`images` binding in `wrangler.jsonc`): enable Cloudflare Images on the account. It serves
   `next/image` (without it, `/_next/image` returns the original file — e.g. the 2.5 MB lion PNG on the home page)
   and the large-photo fallback (§7). 5,000 unique transformations / month free, then $0.50 per 1,000.
   To stay strictly free, delete the `images` block: images are then served unoptimised and photos over
   4.2 MP are refused on upload.
4. **Custom domains** (zone `rojoygualda.com` must be on Cloudflare DNS): Worker → Settings → Domains & Routes →
   add `rojoygualda.com` and `www.rojoygualda.com`. Optionally a Redirect Rule `www` → apex (301), mirroring
   what Netlify does today. Cloudflare creates the DNS records and certificates.

---

## 6. Cut-over checklist (when the owner decides)

1. Deploy to the `*.workers.dev` URL first with the real secrets **except `CRON_SECRET`**. It shares the
   production Supabase database — test carefully (browse, cart, a Stripe **test-mode** checkout if possible).
2. **Stripe webhook**: the endpoint path is unchanged — `https://rojoygualda.com/api/webhooks/stripe`. Nothing to
   change after the domain moves. To test on `workers.dev` before that, add a *second* endpoint in Stripe
   (`https://rojoygualda.<account>.workers.dev/api/webhooks/stripe`) and set that endpoint's signing secret as the
   Worker's `STRIPE_WEBHOOK_SECRET`. Same for Printful/Gelato/Printify/Prodigi: their webhook URLs keep their paths.
3. Move DNS / attach custom domains (§5.4).
4. Netlify: disable the scheduled functions (or the whole site), **then** set `CRON_SECRET` on the Worker.
5. Watch Workers → Logs (observability is on) for `Exceeded Memory Limit`, `IMAGE_TOO_LARGE_FOR_WORKER` and the
   `[cron]` lines for a day.

---

## 7. Incompatibilities and how they are handled

### Cron (Netlify scheduled functions → Cron Triggers)
`wrangler.jsonc` `triggers.crons`: `*/10 * * * *` (was `catalog-runner.mts`) and `*/15 * * * *` (was
`scheduler.mts`), same UTC job selection (hourly jobs in the first 15 min of each hour, daily jobs at 03:00–03:14).
`scheduled()` calls the existing protected `/api/cron/<job>` route **in-process** with `Bearer CRON_SECRET`
(no network hop, works before the domain moves). Cron invocations get up to 15 min wall time and the configured
5 min CPU. The catalog builder was already chunked/resumable (each run advances jobs for ~20 s and stores state
in `catalog_jobs`), so it fits as is. Verified locally: firing `*/15` at 03:05 UTC ran all 8 jobs, each HTTP 200.

### sharp → WASM (`src/lib/image`)
sharp is a native addon and cannot run on Workers. Every operation actually used was re-implemented with free WASM
codecs — jSquash builds of **mozjpeg** (JPEG), **libwebp** (WebP), the Rust **png** crate and the squoosh
**lanczos3** resizer (premultiplied alpha, sRGB, as sharp) — plus plain-JS pixel code (composite "over",
extend, crop, trim box, EXIF orientation, header parsing). SVG scenes (poster mockups) are rasterised by the
resvg already bundled with `next/og`.

| Used in | Operation | Workers result |
|---|---|---|
| catalog builder, image refresh | resize ≤1400 → WebP q80 | same size; mean pixel diff < 3/255 vs sharp |
| returns photo | EXIF rotate → ≤2000 → JPEG q82 (mozjpeg) | same size/orientation; diff < 4/255 |
| designer upload | EXIF rotate → ≤4000 → PNG; solid-background removal; resize back | identical pixels (PNG) |
| site image (photo) | rotate → ≤1800 → WebP q84 | as above |
| site image (art) | green-screen key (JS) → trim → ≤1600 → PNG | trim box within a few px (libvips' median filter approximated) |
| poster scenes | SVG wall + composite → WebP q84 | diff < 4/255 (resvg vs librsvg) |
| print files | extend / canvas + composite → PNG | identical pixels — **but see memory below** |

`tests/image-ops.test.ts` runs both implementations on the same inputs and checks format, dimensions and decoded
pixels. Inside `workerd` every operation was exercised end-to-end (temporary probe route, removed).
Differences that remain: encoded bytes differ (different encoder builds); the WASM PNG encoder has no
compression-level setting, so PNGs are ~1.5–3× larger than sharp's level 9 (more storage/egress for site art,
designer "no background" files and small print files).

### Memory (the real limit)
A Worker isolate has **128 MB** for everything. Decoding needs the pixels twice (WASM heap + JS copy) and WASM
heaps never shrink. Measured under Node with the same code: a 2048² decode→resize→encode adds ≈ 25 MB; a
**2400 × 3200 `next/og` print render grew RSS by ≈ 100 MB**. Therefore:

- **Surfaces up to 4.2 MP (≈ 2048²)** are processed in WASM.
- **Bigger inputs whose whole operation is a resize + re-encode** (phone photos for returns/designer, the 4000 px
  designer PNG) go to the **Cloudflare Images binding**, which works outside the isolate. EXIF orientation is
  handled explicitly (tag reset + rotate/flip), so it does not depend on the service's auto-orient behaviour.
  Rotations (EXIF 3/6/8) were verified pixel-exact against sharp in local emulation; mirrored orientations
  (EXIF 2/4/5/7, rare) could not be verified locally because the emulator ignores `flip`.
  Background removal for such uploads runs at ≤ 2049 px instead of ≤ 2400 px (slightly softer edge on huge uploads).
- **Everything else above 4.2 MP is refused** with `IMAGE_TOO_LARGE_FOR_WORKER` before allocating:

### Degraded / not working on Workers

1. **Personalized print files** (`composePrintFiles`, provider print size, e.g. 2400×3200 or 3602×5055):
   refused → the order is **held for review** (`PERSONALIZATION_FAILED`). Payment and the order itself are
   unaffected, but someone must produce the print file. This is the main blocker for a full move.
2. **Catalog builder print files** (`renderDesign` at provider print size): the job goes to `failed` with the
   message above (visible in admin → catalog). Mockups, photos and publishing steps work. Building **new**
   products therefore needs a Node runtime.
   *Fix options:* (a) a small Node render service — Cloudflare Containers (runs the existing sharp/resvg code;
   available on Workers Paid, billed by usage — check current pricing) or any Node host — called for these two steps; (b) keep Netlify only for
   `/api/cron/catalog` and print rendering during a transition; (c) lower print resolution (print-quality
   decision for the owner — not recommended).
3. `next/image` without the Images binding: originals served unoptimised.
4. `proxy.ts` runs as Node middleware, which OpenNext marks **experimental** (build warning). Verified locally:
   `sid` cookie and security headers are set. Fallback if it misbehaves: an edge-runtime `middleware.ts`.
5. `export const maxDuration` is ignored (Workers: no wall-clock limit while the client is connected; CPU capped at
   5 min). `Netlify-CDN-Cache-Control` is ignored; Worker responses are not CDN-cached by default, so
   `/api/catalog/mockup-art/*` re-renders on every provider fetch (cheap, ≤ 1600 px).
6. Fonts and static art are read from disk on Netlify; on Workers that fails and the existing fallback fetches
   them from Supabase storage / `NEXT_PUBLIC_SITE_URL` (one extra subrequest per isolate).
7. sharp's JavaScript is still in the bundle as dead code (never executed on Workers).
8. In-memory rate limits (designer upload, returns) are per isolate — same caveat as on Netlify functions.

### Caching
`open-next.config.ts`: R2 incremental cache (ISR pages, `unstable_cache`) behind the per-colo Cache API, D1 tag
cache (`revalidateTag`/`revalidatePath` from the admin), memory queue for time-based revalidation (via the
`WORKER_SELF_REFERENCE` service binding). Without these, every request would re-query Supabase.

---

## 8. Smoke test (local `wrangler dev`, fake Supabase, 2026-10-06)

`/`, `/shop`, `/cart`, `/collections`, `/club`, `/disena`, `/sitemap.xml`, `/robots.txt`, static assets,
`/_next/image` (local Images emulation, WebP 640 px) → 200. `/checkout` → 307 (empty cart redirect).
`/products/<unknown>` → 404 (no DB). `/api/catalog-status` → 200 JSON. Stripe webhook: forged signature → 400,
valid signature (generated with the placeholder secret) → passes verification, then 500 because the fake DB is
unreachable. `/api/cron/*` without the secret → 401, with it → 200. All DB-dependent content is empty and slow
because the placeholder Supabase host does not resolve.
