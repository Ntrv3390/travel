import { Badge } from "@/components/ui/badge";

export function CityBadge({ city }: { city: string }) {
  return <Badge className="bg-brand-50 text-brand-700 border-brand-200">{city}</Badge>;
}
