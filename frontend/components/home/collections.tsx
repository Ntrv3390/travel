"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const collections = [
  {
    title: "Weekend Getaways",
    desc: "Short escapes that feel like a real vacation",
    experiences: "48 experiences",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    gradient: "from-sky-600/90 to-blue-900/90",
  },
  {
    title: "Bucket List Adventures",
    desc: "Once-in-a-lifetime experiences you'll never forget",
    experiences: "36 experiences",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
    gradient: "from-emerald-600/90 to-teal-900/90",
  },
  {
    title: "Family Fun",
    desc: "Kid-approved activities for the whole family",
    experiences: "52 experiences",
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80",
    gradient: "from-amber-600/90 to-orange-900/90",
  },
];

export function Collections() {
  return (
    <section className="container py-section">
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Collections</span>
        <h2 className="mt-1 text-display-sm font-bold text-slate-900">Featured Collections</h2>
        <p className="mt-1 text-sm text-slate-500">Curated selections for every kind of traveler</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((col, i) => (
          <motion.div
            key={col.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link href="/search" className="group relative block h-80 overflow-hidden rounded-3xl">
              <img
                src={col.image}
                alt={col.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${col.gradient}`} />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">{col.experiences}</p>
                <p className="mt-1 text-2xl font-bold text-white">{col.title}</p>
                <p className="mt-1 text-sm text-white/80">{col.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Explore collection <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
