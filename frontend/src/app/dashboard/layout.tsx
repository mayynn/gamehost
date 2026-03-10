"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import { useUIStore } from "@/lib/stores/ui";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-64")}>
          <TopNavbar />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
