"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating?: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ rating = 0, reviewCount, size = "sm", className }: StarRatingProps) {

  const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizes[size],
              star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground",
            )}
          />
        ))}
      </div>
      <span className={cn("font-semibold text-foreground", textSizes[size])}>{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", textSizes[size])}>({reviewCount.toLocaleString()})</span>
      )}
    </div>
  );
}
