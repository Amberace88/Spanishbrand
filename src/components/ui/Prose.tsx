import type { ReactNode } from "react";
import { Container, PageHero } from "./Section";

export function ProsePage({ eyebrow, title, sub, children, notice }: { eyebrow: string; title: string; sub?: string; children: ReactNode; notice?: string }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} sub={sub} />
      <section className="bg-warm pb-24 pt-12">
        <Container>
          {notice && <p className="mb-10 max-w-3xl border-l-2 border-oro bg-bone px-4 py-3 text-sm text-stone-2">{notice}</p>}
          <div className="max-w-3xl space-y-6 text-[1.02rem] leading-relaxed text-ink/85 [&_h2]:display [&_h2]:pt-6 [&_h2]:text-4xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
            {children}
          </div>
        </Container>
      </section>
    </>
  );
}
