export function Marquee({ items, tone = "rojo", reverse = false }: { items: string[]; tone?: "rojo" | "ink" | "bone"; reverse?: boolean }) {
  const toneCls = tone === "rojo" ? "bg-rojo text-white" : tone === "ink" ? "bg-ink text-bone" : "bg-bone text-ink border-y border-ink/10";
  const row = [...items, ...items, ...items];
  return (
    <div className={`relative overflow-hidden py-4 ${toneCls}`} aria-hidden>
      <div className={`flex w-max ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}>
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((it, i) => (
              <span key={`${k}-${i}`} className="display flex items-center text-2xl sm:text-3xl">
                <span className="px-6 sm:px-10">{it}</span>
                <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-70" fill="currentColor">
                  <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
