import { requireStaff } from "@/lib/auth/rbac";
import { isConfigured } from "@/lib/env";
import { ACTIVE_DESIGNS } from "@/lib/catalog/designs";
import { buildPlan } from "@/lib/fulfillment/catalog-builder";
import { CatalogBuilder } from "@/components/admin/CatalogBuilder";
import { ArchiveRetired } from "@/components/admin/ArchiveRetired";
import { RebuildChanged } from "@/components/admin/RebuildChanged";

export const dynamic = "force-dynamic";

export default async function CatalogBuilderPage() {
  await requireStaff(["ADMIN"]);
  const plan = buildPlan();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Constructor de catálogo</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-600">
          Convierte la biblioteca de diseños ({ACTIVE_DESIGNS.length} diseños originales) en productos reales: busca el producto en Printful/Gelato, genera el archivo de impresión a la
          medida exacta, crea variantes y mapeos, ejecuta la prueba de fulfillment (presupuesto sin cargo), genera los mockups, aprueba y publica. Cada paso es reanudable — puedes
          cerrar la página y continuar más tarde.
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Printful: {isConfigured.printful() ? "✓" : "sin clave"} · Gelato: {isConfigured.gelato() ? "✓" : "sin clave"} · Printify: {isConfigured.printify() ? "✓" : "sin clave (PRINTIFY_API_TOKEN)"} · Prodigi: {isConfigured.prodigi() ? "✓" : "sin clave (PRODIGI_API_KEY)"} · {plan.length} trabajos
        </p>
      </div>
      <ArchiveRetired />
      <RebuildChanged />
      <CatalogBuilder plan={plan} />
    </div>
  );
}
