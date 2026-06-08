"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useProductDetail } from "@/context/ProductDetailContext";
import { getVariantAvailabilities, getSlotInventory } from "@/lib/api";
import { SlotPanel } from "@/components/products/SlotPanel";
import type { VariantAvailability, SlotItem } from "@/types/product";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

// DAY_NAMES_MIN has duplicate "T" (Thu/Tue) and "S" (Sat/Sun) — intentional for brevity,
// but note that React uses the array index as key below, which is fine here.
const DAY_NAMES_MIN = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface AvailabilitySectionProps {
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AvailabilitySection({ className }: AvailabilitySectionProps) {
  const { productId, variantId, initialDate, pax } = useProductDetail();
  const { currency, formatPrice } = useCurrency();

  const [availabilities, setAvailabilities] = useState<VariantAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);

  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);

  // ── Fetch availabilities ──────────────────────────────────────────────────

  const monthStart = formatDateStr(viewYear, viewMonth, 1);
  const endDate = formatDateStr(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth));
  const startDate = monthStart < todayStr() ? todayStr() : monthStart;

  const fetchAvailabilities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getVariantAvailabilities(productId, variantId, {
      currencyCode: currency,
      startDate,
      endDate,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setAvailabilities(result.data?.availabilities ?? []);
    }
    setLoading(false);
  }, [productId, variantId, currency, startDate, endDate]);

  useEffect(() => { fetchAvailabilities(); }, [fetchAvailabilities]);

  // ── Fetch slots ───────────────────────────────────────────────────────────

  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);
    // BUG NOTE (pre-existing): end time is T23:59 — misses the last minute of the day.
    // Consider using T23:59:59 or T24:00 / next-day T00:00 depending on the API contract.
    const result = await getSlotInventory(variantId, `${date}T00:00`, `${date}T23:59`, currency);
    if (result.error) {
      setSlotsError(result.error);
    } else {
      setSlots(result.data?.items ?? []);
    }
    setSlotsLoading(false);
  }, [variantId, currency]);

  useEffect(() => {
    if (initialDate && availabilities.length > 0 && !slots.length && !slotsLoading) {
      const match = availabilities.find((a) => a.date === initialDate);
      if (match && match.availability !== "CLOSED") fetchSlots(initialDate);
    }
  }, [initialDate, availabilities, fetchSlots, slots.length, slotsLoading]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const TODAY = todayStr();

  const handleDateClick = (dateStr: string, info: VariantAvailability | undefined) => {
    if (dateStr < TODAY) return;
    if (!info || info.availability === "CLOSED") return;
    setSelectedDate(dateStr);
    fetchSlots(dateStr);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
    setSlots([]);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
    setSlots([]);
  };

  // Prevent navigating to months before the current one
  const isPrevMonthDisabled =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const availMap = new Map<string, VariantAvailability>();
  for (const a of availabilities) availMap.set(a.date, a);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <section
      ref={sectionRef}
      id="availability"
      className={cn("scroll-mt-20 lg:sticky lg:top-24 lg:z-30", className)}
    >
      {/* Section heading */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
          <Calendar className="h-3.5 w-3.5 text-brand-500" />
        </span>
        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          Check Availability
        </h2>
      </div>

      {/* ── Full month calendar (all screen sizes) ────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">

        {/* Calendar header */}
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

        {/* Calendar body */}
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
              {/* Day-name header row */}
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

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Leading empty cells */}
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
                  const isClosed = !info || info.availability === "CLOSED";
                  const isLimited = info?.availability === "LIMITED";
                  const clickable = !isPast && !isClosed;
                  const price = info?.pricing?.headoutSellingPrice;

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
                                : "cursor-pointer hover:bg-brand-50/60 dark:hover:bg-brand-950/20"
                      )}
                    >
                      {/* Date number */}
                      <span className={cn(
                        "text-xs font-semibold leading-none sm:text-sm",
                        isSelected
                          ? "text-white"
                          : isToday
                            ? "text-brand-600 dark:text-brand-400"
                            : isPast || isClosed
                              ? "text-muted-foreground"
                              : "text-foreground"
                      )}>
                        {day}
                      </span>

                      {/* Price */}
                      {!isPast && price != null && !isClosed && (
                        <span className={cn(
                          "mt-1 text-[9px] font-semibold leading-none sm:text-[10px]",
                          isSelected
                            ? "text-white/85"
                            : isLimited
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {formatPrice(price)}
                        </span>
                      )}

                      {/* Sold out */}
                      {!isPast && isClosed && (
                        <span className="mt-1 text-[9px] text-rose-400 sm:text-[9px]">Sold out</span>
                      )}

                      {/* Low stock */}
                      {!isPast && !isClosed && info?.remaining != null && info.remaining < 10 && (
                        <span className={cn(
                          "mt-0.5 text-[9px] font-medium",
                          isSelected ? "text-white/75" : "text-amber-500"
                        )}>
                          {info.remaining} left
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
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

      {/* ── Slot panel ────────────────────────────────────────────────────── */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4"
        >
          <SlotPanel
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            onRetry={() => fetchSlots(selectedDate)}
            selectedDate={selectedDate}
            paxMin={pax?.min ?? 1}
            paxMax={pax?.max ?? null}
          />
        </motion.div>
      )}
    </section>
  );
}