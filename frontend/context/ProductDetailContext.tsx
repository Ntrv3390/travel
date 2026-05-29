"use client"

import { createContext, useContext, type ReactNode } from "react"

interface ProductDetailContextValue {
  productId: string
  productName: string
  variantId: string | number
  variantName: string
}

const ProductDetailContext = createContext<ProductDetailContextValue | undefined>(undefined)

export function ProductDetailProvider({
  children,
  productId,
  productName,
  variantId,
  variantName,
}: ProductDetailContextValue & { children: ReactNode }) {
  return (
    <ProductDetailContext.Provider value={{ productId, productName, variantId, variantName }}>
      {children}
    </ProductDetailContext.Provider>
  )
}

export function useProductDetail(): ProductDetailContextValue {
  const context = useContext(ProductDetailContext)
  if (!context) throw new Error("useProductDetail must be used within ProductDetailProvider")
  return context
}
