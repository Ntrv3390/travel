"use client";

import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Star, Award } from "lucide-react";

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
    { icon: Star, value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "4.8", label: "Average Rating" },
    { icon: Award, value: formatCount(stats.totalDestinations), label: "Destinations" },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden -mt-20 pt-20">
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
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950/85 via-slate-900/80 to-indigo-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex-1 container flex flex-col items-center justify-center pt-28 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Discover extraordinary experiences worldwide
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Discover the World,{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Your Way
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 max-w-2xl text-lg text-white/60 sm:text-xl"
          >
            Curated tours, activities, and experiences crafted by locals. Book unique adventures in{" "}
            <span className="font-semibold text-white">{formatCount(stats.totalDestinations)} destinations</span> worldwide.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            {statItems.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-white/60">
                <stat.icon className="h-4 w-4 text-sky-400" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{stat.value}</span> {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative pb-8"
        >
          <div className="container">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { title: "Top Rated", desc: "Curated by travel experts", icon: Star, color: "from-amber-500/20 to-orange-500/10" },
                { title: "Best Price Guarantee", desc: "Lowest price, every time", icon: Award, color: "from-emerald-500/20 to-teal-500/10" },
                { title: "24/7 Support", desc: "We're here to help", icon: TrendingUp, color: "from-sky-500/20 to-blue-500/10" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
                  className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br ${item.color} p-4 backdrop-blur-md`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-white/60">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
