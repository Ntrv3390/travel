"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex min-w-0 items-center gap-1 text-sm text-slate-500 overflow-hidden",
        className
      )}
    >
      {/* Home icon — always visible, never shrinks */}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-1 text-slate-400 transition-colors hover:text-sky-600"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <span key={i} className={cn(
            "flex items-center gap-1 min-w-0",
            // Middle items: don't shrink below a small minimum so they stay visible
            // Last item: allow full shrink and truncate
            isLast ? "min-w-0 shrink" : "shrink-0"
          )}>
            {/* Chevron — never wraps */}
            <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />

            {item.href && !isLast ? (
              // Middle clickable items — fixed, no truncation needed since shrink-0 on parent
              <Link
                href={item.href}
                className="shrink-0 whitespace-nowrap transition-colors hover:text-sky-600"
              >
                {item.label}
              </Link>
            ) : (
              // Last item — truncates with ellipsis when space runs out
              <span
                className={cn(
                  "block min-w-0 truncate whitespace-nowrap",
                  isLast ? "font-medium text-slate-700" : "whitespace-nowrap"
                )}
                title={item.label}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://triipzy.com";
  const listItems = [
    { name: "Home", position: 1, item: baseUrl },
    ...items.map((item, i) => ({
      name: item.label,
      position: i + 2,
      item: item.href ? `${baseUrl}${item.href}` : undefined,
    })),
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: listItems.map((item) => ({
            "@type": "ListItem",
            position: item.position,
            name: item.name,
            ...(item.item ? { item: item.item } : {}),
          })),
        }),
      }}
    />
  );
}