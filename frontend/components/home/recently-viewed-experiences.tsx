"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import type { Experience, ExperienceOption } from "@/types/experience";

function toExperience(
  item: NonNullable<ReturnType<typeof useRecentlyViewed>["items"]>[number],
): Experience {
  const option: ExperienceOption = {
    id: `rv-${item.headoutId}`,
    headoutVariantId: item.headoutId,
    title: "Standard",
    description: "",
    price: item.price,
    currency: item.currency,
    inclusions: [],
    exclusions: [],
    highlights: [],
    fulfillmentMobile: true,
    fulfillmentPrint: false,
    fulfillmentPickup: false,
  };

  return {
    id: item.headoutId,
    headoutId: item.headoutId,
    title: item.title,
    description: "",
    city: item.city,
    citySlug: item.city.toLowerCase().replace(/\s+/g, "-"),
    slug: item.slug || item.title.toLowerCase().replace(/\s+/g, "-"),
    country: "",
    latitude: 0,
    longitude: 0,
    rating: item.rating,
    reviewCount: item.reviewCount,
    images: [{ url: item.imageUrl || "/images/fallback-experience.svg", caption: item.title }],
    operatorName: "",
    categories: item.category ? [item.category] : [],
    languages: [],
    durationMinSeconds: 0,
    durationMaxSeconds: 0,
    cancellationPolicy: null,
    options: [option],
    gttdEnabled: false,
  };
}

export function RecentlyViewedExperiences() {
  const { items } = useRecentlyViewed();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (items.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-1 inline-flex items-center gap-1.5"
            >
              <History className="h-3.5 w-3.5 text-brand-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">
                Continue Exploring
              </p>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.07 }}
              className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
            >
              Recently Viewed
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              Pick up where you left off
            </motion.p>
          </div>

          <div className="hidden gap-1.5 sm:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {items.map((item, i) => (
            <motion.div
              key={item.headoutId}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.32) }}
              className="snap-start h-[340px] w-[220px] flex-shrink-0 sm:w-[240px]"
              style={{ minHeight: 340, maxHeight: 340 }}
            >
              <div className="h-full w-full">
                <ExperienceCard experience={toExperience(item)} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
