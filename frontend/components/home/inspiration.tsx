"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";

const articles = [
  {
    category: "Travel Tips",
    title: "10 Hidden Gems in Southeast Asia You Must Visit",
    excerpt: "Discover off-the-beaten-path destinations that most tourists miss.",
    date: "May 15, 2026",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80",
  },
  {
    category: "Adventure",
    title: "The Ultimate Guide to Solo Travel in 2026",
    excerpt: "Everything you need to know about traveling alone safely and confidently.",
    date: "May 12, 2026",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  },
  {
    category: "Food & Culture",
    title: "A Food Lover's Guide to Street Food in Bangkok",
    excerpt: "From pad thai to mango sticky rice — the best stalls in the city.",
    date: "May 8, 2026",
    image: "https://images.unsplash.com/photo-1562564055-71e7c1c7c2e0?w=600&q=80",
  },
];

export function Inspiration() {
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
              Journal
            </p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              Travel Inspiration
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Tips, guides, and stories from our community
            </p>
          </div>
          <Link
            href="/search"
            className="hidden items-center gap-1 text-xs font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:inline-flex"
          >
            All articles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <motion.article
              key={article.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
            >
              <Link href="/search" className="group block">
                {/* Image */}
                <div className="relative h-48 overflow-hidden rounded-2xl">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Category pill */}
                  <div className="absolute left-3 top-3">
                    <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 backdrop-blur-sm">
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {article.date}
                  </div>
                  <p className="mt-1.5 text-[13px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-sky-700">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            All articles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}