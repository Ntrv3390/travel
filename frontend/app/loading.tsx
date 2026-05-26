import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";

export default function Loading() {
  return (
    <div className="container py-section">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <ExperienceCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
