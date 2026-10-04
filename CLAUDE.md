@AGENTS.md

# ROJO Y GUALDA — pastāvīgie noteikumi visām sesijām

## Projekts un zīmols
- Šis ir **ROJO Y GUALDA** (rojoygualda.com) veikals: Next.js (skat. AGENTS.md — šī Next versija atšķiras), Supabase, Netlify, print-on-demand (Printful, Gelato, Printify, Prodigi).
- Zīmols: **melns / zelts / sarkans**, kronēta zelta **lauvas logo**, patriotisks (nekad ne politisks/agresīvs), **premium**, **"klubs"** koncepts (biedru karte, punkti, līmeņi).
- Valoda veikalā: spāņu (+ en, de, ca, eu, gl vārdnīcas `src/lib/i18n` — jaunas atslēgas tikai pievieno).
- Dizainiem: lieli, pilnīgi, oriģināli; lauva/logo ir galvenie motīvi, bet ne katrā vietā — dažādība.

## Dizaina darbs
- JEBKURAM UI/dizaina darbam VIENMĒR izmanto skills **ui-ux-pro-max** (+ **ui-styling**, **design-system**, **brand**). Ja kāds no tiem sesijā nav pieejams, izmanto tuvāko pieejamo (piem. `frontend-design`, `design:design-system`) un pasaki to lietotājam.
- Pirms jaunas sekcijas vai komponentes VIENMĒR meklē **21st MCP** (21st.dev). Ņem tikai to, kas der zīmolam, un pielāgo krāsām/tipogrāfijai. Ja 21st MCP nav pieslēgts, pasaki to lietotājam.
- Animācijas ar **motion** (`motion/react`), izmantojot esošās komponentes `src/components/ui/Reveal.tsx` (`Reveal` un `Stagger`/`Stagger.Item` — CSS scroll-driven, bez JS; `MaskLines`) un `src/components/ui/CountUp.tsx` (`CountUp`).
  - Animē tikai **transform / opacity**.
  - Vienmēr ievēro **prefers-reduced-motion**.
  - **Nekāds CLS** (rezervē izmērus attēliem/blokiem).
- **Mobile first**: katru izmaiņu pārbaudi **375px, 768px un desktop** (+ zemus ekrānus 1366×768, 1280×720).

## Ko nedrīkst salauzt
- Grozu, checkout (Stripe neaiztikt bez lietotāja ziņas), Supabase (shēma, RPC, RLS), POD integrācijas un kataloga būvētāju (`src/lib/fulfillment/*`), admin paneli.
- Produkcijas datubāzē lielas izmaiņas/dzēšanu nedarīt bez lietotāja apstiprinājuma.

## Pirms push / deploy
- Pirms katra push: `npx tsc --noEmit` + `npx next build` + `npx vitest run` — visam jābūt zaļam.
- Netlify deploy (push uz `main`) **tikai lielos gabalos un ar lietotāja apstiprinājumu** (Netlify kredīti).
