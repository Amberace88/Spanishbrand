import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import "@/lib/personalization/print-fonts.css";
import { getBrand } from "@/lib/brand";
import { getLocale } from "@/lib/i18n/server";
import { messagesFor } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { MotionProvider } from "@/components/providers/MotionProvider";

/* Body + logo faces through next/font: preloaded with the page and paired with a metric-matched fallback, so the
 * swap from the system font no longer reflows the hero (the @fontsource faces in globals.css stay as the latin-ext
 * fallback under the same CSS tokens). next/font options must be literals, hence the repeated latin range. */
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", weight: "100 900", display: "swap", variable: "--font-inter", declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }] });
const cinzel = localFont({ src: "./fonts/cinzel-latin-wght-normal.woff2", weight: "400 900", display: "swap", variable: "--font-cinzel", adjustFontFallback: "Times New Roman", declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }] });

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
    <html lang={locale} className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved / system theme before first paint (storefront only). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname.indexOf('/admin')===0)return;var t=null;try{t=localStorage.getItem('theme')}catch(e){}var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} messages={messagesFor(locale)}>
          <MotionProvider>{children}</MotionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
