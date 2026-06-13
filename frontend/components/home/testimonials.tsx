"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { Testimonial } from "@/types/api";

interface TestimonialsProps {
  testimonials: Testimonial[];
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || testimonials.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, testimonials.length]);

  if (testimonials.length === 0) return null;

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const len = testimonials.length;
  const visibleIdxs =
    len <= 1
      ? [0]
      : len === 2
        ? [current, (current + 1) % len]
        : [current, (current + 1) % len, (current + 2) % len];

  return (
    <section className="bg-muted/20 py-12 sm:py-16">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold uppercase tracking-widest text-brand-500"
          >
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            What Travelers Say
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="mt-0.5 text-xs text-muted-foreground"
          >
            Real reviews from real adventurers
          </motion.p>
        </div>

        {/* Desktop 3-column grid */}
        <div
          className="hidden gap-4 lg:grid lg:grid-cols-3"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {visibleIdxs.map((idx, pos) => {
            const t = testimonials[idx];
            const isMain = pos === 0;
            return (
              <motion.div
                key={`${idx}-${pos}`}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: pos * 0.08 }}
                className={`flex flex-col rounded-2xl border p-6 transition-all ${
                  isMain
                    ? "border-brand-500/30 bg-brand-500/5 shadow-md shadow-brand-500/10"
                    : "border-border/60 bg-card hover:shadow-sm"
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < t.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <Quote className="h-5 w-5 text-brand-500/30" />
                </div>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile single-card carousel */}
        <div
          className="relative mx-auto max-w-xl lg:hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl border border-border/60 bg-card p-6"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < testimonials[current].rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <Quote className="h-5 w-5 text-brand-500/30" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{testimonials[current].text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${testimonials[current].color} text-xs font-bold text-white`}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{testimonials[current].name}</p>
                    <p className="text-[10px] text-muted-foreground">{testimonials[current].location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination controls — shared for both breakpoints */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-brand-500" : "w-1.5 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
