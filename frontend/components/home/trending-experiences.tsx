"use client";

import { useEffect, useRef, useState } from "react";
import { useRef as useRefAlias } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ExperienceCardSkeleton } from "@/components/experience/ExperienceCardSkeleton";
import { getTopExperiences } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Experience } from "@/types/experience";

export function TrendingExperiences({ initialExperiences = [] }: { initialExperiences?: Experience[] }) {
  const { currency, isChanging } = useCurrency();
  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [loading, setLoading] = useState(initialExperiences.length === 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    getTopExperiences(50, 1, currency, { signal: abortRef.current.signal })
      .then((result) => {
        if (!mountedRef.current) return;
        setExperiences(result.data?.experiences ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [currency]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const showSkeletons = loading || isChanging;

  return (
    <section className="container py-section">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Trending Now</span>
          <h2 className="mt-1 text-display-sm font-bold text-slate-900">Popular Experiences</h2>
          <p className="mt-1 text-sm text-slate-500">Most booked experiences this week</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="hidden text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:inline-flex"
          >
            View all
          </Link>
          <div className="hidden gap-2 sm:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {showSkeletons
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-64 sm:w-72">
                <ExperienceCardSkeleton />
              </div>
            ))
          : experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="snap-start flex-shrink-0 w-64 sm:w-72"
              >
                <ExperienceCard experience={exp} />
              </motion.div>
            ))}
      </div>
    </section>
  );
}
