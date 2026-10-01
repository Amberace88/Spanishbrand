import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { PageHero, Container } from "@/components/ui/Section";
import { ReturnWizard } from "@/components/returns/ReturnWizard";

export const metadata: Metadata = { title: "Solicitar devolución", robots: { index: false }, alternates: { canonical: "/returns/new" } };

export default async function NewReturnPage({ searchParams }: { searchParams: Promise<{ order?: string; email?: string }> }) {
  const [sp, locale] = await Promise.all([searchParams, getLocale()]);
  const en = locale === "en";
  return (
    <>
      <PageHero eyebrow={en ? "Returns" : "Devoluciones"} title={en ? "Start a return" : "Solicitar devolución"} sub={en ? "A few steps and you're done. You'll receive a reference and the next steps by email." : "Unos pasos y listo. Recibirás una referencia y los siguientes pasos por email."}>
        <p className="mt-4 text-sm text-muted">
          <Link href="/returns" className="underline">
            {en ? "Read the returns policy" : "Leer la política de devoluciones"}
          </Link>
        </p>
      </PageHero>
      <section className="bg-bg pb-24 pt-10">
        <Container>
          <div className="mx-auto max-w-5xl">
            <ReturnWizard initialOrder={sp.order?.replace(/\D/g, "").slice(0, 10)} initialEmail={sp.email?.slice(0, 200)} />
          </div>
        </Container>
      </section>
    </>
  );
}
