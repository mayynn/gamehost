"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Server, Plus, ArrowRight, Search } from "lucide-react";
import { serversApi } from "@/lib/api/servers";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function ServersPage() {
  const [search, setSearch] = useState("");
  const { data: servers, isLoading } = useQuery({
    queryKey: ["servers"],
    queryFn: () => serversApi.list().then((r) => r.data),
  });

  const filtered = servers?.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all your game servers.</p>
        </div>
        <Link href="/dashboard/servers/create">
          <Button variant="glow"><Plus className="w-4 h-4 mr-2" /> New Server</Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search servers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length > 0 ? (
        <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }} className="grid gap-3">
          {filtered.map((server) => (
            <motion.div key={server.id} variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}>
              <Link href={`/dashboard/servers/${server.id}`}>
                <GlassCard hover className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neon-orange/10 ring-1 ring-neon-orange/20">
                        <Server className="w-6 h-6 text-neon-orange" />
                      </div>
                      <div>
                        <p className="font-semibold">{server.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{server.ram} MB RAM</span>
                          <span>&middot;</span>
                          <span>{server.cpu}% CPU</span>
                          <span>&middot;</span>
                          <span>{server.disk} MB Disk</span>
                        </div>
                        {server.plan && <p className="text-xs text-muted-foreground mt-0.5">Plan: {server.plan.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        server.status === "ACTIVE" ? "bg-neon-green/10 text-neon-green" :
                        server.status === "INSTALLING" ? "bg-neon-cyan/10 text-neon-cyan" :
                        server.status === "SUSPENDED" ? "bg-neon-red/10 text-neon-red" :
                        server.status === "EXPIRED" ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-white/5 text-muted-foreground"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          server.status === "ACTIVE" ? "bg-neon-green" :
                          server.status === "INSTALLING" ? "bg-neon-cyan" :
                          server.status === "SUSPENDED" ? "bg-neon-red" :
                          server.status === "EXPIRED" ? "bg-yellow-500" :
                          "bg-muted-foreground"
                        }`} />
                        {server.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <GlassCard className="p-16 text-center">
          <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{search ? "No servers match your search." : "No servers yet."}</p>
        </GlassCard>
      )}
    </div>
  );
}
