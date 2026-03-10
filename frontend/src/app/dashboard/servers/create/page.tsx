"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Cpu, HardDrive, MemoryStick, Server, Loader2 } from "lucide-react";
import Link from "next/link";
import { plansApi } from "@/lib/api/plans";
import { serversApi } from "@/lib/api/servers";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Plan, PriceCalculation } from "@/types";
import { getApiErrorMessage } from "@/lib/utils";
import type { CreateServerDto } from "@/types/dto";
import toast from "react-hot-toast";

type Step = "plan" | "configure" | "review";

export default function CreateServerPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<CreateServerDto>({
    name: "",
    planId: "",
    eggId: 0,
    nestId: 1,
    ram: 0,
    cpu: 0,
    disk: 0,
    environment: {},
  });
  const [price, setPrice] = useState<PriceCalculation | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => plansApi.list().then((r) => r.data),
  });

  const { data: eggs } = useQuery({
    queryKey: ["eggs"],
    queryFn: () => plansApi.getEggs().then((r) => r.data),
  });

  const { data: nodes } = useQuery({
    queryKey: ["nodes"],
    queryFn: () => plansApi.getNodes().then((r) => r.data),
    enabled: selectedPlan?.nodeAssignMode === "USER_SELECTABLE",
  });

  const calcMutation = useMutation({
    mutationFn: (d: { planId: string; ram: number; cpu: number; disk: number }) =>
      plansApi.calculatePrice(d).then((r) => r.data),
    onSuccess: setPrice,
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateServerDto) => serversApi.create(d).then((r) => r.data),
    onSuccess: (data) => {
      toast.success("Server created!");
      router.push(`/dashboard/servers/${data.id}`);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Failed to create server")),
  });

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setForm((f) => ({
      ...f,
      planId: plan.id,
      eggId: plan.eggId || 0,
      ram: plan.type === "CUSTOM" ? (plan.minRam || plan.ram) : plan.ram,
      cpu: plan.type === "CUSTOM" ? (plan.minCpu || plan.cpu) : plan.cpu,
      disk: plan.type === "CUSTOM" ? (plan.minDisk || plan.disk) : plan.disk,
    }));
    setStep("configure");
  };

  useEffect(() => {
    if (selectedPlan?.type === "CUSTOM" && form.planId) {
      const t = setTimeout(() => {
        calcMutation.mutate({ planId: form.planId, ram: form.ram!, cpu: form.cpu!, disk: form.disk! });
      }, 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ram, form.cpu, form.disk, form.planId, selectedPlan?.type]);

  const handleCreate = () => {
    if (!form.name.trim()) return toast.error("Enter a server name");
    if (!form.eggId) return toast.error("Select a server type");
    createMutation.mutate(form);
  };

  const steps: { key: Step; label: string }[] = [
    { key: "plan", label: "Select Plan" },
    { key: "configure", label: "Configure" },
    { key: "review", label: "Review & Create" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/servers">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Server</h1>
          <p className="text-sm text-muted-foreground">Set up a new game server in minutes.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.key === "plan") setStep("plan");
                if (s.key === "configure" && selectedPlan) setStep("configure");
                if (s.key === "review" && selectedPlan && form.name) setStep("review");
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                step === s.key ? "bg-neon-orange/10 text-neon-orange" :
                steps.findIndex((x) => x.key === step) > i ? "text-neon-green" : "text-muted-foreground"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                steps.findIndex((x) => x.key === step) > i ? "bg-neon-green/20 text-neon-green" :
                step === s.key ? "bg-neon-orange/20 text-neon-orange" : "bg-white/5 text-muted-foreground"
              }`}>
                {steps.findIndex((x) => x.key === step) > i ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "plan" && (
          <motion.div key="plan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {plansLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(plans ?? []).filter((p) => p.isActive).map((plan) => (
                  <GlassCard key={plan.id} hover className="p-5 cursor-pointer group" onClick={() => selectPlan(plan)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        plan.type === "FREE" ? "bg-neon-green/10 text-neon-green" :
                        plan.type === "CUSTOM" ? "bg-neon-purple/10 text-neon-purple" :
                        "bg-neon-orange/10 text-neon-orange"
                      }`}>{plan.type}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>}
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2"><MemoryStick className="w-3.5 h-3.5" /> {plan.type === "CUSTOM" ? `${plan.minRam || 512} - ${plan.maxRam || plan.ram}` : plan.ram} MB RAM</div>
                      <div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> {plan.type === "CUSTOM" ? `${plan.minCpu || 50} - ${plan.maxCpu || plan.cpu}` : plan.cpu}% CPU</div>
                      <div className="flex items-center gap-2"><HardDrive className="w-3.5 h-3.5" /> {plan.type === "CUSTOM" ? `${plan.minDisk || 1024} - ${plan.maxDisk || plan.disk}` : plan.disk} MB Disk</div>
                    </div>
                    <div className="text-lg font-bold">
                      {plan.type === "FREE" ? <span className="text-neon-green">Free</span> :
                       plan.type === "CUSTOM" ? <span className="text-neon-purple">From ₹{plan.pricePerGb}/GB</span> :
                       <span>₹{plan.pricePerMonth}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                      }
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {step === "configure" && selectedPlan && (
          <motion.div key="configure" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <GlassCard className="p-6 space-y-5">
              <div>
                <Label>Server Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="My Minecraft Server" className="mt-1.5" />
              </div>
              <div>
                <Label>Server Type (Egg)</Label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1.5">
                  {(eggs ?? []).map((egg) => (
                    <button key={egg.id} onClick={() => setForm((f) => ({ ...f, eggId: egg.id, nestId: egg.nest_id || 1, environment: {} }))}
                      className={`p-3 rounded-xl border text-left transition-all text-sm ${
                        form.eggId === egg.id ? "border-neon-orange bg-neon-orange/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                      }`}>
                      <p className="font-medium">{egg.name}</p>
                      {egg.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{egg.description}</p>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlan.type === "CUSTOM" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Custom Resources</h3>
                  <ResourceSlider label="RAM" unit="MB" icon={<MemoryStick className="w-4 h-4" />}
                    value={form.ram!} min={selectedPlan.minRam || 512} max={selectedPlan.maxRam || selectedPlan.ram} step={256}
                    onChange={(v) => setForm((f) => ({ ...f, ram: v }))} />
                  <ResourceSlider label="CPU" unit="%" icon={<Cpu className="w-4 h-4" />}
                    value={form.cpu!} min={selectedPlan.minCpu || 50} max={selectedPlan.maxCpu || selectedPlan.cpu} step={25}
                    onChange={(v) => setForm((f) => ({ ...f, cpu: v }))} />
                  <ResourceSlider label="Disk" unit="MB" icon={<HardDrive className="w-4 h-4" />}
                    value={form.disk!} min={selectedPlan.minDisk || 1024} max={selectedPlan.maxDisk || selectedPlan.disk} step={512}
                    onChange={(v) => setForm((f) => ({ ...f, disk: v }))} />
                  {price && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neon-orange/5 border border-neon-orange/20">
                      <span className="text-sm text-muted-foreground">Estimated Price</span>
                      <span className="text-xl font-bold text-neon-orange">₹{price.totalPrice}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                    </div>
                  )}
                </div>
              )}

              {selectedPlan.nodeAssignMode === "USER_SELECTABLE" && nodes && (
                <div>
                  <Label>Select Node (Location)</Label>
                  <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                    {nodes.map((node) => (
                      <button key={node.id} onClick={() => setForm((f) => ({ ...f, nodeId: node.id }))}
                        className={`p-3 rounded-xl border text-left transition-all text-sm ${
                          form.nodeId === node.id ? "border-neon-orange bg-neon-orange/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                        }`}>
                        <p className="font-medium">{node.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("plan")}>Back</Button>
              <Button variant="glow" onClick={() => {
                if (!form.name.trim()) return toast.error("Enter a server name");
                if (!form.eggId) return toast.error("Select a server type");
                setStep("review");
              }}>Continue</Button>
            </div>
          </motion.div>
        )}

        {step === "review" && selectedPlan && (
          <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <GlassCard className="p-6 space-y-4">
              <h3 className="font-semibold">Review Server</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div><span className="text-muted-foreground">Name</span><p className="font-medium">{form.name}</p></div>
                  <div><span className="text-muted-foreground">Plan</span><p className="font-medium">{selectedPlan.name} ({selectedPlan.type})</p></div>
                  <div><span className="text-muted-foreground">Server Type</span>
                    <p className="font-medium">{eggs?.find((e) => e.id === form.eggId)?.name || `Egg #${form.eggId}`}</p></div>
                </div>
                <div className="space-y-3">
                  <div><span className="text-muted-foreground">RAM</span><p className="font-medium">{selectedPlan.type === "CUSTOM" ? form.ram : selectedPlan.ram} MB</p></div>
                  <div><span className="text-muted-foreground">CPU</span><p className="font-medium">{selectedPlan.type === "CUSTOM" ? form.cpu : selectedPlan.cpu}%</p></div>
                  <div><span className="text-muted-foreground">Disk</span><p className="font-medium">{selectedPlan.type === "CUSTOM" ? form.disk : selectedPlan.disk} MB</p></div>
                </div>
              </div>
              {selectedPlan.type !== "FREE" && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-muted-foreground">Total Price</span>
                  <span className="text-xl font-bold">{selectedPlan.type === "CUSTOM" && price ? `₹${price.totalPrice}` : `₹${selectedPlan.pricePerMonth}`}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                </div>
              )}
            </GlassCard>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("configure")}>Back</Button>
              <Button variant="glow" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><Server className="w-4 h-4 mr-2" />Create Server</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResourceSlider({ label, unit, icon, value, min, max, step, onChange }: {
  label: string; unit: string; icon: React.ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">{icon} {label}</div>
        <span className="text-sm font-mono">{value} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-neon-orange [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon-orange [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,107,53,0.5)]" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}
