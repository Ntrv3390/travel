"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating", label: "Highest Rated" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export function SearchFilters({ showSort = true }: { showSort?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = (searchParams.get("sort") ?? "recommended") as SortValue;

  const setSort = useCallback(
    (value: SortValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "recommended") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
      params.delete("page"); // always reset pagination on sort change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  if (!showSort) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Sort by:</span>
      <div className="flex flex-wrap gap-1">
        {SORT_OPTIONS.map((opt) => {
          const active = currentSort === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              className={cn(
                "h-7 rounded-lg px-2.5 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}