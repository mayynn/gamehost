'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { serversApi, billingApi, creditsApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { StaggerContainer, FadeUpItem, Skeleton } from '@/components/ui/Animations';
import { Server, Wallet, Coins, Activity, Plus, ArrowRight, Clock, Cpu, HardDrive, MemoryStick, Zap, TrendingUp, Rocket } from 'lucide-react';

const ResourceBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="progress-bar">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
        className="progress-bar-fill" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)`, color }} />
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      serversApi.list().then(r => setServers(r.data)).catch(() => setError(true)),
      billingApi.balance().then(r => setBalance(typeof r.data === 'number' ? r.data : (r.data?.balance ?? r.data?.amount ?? 0))).catch(() => {}),
      creditsApi.get().then(r => setCredits(typeof r.data === 'number' ? r.data : (r.data?.amount ?? 0))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeServers = servers.filter(s => s.status === 'ACTIVE').length;

  const statCards = [
    { label: 'Active Servers', value: activeServers, sub: `of ${servers.length} total`, icon: <Server className="w-5 h-5" />, color: '#00d4ff', cardClass: 'stat-card-cyan' },
    { label: 'Server Uptime', value: servers.length > 0 ? `${Math.round((activeServers / servers.length) * 100)}%` : '—', sub: 'Running status', icon: <Activity className="w-5 h-5" />, color: '#7c3aed', cardClass: 'stat-card-purple' },
    { label: 'Balance', value: `₹${balance.toFixed(2)}`, sub: 'Available funds', icon: <Wallet className="w-5 h-5" />, color: '#10b981', cardClass: 'stat-card-green' },
    { label: 'Credits', value: credits, sub: 'Earned rewards', icon: <Coins className="w-5 h-5" />, color: '#ff4d6a', cardClass: 'stat-card-accent' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(255,77,106,0.03) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(0,212,255,0.1), transparent 50%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-soft" />
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Control Panel</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'User'}</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1.5">Monitor your infrastructure and manage deployments.</p>
          </div>
          <Link href="/dashboard/servers/create" className="btn-primary flex items-center gap-2 text-sm w-fit">
            <Rocket className="w-4 h-4" /> Deploy Server
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <FadeUpItem key={i}>
              <div className={`stat-card ${card.cardClass}`}>
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2">{card.label}</p>
                    <p className="text-2xl font-display font-bold text-white">{card.value}</p>
                    <p className="text-[11px] text-gray-600 mt-1">{card.sub}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${card.color}12`, border: `1px solid ${card.color}20` }}>
                    <span style={{ color: card.color }}>{card.icon}</span>
                  </div>
                </div>
              </div>
            </FadeUpItem>
          ))}
        </StaggerContainer>
      )}

      {/* Quick Actions + Server List */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Server List - takes 2 cols */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> Your Servers
            </h2>
            <Link href="/dashboard/servers" className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors font-medium">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          ) : servers.length === 0 ? (
            <div className="neo-card text-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.12)' }}>
                <Server className="w-7 h-7 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Servers Yet</h3>
              <p className="text-gray-500 mb-6 text-sm">Deploy your first game server in seconds.</p>
              <Link href="/dashboard/servers/create" className="btn-primary inline-flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create Server</Link>
            </div>
          ) : (
            <StaggerContainer className="space-y-2.5">
              {servers.slice(0, 5).map((s: any) => {
                const daysLeft = s.expiresAt ? Math.max(0, Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86400000)) : null;
                return (
                  <FadeUpItem key={s.id}>
                    <Link href={`/dashboard/servers/${s.id}`} className="block neo-card-interactive p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                            s.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            <Server className="w-[18px] h-[18px]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-white truncate">{s.name}</h3>
                            <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-1">
                              <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3" />{s.ram >= 1024 ? `${(s.ram/1024).toFixed(1)}GB` : `${s.ram}MB`}</span>
                              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{s.cpu}%</span>
                              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{s.disk >= 1024 ? `${(s.disk/1024).toFixed(1)}GB` : `${s.disk}MB`}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {daysLeft !== null && (
                            <span className={`text-[11px] hidden sm:flex items-center gap-1 ${daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : 'text-gray-600'}`}>
                              <Clock className="w-3 h-3" />{daysLeft}d
                            </span>
                          )}
                          <span className={`status-${s.status?.toLowerCase() || 'active'}`}>{s.status}</span>
                        </div>
                      </div>
                    </Link>
                  </FadeUpItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>

        {/* Quick Actions sidebar */}
        <div className="space-y-4">
          <h2 className="text-base font-display font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" /> Quick Actions
          </h2>
          <div className="space-y-2.5">
            {[
              { label: 'Deploy New Server', desc: 'Launch a game server', href: '/dashboard/servers/create', icon: <Rocket className="w-4 h-4" />, color: '#00d4ff' },
              { label: 'Add Balance', desc: 'Top up your wallet', href: '/dashboard/billing', icon: <Wallet className="w-4 h-4" />, color: '#10b981' },
              { label: 'Earn Credits', desc: 'Watch ads for credits', href: '/dashboard/credits', icon: <Coins className="w-4 h-4" />, color: '#ff4d6a' },
              { label: 'Browse Plans', desc: 'View available plans', href: '/dashboard/plans', icon: <TrendingUp className="w-4 h-4" />, color: '#7c3aed' },
            ].map(a => (
              <Link key={a.href} href={a.href} className="neo-card-interactive flex items-center gap-3.5 p-4 group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: `${a.color}12`, border: `1px solid ${a.color}15`, color: a.color }}>
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white">{a.label}</div>
                  <div className="text-[11px] text-gray-600">{a.desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>

          {/* Resource Overview */}
          {!loading && servers.length > 0 && (
            <div className="neo-card">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Total Resources
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'RAM', val: servers.reduce((a: number, s: any) => a + (s.ram || 0), 0), unit: 'MB', color: '#00d4ff', max: servers.reduce((a: number, s: any) => a + (s.ram || 0), 0) * 1.5 },
                  { label: 'CPU', val: servers.reduce((a: number, s: any) => a + (s.cpu || 0), 0), unit: '%', color: '#7c3aed', max: servers.reduce((a: number, s: any) => a + (s.cpu || 0), 0) * 1.5 },
                  { label: 'Disk', val: servers.reduce((a: number, s: any) => a + (s.disk || 0), 0), unit: 'MB', color: '#10b981', max: servers.reduce((a: number, s: any) => a + (s.disk || 0), 0) * 1.5 },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="text-gray-400 font-medium">{r.label}</span>
                      <span className="text-gray-500">{r.val >= 1024 ? `${(r.val/1024).toFixed(1)} GB` : `${r.val} ${r.unit}`}</span>
                    </div>
                    <ResourceBar value={r.val} max={r.max} color={r.color} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
