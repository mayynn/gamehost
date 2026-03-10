"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldBan, ShieldCheck, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/lib/api/admin";
import type { Server } from "@/types";
import toast from "react-hot-toast";

export default function AdminServersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-servers", page],
    queryFn: () => adminApi.getServers(page).then((r) => r.data),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendServer(id),
    onSuccess: () => { toast.success("Server suspended"); queryClient.invalidateQueries({ queryKey: ["admin-servers"] }); },
    onError: () => toast.error("Failed"),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => adminApi.unsuspendServer(id),
    onSuccess: () => { toast.success("Server unsuspended"); queryClient.invalidateQueries({ queryKey: ["admin-servers"] }); },
    onError: () => toast.error("Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteServer(id),
    onSuccess: () => { toast.success("Server deleted"); queryClient.invalidateQueries({ queryKey: ["admin-servers"] }); },
    onError: () => toast.error("Failed"),
  });

  const servers: Server[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const filtered = search ? servers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : servers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servers ({total})</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search servers..." className="pl-10" />
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-muted-foreground">
                <th className="text-left p-4 font-medium">Server</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Resources</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Expires</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((server) => (
                  <tr key={server.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-medium">{server.name}</p>
                      <p className="text-xs text-muted-foreground">{server.plan?.name || "No plan"}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        server.status === "ACTIVE" ? "bg-neon-green/10 text-neon-green" :
                        server.status === "SUSPENDED" ? "bg-neon-red/10 text-neon-red" :
                        server.status === "EXPIRED" ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-white/5 text-muted-foreground"
                      }`}>{server.status}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-xs text-muted-foreground">
                      {server.ram}MB / {server.cpu}% / {server.disk}MB
                    </td>
                    <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground">
                      {server.expiresAt ? new Date(server.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 justify-end">
                        {server.status === "SUSPENDED" ? (
                          <button onClick={() => unsuspendMutation.mutate(server.id)}
                            className="p-1.5 rounded hover:bg-white/10" title="Unsuspend"><ShieldCheck className="w-3.5 h-3.5 text-neon-green" /></button>
                        ) : (
                          <button onClick={() => suspendMutation.mutate(server.id)}
                            className="p-1.5 rounded hover:bg-white/10" title="Suspend"><ShieldBan className="w-3.5 h-3.5 text-neon-orange" /></button>
                        )}
                        <button onClick={() => { if (confirm(`Delete server "${server.name}"?`)) deleteMutation.mutate(server.id); }}
                          className="p-1.5 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No servers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

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
