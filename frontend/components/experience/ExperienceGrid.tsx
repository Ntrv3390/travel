"use client";

import { useEffect, useRef } from "react";
import { useExperiences } from "@/context/ExperiencesContext";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";

const TRIGGER_INDEX = 25;

export function ExperienceGrid({ loadMore, hasMore, loadingMore }: {
  loadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}) {
  const { state } = useExperiences();
  const isFetching = useRef(false);

  useEffect(() => {
    if (!loadMore || !hasMore || loadingMore || state.experiences.length < TRIGGER_INDEX) return;
    const triggerEl = document.getElementById(`exp-card-${state.experiences[TRIGGER_INDEX - 1]?.id}`);
    if (!triggerEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching.current) {
          isFetching.current = true;
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(triggerEl);
    return () => {
      observer.disconnect();
      isFetching.current = false;
    };
  }, [loadMore, hasMore, loadingMore, state.experiences.length]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {state.experiences.map((exp) => (
          <div key={exp.id} id={`exp-card-${exp.id}`}>
            <ExperienceCard experience={exp} />
          </div>
        ))}
        {loadingMore && Array.from({ length: 4 }).map((_, i) => (
          <ExperienceCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
      {!hasMore && state.experiences.length > 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          All {state.totalCount} experiences loaded
        </p>
      )}
    </div>
  );
}
