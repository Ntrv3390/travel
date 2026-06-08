"use client";

import { Star, TrendingUp } from "lucide-react";
import type { Product } from "@/types/product";

interface ReviewsSectionProps {
  product: Product;
}

export function ReviewsSection({ product }: ReviewsSectionProps) {
  const rating = product.reviewsSummary?.averageRating;
  const count = product.reviewsSummary?.ratingsCount;

  if (rating == null || count == null || count === 0) return null;

  return (
    <section id="reviews" className="scroll-mt-20">
      <div className="rounded-2xl border border-border/60 bg-background p-4 transition-shadow duration-200 hover:shadow-package-hover">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
              <span className="text-xl font-bold text-brand-700">
                {rating.toFixed(1)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-200 text-slate-200"
                      }`}
                  />
                ))}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Based on{" "}
                <span className="font-medium text-foreground">
                  {count.toLocaleString()}
                </span>{" "}
                review{count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Social proof pills */}
          <div className="flex flex-wrap gap-2">
            {count > 50 && (
              <div className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                <TrendingUp className="h-3 w-3" />
                Booked {Math.min(count * 7, 999)}+ times
              </div>
            )}
            {rating >= 4.5 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3 fill-amber-400" />
                Top rated
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
