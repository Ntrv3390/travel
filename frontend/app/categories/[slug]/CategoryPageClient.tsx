"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { searchAll } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import { toExperience } from "@/lib/experience-utils";
import type { Experience } from "@/types/experience";

const LIMIT = 40;

export function CategoryPageClient({ slug }: { slug: string }) {
  const categoryName = slug.replace(/-/g, " ");
  const { currency } = useCurrency();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugRef = useRef(slug);
  const isFetching = useRef(false);

  const fetchResults = useCallback(async (s: string, offset: number, append: boolean) => {
    if (!s) {
      setExperiences([]);
      setTotal(0);
      setNextOffset(null);
      setLoading(false);
      return;
    }
    const catName = s.replace(/-/g, " ");
    if (append) setLoadingMore(true);
    else setLoading(true);
    isFetching.current = true;
    const data = await searchAll(catName, { currencyCode: currency, offset, limit: LIMIT });
    if (data) {
      const filtered = data.products.filter((p) => p.category.toLowerCase() === catName.toLowerCase());
      const exps = filtered.map(toExperience);
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
    if (slugRef.current !== slug) {
      slugRef.current = slug;
      setNextOffset(0);
      setExperiences([]);
    }
    fetchResults(slug, 0, false);
  }, [slug, fetchResults]);

  const loadMore = useCallback(() => {
    if (nextOffset === null || isFetching.current) return;
    fetchResults(slug, nextOffset, true);
  }, [slug, nextOffset, fetchResults]);

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
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back to search
            </Link>
            <h1 className="mt-2 text-display-sm font-bold tracking-tight">{categoryName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} experiences found
            </p>
          </div>
          <SearchBar />
          {error && !loading ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : experiences.length ? (
            <ExperienceGrid loadMore={loadMore} hasMore={nextOffset !== null} loadingMore={loadingMore} />
          ) : !loading ? (
            <EmptyState
              title={`No ${categoryName} experiences found`}
              description="Try a different category or browse all experiences."
              action={{ label: "Browse all", href: "/search" }}
            />
          ) : null}
        </div>
      </div>
    </ExperiencesProvider>
  );
}
