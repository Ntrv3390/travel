"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Loader2, CalendarDays, Clock, MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/components/ui/toaster";
import { ProductDetailProvider } from "@/context/ProductDetailContext";
import { SeatmapIframe } from "@/components/products/SeatmapIframe";
import { SeatMapPanel } from "@/components/products/SeatMapPanel";
import {
  getSeatmapAvailabilities,
  addCartItem,
  getCartSessionId,
} from "@/lib/api";
import { mutate } from "swr";
import type {
  Product, ProductVariant, IframeSeat, SeatmapValidateResponse,
  SeatmapAvailabilityDate, SeatmapAvailabilitySlot,
} from "@/types/product";

// ─── Date helpers ──────────────────────────────────────────────────────────────

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayStr() {
  const d = new Date(); return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
}
function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
function fmtLong(dateStr: string) {
  return new Date(dateStr + "T00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

// ─── Month grid for seatmap data ───────────────────────────────────────────────

interface SeatmapMonthGridProps {
  year: number;
  month: number;
  availMap: Map<string, SeatmapAvailabilityDate>;
  selectedDate: string | null;
  today: string;
  formatPrice: (n: number) => string;
  onDateClick: (dateStr: string, info: SeatmapAvailabilityDate | undefined) => void;
}

function SeatmapMonthGrid({
  year, month, availMap, selectedDate, today, formatPrice, onDateClick,
}: SeatmapMonthGridProps) {
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
        {Array.from({ length: getFirstDay(year, month) }).map((_, i) => (
          <div key={`e-${i}`} className="min-h-[34px] sm:min-h-[38px]" />
        ))}
        {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
          const day = i + 1;
          const dateStr = fmtDate(year, month, day);
          const info = availMap.get(dateStr);
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasSlots = info != null && info.slots.some(s => s.remaining > 0);
          const isUnavailable = isPast || !hasSlots;
          const availableSlots = info?.slots.filter(s => s.remaining > 0) ?? [];
          const minPrice = availableSlots.length > 0
            ? Math.min(...availableSlots.map(s => s.pricing.headoutSellingPrice))
            : null;
          const totalRemaining = availableSlots.reduce((sum, s) => sum + s.remaining, 0);
          const isLimited = hasSlots && totalRemaining < 20;
          const clickable = !isUnavailable;

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
                      : "cursor-pointer hover:bg-brand-50/70 dark:hover:bg-brand-950/20",
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
                      : "text-foreground",
              )}>
                {day}
              </span>

              {!isUnavailable && minPrice != null && (
                <span className={cn(
                  "mt-[2px] text-[7px] font-semibold leading-none sm:text-[8px]",
                  isSelected ? "text-white/80"
                    : isLimited ? "text-amber-500"
                      : "text-emerald-600 dark:text-emerald-400",
                )}>
                  {formatPrice(minPrice)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Module-level availability cache ──────────────────────────────────────────

const availCache = new Map<string, { data: SeatmapAvailabilityDate[]; exp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SeatmapBookingModalProps {
  product: Product;
  variant: ProductVariant;
  cartItemId: string | null;
  initialDate?: string | null;
  onClose: () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SeatmapBookingModal({
  product, variant, cartItemId, initialDate = null, onClose,
}: SeatmapBookingModalProps) {
  const router = useRouter();
  const { currency, formatPrice } = useCurrency();
  const { toast } = useToast();

  const step = useRef<1 | 2 | 3>(1);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);
  const setStep = (s: 1 | 2 | 3) => { step.current = s; rerender(); };

  const now = new Date();
  const initDate = initialDate ? new Date(initialDate + "T00:00") : now;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedSlots, setSelectedSlots] = useState<SeatmapAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SeatmapAvailabilitySlot | null>(null);

  // Accumulated availability across months
  const [availabilities, setAvailabilities] = useState<SeatmapAvailabilityDate[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [bgLoading, setBgLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);
  const [maxMonth, setMaxMonth] = useState<{ year: number; month: number } | null>(null);

  // fallback: starts false (try iframe first); onFallback flips it to show SeatMapPanel
  const [showFallback, setShowFallback] = useState(false);

  const [bookingLoading, setBookingLoading] = useState(false);
  const abortRef = useRef(false);

  const TODAY = todayStr();

  // ── Lock body scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Fetch availability month-by-month (same pattern as BookingModal) ────────

  useEffect(() => {
    abortRef.current = false;
    setCalLoading(true);
    setCalError(null);
    setAvailabilities([]);
    setMaxMonth(null);

    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();

    (async () => {
      for (let i = 0; i < 18; i++) {
        if (abortRef.current) break;
        const m = addMonths(baseYear, baseMonth, i);
        const mStart = fmtDate(m.year, m.month, 1);
        const mEnd = fmtDate(m.year, m.month, getDaysInMonth(m.year, m.month));
        const startDate = mStart < TODAY ? TODAY : mStart;

        const cacheKey = `${product.id}:${variant.id}:${currency}:${startDate}:${mEnd}`;
        let data: SeatmapAvailabilityDate[];
        const cached = availCache.get(cacheKey);
        if (cached && Date.now() < cached.exp) {
          data = cached.data;
        } else {
          const result = await getSeatmapAvailabilities(String(product.id), variant.id, {
            currencyCode: currency, startDate, endDate: mEnd,
          });
          if (abortRef.current) break;
          if (result.error) {
            if (i === 0) setCalError(result.error);
            break;
          }
          data = result.data?.availabilities ?? [];
          availCache.set(cacheKey, { data, exp: Date.now() + CACHE_TTL });
        }

        if (data.length > 0) setAvailabilities(prev => [...prev, ...data]);
        if (i === 0) { setCalLoading(false); setBgLoading(true); }

        const hasOpen = data.some(d => d.slots.some(s => s.remaining > 0));
        if (hasOpen) {
          setMaxMonth({ year: m.year, month: m.month });
        } else {
          break;
        }
      }
      setCalLoading(false);
      setBgLoading(false);
    })();

    return () => { abortRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, variant.id, currency]);

  // ── Calendar navigation ──────────────────────────────────────────────────────

  const m2 = addMonths(viewYear, viewMonth, 1);
  const isPrevDisabled = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const nextPairStart = addMonths(viewYear, viewMonth, 2);
  const isNextDisabled = !bgLoading && maxMonth != null && (
    nextPairStart.year > maxMonth.year ||
    (nextPairStart.year === maxMonth.year && nextPairStart.month > maxMonth.month)
  );

  const goBack = () => {
    const prev = addMonths(viewYear, viewMonth, -2);
    setViewYear(prev.year); setViewMonth(prev.month);
    setSelectedDate(null); setSelectedSlots([]);
  };
  const goForward = () => {
    if (isNextDisabled) return;
    const next = addMonths(viewYear, viewMonth, 2);
    setViewYear(next.year); setViewMonth(next.month);
    setSelectedDate(null); setSelectedSlots([]);
  };

  const availMap = new Map<string, SeatmapAvailabilityDate>();
  for (const a of availabilities) availMap.set(a.date, a);

  const handleDateClick = (dateStr: string, info: SeatmapAvailabilityDate | undefined) => {
    if (!info || dateStr < TODAY) return;
    const open = info.slots.filter(s => s.remaining > 0);
    if (open.length === 0) return;
    setSelectedDate(dateStr);
    setSelectedSlots(info.slots);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSlotClick = (slot: SeatmapAvailabilitySlot) => {
    if (slot.remaining <= 0) return;
    setSelectedSlot(slot);
    setStep(3);
  };

  // ── Cart after seat confirmation ─────────────────────────────────────────────

  const handleSeatsConfirmed = useCallback(
    async (seats: IframeSeat[], validation: SeatmapValidateResponse) => {
      if (seats.length === 0) return;
      setBookingLoading(true);
      try {
        const sessionId = getCartSessionId();
        const totalPrice = validation.seats.reduce(
          (sum, s) => sum + (s.pricing?.headoutSellingPrice ?? 0), 0,
        );
        const imageUrl =
          product.media?.find(m => m.type === "IMAGE")?.url?.replace(/^\/\//, "https://") ?? "";

        const result = await addCartItem(sessionId, {
          experienceId: String(product.id),
          productId: String(product.id),
          variantId: String(variant.id),
          inventoryId: String(validation.inventoryId),
          inventoryType: "SVG",
          inventorySeatIds: seats.map(s => s.seatCode),
          date: validation.date,
          startDateTime: `${validation.date}T${validation.startTime}`,
          adults: seats.length,
          children: 0,
          guestCounts: { ADULT: seats.length },
          title: variant.name ?? product.name,
          priceAmount: totalPrice,
          currency: validation.currencyCode,
          imageUrl,
        });

        mutate(["/api/v1/cart", sessionId]);

        if (result.error || !result.data) {
          toast({ title: "Booking failed", description: result.error ?? "Could not add to cart.", variant: "error" });
          return;
        }

        const raw = result.data as unknown as Record<string, unknown>;
        const cart = (raw.data as Record<string, unknown> ?? raw) as { items?: Array<Record<string, unknown>> };
        const newItem = cart.items?.find(
          i => i.variantId === String(variant.id) && i.inventoryId === String(validation.inventoryId),
        );
        const itemId = newItem?.id ?? cart.items?.[cart.items.length - 1]?.id;
        if (itemId) { router.push(`/checkout?cartItemId=${itemId}`); }
        else { router.push("/cart"); }
        onClose();
      } catch (err) {
        toast({
          title: "Booking failed",
          description: err instanceof Error ? err.message : "Could not process booking.",
          variant: "error",
        });
      } finally {
        setBookingLoading(false);
      }
    },
    [product, variant, router, onClose, toast],
  );

  // ── Labels ───────────────────────────────────────────────────────────────────

  const stepLabel = step.current === 1 ? "Pick a date" : step.current === 2 ? "Choose a time" : "Select your seats";
  const imageUrl = product.media?.find(m => m.type === "IMAGE")?.url?.replace(/^\/\//, "https://") ?? "";

  // ─── Render ───────────────────────────────────────────────────────────────────

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
          {/* Drag handle (mobile) */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20 sm:hidden" />

          {/* Progress bar */}
          <div className="flex gap-1.5 px-5 pt-3 pb-1">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  step.current >= s ? "bg-brand-500" : "bg-muted",
                )}
              />
            ))}
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
            <div className="flex items-center gap-2.5">
              {step.current > 1 && (
                <button
                  onClick={() => setStep((step.current - 1) as 1 | 2 | 3)}
                  aria-label="Back"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Step {step.current} of 3 · {variant.name ?? "Package"}
                </p>
                <h3 className="font-bold tracking-tight">{stepLabel}</h3>
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
              initialGuests={null}
            >

              {/* ── Step 1: Calendar ──────────────────────────────────────── */}
              {step.current === 1 && (
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">

                    {/* Nav bar — same as BookingModal */}
                    <div className="flex items-center border-b border-border/50 px-3 py-2.5">
                      <button
                        onClick={goBack}
                        disabled={isPrevDisabled}
                        aria-label="Previous two months"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>

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
                          <button
                            onClick={() => {
                              availCache.clear();
                              setCalError(null);
                              setCalLoading(true);
                            }}
                            className="text-xs text-brand-500 underline underline-offset-2"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Two-month grid — identical layout to BookingModal */}
                          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                            <div className="pb-4 sm:pb-0 sm:pr-4">
                              <SeatmapMonthGrid
                                year={viewYear} month={viewMonth}
                                availMap={availMap} selectedDate={selectedDate}
                                today={TODAY} formatPrice={formatPrice}
                                onDateClick={handleDateClick}
                              />
                            </div>
                            <div className="border-t border-border/50 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                              <SeatmapMonthGrid
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

              {/* ── Step 2: Time slot picker ──────────────────────────────── */}
              {step.current === 2 && selectedDate && (
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

                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {selectedSlots.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                        <Clock className="h-5 w-5 opacity-40" />
                        No time slots available for this date.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="mb-3 text-xs text-muted-foreground">
                          {selectedSlots.length} time slot{selectedSlots.length !== 1 ? "s" : ""} available
                        </p>
                        {selectedSlots.map((slot) => {
                          const soldOut = slot.remaining <= 0;
                          return (
                            <button
                              key={slot.startTime}
                              disabled={soldOut}
                              onClick={() => handleSlotClick(slot)}
                              className={cn(
                                "w-full overflow-hidden rounded-2xl border text-left transition-all",
                                soldOut
                                  ? "cursor-not-allowed border-border/40 bg-muted/10 opacity-50"
                                  : "cursor-pointer border-border/60 bg-background shadow-sm hover:border-brand-300 hover:bg-brand-50/30 active:scale-[0.99]",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/30">
                                    <Clock className="h-4 w-4 text-brand-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold tabular-nums text-foreground">
                                      {formatTime(slot.startTime)}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                      from {formatPrice(slot.pricing.headoutSellingPrice)} / seat
                                      {slot.remaining > 0 ? ` · ${slot.remaining} remaining` : ""}
                                    </p>
                                  </div>
                                </div>
                                {soldOut ? (
                                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">
                                    Sold out
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-600 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/30 dark:text-brand-400 dark:ring-brand-800">
                                    Select →
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 3: Seat map ──────────────────────────────────────── */}
              {step.current === 3 && selectedDate && selectedSlot && (
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Pinned slot banner */}
                  <div className="flex shrink-0 items-center gap-2.5 border-b border-border/50 bg-background px-5 py-2.5">
                    <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="flex-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {fmtLong(selectedDate)} · {formatTime(selectedSlot.startTime)}
                    </span>
                    <button
                      onClick={() => setStep(2)}
                      className="shrink-0 text-xs font-semibold text-brand-500 underline-offset-2 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                    {showFallback ? (
                      <SeatMapPanel
                        productId={String(product.id)}
                        variantId={variant.id}
                        selectedDate={selectedDate}
                        slots={selectedSlots}
                        currency={currency}
                      />
                    ) : (
                      <SeatmapIframe
                        productId={String(product.id)}
                        variantId={variant.id}
                        date={selectedDate}
                        startTime={selectedSlot.startTime}
                        onSeatsConfirmed={handleSeatsConfirmed}
                        onFallback={() => setShowFallback(true)}
                        className="min-h-[440px]"
                      />
                    )}
                  </div>
                </div>
              )}

            </ProductDetailProvider>
          </div>

          {/* Booking in progress */}
          <AnimatePresence>
            {bookingLoading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex shrink-0 items-center justify-center gap-2 border-t border-border/60 px-5 py-3"
              >
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                <span className="text-sm text-muted-foreground">Adding to cart…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
