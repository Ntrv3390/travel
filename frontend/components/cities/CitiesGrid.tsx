"use client";

import { useState } from "react";
import { CityCard } from "@/components/cities/CityCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getCities } from "@/lib/api";
import type { City, CitiesResponse } from "@/types/api";

const PAGE_SIZE = 20;

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

  const handleLoadMore = async () => {
    if (nextOffset === null || loading) return;
    setLoading(true);
    setError(null);
    const result = await getCities(nextOffset, PAGE_SIZE);
    if (result.data) {
      const data = result.data as CitiesResponse;
      setCities((prev) => [...prev, ...data.cities]);
      setNextOffset(data.nextOffset);
    } else {
      setError(result.error ?? "Failed to load cities. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cities.map((city) => (
          <CityCard key={city.code} city={city} />
        ))}
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <CityCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>

      {error && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={handleLoadMore} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      )}

      {nextOffset !== null && !error && (
        <div className="mt-8 flex justify-center">
          <Button onClick={handleLoadMore} disabled={loading} variant="outline" size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
