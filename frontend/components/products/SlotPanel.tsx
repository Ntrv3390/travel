"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Clock, ShoppingCart, ArrowRight, Minus, Plus, Users, AlertCircle, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/useCurrency"
import { useCartContext } from "@/context/CartContext"
import { useProductDetail } from "@/context/ProductDetailContext"
import { useToast } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import type { SlotItem } from "@/types/product"
import { addCartItem, getCartSessionId } from "@/lib/api"
import { mutate } from "swr"

interface SlotPanelProps {
  slots: SlotItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
  selectedDate: string
  /** Minimum total guests required to book (from variant.pax.min). Defaults to 1. */
  paxMin?: number
  /** Maximum total guests allowed to book (from variant.pax.max). Defaults to 20. */
  paxMax?: number | null
}

// ── Availability pill ──────────────────────────────────────────────────────────

function AvailPill({ availability }: { availability: string }) {
  if (availability === "CLOSED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-800">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Sold out
      </span>
    )
  if (availability === "LIMITED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Limited
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      Available
    </span>
  )
}

// ── Guest counter ──────────────────────────────────────────────────────────────

function GuestCounter({
  label,
  sublabel,
  count,
  disableDecrement,
  disableIncrement,
  onDecrement,
  onIncrement,
}: {
  label: string
  sublabel?: string
  count: number
  disableDecrement: boolean
  disableIncrement: boolean
  onDecrement: () => void
  onIncrement: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2.5 ring-1 ring-border/50 sm:px-4">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-foreground">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onDecrement}
          disabled={disableDecrement}
          aria-label={`Decrease ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums text-foreground">
          {count}
        </span>
        <button
          onClick={onIncrement}
          disabled={disableIncrement}
          aria-label={`Increase ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30 active:scale-90"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SlotPanel({
  slots,
  loading,
  error,
  onRetry,
  selectedDate,
  paxMin = 1,
  paxMax = null,
}: SlotPanelProps) {
  const { formatPrice, currency } = useCurrency()
  const { cart, addItem, updateCartItem } = useCartContext()
  const { productId, productName, variantId, variantName, imageUrl, initialGuests, inputFields } = useProductDetail()
  const { toast } = useToast()
  const router = useRouter()

  const effectiveMax = paxMax ?? 20

  const [guests, setGuests] = useState<Record<string, number>>(() => {
    if (initialGuests && Object.keys(initialGuests).length > 0) return initialGuests
    return {}
  })
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border/50 bg-muted/10 py-12">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          <p className="text-xs text-muted-foreground">Loading time slots…</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200/60 bg-rose-50/40 py-8 dark:border-rose-800/40 dark:bg-rose-950/20">
        <AlertCircle className="h-5 w-5 text-rose-500" />
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 py-10 text-center">
        <Sparkles className="h-5 w-5 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No slots available for this date</p>
        <p className="text-xs text-muted-foreground/60">Try selecting a different date</p>
      </div>
    )
  }

  // ── Derive effective guests from slot person types ─────────────────────────
  // Always driven by what the backend returns — never assumes ADULT exists.

  const personTypes = slots[0]?.pricing?.persons ?? []
  const effectiveGuests: Record<string, number> = {}
  for (const p of personTypes) {
    effectiveGuests[p.type] = guests[p.type] ?? 0
  }

  const totalGuests = Object.values(effectiveGuests).reduce((a, b) => a + b, 0)

  // Booking is valid only when totalGuests is within [paxMin, effectiveMax]
  const belowMin = totalGuests < paxMin
  const aboveMax = totalGuests > effectiveMax
  const hasGuests = totalGuests >= paxMin && !aboveMax

  // ── Pax constraint hint shown under the guest selector ────────────────────

  const paxHint = (() => {
    if (aboveMax) return `Maximum ${effectiveMax} guest${effectiveMax !== 1 ? "s" : ""} allowed`
    if (belowMin && totalGuests > 0) return `Minimum ${paxMin} guest${paxMin !== 1 ? "s" : ""} required`
    if (totalGuests === 0) return `Select at least ${paxMin} guest${paxMin !== 1 ? "s" : ""} to continue`
    return null
  })()

  // ── Price helpers ──────────────────────────────────────────────────────────

  const getPriceForType = (slot: SlotItem, type: string) => {
    const person = slot.pricing?.persons?.find(p => p.type === type)
    return person?.headoutSellingPrice ?? person?.price ?? slot.pricing?.persons?.[0]?.headoutSellingPrice ?? 0
  }

  const getBookingPriceForType = (slot: SlotItem, type: string) => {
    const person = slot.pricing?.persons?.find(p => p.type === type)
    return person?.price ?? person?.headoutSellingPrice ?? slot.pricing?.persons?.[0]?.price ?? 0
  }

  const calculateTotalPrice = (slot: SlotItem) =>
    Object.entries(effectiveGuests).reduce((total, [type, count]) => total + getPriceForType(slot, type) * count, 0)

  const calculateTotalBookingPrice = (slot: SlotItem) =>
    Object.entries(effectiveGuests).reduce((total, [type, count]) => total + getBookingPriceForType(slot, type) * count, 0)

  const peopleSummary = Object.entries(effectiveGuests)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type.charAt(0) + type.slice(1).toLowerCase()}${count !== 1 ? "s" : ""}`)
    .join(", ")

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleBookNow = async (slot: SlotItem) => {
    const totalBookingPrice = calculateTotalBookingPrice(slot)
    try {
      const sessionId = getCartSessionId()
      const result = await addCartItem(sessionId, {
        experienceId: productId,
        productId,
        variantId: String(variantId),
        inventoryId: slot.id,
        inventoryType: "NORMAL",
        date: selectedDate,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        adults: effectiveGuests.ADULT ?? 0,
        children: effectiveGuests.CHILD ?? 0,
        guestCounts: effectiveGuests,
        title: variantName ?? productName ?? "Experience",
        priceAmount: totalBookingPrice,
        currency: currency ?? "USD",
        imageUrl,
        inputFields: inputFields ?? [],
      })
      mutate(["/api/v1/cart", sessionId])
      if (result.error || !result.data) {
        toast({ title: "Booking failed", description: result.error ?? "Could not add item. Please try again.", variant: "error" })
        return
      }
      const raw = result.data as unknown as Record<string, unknown>
      const cart = (raw.data as Record<string, unknown> ?? raw) as { items?: Array<Record<string, unknown>>; id?: string }
      const newItem = cart.items?.find(
        (i) => i.variantId === String(variantId) && i.inventoryId === slot.id
      )
      const itemId = newItem?.id ?? cart.items?.[cart.items.length - 1]?.id
      if (itemId) {
        router.push(`/checkout?cartItemId=${itemId}`)
      } else {
        toast({ title: "Checkout failed", description: "Could not determine cart item for checkout. Please open your cart and try again.", variant: "error" })
        router.push("/cart")
      }
    } catch (err) {
      toast({ title: "Booking failed", description: err instanceof Error ? err.message : "Could not process booking.", variant: "error" })
    }
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
        const mergedGuests = { ...effectiveGuests }
        const currentTotal = Object.values(mergedGuests).reduce((a, b) => a + b, 0)
        const existingTotal = Object.values(existing.guestCounts ?? {}).reduce<number>((a, b) => a + b, 0)
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
          adults: effectiveGuests.ADULT ?? 0,
          children: effectiveGuests.CHILD ?? 0,
          guestCounts: effectiveGuests,
          title: variantName ?? productName ?? "Experience",
          priceAmount: totalBookingPrice,
          currency: currency ?? "USD",
          imageUrl,
          inputFields: inputFields ?? [],
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Guest selector ──────────────────────────────────────────────── */}
      {personTypes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
          {/* Header row */}
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            <span className="text-sm font-semibold">Select guests</span>
            {/* Pax range badge */}
            <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {paxMin}
              {effectiveMax !== paxMin ? `–${effectiveMax}` : ""} guest{effectiveMax !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Per-type counters */}
          <div className="space-y-2">
            {personTypes.map((p) => {
              const count = effectiveGuests[p.type] ?? 0
              // Decrement disabled if: this type is already 0, OR removing would drop total below 0
              // (we allow going below paxMin while adjusting — the hint + button disable handles UX)
              const disableDecrement = count === 0
              // Increment disabled if: total would exceed effectiveMax
              const disableIncrement = totalGuests >= effectiveMax
              return (
                <GuestCounter
                  key={p.type}
                  label={p.name ?? p.type.charAt(0) + p.type.slice(1).toLowerCase()}
                  sublabel={p.ageFrom != null ? `Age ${p.ageFrom}–${p.ageTo ?? "99+"}` : undefined}
                  count={count}
                  disableDecrement={disableDecrement}
                  disableIncrement={disableIncrement}
                  onDecrement={() =>
                    setGuests(prev => ({ ...prev, [p.type]: Math.max(0, (prev[p.type] ?? 0) - 1) }))
                  }
                  onIncrement={() =>
                    setGuests(prev => ({ ...prev, [p.type]: (prev[p.type] ?? 0) + 1 }))
                  }
                />
              )
            })}
          </div>

          {/* Constraint hint */}
          {paxHint && (
            <p className={cn(
              "mt-2.5 text-center text-xs",
              aboveMax ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {paxHint}
            </p>
          )}

          {/* Summary when valid */}
          {hasGuests && peopleSummary && (
            <p className="mt-2 text-center text-xs text-muted-foreground">{peopleSummary}</p>
          )}
        </div>
      )}

      {/* ── Slot header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {slots.length} time slot{slots.length !== 1 ? "s" : ""} · {selectedDate}
        </p>
      </div>

      {/* ── Slot cards ──────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {slots.map((slot, idx) => {
            const startTime = slot.startDateTime.split("T")[1]?.slice(0, 5) ?? slot.startDateTime
            const endTime = slot.endDateTime.split("T")[1]?.slice(0, 5) ?? slot.endDateTime
            const isClosed = slot.availability === "CLOSED"
            const totalPrice = calculateTotalPrice(slot)
            const isThisAdding = addingToCart && selectedSlotId === slot.id
            const actionsDisabled = !hasGuests || addingToCart

            return (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-opacity",
                  isClosed && "opacity-50"
                )}
              >
                {/* Slot header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
                      <Clock className="h-3.5 w-3.5 text-brand-500" />
                    </div>
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {startTime} – {endTime}
                    </p>
                  </div>
                  <AvailPill availability={slot.availability} />
                </div>

                {/* Pricing table */}
                {(slot.pricing?.persons?.length ?? 0) > 0 && !isClosed && (
                  <div className="px-4 py-3">
                    <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
                      {slot.pricing.persons.map((p) => (
                        <div key={p.type} className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{p.name}</p>
                            {p.ageFrom != null && (
                              <p className="text-[10px] text-muted-foreground">
                                Age {p.ageFrom}–{p.ageTo ?? "99+"}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-xs font-bold text-foreground">
                              {formatPrice(p.headoutSellingPrice ?? p.price)}
                            </span>
                            {p.availability !== "CLOSED" && p.remaining != null && (
                              <span className={cn(
                                "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                                p.remaining < 10
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {p.remaining < 10 ? `${p.remaining} left` : "In stock"}
                              </span>
                            )}
                            {p.availability === "CLOSED" && (
                              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                                Sold out
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group pricing */}
                {(slot.pricing?.groups?.length ?? 0) > 0 && !isClosed && (
                  <div className="px-4 pb-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Group pricing
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {slot.pricing.groups.map((g, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground"
                        >
                          Up to {g.size} · {formatPrice(g.price)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action footer */}
                {!isClosed && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-muted/5 px-4 py-3">
                    <div>
                      {hasGuests ? (
                        <>
                          <p className="text-base font-bold leading-tight text-foreground">
                            {formatPrice(totalPrice)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {totalGuests} guest{totalGuests !== 1 ? "s" : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {aboveMax ? `Max ${effectiveMax} guests` : `Min ${paxMin} guest${paxMin !== 1 ? "s" : ""} required`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToCart(slot)}
                        disabled={actionsDisabled}
                        className="gap-1.5 rounded-xl"
                        title={!hasGuests ? paxHint ?? undefined : undefined}
                      >
                        {isThisAdding
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ShoppingCart className="h-3.5 w-3.5" />
                        }
                        <span className="hidden sm:inline">
                          {isThisAdding ? "Adding…" : "Add to cart"}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBookNow(slot)}
                        disabled={actionsDisabled}
                        className="gap-1.5 rounded-xl"
                        title={!hasGuests ? paxHint ?? undefined : undefined}
                      >
                        Book now
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}