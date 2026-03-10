"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Plus, Power, RotateCcw, Globe, Clock, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { vpsApi } from "@/lib/api/vps";
import type { Vps, VpsPlan } from "@/types";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export default function VpsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: vpsList, isLoading } = useQuery({
    queryKey: ["vps-list"],
    queryFn: () => vpsApi.list().then((r) => r.data),
  });

  const { data: vpsPlans } = useQuery({
    queryKey: ["vps-plans"],
    queryFn: () => vpsApi.getPlans().then((r) => r.data),
    enabled: showCreate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Virtual Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your VPS instances.</p>
        </div>
        <Button variant="glow" onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" /> New VPS</Button>
      </div>

      {showCreate && <CreateVpsForm plans={vpsPlans ?? []} onClose={() => setShowCreate(false)} />}

      {isLoading ? (
        <div className="grid gap-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : vpsList && vpsList.length > 0 ? (
        <div className="grid gap-4">
          {vpsList.map((vps: Vps) => (
            <VpsCard key={vps.id} vps={vps} />
          ))}
        </div>
      ) : (
        <GlassCard className="p-12 text-center">
          <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No VPS instances yet.</p>
        </GlassCard>
      )}
    </div>
  );
}

function CreateVpsForm({ plans, onClose }: { plans: VpsPlan[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [os, setOs] = useState("");
  const [hostname, setHostname] = useState("");

  const { data: osList } = useQuery({
    queryKey: ["vps-os", selectedPlan],
    queryFn: () => vpsApi.getPlanOs(selectedPlan).then((r) => r.data),
    enabled: !!selectedPlan,
  });

  const createMutation = useMutation({
    mutationFn: () => vpsApi.provision({ planId: selectedPlan, os, hostname }),
    onSuccess: () => { toast.success("VPS provisioning started!"); onClose(); queryClient.invalidateQueries({ queryKey: ["vps-list"] }); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Failed to create VPS")),
  });

  return (
    <GlassCard className="p-6 space-y-4">
      <h3 className="font-semibold">Create New VPS</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.filter((p) => p.isActive).map((plan) => (
          <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedPlan === plan.id ? "border-neon-orange bg-neon-orange/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
            }`}>
            <p className="font-semibold text-sm">{plan.displayName}</p>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>{plan.ram} MB RAM / {plan.cpu} vCPU / {plan.disk} GB Disk</p>
              <p>{plan.bandwidth} GB Bandwidth</p>
            </div>
            <p className="text-lg font-bold mt-2">₹{plan.sellPrice}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </button>
        ))}
      </div>
      {selectedPlan && (
        <>
          <div>
            <Label>Operating System</Label>
            <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
              {(osList ?? []).map((o: string) => (
                <button key={o} onClick={() => setOs(o)}
                  className={`p-2 rounded-lg border text-sm text-left transition-all ${
                    os === o ? "border-neon-orange bg-neon-orange/5" : "border-white/10 hover:border-white/20"
                  }`}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Hostname</Label>
            <Input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="my-vps" className="mt-1.5" />
          </div>
          <div className="flex gap-2">
            <Button variant="glow" onClick={() => createMutation.mutate()} disabled={!os || !hostname.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Provision VPS
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </>
      )}
    </GlassCard>
  );
}

function VpsCard({ vps }: { vps: Vps }) {
  const queryClient = useQueryClient();

  const controlMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (action: string) => vpsApi.control(vps.id, action as any),
    onSuccess: (_, action) => { toast.success(`VPS ${action} command sent`); queryClient.invalidateQueries({ queryKey: ["vps-list"] }); },
    onError: () => toast.error("Control action failed"),
  });

  const renewMutation = useMutation({
    mutationFn: () => vpsApi.renew(vps.id),
    onSuccess: () => { toast.success("VPS renewed"); queryClient.invalidateQueries({ queryKey: ["vps-list"] }); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Renewal failed")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => vpsApi.delete(vps.id),
    onSuccess: () => { toast.success("VPS deleted"); queryClient.invalidateQueries({ queryKey: ["vps-list"] }); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Delete failed")),
  });

  const statusColor = vps.status === "ACTIVE" ? "neon-green" : vps.status === "PROVISIONING" ? "neon-cyan" : vps.status === "SUSPENDED" ? "neon-red" : "yellow-500";

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/10 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-neon-purple" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{vps.hostname || "VPS"}</p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-${statusColor}/10 text-${statusColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${statusColor}`} /> {vps.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {vps.ip && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {vps.ip}</span>}
              {vps.os && <span>{vps.os}</span>}
              {vps.ram && <span>{vps.ram} MB RAM</span>}
            </div>
            {vps.expiresAt && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Expires: {new Date(vps.expiresAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={() => controlMutation.mutate("start")} disabled={controlMutation.isPending}>
            <Power className="w-3.5 h-3.5 text-neon-green" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => controlMutation.mutate("restart")} disabled={controlMutation.isPending}>
            <RotateCcw className="w-3.5 h-3.5 text-neon-cyan" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => controlMutation.mutate("stop")} disabled={controlMutation.isPending}>
            <Power className="w-3.5 h-3.5 text-neon-red" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => renewMutation.mutate()} disabled={renewMutation.isPending} title="Renew">
            <RefreshCw className="w-3.5 h-3.5 text-neon-orange" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this VPS? This cannot be undone.")) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending} title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-neon-red" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
