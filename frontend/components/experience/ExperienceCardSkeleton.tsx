import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ExperienceCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
