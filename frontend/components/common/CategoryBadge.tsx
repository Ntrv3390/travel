"use client";

import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  category?: string;
}

export function CategoryBadge({ category = "Activity" }: CategoryBadgeProps) {
  return <Badge className="bg-secondary text-secondary-foreground">{category}</Badge>;
}
