"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { CartItemCard } from "@/components/booking/CartItemCard";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/types/booking";

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, clearCart, itemCount } = useCart();

  function handleCheckout(item: CartItem) {
    const params = new URLSearchParams({
      experienceId: item.experienceId,
      variantId: item.variantId,
      inventoryId: item.inventoryId ?? "",
      date: item.date,
      adults: String(item.adults),
      children: String(item.children),
      title: item.variantTitle,
      price: String(item.totalPrice),
      currency: item.currency,
    });
    if (item.time) params.set("time", item.time);
    router.push(`/checkout?${params.toString()}`);
  }

  const items = cart?.items ?? [];

  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-display-sm font-bold">Your Cart</h1>
          {itemCount > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearCart}>
              Clear cart
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            description="Browse experiences and add them to your cart to book."
            action={{ label: "Browse experiences", href: "/search" }}
          />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <CartItemCard item={item} />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={() => handleCheckout(item)}>
                    Book now
                  </Button>
                </div>
              </div>
            ))}
            {cart && (
              <Card className="sticky bottom-4">
                <CardContent className="flex items-center justify-between p-4">
                  <span className="font-semibold">
                    Total: <PriceDisplay amount={cart.totalPrice} currency={cart.currency} />
                  </span>
                  <Button onClick={() => router.push(`/checkout?multi=true&bookingIds=${items.map(i => i.id).join(",")}`)}>
                    Checkout All
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
