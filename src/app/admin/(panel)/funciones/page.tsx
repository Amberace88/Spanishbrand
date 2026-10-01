import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { db } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import { PageTitle } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Status = "ok" | "todo" | "info";
interface Feature {
  name: string;
  href?: string;
  what: string;
  status?: Status;
  note?: string;
}

export default async function FeaturesPage() {
  await requireStaff(["ADMIN", "ANALYST", "CUSTOMER_SUPPORT", "CONTENT_MANAGER"]);
  const sb = db();
  const [{ count: published }, { count: collections }, { count: jobsDone }, { count: jobsFailed }, { count: team }] = await Promise.all([
    sb.from("products").select("id", { count: "exact", head: true }).eq("brand_id", env.brandId()).eq("status", "PUBLISHED"),
    sb.from("collections").select("id", { count: "exact", head: true }).eq("brand_id", env.brandId()).eq("status", "ACTIVE"),
    sb.from("catalog_jobs").select("key", { count: "exact", head: true }).eq("phase", "done").eq("kind", "PRODUCT"),
    sb.from("catalog_jobs").select("key", { count: "exact", head: true }).eq("phase", "failed"),
    sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("brand_id", env.brandId()),
  ]);

  const launch: [string, boolean, string, string?][] = [
    ["Dominio rojoygualda.com + HTTPS", env.siteUrl().includes("rojoygualda.com"), "DNS en GoDaddy → Netlify"],
    ["Base de datos y acceso", isConfigured.db() && isConfigured.auth(), "Supabase"],
    ["Printful", isConfigured.printful(), "Ropa, tazas, bolsas, pegatinas", "/admin/providers"],
    ["Gelato", isConfigured.gelato(), "Pósters", "/admin/providers"],
    ["Printify", isConfigured.printify(), "Toallas, delantales, cojines, fundas, puzles…", "/admin/providers"],
    ["Prodigi", isConfigured.prodigi(), "Láminas enmarcadas y lienzos", "/admin/providers"],
    ["Catálogo publicado", (published ?? 0) > 0, `${published ?? 0} productos a la venta`, "/admin/catalogo"],
    ["Pagos (Stripe)", isConfigured.stripe(), "Tarjeta, Apple Pay, Google Pay y Bizum (activar en Stripe)", "/admin/settings"],
    ["Emails (Resend)", isConfigured.email(), "Confirmaciones, envíos, tarjetas regalo", "/admin/settings"],
    ["Tareas automáticas (CRON_SECRET)", Boolean(env.cronSecret()), "Reintentos, seguimiento, drops, carritos abandonados"],
    [
      "Avisos de proveedores (webhooks)",
      ["PRINTFUL_WEBHOOK_SECRET", "GELATO_WEBHOOK_SECRET", "PRINTIFY_WEBHOOK_SECRET", "PRODIGI_WEBHOOK_SECRET"].every((k) => Boolean(process.env[k])),
      `Estados y seguimiento en tiempo real · ${["PRINTFUL", "GELATO", "PRINTIFY", "PRODIGI"].filter((p) => process.env[`${p}_WEBHOOK_SECRET`]).length}/4 proveedores`,
      "/admin/providers",
    ],
    ["IA", isConfigured.ai(), "Textos de producto y contenido", "/admin/ai"],
  ];

  const groups: { title: string; items: Feature[] }[] = [
    {
      title: "Ventas y pedidos",
      items: [
        { name: "Pedidos", href: "/admin/orders", what: "Todos los pedidos, pagos, reembolsos, notas y revisión de personalizaciones antes de imprimir." },
        { name: "Fulfillment", href: "/admin/fulfillment", what: "Envío automático al proveedor, reintentos, errores, cambio de proveedor y seguimiento." },
        { name: "Tarjetas regalo", href: "/regalos", what: "Venta de tarjetas regalo (25–150 €) con código de un solo uso enviado por email." },
        { name: "Empresas / B2B", href: "/admin/b2b", what: "Solicitudes de pedidos para empresas, peñas y eventos: estados y presupuestos." },
      ],
    },
    {
      title: "Catálogo",
      items: [
        { name: "Constructor de catálogo", href: "/admin/catalogo", what: "Convierte los 60 diseños de la casa en productos reales en 4 proveedores, con mockups y publicación automática.", note: `${jobsDone ?? 0} listos · ${jobsFailed ?? 0} con error` },
        { name: "Productos", href: "/admin/products", what: "Edición, precios, variantes, imágenes, mapeo a proveedores, prueba de fulfillment, personalización y publicación." },
        { name: "Colecciones", href: "/admin/collections", what: "Colecciones temáticas (España, Ciudades, Afición, Mediterráneo…).", note: `${collections ?? 0} activas` },
        { name: "Drops", href: "/admin/drops", what: "Lanzamientos con fecha, cuenta atrás y ediciones limitadas (también solo para socios del club)." },
        { name: "Proveedores", href: "/admin/providers", what: "Estado de Printful, Gelato, Printify y Prodigi, sincronización de catálogo y registro de webhooks." },
      ],
    },
    {
      title: "Personalización (clientes)",
      items: [
        { name: "Diseña tú mismo", href: "/disena", what: "Estudio online: textos, tipografías, colores, imágenes propias con quitado de fondo automático y 60 estilos de la casa." },
        { name: "Personaliza", href: "/personaliza", what: "Plantillas rápidas: nombre + dorsal, Mi pueblo, Desde 19XX, frase propia." },
        { name: "Revisión antes de imprimir", href: "/admin/orders", what: "Las imágenes subidas y palabras sensibles pasan por aprobación manual; el resto va directo a producción." },
      ],
    },
    {
      title: "Clientes y fidelización",
      items: [
        { name: "Clientes (CRM)", href: "/admin/customers", what: "Fichas, segmentos (nuevo, recurrente, VIP…), historial y consentimientos RGPD." },
        { name: "Club ROJO Y GUALDA", href: "/club", what: "Número de socio, puntos por compra (1 pt/€), canje 100 pts = 5 € y drops exclusivos." },
        { name: "Cuentas de cliente", href: "/account", what: "Pedidos, seguimiento, perfil, contraseña o enlace por email, exportar y borrar datos." },
        { name: "Comunidad", href: "/admin/community", what: "Votaciones de diseños y colecciones, encuestas y contenido de la comunidad." },
        { name: "Causas solidarias", href: "/admin/causas", what: "1 € por pieza para veteranos, mayores, infancia o animales; socios y certificados públicos." },
        { name: "Creadores", href: "/admin/creators", what: "Programa de creadores con enlaces y código propios, clics y comisiones." },
      ],
    },
    {
      title: "Contenido y marketing",
      items: [
        { name: "Content Studio", href: "/admin/content", what: "Journal, páginas y textos de la tienda." },
        { name: "AI Creator", href: "/admin/ai", what: "Generación de descripciones, SEO y contenido con revisión humana." },
        { name: "Analítica", href: "/admin/analytics", what: "Ingresos, pedidos, conversión, productos y colecciones top (solo datos reales con consentimiento)." },
        { name: "Regiones y ciudades", href: "/regiones", what: "Páginas SEO para 17 comunidades, provincias y 30 ciudades con sus diseños." },
        { name: "Idiomas", what: "Español, català/valencià, euskara, galego, English y Deutsch." },
        { name: "App instalable", what: "La tienda se instala en el móvil como una app (icono, pantalla completa, barra inferior)." },
      ],
    },
    {
      title: "Sistema y seguridad",
      items: [
        { name: "Equipo y roles", href: "/admin/equipo", what: "Invitar personas con rol: Super admin, Admin, Contenido, Atención al cliente, Analista.", note: `${team ?? 0} accesos` },
        { name: "Mi cuenta", href: "/admin/cuenta", what: "Crear o cambiar contraseña y cerrar sesión en todos los dispositivos." },
        { name: "Ajustes", href: "/admin/settings", what: "Marca, envíos, impuestos, donación por pieza y avisos." },
        { name: "Registro de auditoría", what: "Cada cambio sensible (precios, publicación, roles, reembolsos) queda registrado con autor y fecha." },
      ],
    },
  ];

  return (
    <>
      <PageTitle title="Funciones" sub="Todo lo que hace ROJO Y GUALDA · estado de la puesta en marcha" />
      <section className="mb-10 border border-sand bg-white">
        <div className="flex items-center justify-between border-b border-sand px-5 py-3">
          <h2 className="eyebrow text-[0.65rem] text-stone-2">Lista de lanzamiento</h2>
          <span className="text-xs text-stone-2">
            {launch.filter(([, ok]) => ok).length}/{launch.length} listo
          </span>
        </div>
        <ul className="grid gap-px bg-sand sm:grid-cols-2 lg:grid-cols-3">
          {launch.map(([label, ok, hint, href]) => {
            const inner = (
              <>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? "bg-emerald-600 text-white" : "border border-rojo text-rojo"}`}>{ok ? "✓" : "!"}</span>
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-xs text-stone-2">{hint}</span>
                </span>
              </>
            );
            return (
              <li key={label} className="bg-white">
                {href ? (
                  <Link href={href} className="flex gap-3 px-5 py-4 text-sm hover:bg-[#faf7f1]">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-5 py-4 text-sm">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="eyebrow mb-3 text-[0.65rem] text-stone-2">{g.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((f) => {
                const body = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold">{f.name}</h3>
                      {f.href && <span className="text-stone-2 transition-transform group-hover:translate-x-0.5">→</span>}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.what}</p>
                    {f.note && <p className="mt-2 text-xs font-semibold text-oro">{f.note}</p>}
                  </>
                );
                return f.href ? (
                  <Link key={f.name} href={f.href} className="group block border border-sand bg-white p-5 transition-colors hover:border-ink">
                    {body}
                  </Link>
                ) : (
                  <div key={f.name} className="border border-sand bg-white p-5">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
