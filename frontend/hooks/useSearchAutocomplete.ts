"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { searchAll } from "@/lib/api";
import type { SearchAllResponse, SearchProduct, SearchCity, SearchCategory, SearchSuggestion } from "@/types/search";

interface SearchState {
  query: string;
  results: SearchAllResponse | null;
  loading: boolean;
  open: boolean;
  highlightedIndex: number;
}

interface GroupedResults {
  attractions: SearchProduct[];
  cities: SearchCity[];
  categories: SearchCategory[];
  popular: SearchSuggestion[];
}

interface SearchAutocompleteReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchAllResponse | null;
  grouped: GroupedResults;
  loading: boolean;
  open: boolean;
  highlightedIndex: number;
  openDropdown: () => void;
  closeDropdown: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}



function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

export function useSearchAutocomplete(initialQuery = ""): SearchAutocompleteReturn {
  const { currency } = useCurrency();
  const [state, setState] = useState<SearchState>({
    query: initialQuery,
    results: null,
    loading: false,
    open: false,
    highlightedIndex: -1,
  });

  // Sync from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlQ = urlParams.get("q");
    if (urlQ && !initialQuery) {
      setState((prev) => ({ ...prev, query: urlQ }));
    }
  }, [initialQuery]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((q: string) => {
    setState((prev) => ({ ...prev, query: q }));
  }, []);

  const openDropdown = useCallback(() => {
    setState((prev) => ({ ...prev, open: true }));
  }, []);

  const closeDropdown = useCallback(() => {
    setState((prev) => ({ ...prev, open: false, highlightedIndex: -1 }));
  }, []);

  const totalItems = useMemo(() => {
    const r = state.results;
    if (!r) return 0;
    return (r.products?.length ?? 0) + (r.cities?.length ?? 0) + (r.categories?.length ?? 0);
  }, [state.results]);

  // Fetch popular cities when query is empty
  useEffect(() => {
    if (state.query !== "") return;
    let cancelled = false;
    (async () => {
      const data = await searchAll("", { currencyCode: currency });
      if (cancelled) return;
      setState((prev) => ({ ...prev, results: data, loading: false }));
    })();
    return () => { cancelled = true; };
  }, [state.query, currency]);

  useEffect(() => {
    const normalized = normalizeQuery(state.query);
    if (normalized.length < 2) {
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, loading: true }));

      const data = await searchAll(state.query, {
        signal: controller.signal,
        currencyCode: currency,
      });
      if (controller.signal.aborted) return;

      setState((prev) => ({
        ...prev,
        results: data,
        loading: false,
        open: true,
        highlightedIndex: -1,
      }));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.query, currency]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!state.open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            highlightedIndex:
              prev.highlightedIndex < totalItems - 1 ? prev.highlightedIndex + 1 : 0,
          }));
          break;
        case "ArrowUp":
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            highlightedIndex:
              prev.highlightedIndex > 0 ? prev.highlightedIndex - 1 : totalItems - 1,
          }));
          break;
        case "Enter": {
          if (state.highlightedIndex >= 0 && state.results) {
            const item = getItemAtIndex(state.results, state.highlightedIndex);
            if (item) {
              window.location.href = item.url;
            }
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          closeDropdown();
          if (inputRef.current) inputRef.current.blur();
          break;
      }
    },
    [state.open, state.highlightedIndex, state.results, totalItems, openDropdown, closeDropdown],
  );

  const grouped = useMemo((): GroupedResults => {
    const r = state.results;
    if (!r) {
      return { attractions: [], cities: [], categories: [], popular: [] };
    }
    return {
      attractions: r.products ?? [],
      cities: r.cities ?? [],
      categories: r.categories ?? [],
      popular: r.suggestions ?? [],
    };
  }, [state.results]);

  return {
    query: state.query,
    setQuery,
    results: state.results,
    grouped,
    loading: state.loading,
    open: state.open,
    highlightedIndex: state.highlightedIndex,
    openDropdown,
    closeDropdown,
    handleKeyDown,
    inputRef,
    dropdownRef,
  };
}

function getItemAtIndex(results: SearchAllResponse, index: number): { url: string } | null {
  let offset = 0;
  const products = results.products ?? [];
  const cities = results.cities ?? [];
  const categories = results.categories ?? [];

  if (index < offset + products.length) {
    return products[index - offset];
  }
  offset += products.length;

  if (index < offset + cities.length) {
    return cities[index - offset];
  }
  offset += cities.length;

  if (index < offset + categories.length) {
    return categories[index - offset];
  }

  return null;
}
