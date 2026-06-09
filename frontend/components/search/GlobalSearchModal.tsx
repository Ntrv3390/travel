"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete";
import { SearchModal } from "@/components/search/SearchModal";

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const search = useSearchAutocomplete();
  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-search", handler);
    return () => window.removeEventListener("open-search", handler);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    searchRef.current.setQuery("");
    searchRef.current.closeDropdown();
  }, []);

  // ✅ Always render — never return null
  // The modal itself hides via the open prop
  return (
    <SearchModal
      open={open}
      onClose={handleClose}
      query={search.query}
      setQuery={search.setQuery}
      grouped={search.grouped}
      loading={search.loading}
      highlightedIndex={search.highlightedIndex}
      onKeyDown={search.handleKeyDown}
    />
  );
}