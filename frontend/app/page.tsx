import { getCities, getHomeCategories, getHomeCollections, getHomeTestimonials } from "@/lib/api";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { TrendingExperiences } from "@/components/home/trending-experiences";
import { Destinations } from "@/components/home/destinations";
import { Categories } from "@/components/home/categories";
// import { Collections } from "@/components/home/collections";
import { WhyTriipzy } from "@/components/home/why-triipzy";
import { Testimonials } from "@/components/home/testimonials";
import type { City, HomeCategory, HomeCollection, Testimonial } from "@/types/api";

// Revalidate city/category metadata daily; pricing is fetched client-side
export const revalidate = 86400;

export default async function HomePage() {
  const [citiesResult, categoriesResult, collectionsResult, testimonialsResult] = await Promise.all([
    getCities(0, 50),
    getHomeCategories(),
    getHomeCollections(),
    getHomeTestimonials(),
  ]);

  const citiesResponse = citiesResult.data as { cities: City[]; total: number } | null;
  const cities: City[] = citiesResponse?.cities ?? [];
  const categories: HomeCategory[] = categoriesResult.data ?? [];
  // const collections: HomeCollection[] = collectionsResult.data ?? [];
  const testimonials: Testimonial[] = testimonialsResult.data ?? [];

  const totalDestinations = citiesResponse?.total ?? cities.length;

  return (
    <>
      <Hero stats={{ totalExperiences: 0, totalDestinations, avgRating: 0 }} />
      <TrustSection stats={{ totalExperiences: 0, totalDestinations, avgRating: 0, totalReviews: 0 }} />
      {/* TrendingExperiences fetches its own data client-side so it reacts to currency changes */}
      <TrendingExperiences />
      <Destinations cities={cities} />
      <Categories categories={categories} />
      {/* <Collections collections={collections} /> */}
      <WhyTriipzy />
      <Testimonials testimonials={testimonials} />
    </>
  );
}
