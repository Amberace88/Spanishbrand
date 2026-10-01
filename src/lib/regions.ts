/** Spain's autonomous communities (+ autonomous cities) and their provinces — for regional landing pages. */
export interface Region {
  slug: string;
  name: string;
  type: "comunidad" | "provincia" | "ciudad";
  parent?: string; // comunidad slug for provinces
  capital?: string;
}

const C = (slug: string, name: string, capital: string, provinces: [string, string][]): Region[] => [
  { slug, name, type: provinces.length ? "comunidad" : "ciudad", capital },
  ...provinces.map(([s, n]) => ({ slug: s, name: n, type: "provincia" as const, parent: slug })),
];

export const REGIONS: Region[] = [
  ...C("andalucia", "Andalucía", "Sevilla", [["almeria", "Almería"], ["cadiz", "Cádiz"], ["cordoba", "Córdoba"], ["granada", "Granada"], ["huelva", "Huelva"], ["jaen", "Jaén"], ["malaga", "Málaga"], ["sevilla", "Sevilla"]]),
  ...C("aragon", "Aragón", "Zaragoza", [["huesca", "Huesca"], ["teruel", "Teruel"], ["zaragoza", "Zaragoza"]]),
  ...C("asturias", "Asturias", "Oviedo", [["oviedo-asturias", "Asturias"]]),
  ...C("baleares", "Illes Balears", "Palma", [["mallorca-baleares", "Baleares"]]),
  ...C("canarias", "Canarias", "Las Palmas / Santa Cruz", [["las-palmas", "Las Palmas"], ["santa-cruz-de-tenerife", "Santa Cruz de Tenerife"]]),
  ...C("cantabria", "Cantabria", "Santander", [["santander-cantabria", "Cantabria"]]),
  ...C("castilla-la-mancha", "Castilla-La Mancha", "Toledo", [["albacete", "Albacete"], ["ciudad-real", "Ciudad Real"], ["cuenca", "Cuenca"], ["guadalajara", "Guadalajara"], ["toledo", "Toledo"]]),
  ...C("castilla-y-leon", "Castilla y León", "Valladolid", [["avila", "Ávila"], ["burgos", "Burgos"], ["leon", "León"], ["palencia", "Palencia"], ["salamanca", "Salamanca"], ["segovia", "Segovia"], ["soria", "Soria"], ["valladolid", "Valladolid"], ["zamora", "Zamora"]]),
  ...C("cataluna", "Cataluña", "Barcelona", [["barcelona", "Barcelona"], ["girona", "Girona"], ["lleida", "Lleida"], ["tarragona", "Tarragona"]]),
  ...C("comunitat-valenciana", "Comunitat Valenciana", "València", [["alicante", "Alicante"], ["castellon", "Castellón"], ["valencia", "Valencia"]]),
  ...C("extremadura", "Extremadura", "Mérida", [["badajoz", "Badajoz"], ["caceres", "Cáceres"]]),
  ...C("galicia", "Galicia", "Santiago de Compostela", [["a-coruna", "A Coruña"], ["lugo", "Lugo"], ["ourense", "Ourense"], ["pontevedra", "Pontevedra"]]),
  ...C("madrid", "Comunidad de Madrid", "Madrid", [["madrid-provincia", "Madrid"]]),
  ...C("murcia", "Región de Murcia", "Murcia", [["murcia-provincia", "Murcia"]]),
  ...C("navarra", "Navarra", "Pamplona", [["pamplona-navarra", "Navarra"]]),
  ...C("pais-vasco", "País Vasco", "Vitoria-Gasteiz", [["alava", "Álava"], ["gipuzkoa", "Gipuzkoa"], ["bizkaia", "Bizkaia"]]),
  ...C("la-rioja", "La Rioja", "Logroño", [["logrono-la-rioja", "La Rioja"]]),
  ...C("ceuta", "Ceuta", "Ceuta", []),
  ...C("melilla", "Melilla", "Melilla", []),
];

export const COMUNIDADES = REGIONS.filter((r) => r.type !== "provincia");
export const regionBySlug = (slug: string) => REGIONS.find((r) => r.slug === slug) ?? null;
export const provincesOf = (slug: string) => REGIONS.filter((r) => r.parent === slug);
/** Single-province communities: the province page would duplicate the community page. */
export const isRedundantProvince = (r: Region) => r.type === "provincia" && provincesOf(r.parent!).length === 1;
