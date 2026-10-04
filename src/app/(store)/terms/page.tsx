import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Términos", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const brand = await getBrand();
  return (
    <ProsePage eyebrow="Legal" title="Términos y condiciones" notice="Borrador: completar datos del titular y validar con asesoría legal antes del lanzamiento.">
      <h2>Titular</h2>
      <p>{brand.name} — [Razón social, NIF, domicilio, email].</p>
      <h2>Productos</h2>
      <p>Todos los artículos se fabrican bajo pedido. Las imágenes son representaciones; pueden existir ligeras variaciones de color propias de la impresión.</p>
      <h2>Precios</h2>
      <p>Los precios incluyen IVA para envíos dentro de la UE. Los gastos de envío se muestran antes del pago.</p>
      <h2>Pago</h2>
      <p>El pago se procesa de forma segura mediante Stripe. El pedido se confirma una vez verificado el pago.</p>
      <h2>Entrega</h2>
      <p>Consulta plazos y tarifas en la página de <a href="/shipping">envíos</a>.</p>
      <h2>Desistimiento y garantía</h2>
      <p>Consulta la página de <a href="/returns">devoluciones</a>.</p>
      <h2>Ley aplicable</h2>
      <p>Legislación española. Plataforma europea de resolución de litigios en línea: ec.europa.eu/consumers/odr.</p>
    </ProsePage>
  );
}
