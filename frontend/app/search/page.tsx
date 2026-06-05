import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchContent } from "./SearchContent";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Search Experiences | Triipzy",
  description: "Search and discover tours, activities, and experiences worldwide. Find your next adventure.",
  openGraph: {
    title: "Search Experiences | Triipzy",
    description: "Search and discover tours, activities, and experiences worldwide.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Search Experiences | Triipzy",
    description: "Search and discover tours, activities, and experiences worldwide.",
  },
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Search" }]} />
      <Breadcrumb items={[{ label: "Search" }]} className="container pt-6" />
      <Suspense fallback={null}>
        <SearchContent />
      </Suspense>
    </>
  );
}
