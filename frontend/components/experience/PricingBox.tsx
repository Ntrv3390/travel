"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/booking/DatePicker";
import { GuestSelector } from "@/components/booking/GuestSelector";
import { VariantSelector } from "@/components/booking/VariantSelector";
import { SlotSelector, type Slot } from "@/components/booking/SlotSelector";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookingWidget } from "@/hooks/useBookingWidget";
import { useProduct } from "@/context/ProductContext";
import { useCurrency } from "@/hooks/useCurrency";

export function PricingBox() {
  const { state } = useProduct();
  const experience = state.experience!;
  const { currency } = useCurrency();

  const [variantId, setVariantId] = useState(experience.options[0]?.id ?? "");
  const [inventoryId, setInventoryId] = useState("");
  const [date, setDate] = useState("");

  const selectedVariant = useMemo(
    () => experience.options.find((option) => option.id === variantId) ?? experience.options[0],
    [experience.options, variantId],
  );

  const { availability, isError } = useAvailability(experience.id, variantId, date);
  const slots: Slot[] = availability?.slots ?? [];
  const selectedSlot = slots.find((slot) => slot.inventoryId === inventoryId);
  const effectivePrice = selectedSlot?.price ?? selectedVariant?.price ?? 0;
  const effectiveCurrency = selectedSlot?.currency ?? selectedVariant?.currency ?? "USD";

  const widget = useBookingWidget({
    experienceId: experience.id,
    variantId: selectedVariant?.id ?? "",
    title: experience.title,
    price: effectivePrice,
    currency: effectiveCurrency,
    imageUrl: experience.images?.[0]?.url ?? "",
    date,
    setDate,
    inventoryId,
    setInventoryId,
    startDateTime: selectedSlot?.startDateTime,
    endDateTime: selectedSlot?.endDateTime,
  });

  useEffect(() => {
    const available = availability?.slots;
    if (available && available.length > 0) {
      const bookableSlots = available.filter((slot: Slot) =>
        !slot.availability || slot.availability === 'AVAILABLE' || slot.availability === 'LIMITED' || slot.availability === 'UNLIMITED'
      );
      if (inventoryId && bookableSlots.some((s: Slot) => s.inventoryId === inventoryId)) return;
      if (bookableSlots.length > 0) {
        setInventoryId(bookableSlots[0].inventoryId);
      } else {
        setInventoryId("");
      }
    } else if (inventoryId) {
      setInventoryId("");
    }
  }, [date, variantId, inventoryId, availability]);

  const canBook = Boolean(widget.date && variantId && (!slots.length || inventoryId) && availability && !isError);

  return (
    <Card className="sticky top-24 border-0 shadow-pricing-box">
      <CardHeader className="space-y-2">
        <p className="text-sm text-muted-foreground">From</p>
        <PriceDisplay amount={effectivePrice} currency={selectedVariant?.currency ?? "USD"} className="text-display-xs font-bold" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <VariantSelector options={experience.options} value={variantId} onChange={setVariantId} />
        <DatePicker value={widget.date} onChange={widget.setDate} />
        {slots.length > 0 && (
          <SlotSelector slots={slots} value={inventoryId} onChange={setInventoryId} />
        )}
        <GuestSelector adults={widget.adultCount} childCount={widget.childCount} onAdultsChange={widget.setAdultCount} onChildrenChange={widget.setChildCount} />
        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <PriceDisplay amount={widget.total} currency={effectiveCurrency} className="font-semibold" />
        </div>

        {isError ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Pricing is temporarily unavailable. Please refresh and try again.</AlertDescription>
          </Alert>
        ) : null}

        <Button className="h-12 w-full text-base font-semibold" disabled={!canBook || widget.isBooking} onClick={widget.handleBookNow}>
          {widget.isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {!canBook ? "Check Availability" : widget.isBooking ? "Redirecting..." : "Book Now"}
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full text-base font-semibold"
          disabled={!canBook || widget.isAddingToCart}
          onClick={widget.handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {widget.isAddingToCart ? "Adding..." : "Add to Cart"}
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>No hidden booking fees</span>
        </div>
      </CardContent>
    </Card>
  );
}
