"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Search } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CurrencyPicker } from "@/components/common/CurrencyPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";

export function Navbar() {
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [scrolledPast, setScrolledPast] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    setPageReady(true);
    let frameId = 0;
    const check = () => {
      const past = window.scrollY > window.innerHeight * 0.85;
      if (past !== scrolledPast) setScrolledPast(past);
      frameId = 0;
    };
    const onScroll = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [scrolledPast]);

  const isSolid = !isHome || !pageReady || scrolledPast;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        isSolid
          ? "border-b border-slate-200/80 bg-slate-50/70 backdrop-blur-xl shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container py-2">
        <Card
          style={isSolid ? undefined : { backgroundColor: "transparent" }}
          className={`flex h-16 items-center justify-between gap-4 rounded-2xl px-3 py-0 md:px-4 transition-all duration-500 ${
            isSolid
              ? "border border-white/70 bg-white/60 shadow-[0_8px_20px_rgba(15,23,42,0.07)]"
              : "border border-transparent shadow-none"
          }`}
        >
          <Button
            variant="link"
            asChild
            href="/"
            className={`h-auto p-0 text-3xl font-black tracking-tight no-underline hover:no-underline sm:text-4xl transition-colors duration-500 ${
              isSolid ? "text-brand-700" : "text-white"
            }`}
          >
            Triipzy
          </Button>
          <div className="hidden flex-1 md:block">
            <SearchBar compact />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`md:hidden transition-colors duration-500 ${
                isSolid ? "" : "text-white hover:text-white/80"
              }`}
              onClick={() => {
                const event = new CustomEvent("open-search");
                window.dispatchEvent(event);
              }}
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`hidden md:inline-flex transition-colors duration-500 ${
                isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
              }`}
            >
              <Link href="/products">Products</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`hidden md:inline-flex transition-colors duration-500 ${
                isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
              }`}
            >
              <Link href="/cities">Cities</Link>
            </Button>
            <CurrencyPicker className={isSolid ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"} />
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`relative h-9 w-9 p-0 transition-colors duration-500 ${
                isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
              }`}
            >
              <Link href="/cart" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
            </Button>
            <div className="md:hidden">
              <MobileNav />
            </div>
          </div>
        </Card>
      </div>
    </header>
  );
}
