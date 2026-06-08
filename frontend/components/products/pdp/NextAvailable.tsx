"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Calendar, Loader2, ArrowRight } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useProductDetail } from "@/context/ProductDetailContext";
import { getVariantAvailabilities } from "@/lib/api";
import type { VariantAvailability } from "@/types/product";

function formatTimeSlot(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const dayName = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return dayName;
}

interface NextAvailableProps {
  onShowCalendar: () => void;
}

export function NextAvailable({ onShowCalendar }: NextAvailableProps) {
  const { productId, variantId } = useProductDetail();
  const { currency, formatPrice } = useCurrency();
  const [slots, setSlots] = useState<
    Array<{ date: string; price: number; availability: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchNextAvailable = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    const result = await getVariantAvailabilities(
      productId,
      variantId,
      { currencyCode: currency, startDate, endDate }
    );

    if (result.data?.availabilities) {
      const available = result.data.availabilities
        .filter(
          (a: VariantAvailability) =>
            a.availability !== "CLOSED" &&
            a.pricing?.headoutSellingPrice != null
        )
        .slice(0, 3)
        .map((a: VariantAvailability) => ({
          date: a.date,
          price: a.pricing.headoutSellingPrice,
          availability: a.availability,
        }));
      setSlots(available);
    }
    setLoading(false);
  }, [productId, variantId, currency]);

  useEffect(() => {
    fetchNextAvailable();
  }, [fetchNextAvailable]);

  if (loading) {
    return (
      <div className="glass flex items-center justify-center rounded-2xl py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) return null;

  return (
    <div className="glass overflow-hidden rounded-2xl transition-shadow duration-200 hover:shadow-package-hover">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold">Next Available</h3>
        </div>
        <button
          onClick={onShowCalendar}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          View Full Calendar
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-1 px-4 pb-4">
        {slots.map((slot, i) => (
          <motion.div
            key={slot.date}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50/50"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {formatTimeSlot(slot.date)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(slot.date + "T12:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "short", day: "numeric" }
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {formatPrice(slot.price)}
              </p>
              {slot.availability === "LIMITED" && (
                <p className="text-[10px] font-medium text-amber-600">
                  Limited spots
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
