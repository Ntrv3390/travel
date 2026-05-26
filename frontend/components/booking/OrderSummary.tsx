import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";

export function OrderSummary({
  title,
  guests,
  price,
  currency,
}: {
  title: string;
  guests: number;
  price: number;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">Guests: {guests}</p>
        <div className="flex items-center justify-between">
          <span>Total</span>
          <PriceDisplay amount={price} currency={currency} className="font-semibold" />
        </div>
      </CardContent>
    </Card>
  );
}
