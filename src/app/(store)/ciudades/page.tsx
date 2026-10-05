import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getPublishedProducts } from "@/lib/products/queries";
import { cityCards } from "@/lib/catalog/city-products";
import { Container, PageHero } from "@/components/ui/Section";
import { CityFinder } from "@/components/catalog/CityFinder";

export const revalidate = 600;
export const metadata: Metadata = {
  title: "Ciudades de España: camisetas, tazas, postales y regalos",
  description: "Busca tu ciudad y encuentra todos sus productos: camisetas, sudaderas, tazas, bolsas, pósters, postales y más de Madrid, Barcelona, València, Sevilla, Málaga, Bilbao y otras 24 ciudades.",
  alternates: { canonical: "/ciudades" },
};

export default async function CitiesPage() {
  const [locale, all] = await Promise.all([getLocale(), getPublishedProducts({ limit: 5000 })]);
  const en = locale === "en";
  const cards = cityCards(all).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
  return (
    <>
      <PageHero eyebrow={en ? "Cities" : "Ciudades"} title={en ? "Your city" : "Tu ciudad"} sub={en ? "Choose a city and see everything we make for it, tees, hoodies, mugs, totes, posters, postcards and more." : "Elige tu ciudad y descubre todo lo que tenemos de ella: camisetas, sudaderas, tazas, bolsas, pósters, postales y más."} />
      <section className="bg-bg pb-24 pt-6">
        <Container>
          <CityFinder cities={cards} />
        </Container>
      </section>
    </>
  );
}
