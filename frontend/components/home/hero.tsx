"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, MapPin, Star, Shield, Zap, ChevronDown } from "lucide-react";

const POPULAR = ["Paris", "Tokyo", "Bali", "New York", "Rome", "Santorini", "Dubai"];

const FLOAT_PILLS = [
  { label: "🗼 Paris", x: "8%", y: "22%", delay: 1.0 },
  { label: "🗻 Tokyo", x: "82%", y: "18%", delay: 1.2 },
  { label: "🌴 Bali", x: "6%", y: "68%", delay: 1.4 },
  { label: "🗽 New York", x: "76%", y: "64%", delay: 1.6 },
  { label: "🏛️ Rome", x: "48%", y: "80%", delay: 1.8 },
];

export function Hero() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <section className="relative -mt-[68px] flex min-h-[92vh] flex-col items-center justify-center overflow-hidden bg-[#06101f] pt-[68px]">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-brand-600/25 blur-[140px]" />
        <div className="absolute right-0 top-1/4 h-[450px] w-[450px] rounded-full bg-violet-700/15 blur-[110px]" />
        <div className="absolute bottom-10 left-0 h-[350px] w-[350px] rounded-full bg-brand-500/12 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[250px] w-[250px] rounded-full bg-cyan-500/10 blur-[80px]" />
      </div>

      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Floating destination pills — desktop only */}
      {FLOAT_PILLS.map((pill) => (
        <motion.div
          key={pill.label}
          className="pointer-events-none absolute hidden lg:block"
          style={{ left: pill.x, top: pill.y }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: [0, 0.6, 0.6],
            scale: [0.85, 1, 1],
            y: [0, -8, 0],
          }}
          transition={{
            opacity: { delay: pill.delay, duration: 0.8 },
            scale: { delay: pill.delay, duration: 0.5 },
            y: {
              delay: pill.delay + 0.8,
              duration: 3.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            },
          }}
        >
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/60 backdrop-blur-md">
            {pill.label}
          </div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative z-10 container px-4 py-24 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 backdrop-blur-sm"
        >
          <Star className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
            Trusted by 51,000+ travelers worldwide
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12 }}
          className="mx-auto max-w-4xl text-[2.6rem] font-black leading-[1.1] tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          Your Next{" "}
          <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
            Adventure
          </span>
          <br />
          Starts Here
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mx-auto mt-5 max-w-lg text-base text-white/55 sm:text-lg"
        >
          Handpicked tours, activities and experiences across{" "}
          <span className="font-semibold text-white/80">500+ destinations</span> worldwide.
        </motion.p>

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          onSubmit={handleSearch}
          className="mx-auto mt-8 flex max-w-2xl items-center overflow-hidden rounded-full border border-white/10 bg-white/6 p-1.5 backdrop-blur-xl"
        >
          <div className="flex flex-1 items-center gap-2.5 px-4">
            <MapPin className="h-4 w-4 shrink-0 text-brand-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where do you want to go?"
              className="w-full bg-transparent text-sm text-white placeholder-white/35 outline-none"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-600 active:scale-95"
          >
            <span className="hidden sm:inline">Search</span>
            <Search className="h-4 w-4 sm:hidden" />
          </button>
        </motion.form>

        {/* Popular tags */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.56 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs text-white/35">Popular:</span>
          {POPULAR.map((dest, i) => (
            <motion.button
              key={dest}
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(dest)}`)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.045 }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/55 transition-all hover:border-brand-500/50 hover:bg-brand-500/10 hover:text-brand-300"
            >
              {dest}
            </motion.button>
          ))}
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.72 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-white/40 sm:gap-8"
        >
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Free cancellation</span>
          </div>
          <div className="hidden h-3 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Instant confirmation</span>
          </div>
          <div className="hidden h-3 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />
            <span>Best price guarantee</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-white/25"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
