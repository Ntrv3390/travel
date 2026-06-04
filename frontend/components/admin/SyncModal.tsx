"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface SyncProgress {
  total?: number;
  added?: number;
  updated?: number;
  failed?: number;
  status?: string;
  [key: string]: unknown;
}

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  progress: SyncProgress | null;
  error: string | null;
  running: boolean;
}

export function SyncModal({ open, onClose, title, progress, error, running }: SyncModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="text-center">
              {running ? (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              ) : error ? (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              )}

              <h2 className="text-lg font-bold text-slate-900">
                {running ? "Syncing" : error ? "Sync Failed" : "Sync Completed"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{title}</p>

              {running && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-medium text-amber-700">
                      Please do not close this page while syncing
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {progress && !running && (() => {
                const extras: { label: string; value: number }[] = [];
                if (progress.product_added !== undefined) extras.push({ label: "Products Added", value: progress.product_added as number });
                if (progress.product_updated !== undefined) extras.push({ label: "Products Updated", value: progress.product_updated as number });
                if (progress.product_failed !== undefined && (progress.product_failed as number) > 0) extras.push({ label: "Products Failed", value: progress.product_failed as number });
                if (progress.avail_added !== undefined) extras.push({ label: "Availabilities Added", value: progress.avail_added as number });
                if (progress.avail_updated !== undefined) extras.push({ label: "Availabilities Updated", value: progress.avail_updated as number });
                if (progress.avail_failed !== undefined && (progress.avail_failed as number) > 0) extras.push({ label: "Availabilities Failed", value: progress.avail_failed as number });

                return (
                  <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    {progress.total !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Total</span>
                        <span className="font-medium text-slate-900">{progress.total}</span>
                      </div>
                    )}
                    {progress.added !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Added</span>
                        <span className="font-medium text-emerald-600">+{progress.added}</span>
                      </div>
                    )}
                    {progress.updated !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Updated</span>
                        <span className="font-medium text-sky-600">~{progress.updated}</span>
                      </div>
                    )}
                    {progress.failed !== undefined && (progress.failed as number) > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Failed</span>
                        <span className="font-medium text-red-600">✗{progress.failed}</span>
                      </div>
                    )}
                    {extras.length > 0 && <div className="border-t border-slate-200 pt-2" />}
                    {extras.map((e) => (
                      <div key={e.label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{e.label}</span>
                        <span className="font-medium text-slate-900">{e.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {!running && (
              <div className="mt-6">
                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
