"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Database, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SyncJob {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  type: string;
  total_products: number;
  processed_products: number;
  successful_products: number;
  failed_products: number;
  products_discovered: number;
  slots_stored: number;
  products_skipped: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface InventoryStats {
  total_products: number;
  available_products: number;
  total_slots: number;
  slots_with_remaining_capacity: number;
  total_local_bookings: number;
  last_sync_at?: string;
  last_sync_products: number;
  fetch_fresh: string;
}

function useSyncJob(endpoint: string) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SyncJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef<(() => void) | undefined>(undefined);

  const onComplete = useCallback(() => {
    setSuccess(true);
    setJobId(null);
    setTimeout(() => setSuccess(false), 8000);
    onDoneRef.current?.();
    onDoneRef.current = undefined;
  }, []);

  useEffect(() => {
    if (!jobId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const j = await api.get<SyncJob>(`/api/v1/admin/sync/jobs/${jobId}`);
        setJob(j);
        if (j.status === "completed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          onComplete();
        } else if (j.status === "failed" || j.status === "cancelled") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setError(j.error_message || "Sync failed");
          setJobId(null);
        }
      } catch {
        // ignore transient poll errors
      }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, onComplete]);

  const start = useCallback(async (onDone?: () => void) => {
    onDoneRef.current = onDone;
    setStarting(true);
    setError(null);
    setSuccess(false);
    setJob(null);
    try {
      const res = await api.post<{ job_id: string }>(endpoint);
      setJobId(res.job_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }, [endpoint]);

  const cancel = useCallback(async () => {
    if (!jobId) return;
    try {
      await api.post(`/api/v1/admin/sync/jobs/${jobId}/cancel`);
      setJobId(null);
      setJob(null);
    } catch {
      // ignore
    }
  }, [jobId]);

  return { jobId, job, starting, error, success, setError, start, cancel };
}

export default function AdminSettingsPage() {
  const [fetchFresh, setFetchFresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<InventoryStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.get<InventoryStats>("/api/v1/admin/sync/inventory/stats");
      setStats(s);
    } catch {
      // non-fatal
    }
  }, []);

  const inventory = useSyncJob("/api/v1/admin/sync/inventory");
  const metadata = useSyncJob("/api/v1/admin/sync/metadata");

  useEffect(() => {
    api.get<{ key: string; value: string }>("/api/v1/admin/settings?key=fetch_fresh")
      .then((res) => {
        setFetchFresh(res.value === "true");
        setSettingsError(null);
      })
      .catch(() => setSettingsError("Failed to load settings"))
      .finally(() => setLoading(false));
    loadStats();
  }, [loadStats]);

  const toggleFetchFresh = useCallback(async () => {
    const newValue = !fetchFresh;
    setSaving(true);
    try {
      await api.put("/api/v1/admin/settings", { key: "fetch_fresh", value: String(newValue) });
      setFetchFresh(newValue);
      setSettingsError(null);
    } catch {
      setSettingsError("Failed to update setting");
    } finally {
      setSaving(false);
    }
  }, [fetchFresh]);

  const inventoryRunning = !!inventory.jobId;
  const metadataRunning = !!metadata.jobId;
  const anyRunning = inventoryRunning || metadataRunning;

  const inventoryProgress = inventory.job && inventory.job.total_products > 0
    ? Math.round((inventory.job.processed_products / inventory.job.total_products) * 100)
    : null;

  const metadataProgress = metadata.job && metadata.job.total_products > 0
    ? Math.round((metadata.job.processed_products / metadata.job.total_products) * 100)
    : null;

  const formatDate = (iso?: string) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  };

  const inventoryLabel = fetchFresh ? "Sync Inventory" : "Restore Snapshot";
  const inventoryDesc = fetchFresh
    ? "Sync all products, availability and pricing from Headout into the local database."
    : "Restore 6-month availability snapshot from DB records.";
  const inventorySuccessText = fetchFresh
    ? `Sync complete — ${inventory.job?.products_discovered ?? stats?.last_sync_products ?? 0} products, ${inventory.job?.slots_stored ?? 0} slots stored.`
    : `Snapshot restored — ${inventory.job?.products_discovered ?? 0} products, ${inventory.job?.slots_stored ?? 0} slots generated (180 days each).`;

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
        {settingsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {settingsError}
          </div>
        )}

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
                    : "Data is served from local DB snapshot (GTTD mode)"}
                </p>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12 rounded-full" />
            ) : (
              <button
                onClick={toggleFetchFresh}
                disabled={saving}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50",
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

        {/* Sync Metadata — always available; first-time setup before snapshot mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sync Metadata</h2>
              <p className="text-xs text-slate-500">
                Fetch product metadata and variant IDs from Headout. Run this once to populate the
                database before switching to snapshot mode.
              </p>
            </div>
          </div>

          {metadata.success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Metadata synced — {metadata.job?.products_discovered ?? 0} products, variant stubs written.
              </span>
            </div>
          )}

          {metadata.error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{metadata.error}</span>
              <button onClick={() => metadata.setError(null)} className="ml-auto text-xs underline hover:no-underline">
                Dismiss
              </button>
            </div>
          )}

          {metadataRunning && metadata.job && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{metadata.job.processed_products} / {metadata.job.total_products || "?"} products</span>
                {metadataProgress !== null && <span>{metadataProgress}%</span>}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                  style={{ width: metadataProgress !== null ? `${metadataProgress}%` : "100%" }}
                />
              </div>
              {metadataProgress === null && (
                <p className="text-xs text-slate-400">Discovering products…</p>
              )}
            </div>
          )}

          {metadataRunning && !metadata.job && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Starting metadata sync…</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {metadataRunning && (
              <button onClick={metadata.cancel} className="text-xs text-slate-500 underline hover:no-underline">
                Cancel
              </button>
            )}
            <button
              onClick={() => metadata.start(loadStats)}
              disabled={anyRunning || metadata.starting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {metadataRunning || metadata.starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {metadataRunning ? "Syncing…" : metadata.starting ? "Starting…" : "Sync Metadata"}
            </button>
          </div>
        </motion.div>

        {/* Sync Inventory / Restore Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {fetchFresh ? "Sync Inventory" : "Restore Snapshot"}
              </h2>
              <p className="text-xs text-slate-500">{inventoryDesc}</p>
            </div>
          </div>

          {inventory.success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{inventorySuccessText}</span>
            </div>
          )}

          {inventory.error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{inventory.error}</span>
              <button onClick={() => inventory.setError(null)} className="ml-auto text-xs underline hover:no-underline">
                Dismiss
              </button>
            </div>
          )}

          {inventoryRunning && inventory.job && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {inventory.job.processed_products} / {inventory.job.total_products || "?"} products
                  {inventory.job.slots_stored > 0 && ` · ${inventory.job.slots_stored.toLocaleString()} slots`}
                </span>
                {inventoryProgress !== null && <span>{inventoryProgress}%</span>}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: inventoryProgress !== null ? `${inventoryProgress}%` : "100%" }}
                />
              </div>
              {inventoryProgress === null && (
                <p className="text-xs text-slate-400">
                  {fetchFresh ? "Discovering products…" : "Generating availability slots…"}
                </p>
              )}
            </div>
          )}

          {inventoryRunning && !inventory.job && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Starting…</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {stats?.last_sync_at
                ? `Last synced ${formatDate(stats.last_sync_at)}${stats.last_sync_products ? ` · ${stats.last_sync_products.toLocaleString()} products` : ""}`
                : "Never synced"}
              {stats && (
                <span className="ml-2 text-slate-300">
                  · {stats.total_slots.toLocaleString()} slots in DB
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              {inventoryRunning && (
                <button onClick={inventory.cancel} className="text-xs text-slate-500 underline hover:no-underline">
                  Cancel
                </button>
              )}
              <button
                onClick={() => inventory.start(loadStats)}
                disabled={anyRunning || inventory.starting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inventoryRunning || inventory.starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Database className="h-4 w-4" />
                )}
                {inventoryRunning ? "Running…" : inventory.starting ? "Starting…" : inventoryLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
