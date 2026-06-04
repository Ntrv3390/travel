"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Search, /* User, LogOut, Shield */ } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CurrencyPicker } from "@/components/common/CurrencyPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
// import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { itemCount } = useCart();
  // const { user, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/about" || pathname === "/help";

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
      className={`sticky top-0 z-50 transition-all duration-500 ${isSolid
        ? "border-b border-slate-200/80 bg-slate-50/70 backdrop-blur-xl shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
        : "border-b border-transparent bg-transparent"
        }`}
    >
      <div className="container py-0 sm:py-2">
        <Card
          style={{ backgroundColor: "transparent" }}
          className={`flex h-12 items-center justify-between gap-1 rounded-2xl px-1 py-0 sm:h-16 sm:gap-4 sm:px-3 md:px-4 transition-all duration-500 ${isSolid
            ? "border border-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.07)]"
            : "border border-transparent shadow-none"
            }`}
        >
          <Button
            variant="link"
            asChild
            href="/"
            className={`h-auto p-0 text-2xl font-black tracking-tight no-underline hover:no-underline sm:text-3xl md:text-4xl transition-colors duration-500 ${isSolid ? "text-brand-700" : "text-white"
              }`}
          >
            Triipzy
          </Button>
          <div className="hidden flex-1 md:block">
            <SearchBar compact />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`md:hidden transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80"
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
              className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                }`}
            >
              <Link href="/products">Products</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                }`}
            >
              <Link href="/cities">Cities</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                }`}
            >
              <Link href="/about">About</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                }`}
            >
              <Link href="/help">Help</Link>
            </Button>
            <CurrencyPicker className={isSolid ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"} />
            {/* {user ? (
              <>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                      }`}
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4 mr-1.5" />
                      Admin
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                    }`}
                >
                  <Link href="/account">
                    <User className="h-4 w-4 mr-1.5" />
                    Account
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                    }`}
                >
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                    }`}
                >
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`hidden md:inline-flex transition-colors duration-500 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
                    }`}
                >
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </>
            )} */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={`relative h-8 w-8 p-0 transition-colors duration-500 sm:h-9 sm:w-9 ${isSolid ? "" : "text-white hover:text-white/80 hover:bg-white/10"
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
