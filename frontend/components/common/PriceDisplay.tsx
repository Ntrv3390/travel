"use client";

import { useCurrency } from "@/hooks/useCurrency";

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  showSkeleton?: boolean;
}

export function PriceDisplay({ amount, currency, className, showSkeleton }: PriceDisplayProps) {
  const { formatPrice } = useCurrency();

  if (showSkeleton) {
    return (
      <span
        className={`inline-block animate-pulse rounded bg-muted ${className ?? ""}`}
        style={{ minWidth: "5rem", height: "1.25em" }}
        aria-hidden="true"
      />
    );
  }

  return <span className={className}>{formatPrice(amount, currency)}</span>;
}
