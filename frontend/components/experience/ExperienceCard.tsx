import Image from "next/image";
import Link from "next/link";
import { Clock, Star, MapPin, ShieldCheck, Zap } from "lucide-react";
import { PriceDisplay } from "@/components/common/PriceDisplay";
import { formatDuration } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Experience } from "@/types/experience";

const CATEGORY_COLORS: Record<string, string> = {
  Tours: "bg-blue-500/75",
  Activities: "bg-emerald-500/75",
  Attractions: "bg-violet-500/75",
  Shows: "bg-amber-500/75",
  Food: "bg-orange-500/75",
};

export function ExperienceCard({
  experience,
  className,
  priority = false,
}: {
  experience: Experience;
  className?: string;
  priority?: boolean;
}) {
  const rawUrl = experience.images[0]?.url;
  const imageUrl = rawUrl
    ? rawUrl.startsWith("//") ? "https:" + rawUrl : rawUrl
    : "/images/fallback-experience.svg";

  const option = experience.options[0];
  const price = option?.price ?? 0;
  const currency = option?.currency ?? "USD";
  const hasMobile = option?.fulfillmentMobile;
  const hasFreeCancel = experience.cancellationPolicy?.refundPercent === 100;
  const category = experience.categories[0];
  const duration = formatDuration(experience.durationMinSeconds, experience.durationMaxSeconds);
  const catColor = CATEGORY_COLORS[category] ?? "bg-brand-500/75";
  const href = `/products/${experience.slug}-${experience.headoutId}`;

  return (
    <Link href={href} className={cn("group block", className)}>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-black/8">

        {/* Image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={experience.title}
            fill
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/15" />

          {/* Category pill */}
          {category && (
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ${catColor}`}>
              {category}
            </span>
          )}

          {/* Duration pill */}
          {duration && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              {duration}
            </span>
          )}

          {/* City + Rating bottom row */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-white/75" />
              <span className="text-xs font-medium text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
                {experience.city}
              </span>
            </div>
            {experience.rating > 0 && (
              <div className="flex items-center gap-0.5 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-sm">
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-white">{experience.rating.toFixed(1)}</span>
                {experience.reviewCount > 0 && (
                  <span className="text-[11px] text-white/65">
                    ({experience.reviewCount >= 1000
                      ? `${(experience.reviewCount / 1000).toFixed(experience.reviewCount >= 10000 ? 0 : 1)}k`
                      : experience.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-brand-500">
            {experience.title}
          </h3>

          <div className="flex-1" />

          {/* Price + badges */}
          <div className="mt-3 border-t border-border/40 pt-3">
            {price > 0 && (
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-[10px] text-muted-foreground">From</span>
                <PriceDisplay
                  amount={price}
                  currency={currency}
                  className="text-lg font-black text-foreground"
                />
              </div>
            )}

            {(hasFreeCancel || hasMobile) && (
              <div className="flex flex-wrap gap-1.5">
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
