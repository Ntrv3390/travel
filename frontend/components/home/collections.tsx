"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { HomeCollection } from "@/types/api";

const gradientMap: Record<string, string> = {
  "weekend-getaways": "from-sky-600/90 to-blue-900/90",
  "bucket-list-adventures": "from-emerald-600/90 to-teal-900/90",
  "family-fun": "from-amber-600/90 to-orange-900/90",
};

const defaultGradient = "from-slate-600/90 to-slate-900/90";

interface CollectionsProps {
  collections: HomeCollection[];
}

export function Collections({ collections }: CollectionsProps) {
  if (collections.length === 0) return null;

  return (
    <section className="container py-section">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Collections</span>
        <h2 className="mt-1 text-display-sm font-bold text-slate-900">Featured Collections</h2>
        <p className="mt-1 text-sm text-slate-500">Curated selections for every kind of traveler</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((col, i) => {
          const gradient = gradientMap[col.slug] ?? defaultGradient;
          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link href="/search" className="group relative block h-80 overflow-hidden rounded-3xl">
                <img
                  src={col.image_url}
                  alt={col.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${gradient}`} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/70">{col.experience_count} experiences</p>
                  <p className="mt-1 text-2xl font-bold text-white">{col.title}</p>
                  <p className="mt-1 text-sm text-white/80">{col.description}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    Explore collection <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
