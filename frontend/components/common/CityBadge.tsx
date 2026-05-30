"use client";

import { Badge } from "@/components/ui/badge";

interface CityBadgeProps {
  city?: string;
}

export function CityBadge({ city = "" }: CityBadgeProps) {
  return <Badge className="bg-brand-50 text-brand-700 border-brand-200">{city}</Badge>;
}
