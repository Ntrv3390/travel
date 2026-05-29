"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/common/StarRating";
import { useProduct } from "@/context/ProductContext";

export function ExperienceReviews() {
  const { state } = useProduct();
  const experience = state.experience!;

  return (
    <section className="space-y-4">
      <h2 className="text-display-xs font-semibold">Reviews</h2>
      <Card>
        <CardContent className="space-y-2 p-6">
          <StarRating rating={experience.rating} reviewCount={experience.reviewCount} size="md" />
          <p className="text-sm text-muted-foreground">Authentic traveler ratings and reviews are continuously synced from suppliers.</p>
        </CardContent>
      </Card>
    </section>
  );
}
