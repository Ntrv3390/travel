"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
] as const;

export function SearchFilters({ showSort = true }: { showSort?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const currentSort = searchParams.get("sort") ?? "recommended";

  if (!showSort) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
      <div className="flex flex-wrap gap-1">
        {SORT_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => updateParam("sort", opt.value === "recommended" ? null : opt.value)}
            className={cn(
              "h-7 rounded-lg px-2.5 text-xs font-medium",
              currentSort === opt.value
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
