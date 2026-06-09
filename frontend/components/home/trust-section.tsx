"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import { Globe2, MapPin, Users, Star } from "lucide-react";

function StatCard({
  icon: Icon,
  value,
  suffix,
  decimal,
  badge,
  label,
  color,
  bgColor,
}: {
  icon: typeof Globe2;
  value: number;
  suffix?: string;
  decimal?: boolean;
  badge?: string;
  label: string;
  color: string;
  bgColor: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !countRef.current) return;
    const val = decimal ? value / 10 : value;
    const counter = new CountUp(countRef.current, val, {
      startVal: 0,
      duration: 2,
      decimalPlaces: decimal ? 1 : 0,
      useEasing: true,
      useGrouping: true,
    });
    counter.start();
  }, [inView, value, decimal]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5"
    >
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${bgColor}`}
      >
        <Icon className={`h-4.5 w-4.5 ${color}`} strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-0.5">
        <span ref={countRef} className="text-2xl font-black text-slate-900 tabular-nums">
          0
        </span>
        <span className="text-xl font-black text-slate-900">{suffix ?? ""}</span>
        {badge && (
          <span className="ml-0.5 text-sm font-semibold text-slate-400">{badge}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </motion.div>
  );
}

export function TrustSection({
  stats,
}: {
  stats: {
    totalExperiences: number;
    totalDestinations: number;
    avgRating: number;
    totalReviews: number;
  };
}) {
  const items = [
    {
      icon: Globe2,
      value: stats.totalExperiences || 6209,
      suffix: "+",
      label: "Experiences",
      color: "text-sky-600",
      bgColor: "bg-sky-50",
    },
    {
      icon: MapPin,
      value: stats.totalDestinations || 211,
      suffix: "+",
      label: "Destinations",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
    {
      icon: Users,
      value: stats.totalReviews || 51000,
      suffix: "+",
      label: "Happy travelers",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: Star,
      value: Math.round((stats.avgRating || 4.8) * 10),
      decimal: true,
      badge: "/5",
      label: "Average rating",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <section className="bg-slate-50 py-10 sm:py-14">
      <div className="container px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {items.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}