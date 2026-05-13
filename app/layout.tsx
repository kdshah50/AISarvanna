import type { Metadata } from "next";
// Inter loaded via CSS
import "./globals.css";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { CartProvider } from "@/components/cart/CartContext";
import { CommunityLaneProvider } from "@/components/CommunityLaneContext";
import DevBrowserHeartbeat from "@/components/dev/DevBrowserHeartbeat";
import PreferredLangSync from "@/components/PreferredLangSync";
import GoogleTranslateCookieSync from "@/components/GoogleTranslateCookieSync";
import Script from "next/script";
import { getPublicAppUrl } from "@/lib/app-url";

const siteUrl = getPublicAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AISaravanna — AI-powered local services",
  description: "Find, book, and pay for verified local services in the United States. English by default; Spanish available.",
  openGraph: {
    title: "AISaravanna — AI-powered local services",
    description: "Find, book, and pay for verified local services. English & Spanish.",
    url: siteUrl,
    siteName: "AISaravanna",
    locale: "en_US",
    alternateLocale: ["es_US"],
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen flex flex-col">
        {/* Google Website Translator — callback must exist before element.js executes */}
        <div id="google_translate_element" className="fixed bottom-0 right-0 h-px w-px overflow-hidden opacity-0 pointer-events-none" aria-hidden />
        <Script
          id="ais-google-translate-callback"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
function __aisGtInit() {
  try {
    if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,es,hi,gu",
        autoDisplay: false,
      },
      "google_translate_element"
    );
  } catch (e) {}
}`,
          }}
        />
        <Script
          src="https://translate.google.com/translate_a/element.js?cb=__aisGtInit"
          strategy="afterInteractive"
        />
        <CartProvider>
          <CommunityLaneProvider>
            {process.env.NODE_ENV === "development" ? <DevBrowserHeartbeat /> : null}
            <PreferredLangSync />
            <GoogleTranslateCookieSync />
            <Header />
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
            <SiteFooter />
          </CommunityLaneProvider>
        </CartProvider>
      </body>
    </html>
  );
}
