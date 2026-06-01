"use client"

import { useCurrency } from "@/hooks/useCurrency"
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Globe2, Search, X, Loader2 } from "lucide-react"

interface CurrencyInfo {
  code: string
  symbol: string
  name: string
}

const POPULAR_CODES = ["USD", "EUR", "GBP", "AED", "INR", "SGD", "AUD", "CAD", "JPY"]

const REGION_MAP: Record<string, string> = {
  USD: "Americas",
  CAD: "Americas",
  AUD: "Asia Pacific",
  NZD: "Asia Pacific",
  SGD: "Asia Pacific",
  JPY: "Asia Pacific",
  HKD: "Asia Pacific",
  INR: "Asia Pacific",
  THB: "Asia Pacific",
  MYR: "Asia Pacific",
  IDR: "Asia Pacific",
  PHP: "Asia Pacific",
  KRW: "Asia Pacific",
  CNY: "Asia Pacific",
  EUR: "Europe",
  GBP: "Europe",
  CHF: "Europe",
  NOK: "Europe",
  SEK: "Europe",
  DKK: "Europe",
  PLN: "Europe",
  CZK: "Europe",
  HUF: "Europe",
  TRY: "Middle East & Africa",
  AED: "Middle East & Africa",
  SAR: "Middle East & Africa",
  QAR: "Middle East & Africa",
  OMR: "Middle East & Africa",
  KWD: "Middle East & Africa",
  ZAR: "Middle East & Africa",
  EGP: "Middle East & Africa",
}

function getRegion(code: string) {
  return REGION_MAP[code] ?? "Other"
}

function CurrencySection({
  title,
  items,
  selectedCurrency,
  onSelect,
}: {
  title: string
  items: CurrencyInfo[]
  selectedCurrency: string
  onSelect: (code: string) => void
}) {
  if (!items.length) return null

  return (
    <section className="space-y-2">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const active = item.code === selectedCurrency
          return (
            <button
              key={item.code}
              onClick={() => onSelect(item.code)}
              className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left transition-all ${
                active
                  ? "border-sky-300 bg-sky-50 text-sky-900 shadow-[0_8px_20px_rgba(14,165,233,0.12)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{item.symbol}</span>
                  <span className="text-sm font-semibold">{item.code}</span>
                </div>
                <div className="truncate text-xs text-slate-500">{item.name}</div>
              </div>
              <span
                className={`ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function CurrencyMenuContent({
  currency,
  groupedCurrencies,
  filteredCount,
  onSelect,
  onClose,
  query,
  setQuery,
}: {
  currency: string
  groupedCurrencies: {
    popular: CurrencyInfo[]
    regions: Array<{ region: string; items: CurrencyInfo[] }>
  }
  filteredCount: number
  onSelect: (code: string) => void
  onClose: () => void
  query: string
  setQuery: (value: string) => void
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Choose your currency</div>
          <div className="text-xs text-slate-500">Prices update across listings, search, and product pages.</div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-slate-700 md:bg-slate-50"
          aria-label="Close currency menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-slate-200 px-4 py-3 md:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search currency or code"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
      </div>

      <div className="max-h-[72vh] overflow-y-auto px-4 py-4 md:max-h-[32rem] md:px-5">
        <div className="space-y-5">
          <CurrencySection
            title="Popular"
            items={groupedCurrencies.popular}
            selectedCurrency={currency}
            onSelect={onSelect}
          />

          {groupedCurrencies.regions.map((section) => (
            <CurrencySection
              key={section.region}
              title={section.region}
              items={section.items}
              selectedCurrency={currency}
              onSelect={onSelect}
            />
          ))}

          {filteredCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
              <div className="text-sm font-medium text-slate-700">No currencies found</div>
              <div className="mt-1 text-xs text-slate-500">Try a code like `EUR` or `AED`.</div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

export function CurrencyPicker({ className }: { className?: string }) {
  const { currency, setCurrency, supportedCurrencies, isChanging } = useCurrency()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const activeCurrency = supportedCurrencies.find((c) => c.code === currency)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open && typeof window !== "undefined" && window.innerWidth < 768 ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const filteredCurrencies = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return supportedCurrencies
    return supportedCurrencies.filter((item) =>
      item.code.toLowerCase().includes(normalized) ||
      item.name.toLowerCase().includes(normalized) ||
      item.symbol.toLowerCase().includes(normalized),
    )
  }, [query, supportedCurrencies])

  const groupedCurrencies = useMemo(() => {
    const popular = filteredCurrencies.filter((item) => POPULAR_CODES.includes(item.code))
    const byRegion = filteredCurrencies
      .filter((item) => !POPULAR_CODES.includes(item.code))
      .reduce<Record<string, CurrencyInfo[]>>((acc, item) => {
        const region = getRegion(item.code)
        acc[region] ??= []
        acc[region].push(item)
        return acc
      }, {})

    Object.values(byRegion).forEach((items) => items.sort((a, b) => a.code.localeCompare(b.code)))

    return {
      popular,
      regions: ["Americas", "Europe", "Asia Pacific", "Middle East & Africa", "Other"]
        .map((region) => ({ region, items: byRegion[region] ?? [] }))
        .filter((section) => section.items.length > 0),
    }
  }, [filteredCurrencies])

  const handleSelect = (code: string) => {
    setCurrency(code)
    setOpen(false)
  }

  const iconTone = className?.includes("text-white") ? "text-white/70" : "text-slate-400"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        disabled={isChanging}
        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
          className || "text-slate-700 hover:bg-slate-100"
        } ${isChanging ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-expanded={open}
        aria-label="Choose currency"
      >
        {activeCurrency ? (
          <>
            <span className="text-base">{activeCurrency.symbol}</span>
            <span>{activeCurrency.code}</span>
          </>
        ) : (
          <>
            <Globe2 className="h-4 w-4" />
            <span>{currency}</span>
          </>
        )}
        {isChanging ? (
          <Loader2 className={`h-3.5 w-3.5 animate-spin ${iconTone}`} />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""} ${iconTone}`} />
        )}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] md:hidden" />

          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border border-slate-200 bg-slate-50 shadow-2xl md:hidden">
            <CurrencyMenuContent
              currency={currency}
              groupedCurrencies={groupedCurrencies}
              filteredCount={filteredCurrencies.length}
              onSelect={handleSelect}
              onClose={() => setOpen(false)}
              query={query}
              setQuery={setQuery}
            />
          </div>

          <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(42rem,92vw)] rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl md:block">
            <CurrencyMenuContent
              currency={currency}
              groupedCurrencies={groupedCurrencies}
              filteredCount={filteredCurrencies.length}
              onSelect={handleSelect}
              onClose={() => setOpen(false)}
              query={query}
              setQuery={setQuery}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
