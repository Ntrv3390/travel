"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CountUp } from "countup.js";
import {
  Globe2,
  MapPin,
  BadgeCheck,
  HeadphonesIcon,
  ShieldCheck,
  Zap,
  HeartHandshake,
  Lock,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Compass,
  Plane,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── CountUp ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, decimal = false) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true });
  useEffect(() => {
    if (!inView || !spanRef.current) return;
    const cu = new CountUp(spanRef.current, target, {
      startVal: 0,
      duration: 2.5,
      decimalPlaces: decimal ? 1 : 0,
      useEasing: true,
      useGrouping: true,
    });
    cu.start();
  }, [inView, target, decimal]);
  return { spanRef, wrapRef };
}

// ── Destination ticker ────────────────────────────────────────────────────────

const PINS = [
  { name: "Paris", emoji: "🗼" },
  { name: "Tokyo", emoji: "⛩️" },
  { name: "New York", emoji: "🗽" },
  { name: "Bali", emoji: "🌴" },
  { name: "Rome", emoji: "🏛️" },
  { name: "Dubai", emoji: "🏙️" },
  { name: "Sydney", emoji: "🦘" },
  { name: "Barcelona", emoji: "🏖️" },
  { name: "Kyoto", emoji: "🌸" },
  { name: "Santorini", emoji: "🌅" },
  { name: "Safari", emoji: "🦁" },
  { name: "Iceland", emoji: "🌋" },
];

function DestinationTicker() {
  const repeated = [...PINS, ...PINS, ...PINS];
  return (
    <>
      <style>{`
        @keyframes about-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
      <div
        className="relative mt-12 overflow-hidden py-1"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          maskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <div
          className="flex w-max gap-3 will-change-transform"
          style={{ animation: "about-ticker 36s linear infinite" }}
        >
          {repeated.map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/65 backdrop-blur-sm"
            >
              <span className="text-base leading-none">{d.emoji}</span>
              {d.name}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Destination card (hero) ───────────────────────────────────────────────────

const DEST_CARDS = [
  { city: "Paris",    tag: "City of Light",   bg: "linear-gradient(135deg,#7c3aed,#5b21b6)", rotate: 3,  delay: 0.40 },
  { city: "Tokyo",    tag: "Urban Explorer",  bg: "linear-gradient(135deg,#f43f5e,#be185d)", rotate: -2, delay: 0.52 },
  { city: "Bali",     tag: "Island Paradise", bg: "linear-gradient(135deg,#f59e0b,#ea580c)", rotate: -1, delay: 0.64 },
  { city: "New York", tag: "Never Sleeps",    bg: "linear-gradient(135deg,#0ea5e9,#0369a1)", rotate: 2,  delay: 0.76 },
];

function DestCard({ city, tag, bg, rotate, delay }: (typeof DEST_CARDS)[0]) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, type: "spring", damping: 22 }}
      style={{ background: bg, transform: `rotate(${rotate}deg)` }}
      className="flex h-28 w-48 flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-2xl shadow-black/40"
    >
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3 w-3 shrink-0 text-white/70" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
          {tag}
        </span>
      </div>
      <p className="text-2xl font-black text-white drop-shadow-sm">{city}</p>
    </motion.div>
  );
}

// ── Stat item component (hook must be in component, not inside .map) ──────────

function StatItem({
  value,
  suffix,
  decimal,
  label,
  delay,
}: {
  value: number;
  suffix?: string;
  decimal?: boolean;
  label: string;
  delay: number;
}) {
  const { spanRef, wrapRef } = useCountUp(value, decimal);
  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-1 text-center"
    >
      <div className="flex items-baseline gap-0.5">
        <span ref={spanRef} className="text-4xl font-black tabular-nums text-white sm:text-5xl">
          0
        </span>
        {suffix && (
          <span className="text-3xl font-black text-brand-200 sm:text-4xl">{suffix}</span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">{label}</p>
    </motion.div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function AboutPage() {
  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative -mt-20 overflow-hidden bg-gradient-to-b from-[#01324f] via-[#012d47] to-slate-950 pt-20">
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* glow orbs */}
        <div className="pointer-events-none absolute left-1/4 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-brand-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />

        <div className="container relative z-10 grid items-center gap-12 pb-0 pt-20 lg:grid-cols-2 lg:pb-0 lg:pt-24">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-4 py-1.5 text-sm font-semibold text-brand-300 backdrop-blur-sm">
                <Plane className="h-3.5 w-3.5" />
                About Triipzy
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.14 }}
              className="mt-6 text-5xl font-black leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              The World{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  Awaits.
                </span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-brand-400 to-cyan-400"
                />
              </span>
              <br />
              We Make It{" "}
              <span className="text-white/40">Simple.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg lg:max-w-none"
            >
              Triipzy brings together the world&apos;s best experiences into one effortless
              platform — so you can discover, compare, and book with confidence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.44 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <Link
                href="/search"
                className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40"
              >
                Explore Experiences
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white"
              >
                Get in Touch
              </Link>
            </motion.div>
          </div>

          {/* Right: 2×2 destination card grid with stagger offsets */}
          <div className="hidden lg:flex lg:items-center lg:justify-center">
            <div className="flex gap-4">
              {/* Column A — nudged down */}
              <div className="flex flex-col gap-4 pt-10">
                {[DEST_CARDS[0], DEST_CARDS[2]].map((d) => (
                  <DestCard key={d.city} {...d} />
                ))}
              </div>
              {/* Column B — nudged up */}
              <div className="flex flex-col gap-4 pb-10">
                {[DEST_CARDS[1], DEST_CARDS[3]].map((d) => (
                  <DestCard key={d.city} {...d} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            <DestinationTicker />
          </motion.div>
        </div>

        {/* wave */}
        <div className="relative z-10 -mb-px mt-10">
          <svg
            viewBox="0 0 1440 56"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 56L60 48.7C120 41 240 27 360 24.5C480 22 600 30 720 33.3C840 37 960 37 1080 34.2C1200 31 1320 25 1380 22L1440 19V56H1380C1320 56 1200 56 1080 56C960 56 840 56 720 56C600 56 480 56 360 56C240 56 120 56 60 56H0Z"
              style={{ fill: "hsl(var(--background))" }}
            />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 py-14">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="container relative z-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatItem value={6200} suffix="+" label="Experiences" delay={0} />
            <StatItem value={211} suffix="+" label="Cities Worldwide" delay={0.08} />
            <StatItem value={99.9} decimal suffix="%" label="Satisfaction Rate" delay={0.16} />
            <StatItem value={24} suffix="/7" label="Support" delay={0.24} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MISSION QUOTE
      ══════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl"
          >
            <div className="relative pl-7 sm:pl-10">
              {/* accent bar */}
              <span className="absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-brand-400 via-brand-500 to-brand-300" />
              <p className="text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl">
                &ldquo;Travel should be the most{" "}
                <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
                  exciting part
                </span>{" "}
                of your journey — not the planning.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-8 rounded-full bg-brand-400" />
                <span className="text-sm font-semibold text-muted-foreground">
                  The Triipzy Team
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          OUR STORY
      ══════════════════════════════════════════════ */}
      <section className="pb-24">
        <div className="container">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            {/* Left: story card */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.65 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-[#012d47] p-8 shadow-2xl shadow-brand-900/30 sm:p-10"
            >
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-brand-400/15 blur-[80px]" />
              <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-[60px]" />

              <span className="relative z-10 text-xs font-bold uppercase tracking-[0.2em] text-brand-300">
                Our Story
              </span>
              <h2 className="relative z-10 mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
                Helping Travelers Spend Less Time Planning — More Time Exploring.
              </h2>
              <div className="relative z-10 mt-5 space-y-3.5 text-sm leading-relaxed text-white/60">
                <p>
                  Travel should feel exciting from the very first moment. Yet planning a trip often
                  means jumping between websites, comparing endless options, and worrying about
                  reliability.
                </p>
                <p>
                  Triipzy was created to simplify that journey. We bring together carefully selected
                  experiences, transparent pricing, and intuitive technology — so you discover what
                  matters faster and book with confidence.
                </p>
                <p>
                  Whether you&apos;re exploring a new city, planning a family vacation, or chasing a
                  bucket-list adventure, Triipzy makes every step smoother.
                </p>
              </div>
              <Link
                href="/search"
                className="relative z-10 mt-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/22 hover:gap-3"
              >
                Start Exploring
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Right: 2×2 feature grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: BadgeCheck,
                  title: "Verified Experiences",
                  desc: "Every activity reviewed and sourced from trusted operators worldwide.",
                  grad: "from-emerald-400 to-teal-500",
                  bg: "bg-emerald-50 dark:bg-emerald-950/20",
                  delay: 0.1,
                },
                {
                  icon: Lock,
                  title: "Transparent Pricing",
                  desc: "No hidden fees. Know exactly what you pay before you confirm.",
                  grad: "from-violet-400 to-purple-500",
                  bg: "bg-violet-50 dark:bg-violet-950/20",
                  delay: 0.18,
                },
                {
                  icon: Compass,
                  title: "Smart Discovery",
                  desc: "Find activities tailored to your destination and interests.",
                  grad: "from-amber-400 to-orange-500",
                  bg: "bg-amber-50 dark:bg-amber-950/20",
                  delay: 0.26,
                },
                {
                  icon: Globe2,
                  title: "Global Access",
                  desc: "Book experiences across major destinations and hidden gems.",
                  grad: "from-brand-400 to-brand-600",
                  bg: "bg-brand-50 dark:bg-brand-950/20",
                  delay: 0.34,
                },
              ].map((f) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: f.delay }}
                  className={cn(
                    "group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                    f.bg,
                    "border border-border/40"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-all duration-300 group-hover:scale-110",
                      f.grad
                    )}
                  >
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{f.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CORE VALUES (numbered)
      ══════════════════════════════════════════════ */}
      <section className="bg-muted/40 py-24">
        <div className="container">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">
              What Drives Us
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Built Around Travelers.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every feature, recommendation, and booking flow is designed with one goal: make travel
              simpler, faster, and more enjoyable.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "01",
                icon: ShieldCheck,
                title: "Discover With Confidence",
                desc: "Curated experiences from trusted providers so you book without uncertainty.",
                numColor: "text-brand-500",
                grad: "from-brand-400 to-brand-600",
                delay: 0,
              },
              {
                n: "02",
                icon: Zap,
                title: "Technology That Simplifies",
                desc: "A seamless platform that helps travelers find the right experience faster.",
                numColor: "text-violet-500",
                grad: "from-violet-400 to-violet-600",
                delay: 0.1,
              },
              {
                n: "03",
                icon: HeartHandshake,
                title: "Customer-First Approach",
                desc: "Every decision starts with one question: does this improve the traveler experience?",
                numColor: "text-emerald-500",
                grad: "from-emerald-400 to-emerald-600",
                delay: 0.2,
              },
            ].map((v) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: v.delay }}
                className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card p-7 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* backdrop number */}
                <span
                  className={cn(
                    "pointer-events-none absolute -right-3 -top-5 select-none text-[7.5rem] font-black leading-none opacity-[0.06]",
                    v.numColor
                  )}
                >
                  {v.n}
                </span>
                <div
                  className={cn(
                    "mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md transition-all duration-300 group-hover:scale-110 h-12 w-12",
                    v.grad
                  )}
                >
                  <v.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          WHY TRIIPZY
      ══════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-16">
            {/* Sticky heading */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5 }}
              className="lg:sticky lg:top-28 lg:w-64 lg:shrink-0"
            >
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">
                Why Choose Us
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Why Travelers Choose Triipzy
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                We&apos;re not just another booking platform. Every detail is crafted to make your
                travel experience exceptional.
              </p>
              <Link
                href="/search"
                className="group mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 transition-all hover:gap-2.5"
              >
                See all experiences
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Feature rows */}
            <div className="flex-1 space-y-3">
              {[
                {
                  icon: Compass,
                  title: "Curated Experiences",
                  desc: "Quality experiences handpicked for reliability and value — every booking a great one.",
                  grad: "from-brand-400 to-brand-600",
                  delay: 0,
                },
                {
                  icon: Zap,
                  title: "Fast & Simple Booking",
                  desc: "Book in minutes with a smooth, intuitive checkout that gets out of your way.",
                  grad: "from-amber-400 to-orange-500",
                  delay: 0.07,
                },
                {
                  icon: Globe2,
                  title: "Global Destinations",
                  desc: "Explore experiences in leading cities and hidden gems across six continents.",
                  grad: "from-emerald-400 to-teal-500",
                  delay: 0.14,
                },
                {
                  icon: HeadphonesIcon,
                  title: "Reliable Support",
                  desc: "A dedicated support team available around the clock whenever you need help.",
                  grad: "from-violet-400 to-purple-500",
                  delay: 0.21,
                },
                {
                  icon: Lock,
                  title: "Secure Transactions",
                  desc: "Safe, encrypted booking from start to finish. Your data and payment protected.",
                  grad: "from-rose-400 to-pink-500",
                  delay: 0.28,
                },
                {
                  icon: RefreshCw,
                  title: "Constant Innovation",
                  desc: "We continuously improve based on real traveler feedback and evolving needs.",
                  grad: "from-indigo-400 to-blue-500",
                  delay: 0.35,
                },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: c.delay }}
                  className="group flex items-center gap-5 rounded-2xl border border-border/40 bg-card px-6 py-4 shadow-sm transition-all duration-300 hover:border-brand-200/50 hover:shadow-md dark:hover:border-brand-800/40"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-all duration-300 group-hover:scale-110",
                      c.grad
                    )}
                  >
                    <c.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{c.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-400" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          VISION / CTA
      ══════════════════════════════════════════════ */}
      <section className="pb-section pt-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-[#012d47] shadow-2xl shadow-brand-900/40"
          >
            {/* dot texture */}
            <div
              className="absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            {/* glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-400/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/15 blur-[80px]" />

            <div className="relative z-10 grid items-center gap-10 px-8 py-16 sm:px-12 sm:py-20 lg:grid-cols-[1fr_auto]">
              {/* Text */}
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 text-brand-300" />
                  Our Vision
                </span>
                <h2 className="mt-5 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
                  A World Where Travel Feels Seamless.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55">
                  We believe discovering a destination should be as enjoyable as experiencing it.
                  Our goal is to build the most traveler-friendly platform in the world — one that
                  removes friction, inspires exploration, and makes incredible experiences accessible
                  to everyone.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/search"
                  className="group flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-brand-700 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Sparkles className="h-4 w-4" />
                  Start Exploring
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/products"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/12 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  Browse All Experiences
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
