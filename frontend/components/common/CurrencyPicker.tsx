"use client"

import { useCurrency } from "@/hooks/useCurrency"
import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"

export function CurrencyPicker() {
  const { currency, setCurrency, supportedCurrencies } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeCurrency = supportedCurrencies.find((c) => c.code === currency)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
      >
        {activeCurrency ? (
          <>
            <span className="text-base">{activeCurrency.symbol}</span>
            <span>{activeCurrency.code}</span>
          </>
        ) : (
          <span>{currency}</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border bg-white p-1 shadow-lg">
          {supportedCurrencies.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                currency === c.code
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-6 text-center">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="text-xs text-slate-400">- {c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
