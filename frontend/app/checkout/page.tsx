import type { Metadata } from "next";
import { CheckoutView } from "@/components/booking/CheckoutView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout | Triipzy",
  description: "Complete your booking securely.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
