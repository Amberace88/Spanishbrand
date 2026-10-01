# ROJO Y GUALDA — Spanish Identity & Lifestyle Brand OS

API-first, headless POD commerce cloud. **Only products that can be fulfilled automatically through a connected API provider can be sold** — enforced in the database, backend, admin, checkout and order processing.

> Brand name is a working name stored in `brand_settings` (Admin → Ajustes). Nothing is hard-coded.

## Stack
Next.js 16 (App Router, TypeScript strict) · Tailwind v4 · Supabase (Postgres, Auth, RLS) · Stripe Checkout · Printful v1 + Gelato v4 adapters · Resend · Anthropic API (AI studio) · Netlify or Vercel.

## Architecture
```
Customer → Storefront → Cart → Stripe → Webhook (verified, idempotent)
  → PAYMENT_CONFIRMED → Fulfillment Router (primary / approved backup, multi-provider groups)
  → Provider API (Printful | Gelato) → provider webhooks (token + re-fetch) → tracking → email → account
```
| Layer | Where |
|---|---|
| Provider abstraction (`FulfillmentProvider`, factory) | `src/lib/fulfillment/` |
| Printful / Gelato adapters | `src/lib/fulfillment/printful/*`, `gelato/*` |
| Eligibility engine (TS) + DB guard (`product_eligibility`, publish/order triggers) | `src/lib/products/eligibility.ts`, `supabase/migrations/*02*`, `*03*` |
| Router, status aggregation, retry/backoff, sweeper | `src/lib/orders/*` |
| Stripe checkout & webhook | `src/lib/payments/*`, `src/app/api/webhooks/stripe` |
| Automation events → handlers (email, analytics, fulfillment) | `src/lib/events/*` |
| Cost engine, TaxService, shipping rules | `src/lib/pricing`, `src/lib/tax`, `src/lib/shipping` |
| AI (never publishes) | `src/lib/ai/client.ts`, Admin → AI Creator / Content Studio |
| Admin (RBAC) | `src/app/admin/*` |
| Cron jobs | `src/app/api/cron/[job]` + `netlify/functions/scheduler.mts` / `vercel.json` |

## Setup
1. `cp .env.example .env.local` and fill in values (see below). **Never commit secrets.**
2. Database — run in Supabase SQL Editor, in order (or `supabase db push`):
   - `supabase/migrations/20260930000001_core_schema.sql` ✅ applied
   - `supabase/migrations/20260930000002_rules_rls.sql` ✅ applied
   - `supabase/seed.sql` ✅ applied
   - `supabase/migrations/20260930000003_hardening.sql` ✅ applied
   - `supabase/migrations/20261001000004_growth.sql` ✅ applied (brand, themes, personalization, club, B2B, gift cards, creators)
   - `supabase/migrations/20261001000005_causes.sql` ✅ applied (comercio solidario)
3. `npm install && npm run dev`
4. Sign in at `/admin/login` with an email listed in `ADMIN_EMAILS` → becomes SUPER_ADMIN.

### Environment variables
| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | production URL |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** (Supabase → Settings → API Keys → secret) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | webhook: `/api/webhooks/stripe` — events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded` |
| `PRINTFUL_API_KEY` (+ `PRINTFUL_STORE_ID` for account-level tokens), `PRINTFUL_WEBHOOK_SECRET` | register webhook from Admin → Proveedores |
| `GELATO_API_KEY`, `GELATO_WEBHOOK_SECRET` | register in Gelato portal: `/api/webhooks/gelato?token=<secret>` |
| `RESEND_API_KEY`, `EMAIL_FROM` | transactional email |
| `AI_PROVIDER_API_KEY`, `AI_MODEL` | AI creator / assistant |
| `CRON_SECRET` | protects `/api/cron/*` |
| `ADMIN_EMAILS` | first-login SUPER_ADMIN bootstrap |

## Storefront features
- **Shop modes**: ready brand products · personalizable brand products (name+number, Mi Pueblo, year, phrase) · **Diseña tú mismo** designer (text + uploaded images, drag/resize/rotate, front/back).
- Print files for personalized lines are rendered server-side per order (`src/lib/personalization/render.tsx`, Satori → PNG 2400×3200) and uploaded to the public `print-files` bucket; they replace the brand file for that placement only. Designs with uploaded images (or flagged words / club names) are held for staff approval (Admin → Pedido → “Aprobar y producir”).
- Themes (Deportes, Mi Pueblo, Fiestas, Playa, Tapas, Camino), 17 comunidades + provinces landing pages, fiestas calendar, club (member number, points, redemption), gift cards (Stripe → single-use code), B2B quotes, creator applications, Causas (donation per item, partner registry, monthly transparency reports), ES/EN/DE, day/night mode.
- Football designs are original fan designs: never use official club, league or federation marks.

## Launch workflow (first product)
Admin → **Proveedores** → Sync catalog → **Aprobar** provider product → Crear producto → add print file URLs + approve mapping → **Ejecutar test de fulfillment** (non-charging estimate/quote) → add images, description, price → **Aprobar marca** → **Publicar** (blocked by the DB unless eligible).

## Tests
```
npm test          # 49 unit tests (incl. personalization validation + print render): eligibility, router & fallback, statuses, retries, error classes, cost/tax/shipping, provider mappers & webhook auth, security invariants
npm run test:db   # migrations + 11 database rule tests on a throwaway Postgres (PGHOST/PGPORT/PGUSER)
npm run typecheck
```

## Before production (not automatable)
- Legal/accounting validation of VAT, privacy, terms, returns (pages marked *Borrador*).
- Complete a real end-to-end test order (spec §92) with Stripe test mode + provider draft/test.
- Canarias/Ceuta/Melilla orders are held for manual review (different tax regime).
- Gelato has no documented order lookup by reference: ambiguous create failures are sent to review instead of auto-retry (prevents duplicate production).
