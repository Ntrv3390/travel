"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Package, RefreshCw, Loader2, ExternalLink, X, Check, Ban, AlertTriangle, BarChart3 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/admin/Pagination";
import { SyncModal } from "@/components/admin/SyncModal";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  is_available: boolean;
  last_availability_sync_at: string | null;
  raw_headout_data: Record<string, unknown> | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

interface AvailabilityInsights {
  total: number;
  available: number;
  unavailable: number;
  products?: Array<{
    id: number;
    headout_id: string;
    title: string;
    city_name: string;
    category: string;
    image_url: string;
    is_available: boolean;
    last_availability_sync_at: string | null;
  }>;
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
  const [syncModal, setSyncModal] = useState({ open: false, running: false, progress: null as Record<string, unknown> | null, error: null as string | null });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [availabilities, setAvailabilities] = useState<Record<number, ProductAvailability[]>>({});
  const [loadingAvail, setLoadingAvail] = useState<Record<number, boolean>>({});
  const [productDetails, setProductDetails] = useState<Record<number, Record<string, unknown>>>({});
  const [loadingDetail, setLoadingDetail] = useState<Record<number, boolean>>({});
  const [headoutModal, setHeadoutModal] = useState<{ data: Record<string, unknown> | null; loading: boolean; error: string } | null>(null);
  const [availabilityInsights, setAvailabilityInsights] = useState<AvailabilityInsights | null>(null);
  const [showUnavailableList, setShowUnavailableList] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedAvailDate, setSelectedAvailDate] = useState<string | null>(null);
  const [selectedAvailVariant, setSelectedAvailVariant] = useState<string | null>(null);

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

  const fetchAvailabilityInsights = useCallback(async () => {
    try {
      const res = await api.get<AvailabilityInsights>("/api/v1/admin/products/availability-insights?include_list=true");
      setAvailabilityInsights(res);
    } catch {
      // Silently fail - insights are optional
    }
  }, []);

  useEffect(() => {
    fetchAvailabilityInsights();
  }, [fetchAvailabilityInsights]);

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
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const { sync_id } = await api.post<{ sync_id: string }>("/api/v1/admin/products/sync");
      const res = await pollSyncStatus(sync_id);
      setSyncModal({ open: true, running: false, progress: res, error: null });
      fetchProducts(page, search);
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [page, search, fetchProducts, pollSyncStatus]);

  const handleSyncAllIndividual = useCallback(async () => {
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const { sync_id } = await api.post<{ sync_id: string }>("/api/v1/admin/products/sync-all-individual");
      const res = await pollSyncStatus(sync_id);
      setSyncModal({
        open: true,
        running: false,
        progress: {
          total: (res.product_added as number || 0) + (res.product_updated as number || 0) + (res.product_failed as number || 0) + (res.avail_added as number || 0) + (res.avail_updated as number || 0) + (res.avail_failed as number || 0),
          added: (res.product_added as number || 0) + (res.avail_added as number || 0),
          updated: (res.product_updated as number || 0) + (res.avail_updated as number || 0),
          failed: (res.product_failed as number || 0) + (res.avail_failed as number || 0),
          product_added: res.product_added,
          product_updated: res.product_updated,
          product_failed: res.product_failed,
          avail_added: res.avail_added,
          avail_updated: res.avail_updated,
          avail_failed: res.avail_failed,
        },
        error: null,
      });
      fetchProducts(page, search);
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, [page, search, fetchProducts, pollSyncStatus]);

  const handleSyncAllAvailability = useCallback(async () => {
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const { sync_id } = await api.post<{ sync_id: string }>("/api/v1/admin/products/sync-availability-all");
      const res = await pollSyncStatus(sync_id);
      setSyncModal({
        open: true,
        running: false,
        progress: {
          total: (res.total_products as number) || 0,
          added: (res.availabilities_added as number) || 0,
          updated: 0,
          failed: (res.failed as number) || 0,
          available: res.available,
          unavailable: res.unavailable,
        },
        error: null,
      });
      fetchProducts(page, search);
      fetchAvailabilityInsights();
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Availability sync failed" });
    }
  }, [page, search, fetchProducts, fetchAvailabilityInsights, pollSyncStatus]);

  const handleSyncSingle = useCallback(async (headoutId: string) => {
    setSyncModal({ open: true, running: true, progress: null, error: null });
    try {
      const res = await api.post<{
        product: { added: boolean; updated: boolean };
        availabilities: { added: number; updated: number; failed: number };
        total: number;
      }>(`/api/v1/admin/products/${headoutId}/sync`);
      setSyncModal({
        open: true,
        running: false,
        progress: {
          total: res.total || 0,
          added: res.product.added ? 1 : 0,
          updated: res.product.updated ? 1 : 0,
          failed: res.availabilities.failed || 0,
          product_added: res.product.added ? 1 : 0,
          product_updated: res.product.updated ? 1 : 0,
          avail_added: res.availabilities.added || 0,
          avail_updated: res.availabilities.updated || 0,
          avail_failed: res.availabilities.failed || 0,
        },
        error: null,
      });
      fetchProducts(page, search);
    } catch (err) {
      setSyncModal({ open: true, running: false, progress: null, error: err instanceof Error ? err.message : "Unknown error" });
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

  const loadProductDetail = useCallback(async (headoutId: string, prodId: number) => {
    if (productDetails[prodId]) return;
    setLoadingDetail((prev) => ({ ...prev, [prodId]: true }));
    try {
      const res = await api.get<Record<string, unknown>>(`/api/v1/headout/v2/products/${headoutId}`);
      setProductDetails((prev) => ({ ...prev, [prodId]: res }));
    } catch {
      setProductDetails((prev) => ({ ...prev, [prodId]: {} }));
    } finally {
      setLoadingDetail((prev) => ({ ...prev, [prodId]: false }));
    }
  }, [productDetails]);

  const viewFullResponse = useCallback((prodId: number) => {
    const data = productDetails[prodId];
    setHeadoutModal({ data: data || null, loading: false, error: data ? "" : "No detail data available" });
  }, [productDetails]);

  const handleExpand = useCallback((id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const product = products.find((p) => p.id === id);
    setExpandedId(id);
    loadAvailabilities(id);
    if (product) {
      loadProductDetail(product.headout_id, id);
    }
  }, [expandedId, loadAvailabilities, loadProductDetail, products]);

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
            onClick={handleSyncAllAvailability}
            disabled={syncModal.running}
            className="flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncModal.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            {syncModal.running ? "Syncing..." : "Sync Availability"}
          </button>
          <button
            onClick={handleSyncAllIndividual}
            disabled={syncModal.running}
            className="flex items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncModal.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncModal.running ? "Syncing..." : "Sync All Individual Products"}
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncModal.running}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncModal.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncModal.running ? "Syncing..." : "Sync All Products"}
          </button>
        </div>
      </div>

      {/* Availability Insights */}
      {availabilityInsights && (
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Availability Insights</h2>
            <button
              onClick={() => setShowUnavailableList(!showUnavailableList)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
            >
              {showUnavailableList ? "Hide List" : "Show Unavailable Products"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-900">{availabilityInsights.total}</p>
              <p className="text-xs text-slate-500">Total Products</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-600">{availabilityInsights.available}</p>
              <p className="text-xs text-emerald-600">Available</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-600">{availabilityInsights.unavailable}</p>
              <p className="text-xs text-red-600">Unavailable</p>
            </div>
          </div>

          {/* Unavailable Products List */}
          <AnimatePresence>
            {showUnavailableList && availabilityInsights.products && availabilityInsights.products.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                  {availabilityInsights.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.headout_id}`}
                      className="flex items-center gap-3 border-b border-slate-50 p-3 transition-colors hover:bg-slate-50 last:border-b-0"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.title}</p>
                        <p className="text-xs text-slate-500">{product.city_name || product.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          No Availability
                        </span>
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
            {showUnavailableList && availabilityInsights.products && availabilityInsights.products.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center py-8"
              >
                <p className="text-sm text-slate-500">All products have availability!</p>
              </motion.div>
            )}
          </AnimatePresence>
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
                  <th className="px-4 py-3 text-left font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">City</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Sync</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Status</th>
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
                          disabled={syncModal.running}
                          className="text-xs font-medium text-sky-700 whitespace-nowrap"
                        >
                          {syncModal.running ? "..." : "Sync"}
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          product.is_available !== false
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}>
                          {product.is_available !== false ? "Available" : "Unavailable"}
                        </span>
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
                                {loadingDetail[product.id] ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Headout ID</span>
                                      <span className="text-xs font-medium text-slate-700 font-mono">{product.headout_id}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Name</span>
                                      <span className="text-xs font-medium text-slate-700 text-right max-w-[200px] truncate">
                                        {(productDetails[product.id]?.name as string) || product.title || "—"}
                                      </span>
                                    </div>
                                    {(() => {
                                      const desc = productDetails[product.id]?.description;
                                      if (!desc || typeof desc !== "string") return null;
                                      return (
                                        <div className="pt-1">
                                          <span className="text-xs text-slate-500 block mb-1">Description</span>
                                          <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">{desc}</p>
                                        </div>
                                      );
                                    })()}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                      <span className="text-xs text-slate-500">City</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {(() => {
                                          const city = productDetails[product.id]?.city as { code?: string; name?: string } | undefined;
                                          return city?.name || city?.code || product.city_name || product.city_code || "—";
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Category</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {(productDetails[product.id]?.category as string) || product.category || "—"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Price From</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {(() => {
                                          const lp = productDetails[product.id]?.listingPrice as { minimumPrice?: { finalPrice?: number }; currencyCode?: string } | undefined;
                                          const price = lp?.minimumPrice?.finalPrice || product.price_from;
                                          const currency = lp?.currencyCode || product.currency || "USD";
                                          return price > 0 ? `${currency} ${price.toFixed(2)}` : "—";
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Rating</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {(() => {
                                          const rs = productDetails[product.id]?.reviewsSummary as { averageRating?: number; ratingsCount?: number } | undefined;
                                          const rating = rs?.averageRating || product.rating;
                                          const count = rs?.ratingsCount || product.review_count;
                                          return rating > 0 ? `${rating.toFixed(1)} (${count})` : "—";
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Duration</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {(productDetails[product.id]?.duration as string) || product.duration || "—"}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-slate-500">Synced At</span>
                                      <span className="text-xs font-medium text-slate-700">
                                        {product.last_synced_at ? new Date(product.last_synced_at).toLocaleString() : "—"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Extra fields from product detail API */}
                              {(() => {
                                const pd = productDetails[product.id] as Record<string, unknown> | undefined;
                                if (!pd) return null;

                                const knownKeys = new Set(["id", "name", "description", "city", "category", "media", "listingPrice", "reviewsSummary", "duration"]);
                                const extraKeys = Object.keys(pd).filter(k => !knownKeys.has(k) && pd[k] != null);
                                if (extraKeys.length === 0) return null;

                                const formatLabel = (k: string) =>
                                  k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();

                                return extraKeys.map(key => {
                                  const val = pd[key];
                                  if (Array.isArray(val) && val.length > 0) {
                                    const isIncluded = key === "whatsIncluded" || key === "includes";
                                    const isExcluded = key === "excludes";
                                    const isHighlight = key === "highlights";
                                    return (
                                      <div key={key} className="col-span-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{formatLabel(key)}</p>
                                        <ul className="space-y-1">
                                          {val.map((item: unknown, i: number) => {
                                            let label: string;
                                            let included = true;
                                            if (typeof item === "string") {
                                              label = item;
                                            } else {
                                              const obj = item as Record<string, unknown>;
                                              label = (obj?.name || obj?.title || obj?.description || "") as string;
                                              included = obj?.included !== false;
                                            }
                                            if (!label) label = JSON.stringify(item);
                                            return (
                                              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                                {isHighlight && <span className="mt-0.5 shrink-0 text-amber-500">✦</span>}
                                                {isExcluded && <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />}
                                                {isIncluded && (included
                                                  ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                                  : <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                                                )}
                                                {!isHighlight && !isExcluded && !isIncluded && (
                                                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-sky-100" />
                                                )}
                                                {label}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    );
                                  }
                                  if (typeof val === "string" && val.length > 0) {
                                    return (
                                      <div key={key} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{formatLabel(key)}</p>
                                        <p className="text-xs text-slate-700 leading-relaxed">{val}</p>
                                      </div>
                                    );
                                  }
                                  if (typeof val === "object" && val !== null) {
                                    const sub = val as Record<string, unknown>;
                                    const subKeys = Object.keys(sub).filter(k => sub[k] != null);
                                    if (subKeys.length === 0) return null;
                                    return (
                                      <div key={key} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{formatLabel(key)}</p>
                                        <div className="space-y-1">
                                          {subKeys.map(sk => {
                                            const sv = sub[sk];
                                            const svStr = typeof sv === "object" && sv !== null ? JSON.stringify(sv) : String(sv ?? "");
                                            return (
                                              <div key={sk} className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-500 capitalize">{sk.replace(/([A-Z])/g, " $1").trim()}</span>
                                                <span className="text-xs font-medium text-slate-700 text-right max-w-[200px] truncate">{svStr}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                });
                              })()}

                              {/* View Headout Raw JSON */}
                              {productDetails[product.id] && Object.keys(productDetails[product.id]).length > 0 && (
                                <div className="col-span-full flex justify-end">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); viewFullResponse(product.id); }}
                                    className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View Headout Raw JSON
                                  </button>
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
                                  <AvailabilityCalendarView
                                    availabilities={availabilities[product.id]}
                                    selectedVariant={selectedAvailVariant}
                                    onSelectVariant={setSelectedAvailVariant}
                                    calYear={calYear}
                                    calMonth={calMonth}
                                    onCalYearChange={setCalYear}
                                    onCalMonthChange={setCalMonth}
                                    selectedDate={selectedAvailDate}
                                    onSelectDate={setSelectedAvailDate}
                                    currency={product.currency || "USD"}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="text-center">
                                      <p className="text-xs text-slate-400">No availability data synced yet</p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSyncSingle(product.headout_id); }}
                                        disabled={syncModal.running}
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
                    disabled={syncModal.running}
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

      <SyncModal
        open={syncModal.open}
        onClose={() => setSyncModal({ open: false, running: false, progress: null, error: null })}
        title="Products"
        progress={syncModal.progress}
        error={syncModal.error}
        running={syncModal.running}
      />

      {/* Full Response Modal */}
      <AnimatePresence>
        {headoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setHeadoutModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">Full Product Response</h2>
                <button
                  onClick={() => setHeadoutModal(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-auto p-6">
                {headoutModal.loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                  </div>
                ) : headoutModal.error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {headoutModal.error}
                  </div>
                ) : (
                  <pre className="rounded-lg bg-slate-900 p-4 text-xs text-slate-100 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {JSON.stringify(headoutModal.data, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const CAL_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CAL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  return formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

interface CalendarProps {
  availabilities: ProductAvailability[];
  selectedVariant: string | null;
  onSelectVariant: (v: string | null) => void;
  calYear: number;
  calMonth: number;
  onCalYearChange: (y: number) => void;
  onCalMonthChange: (m: number) => void;
  selectedDate: string | null;
  onSelectDate: (d: string | null) => void;
  currency: string;
}

function AvailabilityCalendarView({
  availabilities,
  selectedVariant,
  onSelectVariant,
  calYear,
  calMonth,
  onCalYearChange,
  onCalMonthChange,
  selectedDate,
  onSelectDate,
  currency,
}: CalendarProps) {
  const today = todayStr();

  const variants = React.useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const a of availabilities) {
      const key = a.variant_id || "unknown";
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { title: a.variant_title || a.variant_id, count: 1 });
      }
    }
    return Array.from(map.entries());
  }, [availabilities]);

  const effectiveVariant = selectedVariant || (variants.length > 0 ? variants[0][0] : null);

  const filteredAvail = React.useMemo(() => {
    if (!effectiveVariant) return availabilities;
    return availabilities.filter((a) => a.variant_id === effectiveVariant);
  }, [availabilities, effectiveVariant]);

  const availByDate = React.useMemo(() => {
    const map = new Map<string, ProductAvailability[]>();
    for (const a of filteredAvail) {
      if (!a.date) continue;
      const existing = map.get(a.date);
      if (existing) {
        existing.push(a);
      } else {
        map.set(a.date, [a]);
      }
    }
    return map;
  }, [filteredAvail]);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      onCalMonthChange(11);
      onCalYearChange(calYear - 1);
    } else {
      onCalMonthChange(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      onCalMonthChange(0);
      onCalYearChange(calYear + 1);
    } else {
      onCalMonthChange(calMonth + 1);
    }
  };

  const selectedSlots = selectedDate ? (availByDate.get(selectedDate) || []) : [];

  return (
    <div>
      {/* Variant tabs */}
      {variants.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {variants.map(([id, info]) => (
            <button
              key={id}
              onClick={(e) => { e.stopPropagation(); onSelectVariant(id); }}
              className={cn(
                "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                effectiveVariant === id
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {info.title}
              <span className="ml-1 opacity-60">({info.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); prevMonth(); }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-slate-700">
          {CAL_MONTH_NAMES[calMonth]} {calYear}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); nextMonth(); }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="mb-1 grid grid-cols-7 gap-0">
        {CAL_DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-slate-400 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(calYear, calMonth, day);
          const slots = availByDate.get(dateStr) || [];
          const bestSlot = slots[0];
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasAvailability = slots.some((s) => s.available_slots > 0);

          let bg = "bg-transparent";
          let textColor = "text-slate-500";
          if (isSelected) {
            bg = "ring-2 ring-sky-600 bg-sky-50";
          } else if (isToday) {
            bg = "ring-1 ring-sky-400 bg-sky-50/50";
          } else if (isPast) {
            bg = "bg-slate-50";
          }
          if (isPast) textColor = "text-slate-300";

          if (!isPast && slots.length > 0) {
            bg += " cursor-pointer hover:bg-slate-50";
          }

          const statusColor = !hasAvailability && slots.length > 0
            ? "text-red-500"
            : bestSlot && bestSlot.available_slots <= 10 && bestSlot.available_slots > 0
              ? "text-amber-600"
              : "text-emerald-600";

          return (
            <div
              key={day}
              onClick={(e) => {
                e.stopPropagation();
                if (!isPast && slots.length > 0) onSelectDate(dateStr === selectedDate ? null : dateStr);
              }}
              className={cn(
                "flex flex-col items-center justify-center rounded-md px-0.5 py-1 text-center transition-colors",
                bg,
              )}
            >
              <span className={cn("text-xs font-medium", textColor)}>{day}</span>
              {bestSlot && bestSlot.price_amount > 0 ? (
                <span className={cn("mt-0.5 truncate text-[9px] font-semibold leading-tight", statusColor)}>
                  {currency} {bestSlot.price_amount.toFixed(0)}
                </span>
              ) : slots.length > 0 && !hasAvailability ? (
                <span className="mt-0.5 text-[9px] text-red-400">Closed</span>
              ) : slots.length > 0 ? (
                <span className="mt-0.5 text-[9px] text-emerald-500">Open</span>
              ) : (
                <span className="mt-0.5 text-[9px] text-slate-300">—</span>
              )}
              {bestSlot && bestSlot.available_slots > 0 && bestSlot.available_slots < 20 && (
                <span className="text-[8px] text-amber-500">{bestSlot.available_slots} left</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" /> Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> Closed
        </span>
      </div>

      {/* Selected date slot details */}
      {selectedDate && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700">{selectedDate}</h4>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectDate(null); }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {selectedSlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-700">{slot.variant_title || slot.variant_id}</p>
                  <p className="text-[10px] text-slate-400">
                    {slot.start_time ? `${slot.start_time} - ${slot.end_time || "?"}` : "All day"}
                    {slot.inventory_type ? ` · ${slot.inventory_type}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-slate-700">
                    {slot.price_amount > 0 ? `${slot.currency || currency} ${slot.price_amount.toFixed(2)}` : "—"}
                  </span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                    slot.available_slots > 10
                      ? "bg-emerald-50 text-emerald-700"
                      : slot.available_slots > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  )}>
                    {slot.available_slots > 10 ? "Unlimited" : slot.available_slots > 0 ? `${slot.available_slots} left` : "Closed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
