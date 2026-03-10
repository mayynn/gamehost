"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Server, CreditCard, Activity, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard().then((r) => r.data),
  });

  const { data: pendingUpi } = useQuery({
    queryKey: ["admin-pending-upi"],
    queryFn: () => adminApi.getPendingUpi().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System overview and management.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={dashboard?.totalUsers ?? 0} icon={Users} color="cyan" />
        <StatCard title="Total Servers" value={dashboard?.totalServers ?? 0} icon={Server} color="orange" />
        <StatCard title="Revenue" value={`₹${dashboard?.totalRevenue ?? 0}`} icon={CreditCard} color="green" />
        <StatCard title="Active Servers" value={dashboard?.activeServers ?? 0} icon={Activity} color="purple" />
      </div>

      {/* Pending UPI */}
      {pendingUpi && pendingUpi.length > 0 && (
        <GlassCard className="p-5 border-yellow-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-sm">Pending UPI Approvals ({pendingUpi.length})</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            There are {pendingUpi.length} UPI payments awaiting approval.{" "}
            <Link href="/dashboard/admin/billing" className="text-neon-orange hover:underline">Review now →</Link>
          </p>
        </GlassCard>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/dashboard/admin/users", label: "Manage Users", icon: Users, color: "neon-cyan" },
          { href: "/dashboard/admin/servers", label: "Manage Servers", icon: Server, color: "neon-orange" },
          { href: "/dashboard/admin/billing", label: "Billing & UPI", icon: CreditCard, color: "neon-green" },
          { href: "/dashboard/admin/system", label: "System Settings", icon: Activity, color: "neon-purple" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <GlassCard hover className="p-5 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${item.color}/10`}><item.icon className={`w-5 h-5 text-${item.color}`} /></div>
              <span className="font-medium text-sm">{item.label}</span>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Additional stats */}
      {dashboard && (
        <div className="grid sm:grid-cols-3 gap-4">
          <GlassCard className="p-5">
            <p className="text-xs text-muted-foreground">Suspended Servers</p>
            <p className="text-2xl font-bold mt-1">{dashboard.suspendedServers ?? 0}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs text-muted-foreground">New Users (24h)</p>
            <p className="text-2xl font-bold mt-1">{dashboard.newUsersToday ?? 0}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs text-muted-foreground">Payments Today</p>
            <p className="text-2xl font-bold mt-1">₹{dashboard.revenueToday ?? 0}</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
