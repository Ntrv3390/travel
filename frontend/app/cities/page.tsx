import type { Metadata } from "next";
import { CitiesGrid } from "@/components/cities/CitiesGrid";
import { getCities } from "@/lib/api";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";
import type { CitiesResponse } from "@/types/api";

export const metadata: Metadata = {
  title: "Top Travel Destinations & Cities | Triipzy",
  description: "Explore tours and activities across 200+ destinations worldwide. Find the best experiences in top cities.",
  openGraph: {
    title: "Top Travel Destinations | Triipzy",
    description: "Explore tours and activities across 200+ destinations worldwide.",
    images: [{ url: "/api/og?title=Top+Destinations&subtitle=200%2B+cities+worldwide&page=cities", width: 1200, height: 630, alt: "Triipzy Destinations" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Travel Destinations | Triipzy",
    description: "Explore tours and activities across 200+ destinations worldwide.",
    images: ["/api/og?title=Top+Destinations&subtitle=200%2B+cities+worldwide&page=cities"],
  },
  alternates: { canonical: "/cities" },
};

const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";

export default async function CitiesPage() {
  const result = await getCities(0, PAGE_SIZE);
  const data = result.data as CitiesResponse | null;
  const cities = data?.cities ?? [];
  const total = data?.total ?? 0;
  const nextOffset = data?.nextOffset ?? null;

  return (
    <section className="container py-section">
      <BreadcrumbJsonLd items={[{ label: "Cities" }]} />
      <Breadcrumb items={[{ label: "Cities" }]} className="mb-6" />
      <div className="mb-8">
        <h1 className="text-display-sm font-bold">Cities</h1>
        <p className="mt-2 text-muted-foreground">
          Explore tours and activities across {total} destinations worldwide.
        </p>
      </div>

      {cities.length === 0 ? (
        <p className="text-center text-muted-foreground">No cities available.</p>
      ) : (
        <CitiesGrid
          initialCities={cities}
          initialNextOffset={nextOffset}
        />
      )}
    </section>
  );
}
