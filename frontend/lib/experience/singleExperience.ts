import { getCityExperiences, getExperience, getExperienceById, getTopExperiences } from "@/lib/api";
import type { Experience } from "@/types/experience";

export interface SingleExperiencePayload {
  experience: Experience;
  related: Experience[];
}

async function buildPayload(selected: Experience): Promise<SingleExperiencePayload> {
  const relatedResponse = await getCityExperiences(selected.city, {
    limit: "12",
    page: "1",
  });

  const related = relatedResponse.data?.experiences?.length ? relatedResponse.data.experiences : [selected];

  return {
    experience: selected,
    related,
  };
}

export async function getSingleExperiencePayload(): Promise<SingleExperiencePayload> {
  const top = await getTopExperiences(1);
  const selected = top.data?.experiences[0];
  if (!selected) {
    throw new Error("Backend did not return any experiences");
  }

  return buildPayload(selected);
}

export async function getSingleExperiencePayloadBySlugOrID(slugOrID: string): Promise<SingleExperiencePayload | null> {
  const byID = await getExperienceById(slugOrID);
  if (byID.data) {
    return buildPayload(byID.data);
  }

  const top = await getTopExperiences(500);
  const candidates = top.data?.experiences ?? [];
  const matched = candidates.find(
    (item) => item.slug === slugOrID || item.headoutId === slugOrID || item.id === slugOrID,
  );

  if (!matched) {
    return null;
  }

  const full = await getExperience(matched.citySlug, matched.slug);
  if (full.data) {
    return buildPayload(full.data);
  }

  return buildPayload(matched);
}
