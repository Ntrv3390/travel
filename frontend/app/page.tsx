import { getTopExperiencesCached, getCities } from "@/lib/cached-api";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { TrendingExperiences } from "@/components/home/trending-experiences";
import { Destinations } from "@/components/home/destinations";
import { Categories } from "@/components/home/categories";
import { WhyTriipzy } from "@/components/home/why-triipzy";
import { Testimonials } from "@/components/home/testimonials";
import { Newsletter } from "@/components/home/newsletter";
import type { Experience } from "@/types/experience";
import type { City } from "@/types/api";

export const revalidate = 86400;

export default async function HomePage() {
  const [experiencesResult, citiesResult] = await Promise.all([
    getTopExperiencesCached(50, 1, "INR"),
    getCities(0, 50),
  ]);

  const experiences: Experience[] = experiencesResult.data?.experiences ?? [];
  const citiesResponse = citiesResult.data as { cities: City[]; total: number } | null;
  const cities: City[] = citiesResponse?.cities ?? [];

  const totalExperiences = 0;
  const totalDestinations = citiesResponse?.total ?? cities.length;
  const avgRating =
    experiences.length > 0
      ? experiences.reduce((sum, e) => sum + e.rating, 0) / experiences.length
      : 0;
  const totalReviews = experiences.reduce((sum, e) => sum + e.reviewCount, 0);

  return (
    <>
      <Hero stats={{ totalExperiences, totalDestinations, avgRating }} />
      <TrustSection stats={{ totalExperiences, totalDestinations, avgRating, totalReviews }} />
      <TrendingExperiences experiences={experiences} />
      <Destinations cities={cities} />
      <Categories />
      <WhyTriipzy />
      <Testimonials />
      <Newsletter />
    </>
  );
}
