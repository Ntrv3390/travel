"use client";

import { AlertTriangle } from "lucide-react";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { ExperienceFeatures } from "@/components/experience/ExperienceFeatures";
import { ExperienceReviews } from "@/components/experience/ExperienceReviews";
import { PricingBox } from "@/components/experience/PricingBox";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { CityBadge } from "@/components/common/CityBadge";
import { StarRating } from "@/components/common/StarRating";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProduct } from "@/context/ProductContext";

export function PdpContent() {
  const { state } = useProduct();
  const { experience, error } = state;

  if (error) {
    return (
      <div className="container py-section">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Experience details are temporarily unavailable.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!experience) return null;

  return (
    <div className="container py-section">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <ExperienceGallery />

          <section className="space-y-4">
            <h1 className="text-display-sm font-bold">{experience.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StarRating rating={experience.rating} reviewCount={experience.reviewCount} />
              <CityBadge city={experience.city} />
              <CategoryBadge category={experience.categories?.[0]} />
            </div>
            <p className="leading-relaxed text-muted-foreground">{experience.description}</p>
          </section>

          <ExperienceFeatures />

          {experience.cancellationPolicy ? (
            <Alert className="border-green-500/40 bg-green-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Free cancellation up to {experience.cancellationPolicy.cutoffHours} hours before start.
              </AlertDescription>
            </Alert>
          ) : null}

          <ExperienceReviews rating={experience.rating} reviewCount={experience.reviewCount} />
        </div>

        <div className="hidden lg:block">
          <PricingBox />
        </div>
      </div>
    </div>
  );
}
