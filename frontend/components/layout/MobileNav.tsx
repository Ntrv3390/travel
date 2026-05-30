"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-label="Open navigation menu">
        <Menu className="h-4 w-4" />
      </Button>
      {open ? (
        <Card className="absolute right-0 top-12 w-44 rounded-md border bg-background p-2 shadow-lg">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("open-search"));
              }}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <Link href="/" className="rounded px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/products" className="rounded px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Products
            </Link>
            <Link href="/cities" className="rounded px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Cities
            </Link>
            <Link href="/search" className="rounded px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Search Page
            </Link>
            <Link href="/checkout" className="rounded px-3 py-2 text-sm hover:bg-muted" onClick={() => setOpen(false)}>
              Checkout
            </Link>
          </nav>
        </Card>
      ) : null}
    </div>
  );
}
