"use client";

import { useQuery } from "@tanstack/react-query";
import { Cpu, HardDrive, MemoryStick, Wifi, WifiOff, ArrowDown, ArrowUp } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { CircularUsageChart } from "@/components/charts/circular-usage-chart";
import { serversApi } from "@/lib/api/servers";
import type { Server } from "@/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

export function OverviewTab({ serverId, server }: { serverId: string; server: Server }) {
  const { data: network } = useQuery({
    queryKey: ["server-network", serverId],
    queryFn: () => serversApi.getNetwork(serverId).then((r) => r.data),
  });

  const res = server.resources;
  const memUsed = res ? res.resources.memory_bytes / 1048576 : 0;
  const cpuUsed = res ? res.resources.cpu_absolute : 0;
  const diskUsed = res ? res.resources.disk_bytes / 1048576 : 0;

  const isOnline = res?.current_state === "running";

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? <Wifi className="w-5 h-5 text-neon-green" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="font-semibold">{isOnline ? "Server Online" : res?.current_state === "starting" ? "Starting..." : "Server Offline"}</p>
              {res && isOnline && <p className="text-xs text-muted-foreground">Uptime: {formatUptime(res.resources.uptime)}</p>}
            </div>
          </div>
          {network && network.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-mono">{network[0].ip}:{network[0].port}</p>
              <p className="text-xs text-muted-foreground">Primary Address</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Resource usage gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-6 flex flex-col items-center">
          <CircularUsageChart value={memUsed} maxValue={server.ram} color="#A855F7" size={120} strokeWidth={10} />
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold flex items-center gap-1.5"><MemoryStick className="w-4 h-4 text-neon-purple" /> Memory</p>
            <p className="text-xs text-muted-foreground mt-0.5">{memUsed.toFixed(0)} / {server.ram} MB</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center">
          <CircularUsageChart value={cpuUsed} maxValue={server.cpu} color="#FF6B35" size={120} strokeWidth={10} />
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold flex items-center gap-1.5"><Cpu className="w-4 h-4 text-neon-orange" /> CPU</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cpuUsed.toFixed(1)} / {server.cpu}%</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 flex flex-col items-center">
          <CircularUsageChart value={diskUsed} maxValue={server.disk} color="#06B6D4" size={120} strokeWidth={10} />
          <div className="mt-3 text-center">
            <p className="text-sm font-semibold flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-neon-cyan" /> Disk</p>
            <p className="text-xs text-muted-foreground mt-0.5">{diskUsed.toFixed(0)} / {server.disk} MB</p>
          </div>
        </GlassCard>
      </div>

      {/* Network & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5 space-y-4">
          <h3 className="font-semibold text-sm">Network Traffic</h3>
          {res ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-green/10"><ArrowDown className="w-4 h-4 text-neon-green" /></div>
                <div><p className="text-xs text-muted-foreground">Inbound</p><p className="font-mono text-sm">{formatBytes(res.resources.network_rx_bytes)}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-orange/10"><ArrowUp className="w-4 h-4 text-neon-orange" /></div>
                <div><p className="text-xs text-muted-foreground">Outbound</p><p className="font-mono text-sm">{formatBytes(res.resources.network_tx_bytes)}</p></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No network data — server offline</p>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <h3 className="font-semibold text-sm">Server Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Backups</p><p className="font-medium">{server.backups}</p></div>
            <div><p className="text-xs text-muted-foreground">Databases</p><p className="font-medium">{server.databases}</p></div>
            <div><p className="text-xs text-muted-foreground">Extra Ports</p><p className="font-medium">{server.ports}</p></div>
            <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{new Date(server.createdAt).toLocaleDateString()}</p></div>
          </div>
        </GlassCard>
      </div>

      {/* Network Allocations */}
      {network && network.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-semibold text-sm mb-3">Network Allocations</h3>
          <div className="space-y-2">
            {network.map((alloc) => (
              <div key={alloc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="font-mono text-sm">{alloc.ip}:{alloc.port}</span>
                {alloc.is_default && <span className="text-xs px-2 py-0.5 rounded bg-neon-orange/10 text-neon-orange">Primary</span>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
