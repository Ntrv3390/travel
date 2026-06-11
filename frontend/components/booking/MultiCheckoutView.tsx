"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import { Loader2, CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { StepBar } from "@/components/booking/StepBar";
import { TrustSignals } from "@/components/booking/TrustSignals";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { createBooking, getCartSessionId } from "@/lib/api";
import { removeFromRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCart } from "@/hooks/useCart";
import { useCartContext } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import type { InputFieldDef } from "@/lib/validations";

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
  const [summaryOpen, setSummaryOpen] = useState(false);

  const items = useMemo(() => {
    const ids = search.get("bookingIds")?.split(",").filter(Boolean) ?? [];
    return (cart?.items ?? []).filter((item) => ids.includes(item.id));
  }, [cart, search]);

  const currencies = useMemo(
    () => Array.from(new Set(items.map((i) => i.currency))),
    [items],
  );

  const allInputFields = useMemo(() => {
    const fieldMap = new Map<string, InputFieldDef>();
    for (const item of items) {
      const fields = item.inputFields as InputFieldDef[] | undefined;
      if (!fields) continue;
      for (const f of fields) {
        if (!fieldMap.has(f.id)) fieldMap.set(f.id, f);
      }
    }
    return Array.from(fieldMap.values());
  }, [items]);

  const total = items.reduce((s, i) => s + (i.priceAmount || 0), 0);
  const primaryCurrency = items[0]?.currency || "USD";

  const onSubmit = async (values: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    const sessionId = getCartSessionId();
    const bookingResults: BookingResult[] = [];

    for (const item of items) {
      const idempotencyKey =
        crypto.randomUUID?.() ?? `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const inputFields = allInputFields.map((f) => ({
        id: f.id,
        value: values[f.id] != null ? String(values[f.id]) : "",
      }));

      const result = await createBooking(
        {
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
          firstName: String(values.firstName ?? ""),
          lastName: String(values.lastName ?? ""),
          email: String(values.email ?? ""),
          phone: String(values.phone ?? ""),
          currencyCode: item.currency,
          priceAmount: item.priceAmount,
          specialRequests: String(values.specialRequests ?? ""),
          variantInputFields: inputFields,
        },
        sessionId,
        idempotencyKey,
      );

      if (result.error) {
        bookingResults.push({ title: item.title, status: "FAILED", error: result.error });
      } else if (result.data) {
        bookingResults.push({
          bookingId: result.data.bookingId,
          title: item.title,
          status: result.data.status,
        });
        removeFromRecentlyViewed(item.productId || item.experienceId);
        removeItem(item.id).catch(() => { });
      }
    }

    setResults(bookingResults);
    setCompleted(true);
    setSubmitting(false);
  };

  // Loading state
  if (cartLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading your cart…</p>
        </div>
      </div>
    );
  }

  // Completion state
  if (completed) {
    const allOk = results.every((r) => r.status !== "FAILED");
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex flex-col items-center gap-4 text-center py-6">
            {allOk ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg animate-scale-in">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                </div>
                <div>
                  <h1 className="text-display-sm font-bold">All Bookings Confirmed!</h1>
                  <p className="text-muted-foreground mt-2">
                    {results.length} booking{results.length !== 1 ? "s" : ""} confirmed successfully.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 animate-scale-in">
                  <XCircle className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-display-sm font-bold">Some Bookings Failed</h1>
                  <p className="text-muted-foreground mt-2">Please review the results below.</p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border bg-card shadow-glass overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30">
              <h2 className="font-semibold text-sm">Booking Results</h2>
            </div>
            <div className="divide-y">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    {r.bookingId && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {r.bookingId}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      r.status === "FAILED"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700",
                    )}
                  >
                    {r.status === "FAILED" ? r.error || "Failed" : "Confirmed"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="h-12 flex-1 rounded-xl font-semibold">
              <a
                href="/products"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Explore More</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 flex-1 rounded-xl font-semibold">
              <a href="/">Back to Home</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-muted-foreground">No items selected for checkout.</p>
        <Button asChild className="h-12 rounded-xl px-8">
          <a href="/cart">Back to Cart</a>
        </Button>
      </div>
    );
  }

  const summaryItems = items.map((item) => ({
    title: item.title,
    imageUrl: item.imageUrl || undefined,
    date: item.date,
    startDateTime: item.startDateTime || undefined,
    currency: item.currency,
    priceAmount: item.priceAmount,
    guestCounts: item.guestCounts ?? { ADULT: item.adults },
  }));

  return (
    <div className="container py-8 sm:py-10">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <StepBar currentStep={2} />

        {currencies.length > 1 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Items have different currencies ({currencies.join(", ")}). Prices are per-item at time of booking.
          </div>
        )}

        <div className="gap-8 lg:grid lg:grid-cols-[1fr_380px]">
          {/* Form column */}
          <div className="space-y-6">
            {/* Mobile: collapsible order summary */}
            <div className="lg:hidden">
              <button
                onClick={() => setSummaryOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-2xl border bg-card px-5 py-4 shadow-glass"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <PriceDisplay amount={total} currency={primaryCurrency} className="font-bold" />
                </div>
                {summaryOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {summaryOpen && (
                <div className="mt-2">
                  <OrderSummary items={summaryItems} currency={primaryCurrency} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-card shadow-glass p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Traveller Details</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  One set of details applies to all bookings
                </p>
              </div>
              <CustomerDetailsForm
                submitLabel={`Confirm & Book All (${items.length})`}
                submitting={submitting}
                inputFields={allInputFields}
                onSubmit={onSubmit}
              />
            </div>
            <TrustSignals />
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <OrderSummary items={summaryItems} currency={primaryCurrency} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
