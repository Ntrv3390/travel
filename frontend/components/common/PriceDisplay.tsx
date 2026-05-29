"use client";

import { useCurrency } from "@/hooks/useCurrency";

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
}

export function PriceDisplay({ amount, currency, className }: PriceDisplayProps) {
  const { formatPrice } = useCurrency();

  return <span className={className}>{formatPrice(amount, currency)}</span>;
}
