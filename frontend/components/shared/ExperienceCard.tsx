"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Clock, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useCurrency } from "@/hooks/useCurrency";
import type { Experience } from "@/types/experience";

function formatDuration(minSec: number, maxSec: number): string {
  const secs = minSec || maxSec;
  if (!secs) return "";
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  return `${mins}m`;
}

const categoryColors: Record<string, string> = {
  Tours: "bg-blue-100 text-blue-700 border-blue-200",
  Activities: "bg-green-100 text-green-700 border-green-200",
  Attractions: "bg-purple-100 text-purple-700 border-purple-200",
  Shows: "bg-amber-100 text-amber-700 border-amber-200",
  Food: "bg-orange-100 text-orange-700 border-orange-200",
};

export function ExperienceCard({ experience }: { experience: Experience }) {
  const { isChanging } = useCurrency();
  const {
    id,
    headoutId,
    title,
    city,
    rating,
    reviewCount,
    images,
    options,
    categories,
    durationMinSeconds,
    durationMaxSeconds,
    cancellationPolicy,
    slug,
  } = experience;

  const imageUrl = images[0]?.url ?? "/images/fallback-experience.svg";
  const option = options[0];
  const price = option?.price ?? 0;
  const currency = option?.currency ?? "USD";
  const hasMobile = option?.fulfillmentMobile;
  const hasFreeCancel = cancellationPolicy && cancellationPolicy.refundPercent === 100;
  const category = categories[0];
  const duration = formatDuration(durationMinSeconds, durationMaxSeconds);
  const categoryColor = categoryColors[category] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const href = `/products/${slug}-${headoutId || id}`;

  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">

        {/* Image — fixed height so all cards have identical image zones */}
        <div className="relative h-[155px] w-full flex-shrink-0 overflow-hidden bg-slate-100">
          <Image
            src={imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {category && (
            <Badge className={`absolute left-2 top-2 border text-xs font-medium shadow-sm ${categoryColor}`}>
              {category}
            </Badge>
          )}
          {duration && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm shadow-sm">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">

          {/* Top zone — fixed height so price always starts at the same Y.
              h-[100px] fits: city line (16px) + 2-line title (40px) + rating (20px) + gaps */}
          <div className="h-[100px] overflow-hidden">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{city || "Unknown"}</span>
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{title}</h3>
            {rating > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                {reviewCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({reviewCount.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom zone — price + badges, always flush to bottom */}
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            {price > 0 && (
              <PriceDisplay
                amount={price}
                currency={currency}
                className="text-lg font-bold"
                showSkeleton={isChanging}
              />
            )}
            <div className="flex items-center gap-1.5 overflow-hidden">
              {hasFreeCancel && (
                <Badge className="flex-shrink-0 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                  <XCircle className="mr-0.5 h-2.5 w-2.5" />
                  Free Cancel
                </Badge>
              )}
              {hasMobile && (
                <Badge className="flex-shrink-0 border-cyan-200 bg-cyan-50 text-[10px] text-cyan-700">
                  <Zap className="mr-0.5 h-2.5 w-2.5" />
                  Mobile Ticket
                </Badge>
              )}
            </div>
          </div>

        </div>
      </Card>
    </Link>
  );
}