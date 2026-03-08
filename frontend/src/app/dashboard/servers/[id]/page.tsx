'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serversApi, pluginsApi, playersApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CircularProgress, RealtimeStatsPanel } from '@/components/ui/ServerWidgets';
import {
  Terminal, FolderOpen, Database, Archive, Globe, Settings, Puzzle, Users,
  Play, Square, RotateCcw, Skull, Trash2, ChevronLeft, ChevronRight, Loader2, Send,
  File, Folder, ArrowLeft, Edit3, Plus, Upload, X, Download, RefreshCw,
  Search, ExternalLink, ShieldAlert, Clock, AlertTriangle, CheckCircle,
  MemoryStick, Cpu, HardDrive, Copy, Eye, EyeOff, UserMinus, UserPlus,
  Shield, Ban, Gavel, CalendarClock, Activity, Lock, Unlock, RotateCw,
  FileArchive, Save
} from 'lucide-react';
import Link from 'next/link';

const BASE_TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'databases', label: 'Databases', icon: Database },
  { id: 'backups', label: 'Backups', icon: Archive },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'startup', label: 'Startup', icon: Settings },
  { id: 'schedules', label: 'Schedules', icon: CalendarClock },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_CFG: Record<string, { text: string; dot: string; bg: string; border: string }> = {
  running: { text: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  starting: { text: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
  stopping: { text: 'text-orange-400', dot: 'bg-orange-400', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  offline: { text: 'text-gray-400', dot: 'bg-gray-500', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
};

function stripAnsi(s: string) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [server, setServer] = useState<any>(null);
  const [tab, setTab] = useState('console');
  const [loading, setLoading] = useState(true);
  const [powerLoading, setPowerLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewalCost, setRenewalCost] = useState<number | null>(null);
  const [isFreeServer, setIsFreeServer] = useState(false);
  const [pluginProfile, setPluginProfile] = useState<any>(null);
  const [liveStats, setLiveStats] = useState({ cpuPercent: 0, memoryBytes: 0, diskBytes: 0, networkRx: 0, networkTx: 0, uptime: 0 });
  const statsWsRef = useRef<WebSocket | null>(null);
  const statsMountedRef = useRef(false);

  const fetchServer = useCallback(async () => {
    try {
      const res = await serversApi.get(id);
      setServer(res.data);
    } catch { toast.error('Failed to load server'); router.push('/dashboard/servers'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchServer(); }, [fetchServer]);

  useEffect(() => {
    if (!server) return;
    const iv = setInterval(fetchServer, 15000);
    return () => clearInterval(iv);
  }, [server, fetchServer]);

  // Realtime stats via WebSocket — separate connection for header resource dials
  useEffect(() => {
    if (!id) return;
    statsMountedRef.current = true;
    let ws: WebSocket | null = null;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connectStats = () => {
      if (!statsMountedRef.current) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${proto}//${window.location.host}/api/servers/${id}/ws`);
      statsWsRef.current = ws;

      ws.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          if (payload?.event === 'auth success') {
            retries = 0;
            ws?.send(JSON.stringify({ event: 'send stats', args: [null] }));
          }
          if (payload?.event === 'stats' && payload.args?.[0]) {
            const raw = typeof payload.args[0] === 'string' ? JSON.parse(payload.args[0]) : payload.args[0];
            setLiveStats({
              cpuPercent: raw.cpu_absolute ?? 0,
              memoryBytes: raw.memory_bytes ?? 0,
              diskBytes: raw.disk_bytes ?? 0,
              networkRx: raw.network?.rx_bytes ?? 0,
              networkTx: raw.network?.tx_bytes ?? 0,
              uptime: raw.uptime ?? 0,
            });
          }
        } catch { /* ignore parse errors */ }
      };
      ws.onclose = () => {
        if (!statsMountedRef.current) return;
        if (retries < 3) { retries++; timer = setTimeout(connectStats, 5000 * retries); }
      };
      ws.onerror = () => { /* onclose will fire */ };
    };
    connectStats();

    return () => {
      statsMountedRef.current = false;
      if (timer) clearTimeout(timer);
      if (ws) { ws.onclose = null; ws.onerror = null; ws.onmessage = null; ws.close(); }
      statsWsRef.current = null;
    };
  }, [id]);

  const handlePower = async (signal: string) => {
    setPowerLoading(true);
    try { await serversApi.power(id, signal); toast.success(`Power: ${signal}`); setTimeout(fetchServer, 2000); }
    catch { toast.error('Power action failed'); }
    finally { setPowerLoading(false); }
  };

  const handleDelete = async () => {
    try { await serversApi.delete(id); toast.success('Server deleted'); router.push('/dashboard/servers'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleRenew = async () => {
    setRenewLoading(true);
    try { await serversApi.renew(id); toast.success('Server renewed!'); fetchServer(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Renewal failed'); }
    finally { setRenewLoading(false); }
  };

  useEffect(() => {
    if (server) serversApi.renewalCost(id).then(r => { setRenewalCost(r.data.cost ?? r.data.price ?? r.data); setIsFreeServer(!!r.data.isFreeServer); }).catch(() => {});
  }, [server, id]);

  useEffect(() => {
    if (!server?.pteroUuid) {
      setPluginProfile(null);
      return;
    }
    pluginsApi.detect(server.pteroUuid)
      .then((r) => setPluginProfile(r.data))
      .catch(() => setPluginProfile(null));
  }, [server?.pteroUuid]);

  const tabs = useMemo(() => {
    const list = [...BASE_TABS];
    if (pluginProfile?.isMinecraft) {
      const pluginTab = { id: 'plugins', label: pluginProfile?.type === 'mod' ? 'Mods' : 'Plugins', icon: Puzzle };
      const playersTab = { id: 'players', label: 'Players', icon: Users };
      const insertBefore = list.findIndex((item) => item.id === 'activity');
      if (insertBefore >= 0) list.splice(insertBefore, 0, pluginTab, playersTab);
      else list.push(pluginTab, playersTab);
    }
    return list;
  }, [pluginProfile]);

  useEffect(() => {
    if ((tab === 'plugins' || tab === 'players') && !pluginProfile?.isMinecraft) {
      setTab('console');
    }
  }, [tab, pluginProfile]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-gray-300 animate-spin" /></div>;
  if (!server) return null;

  const status = server.resources?.current_state || server.status?.toLowerCase() || 'offline';
  const sc = STATUS_CFG[status] || STATUS_CFG.offline;
  const isSuspended = server.status === 'SUSPENDED';
  const isExpired = server.status === 'EXPIRED';

  // Extract primary allocation (IP:Port) from Pterodactyl data
  const primaryAlloc = server.pteroData?.relationships?.allocations?.data?.find((a: any) => a.attributes?.is_default)?.attributes
    || server.pteroData?.relationships?.allocations?.data?.[0]?.attributes;
  const serverAddress = primaryAlloc ? `${primaryAlloc.ip_alias || primaryAlloc.ip}:${primaryAlloc.port}` : null;

  return (
    <div className="space-y-6">
      {/* Suspension/Expired Overlay */}
      {(isSuspended || isExpired) && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-red-400 text-sm">{isSuspended ? 'Server Suspended' : 'Server Expired'}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">{isSuspended ? 'Contact support for assistance.' : 'Renew your server to continue using it.'}</p>
            </div>
            {isExpired && (
              <button onClick={handleRenew} disabled={renewLoading} className="btn-primary ml-auto text-sm">
                {renewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Renew${isFreeServer ? ' (1 Credit)' : renewalCost !== null ? ` (₹${renewalCost})` : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6 mt-4 perspective-[2000px]">
        {/* Server Identity Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 30, rotateX: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
          className="xl:col-span-3 neo-card relative overflow-hidden flex flex-col justify-between p-8 sm:p-10 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.08]"
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Holographic light gradients */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative z-10" style={{ transform: 'translateZ(30px)' }}>
             <Link href="/dashboard/servers" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] shadow-inner text-gray-400 hover:text-white mb-6 transition-all hover:bg-white/[0.1] hover:scale-105 text-[11px] font-bold tracking-[0.2em] uppercase">
               <ChevronLeft className="w-3.5 h-3.5" /> Back to Fleet
             </Link>

             <motion.h1 
               layoutId={`server-title-${server.id}`}
               className="text-4xl sm:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-100 to-gray-500 tracking-tight leading-tight shrink-0 mb-4 drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]"
             >
               {server.name}
             </motion.h1>

             <div className="flex items-center gap-3 flex-wrap">
               <motion.span 
                 whileHover={{ scale: 1.05 }}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black tracking-[0.2em] text-[11px] uppercase shadow-lg backdrop-blur-md" 
                 style={{ background: sc.bg, border: `1px solid ${sc.border}`, boxShadow: `0 0 20px ${sc.bg.replace('0.08', '0.2')}` }}
               >
                 <span className="relative flex h-2.5 w-2.5">
                   {status === 'running' && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${sc.dot}`} />}
                   <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${sc.dot} shadow-[0_0_12px_currentColor]`} />
                 </span>
                 <span className={sc.text}>{status}</span>
               </motion.span>

               <span className="px-3.5 py-2 rounded-full bg-black/40 border border-white/[0.06] text-[11px] font-mono font-bold text-gray-400 tracking-widest shadow-inner">
                 ID: <span className="text-gray-300">{server.id}</span>
               </span>
             </div>

             {/* Connection Address Box */}
             {serverAddress && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3, duration: 0.5 }}
                 className="mt-8"
               >
                 <span className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-black mb-3 block drop-shadow-md">CONNECT TO NODE</span>
                 <div className="inline-flex items-center gap-3 pl-5 pr-2 py-2.5 rounded-2xl bg-black/60 border border-white/[0.1] hover:border-white/[0.2] transition-colors shadow-inner group backdrop-blur-xl">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                   <span className="font-mono text-[16px] font-black text-white tracking-widest select-all drop-shadow-sm">{serverAddress}</span>
                   <motion.button
                     whileHover={{ scale: 1.1, rotate: 5 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => { navigator.clipboard.writeText(serverAddress); toast.success('Address Copied!'); }}
                     className="ml-2 w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-gray-300 hover:bg-white/[0.15] hover:text-white transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
                     title="Copy Address"
                   >
                     <Copy className="w-4 h-4" />
                   </motion.button>
                 </div>
               </motion.div>
             )}
          </div>

          {/* Holographic Power Controls */}
          <div className="mt-10 flex items-center gap-3 relative z-10 flex-wrap" style={{ transform: 'translateZ(40px)' }}>
            <div className="flex items-center gap-2 bg-black/50 p-2 rounded-2xl border border-white/[0.08] backdrop-blur-md shadow-2xl">
            {[
              { signal: 'start', icon: Play, text: 'IGNITE', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', disabled: status === 'running', shadow: 'rgba(16,185,129,0.3)' },
              { signal: 'stop', icon: Square, text: 'HALT', color: 'text-red-400', bg: 'rgba(239,68,68,0.1)', disabled: status === 'offline', shadow: 'rgba(239,68,68,0.3)' },
              { signal: 'restart', icon: RotateCcw, text: 'REBOOT', color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', disabled: status === 'offline', shadow: 'rgba(245,158,11,0.3)' },
              { signal: 'kill', icon: Skull, text: 'TERMINATE', color: 'text-red-500', bg: 'rgba(239,68,68,0.1)', disabled: status === 'offline', shadow: 'rgba(239,68,68,0.4)' },
            ].map(p => (
              <motion.button 
                key={p.signal} 
                onClick={() => handlePower(p.signal)} 
                disabled={powerLoading || p.disabled || isSuspended}
                whileHover={{ y: -3, scale: 1.05, boxShadow: `0 10px 20px -5px ${p.shadow}` }}
                whileTap={{ y: 0, scale: 0.95 }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${p.color}`}
                style={{ background: p.bg, border: `1px solid ${p.bg.replace('0.1', '0.2')}` }}
                title={p.signal}
              >
                <p.icon className="w-4 h-4" />
                <span className="text-[11px] font-black tracking-[0.15em] hidden sm:inline">{p.text}</span>
              </motion.button>
            ))}
            </div>

            <motion.button 
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDeleteConfirm(true)} 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-red-500 bg-black/50 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all shadow-lg backdrop-blur-md" 
              title="Destroy Node"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Realtime Resource Stats Panel */}
        <RealtimeStatsPanel 
          stats={liveStats} 
          limits={{
            memory: server.pteroLimitRam || server.plan?.ram || 1024,
            disk: server.pteroLimitDisk || server.plan?.disk || 10240,
            cpu: server.pteroLimitCpu || server.plan?.cpu || 100,
          }}
        />
      </div>

      {/* Tabs */}
      <div className="relative mt-8 z-20">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none p-2 rounded-2xl bg-black/40 border border-white/[0.05] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          {tabs.map(t => (
            <button 
              key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-500 ${
                tab === t.id ? 'text-white scale-100' : 'text-gray-500 hover:text-white hover:bg-white/[0.05] scale-95 hover:scale-100'
              }`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/[0.1] to-white/[0.02] border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                />
              )}
              <t.icon className={`w-4 h-4 relative z-10 transition-all duration-500 ${tab === t.id ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'opacity-70'}`} />
              <span className="relative z-10 drop-shadow-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={tab} 
          initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(8px)', rotateX: -10 }} 
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0 }} 
          exit={{ opacity: 0, y: -30, scale: 1.05, filter: 'blur(8px)', rotateX: 10 }} 
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
          className="mt-6 perspective-[1000px] transform-style-[preserve-3d]"
        >
          {tab === 'console' && <ConsoleTab serverId={id} />}
          {tab === 'files' && <FilesTab serverId={id} />}
          {tab === 'databases' && <DatabasesTab serverId={id} />}
          {tab === 'backups' && <BackupsTab serverId={id} />}
          {tab === 'network' && <NetworkTab serverId={id} />}
          {tab === 'startup' && <StartupTab serverId={id} />}
          {tab === 'schedules' && <SchedulesTab serverId={id} />}
          {tab === 'plugins' && pluginProfile?.isMinecraft && <PluginsTab serverUuid={server.pteroUuid} profile={pluginProfile} />}
          {tab === 'players' && <PlayersTab serverUuid={server.pteroUuid} />}
          {tab === 'activity' && <ActivityTab serverId={id} />}
          {tab === 'settings' && <SettingsTab serverId={id} serverName={server.name} onRenamed={fetchServer} />}
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="neo-card max-w-md w-full overflow-hidden">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Delete Server</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-400">This will permanently delete <strong className="text-white">{server.name}</strong> and all its data. This action cannot be undone.</p>
                <div className="flex gap-3 justify-end mt-5">
                  <button onClick={() => setDeleteConfirm(false)} className="btn-secondary text-sm">Cancel</button>
                  <button onClick={handleDelete} className="btn-danger text-sm">Delete Forever</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────── CONSOLE TAB ──────── */
function ConsoleTab({ serverId }: { serverId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [failed, setFailed] = useState(false);
  const [eulaPrompt, setEulaPrompt] = useState(false);
  const [eulaAccepting, setEulaAccepting] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const reconnectTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 5;

  const appendLines = useCallback((input: string | string[]) => {
    const next = (Array.isArray(input) ? input : [input])
      .map((line) => stripAnsi(String(line ?? '')))
      .filter((line) => line.length > 0);
    if (!next.length) return;
    // Detect EULA requirement
    if (next.some(l => /you need to agree to the eula|eula\.txt|go to eula\.txt/i.test(l))) {
      setEulaPrompt(true);
    }
    setLines((prev) => [...prev, ...next].slice(-500));
  }, []);

  const acceptEula = useCallback(async () => {
    setEulaAccepting(true);
    try {
      await serversApi.writeFile(serverId, '/eula.txt', 'eula=true\n');
      toast.success('EULA accepted — restarting server...');
      setEulaPrompt(false);
      await serversApi.power(serverId, 'restart');
    } catch {
      toast.error('Failed to accept EULA');
    } finally {
      setEulaAccepting(false);
    }
  }, [serverId]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const reconnect = useCallback((delay = 1500) => {
    if (!mountedRef.current) return;
    if (retriesRef.current >= MAX_RETRIES) {
      setConnecting(false);
      setFailed(true);
      appendLines('[system] Max reconnection attempts reached. Click reconnect to try again.');
      return;
    }
    retriesRef.current += 1;
    // Exponential backoff: 3s, 6s, 12s, 24s, 48s — gives Pterodactyl rate limit time to recover
    const backoff = Math.min(delay * Math.pow(2, retriesRef.current - 1), 60000);
    clearReconnectTimer();
    reconnectTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      void connectRef.current();
    }, backoff);
  }, [appendLines, clearReconnectTimer]);

  const connect = useCallback(async () => {
    try {
      clearReconnectTimer();
      setConnecting(true);
      setConnected(false);
      setFailed(false);

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      // Connect through our backend WebSocket proxy (avoids Wings 403 Origin check)
      // The proxy handles auth, ownership, and credentials server-side.
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/servers/${serverId}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Auth is handled server-side by the proxy — no need to send auth event
      };

      ws.onmessage = (message) => {
        if (typeof message.data !== 'string') return;
        try {
          const payload = JSON.parse(message.data);
          const event = payload?.event;
          const args = Array.isArray(payload?.args) ? payload.args : [];

          if (event === 'auth success') {
            retriesRef.current = 0;
            setConnected(true);
            setConnecting(false);
            setFailed(false);
            ws.send(JSON.stringify({ event: 'send logs', args: [null] }));
            ws.send(JSON.stringify({ event: 'send stats', args: [null] }));
            return;
          }

          if (event === 'console output') {
            const chunk = typeof args[0] === 'string' ? args[0] : '';
            appendLines(chunk.split('\n'));
            return;
          }

          if (event === 'daemon message' && typeof args[0] === 'string') {
            appendLines(`[daemon] ${args[0]}`);
            return;
          }

          if (event === 'token expiring') {
            // Token refresh is handled automatically by the backend proxy
            return;
          }

          if (event === 'token expired' || event === 'jwt error' || event === 'auth error') {
            appendLines(`[system] ${event} — reconnecting...`);
            ws.close();
          }

          if (event === 'status') {
            const status = typeof args[0] === 'string' ? args[0] : '';
            if (status) appendLines(`[system] Server status: ${status}`);
            return;
          }
        } catch {
          appendLines(message.data);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(true);
        reconnect(3000);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(true);
        reconnect(5000);
      };
    } catch (e: any) {
      if (!mountedRef.current) return;
      setConnected(false);
      setConnecting(true);
      appendLines(`[system] Connection error: ${e?.message || 'unknown'}`);
      reconnect(5000);
    }
  }, [appendLines, clearReconnectTimer, reconnect, serverId]);
  connectRef.current = connect;

  const manualReconnect = useCallback(() => {
    retriesRef.current = 0;
    setFailed(false);
    void connectRef.current();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimer, connect]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [lines]);

  const sendCmd = async () => {
    const value = cmd.trim();
    if (!value) return;
    setSending(true);
    try {
      await serversApi.command(serverId, value);
      appendLines(`> ${value}`);
      setHistory(p => [value, ...p.slice(0, 49)]);
      setCmd('');
      setHistIdx(-1);
    }
    catch { toast.error('Failed to send command'); }
    finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendCmd();
    if (e.key === 'ArrowUp' && history.length) { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setCmd(history[i]); }
    if (e.key === 'ArrowDown') { const i = histIdx - 1; if (i < 0) { setHistIdx(-1); setCmd(''); } else { setHistIdx(i); setCmd(history[i]); } }
  };

  return (
    <>
    {/* EULA Acceptance Modal */}
    <AnimatePresence>
      {eulaPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="neo-card max-w-md w-full mx-4 p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">EULA Agreement Required</h3>
                <p className="text-gray-500 text-[11px] mt-0.5">Minecraft requires you to accept the EULA</p>
              </div>
            </div>
            <p className="text-gray-400 text-[13px] leading-relaxed">
              By clicking Accept, you agree to the{' '}
              <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-gray-200 transition-colors">
                Minecraft End User License Agreement
              </a>. This will write <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white text-[12px] font-mono">eula=true</code> to your server and restart it.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setEulaPrompt(false)} className="btn-secondary text-xs px-5 py-2.5 flex-1">Decline</button>
              <button onClick={acceptEula} disabled={eulaAccepting} className="flex-1 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider bg-white/[0.08] text-white border border-white/[0.12] hover:bg-white/[0.14] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {eulaAccepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {eulaAccepting ? 'Accepting...' : 'Accept EULA'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.15 }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)] bg-[#050508]"
    >
      {/* Glow top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] z-10" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(161,161,170,0.15) 20%, rgba(161,161,170,0.25) 50%, rgba(161,161,170,0.15) 80%, transparent 100%)' }} />

      {/* Console Header */}
      <div className="relative flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-gradient-to-r from-[#0a0a0f]/90 to-[#0d0d18]/90 backdrop-blur-xl">
        {/* macOS-style dots */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_6px_rgba(234,179,8,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="flex items-center gap-2.5 text-[11px] font-semibold tracking-widest uppercase">
            <div className="relative flex h-2 w-2 items-center justify-center">
              {(connecting || connected) && (
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${connected ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 shadow-[0_0_10px_currentColor] ${connected ? 'bg-emerald-400 text-emerald-400' : failed ? 'bg-red-500 text-red-500' : connecting ? 'bg-yellow-400 text-yellow-400' : 'bg-red-500 text-red-500'}`} />
            </div>
            <span className={connected ? 'text-emerald-400/80' : failed ? 'text-red-400/80' : connecting ? 'text-yellow-400/80' : 'text-gray-500'}>
              {connected ? 'CONNECTED' : failed ? 'FAILED' : connecting ? 'CONNECTING...' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setLines([])}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
            title="Clear console"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            onClick={manualReconnect}
            whileHover={{ rotate: 180, scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.4 }}
            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.1] transition-all"
            title="Reconnect"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
      
      {/* Console Output */}
      <div 
        ref={logRef} 
        className="relative h-[420px] sm:h-[520px] overflow-y-auto font-mono text-[13px] text-gray-300 bg-[#030306] scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent"
        style={{ 
          boxShadow: 'inset 0 15px 40px rgba(0,0,0,0.6), inset 0 -5px 20px rgba(0,0,0,0.3)'
        }}
      >
        {/* Subtle scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015] z-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)', backgroundSize: '100% 4px' }} />
        
        <div className="relative z-0 p-4 sm:p-5 space-y-0">
          {lines.length === 0 && (
            <div className="h-[380px] sm:h-[480px] flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="relative w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
                  <Terminal className="w-7 h-7 text-gray-500" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-gray-400 text-sm font-medium tracking-wider">AWAITING OUTPUT</p>
                <p className="text-gray-600 text-[11px] tracking-wide">Console output will appear here</p>
              </div>
            </div>
          )}
          {lines.map((l, i) => {
            const isSystem = l.startsWith('[system]') || l.startsWith('[daemon]');
            const isCommand = l.startsWith('>');
            const lower = l.toLowerCase();
            const isError = !isSystem && !isCommand && (/\b(error|exception|fatal|severe|failed|failure|critical|crash|caused by|at [a-z]+\.[a-z]+\.)/i.test(l));
            const isWarn = !isSystem && !isCommand && !isError && (/\b(warn|warning|deprecated|unable|timeout)\b/i.test(l));
            const isInfo = !isSystem && !isCommand && !isError && !isWarn && (/\b(info)\b/i.test(lower));
            const lineColor = isSystem ? 'text-gray-500 italic' 
              : isCommand ? 'text-white font-medium' 
              : isError ? 'text-red-400' 
              : isWarn ? 'text-yellow-400/90' 
              : isInfo ? 'text-blue-300/70'
              : 'text-gray-300 hover:text-gray-100';
            return (
              <div 
                key={i} 
                className={`group flex items-start gap-0 leading-[1.7] transition-colors rounded ${lineColor}`}
              >
                <span className={`select-none text-[11px] w-10 flex-shrink-0 text-right pr-3 pt-[1px] font-mono tabular-nums transition-colors ${isError ? 'text-red-500/30' : isWarn ? 'text-yellow-500/25' : 'text-gray-600/40 group-hover:text-gray-500/60'}`}>{i + 1}</span>
                <span className="whitespace-pre-wrap break-all flex-1 hover:bg-white/[0.015] px-2 py-[1px] rounded transition-colors">{l}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Command Input Area */}
      <div className="relative border-t border-white/[0.06] bg-gradient-to-r from-[#0a0a0f] to-[#0d0d18] p-3">
        <div className="flex items-center rounded-xl bg-[#050508] border border-white/[0.06] overflow-hidden focus-within:border-white/[0.15] focus-within:shadow-[0_0_20px_rgba(255,255,255,0.03)] transition-all duration-300">
          <div className="pl-4 flex items-center justify-center">
            <span className="text-gray-500 font-mono font-bold text-sm">$</span>
          </div>
          <input 
            type="text" 
            value={cmd} 
            onChange={e => setCmd(e.target.value)} 
            onKeyDown={handleKey}
            placeholder="Enter command..." 
            className="flex-1 bg-transparent px-3 py-3.5 text-[13px] text-white outline-none font-mono placeholder:text-gray-600/60 tracking-wide" 
          />
          <div className="flex items-center gap-1.5 pr-2">
            <span className="text-[10px] text-gray-600 tracking-wider hidden sm:inline mr-1">↑↓ HISTORY</span>
            <motion.button 
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={sendCmd} 
              disabled={sending || !cmd.trim()} 
              className="w-9 h-9 rounded-lg bg-white/[0.06] text-gray-400 border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.12] hover:border-white/[0.15] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}

/* ──────── FILES TAB ──────── */
function FilesTab({ serverId }: { serverId: string }) {
  const [dir, setDir] = useState('/');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ name: string; content: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renaming, setRenaming] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try { const res = await serversApi.listFiles(serverId, dir); setFiles(res.data?.data || res.data || []); }
    catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [serverId, dir]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const openFile = async (name: string) => {
    try {
      const path = dir === '/' ? `/${name}` : `${dir}/${name}`;
      const res = await serversApi.readFile(serverId, path);
      setEditing({ name: path, content: typeof res.data === 'string' ? res.data : res.data?.content || JSON.stringify(res.data) });
    } catch { toast.error('Cannot open file'); }
  };

  const saveFile = async () => {
    if (!editing) return;
    setSaving(true);
    try { await serversApi.writeFile(serverId, editing.name, editing.content); toast.success('Saved!'); setEditing(null); }
    catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const deleteFile = async (name: string, isDir: boolean) => {
    if (!confirm(`Delete ${isDir ? 'folder' : 'file'} "${name}"?`)) return;
    try { await serversApi.deleteFiles(serverId, dir, [name]); toast.success('Deleted'); fetchFiles(); }
    catch { toast.error('Delete failed'); }
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    try { await serversApi.createFolder(serverId, dir, newFolder); toast.success('Created'); setNewFolder(''); setShowNewFolder(false); fetchFiles(); }
    catch { toast.error('Failed'); }
  };

  const handleRename = async () => {
    if (!renaming || !newName.trim()) return;
    try { await serversApi.renameFile(serverId, dir, renaming.name, newName); toast.success('Renamed'); setRenaming(null); setNewName(''); fetchFiles(); }
    catch { toast.error('Rename failed'); }
  };

  const navigate = (name: string) => setDir(dir === '/' ? `/${name}` : `${dir}/${name}`);
  const goUp = () => { const parts = dir.split('/').filter(Boolean); parts.pop(); setDir('/' + parts.join('/')); };

  // Detect file language from extension
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      yml: 'yaml', yaml: 'yaml',
      json: 'json', json5: 'json',
      properties: 'properties', cfg: 'properties', conf: 'properties', ini: 'properties',
      toml: 'toml',
      xml: 'xml', html: 'xml', htm: 'xml',
      sh: 'shell', bash: 'shell',
      js: 'js', ts: 'js', mjs: 'js',
      md: 'md', txt: 'plain',
    };
    return map[ext] || 'plain';
  };

  // Simple tokenizer for syntax highlighting
  const highlightLine = (line: string, lang: string): React.ReactNode => {
    if (lang === 'plain') return line;

    if (lang === 'yaml') {
      // Comments
      if (/^\s*#/.test(line)) return <span className="text-gray-500 italic">{line}</span>;
      // Key: value
      const m = line.match(/^(\s*)([\w.\-/]+)(\s*:\s*)(.*)/);
      if (m) {
        const [, indent, key, sep, val] = m;
        return <>{indent}<span className="text-blue-300">{key}</span><span className="text-gray-500">{sep}</span>{highlightValue(val)}</>;
      }
      // List items
      const listM = line.match(/^(\s*-\s+)(.*)/);
      if (listM) return <><span className="text-gray-500">{listM[1]}</span>{highlightValue(listM[2])}</>;
      return line;
    }

    if (lang === 'properties') {
      if (/^\s*[#!]/.test(line)) return <span className="text-gray-500 italic">{line}</span>;
      const m = line.match(/^(\s*)([\w.\-]+)(\s*=\s*)(.*)/);
      if (m) {
        const [, indent, key, sep, val] = m;
        return <>{indent}<span className="text-blue-300">{key}</span><span className="text-gray-500">{sep}</span>{highlightValue(val)}</>;
      }
      return line;
    }

    if (lang === 'json') {
      // Keys in quotes
      const parts: React.ReactNode[] = [];
      let rest = line;
      let idx = 0;
      const rx = /("(?:[^"\\]|\\.)*")(\s*:\s*)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;
      let match;
      let lastIdx = 0;
      while ((match = rx.exec(rest)) !== null) {
        if (match.index > lastIdx) parts.push(rest.slice(lastIdx, match.index));
        if (match[1] && match[2]) {
          // Key
          parts.push(<span key={idx++} className="text-blue-300">{match[1]}</span>);
          parts.push(<span key={idx++} className="text-gray-500">{match[2]}</span>);
        } else if (match[1]) {
          // String value
          parts.push(<span key={idx++} className="text-emerald-400/80">{match[1]}</span>);
        } else if (match[3]) {
          // Boolean/null
          parts.push(<span key={idx++} className="text-amber-400">{match[3]}</span>);
        } else if (match[4]) {
          // Number
          parts.push(<span key={idx++} className="text-amber-400">{match[4]}</span>);
        }
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < rest.length) parts.push(rest.slice(lastIdx));
      return parts.length ? <>{parts}</> : line;
    }

    if (lang === 'toml') {
      if (/^\s*#/.test(line)) return <span className="text-gray-500 italic">{line}</span>;
      if (/^\s*\[/.test(line)) return <span className="text-blue-300 font-medium">{line}</span>;
      const m = line.match(/^(\s*)([\w.\-]+)(\s*=\s*)(.*)/);
      if (m) {
        const [, indent, key, sep, val] = m;
        return <>{indent}<span className="text-blue-300">{key}</span><span className="text-gray-500">{sep}</span>{highlightValue(val)}</>;
      }
      return line;
    }

    if (lang === 'xml') {
      return line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return line;
  };

  const highlightValue = (val: string): React.ReactNode => {
    if (!val) return val;
    if (/^(true|false|yes|no|on|off)$/i.test(val.trim())) return <span className="text-amber-400">{val}</span>;
    if (/^-?\d+\.?\d*$/.test(val.trim())) return <span className="text-amber-400">{val}</span>;
    if (/^["']/.test(val.trim())) return <span className="text-emerald-400/80">{val}</span>;
    return <span className="text-gray-300">{val}</span>;
  };

  if (editing) {
    const lang = getLanguage(editing.name);
    const editorLines = editing.content.split('\n');
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neo-card overflow-hidden !p-0 flex flex-col h-[600px]">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300 font-mono truncate px-2 py-1 rounded bg-black/30 border border-white/[0.05]">{editing.name}</span>
            <span className="text-[10px] text-gray-500 tracking-widest uppercase px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">{lang}</span>
          </div>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditing(null)} className="btn-secondary text-xs px-4 py-2">Discard</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={saveFile} disabled={saving} className="btn-primary flex items-center gap-2 text-xs px-5 py-2">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Committing...' : 'Commit Changes'}
            </motion.button>
          </div>
        </div>
        {/* Syntax-Highlighted Editor */}
        <div className="flex-1 relative overflow-hidden">
          {/* Highlighted overlay */}
          <div className="absolute inset-0 overflow-auto p-0 pointer-events-none z-10 scrollbar-thin scrollbar-thumb-white/[0.1]" id="highlight-scroll">
            <div className="flex font-mono text-[13px] leading-relaxed min-h-full">
              <div className="select-none text-right pr-4 pl-4 pt-4 pb-4 border-r border-white/[0.04] bg-[#07070a]" style={{ minWidth: '3.5rem' }}>
                {editorLines.map((_, i) => (
                  <div key={i} className="text-[11px] text-gray-600/40 tabular-nums leading-relaxed">{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 p-4 whitespace-pre-wrap break-all text-transparent" aria-hidden="true">
                {editorLines.map((line, i) => (
                  <div key={i} className="leading-relaxed">{highlightLine(line, lang) || ' '}</div>
                ))}
              </pre>
            </div>
          </div>
          {/* Actual editable textarea */}
          <div className="absolute inset-0 overflow-auto">
            <div className="flex min-h-full">
              <div style={{ minWidth: '3.5rem' }} className="shrink-0" />
              <textarea 
                value={editing.content} 
                onChange={e => setEditing({ ...editing, content: e.target.value })}
                onScroll={e => {
                  const target = e.target as HTMLTextAreaElement;
                  const overlay = document.getElementById('highlight-scroll');
                  if (overlay) { overlay.scrollTop = target.scrollTop; overlay.scrollLeft = target.scrollLeft; }
                }}
                className="flex-1 bg-transparent p-4 font-mono text-[13px] text-gray-300 outline-none resize-none leading-relaxed scrollbar-thin scrollbar-thumb-white/[0.1] caret-white"
                style={{ caretColor: 'white', color: lang !== 'plain' ? 'transparent' : undefined }}
                spellCheck={false} 
              />
            </div>
          </div>
          {/* Editor background */}
          <div className="absolute inset-0 bg-[#09090b] -z-10" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neo-card overflow-hidden !p-0">
      <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02] flex-wrap shadow-inner">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={goUp} disabled={dir === '/'} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-all hover:bg-white/[0.08]">
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <div className="text-[13px] font-mono text-gray-300 truncate flex-1 px-4 py-2 bg-black/30 rounded-xl border border-white/[0.03] shadow-inner">
          {dir}
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowNewFolder(!showNewFolder)} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:bg-white/[0.1] hover:text-white transition-all">
          <Plus className="w-4 h-4" />
        </motion.button>
        <motion.button whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }} onClick={fetchFiles} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/[0.08]">
          <RefreshCw className="w-4 h-4" />
        </motion.button>
      </div>

      {showNewFolder && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.01]">
          <input type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Enter folder name..."
            className="input-field text-sm flex-1 bg-black/40" autoFocus onKeyDown={e => e.key === 'Enter' && createFolder()} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={createFolder} className="btn-primary text-xs px-6">Create</motion.button>
        </motion.div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="text-sm font-medium tracking-widest text-gray-500">INDEXING DIRECTORY</span>
        </div>
      ) : files.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 opacity-50">
          <FolderOpen className="w-12 h-12 text-gray-500" />
          <div className="text-center text-gray-400 text-sm tracking-wider">DIRECTORY IS EMPTY</div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.02]">
          {[...files].sort((a, b) => (b.is_file === false ? 1 : 0) - (a.is_file === false ? 1 : 0) || a.name.localeCompare(b.name)).map((f: any, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} key={f.name} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group">
              {f.is_file === false || f.mime === 'inode/directory' ? (
                <button onClick={() => navigate(f.name)} className="flex items-center gap-4 flex-1 min-w-0 text-left group-hover:translate-x-1 transition-transform">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-gray-400 border border-white/[0.06]">
                    <Folder className="w-4 h-4 fill-primary/20" />
                  </div>
                  <span className="text-[14px] font-medium text-gray-200 truncate">{f.name}</span>
                </button>
              ) : (
                <button onClick={() => openFile(f.name)} className="flex items-center gap-4 flex-1 min-w-0 text-left group-hover:translate-x-1 transition-transform">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-gray-400 border border-white/[0.05]">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-gray-300 truncate font-medium">{f.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{f.size ? (f.size > 1048576 ? `${(f.size/1048576).toFixed(1)} MB` : `${(f.size/1024).toFixed(0)} KB`) : '0 KB'}</div>
                  </div>
                </button>
              )}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all transform translate-x-4 group-hover:translate-x-0">
                {(f.is_file !== false && f.mime !== 'inode/directory') && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={async () => {
                    try {
                      const path = dir === '/' ? `/${f.name}` : `${dir}/${f.name}`;
                      const r = await serversApi.downloadFile(serverId, path);
                      const url = r.data?.url;
                      if (url) window.open(url, '_blank');
                      else toast.error('No download URL');
                    } catch { toast.error('Download failed'); }
                  }} className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-300 hover:bg-white/[0.08] " title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                {(f.name.endsWith('.tar.gz') || f.name.endsWith('.zip') || f.name.endsWith('.gz') || f.name.endsWith('.rar')) && (
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={async () => {
                    try { await serversApi.decompressFile(serverId, dir, f.name); toast.success('Decompressing...'); setTimeout(fetchFiles, 3000); }
                    catch { toast.error('Decompress failed'); }
                  }} className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]" title="Decompress">
                    <FileArchive className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setRenaming(f); setNewName(f.name); }} className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/[0.1]">
                  <Edit3 className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => deleteFile(f.name, f.is_file === false)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      <AnimatePresence>
        {renaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="neo-card p-6 max-w-sm w-full space-y-5 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Rename Item</h3>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field shadow-inner bg-black/50" autoFocus onKeyDown={e => e.key === 'Enter' && handleRename()} />
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setRenaming(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleRename} className="btn-primary text-sm ">Confirm Rename</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────── DATABASES TAB ──────── */
function DatabasesTab({ serverId }: { serverId: string }) {
  const [dbs, setDbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.databases(serverId); setDbs(r.data?.data || r.data || []); }
    catch { toast.error('Failed to load databases'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try { await serversApi.createDb(serverId, name); toast.success('Database created'); setName(''); fetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const remove = async (dbId: string) => {
    if (!confirm('Delete this database?')) return;
    try { await serversApi.deleteDb(serverId, dbId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const rotatePassword = async (dbId: string) => {
    if (!confirm('Rotate this database password? The old password will stop working immediately.')) return;
    try { await serversApi.rotateDatabasePassword(serverId, dbId); toast.success('Password rotated'); fetch(); }
    catch { toast.error('Failed to rotate password'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="neo-card p-6 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.04] blur-[60px] rounded-full pointer-events-none group-hover:bg-white/[0.08] transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.08] ">
               <Database className="w-5 h-5 text-gray-300" />
             </div>
             <div>
               <h3 className="text-white font-bold text-sm tracking-wide">New Database</h3>
               <p className="text-[11px] text-gray-400">Create a new MySQL instance</p>
             </div>
          </div>
          <div className="flex-1 flex gap-3 w-full">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter database name..." className="input-field flex-1 text-sm bg-black/40 h-11 border-white/5 focus:border-white/[0.15] shadow-inner" onKeyDown={e => e.key === 'Enter' && create()} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={create} disabled={creating || !name.trim()} className="h-11 px-6 rounded-xl font-bold tracking-wide text-xs transition-all flex items-center justify-center gap-2 min-w-[120px] bg-white/[0.04] text-gray-300 border border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.15] hover: disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CREATE DB <Plus className="w-3.5 h-3.5" /></>}
            </motion.button>
          </div>
        </div>
      </div>

      {loading ? (
         <div className="p-16 flex flex-col items-center justify-center space-y-4">
           <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
           <span className="text-sm font-medium tracking-widest text-gray-500">FETCHING DATABASES</span>
         </div>
      ) : dbs.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 opacity-50 neo-card bg-black/20">
          <Database className="w-12 h-12 text-gray-300" />
          <div className="text-center text-gray-400 text-sm tracking-wider">NO DATABASES FOUND</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {dbs.map((db: any, i) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={db.id} className="neo-card p-5 space-y-4 hover:border-white/[0.10] transition-colors group">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-white/[0.04] group-hover:border-white/[0.08] group-hover:text-gray-300 transition-all">
                    <Database className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[15px] tracking-wide block">{db.name || db.database}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mt-0.5">ID: {db.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={() => rotatePassword(db.id)} className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center hover:bg-yellow-500/20 transition-all shadow-[0_0_10px_rgba(234,179,8,0.1)]" title="Rotate Password">
                    <RotateCw className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => remove(db.id)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)]" title="Delete Database">
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
              
              {db.host && (
                <div className="grid grid-cols-2 gap-3 bg-black/30 rounded-xl p-4 border border-white/[0.03] shadow-inner text-[13px]">
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Host Endpoint</span> 
                    <span className="text-gray-200 font-mono truncate">{db.host}:{db.port}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Username</span> 
                    <span className="text-gray-200 font-mono truncate">{db.username}</span>
                  </div>
                  {db.password && (
                    <div className="col-span-2 pt-2 mt-1 border-t border-white/5 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] block mb-1">Password</span>
                        <span className="text-gray-300 font-mono truncate">{showPass[db.id] ? db.password : '••••••••••••••••'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowPass(p => ({ ...p, [db.id]: !p[db.id] }))} className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white" title="Toggle Visibility">
                          {showPass[db.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { navigator.clipboard.writeText(db.password); toast.success('Password COPIED'); }} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-300 hover:bg-white/[0.08] " title="Copy Password">
                          <Copy className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ──────── BACKUPS TAB ──────── */
function BackupsTab({ serverId }: { serverId: string }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.backups(serverId); setBackups(r.data?.data || r.data || []); }
    catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    setCreating(true);
    try { await serversApi.createBackup(serverId); toast.success('Backup started'); setTimeout(fetch, 3000); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const download = async (backupId: string) => {
    try {
      const r = await serversApi.downloadBackup(serverId, backupId);
      const url = r.data?.url || r.data;
      if (url && typeof url === 'string') window.open(url, '_blank');
      else toast.error('No download URL');
    } catch { toast.error('Download failed'); }
  };

  const remove = async (backupId: string) => {
    if (!confirm('Delete this backup?')) return;
    try { await serversApi.deleteBackup(serverId, backupId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const restore = async (backupId: string) => {
    if (!confirm('Restore this backup? This will overwrite current server files.')) return;
    try { await serversApi.restoreBackup(serverId, backupId); toast.success('Restore started'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Restore failed'); }
  };

  const toggleLock = async (backupId: string) => {
    try { await serversApi.toggleBackupLock(serverId, backupId); toast.success('Lock toggled'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={create} disabled={creating} className="btn-primary text-sm flex items-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Backup
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div> :
        backups.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No backups</div> :
        <div className="grid gap-3">
          {backups.map((b: any) => (
            <div key={b.uuid || b.id} className="neo-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-white text-sm">{b.name || 'Backup'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.bytes ? (b.bytes > 1048576 ? `${(b.bytes/1048576).toFixed(1)} MB` : `${(b.bytes/1024).toFixed(0)} KB`) : ''}
                  {b.created_at && ` · ${new Date(b.created_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.is_successful !== false && (
                  <>
                    <button onClick={() => restore(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-emerald-400" title="Restore"><RotateCw className="w-4 h-4" /></button>
                    <button onClick={() => download(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-300" title="Download"><Download className="w-4 h-4" /></button>
                  </>
                )}
                <button onClick={() => toggleLock(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-yellow-400" title={b.is_locked ? 'Unlock' : 'Lock'}>
                  {b.is_locked ? <Lock className="w-4 h-4 text-yellow-400" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ──────── NETWORK TAB ──────── */
function NetworkTab({ serverId }: { serverId: string }) {
  const [network, setNetwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.network(serverId).then(r => setNetwork(r.data)).catch(() => toast.error('Failed'))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <div className="flex flex-col items-center justify-center py-16 space-y-4"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /><span className="text-sm font-medium tracking-widest text-gray-300/50">LOADING NETWORK</span></div>;

  const allocs = network?.data || network?.allocations || (Array.isArray(network) ? network : [network].filter(Boolean));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Network Overview Header */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/[0.04] blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/[0.04] blur-[60px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="net-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="currentColor" className="text-gray-300" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#net-dots)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] flex items-center justify-center border border-white/[0.10] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <Globe className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-wide">Network Allocations</h3>
              <p className="text-xs text-gray-400 mt-1">Port bindings and IP assignments for this instance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-xs text-gray-300 font-medium tracking-wider">{allocs.length} ALLOCATION{allocs.length !== 1 ? 'S' : ''}</span>
          </div>
        </div>
      </div>

      {allocs.length === 0 ? (
        <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
            <Globe className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-sm text-gray-400 tracking-widest uppercase font-semibold">NO ALLOCATIONS FOUND</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocs.map((a: any, i: number) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="neo-card p-5 flex items-center justify-between group hover:border-white/[0.10] transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${a.is_default ? 'bg-white/[0.06] border-white/[0.10] shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-white/[0.04] border-white/[0.08] group-hover:bg-white/[0.04] group-hover:border-white/[0.08]'}`}>
                  <Globe className={`w-4 h-4 transition-colors ${a.is_default ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-white text-[15px] font-bold tracking-wide">{a.ip || a.alias || '0.0.0.0'}:{a.port}</p>
                    {a.is_default && <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase bg-white/[0.06] text-gray-300 border border-white/[0.10]">PRIMARY</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 font-mono tracking-wide">TCP/UDP • {a.notes || 'Game Port'}</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.9 }} 
                onClick={() => { navigator.clipboard.writeText(`${a.ip || a.alias}:${a.port}`); toast.success('Address copied to clipboard'); }}
                className="relative z-10 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.10] transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                title="Copy Address"
              >
                <Copy className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ──────── STARTUP TAB ──────── */
function StartupTab({ serverId }: { serverId: string }) {
  const [vars, setVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [changed, setChanged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    serversApi.startup(serverId).then(r => {
      const data = r.data?.data || r.data || [];
      setVars(data);
      const v: Record<string, string> = {};
      data.forEach((vr: any) => { v[vr.env_variable] = vr.server_value ?? vr.default_value ?? ''; });
      setValues(v);
    }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, [serverId]);

  const save = async (key: string) => {
    setSaving(key);
    try { await serversApi.updateStartup(serverId, key, values[key]); toast.success('Variable updated'); setChanged(p => ({ ...p, [key]: false })); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-16 space-y-4"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /><span className="text-sm font-medium tracking-widest text-gray-300/50">LOADING VARIABLES</span></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Startup Header */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="startup-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber-500" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#startup-grid)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-wide">Startup Configuration</h3>
              <p className="text-xs text-gray-400 mt-1">Environment variables and JVM flags that control server boot behavior</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 text-xs text-amber-300 font-medium tracking-wider">
            {vars.length} VARIABLE{vars.length !== 1 ? 'S' : ''}
          </div>
        </div>
      </div>

      {vars.length === 0 ? (
        <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
          <Settings className="w-10 h-10 text-gray-500" />
          <span className="text-sm text-gray-400 tracking-widest uppercase font-semibold">NO STARTUP VARIABLES</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {vars.map((v: any, i: number) => (
            <motion.div 
              key={v.env_variable} 
              initial={{ opacity: 0, x: -15 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="neo-card p-5 md:p-6 space-y-4 group hover:border-amber-500/20 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <span className="text-amber-400 text-[10px] font-bold">ENV</span>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-white tracking-wide block">{v.name}</label>
                      <span className="text-[10px] text-amber-400/60 font-mono tracking-widest block mt-0.5">{v.env_variable}</span>
                    </div>
                  </div>
                  {v.rules && <span className="text-[10px] text-gray-600 font-mono bg-black/30 px-2 py-1 rounded-md border border-white/[0.03] hidden sm:block">{v.rules}</span>}
                </div>
                {v.description && <p className="text-xs text-gray-400 leading-relaxed mb-3">{v.description}</p>}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={values[v.env_variable] || ''} 
                      onChange={e => { setValues(p => ({ ...p, [v.env_variable]: e.target.value })); setChanged(p => ({ ...p, [v.env_variable]: true })); }}
                      className="input-field text-sm flex-1 w-full font-mono bg-black/40 border-white/[0.06] focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner h-11 px-4 pr-20" 
                      placeholder={v.default_value || 'Enter value...'} 
                    />
                    {v.default_value && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-mono">default: {v.default_value.substring(0, 12)}{v.default_value.length > 12 ? '...' : ''}</span>
                    )}
                  </div>
                  <motion.button 
                    whileHover={{ scale: changed[v.env_variable] ? 1.05 : 1 }} 
                    whileTap={{ scale: changed[v.env_variable] ? 0.95 : 1 }} 
                    onClick={() => save(v.env_variable)} 
                    disabled={saving === v.env_variable || !changed[v.env_variable]} 
                    className={`h-11 px-6 rounded-xl font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2 min-w-[100px] border ${changed[v.env_variable] ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-white/[0.03] text-gray-500 border-white/[0.05] cursor-default'}`}
                  >
                    {saving === v.env_variable ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> SAVE</>}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ──────── PLUGINS TAB ──────── */
function PluginsTab({ serverUuid, profile }: { serverUuid: string; profile: any }) {
  const projectType = profile?.type === 'mod' ? 'mod' : 'plugin';
  const noun = projectType === 'mod' ? 'Mods' : 'Plugins';
  const spigotAllowed = profile?.allowedSources?.includes('spiget');

  // View & source state
  const [activeView, setActiveView] = useState<'browse' | 'installed'>('browse');
  const [source, setSource] = useState<'modrinth' | 'spigot'>('modrinth');

  // Browse sub-mode: 'search' | 'trending' | 'updated' | 'new' | 'downloads'
  const [browseMode, setBrowseMode] = useState<string>('trending');

  // Search & browse state
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Modrinth sort mapping
  const modrinthSortMap: Record<string, string> = {
    trending: 'relevance',
    downloads: 'downloads',
    updated: 'updated',
    new: 'newest',
    follows: 'follows',
  };

  // SpigotMC sort mapping
  const spigetSortMap: Record<string, string> = {
    trending: '-downloads',
    downloads: '-downloads',
    updated: '-updateDate',
    new: '-releaseDate',
    rating: '-rating.average',
  };

  // Filters
  const [selectedLoader, setSelectedLoader] = useState<string>('');
  const [selectedGameVersion, setSelectedGameVersion] = useState<string>(profile?.minecraftVersion || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Tags from APIs
  const [modrinthTags, setModrinthTags] = useState<{ categories: any[]; loaders: any[]; gameVersions: any[] } | null>(null);
  const [spigetCategories, setSpigetCategories] = useState<any[]>([]);

  // Installed & updates
  const [installed, setInstalled] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);

  // Version picker modal (Modrinth)
  const [versionPicker, setVersionPicker] = useState<{ projectId: string; projectTitle: string; versions: any[]; iconUrl?: string; source: 'modrinth' | 'spigot' } | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Action states
  const [installing, setInstalling] = useState<string | null>(null);
  const [updatingFile, setUpdatingFile] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);

  // Computed values
  const updatesByFile = useMemo(() => {
    const map = new Map<string, any>();
    updates.forEach((u: any) => { const key = String(u.fileName || ''); if (key) map.set(key, u); });
    return map;
  }, [updates]);

  const installedProjectIds = useMemo(
    () => new Set(installed.map((i: any) => i.projectId).filter(Boolean).map(String)),
    [installed],
  );
  const installedResourceIds = useMemo(
    () => new Set(installed.map((i: any) => i.resourceId).filter((v: any) => v != null).map(String)),
    [installed],
  );

  // Filtered Modrinth tags based on projectType
  const filteredCategories = useMemo(() => {
    if (!modrinthTags?.categories) return [];
    return modrinthTags.categories.filter((c: any) => c.project_type === projectType && c.header === 'categories');
  }, [modrinthTags, projectType]);

  const filteredLoaders = useMemo(() => {
    if (!modrinthTags?.loaders) return [];
    return modrinthTags.loaders.filter((l: any) => l.supported_project_types?.includes(projectType));
  }, [modrinthTags, projectType]);

  const filteredGameVersions = useMemo(() => {
    if (!modrinthTags?.gameVersions) return [];
    return modrinthTags.gameVersions.filter((v: any) => v.version_type === 'release');
  }, [modrinthTags]);

  // ---------- Data loading ----------
  const refreshInstalled = useCallback(async () => {
    const [inst, upd] = await Promise.all([
      pluginsApi.installed(serverUuid).catch(() => ({ data: [] })),
      pluginsApi.checkUpdates(serverUuid).catch(() => ({ data: [] })),
    ]);
    setInstalled(Array.isArray(inst.data) ? inst.data : (inst.data?.data || []));
    setUpdates(Array.isArray(upd.data) ? upd.data : (upd.data?.data || []));
  }, [serverUuid]);

  useEffect(() => {
    setLoadingInstalled(true);
    refreshInstalled().finally(() => setLoadingInstalled(false));
  }, [refreshInstalled]);

  useEffect(() => {
    if (profile?.minecraftVersion) setSelectedGameVersion(profile.minecraftVersion);
  }, [profile?.minecraftVersion]);

  // Load tags when source changes
  useEffect(() => {
    if (source === 'modrinth' && !modrinthTags) {
      pluginsApi.modrinthTags()
        .then((r) => setModrinthTags(r.data || { categories: [], loaders: [], gameVersions: [] }))
        .catch(() => setModrinthTags({ categories: [], loaders: [], gameVersions: [] }));
    }
    if (source === 'spigot' && spigetCategories.length === 0) {
      pluginsApi.spigetCategories()
        .then((r) => setSpigetCategories(Array.isArray(r.data) ? r.data : []))
        .catch(() => setSpigetCategories([]));
    }
  }, [source, modrinthTags, spigetCategories.length]);

  // Reset page & category on source change
  useEffect(() => {
    setSelectedCategory('');
    setCurrentPage(0);
    setResults([]);
    // Reset browseMode to 'trending' on source switch to avoid SpigotMC-only
    // modes (e.g. 'rating') being used in Modrinth searches
    setBrowseMode('trending');
  }, [source]);

  // ---------- Search ----------
  const search = useCallback(async (page = 0) => {
    setSearching(true);
    try {
      if (source === 'modrinth') {
        const query = searchQ.trim() || '';
        const loaders = selectedLoader ? [selectedLoader] : (profile?.loaders?.length ? profile.loaders : undefined);
        const gameVersions = selectedGameVersion ? [selectedGameVersion] : (profile?.minecraftVersion ? [profile.minecraftVersion] : undefined);
        const categories = selectedCategory ? [selectedCategory] : undefined;
        // Always use the selected browse mode sort index.
        // When searching, Modrinth uses the query for text matching
        // AND sorts by the chosen index — not forced to 'relevance'.
        const sortIndex = modrinthSortMap[browseMode] || 'relevance';

        const r = await pluginsApi.modrinthSearch(query, {
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE,
          projectType,
          loaders,
          categories,
          gameVersions,
          index: sortIndex,
        });
        const data = r.data || {};
        setResults(Array.isArray(data.hits) ? data.hits : []);
        setTotalHits(data.total_hits || 0);
      } else {
        // SpigotMC
        const categoryId = selectedCategory ? Number(selectedCategory) : undefined;
        const q = searchQ.trim();
        let items: any[];
        const isSearchMode = q.length > 0;

        if (isSearchMode) {
          const sort = spigetSortMap[browseMode] || '-downloads';
          const r = await pluginsApi.spigetSearch(q, page + 1, categoryId, ITEMS_PER_PAGE, sort);
          items = Array.isArray(r.data) ? r.data : [];
        } else if (browseMode === 'new') {
          const r = await pluginsApi.spigetNew(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        } else if (browseMode === 'updated') {
          const r = await pluginsApi.spigetUpdated(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        } else {
          // trending / downloads = popular
          const r = await pluginsApi.spigetPopular(page + 1, ITEMS_PER_PAGE);
          items = Array.isArray(r.data) ? r.data : [];
        }
        setResults(items);
        setTotalHits(items.length >= ITEMS_PER_PAGE ? (page + 2) * ITEMS_PER_PAGE : (page * ITEMS_PER_PAGE) + items.length);
      }
      setCurrentPage(page);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, [source, searchQ, selectedLoader, selectedGameVersion, selectedCategory, browseMode, profile, projectType]);

  // Auto-search on filter/sort/browseMode change
  useEffect(() => {
    search(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, selectedCategory, selectedLoader, selectedGameVersion, browseMode]);

  // ---------- Version picker (Modrinth) ----------
  const openModrinthVersionPicker = async (item: any) => {
    const projectId = String(item.project_id || item.slug || '');
    if (!projectId) { toast.error('Invalid project'); return; }
    setLoadingVersions(true);
    try {
      const loaders = selectedLoader ? [selectedLoader] : (profile?.loaders || undefined);
      const gameVersions = selectedGameVersion ? [selectedGameVersion] : (profile?.minecraftVersion ? [profile.minecraftVersion] : undefined);
      const r = await pluginsApi.modrinthVersions(projectId, loaders, gameVersions);
      const versions = Array.isArray(r.data) ? r.data : [];
      if (versions.length === 0) {
        toast.error(`No compatible versions found for ${profile?.minecraftVersion || 'this server'}`);
        return;
      }
      setVersionPicker({
        projectId,
        projectTitle: item.title || item.name || projectId,
        versions,
        iconUrl: item.icon_url,
        source: 'modrinth',
      });
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  // ---------- Version picker (Spiget) ----------
  const openSpigetVersionPicker = async (item: any) => {
    const resourceId = Number(item.id);
    if (!resourceId) { toast.error('Invalid resource'); return; }
    setLoadingVersions(true);
    try {
      const r = await pluginsApi.spigetVersions(resourceId);
      const versions = Array.isArray(r.data) ? r.data : [];
      if (versions.length === 0) {
        // Fallback: install latest directly
        installSpiget(item);
        return;
      }
      const iconUrl = item.icon?.data ? `data:image/jpeg;base64,${item.icon.data}` : (item.icon?.url ? `https://api.spiget.org/v2/${item.icon.url}` : undefined);
      setVersionPicker({
        projectId: String(resourceId),
        projectTitle: item.name || `Resource #${resourceId}`,
        versions: versions.map((v: any) => ({
          ...v,
          _resourceId: resourceId,
          _resourceName: item.name,
        })),
        iconUrl,
        source: 'spigot',
      });
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const installModrinthVersion = async (projectId: string, versionId: string, versionName: string) => {
    setInstalling(versionId);
    try {
      await pluginsApi.modrinthInstall(serverUuid, projectId, versionId);
      toast.success(`Installed ${versionName || 'plugin'}`);
      setVersionPicker(null);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  const installSpigetVersion = async (resourceId: number, versionId: number, versionName: string) => {
    setInstalling(String(versionId));
    try {
      await pluginsApi.spigetInstallVersion(serverUuid, resourceId, versionId);
      toast.success(`Installed version ${versionName || versionId}`);
      setVersionPicker(null);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // ---------- Quick install (SpigotMC - always latest) ----------
  const installSpiget = async (item: any) => {
    const key = String(item.id);
    setInstalling(key);
    try {
      await pluginsApi.spigetInstall(serverUuid, Number(item.id));
      toast.success(`${item.name || 'Plugin'} installed`);
      await refreshInstalled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Install failed');
    } finally {
      setInstalling(null);
    }
  };

  // ---------- Remove ----------
  const remove = async (fileName: string) => {
    if (!confirm(`Remove ${fileName}?`)) return;
    try {
      await pluginsApi.remove(serverUuid, fileName);
      toast.success('Removed');
      await refreshInstalled();
    } catch { toast.error('Failed to remove'); }
  };

  // ---------- Updates ----------
  const updateOne = async (fileName: string) => {
    setUpdatingFile(fileName);
    try {
      await pluginsApi.updateOne(serverUuid, fileName);
      toast.success('Updated');
      await refreshInstalled();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setUpdatingFile(null); }
  };

  const updateAll = async () => {
    setUpdatingAll(true);
    try {
      const r = await pluginsApi.updateAll(serverUuid);
      const updated = r?.data?.updated ?? 0;
      const failed = r?.data?.failed ?? 0;
      if (updated > 0) toast.success(`Updated ${updated} ${noun.toLowerCase()}`);
      if (updated === 0 && failed === 0) toast('Everything is up to date');
      if (failed > 0) toast.error(`${failed} updates failed`);
      await refreshInstalled();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setUpdatingAll(false); }
  };

  // ---------- Helpers ----------
  const isInstalledResult = (item: any): boolean => {
    if (source === 'modrinth') {
      const pid = String(item.project_id || item.slug || '');
      return !!pid && installedProjectIds.has(pid);
    }
    return !!item.id && installedResourceIds.has(String(item.id));
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const formatDate = (d: string | number) => {
    const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeDate = (d: string | number) => {
    const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE);
  const hasUpdates = updates.length > 0;

  if (!profile?.isMinecraft) {
    return <div className="neo-card p-8 text-center text-gray-500 text-sm">{noun} management is only available for Minecraft servers.</div>;
  }

  // Browse mode labels for each source
  const modrinthBrowseModes = [
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'downloads', label: 'Most Downloaded', icon: '📥' },
    { id: 'updated', label: 'Recently Updated', icon: '🔄' },
    { id: 'new', label: 'Newest', icon: '✨' },
    { id: 'follows', label: 'Most Followed', icon: '❤️' },
  ];

  const spigetBrowseModes = [
    { id: 'trending', label: 'Popular', icon: '🔥' },
    { id: 'downloads', label: 'Most Downloaded', icon: '📥' },
    { id: 'updated', label: 'Recently Updated', icon: '🔄' },
    { id: 'new', label: 'Newest', icon: '✨' },
    { id: 'rating', label: 'Top Rated', icon: '⭐' },
  ];

  const activeBrowseModes = source === 'modrinth' ? modrinthBrowseModes : spigetBrowseModes;
  const accentColor = projectType === 'mod' ? 'purple' : 'cyan';
  const accentHex = projectType === 'mod' ? '#a1a1aa' : '#a1a1aa';
  const accentRgb = projectType === 'mod' ? '168,85,247' : '0,212,255';

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* ===== Header Card ===== */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 blur-[80px] rounded-full pointer-events-none" style={{ background: `rgba(${accentRgb},0.1)` }} />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-emerald-500/8 blur-[60px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="plugins-circuit" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0v10M0 20h10M20 30v10M30 20h10M20 10a3 3 0 110 6 3 3 0 010-6z" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ color: accentHex }} /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#plugins-circuit)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center border" style={{ background: `rgba(${accentRgb},0.15)`, borderColor: `rgba(${accentRgb},0.3)`, boxShadow: `0 0 20px rgba(${accentRgb},0.2)` }}>
              <Puzzle className="w-5 h-5" style={{ color: accentHex }} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-display font-bold text-white tracking-wide">{noun} Manager</h3>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider border" style={{
                  background: `rgba(${accentRgb},0.08)`,
                  color: accentHex,
                  borderColor: `rgba(${accentRgb},0.25)`,
                }}>{projectType === 'mod' ? 'MODS' : 'PLUGINS'}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {profile?.software || 'Unknown'}
                </span>
                {profile?.minecraftVersion && (
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-gray-400 font-mono">MC {profile.minecraftVersion}</span>
                )}
                {profile?.loaders?.[0] && (
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/[0.06] text-gray-400">{profile.loaders[0]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasUpdates && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={updateAll} disabled={updatingAll}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-yellow-400 bg-yellow-500/[0.06] border border-yellow-500/20 hover:bg-yellow-500/15 hover:border-yellow-500/30 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                {updatingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Update All ({updates.length})
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => refreshInstalled()}
              className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/15 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ===== View Tabs: Browse / Installed ===== */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
        {(['browse', 'installed'] as const).map(v => (
          <motion.button key={v} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setActiveView(v)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold tracking-wider transition-all ${activeView === v ? 'text-white bg-white/[0.06] border border-white/[0.08] shadow-lg' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
            {v === 'browse' ? (
              <><Search className="w-4 h-4" /> BROWSE {noun.toUpperCase()}</>
            ) : (
              <>
                <Puzzle className="w-4 h-4" /> INSTALLED ({installed.length})
                {hasUpdates && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/20 animate-pulse">{updates.length}</span>
                )}
              </>
            )}
          </motion.button>
        ))}
      </div>

      {/* ======== BROWSE VIEW ======== */}
      {activeView === 'browse' && (
        <div className="space-y-4">
          {/* Source selector row */}
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setResults([]); setTotalHits(0); setCurrentPage(0); setSource('modrinth'); }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all border ${source === 'modrinth' ? 'text-[#1bd96a] bg-[#1bd96a]/[0.06] border-[#1bd96a]/20 shadow-[0_0_25px_rgba(27,217,106,0.08)]' : 'text-gray-400 hover:text-white bg-white/[0.02] border-white/[0.04] hover:border-white/10'}`}>
              <svg width="16" height="16" viewBox="0 0 512 514" fill="currentColor"><path d="M503.16 323.56C514.55 281.47 515.32 237.22 505.23 194.56C495.13 151.9 474.51 112.73 445.05 80.81L404.36 114.14C427.9 139.84 443.95 171.42 451.35 205.77C458.75 240.13 457.18 275.75 446.84 309.33L503.16 323.56Z"/><path d="M373.46 369.03C346.07 391.08 312.18 404.53 276.67 407.85L282.86 466.29C326.88 462.08 368.67 445.32 402.73 418.18L373.46 369.03Z"/><path d="M195.98 407.85C160.46 404.53 128.56 391.08 101.18 369.03L71.9 418.18C105.97 445.32 147.76 462.08 191.78 466.29L195.98 407.85Z"/><path d="M41.34 309.33C31 275.75 29.43 240.13 36.83 205.77C44.23 171.42 60.28 139.84 83.82 114.14L43.13 80.81C13.67 112.73 -6.95 151.9 -17.05 194.56C-27.14 237.22 -26.37 281.47 -14.98 323.56L41.34 309.33Z"/><path d="M255.74 0L175.53 134.69L255.74 134.69L335.96 134.69L255.74 0Z"/><path d="M255.74 513.84L335.96 379.15L255.74 379.15L175.53 379.15L255.74 513.84Z"/></svg>
              Modrinth
            </motion.button>
            <motion.button whileHover={{ scale: spigotAllowed ? 1.03 : 1 }} whileTap={{ scale: spigotAllowed ? 0.97 : 1 }}
              onClick={() => { if (!spigotAllowed) return; setResults([]); setTotalHits(0); setCurrentPage(0); setSource('spigot'); }} disabled={!spigotAllowed}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all border disabled:opacity-30 disabled:cursor-not-allowed ${source === 'spigot' ? 'text-[#ee8a18] bg-[#ee8a18]/[0.06] border-[#ee8a18]/20 shadow-[0_0_25px_rgba(238,138,24,0.08)]' : 'text-gray-400 hover:text-white bg-white/[0.02] border-white/[0.04] hover:border-white/10'}`}>
              🔧 SpigotMC
            </motion.button>
            {!spigotAllowed && <span className="text-[10px] text-gray-600 ml-1">SpigotMC unavailable for {projectType === 'mod' ? 'mod' : 'proxy'} servers</span>}
          </div>

          {/* Browse mode tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-1 rounded-xl bg-white/[0.01] border border-white/[0.03]">
            {activeBrowseModes.map(mode => (
              <button key={mode.id} onClick={() => { setBrowseMode(mode.id); setSearchQ(''); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all tracking-wide ${browseMode === mode.id && !searchQ ? 'bg-white/[0.06] text-white border border-white/[0.08] shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'}`}>
                <span className="text-sm">{mode.icon}</span> {mode.label}
              </button>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="neo-card p-4 space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  placeholder={`Search ${noun.toLowerCase()} on ${source === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...`}
                  className="input-field pl-11 text-sm w-full bg-black/40 border-white/[0.06] focus:border-white/[0.15] focus:ring-1 focus:ring-primary/30 transition-all h-11"
                  onKeyDown={(e) => e.key === 'Enter' && search(0)} />
                {searchQ && (
                  <button onClick={() => { setSearchQ(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => search(0)} disabled={searching}
                className="h-11 px-6 rounded-xl font-bold tracking-wider text-xs transition-all flex items-center gap-2 border bg-white/[0.04] text-gray-300 border-white/[0.10] hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} SEARCH
              </motion.button>
            </div>

            {/* Filter row */}
            <div className="relative z-10 flex gap-3 flex-wrap items-center">
              {source === 'modrinth' ? (
                <>
                  <select value={selectedLoader} onChange={(e) => setSelectedLoader(e.target.value)}
                    className="input-field text-xs min-w-[120px] h-9 bg-black/40 border-white/[0.06]" style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#0a0a0f', color: '#e5e7eb' }}>All Loaders</option>
                    {filteredLoaders.map((l: any) => (
                      <option key={l.name} value={l.name} style={{ background: '#0a0a0f', color: '#e5e7eb' }}>{l.name}</option>
                    ))}
                  </select>
                  <select value={selectedGameVersion} onChange={(e) => setSelectedGameVersion(e.target.value)}
                    className="input-field text-xs min-w-[110px] h-9 bg-black/40 border-white/[0.06]" style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#0a0a0f', color: '#e5e7eb' }}>All MC Versions</option>
                    {filteredGameVersions.slice(0, 100).map((v: any) => (
                      <option key={v.version} value={v.version} style={{ background: '#0a0a0f', color: '#e5e7eb' }}>{v.version}</option>
                    ))}
                  </select>
                  <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input-field text-xs min-w-[130px] h-9 bg-black/40 border-white/[0.06]" style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                    <option value="" style={{ background: '#0a0a0f', color: '#e5e7eb' }}>All Categories</option>
                    {filteredCategories.map((c: any) => (
                      <option key={c.name} value={c.name} style={{ background: '#0a0a0f', color: '#e5e7eb' }}>{c.name}</option>
                    ))}
                  </select>
                </>
              ) : (
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field text-xs min-w-[130px] h-9 bg-black/40 border-white/[0.06]" style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}>
                  <option value="" style={{ background: '#0a0a0f', color: '#e5e7eb' }}>All Categories</option>
                  {spigetCategories.map((c: any) => (
                    <option key={c.id} value={String(c.id)} style={{ background: '#0a0a0f', color: '#e5e7eb' }}>{c.name}</option>
                  ))}
                </select>
              )}
              {(selectedLoader || selectedGameVersion || selectedCategory) && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelectedLoader(''); setSelectedGameVersion(profile?.minecraftVersion || ''); setSelectedCategory(''); }}
                  className="text-[10px] text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/5 transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/15">
                  <X className="w-3 h-3" /> Clear Filters
                </motion.button>
              )}
            </div>
          </div>

          {/* Results info bar */}
          {!searching && results.length > 0 && (
            <div className="flex items-center justify-between px-2">
              <p className="text-[11px] text-gray-500 font-medium">
                {source === 'modrinth' ? `${totalHits.toLocaleString()} results` : `Showing ${results.length} ${noun.toLowerCase()}`}
                {currentPage > 0 ? ` \u00b7 Page ${currentPage + 1}` : ''}
                {selectedGameVersion && ` \u00b7 MC ${selectedGameVersion}`}
              </p>
              {source === 'modrinth' && selectedGameVersion && (
                <span className="text-[10px] text-emerald-400/60 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                  <CheckCircle className="w-3 h-3" /> Filtered for your server
                </span>
              )}
            </div>
          )}

          {/* Results grid */}
          {searching && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl border flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.06)`, borderColor: `rgba(${accentRgb},0.15)` }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentHex }} />
              </div>
              <span className="text-xs text-gray-500 tracking-widest uppercase font-semibold">Searching {source === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="neo-card p-16 text-center bg-black/20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Puzzle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 font-bold">No {noun.toLowerCase()} found</p>
              <p className="text-xs text-gray-600 mt-2">Try different search terms or adjust your filters</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((item: any, idx: number) => {
                const key = String(item.project_id || item.slug || item.id);
                const isInstalled = isInstalledResult(item);
                const iconUrl = source === 'modrinth'
                  ? item.icon_url
                  : (item.icon?.data ? `data:image/jpeg;base64,${item.icon.data}` : (item.icon?.url ? `https://api.spiget.org/v2/${item.icon.url}` : null));
                const downloads = item.downloads || 0;
                const rawAuthor = source === 'modrinth' ? item.author : undefined;
                const author = typeof rawAuthor === 'string' ? rawAuthor : (rawAuthor?.name ?? undefined);
                const testedVersions = Array.isArray(item.testedVersions) ? item.testedVersions : [];
                const displayCategories = source === 'modrinth' ? (item.display_categories || item.categories || []) : [];
                const isExternal = source === 'spigot' && item.external;
                const isPremium = source === 'spigot' && item.premium;

                // Compatibility indicator for Spiget
                const mcVersion = profile?.minecraftVersion;
                const isCompatible = source === 'spigot' && mcVersion && testedVersions.length > 0
                  ? testedVersions.some((v: string) => v === mcVersion || mcVersion.startsWith(v) || v.startsWith(mcVersion))
                  : null;

                return (
                  <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02, duration: 0.3 }}
                    className={`neo-card p-4 md:p-5 flex items-start gap-4 group transition-all duration-500 hover:border-white/10 relative overflow-hidden ${isInstalled ? 'opacity-50' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Icon */}
                    {iconUrl
                      ? <img src={iconUrl} alt="" className="w-14 h-14 rounded-xl object-cover bg-white/5 shrink-0 shadow-lg border border-white/[0.06] relative z-10" />
                      : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center shrink-0 border border-white/[0.06] relative z-10"><Puzzle className="w-6 h-6 text-gray-600" /></div>}

                    {/* Info */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{item.title || item.name}</p>
                        {author && <span className="text-[11px] text-gray-500">by <span className="text-gray-400">{author}</span></span>}
                        {isInstalled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">Installed</span>}
                        {isPremium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">Premium</span>}
                        {isExternal && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">External</span>}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{item.description || item.tag || 'No description available'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-2.5 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"><Download className="w-3 h-3" />{formatNumber(downloads)}</span>
                        {source === 'modrinth' && item.date_modified && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeDate(item.date_modified)}</span>
                        )}
                        {source === 'modrinth' && item.follows !== undefined && (
                          <span className="flex items-center gap-1">❤️ {formatNumber(item.follows)}</span>
                        )}
                        {source === 'spigot' && item.rating?.average > 0 && (
                          <span className="flex items-center gap-1">⭐ {Number(item.rating.average).toFixed(1)} ({item.rating.count})</span>
                        )}
                        {source === 'spigot' && testedVersions.length > 0 && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${isCompatible === true ? 'text-emerald-400 bg-emerald-500/[0.04] border-emerald-500/10' : isCompatible === false ? 'text-orange-400 bg-orange-500/[0.04] border-orange-500/10' : 'bg-white/[0.02] border-white/[0.03] text-gray-600'}`}>
                            {isCompatible === true ? <CheckCircle className="w-3 h-3" /> : isCompatible === false ? <AlertTriangle className="w-3 h-3" /> : null}
                            MC {testedVersions.slice(0, 3).join(', ')}{testedVersions.length > 3 ? '\u2026' : ''}
                          </span>
                        )}
                        {displayCategories.slice(0, 3).map((c: string) => (
                          <span key={c} className="px-2 py-0.5 rounded-lg bg-white/[0.03] text-gray-500 text-[10px] border border-white/[0.04]">{c}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-center relative z-10">
                      {source === 'modrinth' && (item.slug || item.project_id) && (
                        <a href={`https://modrinth.com/${projectType}/${item.slug || item.project_id}`} target="_blank" rel="noreferrer"
                          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/15 transition-all" title="View on Modrinth">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {source === 'spigot' && item.id && (
                        <a href={`https://www.spigotmc.org/resources/${item.id}/`} target="_blank" rel="noreferrer"
                          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/15 transition-all" title="View on SpigotMC">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {loadingInstalled ? (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 bg-white/[0.03] border border-white/[0.06]">
                          <Loader2 className="w-3 h-3 animate-spin" /> Checking
                        </span>
                      ) : isInstalled ? (
                        <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" /> Installed
                        </span>
                      ) : source === 'modrinth' ? (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => openModrinthVersionPicker(item)}
                          disabled={installing === key || loadingVersions}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40" style={{ background: `rgba(${accentRgb},0.08)`, color: accentHex, borderColor: `rgba(${accentRgb},0.25)` }}>
                          {loadingVersions && installing === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Install
                        </motion.button>
                      ) : (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => openSpigetVersionPicker(item)}
                          disabled={installing === key || isPremium || isExternal}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-[#ee8a18]/[0.08] text-[#ee8a18] border border-[#ee8a18]/25 disabled:opacity-40"
                          title={isPremium ? 'Premium resource' : isExternal ? 'External resource' : 'Select version'}>
                          {installing === key ? <Loader2 className="w-3 h-3 animate-spin" /> :
                            isPremium ? 'Premium' : isExternal ? 'External' : <><Download className="w-3.5 h-3.5" /> Install</>}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => search(currentPage - 1)} disabled={currentPage === 0 || searching}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:text-white hover:border-white/15 transition-all disabled:opacity-30">
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </motion.button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i;
                  else if (currentPage < 3) page = i;
                  else if (currentPage > totalPages - 3) page = totalPages - 5 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <motion.button key={page} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => search(page)} disabled={searching}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all border ${page === currentPage ? 'text-white border-white/[0.10] bg-white/[0.04] ' : 'text-gray-500 hover:text-white hover:bg-white/[0.04] border-transparent hover:border-white/10'}`}>
                      {page + 1}
                    </motion.button>
                  );
                })}
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => search(currentPage + 1)} disabled={currentPage >= totalPages - 1 || searching}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:text-white hover:border-white/15 transition-all disabled:opacity-30">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ======== INSTALLED VIEW ======== */}
      {activeView === 'installed' && (
        <div className="space-y-4">
          {/* Update All bar */}
          {hasUpdates && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="neo-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden border border-yellow-500/10">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                  <RefreshCw className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <span className="text-sm text-yellow-300 font-bold">{updates.length} update{updates.length > 1 ? 's' : ''} available</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Update everything at once to stay current</p>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={updateAll} disabled={updatingAll}
                className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-yellow-400 bg-yellow-500/[0.08] border border-yellow-500/25 hover:bg-yellow-500/15 hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                {updatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                UPDATE ALL
              </motion.button>
            </motion.div>
          )}

          {loadingInstalled ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl border flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.06)`, borderColor: `rgba(${accentRgb},0.15)` }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentHex }} />
              </div>
              <span className="text-xs text-gray-500 tracking-widest uppercase font-semibold">Loading installed {noun.toLowerCase()}...</span>
            </div>
          ) : installed.length === 0 ? (
            <div className="neo-card p-16 text-center bg-black/20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Puzzle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-sm text-gray-400 font-bold">No {noun.toLowerCase()} installed yet</p>
              <p className="text-xs text-gray-600 mt-2">Browse and install {noun.toLowerCase()} from the Browse tab</p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveView('browse')}
                className="mt-6 px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider border transition-all" style={{ background: `rgba(${accentRgb},0.08)`, color: accentHex, borderColor: `rgba(${accentRgb},0.25)` }}>
                BROWSE {noun.toUpperCase()}
              </motion.button>
            </div>
          ) : (
            <div className="grid gap-3">
              {installed.map((plugin: any, idx: number) => {
                const fileName = String(plugin.fileName || plugin.file || plugin.name || '');
                const update = updatesByFile.get(fileName);
                const sourceLabel = plugin.source === 'modrinth' ? 'Modrinth' : plugin.source === 'spiget' ? 'SpigotMC' : null;
                const sourceColor = plugin.source === 'modrinth' ? 'text-[#1bd96a]' : plugin.source === 'spiget' ? 'text-[#ee8a18]' : 'text-gray-500';
                return (
                  <motion.div key={fileName} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02, duration: 0.3 }}
                    className={`neo-card p-4 md:p-5 flex items-center gap-4 transition-all duration-500 group relative overflow-hidden ${update ? 'border-yellow-500/10 hover:border-yellow-500/20' : 'hover:border-white/10'}`}>
                    <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: update ? 'linear-gradient(to right, rgba(234,179,8,0.02), transparent)' : 'linear-gradient(to right, rgba(255,255,255,0.01), transparent)' }} />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative z-10 border ${update ? 'bg-yellow-500/[0.06] border-yellow-500/15' : 'bg-white/[0.04] border-white/[0.06]'}`}>
                      {update ? <RefreshCw className="w-5 h-5 text-yellow-400" /> : <Puzzle className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white font-bold truncate">{plugin.title || fileName}</p>
                        {update && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/20 animate-pulse">
                            Update Available
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-gray-500 mt-1.5 flex-wrap">
                        {plugin.currentVersion && <span className="font-mono px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">v{plugin.currentVersion}</span>}
                        {update && (
                          <span className="text-yellow-400 font-mono flex items-center gap-1">&rarr; v{update.latestVersion || 'latest'}</span>
                        )}
                        {sourceLabel && (
                          <span className={`px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-[10px] font-bold ${sourceColor}`}>{sourceLabel}</span>
                        )}
                        {plugin.installedAt && <span className="hidden sm:inline">Installed {formatRelativeDate(plugin.installedAt)}</span>}
                        <span className="text-gray-600 font-mono text-[10px] truncate max-w-[150px] hidden md:inline">{fileName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 relative z-10">
                      {update && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => updateOne(fileName)} disabled={updatingFile === fileName}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-yellow-400 bg-yellow-500/[0.06] border border-yellow-500/20 hover:bg-yellow-500/12 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all">
                          {updatingFile === fileName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Update
                        </motion.button>
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => remove(fileName)}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/[0.06] hover:border-red-500/15 transition-all" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======== VERSION PICKER MODAL ======== */}
      <AnimatePresence>
        {versionPicker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setVersionPicker(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              className="neo-card max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              {/* Header */}
              <div className="p-5 flex items-center gap-4 relative overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.04) 0%, transparent 100%)` }} />
                {versionPicker.iconUrl ? (
                  <img src={versionPicker.iconUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/5 border border-white/[0.06] relative z-10 shadow-lg" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center relative z-10"><Puzzle className="w-5 h-5 text-gray-500" /></div>
                )}
                <div className="flex-1 min-w-0 relative z-10">
                  <h3 className="text-sm font-bold text-white truncate">{versionPicker.projectTitle}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                    <span>{versionPicker.versions.length} version{versionPicker.versions.length !== 1 ? 's' : ''}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                    <span className="font-medium" style={{ color: versionPicker.source === 'modrinth' ? '#1bd96a' : '#ee8a18' }}>
                      {versionPicker.source === 'modrinth' ? 'Modrinth' : 'SpigotMC'}
                    </span>
                  </p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setVersionPicker(null)} className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/15 transition-all relative z-10">
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Versions list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versionPicker.versions.length === 0 ? (
                  <div className="p-12 text-center">
                    <Puzzle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No compatible versions found</p>
                  </div>
                ) : versionPicker.source === 'modrinth' ? (
                  versionPicker.versions.map((v: any, i: number) => {
                    const vId = String(v.id);
                    const gameVersions = (v.game_versions || []).slice(0, 5);
                    const loaders = (v.loaders || []).slice(0, 4);
                    const vType = v.version_type || 'release';
                    const typeColors: Record<string, string> = {
                      release: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      beta: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                      alpha: 'bg-red-500/10 text-red-400 border-red-500/20',
                    };
                    return (
                      <motion.div key={vId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="rounded-xl p-4 hover:bg-white/[0.03] transition-all flex items-start gap-3 border border-white/[0.04] group hover:border-white/[0.08]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-white">{v.name || v.version_number}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${typeColors[vType] || typeColors.release}`}>{vType}</span>
                            {v.featured && <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold border" style={{ background: `rgba(${accentRgb},0.08)`, color: accentHex, borderColor: `rgba(${accentRgb},0.2)` }}>Featured</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2 flex-wrap">
                            {v.version_number && v.name !== v.version_number && <span className="font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.04]">{v.version_number}</span>}
                            {gameVersions.length > 0 && <span>MC {gameVersions.join(', ')}{(v.game_versions || []).length > 5 ? '\u2026' : ''}</span>}
                            {loaders.length > 0 && loaders.map((l: string) => (
                              <span key={l} className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.04] text-[10px]">{l}</span>
                            ))}
                            {v.downloads !== undefined && <span>{formatNumber(v.downloads)} downloads</span>}
                            {v.date_published && <span>{formatRelativeDate(v.date_published)}</span>}
                          </div>
                        </div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => installModrinthVersion(versionPicker.projectId, vId, v.version_number || v.name)}
                          disabled={installing === vId}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border" style={{ background: `rgba(${accentRgb},0.06)`, color: accentHex, borderColor: `rgba(${accentRgb},0.2)` }}>
                          {installing === vId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Install
                        </motion.button>
                      </motion.div>
                    );
                  })
                ) : (
                  <>
                    {versionPicker.versions.length > 0 && (() => {
                      const latest = versionPicker.versions[0];
                      const vId = String(latest.id);
                      const resourceId = latest._resourceId;
                      return (
                        <motion.div key={`latest-${vId}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl p-4 transition-all relative overflow-hidden border border-emerald-500/15 bg-emerald-500/[0.02]">
                          <div className="flex items-start gap-3 relative z-10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">{latest.name || `Version ${vId}`}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Latest</span>
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] text-gray-500 mt-2">
                                {latest.releaseDate && <span>Released {formatRelativeDate(latest.releaseDate)}</span>}
                                {latest.downloads !== undefined && <span>{formatNumber(latest.downloads)} downloads</span>}
                                <span className="font-mono text-[10px] text-gray-600">ID: {vId}</span>
                              </div>
                            </div>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => installSpiget({ id: resourceId, name: latest._resourceName })}
                              disabled={installing === String(resourceId)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/15 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                              {installing === String(resourceId) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Install Latest
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })()}

                    {versionPicker.versions.slice(1).map((v: any, i: number) => {
                      const vId = String(v.id);
                      const resourceId = v._resourceId;
                      return (
                        <motion.div key={vId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.02 }}
                          className="rounded-xl p-4 hover:bg-white/[0.03] transition-all flex items-start gap-3 border border-white/[0.04] group hover:border-white/[0.08]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{v.name || `Version ${vId}`}</p>
                            <div className="flex items-center gap-2.5 text-[11px] text-gray-500 mt-1.5">
                              {v.releaseDate && <span>Released {formatRelativeDate(v.releaseDate)}</span>}
                              {v.downloads !== undefined && <span>{formatNumber(v.downloads)} downloads</span>}
                              <span className="font-mono text-[10px] text-gray-600">ID: {vId}</span>
                            </div>
                          </div>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => installSpigetVersion(resourceId, Number(vId), v.name || vId)}
                            disabled={installing === vId}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all bg-white/[0.04] text-gray-300 border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15">
                            {installing === vId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Install
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────── PLAYERS TAB ──────── */
function PlayersTab({ serverUuid }: { serverUuid: string }) {
  const [online, setOnline] = useState<any>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [banned, setBanned] = useState<any[]>([]);
  const [bannedIps, setBannedIps] = useState<any[]>([]);
  const [playerData, setPlayerData] = useState<any[]>([]);
  const [playerDataWorlds, setPlayerDataWorlds] = useState<string[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinecraft, setIsMinecraft] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [subTab, setSubTab] = useState<'online' | 'whitelist' | 'banned' | 'bannedIps' | 'playerData' | 'ops'>('online');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!serverUuid) return;
    try {
      const detect = await playersApi.detect(serverUuid);
      const detectData = detect.data;
      const detected = typeof detectData === 'boolean'
        ? detectData
        : !!(detectData?.minecraft || detectData?.isMinecraft);
      if (!detected) { setIsMinecraft(false); setLoading(false); return; }
      setIsMinecraft(true);
      const [onl, wl, bn, bip, pd, op] = await Promise.all([
        playersApi.online(serverUuid).catch(() => ({ data: null })),
        playersApi.whitelist(serverUuid).catch(() => ({ data: [] })),
        playersApi.banned(serverUuid).catch(() => ({ data: [] })),
        playersApi.bannedIps(serverUuid).catch(() => ({ data: [] })),
        playersApi.playerData(serverUuid).catch(() => ({ data: { players: [], worlds: [] } })),
        playersApi.ops(serverUuid).catch(() => ({ data: [] })),
      ]);
      setOnline(onl.data);
      setWhitelist(Array.isArray(wl.data) ? wl.data.map((w: any) => typeof w === 'string' ? w : w.name) : []);
      setBanned(Array.isArray(bn.data) ? bn.data : []);
      setBannedIps(Array.isArray(bip.data) ? bip.data : []);
      setPlayerData(Array.isArray(pd.data?.players) ? pd.data.players : (Array.isArray(pd.data) ? pd.data : []));
      setPlayerDataWorlds(Array.isArray(pd.data?.worlds) ? pd.data.worlds : []);
      setOps(Array.isArray(op.data) ? op.data : []);
    } catch {}
    finally { setLoading(false); }
  }, [serverUuid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const action = async (fn: () => Promise<any>, msg: string) => {
    setActionLoading(true);
    try { await fn(); toast.success(msg); setPlayerInput(''); fetchAll(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };
  const inputPlaceholder = subTab === 'bannedIps'
    ? 'IP address'
    : subTab === 'playerData'
      ? 'Player name or UUID'
      : 'Player name';

  if (loading) return <div className="flex flex-col items-center justify-center py-16 space-y-4"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /><span className="text-sm font-medium tracking-widest text-emerald-400/50">SCANNING PLAYERS</span></div>;
  if (!isMinecraft) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neo-card p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent pointer-events-none" />
      <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <p className="text-sm text-gray-400 font-semibold">Player management is only available for Minecraft servers.</p>
    </motion.div>
  );

  const subTabConfig: { id: typeof subTab; label: string; count: number; icon: any; color: string }[] = [
    { id: 'online', label: 'Online', count: online?.count || 0, icon: Users, color: 'emerald' },
    { id: 'whitelist', label: 'Whitelist', count: whitelist.length, icon: Shield, color: 'sky' },
    { id: 'banned', label: 'Banned', count: banned.length, icon: Ban, color: 'red' },
    { id: 'bannedIps', label: 'Banned IPs', count: bannedIps.length, icon: Lock, color: 'orange' },
    { id: 'playerData', label: 'Data', count: playerData.length, icon: FileArchive, color: 'violet' },
    { id: 'ops', label: 'Operators', count: ops.length, icon: Gavel, color: 'amber' },
  ];

  const activeColor: Record<string, { accent: string; bg: string; border: string; glow: string }> = {
    emerald: { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    sky: { accent: 'text-gray-300', bg: 'bg-white/[0.04]', border: 'border-white/[0.10]', glow: '' },
    red: { accent: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' },
    orange: { accent: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]' },
    violet: { accent: 'text-gray-300', bg: 'bg-white/[0.04]', border: 'border-white/[0.10]', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.04)]' },
    amber: { accent: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
  };

  const currentColor = activeColor[subTabConfig.find(t => t.id === subTab)?.color || 'emerald'];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Header */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-teal-500/8 blur-[60px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="players-hex" width="28" height="49" patternUnits="userSpaceOnUse"><path d="M14 0L28 8.66V25.98L14 34.64L0 25.98V8.66Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" /><path d="M14 16.32L28 24.98V42.3L14 50.96L0 42.3V24.98Z" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-emerald-500" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#players-hex)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-wide">Player Management</h3>
              <p className="text-xs text-gray-400 mt-1">Manage online players, whitelist, bans, operators and player data</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {online && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 text-xs text-emerald-300 font-medium tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {online.count || 0}/{online.max || '?'} ONLINE
              </div>
            )}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setLoading(true); fetchAll(); }}
              className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {subTabConfig.map((t) => {
          const isActive = subTab === t.id;
          const c = activeColor[t.color];
          return (
            <motion.button key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSubTab(t.id)}
              className={`relative overflow-hidden flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-semibold transition-all border ${isActive ? `${c.bg} ${c.accent} ${c.border} ${c.glow}` : 'bg-white/[0.02] text-gray-500 border-white/[0.04] hover:bg-white/[0.04] hover:text-gray-300'}`}>
              {isActive && <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />}
              <t.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
              <span className="relative z-10 sm:hidden text-[10px]">{t.label}</span>
              <span className={`relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? `${c.bg} ${c.accent}` : 'bg-white/5 text-gray-600'}`}>{t.count}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Action Input */}
      <AnimatePresence mode="wait">
        {subTab !== 'online' && (
          <motion.div key="action-input" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
            className={`neo-card p-4 relative overflow-hidden border ${currentColor.border.replace('border-', 'border-').replace('/30', '/10')}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 flex gap-3 items-center">
              <div className={`w-10 h-10 rounded-xl ${currentColor.bg} flex items-center justify-center shrink-0 border ${currentColor.border}`}>
                <UserPlus className={`w-4 h-4 ${currentColor.accent}`} />
              </div>
              <input type="text" value={playerInput} onChange={e => setPlayerInput(e.target.value)} placeholder={inputPlaceholder}
                className="input-field text-sm flex-1 font-mono bg-black/40 border-white/[0.06] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all h-11 px-4" onKeyDown={e => {
                  if (e.key !== 'Enter' || !playerInput.trim()) return;
                  if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added to whitelist');
                  if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
                  if (subTab === 'bannedIps') action(() => playersApi.banIp(serverUuid, playerInput), 'IP banned');
                  if (subTab === 'playerData') {
                    const target = playerInput.trim();
                    if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                    action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
                  }
                  if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
                }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={actionLoading || !playerInput.trim()}
                className={`h-11 px-5 rounded-xl font-bold tracking-wider text-xs transition-all flex items-center justify-center gap-2 border ${playerInput.trim() ? `${currentColor.bg} ${currentColor.accent} ${currentColor.border} hover:${currentColor.glow}` : 'bg-white/[0.03] text-gray-600 border-white/[0.05] cursor-default'}`}
                onClick={() => {
                  if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added');
                  if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
                  if (subTab === 'bannedIps') action(() => playersApi.banIp(serverUuid, playerInput), 'IP banned');
                  if (subTab === 'playerData') {
                    const target = playerInput.trim();
                    if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                    action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
                  }
                  if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
                }}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{subTab === 'playerData' ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {subTab === 'playerData' ? 'DELETE' : 'ADD'}</>}
              </motion.button>
            </div>
            {subTab === 'playerData' && (
              <div className="mt-3 ml-[52px] flex items-start gap-2 text-xs text-amber-400/80">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Stop the server before deleting player data. This removes playerdata, stats, and advancements files.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Lists */}
      <AnimatePresence mode="wait">
        <motion.div key={subTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          {subTab === 'online' && (
            online?.players?.length ? (
              <div className="grid gap-2">
                {online.players.map((p: string, i: number) => (
                  <motion.div key={p} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="neo-card p-4 flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                        <img src={`https://mc-heads.net/avatar/${p}/40`} alt={p} className="w-full h-full rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">{p}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] text-emerald-400/70 font-medium tracking-wider">ONLINE</span>
                        </div>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => action(() => playersApi.kick(serverUuid, p), `Kicked ${p}`)}
                      className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/[0.06] border border-red-500/15 hover:bg-red-500/15 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all">
                      <UserMinus className="w-3.5 h-3.5" /> Kick
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/15 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-400 font-semibold block">{online ? `${online.count || 0}/${online.max || '?'} players` : 'No data'}</span>
                  <span className="text-xs text-gray-600 mt-1 block">Players will appear here when they join the server</span>
                </div>
              </div>
            )
          )}

          {subTab === 'whitelist' && (
            whitelist.length ? (
              <div className="grid gap-2">
                {whitelist.map((p, i) => (
                  <motion.div key={p} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="neo-card p-4 flex items-center justify-between group hover:border-white/[0.08] transition-all duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.03] flex items-center justify-center border border-white/[0.08]">
                        <Shield className="w-4 h-4 text-gray-300" />
                      </div>
                      <span className="text-sm font-bold text-white">{p}</span>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => action(() => playersApi.removeWhitelist(serverUuid, p), 'Removed')}
                      className="relative z-10 w-9 h-9 rounded-xl bg-red-500/[0.06] border border-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition-all">
                      <X className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Shield className="w-8 h-8 text-gray-600" />
                </div>
                <span className="text-sm text-gray-400 font-semibold tracking-widest uppercase">Whitelist Empty</span>
              </div>
            )
          )}

          {subTab === 'banned' && (
            banned.length ? (
              <div className="grid gap-2">
                {banned.map((b: any, i: number) => {
                  const name = typeof b === 'string' ? b : b.name;
                  return (
                    <motion.div key={name} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="neo-card p-4 flex items-center justify-between group hover:border-red-500/20 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/15 to-rose-500/15 flex items-center justify-center border border-red-500/20">
                          <Ban className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">{name}</span>
                          {b.reason && <p className="text-[10px] text-gray-500 mt-0.5 italic">&ldquo;{b.reason}&rdquo;</p>}
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => action(() => playersApi.unban(serverUuid, name), 'Unbanned')}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/15 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all">
                        <Unlock className="w-3.5 h-3.5" /> Unban
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-red-500/[0.06] border border-red-500/15 flex items-center justify-center">
                  <Ban className="w-8 h-8 text-gray-600" />
                </div>
                <span className="text-sm text-gray-400 font-semibold tracking-widest uppercase">No Banned Players</span>
              </div>
            )
          )}

          {subTab === 'ops' && (
            ops.length ? (
              <div className="grid gap-2">
                {ops.map((o: any, i: number) => {
                  const name = typeof o === 'string' ? o : o.name;
                  return (
                    <motion.div key={name} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="neo-card p-4 flex items-center justify-between group hover:border-amber-500/20 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15 flex items-center justify-center border border-amber-500/20">
                          <Gavel className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">{name}</span>
                          <span className="text-[10px] text-amber-400/60 font-medium tracking-wider ml-2">OPERATOR</span>
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => action(() => playersApi.deop(serverUuid, name), 'De-opped')}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-orange-400 bg-orange-500/[0.06] border border-orange-500/15 hover:bg-orange-500/15 hover:border-orange-500/30 transition-all">
                        <X className="w-3.5 h-3.5" /> Remove OP
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 flex items-center justify-center">
                  <Gavel className="w-8 h-8 text-gray-600" />
                </div>
                <span className="text-sm text-gray-400 font-semibold tracking-widest uppercase">No Operators</span>
              </div>
            )
          )}

          {subTab === 'bannedIps' && (
            bannedIps.length ? (
              <div className="grid gap-2">
                {bannedIps.map((b: any, i: number) => {
                  const ip = typeof b === 'string' ? b : b.ip || b.name;
                  return (
                    <motion.div key={ip} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="neo-card p-4 flex items-center justify-between group hover:border-orange-500/20 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/15 flex items-center justify-center border border-orange-500/20">
                          <Lock className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white font-mono">{ip}</span>
                          {b?.reason && <p className="text-[10px] text-gray-500 mt-0.5 italic">&ldquo;{b.reason}&rdquo;</p>}
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => action(() => playersApi.unbanIp(serverUuid, ip), 'IP unbanned')}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/[0.06] border border-emerald-500/15 hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all">
                        <Unlock className="w-3.5 h-3.5" /> Unban
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/[0.06] border border-orange-500/15 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-gray-600" />
                </div>
                <span className="text-sm text-gray-400 font-semibold tracking-widest uppercase">No Banned IPs</span>
              </div>
            )
          )}

          {subTab === 'playerData' && (
            playerData.length ? (
              <div className="grid gap-2">
                {playerData.map((p: any, i: number) => {
                  const uuid = String(p?.uuid || '');
                  const label = p?.name ? `${p.name}` : uuid;
                  const files = Array.isArray(p?.files) ? p.files : [];
                  const worlds = Array.isArray(p?.worlds) ? p.worlds : [];
                  return (
                    <motion.div key={uuid || label} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}
                      className="neo-card p-4 flex items-center justify-between gap-3 group hover:border-white/[0.08] transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="flex items-center gap-3 relative z-10 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.03] flex items-center justify-center border border-white/[0.08] shrink-0">
                          <FileArchive className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{label}</div>
                          <div className="text-[10px] text-gray-500 truncate font-mono mt-0.5">
                            {uuid || 'unknown uuid'} &bull; {files.length || p?.fileCount || 0} file(s)
                            {worlds.length ? ` \u2022 ${worlds.join(', ')}` : ''}
                          </div>
                        </div>
                      </div>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const target = uuid || label;
                          if (!target) return;
                          if (!confirm(`Delete all stored player data for "${target}"? Server must be offline.`)) return;
                          action(() => playersApi.deletePlayerData(serverUuid, target), 'Player data deleted');
                        }}
                        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/[0.06] border border-red-500/15 hover:bg-red-500/15 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all whitespace-nowrap shrink-0">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <FileArchive className="w-8 h-8 text-gray-600" />
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-400 font-semibold block">No Player Data Found</span>
                  {playerDataWorlds.length > 0 && <span className="text-xs text-gray-600 mt-1 block">Searched in {playerDataWorlds.join(', ')}</span>}
                </div>
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────── SCHEDULES TAB ──────── */
function SchedulesTab({ serverId }: { serverId: string }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', is_active: true, minute: '*/30', hour: '*', day_of_week: '*', day_of_month: '*', month: '*' });
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<{ scheduleId: number } | null>(null);
  const [taskForm, setTaskForm] = useState({ action: 'command' as 'command' | 'power' | 'backup', payload: '', time_offset: 0 });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await serversApi.schedules(serverId); setSchedules(r.data?.data || r.data || []); }
    catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  }, [serverId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try { await serversApi.createSchedule(serverId, form); toast.success('Schedule created'); setShowForm(false); setForm({ name: '', is_active: true, minute: '*/30', hour: '*', day_of_week: '*', day_of_month: '*', month: '*' }); fetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const remove = async (scheduleId: number) => {
    if (!confirm('Delete this schedule?')) return;
    try { await serversApi.deleteSchedule(serverId, scheduleId); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const execute = async (scheduleId: number) => {
    try { await serversApi.executeSchedule(serverId, scheduleId); toast.success('Schedule triggered'); }
    catch { toast.error('Failed'); }
  };

  const addTask = async (scheduleId: number) => {
    if (!taskForm.payload.trim() && taskForm.action !== 'backup') return;
    try {
      await serversApi.createTask(serverId, scheduleId, taskForm);
      toast.success('Task added');
      setEditingTask(null);
      setTaskForm({ action: 'command', payload: '', time_offset: 0 });
      fetch();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  const removeTask = async (scheduleId: number, taskId: number) => {
    try { await serversApi.deleteTask(serverId, scheduleId, taskId); toast.success('Task removed'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Header */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="sched-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#sched-grid)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] relative">
              <div className="absolute inset-0 rounded-xl bg-cyan-400/10 animate-ping opacity-20" />
              <CalendarClock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-wide">Task Scheduler</h3>
              <p className="text-xs text-gray-400 mt-1">Automate server restarts, backups, and commands with cron expressions</p>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setShowForm(!showForm)} 
            className="h-11 px-6 rounded-xl font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="w-4 h-4" /> NEW SCHEDULE
          </motion.button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }} 
            animate={{ opacity: 1, height: 'auto', y: 0 }} 
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="neo-card p-6 space-y-5 border border-cyan-500/15 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-cyan-400" /> Create New Schedule
                </h4>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Schedule name (e.g., Daily Restart)" className="input-field text-sm bg-black/40 border-white/[0.06] focus:border-cyan-500/50 h-11 w-full mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(['minute', 'hour', 'day_of_week', 'day_of_month', 'month'] as const).map(f => (
                    <div key={f}>
                      <label className="text-[10px] text-gray-500 block mb-1.5 uppercase tracking-widest font-bold">{f.replace(/_/g, ' ')}</label>
                      <input type="text" value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} className="input-field text-xs font-mono bg-black/40 h-10 border-white/[0.05] focus:border-cyan-500/40" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-end mt-5">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowForm(false)} className="h-10 px-5 rounded-xl text-xs font-bold text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">CANCEL</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={create} disabled={creating || !form.name.trim()} className="h-10 px-6 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 transition-all flex items-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CREATE</>}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm font-medium tracking-widest text-cyan-400/50">LOADING SCHEDULES</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
            <CalendarClock className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-sm text-gray-400 tracking-widest uppercase font-semibold">NO SCHEDULES CONFIGURED</span>
          <p className="text-xs text-gray-500 max-w-sm text-center">Set up cron-based automations to restart your server, create backups, or run commands on a timer.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {schedules.map((s: any, idx: number) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              className="neo-card p-0 overflow-hidden group hover:border-cyan-500/20 transition-all duration-500"
            >
              {/* Schedule Header */}
              <div className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${s.is_active ? 'bg-cyan-500/10 border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)]' : 'bg-white/[0.04] border-white/[0.08]'}`}>
                    <CalendarClock className={`w-4 h-4 ${s.is_active ? 'text-cyan-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-[15px] font-bold text-white">{s.name}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase ${s.is_active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/15'}`}>
                        {s.is_active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-1 rounded-md bg-black/40 border border-white/[0.04] text-[11px] text-cyan-400/80 font-mono tracking-wider">
                        {s.cron?.minute || s.minute} {s.cron?.hour || s.hour} {s.cron?.day_of_week || s.day_of_week} {s.cron?.day_of_month || s.day_of_month} {s.cron?.month || s.month}
                      </span>
                      {s.last_run_at && <span className="text-[10px] text-gray-500">Last: {new Date(s.last_run_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/30 p-1.5 rounded-xl border border-white/[0.04] relative z-10">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => execute(s.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Execute Now">
                    <Play className="w-4 h-4" />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setEditingTask(editingTask?.scheduleId === s.id ? null : { scheduleId: s.id })} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all" title="Add Task">
                    <Plus className="w-4 h-4" />
                  </motion.button>
                  <div className="w-[1px] h-5 bg-white/10 mx-0.5" />
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => remove(s.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete Schedule">
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {/* Tasks List */}
              {s.relationships?.tasks?.data?.length > 0 && (
                <div className="border-t border-white/[0.04] bg-black/20">
                  <div className="px-5 md:px-6 py-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pipeline Tasks ({s.relationships.tasks.data.length})</div>
                  <div className="divide-y divide-white/[0.03]">
                    {s.relationships.tasks.data.map((t: any, ti: number) => (
                      <div key={t.attributes.id} className="flex items-center justify-between px-5 md:px-6 py-3 hover:bg-white/[0.02] transition-colors group/task">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center text-[10px] text-gray-500 font-bold border border-white/[0.04]">{ti + 1}</div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${t.attributes.action === 'power' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : t.attributes.action === 'backup' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.04] text-gray-300 border border-white/[0.08]'}`}>
                            {t.attributes.action}
                          </span>
                          <span className="text-xs text-gray-300 font-mono truncate max-w-[150px] sm:max-w-[250px]">{t.attributes.payload || '—'}</span>
                          {t.attributes.time_offset > 0 && <span className="text-[10px] text-gray-500 bg-black/30 px-1.5 py-0.5 rounded border border-white/[0.03]">+{t.attributes.time_offset}s delay</span>}
                        </div>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => removeTask(s.id, t.attributes.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/task:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Task Form */}
              <AnimatePresence>
                {editingTask?.scheduleId === s.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-cyan-500/10 bg-cyan-500/[0.02] overflow-hidden">
                    <div className="p-5 md:p-6 space-y-4">
                      <h5 className="text-xs font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-2"><Plus className="w-3 h-3" /> Add Pipeline Task</h5>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select value={taskForm.action} onChange={e => setTaskForm({ ...taskForm, action: e.target.value as any })} className="input-field text-xs bg-black/40 h-10 border-white/[0.05] focus:border-cyan-500/40 w-full sm:w-36">
                          <option value="command">Command</option>
                          <option value="power">Power</option>
                          <option value="backup">Backup</option>
                        </select>
                        <input type="text" value={taskForm.payload} onChange={e => setTaskForm({ ...taskForm, payload: e.target.value })}
                          placeholder={taskForm.action === 'command' ? 'e.g., say Server restarting...' : taskForm.action === 'power' ? 'start / stop / restart / kill' : 'Leave empty for backup'} className="input-field text-xs flex-1 font-mono bg-black/40 h-10 border-white/[0.05] focus:border-cyan-500/40" />
                        <input type="number" value={taskForm.time_offset} onChange={e => setTaskForm({ ...taskForm, time_offset: parseInt(e.target.value) || 0 })}
                          className="input-field text-xs w-full sm:w-24 font-mono bg-black/40 h-10 border-white/[0.05] focus:border-cyan-500/40" placeholder="Delay (s)" />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingTask(null)} className="h-9 px-5 rounded-xl text-xs font-bold text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all">CANCEL</motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => addTask(s.id)} className="h-9 px-6 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center gap-2"><Plus className="w-3 h-3" /> ADD TASK</motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ──────── ACTIVITY TAB ──────── */
function ActivityTab({ serverId }: { serverId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi.activity(serverId).then(r => setActivities(r.data?.data || r.data || []))
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <div className="flex flex-col items-center justify-center py-16 space-y-4"><Loader2 className="w-8 h-8 text-gray-300 animate-spin" /><span className="text-sm font-medium tracking-widest text-gray-300/50">LOADING AUDIT LOG</span></div>;

  const getEventColor = (event: string) => {
    if (event?.includes('start') || event?.includes('create')) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.15)]' };
    if (event?.includes('stop') || event?.includes('kill') || event?.includes('delete')) return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.15)]' };
    if (event?.includes('backup') || event?.includes('restore')) return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]' };
    return { bg: 'bg-white/[0.04]', border: 'border-white/[0.08]', text: 'text-gray-300', glow: 'shadow-[0_0_8px_rgba(255,255,255,0.04)]' };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* Header */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/[0.04] blur-[80px] rounded-full pointer-events-none" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="activity-lines" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 0 30 L 60 30 M 30 0 L 30 60" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-gray-500" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#activity-lines)" />
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.03] flex items-center justify-center border border-white/[0.10] ">
              <Activity className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white tracking-wide">Activity Audit Log</h3>
              <p className="text-xs text-gray-400 mt-1">Complete history of all actions performed on this server</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-400 font-medium tracking-wider">
            {activities.length} EVENT{activities.length !== 1 ? 'S' : ''}
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="neo-card p-16 flex flex-col items-center justify-center space-y-4 bg-black/20">
          <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
            <Activity className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-sm text-gray-400 tracking-widest uppercase font-semibold">NO ACTIVITY RECORDED</span>
        </div>
      ) : (
        <div className="neo-card overflow-hidden !p-0">
          <div className="divide-y divide-white/[0.03]">
            {activities.map((a: any, i: number) => {
              const event = a.event || a.description || 'Unknown action';
              const colors = getEventColor(event);
              return (
                <motion.div 
                  key={a.id || i} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className="flex items-center gap-4 px-5 md:px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Timeline Dot */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border ${colors.glow} flex items-center justify-center`}>
                      <Activity className={`w-3.5 h-3.5 ${colors.text}`} />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate group-hover:text-white transition-colors">{event}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {a.ip && (
                        <span className="text-[10px] font-mono text-gray-500 bg-black/30 px-2 py-0.5 rounded-md border border-white/[0.03]">{a.ip}</span>
                      )}
                      {(a.timestamp || a.created_at) && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(a.timestamp || a.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Properties Badge */}
                  {a.properties && Object.keys(a.properties).length > 0 && (
                    <div className="hidden sm:flex items-center">
                      <span className="text-[10px] text-gray-600 bg-black/30 px-2 py-1 rounded-md border border-white/[0.03] font-mono max-w-[180px] truncate">{JSON.stringify(a.properties)}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ──────── SETTINGS TAB ──────── */
function SettingsTab({ serverId, serverName, onRenamed }: { serverId: string; serverName: string; onRenamed: () => void }) {
  const [name, setName] = useState(serverName);
  const [saving, setSaving] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);

  const handleRename = async () => {
    if (!name.trim() || name.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    setSaving(true);
    try { await serversApi.renameServer(serverId, name.trim()); toast.success('Server renamed'); onRenamed(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Rename failed'); }
    finally { setSaving(false); }
  };

  const handleReinstall = async () => {
    if (!confirm('Are you sure? This will wipe all server files and reinstall from scratch. This cannot be undone.')) return;
    setReinstalling(true);
    try { await serversApi.reinstall(serverId); toast.success('Reinstall started. This may take a few minutes.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Reinstall failed'); }
    finally { setReinstalling(false); }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Rename Box */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-[#09090b]/80 to-[#101018]/80 group">
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/[0.08] blur-[50px] rounded-full pointer-events-none group-hover:bg-white/[0.10] transition-colors duration-500" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="text-lg font-display font-semibold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/[0.08] ">
                <Edit3 className="w-4 h-4 text-gray-300" /> 
              </div>
              Rename Server
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">Update the display name of your server on the control panel.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="input-field text-sm flex-1 bg-black/40 border-white/[0.08] focus:border-white/[0.15] focus:ring-1 focus:ring-primary/50 transition-all shadow-inner h-11 px-4" 
              placeholder="Enter new server name..." 
            />
            <motion.button 
              whileHover={{ scale: (name !== serverName && !saving) ? 1.05 : 1 }} 
              whileTap={{ scale: (name !== serverName && !saving) ? 0.95 : 1 }} 
              onClick={handleRename} 
              disabled={saving || name === serverName} 
              className="h-11 px-6 rounded-xl font-bold tracking-wide text-xs transition-all flex items-center justify-center gap-2 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed bg-white/[0.04] text-gray-300 border border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.15] hover:"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>SAVE <ChevronRight className="w-3 h-3" /></>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="neo-card relative overflow-hidden p-6 md:p-8 border border-red-500/20 bg-gradient-to-br from-red-950/10 to-red-900/5 group">
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="danger-stripes" width="40" height="40" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="40" stroke="currentColor" strokeWidth="20" strokeLinecap="square" className="text-red-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#danger-stripes)" />
        </svg>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-red-500/20 transition-colors duration-700" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-display font-bold text-red-400 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-4 h-4 text-red-500" /> 
              </div>
              DANGER ZONE: Reinstall Server
            </h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">
              This action will forcefully stop the server, erase <span className="text-white font-bold">ALL</span> files and directories, and attempt to unpack the base template over the existing instance. This is an irreversible, destructive task.
            </p>
          </div>
          
          <motion.button 
            whileHover={{ scale: !reinstalling ? 1.05 : 1 }} 
            whileTap={{ scale: !reinstalling ? 0.95 : 1 }} 
            onClick={handleReinstall} 
            disabled={reinstalling} 
            className="h-11 px-6 rounded-xl font-bold tracking-widest text-xs transition-all flex items-center justify-center gap-2 min-w-[200px] bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] whitespace-nowrap"
          >
            {reinstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'INITIATE REINSTALL'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
