"use client";

import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Smartphone,
  Sparkles,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface StickyBookingCardProps {
  price: number | undefined;
  originalPrice?: number;
  discount?: number;
  productName: string;
  hasFreeCancellation?: boolean;
  hasInstantConfirmation?: boolean;
  hasMobileTicket?: boolean;
  duration?: number | null;
  onCheckAvailability: () => void;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "Flexible";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function StickyBookingCard({
  price,
  originalPrice,
  discount = 0,
  productName,
  hasFreeCancellation,
  hasInstantConfirmation,
  hasMobileTicket,
  duration,
  onCheckAvailability,
}: StickyBookingCardProps) {
  const { formatPrice } = useCurrency();

  const trustItems = [
    hasFreeCancellation && {
      Icon: ShieldCheck,
      label: "Free cancellation",
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    hasInstantConfirmation && {
      Icon: Zap,
      label: "Instant confirmation",
      color: "text-brand-600 bg-brand-50 dark:bg-brand-950/40 dark:text-brand-400",
    },
    hasMobileTicket && {
      Icon: Smartphone,
      label: "Mobile ticket",
      color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400",
    },
    duration != null && {
      Icon: Clock,
      label: formatDuration(duration),
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400",
    },
  ].filter(Boolean) as Array<{ Icon: React.ElementType; label: string; color: string }>;

  return (
    <div className="sticky top-24">
      <div className="overflow-hidden rounded-3xl border border-border/40 bg-background shadow-xl shadow-black/[0.07]">

        {/* ── Gradient price header ─────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 px-5 py-5">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-black/10" />

          {/* Product name */}
          <p className="relative line-clamp-1 text-xs font-semibold text-white/90">
            {productName}
          </p>

          {/* Price */}
          <div className="relative mt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
              Starting from
            </p>
            <span className="mt-1 block text-[2.5rem] font-black tracking-tight leading-none text-white drop-shadow-sm">
              {price !== undefined ? formatPrice(price) : "—"}
            </span>

            {/* Discount row — separated below the price */}
            {discount > 0 && originalPrice ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow-md">
                  -{discount}% OFF
                </span>
                <span className="text-sm text-white/70 line-through">
                  {formatPrice(originalPrice)}
                </span>
              </div>
            ) : null}

            <p className="mt-1.5 text-xs font-medium text-white/80">per person</p>
          </div>
        </div>

        {/* ── Trust badges 2-col grid ───────────────────────────────── */}
        {trustItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-4 pb-2">
            {trustItems.map(({ Icon, label, color }, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold",
                  color
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="leading-tight">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <div className="px-4 pb-5 pt-3">
          <button
            onClick={onCheckAvailability}
            aria-label="Check availability and book"
            className={cn(
              "relative w-full overflow-hidden rounded-2xl",
              "flex items-center justify-center gap-2",
              "py-4 text-[15px] font-bold text-white tracking-tight",
              "bg-gradient-to-r from-brand-500 to-brand-600",
              "shadow-lg shadow-brand-500/30",
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[45%] before:bg-white/20 before:rounded-t-2xl",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40",
              "active:scale-[0.98] active:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            )}
          >
            <Sparkles className="h-4 w-4" />
            Check Availability
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Reassurance */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Secure checkout · No hidden fees
          </div>
        </div>
      </div>
    </div>
  );
}
