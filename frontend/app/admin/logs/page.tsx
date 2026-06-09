"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Terminal, AlertTriangle, RefreshCw, Pause, Play } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { notFound } from "next/navigation";
import { getAccessToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const LOG_LEVELS = [
  { value: "", label: "All Levels" },
  { value: "PANIC", label: "Panic" },
  { value: "FATAL", label: "Fatal" },
  { value: "ERROR", label: "Error" },
  { value: "WARN", label: "Warn" },
  { value: "INFO", label: "Info" },
  { value: "DEBUG", label: "Debug" },
  { value: "TRACE", label: "Trace" },
];

export default function AdminLogsPage() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const logsRef = useRef<string[]>([]);
  const liveRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  liveRef.current = live;
  const isSuperadmin = user?.role === "superadmin";

  const matchesFilters = useCallback((line: string) => {
    if (level && !line.toUpperCase().includes(level.toUpperCase())) return false;
    if (search && !line.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }, [level, search]);

  const fetchInitialLogs = useCallback(() => {
    setLoadingLogs(true);
    const params = new URLSearchParams({ tail: "1000" });
    api.get<{ logs: string[]; total: number }>(`/api/v1/admin/logs?${params}`)
      .then((res) => {
        const items = res.logs || [];
        setLogs(items);
        setTotal(items.length);
        logsRef.current = items;
      })
      .catch(() => { })
      .finally(() => setLoadingLogs(false));
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isSuperadmin)) {
      notFound();
    }
  }, [user, loading, isSuperadmin]);

  useEffect(() => {
    if (!isSuperadmin) return;

    fetchInitialLogs();

    const token = getAccessToken();
    if (!token) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    const connect = async () => {
      try {
        const response = await fetch(`/api/v1/admin/logs/stream?token=${token}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setTimeout(connect, 3000);
          return;
        }

        setConnected(true);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const dataLine = part.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;
            const data = dataLine.slice(6);
            if (!data) continue;

            if (liveRef.current) {
              logsRef.current = [data, ...logsRef.current];
              if (logsRef.current.length > 5000) {
                logsRef.current = logsRef.current.slice(0, 5000);
              }
              setLogs(logsRef.current);
              setTotal(logsRef.current.length);
            } else {
              logsRef.current = [data, ...logsRef.current];
              if (logsRef.current.length > 5000) {
                logsRef.current = logsRef.current.slice(0, 5000);
              }
            }
          }
        }
      } catch (err: unknown) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          setConnected(false);
          setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      controller.abort();
      setConnected(false);
    };
  }, [isSuperadmin, fetchInitialLogs]);

  const displayedLogs = live ? logs : logs.filter(matchesFilters);

  const getLogColor = (line: string): string => {
    const upper = line.toUpperCase();
    if (upper.includes("PANIC") || upper.includes("FATAL")) return "text-red-600 bg-red-50";
    if (upper.includes("ERROR")) return "text-red-500 bg-red-50/50";
    if (upper.includes("WARN")) return "text-amber-600 bg-amber-50";
    if (upper.includes("DEBUG")) return "text-blue-600 bg-blue-50";
    if (upper.includes("TRACE")) return "text-purple-600 bg-purple-50";
    return "text-slate-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isSuperadmin) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Logs</h1>
          <p className="mt-1 text-sm text-slate-500">Docker container logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(!live)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              live
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {live ? (
              <><Play className="h-4 w-4 fill-current" /> Live</>
            ) : (
              <><Pause className="h-4 w-4" /> Paused</>
            )}
          </button>
          <button
            onClick={() => { fetchInitialLogs(); setConnected(true); }}
            disabled={loadingLogs}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loadingLogs && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={level ? `Search within ${level} logs...` : "Search all logs..."}
            className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="appearance-none block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          >
            {LOG_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
          <Terminal className="h-3.5 w-3.5" />
          {connected && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className="font-medium">{total} lines</span>
          <span className="text-slate-300">·</span>
          <span>travel-api-gateway</span>
          {level && (
            <>
              <span className="text-slate-300">·</span>
              <span>Filter: {level}</span>
            </>
          )}
          {search && (
            <>
              <span className="text-slate-300">·</span>
              <span>Search: &quot;{search}&quot;</span>
            </>
          )}
          {!live && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-amber-600 font-medium">Paused</span>
            </>
          )}
        </div>

        {loadingLogs ? (
          <div className="space-y-1.5 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-100" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>
        ) : displayedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-500">No logs found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {displayedLogs.map((line, i) => (
              <div
                key={`${line}-${i}-${displayedLogs.length - i}`}
                className={cn(
                  "px-4 py-1 text-xs font-mono leading-relaxed border-b border-slate-50 last:border-0 hover:bg-slate-50/50",
                  getLogColor(line)
                )}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
