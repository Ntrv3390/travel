"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

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

export function CurrencyProvider({
  children,
  initialCurrency = "INR",
}: {
  children: ReactNode
  initialCurrency?: string
}) {
  const [currency, setCurrencyState] = useState(initialCurrency)
  const [supportedCurrencies, setSupportedCurrencies] = useState<CurrencyInfo[]>([])

  // Sync from localStorage on mount — resolves any cookie vs localStorage drift
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved !== currency) {
      setCurrencyState(saved)
      document.cookie = `${STORAGE_KEY}=${saved};path=/;max-age=31536000;SameSite=Lax`
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const setCurrency = useCallback(
    (code: string) => {
      if (code === currency) return

      setCurrencyState(code)
      try {
        localStorage.setItem(STORAGE_KEY, code)
      } catch {
        // localStorage unavailable in some private/incognito modes
      }
      document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;SameSite=Lax`
    },
    [currency],
  )

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

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, supportedCurrencies, formatPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrencyContext = () => useContext(CurrencyContext)
