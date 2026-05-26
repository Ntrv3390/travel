"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/booking/DatePicker";
import { GuestSelector } from "@/components/booking/GuestSelector";
import { VariantSelector } from "@/components/booking/VariantSelector";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useAvailability } from "@/hooks/useAvailability";
import type { Experience } from "@/types/experience";

export function PricingBox({ experience }: { experience: Experience }) {
  const [date, setDate] = useState("");
  const [variantId, setVariantId] = useState(experience.options[0]?.id ?? "");
  const [adults, setAdults] = useState(1);
  const [childCount, setChildCount] = useState(0);

  const selectedVariant = useMemo(
    () => experience.options.find((option) => option.id === variantId) ?? experience.options[0],
    [experience.options, variantId],
  );

  const { availability, isError } = useAvailability(experience.id, date);

  const total = useMemo(() => {
    const unitPrice = selectedVariant?.price ?? 0;
    return unitPrice * (adults + childCount);
  }, [selectedVariant?.price, adults, childCount]);

  const canBook = Boolean(date && variantId && availability && !isError);

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

        <Button className="h-12 w-full text-base font-semibold" disabled={!canBook}>
          {canBook ? "Book Now" : "Check Availability"}
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>No hidden booking fees</span>
        </div>
      </CardContent>
    </Card>
  );
}
