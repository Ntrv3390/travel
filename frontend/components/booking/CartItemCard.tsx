"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceDisplay } from "@/components/common/PriceDisplay"
import { useCartContext } from "@/context/CartContext"
import { useToast } from "@/components/ui/toaster"
import { toSlug } from "@/lib/utils"
import type { CartItem } from "@/types/booking"

function formatTime(dateStr: string): string {
  if (!dateStr || !dateStr.includes("T")) return ""
  const t = dateStr.split("T")[1]?.slice(0, 5)
  if (!t) return ""
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

const GUEST_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
  YOUTH: "Youth",
  SENIOR: "Senior",
  STUDENT: "Student",
  GENERAL: "General",
}

function getLabel(type: string): string {
  return GUEST_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

interface CartItemCardProps {
  item: CartItem
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateCartItem, removeItem } = useCartContext()
  const { toast } = useToast()

  const guestCounts = { ...(item.guestCounts ?? { ADULT: item.adults }) }
  if (item.children > 0 && !guestCounts.CHILD) {
    guestCounts.CHILD = item.children
  }

  const totalGuests = Object.values(guestCounts).reduce((a, b) => a + b, 0)
  const unitPrice = totalGuests > 0 ? item.priceAmount / totalGuests : 0

  const handleGuestChange = async (type: string, delta: number) => {
    const current = guestCounts[type] ?? 0
    const newCount = current + delta
    if (newCount < 1) return
    const newCounts = { ...guestCounts, [type]: newCount }
    const newTotal = Object.values(newCounts).reduce((a, b) => a + b, 0)
    try {
      await updateCartItem(item.id, {
        guestCounts: newCounts,
        adults: newCounts.ADULT ?? 0,
        children: newCounts.CHILD ?? 0,
        priceAmount: Math.round(newTotal * unitPrice * 100) / 100,
      })
    } catch {
      toast({ title: "Failed to update", description: "Could not update guest count.", variant: "error" })
    }
  }

  const handleRemove = async () => {
    try {
      await removeItem(item.id)
      toast({ title: "Removed", description: "Item removed from your cart.", variant: "success" })
    } catch {
      toast({ title: "Failed to remove", description: "Could not remove item.", variant: "error" })
    }
  }

  const pdpHref = item.experienceId ? `/products/${toSlug(item.title)}-${item.experienceId}` : "#"
  const imgSrc = item.imageUrl?.startsWith("//") ? "https:" + item.imageUrl : item.imageUrl

  return (
    <div className="flex gap-4 p-4 sm:p-5">
      {/* Thumbnail */}
      <Link href={pdpHref} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={item.title || "Experience"}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted text-muted-foreground rounded-xl">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={pdpHref}
            className="font-semibold text-sm sm:text-base leading-snug hover:text-brand-600 transition-colors line-clamp-2"
          >
            {item.title || "Experience"}
          </Link>
          <button
            onClick={handleRemove}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Date + time chips */}
        <div className="flex flex-wrap gap-1.5">
          {item.date && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80">
              <Calendar className="h-3 w-3" />
              {formatDate(item.date)}
            </span>
          )}
          {item.startDateTime && formatTime(item.startDateTime) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80">
              <Clock className="h-3 w-3" />
              {formatTime(item.startDateTime)}
            </span>
          )}
        </div>

        {/* Guest steppers */}
        <div className="space-y-1.5">
          {Object.entries(guestCounts).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-14 text-xs text-muted-foreground">{getLabel(type)}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 rounded-lg p-0"
                  disabled={count <= 1}
                  onClick={() => handleGuestChange(type, -1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">{count}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 rounded-lg p-0"
                  onClick={() => handleGuestChange(type, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Price row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <PriceDisplay amount={unitPrice} currency={item.currency} className="text-xs" />
            {" / guest"}
          </span>
          <PriceDisplay amount={item.priceAmount} currency={item.currency} className="text-base font-bold" />
        </div>
      </div>
    </div>
  )
}
