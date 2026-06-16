"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Clock, ArrowRight, Minus, Plus, Users, AlertCircle, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/useCurrency"
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
  paxMin?: number
  paxMax?: number | null
  compact?: boolean
  /** inventoryId of the slot currently in cart — highlights it and changes button label */
  cartSlotId?: string | null
  /** Called after a successful "Add to cart" so the parent can close the modal */
  onAddedToCart?: () => void
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

// ── Main component ─────────────────────────────────────────────────────────────

export function SlotPanel({
  slots,
  loading,
  error,
  onRetry,
  selectedDate,
  paxMin = 1,
  paxMax = null,
  compact = false,
  cartSlotId = null,
}: SlotPanelProps) {
  const { formatPrice, currency } = useCurrency()
  const { productId, productName, variantId, variantName, imageUrl, initialGuests, inputFields } = useProductDetail()
  const { toast } = useToast()
  const router = useRouter()

  const effectiveMax = paxMax ?? 20

  const [guests, setGuests] = useState<Record<string, number>>(() => {
    if (initialGuests && Object.keys(initialGuests).length > 0) return initialGuests
    return {}
  })
  const [bookingNowSlotId, setBookingNowSlotId] = useState<string | null>(null)

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
    setBookingNowSlotId(slot.id)
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
    } finally {
      setBookingNowSlotId(null)
    }
  }


  // ── Render ─────────────────────────────────────────────────────────────────

  // Guest selector panel — shared between both layout modes
  const guestPanel = personTypes.length > 0 && (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
            <Users className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-sm font-bold text-foreground">Guests</span>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-200/80 dark:bg-brand-950/50 dark:text-brand-400 dark:ring-brand-800/60">
          {paxMin}{effectiveMax !== paxMin ? `–${effectiveMax}` : ""}
        </span>
      </div>

      {/* Counter rows */}
      <div className={cn("divide-y divide-border/40", compact ? "px-3" : "px-4")}>
        {personTypes.map((p) => {
          const count = effectiveGuests[p.type] ?? 0
          const disableDecrement = count === 0
          const disableIncrement = totalGuests >= effectiveMax
          return (
            <div
              key={p.type}
              className={cn("flex items-center justify-between gap-3", compact ? "py-3" : "py-3.5")}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {p.name ?? p.type.charAt(0) + p.type.slice(1).toLowerCase()}
                </p>
                {p.ageFrom != null && (
                  <p className="text-[11px] text-muted-foreground">
                    Age {p.ageFrom}+
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  onClick={() => setGuests(prev => ({ ...prev, [p.type]: Math.max(0, (prev[p.type] ?? 0) - 1) }))}
                  disabled={disableDecrement}
                  aria-label={`Decrease ${p.name ?? p.type}`}
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 text-muted-foreground transition-all active:scale-90",
                    "disabled:cursor-not-allowed disabled:opacity-25",
                    count > 0
                      ? "border-brand-400 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                      : "border-border hover:border-muted-foreground",
                    compact ? "h-7 w-7" : "h-8 w-8"
                  )}
                >
                  <Minus className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                </button>

                <span className={cn(
                  "w-6 text-center font-bold tabular-nums",
                  count > 0 ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground/50",
                  compact ? "text-sm" : "text-base"
                )}>
                  {count}
                </span>

                <button
                  onClick={() => setGuests(prev => ({ ...prev, [p.type]: (prev[p.type] ?? 0) + 1 }))}
                  disabled={disableIncrement}
                  aria-label={`Increase ${p.name ?? p.type}`}
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 text-muted-foreground transition-all active:scale-90",
                    "disabled:cursor-not-allowed disabled:opacity-25",
                    !disableIncrement
                      ? "border-brand-400 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                      : "border-border",
                    compact ? "h-7 w-7" : "h-8 w-8"
                  )}
                >
                  <Plus className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: hint or summary */}
      {paxHint && (
        <div className={cn(
          "border-t px-4 py-2.5",
          aboveMax
            ? "border-rose-200/60 bg-rose-50/60 dark:border-rose-800/40 dark:bg-rose-950/30"
            : "border-amber-200/60 bg-amber-50/60 dark:border-amber-800/40 dark:bg-amber-950/30"
        )}>
          <p className={cn(
            "text-center text-[11px] font-medium",
            aboveMax ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
          )}>
            {paxHint}
          </p>
        </div>
      )}
      {hasGuests && peopleSummary && !paxHint && (
        <div className="border-t border-brand-100/60 bg-brand-50/40 px-4 py-2.5 dark:border-brand-800/30 dark:bg-brand-950/20">
          <p className="text-center text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            {peopleSummary}
          </p>
        </div>
      )}
    </div>
  )

  // Slot cards list
  const slotCards = (
    <div className="space-y-3">
      <p className="px-0.5 text-xs font-medium text-muted-foreground">
        {slots.length} time slot{slots.length !== 1 ? "s" : ""} available
      </p>

      <AnimatePresence initial={false}>
        {slots.map((slot, idx) => {
          const startTime = slot.startDateTime.split("T")[1]?.slice(0, 5) ?? slot.startDateTime
          const endTime = slot.endDateTime.split("T")[1]?.slice(0, 5) ?? slot.endDateTime
          const isClosed = slot.availability === "CLOSED"
          const totalPrice = calculateTotalPrice(slot)
          const isThisBooking = bookingNowSlotId === slot.id
          const actionsDisabled = !hasGuests || bookingNowSlotId !== null
          const isInCart = cartSlotId === slot.id

          return (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.05 }}
              className={cn(
                "group overflow-hidden rounded-2xl border shadow-md transition-all duration-200",
                isInCart
                  ? "border-emerald-300/70 bg-emerald-50/30 shadow-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-950/10 dark:shadow-emerald-950/20"
                  : "border-border/50 bg-card",
                !isClosed && !isInCart && "hover:shadow-lg hover:border-brand-200/60 dark:hover:border-brand-800/40",
                isClosed && "opacity-40"
              )}
            >
              {/* ── Header ── */}
              <div className={cn(
                "relative flex items-center justify-between gap-3 overflow-hidden border-b",
                isInCart
                  ? "border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-transparent dark:border-emerald-800/40 dark:from-emerald-950/30"
                  : "border-border/40 bg-gradient-to-r from-brand-50/70 via-brand-50/30 to-transparent dark:from-brand-950/30 dark:via-brand-950/10 dark:to-transparent",
                compact ? "px-3 py-2.5" : "px-4 py-3.5"
              )}>
                {/* accent bar */}
                <div className={cn(
                  "absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b",
                  isInCart ? "from-emerald-400 to-emerald-600" : "from-brand-400 to-brand-600"
                )} />
                <div className="flex items-center gap-2 pl-3">
                  <Clock className={cn("h-3.5 w-3.5 shrink-0", isInCart ? "text-emerald-500" : "text-brand-500")} />
                  <p className={cn("font-extrabold tabular-nums tracking-tight text-foreground", compact ? "text-sm" : "text-base")}>
                    {startTime}
                    <span className="mx-1.5 font-light text-muted-foreground/60">–</span>
                    {endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isInCart && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-300/60 dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-emerald-700/50">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      In cart
                    </span>
                  )}
                  <AvailPill availability={slot.availability} />
                </div>
              </div>

              {/* ── Pricing rows ── */}
              {(slot.pricing?.persons?.length ?? 0) > 0 && !isClosed && (
                <div className={compact ? "px-3 pt-2 pb-1" : "px-4 pt-3 pb-1"}>
                  <div className="divide-y divide-border/30">
                    {slot.pricing.persons.map((p) => (
                      <div
                        key={p.type}
                        className={cn(
                          "flex items-center justify-between gap-3",
                          compact ? "py-2" : "py-2.5"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          {p.ageFrom != null && (
                            <p className="text-[10px] text-muted-foreground">Age {p.ageFrom}+</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {formatPrice(p.headoutSellingPrice ?? p.price)}
                          </span>
                          {p.availability !== "CLOSED" && p.remaining != null && (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              p.remaining < 10
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800/40"
                            )}>
                              {p.remaining < 10 ? `${p.remaining} left` : "Available"}
                            </span>
                          )}
                          {p.availability === "CLOSED" && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                              Sold out
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Group pricing ── */}
              {(slot.pricing?.groups?.length ?? 0) > 0 && !isClosed && (
                <div className={cn("flex flex-wrap gap-1.5", compact ? "px-3 pb-2" : "px-4 pb-3")}>
                  <p className="w-full text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Group pricing
                  </p>
                  {slot.pricing.groups.map((g, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground"
                    >
                      Up to {g.size} · {formatPrice(g.price)}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Action footer ── */}
              {!isClosed && (
                <div className={cn(
                  "flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20",
                  compact ? "px-3 py-2.5" : "px-4 py-3"
                )}>
                  {/* Price / hint */}
                  <div className="min-w-0">
                    {hasGuests ? (
                      <div>
                        <p className={cn("font-extrabold leading-none tracking-tight text-foreground", compact ? "text-base" : "text-lg")}>
                          {formatPrice(totalPrice)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {totalGuests} guest{totalGuests !== 1 ? "s" : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {aboveMax ? `Max ${effectiveMax} guests` : `Min ${paxMin} required`}
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex shrink-0 gap-2">
                    {/* <button
                      onClick={() => handleAddToCart(slot)}
                      disabled={actionsDisabled}
                      title={!hasGuests ? paxHint ?? undefined : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl border border-border/60 bg-background font-semibold text-foreground transition-all",
                        "hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/30",
                        "disabled:cursor-not-allowed disabled:opacity-40 active:scale-95",
                        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
                      )}
                    >
                      {isThisAdding
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <ShoppingCart className="h-3.5 w-3.5" />
                      }
                      <span className="hidden sm:inline">
                        {isThisAdding ? "Adding…" : isInCart ? "Update cart" : "Add to cart"}
                      </span>
                    </button> */}

                    <button
                      onClick={() => handleBookNow(slot)}
                      disabled={actionsDisabled}
                      title={!hasGuests ? paxHint ?? undefined : undefined}
                      className={cn(
                        "relative flex items-center gap-2 overflow-hidden rounded-xl font-bold text-white transition-all",
                        "bg-gradient-to-r from-brand-500 to-brand-600 shadow-md shadow-brand-500/25",
                        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-xl before:bg-white/15",
                        "hover:from-brand-600 hover:to-brand-700 hover:shadow-lg hover:shadow-brand-500/30",
                        "disabled:cursor-not-allowed disabled:opacity-40 active:scale-95",
                        compact ? "px-4 py-2 text-sm" : "px-6 py-3 text-base"
                      )}
                    >
                      {isThisBooking
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <ArrowRight className="h-4 w-4" />
                      }
                      {isThisBooking ? "Booking…" : "Book now"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )

  return compact ? (
    // Compact: 2-column on sm+ — guests sticky left, slots scrollable right
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      {guestPanel && (
        <div className="shrink-0 sm:w-[200px] sm:sticky sm:top-5 sm:self-start">{guestPanel}</div>
      )}
      <div className="min-w-0 flex-1">{slotCards}</div>
    </div>
  ) : (
    // Default: stacked
    <div className="space-y-3">
      {guestPanel}
      {slotCards}
    </div>
  )
}