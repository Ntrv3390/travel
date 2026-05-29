import Link from "next/link";
import { cookies } from "next/headers";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { searchExperiences } from "@/lib/api";
import type { SearchParams } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";
  const result = await searchExperiences({ ...searchParams, currency });
  const page = parseInt(searchParams.page ?? "1", 10);
  const totalPages = result.data?.totalPages ?? 1;
  const currentCount = result.data?.experiences.length ?? 0;

  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (searchParams.city) params.set("city", searchParams.city);
    if (searchParams.category) params.set("category", searchParams.category);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    params.set("page", String(p));
    params.set("limit", searchParams.limit ?? "24");
    return `/search?${params.toString()}`;
  }

  return (
    <ExperiencesProvider
      initialExperiences={result.data?.experiences ?? []}
      totalCount={result.data?.count ?? 0}
      page={page}
      totalPages={totalPages}
      error={result.error}
    >
      <div className="container py-section">
        <div className="space-y-6">
          <SearchBar />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{result.data?.count ?? 0} experiences found</p>
            <SearchFilters />
          </div>
          {result.error ? (
            <Alert>
              <AlertDescription>Search is temporarily unavailable. Please try again in a moment.</AlertDescription>
            </Alert>
          ) : (
            <>
              <SearchResults />
              {totalPages > 1 && currentCount > 0 && (
                <div className="mt-8 flex items-center justify-center gap-4">
                  {page > 1 && (
                    <Button asChild variant="outline">
                      <Link href={buildPageUrl(page - 1)}>Previous</Link>
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <Button asChild variant="outline">
                      <Link href={buildPageUrl(page + 1)}>Next</Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ExperiencesProvider>
  );
}
