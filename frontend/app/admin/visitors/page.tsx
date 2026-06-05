"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, Globe, ExternalLink, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface Visitor {
  id: number;
  ip: string;
  country: string;
  city: string;
  region: string;
  isp: string;
  user_agent: string;
  referrer: string;
  page_url: string;
  first_visit: string;
  last_visit: string;
  visit_count: number;
  [key: string]: unknown;
}

const ITEMS_PER_PAGE = 50;

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { page, setPage, updateFromResponse, paginationProps } = useAdminPagination({ itemsPerPage: ITEMS_PER_PAGE });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchVisitors = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<Visitor>>(`/api/v1/admin/visitors?${params}`)
      .then((res) => {
        setVisitors(res.items || []);
        updateFromResponse(res.total || 0, res.limit);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisitors(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchVisitors]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Visitors</h1>
        <p className="mt-1 text-sm text-slate-500">Track unique visitors and their activity</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by IP, country, city, or ISP..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visitors.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <Globe className="h-12 w-12" />
          <p className="text-sm font-medium">No visitors found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="hidden w-full text-sm sm:table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-medium text-slate-500">IP / Location</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">ISP</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Visits</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Last seen</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <React.Fragment key={visitor.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50",
                      expandedId === visitor.id && "bg-sky-50/30",
                    )}
                    onClick={() => setExpandedId(expandedId === visitor.id ? null : visitor.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                          visitor.country ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400",
                        )}>
                          {visitor.country ? visitor.country.charAt(0) : "?"}
                        </div>
                        <div>
                          <p className="font-mono text-xs font-medium text-slate-900">{visitor.ip}</p>
                          <p className="text-xs text-slate-500">
                            {[visitor.city, visitor.region, visitor.country].filter(Boolean).join(", ") || "Unknown location"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-700">{visitor.isp || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                        {visitor.visit_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-600">{formatDate(visitor.last_visit)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", expandedId === visitor.id && "rotate-180")} />
                    </td>
                  </motion.tr>
                  {expandedId === visitor.id && (
                    <tr key={`${visitor.id}-detail`}>
                      <td colSpan={5} className="bg-slate-50/50 px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Device</p>
                            <p className="break-words text-xs leading-relaxed text-slate-700">{visitor.user_agent || "—"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Referrer</p>
                            <p className="break-words text-xs leading-relaxed text-slate-700">
                              {visitor.referrer ? (
                                <a href={visitor.referrer} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                                  {visitor.referrer}
                                </a>
                              ) : "Direct / Unknown"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Page URL</p>
                            <p className="break-words text-xs leading-relaxed text-slate-700">
                              {visitor.page_url ? (
                                <a href={visitor.page_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                                  <ExternalLink className="mr-1 inline h-3 w-3" />
                                  {visitor.page_url.length > 60 ? visitor.page_url.slice(0, 60) + "..." : visitor.page_url}
                                </a>
                              ) : "—"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">First visit</p>
                            <p className="text-xs text-slate-700">{formatDate(visitor.first_visit)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {visitors.map((visitor) => (
              <div key={visitor.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                    visitor.country ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400",
                  )}>
                    {visitor.country ? visitor.country.charAt(0) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-medium text-slate-900">{visitor.ip}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {[visitor.city, visitor.region, visitor.country].filter(Boolean).join(", ") || "Unknown"}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                    {visitor.visit_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination className="mt-6" {...paginationProps} />
    </motion.div>
  );
}
