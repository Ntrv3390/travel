"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";
import { getTopExperiences } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Experience } from "@/types/experience";

export function TrendingExperiences({
  initialExperiences = [],
}: {
  initialExperiences?: Experience[];
}) {
  const { currency } = useCurrency();
  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [loading, setLoading] = useState(initialExperiences.length === 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const fetchId = useRef(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const isCurrencyChange = !isFirstRender.current;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (initialExperiences.length > 0) return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const id = ++fetchId.current;

    // Show skeletons only on initial load, not on currency change
    // (exchange rates give instant conversion while the silent re-fetch runs)
    if (!isCurrencyChange) setLoading(true);

    getTopExperiences(50, 1, currency, { signal: abortRef.current.signal })
      .then((result) => {
        if (id !== fetchId.current) return;
        const incoming = result.data?.experiences;
        if (incoming && incoming.length > 0) setExperiences(incoming);
      })
      .catch(() => { })
      .finally(() => {
        if (id === fetchId.current) setLoading(false);
      });
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const showSkeletons = loading;

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-500">
              Trending Now
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Popular Experiences
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Most booked this week</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="hidden items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600 sm:inline-flex"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
        </div>

        {/* Scroll row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {showSkeletons
            ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="snap-start flex-shrink-0 w-[220px] sm:w-[240px] h-[340px]"
              >
                <ExperienceCardSkeleton />
              </div>
            ))
            : experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                className="snap-start flex-shrink-0 w-[220px] sm:w-[240px] h-[340px]"
                style={{ minHeight: 340, maxHeight: 340 }}
              >
                {/*
                    h-full on the div + h-full on Link + flex h-full on Card
                    creates an unbroken height chain so all cards are 340px tall
                    and the price/badges are always pinned to the bottom.
                  */}
                <div className="h-full w-full">
                  <ExperienceCard experience={exp} />
                </div>
              </motion.div>
            ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-5 flex justify-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            View all experiences <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}