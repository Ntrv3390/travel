import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { ExperienceFeatures } from "@/components/experience/ExperienceFeatures";
import { ExperienceReviews } from "@/components/experience/ExperienceReviews";
import { PricingBox } from "@/components/experience/PricingBox";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { CityBadge } from "@/components/common/CityBadge";
import { StarRating } from "@/components/common/StarRating";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getExperience, getJSONLD, getTopExperiences } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = PDP_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  const top = await getTopExperiences(100);
  return top.data?.experiences.map((exp) => ({ city: exp.citySlug, slug: exp.slug })) ?? [];
}

export async function generateMetadata({ params }: { params: { city: string; slug: string } }): Promise<Metadata> {
  const result = await getExperience(params.city, params.slug);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
    openGraph: {
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [{ url: result.data.images[0]?.url ?? "/images/fallback-experience.svg", width: 1200, height: 630 }],
      type: "website",
    },
    alternates: {
      canonical: `/${params.city}/${params.slug}`,
    },
  };
}

export default async function PDPPage({ params }: { params: { city: string; slug: string } }) {
  const result = await getExperience(params.city, params.slug);
  if (result.error) {
    return (
      <div className="container py-section">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Experience details are temporarily unavailable.</AlertDescription>
        </Alert>
      </div>
    );
  }
  if (!result.data) notFound();

  const jsonLD = await getJSONLD(result.data.headoutId);
  const firstOption = result.data.options[0];

  return (
    <div className="container py-section">
      {jsonLD.data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD.data }} /> : null}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <ExperienceGallery images={result.data.images} title={result.data.title} />

          <section className="space-y-4">
            <h1 className="text-display-sm font-bold">{result.data.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={result.data.rating} reviewCount={result.data.reviewCount} />
              <CityBadge city={result.data.city} />
              <CategoryBadge category={result.data.categories[0] ?? "Activity"} />
            </div>
            <p className="leading-relaxed text-muted-foreground">{result.data.description}</p>
          </section>

          <ExperienceFeatures inclusions={firstOption?.inclusions ?? []} exclusions={firstOption?.exclusions ?? []} />

          {result.data.cancellationPolicy ? (
            <Alert className="border-green-500/40 bg-green-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Free cancellation up to {result.data.cancellationPolicy.cutoffHours} hours before start.
              </AlertDescription>
            </Alert>
          ) : null}

          <ExperienceReviews rating={result.data.rating} reviewCount={result.data.reviewCount} />
        </div>

        <div className="hidden lg:block">
          <PricingBox experience={result.data} />
        </div>
      </div>
    </div>
  );
}
