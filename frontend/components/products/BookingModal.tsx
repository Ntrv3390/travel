"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Loader2, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { ProductDetailProvider } from "@/context/ProductDetailContext";
import { SlotPanel } from "@/components/products/SlotPanel";
import { getVariantAvailabilities, getSlotInventory } from "@/lib/api";
import type { Product, ProductVariant, VariantAvailability, SlotItem } from "@/types/product";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayStr() {
  const d = new Date();
  return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
}
function fmtLong(dateStr: string) {
  return new Date(dateStr + "T00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// ─── Month grid ───────────────────────────────────────────────────────────────

interface MonthGridProps {
  year: number;
  month: number;
  availMap: Map<string, VariantAvailability>;
  selectedDate: string | null;
  today: string;
  formatPrice: (n: number) => string;
  onDateClick: (dateStr: string, info: VariantAvailability | undefined) => void;
}

function MonthGrid({ year, month, availMap, selectedDate, today, formatPrice, onDateClick }: MonthGridProps) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-7">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: getFirstDayOfMonth(year, month) }).map((_, i) => (
          <div key={`e-${i}`} className="min-h-[34px] sm:min-h-[38px]" />
        ))}
        {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
          const day = i + 1;
          const dateStr = fmtDate(year, month, day);
          const info = availMap.get(dateStr);
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          // Only treat as closed when API explicitly says CLOSED — not when data is absent
          const isExplicitlyClosed = info?.availability === "CLOSED";
          const isUnavailable = isPast || isExplicitlyClosed || !info;
          const isLimited = info?.availability === "LIMITED";
          const clickable = !isUnavailable;
          const price = info?.pricing?.headoutSellingPrice;

          return (
            <div
              key={day}
              onClick={() => clickable && onDateClick(dateStr, info)}
              onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && clickable) onDateClick(dateStr, info); }}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={`${day} ${MONTH_NAMES[month]}${isSelected ? ", selected" : ""}`}
              aria-pressed={isSelected || undefined}
              className={cn(
                "flex min-h-[34px] flex-col items-center justify-center rounded-lg px-0 py-0.5 text-center transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                "sm:min-h-[38px]",
                isSelected
                  ? "bg-brand-500 shadow-sm"
                  : isUnavailable
                    ? "cursor-default opacity-25"
                    : isToday
                      ? "cursor-pointer bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-950/30"
                      : "cursor-pointer hover:bg-brand-50/70 dark:hover:bg-brand-950/20"
              )}
            >
              <span className={cn(
                "text-[11px] font-semibold leading-none sm:text-xs",
                isSelected
                  ? "text-white"
                  : isToday && !isUnavailable
                    ? "text-brand-600 dark:text-brand-400"
                    : isUnavailable
                      ? "text-muted-foreground"
                      : "text-foreground"
              )}>
                {day}
              </span>

              {!isUnavailable && price != null && (
                <span className={cn(
                  "mt-[2px] text-[7px] font-semibold leading-none sm:text-[8px]",
                  isSelected ? "text-white/80"
                    : isLimited ? "text-amber-500"
                      : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {formatPrice(price)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BookingModalProps {
  product: Product;
  variant: ProductVariant;
  cartItemId: string | null;
  initialDate?: string | null;
  initialSlotId?: string | null;
  initialGuests?: Record<string, number> | null;
  onClose: () => void;
}

export function BookingModal({
  product, variant, cartItemId,
  initialDate = null, initialSlotId = null,
  initialGuests = null, onClose,
}: BookingModalProps) {
  const { currency, formatPrice } = useCurrency();

  // If we have a pre-filled date from cart, jump straight to step 2
  const [step, setStep] = useState<1 | 2>(initialDate ? 2 : 1);

  // Calendar navigation — start at the pre-filled date's month if available
  const now = new Date();
  const initMonth = initialDate ? new Date(initialDate + "T00:00") : now;
  const [viewYear, setViewYear] = useState(initMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initMonth.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);

  // Availability data — accumulated across all fetched months
  const [availabilities, setAvailabilities] = useState<VariantAvailability[]>([]);
  const [calLoading, setCalLoading] = useState(true);   // true until first month loads
  const [bgLoading, setBgLoading] = useState(false);    // true while fetching subsequent months
  const [calError, setCalError] = useState<string | null>(null);
  // Last month pair that had open slots — used to disable forward nav
  const [maxMonth, setMaxMonth] = useState<{ year: number; month: number } | null>(null);

  // Slots
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const abortRef = useRef(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // On mount: fetch month-by-month until Headout returns no open slots (max 18 months)
  useEffect(() => {
    abortRef.current = false;
    setCalLoading(true);
    setCalError(null);
    setAvailabilities([]);
    setMaxMonth(null);

    const today = todayStr();
    const baseYear = new Date().getFullYear();
    const baseMonth = new Date().getMonth();

    (async () => {
      for (let i = 0; i < 18; i++) {
        if (abortRef.current) break;

        const m = addMonths(baseYear, baseMonth, i);
        const mStart = fmtDate(m.year, m.month, 1);
        const mEnd = fmtDate(m.year, m.month, getDaysInMonth(m.year, m.month));
        const startDate = mStart < today ? today : mStart;

        const result = await getVariantAvailabilities(String(product.id), variant.id, {
          currencyCode: currency,
          startDate,
          endDate: mEnd,
        });

        if (abortRef.current) break;

        if (result.error) {
          if (i === 0) setCalError(result.error);
          break;
        }

        const avails = result.data?.availabilities ?? [];
        const openCount = avails.filter(a => a.availability !== "CLOSED").length;

        // Append to accumulated state — calendar updates reactively
        if (avails.length > 0) {
          setAvailabilities(prev => [...prev, ...avails]);
        }

        // First month loaded: hide main spinner, show background indicator
        if (i === 0) {
          setCalLoading(false);
          setBgLoading(true);
        }

        if (openCount > 0) {
          // Track the furthest month with open slots
          setMaxMonth({ year: m.year, month: m.month });
        } else {
          // First month with zero open slots → Headout has no more availability
          break;
        }
      }

      setCalLoading(false);
      setBgLoading(false);
    })();

    return () => { abortRef.current = true; };
  }, [product.id, variant.id, currency]);

  // Fetch time slots for a selected date
  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);
    const result = await getSlotInventory(variant.id, `${date}T00:00`, `${date}T23:59`, currency);
    if (result.error) setSlotsError(result.error);
    else setSlots(result.data?.items ?? []);
    setSlotsLoading(false);
  }, [variant.id, currency]);

  // Auto-fetch slots when modal opens pre-filled at step 2
  useEffect(() => {
    if (initialDate) fetchSlots(initialDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build availability lookup map
  const availMap = new Map<string, VariantAvailability>();
  for (const a of availabilities) availMap.set(a.date, a);

  // Second month in the current pair
  const m2 = addMonths(viewYear, viewMonth, 1);
  const TODAY = todayStr();

  // Prev disabled: can't go before today's month
  const isPrevDisabled = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // Next disabled: next pair starts after the last month with open slots
  const nextPairStart = addMonths(viewYear, viewMonth, 2);
  const isNextDisabled = !bgLoading && maxMonth != null && (
    nextPairStart.year > maxMonth.year ||
    (nextPairStart.year === maxMonth.year && nextPairStart.month > maxMonth.month)
  );

  const goBack = () => {
    const prev = addMonths(viewYear, viewMonth, -2);
    setViewYear(prev.year); setViewMonth(prev.month);
    setSelectedDate(null); setSlots([]);
  };
  const goForward = () => {
    if (isNextDisabled) return;
    const next = addMonths(viewYear, viewMonth, 2);
    setViewYear(next.year); setViewMonth(next.month);
    setSelectedDate(null); setSlots([]);
  };

  const handleDateClick = (dateStr: string, info: VariantAvailability | undefined) => {
    if (!info || info.availability === "CLOSED" || dateStr < TODAY) return;
    setSelectedDate(dateStr);
    fetchSlots(dateStr);
    setStep(2);
  };

  const imageUrl =
    product.media?.find((m) => m.type === "IMAGE")?.url?.replace(/^\/\//, "https://") ?? "";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0.9 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 380 }}
          className="flex w-full flex-col bg-background shadow-2xl max-h-[92svh] rounded-t-3xl sm:max-w-2xl sm:rounded-3xl"
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20 sm:hidden" />

          {/* Progress bar */}
          <div className="flex gap-1.5 px-5 pt-3 pb-1">
            {([1, 2] as const).map((s) => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all duration-300", step >= s ? "bg-brand-500" : "bg-muted")} />
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
            <div className="flex items-center gap-2.5">
              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  aria-label="Back to calendar"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Step {step} of 2 · {variant.name ?? "Package"}
                </p>
                <h3 className="font-bold tracking-tight">
                  {step === 1 ? "Pick a date" : "Choose a time & guests"}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose} aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProductDetailProvider
              productId={String(product.id)}
              productName={product.name}
              variantId={variant.id}
              variantName={variant.name ?? ""}
              imageUrl={imageUrl}
              cartItemId={cartItemId}
              initialDate={selectedDate}
              initialGuests={initialGuests}
              pax={variant.pax}
              inputFields={variant.inputFields}
            >

              {/* ── Step 1: Calendar ── */}
              {step === 1 && (
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">

                    {/* Nav bar */}
                    <div className="flex items-center border-b border-border/50 px-3 py-2.5">
                      <button
                        onClick={goBack}
                        disabled={isPrevDisabled}
                        aria-label="Previous two months"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>

                      {/* Month titles — aligned to each column */}
                      <div className="grid flex-1 grid-cols-2">
                        <span className="text-center text-xs font-bold sm:text-sm">
                          {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <span className="text-center text-xs font-bold sm:text-sm">
                          {MONTH_NAMES[m2.month]} {m2.year}
                        </span>
                      </div>

                      <button
                        onClick={goForward}
                        disabled={isNextDisabled}
                        aria-label="Next two months"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        {bgLoading
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin opacity-50" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>

                    {/* Calendar body */}
                    <div className="p-3 sm:p-4">
                      {calLoading ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-14">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Loading availability…</p>
                        </div>
                      ) : calError ? (
                        <div className="flex flex-col items-center gap-3 py-10">
                          <p className="text-sm text-rose-500">{calError}</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                            <div className="pb-4 sm:pb-0 sm:pr-4">
                              <MonthGrid
                                year={viewYear} month={viewMonth}
                                availMap={availMap} selectedDate={selectedDate}
                                today={TODAY} formatPrice={formatPrice}
                                onDateClick={handleDateClick}
                              />
                            </div>
                            <div className="border-t border-border/50 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                              <MonthGrid
                                year={m2.year} month={m2.month}
                                availMap={availMap} selectedDate={selectedDate}
                                today={TODAY} formatPrice={formatPrice}
                                onDateClick={handleDateClick}
                              />
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="mt-3 flex flex-wrap gap-3 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Available</span>
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Limited</span>
                            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />Unavailable</span>
                            {bgLoading && (
                              <span className="ml-auto flex items-center gap-1 text-muted-foreground/60">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                Loading more dates…
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Slots ── */}
              {step === 2 && selectedDate && (
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Pinned date banner */}
                  <div className="flex shrink-0 items-center gap-2.5 border-b border-border/50 bg-background px-5 py-2.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="flex-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {fmtLong(selectedDate)}
                    </span>
                    <button
                      onClick={() => setStep(1)}
                      className="shrink-0 text-xs font-semibold text-brand-500 underline-offset-2 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Scrollable slot content */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    <SlotPanel
                      slots={slots} loading={slotsLoading} error={slotsError}
                      onRetry={() => fetchSlots(selectedDate!)} selectedDate={selectedDate!}
                      paxMin={variant.pax?.min ?? 1} paxMax={variant.pax?.max ?? null}
                      cartSlotId={initialSlotId}
                      onAddedToCart={onClose}
                      compact
                    />
                  </div>
                </div>
              )}

            </ProductDetailProvider>
          </div>
        </motion.div>
      </div>
    </>
  );
}
