"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

export interface CheckoutInfo {
  experienceId: string
  variantId: string
  inventoryId: string
  date: string
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
  variantId: "",
  inventoryId: "",
  date: "",
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
    return {
      experienceId: search.get("experienceId") ?? "",
      variantId: search.get("variantId") ?? "",
      inventoryId: search.get("inventoryId") ?? "",
      date: search.get("date") ?? "",
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
