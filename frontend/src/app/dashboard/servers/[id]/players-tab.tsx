"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Shield, ShieldOff, Ban, UserX, Globe, Users, X, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { playersApi } from "@/lib/api/players";
import toast from "react-hot-toast";

export function PlayersTab({ serverId, pteroUuid }: { serverId: string; pteroUuid?: string }) {
  const uuid = pteroUuid || serverId;
  const queryClient = useQueryClient();
  const [player, setPlayer] = useState("");
  const [reason, setReason] = useState("");
  const [banIp, setBanIp] = useState("");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["players", uuid] });
  };

  // ---- Data fetching ----
  const { data: onlinePlayers, isLoading: loadingOnline } = useQuery({
    queryKey: ["players", uuid, "online"],
    queryFn: () => playersApi.getOnline(uuid).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: whitelist, isLoading: loadingWhitelist } = useQuery({
    queryKey: ["players", uuid, "whitelist"],
    queryFn: () => playersApi.getWhitelist(uuid).then((r) => r.data),
  });

  const { data: ops } = useQuery({
    queryKey: ["players", uuid, "ops"],
    queryFn: () => playersApi.getOps(uuid).then((r) => r.data),
  });

  const { data: banned } = useQuery({
    queryKey: ["players", uuid, "banned"],
    queryFn: () => playersApi.getBanned(uuid).then((r) => r.data),
  });

  const { data: bannedIps } = useQuery({
    queryKey: ["players", uuid, "banned-ips"],
    queryFn: () => playersApi.getBannedIps(uuid).then((r) => r.data),
  });

  // ---- Mutations ----
  const whitelistAdd = useMutation({
    mutationFn: (name: string) => playersApi.addWhitelist(uuid, { player: name }),
    onSuccess: () => { toast.success("Added to whitelist"); setPlayer(""); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const whitelistRemove = useMutation({
    mutationFn: (name: string) => playersApi.removeWhitelist(uuid, name),
    onSuccess: () => { toast.success("Removed from whitelist"); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const opAdd = useMutation({
    mutationFn: (name: string) => playersApi.op(uuid, { player: name }),
    onSuccess: () => { toast.success("Made operator"); setPlayer(""); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const opRemove = useMutation({
    mutationFn: (name: string) => playersApi.deop(uuid, { player: name }),
    onSuccess: () => { toast.success("Removed operator"); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const banPlayer = useMutation({
    mutationFn: (data: { player: string; reason?: string }) => playersApi.ban(uuid, data),
    onSuccess: () => { toast.success("Player banned"); setPlayer(""); setReason(""); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const unbanPlayer = useMutation({
    mutationFn: (name: string) => playersApi.unban(uuid, { player: name }),
    onSuccess: () => { toast.success("Player unbanned"); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const kickPlayer = useMutation({
    mutationFn: (data: { player: string; reason?: string }) => playersApi.kick(uuid, data),
    onSuccess: () => { toast.success("Player kicked"); setPlayer(""); setReason(""); },
    onError: () => toast.error("Failed"),
  });

  const banIpMutation = useMutation({
    mutationFn: (ip: string) => playersApi.banIp(uuid, { ip }),
    onSuccess: () => { toast.success("IP banned"); setBanIp(""); invalidateAll(); },
    onError: () => toast.error("Failed"),
  });

  const onlineList: string[] = Array.isArray(onlinePlayers) ? onlinePlayers : [];
  const whitelistArr: string[] = Array.isArray(whitelist) ? whitelist : [];
  const opsArr: string[] = Array.isArray(ops) ? ops : [];
  const bannedArr: string[] = Array.isArray(banned) ? banned : [];
  const bannedIpsArr: string[] = Array.isArray(bannedIps) ? bannedIps : [];

  return (
    <div className="space-y-6">
      {/* Online Players */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-neon-green" /> Online Players
            <span className="text-xs text-muted-foreground">({onlineList.length})</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["players", uuid, "online"] })}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        {loadingOnline ? (
          <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-7 w-24" />)}</div>
        ) : onlineList.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {onlineList.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/10 text-neon-green text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green" /> {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No players online.</p>
        )}
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Whitelist */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-neon-green" /> Whitelist</h3>
          <div className="flex items-center gap-2">
            <Input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Player name" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && player.trim() && whitelistAdd.mutate(player.trim())} />
            <Button size="sm" onClick={() => player.trim() && whitelistAdd.mutate(player.trim())} disabled={!player.trim()}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
          {loadingWhitelist ? (
            <Skeleton className="h-16" />
          ) : whitelistArr.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {whitelistArr.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-xs group">
                  {p}
                  <button onClick={() => whitelistRemove.mutate(p)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-neon-red">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No whitelisted players.</p>
          )}
        </GlassCard>

        {/* Operators */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldOff className="w-4 h-4 text-neon-purple" /> Operators</h3>
          <div className="flex items-center gap-2">
            <Input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Player name" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && player.trim() && opAdd.mutate(player.trim())} />
            <Button size="sm" onClick={() => player.trim() && opAdd.mutate(player.trim())} disabled={!player.trim()}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Grant OP
            </Button>
          </div>
          {opsArr.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {opsArr.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neon-purple/10 text-xs group">
                  {p}
                  <button onClick={() => opRemove.mutate(p)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-neon-red">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No operators.</p>
          )}
        </GlassCard>

        {/* Ban / Kick */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Ban className="w-4 h-4 text-neon-red" /> Ban & Kick</h3>
          <div className="space-y-2">
            <Input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Player name" />
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" />
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-neon-red/10 text-neon-red hover:bg-neon-red/20"
                onClick={() => player.trim() && banPlayer.mutate({ player: player.trim(), reason: reason || undefined })} disabled={!player.trim()}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Ban
              </Button>
              <Button size="sm" variant="ghost" onClick={() => player.trim() && kickPlayer.mutate({ player: player.trim(), reason: reason || undefined })} disabled={!player.trim()}>
                <UserX className="w-3.5 h-3.5 mr-1" /> Kick
              </Button>
            </div>
          </div>
          {bannedArr.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Banned players:</p>
              <div className="flex flex-wrap gap-1.5">
                {bannedArr.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neon-red/10 text-xs group">
                    {p}
                    <button onClick={() => unbanPlayer.mutate(p)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-neon-green" title="Unban">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* IP Ban */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-neon-cyan" /> IP Ban</h3>
          <div className="flex items-center gap-2">
            <Input value={banIp} onChange={(e) => setBanIp(e.target.value)} placeholder="IP address" className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && banIp.trim() && banIpMutation.mutate(banIp.trim())} />
            <Button size="sm" className="bg-neon-red/10 text-neon-red hover:bg-neon-red/20"
              onClick={() => banIp.trim() && banIpMutation.mutate(banIp.trim())} disabled={!banIp.trim()}>
              Ban IP
            </Button>
          </div>
          {bannedIpsArr.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Banned IPs:</p>
              <div className="flex flex-wrap gap-1.5">
                {bannedIpsArr.map((ip) => (
                  <span key={ip} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-neon-cyan/10 text-xs font-mono">
                    {ip}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
