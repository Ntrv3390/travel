import { Badge } from "@/components/ui/badge";

export function CategoryBadge({ category }: { category: string }) {
  return <Badge className="bg-secondary text-secondary-foreground">{category}</Badge>;
}
