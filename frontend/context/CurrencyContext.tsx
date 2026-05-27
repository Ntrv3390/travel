"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  setCurrency: () => {},
})

const STORAGE_KEY = "traviia_currency"

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("INR")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setCurrencyState(saved)
      document.cookie = `${STORAGE_KEY}=${saved};path=/;max-age=31536000;SameSite=Lax`
    }
    setMounted(true)
  }, [])

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
    document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;SameSite=Lax`
    router.refresh()
  }, [router])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrencyContext = () => useContext(CurrencyContext)
