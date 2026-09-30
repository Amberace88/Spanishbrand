"use client";
import { useEffect, useState } from "react";

/** Countdown to a REAL scheduled drop date (never an invented deadline). */
export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const diff = Math.max(0, target - now);
  const parts = [
    ["días", Math.floor(diff / 86400000)],
    ["horas", Math.floor((diff / 3600000) % 24)],
    ["min", Math.floor((diff / 60000) % 60)],
    ["seg", Math.floor((diff / 1000) % 60)],
  ] as const;
  return (
    <div className="flex gap-3 sm:gap-5">
      {parts.map(([label, v]) => (
        <div key={label} className="min-w-16 border border-current/20 px-3 py-3 text-center">
          <p className="display text-4xl tabular-nums sm:text-5xl">{String(v).padStart(2, "0")}</p>
          <p className="eyebrow mt-1 text-[0.58rem] opacity-60">{label}</p>
        </div>
      ))}
    </div>
  );
}
