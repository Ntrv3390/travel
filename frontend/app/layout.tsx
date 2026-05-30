import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Traviia - Experiences Worth Having", template: "%s | Traviia" },
  description: "Book tours, activities and experiences worldwide.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={cn(GeistSans.className, "bg-background")}> 
        <CurrencyProvider>
          <CartProvider>
            <Toaster>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
                <GlobalSearchModal />
              </div>
            </Toaster>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
