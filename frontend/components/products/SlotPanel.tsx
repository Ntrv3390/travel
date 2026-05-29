"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Clock, Users, ShoppingCart, ArrowRight, Minus, Plus } from "lucide-react"
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
  const { addItem } = useCartContext()
  const { productId, productName, variantId, variantName } = useProductDetail()
  const { toast } = useToast()
  const router = useRouter()
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
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

  const handleBookNow = (slot: SlotItem) => {
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
      adults: String(adults),
      children: String(children),
      price: String(slot.pricing.persons[0]?.headoutSellingPrice ?? 0),
      currency: currency ?? "USD",
      title: variantName ?? productName ?? "Experience",
    })
    router.push(`/checkout?${params.toString()}`)
  }

  const handleAddToCart = async (slot: SlotItem) => {
    setAddingToCart(true)
    setSelectedSlotId(slot.id)
    try {
      await addItem({
        experienceId: productId,
        productId,
        variantId: String(variantId),
        inventoryId: slot.id,
        inventoryType: "NORMAL",
        date: selectedDate,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        adults,
        children,
        title: variantName ?? productName ?? "Experience",
        priceAmount: slot.pricing.persons[0]?.headoutSellingPrice ?? 0,
        currency: currency ?? "USD",
        imageUrl: "",
        addedAt: new Date().toISOString(),
      })
      toast({ title: "Added to cart", description: `${variantName ?? productName ?? "Experience"} added to your cart.`, variant: "success" })
    } catch {
      toast({ title: "Failed to add", description: "Could not add item to cart. Please try again.", variant: "error" })
    } finally {
      setAddingToCart(false)
      setSelectedSlotId(null)
    }
  }

  const peopleSummary = `${adults} adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""}`

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {slots.length} slot{slots.length !== 1 ? "s" : ""} available on {selectedDate}
        </p>
        <p className="text-xs text-muted-foreground">{peopleSummary}</p>
      </div>

      {/* Guest selector */}
      <div className="flex items-center gap-4 rounded-lg border bg-muted/10 p-2.5">
        <span className="text-xs font-medium text-muted-foreground">Guests</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setAdults(Math.max(1, adults - 1))}
              className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[3ch] text-center text-sm font-medium">{adults}</span>
            <button
              onClick={() => setAdults(Math.min(20, adults + 1))}
              className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="text-xs text-muted-foreground">Adults</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChildren(Math.max(0, children - 1))}
              className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[3ch] text-center text-sm font-medium">{children}</span>
            <button
              onClick={() => setChildren(Math.min(10, children + 1))}
              className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
            </button>
            <span className="text-xs text-muted-foreground">Children</span>
          </div>
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

        const totalPrice = (slot.pricing.persons[0]?.headoutSellingPrice ?? 0) * (adults + children)

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
                  {slot.remaining < 20 && !isClosed && (
                    <Badge className="border-amber-200 bg-amber-50 text-[10px] text-amber-700">
                      <Users className="mr-0.5 h-2.5 w-2.5" />
                      {slot.remaining} left
                    </Badge>
                  )}
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
                      {adults + children} guest{adults + children !== 1 ? "s" : ""}
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
