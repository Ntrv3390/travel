"use client";

import { useEffect, useRef, useState } from "react";
import { CityCard } from "@/components/cities/CityCard";
import { getCities } from "@/lib/api";
import type { City, CitiesResponse } from "@/types/api";

const PAGE_SIZE = 60;
const ITEMS_BEFORE_END = 8;

function CityCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card">
      <div className="aspect-[4/3] rounded-t-lg bg-muted" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function CitiesGrid({ initialCities, initialNextOffset }: {
  initialCities: City[];
  initialNextOffset: number | null;
}) {
  const [cities, setCities] = useState<City[]>(initialCities);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initialNextOffset === null);
  const isFetching = useRef(false);
  const nextOffsetRef = useRef<number | null>(initialNextOffset);

  const loadMore = async () => {
    const offset = nextOffsetRef.current;
    if (offset === null || isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setError(null);
    const result = await getCities(offset, PAGE_SIZE);
    if (result.data) {
      const data = result.data as CitiesResponse;
      setCities((prev) => [...prev, ...data.cities]);
      setNextOffset(data.nextOffset);
      nextOffsetRef.current = data.nextOffset;
      if (data.nextOffset === null) setDone(true);
    } else {
      setError(result.error ?? "Failed to load cities.");
    }
    setLoading(false);
    isFetching.current = false;
  };

  useEffect(() => {
    if (loading || nextOffset === null || done || error || cities.length === 0) return;
    // Trigger advances with each page so it never lands on an already-scrolled-past element.
    const triggerIndex = Math.max(0, cities.length - ITEMS_BEFORE_END);
    const triggerEl = document.getElementById(`city-card-${triggerIndex}`);
    if (!triggerEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextOffsetRef.current !== null && !isFetching.current) {
          loadMore();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [loading, nextOffset, done, error, cities.length]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cities.map((city, i) => (
          <div key={city.code} id={`city-card-${i}`}>
            <CityCard city={city} />
          </div>
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <CityCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {error && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={loadMore}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Retry
          </button>
        </div>
      )}

      {done && cities.length > 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          All {cities.length} destinations loaded
        </p>
      )}
    </div>
  );
}
