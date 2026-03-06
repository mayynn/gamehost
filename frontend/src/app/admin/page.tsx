'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { adminApi, plansApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Server, Shield, Package, Cloud, IndianRupee,
  Settings, FileText, Loader2, Trash2, Edit3, Plus, Crown, Ban, CheckCircle,
  XCircle, X, ChevronLeft, ChevronRight, RefreshCw, Search, Eye, Activity,
  AlertTriangle, Monitor, Zap, Globe, Database, HardDrive, Cpu, ArrowUpRight,
  UserCheck, ServerCrash, TrendingUp, Clock, Filter, MoreVertical, Copy,
  ExternalLink, Fingerprint, Link2, ArrowLeft
} from 'lucide-react';

/* ═══════════ SIDEBAR CONFIG ═══════════ */
const NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { group: 'Management', items: [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'alts', label: 'Alt Detection', icon: Fingerprint },
  ]},
  { group: 'Products', items: [
    { id: 'plans', label: 'Game Plans', icon: Package },
    { id: 'vps', label: 'VPS Plans', icon: Cloud },
  ]},
  { group: 'Finance', items: [
    { id: 'upi', label: 'UPI Approvals', icon: IndianRupee },
  ]},
  { group: 'System', items: [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ]},
];

/* ═══════════ MAIN ADMIN PAGE ═══════════ */
export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.push('/dashboard');
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="flex min-h-[calc(100vh-80px)] gap-0">
      {/* ─── Sidebar ─── */}
      <aside className="w-[220px] shrink-0 py-4 pr-3 space-y-5 hidden lg:block">
        {/* Back to Dashboard */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all mb-2" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        {NAV.map(g => (
          <div key={g.group}>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1.5">{g.group}</p>
            {g.items.map(item => {
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}
                  style={active ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.12)' } : { border: '1px solid transparent' }}>
                  <item.icon className={`w-4 h-4 ${active ? 'text-primary' : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      {/* ─── Mobile Tab Bar ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex gap-1 p-2 overflow-x-auto scrollbar-none" style={{ background: 'rgba(6,10,20,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap text-gray-500">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>
        {NAV.flatMap(g => g.items).map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${tab === item.id ? 'text-primary' : 'text-gray-500'}`}
            style={tab === item.id ? { background: 'rgba(0,212,255,0.08)' } : undefined}>
            <item.icon className="w-4 h-4" />{item.label}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <main className="flex-1 min-w-0 py-4 pl-3 lg:pl-0 pr-0 pb-20 lg:pb-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {tab === 'dashboard' && <DashboardTab />}
            {tab === 'users' && <UsersTab />}
            {tab === 'servers' && <ServersTab />}
            {tab === 'alts' && <AltsTab />}
            {tab === 'plans' && <PlansTab />}
            {tab === 'vps' && <VpsPlansTab />}
            {tab === 'upi' && <UpiTab />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'audit' && <AuditTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ═══════════ DASHBOARD TAB ═══════════ */
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    adminApi.dashboard().then(r => setStats(r.data)).catch(() => {});
    adminApi.auditLogs(1).then(r => setAudit((r.data?.logs || []).slice(0, 8))).catch(() => {});
  }, []);

  if (!stats) return <Loader />;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers ?? stats.users ?? 0, icon: Users, color: 'cyan' },
    { label: 'Total Servers', value: stats.totalServers ?? stats.servers ?? 0, icon: Server, color: 'green' },
    { label: 'Active Servers', value: stats.activeServers ?? 0, icon: Activity, color: 'green' },
    { label: 'Revenue', value: `₹${stats.revenue ?? stats.totalRevenue ?? 0}`, icon: TrendingUp, color: 'yellow' },
    { label: 'Pending UPI', value: stats.pendingUpi ?? 0, icon: IndianRupee, color: 'orange' },
    { label: 'Suspended', value: stats.suspendedServers ?? 0, icon: ServerCrash, color: 'accent' },
    { label: 'Total Balance', value: `₹${stats.totalBalanceAcrossUsers ?? 0}`, icon: Database, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <TabHeader title="Dashboard" subtitle="System overview & activity" icon={LayoutDashboard} />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className={`stat-card stat-card-${c.color} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{c.label}</p>
              <c.icon className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-2xl font-display font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="neo-card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary" /> Recent Activity</h3>
        </div>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {audit.map((l: any, i: number) => (
              <div key={l.id ?? i} className="px-4 py-2.5 flex items-center gap-3">
                <AuditDot action={l.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white truncate">{l.action}</p>
                  <p className="text-[11px] text-gray-600">{l.user?.email || ''} · {timeAgo(l.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ USERS TAB ═══════════ */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.users(page); setUsers(r.data?.users || r.data?.data || []); setTotal(r.data?.total || 0); }
    catch {} finally { setLoading(false); }
  }, [page]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const setRole = async (id: string, role: string) => {
    try { await adminApi.setRole(id, role); toast.success('Role updated'); fetchUsers(); } catch { toast.error('Failed'); }
  };
  const deleteUser = async (id: string) => {
    if (!confirm('Permanently delete this user and all their servers?')) return;
    try { await adminApi.deleteUser(id); toast.success('User deleted'); fetchUsers(); setDetail(null); } catch { toast.error('Failed'); }
  };
  const viewDetail = async (id: string) => {
    try { const r = await adminApi.userDetails(id); setDetail(r.data); } catch { toast.error('Failed to load details'); }
  };

  const filtered = search ? users.filter((u: any) => (u.name + u.email).toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <div className="space-y-4">
      <TabHeader title="Users" subtitle={`${total} registered users`} icon={Users}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input-field pl-9 text-sm w-56" />
          </div>
          <button onClick={fetchUsers} className="btn-secondary text-sm flex items-center gap-1.5 py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </TabHeader>

      {loading ? <Loader /> : (
        <>
          <div className="neo-card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {filtered.map((u: any) => (
                <div key={u.id} className="table-row group">
                  <div className="avatar w-8 h-8 text-xs">{u.name?.[0]?.toUpperCase() || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white font-medium truncate">{u.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{u.email}{u.provider && u.provider !== 'LOCAL' ? ` · ${u.provider}` : ''}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                    style={u.role === 'ADMIN' ? { background: 'rgba(234,179,8,0.08)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' } : { background: 'rgba(255,255,255,0.03)', color: '#6b7280' }}>{u.role}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconBtn onClick={() => viewDetail(u.id)} tip="View"><Eye className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn onClick={() => setRole(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')} tip="Toggle role"><Crown className="w-3.5 h-3.5" /></IconBtn>
                    <IconBtn onClick={() => deleteUser(u.id)} tip="Delete" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Pagination page={page} setPage={setPage} total={total} />
        </>
      )}

      {/* User detail drawer */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={() => setDetail(null)}>
            <motion.div initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} transition={{ type: 'spring', damping: 25 }} onClick={e => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto" style={{ background: '#0a0e1a', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">User Details</h3>
                  <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="avatar w-14 h-14 text-lg">{detail.name?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <p className="text-white font-semibold">{detail.name}</p>
                    <p className="text-sm text-gray-400">{detail.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={detail.role === 'ADMIN' ? { background: 'rgba(234,179,8,0.08)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' } : { background: 'rgba(255,255,255,0.03)', color: '#6b7280' }}>{detail.role}</span>
                      {detail.provider && detail.provider !== 'LOCAL' && <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}>{detail.provider}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Servers" value={detail._count?.servers ?? detail.servers?.length ?? 0} />
                  <MiniStat label="Balance" value={`₹${detail.balance?.amount ?? 0}`} />
                  <MiniStat label="Credits" value={detail.credits?.amount ?? 0} />
                  <MiniStat label="Ptero ID" value={detail.pterodactylAccount?.pteroUserId ?? '—'} />
                </div>
                {detail.lastLoginIp && (
                  <div className="neo-card p-3 space-y-1">
                    <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Last Login</p>
                    <p className="text-sm text-white font-mono">{detail.lastLoginIp}</p>
                    <p className="text-[11px] text-gray-500">{detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : '—'}</p>
                  </div>
                )}
                <p className="text-[11px] text-gray-600">Joined {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : '—'}</p>

                {/* Payment History */}
                {detail.payments && detail.payments.length > 0 && (
                  <div className="neo-card overflow-hidden">
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Recent Payments</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {detail.payments.slice(0, 10).map((p: any) => (
                        <div key={p.id} className="px-3 py-2 flex items-center justify-between">
                          <div>
                            <p className="text-[12px] text-white font-medium">₹{p.amount}</p>
                            <p className="text-[10px] text-gray-600">{p.gateway || 'UPI'} · {timeAgo(p.createdAt)}</p>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={
                            p.status === 'COMPLETED' ? { background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)' }
                            : p.status === 'PENDING' ? { background: 'rgba(234,179,8,0.08)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.15)' }
                            : { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }
                          }>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Servers */}
                {detail.servers && detail.servers.length > 0 && (
                  <div className="neo-card overflow-hidden">
                    <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Servers ({detail.servers.length})</p>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      {detail.servers.map((s: any) => (
                        <div key={s.id} className="px-3 py-2 flex items-center gap-2">
                          <Server className="w-3 h-3 text-primary shrink-0" />
                          <p className="text-[12px] text-white truncate flex-1">{s.name}</p>
                          <span className="text-[10px] text-gray-500">{s.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setRole(detail.id, detail.role === 'ADMIN' ? 'USER' : 'ADMIN'); setDetail(null); }} className="btn-secondary text-sm flex-1 flex items-center justify-center gap-1.5"><Crown className="w-3.5 h-3.5" /> Toggle Role</button>
                  <button onClick={() => deleteUser(detail.id)} className="text-sm flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-medium transition-colors" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ SERVERS TAB ═══════════ */
function ServersTab() {
  const [servers, setServers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.servers(page); setServers(r.data?.servers || r.data?.data || []); setTotal(r.data?.total || 0); }
    catch {} finally { setLoading(false); }
  }, [page]);
  useEffect(() => { fetchServers(); }, [fetchServers]);

  const suspend = async (id: string) => { try { await adminApi.suspendServer(id); toast.success('Suspended'); fetchServers(); } catch { toast.error('Failed'); } };
  const unsuspend = async (id: string) => { try { await adminApi.unsuspendServer(id); toast.success('Unsuspended'); fetchServers(); } catch { toast.error('Failed'); } };
  const remove = async (id: string) => { if (!confirm('Delete server permanently?')) return; try { await adminApi.deleteServer(id); toast.success('Deleted'); fetchServers(); } catch { toast.error('Failed'); } };

  let filtered = servers;
  if (search) filtered = filtered.filter((s: any) => (s.name + (s.user?.email || '')).toLowerCase().includes(search.toLowerCase()));
  if (statusFilter !== 'ALL') filtered = filtered.filter((s: any) => s.status === statusFilter);

  const SC: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: 'rgba(16,185,129,0.08)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
    SUSPENDED: { bg: 'rgba(239,68,68,0.08)', text: '#f87171', border: 'rgba(239,68,68,0.2)' },
    EXPIRED: { bg: 'rgba(234,179,8,0.08)', text: '#fbbf24', border: 'rgba(234,179,8,0.2)' },
    INSTALLING: { bg: 'rgba(0,212,255,0.08)', text: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
  };

  return (
    <div className="space-y-4">
      <TabHeader title="Servers" subtitle={`${total} total servers`} icon={Server}>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm py-1.5 pr-8">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input-field pl-9 text-sm w-44" />
          </div>
          <button onClick={fetchServers} className="btn-secondary text-sm flex items-center gap-1.5 py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </TabHeader>

      {loading ? <Loader /> : (
        <>
          <div className="neo-card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {filtered.map((s: any) => {
                const sc = SC[s.status] || SC.EXPIRED;
                return (
                  <div key={s.id} className="table-row group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)' }}>
                      <Server className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{s.user?.email || s.userId}{s.plan?.name ? ` · ${s.plan.name}` : ''}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-500 mr-2">
                      {s.plan && <><span>{fmtMB(s.plan.ram)} RAM</span><span>·</span><span>{s.plan.cpu}% CPU</span><span>·</span><span>{fmtMB(s.plan.disk)} Disk</span></>}
                      {s.expiresAt && <><span>·</span><span>Exp: {new Date(s.expiresAt).toLocaleDateString()}</span></>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{s.status}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {s.status === 'SUSPENDED'
                        ? <IconBtn onClick={() => unsuspend(s.id)} tip="Unsuspend"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /></IconBtn>
                        : <IconBtn onClick={() => suspend(s.id)} tip="Suspend"><Ban className="w-3.5 h-3.5 text-yellow-400" /></IconBtn>}
                      <IconBtn onClick={() => remove(s.id)} tip="Delete" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="p-6 text-sm text-gray-500 text-center">No servers found</p>}
            </div>
          </div>
          <Pagination page={page} setPage={setPage} total={total} />
        </>
      )}
    </div>
  );
}

/* ═══════════ ALT DETECTION TAB ═══════════ */
function AltsTab() {
  const [groups, setGroups] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.altAccounts(page); setGroups(r.data?.altGroups || r.data?.data || []); setTotal(r.data?.total || 0); }
    catch {} finally { setLoading(false); }
  }, [page]);
  useEffect(() => { fetch(); }, [fetch]);

  const deleteAlts = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} alt account(s)?`)) return;
    try { await adminApi.deleteAlts(ids); toast.success('Deleted'); fetch(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <TabHeader title="Alt Detection" subtitle="Shared IP analysis" icon={Fingerprint}>
        <button onClick={fetch} className="btn-secondary text-sm flex items-center gap-1.5 py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
      </TabHeader>

      {loading ? <Loader /> : groups.length === 0 ? (
        <EmptyState icon={UserCheck} message="No alt account groups detected" />
      ) : (
        <>
          <div className="grid gap-3">
            {groups.map((g: any, i: number) => (
              <div key={i} className="neo-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,77,106,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.15)' }}>
                      <Globe className="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium font-mono">{g.ip || g.ipAddress || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500">{g.users?.length || g.userCount || 0} accounts sharing this IP</p>
                    </div>
                  </div>
                  {g.users?.length > 1 && (
                    <button onClick={() => deleteAlts(g.users.slice(1).map((u: any) => u.id))}
                      className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Delete Alts
                    </button>
                  )}
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {g.users?.map((u: any, ui: number) => (
                    <div key={u.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="avatar w-7 h-7 text-[10px]">{u.name?.[0]?.toUpperCase() || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                      </div>
                      {ui === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md text-emerald-400" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>Primary</span>}
                      {u._count?.servers > 0 && <span className="text-[10px] text-gray-500">{u._count.servers} servers</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} setPage={setPage} total={total} />
        </>
      )}
    </div>
  );
}

/* ═══════════ PLANS TAB ═══════════ */
function PlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes] = useState<any[]>([]);
  const [eggs, setEggs] = useState<any[]>([]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try { const r = await plansApi.list(); setPlans(r.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Load nodes & eggs for plan creation
  useEffect(() => {
    adminApi.nodes().then(r => setNodes(r.data || [])).catch(() => {});
    adminApi.eggs().then(r => setEggs(r.data || [])).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...editing };
      delete payload.id; delete payload.createdAt; delete payload.updatedAt; delete payload._count;
      if (editing.id) await adminApi.updatePlan(editing.id, payload);
      else await adminApi.createPlan(payload);
      toast.success('Saved'); setEditing(null); fetchPlans();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete plan?')) return;
    try { await adminApi.deletePlan(id); toast.success('Deleted'); fetchPlans(); } catch { toast.error('Failed'); }
  };

  const newPlan = () => setEditing({
    name: '', description: '', type: 'PREMIUM', ram: 1024, cpu: 100, disk: 5120,
    backups: 1, ports: 1, databases: 0, pricePerMonth: 0, pricePerGb: 0,
    nodeId: null, eggId: null, nodeAssignMode: 'ROUND_ROBIN',
    isActive: true, sortOrder: 0, renewalPeriodDays: 30, renewalCost: 0,
    minRam: 128, maxRam: 8192, minCpu: 50, maxCpu: 400, minDisk: 1024, maxDisk: 51200,
  });

  const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    FREE: { bg: 'rgba(34,197,94,0.08)', text: '#4ade80', border: 'rgba(34,197,94,0.2)' },
    PREMIUM: { bg: 'rgba(0,212,255,0.08)', text: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
    CUSTOM: { bg: 'rgba(124,58,237,0.08)', text: '#a78bfa', border: 'rgba(124,58,237,0.2)' },
  };

  return (
    <div className="space-y-4">
      <TabHeader title="Game Plans" subtitle={`${plans.length} plans`} icon={Package}>
        <button onClick={newPlan} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Plan</button>
      </TabHeader>

      {loading ? <Loader /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p: any) => {
            const tc = TYPE_COLORS[p.type] || TYPE_COLORS.PREMIUM;
            return (
              <div key={p.id} className="neo-card p-4 space-y-3 group relative">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[15px] font-semibold text-white">{p.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{p.type}</span>
                      {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-md text-gray-500" style={{ background: 'rgba(255,255,255,0.03)' }}>Inactive</span>}
                    </div>
                    {p.description && <p className="text-[11px] text-gray-500 line-clamp-1">{p.description}</p>}
                  </div>
                  <p className="text-lg font-display font-bold text-white">{p.type === 'FREE' ? 'Free' : `₹${p.pricePerMonth}`}<span className="text-[10px] text-gray-500 font-normal">{p.type !== 'FREE' ? '/mo' : ''}</span></p>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{fmtMB(p.ram)} RAM</span>
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{p.cpu}% CPU</span>
                  <span className="flex items-center gap-1"><Database className="w-3 h-3" />{fmtMB(p.disk)} Disk</span>
                  {p.backups > 0 && <span>{p.backups} backups</span>}
                  {p.databases > 0 && <span>{p.databases} DBs</span>}
                </div>
                {p.renewalPeriodDays && <p className="text-[10px] text-gray-600">Renewal: {p.renewalPeriodDays}d / ₹{p.renewalCost ?? p.pricePerMonth}</p>}
                <div className="flex items-center gap-1 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn onClick={() => setEditing({ ...p })} tip="Edit"><Edit3 className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn onClick={() => remove(p.id)} tip="Delete" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Edit Modal */}
      <AnimatePresence>
        {editing && (
          <ModalOverlay onClose={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="neo-card w-full max-w-2xl max-h-[85vh] overflow-y-auto my-8">
              <ModalHeader title={editing.id ? 'Edit Plan' : 'Create Plan'} onClose={() => setEditing(null)} />
              <div className="p-5 space-y-5">
                {/* Basic Info */}
                <FieldGroup title="Basic Info">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Plan Name" full>
                      <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input-field text-sm" placeholder="Plan name" />
                    </Field>
                    <Field label="Type">
                      <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className="input-field text-sm">
                        <option value="FREE">FREE</option><option value="PREMIUM">PREMIUM</option><option value="CUSTOM">CUSTOM</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Description" full>
                    <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="input-field text-sm resize-none h-16" placeholder="Optional description" />
                  </Field>
                </FieldGroup>

                {/* Resources */}
                <FieldGroup title="Resources">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="RAM (MB)"><input type="number" value={editing.ram} onChange={e => setEditing({ ...editing, ram: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="CPU (%)"><input type="number" value={editing.cpu} onChange={e => setEditing({ ...editing, cpu: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Disk (MB)"><input type="number" value={editing.disk} onChange={e => setEditing({ ...editing, disk: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Backups"><input type="number" value={editing.backups ?? 0} onChange={e => setEditing({ ...editing, backups: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Ports"><input type="number" value={editing.ports ?? 1} onChange={e => setEditing({ ...editing, ports: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Databases"><input type="number" value={editing.databases ?? 0} onChange={e => setEditing({ ...editing, databases: +e.target.value })} className="input-field text-sm" /></Field>
                  </div>
                </FieldGroup>

                {/* Custom type limits */}
                {editing.type === 'CUSTOM' && (
                  <FieldGroup title="Custom Resource Limits">
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Min RAM"><input type="number" value={editing.minRam ?? 128} onChange={e => setEditing({ ...editing, minRam: +e.target.value })} className="input-field text-sm" /></Field>
                      <Field label="Max RAM"><input type="number" value={editing.maxRam ?? 8192} onChange={e => setEditing({ ...editing, maxRam: +e.target.value })} className="input-field text-sm" /></Field>
                      <Field label="Min CPU"><input type="number" value={editing.minCpu ?? 50} onChange={e => setEditing({ ...editing, minCpu: +e.target.value })} className="input-field text-sm" /></Field>
                      <Field label="Max CPU"><input type="number" value={editing.maxCpu ?? 400} onChange={e => setEditing({ ...editing, maxCpu: +e.target.value })} className="input-field text-sm" /></Field>
                      <Field label="Min Disk"><input type="number" value={editing.minDisk ?? 1024} onChange={e => setEditing({ ...editing, minDisk: +e.target.value })} className="input-field text-sm" /></Field>
                      <Field label="Max Disk"><input type="number" value={editing.maxDisk ?? 51200} onChange={e => setEditing({ ...editing, maxDisk: +e.target.value })} className="input-field text-sm" /></Field>
                    </div>
                    <Field label="Price Per GB (₹)"><input type="number" value={editing.pricePerGb ?? 0} onChange={e => setEditing({ ...editing, pricePerGb: +e.target.value })} className="input-field text-sm" /></Field>
                  </FieldGroup>
                )}

                {/* Pricing & Renewal */}
                <FieldGroup title="Pricing & Renewal">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Price/Month (₹)"><input type="number" value={editing.pricePerMonth ?? 0} onChange={e => setEditing({ ...editing, pricePerMonth: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Renewal Period (days)"><input type="number" value={editing.renewalPeriodDays ?? 30} onChange={e => setEditing({ ...editing, renewalPeriodDays: +e.target.value })} className="input-field text-sm" /></Field>
                    <Field label="Renewal Cost (₹)"><input type="number" value={editing.renewalCost ?? 0} onChange={e => setEditing({ ...editing, renewalCost: +e.target.value })} className="input-field text-sm" /></Field>
                  </div>
                </FieldGroup>

                {/* Pterodactyl */}
                <FieldGroup title="Pterodactyl">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Node">
                      <select value={editing.nodeId ?? ''} onChange={e => setEditing({ ...editing, nodeId: e.target.value ? +e.target.value : null })} className="input-field text-sm">
                        <option value="">Auto</option>
                        {nodes.map((n: any) => <option key={n.id} value={n.id}>{n.name || `Node ${n.id}`}</option>)}
                      </select>
                    </Field>
                    <Field label="Egg">
                      <select value={editing.eggId ?? ''} onChange={e => setEditing({ ...editing, eggId: e.target.value ? +e.target.value : null })} className="input-field text-sm">
                        <option value="">Default</option>
                        {eggs.map((e2: any) => <option key={e2.id} value={e2.id}>{e2.name || `Egg ${e2.id}`}</option>)}
                      </select>
                    </Field>
                    <Field label="Node Assign Mode">
                      <select value={editing.nodeAssignMode ?? 'ROUND_ROBIN'} onChange={e => setEditing({ ...editing, nodeAssignMode: e.target.value })} className="input-field text-sm">
                        <option value="DYNAMIC">Dynamic</option>
                        <option value="ADMIN_LOCKED">Admin Locked</option>
                        <option value="USER_SELECTABLE">User Selectable</option>
                      </select>
                    </Field>
                  </div>
                </FieldGroup>

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer select-none">
                    <input type="checkbox" checked={editing.isActive ?? true} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="accent-primary w-4 h-4" /> Active
                  </label>
                  <Field label="Sort Order">
                    <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: +e.target.value })} className="input-field text-sm w-20" />
                  </Field>
                </div>
              </div>
              <ModalFooter onCancel={() => setEditing(null)} onSave={save} saving={saving} />
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ VPS PLANS TAB ═══════════ */
function VpsPlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [vpsStats, setVpsStats] = useState<any>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.vpsPlans(); setPlans(r.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { adminApi.vpsStats().then(r => setVpsStats(r.data)).catch(() => {}); }, []);

  const sync = async () => {
    setSyncing(true);
    try { await adminApi.syncVpsPlans(); toast.success('Synced from Datalix'); fetchPlans(); } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const save = async () => {
    if (!editing?.id) return;
    setSaving(true);
    try {
      await adminApi.updateVpsPlan(editing.id, { displayName: editing.displayName, sellPrice: editing.sellPrice, isActive: editing.isActive });
      toast.success('Saved'); setEditing(null); fetchPlans();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this VPS plan?')) return;
    try { await adminApi.deleteVpsPlan(id); toast.success('Deleted'); fetchPlans(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <TabHeader title="VPS Plans" subtitle={`${plans.length} plans${vpsStats ? ` · ${vpsStats.activeVps ?? 0} active instances` : ''}`} icon={Cloud}>
        <button onClick={sync} disabled={syncing} className="btn-secondary text-sm flex items-center gap-1.5">
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync Datalix
        </button>
      </TabHeader>

      {loading ? <Loader /> : (
        <div className="neo-card overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {plans.map((p: any) => (
              <div key={p.id} className="table-row group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
                  <Cloud className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white font-medium truncate">{p.displayName || p.datalixPlanName}</p>
                  <p className="text-[11px] text-gray-500">{p.ram >= 1024 ? `${(p.ram/1024).toFixed(0)}G` : `${p.ram}M`} RAM · {p.cpu} vCPU · {p.disk}G Disk</p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-sm font-medium text-white">₹{p.sellPrice}</p>
                  <p className="text-[10px] text-gray-600">cost ₹{p.costPrice}</p>
                </div>
                <span className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn onClick={() => setEditing({ ...p })} tip="Edit"><Edit3 className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn onClick={() => remove(p.id)} tip="Delete" danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </div>
              </div>
            ))}
            {plans.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No VPS plans. Click &quot;Sync Datalix&quot; to import.</p>}
          </div>
        </div>
      )}

      {/* Edit VPS Plan */}
      <AnimatePresence>
        {editing && (
          <ModalOverlay onClose={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="neo-card w-full max-w-md my-8">
              <ModalHeader title="Edit VPS Plan" onClose={() => setEditing(null)} />
              <div className="p-5 space-y-4">
                <Field label="Display Name" full><input type="text" value={editing.displayName || ''} onChange={e => setEditing({ ...editing, displayName: e.target.value })} className="input-field text-sm" /></Field>
                <Field label="Sell Price (₹)" full><input type="number" value={editing.sellPrice ?? 0} onChange={e => setEditing({ ...editing, sellPrice: +e.target.value })} className="input-field text-sm" /></Field>
                <label className="flex items-center gap-2.5 text-sm text-gray-300 cursor-pointer"><input type="checkbox" checked={editing.isActive ?? true} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="accent-primary w-4 h-4" /> Active</label>
              </div>
              <ModalFooter onCancel={() => setEditing(null)} onSave={save} saving={saving} />
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ UPI APPROVALS TAB ═══════════ */
function UpiTab() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.pendingUpi(); setPayments(r.data || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const approve = async (id: string) => { try { await adminApi.approveUpi(id); toast.success('Approved'); fetch(); } catch { toast.error('Failed'); } };
  const reject = async (id: string) => { try { await adminApi.rejectUpi(id); toast.success('Rejected'); fetch(); } catch { toast.error('Failed'); } };

  return (
    <div className="space-y-4">
      <TabHeader title="UPI Approvals" subtitle={`${payments.length} pending`} icon={IndianRupee} />

      {loading ? <Loader /> : payments.length === 0 ? (
        <EmptyState icon={CheckCircle} message="No pending UPI payments" />
      ) : (
        <div className="neo-card overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {payments.map((p: any) => (
              <div key={p.id} className="table-row">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}>
                  <IndianRupee className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">₹{p.amount}</p>
                  <p className="text-[11px] text-gray-500">{p.user?.email || p.userId} · UTR: <span className="font-mono">{p.utr}</span></p>
                </div>
                <span className="text-[11px] text-gray-600">{timeAgo(p.createdAt)}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => approve(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 transition-colors" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => reject(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 transition-colors" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ SETTINGS TAB ═══════════ */
const SETTING_GROUPS = [
  { title: 'General', icon: Globe, keys: [
    { key: 'SITE_NAME', label: 'Site Name', hint: 'Your platform name' },
    { key: 'SITE_DESCRIPTION', label: 'Site Description', hint: 'Short tagline for the platform' },
    { key: 'SUPPORT_EMAIL', label: 'Support Email', hint: 'Contact email for users' },
    { key: 'DISCORD_INVITE_URL', label: 'Discord Invite URL', hint: 'Discord server invite link' },
    { key: 'TERMS_URL', label: 'Terms of Service URL', hint: 'Link to your terms page' },
    { key: 'PRIVACY_URL', label: 'Privacy Policy URL', hint: 'Link to your privacy page' },
  ]},
  { title: 'Payments', icon: IndianRupee, keys: [
    { key: 'UPI_ENABLED', label: 'UPI Payments', hint: 'Enable/disable UPI (true/false)' },
    { key: 'UPI_ID', label: 'UPI ID', hint: 'Your UPI ID for receiving payments' },
    { key: 'UPI_QR_URL', label: 'UPI QR Code URL', hint: 'URL to your UPI QR code image' },
    { key: 'RAZORPAY_ENABLED', label: 'Razorpay Enabled', hint: 'true/false' },
    { key: 'COINBASE_ENABLED', label: 'Coinbase Enabled', hint: 'true/false' },
  ]},
  { title: 'Ads & Credits', icon: Zap, keys: [
    { key: 'ads_provider', label: 'Ads Provider', hint: 'adsense, adsterra, or none' },
    { key: 'ads_timer_seconds', label: 'Timer (seconds)', hint: 'How long user waits to claim credits' },
    { key: 'ads_reward', label: 'Reward per Claim', hint: 'Credits earned per ad view' },
    { key: 'ads_anti_adblock', label: 'Anti Adblock', hint: 'true/false' },
    { key: 'ads_adsense_enabled', label: 'AdSense Enabled', hint: 'true/false' },
    { key: 'ads_adsense_client_id', label: 'AdSense Client ID', hint: 'ca-pub-XXXXXXXXXX' },
    { key: 'ads_adsense_slot_id', label: 'AdSense Slot ID', hint: 'Slot ID for ad unit' },
    { key: 'ads_adsterra_enabled', label: 'Adsterra Enabled', hint: 'true/false' },
    { key: 'ads_adsterra_key', label: 'Adsterra Key', hint: 'Your Adsterra publisher key' },
  ]},
  { title: 'System', icon: Monitor, keys: [
    { key: 'VPS_ENABLED', label: 'VPS Module', hint: 'Enable VPS hosting (true/false)' },
    { key: 'MAINTENANCE_MODE', label: 'Maintenance Mode', hint: 'Put site in maintenance (true/false)' },
    { key: 'MAX_SERVERS_PER_USER', label: 'Max Servers per User', hint: 'Limit server creation per user' },
    { key: 'FREE_PLAN_RENEWAL_DAYS', label: 'Free Plan Renewal Days', hint: 'Auto-renewal period for free plans' },
  ]},
];

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    adminApi.settings().then(r => {
      const s: Record<string, string> = {};
      if (Array.isArray(r.data)) r.data.forEach((i: any) => { s[i.key] = i.value; });
      else if (typeof r.data === 'object') Object.assign(s, r.data);
      setSettings(s);
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setChanged(true);
  };

  const save = async () => {
    setSaving(true);
    try { await adminApi.updateSettings(settings); toast.success('Settings saved'); setChanged(false); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader />;

  const usedKeys = new Set(SETTING_GROUPS.flatMap(g => g.keys.map(k => k.key)));
  const otherKeys = Object.keys(settings).filter(k => !usedKeys.has(k));

  return (
    <div className="space-y-4">
      <TabHeader title="Settings" subtitle="Platform configuration" icon={Settings}>
        <button onClick={save} disabled={saving || !changed}
          className={`btn-primary text-sm flex items-center gap-1.5 ${!changed ? 'opacity-40' : ''}`}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save Changes
        </button>
      </TabHeader>

      {SETTING_GROUPS.map(g => (
        <div key={g.title} className="neo-card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <g.icon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">{g.title}</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {g.keys.map(k => {
              const isBool = k.hint?.includes('true/false') || ['true','false'].includes((settings[k.key] ?? '').toLowerCase());
              return (
                <div key={k.key} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-44 shrink-0">
                    <p className="text-[13px] text-gray-300 font-medium">{k.label}</p>
                    <p className="text-[10px] text-gray-600">{k.hint}</p>
                  </div>
                  {isBool ? (
                    <button onClick={() => update(k.key, (settings[k.key] ?? 'false').toLowerCase() === 'true' ? 'false' : 'true')}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ background: (settings[k.key] ?? 'false').toLowerCase() === 'true' ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${(settings[k.key] ?? 'false').toLowerCase() === 'true' ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                      <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{
                        left: (settings[k.key] ?? 'false').toLowerCase() === 'true' ? '22px' : '3px',
                        background: (settings[k.key] ?? 'false').toLowerCase() === 'true' ? '#00d4ff' : '#6b7280'
                      }} />
                    </button>
                  ) : (
                    <input type="text" value={settings[k.key] ?? ''} onChange={e => update(k.key, e.target.value)} className="input-field text-sm flex-1" placeholder={k.hint} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {otherKeys.length > 0 && (
        <div className="neo-card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Settings className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-white">Other Settings</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {otherKeys.map(k => (
              <div key={k} className="px-4 py-3 flex items-center gap-4">
                <label className="text-[12px] text-gray-400 w-44 shrink-0 font-mono truncate">{k}</label>
                <input type="text" value={settings[k] ?? ''} onChange={e => update(k, e.target.value)} className="input-field text-sm flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ AUDIT LOGS TAB ═══════════ */
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await adminApi.auditLogs(page); setLogs(r.data?.logs || r.data?.data || []); setTotal(r.data?.total || 0); }
    catch {} finally { setLoading(false); }
  }, [page]);
  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <TabHeader title="Audit Logs" subtitle="System activity log" icon={FileText}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter actions..." className="input-field pl-9 text-sm w-44" />
          </div>
          <button onClick={fetch} className="btn-secondary text-sm flex items-center gap-1.5 py-2"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </TabHeader>

      {loading ? <Loader /> : (() => {
        const filtered = search ? logs.filter((l: any) => (l.action + (l.user?.email || '')).toLowerCase().includes(search.toLowerCase())) : logs;
        return filtered.length === 0 ? (
        <EmptyState icon={FileText} message={search ? 'No matching logs' : 'No audit logs'} />
      ) : (
        <>
          <div className="neo-card overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {filtered.map((l: any, i: number) => (
                <div key={l.id ?? i} className="px-4 py-3 flex items-start gap-3">
                  <AuditDot action={l.action} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-white font-medium">{l.action}</p>
                      <span className="text-[10px] text-gray-600 font-mono shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                    {l.user && <p className="text-[11px] text-gray-500 mt-0.5">{l.user?.email || l.userId}</p>}
                    {l.details && <p className="text-[11px] text-gray-600 mt-0.5 font-mono truncate max-w-md">{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Pagination page={page} setPage={setPage} total={total} />
        </>
      );
      })()}
    </div>
  );
}

/* ═══════════ SHARED COMPONENTS ═══════════ */
function TabHeader({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: any; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-white">{title}</h2>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

function IconBtn({ onClick, children, tip, danger }: { onClick: () => void; children: React.ReactNode; tip?: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={tip} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${danger ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/5' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      {children}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="neo-card p-3 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="neo-card p-10 flex flex-col items-center gap-3">
      <Icon className="w-8 h-8 text-gray-700" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      {children}
    </motion.div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(124,58,237,0.05))', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-4.5 h-4.5" /></button>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="px-5 py-3.5 flex justify-end gap-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
      <button onClick={onSave} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
      </button>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2.5">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? '' : ''}>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
}

function Pagination({ page, setPage, total, perPage = 20 }: { page: number; setPage: (p: number) => void; total: number; perPage?: number }) {
  const maxPage = Math.max(1, Math.ceil(total / perPage));
  if (maxPage <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 disabled:opacity-30 transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-[12px] text-gray-500 font-medium">{page} / {maxPage}</span>
      <button onClick={() => setPage(Math.min(maxPage, page + 1))} disabled={page >= maxPage}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 disabled:opacity-30 transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function AuditDot({ action }: { action: string }) {
  const a = (action || '').toLowerCase();
  let color = '#6b7280';
  if (a.includes('delete') || a.includes('remove')) color = '#f87171';
  else if (a.includes('create') || a.includes('register') || a.includes('approve')) color = '#34d399';
  else if (a.includes('update') || a.includes('edit') || a.includes('change')) color = '#00d4ff';
  else if (a.includes('suspend') || a.includes('reject') || a.includes('ban')) color = '#fbbf24';
  else if (a.includes('login') || a.includes('auth')) color = '#a78bfa';
  return <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: color }} />;
}

/* ═══════════ UTILITIES ═══════════ */
function fmtMB(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;
}

function timeAgo(date: string | Date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
