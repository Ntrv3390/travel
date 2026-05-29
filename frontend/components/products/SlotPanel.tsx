"use client"

import { Loader2, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrency } from "@/hooks/useCurrency"
import type { SlotItem } from "@/types/product"

interface SlotPanelProps {
  slots: SlotItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
  selectedDate: string
}

export function SlotPanel({ slots, loading, error, onRetry, selectedDate }: SlotPanelProps) {
  const { formatPrice } = useCurrency()

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

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {slots.length} slot{slots.length !== 1 ? "s" : ""} available on {selectedDate}
      </p>
      {slots.map((slot) => {
        const startTime = slot.startDateTime.split("T")[1]?.slice(0, 5) ?? slot.startDateTime
        const endTime = slot.endDateTime.split("T")[1]?.slice(0, 5) ?? slot.endDateTime
        const isClosed = slot.availability === "CLOSED"
        const availBadge = isClosed
          ? "bg-red-100 text-red-700 border-red-200"
          : slot.availability === "LIMITED"
            ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-green-100 text-green-700 border-green-200"

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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
