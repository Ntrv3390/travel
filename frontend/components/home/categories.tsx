"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mountain,
  Landmark,
  Utensils,
  Trees,
  Sparkles,
  Music,
  type LucideIcon,
} from "lucide-react";
import type { HomeCategory } from "@/types/api";

const iconMap: Record<string, LucideIcon> = {
  mountain: Mountain,
  landmark: Landmark,
  utensils: Utensils,
  trees: Trees,
  sparkles: Sparkles,
  music: Music,
};

const colorMap: Record<string, { gradient: string; bg: string; iconColor: string }> = {
  adventure: { gradient: "from-orange-500 to-red-500", bg: "bg-orange-50", iconColor: "text-orange-600" },
  cultural: { gradient: "from-violet-500 to-indigo-500", bg: "bg-violet-50", iconColor: "text-violet-600" },
  "food-drink": { gradient: "from-amber-500 to-yellow-500", bg: "bg-amber-50", iconColor: "text-amber-600" },
  nature: { gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-50", iconColor: "text-emerald-600" },
  wellness: { gradient: "from-pink-500 to-rose-500", bg: "bg-pink-50", iconColor: "text-pink-600" },
  nightlife: { gradient: "from-violet-500 to-fuchsia-500", bg: "bg-fuchsia-50", iconColor: "text-fuchsia-600" },
};

const defaultColor = {
  gradient: "from-sky-500 to-blue-500",
  bg: "bg-sky-50",
  iconColor: "text-sky-600",
};

interface CategoriesProps {
  categories: HomeCategory[];
}

export function Categories({ categories }: CategoriesProps) {
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
            Categories
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            Browse by Category
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Find the perfect experience for any interest
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon_name] ?? Mountain;
            const colors = colorMap[cat.slug] ?? defaultColor;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  href={`/search?q=${encodeURIComponent(cat.name)}`}
                  className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                >
                  {/* Icon container */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.bg} transition-transform duration-200 group-hover:scale-105 sm:h-12 sm:w-12`}
                  >
                    <Icon className={`h-5 w-5 ${colors.iconColor} sm:h-5.5 sm:w-5.5`} strokeWidth={1.75} />
                  </div>

                  <p className="mt-3 text-[11px] font-bold text-slate-800 sm:text-xs">
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                      {cat.description}
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}