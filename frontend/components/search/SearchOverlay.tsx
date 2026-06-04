"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Search, MapPin, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchProduct, SearchCity, SearchCategory, SearchSuggestion } from "@/types/search";

interface SearchOverlayProps {
  grouped: {
    attractions: SearchProduct[];
    cities: SearchCity[];
    categories: SearchCategory[];
    popular: SearchSuggestion[];
  };
  loading: boolean;
  open: boolean;
  query: string;
  highlightedIndex: number;
  onClose: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setQuery: (q: string) => void;
}

export function SearchOverlay({
  grouped,
  loading,
  open,
  query,
  highlightedIndex,
  onClose,
  onKeyDown,
  dropdownRef,
}: SearchOverlayProps) {
  const { attractions, cities, categories, popular } = grouped;
  const hasResults = attractions.length > 0 || cities.length > 0 || categories.length > 0;
  const isEmpty = query.length >= 2 && !loading && !hasResults;

  let currentIndex = 0;

  const getHighlighted = (len: number) => {
    const start = currentIndex;
    currentIndex += len;
    return (itemIndex: number) => highlightedIndex === start + itemIndex;
  };

  if (!open) return null;

  return (
    <div
      ref={dropdownRef as React.Ref<HTMLDivElement>}
      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xl max-h-[70vh]"
      onKeyDown={onKeyDown}
      role="listbox"
      aria-label="Search results"
    >
      {/* Loading */}
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
                <SearchProductItem
                  key={item.id}
                  item={item}
                  highlighted={highlighted}
                  onSelect={onClose}
                />
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
                <SearchCityItem
                  key={item.code}
                  item={item}
                  highlighted={highlighted}
                  onSelect={onClose}
                />
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
                <SearchCategoryItem
                  key={item.id}
                  item={item}
                  highlighted={highlighted}
                  onSelect={onClose}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Searches */}
      {popular.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Popular Searches
          </p>
          <div className="space-y-0.5">
            {popular.map((item, i) => {
              const highlighted = getHighlighted(popular.length)(i);
              return (
                <SearchSuggestionItem
                  key={item.text + item.type}
                  item={item}
                  highlighted={highlighted}
                  onSelect={onClose}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
          <Search className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No results found</p>
          <p className="text-xs text-slate-400">
            Try searching for a city, attraction, or category
          </p>
        </div>
      )}

      {/* Initial State - Popular Destinations from API */}
      {query.length < 2 && (
        <div className="space-y-4 px-5 py-5">
          {cities.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <TrendingUp className="h-3 w-3" />
                Popular Destinations
              </p>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <Link
                    key={city.code}
                    href={city.url}
                    onClick={onClose}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {cities.length === 0 && !loading && (
            <p className="text-center text-xs text-slate-400">Loading destinations...</p>
          )}
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Links
            </p>
            <div className="flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
  );
}

function SearchProductItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchProduct;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <Link
      ref={ref}
      href={item.url}
      onClick={onSelect}
      role="option"
      aria-selected={highlighted}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl.startsWith("//") ? "https:" + item.imageUrl : item.imageUrl} alt={item.name} fill className="object-cover" sizes="48px" />
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

function SearchCityItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchCity;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <Link
      ref={ref}
      href={item.url}
      onClick={onSelect}
      role="option"
      aria-selected={highlighted}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.image ? (
          <Image src={item.image.startsWith("//") ? "https:" + item.image : item.image} alt={item.name} fill className="object-cover" sizes="48px" />
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

function SearchCategoryItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchCategory;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <Link
      ref={ref}
      href={item.url}
      onClick={onSelect}
      role="option"
      aria-selected={highlighted}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
        highlighted ? "bg-sky-50" : "hover:bg-slate-50",
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <Search className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">Category</p>
      </div>
    </Link>
  );
}

function SearchSuggestionItem({
  item,
  highlighted,
  onSelect,
}: {
  item: SearchSuggestion;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <Link
      ref={ref}
      href={item.url}
      onClick={onSelect}
      role="option"
      aria-selected={highlighted}
      className={cn(
        "flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
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
