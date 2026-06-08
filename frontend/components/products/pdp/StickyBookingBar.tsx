"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface StickyBookingBarProps {
  price: number | undefined;
  onCheckAvailability: () => void;
}

export function StickyBookingBar({
  price,
  onCheckAvailability,
}: StickyBookingBarProps) {
  const { supportedCurrencies, currency } = useCurrency();
  const symbol = supportedCurrencies.find(c => c.code === currency)?.symbol
    ?? (() => {
      try {
        return (0).toLocaleString("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/[\d.,\s]/g, "").trim();
      } catch { return currency; }
    })();
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "safe-bottom"
      )}
      role="complementary"
      aria-label="Booking"
    >
      {/* iOS-style frosted glass backdrop */}
      <div
        className={cn(
          "relative overflow-hidden",
          "border-t border-white/20 dark:border-white/10",
          "bg-white/70 dark:bg-black/60",
          "backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[0_-1px_0_0_rgba(0,0,0,0.06),0_-8px_32px_-4px_rgba(0,0,0,0.12)]",
          "dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.08),0_-8px_32px_-4px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Subtle top highlight line — iOS sheet feel */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />

        <div className="flex items-center gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">

          {/* Price block */}
          {price !== undefined ? (
            <div className="flex min-w-0 shrink-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                From
              </span>
              <div className="flex items-baseline gap-0.5 leading-none">
                <span className="text-[11px] font-semibold text-foreground/70">{symbol}</span>
                <span className="text-[22px] font-bold tracking-tight text-foreground">
                  {price.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            /* spacer when no price so button still fills width */
            <div className="shrink-0" />
          )}

          {/* CTA button — pill shaped, full remaining width */}
          <button
            onClick={onCheckAvailability}
            aria-label="Check availability and book"
            className={cn(
              "relative flex min-h-[50px] flex-1 items-center justify-center gap-2 overflow-hidden",
              "rounded-2xl px-5",
              "bg-brand-500 text-white",
              "text-[15px] font-semibold tracking-tight",
              // Glassy sheen overlay
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2",
              "before:rounded-t-2xl before:bg-white/15",
              // States
              "transition-all duration-150",
              "active:scale-[0.97] active:brightness-95",
              "shadow-[0_2px_12px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            )}
          >
            Check availability
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-150 group-active:-translate-x-0.5 group-active:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}