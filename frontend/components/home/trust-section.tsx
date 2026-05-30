"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import { Globe2, MapPin, Users, Star } from "lucide-react";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

function StatCard({ icon: Icon, value, suffix, decimal, badge, label, color }: {
  icon: typeof Globe2; value: number; suffix?: string; decimal?: boolean; badge?: string; label: string; color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !countRef.current) return;
    const val = decimal ? value / 10 : value;
    const counter = new CountUp(countRef.current, val, {
      startVal: 0, duration: 2.2, decimalPlaces: decimal ? 1 : 0,
      useEasing: true, useGrouping: true,
    });
    counter.start();
  }, [inView, value, decimal]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-2xl shadow-lg shadow-black/5 transition-all hover:bg-white/40 hover:shadow-xl"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex items-baseline gap-1">
        <span ref={countRef} className="text-3xl font-black text-slate-800">0</span>
        <span className="text-3xl font-black text-slate-800">{suffix ?? ""}</span>
        {badge && <span className="ml-1 text-lg font-semibold text-slate-400">{badge}</span>}
      </div>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </motion.div>
  );
}

export function TrustSection({ stats }: {
  stats: { totalExperiences: number; totalDestinations: number; avgRating: number; totalReviews: number };
}) {
  const items = [
    { icon: Globe2, value: stats.totalExperiences || 680, suffix: "+", label: "Experiences", color: "from-sky-500 to-cyan-500" },
    { icon: MapPin, value: stats.totalDestinations || 500, suffix: "+", label: "Destinations", color: "from-violet-500 to-purple-500" },
    { icon: Users, value: stats.totalReviews || 50000, suffix: "+", label: "Happy Travelers", color: "from-emerald-500 to-teal-500" },
    { icon: Star, value: Math.round((stats.avgRating || 4.8) * 10), decimal: true, badge: "/5", label: "Rating", color: "from-amber-500 to-orange-500" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-r from-sky-200 to-cyan-200 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-r from-indigo-200 to-purple-200 blur-3xl" />
      </div>
      <div className="container relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
