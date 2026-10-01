import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ROJO Y GUALDA",
    short_name: "ROJO Y GUALDA",
    description: "Ropa, regalos y diseños personalizados con identidad española. Fabricado bajo pedido.",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tienda", short_name: "Tienda", url: "/shop?source=app", icons: [{ src: "/icons/shortcut.png", sizes: "96x96" }] },
      { name: "Diseña tú mismo", short_name: "Diseña", url: "/disena?source=app", icons: [{ src: "/icons/shortcut.png", sizes: "96x96" }] },
      { name: "Mi cuenta", short_name: "Cuenta", url: "/account?source=app", icons: [{ src: "/icons/shortcut.png", sizes: "96x96" }] },
    ],
  };
}
