"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchBar } from "@/components/search/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { getCityExperiences } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Experience } from "@/types/experience";
import type { SearchParams } from "@/types/api";

const PAGE_LIMIT = 40;

export default function CityPage({ params: { city } }: { params: { city: string } }) {
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cityRef = useRef(city);

  const sort = searchParams.get("sort") ?? undefined;

  const fetchExperiences = useCallback(async (pageNum: number, append: boolean, currentSort?: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    const result = await getCityExperiences(city, {
      page: String(pageNum),
      limit: String(PAGE_LIMIT),
      currency,
      sort: currentSort as SearchParams["sort"],
    });
    if (result.data) {
      const exps = result.data.experiences ?? [];
      if (append) setExperiences((prev) => [...prev, ...exps]);
      else setExperiences(exps);
      setTotalCount(result.data.count ?? exps.length);
      setHasMore(exps.length >= PAGE_LIMIT);
      setError(null);
    } else {
      setError(result.error ?? "Failed to load experiences.");
    }
    if (append) setLoadingMore(false);
    else setLoading(false);
  }, [city, currency]);

  useEffect(() => {
    if (cityRef.current !== city || sort !== undefined) {
      cityRef.current = city;
      setPage(1);
      setExperiences([]);
      setHasMore(true);
    }
    fetchExperiences(1, false, sort);
  }, [city, sort, fetchExperiences]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchExperiences(nextPage, true, sort);
  }, [page, fetchExperiences, sort]);

  return (
    <ExperiencesProvider
      initialExperiences={experiences}
      totalCount={totalCount}
      page={page}
      error={error}
    >
      <div className="container py-section">
        <div className="mb-6 space-y-3">
          <h1 className="text-display-sm font-bold">Things to do in {city.replace(/-/g, " ")}</h1>
          <p className="text-sm text-muted-foreground">{totalCount} experiences found</p>
        </div>

        <div className="mb-6 space-y-4">
          <SearchBar />
          <SearchFilters showSort />
        </div>

        {error && !loading ? (
          <Alert className="mb-6">
            <AlertDescription>We could not load experiences right now. Please try again in a moment.</AlertDescription>
          </Alert>
        ) : experiences.length ? (
          <ExperienceGrid loadMore={loadMore} hasMore={hasMore} loadingMore={loadingMore} />
        ) : !loading ? (
          <EmptyState title="No experiences yet" description="Try changing filters or search another destination." action={{ label: "Back home", href: "/" }} />
        ) : null}
      </div>
    </ExperiencesProvider>
  );
}