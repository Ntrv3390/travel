"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mountain, Landmark, Utensils, Trees, Sparkles, Music } from "lucide-react";

const categories = [
  { name: "Adventure", icon: Mountain, color: "from-orange-500 to-red-500", desc: "Thrilling outdoor activities" },
  { name: "Cultural", icon: Landmark, color: "from-purple-500 to-indigo-500", desc: "Museums, history & heritage" },
  { name: "Food & Drink", icon: Utensils, color: "from-amber-500 to-yellow-500", desc: "Tastings & culinary tours" },
  { name: "Nature", icon: Trees, color: "from-emerald-500 to-green-500", desc: "Parks, trails & wildlife" },
  { name: "Wellness", icon: Sparkles, color: "from-pink-500 to-rose-500", desc: "Spa, yoga & meditation" },
  { name: "Nightlife", icon: Music, color: "from-violet-500 to-fuchsia-500", desc: "Clubs, bars & shows" },
];

export function Categories() {
  return (
    <section className="container py-section">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Categories</span>
        <h2 className="mt-1 text-display-sm font-bold text-slate-900">Browse by Category</h2>
        <p className="mt-1 text-sm text-slate-500">Find the perfect experience for any interest</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <Link
              href={`/search?q=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:shadow-card-hover hover:-translate-y-1"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.color} shadow-lg transition-transform group-hover:scale-110`}>
                <cat.icon className="h-7 w-7 text-white" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{cat.name}</p>
              <p className="mt-1 text-xs text-slate-500">{cat.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
