"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    location: "New York, USA",
    text: "Absolutely incredible! The sunset safari exceeded every expectation. Our guide was knowledgeable, the views were breathtaking, and every detail was perfectly organized.",
    rating: 5,
    avatar: "SJ",
    color: "from-sky-400 to-cyan-500",
  },
  {
    name: "Marcus Chen",
    location: "Melbourne, Australia",
    text: "The street food tour was a highlight of our Bangkok trip. We visited hidden gems we never would have found on our own. Already planning our next Triipzy adventure!",
    rating: 5,
    avatar: "MC",
    color: "from-emerald-400 to-teal-500",
  },
  {
    name: "Priya Patel",
    location: "Mumbai, India",
    text: "Booking through Triipzy was seamless. The Northern Lights tour was magical — the photographers knew exactly where to take us. Worth every penny!",
    rating: 5,
    avatar: "PP",
    color: "from-purple-400 to-indigo-500",
  },
  {
    name: "James Wilson",
    location: "London, UK",
    text: "I've used many travel platforms, but Triipzy stands out. The curated experiences are unique, customer support is responsive, and the pricing is transparent.",
    rating: 4,
    avatar: "JW",
    color: "from-amber-400 to-orange-500",
  },
  {
    name: "Emma Laurent",
    location: "Paris, France",
    text: "The hot air balloon ride in Cappadocia was the most magical morning of my life. Everything from pickup to drop-off was flawlessly coordinated. Thank you Triipzy!",
    rating: 5,
    avatar: "EL",
    color: "from-rose-400 to-pink-500",
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="bg-slate-900 py-section">
      <div className="container">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">Testimonials</span>
          <h2 className="mt-2 text-display-sm font-bold text-white">What Travelers Say</h2>
          <p className="mt-1 text-sm text-white/50">Real reviews from real adventurers</p>
        </div>

        <div className="relative mx-auto max-w-3xl" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
          <div className="min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:p-10"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < testimonials[current].rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-white/10 text-white/20"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-base leading-relaxed text-white/80 sm:text-lg">&ldquo;{testimonials[current].text}&rdquo;</p>
                <div className="mt-6 flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${testimonials[current].color} text-sm font-bold text-white shadow-lg`}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{testimonials[current].name}</p>
                    <p className="text-xs text-white/50">{testimonials[current].location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:border-white/40 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-8 bg-sky-400" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:border-white/40 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
