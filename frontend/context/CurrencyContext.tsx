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
  rates: Record<string, number>
  formatPrice: (amount: number, fromCurrency?: string) => string
  convertAmount: (amount: number, fromCurrency: string) => number
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  setCurrency: () => {},
  supportedCurrencies: [],
  rates: {},
  formatPrice: () => "",
  convertAmount: (a) => a,
})

const STORAGE_KEY = "traviia_currency"

export function CurrencyProvider({
  children,
  initialCurrency = "INR",
  initialRates = {},
}: {
  children: ReactNode
  initialCurrency?: string
  initialRates?: Record<string, number>
}) {
  const [currency, setCurrencyState] = useState(initialCurrency)
  const [supportedCurrencies, setSupportedCurrencies] = useState<CurrencyInfo[]>([])
  const [rates, setRates] = useState<Record<string, number>>(initialRates)

  // One-time localStorage migration: if user has old "USD" system default (never explicitly chosen), reset to INR
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const userExplicitlySet = localStorage.getItem(STORAGE_KEY + "_set")
    if (saved === "USD" && !userExplicitlySet) {
      localStorage.setItem(STORAGE_KEY, "INR")
      localStorage.setItem(STORAGE_KEY + "_set", "0")
      document.cookie = `${STORAGE_KEY}=INR;path=/;max-age=31536000;SameSite=Lax`
      setCurrencyState("INR")
      return
    }
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

  useEffect(() => {
    // Try our backend first; fall back to open.er-api.com if it fails or returns empty rates
    const applyRates = (json: unknown) => {
      const r = (json as Record<string, unknown>)?.rates
      if (r && typeof r === "object" && Object.keys(r as object).length > 0) {
        setRates(r as Record<string, number>)
        return true
      }
      return false
    }

    fetch("/api/v1/exchange-rates", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (!applyRates(json)) {
          // Backend rates unavailable — fetch directly from the free open tier
          return fetch("https://open.er-api.com/v6/latest/USD")
            .then((res) => res.ok ? res.json() : null)
            .then(applyRates)
        }
      })
      .catch(() => {
        fetch("https://open.er-api.com/v6/latest/USD")
          .then((res) => res.ok ? res.json() : null)
          .then((json) => applyRates(json))
          .catch(() => {})
      })
  }, [])

  const setCurrency = useCallback(
    (code: string) => {
      if (code === currency) return
      setCurrencyState(code)
      try {
        localStorage.setItem(STORAGE_KEY, code)
        localStorage.setItem(STORAGE_KEY + "_set", "1")
      } catch {
        // localStorage unavailable in some private/incognito modes
      }
      document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;SameSite=Lax`
    },
    [currency],
  )

  // Convert amount from fromCurrency to the current context currency.
  // Returns the original amount if rates are not loaded or currencies are the same.
  const convertAmount = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (fromCurrency === currency || !amount) return amount
      const fromRate = rates[fromCurrency]
      const toRate = rates[currency]
      if (!fromRate || !toRate) return amount
      return Math.round(((amount / fromRate) * toRate) * 100) / 100
    },
    [currency, rates],
  )

  // formatPrice(amount, fromCurrency?)
  // If fromCurrency is provided and differs from context currency, converts first.
  // If omitted, treats amount as already being in context currency.
  const formatPrice = useCallback(
    (amount: number, fromCurrency?: string) => {
      const converted = fromCurrency && fromCurrency !== currency
        ? convertAmount(amount, fromCurrency)
        : amount
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(converted)
      } catch {
        return `${currency} ${converted.toFixed(2)}`
      }
    },
    [currency, convertAmount],
  )

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, supportedCurrencies, rates, formatPrice, convertAmount }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrencyContext = () => useContext(CurrencyContext)
