"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceDisplay } from "@/components/common/PriceDisplay"
import { useCartContext } from "@/context/CartContext"
import { useToast } from "@/components/ui/toaster"

import { toSlug } from "@/lib/utils"
import type { CartItem } from "@/types/booking"

function formatTime(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const GUEST_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
  YOUTH: "Youth",
  SENIOR: "Senior",
  STUDENT: "Student",
  GENERAL: "General",
}

function getLabel(type: string): string {
  return GUEST_TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

interface CartItemCardProps {
  item: CartItem
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateCartItem, removeItem } = useCartContext()
  const { toast } = useToast()


  const guestCounts = item.guestCounts ?? { ADULT: item.adults }
  if (item.children > 0 && !guestCounts.CHILD) {
    guestCounts.CHILD = item.children
  }

  const totalGuests = Object.values(guestCounts).reduce((a, b) => a + b, 0)
  const unitPrice = totalGuests > 0 ? item.priceAmount / totalGuests : 0

  const handleGuestChange = async (type: string, delta: number) => {
    const current = guestCounts[type] ?? 0
    const newCount = current + delta
    if (newCount < 1) return

    const newGuestCounts = { ...guestCounts, [type]: newCount }
    const newTotalGuests = Object.values(newGuestCounts).reduce((a, b) => a + b, 0)
    const newPrice = Math.round(newTotalGuests * unitPrice * 100) / 100

    try {
      await updateCartItem(item.id, {
        guestCounts: newGuestCounts,
        adults: newGuestCounts.ADULT ?? 0,
        children: newGuestCounts.CHILD ?? 0,
        priceAmount: newPrice,
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

  return (
    <div className="flex items-start gap-4 p-4">
      <div className="relative h-20 w-20 flex-none overflow-hidden rounded-lg">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl.startsWith("//") ? "https:" + item.imageUrl : item.imageUrl}
            alt={item.title || "Experience"}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/30 text-muted-foreground">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={item.experienceId ? `/products/${toSlug(item.title)}-${item.experienceId}` : "#"}
          className="font-semibold hover:text-brand-600 transition-colors line-clamp-1"
        >
          {item.title || "Experience"}
        </Link>
        <p className="text-sm text-muted-foreground">
          {formatDate(item.date)}{item.startDateTime ? ` · ${formatTime(item.startDateTime)}` : ""}
        </p>

        <div className="mt-2 space-y-1.5">
          {Object.entries(guestCounts).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground min-w-[70px]">{getLabel(type)}:</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={count <= 1}
                  onClick={() => handleGuestChange(type, -1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">{count}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleGuestChange(type, 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <PriceDisplay amount={unitPrice} currency={item.currency} /> / guest
          </p>
          <p className="font-semibold">
            <PriceDisplay amount={item.priceAmount} currency={item.currency} />
          </p>
        </div>
      </div>
      <div className="flex-none">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-600"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
