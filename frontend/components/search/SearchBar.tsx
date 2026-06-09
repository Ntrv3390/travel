"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    closeDropdown();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  if (compact) {
    return (
      <form onSubmit={onSubmit} className="relative w-full">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type="search"
            placeholder="Search attractions, cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.length >= 2) openDropdown(); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-label="Search"
            className={cn(
              "h-10 w-full rounded-xl border border-slate-200 bg-white/90 pl-9 pr-4",
              "text-[13px] text-slate-800 placeholder:text-slate-400",
              "outline-none ring-0 transition-all duration-200",
              "focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
            )}
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
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type="search"
            placeholder="Search attractions, cities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.length >= 2) openDropdown(); }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-label="Search"
            className={cn(
              "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4",
              "text-sm text-slate-800 placeholder:text-slate-400",
              "outline-none transition-all duration-200",
              "focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]",
            )}
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
        <button
          type="submit"
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5",
            "text-sm font-semibold text-white transition-all duration-200",
            "hover:bg-blue-700 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          )}
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}