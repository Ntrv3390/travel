"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCartSessionId, addCartItem } from "@/lib/api";
import { useProduct } from "@/context/ProductContext";

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
  maxBookableQuantity?: number | null;
  error?: string;
};

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, 1);
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildMonthCells(monthStart: Date) {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function buildMonthOptions(days: CalendarDay[]) {
  if (!days.length) {
    return [toMonthKey(new Date())];
  }

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = parseDate(sortedDays[0].date);
  const last = parseDate(sortedDays[sortedDays.length - 1].date);
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(last.getFullYear(), last.getMonth(), 1);

  const options: string[] = [];
  while (cursor <= end) {
    options.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return options;
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

function toMinutes(slot: string) {
  const [hour, minute] = slot.split(":").map((value) => Number.parseInt(value, 10));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return hour * 60 + minute;
}

export function PackageOptionsSection() {
  const router = useRouter();
  const { state } = useProduct();
  const content = state.singleExperienceContent!;
  const experience = content.experience;

  const variantId = experience.options[0]?.headoutVariantId ?? "";
  const headoutId = experience.headoutId;
  const experienceId = experience.headoutId;
  const title = experience.title;
  const imageUrl = experience.images[0]?.url ?? "";
  const price = experience.options[0]?.price ?? 0;
  const currency = experience.options[0]?.currency ?? "USD";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [maxBookableQuantity, setMaxBookableQuantity] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [visibleMonthKey, setVisibleMonthKey] = useState(toMonthKey(new Date()));
  const [clientNow, setClientNow] = useState<Date | null>(null);
  const calendarPopupRef = useRef<HTMLDivElement | null>(null);

  const normalizedCalendarDays = useMemo(() => {
    if (!clientNow) {
      return calendarDays;
    }

    const todayKey = toDateKey(clientNow);
    const nowMinutes = clientNow.getHours() * 60 + clientNow.getMinutes();

    return calendarDays.map((day) => {
      if (day.date !== todayKey) {
        return day;
      }

      const filteredSlots = day.slots.filter((slot) => {
        const minutes = toMinutes(slot);
        if (minutes == null) {
          return true;
        }
        return minutes > nowMinutes;
      });

      return {
        ...day,
        slots: filteredSlots,
        isAvailable: filteredSlots.length > 0 ? true : false,
      };
    });
  }, [calendarDays, clientNow]);

  const availableDays = useMemo(
    () => normalizedCalendarDays.filter((day) => day.isAvailable),
    [normalizedCalendarDays],
  );
  const dayByDateKey = useMemo(() => new Map(normalizedCalendarDays.map((day) => [day.date, day])), [normalizedCalendarDays]);
  const monthOptions = useMemo(() => buildMonthOptions(normalizedCalendarDays), [normalizedCalendarDays]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parseMonthKey(visibleMonthKey)),
    [visibleMonthKey],
  );
  const monthCells = useMemo(() => buildMonthCells(parseMonthKey(visibleMonthKey)), [visibleMonthKey]);
  const visibleMonthIndex = useMemo(() => monthOptions.indexOf(visibleMonthKey), [monthOptions, visibleMonthKey]);
  const canGoPreviousMonth = visibleMonthIndex > 0;
  const canGoNextMonth = visibleMonthIndex >= 0 && visibleMonthIndex < monthOptions.length - 1;
  const quickPickDays = useMemo(() => availableDays.slice(0, 6), [availableDays]);
  const selectedDay = useMemo(
    () => availableDays.find((day) => day.date === selectedDate) ?? null,
    [availableDays, selectedDate],
  );
  const visibleSlots = selectedDay?.slots ?? [];

  useEffect(() => {
    if (availableDays.length === 0 && selectedDate) {
      setSelectedDate("");
      setSelectedSlot("");
    }
  }, [availableDays.length]);
  const today = useMemo(() => (clientNow ? startOfToday(clientNow) : null), [clientNow]);

  useEffect(() => {
    setClientNow(new Date());
  }, []);

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
          setMaxBookableQuantity(
            typeof payload.maxBookableQuantity === "number" && payload.maxBookableQuantity > 0
              ? payload.maxBookableQuantity
              : null,
          );
        }
      } catch (error) {
        if (active) {
          setCalendarDays([]);
          setMaxBookableQuantity(null);
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
    if (!monthOptions.length) {
      return;
    }

    if (!monthOptions.includes(visibleMonthKey)) {
      setVisibleMonthKey(monthOptions[0]);
    }
  }, [monthOptions, visibleMonthKey]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const selectedMonthKey = toMonthKey(parseDate(selectedDate));
    if (monthOptions.includes(selectedMonthKey)) {
      setVisibleMonthKey(selectedMonthKey);
    }
  }, [monthOptions, selectedDate]);

  useEffect(() => {
    if (!isCalendarPopupOpen) {
      return;
    }

    const onOutsideClick = (event: MouseEvent) => {
      if (calendarPopupRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsCalendarPopupOpen(false);
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [isCalendarPopupOpen]);

  useEffect(() => {
    if (maxBookableQuantity != null && quantity > maxBookableQuantity) {
      setQuantity(maxBookableQuantity);
    }
  }, [maxBookableQuantity, quantity]);

  useEffect(() => {
    if (!selectedDate && quickPickDays.length) {
      setSelectedDate(quickPickDays[0].date);
      setSelectedSlot(quickPickDays[0].slots[0] ?? "");
    }
  }, [quickPickDays, selectedDate]);

  useEffect(() => {
    if (!selectedDate || !visibleSlots.length) {
      return;
    }

    if (!selectedSlot || !visibleSlots.includes(selectedSlot)) {
      setSelectedSlot(visibleSlots[0]);
    }
  }, [selectedDate, selectedSlot, visibleSlots]);

  const effectiveMaxQuantity = maxBookableQuantity ?? 99;
  const canCheckout = Boolean(selectedDate && selectedSlot && quantity > 0);

  return (
    <article id="packages" className="scroll-mt-[10.2rem] min-w-0 lg:scroll-mt-[10.5rem]">
      <Card className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-2xl font-extrabold tracking-tight text-slate-900">Packages</h2>
          </div>

          <div className="rounded-2xl border border-blue-400/80 bg-white">
            <div className="space-y-4 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-brand-700">Admission ticket</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose your visit date, slot, and guests to continue.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
                  <CheckCircle2 size={12} /> Instant confirmation
                </span>
              </div>

              <div className="grid gap-4">
                <div>
                  <p className="mb-2 text-sm font-bold text-slate-800">Select date</p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                      <div className="flex snap-x snap-mandatory gap-2">
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
                                    setSelectedDate(day.date);
                                    setSelectedSlot(day.slots[0] ?? "");
                                  }}
                                >
                                  <span className="text-[11px] font-semibold">{label.month}</span>
                                  <span className="text-lg font-extrabold leading-none">{label.day}</span>
                                  <span className="text-[10px] font-semibold text-slate-500">{day.priceLabel ?? "Live"}</span>
                                </button>
                              );
                            })}
                      </div>
                    </div>

                    <div className="relative flex-none" ref={calendarPopupRef}>
                      <Button
                        variant="outline"
                        className="h-[66px] min-w-[96px] rounded-xl border-slate-300 text-xs font-bold"
                        onClick={() => {
                          if (isLoadingCalendar) {
                            return;
                          }
                          setIsCalendarPopupOpen((value) => !value);
                        }}
                        disabled={isLoadingCalendar}
                        aria-expanded={isCalendarPopupOpen}
                        aria-label="Open date calendar"
                      >
                        <CalendarDays size={16} className="mr-1" />
                        Calendar
                      </Button>

                      {isCalendarPopupOpen ? (
                        <div className="absolute right-0 top-[74px] z-50 w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                          <div className="mb-3 flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-full p-0"
                              onClick={() => {
                                if (!canGoPreviousMonth) {
                                  return;
                                }
                                setVisibleMonthKey(monthOptions[visibleMonthIndex - 1]);
                              }}
                              disabled={!canGoPreviousMonth}
                              aria-label="Previous month"
                            >
                              <ChevronLeft size={16} />
                            </Button>
                            <p className="text-sm font-bold text-slate-800">{monthLabel}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-full p-0"
                              onClick={() => {
                                if (!canGoNextMonth) {
                                  return;
                                }
                                setVisibleMonthKey(monthOptions[visibleMonthIndex + 1]);
                              }}
                              disabled={!canGoNextMonth}
                              aria-label="Next month"
                            >
                              <ChevronRight size={16} />
                            </Button>
                          </div>

                          <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekDay) => (
                              <span key={weekDay}>{weekDay}</span>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {monthCells.map((cellDate) => {
                              const dateKey = toDateKey(cellDate);
                              const day = dayByDateKey.get(dateKey);
                              const isCurrentMonth = toMonthKey(cellDate) === visibleMonthKey;
                              const isPastDate = today ? cellDate < today : false;
                              const isDisabled = !isCurrentMonth || isPastDate || !day?.isAvailable;
                              const isActive = selectedDate === dateKey;

                              return (
                                <button
                                  key={dateKey}
                                  type="button"
                                  disabled={isDisabled}
                                  className={cn(
                                    "flex h-11 flex-col items-center justify-center rounded-lg border px-1 text-center transition",
                                    !isCurrentMonth && "border-transparent bg-transparent text-transparent",
                                    isCurrentMonth &&
                                      (isActive
                                        ? "border-brand-600 bg-blue-50 text-brand-800"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"),
                                    isDisabled && isCurrentMonth && "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300",
                                  )}
                                  onClick={() => {
                                    if (!day) {
                                      return;
                                    }
                                    setSelectedDate(day.date);
                                    setSelectedSlot(day.slots[0] ?? "");
                                    setIsCalendarPopupOpen(false);
                                  }}
                                >
                                  <span className="text-[11px] font-bold leading-none">{cellDate.getDate()}</span>
                                  <span className="mt-0.5 text-[9px] font-medium leading-none">
                                    {isCurrentMonth ? (day?.priceLabel ?? "-") : ""}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                            <button
                              type="button"
                              className="font-semibold text-brand-700"
                              onClick={() => {
                                setIsCalendarPopupOpen(false);
                                setRefreshTick((value) => value + 1);
                              }}
                            >
                              Refresh
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {clientNow && selectedDay && visibleSlots.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">Select timeslot</p>
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
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <span className="text-sm font-bold text-slate-900">{slot}</span>
                            <span className="text-xs text-slate-500">{formatSlotLabel(slot)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-bold text-slate-800">Select quantity</p>
                  {maxBookableQuantity != null ? (
                    <p className="mb-2 text-xs text-brand-700">Can&apos;t select more than {maxBookableQuantity} for this package</p>
                  ) : null}
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
                        onClick={() => setQuantity((value) => Math.min(effectiveMaxQuantity, value + 1))}
                        disabled={quantity >= effectiveMaxQuantity}
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
                <Button variant="outline" className="rounded-xl border-brand-300 text-brand-700 hover:bg-brand-50" disabled={!canCheckout} onClick={async () => {
                  if (!canCheckout) return;
                  const sessionId = getCartSessionId();
                  const result = await addCartItem(sessionId, {
                    experienceId,
                    variantId,
                    date: selectedDate,
                    adults: quantity,
                    children: 0,
                    priceAmount: price,
                    currency,
                    title,
                    imageUrl,
                  });
                  if (result.error) {
                    alert("Failed to add to cart: " + result.error);
                  } else {
                    router.push("/cart");
                  }
                }}>
                  Add to cart
                </Button>
                <Button className="rounded-xl bg-gradient-to-r from-blue-700 to-brand-600 text-white hover:from-blue-800 hover:to-brand-700" disabled={!canCheckout} onClick={() => {
                  if (!canCheckout) return;
                  const params = new URLSearchParams({
                    experienceId,
                    variantId,
                    date: selectedDate,
                    adults: String(quantity),
                    children: "0",
                    title,
                    price: String(price),
                    currency,
                    imageUrl,
                  });
                  router.push(`/checkout?${params.toString()}`);
                }}>
                  Book now
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 min-h-5 text-xs text-slate-600">
            {calendarError ? (
              <span className="inline-flex items-center gap-1 text-brand-700">
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
