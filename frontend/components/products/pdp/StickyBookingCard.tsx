"use client";

import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";

interface StickyBookingCardProps {
  price: number | undefined;
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
  productName,
  hasFreeCancellation,
  hasInstantConfirmation,
  hasMobileTicket,
  duration,
  onCheckAvailability,
}: StickyBookingCardProps) {
  const { formatPrice } = useCurrency();
  return (
    <div className="sticky top-24">
      <div className="glass-strong overflow-hidden rounded-2xl shadow-glass-lg">
        {/* Header accent */}
        <div className="h-1 bg-gradient-to-r from-brand-400 to-brand-600" />

        <div className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground truncate">
            {productName}
          </h3>

          {price !== undefined && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Starting from
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight">
                  {formatPrice(price)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /person
                </span>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {duration != null && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                  <Clock className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <span>{formatDuration(duration)}</span>
              </div>
            )}
            {hasFreeCancellation && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <span>Free cancellation</span>
              </div>
            )}
            {hasInstantConfirmation && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                  <Zap className="h-3.5 w-3.5 text-brand-600" />
                </div>
                <span>Instant confirmation</span>
              </div>
            )}
            {hasMobileTicket && (
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                  <Smartphone className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <span>Mobile ticket</span>
              </div>
            )}
          </div>

          <Button
            size="lg"
            onClick={onCheckAvailability}
            className="mt-6 w-full gap-2 rounded-xl text-sm font-semibold"
            aria-label="Check availability and book"
          >
            <Sparkles className="h-4 w-4" />
            Check Availability
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
