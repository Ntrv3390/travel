"use client"

import { useCurrency } from "@/hooks/useCurrency"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react"

interface CurrencyInfo {
  code: string
  symbol: string
  name: string
}

const POPULAR_CODES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "ARS"]

function CurrencyRow({
  item,
  active,
  onSelect,
}: {
  item: CurrencyInfo
  active: boolean
  onSelect: (code: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(item.code)}
      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-900 shadow-[0_4px_12px_rgba(14,165,233,0.12)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="w-8 shrink-0 text-sm font-bold tabular-nums">{item.symbol}</span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-sm font-semibold">{item.code}</span>
            <span className="truncate text-xs text-slate-500">{item.name}</span>
          </div>
        </div>
      </div>
      {active && (
        <span className="ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  )
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
      <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <CurrencyRow
            key={item.code}
            item={item}
            active={item.code === selectedCurrency}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

function CurrencyMenuContent({
  currency,
  popular,
  rest,
  filteredAll,
  isFiltering,
  onSelect,
  onClose,
  query,
  setQuery,
}: {
  currency: string
  popular: CurrencyInfo[]
  rest: CurrencyInfo[]
  filteredAll: CurrencyInfo[]
  isFiltering: boolean
  onSelect: (code: string) => void
  onClose: () => void
  query: string
  setQuery: (value: string) => void
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">Choose your currency</div>
          <div className="text-xs text-slate-500">Prices update instantly across all listings.</div>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-slate-700 md:bg-slate-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-slate-200 px-4 py-3 md:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or code…"
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Body — flex-1 fills remaining height inside the mobile sheet; md gets a fixed max */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:max-h-[34rem] md:flex-none md:px-5">
        {isFiltering ? (
          /* Flat filtered list */
          <div className="space-y-2">
            {filteredAll.length > 0 ? (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {filteredAll.map((item) => (
                  <CurrencyRow
                    key={item.code}
                    item={item}
                    active={item.code === currency}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <div className="text-sm font-medium text-slate-700">No currencies found</div>
                <div className="mt-1 text-xs text-slate-500">Try a code like EUR or AED.</div>
              </div>
            )}
          </div>
        ) : (
          /* Two-section layout */
          <div className="space-y-6">
            <CurrencySection
              title="Popular currencies"
              items={popular}
              selectedCurrency={currency}
              onSelect={onSelect}
            />
            <CurrencySection
              title="All currencies"
              items={rest}
              selectedCurrency={currency}
              onSelect={onSelect}
            />
          </div>
        )}
      </div>
    </>
  )
}

export function CurrencyPicker({ className }: { className?: string }) {
  const { currency, setCurrency, supportedCurrencies } = useCurrency()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const activeCurrency = supportedCurrencies.find((c) => c.code === currency)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (window.innerWidth < 768) return
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  useEffect(() => {
    const update = () => {
      document.body.style.overflow = open && window.innerWidth < 768 ? "hidden" : ""
    }
    update()
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      document.body.style.overflow = ""
    }
  }, [open])

  const { popular, rest, filteredAll, isFiltering } = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const isFiltering = normalized.length > 0

    const all = isFiltering
      ? supportedCurrencies.filter(
          (c) =>
            c.code.toLowerCase().includes(normalized) ||
            c.name.toLowerCase().includes(normalized) ||
            c.symbol.toLowerCase().includes(normalized),
        )
      : supportedCurrencies

    if (isFiltering) {
      return { popular: [], rest: [], filteredAll: all, isFiltering: true }
    }

    const popularSet = new Set(POPULAR_CODES)
    const popular = POPULAR_CODES.map((code) => all.find((c) => c.code === code)).filter(Boolean) as CurrencyInfo[]
    const rest = all
      .filter((c) => !popularSet.has(c.code))
      .sort((a, b) => a.code.localeCompare(b.code))

    return { popular, rest, filteredAll: all, isFiltering: false }
  }, [query, supportedCurrencies])

  const handleSelect = (code: string) => {
    setCurrency(code)
    setOpen(false)
  }

  const iconTone = className?.includes("text-white") ? "text-white/70" : "text-slate-400"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-xl px-1.5 py-1.5 text-sm font-medium transition-colors sm:gap-2 sm:px-2.5 sm:py-2 ${
          className || "text-slate-700 hover:bg-slate-100"
        }`}
        aria-expanded={open}
        aria-label="Choose currency"
      >
        {activeCurrency ? (
          <>
            <span className="text-base">{activeCurrency.symbol}</span>
            <span className="hidden sm:inline">{activeCurrency.code}</span>
          </>
        ) : (
          <>
            <Globe2 className="h-4 w-4" />
            <span className="hidden sm:inline">{currency}</span>
          </>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""} ${iconTone}`}
        />
      </button>

      {open ? (
        <>
          {/* Mobile backdrop */}
          {createPortal(
            <div
              className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] md:hidden"
              onClick={() => setOpen(false)}
            />,
            document.body,
          )}

          {/* Mobile bottom sheet */}
          {createPortal(
            <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[2rem] border border-slate-200 bg-slate-50 shadow-2xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
              <CurrencyMenuContent
                currency={currency}
                popular={popular}
                rest={rest}
                filteredAll={filteredAll}
                isFiltering={isFiltering}
                onSelect={handleSelect}
                onClose={() => setOpen(false)}
                query={query}
                setQuery={setQuery}
              />
            </div>,
            document.body,
          )}

          {/* Desktop dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(44rem,92vw)] rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl md:block">
            <CurrencyMenuContent
              currency={currency}
              popular={popular}
              rest={rest}
              filteredAll={filteredAll}
              isFiltering={isFiltering}
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
