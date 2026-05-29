"use client";

import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { ProductContext, type ProductContextValue } from "@/context/ProductContext";

interface CategoryBadgeProps {
  category?: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const productCtx = useContext(ProductContext) as ProductContextValue | undefined;
  const effectiveCategory = category ?? productCtx?.state?.experience?.categories[0] ?? "Activity";

  return <Badge className="bg-secondary text-secondary-foreground">{effectiveCategory}</Badge>;
}
