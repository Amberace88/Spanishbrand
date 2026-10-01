"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { JerseyBack } from "@/components/art/Jersey";
import { IconArrow } from "@/components/ui/Icons";

/* Homepage hero side tiles: a quick, live edit right in the tile; the full editor is one click away. */

const tileBase = "group relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-[28px] p-5 sm:min-h-[320px] sm:p-7";
// square that always covers the tile, so overlay coordinates stay glued to the photo at any tile ratio
const coverSquare = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
// the size container has no padding, so 100cqw/100cqh are the full tile
const coverBox = "pointer-events-none absolute inset-0 overflow-hidden [container-type:size]";
const coverStyle = { width: "max(100cqw, 100cqh)", height: "max(100cqw, 100cqh)" } as const;

function Head({ href, badge, badgeCls, ring }: { href: string; badge: string; badgeCls: string; ring: string }) {
  return (
    <div className="relative z-10 flex items-start justify-between">
      <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeCls}`}>{badge}</span>
      <Link href={href} aria-label={badge} className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 hover:rotate-[-45deg] ${ring}`}>
        <IconArrow className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function JerseyTile({ photo, badge, title, labels }: { photo: string | null; badge: string; title: string; labels: { name: string; number: string; go: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const shownName = (name.trim() || "TU NOMBRE").toUpperCase().slice(0, 12);
  const shownNum = num || "10";
  const go = () => router.push(`/personaliza?t=jersey${name.trim() ? `&nombre=${encodeURIComponent(name.trim())}` : ""}${num ? `&numero=${num}` : ""}`);
  const nameSize = Math.min(6.2, 52 / Math.max(6, shownName.length)); // % of the square

  return (
    <div className={`${tileBase} ${photo ? "bg-[#0b0b0b] text-white" : "bg-surface-2"}`}>
      {photo ? (
        <div className={coverBox}><div className={coverSquare} style={coverStyle}>
          <Image src={photo} alt="" fill sizes="(min-width:1024px) 34vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
          {/* live lettering printed on the jersey back */}
          <div className="absolute inset-x-0 text-center font-[family-name:var(--font-display)] font-bold uppercase leading-none text-[#e0b84a]" style={{ top: "41.5%", fontSize: `${nameSize}cqmax`, letterSpacing: "0.04em", textShadow: "0 1px 0 rgba(0,0,0,.35)", opacity: 0.94 }}>
            {shownName}
          </div>
          <div className="absolute inset-x-0 text-center font-[family-name:var(--font-display)] font-bold leading-none text-[#e0b84a]" style={{ top: "47%", fontSize: "14cqmax", textShadow: "0 2px 0 rgba(0,0,0,.35)", opacity: 0.94 }}>
            {shownNum}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
        </div></div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 top-14 bottom-28 flex items-center justify-center">
          <div className="aspect-square h-full max-w-full">
            <JerseyBack name={shownName} number={shownNum} shirt="#0d0d0d" ink="#e0b84a" trim="#c8102e" />
          </div>
        </div>
      )}
      <Head href="/personaliza" badge={badge} badgeCls="bg-fg text-bg" ring={photo ? "border-white/40 bg-black/20 backdrop-blur hover:bg-white hover:text-[#0d0d0d]" : "border-line hover:bg-fg hover:text-bg"} />
      <div className="relative z-10">
        <p className="headline text-2xl uppercase leading-[1.05] sm:text-3xl">{title}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 12))} placeholder={labels.name} aria-label={labels.name} className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/40 px-4 py-2.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-white/60 backdrop-blur focus:border-[#e0b84a] focus:outline-none" />
          <input value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="10" aria-label={labels.number} inputMode="numeric" className="w-14 rounded-full border border-white/25 bg-black/40 px-3 py-2.5 text-center text-sm text-white placeholder:text-white/60 backdrop-blur focus:border-[#e0b84a] focus:outline-none" />
          <button aria-label={labels.go} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#e0b84a] text-[#0d0d0d] transition hover:scale-105">
            <IconArrow className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

const INKS = [
  { hex: "#c8102e", label: "Rojo" },
  { hex: "#c9a227", label: "Oro" },
  { hex: "#111111", label: "Negro" },
];

export function DesignTile({ photo, badge, title, labels }: { photo: string | null; badge: string; title: string; labels: { text: string; go: string } }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [ink, setInk] = useState(INKS[0].hex);
  const shown = text.trim() || "Aa";
  const go = () => router.push(`/disena${text.trim() ? `?texto=${encodeURIComponent(text.trim())}&tinta=${encodeURIComponent(ink)}` : ""}`);
  const size = Math.min(9, 70 / Math.max(3, shown.length));

  return (
    <div className={`${tileBase} bg-[#c8102e] text-white`}>
      {photo && (
        <div className={coverBox}><div className={coverSquare} style={coverStyle}>
          <Image src={photo} alt="" fill sizes="(min-width:1024px) 34vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
          {/* print area + the customer's text on the chest */}
          <div className="absolute left-1/2 top-[30%] h-[30%] w-[30%] -translate-x-1/2 rounded-[3px] border-2 border-dashed border-[#c8102e]/70 [animation:dash_1.2s_linear_infinite]" />
          <div className="absolute inset-x-[18%] text-center font-[family-name:var(--font-logo)] font-bold leading-none" style={{ top: "40%", fontSize: `${size}cqmax`, color: ink, mixBlendMode: "multiply" }}>
            {shown}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#7d0a1d]/90 via-transparent to-black/20" />
        </div></div>
      )}
      <Head href="/disena" badge={badge} badgeCls="bg-white text-[#c8102e]" ring="border-white/40 bg-black/10 backdrop-blur hover:bg-white hover:text-[#c8102e]" />
      <div className="relative z-10">
        <p className="headline text-2xl uppercase leading-[1.05] sm:text-3xl">{title}</p>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 24))} placeholder={labels.text} aria-label={labels.text} className="min-w-0 flex-1 rounded-full border border-white/30 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/70 backdrop-blur focus:border-white focus:outline-none" />
          <div className="flex gap-1">
            {INKS.map((c) => (
              <button key={c.hex} type="button" aria-label={c.label} aria-pressed={ink === c.hex} onClick={() => setInk(c.hex)} className={`h-7 w-7 rounded-full border-2 ${ink === c.hex ? "border-white" : "border-white/30"}`} style={{ background: c.hex }} />
            ))}
          </div>
          <button aria-label={labels.go} className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-white text-[#c8102e] transition hover:scale-105">
            <IconArrow className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
