"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"
import type { Experience } from "@/types/experience"

interface ExperiencesState {
  experiences: Experience[]
  totalCount: number
  page: number
  totalPages: number
  isLoading: boolean
  error: string | null
}

interface ExperiencesContextValue {
  state: ExperiencesState
  getExperienceById: (id: string) => Experience | undefined
  updateExperiences: (partial: Partial<ExperiencesState>) => void
}

const ExperiencesContext = createContext<ExperiencesContextValue | undefined>(undefined)

export function ExperiencesProvider({
  children,
  initialExperiences = [],
  totalCount = 0,
  page = 1,
  totalPages = 1,
  isLoading = false,
  error = null,
}: {
  children: ReactNode
  initialExperiences?: Experience[]
  totalCount?: number
  page?: number
  totalPages?: number
  isLoading?: boolean
  error?: string | null
}) {
  const [state, setState] = useState<ExperiencesState>({
    experiences: initialExperiences,
    totalCount,
    page,
    totalPages,
    isLoading,
    error,
  })

  const updateExperiences = (partial: Partial<ExperiencesState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }

  const getExperienceById = (id: string) => state.experiences.find((e) => e.id === id)

  const value = useMemo(
    () => ({ state, getExperienceById, updateExperiences }),
    [state],
  )

  return (
    <ExperiencesContext.Provider value={value}>
      {children}
    </ExperiencesContext.Provider>
  )
}

export function useExperiences() {
  const context = useContext(ExperiencesContext)
  if (!context) throw new Error("useExperiences must be used within ExperiencesProvider")
  return context
}
