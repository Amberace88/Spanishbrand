export function formatMoney(amount: number, currency = "EUR", locale = "es-ES") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatDate(d: string | Date | null | undefined, locale = "es-ES") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export function formatDateTime(d: string | Date | null | undefined, locale = "es-ES") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
