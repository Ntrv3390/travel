"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

interface CurrencyInfo {
  code: string
  symbol: string
  name: string
}

interface CurrencyContextValue {
  currency: string
  setCurrency: (code: string) => void
  isChanging: boolean
  supportedCurrencies: CurrencyInfo[]
  formatPrice: (amount: number, currencyOverride?: string) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "USD",
  setCurrency: () => {},
  isChanging: false,
  supportedCurrencies: [],
  formatPrice: () => "",
})

const STORAGE_KEY = "traviia_currency"

export function CurrencyProvider({
  children,
  initialCurrency = "USD",
}: {
  children: ReactNode
  initialCurrency?: string
}) {
  const [currency, setCurrencyState] = useState(initialCurrency)
  const [isChanging, setIsChanging] = useState(false)
  const [supportedCurrencies, setSupportedCurrencies] = useState<CurrencyInfo[]>([])
  const router = useRouter()
  const changingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from localStorage on mount (handles case where cookie & localStorage differ)
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

      // Persist to storage and cookie immediately
      setCurrencyState(code)
      localStorage.setItem(STORAGE_KEY, code)
      document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;SameSite=Lax`

      // Show loading state
      setIsChanging(true)
      if (changingTimerRef.current) clearTimeout(changingTimerRef.current)

      // Refresh server components so they re-run with the new cookie
      router.refresh()

      // Reset loading after grace period for client components to re-fetch
      changingTimerRef.current = setTimeout(() => {
        setIsChanging(false)
      }, 1800)
    },
    [currency, router],
  )

  useEffect(() => {
    return () => {
      if (changingTimerRef.current) clearTimeout(changingTimerRef.current)
    }
  }, [])

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
      value={{ currency, setCurrency, isChanging, supportedCurrencies, formatPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrencyContext = () => useContext(CurrencyContext)
