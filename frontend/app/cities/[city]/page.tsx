import type { Metadata } from "next";
import { CityPageClient } from "./CityPageClient";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

type Props = { params: { city: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cityName = params.city.replace(/-/g, " ");

  return {
    title: `Things to Do in ${cityName} | Triipzy`,
    description: `Discover and book the best tours, activities, and experiences in ${cityName}. Instant confirmation and best prices.`,
    openGraph: {
      title: `Things to Do in ${cityName} | Triipzy`,
      description: `Discover and book the best tours, activities, and experiences in ${cityName}.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Things to Do in ${cityName} | Triipzy`,
      description: `Discover and book the best tours, activities, and experiences in ${cityName}.`,
    },
    alternates: { canonical: `/cities/${params.city}` },
  };
}

export default function CityPage({ params }: Props) {
  const cityName = params.city.replace(/-/g, " ");
  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Destinations", href: "/cities" }, { label: cityName }]} />
      <Breadcrumb
        items={[{ label: "Destinations", href: "/cities" }, { label: cityName }]}
        className="container pt-6"
      />
      <CityPageClient city={params.city} />
    </>
  );
}
