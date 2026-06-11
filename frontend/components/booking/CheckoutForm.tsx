"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { StepBar } from "@/components/booking/StepBar";
import { TrustSignals } from "@/components/booking/TrustSignals";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { createBooking, getCartSessionId } from "@/lib/api";
import { removeFromRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCheckout } from "@/context/CheckoutContext";
import { useCartContext } from "@/context/CartContext";
import Link from "next/link";
import { useToast } from "@/components/ui/toaster";

const STANDARD_CUSTOMER_FIELDS = new Set(["NAME", "EMAIL", "PHONE"]);

export function CheckoutForm() {
  const router = useRouter();
  const { info } = useCheckout();
  const { removeItem } = useCartContext();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = async (values: Record<string, unknown>) => {
    if (submitting) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSubmitting(true);

    const idempotencyKey = crypto.randomUUID?.() ?? `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const sessionId = getCartSessionId();
    const isDynamic = info.inputFields.length > 0;

    const variantInputFields = isDynamic
      ? info.inputFields
        .filter((f) => !STANDARD_CUSTOMER_FIELDS.has(f.id))
        .map((f) => ({ id: f.id, value: String(values[f.id] ?? "") }))
      : undefined;

    const firstName = isDynamic
      ? String(values.NAME ?? values.firstName ?? "").split(" ")[0] || ""
      : String(values.firstName ?? "");
    const lastName = isDynamic
      ? String(values.NAME ?? "").includes(" ")
        ? String(values.NAME ?? "").split(" ").slice(1).join(" ")
        : ""
      : String(values.lastName ?? "");
    const email = isDynamic ? String(values.EMAIL ?? values.email ?? "") : String(values.email ?? "");
    const phone = isDynamic ? String(values.PHONE ?? values.phone ?? "") : String(values.phone ?? "");

    const result = await createBooking(
      {
        productId: info.productId,
        productName: info.productName,
        variantId: info.variantId,
        variantName: info.variantName,
        inventoryId: info.inventoryId,
        inventoryType: info.inventoryType,
        date: info.date,
        startDateTime: info.startDateTime,
        endDateTime: info.endDateTime,
        adults: info.guestCounts?.ADULT || 1,
        children: info.guestCounts?.CHILD || 0,
        guestCounts: info.guestCounts,
        firstName,
        lastName,
        email,
        phone,
        currencyCode: info.currency,
        priceAmount: info.bookingPrice,
        specialRequests: isDynamic ? undefined : String(values.specialRequests ?? ""),
        variantInputFields,
      },
      sessionId,
      idempotencyKey,
    );

    if (result.error) {
      toast({ title: "Booking failed", description: result.error, variant: "error" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Booking confirmed!", description: "Your booking has been confirmed.", variant: "success" });
    const booking = result.data;
    removeFromRecentlyViewed(info.productId || info.experienceId);
    if (info.cartItemId) removeItem(info.cartItemId).catch(() => { });

    const bookingId = booking?.bookingId;
    if (!bookingId) {
      toast({ title: "Booking confirmed", description: "Check your email for confirmation details.", variant: "success" });
      router.push("/");
      return;
    }
    router.push(`/checkout/confirmation?bookingId=${encodeURIComponent(bookingId)}`);
  };

  const summaryItem = {
    title: info.productName || info.title,
    imageUrl: info.imageUrl || undefined,
    date: info.date,
    startDateTime: info.startDateTime || undefined,
    currency: info.currency,
    priceAmount: info.bookingPrice,
    guestCounts: info.guestCounts ?? { ADULT: 1 },
  };

  if (info.experienceId === '') {
    if (!info.experienceId) {
      return (
        <div className="container flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-lg text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <span className="text-4xl">🎟️</span>
            </div>

            <h1 className="text-6xl font-extrabold tracking-tight">404</h1>

            <h2 className="mt-4 text-2xl font-semibold">
              Experience Not Found
            </h2>

            <p className="mt-3 text-muted-foreground">
              The experience you&apos;re trying to book is unavailable, expired,
              or the session has been cleared.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push("/")}
                className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90"
              >
                Go Home
              </button>

              <button
                onClick={() => router.push("/products")}
                className="rounded-xl border px-6 py-3 font-medium transition hover:bg-muted"
              >
                Browse Experiences
              </button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Need help? Contact our <Link href="/help" className="underline">
                support team
              </Link> and we&apos;ll assist you.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="container py-8 sm:py-10 pb-10">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <StepBar currentStep={2} />

        {info.loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="gap-8 lg:grid lg:grid-cols-[1fr_380px]">
            {/* Form column */}
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card shadow-glass p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold">Traveller Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter details for the lead traveller
                  </p>
                </div>
                <CustomerDetailsForm
                  submitLabel="Confirm & Book"
                  submitting={submitting}
                  inputFields={info.inputFields}
                  onSubmit={onSubmit}
                />
              </div>
              <TrustSignals />
            </div>

            {/* Summary column — mobile: above form via order, desktop: sidebar */}
            <div className="order-first lg:order-last mt-0 mb-6 lg:mb-0">
              <div className="lg:sticky lg:top-24">
                <OrderSummary items={[summaryItem]} currency={info.currency} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
