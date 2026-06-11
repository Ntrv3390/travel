"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, ArrowRight, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { CartItemCard } from "@/components/booking/CartItemCard";
import { useCart } from "@/hooks/useCart";
import { useCartContext } from "@/context/CartContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/components/ui/toaster";
import type { CartItem } from "@/types/booking";

interface ActivityGroup {
  experienceId: string;
  title: string;
  currency: string;
  bookings: CartItem[];
  activityTotal: number;
}

function groupItems(items: CartItem[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();
  for (const item of items) {
    const key = item.experienceId;
    let g = groups.get(key);
    if (!g) {
      g = { experienceId: key, title: item.title, currency: item.currency, bookings: [], activityTotal: 0 };
      groups.set(key, g);
    }
    g.bookings.push(item);
    g.activityTotal += item.priceAmount;
  }
  return Array.from(groups.values());
}

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, clearCart, itemCount, staleCurrency } = useCart();
  const { removeItem } = useCartContext();
  const { currency, isChanging } = useCurrency();
  const { toast } = useToast();
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const items = useMemo(() => cart?.items ?? [], [cart?.items]);
  const groups = useMemo(() => groupItems(items), [items]);
  const cartTotal = groups.reduce((s, g) => s + g.activityTotal, 0);

  const handleRemoveGroup = async (group: ActivityGroup) => {
    try {
      for (const b of group.bookings) await removeItem(b.id);
      toast({ title: "Removed", description: `${group.title} removed from your cart.`, variant: "success" });
    } catch {
      toast({ title: "Failed to remove", description: "Could not remove activity.", variant: "error" });
    }
  };

  function handleCheckout(item: CartItem) {
    if (checkingOut) return;
    setCheckingOut(item.id);
    router.push(`/checkout?cartItemId=${item.id}`);
  }

  function handleCheckoutAll() {
    const ids = items.map((i) => i.id).join(",");
    router.push(`/checkout?bookingIds=${ids}`);
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-2xl lg:max-w-5xl space-y-4">
          <Skeleton className="h-8 w-48 mb-8" />
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-6">
              <PackageX className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Your cart is empty</h1>
            <p className="text-muted-foreground">
              Browse our experiences and add something wonderful to your cart.
            </p>
          </div>
          <Button
            size="lg"
            className="h-12 rounded-xl px-8"
            onClick={() => router.push("/products")}
          >
            Browse Experiences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-10 pb-28 lg:pb-10">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-display-sm">Your Cart</h1>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={async () => {
              try {
                await clearCart();
                toast({ title: "Cart cleared", variant: "success" });
              } catch {
                toast({ title: "Failed to clear cart", variant: "error" });
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear all
          </Button>
        </div>

        {staleCurrency && !isChanging && (
          <Alert className="mb-6 rounded-xl border-amber-200 bg-amber-50 text-amber-800">
            <AlertDescription>
              Some items were priced in a different currency. Final prices will be confirmed at checkout.
            </AlertDescription>
          </Alert>
        )}

        <div className="gap-8 lg:grid lg:grid-cols-[1fr_360px]">
          {/* Items list */}
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.experienceId} className="overflow-hidden rounded-2xl border bg-card shadow-glass">
                {/* Group header */}
                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingCart className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="truncate text-sm font-semibold">{group.title}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveGroup(group)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>

                {/* Booking rows */}
                <div className="divide-y">
                  {group.bookings.map((booking) => (
                    <div key={booking.id}>
                      <CartItemCard item={booking} />
                      <div className="px-5 pb-4">
                        <Button
                          className="w-full h-10 rounded-xl text-sm font-semibold sm:w-auto sm:px-6"
                          onClick={() => handleCheckout(booking)}
                          disabled={checkingOut === booking.id}
                        >
                          {checkingOut === booking.id ? (
                            "Redirecting…"
                          ) : (
                            <>
                              Book this{" "}
                              <ArrowRight className="ml-1.5 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Activity total footer */}
                <div className="border-t bg-muted/20 px-5 py-3 flex items-center justify-end gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Activity total
                  </span>
                  <PriceDisplay amount={group.activityTotal} currency={group.currency} className="text-sm font-bold" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border bg-card shadow-glass p-6 space-y-5">
              <h2 className="font-semibold text-lg">Summary</h2>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.experienceId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{g.title}</span>
                    <PriceDisplay amount={g.activityTotal} currency={g.currency} className="shrink-0 font-medium" />
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <PriceDisplay
                    amount={cartTotal}
                    currency={currency}
                    showSkeleton={isChanging}
                    className="text-xl font-bold"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Prices confirmed at booking</p>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold"
                onClick={handleCheckoutAll}
                disabled={checkingOut !== null}
              >
                Checkout All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure checkout
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-md p-4 lg:hidden animate-slide-in-bottom">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <PriceDisplay
              amount={cartTotal}
              currency={currency}
              showSkeleton={isChanging}
              className="text-lg font-bold"
            />
          </div>
          <Button
            className="h-12 flex-1 rounded-xl text-base font-semibold max-w-xs"
            onClick={handleCheckoutAll}
            disabled={checkingOut !== null}
          >
            Checkout All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
