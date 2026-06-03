"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Users, Pencil, X, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Pagination } from "@/components/admin/Pagination";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "superadmin";
  createdAt: string;
}

const ITEMS_PER_PAGE = 50;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ email: string; role: "user" | "admin" | "superadmin" }>({ email: "", role: "user" });
  const [saving, setSaving] = useState(false);

  const isSuperadmin = currentUser?.role === "superadmin";

  const fetchUsers = useCallback((p: number, q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(ITEMS_PER_PAGE) });
    if (q.trim()) params.set("search", q.trim());
    api.get<PaginatedResponse<AdminUser>>(`/api/v1/admin/users?${params}`)
      .then((res) => {
        setUsers(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(Math.max(1, Math.ceil((res.total || 0) / (res.limit || ITEMS_PER_PAGE))));
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search, fetchUsers]);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
  }, []);

  const startEditing = useCallback((user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({ email: user.email, role: user.role });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditForm({ email: "", role: "user" });
  }, []);

  const saveUser = useCallback(async (userId: string) => {
    setSaving(true);
    try {
      await api.put<AdminUser>(`/api/v1/admin/users/${userId}`, editForm);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, email: editForm.email, role: editForm.role } : u)),
      );
      cancelEditing();
    } catch {
    } finally {
      setSaving(false);
    }
  }, [editForm, cancelEditing]);

  const statusColors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    superadmin: "bg-amber-100 text-amber-700",
    user: "bg-slate-100 text-slate-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Manage platform users</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or email..."
          className="block w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-16">
          <Users className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm font-medium text-slate-500">No users found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 hidden sm:table-cell">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">#{String(u.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      {editingId === u.id ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as AdminUser["role"] }))}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          {isSuperadmin && <option value="superadmin">superadmin</option>}
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          statusColors[u.role] || "bg-slate-100 text-slate-700"
                        )}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === u.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveUser(u.id)}
                            disabled={saving}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(u)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{u.name}</span>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    statusColors[u.role] || "bg-slate-100 text-slate-700"
                  )}>
                    {u.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{u.email}</p>
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
