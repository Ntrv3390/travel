"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

export interface CheckoutInfo {
  experienceId: string
  productId: string
  productName: string
  variantId: string
  variantName: string
  inventoryId: string
  inventoryType: string
  date: string
  startDateTime: string
  endDateTime: string
  time: string
  guestCounts: Record<string, number>
  currency: string
  title: string
  price: number
  bookingPrice: number
  guests: number
}

const defaultCheckout: CheckoutInfo = {
  experienceId: "",
  productId: "",
  productName: "",
  variantId: "",
  variantName: "",
  inventoryId: "",
  inventoryType: "NORMAL",
  date: "",
  startDateTime: "",
  endDateTime: "",
  time: "",
  guestCounts: { ADULT: 1 },
  currency: "USD",
  title: "Experience",
  price: 0,
  bookingPrice: 0,
  guests: 1,
}

interface CheckoutContextValue {
  info: CheckoutInfo
}

const CheckoutContext = createContext<CheckoutContextValue>({ info: defaultCheckout })

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const search = useSearchParams()

  const info = useMemo<CheckoutInfo>(() => {
    let guestCounts: Record<string, number> = { ADULT: 1 }
    try {
      const parsed = JSON.parse(search.get("guestCounts") || "{}")
      if (Object.keys(parsed).length > 0) guestCounts = parsed
    } catch {
      const adults = parseInt(search.get("adults") ?? "1", 10)
      const children = parseInt(search.get("children") ?? "0", 10)
      guestCounts = { ADULT: adults }
      if (children > 0) guestCounts.CHILD = children
    }
    const price = parseFloat(search.get("price") ?? "0")
    const bookingPrice = parseFloat(search.get("bookingPrice") ?? String(price))
    const experienceId = search.get("experienceId") ?? ""
    const productId = search.get("productId") ?? experienceId
    return {
      experienceId,
      productId,
      productName: search.get("productName") ?? search.get("title") ?? "Experience",
      variantId: search.get("variantId") ?? "",
      variantName: search.get("variantName") ?? search.get("title") ?? "Standard",
      inventoryId: search.get("inventoryId") ?? "",
      inventoryType: search.get("inventoryType") ?? "NORMAL",
      date: search.get("date") ?? "",
      startDateTime: search.get("startDateTime") ?? "",
      endDateTime: search.get("endDateTime") ?? "",
      time: search.get("time") ?? "",
      guestCounts,
      currency: search.get("currency") ?? "USD",
      title: search.get("title") ?? "Experience",
      price,
      bookingPrice,
      guests: Object.values(guestCounts).reduce((a, b) => a + b, 0),
    }
  }, [search])

  return (
    <CheckoutContext.Provider value={{ info }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  return useContext(CheckoutContext)
}
