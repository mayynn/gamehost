'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { authApi, plansApi } from '@/lib/api';
import {
    LayoutDashboard, Users, Server, CreditCard, Settings, ClipboardList,
    Shield, DollarSign, Check, X, UserX, Link2, AlertTriangle, Trash2,
    CloudCog, RefreshCw, TrendingUp, Megaphone, Eye, EyeOff, Plus, Minus,
    ShieldAlert, ToggleLeft, ToggleRight, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'alts', label: 'Alt Detection', icon: UserX },
    { id: 'plans', label: 'Plans', icon: CreditCard },
    { id: 'vps-plans', label: 'VPS Plans', icon: CloudCog },
    { id: 'ads', label: 'Ads & Credits', icon: Megaphone },
    { id: 'upi', label: 'UPI Approvals', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
];

export default function AdminPage() {
    const router = useRouter();
    const [tab, setTab] = useState('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any>({ users: [], total: 0 });
    const [servers, setServers] = useState<any>({ servers: [], total: 0 });
    const [pendingUpi, setPendingUpi] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [audit, setAudit] = useState<any>({ logs: [], total: 0 });
    const [altData, setAltData] = useState<any>({ altGroups: [], total: 0 });
    const [selectedAlts, setSelectedAlts] = useState<string[]>([]);
    const [vpsPlans, setVpsPlans] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [newPlan, setNewPlan] = useState<any>(null);
    const [vpsStats, setVpsStats] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [adSettings, setAdSettings] = useState<any>({
        ads_provider: 'both',
        ads_adsense_enabled: 'true',
        ads_adsense_publisher_id: '',
        ads_adsense_slot_id: '',
        ads_adsterra_enabled: 'true',
        ads_adsterra_urls: '',
        ads_anti_adblock: 'true',
        ads_timer_seconds: '60',
        ads_reward: '10',
    });
    const [adSaving, setAdSaving] = useState(false);

    useEffect(() => {
        authApi.getMe().then((r) => {
            if (r.data.user.role !== 'ADMIN') { router.push('/dashboard'); return; }
            setAuthorized(true);
        }).catch(() => router.push('/login'));
    }, [router]);

    const loadTab = async (t: string) => {
        setTab(t);
        try {
            switch (t) {
                case 'dashboard': { const r = await adminApi.dashboard(); setStats(r.data); break; }
                case 'users': { const r = await adminApi.users(); setUsers(r.data); break; }
                case 'servers': { const r = await adminApi.servers(); setServers(r.data); break; }
                case 'alts': { const r = await adminApi.altAccounts(); setAltData(r.data); setSelectedAlts([]); break; }
                case 'plans': { const r = await plansApi.list(); setPlans(r.data || []); break; }
                case 'vps-plans': {
                    const [plansR, statsR] = await Promise.all([adminApi.vpsPlans(), adminApi.vpsStats()]);
                    setVpsPlans(plansR.data || []);
                    setVpsStats(statsR.data || null);
                    break;
                }
                case 'upi': { const r = await adminApi.pendingUpi(); setPendingUpi(r.data || []); break; }
                case 'settings': { const r = await adminApi.settings(); setSettings(r.data || {}); break; }
                case 'ads': {
                    const r = await adminApi.settings();
                    const all = r.data || {};
                    setAdSettings((prev: any) => ({
                        ...prev,
                        ...Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith('ads_'))),
                    }));
                    break;
                }
                case 'audit': { const r = await adminApi.auditLogs(); setAudit(r.data); break; }
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { if (authorized) loadTab('dashboard'); }, [authorized]);

    if (!authorized) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark">
            <div className="flex">
                {/* Admin Sidebar */}
                <aside className="w-64 min-h-screen bg-dark-50 border-r border-white/5 p-4 hidden lg:block">
                    <div className="flex items-center gap-2 px-4 py-3 mb-4">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-display font-bold">Admin Panel</span>
                    </div>
                    <nav className="space-y-1">
                        {adminTabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => loadTab(t.id)}
                                className={`w-full ${tab === t.id ? 'sidebar-link-active' : 'sidebar-link'}`}
                            >
                                <t.icon className="w-5 h-5" />
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6">
                    {/* Mobile tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto lg:hidden">
                        {adminTabs.map((t) => (
                            <button key={t.id} onClick={() => loadTab(t.id)}
                                className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-gray-400'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Dashboard */}
                    {tab === 'dashboard' && stats && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">Admin Dashboard</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="glass-card p-5"><p className="text-sm text-gray-400">Users</p><p className="text-3xl font-bold">{stats.users}</p></div>
                                <div className="glass-card p-5"><p className="text-sm text-gray-400">Servers</p><p className="text-3xl font-bold">{stats.servers}</p></div>
                                <div className="glass-card p-5"><p className="text-sm text-gray-400">Active</p><p className="text-3xl font-bold text-green-400">{stats.activeServers}</p></div>
                                <div className="glass-card p-5"><p className="text-sm text-gray-400">Revenue</p><p className="text-3xl font-bold gradient-text">₹{stats.revenue}</p></div>
                            </div>
                            <div className="glass-card p-6">
                                <h3 className="font-semibold mb-4">Recent Payments</h3>
                                <div className="space-y-2">
                                    {stats.recentPayments?.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-sm">
                                            <span>{p.user?.name} — ₹{p.amount}</span>
                                            <span className="text-gray-500">{p.gateway}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users */}
                    {tab === 'users' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">Users ({users.total})</h2>
                            <div className="glass-card overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                                        <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">Email</th>
                                        <th className="text-left p-4 text-gray-400 font-medium">Role</th>
                                        <th className="text-left p-4 text-gray-400 font-medium hidden sm:table-cell">Servers</th>
                                        <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {users.users?.map((u: any) => (
                                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-4 font-medium">{u.name}</td>
                                                <td className="p-4 text-gray-400 hidden md:table-cell">{u.email}</td>
                                                <td className="p-4"><span className={u.role === 'ADMIN' ? 'text-primary' : 'text-gray-400'}>{u.role}</span></td>
                                                <td className="p-4 text-gray-400 hidden sm:table-cell">{u._count?.servers || 0}</td>
                                                <td className="p-4">
                                                    <button onClick={async () => {
                                                        const action = u.role === 'ADMIN' ? 'demote' : 'promote';
                                                        if (!confirm(`Are you sure you want to ${action} "${u.name}"?`)) return;
                                                        try { await adminApi.setRole(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN'); toast.success(`User ${action}d`); loadTab('users'); }
                                                        catch { toast.error('Failed to change role'); }
                                                    }}
                                                        className="text-xs px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
                                                        {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Servers */}
                    {tab === 'servers' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">All Servers ({servers.total})</h2>
                            <div className="space-y-3">
                                {servers.servers?.map((s: any) => (
                                    <div key={s.id} className="glass-card p-4 flex items-center gap-4">
                                        <div className={`w-3 h-3 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-400' : s.status === 'SUSPENDED' ? 'bg-orange-400' : 'bg-red-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{s.name}</p>
                                            <p className="text-xs text-gray-500">{s.user?.name} · {s.ram}MB</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={async () => { try { await adminApi.suspendServer(s.id); toast.success('Server suspended'); loadTab('servers'); } catch { toast.error('Failed to suspend'); } }}
                                                className="text-xs px-3 py-1 rounded bg-orange-500/10 text-orange-400">Suspend</button>
                                            <button onClick={async () => { try { await adminApi.unsuspendServer(s.id); toast.success('Server unsuspended'); loadTab('servers'); } catch { toast.error('Failed to unsuspend'); } }}
                                                className="text-xs px-3 py-1 rounded bg-green-500/10 text-green-400">Unsuspend</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alt Detection */}
                    {tab === 'alts' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-display font-bold">Alt Account Detection</h2>
                                    <p className="text-sm text-gray-500 mt-1">Users sharing the same IP address across multiple accounts</p>
                                </div>
                                {selectedAlts.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Delete ${selectedAlts.length} selected alt account(s)? This cannot be undone.`)) return;
                                            try {
                                                await adminApi.deleteAlts(selectedAlts);
                                                loadTab('alts');
                                            } catch { }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl
                                            hover:bg-red-500/30 transition-all text-sm font-medium"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete {selectedAlts.length} Selected
                                    </button>
                                )}
                            </div>

                            {altData.altGroups?.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <Shield className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-60" />
                                    <p className="text-gray-400 font-medium">No alt accounts detected</p>
                                    <p className="text-sm text-gray-600 mt-1">All users appear to be unique</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {altData.altGroups?.map((group: any, gi: number) => (
                                        <div key={gi} className="glass-card overflow-hidden">
                                            <div className="px-5 py-3 bg-red-500/5 border-b border-white/5 flex items-center gap-3">
                                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                                <span className="text-sm font-medium">
                                                    IP: <code className="text-primary bg-white/5 px-2 py-0.5 rounded">{group.ipAddress}</code>
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {group.userCount} accounts sharing this IP
                                                </span>
                                            </div>
                                            <div className="divide-y divide-white/5">
                                                {group.users?.map((u: any) => (
                                                    <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAlts.includes(u.id)}
                                                            onChange={(e) => {
                                                                setSelectedAlts((prev) =>
                                                                    e.target.checked
                                                                        ? [...prev, u.id]
                                                                        : prev.filter((id) => id !== u.id),
                                                                );
                                                            }}
                                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/30"
                                                            disabled={u.role === 'ADMIN'}
                                                        />
                                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                                            {u.name?.[0] || '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm truncate">{u.name}</span>
                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-gray-500'}`}>
                                                                    {u.role}
                                                                </span>
                                                                <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-500 flex items-center gap-1">
                                                                    <Link2 className="w-3 h-3" />{u.provider}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                                        </div>
                                                        <div className="text-right text-xs text-gray-500 hidden sm:block">
                                                            <p>{u._count?.servers || 0} servers</p>
                                                            <p>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Plans Management */}
                    {tab === 'plans' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-display font-bold">Server Plans ({plans.length})</h2>
                                <button onClick={() => setNewPlan({ name: '', type: 'FREE', ram: 1024, cpu: 100, disk: 5120, backups: 1, ports: 1, databases: 0, pricePerMonth: 0, isActive: true })}
                                    className="btn-primary flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> New Plan</button>
                            </div>

                            {/* Create/Edit Form */}
                            {newPlan && (
                                <div className="glass-card p-6 mb-6">
                                    <h3 className="font-semibold mb-4">{newPlan.id ? 'Edit Plan' : 'Create Plan'}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Name</label>
                                            <input className="input-field text-sm" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="Starter" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Type</label>
                                            <select className="input-field text-sm bg-dark" value={newPlan.type} onChange={(e) => setNewPlan({ ...newPlan, type: e.target.value })}>
                                                <option value="FREE">Free</option>
                                                <option value="PAID">Paid</option>
                                                <option value="CUSTOM">Custom Builder</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">RAM (MB)</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.ram} onChange={(e) => setNewPlan({ ...newPlan, ram: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">CPU (%)</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.cpu} onChange={(e) => setNewPlan({ ...newPlan, cpu: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Disk (MB)</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.disk} onChange={(e) => setNewPlan({ ...newPlan, disk: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Price/Month (₹)</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.pricePerMonth} step="0.01"
                                                onChange={(e) => setNewPlan({ ...newPlan, pricePerMonth: parseFloat(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Backups</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.backups} onChange={(e) => setNewPlan({ ...newPlan, backups: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Ports</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.ports} onChange={(e) => setNewPlan({ ...newPlan, ports: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Databases</label>
                                            <input type="number" className="input-field text-sm" value={newPlan.databases} onChange={(e) => setNewPlan({ ...newPlan, databases: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={async () => {
                                            try {
                                                if (newPlan.id) {
                                                    await adminApi.updatePlan(newPlan.id, newPlan);
                                                    toast.success('Plan updated');
                                                } else {
                                                    await adminApi.createPlan(newPlan);
                                                    toast.success('Plan created');
                                                }
                                                setNewPlan(null);
                                                loadTab('plans');
                                            } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save plan'); }
                                        }} className="btn-primary text-sm">{newPlan.id ? 'Update' : 'Create'}</button>
                                        <button onClick={() => setNewPlan(null)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors">Cancel</button>
                                    </div>
                                </div>
                            )}

                            {/* Plans Table */}
                            {plans.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-400 font-medium">No server plans yet</p>
                                    <p className="text-sm text-gray-600 mt-1">Create your first plan to get started</p>
                                </div>
                            ) : (
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Type</th>
                                                <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">Resources</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Price</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {plans.map((p: any) => (
                                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-4 font-medium">{p.name}</td>
                                                    <td className="p-4"><span className={`text-xs px-2 py-1 rounded ${p.type === 'FREE' ? 'bg-green-500/10 text-green-400' : p.type === 'PAID' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>{p.type}</span></td>
                                                    <td className="p-4 text-gray-400 text-xs hidden md:table-cell">{p.ram}MB · {p.cpu}% · {p.disk}MB</td>
                                                    <td className="p-4 text-primary font-mono font-bold">{p.type === 'FREE' ? 'Free' : `₹${p.pricePerMonth}`}</td>
                                                    <td className="p-4"><span className={`text-xs px-2 py-1 rounded ${p.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.isActive ? 'Active' : 'Hidden'}</span></td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setNewPlan({ ...p })} className="text-xs px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">Edit</button>
                                                            <button onClick={async () => {
                                                                if (!confirm(`Delete plan "${p.name}"?`)) return;
                                                                try { await adminApi.deletePlan(p.id); toast.success('Plan deleted'); loadTab('plans'); }
                                                                catch (e: any) { toast.error(e?.response?.data?.message || 'Cannot delete (has active servers)'); }
                                                            }} className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">Del</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VPS Plans Management */}
                    {tab === 'vps-plans' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-display font-bold">VPS Plans</h2>
                                    <p className="text-sm text-gray-500 mt-1">Manage Datalix VPS plans with your custom reseller pricing</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setSyncing(true);
                                        try {
                                            const r = await adminApi.syncVpsPlans();
                                            toast.success(`Synced ${r.data?.synced || 0} plans from Datalix`);
                                            loadTab('vps-plans');
                                        } catch { toast.error('Sync failed'); }
                                        finally { setSyncing(false); }
                                    }}
                                    disabled={syncing}
                                    className="flex items-center gap-2 btn-primary"
                                >
                                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Syncing...' : 'Sync from Datalix'}
                                </button>
                            </div>

                            {/* VPS Revenue Stats */}
                            {vpsStats && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                                    <div className="glass-card p-4">
                                        <p className="text-xs text-gray-500">Total VPS</p>
                                        <p className="text-2xl font-bold">{vpsStats.totalVps}</p>
                                    </div>
                                    <div className="glass-card p-4">
                                        <p className="text-xs text-gray-500">Active VPS</p>
                                        <p className="text-2xl font-bold text-green-400">{vpsStats.activeVps}</p>
                                    </div>
                                    <div className="glass-card p-4">
                                        <p className="text-xs text-gray-500">Monthly Revenue</p>
                                        <p className="text-2xl font-bold gradient-text">₹{vpsStats.monthlyRevenue?.toFixed(0)}</p>
                                    </div>
                                    <div className="glass-card p-4">
                                        <p className="text-xs text-gray-500">Monthly Cost</p>
                                        <p className="text-2xl font-bold text-red-400">₹{vpsStats.monthlyCost?.toFixed(0)}</p>
                                    </div>
                                    <div className="glass-card p-4">
                                        <p className="text-xs text-gray-500">Monthly Profit</p>
                                        <p className={`text-2xl font-bold ${(vpsStats.monthlyProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ₹{vpsStats.monthlyProfit?.toFixed(0)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Plans Table */}
                            {vpsPlans.length === 0 ? (
                                <div className="glass-card p-12 text-center">
                                    <CloudCog className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                    <p className="text-gray-400 font-medium">No VPS plans configured</p>
                                    <p className="text-sm text-gray-600 mt-1">Click "Sync from Datalix" to import available plans</p>
                                </div>
                            ) : (
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-4 text-gray-400 font-medium">Plan Name</th>
                                                <th className="text-left p-4 text-gray-400 font-medium hidden md:table-cell">Specs</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Cost (Datalix)</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Sell Price</th>
                                                <th className="text-left p-4 text-gray-400 font-medium hidden sm:table-cell">Profit</th>
                                                <th className="text-left p-4 text-gray-400 font-medium hidden sm:table-cell">Instances</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vpsPlans.map((plan: any) => {
                                                const profit = (plan.sellPrice || 0) - (plan.costPrice || 0);
                                                const margin = plan.costPrice ? ((profit / plan.costPrice) * 100).toFixed(0) : '—';
                                                const isEditing = editingPlan === plan.id;

                                                return (
                                                    <tr key={plan.id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="p-4">
                                                            {isEditing ? (
                                                                <input
                                                                    className="input-field text-sm w-40"
                                                                    defaultValue={plan.displayName}
                                                                    onBlur={async (e) => {
                                                                        if (e.target.value !== plan.displayName) {
                                                                            await adminApi.updateVpsPlan(plan.id, { displayName: e.target.value });
                                                                            loadTab('vps-plans');
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div>
                                                                    <p className="font-medium">{plan.displayName}</p>
                                                                    <p className="text-xs text-gray-600">{plan.datalixPlanName}</p>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-gray-400 hidden md:table-cell">
                                                            <span className="text-xs">{plan.ram}MB · {plan.cpu} CPU · {plan.disk}GB</span>
                                                        </td>
                                                        <td className="p-4 text-red-400 font-mono">₹{plan.costPrice}</td>
                                                        <td className="p-4">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    className="input-field text-sm w-24 font-mono"
                                                                    defaultValue={plan.sellPrice}
                                                                    min={0}
                                                                    step={1}
                                                                    onBlur={async (e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        if (!isNaN(val) && val !== plan.sellPrice) {
                                                                            await adminApi.updateVpsPlan(plan.id, { sellPrice: val });
                                                                            loadTab('vps-plans');
                                                                        }
                                                                    }}
                                                                />
                                                            ) : (
                                                                <span className="text-primary font-bold font-mono">₹{plan.sellPrice}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 hidden sm:table-cell">
                                                            <span className={`font-mono text-xs ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                ₹{profit.toFixed(0)} ({margin}%)
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-gray-400 hidden sm:table-cell">{plan._count?.vpsInstances || 0}</td>
                                                        <td className="p-4">
                                                            <button
                                                                onClick={async () => {
                                                                    await adminApi.updateVpsPlan(plan.id, { isActive: !plan.isActive });
                                                                    loadTab('vps-plans');
                                                                }}
                                                                className={`text-xs px-2 py-1 rounded ${plan.isActive
                                                                    ? 'bg-green-500/10 text-green-400'
                                                                    : 'bg-red-500/10 text-red-400'
                                                                    }`}
                                                            >
                                                                {plan.isActive ? 'Active' : 'Hidden'}
                                                            </button>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEditingPlan(isEditing ? null : plan.id)}
                                                                    className="text-xs px-3 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
                                                                >
                                                                    {isEditing ? 'Done' : 'Edit'}
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm(`Delete plan "${plan.displayName}"?`)) return;
                                                                        try {
                                                                            await adminApi.deleteVpsPlan(plan.id);
                                                                            toast.success('Plan deleted');
                                                                            loadTab('vps-plans');
                                                                        } catch { toast.error('Cannot delete (has active instances)'); }
                                                                    }}
                                                                    className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                                >
                                                                    Del
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* How it works info */}
                            <div className="glass-card p-5 mt-6 border-l-4 border-primary/50">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-gray-400">
                                        <p className="font-medium text-gray-300 mb-1">How VPS Reselling Works</p>
                                        <p><strong>Cost Price</strong> = What Datalix charges you (auto-synced).</p>
                                        <p><strong>Sell Price</strong> = What your customers pay (set by you).</p>
                                        <p><strong>Profit</strong> = Sell Price - Cost Price. Set any markup you want.</p>
                                        <p className="mt-1">Users must have sufficient <strong>balance</strong> to provision. Monthly auto-billing renews active VPS or suspends if balance is low.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ads & Credits Management */}
                    {tab === 'ads' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-2">Ads & Credits Configuration</h2>
                            <p className="text-sm text-gray-500 mb-6">Manage ad networks, credits rewards, and anti-adblock settings</p>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column — Main Controls */}
                                <div className="lg:col-span-2 space-y-6">

                                    {/* Ad Provider Toggle */}
                                    <div className="glass-card p-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-primary" /> Ad Provider Mode
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { value: 'both', label: 'Both Networks', desc: 'Maximum revenue' },
                                                { value: 'adsense', label: 'AdSense Only', desc: 'Google ads only' },
                                                { value: 'adsterra', label: 'Adsterra Only', desc: 'Adsterra ads only' },
                                                { value: 'none', label: 'Disabled', desc: 'No ads shown' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setAdSettings({ ...adSettings, ads_provider: opt.value })}
                                                    className={`p-4 rounded-xl border text-left transition-all ${adSettings.ads_provider === opt.value
                                                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <p className="text-sm font-medium">{opt.label}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* AdSense Config */}
                                    <div className={`glass-card p-6 transition-opacity ${adSettings.ads_provider === 'adsterra' || adSettings.ads_provider === 'none' ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" /></svg>
                                                Google AdSense
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded ${adSettings.ads_provider !== 'adsterra' && adSettings.ads_provider !== 'none' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                                {adSettings.ads_provider !== 'adsterra' && adSettings.ads_provider !== 'none' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Publisher ID</label>
                                                <input
                                                    className="input-field text-sm font-mono"
                                                    placeholder="ca-pub-xxxxxxxxxx"
                                                    value={adSettings.ads_adsense_publisher_id || ''}
                                                    onChange={(e) => setAdSettings({ ...adSettings, ads_adsense_publisher_id: e.target.value })}
                                                />
                                                <p className="text-xs text-gray-600 mt-1">From Google AdSense dashboard → Sites → Get code</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Ad Slot ID <span className="text-gray-600">(optional)</span></label>
                                                <input
                                                    className="input-field text-sm font-mono"
                                                    placeholder="1234567890"
                                                    value={adSettings.ads_adsense_slot_id || ''}
                                                    onChange={(e) => setAdSettings({ ...adSettings, ads_adsense_slot_id: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Adsterra Config */}
                                    <div className={`glass-card p-6 transition-opacity ${adSettings.ads_provider === 'adsense' || adSettings.ads_provider === 'none' ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Megaphone className="w-4 h-4 text-accent" /> Adsterra
                                            </h3>
                                            <span className={`text-xs px-2 py-1 rounded ${adSettings.ads_provider !== 'adsense' && adSettings.ads_provider !== 'none' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                                {adSettings.ads_provider !== 'adsense' && adSettings.ads_provider !== 'none' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Script URLs <span className="text-gray-600">(one per line — more zones = more revenue)</span></label>
                                            <textarea
                                                className="input-field text-sm font-mono min-h-[120px] resize-y"
                                                placeholder={"https://pl12345.youradexchange.com/sdk.js\nhttps://pl67890.youradexchange.com/sdk.js"}
                                                value={(adSettings.ads_adsterra_urls || '').split(',').filter(Boolean).join('\n')}
                                                onChange={(e) => setAdSettings({
                                                    ...adSettings,
                                                    ads_adsterra_urls: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean).join(',')
                                                })}
                                            />
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-xs text-gray-600">Paste your Adsterra ad unit script URLs, one per line</p>
                                                <span className="text-xs text-gray-500">
                                                    {(adSettings.ads_adsterra_urls || '').split(',').filter(Boolean).length} zone(s)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column — Credits & Anti-Adblock */}
                                <div className="space-y-6">

                                    {/* Credits Settings */}
                                    <div className="glass-card p-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-accent" /> Credits Config
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Timer Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    className="input-field text-sm"
                                                    min={10}
                                                    max={600}
                                                    value={adSettings.ads_timer_seconds || '60'}
                                                    onChange={(e) => setAdSettings({ ...adSettings, ads_timer_seconds: e.target.value })}
                                                />
                                                <p className="text-xs text-gray-600 mt-1">How long users must watch ads before claiming</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Credits per Earn</label>
                                                <input
                                                    type="number"
                                                    className="input-field text-sm"
                                                    min={1}
                                                    max={1000}
                                                    value={adSettings.ads_reward || '10'}
                                                    onChange={(e) => setAdSettings({ ...adSettings, ads_reward: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Anti-Adblock Toggle */}
                                    <div className="glass-card p-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 text-red-400" /> Anti-Adblock
                                        </h3>
                                        <button
                                            onClick={() => setAdSettings({ ...adSettings, ads_anti_adblock: adSettings.ads_anti_adblock === 'true' ? 'false' : 'true' })}
                                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${adSettings.ads_anti_adblock === 'true'
                                                ? 'border-green-500/30 bg-green-500/5'
                                                : 'border-white/10 bg-white/5'
                                                }`}
                                        >
                                            <div className="text-left">
                                                <p className="text-sm font-medium">{adSettings.ads_anti_adblock === 'true' ? 'Enabled' : 'Disabled'}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {adSettings.ads_anti_adblock === 'true'
                                                        ? 'Users with ad blockers cannot earn credits'
                                                        : 'Credits can be earned even with ad blockers'}
                                                </p>
                                            </div>
                                            {adSettings.ads_anti_adblock === 'true'
                                                ? <ToggleRight className="w-8 h-8 text-green-400" />
                                                : <ToggleLeft className="w-8 h-8 text-gray-500" />
                                            }
                                        </button>
                                    </div>

                                    {/* Preview Card */}
                                    <div className="glass-card p-6">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-primary" /> Live Preview
                                        </h3>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-2">
                                            <p className="text-xs text-gray-500">Users will see:</p>
                                            <div className="space-y-2">
                                                {(adSettings.ads_provider === 'both' || adSettings.ads_provider === 'adsterra') && (
                                                    <>
                                                        {(adSettings.ads_adsterra_urls || '').split(',').filter(Boolean).map((_: string, i: number) => (
                                                            <div key={i} className="h-16 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-xs text-accent/60">
                                                                Adsterra Zone {i + 1}
                                                            </div>
                                                        ))}
                                                        {!(adSettings.ads_adsterra_urls || '').split(',').filter(Boolean).length && (
                                                            <div className="h-16 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-600">
                                                                No Adsterra URLs set
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {(adSettings.ads_provider === 'both' || adSettings.ads_provider === 'adsense') && (
                                                    <div className={`h-16 rounded-lg flex items-center justify-center text-xs ${adSettings.ads_adsense_publisher_id ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400/60' : 'bg-white/5 border border-dashed border-white/10 text-gray-600'}`}>
                                                        {adSettings.ads_adsense_publisher_id ? 'AdSense Unit' : 'No AdSense ID set'}
                                                    </div>
                                                )}
                                                {adSettings.ads_provider === 'none' && (
                                                    <div className="h-16 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-center text-xs text-red-400/60">
                                                        Ads Disabled
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2">
                                                {adSettings.ads_timer_seconds || 60}s timer → {adSettings.ads_reward || 10} credits
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="mt-6 flex items-center gap-4">
                                <button
                                    onClick={async () => {
                                        setAdSaving(true);
                                        try {
                                            await adminApi.updateSettings(adSettings);
                                            toast.success('Ad settings saved! Changes are live immediately.');
                                        } catch {
                                            toast.error('Failed to save ad settings');
                                        } finally {
                                            setAdSaving(false);
                                        }
                                    }}
                                    disabled={adSaving}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {adSaving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4" />
                                    )}
                                    {adSaving ? 'Saving...' : 'Save Ad Settings'}
                                </button>
                                <p className="text-xs text-gray-600">Changes apply instantly — no restart needed</p>
                            </div>

                            {/* Revenue Tips */}
                            <div className="glass-card p-5 mt-6 border-l-4 border-accent/50">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-gray-400">
                                        <p className="font-medium text-gray-300 mb-1">Maximize Ad Revenue</p>
                                        <p>• <strong>Run both networks</strong> — AdSense + Adsterra fill different ad slots for higher RPM.</p>
                                        <p>• <strong>Add multiple Adsterra zones</strong> — Banner, Native Banner, Social Bar, and Popunder for parallel impressions.</p>
                                        <p>• <strong>Keep anti-adblock ON</strong> — ensures every credit earn generates real ad revenue.</p>
                                        <p>• <strong>Set timer to 30-90 seconds</strong> — long enough for ads to load and register impressions.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UPI Approvals */}
                    {tab === 'upi' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">Pending UPI Approvals</h2>
                            <div className="space-y-3">
                                {pendingUpi.map((u: any) => (
                                    <div key={u.id} className="glass-card p-4 flex items-center gap-4">
                                        <DollarSign className="w-8 h-8 text-orange-400" />
                                        <div className="flex-1">
                                            <p className="font-medium">{u.user?.name} — ₹{u.amount}</p>
                                            <p className="text-xs text-gray-500">UTR: {u.utr}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={async () => { await adminApi.approveUpi(u.id); loadTab('upi'); }}
                                                className="p-2 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20" aria-label="Approve UPI payment"><Check className="w-4 h-4" /></button>
                                            <button onClick={async () => { await adminApi.rejectUpi(u.id); loadTab('upi'); }}
                                                className="p-2 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20" aria-label="Reject UPI payment"><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                {pendingUpi.length === 0 && <p className="text-gray-500 text-center py-8">No pending approvals</p>}
                            </div>
                        </div>
                    )}

                    {/* Settings */}
                    {tab === 'settings' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">Platform Settings</h2>
                            <div className="glass-card p-6 space-y-4 max-w-2xl">
                                {['app_name', 'primary_color', 'accent_color', 'hero_title', 'hero_subtitle', 'footer_text'].map((key) => (
                                    <div key={key}>
                                        <label className="text-sm text-gray-400 mb-1 block capitalize">{key.replace(/_/g, ' ')}</label>
                                        <input className="input-field" defaultValue={settings[key] || ''}
                                            aria-label={key.replace(/_/g, ' ')}
                                            onBlur={async (e) => {
                                                try { await adminApi.updateSettings({ [key]: e.target.value }); toast.success(`${key.replace(/_/g, ' ')} saved`); }
                                                catch { toast.error('Failed to save setting'); }
                                            }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audit */}
                    {tab === 'audit' && (
                        <div>
                            <h2 className="text-2xl font-display font-bold mb-6">Audit Logs</h2>
                            <div className="space-y-2">
                                {audit.logs?.map((log: any) => (
                                    <div key={log.id} className="glass-card p-4 flex items-center gap-4 text-sm">
                                        <ClipboardList className="w-4 h-4 text-gray-500" />
                                        <span className="font-medium flex-1">{log.action}</span>
                                        <span className="text-gray-500">{log.user?.name}</span>
                                        <span className="text-xs text-gray-600">{new Date(log.createdAt).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
