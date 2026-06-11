"use client";

import { useSearchParams } from "next/navigation";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { MultiCheckoutView } from "@/components/booking/MultiCheckoutView";

export function CheckoutView() {
  const search = useSearchParams();
  // Derive multi/single from URL structure, not a tamperable flag.
  // Multi checkout: bookingIds param present (comma-separated cart item IDs).
  // Single checkout: cartItemId param present.
  const bookingIds = search.get("bookingIds");
  const isMulti = Boolean(bookingIds);

  if (isMulti) {
    return <MultiCheckoutView />;
  }

  return (
    <CheckoutProvider>
      <CheckoutForm />
    </CheckoutProvider>
  );
}
