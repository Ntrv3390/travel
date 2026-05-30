"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, Check } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setStatus("success");
    setTimeout(() => {
      setStatus("idle");
      setEmail("");
    }, 3000);
  };

  return (
    <section className="container pb-section">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 px-6 py-14 text-center sm:px-14"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Stay Inspired</h2>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            Get travel inspiration, tips, and exclusive deals delivered to your inbox.
          </p>

          {status === "success" ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 backdrop-blur-sm"
            >
              <Check className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">You&apos;re subscribed! Check your inbox.</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-0 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-sky-700 shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                <Send className="h-4 w-4" />
                Subscribe
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-white/40">No spam. Unsubscribe anytime.</p>
        </div>
      </motion.div>
    </section>
  );
}
