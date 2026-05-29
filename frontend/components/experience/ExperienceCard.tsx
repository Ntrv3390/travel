import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/common/StarRating";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { CityBadge } from "@/components/common/CityBadge";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Experience } from "@/types/experience";

export function ExperienceCard({
  experience,
  className,
  priority = false,
}: {
  experience: Experience;
  className?: string;
  priority?: boolean;
}) {
  const imageUrl = experience.images[0]?.url ?? "/images/fallback-experience.svg";

  return (
    <Link href={`/${experience.citySlug}/${experience.slug}`} className="group block">
      <Card
        className={cn(
          "overflow-hidden border-0 shadow-sm transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-card-hover",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl}
            alt={experience.title}
            fill
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute left-3 top-3">
            <CityBadge city={experience.city} />
          </div>
        </div>

        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {experience.title}
          </h3>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{experience.city}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(experience.durationMinSeconds, experience.durationMaxSeconds)}
            </span>
          </div>

          {experience.rating > 0 ? <StarRating rating={experience.rating} reviewCount={experience.reviewCount} /> : null}

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground">From</span>
              <PriceDisplay
                amount={experience.options[0]?.price ?? 0}
                currency={experience.options[0]?.currency ?? "USD"}
                className="block text-lg font-bold"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
