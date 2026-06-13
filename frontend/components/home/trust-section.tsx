"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import { Globe2, MapPin, Users, Star } from "lucide-react";

function StatItem({
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
      duration: 2.2,
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
      className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 text-center shadow-sm"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
        <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.75} />
      </div>
      <div>
        <div className="flex items-baseline justify-center gap-0.5">
          <span ref={countRef} className="text-2xl font-black tabular-nums text-foreground sm:text-3xl">
            0
          </span>
          <span className="text-xl font-black text-foreground/80">{suffix ?? ""}</span>
          {badge && <span className="ml-0.5 text-sm font-semibold text-muted-foreground">{badge}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
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
      color: "text-brand-500",
      bgColor: "bg-brand-50",
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
    <section className="border-y border-border/40 bg-muted/20 py-10 sm:py-14">
      <div className="container px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.07 }}
            >
              <StatItem {...item} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
