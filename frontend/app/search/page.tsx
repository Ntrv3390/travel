import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { searchExperiences } from "@/lib/api";
import type { SearchParams } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await searchExperiences(searchParams);

  return (
    <div className="container py-section">
      <div className="space-y-6">
        <SearchBar initialQuery={searchParams.q ?? ""} initialCity={searchParams.city ?? ""} />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{result.data?.count ?? 0} experiences found</p>
          <SearchFilters />
        </div>
        {result.error ? (
          <Alert>
            <AlertDescription>Search is temporarily unavailable. Please try again in a moment.</AlertDescription>
          </Alert>
        ) : (
          <SearchResults experiences={result.data?.experiences ?? []} />
        )}
      </div>
    </div>
  );
}
