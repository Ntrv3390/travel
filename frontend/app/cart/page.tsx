"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { getCart, removeCartItem, getCartSessionId, clearCart } from "@/lib/api";

interface CartItemData {
  id: string;
  experienceId: string;
  variantId: string;
  date: string;
  adults: number;
  children: number;
  priceAmount?: number;
  currency?: string;
  title?: string;
  imageUrl?: string;
  addedAt: string;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const sid = getCartSessionId();
    setSessionId(sid);
    if (!sid) {
      setLoading(false);
      return;
    }
    fetchCart(sid);
  }, []);

  async function fetchCart(sid: string) {
    setLoading(true);
    const result = await getCart(sid);
    if (result.data?.items) {
      setItems(result.data.items);
    } else {
      setItems([]);
    }
    setLoading(false);
  }

  async function handleRemove(itemId: string) {
    const result = await removeCartItem(sessionId, itemId);
    if (result.data?.items) {
      setItems(result.data.items);
    } else {
      setItems(items.filter((i) => i.id !== itemId));
    }
  }

  async function handleClear() {
    await clearCart(sessionId);
    setItems([]);
  }

  function handleCheckout(item: CartItemData) {
    const params = new URLSearchParams({
      experienceId: item.experienceId,
      variantId: item.variantId,
      date: item.date,
      adults: String(item.adults),
      children: String(item.children),
      title: item.title ?? "",
      price: String(item.priceAmount ?? 0),
      currency: item.currency ?? "USD",
      imageUrl: item.imageUrl ?? "",
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="container py-section">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-display-sm font-bold">Your Cart</h1>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleClear}>
              Clear cart
            </Button>
          )}
        </div>

        {loading ? (
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
              <Card key={item.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="relative h-20 w-20 flex-none overflow-hidden rounded-lg">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.title ?? ""} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{item.title ?? "Experience"}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.adults > 0 && `${item.adults} adult${item.adults > 1 ? "s" : ""}`}
                      {item.children > 0 && `, ${item.children} child${item.children > 1 ? "ren" : ""}`}
                    </p>
                    {item.priceAmount != null && (
                      <p className="mt-1 font-semibold">
                        <PriceDisplay amount={item.priceAmount * (item.adults + item.children)} currency={item.currency ?? "USD"} />
                      </p>
                    )}
                  </div>
                  <div className="flex flex-none flex-col gap-2">
                    <Button size="sm" onClick={() => handleCheckout(item)}>
                      Book now
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleRemove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
