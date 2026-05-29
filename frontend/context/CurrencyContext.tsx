"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface CurrencyInfo {
  code: string
  symbol: string
  name: string
}

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
  supportedCurrencies: CurrencyInfo[]
  formatPrice: (amount: number, currencyOverride?: string) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  setCurrency: () => {},
  supportedCurrencies: [],
  formatPrice: () => "",
})

const STORAGE_KEY = "traviia_currency"

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState("INR")
  const [supportedCurrencies, setSupportedCurrencies] = useState<CurrencyInfo[]>([])
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

  useEffect(() => {
    fetch("/api/v1/currencies")
      .then((res) => res.json())
      .then((json) => {
        const list = json.data ?? json
        if (Array.isArray(list)) setSupportedCurrencies(list)
      })
      .catch(() => {})
  }, [])

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
    document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;SameSite=Lax`
    router.refresh()
  }, [router])

  const formatPrice = useCallback(
    (amount: number, currencyOverride?: string) => {
      const cur = currencyOverride ?? currency
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: cur,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(amount)
      } catch {
        return `${cur} ${amount.toFixed(2)}`
      }
    },
    [currency],
  )

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, supportedCurrencies, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrencyContext = () => useContext(CurrencyContext)
