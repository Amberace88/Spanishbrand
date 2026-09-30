import type { Metadata } from "next";
import { dbOrNull } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { ProsePage } from "@/components/ui/Prose";

export const metadata: Metadata = { title: "Envíos", alternates: { canonical: "/shipping" } };
export const revalidate = 600;

export default async function ShippingPage() {
  const sb = dbOrNull();
  const { data: rules } = sb ? await sb.from("shipping_rules").select("name, country_codes, base_rate, per_additional_item, free_over, min_days, max_days").eq("brand_id", env.brandId()).eq("active", true).order("sort") : { data: [] };
  return (
    <ProsePage eyebrow="Ayuda" title="Envíos" sub="Fabricado bajo pedido, enviado con seguimiento.">
      <p>Cada artículo se produce cuando realizas tu pedido. La producción suele tardar entre 2 y 5 días laborables; después, el envío se realiza con número de seguimiento que recibirás por email y en tu cuenta.</p>
      <p>Si un pedido contiene artículos de distintos centros de producción, puede llegar en varios paquetes.</p>
      <h2>Tarifas</h2>
      <p>En el checkout se muestra el coste exacto de envío antes de pagar. Tarifas de referencia:</p>
      <ul>
        {(rules ?? []).map((r) => (
          <li key={r.name}>
            <strong>{r.name}</strong>: {formatMoney(Number(r.base_rate))}{Number(r.per_additional_item) > 0 ? ` + ${formatMoney(Number(r.per_additional_item))} por artículo adicional` : ""}{r.free_over ? ` · gratis a partir de ${formatMoney(Number(r.free_over))}` : ""}{r.min_days && r.max_days ? ` · ${r.min_days}–${r.max_days} días laborables` : ""}
          </li>
        ))}
      </ul>
      <h2>Canarias, Ceuta y Melilla</h2>
      <p>Estos territorios tienen un régimen fiscal y aduanero distinto. Los pedidos con destino a ellos se revisan manualmente antes de producirse; te contactaremos si hubiera costes adicionales.</p>
    </ProsePage>
  );
}
