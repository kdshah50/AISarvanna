import type { Metadata } from "next";
// Inter loaded via CSS
import "./globals.css";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { CartProvider } from "@/components/cart/CartContext";
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
        <CartProvider>
          <Header />
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
