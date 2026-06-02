import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { VisitorTracker } from "@/components/layout/VisitorTracker";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Triipzy - Experiences Worth Having", template: "%s | Triipzy" },
  description: "Book tours, activities and experiences worldwide.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCurrency = cookieStore.get("traviia_currency")?.value ?? "USD";

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={cn(GeistSans.className, "bg-background")}>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <CartProvider>
            <Toaster>
              <AuthProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <GlobalSearchModal />
                  <VisitorTracker />
                </div>
              </AuthProvider>
            </Toaster>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
