"use client";

import { useSearch } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";

const categories = ["all", "tours", "activities", "admission", "sightseeing"];

export function SearchFilters() {
  const { searchParams, updateSearchParam } = useSearch();
  const active = searchParams.get("category") ?? "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {categories.map((category) => (
        <Button
          key={category}
          variant={active === category ? "default" : "outline"}
          size="sm"
          onClick={() => updateSearchParam("category", category === "all" ? null : category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
