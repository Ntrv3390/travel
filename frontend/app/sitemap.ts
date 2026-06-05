import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getCities, getTopExperiences } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/cities`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic: cities
  const citiesResult = await getCities(0, 200);
  const citiesData = citiesResult.data as { cities: Array<{ slug: string }> } | null;
  const cityPages: MetadataRoute.Sitemap = (citiesData?.cities ?? []).map((city) => ({
    url: `${baseUrl}/cities/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Dynamic: top experiences (PDP pages)
  const topExperiences = await getTopExperiences(100);
  const experiencePages: MetadataRoute.Sitemap = (topExperiences.data?.experiences ?? []).map((exp) => ({
    url: `${baseUrl}/cities/${exp.citySlug}/${exp.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...cityPages, ...experiencePages];
}
