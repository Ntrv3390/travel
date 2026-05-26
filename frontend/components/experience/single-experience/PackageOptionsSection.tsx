"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CalendarDay = {
  date: string;
  label: string;
  price: number | null;
  priceLabel: string | null;
  currency: string;
  availability: string;
  slots: string[];
  isAvailable: boolean;
};

type CalendarApiResponse = {
  days?: CalendarDay[];
  error?: string;
};

interface PackageOptionsSectionProps {
  variantId: string;
  headoutId: string;
  selectedDate: string;
  selectedSlot: string;
  onDateChange: (value: string) => void;
  onSlotChange: (value: string) => void;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateChip(value: string) {
  const date = parseDate(value);
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
  };
}

function formatSlotLabel(slot: string) {
  const hour = Number.parseInt(slot.split(":")[0] ?? "0", 10);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export function PackageOptionsSection({
  variantId,
  headoutId,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
}: PackageOptionsSectionProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);

  const availableDays = useMemo(
    () => calendarDays.filter((day) => day.isAvailable),
    [calendarDays],
  );
  const quickPickDays = useMemo(() => availableDays.slice(0, 6), [availableDays]);
  const selectedDay = useMemo(
    () => availableDays.find((day) => day.date === selectedDate) ?? null,
    [availableDays, selectedDate],
  );
  const visibleSlots = selectedDay?.slots ?? [];

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
      if (!variantId) {
        setCalendarDays([]);
        setCalendarError("No package variant is available for this experience yet.");
        return;
      }

      setIsLoadingCalendar(true);
      setCalendarError(null);

      try {
        const url = new URL("/api/single-experience/calendar", window.location.origin);
        url.searchParams.set("variantId", variantId);
        if (headoutId) {
          url.searchParams.set("headoutId", headoutId);
        }
        url.searchParams.set("startDate", toDateKey(new Date()));
        url.searchParams.set("days", "42");

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as CalendarApiResponse;
        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load packages");
        }

        if (active) {
          setCalendarDays(Array.isArray(payload.days) ? payload.days : []);
        }
      } catch (error) {
        if (active) {
          setCalendarDays([]);
          setCalendarError(error instanceof Error ? error.message : "Failed to load packages");
        }
      } finally {
        if (active) {
          setIsLoadingCalendar(false);
        }
      }
    }

    void loadCalendar();

    return () => {
      active = false;
    };
  }, [headoutId, variantId, refreshTick]);

  useEffect(() => {
    if (!selectedDate && quickPickDays.length) {
      onDateChange(quickPickDays[0].date);
      onSlotChange(quickPickDays[0].slots[0] ?? "");
    }
  }, [onDateChange, onSlotChange, quickPickDays, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !visibleSlots.length) {
      return;
    }

    if (!selectedSlot || !visibleSlots.includes(selectedSlot)) {
      onSlotChange(visibleSlots[0]);
    }
  }, [onSlotChange, selectedDate, selectedSlot, visibleSlots]);

  const canCheckout = Boolean(selectedDate && selectedSlot && quantity > 0);

  return (
    <article id="packages" className="scroll-mt-[10.2rem] min-w-0 lg:scroll-mt-[10.5rem]">
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-5 w-1.5 rounded-full bg-orange-500" aria-hidden="true" />
            <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-2xl font-extrabold tracking-tight text-slate-900">Packages</h2>
          </div>

          <div className="rounded-2xl border border-blue-400/80 bg-white">
            <div className="space-y-4 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-brand-700">Admission ticket</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose your visit date, slot, and guests to continue.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">
                  <CheckCircle2 size={12} /> Instant confirmation
                </span>
              </div>

              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-800">Select date</p>
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    {isLoadingCalendar
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-[66px] w-[82px] flex-none animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                            aria-hidden="true"
                          />
                        ))
                      : quickPickDays.map((day) => {
                          const isActive = day.date === selectedDate;
                          const label = formatDateChip(day.date);
                          return (
                            <button
                              key={day.date}
                              type="button"
                              className={cn(
                                "flex h-[66px] w-[82px] flex-none snap-start flex-col items-center justify-center rounded-xl border text-center transition",
                                isActive
                                  ? "border-brand-600 bg-blue-50 text-brand-800 shadow-[0_8px_16px_rgba(37,99,235,0.16)]"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300",
                              )}
                              onClick={() => {
                                onDateChange(day.date);
                                onSlotChange(day.slots[0] ?? "");
                              }}
                            >
                              <span className="text-[11px] font-semibold">{label.month}</span>
                              <span className="text-lg font-extrabold leading-none">{label.day}</span>
                              <span className="text-[10px] font-semibold text-slate-500">{day.priceLabel ?? "Live"}</span>
                            </button>
                          );
                        })}

                    <Button
                      variant="outline"
                      className="h-[66px] min-w-[82px] flex-none rounded-xl border-slate-300 text-xs font-bold"
                      onClick={() => setRefreshTick((value) => value + 1)}
                      disabled={isLoadingCalendar}
                    >
                      <CalendarDays size={14} className="mr-1" />
                      {isLoadingCalendar ? "Loading" : "All"}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-800">Select timeslot</p>
                  {selectedDate ? (
                    visibleSlots.length ? (
                      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3">
                        {visibleSlots.map((slot) => {
                          const isActive = slot === selectedSlot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              className={cn(
                                "flex items-center justify-between rounded-xl border px-3 py-2 text-left transition",
                                isActive ? "border-brand-600 bg-blue-50" : "border-slate-200 bg-white hover:border-brand-300",
                              )}
                              onClick={() => onSlotChange(slot)}
                            >
                              <span className="text-sm font-bold text-slate-900">{slot}</span>
                              <span className="text-xs text-slate-500">{formatSlotLabel(slot)}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">No slots are available for this date.</p>
                    )
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">Pick a date to view available time slots.</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-800">Select quantity</p>
                  <p className="mb-2 text-xs text-orange-600">Can’t select more than 8 for this package</p>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Adult (Aged 12+)</p>
                      <p className="text-xs text-slate-500">Per person</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-5 text-center text-sm font-bold text-slate-700">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={() => setQuantity((value) => Math.min(8, value + 1))}
                        disabled={quantity >= 8}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
              <p className="text-sm text-slate-600">
                {canCheckout
                  ? "Ready to continue with your package selection."
                  : "Complete all required fields to continue."}
              </p>
              <div className="grid grid-cols-2 gap-2 md:flex">
                <Button variant="outline" className="rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50" disabled={!canCheckout}>
                  Add to cart
                </Button>
                <Button className="rounded-xl bg-orange-500 text-white hover:bg-orange-600" disabled={!canCheckout}>
                  Book now
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-5 text-xs text-slate-600">
            {calendarError ? (
              <span className="inline-flex items-center gap-1 text-orange-700">
                <AlertCircle size={13} /> {calendarError}
              </span>
            ) : selectedDay?.priceLabel ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={13} /> Live price for {selectedDate}: {selectedDay.priceLabel}
              </span>
            ) : (
              "Live availability updates from provider inventory."
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}