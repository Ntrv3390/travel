"use client";

import Link from "next/link";
import {
  Menu,
  X,
  Search,
  // User,
  // LogOut,
  // Shield,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
// import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Cities", href: "/cities" },
  { label: "About", href: "/about" },
  { label: "Help Center", href: "/help" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // const { user, isAdmin, signOut } = useAuth();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="h-9 w-9 rounded-xl border-slate-200 bg-white/80 p-0 backdrop-blur-sm"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-all duration-300 ${open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-[100] h-screen w-[90vw] max-w-sm transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-2xl font-black text-transparent">
                Triipzy
              </span>

              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-4">
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("open-search"));
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Search className="h-4 w-4" />
              Search attractions & cities
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3">
            <nav className="space-y-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900"
                >
                  <span>{item.label}</span>

                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Bottom Auth Area */}
          {/* <div className="border-t border-slate-200 bg-slate-50/70 p-4"> */}
          {/* Logged In */}
          {/* {user ? (
              <div className="space-y-1">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <User className="h-4 w-4" />
                  Account
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Sign In
                </Link>

                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create Account
                </Link>
              </div>)} */}
          {/* </div> */}
        </div>
      </div>
    </>
  );
}