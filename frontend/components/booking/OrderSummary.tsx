"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useCheckout } from "@/context/CheckoutContext";

export function OrderSummary() {
  const { info } = useCheckout();
  const total = info.price;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium">{info.productName || info.title}</p>
          {info.variantName && (
            <p className="text-xs text-muted-foreground">{info.variantName}</p>
          )}
        </div>
        <p className="text-muted-foreground">
          {info.date}
          {info.startDateTime && (
            <> · {info.startDateTime.split("T")[1]?.slice(0, 5)}</>
          )}
        </p>
        <div className="text-muted-foreground">
          Guests: {info.guests}
          {info.guestCounts && Object.keys(info.guestCounts).length > 0 && (
            <span className="ml-1 text-xs">
              ({Object.entries(info.guestCounts).map(([type, count]) => `${count} ${type.toLowerCase()}${count !== 1 ? 's' : ''}`).join(', ')})
            </span>
          )}
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="font-medium">Total</span>
          <PriceDisplay amount={total} currency={info.currency} className="font-semibold" />
        </div>
      </CardContent>
    </Card>
  );
}
