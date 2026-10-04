import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Privacidad", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const brand = await getBrand();
  return (
    <ProsePage eyebrow="Legal" title="Privacidad" notice="Borrador: completar datos del responsable y validar con asesoría legal antes del lanzamiento.">
      <h2>Responsable</h2>
      <p>{brand.name} — [Razón social, NIF, dirección, email de contacto].</p>
      <h2>Datos que tratamos</h2>
      <ul>
        <li>Datos de pedido: nombre, email, teléfono, dirección de envío y facturación.</li>
        <li>Datos de cuenta: email y preferencias.</li>
        <li>Datos de navegación: solo con tu consentimiento de cookies analíticas.</li>
      </ul>
      <h2>Finalidades y base legal</h2>
      <ul>
        <li>Gestionar y entregar tu pedido (ejecución de contrato).</li>
        <li>Comunicaciones comerciales (consentimiento, revocable en cualquier momento).</li>
        <li>Obligaciones fiscales y contables (obligación legal).</li>
      </ul>
      <h2>Encargados de tratamiento</h2>
      <p>Compartimos los datos mínimos necesarios con proveedores que nos ayudan a operar: pasarela de pago (Stripe), socios de producción y envío (para fabricar y entregar tu pedido), alojamiento y base de datos, y envío de emails transaccionales.</p>
      <h2>Tus derechos</h2>
      <p>Puedes acceder, rectificar, suprimir, oponerte, limitar y portar tus datos. Desde <a href="/account/profile">tu cuenta</a> puedes descargar tus datos y solicitar la eliminación. También puedes reclamar ante la AEPD.</p>
      <h2>Conservación</h2>
      <p>Conservamos los datos de pedidos durante los plazos legalmente exigidos; los datos de marketing, hasta que retires el consentimiento.</p>
    </ProsePage>
  );
}
