"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  CreditCard,
  Compass,
  Shield,
  Globe2,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Mail,
  Clock,
  LifeBuoy,
  Zap,
  Send,
  CheckCircle2,
  AlertCircle,
  HeadphonesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const helpCategories = [
  { icon: Ticket, title: "Booking Assistance", desc: "Manage reservations and booking changes.", gradient: "from-sky-500 to-cyan-500", faqId: "bookings" },
  { icon: CreditCard, title: "Payments & Refunds", desc: "Payment methods, invoices, and refund requests.", gradient: "from-violet-500 to-purple-500", faqId: "payments" },
  { icon: Compass, title: "Experiences & Activities", desc: "Questions about tours, attractions, and experiences.", gradient: "from-emerald-500 to-teal-500", faqId: "experiences" },
  { icon: Shield, title: "Account & Security", desc: "Account access, profile settings, and security.", gradient: "from-amber-500 to-orange-500", faqId: "account" },
  { icon: Globe2, title: "Travel Information", desc: "Destination-specific guidance and travel tips.", gradient: "from-rose-500 to-pink-500", faqId: "travel" },
  { icon: HelpCircle, title: "Partner Support", desc: "Operator and supplier-related assistance.", gradient: "from-indigo-500 to-blue-500", faqId: "general" },
];

const faqCategories = [
  { id: "bookings", label: "Booking Assistance", icon: Ticket, desc: "Manage reservations and booking changes.", gradient: "from-sky-500 to-cyan-500" },
  { id: "payments", label: "Payments & Refunds", icon: CreditCard, desc: "Payment methods, invoices, and refund requests.", gradient: "from-violet-500 to-purple-500" },
  { id: "experiences", label: "Experiences & Activities", icon: Compass, desc: "Questions about tours, attractions, and experiences.", gradient: "from-emerald-500 to-teal-500" },
  { id: "account", label: "Account & Security", icon: Shield, desc: "Account access, profile settings, and security.", gradient: "from-amber-500 to-orange-500" },
  { id: "travel", label: "Travel Information", icon: Globe2, desc: "Destination-specific guidance and travel tips.", gradient: "from-rose-500 to-pink-500" },
  { id: "general", label: "Partner Support", icon: HelpCircle, desc: "Operator and supplier-related assistance.", gradient: "from-indigo-500 to-blue-500" },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  general: [
    { q: "What is Triipzy?", a: "Triipzy is a travel experience platform that helps travelers discover, compare, and book unforgettable activities, tours, and attractions across destinations worldwide. We partner with trusted local operators to offer curated experiences with transparent pricing and seamless booking." },
    { q: "How do I book an experience?", a: "Browse experiences on the platform, select your preferred date and ticket type, then proceed to checkout. You will receive a confirmation email once the booking is completed. Most bookings are confirmed instantly." },
    { q: "How do I contact support?", a: "You can reach our support team by using the contact form on this page, emailing support@triipzy.com, or checking the Contact Support section below for more options. We are available 24/7 to assist you." },
    { q: "Is my payment information secure?", a: "Yes. Triipzy uses industry-standard encryption and secure payment processing to protect your financial information. We never store full payment details on our servers." },
  ],
  bookings: [
    { q: "How do I access my booking confirmation?", a: "Your booking confirmation is sent to the email address used during checkout. You can also find all confirmations under your account bookings section. If you did not receive the email, check your spam folder or contact support." },
    { q: "Can I modify a reservation after booking?", a: "Modifications depend on the experience provider's policy. Some bookings can be changed up to 48 hours before the start time. Log into your account, navigate to your booking, and check the modification options available." },
    { q: "Can I change the travel date?", a: "Date changes are subject to availability and the operator's rescheduling policy. Contact support or check your booking details in your account to explore available options." },
    { q: "Where can I download my voucher?", a: "Vouchers are available in your account under Bookings. You can also find a download link in your confirmation email. Most experiences accept digital vouchers on your mobile device." },
  ],
  payments: [
    { q: "What payment methods are accepted?", a: "Triipzy accepts major credit cards, debit cards, and select digital payment methods. Available options are displayed at checkout depending on your region and currency." },
    { q: "When will my refund be processed?", a: "Refunds are typically processed within 5–10 business days after approval, depending on your payment method and financial institution. You will receive a confirmation email once the refund has been initiated." },
    { q: "Can I get a cancellation refund?", a: "Refund eligibility depends on the cancellation policy of the specific experience and operator. Many bookings offer free cancellation within a stated window. Check the cancellation policy before booking." },
    { q: "How do I request an invoice?", a: "Invoices are automatically generated for completed bookings. You can download them from your account under Booking History or contact support to request a copy." },
  ],
  experiences: [
    { q: "Do I need printed tickets?", a: "Most experiences accept digital tickets displayed on your mobile device. However, some venues may require printed tickets. Check the specific experience details after booking for entry requirements." },
    { q: "How can I contact the activity operator?", a: "Operator contact information is provided in your booking confirmation. For additional assistance, our support team can facilitate communication between you and the operator if needed." },
    { q: "What happens if an experience is cancelled?", a: "If an operator cancels an experience, you will be notified immediately and offered a full refund or the option to rebook a similar experience. Triipzy monitors cancellations to ensure you are supported throughout the process." },
    { q: "Can I leave a review for an experience?", a: "Yes. After your experience, you will receive an invitation to leave a review. Your feedback helps other travelers and helps us maintain quality standards across our platform." },
  ],
  account: [
    { q: "How do I update my account details?", a: "You can update your profile information, including name, email, and preferences, from your account settings page. For security-related changes, verification may be required." },
    { q: "I forgot my password. What should I do?", a: "Use the Forgot Password link on the login page to reset your password. A reset link will be sent to your registered email address. If you do not receive it, check your spam folder." },
    { q: "How do I delete my account?", a: "Account deletion requests can be submitted to our support team. Please note that certain booking records may need to be retained for legal and operational purposes." },
    { q: "Is my personal information shared with third parties?", a: "Triipzy does not sell your personal information. Data is shared only with trusted partners to fulfill bookings, process payments, or as required by law. See our Privacy Policy for full details." },
  ],
  travel: [
    { q: "What should I do if I am running late?", a: "Contact the operator directly using the details in your booking confirmation. If you cannot reach them, our support team can help coordinate. Late arrivals may affect participation." },
    { q: "Can I get assistance during my experience?", a: "For urgent issues during an experience, contact the operator first. For booking or platform issues, our support team is available 24/7 to assist you remotely." },
    { q: "What if the meeting point is unclear?", a: "Detailed meeting point instructions are included in your booking confirmation. If you still cannot locate the meeting point, contact the operator or reach out to support for assistance." },
  ],
};

const processSteps = [
  { num: 1, title: "Submit Your Question", desc: "Send us your inquiry through the contact form or email." },
  { num: 2, title: "Team Review", desc: "Our support team reviews your request and gathers details." },
  { num: 3, title: "Investigation", desc: "We coordinate with relevant teams to find the best solution." },
  { num: 4, title: "Resolution", desc: "You receive a clear response and resolution to your request." },
];

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeFaqCategory, setActiveFaqCategory] = useState("general");
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const currentFaqs = faqData[activeFaqCategory] || [];

  const handleCategoryChange = (id: string) => {
    if (id === activeFaqCategory) return;
    setActiveFaqCategory(id);
    setOpenFaq(null);
  };

  const handleHelpCategoryClick = (faqId: string) => {
    handleCategoryChange(faqId);
    const el = document.getElementById("faq-section");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) return;
    setStatus("loading");
    try {
      await api.post("/api/v1/help/submit", form);
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -mt-20 pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/5 blur-[100px]" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/5 blur-[100px]" />
          <div className="absolute left-1/2 top-1/3 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-400/10 to-transparent blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>
        <div className="relative z-10 container py-24 sm:py-32">
          <div className="mb-8">
            <Breadcrumb items={[{ label: "Help Center" }]} className="text-white/60 [&_span]:text-white/80 [&_a]:text-white/60 [&_a:hover]:text-sky-300" />
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Triipzy Support
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            We&apos;re{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              here
            </span>{" "}
            when you need us.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg"
          >
            Whether you&apos;re planning your next adventure, managing a booking, or looking for quick
            answers, our support resources are designed to help every step of the journey.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button
              asChild
              href="#categories"
              className="group relative h-12 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-8 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30"
            >
              <span className="flex items-center gap-2">
                Browse Help Topics
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Button>
            <Button
              asChild
              href="#contact"
              className="group h-12 rounded-full border border-white/20 bg-white/5 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                Contact Support
                <HeadphonesIcon className="h-4 w-4" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Quick Help Categories ── */}
      <section id="categories" className="py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              Help Topics
            </span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              How can we help?
            </h2>
          </motion.div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {helpCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
                onClick={() => handleHelpCategoryClick(cat.faqId)}
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient} shadow-sm transition-transform group-hover:scale-110`}
                >
                  <cat.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-base font-semibold text-slate-900">{cat.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{cat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Category Navigation + Questions ── */}
      <section id="faq-section" className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              Frequently Asked
            </span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Popular Questions
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              Quick answers to the topics travelers ask about most often.
            </p>
          </motion.div>

          {/* Category filter nav */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8"
          >
            {/* Desktop: responsive grid */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {faqCategories.map((cat) => {
                const isActive = activeFaqCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      "group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200",
                      isActive
                        ? "border-sky-200 bg-white shadow-md shadow-sky-100/50"
                        : "border-slate-100 bg-white/70 shadow-sm hover:border-sky-100 hover:bg-white hover:shadow-md",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                        isActive
                          ? `bg-gradient-to-br ${cat.gradient} shadow-sm scale-110`
                          : "bg-slate-100 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-500",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-white" : "")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", isActive ? "text-sky-800" : "text-slate-700")}>
                        {cat.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="overflow-x-auto scrollbar-hide sm:hidden -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                {faqCategories.map((cat) => {
                  const isActive = activeFaqCategory === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 transition-all duration-200",
                        isActive
                          ? "border-sky-200 bg-white shadow-md"
                          : "border-slate-100 bg-white/70 shadow-sm",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                          isActive
                            ? `bg-gradient-to-br ${cat.gradient} text-white`
                            : "bg-slate-100 text-slate-400",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-left whitespace-nowrap">
                        <p className={cn("text-sm font-semibold", isActive ? "text-sky-800" : "text-slate-700")}>
                          {cat.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* FAQ accordion */}
          <div className="mx-auto mt-6 max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFaqCategory}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {currentFaqs.map((faq, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                          openFaq === i && "rotate-180",
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── Support Channels ── */}
      <section className="py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              Get in Touch
            </span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Multiple Ways to Reach Us
            </h2>
          </motion.div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: HeadphonesIcon, title: "Customer Support", desc: "Get assistance for bookings and account-related issues.", gradient: "from-sky-500 to-cyan-500" },
              { icon: Mail, title: "Email Assistance", desc: "Send detailed inquiries and receive personalized support.", gradient: "from-violet-500 to-purple-500" },
              { icon: Clock, title: "Response Times", desc: "Transparent expectations for support requests and resolutions.", gradient: "from-emerald-500 to-teal-500" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-sm transition-transform group-hover:scale-110`}
                >
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Help Process ── */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              How It Works
            </span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              How Support Works
            </h2>
          </motion.div>
          {/* Desktop horizontal timeline */}
          <div className="mt-10 hidden grid-cols-4 gap-6 md:grid">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-sm font-bold text-white shadow-sm">
                    {step.num}
                  </div>
                  {i < processSteps.length - 1 && (
                    <div className="h-px flex-1 bg-gradient-to-r from-sky-200 to-transparent" />
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
          {/* Mobile vertical timeline */}
          <div className="mt-10 space-y-0 md:hidden">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex gap-4 pb-8 pl-8 last:pb-0"
              >
                <div className="absolute left-[15px] top-0 h-full w-px bg-gradient-to-b from-sky-200 to-transparent last:hidden" />
                <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-xs font-bold text-white shadow-sm">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact Support ── */}
      <section id="contact" className="py-section">
        <div className="container">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            {/* Left - Info */}
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
              <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
                Get in Touch
              </span>
              <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
                Still Need Assistance?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                If you couldn&apos;t find the answer you&apos;re looking for, our support team is ready to
                help.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email us</p>
                    <a href="mailto:support@triipzy.com" className="text-sm font-medium text-sky-700 transition hover:text-sky-500">
                      support@triipzy.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Availability</p>
                    <p className="text-sm font-medium text-slate-700">24/7 Online Support</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Response Time</p>
                    <p className="text-sm font-medium text-slate-700">Typically within 24 hours</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right - Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                {status === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">Message Sent!</p>
                    <p className="mt-1 text-sm text-slate-500">
                      We&apos;ll get back to you as soon as possible.
                    </p>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <AlertCircle className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Please try again or email us directly.
                    </p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="mt-4 text-sm font-medium text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      Try again
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Email Address
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="subject" className="text-sm font-medium text-slate-700">
                          Subject
                        </label>
                        <input
                          id="subject"
                          type="text"
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          required
                          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                          placeholder="How can we help?"
                        />
                      </div>
                      <div>
                        <label htmlFor="message" className="text-sm font-medium text-slate-700">
                          Message
                        </label>
                        <textarea
                          id="message"
                          rows={4}
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          required
                          className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-y"
                          placeholder="Tell us more about your question..."
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={status === "loading"}
                      className="mt-5 w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 disabled:opacity-60"
                    >
                      {status === "loading" ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Send Message
                          <Send className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust Section ── */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-indigo-50 py-section">
        <div className="container">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-500">
              Why Trust Us
            </span>
            <h2 className="mt-2 text-display-sm font-bold text-slate-900 sm:text-display-lg">
              Support Built Around Travelers
            </h2>
          </motion.div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: Globe2, title: "Global Coverage", desc: "Help available for experiences across destinations worldwide.", gradient: "from-sky-500 to-cyan-500" },
              { icon: LifeBuoy, title: "Reliable Assistance", desc: "Support throughout your booking journey.", gradient: "from-violet-500 to-purple-500" },
              { icon: Zap, title: "Fast Responses", desc: "Designed to minimize waiting and maximize resolution.", gradient: "from-emerald-500 to-teal-500" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-sm transition-transform group-hover:scale-110`}
                >
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
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
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
              <h2 className="text-display-sm font-bold text-white sm:text-display-lg">Travel Confidently.</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
                Wherever your journey takes you, Triipzy is committed to helping make every experience
                smooth, simple, and memorable.
              </p>
              <div className="mt-8">
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
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
