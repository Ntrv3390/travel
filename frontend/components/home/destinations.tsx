"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { City } from "@/types/api";

export function Destinations({ cities }: { cities: City[] }) {
  if (!cities.length) return null;

  return (
    <section className="bg-slate-50 py-section">
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Explore</span>
            <h2 className="mt-1 text-display-sm font-bold text-slate-900">Popular Destinations</h2>
            <p className="mt-1 text-sm text-slate-500">Handpicked destinations with top-rated experiences</p>
          </div>
          <Link href="/cities" className="hidden text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:inline-flex">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cities.slice(0, 8).map((city, i) => (
            <motion.div
              key={city.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link href={`/cities/${city.code.toLowerCase()}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                  <img
                    src={city.image?.url || "/images/fallback-experience.svg"}
                    alt={city.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-base font-bold text-white">{city.name}</p>
                    <p className="text-sm text-white/70">{city.country?.name}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
