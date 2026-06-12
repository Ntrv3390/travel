"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useProductDetail } from "@/context/ProductDetailContext";
import { getSeatmapAvailabilities } from "@/lib/api";
import { SeatMapPanel } from "@/components/products/SeatMapPanel";
import { AvailabilitySection } from "@/components/products/pdp/AvailabilitySection";
import type { SeatmapAvailabilityDate, SeatmapAvailabilitySlot } from "@/types/product";
import { cn } from "@/lib/utils";

const DAY_NAMES_MIN = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Module-level response cache: key → { data, expiresAt }
const availCache = new Map<string, { data: SeatmapAvailabilityDate[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): SeatmapAvailabilityDate[] | null {
  const entry = availCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { availCache.delete(key); return null; }
  return entry.data;
}
function setCached(key: string, data: SeatmapAvailabilityDate[]) {
  availCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function todayStr() {
  const d = new Date();
  return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

interface SeatMapSectionProps {
  className?: string;
}

export function SeatMapSection({ className }: SeatMapSectionProps) {
  const { productId, variantId, initialDate } = useProductDetail();
  const { currency, formatPrice } = useCurrency();

  // When Headout says this product doesn't support the seatmap API, fall back transparently
  const [useNormalFlow, setUseNormalFlow] = useState(false);

  const [availabilities, setAvailabilities] = useState<SeatmapAvailabilityDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [selectedSlots, setSelectedSlots] = useState<SeatmapAvailabilitySlot[]>([]);

  const monthStart = formatDateStr(viewYear, viewMonth, 1);
  const endDate = formatDateStr(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth));
  const TODAY = todayStr();
  const startDate = monthStart < TODAY ? TODAY : monthStart;

  const fetchAvailabilities = useCallback(async () => {
    const cacheKey = `${productId}:${variantId}:${currency}:${startDate}:${endDate}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setAvailabilities(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getSeatmapAvailabilities(productId, variantId, {
      currencyCode: currency,
      startDate,
      endDate,
    });
    if (result.error) {
      // "not a seatmap product" → silently fall back to the normal availability UI
      const errLower = result.error.toLowerCase();
      if (
        errLower.includes("not a seatmap") ||
        errLower.includes("e_product_not_found") ||
        errLower.includes("product not found")
      ) {
        setUseNormalFlow(true);
        setLoading(false);
        return;
      }
      setError(result.error);
    } else {
      const data = result.data?.availabilities ?? [];
      setCached(cacheKey, data);
      setAvailabilities(data);
    }
    setLoading(false);
  }, [productId, variantId, currency, startDate, endDate]);

  useEffect(() => { fetchAvailabilities(); }, [fetchAvailabilities]);

  useEffect(() => {
    if (initialDate && availabilities.length > 0 && !selectedSlots.length) {
      const match = availabilities.find((a) => a.date === initialDate);
      if (match && match.slots.some((s) => s.remaining > 0)) {
        setSelectedDate(initialDate);
        setSelectedSlots(match.slots);
      }
    }
  }, [initialDate, availabilities, selectedSlots.length]);

  // If this product doesn't support the seatmap API, render the normal section seamlessly
  if (useNormalFlow) {
    return <AvailabilitySection className={className} />;
  }

  const handleDateClick = (dateStr: string, info: SeatmapAvailabilityDate | undefined) => {
    if (dateStr < TODAY) return;
    if (!info || !info.slots.some((s) => s.remaining > 0)) return;
    setSelectedDate(dateStr);
    setSelectedSlots(info.slots);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
    setSelectedSlots([]);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
    setSelectedSlots([]);
  };

  const isPrevMonthDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const availMap = new Map<string, SeatmapAvailabilityDate>();
  for (const a of availabilities) availMap.set(a.date, a);

  return (
    <section id="availability" className={cn("scroll-mt-20 lg:sticky lg:top-24 lg:z-30", className)}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
        </span>
        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          Choose Date &amp; Seats
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-5 sm:py-4">
          <span className="text-sm font-semibold">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              disabled={isPrevMonthDisabled}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-sm text-rose-500">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAvailabilities}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : availabilities.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No availability found for this month.
            </p>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7">
                {DAY_NAMES_MIN.map((d, i) => (
                  <div
                    key={i}
                    className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[11px]"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: getFirstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
                  <div key={`e-${i}`} className="min-h-[58px] sm:min-h-[64px]" />
                ))}

                {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDateStr(viewYear, viewMonth, day);
                  const info = availMap.get(dateStr);
                  const isPast = dateStr < TODAY;
                  const isToday = dateStr === TODAY;
                  const isSelected = dateStr === selectedDate;
                  const hasAvailableSlots = info != null && info.slots.some((s) => s.remaining > 0);
                  const isClosed = !hasAvailableSlots;
                  const minPrice = info
                    ? Math.min(...info.slots.filter((s) => s.remaining > 0).map((s) => s.pricing.headoutSellingPrice))
                    : null;
                  const totalRemaining = info
                    ? info.slots.reduce((sum, s) => sum + s.remaining, 0)
                    : 0;
                  const isLimited = hasAvailableSlots && totalRemaining < 20;
                  const clickable = !isPast && hasAvailableSlots;

                  return (
                    <div
                      key={day}
                      onClick={() => clickable && handleDateClick(dateStr, info)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && clickable)
                          handleDateClick(dateStr, info);
                      }}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      aria-label={`${day} ${MONTH_NAMES[viewMonth]}${isSelected ? ", selected" : ""}`}
                      aria-pressed={isSelected || undefined}
                      className={cn(
                        "group flex min-h-[58px] flex-col items-center justify-center rounded-xl px-0.5 py-2 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:min-h-[64px] sm:px-1 sm:py-2",
                        isSelected
                          ? "bg-brand-500 shadow-md"
                          : isPast
                            ? "opacity-30"
                            : isClosed
                              ? "opacity-40 cursor-default"
                              : isToday
                                ? "bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-950/30 cursor-pointer"
                                : "cursor-pointer hover:bg-brand-50/60 dark:hover:bg-brand-950/20",
                      )}
                    >
                      <span className={cn(
                        "text-xs font-semibold leading-none sm:text-sm",
                        isSelected ? "text-white"
                          : isToday ? "text-brand-600 dark:text-brand-400"
                            : isPast || isClosed ? "text-muted-foreground"
                              : "text-foreground",
                      )}>
                        {day}
                      </span>

                      {!isPast && minPrice != null && !isClosed && (
                        <span className={cn(
                          "mt-1 text-[9px] font-semibold leading-none sm:text-[10px]",
                          isSelected ? "text-white/85"
                            : isLimited ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400",
                        )}>
                          {formatPrice(minPrice)}
                        </span>
                      )}

                      {!isPast && isClosed && (
                        <span className="mt-1 text-[9px] text-rose-400 sm:text-[9px]">Sold out</span>
                      )}

                      {!isPast && !isClosed && isLimited && (
                        <span className={cn(
                          "mt-0.5 text-[9px] font-medium",
                          isSelected ? "text-white/75" : "text-amber-500",
                        )}>
                          {totalRemaining} left
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-[11px] text-muted-foreground sm:gap-5 sm:pt-3.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Limited
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Sold out
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedDate && selectedSlots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4"
        >
          <SeatMapPanel
            productId={productId}
            variantId={variantId}
            selectedDate={selectedDate}
            slots={selectedSlots}
            currency={currency}
          />
        </motion.div>
      )}
    </section>
  );
}
