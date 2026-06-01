"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/hooks/useCurrency"
import { useProductDetail } from "@/context/ProductDetailContext"
import { getVariantAvailabilities, getSlotInventory } from "@/lib/api"
import { SlotPanel } from "@/components/products/SlotPanel"
import type { VariantAvailability, SlotItem } from "@/types/product"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function todayStr() {
  const d = new Date()
  return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export function AvailabilityCalendar() {
  const { productId, variantId, initialDate } = useProductDetail()
  const { currency, formatPrice } = useCurrency()
  const [availabilities, setAvailabilities] = useState<VariantAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate)
  const [slots, setSlots] = useState<SlotItem[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const monthStart = formatDateStr(viewYear, viewMonth, 1)
  const endDate = formatDateStr(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth))
  const startDate = monthStart < todayStr() ? todayStr() : monthStart

  const fetchAvailabilities = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getVariantAvailabilities(productId, variantId, {
      currencyCode: currency,
      startDate,
      endDate,
    })
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setAvailabilities(result.data.availabilities ?? [])
    } else {
      setAvailabilities([])
    }
    setLoading(false)
  }, [productId, variantId, currency, startDate, endDate])

  useEffect(() => {
    fetchAvailabilities()
  }, [fetchAvailabilities])

  useEffect(() => {
    if (initialDate && availabilities.length > 0 && !slots.length && !slotsLoading) {
      const match = availabilities.find((a) => a.date === initialDate)
      if (match && match.availability !== "CLOSED") {
        fetchSlots(initialDate)
      }
    }
  }, [initialDate, availabilities, fetchSlots, slots.length, slotsLoading])

  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true)
    setSlotsError(null)
    setSlots([])
    const result = await getSlotInventory(
      variantId,
      `${date}T00:00`,
      `${date}T23:59`,
      currency,
    )
    if (result.error) {
      setSlotsError(result.error)
    } else if (result.data) {
      setSlots(result.data.items ?? [])
    } else {
      setSlots([])
    }
    setSlotsLoading(false)
  }, [variantId, currency])

  const handleDateClick = (dateStr: string, info: VariantAvailability | undefined) => {
    if (dateStr < todayStr()) return
    if (!info || info.availability === "CLOSED") return
    setSelectedDate(dateStr)
    fetchSlots(dateStr)
  }

  const availMap = new Map<string, VariantAvailability>()
  for (const a of availabilities) {
    availMap.set(a.date, a)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const todayFormatted = todayStr()

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Availability Calendar</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (viewMonth === 0) {
                setViewYear(viewYear - 1)
                setViewMonth(11)
              } else {
                setViewMonth(viewMonth - 1)
              }
              setSelectedDate(null)
              setSlots([])
            }}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-28 text-center text-sm font-medium">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (viewMonth === 11) {
                setViewYear(viewYear + 1)
                setViewMonth(0)
              } else {
                setViewMonth(viewMonth + 1)
              }
              setSelectedDate(null)
              setSlots([])
            }}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-xs text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAvailabilities}>Retry</Button>
        </div>
      ) : availabilities.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No availability found for this month.</p>
      ) : (
        <>
          <div className="mb-1 grid grid-cols-7 gap-0">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-medium text-muted-foreground uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = formatDateStr(viewYear, viewMonth, day)
              const info = availMap.get(dateStr)
              const isPast = dateStr < todayFormatted
              const isToday = dateStr === todayFormatted
              const isSelected = dateStr === selectedDate
              const clickable = !isPast && info && info.availability !== "CLOSED"

              let bg = "bg-transparent"
              let textColor = "text-muted-foreground"
              if (isSelected) {
                bg = "ring-2 ring-brand-600 bg-brand-100"
              } else if (isToday) {
                bg = "ring-1 ring-brand-500 bg-brand-50"
              } else if (isPast) {
                bg = "bg-slate-50"
              }
              if (isPast) textColor = "text-slate-300"

              if (clickable) {
                bg += " cursor-pointer hover:bg-brand-50"
              }

              const statusColor = info?.availability === "CLOSED"
                ? "text-red-500"
                : info?.availability === "LIMITED"
                  ? "text-amber-600"
                  : "text-green-600"

              return (
                <div
                  key={day}
                  onClick={() => clickable && handleDateClick(dateStr, info)}
                  onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && clickable) handleDateClick(dateStr, info) }}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md px-0.5 py-1 text-center transition-colors",
                    bg,
                  )}
                >
                  <span className={cn("text-xs font-medium", textColor)}>{day}</span>
                  {info && info.availability !== "CLOSED" && info.pricing?.headoutSellingPrice != null ? (
                    <span className={cn("mt-0.5 truncate text-[9px] font-semibold leading-tight", statusColor)}>
                      {formatPrice(info.pricing.headoutSellingPrice)}
                    </span>
                  ) : info?.availability === "CLOSED" ? (
                    <span className="mt-0.5 text-[9px] text-red-400">Closed</span>
                  ) : (
                    <span className="mt-0.5 text-[9px] text-slate-300">—</span>
                  )}
                  {info && info.remaining < 20 && info.availability !== "CLOSED" && (
                    <span className="text-[8px] text-amber-500">{info.remaining} left</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-green-600" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> Limited
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-red-500" /> Closed
            </span>
          </div>
        </>
      )}

      {selectedDate && (
        <SlotPanel
          slots={slots}
          loading={slotsLoading}
          error={slotsError}
          onRetry={() => fetchSlots(selectedDate)}
          selectedDate={selectedDate}
        />
      )}
    </div>
  )
}
