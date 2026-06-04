"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, HelpCircle, Users, TrendingUp, Globe, Eye, ArrowUp, ArrowDown, Activity, Database, Server, CheckCircle2, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageCount {
  pathname: string;
  count: number;
}

interface AdminStats {
  totalBookings: number;
  totalHelpSubmissions: number;
  totalUsers: number;
  totalVisitors: number;
  uniqueVisitorsToday: number;
  topCountries: { country: string; count: number }[];
  topPages: PageCount[];
  bottomPages: PageCount[];
}

interface SystemStatus {
  server: {
    status: string;
    uptime: string;
    started: string;
  };
  database: {
    ok: boolean;
    status: string;
    error: string;
  };
  headout: {
    available: boolean;
  };
}

interface HealthInfo {
  status: string;
  message: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    api.get<AdminStats>("/api/v1/admin/stats")
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch system status
    const fetchStatus = () => {
      Promise.all([
        api.get<SystemStatus>("/api/v1/admin/status"),
        api.get<HealthInfo>("/health")
      ])
        .then(([statusRes, healthRes]) => {
          setStatus(statusRes);
          setHealth(healthRes);
        })
        .catch(() => {})
        .finally(() => setStatusLoading(false));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: CalendarCheck, gradient: "from-sky-500 to-cyan-500" },
    { label: "Help", value: stats?.totalHelpSubmissions ?? 0, icon: HelpCircle, gradient: "from-violet-500 to-purple-500" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, gradient: "from-emerald-500 to-teal-500" },
    { label: "All Visitors", value: stats?.totalVisitors ?? 0, icon: Eye, gradient: "from-orange-500 to-amber-500" },
    { label: "Visitors Today", value: stats?.uniqueVisitorsToday ?? 0, icon: Globe, gradient: "from-rose-500 to-pink-500" },
    { label: "Countries", value: stats?.topCountries?.length ?? 0, icon: Globe, gradient: "from-indigo-500 to-violet-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of your platform</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Activity className="h-3.5 w-3.5" />
          Live Updates
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-4">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold text-slate-900">
                    {card.value.toLocaleString()}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-500">{card.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System Status Section */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Server className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">API Server</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {statusLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <>
                    {health?.status === "healthy" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className={cn(
                      "text-xs font-medium capitalize",
                      health?.status === "healthy" ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {health?.status || "Unknown"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!statusLoading && status?.server && (
            <div className="mt-4 flex items-center gap-4 border-t border-slate-50 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Uptime: {status.server.uptime?.split(".")[0] || "Unknown"}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Database className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Database</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {statusLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <>
                    {status?.database?.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className={cn(
                      "text-xs font-medium capitalize",
                      status?.database?.ok ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {status?.database?.status || "Unknown"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!statusLoading && status?.database?.error && (
            <p className="mt-2 text-[10px] text-rose-500 truncate">{status.database.error}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <Globe className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Headout API</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {statusLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  <>
                    {status?.headout?.available ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span className={cn(
                      "text-xs font-medium capitalize",
                      status?.headout?.available ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {status?.headout?.available ? "Available" : "Unavailable"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top & Bottom pages */}
      {!loading && (stats?.topPages?.length ?? 0) > 0 && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-slate-900">Most Visited Pages</h2>
            </div>
            <div className="space-y-2">
              {stats!.topPages.map((p, i) => (
                <div key={p.pathname} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/30 px-4 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{p.pathname}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                          style={{ width: `${Math.min(100, (p.count / stats!.topPages[0].count) * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-medium text-slate-600">{p.count.toLocaleString()} visit{p.count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-sky-500" />
              <h2 className="text-lg font-semibold text-slate-900">Least Visited Pages</h2>
            </div>
            <div className="space-y-2">
              {stats!.bottomPages.map((p, i) => (
                <div key={p.pathname} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/30 px-4 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{p.pathname}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{p.count.toLocaleString()} visit{p.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Top Countries */}
      {stats?.topCountries && stats.topCountries.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Countries</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {stats.topCountries.map((c) => (
              <div key={c.country} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-bold text-white">
                  {c.country.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.country}</p>
                  <p className="text-xs text-slate-500">{c.count} visitor{c.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
