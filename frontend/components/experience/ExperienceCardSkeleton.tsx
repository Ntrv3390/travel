import { Skeleton } from "@/components/ui/skeleton";

export function ExperienceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
      {/* Image placeholder */}
      <Skeleton className="aspect-[16/10] w-full rounded-none" />

      {/* Content placeholder */}
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-3/4" />

        <div className="flex-1" />

        <div className="mt-3 border-t border-border/40 pt-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-1 h-6 w-24" />
          <div className="mt-2 flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
