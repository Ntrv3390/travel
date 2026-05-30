"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Star, Clock, Tag } from "lucide-react";
import type { Experience } from "@/types/experience";

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", AED: "د.إ", JPY: "¥" };
  const sym = symbols[currency] ?? currency + " ";
  return `${sym}${price.toLocaleString()}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  return `${mins}m`;
}

export function TrendingExperiences({ experiences }: { experiences: Experience[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
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
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Trending Now</span>
          <h2 className="mt-1 text-display-sm font-bold text-slate-900">Popular Experiences</h2>
          <p className="mt-1 text-sm text-slate-500">Most booked experiences this week</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/products" className="hidden text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:inline-flex">
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
        className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
      >
        {experiences.map((exp, i) => {
          const price = exp.options[0]?.price ?? 0;
          const currency = exp.options[0]?.currency ?? "USD";
          const duration = formatDuration(exp.durationMinSeconds || exp.durationMaxSeconds);
          const category = exp.categories[0];
          const image = exp.images[0]?.url ?? "/images/fallback-experience.svg";

          return (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group snap-start flex-shrink-0"
            >
              <Link href={`/products/${exp.slug}-${exp.headoutId}`} className="block w-72 sm:w-80">
                <div className="relative h-72 w-full overflow-hidden rounded-2xl">
                  <img
                    src={image}
                    alt={exp.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {category && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm shadow-sm">
                        <Tag className="h-3 w-3" />
                        {category}
                      </span>
                    )}
                    {exp.rating > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold text-amber-700 backdrop-blur-sm shadow-sm">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {exp.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="absolute right-3 top-3">
                    <span className="inline-flex items-center rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm backdrop-blur-sm">
                      {formatPrice(price, currency)}
                    </span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-base font-bold text-white leading-tight line-clamp-2">{exp.title}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-white/70">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {exp.city}
                      </span>
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500">
                  {exp.reviewCount > 0 && (
                    <span>
                      <span className="font-semibold text-slate-700">{exp.reviewCount.toLocaleString()}</span> reviews
                    </span>
                  )}
                  {exp.operatorName && exp.operatorName !== "Traviia" && (
                    <span>by {exp.operatorName}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
