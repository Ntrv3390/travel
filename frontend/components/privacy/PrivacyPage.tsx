"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Shield,
  Eye,
  Sliders,
  Share2,
  Lock,
  FileText,
  UserCheck,
  Archive,
  Mail,
  Sparkles,
  Search,
  Smartphone,
  MessageSquare,
  Cookie,
  BarChart3,
  Settings,
  Megaphone,
  Globe,
  HeadphonesIcon,
  Trash2,
  Download,
  Edit3,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Shield, num: 1 },
  { id: "information-we-collect", label: "Information We Collect", icon: Eye, num: 2 },
  { id: "how-we-use-information", label: "How We Use Information", icon: Sliders, num: 3 },
  { id: "sharing-information", label: "Sharing Information", icon: Share2, num: 4 },
  { id: "data-security", label: "Data Security", icon: Lock, num: 5 },
  { id: "cookies-tracking", label: "Cookies & Tracking", icon: FileText, num: 6 },
  { id: "your-rights", label: "Your Rights", icon: UserCheck, num: 7 },
  { id: "data-retention", label: "Data Retention", icon: Archive, num: 8 },
  { id: "contact-information", label: "Contact Information", icon: Mail, num: 9 },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

function formatDate() {
  const d = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ num, icon: Icon, title, subtitle }: {
  num: string; icon: typeof Shield; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sm">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-500 sm:text-[11px]">
          Section {num}
        </span>
        <h2 className="mt-0.5 text-lg font-bold text-slate-900 sm:text-2xl">{title}</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function SummaryCallout({ icon: Icon, children }: { icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100">
          <Icon className="h-3.5 w-3.5 text-sky-600" />
        </div>
        <div className="text-xs leading-relaxed text-slate-600 [&_strong]:font-semibold [&_strong]:text-slate-800">
          {children}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, items, delay }: {
  icon: typeof Search; title: string; items: string[]; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function SectionDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="h-1.5 w-1.5 rounded-full bg-sky-200" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </div>
  );
}

const SECTION_IDS = NAV_ITEMS.map((n) => n.id);

export function PrivacyPage() {
  const [activeId, setActiveId] = useState("overview");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );

    const sectionIds = SECTION_IDS;
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Scroll active tab into view in horizontal nav
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = activeTabRef.current;

      const containerWidth = container.offsetWidth;
      const tabOffset = tab.offsetLeft;
      const tabWidth = tab.offsetWidth;

      container.scrollTo({
        left: tabOffset - containerWidth / 2 + tabWidth / 2,
        behavior: "smooth",
      });
    }
  }, [activeId]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 160; // Extra offset for sticky nav
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(id);
    }
  };

  return (
    <>
      {/* ── Breadcrumb ── */}
      <section className="border-b border-slate-100 bg-slate-50/50">
        <div className="container py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] sm:text-sm text-slate-500">
            <Link href="/" className="transition hover:text-sky-600">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="text-slate-400">Legal</span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-medium text-slate-700">Privacy Policy</span>
          </nav>
        </div>
      </section>

      {/* ── Hero ── */}
      <section className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-sky-100/40 to-transparent blur-3xl" />
        </div>
        <div className="container relative py-8 sm:py-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-500 sm:text-xs">
              Legal Information
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-display-lg">
              Privacy Policy
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600 sm:mt-3 sm:text-base">
              Your privacy matters to us. This policy explains how Triipzy collects, uses, stores,
              and protects your information when you use our platform and services.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 sm:mt-5 sm:gap-4 sm:text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
                Last Updated: {formatDate()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
                Version: 1.0
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sticky Mobile/Tablet Nav ── */}
      <div className="sticky top-[48px] z-40 block w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl lg:hidden sm:top-[64px]">
        <div
          ref={scrollRef}
          className="container flex overflow-x-auto scrollbar-hide"
        >
          <div className="flex gap-1 py-3 pr-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  ref={isActive ? activeTabRef : null}
                  onClick={() => scrollToSection(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-200"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  )}
                >
                  <item.icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-slate-400")} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Two-column content ── */}
      <div className="container py-8 sm:py-10">
        <div className="flex gap-8 xl:gap-16">
          {/* ── Desktop Sidebar ── */}
          <aside className="hidden w-[300px] shrink-0 xl:w-[340px] lg:block">
            <nav
              className="sticky top-28 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              aria-label="Section navigation"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Sections
              </span>

              <div className="mt-4 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeId === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200",
                        isActive
                          ? "bg-sky-50 font-medium text-sky-800"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="active-nav"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sky-500"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors duration-200",
                          isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-500",
                        )}
                      />
                      <span className="flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            "text-[11px] tabular-nums",
                            isActive ? "text-sky-400" : "text-slate-300",
                          )}
                        >
                          {item.num}.
                        </span>
                        <span>{item.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold text-slate-700">Questions about privacy?</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                    Need help understanding how your information is handled? Contact our support team.
                  </p>
                  <a
                    href="mailto:support@triipzy.com"
                    className="mt-2 inline-block text-[11px] font-medium text-sky-600 transition hover:text-sky-500"
                  >
                    support@triipzy.com
                  </a>
                </div>
              </div>
            </nav>
          </aside>

          {/* ── Content ── */}
          <main className="min-w-0 flex-1 space-y-8 sm:space-y-12 max-w-[900px]">
            {/* 1. Overview */}
            <motion.section id="overview" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="01"
                  icon={Shield}
                  title="Overview"
                  subtitle="Understanding how Triipzy protects and manages your information."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> We collect only the information necessary to provide bookings,
                  support services, and improve your experience. Your data is never sold.
                </SummaryCallout>
                <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    Triipzy is committed to protecting your privacy and ensuring that your personal
                    information is handled responsibly. This Privacy Policy outlines the types of
                    information we collect, how it is used, and the measures we take to safeguard
                    your data.
                  </p>
                  <p>
                    This policy applies to all services offered through the Triipzy platform,
                    including our website, mobile interfaces, and any related booking or support
                    services. By using our platform, you acknowledge and agree to the practices
                    described in this policy.
                  </p>
                  <p>
                    We encourage you to read this document carefully. If you do not agree with any
                    part of this policy, please discontinue use of our services.
                  </p>
                </div>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 2. Information We Collect */}
            <motion.section id="information-we-collect" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="02"
                  icon={Eye}
                  title="Information We Collect"
                  subtitle="The data we gather to deliver a seamless booking experience."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> We collect information you provide directly and data
                  generated through platform usage. This includes personal details, booking preferences,
                  device information, and communication records.
                </SummaryCallout>
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <InfoCard icon={Search} title="Personal Information" items={["Name", "Email address", "Phone number", "Billing information"]} delay={0} />
                  <InfoCard icon={Globe} title="Booking Information" items={["Reservations", "Destination preferences", "Travel selections"]} delay={0.05} />
                  <InfoCard icon={Smartphone} title="Device Information" items={["Browser type", "Device type", "IP address", "Usage analytics"]} delay={0.1} />
                  <InfoCard icon={MessageSquare} title="Communication Data" items={["Support inquiries", "Feedback submissions", "Contact requests"]} delay={0.15} />
                </div>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 3. How We Use Information */}
            <motion.section id="how-we-use-information" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="03"
                  icon={Sliders}
                  title="How We Use Information"
                  subtitle="How your data helps us operate and improve our platform."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> Your information powers your bookings, enables customer
                  support, personalizes recommendations, and keeps your account secure.
                </SummaryCallout>
                <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    { title: "Booking Processing", desc: "Handling reservations and confirming your experience bookings." },
                    { title: "Customer Support", desc: "Responding to inquiries and resolving issues promptly." },
                    { title: "Account Management", desc: "Maintaining your profile, preferences, and booking history." },
                    { title: "Service Improvements", desc: "Analyzing usage patterns to enhance platform features." },
                    { title: "Personalization", desc: "Tailoring recommendations based on your interests." },
                    { title: "Security & Compliance", desc: "Fraud prevention, monitoring, and legal obligations." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-sky-100 hover:bg-sky-50/30"
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 4. Sharing Information */}
            <motion.section id="sharing-information" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="04"
                  icon={Share2}
                  title="Sharing Information"
                  subtitle="When and with whom your data may be shared."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> We do not sell your personal information. Data is shared
                  only with trusted partners, service providers, or when required by law.
                </SummaryCallout>
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                      <Globe className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Travel Partners</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Information may be shared with local operators and experience providers to fulfill
                      bookings and deliver the services you have selected.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                      <Settings className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Service Providers</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      We engage trusted third-party providers for payment processing, hosting
                      infrastructure, analytics, and customer support tools.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                      <Shield className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Legal Authorities</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      We may disclose information if required to do so by law, regulation, or legal
                      process.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                      <Archive className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">Business Transfers</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      In the event of a merger, acquisition, or restructuring, user information may be
                      transferred as part of the business assets.
                    </p>
                  </motion.div>
                </div>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 5. Data Security */}
            <motion.section id="data-security" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="05"
                  icon={Lock}
                  title="Data Security"
                  subtitle="How we protect your information with industry-standard measures."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> Your data is protected by encryption, access controls,
                  and continuous monitoring. We follow security best practices across our infrastructure.
                </SummaryCallout>
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {[
                    { icon: Lock, title: "Encryption", desc: "Data is encrypted both in transit and at rest using strong cryptographic protocols." },
                    { icon: Shield, title: "Secure Infrastructure", desc: "Our infrastructure is hosted in secure facilities with restricted physical access." },
                    { icon: UserCheck, title: "Access Controls", desc: "Strict authentication protocols ensure only authorized personnel can access data." },
                    { icon: BarChart3, title: "Continuous Monitoring", desc: "We employ automated monitoring and regular vulnerability testing to detect threats." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="flex gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-slate-400 italic">
                  While no platform can guarantee absolute security, Triipzy continuously works to
                  protect user information using industry-standard security practices.
                </p>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 6. Cookies & Tracking */}
            <motion.section id="cookies-tracking" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="06"
                  icon={FileText}
                  title="Cookies &amp; Tracking"
                  subtitle="How we use cookies to enhance and personalize your experience."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> We use cookies for essential functionality, analytics,
                  preferences, and marketing. You can manage preferences through your browser settings.
                </SummaryCallout>
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {[
                    { icon: Cookie, title: "Essential Cookies", desc: "Required for core platform functionality, including secure access and booking transactions.", color: "text-sky-600", bg: "bg-sky-50" },
                    { icon: BarChart3, title: "Analytics Cookies", desc: "Help us understand how users interact with our platform so we can improve performance.", color: "text-violet-600", bg: "bg-violet-50" },
                    { icon: Settings, title: "Preference Cookies", desc: "Remember your language, currency, and display preferences for a personalized experience.", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { icon: Megaphone, title: "Marketing Cookies", desc: "Used to deliver relevant promotional content and measure campaign effectiveness.", color: "text-amber-600", bg: "bg-amber-50" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-colors group-hover:opacity-80", item.bg, item.color)}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-slate-500">
                  You can manage your cookie preferences through your browser settings at any time.
                </p>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 7. Your Rights */}
            <motion.section id="your-rights" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="07"
                  icon={UserCheck}
                  title="Your Rights"
                  subtitle="Control over your personal information and how it is used."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> Depending on your jurisdiction, you may have the right
                  to access, correct, delete, or export your data, as well as withdraw consent where applicable.
                </SummaryCallout>
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {[
                    { icon: Search, title: "Access Your Data", desc: "Request a copy of the personal data we hold about you.", color: "text-sky-600", bg: "bg-sky-50" },
                    { icon: Edit3, title: "Correct Information", desc: "Update inaccurate or incomplete personal information.", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { icon: Trash2, title: "Delete Your Data", desc: "Request removal of your data where legally permitted.", color: "text-rose-600", bg: "bg-rose-50" },
                    { icon: Download, title: "Export Your Data", desc: "Request an export of your personal information in a portable format.", color: "text-violet-600", bg: "bg-violet-50" },
                    { icon: LogOut, title: "Withdraw Consent", desc: "Opt out of certain processing activities where consent was previously given.", color: "text-amber-600", bg: "bg-amber-50", wide: true },
                  ].map((item: { icon: typeof Search; title: string; desc: string; color: string; bg: string; wide?: boolean }, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className={cn(
                        "group rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        item.wide && "sm:col-span-2",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:opacity-80", item.bg, item.color)}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-slate-500">
                  To exercise any of these rights, please contact us using the information provided
                  in the Contact section below. We will respond to your request within the timeframe
                  required by applicable law.
                </p>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 8. Data Retention */}
            <motion.section id="data-retention" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="08"
                  icon={Archive}
                  title="Data Retention"
                  subtitle="How long we keep your information and why."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> We retain data only as long as needed for the purposes
                  described in this policy, unless a longer period is required by law.
                </SummaryCallout>
                <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
                  <p>
                    We retain your personal information only for as long as necessary to fulfill the
                    purposes described in this policy, unless a longer retention period is required or
                    permitted by law.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {[
                    { icon: Shield, title: "Legal Obligations", desc: "Compliance with regulatory and legal requirements." },
                    { icon: Lock, title: "Fraud Prevention", desc: "Protecting against fraudulent activity and abuse." },
                    { icon: UserCheck, title: "Account Management", desc: "Maintaining account continuity and service history." },
                    { icon: FileText, title: "Dispute Resolution", desc: "Resolving disputes and enforcing agreements." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  When information is no longer needed, we securely delete or anonymize it.
                </p>
              </SectionCard>
            </motion.section>

            <SectionDivider />

            {/* 9. Contact Information */}
            <motion.section id="contact-information" {...fadeUp} transition={{ duration: 0.5 }}>
              <SectionCard>
                <SectionHeader
                  num="09"
                  icon={Mail}
                  title="Contact Information"
                  subtitle="Reach out to our privacy team with questions or requests."
                />
                <SummaryCallout icon={Sparkles}>
                  <strong>Quick summary:</strong> If you have questions about your data or this policy,
                  our privacy team and customer support are here to help.
                </SummaryCallout>

                <div className="mt-6 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-white p-5 sm:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sm">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Need Privacy Assistance?</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 sm:text-xs">
                        Our support team is available to answer questions regarding your personal data.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <a
                      href="mailto:support@triipzy.com"
                      className="group flex items-center gap-3 rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                        <HeadphonesIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-500 sm:text-xs">Customer Support</p>
                        <p className="truncate text-xs font-medium text-sky-700 sm:text-sm">support@triipzy.com</p>
                      </div>
                    </a>
                    <a
                      href="/"
                      className="group flex items-center gap-3 rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 sm:text-xs">Website</p>
                        <span className="text-xs font-medium text-sky-700 sm:text-sm transition hover:text-sky-500">
                          Triipzy.com
                        </span>
                      </div>
                    </a>
                  </div>

                </div>
              </SectionCard>
            </motion.section>
          </main>
        </div>
      </div>
    </>
  );
}
