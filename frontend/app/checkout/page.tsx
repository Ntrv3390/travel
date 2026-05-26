import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { OrderSummary } from "@/components/booking/OrderSummary";

export const dynamic = "force-dynamic";

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: {
    title?: string;
    date?: string;
    adults?: string;
    children?: string;
    price?: string;
    currency?: string;
  };
}) {
  const title = searchParams.title ?? "Experience";
  const adults = parseInt(searchParams.adults ?? "1", 10);
  const children = parseInt(searchParams.children ?? "0", 10);
  const price = parseFloat(searchParams.price ?? "0");
  const currency = searchParams.currency ?? "USD";
  const guests = adults + children;

  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-display-sm font-bold">Checkout</h1>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border p-6">
            <h2 className="mb-4 text-lg font-semibold">Your Details</h2>
            <CheckoutForm />
          </div>
          <div className="space-y-4">
            <OrderSummary
              title={title}
              guests={guests}
              price={price * guests}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
