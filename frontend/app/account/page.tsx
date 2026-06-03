"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, Mail, Shield, LogOut, Calendar, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-section">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-2xl py-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-2xl font-bold text-white shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  <Shield className="h-3 w-3" />
                  {user.role === "admin" ? "Admin" : "User"}
                </span>
                {user.createdAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isAdmin && (
              <Button asChild href="/admin" variant="outline" className="flex-1">
                Admin Panel
              </Button>
            )}
            <Button
              onClick={() => {
                signOut();
                router.push("/");
              }}
              variant="destructive"
              className="flex-1"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
