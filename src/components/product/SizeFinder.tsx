"use client";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/I18nProvider";

interface Guide {
  unit: string;
  sizes: string[];
  rows: { label: string; values: string[] }[];
}

const COPY = {
  es: {
    title: "¿Qué talla soy?",
    body: "Coge una camiseta que te quede bien, extiéndela plana y mide de axila a axila.",
    width: "Ancho de tu camiseta",
    fit: "¿Cómo te gusta?",
    fits: ["Ajustada", "Normal", "Holgada"],
    result: "Tu talla",
    between: "Estás entre dos tallas: si dudas, elige la más grande (la prenda puede encoger ~3 % tras el primer lavado).",
    out: "Esa medida queda fuera de la tabla. Revisa la guía o escríbenos y te ayudamos.",
    note: "Acertar la talla evita esperas y devoluciones: cada prenda se fabrica para ti.",
  },
  en: {
    title: "Find my size",
    body: "Take a T-shirt that fits you well, lay it flat and measure armpit to armpit.",
    width: "Width of your T-shirt",
    fit: "How do you like it?",
    fits: ["Slim", "Regular", "Relaxed"],
    result: "Your size",
    between: "You're between two sizes: if in doubt, go for the larger one (garments may shrink ~3% after the first wash).",
    out: "That measurement is outside the chart. Check the guide or contact us.",
    note: "Getting the size right avoids waiting and returns: every piece is made for you.",
  },
};

const num = (s: string) => {
  const m = s.replace(",", ".").match(/[\d.]+/g);
  if (!m) return null;
  const v = m.map(Number).filter((x) => !Number.isNaN(x));
  return v.length ? (v.length > 1 ? (v[0] + v[1]) / 2 : v[0]) : null;
};

/** Recommends a size from the provider's real measurement table (width / chest row). */
export function SizeFinder({ guide }: { guide: Guide }) {
  const locale = useLocale();
  const T = locale === "en" ? COPY.en : COPY.es;
  const row = guide.rows.find((r) => /ancho|width|pecho|chest/i.test(r.label));
  const [w, setW] = useState("");
  const [fit, setFit] = useState(1);
  const unit = guide.unit;
  const values = useMemo(() => (row ? row.values.map(num) : []), [row]);
  if (!row || values.filter((v) => v != null).length < 2) return null;

  const input = Number(w.replace(",", "."));
  let result: { size: string; between: boolean } | null = null;
  let out = false;
  if (input > 0) {
    const slack = unit === "in" ? [-0.6, 0, 0.8][fit] : [-1.5, 0, 2][fit];
    const target = input + slack;
    const idx = values.findIndex((v) => v != null && v >= target - (unit === "in" ? 0.4 : 1));
    if (idx === -1 || (idx === 0 && (values[0] ?? 0) - target > (unit === "in" ? 2.5 : 6))) out = true;
    else {
      const v = values[idx] as number;
      const prev = idx > 0 ? values[idx - 1] : null;
      // "between" when the chosen size only just fits (target is within tolerance of its value)
      result = { size: guide.sizes[idx], between: prev != null && v < target };
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line p-4">
      <p className="font-semibold">📏 {T.title}</p>
      <p className="mt-1 text-xs text-muted">{T.body}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="block">
          <span className="eyebrow mb-1.5 block text-[0.6rem] text-muted">
            {T.width} ({unit})
          </span>
          <input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder={unit === "in" ? "20" : "52"} className="field !py-2.5" />
        </label>
        <div>
          <span className="eyebrow mb-1.5 block text-[0.6rem] text-muted">{T.fit}</span>
          <div className="flex rounded-full border border-line p-0.5">
            {T.fits.map((f, i) => (
              <button key={f} type="button" onClick={() => setFit(i)} className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${fit === i ? "bg-fg text-bg" : "text-muted"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
      {result && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-2 p-3">
          <span className="grid h-12 min-w-12 place-items-center rounded-full bg-accent px-3 text-lg font-extrabold text-white">{result.size}</span>
          <span className="text-sm">
            <span className="font-semibold">{T.result}</span>
            {result.between && <span className="block text-xs text-muted">{T.between}</span>}
          </span>
        </div>
      )}
      {out && <p className="mt-3 text-xs text-accent">{T.out}</p>}
      <p className="mt-3 text-[11px] text-muted">{T.note}</p>
    </div>
  );
}
