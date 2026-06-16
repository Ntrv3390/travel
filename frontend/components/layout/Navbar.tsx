"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { CurrencyPicker } from "@/components/common/CurrencyPicker";
import { useCart } from "@/hooks/useCart";
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete";
import { SearchOverlay } from "@/components/search/SearchOverlay";

const NAV_LINKS = ["Products", "Cities", "About", "Help"] as const;

export function Navbar() {
  useCart();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/" || pathname === "/about" || pathname === "/help";

  const [scrolledPast, setScrolledPast] = useState(false);
  const frameId = useRef(0);

  useEffect(() => {

    const check = () => {
      const scrollY = window.scrollY ?? document.documentElement.scrollTop;
      setScrolledPast(scrollY > 40);
    };

    const onScroll = () => {
      if (frameId.current) return;
      frameId.current = requestAnimationFrame(() => {
        check();
        frameId.current = 0;
      });
    };

    // Run immediately so initial state is correct
    check();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, []);

  const isSolid = !isHome || scrolledPast;
  const openMobileSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-search"));
  }, []);

  const desktopSearch = useSearchAutocomplete();
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
  } = desktopSearch;

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      closeDropdown();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [query, router, closeDropdown],
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${isSolid
        ? "bg-white backdrop-blur-xl border-b border-slate-200 shadow-[0_1px_12px_rgba(15,23,42,0.07)]"
        : "bg-transparent border-b border-transparent"
        }`}
    >
      <div className="mx-auto max-w-screen-xl px-6 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center sm:h-[68px]">

          {/* Logo */}
          <Link
            href="/"
            className={`flex-shrink-0 select-none text-[26px] font-black tracking-tight transition-all duration-500 ${isSolid
              ? "bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent"
              : "text-white"
              }`}
          >
            Triipzy
          </Link>

          {/* Logo / Search divider */}
          <div
            className={`mx-6 hidden h-5 w-px flex-shrink-0 transition-all duration-500 md:block ${isSolid ? "bg-slate-200" : "bg-white/25"
              }`}
          />

          {/* Search bar — desktop */}
          <form onSubmit={onSearchSubmit} className="hidden md:block md:w-80 lg:w-[460px] xl:w-[560px] flex-shrink-0 relative">
            <div className="relative">
              <Search
                className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-500 ${isSolid ? "text-slate-400" : "text-white/50"
                  }`}
              />
              <input
                ref={inputRef as React.Ref<HTMLInputElement>}
                type="search"
                placeholder="Search attractions, cities…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => openDropdown()}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-label="Search"
                className={`w-full rounded-xl border px-4 pl-10 h-10 text-[13px] leading-none outline-none transition-all duration-200 ${isSolid
                  ? "bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-400 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  : "bg-white/10 border-white/20 text-white placeholder:text-white/45 focus:bg-white/15 focus:border-white/30"
                  }`}
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

          {/* Flex spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-0.5">

            {/* Mobile search */}
            <button
              type="button"
              onClick={openMobileSearch}
              aria-label="Open search"
              className={`md:hidden rounded-lg p-2 transition-all duration-200 ${isSolid
                ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Nav links */}
            {NAV_LINKS.map((label) => (
              <Link
                key={label}
                href={`/${label.toLowerCase()}`}
                className={`hidden md:inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${isSolid
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
              >
                {label}
              </Link>
            ))}

            {/* Divider */}
            <div
              className={`mx-1.5 hidden h-4 w-px flex-shrink-0 md:block transition-all duration-500 ${isSolid ? "bg-slate-200" : "bg-white/20"
                }`}
            />

            {/* Currency */}
            <CurrencyPicker
              className={`rounded-lg text-[13px] font-medium transition-all duration-200 ${isSolid
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
            />

            {/* Cart */}
            {/* <Link
              href="/cart"
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ""}`}
              className={`relative ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${isSolid
                ? "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200/60 hover:border-slate-300 hover:text-slate-900"
                : "bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/35"
                }`}
            >
              <ShoppingCart className="h-[17px] w-[17px]" />
              {itemCount > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-[17px] w-[17px] items-center justify-center rounded-full text-[9px] font-bold text-white transition-all duration-300 ${isSolid
                    ? "bg-blue-600 shadow-[0_0_0_2px_white]"
                    : "bg-blue-500 shadow-[0_0_0_1.5px_rgba(30,58,138,0.4)]"
                    }`}
                >
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link> */}

            {/* Mobile hamburger */}
            <div className="ml-1 md:hidden flex items-center">
              <MobileNav />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}