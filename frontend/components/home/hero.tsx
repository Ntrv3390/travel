"use client";

import { motion } from "framer-motion";
import { Star, Award } from "lucide-react";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K+`;
  return String(n);
}

interface HeroStats {
  totalExperiences: number;
  totalDestinations: number;
  avgRating: number;
}

export function Hero({ stats }: { stats: HeroStats }) {
  const statItems = [
    { icon: Star, value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "4.8", label: "Avg rating" },
    { icon: Award, value: formatCount(stats.totalDestinations), label: "Destinations" },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden -mt-20 pt-20">
      {/* Background video */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src="https://www.youtube.com/embed/FJKPmnyPqsg?autoplay=1&mute=1&loop=1&playlist=FJKPmnyPqsg&controls=0&rel=0&iv_load_policy=3&modestbranding=1&cc_load_policy=0&disablekb=1&fs=0&playsinline=1"
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "177.77777778vh",
            height: "56.25vw",
            minWidth: "100%",
            minHeight: "100%",
            pointerEvents: "none",
          }}
          allow="autoplay; encrypted-media"
          title="Triipzy travel experience video"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.08),transparent)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Main content */}
        <div className="flex-1 container flex flex-col items-center justify-center px-4 pt-24 pb-12 text-center sm:pt-32">

          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/60 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Discover extraordinary experiences worldwide
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="max-w-3xl text-[28px] font-black leading-[1.15] tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            Discover the World,{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Your Way
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="mt-4 max-w-lg text-sm leading-relaxed text-white/45 sm:text-[15px]"
          >
            Curated tours and activities crafted by locals — book unique adventures across{" "}
            <span className="font-medium text-white/70">{formatCount(stats.totalDestinations)} destinations</span>.
          </motion.p>

          {/* Inline stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.38 }}
            className="mt-6 flex items-center gap-5"
          >
            {statItems.map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-white/40">
                <stat.icon className="h-3.5 w-3.5 text-sky-400/70" />
                <span className="text-xs">
                  <span className="font-semibold text-white/80">{stat.value}</span>{" "}
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="container px-4 pb-8"
        >
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { emoji: "🏆", title: "Top Rated", desc: "Curated by experts" },
              { emoji: "💳", title: "Best Price", desc: "Guaranteed match" },
              { emoji: "🎧", title: "24/7 Support", desc: "Always here to help" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.6 + i * 0.07 }}
                className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-3 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3.5"
              >
                <span className="text-base sm:text-lg">{item.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white/90 sm:text-xs">{item.title}</p>
                  <p className="hidden text-[10px] text-white/35 sm:block">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}