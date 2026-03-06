'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, settingsApi, billingApi, creditsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Server, CreditCard, Wallet, Coins, Package, User, Headphones,
  Monitor, ChevronLeft, ChevronRight, LogOut, Menu, X, Shield, Loader2, Zap
} from 'lucide-react';

interface NavItem { label: string; href: string; icon: ReactNode; badge?: string; }
interface NavGroup { title: string; items: NavItem[]; }

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, clearUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [vpsEnabled, setVpsEnabled] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    billingApi.balance().then(r => setBalance(r.data.balance ?? r.data.amount ?? 0)).catch(() => {});
    creditsApi.get().then(r => setCredits(r.data.amount ?? 0)).catch(() => {});
    settingsApi.public().then(r => {
      const s = r.data;
      if (s.VPS_ENABLED === 'true' || s.VPS_ENABLED === true) setVpsEnabled(true);
    }).catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearUser();
    router.push('/login');
    toast.success('Logged out');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-dark)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-primary/60 animate-spin" />
        </div>
      </div>
    );
  }

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { label: 'My Servers', href: '/dashboard/servers', icon: <Server className="w-[18px] h-[18px]" /> },
        ...(vpsEnabled ? [{ label: 'VPS', href: '/dashboard/vps', icon: <Monitor className="w-[18px] h-[18px]" /> }] : []),
      ],
    },
    {
      title: 'Financials',
      items: [
        { label: 'Plans', href: '/dashboard/plans', icon: <Package className="w-[18px] h-[18px]" /> },
        { label: 'Billing', href: '/dashboard/billing', icon: <CreditCard className="w-[18px] h-[18px]" /> },
        { label: 'Balance', href: '/dashboard/balance', icon: <Wallet className="w-[18px] h-[18px]" /> },
        { label: 'Credits', href: '/dashboard/credits', icon: <Coins className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', href: '/dashboard/profile', icon: <User className="w-[18px] h-[18px]" /> },
        { label: 'Support', href: '/dashboard/support', icon: <Headphones className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const userInitial = user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-blue-500 to-neon-purple flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-display font-bold text-white tracking-tight">GameHost</span>
              <div className="text-[10px] text-gray-500 font-medium -mt-0.5">Control Panel</div>
            </div>
          )}
        </Link>
      </div>

      {/* User Card */}
      {!collapsed && (
        <div className="mx-4 mb-5 p-3 rounded-xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(0,212,255,0.08), transparent 60%)' }} />
          <div className="relative flex items-center gap-3">
            <div className="avatar w-9 h-9 text-sm flex-shrink-0">{userInitial}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{user.name || 'User'}</div>
              <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          {/* Balance/Credits row */}
          <div className="relative flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-1 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Balance</div>
              <div className="text-sm font-bold text-primary mt-0.5">₹{balance?.toFixed(2) ?? '...'}</div>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex-1 text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Credits</div>
              <div className="text-sm font-bold text-accent mt-0.5">{credits ?? '...'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Balance/Credits */}
      {collapsed && (
        <div className="px-3 mb-4 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.15)' }}>
            <Coins className="w-4 h-4 text-accent" />
          </div>
        </div>
      )}

      {/* Nav Groups */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && <div className="text-[10px] uppercase tracking-[0.12em] text-gray-600 font-semibold px-3 mb-2">{group.title}</div>}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 group relative
                    ${isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'}`}
                  style={isActive(item.href) ? {
                    background: 'linear-gradient(90deg, rgba(0,212,255,0.1), rgba(0,212,255,0.03))',
                    boxShadow: 'inset 3px 0 0 var(--primary)',
                  } : undefined}
                  title={collapsed ? item.label : undefined}>
                  <span className={`flex-shrink-0 transition-colors ${isActive(item.href) ? 'text-primary' : 'text-gray-600 group-hover:text-gray-400'}`}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {item.label}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Admin Link */}
        {user.role === 'ADMIN' && (
          <div>
            {!collapsed && <div className="text-[10px] uppercase tracking-[0.12em] text-gray-600 font-semibold px-3 mb-2">Admin</div>}
            <Link href="/admin" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300
                ${pathname.startsWith('/admin') ? 'text-accent' : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'}`}
              style={pathname.startsWith('/admin') ? { background: 'rgba(255,77,106,0.08)', boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}>
              <Shield className="w-[18px] h-[18px]" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all w-full group">
          <LogOut className="w-[18px] h-[18px] group-hover:text-red-400" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-dark)' }}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-30 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
        style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-dark) 100%)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-all z-40"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
        style={{ background: 'rgba(6,10,20,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"><Menu className="w-5 h-5" /></button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-white text-sm">GameHost</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--primary)' }}>
            <Wallet className="w-3 h-3" />₹{balance?.toFixed(0) ?? '…'}
          </div>
          <div className="avatar w-7 h-7 text-xs">{userInitial}</div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 h-screen w-[280px] z-50"
              style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-dark) 100%)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="absolute top-4 right-4">
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'} pt-14 lg:pt-0`}>
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
