"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mountain, Landmark, Utensils, Trees, Sparkles, Music, type LucideIcon } from "lucide-react";
import type { HomeCategory } from "@/types/api";

const iconMap: Record<string, LucideIcon> = {
  mountain: Mountain,
  landmark: Landmark,
  utensils: Utensils,
  trees: Trees,
  sparkles: Sparkles,
  music: Music,
};

const colorMap: Record<string, string> = {
  adventure: "from-orange-500 to-red-500",
  cultural: "from-purple-500 to-indigo-500",
  "food-drink": "from-amber-500 to-yellow-500",
  nature: "from-emerald-500 to-green-500",
  wellness: "from-pink-500 to-rose-500",
  nightlife: "from-violet-500 to-fuchsia-500",
};

const defaultColor = "from-sky-500 to-blue-500";

interface CategoriesProps {
  categories: HomeCategory[];
}

export function Categories({ categories }: CategoriesProps) {
  return (
    <section className="container py-section">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Categories</span>
        <h2 className="mt-1 text-display-sm font-bold text-slate-900">Browse by Category</h2>
        <p className="mt-1 text-sm text-slate-500">Find the perfect experience for any interest</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat, i) => {
          const Icon = iconMap[cat.icon_name] ?? Mountain;
          const gradient = colorMap[cat.slug] ?? defaultColor;
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                href={`/search?q=${encodeURIComponent(cat.name)}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:shadow-card-hover hover:-translate-y-1"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg transition-transform group-hover:scale-110`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">{cat.name}</p>
                <p className="mt-1 text-xs text-slate-500">{cat.description}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
