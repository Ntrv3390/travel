import { CheckoutNavbar } from "@/components/layout/CheckoutNavbar";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CheckoutNavbar />
      <main>{children}</main>
    </>
  );
}
