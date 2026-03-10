"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cpu, HardDrive, MemoryStick, Database, Network, Archive } from "lucide-react";
import { plansApi } from "@/lib/api/plans";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { Plan } from "@/types";

export default function PlansPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: () => plansApi.list().then((r) => r.data),
  });

  const activePlans = (plans ?? []).filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold">Server Plans</h1>
        <p className="text-muted-foreground mt-2">Choose the plan that fits your needs. Upgrade anytime.</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {activePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const isPremium = plan.type === "PREMIUM";
  const isFree = plan.type === "FREE";
  const isCustom = plan.type === "CUSTOM";

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
      <GlassCard className={`p-6 relative overflow-hidden ${isPremium ? "ring-1 ring-neon-orange/30" : ""}`}>
        {isPremium && (
          <div className="absolute top-0 right-0 px-3 py-1 bg-neon-orange text-black text-xs font-bold rounded-bl-xl">POPULAR</div>
        )}
        <div className="mb-4">
          <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
            isFree ? "bg-neon-green/10 text-neon-green" :
            isCustom ? "bg-neon-purple/10 text-neon-purple" :
            "bg-neon-orange/10 text-neon-orange"
          }`}>{plan.type}</span>
          <h3 className="text-xl font-bold mt-2">{plan.name}</h3>
          {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
        </div>

        <div className="mb-6">
          {isFree ? (
            <p className="text-3xl font-bold text-neon-green">Free</p>
          ) : isCustom ? (
            <p className="text-2xl font-bold">From ₹{plan.pricePerGb}<span className="text-sm text-muted-foreground font-normal">/GB</span></p>
          ) : (
            <p className="text-3xl font-bold">₹{plan.pricePerMonth}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <Feature icon={MemoryStick} label={isCustom ? `${plan.minRam || 512} - ${plan.maxRam || plan.ram} MB RAM` : `${plan.ram} MB RAM`} />
          <Feature icon={Cpu} label={isCustom ? `${plan.minCpu || 50} - ${plan.maxCpu || plan.cpu}% CPU` : `${plan.cpu}% CPU`} />
          <Feature icon={HardDrive} label={isCustom ? `${plan.minDisk || 1024} - ${plan.maxDisk || plan.disk} MB Disk` : `${plan.disk} MB Disk`} />
          <Feature icon={Archive} label={`${plan.backups} Backups`} />
          <Feature icon={Database} label={`${plan.databases} Databases`} />
          <Feature icon={Network} label={`${plan.ports} Extra Ports`} />
        </div>

        <Link href="/dashboard/servers/create" className="block">
          <Button variant={isPremium ? "glow" : "default"} className="w-full">
            {isFree ? "Get Started Free" : "Select Plan"}
          </Button>
        </Link>
      </GlassCard>
    </motion.div>
  );
}

function Feature({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span>{label}</span>
    </div>
  );
}
