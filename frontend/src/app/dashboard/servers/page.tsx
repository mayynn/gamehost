'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { serversApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { StaggerContainer, FadeUpItem, Skeleton } from '@/components/ui/Animations';
import { Server, Plus, Clock, Cpu, HardDrive, MemoryStick, Search, Rocket, ArrowRight } from 'lucide-react';

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    serversApi.list().then(r => setServers(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = servers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const active = servers.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Servers</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="text-emerald-400 font-medium">{active} active</span> · {servers.length} total
          </p>
        </div>
        <Link href="/dashboard/servers/create" className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Rocket className="w-4 h-4" /> Deploy Server
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search servers..." className="input-field pl-11" />
      </div>

      {/* Server List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="neo-card text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.12)' }}>
            <Server className="w-7 h-7 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{search ? 'No servers found' : 'No Servers Yet'}</h3>
          <p className="text-gray-500 mb-6 text-sm max-w-xs mx-auto">{search ? 'Try a different search term.' : 'Deploy your first game server and start playing in seconds.'}</p>
          {!search && <Link href="/dashboard/servers/create" className="btn-primary inline-flex items-center gap-2 text-sm"><Rocket className="w-4 h-4" /> Deploy Server</Link>}
        </div>
      ) : (
        <StaggerContainer className="space-y-2.5">
          {filtered.map((s: any) => {
            const daysLeft = s.expiresAt ? Math.max(0, Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 86400000)) : null;
            const isUrgent = daysLeft !== null && daysLeft <= 3;
            return (
              <FadeUpItem key={s.id}>
                <Link href={`/dashboard/servers/${s.id}`} className="block neo-card-interactive p-4 group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                        s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                        s.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400' :
                        s.status === 'INSTALLING' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white truncate">{s.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600 mt-1">
                          <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3" />{s.ram >= 1024 ? `${(s.ram/1024).toFixed(1)} GB` : `${s.ram} MB`}</span>
                          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{s.cpu}%</span>
                          <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{s.disk >= 1024 ? `${(s.disk/1024).toFixed(1)} GB` : `${s.disk} MB`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {daysLeft !== null && (
                        <span className={`text-[11px] hidden sm:flex items-center gap-1 font-medium ${isUrgent ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : 'text-gray-600'}`}>
                          <Clock className="w-3 h-3" />{daysLeft}d
                        </span>
                      )}
                      <span className={`status-${s.status?.toLowerCase() || 'active'}`}>{s.status}</span>
                      <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block" />
                    </div>
                  </div>
                </Link>
              </FadeUpItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
