"use client"

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import type { ProductVariant } from "@/types/product"
import { getCartItem, getCartSessionId } from "@/lib/api"

export type InputField = NonNullable<ProductVariant["inputFields"]>[number]

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
  cartItemId: string
  imageUrl: string
  inputFields: InputField[]
  loading: boolean
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
  cartItemId: "",
  imageUrl: "",
  inputFields: [],
  loading: false,
}

interface CheckoutContextValue {
  info: CheckoutInfo
}

const CheckoutContext = createContext<CheckoutContextValue>({ info: defaultCheckout })

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const search = useSearchParams()
  const cartItemId = search.get("cartItemId") ?? ""
  const [backendItem, setBackendItem] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!cartItemId) {
      setBackendItem(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const sessionId = getCartSessionId()
    getCartItem(sessionId, cartItemId).then((result) => {
      if (cancelled) return
      if (result.data) {
        const unwrapped = (result.data as unknown as Record<string, unknown>)?.data as Record<string, unknown> ?? result.data as unknown as Record<string, unknown>
        setBackendItem(unwrapped)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [cartItemId])

  const info = useMemo<CheckoutInfo>(() => {
    if (cartItemId && backendItem) {
      const bi = backendItem as Record<string, any>
      const guestCounts = (bi.guestCounts as Record<string, number>) ?? { ADULT: bi.adults ?? 1 }
      const gCounts = Object.values(guestCounts).reduce((a: number, b: number) => a + b, 0)
      return {
        experienceId: (bi.experienceId as string) ?? "",
        productId: (bi.productId as string) ?? (bi.experienceId as string) ?? "",
        productName: (bi.title as string) ?? "Experience",
        variantId: (bi.variantId as string) ?? "",
        variantName: (bi.title as string) ?? "Standard",
        inventoryId: (bi.inventoryId as string) ?? "",
        inventoryType: (bi.inventoryType as string) ?? "NORMAL",
        date: (bi.date as string) ?? "",
        startDateTime: (bi.startDateTime as string) ?? "",
        endDateTime: (bi.endDateTime as string) ?? "",
        time: ((bi.startDateTime as string) ?? "").split("T")[1]?.slice(0, 5) ?? "",
        guestCounts,
        currency: (bi.currency as string) ?? "USD",
        title: (bi.title as string) ?? "Experience",
        price: (bi.priceAmount as number) ?? 0,
        bookingPrice: (bi.priceAmount as number) ?? 0,
        guests: gCounts,
        cartItemId,
        imageUrl: (bi.imageUrl as string) ?? "",
        inputFields: (bi.inputFields as InputField[]) ?? [],
        loading,
      }
    }

    return {
      ...defaultCheckout,
      cartItemId,
      loading,
    }
  }, [cartItemId, backendItem, loading])

  return (
    <CheckoutContext.Provider value={{ info }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  return useContext(CheckoutContext)
}
