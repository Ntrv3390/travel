"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Loader2, Clock, MapPin, ArrowLeft,
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
  checkSeatmapIframeAccess,
  addCartItem,
  getCartSessionId,
} from "@/lib/api";
import { mutate } from "swr";
import type {
  Product, ProductVariant, IframeSeat, SeatmapValidateResponse,
  SeatmapAvailabilityDate, SeatmapAvailabilitySlot,
} from "@/types/product";

// ─── Date helpers ─────────────────────────────────────────────────────────────

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
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

const availCache = new Map<string, { data: SeatmapAvailabilityDate[]; exp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SeatmapBookingModalProps {
  product: Product;
  variant: ProductVariant;
  cartItemId: string | null;
  initialDate?: string | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SeatmapBookingModal({
  product,
  variant,
  cartItemId,
  initialDate,
  onClose,
}: SeatmapBookingModalProps) {
  const router = useRouter();
  const { currency, formatPrice } = useCurrency();
  const { toast } = useToast();

  // Step: "date" = calendar + slot picker, "seatmap" = seat selection
  const [step, setStep] = useState<"date" | "seatmap">("date");

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [selectedSlots, setSelectedSlots] = useState<SeatmapAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SeatmapAvailabilitySlot | null>(null);
  const [availabilities, setAvailabilities] = useState<SeatmapAvailabilityDate[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [calError, setCalError] = useState<string | null>(null);

  // Iframe access state (null = unknown, bool = checked)
  const [iframeAllowed, setIframeAllowed] = useState<boolean | null>(null);
  const iframeCheckDone = useRef(false);

  // Booking state (after seats confirmed)
  const [bookingLoading, setBookingLoading] = useState(false);

  const TODAY = todayStr();
  const monthStart = fmtDate(viewYear, viewMonth, 1);
  const endDate = fmtDate(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth));
  const startDate = monthStart < TODAY ? TODAY : monthStart;

  // ── Fetch availability for current calendar month ─────────────────────────

  const fetchAvail = useCallback(async () => {
    const cacheKey = `${product.id}:${variant.id}:${currency}:${startDate}:${endDate}`;
    const cached = availCache.get(cacheKey);
    if (cached && Date.now() < cached.exp) {
      setAvailabilities(cached.data);
      setCalLoading(false);
      return;
    }
    setCalLoading(true);
    setCalError(null);
    const result = await getSeatmapAvailabilities(String(product.id), variant.id, {
      currencyCode: currency,
      startDate,
      endDate,
    });
    if (result.error) {
      setCalError(result.error);
    } else {
      const data = result.data?.availabilities ?? [];
      availCache.set(cacheKey, { data, exp: Date.now() + CACHE_TTL });
      setAvailabilities(data);
    }
    setCalLoading(false);
  }, [product.id, variant.id, currency, startDate, endDate]);

  useEffect(() => { fetchAvail(); }, [fetchAvail]);

  // ── Preflight iframe access check (runs once, in background) ─────────────

  useEffect(() => {
    if (iframeCheckDone.current) return;
    iframeCheckDone.current = true;
    checkSeatmapIframeAccess(String(product.id)).then(({ allowed }) => {
      setIframeAllowed(allowed);
    });
  }, [product.id]);

  // ── Lock body scroll while modal is open ─────────────────────────────────

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Calendar interaction ──────────────────────────────────────────────────

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

  const isPrevDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const availMap = new Map<string, SeatmapAvailabilityDate>();
  for (const a of availabilities) availMap.set(a.date, a);

  const handleDateClick = (dateStr: string, info: SeatmapAvailabilityDate | undefined) => {
    if (!info || !info.slots.some(s => s.remaining > 0)) return;
    setSelectedDate(dateStr);
    setSelectedSlots(info.slots);
  };

  const handleSlotClick = (slot: SeatmapAvailabilitySlot) => {
    if (slot.remaining <= 0) return;
    setSelectedSlot(slot);
    setStep("seatmap");
  };

  // ── After seat confirmation: add to cart ─────────────────────────────────

  const handleSeatsConfirmed = useCallback(
    async (seats: IframeSeat[], validation: SeatmapValidateResponse) => {
      if (seats.length === 0) return;
      setBookingLoading(true);
      try {
        const sessionId = getCartSessionId();
        const totalPrice = validation.seats.reduce(
          (sum, s) => sum + (s.pricing?.headoutSellingPrice ?? 0), 0,
        );
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
          imageUrl: product.media?.[0]?.url ?? "",
        });
        mutate(["/api/v1/cart", sessionId]);
        if (result.error || !result.data) {
          toast({
            title: "Booking failed",
            description: result.error ?? "Could not add to cart.",
            variant: "error",
          });
          return;
        }
        const raw = result.data as unknown as Record<string, unknown>;
        const cart = (raw.data as Record<string, unknown> ?? raw) as {
          items?: Array<Record<string, unknown>>;
        };
        const newItem = cart.items?.find(
          (i) =>
            i.variantId === String(variant.id) &&
            i.inventoryId === String(validation.inventoryId),
        );
        const itemId = newItem?.id ?? cart.items?.[cart.items.length - 1]?.id;
        if (itemId) {
          router.push(`/checkout?cartItemId=${itemId}`);
        } else {
          router.push("/cart");
        }
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

  // ─── Render ────────────────────────────────────────────────────────────────

  const imageUrl = product.media?.[0]?.url ?? "";

  return (
    <ProductDetailProvider
      productId={String(product.id)}
      productName={product.name}
      variantId={variant.id}
      variantName={variant.name ?? ""}
      imageUrl={imageUrl}
      cartItemId={cartItemId}
      initialDate={initialDate ?? null}
      initialGuests={null}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 48, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background shadow-2xl",
          "rounded-t-3xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:w-full sm:max-w-2xl sm:rounded-3xl",
          "max-h-[95dvh] sm:max-h-[90dvh]",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Book ${product.name}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
          {step === "seatmap" && (
            <button
              onClick={() => { setStep("date"); setSelectedSlot(null); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to dates"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{variant.name}</p>
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                {selectedDate}
                {selectedSlot && ` · ${formatTime(selectedSlot.startTime)}`}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          <AnimatePresence mode="wait" initial={false}>
            {step === "date" ? (
              <motion.div
                key="date"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                {/* Calendar section header */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
                    <MapPin className="h-3 w-3 text-brand-500" />
                  </span>
                  <h2 className="text-sm font-semibold">Choose a Date</h2>
                </div>

                {/* Calendar */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
                  {/* Month nav */}
                  <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                    <span className="text-sm font-semibold">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={prevMonth}
                        disabled={isPrevDisabled}
                        aria-label="Previous month"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="p-3 sm:p-4">
                    {calLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : calError ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-rose-500">{calError}</p>
                        <button
                          onClick={fetchAvail}
                          className="mt-2 text-xs text-brand-500 underline underline-offset-2"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-1 grid grid-cols-7">
                          {DAY_NAMES.map((d, i) => (
                            <div key={i} className="py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: getFirstDay(viewYear, viewMonth) }).map((_, i) => (
                            <div key={`e-${i}`} className="min-h-[52px]" />
                          ))}
                          {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = fmtDate(viewYear, viewMonth, day);
                            const info = availMap.get(dateStr);
                            const isPast = dateStr < TODAY;
                            const isToday = dateStr === TODAY;
                            const isSelected = dateStr === selectedDate;
                            const hasSlots = info != null && info.slots.some(s => s.remaining > 0);
                            const isClosed = !hasSlots;
                            const minPrice = info
                              ? Math.min(...info.slots.filter(s => s.remaining > 0).map(s => s.pricing.headoutSellingPrice))
                              : null;
                            const totalLeft = info ? info.slots.reduce((s, x) => s + x.remaining, 0) : 0;
                            const isLimited = hasSlots && totalLeft < 20;
                            const clickable = !isPast && hasSlots;

                            return (
                              <div
                                key={day}
                                onClick={() => clickable && handleDateClick(dateStr, info)}
                                onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && clickable) handleDateClick(dateStr, info); }}
                                role={clickable ? "button" : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                aria-label={`${day} ${MONTH_NAMES[viewMonth]}${isSelected ? ", selected" : ""}`}
                                aria-pressed={isSelected || undefined}
                                className={cn(
                                  "flex min-h-[52px] flex-col items-center justify-center rounded-xl px-0.5 py-1.5 text-center transition-all duration-150",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                                  isSelected
                                    ? "bg-brand-500 shadow-md"
                                    : isPast
                                      ? "opacity-30"
                                      : isClosed
                                        ? "cursor-default opacity-40"
                                        : isToday
                                          ? "bg-brand-50 ring-1 ring-brand-300 cursor-pointer dark:bg-brand-950/30"
                                          : "cursor-pointer hover:bg-brand-50/60 dark:hover:bg-brand-950/20",
                                )}
                              >
                                <span className={cn(
                                  "text-xs font-semibold sm:text-sm",
                                  isSelected ? "text-white"
                                    : isToday ? "text-brand-600 dark:text-brand-400"
                                      : isPast || isClosed ? "text-muted-foreground"
                                        : "text-foreground",
                                )}>
                                  {day}
                                </span>
                                {!isPast && minPrice != null && !isClosed && (
                                  <span className={cn(
                                    "mt-0.5 text-[9px] font-semibold leading-none",
                                    isSelected ? "text-white/85"
                                      : isLimited ? "text-amber-500"
                                        : "text-emerald-600 dark:text-emerald-400",
                                  )}>
                                    {formatPrice(minPrice)}
                                  </span>
                                )}
                                {!isPast && isClosed && (
                                  <span className="mt-0.5 text-[9px] text-rose-400">–</span>
                                )}
                                {!isPast && !isClosed && isLimited && (
                                  <span className={cn("mt-0.5 text-[8px] font-medium", isSelected ? "text-white/75" : "text-amber-500")}>
                                    {totalLeft} left
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="mt-3 flex items-center gap-3 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Available</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Limited</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Sold out</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Time slots */}
                <AnimatePresence>
                  {selectedDate && selectedSlots.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
                          <Clock className="h-3 w-3 text-brand-500" />
                        </span>
                        <h2 className="text-sm font-semibold">Choose a Time</h2>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {selectedSlots.length} slot{selectedSlots.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
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
                              <div className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold tabular-nums text-foreground">
                                      {formatTime(slot.startTime)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      from {formatPrice(slot.pricing.headoutSellingPrice)} / seat
                                      {slot.remaining > 0 && ` · ${slot.remaining} left`}
                                    </p>
                                  </div>
                                </div>
                                {soldOut ? (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">
                                    Sold out
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                    Select
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="seatmap"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
                    <MapPin className="h-3 w-3 text-brand-500" />
                  </span>
                  <h2 className="text-sm font-semibold">Select Your Seats</h2>
                </div>

                {/* Show iframe or fallback based on access check */}
                {iframeAllowed === null ? (
                  // Still checking — show brief loading
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : iframeAllowed ? (
                  <SeatmapIframe
                    productId={String(product.id)}
                    variantId={variant.id}
                    date={selectedDate!}
                    startTime={selectedSlot!.startTime}
                    onSeatsConfirmed={handleSeatsConfirmed}
                    className="min-h-[480px]"
                  />
                ) : (
                  // 403 fallback: text-based seat picker
                  <SeatMapPanel
                    productId={String(product.id)}
                    variantId={variant.id}
                    selectedDate={selectedDate!}
                    slots={selectedSlots}
                    currency={currency}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer loading bar while booking */}
        {bookingLoading && (
          <div className="flex flex-shrink-0 items-center justify-center gap-2 border-t border-border/60 px-5 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            <span className="text-sm text-muted-foreground">Adding to cart…</span>
          </div>
        )}
      </motion.div>
    </ProductDetailProvider>
  );
}
