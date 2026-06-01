import { getCities } from "@/lib/api";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { TrendingExperiences } from "@/components/home/trending-experiences";
import { Destinations } from "@/components/home/destinations";
import { Categories } from "@/components/home/categories";
import { WhyTriipzy } from "@/components/home/why-triipzy";
import { Testimonials } from "@/components/home/testimonials";
import type { City } from "@/types/api";

// Revalidate city/category metadata daily; pricing is fetched client-side
export const revalidate = 86400;

export default async function HomePage() {
  const citiesResult = await getCities(0, 50);
  const citiesResponse = citiesResult.data as { cities: City[]; total: number } | null;
  const cities: City[] = citiesResponse?.cities ?? [];

  const totalDestinations = citiesResponse?.total ?? cities.length;

  return (
    <>
      <Hero stats={{ totalExperiences: 0, totalDestinations, avgRating: 0 }} />
      <TrustSection stats={{ totalExperiences: 0, totalDestinations, avgRating: 0, totalReviews: 0 }} />
      {/* TrendingExperiences fetches its own data client-side so it reacts to currency changes */}
      <TrendingExperiences />
      <Destinations cities={cities} />
      <Categories />
      <WhyTriipzy />
      <Testimonials />
    </>
  );
}
