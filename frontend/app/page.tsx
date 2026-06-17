import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getCities, getHomeCategories, getHomeTestimonials, getTopExperiences } from "@/lib/api";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { TrendingExperiences } from "@/components/home/trending-experiences";
import { RecentlyViewedExperiences } from "@/components/home/recently-viewed-experiences";
import { Destinations } from "@/components/home/destinations";
import { Categories } from "@/components/home/categories";
import { WhyTriipzy } from "@/components/home/why-triipzy";
import { Testimonials } from "@/components/home/testimonials";
import type { City, HomeCategory, Testimonial } from "@/types/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Triipzy - Discover & Book Unique Experiences Worldwide",
  description:
    "Explore and book tours, activities, and unforgettable experiences across 200+ destinations. Best prices, instant confirmation, and 24/7 support.",
  openGraph: {
    title: "Triipzy - Experiences Worth Having",
    description:
      "Discover and book unique tours, activities, and experiences worldwide.",
    images: [
      {
        url: "/api/og?title=Triipzy&subtitle=Discover+unique+experiences+worldwide&page=home",
        width: 1200,
        height: 630,
        alt: "Triipzy - Travel Experiences",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Triipzy - Experiences Worth Having",
    description: "Discover and book unique tours, activities, and experiences worldwide.",
    images: [
      "/api/og?title=Triipzy&subtitle=Discover+unique+experiences+worldwide&page=home",
    ],
  },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";

  const [citiesResult, categoriesResult, testimonialsResult, trendingResult] = await Promise.all([
    getCities(0, 50),
    getHomeCategories(),
    getHomeTestimonials(),
    getTopExperiences(50, 1, currency),
  ]);

  const citiesResponse = citiesResult.data as { cities: City[]; total: number } | null;
  const cities: City[] = citiesResponse?.cities ?? [];
  const categories: HomeCategory[] = categoriesResult.data ?? [];
  const testimonials: Testimonial[] = testimonialsResult.data ?? [];
  const initialTrending = trendingResult.data?.experiences ?? [];
  const totalDestinations = citiesResponse?.total ?? cities.length;

  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Triipzy",
    url: "https://triipzy.com",
    logo: "https://triipzy.com/logo.png",
    description: "Discover and book unique tours, activities, and experiences worldwide.",
    sameAs: [],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://triipzy.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
      />

      <Hero />

      <RecentlyViewedExperiences />

      <TrendingExperiences initialExperiences={initialTrending} />

      <TrustSection
        stats={{ totalExperiences: 0, totalDestinations, avgRating: 0, totalReviews: 0 }}
      />

      <Destinations cities={cities} />

      <Categories categories={categories} />

      <WhyTriipzy />

      <Testimonials testimonials={testimonials} />
    </>
  );
}
