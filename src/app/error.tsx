"use client";

/** Customers never see raw errors. Details are in structured server logs. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-warm px-4 text-center">
      <div>
        <h1 className="display text-7xl">Algo ha ido mal</h1>
        <p className="mt-4 text-stone-2">Something went wrong. Please try again.</p>
        <button onClick={reset} className="btn btn-ink mt-8">Reintentar</button>
      </div>
    </main>
  );
}
