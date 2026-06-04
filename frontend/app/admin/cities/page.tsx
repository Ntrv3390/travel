"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, MapPin, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/admin/Pagination";
import { SyncModal } from "@/components/admin/SyncModal";
import { cn } from "@/lib/utils";

interface City {
  id: number;
  code: string;
  name: string;
  image_url: string;
  country_code: string;
  country_name: string;
  timezone: string;
  raw_headout_data: Record<string, unknown> | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const ITEMS_PER_PAGE = 50;

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncModal, setSyncModal] = useState({ open: false, running: false, progress: null as Record<string, unknown> | null, error: null as string | null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchCities = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<City>>(`/api/v1/admin/cities?${params}`)
      .then((res) => {
        setCities(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCities(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchCities]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const handleSync = useCallback(async () => {
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const res = await api.post<{ total: number; added: number; updated: number; failed: number }>("/api/v1/admin/cities/sync");
      setSyncModal({ open: true, running: false, progress: res, error: null });
      fetchCities(page, search);
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [page, search, fetchCities]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
          <p className="mt-1 text-sm text-slate-500">Manage cities synced from Headout</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncModal.running}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncModal.running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {syncModal.running ? "Syncing..." : "Sync Cities"}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by city name, code, or country..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {/* Top Pagination */}
      {!loading && cities.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          className="border-b border-slate-100"
        />
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : cities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <MapPin className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-500">No cities found</p>
          <button
            onClick={handleSync}
            disabled={syncModal.running}
            className="mt-4 flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Sync from Headout
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Country</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">Timezone</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Last Synced</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500"> </th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <React.Fragment key={city.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === city.id ? null : city.id)}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{city.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{city.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{city.country_name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{city.timezone || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {city.last_synced_at ? new Date(city.last_synced_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-slate-400 transition-transform inline-block",
                          expandedId === city.id && "rotate-180"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === city.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6} className="bg-slate-50/50 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {city.image_url && (
                                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Image</p>
                                  <img
                                    src={city.image_url}
                                    alt={city.name}
                                    className="h-32 w-full rounded-lg object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              )}
                              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Code</span>
                                    <span className="text-xs font-medium text-slate-700 font-mono">{city.code}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Country Code</span>
                                    <span className="text-xs font-medium text-slate-700">{city.country_code || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Country</span>
                                    <span className="text-xs font-medium text-slate-700">{city.country_name || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Timezone</span>
                                    <span className="text-xs font-medium text-slate-700">{city.timezone || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Synced At</span>
                                    <span className="text-xs font-medium text-slate-700">
                                      {city.last_synced_at ? new Date(city.last_synced_at).toLocaleString() : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {city.raw_headout_data && (
                                <div className="col-span-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Raw Headout Data</p>
                                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 font-mono leading-relaxed">
                                    {JSON.stringify(city.raw_headout_data, null, 2)}
                                  </pre>
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

          {/* Mobile cards */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {cities.map((city) => (
              <div key={city.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{city.name}</span>
                  <span className="font-mono text-xs text-slate-500">{city.code}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{city.country_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setPage}
        className="border-t border-slate-100 mt-6"
      />

      <SyncModal
        open={syncModal.open}
        onClose={() => setSyncModal({ open: false, running: false, progress: null, error: null })}
        title="Cities"
        progress={syncModal.progress}
        error={syncModal.error}
        running={syncModal.running}
      />
    </motion.div>
  );
}
