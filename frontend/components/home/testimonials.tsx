"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
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
  const prev = () =>
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="container px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
            Testimonials
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
            What Travelers Say
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Real reviews from real adventurers</p>
        </div>

        <div
          className="relative mx-auto max-w-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Card */}
          <div className="min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
              >
                {/* Stars */}
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < testimonials[current].rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-100 text-slate-200"
                        }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  &ldquo;{testimonials[current].text}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${testimonials[current].color} text-xs font-bold text-white`}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {testimonials[current].name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {testimonials[current].location}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-300 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === current
                      ? "w-6 bg-sky-500"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-slate-300 hover:text-slate-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}