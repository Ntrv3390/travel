"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/components/ui/toaster";
import { addCartItem, getCartSessionId } from "@/lib/api";

interface BookingWidgetOptions {
  experienceId: string;
  variantId: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string;
  date?: string;
  setDate?: (date: string) => void;
  inventoryId?: string;
  setInventoryId?: (inventoryId: string) => void;
  startDateTime?: string;
  endDateTime?: string;
}

export function useBookingWidget(options: BookingWidgetOptions) {
  const router = useRouter();
  const { addItem, cart, updateCartItem } = useCart();
  const { toast } = useToast();

  const bookingInFlight = useRef(false);

  const [internalDate, setInternalDate] = useState("");
  const [internalInventoryId, setInternalInventoryId] = useState("");
  const date = options.date ?? internalDate;
  const setDate = options.setDate ?? setInternalDate;
  const inventoryId = options.inventoryId ?? internalInventoryId;
  const setInventoryId = options.setInventoryId ?? setInternalInventoryId;
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const total = useMemo(() => {
    return options.price * (adultCount + childCount);
  }, [options.price, adultCount, childCount]);

  const canBook = Boolean(date && options.variantId);

  const isInCart = () => {
    const items = cart?.items ?? [];
    return items.some(
      (item) =>
        item.experienceId === options.experienceId &&
        item.variantId === options.variantId &&
        item.date === date,
    );
  };

  const handleBookNow = async () => {
    if (!canBook) return;
    if (bookingInFlight.current) return;
    bookingInFlight.current = true;
    setIsBooking(true);
    try {
      const sessionId = getCartSessionId();
      const result = await addCartItem(sessionId, {
        experienceId: options.experienceId,
        productId: "",
        variantId: options.variantId,
        inventoryId,
        inventoryType: "NORMAL",
        date,
        startDateTime: options.startDateTime ?? "",
        endDateTime: options.endDateTime ?? "",
        adults: adultCount,
        children: childCount,
        guestCounts: { ADULT: adultCount, ...(childCount > 0 ? { CHILD: childCount } : {}) },
        title: options.title,
        priceAmount: total,
        currency: options.currency,
        imageUrl: options.imageUrl,
        inputFields: [],
      });

      if (result.error || !result.data) {
        toast({ title: "Booking failed", description: result.error ?? "Could not add item to cart.", variant: "error" });
        return;
      }

      const raw = result.data as unknown as Record<string, unknown>;
      const cart = (raw.data as Record<string, unknown> ?? raw) as { items?: Array<Record<string, unknown>>; id?: string };
      const itemId = cart.items?.find((item) => item.variantId === options.variantId && item.date === date)?.id ?? cart.items?.[cart.items.length - 1]?.id;

      if (itemId) {
        router.push(`/checkout?cartItemId=${itemId}`);
      } else {
        toast({ title: "Booking failed", description: "Unable to determine cart item for checkout.", variant: "error" });
      }
    } finally {
      setIsBooking(false);
      bookingInFlight.current = false;
    }
  };

  const handleAddToCart = async () => {
    if (!canBook || !date) return false;
    setIsAddingToCart(true);
    try {
      const cartItems = cart?.items ?? [];
      const existing = cartItems.find(
        (item) =>
          item.experienceId === options.experienceId &&
          item.variantId === options.variantId &&
          item.date === date,
      );
      if (existing) {
        const mergedGuests: Record<string, number> = { ADULT: adultCount };
        if (childCount > 0) mergedGuests.CHILD = childCount;
        const existingGuests = existing.guestCounts ?? {};
        for (const [type, count] of Object.entries(existingGuests)) {
          mergedGuests[type] = (mergedGuests[type] ?? 0) + count;
        }
        const mergedTotal = Object.values(mergedGuests).reduce((a, b) => a + b, 0);
        const existingTotal = Object.values(existingGuests).reduce((a, b) => a + b, 0);
        const unitPrice = existingTotal > 0 ? existing.priceAmount / existingTotal : options.price;
        const newPrice = Math.round(mergedTotal * unitPrice * 100) / 100;
        await updateCartItem(existing.id, {
          guestCounts: mergedGuests,
          adults: mergedGuests.ADULT ?? 0,
          children: mergedGuests.CHILD ?? 0,
          priceAmount: newPrice,
        });
        toast({ title: "Cart updated", description: `Guest count updated for ${options.title}.`, variant: "success" });
      } else {
        await addItem({
          experienceId: options.experienceId,
          productId: "",
          variantId: options.variantId,
          inventoryId,
          inventoryType: "",
          date,
          startDateTime: options.startDateTime ?? "",
          endDateTime: options.endDateTime ?? "",
          adults: adultCount,
          children: childCount,
          guestCounts: { ADULT: adultCount, ...(childCount > 0 ? { CHILD: childCount } : {}) },
          title: options.title,
          priceAmount: total,
          currency: options.currency,
          imageUrl: options.imageUrl,
          addedAt: new Date().toISOString(),
        });
        toast({ title: "Added to cart", description: `${options.title} has been added to your cart.`, variant: "success" });
      }
      return true;
    } catch (err) {
      toast({ title: "Failed to add", description: err instanceof Error ? err.message : "Could not add item to cart. Please try again.", variant: "error" });
      return false;
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddToCartDirect = async () => {
    if (!canBook) return;
    setIsAddingToCart(true);
    const sessionId = getCartSessionId();
    const result = await addCartItem(sessionId, {
      experienceId: options.experienceId,
      variantId: options.variantId,
      date,
      adults: adultCount,
      children: childCount,
      priceAmount: total,
      currency: options.currency,
      title: options.title,
      imageUrl: options.imageUrl,
    });
    setIsAddingToCart(false);
    if (result.error) {
      toast({ title: "Failed to add to cart", description: result.error, variant: "error" });
      return false;
    }
    toast({ title: "Added to cart", description: `${options.title} added to your cart.`, variant: "success" });
    return true;
  };

  return {
    date,
    setDate,
    inventoryId,
    setInventoryId,
    adultCount,
    setAdultCount,
    childCount,
    setChildCount,
    total,
    canBook,
    isAddingToCart,
    isBooking,
    handleBookNow,
    handleAddToCart,
    handleAddToCartDirect,
  };
}
