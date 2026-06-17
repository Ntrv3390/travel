"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface StickyBookingBarProps {
  price: number | undefined;
  priceCurrency?: string;
  hasFreeCancellation?: boolean;
  hasInstantConfirmation?: boolean;
  onCheckAvailability: () => void;
}

export function StickyBookingBar({
  price,
  priceCurrency,
  hasFreeCancellation,
  hasInstantConfirmation,
  onCheckAvailability,
}: StickyBookingBarProps) {
  const { formatPrice } = useCurrency();

  const trustText = [
    hasFreeCancellation && "Free cancellation",
    hasInstantConfirmation && "Instant confirmation",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      role="complementary"
      aria-label="Booking"
    >
      <div
        className={cn(
          "relative overflow-hidden",
          "bg-white/88 dark:bg-zinc-900/88",
          "backdrop-blur-2xl backdrop-saturate-150",
          "border-t border-white/30 dark:border-white/10",
          "shadow-[0_-4px_30px_rgba(0,0,0,0.10)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Brand glow line at very top */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-70" />

        {/* Main row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-3">

          {/* Price block */}
          {price !== undefined ? (
            <div className="shrink-0">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                From
              </span>
              <span className="block text-[22px] font-black tracking-tight leading-none text-foreground">
                {formatPrice(price, priceCurrency)}
              </span>
              <span className="block text-[9px] text-muted-foreground">per person</span>
            </div>
          ) : (
            <div className="shrink-0" />
          )}

          {/* CTA button */}
          <button
            onClick={onCheckAvailability}
            aria-label="Check availability and book"
            className={cn(
              "relative flex min-h-[54px] flex-1 items-center justify-center gap-2 overflow-hidden",
              "rounded-2xl px-5",
              "bg-gradient-to-r from-brand-500 to-brand-600 text-white",
              "text-[15px] font-bold tracking-tight",
              // Sheen
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0",
              "before:h-[45%] before:rounded-t-2xl before:bg-white/20",
              "shadow-[0_4px_20px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.25)]",
              "transition-all duration-150",
              "active:scale-[0.97] active:brightness-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            )}
          >
            Check availability
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>

        {/* Trust strip + safe area padding */}
        {trustText ? (
          <div
            className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground"
            style={{ paddingBottom: "calc(0.6rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {trustText}
          </div>
        ) : (
          <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
        )}
      </div>
    </div>
  );
}
