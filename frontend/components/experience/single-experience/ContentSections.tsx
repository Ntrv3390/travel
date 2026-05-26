import type { MutableRefObject } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RelatedCard, SingleExperienceContent } from "@/components/experience/single-experience/types";

const sectionCardClass =
  "scroll-mt-[10.2rem] rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-5 lg:scroll-mt-[10.5rem]";

const reviewSpanClass: Record<string, string> = {
  reviewSpanFull: "md:col-span-6 lg:col-span-12",
  reviewSpanQuarter: "md:col-span-3 lg:col-span-3",
  reviewSpanHalf: "md:col-span-6 lg:col-span-6",
  reviewSpanWide: "md:col-span-6 lg:col-span-8",
  reviewSpanNarrow: "md:col-span-3 lg:col-span-4",
  reviewSpanThird: "md:col-span-3 lg:col-span-4",
};

const comboSpanClass: Record<string, string> = {
  comboSpanWide: "md:col-span-6 lg:col-span-8",
  comboSpanTall: "md:col-span-3 lg:col-span-4",
  comboSpanThird: "md:col-span-3 lg:col-span-4",
  comboSpanHalf: "md:col-span-6 lg:col-span-6",
  comboSpanQuarter: "md:col-span-2 lg:col-span-3",
};

function avatarLabel(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getReviewCardClass(index: number) {
  const pattern = [
    "reviewSpanFull",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanHalf",
    "reviewSpanHalf",
    "reviewSpanWide",
    "reviewSpanNarrow",
    "reviewSpanThird",
    "reviewSpanThird",
    "reviewSpanThird",
    "reviewSpanFull",
  ] as const;

  return pattern[index % pattern.length];
}

function getCombinationCardClass(index: number) {
  const pattern = [
    "comboSpanWide",
    "comboSpanTall",
    "comboSpanThird",
    "comboSpanThird",
    "comboSpanHalf",
    "comboSpanQuarter",
    "comboSpanQuarter",
  ] as const;

  return pattern[index % pattern.length];
}

function getCardImage(images: string[], seed: number, tick: number) {
  if (!images.length) {
    return "/images/fallback-experience.svg";
  }
  const idx = (seed + tick) % images.length;
  return images[idx] || "/images/fallback-experience.svg";
}

function RelatedCardView({ item, seed, tick, className, imageHeightClass }: { item: RelatedCard; seed: number; tick: number; className?: string; imageHeightClass: string }) {
  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_16px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]",
        className,
      )}
      key={item.id}
    >
      <div className={cn("relative", imageHeightClass)}>
        <img
          src={getCardImage(item.images, seed, tick)}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
        />
        {item.badge && (
          <Badge className="absolute left-2 top-2 rounded-md border-[#f3d19f] bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-900">
            {item.badge}
          </Badge>
        )}
      </div>
      <CardContent className="space-y-1 p-3">
        <div className="flex items-center gap-1 text-[13px]">
          <span className="inline-flex items-center gap-1 font-bold text-brand-700">
            <Star size={12} /> {item.rating} ({item.reviews})
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">{item.location}</span>
        </div>
        <h3 className="min-h-10 text-base font-semibold leading-tight tracking-tight text-slate-800">{item.title}</h3>
        <div className="pt-2">
          <span className="block text-sm text-slate-500">from</span>
          {item.oldPrice && <span className="inline-block pt-1 text-sm text-slate-500 line-through">{item.oldPrice}</span>}
          <div className="mt-1 flex items-center gap-2">
            <strong className="text-lg font-extrabold text-slate-900">{item.price}</strong>
            {item.discount && (
              <Badge className="rounded-md border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                {item.discount}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="link" className="mt-2 h-auto p-0 text-sm font-bold text-brand-600 hover:text-brand-700">
          Explore <ArrowRight size={14} className="ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface ContentSectionsProps {
  content: SingleExperienceContent;
  cardImageTick: number;
  moreWaysRailRef: MutableRefObject<HTMLDivElement | null>;
  onScrollMoreWays: (direction: "left" | "right") => void;
}

export function ContentSections({ content, cardImageTick, moreWaysRailRef, onScrollMoreWays }: ContentSectionsProps) {
  return (
    <div className="relative z-0 grid min-w-0 content-start gap-4">
      <article id="included" className="min-w-0">
        <Card className={sectionCardClass}>
          <CardContent className="p-0">
            <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">What is included</h2>
            <ul className="mt-4 grid gap-3">
              {content.highlights.map((item) => (
                <li key={item} className="grid grid-cols-[18px_1fr] gap-2.5 text-sm leading-relaxed text-slate-700">
                  <CheckCircle2 size={16} className="mt-0.5 text-brand-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </article>

      <article id="about" className="min-w-0">
        <Card className={sectionCardClass}>
          <CardContent className="p-0">
            <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">About this experience</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-[15px] md:leading-[1.62]">{content.about}</p>
          </CardContent>
        </Card>
      </article>

      <article id="reviews" className="min-w-0">
        <Card className={sectionCardClass}>
          <CardContent className="p-0">
            <div className="grid min-w-0 gap-3 sm:flex sm:items-start sm:justify-between">
              <div>
                <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">Ratings and reviews</h2>
                <p className="mt-1 text-sm text-slate-500">High satisfaction from recent travelers</p>
              </div>
              <div className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                <strong className="text-[1.35rem] leading-none tracking-tight">{content.experience.rating ? content.experience.rating.toFixed(1) : "4.5"}</strong>
                <span className="text-xs tracking-wide text-amber-500">★★★★★</span>
                <span className="text-xs text-slate-500">out of 5</span>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {content.ratingBreakdown.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-full border border-slate-200 bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.12),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-3 py-1.5 text-xs text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                >
                  <span>{row.label}</span>
                  <strong className="text-sm font-black tracking-tight text-slate-900">{row.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
              {content.reviews.slice(0, 12).map((review, index) => {
                const key = getReviewCardClass(index);
                return (
                  <article
                    key={`${review.name}-${index}`}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)]",
                      reviewSpanClass[key],
                    )}
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-blue-100 to-blue-200 text-xs font-bold text-blue-800">
                        {avatarLabel(review.name)}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{review.name}</p>
                        <p className="text-xs text-slate-500">
                          {review.country} . {review.date}
                        </p>
                      </div>
                      <span className="text-xs tracking-wide text-amber-500">{"★".repeat(review.stars)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.text}</p>
                  </article>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </article>

      <article id="combinations" className="min-w-0">
        <Card className={sectionCardClass}>
          <CardContent className="p-0">
            <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">Hand-picked combinations</h2>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
              {content.combinations.map((item, index) => {
                const pattern = getCombinationCardClass(index);
                const spanClass = comboSpanClass[pattern];
                const imageHeightClass =
                  pattern === "comboSpanWide"
                    ? "h-[175px] md:h-[180px] lg:h-[220px]"
                    : pattern === "comboSpanTall"
                      ? "h-[175px] md:h-[180px] lg:h-[250px]"
                      : "h-[175px] md:h-[180px] lg:h-[170px]";

                return (
                  <RelatedCardView
                    key={item.id}
                    item={item}
                    seed={index}
                    tick={cardImageTick}
                    className={spanClass}
                    imageHeightClass={imageHeightClass}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </article>

      <article id="more-ways" className="min-w-0">
        <Card className={sectionCardClass}>
          <CardContent className="p-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">More ways to experience {content.experience.city}</h2>
              <div className="inline-flex gap-1.5">
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0 text-blue-900" aria-label="Scroll cards left" onClick={() => onScrollMoreWays("left")}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full p-0 text-blue-900" aria-label="Scroll cards right" onClick={() => onScrollMoreWays("right")}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex min-w-0 w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-1 [&::-webkit-scrollbar]:hidden" ref={moreWaysRailRef}>
              {content.moreWays.map((item, index) => (
                <Card
                  data-card-width
                  className="group flex min-h-0 w-[82vw] flex-none snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_16px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] md:min-h-[372px] md:w-[248px] lg:min-h-[390px] lg:w-[272px]"
                  key={item.id}
                >
                  <div className="relative h-[168px]">
                    <img
                      src={getCardImage(item.images, index + content.combinations.length, cardImageTick)}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
                    />
                    {item.badge && (
                      <Badge className="absolute left-2 top-2 rounded-md border-[#f3d19f] bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-900">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col gap-1 p-3">
                    <div className="min-h-5 text-[13px]">
                      <span className="inline-flex items-center gap-1 font-bold text-brand-700">
                        <Star size={12} /> {item.rating} ({item.reviews})
                      </span>
                      <span className="mx-1 text-slate-400">•</span>
                      <span className="text-slate-500">{item.location}</span>
                    </div>
                    <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-tight tracking-tight text-slate-800">{item.title}</h3>
                    <div className="mt-1 min-h-[4.3rem]">
                      <span className="block text-sm text-slate-500">from</span>
                      <span className={cn("inline-block pt-1 text-sm text-slate-500 line-through", !item.oldPrice && "invisible")}>{item.oldPrice ?? ""}</span>
                      <div className="mt-1 flex min-h-6 items-center gap-2">
                        <strong className="text-lg font-extrabold text-slate-900">{item.price}</strong>
                        <Badge
                          className={cn(
                            "rounded-md border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700",
                            !item.discount && "invisible",
                          )}
                        >
                          {item.discount ?? ""}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="link" className="mt-1 h-auto p-0 text-sm font-bold text-brand-600 hover:text-brand-700">
                      Explore <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
