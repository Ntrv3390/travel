"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import type { Experience } from "@/types/experience";

export function TrendingExperiences({ experiences }: { experiences: Experience[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  if (!experiences.length) return null;

  return (
    <section className="container py-section">
      {/* Header */}
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

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        {experiences.map((exp, i) => (
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
