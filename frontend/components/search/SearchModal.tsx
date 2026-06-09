"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, MapPin, TrendingUp, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchProduct, SearchCity, SearchCategory, SearchSuggestion } from "@/types/search";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  grouped: {
    attractions: SearchProduct[];
    cities: SearchCity[];
    categories: SearchCategory[];
    popular: SearchSuggestion[];
  };
  loading: boolean;
  highlightedIndex: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SearchModal({
  open,
  onClose,
  query,
  setQuery,
  grouped,
  loading,
  highlightedIndex,
  onKeyDown,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "mobile-search-results";
  const { attractions, cities, categories, popular } = grouped;
  const hasResults = attractions.length > 0 || cities.length > 0 || categories.length > 0;
  const isEmpty = query.length >= 2 && !loading && !hasResults;

  let currentIndex = 0;
  const getHighlighted = (len: number) => {
    const start = currentIndex;
    currentIndex += len;
    return (itemIndex: number) => highlightedIndex === start + itemIndex;
  };

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        document.body.style.overflow = "hidden";
      }
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white md:hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"
          aria-label="Close search"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search attractions, cities, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            role="combobox"
            aria-controls={listboxId}
            aria-expanded={true}
            aria-autocomplete="list"
            aria-label="Search"
          />
        </div>
        <button
          onClick={onClose}
          className="text-sm font-medium text-slate-500"
        >
          Cancel
        </button>
      </div>

      {/* Results */}
      <div id={listboxId} className="flex-1 overflow-y-auto" role="listbox" aria-label="Search results">
        {loading && (
          <div className="flex items-center gap-3 px-5 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {/* Attractions */}
        {attractions.length > 0 && (
          <div className="px-3 pb-2 pt-3">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attractions
            </p>
            <div className="space-y-0.5">
              {attractions.map((item, i) => {
                const highlighted = getHighlighted(attractions.length)(i);
                return (
                  <MobileProductItem key={item.id} item={item} highlighted={highlighted} onSelect={onClose} />
                );
              })}
            </div>
          </div>
        )}

        {/* Cities */}
        {cities.length > 0 && (
          <div className="px-3 pb-2 pt-1">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cities
            </p>
            <div className="space-y-0.5">
              {cities.map((item, i) => {
                const highlighted = getHighlighted(cities.length)(i);
                return (
                  <MobileCityItem key={item.code} item={item} highlighted={highlighted} onSelect={onClose} />
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="px-3 pb-2 pt-1">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Categories
            </p>
            <div className="space-y-0.5">
              {categories.map((item, i) => {
                const highlighted = getHighlighted(categories.length)(i);
                return (
                  <MobileCategoryItem key={item.id} item={item} highlighted={highlighted} onSelect={onClose} />
                );
              })}
            </div>
          </div>
        )}

        {/* Popular Searches */}
        {popular.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2">
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Popular
            </p>
            <div className="space-y-0.5">
              {popular.map((item, i) => {
                const highlighted = getHighlighted(popular.length)(i);
                return (
                  <MobileSuggestionItem key={item.text + item.type} item={item} highlighted={highlighted} onSelect={onClose} />
                );
              })}
            </div>
          </div>
        )}

        {/* Empty */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Search className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No results found</p>
            <p className="text-xs text-slate-400">
              Try searching for a city, attraction, or category
            </p>
          </div>
        )}

        {/* Initial */}
        {query.length < 2 && (
          <div className="space-y-4 px-5 py-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <TrendingUp className="h-3 w-3" />
                Popular Destinations
              </p>
              <div className="flex flex-wrap gap-2">
                {["Dubai", "Paris", "London", "New York", "Tokyo", "Singapore", "Barcelona", "Rome"].map((city) => (
                  <Link
                    key={city}
                    href={`/search?q=${encodeURIComponent(city)}`}
                    onClick={onClose}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quick Links
              </p>
              <Link
                href="/cities"
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100"
              >
                <MapPin className="h-3 w-3" />
                Browse All Cities
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileProductItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchProduct;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.url}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl.startsWith("//") ? "https:" + item.imageUrl : item.imageUrl} alt={item.name} fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Search className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
        <p className="truncate text-xs text-slate-500">
          {item.city}{item.category ? ` \u00B7 ${item.category}` : ""}
        </p>
      </div>
      {item.price > 0 && (
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency, minimumFractionDigits: 0 }).format(item.price)}
        </span>
      )}
    </Link>
  );
}

function MobileCityItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchCity;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.url}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.image ? (
          <Image src={item.image.startsWith("//") ? "https:" + item.image : item.image} alt={item.name} fill className="object-cover" sizes="56px" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <MapPin className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        {item.country && <p className="text-xs text-slate-500">{item.country}</p>}
      </div>
    </Link>
  );
}

function MobileCategoryItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchCategory;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.url}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <Search className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">Category</p>
      </div>
    </Link>
  );
}

function MobileSuggestionItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchSuggestion;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      href={item.url}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-3 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.text}</p>
      </div>
    </Link>
  );
}
