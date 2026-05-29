"use client";

import { useCurrency } from "@/hooks/useCurrency";

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
}

export function PriceDisplay({ amount, currency: propCurrency, className }: PriceDisplayProps) {
  const { currency: contextCurrency, formatPrice } = useCurrency();
  const currency = propCurrency ?? contextCurrency;

  return <span className={className}>{formatPrice(amount)}</span>;
}
