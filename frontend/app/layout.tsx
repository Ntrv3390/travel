import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Travel - Experiences Worth Having", template: "%s | Travel" },
  description: "Book tours, activities and experiences worldwide.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={cn(GeistSans.className, "bg-background")}> 
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
