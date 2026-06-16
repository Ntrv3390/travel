"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["Cart", "Checkout", "Confirmed"] as const

interface StepBarProps {
  currentStep: 1 | 2 | 3
}

export function StepBar({ currentStep }: StepBarProps) {
  if (currentStep === 1) return null;
  return (
    <div className="flex items-center justify-center mb-8 select-none">
      {STEPS.map((label, idx) => {
        const stepNum = (idx + 1) as 1 | 2 | 3
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  isDone && "border-green-500 bg-green-500 text-white",
                  isActive && "border-brand-500 bg-brand-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.15)]",
                  !isDone && !isActive && "border-muted-foreground/30 text-muted-foreground bg-background",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <span>{stepNum}</span>}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-12 sm:w-20 mx-2 mb-5 transition-colors duration-300",
                  isDone ? "bg-green-500" : "bg-muted-foreground/20",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
