"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Clock, ShieldCheck, Zap } from "lucide-react";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { useCurrencyContext } from "@/context/CurrencyContext";
import type { Experience } from "@/types/experience";

function formatDuration(minSec: number, maxSec: number): string {
  const secs = minSec || maxSec;
  if (!secs) return "";
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  return `${mins}m`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Tours: "bg-blue-500/75",
  Activities: "bg-emerald-500/75",
  Attractions: "bg-violet-500/75",
  Shows: "bg-amber-500/75",
  Food: "bg-orange-500/75",
};

export function ExperienceCard({ experience }: { experience: Experience }) {
  const { currency: contextCurrency } = useCurrencyContext();
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
  // Use the source currency from the data so formatPrice can convert from→to correctly.
  // formatPrice(amount, fromCurrency) converts option.currency → context currency.
  const currency = option?.currency ?? contextCurrency;
  const hasMobile = option?.fulfillmentMobile;
  const hasFreeCancel = cancellationPolicy?.refundPercent === 100;
  const category = categories[0];
  const duration = formatDuration(durationMinSeconds, durationMaxSeconds);
  const catColor = CATEGORY_COLORS[category] ?? "bg-brand-500/75";
  const href = `/products/${slug}-${headoutId || id}`;

  return (
    <Link href={href} className="group block h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-black/8">

        {/* Image */}
        <div className="relative h-[175px] w-full flex-shrink-0 overflow-hidden bg-muted">
          <Image
            src={imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="260px"
          />
          {/* Gradient: dark top-corners + strong bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/15" />

          {/* Category — top left */}
          {category && (
            <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ${catColor}`}>
              {category}
            </span>
          )}

          {/* Duration — top right */}
          {duration && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              {duration}
            </span>
          )}

          {/* City + Rating — image bottom row */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2.5 pb-2.5">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-white/75" />
              <span className="text-[11px] font-medium text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
                {city}
              </span>
            </div>
            {rating > 0 && (
              <div className="flex items-center gap-0.5 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-bold text-white">{rating.toFixed(1)}</span>
                {reviewCount > 0 && (
                  <span className="text-[10px] text-white/65">
                    ({reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(reviewCount >= 10000 ? 0 : 1)}k` : reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-500">
            {title}
          </h3>

          <div className="flex-1" />

          {/* Price + trust badges */}
          <div className="mt-2 border-t border-border/40 pt-2">
            {price > 0 && (
              <div className="mb-1.5 flex items-baseline gap-1">
                <span className="text-[10px] text-muted-foreground">From</span>
                <PriceDisplay
                  amount={price}
                  currency={currency}
                  className="text-base font-black text-foreground"
                />
              </div>
            )}

            {(hasFreeCancel || hasMobile) && (
              <div className="flex flex-wrap gap-1">
                {hasFreeCancel && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Free cancel
                  </span>
                )}
                {hasMobile && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600">
                    <Zap className="h-2.5 w-2.5" />
                    Instant
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
