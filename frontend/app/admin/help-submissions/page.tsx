"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, HelpCircle, Mail } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface HelpSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  [key: string]: unknown;
}

const ITEMS_PER_PAGE = 50;

export default function AdminHelpSubmissionsPage() {
  const [submissions, setSubmissions] = useState<HelpSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<HelpSubmission>>(`/api/v1/admin/help-submissions?${params}`)
      .then((res) => {
        setSubmissions(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubmissions(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchSubmissions]);

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
        <h1 className="text-2xl font-bold text-slate-900">Help</h1>
        <p className="mt-1 text-sm text-slate-500">Review and manage customer inquiries</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, email, or subject..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <HelpCircle className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-500">No submissions found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500"> </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <Fragment key={sub.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{sub.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{sub.email}</td>
                      <td className="px-4 py-3 text-slate-700 hidden lg:table-cell max-w-[250px] truncate">
                        {sub.subject}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-slate-400 transition-transform inline-block",
                          expandedId === sub.id && "rotate-180"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === sub.id && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={5} className="bg-slate-50/50 px-4 py-4">
                            <div className="rounded-xl border border-slate-100 bg-white p-4">
                              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{sub.email}</span>
                                <span className="mx-1">·</span>
                                <span>{new Date(sub.createdAt).toLocaleString()}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900">{sub.subject}</h4>
                              <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                                {sub.message}
                              </p>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden divide-y divide-slate-100">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="p-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{sub.name}</span>
                  <span className="text-xs text-slate-400">{new Date(sub.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{sub.email}</p>
                <p className="mt-1 text-sm text-slate-700 truncate">{sub.subject}</p>
                {expandedId === sub.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{sub.message}</p>
                  </motion.div>
                )}
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
        className="mt-6"
      />
    </motion.div>
  );
}
