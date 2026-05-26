import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import type { Experience } from "@/types/experience";

export function SearchResults({ experiences }: { experiences: Experience[] }) {
  if (!experiences.length) {
    return (
      <EmptyState
        title="No results found"
        description="Try a broader search or different city."
        action={{ label: "Go home", href: "/" }}
      />
    );
  }

  return <ExperienceGrid experiences={experiences} />;
}
