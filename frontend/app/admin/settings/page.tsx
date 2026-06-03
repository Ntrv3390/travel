"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [fetchFresh, setFetchFresh] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ key: string; value: string }>("/api/v1/admin/settings?key=fetch_fresh")
      .then((res) => setFetchFresh(res.value === "true"))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleFetchFresh = useCallback(async () => {
    const newValue = !fetchFresh;
    try {
      await api.put("/api/v1/admin/settings", { key: "fetch_fresh", value: String(newValue) });
      setFetchFresh(newValue);
    } catch {
      // silently fail
    }
  }, [fetchFresh]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage platform configuration</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Fetch Fresh Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sm">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Fetch Fresh</h2>
                <p className="text-xs text-slate-500">
                  {fetchFresh
                    ? "Data is fetched live from Headout APIs"
                    : "Data is served from local database"}
                </p>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12 rounded-full" />
            ) : (
              <button
                onClick={toggleFetchFresh}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
                  fetchFresh ? "bg-sky-500" : "bg-slate-300"
                )}
                role="switch"
                aria-checked={fetchFresh}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    fetchFresh ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 shadow-sm">
              <SettingsIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">More settings coming soon</h2>
              <p className="text-xs text-slate-500">Additional configuration options will be added here.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
