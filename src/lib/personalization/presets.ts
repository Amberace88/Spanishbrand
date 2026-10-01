import type { PersoConfig, TemplateKey } from "./types";

/** Default template configs (used for previews and as the starting point when staff configure a product). */
export const PRESETS: Record<TemplateKey, Extract<PersoConfig, { mode: "fields" }>> = {
  jersey: {
    mode: "fields",
    template: "jersey",
    placement: "back",
    extraPrice: 6,
    ink: "#e0b84a",
    font: "sport",
    fields: [
      { key: "name", label: "Nombre", maxLength: 12, uppercase: true, required: true, placeholder: "GARCÍA" },
      { key: "number", label: "Dorsal", maxLength: 2, pattern: "^[0-9]{1,2}$", placeholder: "10" },
    ],
  },
  pueblo: {
    mode: "fields",
    template: "pueblo",
    placement: "front",
    extraPrice: 5,
    ink: "#e0b84a",
    font: "serif",
    fields: [{ key: "pueblo", label: "Tu pueblo o ciudad", maxLength: 18, uppercase: true, required: true, placeholder: "VILLAJOYOSA" }],
  },
  year: {
    mode: "fields",
    template: "year",
    placement: "front",
    extraPrice: 5,
    ink: "#e0b84a",
    font: "serif",
    fields: [
      { key: "year", label: "Año", maxLength: 4, pattern: "^(19|20)[0-9]{2}$", required: true, placeholder: "1985" },
      { key: "name", label: "Nombre o apellido", maxLength: 14, uppercase: true, placeholder: "FAMILIA LÓPEZ" },
    ],
  },
  text: {
    mode: "fields",
    template: "text",
    placement: "front",
    extraPrice: 4,
    ink: "#c8102e",
    font: "display",
    fields: [{ key: "text", label: "Tu frase", maxLength: 24, required: true, placeholder: "ORGULLO ESPAÑOL" }],
  },
};

export const TEMPLATE_INFO: Record<TemplateKey, { title: string; desc: string }> = {
  jersey: { title: "Nombre + dorsal", desc: "Tu camiseta de afición con nombre y número a la espalda." },
  pueblo: { title: "Mi pueblo", desc: "El nombre de tu pueblo o ciudad, con los colores de la bandera." },
  year: { title: "Desde 19XX", desc: "Tu año, el de tu familia o el de tu peña." },
  text: { title: "Tu frase", desc: "Una frase corta con nuestras tipografías." },
};
