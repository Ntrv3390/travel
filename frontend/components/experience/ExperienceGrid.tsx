"use client";

import { useExperiences } from "@/context/ExperiencesContext";
import { ExperienceCard } from "@/components/experience/ExperienceCard";

export function ExperienceGrid() {
  const { state } = useExperiences();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {state.experiences.map((exp) => (
        <ExperienceCard key={exp.id} experience={exp} />
      ))}
    </div>
  );
}
