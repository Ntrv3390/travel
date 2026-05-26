import Link from "next/link";

export function CheckoutNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="text-lg font-bold text-brand-700">
          Traviia
        </Link>
        <p className="text-sm text-muted-foreground">Secure checkout</p>
      </div>
    </header>
  );
}
