"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldCheck, ShoppingCart } from "lucide-react";
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
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/components/ui/toaster";
import type { Experience } from "@/types/experience";

export function PricingBox({ experience }: { experience: Experience }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [variantId, setVariantId] = useState(experience.options[0]?.id ?? "");
  const [inventoryId, setInventoryId] = useState("");
  const [adults, setAdults] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  const { addItem } = useCart();
  const { toast } = useToast();

  const selectedVariant = useMemo(
    () => experience.options.find((option) => option.id === variantId) ?? experience.options[0],
    [experience.options, variantId],
  );

  const { availability, isError } = useAvailability(experience.id, variantId, date);

  const slots: Slot[] = availability?.slots ?? [];
  
  // Auto-select first available slot if inventoryId is empty or invalid for current date/variant
  useMemo(() => {
    if (slots.length > 0) {
      if (!inventoryId || !slots.find(s => s.inventoryId === inventoryId)) {
        setInventoryId(slots[0].inventoryId);
      }
    } else {
      setInventoryId("");
    }
  }, [slots, inventoryId]);

  const total = useMemo(() => {
    const unitPrice = selectedVariant?.price ?? 0;
    return unitPrice * (adults + childCount);
  }, [selectedVariant?.price, adults, childCount]);

  const canBook = Boolean(date && variantId && (!slots.length || inventoryId) && availability && !isError);

  function handleBookNow() {
    if (!canBook || !selectedVariant) return;
    const params = new URLSearchParams({
      experienceId: experience.id,
      variantId: selectedVariant.id,
      inventoryId: inventoryId,
      date,
      adults: String(adults),
      children: String(childCount),
      title: experience.title,
      price: String(total),
      currency: selectedVariant.currency ?? "USD",
    });
    router.push(`/checkout?${params.toString()}`);
  }

  async function handleAddToCart() {
    if (!canBook || !selectedVariant || !date) return;
    setAddingToCart(true);
    try {
      await addItem({
        experienceId: experience.id,
        variantId: selectedVariant.id,
        variantTitle: selectedVariant.title,
        date,
        adults,
        children: childCount,
        unitPrice: selectedVariant.price,
        totalPrice: total,
        currency: selectedVariant.currency ?? "USD",
        experience,
      });
      toast({ title: "Added to cart", description: `${experience.title} has been added to your cart.`, variant: "success" });
    } catch {
      toast({ title: "Failed to add", description: "Could not add item to cart. Please try again.", variant: "error" });
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <Card className="sticky top-24 border-0 shadow-pricing-box">
      <CardHeader className="space-y-2">
        <p className="text-sm text-muted-foreground">From</p>
        <PriceDisplay amount={selectedVariant?.price ?? 0} currency={selectedVariant?.currency ?? "USD"} className="text-display-xs font-bold" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <VariantSelector options={experience.options} value={variantId} onChange={setVariantId} />
        <DatePicker value={date} onChange={setDate} />
        {slots.length > 0 && (
          <SlotSelector slots={slots} value={inventoryId} onChange={setInventoryId} />
        )}
        <GuestSelector adults={adults} childCount={childCount} onAdultsChange={setAdults} onChildrenChange={setChildCount} />
        <Separator />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <PriceDisplay amount={total} currency={selectedVariant?.currency ?? "USD"} className="font-semibold" />
        </div>

        {isError ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Pricing is temporarily unavailable. Please refresh and try again.</AlertDescription>
          </Alert>
        ) : null}

        <Button className="h-12 w-full text-base font-semibold" disabled={!canBook} onClick={handleBookNow}>
          {canBook ? "Book Now" : "Check Availability"}
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full text-base font-semibold"
          disabled={!canBook || addingToCart}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {addingToCart ? "Adding..." : "Add to Cart"}
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>No hidden booking fees</span>
        </div>
      </CardContent>
    </Card>
  );
}
