"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { createBooking, getCartSessionId } from "@/lib/api";
import { removeFromRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCheckout } from "@/context/CheckoutContext";
import { useCartContext } from "@/context/CartContext";
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
          .map((f) => ({
            id: f.id,
            value: String(values[f.id] ?? ""),
          }))
      : undefined;

    const firstName = isDynamic
      ? String(values.NAME ?? values.firstName ?? "").split(" ")[0] || ""
      : String(values.firstName ?? "");
    const lastName = isDynamic
      ? String(values.NAME ?? "").includes(" ")
        ? String(values.NAME ?? "").split(" ").slice(1).join(" ")
        : ""
      : String(values.lastName ?? "");
    const email = isDynamic
      ? String(values.EMAIL ?? values.email ?? "")
      : String(values.email ?? "");
    const phone = isDynamic
      ? String(values.PHONE ?? values.phone ?? "")
      : String(values.phone ?? "");

    const result = await createBooking({
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
    }, sessionId, idempotencyKey);

    if (result.error) {
      toast({ title: "Booking failed", description: result.error, variant: "error" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Booking confirmed", description: "Your booking has been confirmed.", variant: "success" });
    const booking = result.data;
    removeFromRecentlyViewed(info.productId || info.experienceId);
    if (info.cartItemId) {
      removeItem(info.cartItemId).catch(() => {});
    }
    const params = new URLSearchParams();
    params.set("title", info.title);
    if (booking) {
      params.set("bookingRef", booking.partnerReferenceId || booking.bookingId);
      params.set("bookingId", booking.bookingId);
      params.set("status", booking.status);
      params.set("emailSent", String(booking.confirmationEmailSent));
    }
    const displayName = isDynamic
      ? String(values.NAME ?? firstName ?? "")
      : String(values.firstName ?? "");
    params.set("firstName", displayName);
    router.push(`/checkout/confirmation?${params.toString()}`);
  };

  return (
    <CustomerDetailsForm
      submitLabel="Confirm & Book"
      submitting={submitting}
      inputFields={info.inputFields}
      onSubmit={onSubmit}
    />
  );
}
