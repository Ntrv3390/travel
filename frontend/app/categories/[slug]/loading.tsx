import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";

export default function Loading() {
  return (
    <div className="container py-section">
      <div className="space-y-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-9 w-56 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ExperienceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
