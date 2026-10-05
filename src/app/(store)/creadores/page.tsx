import type { Metadata } from "next";
import Image from "next/image";
import { campaignPhoto } from "@/lib/campaign";
import { getLocale } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/pick";
import { CreatorForm } from "@/components/forms/GrowthForms";
import { Container, PageHero } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = { title: "Creadores y diseñadores", description: "¿Diseñas o creas contenido? Colabora con ROJO Y GUALDA: royalties por tus diseños y comisión por tus ventas.", alternates: { canonical: "/creadores" } };

export default async function CreatorsPage() {
  const locale = await getLocale();
  const c = pick(locale, {
    es: { kicker: "Creadores", title: "Crea con nosotros", sub: "Diseñadores, ilustradores y creadores de contenido: lleva tu talento a una marca con orgullo español.", a: "Diseñadores", ab: "Envía tus diseños. Si se publican, cobras royalties por cada venta.", b: "Influencers", bb: "Código propio para tu comunidad y comisión por cada pedido.", cT: "Afiliados", cb: "Enlace de afiliado con seguimiento de clics y ventas en tiempo real.", note: "Revisamos todas las solicitudes en 5 días laborables. Las condiciones (royalty / comisión) se acuerdan por escrito antes de empezar.", formTitle: "Solicitud", name: "Nombre", kind: "Quiero colaborar como", kind_DESIGNER: "Diseñador/a", kind_INFLUENCER: "Creador/a de contenido", kind_AFFILIATE: "Afiliado/a", platform: "Plataforma", handle: "Usuario", audience: "Seguidores (aprox.)", message: "Cuéntanos sobre ti", privacy: "Acepto la política de privacidad para que gestionéis mi solicitud.", submit: "Enviar solicitud", error: "Revisa los campos obligatorios.", doneTitle: "¡Gracias!", doneBody: "Hemos recibido tu solicitud y te escribiremos pronto." },
    en: { kicker: "Creators", title: "Create with us", sub: "Designers, illustrators and content creators: bring your talent to a brand with Spanish pride.", a: "Designers", ab: "Submit your designs. If published, earn royalties on every sale.", b: "Influencers", bb: "Your own code for your community and commission on every order.", cT: "Affiliates", cb: "Affiliate link with real-time click and sales tracking.", note: "We review every application within 5 business days. Terms (royalty / commission) are agreed in writing before starting.", formTitle: "Application", name: "Name", kind: "I want to collaborate as", kind_DESIGNER: "Designer", kind_INFLUENCER: "Content creator", kind_AFFILIATE: "Affiliate", platform: "Platform", handle: "Handle", audience: "Followers (approx.)", message: "Tell us about you", privacy: "I accept the privacy policy so you can process my application.", submit: "Send application", error: "Please check the required fields.", doneTitle: "Thank you!", doneBody: "We've received your application and will be in touch soon." },
    de: { kicker: "Creator", title: "Gestalte mit uns", sub: "Designer, Illustratoren und Content Creator: Bring dein Talent zu einer Marke mit spanischem Stolz.", a: "Designer", ab: "Reiche Designs ein. Bei Veröffentlichung erhältst du Royalties pro Verkauf.", b: "Influencer", bb: "Eigener Code für deine Community und Provision pro Bestellung.", cT: "Affiliates", cb: "Affiliate-Link mit Klick- und Verkaufstracking in Echtzeit.", note: "Wir prüfen jede Bewerbung innerhalb von 5 Werktagen. Konditionen werden vorab schriftlich vereinbart.", formTitle: "Bewerbung", name: "Name", kind: "Ich möchte mitmachen als", kind_DESIGNER: "Designer/in", kind_INFLUENCER: "Content Creator", kind_AFFILIATE: "Affiliate", platform: "Plattform", handle: "Benutzername", audience: "Follower (ca.)", message: "Erzähl uns von dir", privacy: "Ich akzeptiere die Datenschutzerklärung zur Bearbeitung meiner Bewerbung.", submit: "Bewerbung senden", error: "Bitte Pflichtfelder prüfen.", doneTitle: "Danke!", doneBody: "Wir haben deine Bewerbung erhalten und melden uns bald." },
  });
  return (
    <>
      <PageHero eyebrow={c.kicker} title={c.title} sub={c.sub} />
      <section className="bg-bg py-12 sm:py-16">
        <Container>
          <div className="grid gap-3 sm:grid-cols-3">
            {([[c.a, c.ab, "arte"], [c.b, c.bb, "ciudades"], [c.cT, c.cb, "statement"]] as const).map(([t, b, key], i) => {
              const photo = campaignPhoto(key);
              return (
                <Reveal key={t} delay={i * 0.05} className="h-full">
                  <div className="h-full overflow-hidden rounded-3xl bg-surface-2 ring-1 ring-line">
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0b0b]">
                      {photo && <Image src={photo} alt="" fill sizes="(min-width:640px) 33vw, 100vw" className="object-cover" />}
                    </div>
                    <div className="p-6 sm:p-7">
                      <p className="headline text-2xl">{t}</p>
                      <p className="mt-2 text-[15px] leading-relaxed text-muted">{b}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <div className="mx-auto mt-14 max-w-3xl rounded-[2rem] border border-line p-6 sm:p-10">
            <p className="headline text-3xl">{c.formTitle}</p>
            <p className="mb-6 mt-2 text-sm text-muted">{c.note}</p>
            <CreatorForm c={c} />
          </div>
        </Container>
      </section>
    </>
  );
}
