import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/Wordmark";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

export default function Offline() {
  return (
    <section className="flex min-h-[70svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="h-24">
        <BrandLogo variant="lion" />
      </span>
      <h1 className="headline text-4xl">Sin conexión</h1>
      <p className="max-w-sm text-muted">Parece que no tienes internet ahora mismo. Tu carrito y tu diseño se guardan; vuelve a intentarlo en un momento.</p>
      <Link href="/" className="btn btn-primary">
        Reintentar
      </Link>
    </section>
  );
}
