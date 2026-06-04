"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Sparkles, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/v1/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Invalid token state
  if (!token) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full bg-cyan-200/40 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, #0369A1 1px, transparent 1px), linear-gradient(to bottom, #0369A1 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,132,199,0.12)] p-8 sm:p-10 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Invalid reset link</h2>
            <p className="mt-2 text-sm text-slate-500">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0369A1] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#075985] hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Request a new reset link
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-sky-100">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full bg-cyan-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #0369A1 1px, transparent 1px), linear-gradient(to bottom, #0369A1 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,132,199,0.12)]"
        >
          <div className="p-8 sm:p-10">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">Password reset successful</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0369A1] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#075985] hover:shadow-lg"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Link href="/" className="text-3xl font-black tracking-tight text-[#0369A1]">
                      Triipzy
                    </Link>

                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium tracking-widest uppercase text-[#0369A1]">
                      <Sparkles className="h-4 w-4" />
                      Password Reset
                    </div>
                  </div>

                  <h1 className="mt-4 text-2xl font-bold text-slate-900">Reset your password</h1>
                  <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
                </div>
                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* New Password */}
                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Enter new password"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0369A1] focus:ring-4 focus:ring-sky-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Confirm new password"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0369A1] focus:ring-4 focus:ring-sky-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      >
                        {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0369A1] font-semibold text-white transition-all hover:bg-[#075985] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-600">
                    Remember your password?{" "}
                    <Link href="/sign-in" className="font-semibold text-[#0369A1] transition-colors hover:text-sky-700">
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