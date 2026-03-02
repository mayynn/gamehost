'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { serversApi, pluginsApi, playersApi } from '@/lib/api';
import {
    Play, Square, RotateCcw, Skull, Terminal, FolderOpen, Database,
    Archive, Network, Settings, Puzzle, Users, AlertTriangle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const tabs = [
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'databases', label: 'Databases', icon: Database },
    { id: 'backups', label: 'Backups', icon: Archive },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'startup', label: 'Startup', icon: Settings },
    { id: 'plugins', label: 'Plugins', icon: Puzzle },
    { id: 'players', label: 'Players', icon: Users },
];

export default function ServerDetailPage() {
    const { id } = useParams();
    const [server, setServer] = useState<any>(null);
    const [tab, setTab] = useState('console');
    const [loading, setLoading] = useState(true);
    const [command, setCommand] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [currentDir, setCurrentDir] = useState('/');
    const [backups, setBackups] = useState<any[]>([]);
    const [databases, setDatabases] = useState<any[]>([]);
    const [network, setNetwork] = useState<any[]>([]);
    const [startup, setStartup] = useState<any>(null);
    const [pluginSearch, setPluginSearch] = useState('');
    const [pluginResults, setPluginResults] = useState<any[]>([]);
    const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [banned, setBanned] = useState<any[]>([]);
    const [ops, setOps] = useState<any[]>([]);
    const [playerInput, setPlayerInput] = useState('');

    const serverId = id as string;

    const loadServer = useCallback(async () => {
        try {
            const { data } = await serversApi.get(serverId);
            setServer(data);
        } catch { toast.error('Failed to load server'); }
        finally { setLoading(false); }
    }, [serverId]);

    useEffect(() => { loadServer(); }, [loadServer]);

    const powerAction = async (action: string) => {
        try {
            await serversApi.power(serverId, action);
            toast.success(`Power ${action} sent`);
            setTimeout(loadServer, 2000);
        } catch { toast.error('Power action failed'); }
    };

    const sendCommand = async () => {
        if (!command.trim()) return;
        try {
            await serversApi.command(serverId, command);
            toast.success('Command sent');
            setCommand('');
        } catch { toast.error('Failed to send command'); }
    };

    const loadFiles = async (dir: string) => {
        try {
            const { data } = await serversApi.listFiles(serverId, dir);
            setFiles(data || []);
            setCurrentDir(dir);
        } catch { toast.error('Failed to load files'); }
    };

    const loadTabData = async (t: string) => {
        setTab(t);
        if (!server?.pteroUuid) return;
        try {
            switch (t) {
                case 'files': await loadFiles('/'); break;
                case 'backups': { const r = await serversApi.backups(serverId); setBackups(r.data || []); break; }
                case 'databases': { const r = await serversApi.databases(serverId); setDatabases(r.data || []); break; }
                case 'network': { const r = await serversApi.network(serverId); setNetwork(r.data || []); break; }
                case 'startup': { const r = await serversApi.startup(serverId); setStartup(r.data); break; }
                case 'plugins': {
                    const r = await pluginsApi.installed(server.pteroUuid);
                    setInstalledPlugins(r.data || []);
                    break;
                }
                case 'players': {
                    const [w, b, o] = await Promise.all([
                        playersApi.whitelist(server.pteroUuid),
                        playersApi.banned(server.pteroUuid),
                        playersApi.ops(server.pteroUuid),
                    ]);
                    setWhitelist(w.data || []);
                    setBanned(b.data || []);
                    setOps(o.data || []);
                    break;
                }
            }
        } catch { }
    };

    const searchPlugins = async () => {
        if (!pluginSearch.trim()) return;
        try {
            const { data } = await pluginsApi.modrinthSearch(pluginSearch);
            setPluginResults(data?.hits || []);
        } catch { toast.error('Search failed'); }
    };

    const playerAction = async (action: string) => {
        if (!playerInput.trim() || !server?.pteroUuid) return;
        try {
            switch (action) {
                case 'whitelist': await playersApi.addWhitelist(server.pteroUuid, playerInput); break;
                case 'ban': await playersApi.ban(server.pteroUuid, playerInput); break;
                case 'op': await playersApi.op(server.pteroUuid, playerInput); break;
                case 'kick': await playersApi.kick(server.pteroUuid, playerInput); break;
            }
            toast.success(`${action} ${playerInput}`);
            setPlayerInput('');
            loadTabData('players');
        } catch { toast.error('Action failed'); }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!server) return <div className="text-center py-20 text-gray-400">Server not found</div>;

    const isSuspended = server.status === 'SUSPENDED';

    return (
        <div className="relative">
            {/* Suspension Overlay */}
            {isSuspended && (
                <div className="fixed inset-0 z-40 bg-dark/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="glass-card p-8 max-w-md text-center">
                        <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Server Suspended</h2>
                        <p className="text-gray-400 mb-4">This server has been suspended due to payment issues. Please renew to restore access.</p>
                        <a href="/dashboard/billing" className="btn-primary">Go to Billing</a>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold">{server.name}</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {server.ram}MB RAM · {server.cpu}% CPU · {server.disk}MB Disk
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => powerAction('start')} className="p-2.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Start"><Play className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('restart')} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Restart"><RotateCcw className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('stop')} className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors" title="Stop"><Square className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('kill')} className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Kill"><Skull className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => loadTabData(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="glass-card p-6">
                {/* Console */}
                {tab === 'console' && (
                    <div>
                        <div className="bg-black/50 rounded-xl p-4 h-64 overflow-y-auto mb-4 font-mono text-sm text-green-400">
                            <p className="text-gray-500">Server console output will appear here when connected via WebSocket...</p>
                            <p className="text-gray-600 text-xs mt-2">Use the command input below to send commands to the server.</p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                                placeholder="Type a command..."
                                className="input-field flex-1 font-mono"
                            />
                            <button onClick={sendCommand} className="btn-primary px-6">Send</button>
                        </div>
                    </div>
                )}

                {/* Files */}
                {tab === 'files' && (
                    <div>
                        <div className="text-sm text-gray-400 mb-4">
                            Path: <span className="text-primary">{currentDir}</span>
                            {currentDir !== '/' && (
                                <button onClick={() => loadFiles(currentDir.split('/').slice(0, -1).join('/') || '/')} className="ml-2 text-primary hover:underline">← Back</button>
                            )}
                        </div>
                        <div className="space-y-1">
                            {files.map((f: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                    onClick={() => f.is_file ? null : loadFiles(`${currentDir}/${f.name}`.replace('//', '/'))}>
                                    <FolderOpen className={`w-4 h-4 ${f.is_file ? 'text-gray-500' : 'text-primary'}`} />
                                    <span className="flex-1 text-sm">{f.name}</span>
                                    <span className="text-xs text-gray-500">{f.is_file ? `${(f.size / 1024).toFixed(1)}KB` : 'DIR'}</span>
                                </div>
                            ))}
                            {files.length === 0 && <p className="text-gray-500 text-center py-8">Empty directory</p>}
                        </div>
                    </div>
                )}

                {/* Databases */}
                {tab === 'databases' && (
                    <div>
                        <div className="space-y-3">
                            {databases.map((db: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                                    <Database className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="font-medium">{db.name}</p>
                                        <p className="text-xs text-gray-500">{db.host}:{db.port}</p>
                                    </div>
                                </div>
                            ))}
                            {databases.length === 0 && <p className="text-gray-500 text-center py-8">No databases</p>}
                        </div>
                    </div>
                )}

                {/* Backups */}
                {tab === 'backups' && (
                    <div>
                        <button onClick={async () => { await serversApi.createBackup(serverId); loadTabData('backups'); toast.success('Backup created'); }} className="btn-primary mb-4">Create Backup</button>
                        <div className="space-y-3">
                            {backups.map((b: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                                    <Archive className="w-5 h-5 text-primary" />
                                    <div className="flex-1"><p className="font-medium">{b.name}</p><p className="text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</p></div>
                                    <span className="text-xs text-gray-500">{(b.bytes / 1024 / 1024).toFixed(1)}MB</span>
                                </div>
                            ))}
                            {backups.length === 0 && <p className="text-gray-500 text-center py-8">No backups yet</p>}
                        </div>
                    </div>
                )}

                {/* Network */}
                {tab === 'network' && (
                    <div className="space-y-3">
                        {network.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                                <Network className="w-5 h-5 text-primary" />
                                <div><p className="font-medium">{a.ip}:{a.port}</p><p className="text-xs text-gray-500">{a.is_default ? 'Primary' : 'Additional'}</p></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Startup */}
                {tab === 'startup' && (
                    <div>
                        {startup?.data?.map((v: any, i: number) => (
                            <div key={i} className="mb-4">
                                <label className="text-sm text-gray-400 mb-1 block">{v.attributes?.name}</label>
                                <input className="input-field" defaultValue={v.attributes?.server_value || v.attributes?.default_value || ''} aria-label={v.attributes?.name || 'Startup variable'} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Plugins */}
                {tab === 'plugins' && (
                    <div>
                        <div className="flex gap-2 mb-6">
                            <input value={pluginSearch} onChange={(e) => setPluginSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPlugins()} placeholder="Search Modrinth..." className="input-field flex-1" />
                            <button onClick={searchPlugins} className="btn-primary">Search</button>
                        </div>
                        <div className="grid gap-3">
                            {pluginResults.map((p: any) => (
                                <div key={p.project_id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                                    <Puzzle className="w-8 h-8 text-primary flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{p.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{p.description}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">{p.downloads} downloads</span>
                                </div>
                            ))}
                        </div>
                        {installedPlugins.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="font-semibold mb-3">Installed</h3>
                                <div className="space-y-2">
                                    {installedPlugins.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                            <Puzzle className="w-4 h-4 text-green-400" />
                                            <span className="text-sm flex-1">{p.name}</span>
                                            <span className="text-xs text-gray-500">{(p.size / 1024).toFixed(0)}KB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Players */}
                {tab === 'players' && (
                    <div>
                        <div className="flex gap-2 mb-6">
                            <input value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} placeholder="Player name..." className="input-field flex-1" />
                            <button onClick={() => playerAction('whitelist')} className="btn-secondary text-sm px-3">Whitelist</button>
                            <button onClick={() => playerAction('op')} className="btn-secondary text-sm px-3">OP</button>
                            <button onClick={() => playerAction('ban')} className="btn-danger text-sm px-3">Ban</button>
                            <button onClick={() => playerAction('kick')} className="btn-danger text-sm px-3">Kick</button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div><h4 className="text-sm font-medium text-gray-400 mb-2">Whitelist</h4>{whitelist.map((p: any, i: number) => <div key={i} className="text-sm p-2 rounded bg-white/5 mb-1">{p.name || JSON.stringify(p)}</div>)}{whitelist.length === 0 && <p className="text-xs text-gray-600">Empty</p>}</div>
                            <div><h4 className="text-sm font-medium text-gray-400 mb-2">Operators</h4>{ops.map((p: any, i: number) => <div key={i} className="text-sm p-2 rounded bg-white/5 mb-1">{p.name || JSON.stringify(p)}</div>)}{ops.length === 0 && <p className="text-xs text-gray-600">Empty</p>}</div>
                            <div><h4 className="text-sm font-medium text-gray-400 mb-2">Banned</h4>{banned.map((p: any, i: number) => <div key={i} className="text-sm p-2 rounded bg-red-500/10 mb-1">{p.name || JSON.stringify(p)}</div>)}{banned.length === 0 && <p className="text-xs text-gray-600">Empty</p>}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
