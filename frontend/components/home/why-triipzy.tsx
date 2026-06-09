"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import { ShieldCheck, Zap, BadgePercent, Globe2 } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure booking",
    desc: "End-to-end encryption and fraud protection on every transaction.",
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    icon: Zap,
    title: "Instant confirmation",
    desc: "Real-time availability with immediate booking confirmation.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    icon: BadgePercent,
    title: "Best price match",
    desc: "Found it cheaper? We'll match the price, no questions asked.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Globe2,
    title: "Global coverage",
    desc: "Handpicked experiences in 500+ destinations worldwide.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

const stats = [
  { value: 51, suffix: "K+", label: "Travelers", color: "text-sky-600" },
  { value: 99.9, suffix: "%", label: "Satisfaction", color: "text-emerald-600" },
  { value: 24, suffix: "/7", label: "Support", color: "text-amber-600" },
];

function StatItem({ stat }: { stat: (typeof stats)[0] }) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !countRef.current) return;
    const counter = new CountUp(countRef.current, stat.value, {
      startVal: 0,
      duration: 2,
      useEasing: true,
      useGrouping: false,
      decimalPlaces: stat.value % 1 !== 0 ? 1 : 0,
    });
    counter.start();
  }, [inView, stat]);

  return (
    <div ref={ref} className="text-center">
      <div className="flex items-baseline justify-center gap-0.5">
        <span ref={countRef} className={`text-2xl font-black tabular-nums ${stat.color}`}>
          0
        </span>
        <span className={`text-lg font-black ${stat.color}`}>{stat.suffix}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">{stat.label}</p>
    </div>
  );
}

export function WhyTriipzy() {
  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="container px-4">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">

          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">
              Why choose us
            </p>
            <h2 className="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl lg:text-2xl">
              Why{" "}
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                Triipzy
              </span>
              ?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
              We connect you with authentic, handpicked experiences crafted by local experts.
              Every booking is backed by our satisfaction guarantee and the best prices.
            </p>

            {/* Stat row */}
            <div className="mt-7 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-4">
              {stats.map((stat) => (
                <StatItem key={stat.label} stat={stat} />
              ))}
            </div>
          </motion.div>

          {/* Right column — feature list */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-3"
          >
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="flex gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feat.bg}`}
                >
                  <feat.icon className={`h-5 w-5 ${feat.color}`} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{feat.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}