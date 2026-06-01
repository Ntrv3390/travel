import { cookies } from "next/headers";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { env } from "@/lib/env";
import type { SearchParams } from "@/types/api";
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

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = searchParams.q ?? "";
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "USD";
  let products: SearchProduct[] = [];
  let error: string | null = null;

  if (query) {
    try {
      const url = new URL(`${env.API_URL}/api/v1/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("currencyCode", currency);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data: SearchAllResponse = await res.json();
        products = data.products ?? [];
      } else {
        error = "Search is temporarily unavailable. Please try again in a moment.";
      }
    } catch {
      error = "Search is temporarily unavailable. Please try again in a moment.";
    }
  }

  const experiences = products.map(toExperience);

  return (
    <ExperiencesProvider
      initialExperiences={experiences}
      totalCount={experiences.length}
      page={1}
      totalPages={1}
      error={error}
    >
      <div className="container py-section">
        <div className="space-y-6">
          <div>
            <h1 className="text-display-sm font-bold tracking-tight">
              {query ? `Results for "${query}"` : "Search Experiences"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {experiences.length} experiences found
            </p>
          </div>
          <SearchBar />
          <div className="space-y-2">
            <SearchFilters showSort />
          </div>
          {error ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <SearchResults query={query} />
          )}
        </div>
      </div>
    </ExperiencesProvider>
  );
}
