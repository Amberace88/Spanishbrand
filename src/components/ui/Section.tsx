import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHead({ eyebrow, title, sub, action, dark = false, center = false }: { eyebrow: string; title: string; sub?: string; action?: ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <div className={`mb-8 flex flex-col gap-5 sm:mb-12 ${center ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between"}`}>
      <Reveal className="max-w-2xl">
        <p className={`eyebrow ${dark ? "text-oro-2" : "text-rojo"}`}>{eyebrow}</p>
        <h2 className="headline mt-3 text-[2.1rem] sm:text-5xl">{title}</h2>
        {sub && <p className={`mt-4 max-w-xl text-base leading-relaxed sm:text-lg ${dark ? "text-white/75" : "text-stone-2"} ${center ? "mx-auto" : ""}`}>{sub}</p>}
      </Reveal>
      {action && <Reveal delay={0.1}>{action}</Reveal>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

/** Light page header with an azulejo accent band. `dark` kept for API compatibility (renders the cobalt variant). */
export function PageHero({ eyebrow, title, sub, dark = false }: { eyebrow: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <section className={`relative overflow-hidden border-b border-ink/[0.07] ${dark ? "bg-azul-50" : "bg-cream"}`}>
      <div className="azulejo pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] opacity-60 [mask-image:linear-gradient(to_left,black,transparent)] md:block" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-8 sm:py-16">
        <Reveal>
          <p className="eyebrow text-rojo">{eyebrow}</p>
          <h1 className="headline mt-3 text-[2.6rem] sm:text-6xl">{title}</h1>
          {sub && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-2">{sub}</p>}
        </Reveal>
      </div>
    </section>
  );
}
