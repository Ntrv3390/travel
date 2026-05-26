import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/common/StarRating";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ExperienceCardProps {
  id: string;
  title: string;
  city: string;
  citySlug: string;
  slug: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  durationMinSeconds: number;
  durationMaxSeconds: number;
  category: string;
  className?: string;
  priority?: boolean;
}

export function ExperienceCard({
  title,
  city,
  citySlug,
  slug,
  imageUrl,
  rating,
  reviewCount,
  price,
  currency,
  durationMinSeconds,
  durationMaxSeconds,
  category,
  className,
  priority = false,
}: ExperienceCardProps) {
  return (
    <Link href={`/${citySlug}/${slug}`} className="group block">
      <Card
        className={cn(
          "overflow-hidden border-0 shadow-sm transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-card-hover",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl || "/images/fallback-experience.svg"}
            alt={title}
            fill
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute left-3 top-3">
            <Badge className="border-transparent bg-white/90 text-foreground hover:bg-white/90">{category}</Badge>
          </div>
        </div>

        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {title}
          </h3>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{city}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(durationMinSeconds, durationMaxSeconds)}
            </span>
          </div>

          {rating > 0 ? <StarRating rating={rating} reviewCount={reviewCount} /> : null}

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground">From</span>
              <PriceDisplay amount={price} currency={currency} className="block text-lg font-bold" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
