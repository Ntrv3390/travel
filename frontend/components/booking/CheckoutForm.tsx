"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { createBooking, getCartSessionId } from "@/lib/api";
import { useCheckout } from "@/context/CheckoutContext";
import { useCartContext } from "@/context/CartContext";
import { useToast } from "@/components/ui/toaster";

export function CheckoutForm() {
  const router = useRouter();
  const { info } = useCheckout();
  const { removeItem } = useCartContext();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const onSubmit = async (values: { firstName: string; lastName: string; email: string; phone: string; specialRequests?: string }) => {
    if (submitting) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID?.() ?? `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const sessionId = getCartSessionId();

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
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      currencyCode: info.currency,
      priceAmount: info.bookingPrice,
      specialRequests: values.specialRequests,
    }, sessionId, idempotencyKey);

    if (result.error) {
      toast({ title: "Booking failed", description: result.error, variant: "error" });
      setSubmitting(false);
      return;
    }

    toast({ title: "Booking confirmed", description: "Your booking has been confirmed.", variant: "success" });
    const booking = result.data;
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
    params.set("firstName", values.firstName);
    router.push(`/checkout/confirmation?${params.toString()}`);
  };

  return <CustomerDetailsForm submitLabel="Confirm & Book" submitting={submitting} onSubmit={onSubmit} />;
}
