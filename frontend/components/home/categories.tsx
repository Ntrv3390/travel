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

const colorMap: Record<string, { border: string; bg: string; iconBg: string; iconColor: string }> = {
  adventure: {
    border: "border-orange-500/20",
    bg: "bg-orange-500/5 hover:bg-orange-500/10",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  cultural: {
    border: "border-violet-500/20",
    bg: "bg-violet-500/5 hover:bg-violet-500/10",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  "food-drink": {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  nature: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  wellness: {
    border: "border-pink-500/20",
    bg: "bg-pink-500/5 hover:bg-pink-500/10",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  nightlife: {
    border: "border-fuchsia-500/20",
    bg: "bg-fuchsia-500/5 hover:bg-fuchsia-500/10",
    iconBg: "bg-fuchsia-50",
    iconColor: "text-fuchsia-600",
  },
};

const defaultColors = {
  border: "border-brand-500/20",
  bg: "bg-brand-500/5 hover:bg-brand-500/10",
  iconBg: "bg-brand-50",
  iconColor: "text-brand-600",
};

interface CategoriesProps {
  categories: HomeCategory[];
}

export function Categories({ categories }: CategoriesProps) {
  return (
    <section className="bg-muted/20 py-12 sm:py-16">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold uppercase tracking-widest text-brand-500"
          >
            Browse by type
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            Explore Categories
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            Find the perfect experience for any interest
          </motion.p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = iconMap[cat.icon_name] ?? Mountain;
            const colors = colorMap[cat.slug] ?? defaultColors;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.055 }}
              >
                <Link
                  href={`/search?q=${encodeURIComponent(cat.name)}`}
                  className={`group flex flex-col items-center rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${colors.border} ${colors.bg}`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:h-12 sm:w-12 ${colors.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${colors.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-foreground sm:text-xs">
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
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
