"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl sm:p-10">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10">
                <CheckCircle2 className="h-8 w-8 text-sky-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">Check your email</h2>
              <p className="mt-2 text-sm text-white/60">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium text-white/80">{email}</span>
              </p>
              <p className="mt-1 text-sm text-white/60">
                Click the link in the email to reset your password.
              </p>
              <Link
                href="/sign-in"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-white">
                  Triipzy
                </Link>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  Reset password
                </div>
                <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Forgot your password?</h1>
                <p className="mt-2 text-sm text-white/60">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label htmlFor="email" className="text-sm font-medium text-white/80">Email</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="block w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/60">
                Remember your password?{" "}
                <Link href="/sign-in" className="font-medium text-sky-400 hover:text-sky-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
