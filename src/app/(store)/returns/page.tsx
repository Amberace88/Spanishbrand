import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/server";
import { returnsSettings, formatAddress } from "@/lib/returns/service";
import { PageHero, Container } from "@/components/ui/Section";
import { PROVIDER_CLAIM_DAYS, RETURN_SHIP_DAYS, WITHDRAWAL_DAYS, GUARANTEE_YEARS } from "@/lib/returns/rules";

export const metadata: Metadata = { title: "Devoluciones y garantía", alternates: { canonical: "/returns" }, description: "Desistimiento de 14 días, productos personalizados, defectos y garantía. Cómo solicitar una devolución." };


export default async function ReturnsPage() {
  const [brand, locale, rs] = await Promise.all([getBrand(), getLocale(), returnsSettings()]);
  const en = locale === "en";
  const le = brand.legalEntity;
  const seller = [le.name ?? brand.name, le.taxId ? `NIF ${le.taxId}` : null, le.address, le.email ?? brand.supportEmail].filter(Boolean).join(" · ");
  const addr = formatAddress(rs.address);

  const cards = en
    ? [
        { n: `${WITHDRAWAL_DAYS} days`, t: "To change your mind", d: "From delivery, for non-personalised items. Return shipping is paid by you." },
        { n: "Free", t: "If it arrives wrong", d: "Defect, damage or wrong item: replacement or refund at no cost. Report within 30 days with photos." },
        { n: "Made for you", t: "Personalised items", d: "Names, numbers or your own design are made to your specification: no withdrawal, only for defects." },
        { n: `${GUARANTEE_YEARS} years`, t: "Legal guarantee", d: "Lack of conformity is covered by Spanish consumer law." },
      ]
    : [
        { n: `${WITHDRAWAL_DAYS} días`, t: "Para cambiar de opinión", d: "Desde la entrega, en artículos no personalizados. El envío de vuelta corre de tu cuenta." },
        { n: "Gratis", t: "Si llega mal", d: "Defecto, daño o artículo equivocado: reposición o reembolso sin coste. Avísanos en 30 días con fotos." },
        { n: "Hecho para ti", t: "Productos personalizados", d: "Con nombre, dorsal o tu propio diseño se fabrican según tus especificaciones: sin desistimiento, solo por defecto." },
        { n: `${GUARANTEE_YEARS} años`, t: "Garantía legal", d: "La falta de conformidad está cubierta por la normativa de consumo española." },
      ];

  return (
    <>
      <PageHero eyebrow={en ? "Help" : "Ayuda"} title={en ? "Returns" : "Devoluciones"} sub={en ? "Clear rules, made-to-order fairness. Every piece is produced for you, so please check size and options before buying." : "Reglas claras y justas para productos hechos bajo pedido. Cada pieza se fabrica para ti: revisa talla y opciones antes de comprar."}>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/returns/new" className="btn btn-primary px-7 py-4">
            {en ? "Start a return" : "Solicitar devolución"} →
          </Link>
          <Link href="/returns/status" className="btn btn-ghost px-7 py-4">
            {en ? "Check a request" : "Consultar una solicitud"}
          </Link>
        </div>
      </PageHero>

      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <div key={c.t} className={`rounded-[22px] p-6 ${i === 1 ? "bg-[#c8102e] text-white" : i === 2 ? "bg-[#d4a62a] text-[#0b0b0b]" : "border border-line bg-surface-2"}`}>
                <p className="font-[family-name:var(--font-logo)] text-3xl font-bold">{c.n}</p>
                <p className="mt-3 font-bold">{c.t}</p>
                <p className={`mt-1.5 text-sm leading-relaxed ${i === 1 || i === 2 ? "opacity-80" : "text-muted"}`}>{c.d}</p>
              </div>
            ))}
          </div>

          <ol className="mt-12 grid gap-3 md:grid-cols-4">
            {(en
              ? ["Find your order with its number and email", "Choose the reason and the items", "Add photos (required for defects)", "Get your reference and next steps by email"]
              : ["Busca tu pedido con su número y email", "Elige el motivo y los artículos", "Añade fotos (obligatorias si hay defecto)", "Recibe tu referencia y los pasos por email"]
            ).map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fg font-bold text-bg">{i + 1}</span>
                <span className="pt-1.5">{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-16 max-w-3xl space-y-6 text-[1.02rem] leading-relaxed text-fg/85 [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_a]:underline [&_h3]:pt-2 [&_h3]:font-bold [&_h3]:text-fg">
            {en ? <PolicyEn seller={seller} addr={addr} /> : <PolicyEs seller={seller} addr={addr} />}
          </div>
        </Container>
      </section>
    </>
  );
}

function PolicyEs({ seller, addr }: { seller: string; addr: string | null }) {
  return (
    <>
      <h2>1. Derecho de desistimiento (14 días)</h2>
      <p>Puedes desistir de tu compra sin indicar el motivo en un plazo de {WITHDRAWAL_DAYS} días naturales desde el día en que tú (o un tercero indicado por ti, distinto del transportista) recibiste el último artículo del pedido (arts. 102 y 104 del Real Decreto Legislativo 1/2007, TRLGDCU).</p>
      <p>
        Para ejercerlo, comunícanoslo antes de que termine el plazo mediante una declaración inequívoca: lo más rápido es nuestro <Link href="/returns/new">formulario de devolución</Link>, que te envía un acuse de recibo por email. También puedes usar el modelo de formulario del apartado 7 o escribirnos.
      </p>
      <h3>Envío de vuelta</h3>
      <ul>
        <li>Debes enviar los artículos sin demoras indebidas y, como máximo, en {RETURN_SHIP_DAYS} días naturales desde que nos comunicaste el desistimiento.</li>
        <li>
          <strong>Los costes directos de la devolución corren de tu cuenta</strong> (art. 108.1 TRLGDCU). Recomendamos un envío con seguimiento y guardar el justificante.
        </li>
        <li>Incluye la referencia de tu solicitud (DEV-…) dentro del paquete.</li>
        <li>{addr ? <>Dirección de devolución: <span className="whitespace-pre-line font-medium">{addr}</span></> : "La dirección de devolución se indica en el acuse de recibo de tu solicitud."}</li>
      </ul>
      <h3>Reembolso</h3>
      <ul>
        <li>Te reembolsaremos el precio pagado, incluidos los gastos de envío estándar iniciales (si devuelves el pedido completo; no se reembolsa el sobrecoste de un envío más caro elegido por ti), en un máximo de 14 días naturales desde que nos comunicaste el desistimiento.</li>
        <li>Usaremos el mismo medio de pago que utilizaste. Podemos retener el reembolso hasta haber recibido los artículos o hasta que nos presentes el justificante de envío, lo que ocurra primero (art. 107.3).</li>
        <li>Puedes examinar el artículo como lo harías en una tienda. Si lo has usado, lavado, dañado o le faltan etiquetas, descontaremos la depreciación resultante (art. 108.2).</li>
        <li>Como alternativa voluntaria puedes elegir un <strong>vale de compra por el importe + 10 %</strong> o un <strong>cambio de talla</strong>.</li>
      </ul>

      <h2>2. Productos personalizados: sin desistimiento</h2>
      <p>
        No existe derecho de desistimiento para los bienes confeccionados conforme a las especificaciones del consumidor o claramente personalizados (art. 103 c TRLGDCU): productos con tu nombre, dorsal, texto, fotografía o diseño creado en «Diseña tú mismo» o «Personaliza». Antes de pagar te pedimos que lo confirmes expresamente. Si un producto personalizado llega con un defecto, dañado o no coincide con lo que diseñaste, se aplica el apartado 3.
      </p>
      <p>Revisa con calma la vista previa, la ortografía y la talla antes de comprar: el producto se fabricará exactamente como lo apruebes.</p>

      <h2>3. Defectos, daños o artículo equivocado</h2>
      <ul>
        <li>Si tu artículo llega con un defecto de impresión o fabricación, dañado en el transporte, en otra talla/color o falta algo, lo solucionamos <strong>sin coste para ti</strong>: reposición o reembolso.</li>
        <li>
          Avísanos lo antes posible y, para una gestión ágil, en un máximo de {PROVIDER_CLAIM_DAYS} días desde la entrega, con <strong>fotos</strong>: el artículo completo, el detalle del problema y la etiqueta (y el paquete si llegó dañado). Normalmente no tendrás que devolver nada.
        </li>
        <li>Conserva el artículo hasta que resolvamos la solicitud.</li>
      </ul>

      <h2>4. Garantía legal</h2>
      <p>Respondemos de las faltas de conformidad que se manifiesten en un plazo de {GUARANTEE_YEARS} años desde la entrega (art. 120 TRLGDCU). Puedes elegir entre reparación o sustitución salvo que sea imposible o desproporcionado; en su defecto, rebaja del precio o resolución.</p>

      <h2>5. Qué no cubre</h2>
      <ul>
        <li>El desgaste normal por uso, lavados incorrectos (no seguir las instrucciones de cuidado) o daños causados tras la entrega.</li>
        <li>Diferencias leves de color entre pantalla y producto impreso, propias de la impresión bajo demanda.</li>
        <li>Errores en datos introducidos por ti en productos personalizados (texto, ortografía, talla elegida).</li>
        <li>Envíos devueltos por dirección incorrecta o no recogidos: el reenvío se cobra al coste.</li>
      </ul>

      <h2>6. Cancelaciones</h2>
      <p>Como cada pieza se fabrica al recibir el pedido, solo podemos cancelar sin coste mientras no haya entrado en producción (normalmente las primeras horas). Escríbenos cuanto antes desde <Link href="/contact">Contacto</Link>.</p>

      <h2>7. Modelo de formulario de desistimiento</h2>
      <p className="text-sm text-muted">(Anexo B del TRLGDCU — solo debe cumplimentarlo y enviarlo si desea desistir del contrato. También puede usar nuestro formulario online.)</p>
      <div className="rounded-2xl border border-line bg-surface-2 p-5 font-mono text-[13px] leading-relaxed">
        <p>A la atención de: {seller || "ROJO Y GUALDA"}</p>
        <p>Por la presente le comunico que desisto de mi contrato de venta del siguiente bien:</p>
        <p>Pedido n.º: ______ · Artículo(s): ______________________</p>
        <p>Pedido el / recibido el: ______ / ______</p>
        <p>Nombre del consumidor: ______________________</p>
        <p>Dirección del consumidor: ______________________</p>
        <p>Firma del consumidor (solo si el formulario se presenta en papel): ______</p>
        <p>Fecha: ______</p>
      </div>
      <p className="pt-4 text-sm text-muted">Esta política no limita los derechos que te reconoce la normativa de consumo aplicable. Para cualquier duda, <Link href="/contact">contáctanos</Link>. Plataforma europea de resolución de litigios en línea: ec.europa.eu/consumers/odr.</p>
    </>
  );
}

function PolicyEn({ seller, addr }: { seller: string; addr: string | null }) {
  return (
    <>
      <h2>1. Right of withdrawal (14 days)</h2>
      <p>You may withdraw from your purchase without giving any reason within {WITHDRAWAL_DAYS} calendar days of the day on which you (or a third party you indicate, other than the carrier) received the last item of the order (arts. 102 and 104, Spanish Royal Legislative Decree 1/2007, TRLGDCU).</p>
      <p>
        To exercise it, tell us before the period ends with a clear statement: the fastest way is our <Link href="/returns/new">return form</Link>, which emails you an acknowledgment. You may also use the model form in section 7 or write to us.
      </p>
      <h3>Sending items back</h3>
      <ul>
        <li>Send the items without undue delay and at the latest within {RETURN_SHIP_DAYS} calendar days of notifying us.</li>
        <li>
          <strong>You bear the direct cost of returning the goods</strong> (art. 108.1 TRLGDCU). We recommend a tracked service and keeping proof of postage.
        </li>
        <li>Put your request reference (DEV-…) inside the parcel.</li>
        <li>{addr ? <>Return address: <span className="whitespace-pre-line font-medium">{addr}</span></> : "The return address is included in your request acknowledgment."}</li>
      </ul>
      <h3>Refund</h3>
      <ul>
        <li>We refund the price paid including the initial standard delivery cost (when the whole order is returned; not the extra cost of a more expensive delivery you chose) within 14 days of your notice.</li>
        <li>We use the same payment method. We may withhold the refund until we receive the goods or proof of dispatch, whichever comes first (art. 107.3).</li>
        <li>You may inspect the item as in a shop. If it has been used, washed, damaged or labels are missing, we deduct the resulting loss in value (art. 108.2).</li>
        <li>As a voluntary alternative you can choose a <strong>store voucher worth the amount + 10%</strong> or a <strong>size exchange</strong>.</li>
      </ul>
      <h2>2. Personalised products: no withdrawal</h2>
      <p>There is no right of withdrawal for goods made to the consumer’s specifications or clearly personalised (art. 103 c TRLGDCU): items with your name, number, text, photo or a design made in “Design your own” or “Personalise”. You confirm this explicitly before paying. Defects, damage or differences from your approved design are covered by section 3.</p>
      <h2>3. Defects, damage or wrong item</h2>
      <ul>
        <li>Print/manufacturing defect, damage in transit, wrong size/colour or a missing item: we fix it <strong>at no cost to you</strong> — replacement or refund.</li>
        <li>Tell us as soon as possible and, for fast handling, within {PROVIDER_CLAIM_DAYS} days of delivery, with <strong>photos</strong> of the whole item, the issue and the label (and the parcel if damaged). Usually you won’t need to send anything back.</li>
        <li>Keep the item until the request is resolved.</li>
      </ul>
      <h2>4. Legal guarantee</h2>
      <p>We are liable for any lack of conformity that becomes apparent within {GUARANTEE_YEARS} years of delivery (art. 120 TRLGDCU).</p>
      <h2>5. Not covered</h2>
      <ul>
        <li>Normal wear, incorrect washing or damage after delivery.</li>
        <li>Slight colour differences between screen and print inherent to print-on-demand.</li>
        <li>Errors in data you entered on personalised products (text, spelling, chosen size).</li>
        <li>Parcels returned due to a wrong address or not collected: re-shipping is charged at cost.</li>
      </ul>
      <h2>6. Cancellations</h2>
      <p>Each piece is made when you order, so we can only cancel free of charge before production starts (usually the first hours). Contact us as soon as possible.</p>
      <h2>7. Model withdrawal form</h2>
      <div className="rounded-2xl border border-line bg-surface-2 p-5 font-mono text-[13px] leading-relaxed">
        <p>To: {seller || "ROJO Y GUALDA"}</p>
        <p>I hereby give notice that I withdraw from my contract of sale of the following goods:</p>
        <p>Order no.: ______ · Item(s): ______________________</p>
        <p>Ordered on / received on: ______ / ______</p>
        <p>Name of consumer: ______________________</p>
        <p>Address of consumer: ______________________</p>
        <p>Signature (only if submitted on paper): ______ · Date: ______</p>
      </div>
      <p className="pt-4 text-sm text-muted">This policy does not limit your statutory consumer rights. EU online dispute resolution platform: ec.europa.eu/consumers/odr.</p>
    </>
  );
}
