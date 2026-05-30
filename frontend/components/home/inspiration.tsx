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
    <section className="container py-section">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Journal</span>
          <h2 className="mt-1 text-display-sm font-bold text-slate-900">Travel Inspiration</h2>
          <p className="mt-1 text-sm text-slate-500">Tips, guides, and stories from our community</p>
        </div>
        <Link href="/search" className="hidden items-center gap-1 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 sm:flex">
          View all articles <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article, i) => (
          <motion.article
            key={article.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group cursor-pointer"
          >
            <Link href="/search">
              <div className="relative h-52 overflow-hidden rounded-2xl">
                <img
                  src={article.image}
                  alt={article.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm">
                  {article.category}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {article.date}
                </div>
                <p className="mt-2 text-base font-bold text-slate-900 transition-colors group-hover:text-sky-600">
                  {article.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">{article.excerpt}</p>
              </div>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
