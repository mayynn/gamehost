'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import {
    LayoutDashboard, Users, Server, CreditCard, Settings, ClipboardList,
    Shield, DollarSign, Check, X, UserX, Link2, AlertTriangle, Trash2,
    CloudCog, RefreshCw, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'alts', label: 'Alt Detection', icon: UserX },
    { id: 'plans', label: 'Plans', icon: CreditCard },
    { id: 'vps-plans', label: 'VPS Plans', icon: CloudCog },
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
    const [vpsStats, setVpsStats] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApi.getMe().then((r) => {
            if (r.data.user.role !== 'ADMIN') router.push('/dashboard');
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
                case 'vps-plans': {
                    const [plansR, statsR] = await Promise.all([adminApi.vpsPlans(), adminApi.vpsStats()]);
                    setVpsPlans(plansR.data || []);
                    setVpsStats(statsR.data || null);
                    break;
                }
                case 'upi': { const r = await adminApi.pendingUpi(); setPendingUpi(r.data || []); break; }
                case 'settings': { const r = await adminApi.settings(); setSettings(r.data || {}); break; }
                case 'audit': { const r = await adminApi.auditLogs(); setAudit(r.data); break; }
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { loadTab('dashboard'); }, []);

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
                                                    <button onClick={async () => { await adminApi.setRole(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN'); loadTab('users'); }}
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
                                            <button onClick={async () => { await adminApi.suspendServer(s.id); loadTab('servers'); }}
                                                className="text-xs px-3 py-1 rounded bg-orange-500/10 text-orange-400">Suspend</button>
                                            <button onClick={async () => { await adminApi.unsuspendServer(s.id); loadTab('servers'); }}
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
                                            onBlur={(e) => adminApi.updateSettings({ [key]: e.target.value })} />
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
