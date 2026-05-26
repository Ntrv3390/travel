import type { Experience } from "@/types/experience";
import { ExperienceCard } from "@/components/experience/ExperienceCard";

export function ExperienceGrid({ experiences }: { experiences: Experience[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {experiences.map((exp, index) => (
        <ExperienceCard
          key={exp.id}
          id={exp.id}
          title={exp.title}
          city={exp.city}
          citySlug={exp.citySlug}
          slug={exp.slug}
          imageUrl={exp.images[0]?.url ?? "/images/fallback-experience.svg"}
          rating={exp.rating}
          reviewCount={exp.reviewCount}
          price={exp.options[0]?.price ?? 0}
          currency={exp.options[0]?.currency ?? "USD"}
          durationMinSeconds={exp.durationMinSeconds}
          durationMaxSeconds={exp.durationMaxSeconds}
          category={exp.categories[0] ?? "Activity"}
          priority={index < 2}
        />
      ))}
    </div>
  );
}
