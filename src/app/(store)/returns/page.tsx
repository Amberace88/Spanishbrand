import type { Metadata } from "next";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Devoluciones", alternates: { canonical: "/returns" } };

export default function ReturnsPage() {
  return (
    <ProsePage eyebrow="Ayuda" title="Devoluciones" notice="Borrador — pendiente de validación legal antes del lanzamiento.">
      <p>Queremos que estés contento con tu pedido. Como nuestros artículos se fabrican bajo pedido, te pedimos que revises bien talla y opción antes de comprar.</p>
      <h2>Productos defectuosos o erróneos</h2>
      <p>Si tu artículo llega dañado, con un defecto de impresión o no corresponde a lo que pediste, escríbenos en un plazo de 30 días desde la entrega con tu número de pedido y una foto. Lo reemplazaremos o reembolsaremos sin coste.</p>
      <h2>Derecho de desistimiento</h2>
      <p>Dispones de 14 días naturales desde la recepción para desistir de la compra conforme a la normativa de consumo aplicable, salvo en los supuestos de productos personalizados según las especificaciones del consumidor. Contacta con nosotros para iniciar el proceso.</p>
      <h2>Reembolsos</h2>
      <p>Los reembolsos se realizan al mismo método de pago utilizado, normalmente en 5–10 días hábiles tras su aprobación.</p>
    </ProsePage>
  );
}
