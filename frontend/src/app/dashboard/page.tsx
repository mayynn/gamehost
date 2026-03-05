'use client';

import { useState, useEffect } from 'react';
import { Server, Wallet, Gift, Activity, ArrowUpRight, Loader2 } from 'lucide-react';
import { authApi, serversApi, billingApi, creditsApi } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [servers, setServers] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [credits, setCredits] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            authApi.getMe().then((r) => setUser(r.data.user)).catch(() => { }),
            serversApi.list().then((r) => setServers(r.data || [])).catch(() => { }),
            billingApi.balance().then((r) => setBalance(r.data?.balance ?? r.data ?? 0)).catch(() => { }),
            creditsApi.get().then((r) => setCredits(r.data || 0)).catch(() => { }),
        ]).finally(() => setLoading(false));
    }, []);

    const stats = [
        { label: 'Active Servers', value: servers.filter((s) => s.status === 'ACTIVE').length, icon: Server, color: 'text-green-400 bg-green-500/10' },
        { label: 'Total Servers', value: servers.length, icon: Activity, color: 'text-blue-400 bg-blue-500/10' },
        { label: 'Balance', value: `₹${typeof balance === 'number' ? balance.toFixed(2) : balance}`, icon: Wallet, color: 'text-primary bg-primary/10' },
        { label: 'Credits', value: credits, icon: Gift, color: 'text-accent bg-accent/10' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-display font-bold">Welcome back, <span className="gradient-text">{user?.name || 'User'}</span></h1>
                <p className="text-gray-400 mt-1">Manage your game servers and billing from here.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-400">{stat.label}</span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Servers List */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Your Servers</h2>
                    <Link href="/dashboard/plans" className="text-primary text-sm flex items-center gap-1 hover:underline">
                        Create Server <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>

                {servers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No servers yet</p>
                        <p className="text-sm mt-1">Create your first server from the Plans page</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {servers.map((server) => (
                            <Link
                                key={server.id}
                                href={`/dashboard/servers/${server.id}`}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                            >
                                <div className={`w-3 h-3 rounded-full ${server.status === 'ACTIVE' ? 'bg-green-400 shadow-lg shadow-green-400/30' :
                                        server.status === 'SUSPENDED' ? 'bg-orange-400' : 'bg-red-400'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{server.name}</p>
                                    <p className="text-xs text-gray-500">{server.ram >= 1024 ? `${(server.ram / 1024).toFixed(1)} GB` : `${server.ram} MB`} RAM · {server.cpu}% CPU · {server.disk >= 1024 ? `${(server.disk / 1024).toFixed(1)} GB` : `${server.disk} MB`} Disk</p>
                                </div>
                                <span className={
                                    server.status === 'ACTIVE' ? 'status-active' :
                                        server.status === 'SUSPENDED' ? 'status-suspended' : 'status-expired'
                                }>
                                    {server.status}
                                </span>
                                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
