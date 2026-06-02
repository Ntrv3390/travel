"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import {
  ShieldCheck,
  Globe2,
  Sparkles,
  ArrowRight,
  Compass,
  BadgeCheck,
  Zap,
  HeartHandshake,
  MapPin,
  HeadphonesIcon,
  Lock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function useCountUp(value: number, suffix = "", decimal = false) {
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !countRef.current) return;
    const val = decimal ? value * 10 : value;
    const counter = new CountUp(countRef.current, val, {
      startVal: 0,
      duration: 2.2,
      decimalPlaces: decimal ? 1 : 0,
      useEasing: true,
      useGrouping: true,
    });
    counter.start();
  }, [inView, value, decimal]);

  return { ref, countRef, suffix, decimal };
}

function CounterCard({
  value,
  suffix,
  decimal,
  label,
  icon: Icon,
  gradient,
}: {
  value: number;
  suffix?: string;
  decimal?: boolean;
  label: string;
  icon: typeof Globe2;
  gradient: string;
}) {
  const { ref, countRef } = useCountUp(value, suffix, decimal);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex items-baseline gap-1">
        <span ref={countRef} className="text-3xl font-black text-slate-800">
          0
        </span>
        {suffix && <span className="text-3xl font-black text-slate-800">{suffix}</span>}
      </div>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </motion.div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  gradient,
  delay,
}: {
  icon: typeof Globe2;
  title: string;
  desc: string;
  gradient: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
    </motion.div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export function AboutPage() {
  const stats = [
    { value: 6200, suffix: "+", label: "Experiences Available", icon: Globe2, gradient: "from-sky-500 to-cyan-500" },
    { value: 211, suffix: "+", label: "Cities Worldwide", icon: MapPin, gradient: "from-violet-500 to-purple-500" },
    { value: 99.9, decimal: true, label: "Customer Satisfaction", icon: BadgeCheck, gradient: "from-emerald-500 to-teal-500" },
    { value: 24, suffix: "/7", label: "Support Assistance", icon: HeadphonesIcon, gradient: "from-amber-500 to-orange-500" },
  ];

  const storyFeatures = [
    {
      icon: BadgeCheck,
      title: "Verified Experiences",
      desc: "Every experience is reviewed and sourced from trusted operators.",
      gradient: "from-sky-500 to-cyan-500",
    },
    {
      icon: Lock,
      title: "Transparent Pricing",
      desc: "No hidden surprises. Know exactly what you're paying for.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Compass,
      title: "Smart Discovery",
      desc: "Find activities tailored to your destination and interests.",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: Globe2,
      title: "Global Access",
      desc: "Book experiences across major destinations worldwide.",
      gradient: "from-amber-500 to-orange-500",
    },
  ];

  const principles = [
    {
      icon: ShieldCheck,
      title: "Discover With Confidence",
      desc: "Curated experiences from trusted providers so you can book without uncertainty.",
      gradient: "from-sky-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "Technology That Simplifies",
      desc: "A seamless platform that helps travelers find the right experience faster.",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: HeartHandshake,
      title: "Customer-First Approach",
      desc: "Every decision starts with one question: does this improve the traveler experience?",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  const whyCards = [
    {
      icon: Compass,
      title: "Curated Experiences",
      desc: "Quality experiences selected for reliability and value.",
      gradient: "from-sky-500 to-cyan-500",
    },
    {
      icon: Zap,
      title: "Fast & Simple Booking",
      desc: "Book in minutes with a smooth and intuitive process.",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: Globe2,
      title: "Global Destinations",
      desc: "Explore experiences in leading cities around the world.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: HeadphonesIcon,
      title: "Reliable Support",
      desc: "A dedicated support team available whenever assistance is needed.",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon: Lock,
      title: "Secure Transactions",
      desc: "Safe and trusted booking experience from start to finish.",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: RefreshCw,
      title: "Constant Innovation",
      desc: "Continuously improving the platform based on traveler feedback.",
      gradient: "from-indigo-500 to-blue-500",
    },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mt-20 pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/5 blur-[100px]" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/5 blur-[100px]" />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-400/10 to-transparent blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              About Triipzy
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Travel Made{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Effortless.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Triipzy helps travelers discover, compare, and book unforgettable experiences across the
            world. We remove the complexity from travel planning so you can focus on making memories,
            not managing logistics.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-3 max-w-2xl text-sm leading-relaxed text-white/40"
          >
            Built for modern explorers, Triipzy connects trusted experiences, seamless booking
            technology, and local insights into one unified platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-8"
          >
            <Button
              asChild
              href="/search"
              className="group relative h-12 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-8 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30"
            >
              <span className="flex items-center gap-2">
                Explore Experiences
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-r from-sky-200 to-cyan-200 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-r from-indigo-200 to-purple-200 blur-3xl" />
        </div>
        <div className="container relative z-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <CounterCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Story ── */}
      <section className="py-section">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
              <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
                Our Story
              </span>
              <h2 className="mt-3 text-display-sm font-bold text-slate-900 sm:text-display-lg">
                Helping Travelers Spend Less Time Planning and More Time Exploring.
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
                <p>
                  Travel should be exciting from the very first moment. Yet planning a trip often
                  means jumping between multiple websites, comparing endless options, and worrying
                  about reliability.
                </p>
                <p>
                  Triipzy was created to simplify that journey.
                </p>
                <p>
                  Our platform brings together carefully selected experiences, transparent pricing,
                  and intuitive technology so travelers can discover what matters faster and book
                  with confidence.
                </p>
                <p>
                  Whether you&apos;re exploring a new city, planning a family vacation, or chasing a
                  bucket-list adventure, Triipzy helps make every step smoother.
                </p>
              </div>
            </motion.div>
            <div className="grid gap-4">
              {storyFeatures.map((feat, i) => (
                <FeatureCard key={feat.title} {...feat} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Principles ── */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              What Drives Us
            </span>
            <h2 className="mt-3 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Built Around Travelers.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Every feature, recommendation, and booking flow is designed to make travel simpler,
              faster, and more enjoyable.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {principles.map((principle, i) => (
              <motion.div
                key={principle.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${principle.gradient} shadow-sm transition-transform group-hover:scale-105`}
                >
                  <principle.icon className="h-7 w-7 text-white" />
                </div>
                <p className="text-base font-semibold text-slate-900">{principle.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{principle.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Triipzy ── */}
      <section className="py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              Why Choose Us
            </span>
            <h2 className="mt-3 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Why Travelers Choose Triipzy
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm transition-transform group-hover:scale-110`}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/5 blur-[100px]" />
          <div className="absolute -bottom-32 -right-32 h-[450px] w-[450px] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="container relative z-10">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Our Vision
            </span>
            <h2 className="mt-6 text-display-sm font-bold text-white sm:text-display-lg">
              A World Where Travel Feels Seamless.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              We believe discovering a destination should be as enjoyable as experiencing it. Our
              goal is to build the most traveler-friendly platform in the world—one that removes
              friction, inspires exploration, and makes incredible experiences accessible to
              everyone.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-16 text-center shadow-2xl sm:px-12"
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/5 blur-[80px]" />
              <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/5 blur-[80px]" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
            </div>
            <div className="relative z-10">
              <h2 className="text-display-sm font-bold text-white sm:text-display-lg">
                Ready for Your Next Adventure?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
                Thousands of travelers use Triipzy to discover unforgettable experiences across the
                globe. Start planning your next journey today.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  href="/products"
                  className="group relative h-12 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-8 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30"
                >
                  <span className="flex items-center gap-2">
                    Start Exploring
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
