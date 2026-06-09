"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { City } from "@/types/api";

export function Destinations({ cities }: { cities: City[] }) {
  if (!cities.length) return null;

  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
              Explore
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Popular Destinations
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Handpicked with top-rated experiences
            </p>
          </div>
          <Link
            href="/cities"
            className="hidden items-center gap-1 text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:inline-flex"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cities.slice(0, 8).map((city, i) => (
            <motion.div
              key={city.code}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Link href={`/cities/${city.code.toLowerCase()}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                  <img
                    src={city.image?.url || "/images/fallback-experience.svg"}
                    alt={city.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle gradient only at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[13px] font-bold leading-tight text-white">
                      {city.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/60">
                      {city.country?.name}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-5 flex justify-center sm:hidden">
          <Link
            href="/cities"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            All destinations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}