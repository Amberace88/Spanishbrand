import type { ReactNode } from "react";
import { MaskLines, Reveal } from "./Reveal";

export function SectionHead({ eyebrow, title, sub, action, dark = false }: { eyebrow: string; title: string; sub?: string; action?: ReactNode; dark?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-6 sm:mb-14 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Reveal>
          <p className={`eyebrow ${dark ? "text-oro-2" : "text-rojo"}`}>{eyebrow}</p>
        </Reveal>
        <h2 className="display mt-4 text-6xl sm:text-7xl lg:text-8xl">
          <MaskLines lines={[title]} />
        </h2>
        {sub && (
          <Reveal delay={0.1}>
            <p className={`mt-5 max-w-xl text-base leading-relaxed ${dark ? "text-bone/70" : "text-stone-2"}`}>{sub}</p>
          </Reveal>
        )}
      </div>
      {action && <Reveal delay={0.15}>{action}</Reveal>}
    </div>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1600px] px-4 sm:px-8 ${className}`}>{children}</div>;
}

export function PageHero({ eyebrow, title, sub, dark = false }: { eyebrow: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <section className={`relative overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-40 ${dark ? "grain bg-ink text-bone" : "bg-bone"}`}>
      <Container>
        <Reveal>
          <p className={`eyebrow ${dark ? "text-oro-2" : "text-rojo"}`}>{eyebrow}</p>
        </Reveal>
        <h1 className="display mt-5 text-[17vw] sm:text-[12vw] lg:text-[9vw]">
          <MaskLines lines={[title]} />
        </h1>
        {sub && (
          <Reveal delay={0.1}>
            <p className={`serif mt-6 max-w-2xl text-2xl italic leading-snug sm:text-3xl ${dark ? "text-bone/80" : "text-ink/75"}`}>{sub}</p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
