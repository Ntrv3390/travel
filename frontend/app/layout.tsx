import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import "@/styles/globals.css";

const GlobalSearchModal = dynamic(
  () => import("@/components/search/GlobalSearchModal").then((m) => ({ default: m.GlobalSearchModal })),
  { ssr: false }
);
const VisitorTracker = dynamic(
  () => import("@/components/layout/VisitorTracker").then((m) => ({ default: m.VisitorTracker })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: { default: "Triipzy - Experiences Worth Having", template: "%s | Triipzy" },
  description: "Discover and book unique tours, activities, and experiences worldwide. Best prices, instant confirmation, and 24/7 support.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Triipzy",
    title: "Triipzy - Experiences Worth Having",
    description: "Discover and book unique tours, activities, and experiences worldwide.",
    images: [{ url: "/api/og?title=Triipzy&subtitle=Experiences+Worth+Having&page=home", width: 1200, height: 630, alt: "Triipzy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Triipzy - Experiences Worth Having",
    description: "Discover and book unique tours, activities, and experiences worldwide.",
    images: ["/api/og?title=Triipzy&subtitle=Experiences+Worth+Having&page=home"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: env.NEXT_PUBLIC_SITE_URL,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCurrency = cookieStore.get("traviia_currency")?.value ?? "INR";

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://cdn-imgix.headout.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn-imgix.headout.com" />
      </head>
      <body className={cn(GeistSans.className, "bg-background")}>
        <CurrencyProvider initialCurrency={initialCurrency}>
          <CartProvider>
            <Toaster>
              <AuthProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />

                  <main className="flex-1 pt-16 sm:pt-[68px]">
                    {children}
                  </main>

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
