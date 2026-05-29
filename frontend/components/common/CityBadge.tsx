"use client";

import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { ProductContext, type ProductContextValue } from "@/context/ProductContext";

interface CityBadgeProps {
  city?: string;
}

export function CityBadge({ city }: CityBadgeProps) {
  const productCtx = useContext(ProductContext) as ProductContextValue | undefined;
  const effectiveCity = city ?? productCtx?.state?.experience?.city ?? "";

  return <Badge className="bg-brand-50 text-brand-700 border-brand-200">{effectiveCity}</Badge>;
}
