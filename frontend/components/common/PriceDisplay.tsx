import { formatPrice } from "@/lib/formatters";

interface PriceDisplayProps {
  amount: number;
  currency: string;
  className?: string;
}

export function PriceDisplay({ amount, currency, className }: PriceDisplayProps) {
  return <span className={className}>{formatPrice(amount, currency)}</span>;
}
