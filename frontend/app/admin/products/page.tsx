"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Package, RefreshCw, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";

interface Product {
  id: number;
  headout_id: string;
  title: string;
  description: string;
  city_code: string;
  city_name: string;
  category: string;
  image_url: string;
  currency: string;
  price_from: number;
  rating: number;
  review_count: number;
  duration: string;
  raw_headout_data: Record<string, unknown> | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

interface ProductAvailability {
  id: number;
  product_id: number;
  headout_product_id: string;
  variant_id: string;
  variant_title: string;
  date: string;
  start_time: string;
  end_time: string;
  inventory_id: string;
  inventory_type: string;
  price_amount: number;
  currency: string;
  available_slots: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const ITEMS_PER_PAGE = 50;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [individualSyncing, setIndividualSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availabilities, setAvailabilities] = useState<Record<number, ProductAvailability[]>>({});
  const [loadingAvail, setLoadingAvail] = useState<Record<number, boolean>>({});

  const fetchProducts = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<Product>>(`/api/v1/admin/products?${params}`)
      .then((res) => {
        setProducts(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchProducts]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const pollSyncStatus = useCallback(async (syncId: string, interval = 2000): Promise<Record<string, unknown>> => {
    while (true) {
      const status = await api.get<Record<string, unknown>>(`/api/v1/admin/products/sync-status?sync_id=${syncId}`);
      if (status.status !== "running") return status;
      await new Promise((r) => setTimeout(r, interval));
    }
  }, []);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { sync_id } = await api.post<{ sync_id: string }>("/api/v1/admin/products/sync");
      const res = await pollSyncStatus(sync_id);
      setSyncResult(`Sync completed — Total: ${res.total}, Added: ${res.added}, Updated: ${res.updated}, Failed: ${res.failed}`);
      fetchProducts(page, search);
    } catch (err) {
      setSyncResult("Sync failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSyncing(false);
    }
  }, [page, search, fetchProducts, pollSyncStatus]);

  const handleSyncAllIndividual = useCallback(async () => {
    setIndividualSyncing(true);
    setSyncResult(null);
    try {
      const { sync_id } = await api.post<{ sync_id: string }>("/api/v1/admin/products/sync-all-individual");
      const res = await pollSyncStatus(sync_id);
      setSyncResult(
        `Sync completed — Products: +${res.product_added}/~${res.product_updated}/✗${res.product_failed}, ` +
        `Availabilities: +${res.avail_added}/~${res.avail_updated}/✗${res.avail_failed}`
      );
      fetchProducts(page, search);
    } catch (err) {
      setSyncResult("Sync failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIndividualSyncing(false);
    }
  }, [page, search, fetchProducts, pollSyncStatus]);

  const handleSyncSingle = useCallback(async (headoutId: string) => {
    setSyncingId(headoutId);
    try {
      const res = await api.post<{
        product: { added: boolean; updated: boolean };
        availabilities: { added: number; updated: number; failed: number };
        total: number;
      }>(`/api/v1/admin/products/${headoutId}/sync`);
      setSyncResult(
        `Synced product — ${res.product.added ? "Added" : "Updated"} product, ` +
        `Availabilities: +${res.availabilities.added} / ~${res.availabilities.updated} / ✗${res.availabilities.failed}`
      );
      fetchProducts(page, search);
    } catch (err) {
      setSyncResult("Sync failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSyncingId(null);
    }
  }, [page, search, fetchProducts]);

  const loadAvailabilities = useCallback(async (prodId: number) => {
    if (availabilities[prodId]) return;
    setLoadingAvail((prev) => ({ ...prev, [prodId]: true }));
    try {
      const res = await api.get<{ items: ProductAvailability[] }>(`/api/v1/admin/products/${prodId}/availabilities`);
      setAvailabilities((prev) => ({ ...prev, [prodId]: res.items || [] }));
    } catch {
      setAvailabilities((prev) => ({ ...prev, [prodId]: [] }));
    } finally {
      setLoadingAvail((prev) => ({ ...prev, [prodId]: false }));
    }
  }, [availabilities]);

  const handleExpand = useCallback((id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    loadAvailabilities(id);
  }, [expandedId, loadAvailabilities]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage products synced from Headout</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncAllIndividual}
            disabled={individualSyncing}
            className="flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {individualSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {individualSyncing ? "Syncing..." : "Sync All Individual Products"}
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? "Syncing..." : "Sync All Products"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={cn(
          "mb-4 rounded-xl border px-4 py-3 text-sm",
          syncResult.includes("failed") && !syncResult.includes("Failed: 0")
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          {syncResult}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by title, Headout ID, city, or category..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {/* Top Pagination */}
      {!loading && products.length > 0 && (
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
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <Package className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-500">No products found</p>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
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
                  <th className="px-4 py-3 text-left font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">City</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Sync</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500"> </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr
                      onClick={() => handleExpand(product.id)}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{product.headout_id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{product.title}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{product.city_name || product.city_code}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell max-w-[120px] truncate">{product.category || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 hidden sm:table-cell font-mono text-xs">
                        {product.price_from > 0 ? `${product.currency || "USD"} ${product.price_from.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSyncSingle(product.headout_id); }}
                          disabled={syncingId === product.headout_id}
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-sky-100 hover:text-sky-600 disabled:opacity-50"
                        >
                          {syncingId === product.headout_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          {syncingId === product.headout_id ? "..." : "Sync"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-slate-400 transition-transform inline-block",
                          expandedId === product.id && "rotate-180"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === product.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={7} className="bg-slate-50/50 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {product.image_url && (
                                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Image</p>
                                  <img
                                    src={product.image_url}
                                    alt={product.title}
                                    className="h-32 w-full rounded-lg object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              )}
                              <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Headout ID</span>
                                    <span className="text-xs font-medium text-slate-700 font-mono">{product.headout_id}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">City</span>
                                    <span className="text-xs font-medium text-slate-700">{product.city_name || product.city_code || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Category</span>
                                    <span className="text-xs font-medium text-slate-700">{product.category || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Price From</span>
                                    <span className="text-xs font-medium text-slate-700">
                                      {product.price_from > 0 ? `${product.currency || "USD"} ${product.price_from.toFixed(2)}` : "—"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Rating</span>
                                    <span className="text-xs font-medium text-slate-700">
                                      {product.rating > 0 ? `${product.rating.toFixed(1)} (${product.review_count})` : "—"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Duration</span>
                                    <span className="text-xs font-medium text-slate-700">{product.duration || "—"}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-500">Synced At</span>
                                    <span className="text-xs font-medium text-slate-700">
                                      {product.last_synced_at ? new Date(product.last_synced_at).toLocaleString() : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {product.raw_headout_data && (
                                <div className="col-span-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Raw Headout Data</p>
                                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 font-mono leading-relaxed">
                                    {JSON.stringify(product.raw_headout_data, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Availabilities section */}
                              <div className="col-span-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Availabilities & Pricing
                                </p>
                                {loadingAvail[product.id] ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                  </div>
                                ) : availabilities[product.id]?.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-100">
                                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Variant</th>
                                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Date</th>
                                          <th className="px-2 py-1.5 text-left font-medium text-slate-500">Time</th>
                                          <th className="px-2 py-1.5 text-right font-medium text-slate-500">Price</th>
                                          <th className="px-2 py-1.5 text-right font-medium text-slate-500">Slots</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {availabilities[product.id].slice(0, 10).map((avail) => (
                                          <tr key={avail.id} className="border-b border-slate-50">
                                            <td className="px-2 py-1.5 text-slate-700 max-w-[120px] truncate">{avail.variant_title || avail.variant_id}</td>
                                            <td className="px-2 py-1.5 text-slate-700">{avail.date}</td>
                                            <td className="px-2 py-1.5 text-slate-700">{avail.start_time ? `${avail.start_time} - ${avail.end_time || "?"}` : "—"}</td>
                                            <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                                              {avail.price_amount > 0 ? `${avail.currency || "USD"} ${avail.price_amount.toFixed(2)}` : "—"}
                                            </td>
                                            <td className="px-2 py-1.5 text-right">
                                              <span className={cn(
                                                "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                                                avail.available_slots > 10
                                                  ? "bg-emerald-50 text-emerald-700"
                                                  : avail.available_slots > 0
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-red-50 text-red-700"
                                              )}>
                                                {avail.available_slots}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {availabilities[product.id].length > 10 && (
                                      <p className="mt-2 text-center text-xs text-slate-400">
                                        + {availabilities[product.id].length - 10} more slots
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="text-center">
                                      <p className="text-xs text-slate-400">No availability data synced yet</p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSyncSingle(product.headout_id); }}
                                        disabled={syncingId === product.headout_id}
                                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-50"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                        Sync now
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
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
            {products.map((product) => (
              <div key={product.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 truncate max-w-[180px]">{product.title}</span>
                  <span className="font-mono text-xs text-slate-500">{product.headout_id}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{product.city_name || product.city_code}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleSyncSingle(product.headout_id)}
                    disabled={syncingId === product.headout_id}
                    className="flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync
                  </button>
                </div>
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
    </motion.div>
  );
}
