"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { createBooking, getCartSessionId } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { useCartContext } from "@/context/CartContext";

interface BookingResult {
  bookingId?: string;
  title: string;
  status: string;
  error?: string;
}

export function MultiCheckoutView() {
  const search = useSearchParams();
  const { cart, isLoading: cartLoading } = useCart();
  const { removeItem } = useCartContext();
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BookingResult[]>([]);
  const [completed, setCompleted] = useState(false);

  const items = useMemo(() => {
    const ids = search.get("bookingIds")?.split(",").filter(Boolean) ?? [];
    return (cart?.items ?? []).filter((item) => ids.includes(item.id));
  }, [cart, search]);

  const currencies = useMemo(() => {
    const unique = new Set(items.map((i) => i.currency));
    return Array.from(unique);
  }, [items]);

  const onSubmit = async (values: { firstName: string; lastName: string; email: string; phone: string; specialRequests?: string }) => {
    if (submitting) return;
    setSubmitting(true);
    const sessionId = getCartSessionId();
    const bookingResults: BookingResult[] = [];

    for (const item of items) {
      const idempotencyKey = crypto.randomUUID?.() ?? `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const result = await createBooking({
        productId: item.productId || item.experienceId,
        productName: item.title,
        variantId: item.variantId,
        variantName: item.title,
        inventoryId: item.inventoryId,
        inventoryType: item.inventoryType || "NORMAL",
        date: item.date,
        startDateTime: item.startDateTime,
        endDateTime: item.endDateTime,
        adults: item.adults,
        children: item.children,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        currencyCode: item.currency,
        priceAmount: item.priceAmount,
        specialRequests: values.specialRequests,
      }, sessionId, idempotencyKey);

      if (result.error) {
        bookingResults.push({ title: item.title, status: "FAILED", error: result.error });
      } else if (result.data) {
        bookingResults.push({ bookingId: result.data.bookingId, title: item.title, status: result.data.status });
        removeItem(item.id).catch(() => {});
      }
    }

    setResults(bookingResults);
    setCompleted(true);
    setSubmitting(false);
  };

  if (cartLoading) {
    return (
      <div className="container py-section flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    const allSucceeded = results.every((r) => r.status !== "FAILED");
    return (
      <div className="container py-section">
        <div className="mx-auto max-w-2xl space-y-6">
          {allSucceeded ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <h1 className="text-display-sm font-bold">All Bookings Confirmed</h1>
              <p className="text-muted-foreground">{results.length} booking{results.length !== 1 ? "s" : ""} confirmed successfully.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="h-16 w-16 text-amber-600" />
              <h1 className="text-display-sm font-bold">Some Bookings Failed</h1>
              <p className="text-muted-foreground">Some bookings could not be completed.</p>
            </div>
          )}
          <Card>
            <CardContent className="space-y-3 pt-6">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    {r.bookingId && <p className="text-xs text-muted-foreground">ID: {r.bookingId}</p>}
                  </div>
                  {r.status === "FAILED" ? (
                    <span className="text-xs text-red-600">{r.error || "Failed"}</span>
                  ) : (
                    <span className="text-xs text-green-600">{r.status}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <a href="/cart">Back to Cart</a>
            </Button>
            <Button asChild>
              <a href="/">Explore more</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-section text-center">
        <p className="text-muted-foreground">No items selected for checkout.</p>
        <Button asChild className="mt-4">
          <a href="/cart">Back to Cart</a>
        </Button>
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + (item.priceAmount || 0), 0);

  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-display-sm font-bold">Checkout ({items.length} item{items.length !== 1 ? "s" : ""})</h1>

        {currencies.length > 1 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Items have different currencies ({currencies.join(", ")}). Total may not reflect exact conversion.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Your Details</h2>
            <CustomerDetailsForm
              submitLabel={`Confirm & Book All (${items.length})`}
              submitting={submitting}
              onSubmit={onSubmit}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{items.length} item{items.length !== 1 ? "s" : ""}</p>
              {items.map((item, i) => (
                <div key={i} className="border-b pb-2 last:border-0 last:pb-0">
                  <p className="text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.date}
                    {item.startDateTime && ` · ${item.startDateTime.split("T")[1]?.slice(0, 5)}`}
                    {` · ${item.adults + item.children} guest${item.adults + item.children !== 1 ? "s" : ""}`}
                  </p>
                  <PriceDisplay amount={item.priceAmount} currency={item.currency} className="text-xs font-medium" />
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Total</span>
                <PriceDisplay amount={total} currency={items[0]?.currency || "USD"} className="font-semibold" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
