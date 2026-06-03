"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
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
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full bg-cyan-200/40 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0369A1 1px, transparent 1px),
              linear-gradient(to bottom, #0369A1 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,132,199,0.12)]"
        >
          <div className="p-6 sm:p-8">
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>

                <h2 className="mt-4 text-2xl font-bold text-slate-900">
                  Check your email
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  We've sent a password reset link to
                </p>

                <p className="mt-1 font-medium text-[#0369A1] break-all">
                  {email}
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  Open the email and follow the instructions to reset your
                  password.
                </p>

                <Link
                  href="/sign-in"
                  className="mt-6 inline-flex items-center gap-2 font-medium text-[#0369A1] hover:text-[#075985]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                <div className="text-center">
                  <Link
                    href="/"
                    className="text-3xl font-black tracking-tight text-[#0369A1]"
                  >
                    Triipzy
                  </Link>
                  <div className="mt-6 flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#0369A1]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#0369A1]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Password Recovery
                    </div>
                  </div>
                  <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                    Forgot Password?
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    No worries. Enter your email address and we'll send you a secure reset link.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-6 space-y-4"
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Email Address
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0369A1] focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-[#0369A1] font-semibold text-white transition-all hover:bg-[#075985] hover:shadow-lg disabled:opacity-70"
                  >
                    {loading ? (
                      <svg
                        className="h-5 w-5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          className="opacity-75"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-slate-600">
                    Remember your password?
                    <Link
                      href="/sign-in"
                      className="ml-1 font-semibold text-[#0369A1] hover:text-[#075985]"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}