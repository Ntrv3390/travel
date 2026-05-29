"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CurrencyPicker } from "@/components/common/CurrencyPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";

export function Navbar() {
  const { itemCount } = useCart();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setScrollProgress(Math.min((scrollTop / maxScroll) * 100, 100));
      frameId = 0;
    };

    const onScroll = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const isScrolled = scrollProgress > 0.8;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-200/80 bg-slate-50/70 backdrop-blur-xl shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container py-2">
        <Card
          className={`flex h-16 items-center justify-between gap-4 rounded-2xl px-3 py-0 md:px-4 transition-all duration-300 ${
            isScrolled
              ? "border border-white/70 bg-white/60 shadow-[0_8px_20px_rgba(15,23,42,0.07)]"
              : "border border-slate-200/60 bg-white/85"
          }`}
        >
          <Button variant="link" asChild href="/" className="h-auto p-0 text-3xl font-black tracking-tight text-brand-700 no-underline hover:no-underline sm:text-4xl">
            Travel
          </Button>
          <div className="hidden flex-1 md:block">
            <SearchBar compact />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/cities">Cities</Link>
            </Button>
            <CurrencyPicker />
            <Button variant="ghost" size="sm" asChild className="relative h-9 w-9 p-0">
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
      <div className="h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 transition-[width] duration-100"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </header>
  );
}
