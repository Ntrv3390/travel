"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CAL_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CAL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface ProductAvailability {
  id: number;
  product_id: number;
  headout_product_id: string;
  variant_id: string;
  variant_title: string;
  date: string;
  start_time: string;
  end_time: string;
  inventory_id: string;
  inventory_type: string;
  price_amount: number;
  currency: string;
  available_slots: number;
}

interface AvailabilityCalendarViewProps {
  availabilities: ProductAvailability[];
  currency: string;
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

export function AvailabilityCalendarView({ availabilities, currency }: AvailabilityCalendarViewProps) {
  const today = todayStr();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const variants = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const a of availabilities) {
      const key = a.variant_id || "unknown";
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { title: a.variant_title || a.variant_id, count: 1 });
      }
    }
    return Array.from(map.entries());
  }, [availabilities]);

  const effectiveVariant = selectedVariant || (variants.length > 0 ? variants[0][0] : null);

  const filteredAvail = useMemo(() => {
    if (!effectiveVariant) return availabilities;
    return availabilities.filter((a) => a.variant_id === effectiveVariant);
  }, [availabilities, effectiveVariant]);

  const availByDate = useMemo(() => {
    const map = new Map<string, ProductAvailability[]>();
    for (const a of filteredAvail) {
      if (!a.date) continue;
      const existing = map.get(a.date);
      if (existing) {
        existing.push(a);
      } else {
        map.set(a.date, [a]);
      }
    }
    return map;
  }, [filteredAvail]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const selectedSlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  return (
    <div>
      {/* Variant tabs */}
      {variants.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {variants.map(([id, info]) => (
            <button
              key={id}
              onClick={(e) => { e.stopPropagation(); setSelectedVariant(id); }}
              className={cn(
                "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                effectiveVariant === id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {info.title}
              <span className="ml-1 opacity-60">({info.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); prevMonth(); }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-slate-700">
          {CAL_MONTH_NAMES[calMonth]} {calYear}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); nextMonth(); }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {CAL_DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(calYear, calMonth, day);
          const slots = availByDate.get(dateStr) || [];
          const bestSlot = slots[0];
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasAvailability = slots.some((s) => s.available_slots > 0);

          let bg = "bg-transparent";
          let textColor = "text-slate-500";
          if (isSelected) {
            bg = "ring-2 ring-sky-600 bg-sky-50";
          } else if (isToday) {
            bg = "ring-1 ring-sky-400 bg-sky-50/50";
          } else if (isPast) {
            bg = "bg-slate-50";
          }
          if (isPast) textColor = "text-slate-300";

          if (!isPast && slots.length > 0) {
            bg += " cursor-pointer hover:bg-slate-50";
          }

          const statusColor = !hasAvailability && slots.length > 0
            ? "text-red-500"
            : bestSlot && bestSlot.available_slots <= 10 && bestSlot.available_slots > 0
              ? "text-amber-600"
              : "text-emerald-600";

          return (
            <div
              key={day}
              onClick={(e) => {
                e.stopPropagation();
                if (!isPast && slots.length > 0) setSelectedDate(dateStr === selectedDate ? null : dateStr);
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-md px-0.5 py-1 text-center transition-colors",
                bg,
              )}
            >
              <span className={cn("text-xs font-medium", textColor)}>{day}</span>
              {bestSlot && bestSlot.price_amount > 0 ? (
                <span className={cn("mt-0.5 truncate text-[9px] font-semibold leading-tight", statusColor)}>
                  {currency} {bestSlot.price_amount.toFixed(0)}
                </span>
              ) : slots.length > 0 && !hasAvailability ? (
                <span className="mt-0.5 text-[9px] text-red-400">Closed</span>
              ) : slots.length > 0 ? (
                <span className="mt-0.5 text-[9px] text-emerald-500">Open</span>
              ) : (
                <span className="mt-0.5 text-[9px] text-slate-300">—</span>
              )}
              {bestSlot && bestSlot.available_slots > 0 && bestSlot.available_slots < 20 && (
                <span className="text-[8px] text-amber-500">{bestSlot.available_slots} left</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> Closed
        </span>
      </div>

      {/* Selected date slot details */}
      {selectedDate && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">{selectedDate}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedDate(null); }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {selectedSlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-700">{slot.variant_title || slot.variant_id}</p>
                  <p className="text-[10px] text-slate-400">
                    {slot.start_time ? `${slot.start_time} - ${slot.end_time || "?"}` : "All day"}
                    {slot.inventory_type ? ` · ${slot.inventory_type}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-slate-700">
                    {slot.price_amount > 0 ? `${slot.currency || currency} ${slot.price_amount.toFixed(2)}` : "—"}
                  </span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    slot.available_slots > 10
                      ? "bg-emerald-50 text-emerald-700"
                      : slot.available_slots > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  )}>
                    {slot.available_slots > 10 ? "Unlimited" : slot.available_slots > 0 ? `${slot.available_slots} left` : "Closed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
