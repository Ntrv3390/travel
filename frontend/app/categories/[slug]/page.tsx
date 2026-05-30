import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { env } from "@/lib/env";
import type { Metadata } from "next";
import type { Experience } from "@/types/experience";
import type { SearchProduct, SearchAllResponse } from "@/types/search";

function toExperience(p: SearchProduct): Experience {
  return {
    id: p.id,
    headoutId: p.id,
    title: p.name,
    description: "",
    city: p.city,
    citySlug: p.cityCode.toLowerCase(),
    slug: p.slug,
    country: "",
    latitude: 0,
    longitude: 0,
    rating: p.rating,
    reviewCount: p.reviewCount,
    images: [{ url: p.imageUrl, caption: p.name }],
    operatorName: "",
    categories: [p.category],
    languages: [],
    durationMinSeconds: 0,
    durationMaxSeconds: 0,
    cancellationPolicy: null,
    options: [{
      id: "default",
      headoutVariantId: "",
      title: "Default",
      description: "",
      price: p.price,
      currency: p.currency,
      inclusions: [],
      exclusions: [],
      highlights: [],
      fulfillmentMobile: false,
      fulfillmentPrint: false,
      fulfillmentPickup: false,
    }],
    gttdEnabled: false,
  };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const name = params.slug.replace(/-/g, " ");
  return {
    title: `${name} Experiences`,
    description: `Browse ${name} experiences and attractions.`,
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const categoryName = params.slug.replace(/-/g, " ");

  let products: SearchProduct[] = [];
  let error: string | null = null;

  try {
    const url = new URL(`${env.API_URL}/api/v1/search`);
    url.searchParams.set("q", categoryName);
    const res = await fetch(url.toString());
    if (res.ok) {
      const data: SearchAllResponse = await res.json();
      products = data.products ?? [];
    } else {
      error = "Search is temporarily unavailable.";
    }
  } catch {
    error = "Search is temporarily unavailable.";
  }

  const experiences = products
    .filter((p) => p.category.toLowerCase() === categoryName.toLowerCase())
    .map(toExperience);

  return (
    <ExperiencesProvider
      initialExperiences={experiences}
      totalCount={experiences.length}
      page={1}
      error={error}
    >
      <div className="container py-section">
        <div className="space-y-6">
          <div>
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back to search
            </Link>
            <h1 className="mt-2 text-display-sm font-bold tracking-tight">{categoryName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {experiences.length} experiences found
            </p>
          </div>
          <SearchBar />
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : experiences.length ? (
            <ExperienceGrid />
          ) : (
            <EmptyState
              title={`No ${categoryName} experiences found`}
              description="Try a different category or browse all experiences."
              action={{ label: "Browse all", href: "/search" }}
            />
          )}
        </div>
      </div>
    </ExperiencesProvider>
  );
}
