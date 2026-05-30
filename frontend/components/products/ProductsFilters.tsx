"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductsFiltersProps {
  cityCode: string;
  onCityCodeChange: (value: string) => void;
}

export function ProductsFilters({ cityCode, onCityCodeChange }: ProductsFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="cityCode" className="mb-1 block text-xs font-medium text-muted-foreground">
          Filter by City (optional)
        </label>
        <div className="flex gap-2">
          <Input
            id="cityCode"
            placeholder="e.g. NEW_YORK, DUBAI, LONDON"
            value={cityCode}
            onChange={(e) => onCityCodeChange(e.target.value.toUpperCase())}
            className="h-10 uppercase"
          />
          {cityCode && (
            <button
              onClick={() => onCityCodeChange("")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
