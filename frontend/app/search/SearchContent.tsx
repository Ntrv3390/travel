"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { searchAll } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import { useSearchParams } from "next/navigation";
import { toExperience } from "@/lib/experience-utils";
import type { Experience } from "@/types/experience";

const LIMIT = 40;

export function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { currency } = useCurrency();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef(query);
  const isFetching = useRef(false);

  const fetchResults = useCallback(async (q: string, offset: number, append: boolean) => {
    if (!q) {
      setExperiences([]);
      setTotal(0);
      setNextOffset(null);
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else setLoading(true);
    isFetching.current = true;
    const data = await searchAll(q, { currencyCode: currency, offset, limit: LIMIT });
    if (data) {
      const exps = data.products.map(toExperience);
      if (append) setExperiences((prev) => [...prev, ...exps]);
      else setExperiences(exps);
      setTotal(data.total ?? exps.length);
      setNextOffset(data.nextOffset ?? null);
      setError(null);
    } else {
      if (!append) setError("Search is temporarily unavailable.");
    }
    if (append) setLoadingMore(false);
    else setLoading(false);
    isFetching.current = false;
  }, [currency]);

  useEffect(() => {
    if (queryRef.current !== query) {
      queryRef.current = query;
      setNextOffset(0);
      setExperiences([]);
    }
    fetchResults(query, 0, false);
  }, [query, fetchResults]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || isFetching.current) return;
    fetchResults(query, nextOffset, true);
  }, [query, nextOffset, fetchResults]);

  return (
    <ExperiencesProvider
      initialExperiences={experiences}
      totalCount={total}
      page={1}
      error={error}
    >
      <div className="container py-section">
        <div className="space-y-6">
          <div>
            <h1 className="text-display-sm font-bold tracking-tight">
              {query ? `Results for "${query}"` : "Search Experiences"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} experiences found
            </p>
          </div>
          <SearchBar />
          <div className="space-y-2">
            <SearchFilters showSort />
          </div>
          {error && !loading ? (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !loading && total === 0 && query ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Search className="h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">No results found</p>
              <p className="max-w-md text-sm text-slate-400">
                We couldn&apos;t find any experiences matching &ldquo;{query}&rdquo;. Try a different spelling or browse categories.
              </p>
            </div>
          ) : (
            <ExperienceGrid loadMore={loadMore} hasMore={nextOffset !== null} loadingMore={loadingMore} />
          )}
        </div>
      </div>
    </ExperiencesProvider>
  );
}
