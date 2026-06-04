"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, RefreshCw, Loader2, ExternalLink, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";
import { SyncModal } from "@/components/admin/SyncModal";

interface SubcategoryItem {
  id: number;
  subcategory_id: string;
  name: string;
  raw_headout_data: Record<string, unknown> | null;
  last_synced_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const ITEMS_PER_PAGE = 50;

export default function AdminSubcategoriesPage() {
  const [items, setItems] = useState<SubcategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [headoutModal, setHeadoutModal] = useState<Record<string, unknown> | null>(null);
  const [syncModal, setSyncModal] = useState({ open: false, running: false, progress: null as Record<string, unknown> | null, error: null as string | null });

  const fetchItems = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<SubcategoryItem>>(`/api/v1/admin/subcategories?${params}`)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(page, search), 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchItems]);

  const handleSync = useCallback(async () => {
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const res = await api.post<Record<string, unknown>>("/api/v1/admin/subcategories/sync");
      setSyncModal({ open: true, running: false, progress: res, error: null });
      fetchItems(page, search);
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [page, search, fetchItems]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subcategories</h1>
          <p className="mt-1 text-sm text-slate-500">Manage Headout subcategories synced from API</p>
        </div>
        <button onClick={handleSync} disabled={syncModal.running} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50">
          {syncModal.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncModal.running ? "Syncing..." : "Sync Subcategories"}
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or ID..." className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" />
      </div>

      {!loading && items.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} className="border-b border-slate-100" />
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <p className="text-sm font-medium text-slate-500">No subcategories found</p>
          <button onClick={handleSync} disabled={syncModal.running} className="mt-4 flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Sync from Headout</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Last Synced</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500"> </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.subcategory_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell text-xs">{item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right"><ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform inline-block", expandedId === item.id && "rotate-180")} /></td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === item.id && (
                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                          <td colSpan={4} className="bg-slate-50/50 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Subcategory ID</span>
                                    <span className="text-xs font-medium text-slate-700 font-mono">{item.subcategory_id}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Name</span>
                                    <span className="text-xs font-medium text-slate-700">{item.name}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Synced At</span>
                                    <span className="text-xs font-medium text-slate-700">{item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : "—"}</span>
                                  </div>
                                </div>
                              </div>
                              {item.raw_headout_data && Object.keys(item.raw_headout_data).length > 0 && (
                                <div className="col-span-full flex justify-end">
                                  <button onClick={(e) => { e.stopPropagation(); setHeadoutModal(item.raw_headout_data as Record<string, unknown>); }} className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100">
                                    <ExternalLink className="h-3 w-3" /> See Raw Headout API Response
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setPage} className="border-t border-slate-100 mt-6" />

      <AnimatePresence>
        {headoutModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setHeadoutModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Raw Headout API Response</h2>
                <button onClick={() => setHeadoutModal(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="overflow-auto p-6">
                <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-100 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{JSON.stringify(headoutModal, null, 2)}</pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SyncModal open={syncModal.open} onClose={() => setSyncModal({ open: false, running: false, progress: null, error: null })} title="Subcategories" progress={syncModal.progress} error={syncModal.error} running={syncModal.running} />
    </motion.div>
  );
}
