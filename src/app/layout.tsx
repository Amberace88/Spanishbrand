import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/providers/I18nProvider";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(site),
    title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
    description: brand.description,
    applicationName: brand.name,
    openGraph: { type: "website", siteName: brand.name, locale: "es_ES", title: brand.name, description: brand.description },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
    appleWebApp: { capable: true, title: brand.name, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
    // explicit list: metadata.icons replaces the file-based icon convention, so the favicon must be listed here
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Apply saved / system theme before first paint (storefront only). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname.indexOf('/admin')===0)return;var t=null;try{t=localStorage.getItem('theme')}catch(e){}var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
