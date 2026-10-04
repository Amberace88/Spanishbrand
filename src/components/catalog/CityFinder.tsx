"use client";
import { IconArrow } from "@/components/ui/Icons";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/I18nProvider";
import { DesignArt } from "@/components/catalog/DesignArt";
import type { Layer } from "@/lib/personalization/types";

export interface CityCard {
  slug: string;
  label: string;
  sub: string;
  region: string;
  regionName: string;
  count: number;
  photo: string | null;
  layers: Layer[];
  tone: "dark" | "light";
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Search + region filter over every city that has its own designs and products. */
export function CityFinder({ cities }: { cities: CityCard[] }) {
  const en = useLocale() === "en";
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const regions = useMemo(() => [...new Map(cities.map((c) => [c.region, c.regionName])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es")), [cities]);
  const shown = cities.filter((c) => (!region || c.region === region) && (!q || norm(`${c.label} ${c.sub} ${c.regionName}`).includes(norm(q))));

  return (
    <div>
      <div className="sticky top-[calc(env(safe-area-inset-top)+104px)] z-20 -mx-4 bg-bg/90 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:px-0">
        <label className="relative block">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={en ? "Search your city…" : "Busca tu ciudad…"} className="field !rounded-full !py-4 !pl-14 text-lg" aria-label={en ? "Search city" : "Buscar ciudad"} />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" onClick={() => setRegion(null)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${!region ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/50"}`}>
            {en ? "All" : "Todas"} · {cities.length}
          </button>
          {regions.map(([slug, name]) => (
            <button key={slug} type="button" onClick={() => setRegion(region === slug ? null : slug)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${region === slug ? "border-fg bg-fg text-bg" : "border-line hover:border-fg/50"}`}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {en ? "No city found. " : "No encontramos esa ciudad. "}
          <Link href="/disena" className="underline">
            {en ? "Design yours with any name" : "Diseña la tuya con cualquier nombre"}<IconArrow className="ml-1.5 inline h-4 w-4 align-[-3px]" />
          </Link>
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((c) => (
            <Link key={c.slug} href={`/ciudades/${c.slug}`} className="group block overflow-hidden rounded-[1.5rem] border border-line bg-surface-2 transition-shadow hover:shadow-[0_22px_44px_-24px_rgba(0,0,0,0.45)]">
              <div className="relative aspect-square overflow-hidden bg-[#f3f1ee]">
                {c.photo ? (
                  <Image src={c.photo} alt={c.label} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 p-4 transition-transform duration-700 group-hover:scale-105">
                    <DesignArt layers={c.layers} tone={c.tone} kind="tee" />
                  </div>
                )}
                {c.count > 0 && <span className="absolute left-3 top-3 rounded-full bg-bg/90 px-2.5 py-1 text-[11px] font-bold text-accent">{c.count} {en ? "items" : "piezas"}</span>}
              </div>
              <div className="p-4">
                <p className="headline text-xl leading-tight sm:text-2xl">{c.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{c.regionName}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
