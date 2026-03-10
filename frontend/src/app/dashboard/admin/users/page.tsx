"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";
import type { User } from "@/types";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => adminApi.getUsers(page).then((r) => r.data),
  });

  const roleMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setRole(id, { role: role as any }),
    onSuccess: () => { toast.success("Role updated"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success("User deleted"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Delete failed"),
  });

  const users: User[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const filtered = search ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users ({total})</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-muted-foreground">
                <th className="text-left p-4 font-medium">User</th>
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Provider</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Joined</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${user.role === "ADMIN" ? "bg-neon-orange/10 text-neon-orange" : "bg-white/5 text-muted-foreground"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-muted-foreground">{user.provider}</td>
                    <td className="p-4 hidden lg:table-cell text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        {user.role === "USER" ? (
                          <button onClick={() => roleMutation.mutate({ id: user.id, role: "ADMIN" })}
                            className="p-1.5 rounded hover:bg-white/10" title="Make Admin"><Shield className="w-3.5 h-3.5 text-neon-orange" /></button>
                        ) : (
                          <button onClick={() => roleMutation.mutate({ id: user.id, role: "USER" })}
                            className="p-1.5 rounded hover:bg-white/10" title="Remove Admin"><ShieldOff className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        )}
                        <button onClick={() => { if (confirm(`Delete user "${user.name}"?`)) deleteMutation.mutate(user.id); }}
                          className="p-1.5 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}
    </div>
  );
}
