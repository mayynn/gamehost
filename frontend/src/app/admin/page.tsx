'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import {
    LayoutDashboard, Users, Server, CreditCard, Settings, ClipboardList,
    Shield, DollarSign, Check, X
} from 'lucide-react';

const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'plans', label: 'Plans', icon: CreditCard },
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
