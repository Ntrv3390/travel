"use client";

import Link from "next/link";
import { SearchX, MapPin } from "lucide-react";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { useExperiences } from "@/context/ExperiencesContext";

const POPULAR_CITIES = [
  "Dubai", "Paris", "London", "New York", "Tokyo", "Singapore",
] as const;

export function SearchResults({ query }: { query?: string }) {
  const { state } = useExperiences();

  if (!state.experiences.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <SearchX className="h-7 w-7 text-slate-400" />
        </div>

        {/* Copy */}
        <div className="space-y-1.5">
          <h3 className="text-[17px] font-semibold text-slate-800">
            {query ? `No results for "${query}"` : "Nothing found"}
          </h3>
          <p className="max-w-sm text-sm text-slate-500 leading-relaxed">
            Try different keywords, or explore one of these popular destinations.
          </p>
        </div>

        {/* Popular cities */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              href={`/search?q=${encodeURIComponent(city)}`}
              className={[
                "inline-flex items-center gap-1.5 rounded-full",
                "border border-slate-200 bg-white px-3.5 py-1.5",
                "text-[13px] font-medium text-slate-600",
                "transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
              ].join(" ")}
            >
              <MapPin className="h-3 w-3" />
              {city}
            </Link>
          ))}
        </div>

        {/* Back home */}
        <Link
          href="/"
          className="mt-1 text-[13px] font-medium text-slate-400 underline underline-offset-4 hover:text-slate-700 transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return <ExperienceGrid />;
}