"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui";
import { useAuthStore } from "@/lib/stores/auth";
import {
  LayoutDashboard,
  Server,
  Monitor,
  CreditCard,
  Coins,
  Package,
  LifeBuoy,
  User,
  Shield,
  Users,
  Settings,
  ChevronLeft,
  Gamepad2,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Servers", href: "/dashboard/servers", icon: Server },
  { label: "VPS", href: "/dashboard/vps", icon: Monitor },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Credits", href: "/dashboard/credits", icon: Coins },
  { label: "Plans", href: "/dashboard/plans", icon: Package },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Profile", href: "/dashboard/profile", icon: User },
];

const adminItems = [
  { label: "Overview", href: "/dashboard/admin", icon: Shield },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Servers", href: "/dashboard/admin/servers", icon: Server },
  { label: "Billing", href: "/dashboard/admin/billing", icon: CreditCard },
  { label: "System", href: "/dashboard/admin/system", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-background/80 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-[68px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon-gradient">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold neon-text">GameHost</span>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <>
              <div className="pt-4 pb-2">
                {!sidebarCollapsed && (
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
                )}
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-neon-red/10 text-neon-red border border-neon-red/20"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-neon-red")} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Collapse Toggle */}
        <div className="hidden lg:flex p-3 border-t border-white/10">
          <button
            onClick={toggleSidebarCollapsed}
            className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
}
