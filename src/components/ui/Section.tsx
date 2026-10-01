import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHead({ eyebrow, title, sub, action, dark = false, center = false }: { eyebrow: string; title: string; sub?: string; action?: ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <div className={`mb-8 flex flex-col gap-5 sm:mb-12 ${center ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between"}`}>
      <Reveal className="max-w-3xl">
        <p className="kicker flex items-center gap-2 text-gold"><span className="flag-line inline-block h-[3px] w-6 rounded-full" />{eyebrow}</p>
        <h2 className="headline mt-3 text-[2.4rem] sm:text-6xl">{title}</h2>
        {sub && <p className={`mt-4 max-w-xl text-base leading-relaxed sm:text-lg ${dark ? "text-white/70" : "text-muted"} ${center ? "mx-auto" : ""}`}>{sub}</p>}
      </Reveal>
      {action && <Reveal delay={0.1}>{action}</Reveal>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

/** Page header: big display title over a subtle azulejo line pattern. `dark` kept for API compatibility. */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; dark?: boolean; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg">
      <div className="azulejo-line pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] opacity-[0.5] [mask-image:linear-gradient(to_left,black,transparent)] md:block" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-8 sm:py-20">
        <Reveal>
          <p className="kicker flex items-center gap-2 text-gold"><span className="flag-line inline-block h-[3px] w-6 rounded-full" />{eyebrow}</p>
          <h1 className="mt-4 font-[family-name:var(--font-logo)] font-bold leading-[1] tracking-[0.01em] text-fg text-[11vw] sm:text-7xl lg:text-[6rem]">{title}</h1>
          {sub && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{sub}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
