"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
})

const STORAGE_KEY = "traviia_currency"

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("USD")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setCurrencyState(saved)
    setMounted(true)
  }, [])

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }, [])

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
