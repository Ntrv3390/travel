"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Pencil, CheckCircle2, XCircle, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/admin/Pagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";

interface Testimonial {
  id: number;
  name: string;
  location: string;
  text: string;
  rating: number;
  avatar: string;
  color: string;
  sort_order: number;
  is_active: boolean;
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

const COLOR_OPTIONS = [
  "from-sky-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-fuchsia-500",
  "from-blue-400 to-indigo-500",
  "from-cyan-400 to-blue-500",
];

const emptyForm = { name: "", location: "", text: "", rating: 5, avatar: "", color: COLOR_OPTIONS[0] };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { page, setPage, updateFromResponse, paginationProps } = useAdminPagination({ itemsPerPage: ITEMS_PER_PAGE });
  const [modal, setModal] = useState<{ open: boolean; editing: Testimonial | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchItems = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<Testimonial>>(`/api/v1/admin/testimonials?${params}`)
      .then((res) => {
        setItems(res.items || []);
        updateFromResponse(res.total || 0, res.limit);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [updateFromResponse]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(page, search), 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchItems]);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true, editing: null });
  };

  const openEdit = (item: Testimonial) => {
    setForm({ name: item.name, location: item.location, text: item.text, rating: item.rating, avatar: item.avatar, color: item.color });
    setModal({ open: true, editing: item });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) return;
    setSaving(true);
    try {
      if (modal.editing) {
        await api.put(`/api/v1/admin/testimonials/${modal.editing.id}`, form);
      } else {
        await api.post("/api/v1/admin/testimonials", form);
      }
      setModal({ open: false, editing: null });
      fetchItems(page, search);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    setToggling(id);
    try {
      await api.patch(`/api/v1/admin/testimonials/${id}/toggle`);
      fetchItems(page, search);
    } catch {
      // ignore
    } finally {
      setToggling(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Testimonials</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer testimonials shown on the home page</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, text, or location..." className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" />
      </div>

      {!loading && items.length > 0 && (
        <Pagination {...paginationProps} className="border-b border-slate-100" />
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <p className="text-sm font-medium text-slate-500">No testimonials found</p>
          <button onClick={openAdd} className="mt-4 flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"><Plus className="h-4 w-4" /> Add Testimonial</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Text</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Rating</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500">Active</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-xs font-bold text-white`}>{item.avatar}</div>
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-[300px] truncate">{item.text}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < item.rating ? "text-amber-400" : "text-slate-200"}>★</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(item.id)}
                        disabled={toggling === item.id}
                        className="inline-flex"
                      >
                        {toggling === item.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : item.is_active ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination {...paginationProps} className="border-t border-slate-100 mt-6" />

      {/* Add/Edit Modal */}
      {modal.open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal({ open: false, editing: null })}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">{modal.editing ? "Edit Testimonial" : "Add Testimonial"}</h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Sarah Johnson" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="New York, USA" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Text</label>
                <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="Testimonial text..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Rating</label>
                  <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Avatar Initials</label>
                  <input type="text" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value.toUpperCase().slice(0, 2) })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" placeholder="SJ" maxLength={2} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-full bg-gradient-to-br ${c} ${form.color === c ? "ring-2 ring-sky-500 ring-offset-2" : ""}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setModal({ open: false, editing: null })} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.text.trim()} className="flex-1 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50">
                {saving ? "Saving..." : modal.editing ? "Update" : "Create"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
