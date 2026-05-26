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
import { getExperienceById, getJSONLD } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = PDP_REVALIDATE_SECONDS;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getExperienceById(params.id);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
  };
}

export default async function ExperienceByIDPage({ params }: { params: { id: string } }) {
  const result = await getExperienceById(params.id);
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
          <ExperienceFeatures inclusions={result.data.options[0]?.inclusions ?? []} exclusions={result.data.options[0]?.exclusions ?? []} />
          <ExperienceReviews rating={result.data.rating} reviewCount={result.data.reviewCount} />
        </div>
        <div className="hidden lg:block">
          <PricingBox experience={result.data} />
        </div>
      </div>
    </div>
  );
}
