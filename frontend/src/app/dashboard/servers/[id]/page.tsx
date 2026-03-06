'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serversApi, pluginsApi, playersApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Terminal, FolderOpen, Database, Archive, Globe, Settings, Puzzle, Users,
  Play, Square, RotateCcw, Skull, Trash2, ChevronLeft, Loader2, Send,
  File, Folder, ArrowLeft, Edit3, Plus, Upload, X, Download, RefreshCw,
  Search, ExternalLink, ShieldAlert, Clock, AlertTriangle, CheckCircle,
  MemoryStick, Cpu, HardDrive, Copy, Eye, EyeOff, UserMinus, UserPlus,
  Shield, Ban, Gavel
} from 'lucide-react';
import Link from 'next/link';

const TABS = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'databases', label: 'Databases', icon: Database },
  { id: 'backups', label: 'Backups', icon: Archive },
  { id: 'network', label: 'Network', icon: Globe },
  { id: 'startup', label: 'Startup', icon: Settings },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'players', label: 'Players', icon: Users },
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
    if (server) serversApi.renewalCost(id).then(r => setRenewalCost(r.data.cost ?? r.data.price ?? r.data)).catch(() => {});
  }, [server, id]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  if (!server) return null;

  const status = server.resources?.current_state || server.status?.toLowerCase() || 'offline';
  const sc = STATUS_CFG[status] || STATUS_CFG.offline;
  const isSuspended = server.status === 'SUSPENDED';
  const isExpired = server.status === 'EXPIRED';

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
                {renewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Renew${renewalCost !== null ? ` (₹${renewalCost})` : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/dashboard/servers" className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">{server.name}</h1>
            <div className="flex items-center gap-2 text-[12px] mt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                <span className={sc.text}>{status}</span>
              </span>
              <span className="text-gray-500 flex items-center gap-1"><MemoryStick className="w-3 h-3" />{server.ram >= 1024 ? `${(server.ram/1024).toFixed(1)}G` : `${server.ram}M`}</span>
              <span className="text-gray-500 flex items-center gap-1"><Cpu className="w-3 h-3" />{server.cpu}%</span>
              <span className="text-gray-500 flex items-center gap-1"><HardDrive className="w-3 h-3" />{server.disk >= 1024 ? `${(server.disk/1024).toFixed(1)}G` : `${server.disk}M`}</span>
            </div>
          </div>
        </div>

        {/* Power Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {[
            { signal: 'start', icon: Play, color: 'text-emerald-400', bg: 'rgba(16,185,129,0.06)', hoverBg: 'rgba(16,185,129,0.12)', disabled: status === 'running' },
            { signal: 'stop', icon: Square, color: 'text-red-400', bg: 'rgba(239,68,68,0.06)', hoverBg: 'rgba(239,68,68,0.12)', disabled: status === 'offline' },
            { signal: 'restart', icon: RotateCcw, color: 'text-yellow-400', bg: 'rgba(234,179,8,0.06)', hoverBg: 'rgba(234,179,8,0.12)', disabled: status === 'offline' },
            { signal: 'kill', icon: Skull, color: 'text-red-500', bg: 'rgba(239,68,68,0.06)', hoverBg: 'rgba(239,68,68,0.12)', disabled: status === 'offline' },
          ].map(p => (
            <button key={p.signal} onClick={() => handlePower(p.signal)} disabled={powerLoading || p.disabled || isSuspended}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 ${p.color}`}
              style={{ background: p.bg }}
              title={p.signal}>
              <p.icon className="w-4 h-4" />
            </button>
          ))}
          <button onClick={() => setDeleteConfirm(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 transition-all" style={{ background: 'rgba(239,68,68,0.06)' }} title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'text-primary' : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'
            }`}
            style={tab === t.id ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' } : undefined}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {tab === 'console' && <ConsoleTab serverId={id} />}
          {tab === 'files' && <FilesTab serverId={id} />}
          {tab === 'databases' && <DatabasesTab serverId={id} />}
          {tab === 'backups' && <BackupsTab serverId={id} />}
          {tab === 'network' && <NetworkTab serverId={id} />}
          {tab === 'startup' && <StartupTab serverId={id} />}
          {tab === 'plugins' && <PluginsTab serverUuid={server.pteroUuid} />}
          {tab === 'players' && <PlayersTab serverUuid={server.pteroUuid} />}
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
  const logRef = useRef<HTMLDivElement>(null);

  const fetchConsole = useCallback(async () => {
    try {
      const res = await serversApi.console(serverId);
      const data = res.data;
      if (Array.isArray(data)) setLines(data.map(stripAnsi));
      else if (data?.logs) setLines((Array.isArray(data.logs) ? data.logs : data.logs.split('\n')).map(stripAnsi));
    } catch {}
  }, [serverId]);

  useEffect(() => { fetchConsole(); const iv = setInterval(fetchConsole, 5000); return () => clearInterval(iv); }, [fetchConsole]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [lines]);

  const sendCmd = async () => {
    if (!cmd.trim()) return;
    setSending(true);
    try { await serversApi.command(serverId, cmd); setHistory(p => [cmd, ...p.slice(0, 49)]); setCmd(''); setHistIdx(-1); setTimeout(fetchConsole, 500); }
    catch { toast.error('Failed to send command'); }
    finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendCmd();
    if (e.key === 'ArrowUp' && history.length) { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setCmd(history[i]); }
    if (e.key === 'ArrowDown') { const i = histIdx - 1; if (i < 0) { setHistIdx(-1); setCmd(''); } else { setHistIdx(i); setCmd(history[i]); } }
  };

  return (
    <div className="neo-card overflow-hidden">
      <div ref={logRef} className="h-[400px] sm:h-[500px] overflow-y-auto p-4 font-mono text-xs sm:text-sm text-gray-300 space-y-0.5 bg-[#0d1117]">
        {lines.length === 0 && <p className="text-gray-600 italic">No console output...</p>}
        {lines.map((l, i) => <div key={i} className="whitespace-pre-wrap break-all leading-5">{l}</div>)}
      </div>
      <div className="flex items-center border-t border-white/5 bg-white/[0.02]">
        <span className="pl-4 text-primary font-mono text-sm">{'>'}</span>
        <input type="text" value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={handleKey}
          placeholder="Type a command..." className="flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none font-mono" />
        <button onClick={sendCmd} disabled={sending || !cmd.trim()} className="px-4 py-3 text-primary hover:bg-white/5 disabled:opacity-30 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
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

  if (editing) {
    return (
      <div className="neo-card overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <span className="text-sm text-gray-300 font-mono truncate">{editing.name}</span>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={saveFile} disabled={saving} className="btn-primary text-xs">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
        <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })}
          className="w-full h-[500px] bg-[#0d1117] p-4 font-mono text-sm text-gray-300 outline-none resize-none" spellCheck={false} />
      </div>
    );
  }

  return (
    <div className="neo-card overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-white/5 flex-wrap">
        <button onClick={goUp} disabled={dir === '/'} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-mono text-gray-400 truncate flex-1">{dir}</span>
        <button onClick={() => setShowNewFolder(!showNewFolder)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={fetchFiles} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {showNewFolder && (
        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/[0.02]">
          <input type="text" value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Folder name"
            className="input-field text-sm flex-1" onKeyDown={e => e.key === 'Enter' && createFolder()} />
          <button onClick={createFolder} className="btn-primary text-xs">Create</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : files.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">Empty directory</div>
      ) : (
        <div className="divide-y divide-white/5">
          {[...files].sort((a, b) => (b.is_file === false ? 1 : 0) - (a.is_file === false ? 1 : 0) || a.name.localeCompare(b.name)).map((f: any) => (
            <div key={f.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] group">
              {f.is_file === false || f.mime === 'inode/directory' ? (
                <button onClick={() => navigate(f.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Folder className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-gray-200 truncate">{f.name}</span>
                </button>
              ) : (
                <button onClick={() => openFile(f.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <File className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300 truncate">{f.name}</span>
                  <span className="text-xs text-gray-600 ml-auto">{f.size ? (f.size > 1048576 ? `${(f.size/1048576).toFixed(1)}M` : `${(f.size/1024).toFixed(0)}K`) : ''}</span>
                </button>
              )}
              <div className="hidden group-hover:flex items-center gap-1">
                <button onClick={() => { setRenaming(f); setNewName(f.name); }} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteFile(f.name, f.is_file === false)} className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename modal */}
      <AnimatePresence>
        {renaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="neo-card p-6 max-w-sm w-full space-y-4">
              <h3 className="text-lg font-semibold text-white">Rename</h3>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input-field" onKeyDown={e => e.key === 'Enter' && handleRename()} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRenaming(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleRename} className="btn-primary text-sm">Rename</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  return (
    <div className="space-y-4">
      <div className="neo-card p-4 flex gap-3">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Database name" className="input-field flex-1 text-sm" onKeyDown={e => e.key === 'Enter' && create()} />
        <button onClick={create} disabled={creating} className="btn-primary text-sm">{creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> :
        dbs.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No databases</div> :
        <div className="grid gap-3">
          {dbs.map((db: any) => (
            <div key={db.id} className="neo-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary" /><span className="font-medium text-white text-sm">{db.name || db.database}</span></div>
                <button onClick={() => remove(db.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              {db.host && <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Host:</span> <span className="text-gray-300">{db.host}:{db.port}</span></div>
                <div><span className="text-gray-500">User:</span> <span className="text-gray-300">{db.username}</span></div>
                {db.password && <div className="col-span-2 flex items-center gap-2">
                  <span className="text-gray-500">Pass:</span>
                  <span className="text-gray-300 font-mono">{showPass[db.id] ? db.password : '••••••••'}</span>
                  <button onClick={() => setShowPass(p => ({ ...p, [db.id]: !p[db.id] }))} className="text-gray-500 hover:text-white">{showPass[db.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                  <button onClick={() => { navigator.clipboard.writeText(db.password); toast.success('Copied!'); }} className="text-gray-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                </div>}
              </div>}
            </div>
          ))}
        </div>}
    </div>
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={create} disabled={creating} className="btn-primary text-sm flex items-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Backup
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div> :
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
                {b.is_successful !== false && <button onClick={() => download(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-primary"><Download className="w-4 h-4" /></button>}
                <button onClick={() => remove(b.uuid || b.id)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  const allocs = network?.data || network?.allocations || (Array.isArray(network) ? network : [network].filter(Boolean));

  return (
    <div className="grid gap-3">
      {allocs.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No allocations</div> :
        allocs.map((a: any, i: number) => (
          <div key={i} className="neo-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <p className="font-mono text-white text-sm">{a.ip || a.alias || '0.0.0.0'}:{a.port}</p>
                {a.is_default && <span className="text-xs text-primary">Primary</span>}
              </div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`${a.ip || a.alias}:${a.port}`); toast.success('Copied!'); }}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        ))}
    </div>
  );
}

/* ──────── STARTUP TAB ──────── */
function StartupTab({ serverId }: { serverId: string }) {
  const [vars, setVars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

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
    try { await serversApi.updateStartup(serverId, key, values[key]); toast.success('Updated'); }
    catch { toast.error('Failed'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="grid gap-3">
      {vars.length === 0 ? <div className="neo-card p-8 text-center text-gray-500 text-sm">No startup variables</div> :
        vars.map((v: any) => (
          <div key={v.env_variable} className="neo-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">{v.name}</label>
              <span className="text-xs text-gray-600 font-mono">{v.env_variable}</span>
            </div>
            {v.description && <p className="text-xs text-gray-500">{v.description}</p>}
            <div className="flex gap-2">
              <input type="text" value={values[v.env_variable] || ''} onChange={e => setValues(p => ({ ...p, [v.env_variable]: e.target.value }))}
                className="input-field text-sm flex-1 font-mono" placeholder={v.default_value} />
              <button onClick={() => save(v.env_variable)} disabled={saving === v.env_variable} className="btn-primary text-xs px-3">
                {saving === v.env_variable ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

/* ──────── PLUGINS TAB ──────── */
function PluginsTab({ serverUuid }: { serverUuid: string }) {
  const [installed, setInstalled] = useState<any[]>([]);
  const [software, setSoftware] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [source, setSource] = useState<'modrinth' | 'spigot'>('modrinth');

  useEffect(() => {
    if (!serverUuid) return;
    Promise.all([
      pluginsApi.detect(serverUuid).then(r => setSoftware(r.data)).catch(() => {}),
      pluginsApi.installed(serverUuid).then(r => setInstalled(r.data?.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [serverUuid]);

  const search = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      if (source === 'modrinth') {
        const loaders = software?.software ? [software.software] : undefined;
        const r = await pluginsApi.modrinthSearch(searchQ, 20, 0, loaders);
        setResults(r.data?.hits || r.data || []);
      } else {
        const r = await pluginsApi.spigetSearch(searchQ);
        setResults(r.data || []);
      }
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const install = async (item: any) => {
    const key = item.project_id || item.slug || item.id;
    setInstalling(key);
    try {
      if (source === 'modrinth') {
        const loaders = software?.software ? [software.software] : undefined;
        const versions = await pluginsApi.modrinthVersions(item.project_id || item.slug, loaders);
        const ver = versions.data?.[0];
        if (!ver) { toast.error('No compatible version'); return; }
        await pluginsApi.modrinthInstall(serverUuid, item.project_id || item.slug, ver.id);
      } else {
        await pluginsApi.spigetInstall(serverUuid, item.id);
      }
      toast.success('Installed! Restart to apply.');
      pluginsApi.installed(serverUuid).then(r => setInstalled(r.data?.data || r.data || [])).catch(() => {});
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Install failed'); }
    finally { setInstalling(null); }
  };

  const remove = async (fileName: string) => {
    if (!confirm(`Remove ${fileName}?`)) return;
    try { await pluginsApi.remove(serverUuid, fileName); toast.success('Removed'); pluginsApi.installed(serverUuid).then(r => setInstalled(r.data?.data || r.data || [])).catch(() => {}); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {software && (
        <div className="neo-card p-4 flex items-center gap-3">
          <Puzzle className="w-5 h-5 text-primary" />
          <div><p className="text-sm text-white font-medium">Detected: {software.software}</p><p className="text-xs text-gray-500">Type: {software.type}</p></div>
        </div>
      )}

      {/* Search */}
      <div className="neo-card p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setSource('modrinth')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${source === 'modrinth' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>Modrinth</button>
          <button onClick={() => setSource('spigot')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${source === 'spigot' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>SpigotMC</button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search plugins..."
              className="input-field pl-10 text-sm" onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <button onClick={search} disabled={searching} className="btn-primary text-sm">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((r: any) => {
            const key = r.project_id || r.slug || r.id;
            return (
              <div key={key} className="neo-card p-4 flex items-center gap-4">
                {r.icon_url && <img src={r.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.title || r.name}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{r.description}</p>
                  {r.downloads !== undefined && <p className="text-xs text-gray-600 mt-0.5">{r.downloads?.toLocaleString()} downloads</p>}
                </div>
                <button onClick={() => install(r)} disabled={installing === key}
                  className="btn-primary text-xs px-3 shrink-0">
                  {installing === key ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Installed */}
      {installed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Installed ({installed.length})</h3>
          <div className="grid gap-2">
            {installed.map((p: any) => (
              <div key={p.name || p.file} className="neo-card p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">{p.name || p.file}</span>
                <button onClick={() => remove(p.file || p.name)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────── PLAYERS TAB ──────── */
function PlayersTab({ serverUuid }: { serverUuid: string }) {
  const [online, setOnline] = useState<any>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [banned, setBanned] = useState<any[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinecraft, setIsMinecraft] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const [subTab, setSubTab] = useState<'online' | 'whitelist' | 'banned' | 'ops'>('online');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!serverUuid) return;
    try {
      const detect = await playersApi.detect(serverUuid);
      if (!detect.data?.minecraft && !detect.data?.isMinecraft) { setIsMinecraft(false); setLoading(false); return; }
      setIsMinecraft(true);
      const [onl, wl, bn, op] = await Promise.all([
        playersApi.online(serverUuid).catch(() => ({ data: null })),
        playersApi.whitelist(serverUuid).catch(() => ({ data: [] })),
        playersApi.banned(serverUuid).catch(() => ({ data: [] })),
        playersApi.ops(serverUuid).catch(() => ({ data: [] })),
      ]);
      setOnline(onl.data);
      setWhitelist(Array.isArray(wl.data) ? wl.data.map((w: any) => typeof w === 'string' ? w : w.name) : []);
      setBanned(Array.isArray(bn.data) ? bn.data : []);
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  if (!isMinecraft) return <div className="neo-card p-8 text-center text-gray-500 text-sm">Player management is only available for Minecraft servers.</div>;

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="flex gap-1">
        {[
          { id: 'online' as const, label: `Online (${online?.count || 0})`, icon: Users },
          { id: 'whitelist' as const, label: `Whitelist (${whitelist.length})`, icon: Shield },
          { id: 'banned' as const, label: `Banned (${banned.length})`, icon: Ban },
          { id: 'ops' as const, label: `Ops (${ops.length})`, icon: Gavel },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${subTab === t.id ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Action input */}
      {subTab !== 'online' && (
        <div className="neo-card p-3 flex gap-2">
          <input type="text" value={playerInput} onChange={e => setPlayerInput(e.target.value)} placeholder="Player name"
            className="input-field text-sm flex-1" onKeyDown={e => {
              if (e.key !== 'Enter' || !playerInput.trim()) return;
              if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added to whitelist');
              if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
              if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
            }} />
          <button disabled={actionLoading || !playerInput.trim()} className="btn-primary text-xs"
            onClick={() => {
              if (subTab === 'whitelist') action(() => playersApi.addWhitelist(serverUuid, playerInput), 'Added');
              if (subTab === 'banned') action(() => playersApi.ban(serverUuid, playerInput), 'Banned');
              if (subTab === 'ops') action(() => playersApi.op(serverUuid, playerInput), 'Opped');
            }}>
            {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Lists */}
      <div className="neo-card overflow-hidden">
        {subTab === 'online' && (
          online?.players?.length ? (
            <div className="divide-y divide-white/5">
              {online.players.map((p: string) => (
                <div key={p} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-300">{p}</span>
                  <button onClick={() => action(() => playersApi.kick(serverUuid, p), `Kicked ${p}`)}
                    className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
                    <UserMinus className="w-3 h-3" /> Kick
                  </button>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">{online ? `${online.count || 0}/${online.max || '?'} players` : 'No data'}</div>
        )}

        {subTab === 'whitelist' && (
          whitelist.length ? (
            <div className="divide-y divide-white/5">
              {whitelist.map(p => (
                <div key={p} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-300">{p}</span>
                  <button onClick={() => action(() => playersApi.removeWhitelist(serverUuid, p), 'Removed')}
                    className="text-xs text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">Whitelist empty</div>
        )}

        {subTab === 'banned' && (
          banned.length ? (
            <div className="divide-y divide-white/5">
              {banned.map((b: any) => {
                const name = typeof b === 'string' ? b : b.name;
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-gray-300">{name}</span>
                      {b.reason && <span className="text-xs text-gray-600 ml-2">{b.reason}</span>}
                    </div>
                    <button onClick={() => action(() => playersApi.unban(serverUuid, name), 'Unbanned')}
                      className="text-xs text-gray-500 hover:text-green-400">Unban</button>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">No banned players</div>
        )}

        {subTab === 'ops' && (
          ops.length ? (
            <div className="divide-y divide-white/5">
              {ops.map((o: any) => {
                const name = typeof o === 'string' ? o : o.name;
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-300">{name}</span>
                    <button onClick={() => action(() => playersApi.deop(serverUuid, name), 'De-opped')}
                      className="text-xs text-gray-500 hover:text-orange-400">Remove OP</button>
                  </div>
                );
              })}
            </div>
          ) : <div className="p-8 text-center text-gray-500 text-sm">No operators</div>
        )}
      </div>
    </div>
  );
}
