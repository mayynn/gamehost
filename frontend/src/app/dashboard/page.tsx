"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Server, Monitor, CreditCard, Coins, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { serversApi } from "@/lib/api/servers";
import { billingApi } from "@/lib/api/billing";
import { creditsApi } from "@/lib/api/credits";
import { vpsApi } from "@/lib/api/vps";
import { useAuthStore } from "@/lib/stores/auth";
import { StatCard } from "@/components/ui/stat-card";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const containerVariants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ["servers"],
    queryFn: () => serversApi.list().then((r) => r.data),
  });
  const { data: balance } = useQuery({
    queryKey: ["balance"],
    queryFn: () => billingApi.getBalance().then((r) => r.data),
  });
  const { data: credits } = useQuery({
    queryKey: ["credits"],
    queryFn: () => creditsApi.get().then((r) => r.data),
  });
  const { data: vpsList } = useQuery({
    queryKey: ["vps"],
    queryFn: () => vpsApi.list().then((r) => r.data),
  });

  const activeServers = servers?.filter((s) => s.status === "ACTIVE").length ?? 0;

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here&apos;s an overview of your resources.</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {serversLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard title="Active Servers" value={activeServers} icon={Server} color="orange" change={`${servers?.length ?? 0} total`} />
            <StatCard title="VPS Instances" value={vpsList?.length ?? 0} icon={Monitor} color="purple" />
            <StatCard title="Balance" value={formatCurrency(balance?.amount ?? 0)} icon={CreditCard} color="cyan" />
            <StatCard title="Credits" value={credits?.amount ?? 0} icon={Coins} color="green" />
          </>
        )}
      </motion.div>

      {/* Servers List */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Servers</h2>
          <Link href="/dashboard/servers/create">
            <Button variant="glow" size="sm">
              <Plus className="w-4 h-4 mr-2" /> New Server
            </Button>
          </Link>
        </div>

        {serversLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : servers && servers.length > 0 ? (
          <div className="grid gap-3">
            {servers.slice(0, 6).map((server) => (
              <Link key={server.id} href={`/dashboard/servers/${server.id}`}>
                <GlassCard hover className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-orange/10 ring-1 ring-neon-orange/20">
                        <Server className="w-5 h-5 text-neon-orange" />
                      </div>
                      <div>
                        <p className="font-medium">{server.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {server.ram} MB RAM &middot; {server.cpu}% CPU &middot; {server.disk} MB Disk
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        server.status === "ACTIVE" ? "bg-neon-green/10 text-neon-green" :
                        server.status === "INSTALLING" ? "bg-neon-cyan/10 text-neon-cyan" :
                        server.status === "SUSPENDED" ? "bg-neon-red/10 text-neon-red" :
                        "bg-white/5 text-muted-foreground"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          server.status === "ACTIVE" ? "bg-neon-green" :
                          server.status === "INSTALLING" ? "bg-neon-cyan" :
                          server.status === "SUSPENDED" ? "bg-neon-red" :
                          "bg-muted-foreground"
                        }`} />
                        {server.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No servers yet. Create your first server!</p>
            <Link href="/dashboard/servers/create">
              <Button variant="glow">
                <Plus className="w-4 h-4 mr-2" /> Create Server
              </Button>
            </Link>
          </GlassCard>
        )}
      </motion.div>
    </motion.div>
  );
}
