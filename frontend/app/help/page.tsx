import type { Metadata } from "next";
import { HelpPage } from "@/components/help/HelpPage";
import { BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Help Center | Triipzy",
  description: "Get support for bookings, payments, account issues, and travel questions. Triipzy's help center is available 24/7 to assist you.",
  openGraph: {
    title: "Help Center | Triipzy",
    description: "Get support for bookings, payments, account issues, and travel questions.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Help Center | Triipzy",
    description: "Get support for bookings, payments, account issues, and travel questions.",
  },
  alternates: { canonical: "/help" },
};

export default function HelpRoute() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Help Center" }]} />
      <HelpPage />
    </>
  );
}
