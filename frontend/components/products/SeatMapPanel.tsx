"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Loader2, Clock, ArrowRight, AlertCircle, RefreshCw,
  Sparkles, CheckCircle2, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/useCurrency"
import { useProductDetail } from "@/context/ProductDetailContext"
import { useToast } from "@/components/ui/toaster"
import { addCartItem, getCartSessionId, getSeatmapInventory } from "@/lib/api"
import { mutate } from "swr"
import { cn } from "@/lib/utils"
import type { SeatmapAvailabilitySlot, SeatmapInventoryResponse, SeatmapSeat } from "@/types/product"

interface SeatMapPanelProps {
  productId: string
  variantId: string | number
  selectedDate: string
  slots: SeatmapAvailabilitySlot[]
  currency: string
}

function formatTime(t: string) {
  // "HH:mm" → "H:MMam/pm"
  const [h, m] = t.split(":").map(Number)
  const ampm = h < 12 ? "am" : "pm"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`
}

export function SeatMapPanel({ productId, variantId, selectedDate, slots, currency }: SeatMapPanelProps) {
  const { formatPrice } = useCurrency()
  const { productName, variantName, imageUrl } = useProductDetail()
  const { toast } = useToast()
  const router = useRouter()

  const [selectedSlot, setSelectedSlot] = useState<SeatmapAvailabilitySlot | null>(null)
  const [inventory, setInventory] = useState<SeatmapInventoryResponse | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [selectedSeatCodes, setSelectedSeatCodes] = useState<string[]>([])
  const [bookingLoading, setBookingLoading] = useState(false)

  const loadInventory = useCallback(async (slot: SeatmapAvailabilitySlot) => {
    setInventoryLoading(true)
    setInventoryError(null)
    setInventory(null)
    setSelectedSeatCodes([])
    const result = await getSeatmapInventory(String(productId), variantId, selectedDate, slot.startTime, currency)
    if (result.error || !result.data) {
      setInventoryError(result.error ?? "Could not load seat map")
    } else {
      setInventory(result.data)
    }
    setInventoryLoading(false)
  }, [productId, variantId, selectedDate, currency])

  const handleSlotClick = useCallback((slot: SeatmapAvailabilitySlot) => {
    if (slot.remaining <= 0) return
    setSelectedSlot(slot)
    loadInventory(slot)
  }, [loadInventory])

  const toggleSeat = useCallback((seat: SeatmapSeat) => {
    if (!seat.pricing) return
    setSelectedSeatCodes(prev =>
      prev.includes(seat.seatCode)
        ? prev.filter(c => c !== seat.seatCode)
        : [...prev, seat.seatCode]
    )
  }, [])

  const handleBookNow = async () => {
    if (!inventory || selectedSeatCodes.length === 0) return
    setBookingLoading(true)

    const allSeats = inventory.sections.flatMap(s => s.seats)
    const chosenSeats = allSeats.filter(s => selectedSeatCodes.includes(s.seatCode))
    const totalPrice = chosenSeats.reduce((sum, s) => sum + (s.pricing?.headoutSellingPrice ?? 0), 0)

    try {
      const sessionId = getCartSessionId()
      const result = await addCartItem(sessionId, {
        experienceId: String(productId),
        productId: String(productId),
        variantId: String(variantId),
        inventoryId: String(inventory.inventoryId),
        inventoryType: "SVG",
        inventorySeatIds: selectedSeatCodes,
        date: selectedDate,
        startDateTime: `${selectedDate}T${inventory.startTime}`,
        adults: selectedSeatCodes.length,
        children: 0,
        guestCounts: { ADULT: selectedSeatCodes.length },
        title: variantName ?? productName ?? "Experience",
        priceAmount: totalPrice,
        currency: currency ?? "USD",
        imageUrl,
      })
      mutate(["/api/v1/cart", sessionId])
      if (result.error || !result.data) {
        toast({ title: "Booking failed", description: result.error ?? "Could not add item. Please try again.", variant: "error" })
        return
      }
      const raw = result.data as unknown as Record<string, unknown>
      const cart = (raw.data as Record<string, unknown> ?? raw) as { items?: Array<Record<string, unknown>> }
      const newItem = cart.items?.find(
        (i) => i.variantId === String(variantId) && i.inventoryId === String(inventory.inventoryId),
      )
      const itemId = newItem?.id ?? cart.items?.[cart.items.length - 1]?.id
      if (itemId) {
        router.push(`/checkout?cartItemId=${itemId}`)
      } else {
        router.push("/cart")
      }
    } catch (err) {
      toast({ title: "Booking failed", description: err instanceof Error ? err.message : "Could not process booking.", variant: "error" })
    } finally {
      setBookingLoading(false)
    }
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center">
        <Sparkles className="h-5 w-5 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No slots available for this date</p>
        <p className="text-xs text-muted-foreground/60">Try selecting a different date</p>
      </div>
    )
  }

  const chosenSeatsData = inventory
    ? inventory.sections.flatMap(s => s.seats).filter(s => selectedSeatCodes.includes(s.seatCode))
    : []
  const totalPrice = chosenSeatsData.reduce((sum, s) => sum + (s.pricing?.headoutSellingPrice ?? 0), 0)

  return (
    <div className="space-y-3">
      {/* Time slot header */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {slots.length} time slot{slots.length !== 1 ? "s" : ""} · {selectedDate}
        </p>
        <p className="text-[10px] text-muted-foreground">Select a time to pick seats</p>
      </div>

      {/* Time slot cards */}
      <div className="space-y-2">
        {slots.map((slot, idx) => {
          const isSoldOut = slot.remaining <= 0
          const isSelected = selectedSlot?.startTime === slot.startTime
          return (
            <motion.button
              key={slot.startTime}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              onClick={() => handleSlotClick(slot)}
              disabled={isSoldOut}
              className={cn(
                "w-full overflow-hidden rounded-2xl border text-left transition-all",
                isSelected
                  ? "border-brand-400 bg-brand-50/60 shadow-sm dark:bg-brand-950/20"
                  : isSoldOut
                    ? "border-border/40 bg-muted/10 opacity-50 cursor-not-allowed"
                    : "border-border/60 bg-background shadow-sm hover:border-brand-300 hover:bg-brand-50/30 cursor-pointer",
              )}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    isSelected ? "bg-brand-100 dark:bg-brand-900/40" : "bg-muted/50",
                  )}>
                    <Clock className={cn("h-3.5 w-3.5", isSelected ? "text-brand-600" : "text-muted-foreground")} />
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {formatTime(slot.startTime)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      from {formatPrice(slot.pricing.headoutSellingPrice)} / seat · {slot.remaining} left
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSoldOut ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">
                      Sold out
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Available
                    </span>
                  )}
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-brand-500" />}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Seat map */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <span className="text-sm font-semibold">Select Your Seats</span>
              {selectedSeatCodes.length > 0 && (
                <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {selectedSeatCodes.length} selected
                </span>
              )}
            </div>

            <div className="p-4">
              {inventoryLoading ? (
                <div className="flex flex-col items-center gap-2.5 py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                  <p className="text-xs text-muted-foreground">Loading seat map…</p>
                </div>
              ) : inventoryError ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                  <p className="text-xs text-rose-600 dark:text-rose-400">{inventoryError}</p>
                  <Button variant="outline" size="sm" onClick={() => loadInventory(selectedSlot)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </Button>
                </div>
              ) : inventory ? (
                <>
                  <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Click seats to select. Gray seats are unavailable.
                  </div>

                  {/* Sections */}
                  <div className="space-y-5">
                    {inventory.sections.map((section, si) => (
                      <div key={si}>
                        {section.sectionName && (
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {section.sectionName}
                          </p>
                        )}
                        {/* Group seats by row */}
                        {(() => {
                          const rows = new Map<string, SeatmapSeat[]>()
                          for (const seat of section.seats) {
                            const r = seat.row ?? "—"
                            if (!rows.has(r)) rows.set(r, [])
                            rows.get(r)!.push(seat)
                          }
                          return Array.from(rows.entries()).map(([row, seats]) => (
                            <div key={row} className="mb-1.5 flex items-center gap-1.5">
                              <span className="w-4 text-[10px] font-mono text-muted-foreground/60 text-right">
                                {row !== "—" ? row : ""}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {seats.map((seat) => {
                                  const isUnavailable = !seat.pricing
                                  const isChosen = selectedSeatCodes.includes(seat.seatCode)
                                  return (
                                    <button
                                      key={seat.seatCode}
                                      onClick={() => toggleSeat(seat)}
                                      disabled={isUnavailable}
                                      title={
                                        isUnavailable
                                          ? "Unavailable"
                                          : `${seat.row ?? ""}${seat.seatNumber ?? seat.seatCode} · ${formatPrice(seat.pricing!.headoutSellingPrice)}`
                                      }
                                      className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                                        isUnavailable
                                          ? "bg-muted/40 text-muted-foreground/40 cursor-default"
                                          : isChosen
                                            ? "bg-brand-500 text-white shadow-md scale-110"
                                            : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer dark:bg-emerald-900/30 dark:text-emerald-300",
                                      )}
                                    >
                                      {seat.seatNumber ?? seat.seatCode.slice(-2)}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-4 w-4 rounded-md bg-emerald-100" />
                      Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-4 w-4 rounded-md bg-brand-500" />
                      Selected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-4 w-4 rounded-md bg-muted/40" />
                      Unavailable
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Booking footer */}
            {selectedSeatCodes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-muted/5 px-4 py-3"
              >
                <div>
                  <p className="text-base font-bold leading-tight text-foreground">
                    {totalPrice > 0 ? formatPrice(totalPrice) : "Price TBC"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedSeatCodes.length} seat{selectedSeatCodes.length !== 1 ? "s" : ""} selected
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleBookNow}
                  disabled={bookingLoading}
                  className="gap-1.5 rounded-xl"
                >
                  {bookingLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      Book now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
