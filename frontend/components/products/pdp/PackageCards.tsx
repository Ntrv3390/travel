"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Users,
  ShieldCheck,
  ShoppingCart,
  Star,
  Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/product";

function formatDuration(ms: number | null): string {
  if (!ms) return "Flexible";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function getVariantBadge(
  index: number,
  total: number,
): { label: string; icon: React.ElementType; color: string } | null {
  if (total <= 1) return null;
  if (index === 0)
    return {
      label: "Most Popular",
      icon: Star,
      color: "bg-amber-500 text-white",
    };
  if (index === total - 1 && total > 2)
    return {
      label: "Best Value",
      icon: Crown,
      color: "bg-emerald-500 text-white",
    };
  return null;
}

interface PackageCardsProps {
  variants: ProductVariant[];
  selectedVariantId: string | number | null;
  onSelectVariant: (id: string | number) => void;
  inCartVariantId?: string | number | null;
  symbol?: string;
}

export function PackageCards({
  variants,
  selectedVariantId,
  onSelectVariant,
  inCartVariantId,
  symbol = "$",
}: PackageCardsProps) {
  if (!variants || variants.length === 0) return null;

  return (
    <section id="packages" className="scroll-mt-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Select A Package
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the option that fits your experience best
          </p>
        </div>

        <Badge className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {variants.length} Options
        </Badge>
      </div>

      <div className="space-y-4">
        {variants.map((variant, index) => {
          const pricing = (
            variant as {
              pricing?: {
                headoutSellingPrice?: number;
                netPrice?: number;
                currency?: string;
              };
            }
          ).pricing;

          const vp = (
            variant as {
              startingHeadoutSellingPrice?: {
                amount?: number;
                currencyCode?: string;
              };
            }
          ).startingHeadoutSellingPrice;

          const displayPrice =
            pricing?.headoutSellingPrice ?? vp?.amount;

          const netPrice = pricing?.netPrice;

          const isSelected = selectedVariantId === variant.id;

          const isInCart =
            inCartVariantId != null &&
            String(inCartVariantId) === String(variant.id);

          const badge = getVariantBadge(index, variants.length);

          const discount =
            displayPrice &&
              netPrice &&
              displayPrice > netPrice
              ? Math.round(
                ((displayPrice - netPrice) / displayPrice) * 100
              )
              : 0;

          return (
            <motion.div
              key={String(variant.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: index * 0.06,
              }}
            >
              <button
                onClick={() => onSelectVariant(variant.id)}
                className={cn(
                  "group relative w-full overflow-hidden rounded-3xl text-left transition-all duration-300",
                  "backdrop-blur-xl",
                  "active:scale-[0.99]",
                  isSelected
                    ? "border-brand-500 bg-gradient-to-br from-brand-50 via-background to-brand-50/40 shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-2 ring-brand-500/20"
                    : "border border-white/40 bg-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:bg-card/80"
                )}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.04] to-transparent" />
                )}

                <div className="relative p-4 sm:p-5 lg:p-6">
                  {/* Top Row */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {badge && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                              badge.color
                            )}
                          >
                            <badge.icon className="h-3 w-3" />
                            {badge.label}
                          </span>
                        )}

                        {isInCart && !isSelected && (
                          <Badge className="rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                            <ShoppingCart className="mr-1 h-3 w-3" />
                            In Cart
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                          {variant.name ?? "Standard Package"}
                        </h3>

                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg"
                          >
                            ✓
                          </motion.div>
                        )}
                      </div>

                      {variant.description && (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          {variant.description}
                        </p>
                      )}
                    </div>

                    {netPrice !== undefined && (
                      <div className="text-right">
                        {discount > 0 && (
                          <div className="mb-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            Save {discount}%
                          </div>
                        )}

                        <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                          {symbol}
                          {netPrice.toFixed(2)}
                        </div>

                        {displayPrice !== undefined &&
                          displayPrice > netPrice && (
                            <div className="text-xs text-muted-foreground line-through">
                              {symbol}
                              {displayPrice.toFixed(2)}
                            </div>
                          )}

                        <div className="mt-1 text-[11px] text-muted-foreground">
                          per person
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {variant.duration !== null && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50/80 px-3 py-1.5 text-xs font-medium text-orange-700 backdrop-blur-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(variant.duration)}
                      </div>
                    )}

                    <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
                      <Users className="h-3.5 w-3.5" />
                      {variant.pax.min}–{variant.pax.max ?? "∞"} Guests
                    </div>

                    {variant.cancellationPolicy?.cancellable && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur-sm">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Free Cancellation
                      </div>
                    )}
                  </div>

                  {/* Bottom CTA Hint */}
                  <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Tap to view availability & booking options
                    </p>

                    <div
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                        isSelected
                          ? "bg-brand-500 text-white"
                          : "bg-muted text-muted-foreground group-hover:bg-brand-50 group-hover:text-brand-600"
                      )}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
