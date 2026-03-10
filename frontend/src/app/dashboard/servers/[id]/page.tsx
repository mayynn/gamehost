"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Square, RotateCcw, Skull, Terminal, FolderOpen, Users, Puzzle, Settings, BarChart3, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { serversApi } from "@/lib/api/servers";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PowerSignal } from "@/types";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

import { OverviewTab } from "./overview-tab";
import { ConsoleTab } from "./console-tab";
import { FilesTab } from "./files-tab";
import { PlayersTab } from "./players-tab";
import { PluginsTab } from "./plugins-tab";
import { SettingsTab } from "./settings-tab";

const tabs = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "console", label: "Console", icon: Terminal },
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "players", label: "Players", icon: Users },
  { key: "plugins", label: "Plugins", icon: Puzzle },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type Tab = (typeof tabs)[number]["key"];

export default function ServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();

  const { data: server, isLoading } = useQuery({
    queryKey: ["server", id],
    queryFn: () => serversApi.get(id).then((r) => r.data),
    refetchInterval: 10000,
  });

  const powerMutation = useMutation({
    mutationFn: (signal: PowerSignal) => serversApi.power(id, { signal }),
    onSuccess: (_, signal) => {
      toast.success(`Server ${signal} signal sent`);
      queryClient.invalidateQueries({ queryKey: ["server", id] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Power action failed")),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!server) {
    return (
      <GlassCard className="p-16 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-neon-red mb-4" />
        <p className="text-lg font-semibold">Server Not Found</p>
        <Link href="/dashboard/servers"><Button variant="ghost" className="mt-4">Back to Servers</Button></Link>
      </GlassCard>
    );
  }

  const stateColor = server.status === "ACTIVE" ? "neon-green" : server.status === "SUSPENDED" ? "neon-red" : server.status === "INSTALLING" ? "neon-cyan" : "yellow-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/servers">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{server.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${stateColor}/10 text-${stateColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${stateColor}`} />
                {server.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              {server.plan && <span>Plan: {server.plan.name}</span>}
              {server.expiresAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires: {new Date(server.expiresAt).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => powerMutation.mutate("start")} disabled={powerMutation.isPending}>
            <Play className="w-4 h-4 mr-1 text-neon-green" /> Start
          </Button>
          <Button variant="ghost" size="sm" onClick={() => powerMutation.mutate("restart")} disabled={powerMutation.isPending}>
            <RotateCcw className="w-4 h-4 mr-1 text-neon-cyan" /> Restart
          </Button>
          <Button variant="ghost" size="sm" onClick={() => powerMutation.mutate("stop")} disabled={powerMutation.isPending}>
            <Square className="w-4 h-4 mr-1 text-neon-orange" /> Stop
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            if (confirm("Are you sure you want to kill the server?")) powerMutation.mutate("kill");
          }} disabled={powerMutation.isPending}>
            <Skull className="w-4 h-4 mr-1 text-neon-red" /> Kill
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "text-white" : "text-muted-foreground hover:text-white/70"
            }`}>
            {tab === t.key && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-white/10 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />
            )}
            <t.icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview" && <OverviewTab serverId={id} server={server} />}
        {tab === "console" && <ConsoleTab serverId={id} />}
        {tab === "files" && <FilesTab serverId={id} />}
        {tab === "players" && <PlayersTab serverId={id} pteroUuid={server.pteroUuid} />}
        {tab === "plugins" && <PluginsTab serverId={id} />}
        {tab === "settings" && <SettingsTab serverId={id} server={server} />}
      </div>
    </div>
  );
}
