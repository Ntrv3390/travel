"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import { cn } from "@/lib/utils";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const {
    query,
    setQuery,
    grouped,
    loading,
    open,
    highlightedIndex,
    openDropdown,
    closeDropdown,
    handleKeyDown,
    inputRef,
    dropdownRef,
  } = useSearchAutocomplete();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      closeDropdown();
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn("relative", compact ? "w-full" : "")}
    >
      <div
        className={cn(
          compact
            ? "flex items-center gap-0"
            : "grid gap-3 md:grid-cols-[1fr_1fr_auto]",
        )}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            placeholder="Search attractions, cities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.length >= 2) openDropdown();
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              compact
                ? "h-12 rounded-xl border-slate-200 bg-white/90 pl-10 text-base shadow-sm focus-visible:ring-sky-500"
                : "pl-10",
            )}
            role="combobox"
            aria-expanded={open}
            aria-label="Search"
            autoComplete="off"
          />
          <SearchOverlay
            grouped={grouped}
            loading={loading}
            open={open}
            query={query}
            highlightedIndex={highlightedIndex}
            onClose={closeDropdown}
            onKeyDown={handleKeyDown}
            dropdownRef={dropdownRef}
            inputRef={inputRef}
            setQuery={setQuery}
          />
        </div>
        {compact ? null : (
          <>
            <div className="relative">
              <Input
                placeholder="City"
                className="pl-10"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <Button type="submit" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
