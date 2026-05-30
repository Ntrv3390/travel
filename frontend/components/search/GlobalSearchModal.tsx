"use client";

import { useEffect, useState } from "react";
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete";
import { SearchModal } from "@/components/search/SearchModal";

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const search = useSearchAutocomplete();

  useEffect(() => {
    const handler = () => {
      setOpen(true);
    };
    window.addEventListener("open-search", handler);
    return () => window.removeEventListener("open-search", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      search.setQuery("");
      search.closeDropdown();
    }
  }, [open]);

  if (!open) return null;

  return (
    <SearchModal
      open={open}
      onClose={() => {
        setOpen(false);
        search.setQuery("");
      }}
      query={search.query}
      setQuery={search.setQuery}
      grouped={search.grouped}
      loading={search.loading}
      highlightedIndex={search.highlightedIndex}
      onKeyDown={search.handleKeyDown}
    />
  );
}
