"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import type { City } from "@/types/api";

const CITY_GRADIENTS: Record<string, string> = {
  Paris: "linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",
  Tokyo: "linear-gradient(135deg,#f43f5e 0%,#be185d 100%)",
  Bali: "linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)",
  "New York": "linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)",
  Dubai: "linear-gradient(135deg,#d97706 0%,#92400e 100%)",
  London: "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
  Rome: "linear-gradient(135deg,#dc2626 0%,#991b1b 100%)",
  Barcelona: "linear-gradient(135deg,#d97706 0%,#b45309 100%)",
};

const DEFAULT_GRADIENT = "linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)";

export function Destinations({ cities }: { cities: City[] }) {
  if (!cities.length) return null;

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[11px] font-bold uppercase tracking-widest text-brand-500"
            >
              Explore the world
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
            >
              Popular Destinations
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.14 }}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              Handpicked with top-rated experiences
            </motion.p>
          </div>
          <Link
            href="/cities"
            className="hidden items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600 sm:inline-flex"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cities.slice(0, 8).map((city, i) => (
            <motion.div
              key={city.code}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.055 }}
            >
              <Link href={`/cities/${city.code.toLowerCase()}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                  {city.image?.url ? (
                    <img
                      src={city.image.url}
                      alt={city.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-107"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: CITY_GRADIENTS[city.name] ?? DEFAULT_GRADIENT }}
                    />
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-brand-600/0 transition-colors duration-300 group-hover:bg-brand-600/10" />
                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-sm font-bold leading-tight text-white">{city.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/65">
                      <MapPin className="h-2.5 w-2.5" />
                      {city.country?.name}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/cities"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            All destinations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
