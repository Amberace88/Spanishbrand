import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Contacto", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const brand = await getBrand();
  const email = brand.supportEmail;
  return (
    <ProsePage eyebrow="Ayuda" title="Contacto" sub="Estamos aquí para ayudarte con tu pedido.">
      <p>Para cualquier consulta sobre pedidos, envíos o devoluciones, escríbenos{email ? <> a <a href={`mailto:${email}`}>{email}</a></> : " desde el email con el que realizaste tu pedido"}. Indica tu número de pedido para que podamos ayudarte más rápido.</p>
      <p>Respondemos de lunes a viernes, normalmente en 24–48 horas laborables.</p>
      <h2>Seguimiento</h2>
      <p>Si tienes cuenta, puedes ver el estado y el seguimiento de tus pedidos en <a href="/account/orders">Mi cuenta</a>.</p>
    </ProsePage>
  );
}
