"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2, Plus, Clock, Database, Play, RefreshCw, ShieldAlert, Loader2, CalendarClock } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serversApi } from "@/lib/api/servers";
import type { Server } from "@/types";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export function SettingsTab({ serverId, server }: { serverId: string; server: Server }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <RenameSection serverId={serverId} server={server} />
      <StartupSection serverId={serverId} />
      <BackupsSection serverId={serverId} />
      <DatabasesSection serverId={serverId} />
      <SchedulesSection serverId={serverId} />
      <RenewalSection serverId={serverId} server={server} />
      <DangerSection serverId={serverId} />
    </div>
  );
}

function RenameSection({ serverId, server }: { serverId: string; server: Server }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(server.name);
  const mutation = useMutation({
    mutationFn: (n: string) => serversApi.rename(serverId, { name: n }),
    onSuccess: () => { toast.success("Server renamed"); queryClient.invalidateQueries({ queryKey: ["server", serverId] }); },
    onError: () => toast.error("Rename failed"),
  });
  return (
    <GlassCard className="p-5 space-y-3">
      <h3 className="font-semibold text-sm">Server Name</h3>
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Button size="sm" onClick={() => name.trim() && mutation.mutate(name.trim())} disabled={mutation.isPending || name === server.name}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
    </GlassCard>
  );
}

function StartupSection({ serverId }: { serverId: string }) {
  const { data: startup } = useQuery({
    queryKey: ["server-startup", serverId],
    queryFn: () => serversApi.getStartup(serverId).then((r) => r.data),
  });

  const dockerMutation = useMutation({
    mutationFn: (img: string) => serversApi.changeDockerImage(serverId, { docker_image: img }),
    onSuccess: () => toast.success("Docker image updated"),
    onError: () => toast.error("Failed to update"),
  });

  const varMutation = useMutation({
    mutationFn: (d: { key: string; value: string }) => serversApi.updateStartup(serverId, d),
    onSuccess: () => toast.success("Variable updated"),
    onError: () => toast.error("Failed to update"),
  });

  const [editingVars, setEditingVars] = useState<Record<string, string>>({});

  if (!startup) return <GlassCard className="p-5"><p className="text-sm text-muted-foreground">Loading startup...</p></GlassCard>;

  const dockerImages = Object.entries(startup.docker_images || {});

  return (
    <GlassCard className="p-5 space-y-4 lg:col-span-2">
      <h3 className="font-semibold text-sm">Startup Configuration</h3>
      <div className="p-3 rounded-lg bg-black/30 font-mono text-xs text-neon-cyan break-all">{startup.startup_command}</div>

      {dockerImages.length > 0 && (
        <div>
          <Label className="text-xs">Docker Image</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {dockerImages.map(([label, img]) => (
              <button key={label} onClick={() => dockerMutation.mutate(img)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  startup.docker_image === img ? "bg-neon-orange/10 text-neon-orange border border-neon-orange/30" : "bg-white/5 text-muted-foreground border border-white/5 hover:border-white/20"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {startup.variables && startup.variables.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs">Environment Variables</Label>
          {startup.variables.map((v) => (
            <div key={v.env_variable} className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{v.name} <span className="font-mono opacity-60">({v.env_variable})</span></p>
                <Input value={editingVars[v.env_variable] ?? v.server_value ?? v.default_value ?? ""}
                  onChange={(e) => setEditingVars((prev) => ({ ...prev, [v.env_variable]: e.target.value }))}
                  className="text-sm font-mono" />
              </div>
              <Button size="sm" variant="ghost" onClick={() => {
                const val = editingVars[v.env_variable] ?? v.server_value ?? v.default_value ?? "";
                varMutation.mutate({ key: v.env_variable, value: val });
              }}><Save className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function BackupsSection({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient();
  const { data: backups, isLoading } = useQuery({
    queryKey: ["server-backups", serverId],
    queryFn: () => serversApi.listBackups(serverId).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => serversApi.createBackup(serverId),
    onSuccess: () => { toast.success("Backup created"); queryClient.invalidateQueries({ queryKey: ["server-backups", serverId] }); },
    onError: () => toast.error("Failed to create backup"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serversApi.deleteBackup(serverId, id),
    onSuccess: () => { toast.success("Backup deleted"); queryClient.invalidateQueries({ queryKey: ["server-backups", serverId] }); },
    onError: () => toast.error("Failed to delete backup"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => serversApi.restoreBackup(serverId, id),
    onSuccess: () => toast.success("Backup restored"),
    onError: () => toast.error("Restore failed"),
  });

  const downloadMutation = useMutation({
    mutationFn: (id: string) => serversApi.downloadBackup(serverId, id).then((r) => r.data),
    onSuccess: (data) => window.open(data.download_url, "_blank"),
    onError: () => toast.error("Download failed"),
  });

  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Backups</h3>
        <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Create
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : backups && backups.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {backups.map((b) => (
            <div key={b.uuid} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm">
              <div>
                <p className="font-medium text-xs">{b.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} &middot; {(b.bytes / 1048576).toFixed(1)} MB</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => downloadMutation.mutate(b.uuid)} className="p-1 rounded hover:bg-white/10 text-xs">DL</button>
                <button onClick={() => { if (confirm("Restore this backup?")) restoreMutation.mutate(b.uuid); }} className="p-1 rounded hover:bg-white/10 text-xs text-neon-cyan">Restore</button>
                <button onClick={() => { if (confirm("Delete this backup?")) deleteMutation.mutate(b.uuid); }} className="p-1 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No backups yet.</p>
      )}
    </GlassCard>
  );
}

function DatabasesSection({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient();
  const [newDb, setNewDb] = useState("");
  const { data: databases, isLoading } = useQuery({
    queryKey: ["server-databases", serverId],
    queryFn: () => serversApi.listDatabases(serverId).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => serversApi.createDatabase(serverId, { name }),
    onSuccess: () => { toast.success("Database created"); setNewDb(""); queryClient.invalidateQueries({ queryKey: ["server-databases", serverId] }); },
    onError: () => toast.error("Failed to create database"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serversApi.deleteDatabase(serverId, id),
    onSuccess: () => { toast.success("Database deleted"); queryClient.invalidateQueries({ queryKey: ["server-databases", serverId] }); },
    onError: () => toast.error("Failed to delete database"),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => serversApi.rotateDatabasePassword(serverId, id),
    onSuccess: () => toast.success("Password rotated"),
    onError: () => toast.error("Failed to rotate password"),
  });

  return (
    <GlassCard className="p-5 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Database className="w-4 h-4" /> Databases</h3>
      <div className="flex items-center gap-2">
        <Input value={newDb} onChange={(e) => setNewDb(e.target.value)} placeholder="Database name" className="text-sm"
          onKeyDown={(e) => e.key === "Enter" && newDb.trim() && createMutation.mutate(newDb.trim())} />
        <Button size="sm" onClick={() => newDb.trim() && createMutation.mutate(newDb.trim())} disabled={!newDb.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : databases && databases.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {databases.map((db) => (
            <div key={db.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium">{db.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => rotateMutation.mutate(db.id)} className="p-1 rounded hover:bg-white/10"><RefreshCw className="w-3 h-3" /></button>
                  <button onClick={() => { if (confirm(`Delete database "${db.name}"?`)) deleteMutation.mutate(db.id); }}
                    className="p-1 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <p className="text-muted-foreground mt-1">Host: {db.host?.address}:{db.host?.port}</p>
              <p className="text-muted-foreground">User: {db.username}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No databases.</p>
      )}
    </GlassCard>
  );
}

function SchedulesSection({ serverId }: { serverId: string }) {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["server-schedules", serverId],
    queryFn: () => serversApi.listSchedules(serverId).then((r) => r.data),
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", minute: "*/30", hour: "*", day_of_week: "*", day_of_month: "*", month: "*" });

  const createMutation = useMutation({
    mutationFn: () => serversApi.createSchedule(serverId, { ...form, is_active: true }),
    onSuccess: () => { toast.success("Schedule created"); setCreating(false); queryClient.invalidateQueries({ queryKey: ["server-schedules", serverId] }); },
    onError: () => toast.error("Failed to create schedule"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serversApi.deleteSchedule(serverId, id),
    onSuccess: () => { toast.success("Schedule deleted"); queryClient.invalidateQueries({ queryKey: ["server-schedules", serverId] }); },
    onError: () => toast.error("Failed"),
  });

  const executeMutation = useMutation({
    mutationFn: (id: number) => serversApi.executeSchedule(serverId, id),
    onSuccess: () => toast.success("Schedule executed"),
    onError: () => toast.error("Failed"),
  });

  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Schedules</h3>
        <Button size="sm" onClick={() => setCreating(!creating)}><Plus className="w-3.5 h-3.5 mr-1" /> New</Button>
      </div>
      {creating && (
        <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Schedule name" className="text-sm" />
          <div className="grid grid-cols-5 gap-2">
            <Input value={form.minute} onChange={(e) => setForm((p) => ({ ...p, minute: e.target.value }))} placeholder="Min" className="text-xs font-mono" />
            <Input value={form.hour} onChange={(e) => setForm((p) => ({ ...p, hour: e.target.value }))} placeholder="Hour" className="text-xs font-mono" />
            <Input value={form.day_of_week} onChange={(e) => setForm((p) => ({ ...p, day_of_week: e.target.value }))} placeholder="DOW" className="text-xs font-mono" />
            <Input value={form.day_of_month} onChange={(e) => setForm((p) => ({ ...p, day_of_month: e.target.value }))} placeholder="DOM" className="text-xs font-mono" />
            <Input value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} placeholder="Month" className="text-xs font-mono" />
          </div>
          <Button size="sm" onClick={() => form.name.trim() && createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>Create</Button>
        </div>
      )}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : schedules && schedules.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-muted-foreground font-mono">{s.cron.minute} {s.cron.hour} {s.cron.day_of_week} {s.cron.day_of_month} {s.cron.month}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => executeMutation.mutate(s.id)} className="p-1 rounded hover:bg-white/10"><Play className="w-3 h-3 text-neon-green" /></button>
                <button onClick={() => { if (confirm(`Delete schedule "${s.name}"?`)) deleteMutation.mutate(s.id); }}
                  className="p-1 rounded hover:bg-white/10 text-neon-red"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No schedules.</p>
      )}
    </GlassCard>
  );
}

function RenewalSection({ serverId, server }: { serverId: string; server: Server }) {
  const queryClient = useQueryClient();
  const { data: renewalInfo } = useQuery({
    queryKey: ["server-renewal", serverId],
    queryFn: () => serversApi.getRenewalCost(serverId).then((r) => r.data),
  });

  const renewMutation = useMutation({
    mutationFn: () => serversApi.renew(serverId),
    onSuccess: () => { toast.success("Server renewed!"); queryClient.invalidateQueries({ queryKey: ["server", serverId] }); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Renewal failed")),
  });

  return (
    <GlassCard className="p-5 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Renewal</h3>
      {server.expiresAt && (
        <p className="text-sm">Expires: <span className="font-medium">{new Date(server.expiresAt).toLocaleDateString()}</span></p>
      )}
      {renewalInfo && (
        <p className="text-sm text-muted-foreground">Cost: ₹{renewalInfo.price} for {renewalInfo.renewalDays} days</p>
      )}
      <Button size="sm" variant="glow" onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending}>
        {renewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
        Renew Now
      </Button>
    </GlassCard>
  );
}

function DangerSection({ serverId }: { serverId: string }) {
  const reinstallMutation = useMutation({
    mutationFn: () => serversApi.reinstall(serverId),
    onSuccess: () => toast.success("Reinstalling..."),
    onError: () => toast.error("Reinstall failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => serversApi.delete(serverId),
    onSuccess: () => { toast.success("Server deleted"); window.location.href = "/dashboard/servers"; },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <GlassCard className="p-5 space-y-3 border-neon-red/20">
      <h3 className="font-semibold text-sm flex items-center gap-2 text-neon-red"><ShieldAlert className="w-4 h-4" /> Danger Zone</h3>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="text-neon-orange hover:text-neon-orange"
          onClick={() => { if (confirm("Reinstall will wipe all server files. Continue?")) reinstallMutation.mutate(); }}>
          Reinstall
        </Button>
        <Button size="sm" variant="ghost" className="text-neon-red hover:text-neon-red"
          onClick={() => { if (confirm("This will permanently delete the server. Type 'DELETE' to confirm.")) deleteMutation.mutate(); }}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Server
        </Button>
      </div>
    </GlassCard>
  );
}
