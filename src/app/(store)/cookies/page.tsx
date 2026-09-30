import type { Metadata } from "next";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Cookies", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <ProsePage eyebrow="Legal" title="Cookies">
      <h2>Necesarias</h2>
      <ul>
        <li><strong>sid</strong> — identificador de sesión anónimo (carrito, votaciones).</li>
        <li><strong>cart_id</strong> — tu carrito.</li>
        <li><strong>sb-*</strong> — sesión de tu cuenta.</li>
        <li><strong>consent</strong> — tu elección de cookies.</li>
        <li><strong>ref_creator / ref_campaign</strong> — atribución de enlaces de creadores (30 días).</li>
      </ul>
      <h2>Analíticas (con consentimiento)</h2>
      <p>Medición propia de visitas y conversiones, sin terceros. Solo se activan si aceptas.</p>
      <p>Para cambiar tu elección, borra la cookie <strong>consent</strong> de tu navegador y recarga la página.</p>
    </ProsePage>
  );
}
