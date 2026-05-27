"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import useSWR, { mutate } from "swr"
import type { Cart, CartItem } from "@/types/booking"

interface CartContextValue {
  cart: Cart | undefined
  isLoading: boolean
  error: Error | undefined
  addItem: (item: Omit<CartItem, "id">) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  itemCount: number
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

const CART_SWR_KEY = "cart-data"

async function fetcher(url: string, sessionId: string) {
  const res = await fetch(url, {
    headers: { "X-Session-ID": sessionId },
  })
  if (!res.ok) throw new Error("Failed to fetch cart")
  return res.json()
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState("")

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
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify(item),
    })
    mutate(["/api/cart", sessionId])
  }, [sessionId])

  const removeItem = useCallback(async (itemId: string) => {
    if (!sessionId) return
    await fetch(`/api/cart/${itemId}`, {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
    })
    mutate(["/api/cart", sessionId])
  }, [sessionId])

  const clearCart = useCallback(async () => {
    if (!sessionId) return
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
    })
    mutate(["/api/cart", sessionId], { sessionId, items: [], totalItems: 0, totalPrice: 0, currency: "USD" })
  }, [sessionId])

  const itemCount = cart?.totalItems ?? 0

  return (
    <CartContext.Provider value={{ cart, isLoading, error, addItem, removeItem, clearCart, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCartContext = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCartContext must be used within CartProvider")
  return context
}
