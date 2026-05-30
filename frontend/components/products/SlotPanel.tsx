"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Clock, ShoppingCart, ArrowRight, Minus, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrency } from "@/hooks/useCurrency"
import { useCartContext } from "@/context/CartContext"
import { useProductDetail } from "@/context/ProductDetailContext"
import { useToast } from "@/components/ui/toaster"
import type { SlotItem } from "@/types/product"

interface SlotPanelProps {
  slots: SlotItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
  selectedDate: string
}

export function SlotPanel({ slots, loading, error, onRetry, selectedDate }: SlotPanelProps) {
  const { formatPrice, currency } = useCurrency()
  const { cart, addItem, updateCartItem } = useCartContext()
  const { productId, productName, variantId, variantName, imageUrl, initialGuests, cartItemId } = useProductDetail()
  const { toast } = useToast()
  const router = useRouter()
  const [guests, setGuests] = useState<Record<string, number>>(initialGuests ?? { ADULT: 1 })
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  if (loading) {
    return (
      <div className="mt-3 flex items-center justify-center rounded-lg border bg-muted/20 py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border bg-muted/20 py-6">
        <p className="text-xs text-red-500">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="mt-3 rounded-lg border bg-muted/20 py-6 text-center text-sm text-muted-foreground">
        No slots available for this date.
      </div>
    )
  }

  const getPriceForType = (slot: SlotItem, type: string) => {
    const person = slot.pricing.persons.find(p => p.type === type)
    return person?.headoutSellingPrice ?? person?.price ?? slot.pricing.persons[0]?.headoutSellingPrice ?? 0
  }

  const getBookingPriceForType = (slot: SlotItem, type: string) => {
    const person = slot.pricing.persons.find(p => p.type === type)
    return person?.price ?? person?.headoutSellingPrice ?? slot.pricing.persons[0]?.price ?? 0
  }

  const calculateTotalPrice = (slot: SlotItem) => {
    return Object.entries(guests).reduce((total, [type, count]) => {
      return total + (getPriceForType(slot, type) * count)
    }, 0)
  }

  const calculateTotalBookingPrice = (slot: SlotItem) => {
    return Object.entries(guests).reduce((total, [type, count]) => {
      return total + (getBookingPriceForType(slot, type) * count)
    }, 0)
  }

  const handleBookNow = (slot: SlotItem) => {
    const totalPrice = calculateTotalPrice(slot)
    const totalBookingPrice = calculateTotalBookingPrice(slot)
    const params = new URLSearchParams({
      productId,
      productName: productName ?? "Experience",
      variantId: String(variantId),
      variantName: variantName ?? "Standard",
      inventoryId: slot.id,
      inventoryType: "NORMAL",
      date: selectedDate,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      guestCounts: JSON.stringify(guests),
      price: String(totalPrice),
      bookingPrice: String(totalBookingPrice),
      currency: currency ?? "USD",
      title: variantName ?? productName ?? "Experience",
    })
    router.push(`/checkout?${params.toString()}`)
  }

  const handleAddToCart = async (slot: SlotItem) => {
    setAddingToCart(true)
    setSelectedSlotId(slot.id)
    const totalBookingPrice = calculateTotalBookingPrice(slot)
    try {
      const existing = (cart?.items ?? []).find(
        (i) =>
          i.experienceId === productId &&
          i.variantId === String(variantId) &&
          i.date === selectedDate &&
          i.inventoryId === slot.id
      )
      if (existing) {
        const mergedGuests = { ...guests }
        const currentTotal = Object.values(mergedGuests).reduce((a, b) => a + b, 0)
        const existingTotal = Object.values(existing.guestCounts ?? {}).reduce((a, b) => a + b, 0)
        if (existingTotal > 0) {
          for (const [type, count] of Object.entries(existing.guestCounts ?? {})) {
            mergedGuests[type] = (mergedGuests[type] ?? 0) + count
          }
        }
        const newTotal = Object.values(mergedGuests).reduce((a, b) => a + b, 0)
        const unitPrice = existingTotal > 0 ? existing.priceAmount / existingTotal : totalBookingPrice / currentTotal
        const newPrice = Math.round(newTotal * unitPrice * 100) / 100
        await updateCartItem(existing.id, {
          guestCounts: mergedGuests,
          adults: mergedGuests.ADULT ?? 0,
          children: mergedGuests.CHILD ?? 0,
          priceAmount: newPrice,
        })
        setGuests(mergedGuests)
        toast({ title: "Cart updated", description: `Guest count updated for ${variantName ?? productName ?? "Experience"}.`, variant: "success" })
      } else {
        await addItem({
          experienceId: productId,
          productId,
          variantId: String(variantId),
          inventoryId: slot.id,
          inventoryType: "NORMAL",
          date: selectedDate,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          adults: guests.ADULT ?? 1,
          children: guests.CHILD ?? 0,
          guestCounts: guests,
          title: variantName ?? productName ?? "Experience",
          priceAmount: totalBookingPrice,
          currency: currency ?? "USD",
          imageUrl,
          addedAt: new Date().toISOString(),
        })
        toast({ title: "Added to cart", description: `${variantName ?? productName ?? "Experience"} added to your cart.`, variant: "success" })
      }
    } catch (err) {
      toast({ title: "Failed to add", description: err instanceof Error ? err.message : "Could not add item to cart. Please try again.", variant: "error" })
    } finally {
      setAddingToCart(false)
      setSelectedSlotId(null)
    }
  }

  const totalGuests = Object.values(guests).reduce((a, b) => a + b, 0)
  const peopleSummary = Object.entries(guests).map(([type, count]) => count > 0 ? `${count} ${type.toLowerCase()}${count !== 1 ? "s" : ""}` : "").filter(Boolean).join(", ")

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} available on {selectedDate}
        </p>
        <p className="text-xs text-muted-foreground">{peopleSummary}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-2.5">
        <span className="text-xs font-medium text-muted-foreground">Guests</span>
        <div className="flex flex-wrap items-center gap-3">
          {slots[0].pricing.persons.map((p) => (
            <div key={p.type} className="flex items-center gap-1.5">
              <button
                onClick={() => setGuests(prev => ({ ...prev, [p.type]: Math.max(0, (prev[p.type] || 0) - 1) }))}
                className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[3ch] text-center text-sm font-medium">{guests[p.type] || 0}</span>
              <button
                onClick={() => setGuests(prev => ({ ...prev, [p.type]: Math.min(20, (prev[p.type] || 0) + 1) }))}
                className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-xs text-muted-foreground capitalize">{p.type.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>

      {slots.map((slot) => {
        const startTime = slot.startDateTime.split("T")[1]?.slice(0, 5) ?? slot.startDateTime
        const endTime = slot.endDateTime.split("T")[1]?.slice(0, 5) ?? slot.endDateTime
        const isClosed = slot.availability === "CLOSED"
        const availBadge = isClosed
          ? "bg-red-100 text-red-700 border-red-200"
          : slot.availability === "LIMITED"
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-green-100 text-green-700 border-green-200"

        const totalPrice = calculateTotalPrice(slot)

        return (
          <Card key={slot.id} className={isClosed ? "opacity-50" : ""}>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{startTime} – {endTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border text-[10px] font-medium ${availBadge}`}>
                    {slot.availability === "UNLIMITED" ? "Unlimited" : slot.availability === "LIMITED" ? "Limited" : "Closed"}
                  </Badge>
                </div>
              </div>

              {slot.pricing.persons.length > 0 && !isClosed && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1 pr-2 text-left font-medium">Type</th>
                        <th className="py-1 px-2 text-left font-medium">Age</th>
                        <th className="py-1 px-2 text-right font-medium">Price</th>
                        <th className="py-1 pl-2 text-right font-medium">Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slot.pricing.persons.map((p) => (
                        <tr key={p.type} className="border-b last:border-0">
                          <td className="py-1 pr-2 font-medium">{p.name}</td>
                          <td className="py-1 px-2 text-muted-foreground">
                            {p.ageFrom}–{p.ageTo ?? "99+"}
                          </td>
                          <td className="py-1 px-2 text-right font-semibold">{formatPrice(p.price)}</td>
                          <td className="py-1 pl-2 text-right text-muted-foreground">
                            {p.availability === "CLOSED" ? "—" : p.remaining}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {slot.pricing.groups.length > 0 && !isClosed && (
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1 text-[10px] font-medium text-muted-foreground">Group pricing</p>
                  <div className="flex flex-wrap gap-2">
                    {slot.pricing.groups.map((g, i) => (
                      <Badge key={i} className="border-slate-200 bg-slate-50 text-[10px] text-slate-700">
                        Up to {g.size}: {formatPrice(g.price)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!isClosed && (
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div>
                    <p className="text-sm font-bold">{formatPrice(totalPrice)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {totalGuests} guest{totalGuests !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToCart(slot)}
                      disabled={addingToCart}
                      className="gap-1.5"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {addingToCart && selectedSlotId === slot.id ? "Adding..." : "Add to Cart"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleBookNow(slot)}
                      className="gap-1.5"
                    >
                      Book Now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
