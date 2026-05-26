import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { PaymentForm } from "@/components/booking/PaymentForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-display-sm font-bold">Checkout</h1>
        <div className="grid gap-6 rounded-xl border p-6">
          <CheckoutForm />
          <PaymentForm />
        </div>
      </div>
    </div>
  );
}
