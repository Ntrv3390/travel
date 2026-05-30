"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import { ShieldCheck, Zap, BadgePercent, Globe2 } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Secure Booking", desc: "End-to-end encryption and fraud protection" },
  { icon: Zap, title: "Instant Confirmation", desc: "Real-time availability with immediate booking confirmation" },
  { icon: BadgePercent, title: "Best Price Match", desc: "Found it cheaper? We'll match the price" },
  { icon: Globe2, title: "Global Coverage", desc: "Curated experiences in 500+ destinations worldwide" },
];

const stats = [
  { value: 50, suffix: "K+", label: "Travelers", color: "text-sky-500" },
  { value: 99, suffix: "%", label: "Satisfaction", color: "text-emerald-500" },
  { value: 24, suffix: "/7", label: "Support", color: "text-amber-500" },
];

function StatItem({ stat }: { stat: (typeof stats)[0] }) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !countRef.current) return;
    const counter = new CountUp(countRef.current, stat.value, {
      startVal: 0,
      duration: 2.5,
      useEasing: true,
      useGrouping: false,
    });
    counter.start();
  }, [inView, stat]);

  return (
    <div ref={ref} className="text-center">
      <div className="flex items-baseline justify-center gap-0.5">
        <span ref={countRef} className={`text-3xl font-black ${stat.color}`}>0</span>
        <span className={`text-xl font-bold ${stat.color}`}>{stat.suffix}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
    </div>
  );
}

export function WhyTriipzy() {
  return (
    <section className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">Why Choose Us</span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Why{" "}
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                Triipzy
              </span>
              ?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              We connect you with authentic, handpicked experiences crafted by local experts. Every booking is backed by our satisfaction guarantee, real-time support, and the best prices — so you can explore with confidence.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6 rounded-2xl border border-slate-100 bg-white/80 p-6 backdrop-blur-sm">
              {stats.map((stat) => (
                <StatItem key={stat.label} stat={stat} />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-4"
          >
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-card-hover"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <feat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{feat.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
