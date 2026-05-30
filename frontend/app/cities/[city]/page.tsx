import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchBar } from "@/components/search/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { getCityExperiences } from "@/lib/api";
import type { SearchParams } from "@/types/api";

export const dynamic = "force-dynamic";

const STATIC_ASSETS = new Set(["favicon.ico", "favicon.svg", "enc.js", "robots.txt", "sitemap.xml", "apple-touch-icon.png"]);

function isValidCity(city: string): boolean {
  return !STATIC_ASSETS.has(city.toLowerCase()) && !city.includes(".");
}

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = params.city.replace(/-/g, " ");
  return {
    title: `Things to do in ${city}`,
    description: `Browse activities and tours in ${city}.`,
    alternates: {
      canonical: `/cities/${params.city}`,
    },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: { city: string };
  searchParams: SearchParams;
}) {
  if (!isValidCity(params.city)) notFound();
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";

  const result = await getCityExperiences(params.city, { ...searchParams, currency });

  return (
    <ExperiencesProvider
      initialExperiences={result.data?.experiences ?? []}
      totalCount={result.data?.count ?? 0}
      page={parseInt(searchParams.page ?? "1", 10)}
      error={result.error}
    >
      <div className="container py-section">
        <div className="mb-6 space-y-3">
          <h1 className="text-display-sm font-bold">Things to do in {params.city.replace(/-/g, " ")}</h1>
          <p className="text-sm text-muted-foreground">{result.data?.count ?? result.data?.experiences.length ?? 0} experiences found</p>
        </div>

        <div className="mb-6 space-y-4">
          <SearchBar />
          <SearchFilters showSort />
        </div>

        {result.error ? (
          <Alert className="mb-6">
            <AlertDescription>We could not load experiences right now. Please try again in a moment.</AlertDescription>
          </Alert>
        ) : result.data?.experiences.length ? (
          <ExperienceGrid />
        ) : (
          <EmptyState title="No experiences yet" description="Try changing filters or search another destination." action={{ label: "Back home", href: "/" }} />
        )}
      </div>
    </ExperiencesProvider>
  );
}