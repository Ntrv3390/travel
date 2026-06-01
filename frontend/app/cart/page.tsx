"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { CartItemCard } from "@/components/booking/CartItemCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCart } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/components/ui/toaster";
import type { CartItem } from "@/types/booking";

interface BookingRow {
  item: CartItem;
  subtitle: number;
}

interface ActivityGroup {
  experienceId: string;
  title: string;
  imageUrl: string;
  currency: string;
  bookings: BookingRow[];
  activityTotal: number;
}

function groupItems(items: CartItem[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();

  for (const item of items) {
    const key = item.experienceId;
    let group = groups.get(key);
    if (!group) {
      group = {
        experienceId: key,
        title: item.title,
        imageUrl: item.imageUrl,
        currency: item.currency,
        bookings: [],
        activityTotal: 0,
      };
      groups.set(key, group);
    }

    group.bookings.push({ item, subtitle: item.priceAmount });
    group.activityTotal += item.priceAmount;
  }

  return Array.from(groups.values());
}

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, clearCart, updateCartItem, removeItem, itemCount, staleCurrency } = useCart();
  const { currency, isChanging } = useCurrency();
  const { toast } = useToast();
  const [bookingId, setBookingId] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const groups = useMemo(() => groupItems(items), [items]);
  const cartTotal = groups.reduce((sum, g) => sum + g.activityTotal, 0);

  const handleUpdateGuest = async (itemId: string, guestCounts: Record<string, number>, priceAmount: number) => {
    try {
      await updateCartItem(itemId, {
        guestCounts,
        adults: guestCounts.ADULT ?? 0,
        children: guestCounts.CHILD ?? 0,
        priceAmount,
      });
    } catch {
      toast({ title: "Failed to update", description: "Could not update guest count.", variant: "error" });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast({ title: "Removed", description: "Item removed from your cart.", variant: "success" });
    } catch {
      toast({ title: "Failed to remove", description: "Could not remove item.", variant: "error" });
    }
  };

  const handleRemoveActivity = async (group: ActivityGroup) => {
    try {
      for (const booking of group.bookings) {
        await removeItem(booking.item.id);
      }
      toast({ title: "Removed", description: `${group.title} removed from your cart.`, variant: "success" });
    } catch {
      toast({ title: "Failed to remove", description: "Could not remove activity.", variant: "error" });
    }
  };

  function handleCheckout(item: CartItem) {
    if (bookingId) return;
    setBookingId(item.id);
    const guestCounts = item.guestCounts ?? { ADULT: item.adults };
    const params = new URLSearchParams({
      productId: item.productId || item.experienceId,
      variantId: item.variantId,
      inventoryId: item.inventoryId ?? "",
      inventoryType: item.inventoryType || "NORMAL",
      date: item.date,
      startDateTime: item.startDateTime || "",
      endDateTime: item.endDateTime || "",
      title: item.title,
      // Pass the currency of the cart item specifically, but do NOT pass price (server decides price)
      currency: item.currency,
      guestCounts: JSON.stringify(guestCounts),
      cartItemId: item.id,
      productName: item.title,
      variantName: item.title,
      imageUrl: item.imageUrl ?? "",
    });
    router.push(`/checkout?${params.toString()}`);
  }

  function handleCheckoutAll() {
    const allIds = items.map((i) => i.id).join(",");
    router.push(`/checkout?multi=true&bookingIds=${allIds}`);
  }

  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-display-sm font-bold">Your Cart</h1>
          {itemCount > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={async () => {
              try {
                await clearCart();
                toast({ title: "Cart cleared", description: "All items removed.", variant: "success" });
              } catch {
                toast({ title: "Failed to clear", description: "Could not clear your cart.", variant: "error" });
              }
            }}>
              Clear cart
            </Button>
          )}
        </div>

        {staleCurrency && !isChanging && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
            <AlertDescription>
              Your cart items were priced in a different currency. Prices may have changed.
            </AlertDescription>
          </Alert>
        )}

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
          <div className="space-y-6">
            {groups.map((group) => (
              <Card key={group.experienceId} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    {group.imageUrl && (
                      <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg">
                        <img src={group.imageUrl} alt={group.title} className="object-cover w-full h-full" />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold">{group.title}</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => handleRemoveActivity(group)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Activity
                  </Button>
                </CardHeader>

                <div className="divide-y">
                  {group.bookings.map((booking) => (
                    <div key={booking.item.id} className="group relative">
                      <CartItemCard
                        item={booking.item}
                        onUpdateGuest={handleUpdateGuest}
                        onRemove={handleRemoveItem}
                      />
                      <div className="flex justify-end px-4 pb-3">
                        <Button size="sm" onClick={() => handleCheckout(booking.item)} disabled={bookingId === booking.item.id}>
                          {bookingId === booking.item.id ? "Redirecting..." : "Book this"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t px-4 py-3 text-right text-sm font-semibold">
                  Activity Total: <PriceDisplay amount={group.activityTotal} currency={group.currency} />
                </div>
              </Card>
            ))}

            {items.length > 0 && (
              <Card className="sticky bottom-4">
                <CardContent className="flex items-center justify-between p-4">
                  <span className="font-semibold">
                    Cart Total: <PriceDisplay amount={cartTotal} currency={currency} showSkeleton={isChanging} />
                  </span>
                  <Button onClick={handleCheckoutAll} disabled={bookingId !== null}>
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
