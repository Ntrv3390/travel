import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";

export default function Loading() {
  return (
    <div className="container py-section">
      <div className="space-y-6">
        <div className="space-y-2 animate-pulse">
          <div className="h-9 w-64 rounded bg-muted" />
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
        <div className="flex gap-2 animate-pulse">
          <div className="h-9 w-20 rounded-md bg-muted" />
          <div className="h-9 w-24 rounded-md bg-muted" />
          <div className="h-9 w-16 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ExperienceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
