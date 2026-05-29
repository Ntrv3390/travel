"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/common/StarRating";

export function ExperienceReviews() {
  return (
    <section className="space-y-4">
      <h2 className="text-display-xs font-semibold">Reviews</h2>
      <Card>
        <CardContent className="space-y-2 p-6">
          <StarRating size="md" />
          <p className="text-sm text-muted-foreground">Authentic traveler ratings and reviews are continuously synced from suppliers.</p>
        </CardContent>
      </Card>
    </section>
  );
}
