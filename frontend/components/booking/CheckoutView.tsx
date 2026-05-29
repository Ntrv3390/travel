"use client";

import { useSearchParams } from "next/navigation";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { OrderSummary } from "@/components/booking/OrderSummary";
import { MultiCheckoutView } from "@/components/booking/MultiCheckoutView";

export function CheckoutView() {
  const search = useSearchParams();
  const isMulti = search.get("multi") === "true";

  if (isMulti) {
    return <MultiCheckoutView />;
  }

  return (
    <CheckoutProvider>
      <div className="container py-section">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-display-sm font-bold">Checkout</h1>
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 text-lg font-semibold">Your Details</h2>
              <CheckoutForm />
            </div>
            <div className="space-y-4">
              <OrderSummary />
            </div>
          </div>
        </div>
      </div>
    </CheckoutProvider>
  );
}
