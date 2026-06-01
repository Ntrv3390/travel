"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Experience } from "@/types/experience"
import type { SingleExperienceContent } from "@/components/experience/single-experience/types"

interface ProductState {
  experience: Experience | null
  relatedExperiences: Experience[]
  singleExperienceContent: SingleExperienceContent | null
  isLoading: boolean
  error: string | null
}

export interface ProductContextValue {
  state: ProductState
  updateProduct: (partial: Partial<ProductState>) => void
}

export const ProductContext = createContext<ProductContextValue | undefined>(undefined)

export function ProductProvider({
  children,
  experience = null,
  relatedExperiences = [],
  singleExperienceContent = null,
  isLoading = false,
  error = null,
}: {
  children: ReactNode
  experience?: Experience | null
  relatedExperiences?: Experience[]
  singleExperienceContent?: SingleExperienceContent | null
  isLoading?: boolean
  error?: string | null
}) {
  const [state, setState] = useState<ProductState>({
    experience,
    relatedExperiences,
    singleExperienceContent,
    isLoading,
    error,
  })

  useEffect(() => {
    setState({
      experience,
      relatedExperiences,
      singleExperienceContent,
      isLoading,
      error,
    })
  }, [experience, relatedExperiences, singleExperienceContent, isLoading, error])

  const updateProduct = (partial: Partial<ProductState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }

  const value = useMemo(() => ({ state, updateProduct }), [state])

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  )
}

export function useProduct() {
  const context = useContext(ProductContext)
  if (!context) throw new Error("useProduct must be used within ProductProvider")
  return context
}
