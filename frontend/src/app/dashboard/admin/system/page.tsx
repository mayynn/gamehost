"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, ScrollText, ChevronLeft, ChevronRight, Server, Egg } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/admin";
import type { AuditLog } from "@/types";
import toast from "react-hot-toast";

export default function AdminSystemPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsSection />
        <NodesSection />
        <AuditSection />
      </div>
    </div>
  );
}

function SettingsSection() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  const [edited, setEdited] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: Record<string, string>) => adminApi.updateSettings(data),
    onSuccess: () => { toast.success("Settings saved"); queryClient.invalidateQueries({ queryKey: ["admin-settings"] }); setEdited({}); },
    onError: () => toast.error("Failed to save settings"),
  });

  if (isLoading || !settings) return <GlassCard className="p-5"><p className="text-sm text-muted-foreground">Loading settings...</p></GlassCard>;

  return (
    <GlassCard className="p-5 space-y-4 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</h3>
        <Button size="sm" onClick={() => mutation.mutate({ ...settings, ...edited })} disabled={mutation.isPending || Object.keys(edited).length === 0}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key}>
            <Label className="text-xs font-mono">{key}</Label>
            <Input value={edited[key] ?? value} onChange={(e) => setEdited((prev) => ({ ...prev, [key]: e.target.value }))} className="mt-1 text-sm font-mono" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function NodesSection() {
  const { data: nodes } = useQuery({
    queryKey: ["admin-nodes"],
    queryFn: () => adminApi.getNodes().then((r) => r.data),
  });

  const { data: eggs } = useQuery({
    queryKey: ["admin-eggs"],
    queryFn: () => adminApi.getEggs().then((r) => r.data),
  });

  return (
    <>
      <GlassCard className="p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Server className="w-4 h-4" /> Nodes</h3>
        {nodes && Array.isArray(nodes) ? (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {nodes.map((node: Record<string, string>) => (
              <div key={node.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                <p className="font-medium">{node.name}</p>
                {node.description && <p className="text-muted-foreground">{node.description}</p>}
                <p className="text-muted-foreground mt-1">{node.fqdn}:{node.daemon_listen}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No nodes found.</p>
        )}
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Egg className="w-4 h-4" /> Eggs</h3>
        {eggs && Array.isArray(eggs) ? (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {eggs.map((egg: Record<string, string>) => (
              <div key={egg.id || egg.uuid} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                <p className="font-medium">{egg.name}</p>
                {egg.description && <p className="text-muted-foreground line-clamp-2">{egg.description}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No eggs found.</p>
        )}
      </GlassCard>
    </>
  );
}

function AuditSection() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => adminApi.getAuditLogs(page).then((r) => r.data),
  });

  const logs: AuditLog[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <GlassCard className="p-5 space-y-3 lg:col-span-2">
      <h3 className="font-semibold text-sm flex items-center gap-2"><ScrollText className="w-4 h-4" /> Audit Logs</h3>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : logs.length > 0 ? (
        <>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-muted-foreground">{log.details ? JSON.stringify(log.details) : ""}</p>
                </div>
                <div className="text-right text-muted-foreground">
                  <p>{log.userId}</p>
                  <p>{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
              <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">No audit logs.</p>
      )}
    </GlassCard>
  );
}
