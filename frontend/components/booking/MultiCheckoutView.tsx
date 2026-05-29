"use client";

import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations";
import { createBooking, getCartSessionId } from "@/lib/api";
import { useCart } from "@/hooks/useCart";

interface BookingResult {
  bookingId?: string;
  title: string;
  status: string;
  error?: string;
}

export function MultiCheckoutView() {
  const search = useSearchParams();
  const { cart, isLoading: cartLoading } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BookingResult[]>([]);
  const [completed, setCompleted] = useState(false);

  const items = useMemo(() => {
    const ids = search.get("bookingIds")?.split(",").filter(Boolean) ?? [];
    return (cart?.items ?? []).filter((item) => ids.includes(item.id));
  }, [cart, search]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialRequests: "",
    },
  });

  const onSubmit = async (values: CheckoutFormValues) => {
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
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Your Details</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 555 0123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? "Booking all items..." : `Confirm & Book All (${items.length})`}
                </Button>
              </form>
            </Form>
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
