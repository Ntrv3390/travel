"use client"

import Image from "next/image"
import { Calendar, Clock, Users } from "lucide-react"
import { PriceDisplay } from "@/components/common/PriceDisplay"
import { cn } from "@/lib/utils"

export interface OrderSummaryItem {
  title: string
  imageUrl?: string
  date: string
  startDateTime?: string
  currency: string
  priceAmount: number
  guestCounts: Record<string, number>
}

interface OrderSummaryProps {
  items: OrderSummaryItem[]
  currency: string
  className?: string
}

const GUEST_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD: "Child",
  INFANT: "Infant",
  YOUTH: "Youth",
  SENIOR: "Senior",
  STUDENT: "Student",
}

function guestLabel(type: string, count: number) {
  const label = GUEST_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  return `${count} ${label}${count !== 1 ? "s" : ""}`
}

function fmtDate(d: string) {
  if (!d) return ""
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function fmtTime(dt: string) {
  if (!dt || !dt.includes("T")) return ""
  const t = dt.split("T")[1]?.slice(0, 5)
  if (!t) return ""
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`
}

export function OrderSummary({ items, currency, className }: OrderSummaryProps) {
  const total = items.reduce((s, i) => s + i.priceAmount, 0)
  const isSingle = items.length === 1
  const first = items[0]

  return (
    <div className={cn("rounded-2xl border bg-card shadow-glass overflow-hidden", className)}>
      {isSingle && first?.imageUrl && (
        <div className="relative h-44 w-full sm:h-48">
          <Image
            src={first.imageUrl.startsWith("//") ? "https:" + first.imageUrl : first.imageUrl}
            alt={first.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 380px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="p-5 space-y-4">
        <h3 className="font-semibold text-base">
          {isSingle ? "Order Summary" : `Order Summary · ${items.length} items`}
        </h3>

        {isSingle && first ? (
          <div className="space-y-3">
            <p className="font-medium text-sm leading-snug line-clamp-2">{first.title}</p>

            <div className="flex flex-wrap gap-2">
              {first.date && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {fmtDate(first.date)}
                </span>
              )}
              {first.startDateTime && fmtTime(first.startDateTime) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium">
                  <Clock className="h-3 w-3 shrink-0" />
                  {fmtTime(first.startDateTime)}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {Object.entries(first.guestCounts)
                .filter(([, c]) => c > 0)
                .map(([type, count]) => {
                  const totalGuests = Object.values(first.guestCounts).reduce((a, b) => a + b, 0)
                  const unitCost = totalGuests > 0 ? first.priceAmount / totalGuests : 0
                  return (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {guestLabel(type, count)}
                      </span>
                      <PriceDisplay
                        amount={Math.round(unitCost * count * 100) / 100}
                        currency={first.currency}
                        className="text-sm"
                      />
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const totalG = Object.values(item.guestCounts).reduce((a, b) => a + b, 0)
              const timeStr = item.startDateTime ? fmtTime(item.startDateTime) : ""
              return (
                <div key={i} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtDate(item.date)}
                      {timeStr && ` · ${timeStr}`}
                      {` · ${totalG} guest${totalG !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <PriceDisplay
                    amount={item.priceAmount}
                    currency={item.currency}
                    className="text-sm font-medium shrink-0"
                  />
                </div>
              )
            })}
          </div>
        )}

        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Total</span>
          <PriceDisplay amount={total} currency={currency} className="text-lg font-bold" />
        </div>

        <p className="text-xs text-muted-foreground">Price confirmed at time of booking</p>
      </div>
    </div>
  )
}
