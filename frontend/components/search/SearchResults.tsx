"use client";

import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { useExperiences } from "@/context/ExperiencesContext";

export function SearchResults() {
  const { state } = useExperiences();

  if (!state.experiences.length) {
    return (
      <EmptyState
        title="No results found"
        description="Try a broader search or different city."
        action={{ label: "Go home", href: "/" }}
      />
    );
  }

  return <ExperienceGrid />;
}
