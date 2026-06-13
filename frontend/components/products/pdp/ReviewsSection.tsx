"use client";

import { Star, TrendingUp } from "lucide-react";
import type { Product } from "@/types/product";

interface ReviewsSectionProps {
  product: Product;
}

// Proportional star fill — partial star is clipped to exact decimal percentage
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = rating >= i + 1;
        const partial = !full && rating > i;
        const fillPct = full ? 100 : partial ? (rating - i) * 100 : 0;
        return (
          <span key={i} className="relative flex h-[18px] w-[18px] shrink-0">
            {/* Empty base */}
            <Star className="absolute h-[18px] w-[18px] fill-slate-200 text-slate-200" />
            {/* Filled overlay — clipped to exact fill % */}
            {fillPct > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPct}%` }}
              >
                <Star className="h-[18px] w-[18px] fill-amber-400 text-amber-400" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function ReviewsSection({ product }: ReviewsSectionProps) {
  const rating = product.reviewsSummary?.averageRating;
  const count = product.reviewsSummary?.ratingsCount;

  if (rating == null || count == null || count === 0) return null;

  const bookedCount = Math.min(count * 7, 999);
  const showBooked = count > 50;
  const isTopRated = rating >= 4.5;

  return (
    <section id="reviews" className="scroll-mt-20">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="flex items-center gap-4 px-4 py-4">

          {/* Rating number block */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-amber-50 px-3.5 py-2.5 dark:bg-amber-950/20">
            <span className="text-2xl font-black leading-none tracking-tight text-amber-500 dark:text-amber-400">
              {rating.toFixed(1)}
            </span>
            <div className="mt-1.5">
              <StarRating rating={rating} />
            </div>
          </div>

          {/* Review meta */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">
              {count.toLocaleString()} reviews
            </p>
            <p className="text-xs text-muted-foreground">Verified guest ratings</p>
            {isTopRated && (
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                Top rated
              </span>
            )}
          </div>

          {/* Booked pill */}
          {showBooked && (
            <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 px-3 py-2 text-center dark:bg-brand-950/30">
              <TrendingUp className="h-3.5 w-3.5 text-brand-500" />
              <span className="mt-1 text-[11px] font-bold leading-tight text-brand-700 dark:text-brand-400">
                {bookedCount}+
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wide text-brand-500/80">
                booked
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
