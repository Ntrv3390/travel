"use client"

import { createContext, useContext, type ReactNode } from "react"

interface Pax {
  min: number
  max: number | null
}

interface ProductDetailContextValue {
  productId: string
  productName: string
  variantId: string | number
  variantName: string
  imageUrl: string
  cartItemId: string | null
  initialDate: string | null
  initialGuests: Record<string, number> | null
  pax?: Pax | null
}

const ProductDetailContext = createContext<ProductDetailContextValue | undefined>(undefined)

export function ProductDetailProvider({
  children,
  productId,
  productName,
  variantId,
  variantName,
  imageUrl = "",
  cartItemId = null,
  initialDate = null,
  initialGuests = null,
  pax = null,
}: ProductDetailContextValue & { children: ReactNode }) {
  return (
    <ProductDetailContext.Provider
      value={{
        productId,
        productName,
        variantId,
        variantName,
        imageUrl,
        cartItemId,
        initialDate,
        initialGuests,
        pax,
      }}
    >
      {children}
    </ProductDetailContext.Provider>
  )
}

export function useProductDetail(): ProductDetailContextValue {
  const context = useContext(ProductDetailContext)
  if (!context) throw new Error("useProductDetail must be used within ProductDetailProvider")
  return context
}