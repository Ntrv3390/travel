"use client"

import { useState, createContext, useContext, useCallback } from "react"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "success" | "error" | "warning"
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, "id">) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within a Toaster provider")
  return context
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg animate-in slide-in-from-right",
                t.variant === "success" && "border-green-200",
                t.variant === "error" && "border-red-200",
                t.variant === "warning" && "border-yellow-200",
                !t.variant && "border-slate-200"
              )}
            >
              {t.variant === "success" && <CheckCircle className="h-5 w-5 text-green-600 flex-none" />}
              {t.variant === "error" && <AlertCircle className="h-5 w-5 text-red-600 flex-none" />}
              {t.variant === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600 flex-none" />}
              {!t.variant && <Info className="h-5 w-5 text-blue-600 flex-none" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => removeToast(t.id)} className="flex-none text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
