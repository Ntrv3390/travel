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
  adults: number
  children: number
  currency: string
  title: string
  price: number
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
  adults: 1,
  children: 0,
  currency: "USD",
  title: "Experience",
  price: 0,
  guests: 1,
}

interface CheckoutContextValue {
  info: CheckoutInfo
}

const CheckoutContext = createContext<CheckoutContextValue>({ info: defaultCheckout })

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const search = useSearchParams()

  const info = useMemo<CheckoutInfo>(() => {
    const adults = parseInt(search.get("adults") ?? "1", 10)
    const children = parseInt(search.get("children") ?? "0", 10)
    const price = parseFloat(search.get("price") ?? "0")
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
      adults,
      children,
      currency: search.get("currency") ?? "USD",
      title: search.get("title") ?? "Experience",
      price,
      guests: adults + children,
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
