'use client';

import { useState, useEffect } from 'react';
import { serversApi } from '@/lib/api';
import Link from 'next/link';
import { Server, ArrowUpRight, Plus, HardDrive, Cpu, MemoryStick, AlertCircle } from 'lucide-react';

export default function ServersPage() {
    const [servers, setServers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        serversApi.list()
            .then((r) => setServers(r.data || []))
            .catch((e) => setError(e?.response?.data?.message || 'Failed to load servers'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-display font-bold">Servers</h1>
                    <p className="text-gray-400 mt-1">Manage your game servers</p>
                </div>
                <Link href="/dashboard/plans" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Server
                </Link>
            </div>

            {error && (
                <div className="glass-card p-6 mb-6 border-red-500/30 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {servers.length === 0 && !error ? (
                <div className="glass-card p-16 text-center">
                    <Server className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold mb-2">No servers yet</h3>
                    <p className="text-gray-400 mb-6">Deploy your first game server in seconds</p>
                    <Link href="/dashboard/plans" className="btn-primary">Browse Plans</Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {servers.map((server) => (
                        <Link
                            key={server.id}
                            href={`/dashboard/servers/${server.id}`}
                            className="glass-card-hover p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 group"
                        >
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 ${server.status === 'ACTIVE' ? 'bg-green-400 shadow-lg shadow-green-400/30' :
                                    server.status === 'SUSPENDED' ? 'bg-orange-400 shadow-lg shadow-orange-400/30' : 'bg-red-400'
                                }`} />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate">{server.name}</h3>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                                    <span className="flex items-center gap-1"><MemoryStick className="w-4 h-4" />{server.ram}MB</span>
                                    <span className="flex items-center gap-1"><Cpu className="w-4 h-4" />{server.cpu}%</span>
                                    <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" />{server.disk}MB</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={
                                    server.status === 'ACTIVE' ? 'status-active' :
                                        server.status === 'SUSPENDED' ? 'status-suspended' : 'status-expired'
                                }>
                                    {server.status}
                                </span>
                                <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
