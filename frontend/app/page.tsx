import type { Metadata } from "next";
import { getCities, getHomeCategories, getHomeTestimonials, getTopExperiences } from "@/lib/api";
import { HOME_REVALIDATE_SECONDS } from "@/lib/constants";
import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { TrendingExperiences } from "@/components/home/trending-experiences";
import { RecentlyViewedExperiences } from "@/components/home/recently-viewed-experiences";
import { Destinations } from "@/components/home/destinations";
import { Categories } from "@/components/home/categories";
import { WhyTriipzy } from "@/components/home/why-triipzy";
import { Testimonials } from "@/components/home/testimonials";
// import { Partners } from "@/components/home/partners";
import type { City, HomeCategory, Testimonial } from "@/types/api";

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

export const revalidate = 86400;

export default async function HomePage() {
  const [citiesResult, categoriesResult, testimonialsResult, trendingResult] = await Promise.all([
    getCities(0, 50),
    getHomeCategories(),
    getHomeTestimonials(),
    getTopExperiences(50, 1, "USD", { revalidate: HOME_REVALIDATE_SECONDS }),
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

      {/* Dark hero with video */}
      <Hero />

      {/* Platform trust indicators */}
      {/* <Partners /> */}



      {/* Recently viewed — client-side, renders from localStorage or API */}
      <RecentlyViewedExperiences />

      {/* Server data on first paint; client re-fetches only on currency change */}
      <TrendingExperiences initialExperiences={initialTrending} />

            {/* Animated counters */}
      <TrustSection
        stats={{ totalExperiences: 0, totalDestinations, avgRating: 0, totalReviews: 0 }}
      />

      {/* Destination photo grid */}
      <Destinations cities={cities} />

      {/* Category grid */}
      <Categories categories={categories} />

      {/* Why us + feature list */}
      <WhyTriipzy />

      {/* Review carousel */}
      <Testimonials testimonials={testimonials} />

      {/* Blog / journal */}
      {/* <Inspiration /> */}
    </>
  );
}
