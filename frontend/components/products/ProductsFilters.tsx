"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductsFiltersProps {
  cityCode: string;
  onCityCodeChange: (value: string) => void;
  onSearch: () => void;
}

export function ProductsFilters({ cityCode, onCityCodeChange, onSearch }: ProductsFiltersProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="cityCode" className="mb-1 block text-xs font-medium text-muted-foreground">
          City Code (required)
        </label>
        <Input
          id="cityCode"
          placeholder="e.g. NEW_YORK, DUBAI, LONDON"
          value={cityCode}
          onChange={(e) => onCityCodeChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          className="h-10 uppercase"
        />
      </div>
      <Button onClick={onSearch} disabled={!cityCode.trim()} className="h-10">
        <Search className="mr-2 h-4 w-4" />
        Search Products
      </Button>
    </div>
  );
}
