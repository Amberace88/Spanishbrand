import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-dvh items-center justify-center overflow-hidden bg-fg px-4 text-center text-fg">
      <div>
        <p className="eyebrow text-gold">Error 404</p>
        <h1 className="display mt-4 text-[28vw] leading-none sm:text-[18vw]">Perdidos</h1>
        <p className="serif mt-4 text-2xl italic text-fg/75">Esta calle no aparece en el mapa.</p>
        <Link href="/" className="btn btn-primary mt-10">Volver al inicio</Link>
      </div>
    </main>
  );
}
