"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { useCurrency } from "@/hooks/useCurrency"
import type { Cart, CartItem } from "@/types/booking"

interface CartContextValue {
  cart: Cart | undefined
  isLoading: boolean
  error: Error | undefined
  addItem: (item: Omit<CartItem, "id">) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  updateCartItem: (itemId: string, updates: Record<string, unknown>) => Promise<void>
  itemCount: number
  staleCurrency: boolean
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

const SESSION_KEY = "traviia_cart_session"

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function toCart(raw: any): Cart {
  const items: CartItem[] = (raw?.items ?? []).map((i: any) => ({
    id: i.id,
    experienceId: i.experienceId,
    productId: i.productId ?? "",
    variantId: i.variantId,
    inventoryId: i.inventoryId ?? "",
    inventoryType: i.inventoryType ?? "",
    date: i.date,
    startDateTime: i.startDateTime ?? "",
    endDateTime: i.endDateTime ?? "",
    adults: i.adults,
    children: i.children,
    guestCounts: i.guestCounts ?? (i.adults || i.children ? { ADULT: i.adults, ...(i.children > 0 ? { CHILD: i.children } : {}) } : undefined),
    title: i.title ?? "",
    priceAmount: i.priceAmount ?? 0,
    currency: i.currency ?? "USD",
    imageUrl: i.imageUrl ?? "",
    addedAt: i.addedAt ?? "",
  }))
  return {
    sessionId: raw.sessionId ?? "",
    items,
    totalItems: items.length,
    totalPrice: items.reduce((sum, i) => sum + (i.priceAmount || 0), 0),
    currency: items[0]?.currency ?? "USD",
  }
}

async function fetcher(url: string, sessionId: string) {
  const res = await fetch(url, {
    headers: { "X-Session-ID": sessionId },
  })
  if (!res.ok) throw new Error("Failed to fetch cart")
  const json = await res.json()
  return toCart(json.data ?? json)
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState("")
  const { currency } = useCurrency()

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  const { data: cart, isLoading, error } = useSWR(
    sessionId ? ["/api/cart", sessionId] : null,
    ([url, sid]) => fetcher(url, sid),
    { revalidateOnFocus: true, refreshInterval: 30000 }
  )

  const addItem = useCallback(async (item: Omit<CartItem, "id">) => {
    if (!sessionId) return
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify(item),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error ?? "Failed to add item to cart")
    }
    const json = await res.json()
    mutate(["/api/cart", sessionId], toCart(json.data ?? json))
  }, [sessionId])

  const removeItem = useCallback(async (itemId: string) => {
    if (!sessionId) return
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error ?? "Failed to remove item from cart")
    }
    const json = await res.json()
    mutate(["/api/cart", sessionId], toCart(json.data ?? json))
  }, [sessionId])

  const clearCart = useCallback(async () => {
    if (!sessionId) return
    const res = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error ?? "Failed to clear cart")
    }
    mutate(["/api/cart", sessionId], { sessionId, items: [], totalItems: 0, totalPrice: 0, currency: "USD" })
  }, [sessionId])

  const updateCartItem = useCallback(async (itemId: string, updates: Record<string, unknown>) => {
    if (!sessionId) return
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error ?? "Failed to update cart item")
    }
    const json = await res.json()
    mutate(["/api/cart", sessionId], toCart(json.data ?? json))
  }, [sessionId])

  const itemCount = cart?.totalItems ?? 0

  const staleCurrency = useMemo(() => {
    if (!cart || cart.items.length === 0) return false
    return cart.items.some(item => item.currency !== currency)
  }, [cart, currency])

  return (
    <CartContext.Provider value={{ cart, isLoading, error, addItem, removeItem, clearCart, updateCartItem, itemCount, staleCurrency }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCartContext = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCartContext must be used within CartProvider")
  return context
}
