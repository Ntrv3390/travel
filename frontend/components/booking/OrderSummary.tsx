"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useCheckout } from "@/context/CheckoutContext";

export function OrderSummary() {
  const { info } = useCheckout();
  const total = info.price * info.guests;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">{info.title}</p>
        <p className="text-muted-foreground">Guests: {info.guests}</p>
        <div className="flex items-center justify-between">
          <span>Total</span>
          <PriceDisplay amount={total} currency={info.currency} className="font-semibold" />
        </div>
      </CardContent>
    </Card>
  );
}
