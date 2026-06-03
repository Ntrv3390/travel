"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signUp(email, password, name);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
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
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,132,199,0.12)]"
        >
          <div className="grid lg:grid-cols-2">
            {/* Left Panel */}
            <div className="hidden lg:flex flex-col justify-between bg-[#0369A1] p-8 text-white">
              <div>
                <Link
                  href="/"
                  className="text-3xl font-black tracking-tight"
                >
                  Triipzy
                </Link>

                <div className="mt-10">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                    <Sparkles className="h-4 w-4" />
                    Join The Journey
                  </div>

                  <h1 className="mt-4 text-4xl font-bold leading-tight">
                    Start your next
                    <br />
                    adventure today.
                  </h1>

                  <p className="mt-3 max-w-md text-base text-sky-100">
                    Create your account and unlock thousands of experiences,
                    attractions, and unforgettable memories worldwide.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-sm text-sky-100">
                  Trusted by travelers exploring destinations across the globe.
                </p>

                <div className="mt-4 flex gap-8">
                  <div>
                    <div className="text-2xl font-bold">50K+</div>
                    <div className="text-xs text-sky-100">Travelers</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold">211+</div>
                    <div className="text-xs text-sky-100">Destinations</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold">4.9★</div>
                    <div className="text-xs text-sky-100">Rating</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="flex items-center justify-center p-5 sm:p-7 lg:p-8">
              <div className="w-full max-w-md">
                <div className="lg:hidden text-center">
                  <Link
                    href="/"
                    className="text-3xl font-black text-[#0369A1]"
                  >
                    Triipzy
                  </Link>
                </div>

                <div className="mt-5 lg:mt-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium text-[#0369A1]">
                    <Sparkles className="h-4 w-4" />
                    Get Started
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-slate-900">
                    Create your account
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Join Triipzy and start exploring.
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
                      Full Name
                    </label>

                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0369A1] focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>

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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Password
                    </label>

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#0369A1] focus:ring-4 focus:ring-sky-100"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0369A1] font-semibold text-white transition-all hover:bg-[#075985] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
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
                      <>
                        Create Account
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?
                    <Link
                      href="/sign-in"
                      className="ml-1 font-semibold text-[#0369A1] hover:text-[#075985]"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}