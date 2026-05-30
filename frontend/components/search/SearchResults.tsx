"use client";

import Link from "next/link";
import { SearchX, Search } from "lucide-react";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { useExperiences } from "@/context/ExperiencesContext";

export function SearchResults({ query }: { query?: string }) {
  const { state } = useExperiences();

  if (!state.experiences.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {query ? `No results for "${query}"` : "No results found"}
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Try adjusting your search terms or browse popular destinations below.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {["Dubai", "Paris", "London", "New York", "Tokyo", "Singapore"].map((city) => (
            <Link
              key={city}
              href={`/search?q=${encodeURIComponent(city)}`}
              className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-100"
            >
              <Search className="mr-1.5 inline-block h-3.5 w-3.5" />
              {city}
            </Link>
          ))}
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Go home
        </Link>
      </div>
    );
  }

  return <ExperienceGrid />;
}
