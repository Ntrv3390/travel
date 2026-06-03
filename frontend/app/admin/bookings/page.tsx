"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, CalendarCheck, ExternalLink, X } from "lucide-react";
import { api, getAccessToken } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, toSlug } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface Booking {
  id: number;
  booking_id: string;
  status: string;
  email: string;
  first_name: string;
  last_name: string;
  product_name: string;
  experience_date: string;
  total_amount: number;
  currency_code: string;
  customer_data: string;
  [key: string]: unknown;
}

const ITEMS_PER_PAGE = 50;

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={null}>
      <AdminBookingsContent />
    </Suspense>
  );
}

function AdminBookingsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [headoutModal, setHeadoutModal] = useState<{ bookingId: string; data: unknown; loading: boolean; error: string } | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);
  const scrolledRef = useRef(false);

  const fetchBookings = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<Booking>>(`/api/v1/admin/bookings?${params}`)
      .then((res) => {
        setBookings(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchBookings]);

  useEffect(() => {
    if (!bookings.length || !highlightId || scrolledRef.current) return;
    const match = bookings.find((b) => b.booking_id === highlightId);
    if (!match) return;
    setExpandedId(String(match.id));
    scrolledRef.current = true;
  }, [bookings, highlightId]);

  useEffect(() => {
    if (!expandedId || !highlightRef.current) return;
    setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [expandedId]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const viewHeadoutResponse = useCallback(async (booking: Booking) => {
    const id = String(booking.id);
    setHeadoutModal({ bookingId: id, data: null, loading: true, error: "" });
    try {
      const res = await fetch(`/api/v1/admin/bookings/${id}/headout`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }
      const data = await res.json();
      setHeadoutModal({ bookingId: id, data, loading: false, error: "" });
    } catch (err) {
      setHeadoutModal({ bookingId: id, data: null, loading: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }, []);

  const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    uncaptured: "bg-amber-100 text-amber-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all platform bookings</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by customer name, email, or booking ID..."
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
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <CalendarCheck className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-500">No bookings found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Booking ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden lg:table-cell">Experience</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Actions</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500"> </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <React.Fragment key={booking.id}>
                    <tr
                      ref={highlightId === booking.booking_id ? highlightRef : undefined}
                      onClick={() => setExpandedId(expandedId === String(booking.id) ? null : String(booking.id))}
                      className={cn(
                        "border-b border-slate-50 transition-colors hover:bg-slate-50/50 cursor-pointer",
                        highlightId === booking.booking_id && "bg-sky-50/70 ring-2 ring-sky-300"
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{booking.booking_id?.slice(0, 10)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{booking.first_name} {booking.last_name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{booking.email}</td>
                      <td className="px-4 py-3 text-slate-700 hidden lg:table-cell max-w-[200px] truncate">
                        {booking.product_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {booking.experience_date ? new Date(booking.experience_date).toLocaleDateString() : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {booking.currency_code} {Number(booking.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusColors[booking.status?.toLowerCase()] || "bg-slate-100 text-slate-700"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); viewHeadoutResponse(booking); }}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Headout Response
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-slate-400 transition-transform inline-block",
                          expandedId === String(booking.id) && "rotate-180"
                        )} />
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedId === String(booking.id) && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={9} className="bg-slate-50/50 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {(() => {
                                const guests = parseCustomerData(booking.customer_data);
                                if (guests.length > 0) {
                                  return (
                                    <div key="guests" className="col-span-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                      <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-cyan-500 text-white">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">Guests ({guests.length})</p>
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {guests.map((g, i) => (
                                          <div key={i} className={cn(
                                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                            g.isPrimary
                                              ? "border-sky-200 bg-sky-50/60"
                                              : "border-slate-100 bg-white"
                                          )}>
                                            <div className={cn(
                                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                              g.personType === "ADULT"
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-amber-100 text-amber-700"
                                            )}>
                                              {g.personType === "ADULT" ? "A" : "C"}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm font-medium text-slate-900">{g.name}</p>
                                              <div className="flex items-center gap-1.5">
                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                                                  {g.personType}
                                                </span>
                                                {g.isPrimary && (
                                                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-600">
                                                    Primary
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              {(() => {
                                const dateFields: [string, string][] = [
                                  ["booking_date", "Booked on"],
                                  ["experience_date", "Experience date"],
                                ];
                                const timeFields: [string, string][] = [
                                  ["start_date_time", "Start time"],
                                  ["end_date_time", "End time"],
                                ];
                                const refFields: [string, string][] = [
                                  ["headout_reference", "Headout ref"],
                                  ["partner_reference_id", "Partner ref"],
                                ];
                                const pricingFields: [string, string][] = [
                                  ["total_amount", "Total"],
                                  ["original_amount", "Original"],
                                  ["discount", "Discount"],
                                ];
                                const contactFields: [string, string][] = [
                                  ["email", "Email"],
                                  ["phone", "Phone"],
                                  ["special_requests", "Special requests"],
                                ];
                                const guestSummaryFields: [string, string][] = [
                                  ["adults", "Adults"],
                                  ["children", "Children"],
                                  ["guest_counts", "Guest counts"],
                                ];
                                const productFields: [string, string][] = [
                                  ["variant_name", "Variant"],
                                  ["inventory_type", "Inventory type"],
                                ];
                                const sections = [
                                  { title: "Dates & Times", fields: [...dateFields, ...timeFields] },
                                  { title: "Contact", fields: contactFields },
                                  { title: "Guests", fields: guestSummaryFields },
                                  { title: "Product", fields: productFields },
                                  { title: "References", fields: refFields },
                                  { title: "Pricing", fields: pricingFields },
                                ];
                                return sections.map((section) => {
                                  const visible = section.fields.filter(([k]) => booking[k] !== "" && booking[k] !== null && booking[k] !== undefined && booking[k] !== "0001-01-01T00:00:00Z" && booking[k] !== 0);
                                  if (visible.length === 0) return null;
                                  return (
                                    <div key={section.title} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>
                                      <div className="space-y-1.5">
                                        {visible.map(([key, label]) => {
                                          let val = String(booking[key] ?? "");
                                          if (key.includes("date") || key.includes("_time")) {
                                            const d = new Date(val);
                                            if (!isNaN(d.getTime())) {
                                              val = key.includes("_time")
                                                ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                                : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
                                            }
                                          }
                                          if (key === "email" && val) {
                                            return (
                                              <div key={key} className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-500">{label}</span>
                                                <a href={`mailto:${val}`} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline">
                                                  {val}
                                                </a>
                                              </div>
                                            );
                                          }
                                          if (key === "phone" && val) {
                                            return (
                                              <div key={key} className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-500">{label}</span>
                                                <a href={`tel:${val}`} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline">
                                                  {val}
                                                </a>
                                              </div>
                                            );
                                          }
                                          if (key === "special_requests" && val) {
                                            return (
                                              <div key={key} className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-500">{label}</span>
                                                <p className="text-xs font-medium text-slate-700 leading-relaxed">{val}</p>
                                              </div>
                                            );
                                          }
                                          if (key === "guest_counts" && val) {
                                            try {
                                              const parsed = JSON.parse(val);
                                              const entries = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
                                              val = entries.join(", ");
                                            } catch { /* show raw string */ }
                                          }
                                          return (
                                            <div key={key} className="flex items-center justify-between gap-2">
                                              <span className="text-xs text-slate-500">{label}</span>
                                              <span className={cn(
                                                "text-xs font-medium text-right max-w-[180px] truncate",
                                                key === "total_amount" ? "text-slate-900 font-semibold" : "text-slate-700"
                                              )}>{val || "—"}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                              {(() => {
                                const raw = booking as Record<string, unknown>;
                                const voucherUrl = String(raw.voucher_url ?? "");
                                const sessionId = String(raw.session_id ?? "");
                                const idempotencyKey = String(raw.idempotency_key ?? "");
                                const emailSent = raw.confirmation_email_sent as boolean | undefined;
                                const productId = String(raw.product_id ?? "");
                                const variantId = String(raw.variant_id ?? "");
                                const inventoryId = String(raw.inventory_id ?? "");
                                const tickets = String(raw.tickets ?? "");
                                const hasExtraFields = voucherUrl || sessionId || idempotencyKey || emailSent !== undefined || productId || variantId || inventoryId || tickets;
                                if (!hasExtraFields) return null;
                                const extraSections: { title: string; rows: { label: string; content: React.ReactNode }[] }[] = [];
                                if (voucherUrl) {
                                  extraSections.push({
                                    title: "Tickets & Voucher",
                                    rows: [{ label: "Voucher URL", content: <a href={voucherUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline break-all">{voucherUrl}</a> }],
                                  });
                                }
                                if (tickets) {
                                  const section = extraSections.find((s) => s.title === "Tickets & Voucher") || extraSections[extraSections.push({ title: "Tickets & Voucher", rows: [] }) - 1];
                                  section.rows.push({ label: "Tickets", content: <span className="text-xs font-medium text-slate-700">{tickets.length > 120 ? tickets.slice(0, 120) + "..." : tickets}</span> });
                                }
                                const systemRows: { label: string; content: React.ReactNode }[] = [];
                                if (sessionId) systemRows.push({ label: "Session ID", content: <span className="text-xs font-medium text-slate-700 font-mono">{sessionId}</span> });
                                if (idempotencyKey) systemRows.push({ label: "Idempotency key", content: <span className="text-xs font-medium text-slate-700 font-mono">{idempotencyKey}</span> });
                                if (emailSent !== undefined) systemRows.push({ label: "Confirmation email", content: <span className={cn("text-xs font-medium", emailSent ? "text-emerald-600" : "text-amber-600")}>{emailSent ? "Sent" : "Not sent"}</span> });
                                if (productId) systemRows.push({ label: "Product", content: <Link href={`/products/${toSlug(booking.product_name)}-${productId}`} className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline font-mono">{booking.product_name}</Link> });
                                if (variantId) systemRows.push({ label: "Variant ID", content: <span className="text-xs font-medium text-slate-700 font-mono">{variantId}</span> });
                                if (inventoryId) systemRows.push({ label: "Inventory ID", content: <span className="text-xs font-medium text-slate-700 font-mono">{inventoryId}</span> });
                                if (systemRows.length) extraSections.push({ title: "System", rows: systemRows });
                                return extraSections.map((section) => (
                                  <div key={section.title} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>
                                    <div className="space-y-1.5">
                                      {section.rows.map((row, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2">
                                          <span className="text-xs text-slate-500">{row.label}</span>
                                          {row.content}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              })()}
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
            {bookings.map((booking) => (
              <div key={booking.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{booking.first_name} {booking.last_name}</span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    statusColors[booking.status?.toLowerCase()] || "bg-slate-100 text-slate-700"
                  )}>
                    {booking.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{booking.email}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{booking.product_name}</span>
                  <span className="font-medium text-slate-900">{booking.currency_code} {Number(booking.total_amount).toFixed(2)}</span>
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
        className="mt-6"
      />
      {/* Headout Response Modal */}
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
                <h2 className="text-lg font-semibold text-slate-900">Headout Response</h2>
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

function parseCustomerData(raw: string): { personType: string; isPrimary: boolean; name: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g: Record<string, unknown>) => {
      const fields = (g.inputFields as Array<Record<string, string>>) || [];
      const nameField = fields.find((f) => f.id === "NAME");
      return {
        personType: String(g.personType || ""),
        isPrimary: Boolean(g.isPrimary),
        name: nameField?.value || "",
      };
    });
  } catch {
    return [];
  }
}
