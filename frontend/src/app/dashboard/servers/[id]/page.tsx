'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serversApi, pluginsApi, playersApi } from '@/lib/api';
import {
    Play, Square, RotateCcw, Skull, Terminal, FolderOpen, Database,
    Archive, Network, Settings, Puzzle, Users, AlertTriangle, Loader2,
    Plus, Trash2, Save, Eye, ArrowLeft, RefreshCw, Download, FolderPlus, Edit2,
    Shield, Star, UserX, UserPlus, LogOut, Search, Wifi, WifiOff, X, MessageSquare,
    Cpu, HardDrive, MemoryStick, Copy, Eraser, Power, Info, Tag, FileCode
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
    const router = useRouter();
    const [server, setServer] = useState<any>(null);
    const [tab, setTab] = useState('console');
    const [loading, setLoading] = useState(true);
    const [command, setCommand] = useState('');
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
    const consoleRef = useRef<HTMLDivElement>(null);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [files, setFiles] = useState<any[]>([]);
    const [currentDir, setCurrentDir] = useState('/');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [fileEditContent, setFileEditContent] = useState('');
    const [backups, setBackups] = useState<any[]>([]);
    const [databases, setDatabases] = useState<any[]>([]);
    const [newDbName, setNewDbName] = useState('');
    const [network, setNetwork] = useState<any[]>([]);
    const [startup, setStartup] = useState<any[]>([]);
    const [startupValues, setStartupValues] = useState<Record<string, string>>({});
    const [pluginSearch, setPluginSearch] = useState('');
    const [pluginResults, setPluginResults] = useState<any[]>([]);
    const [pluginSource, setPluginSource] = useState<'modrinth' | 'spiget'>('modrinth');
    const [pluginVersions, setPluginVersions] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
    const [installedPlugins, setInstalledPlugins] = useState<any[]>([]);
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [banned, setBanned] = useState<any[]>([]);
    const [ops, setOps] = useState<any[]>([]);
    const [playerInput, setPlayerInput] = useState('');
    const [onlinePlayers, setOnlinePlayers] = useState<{ count: number; max: number; players: string[] }>({ count: 0, max: 0, players: [] });
    const [playerActionLoading, setPlayerActionLoading] = useState(false);
    const [playersRefreshing, setPlayersRefreshing] = useState(false);
    const [banModal, setBanModal] = useState<{ player: string; reason: string } | null>(null);
    const [kickModal, setKickModal] = useState<{ player: string; reason: string } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFile, setRenamingFile] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [serverSoftware, setServerSoftware] = useState<{ software: string; type: string } | null>(null);
    const [consoleConnected, setConsoleConnected] = useState(false);
    const [consoleAutoScroll, setConsoleAutoScroll] = useState(true);
    const [pluginUpdates, setPluginUpdates] = useState<any[]>([]);
    const [checkingUpdates, setCheckingUpdates] = useState(false);

    const serverId = id as string;

    const loadServer = useCallback(async () => {
        try {
            const { data } = await serversApi.get(serverId);
            setServer(data);
        } catch { toast.error('Failed to load server'); }
        finally { setLoading(false); }
    }, [serverId]);

    useEffect(() => { loadServer(); }, [loadServer]);

    // Auto-detect server software when server loads
    useEffect(() => {
        if (!server?.pteroUuid) return;
        pluginsApi.detect(server.pteroUuid)
            .then((r) => {
                setServerSoftware(r.data);
                // Auto-select Modrinth for mod-based servers (Fabric/Forge) since Spiget only has Bukkit plugins
                if (r.data?.type === 'mod') {
                    setPluginSource('modrinth');
                }
            })
            .catch(() => {});
    }, [server?.pteroUuid]);

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
            setConsoleLogs((prev) => [...prev, `> ${command}`]);
            setCommandHistory((prev) => [command, ...prev.slice(0, 49)]);
            setHistoryIndex(-1);
            setCommand('');
            // Scroll console to bottom
            setTimeout(() => {
                if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
            }, 100);
        } catch { toast.error('Failed to send command'); }
    };

    const handleCommandKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') sendCommand();
        if (e.key === 'ArrowUp' && commandHistory.length > 0) {
            e.preventDefault();
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setCommand(commandHistory[newIndex]);
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex <= 0) { setHistoryIndex(-1); setCommand(''); }
            else { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setCommand(commandHistory[newIndex]); }
        }
    };

    // Poll console logs when on console tab
    useEffect(() => {
        if (tab !== 'console' || !server?.pteroUuid) return;
        const fetchConsole = async () => {
            try {
                const { data } = await serversApi.console(serverId);
                if (data?.logs && Array.isArray(data.logs)) {
                    setConsoleLogs(data.logs);
                    setConsoleConnected(true);
                } else if (data?.token) {
                    setConsoleConnected(true);
                    setConsoleLogs((prev) => prev.length === 0 ? ['[Console connected - use commands below]'] : prev);
                }
            } catch {
                setConsoleConnected(false);
            }
        };
        fetchConsole();
        const interval = setInterval(fetchConsole, 5000);
        return () => clearInterval(interval);
    }, [tab, server?.pteroUuid, serverId]);

    // Auto-scroll console when new logs arrive
    useEffect(() => {
        if (consoleAutoScroll && consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleLogs, consoleAutoScroll]);

    const openFile = async (file: any) => {
        if (!file.is_file) return loadFiles(`${currentDir}/${file.name}`.replace('//', '/'));
        if (file.size > 512 * 1024) return toast.error('File too large to view (max 512KB)');
        try {
            const { data } = await serversApi.readFile(serverId, `${currentDir}/${file.name}`.replace('//', '/'));
            setFileContent(typeof data === 'string' ? data : data?.content || JSON.stringify(data, null, 2));
            setEditingFile(`${currentDir}/${file.name}`.replace('//', '/'));
            setFileEditContent(typeof data === 'string' ? data : data?.content || '');
        } catch { toast.error('Failed to read file'); }
    };

    const saveFile = async () => {
        if (!editingFile) return;
        try {
            await serversApi.writeFile(serverId, editingFile, fileEditContent);
            toast.success('File saved');
        } catch { toast.error('Failed to save file'); }
    };

    const createDatabase = async () => {
        if (!newDbName.trim()) return toast.error('Enter database name');
        try {
            await serversApi.createDb(serverId, newDbName);
            toast.success('Database created');
            setNewDbName('');
            loadTabData('databases');
        } catch { toast.error('Failed to create database'); }
    };

    const saveStartupVariable = async (key: string, value: string) => {
        try {
            await serversApi.updateStartup(serverId, key, value);
            toast.success(`Updated ${key}`);
        } catch { toast.error('Failed to update variable'); }
    };

    const deleteServer = async () => {
        if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) return;
        setDeleting(true);
        try {
            await serversApi.delete(serverId);
            toast.success('Server deleted');
            router.push('/dashboard/servers');
        } catch { toast.error('Failed to delete server'); }
        finally { setDeleting(false); }
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
                    setPlayersRefreshing(true);
                    try {
                        const [w, b, o] = await Promise.all([
                            playersApi.whitelist(server.pteroUuid),
                            playersApi.banned(server.pteroUuid),
                            playersApi.ops(server.pteroUuid),
                        ]);
                        setWhitelist(w.data || []);
                        setBanned(b.data || []);
                        setOps(o.data || []);
                        // Fetch online players in background (reads log file, may be slow)
                        playersApi.online(server.pteroUuid).then((r) => {
                            setOnlinePlayers(r.data || { count: 0, max: 0, players: [] });
                        }).catch(() => { });
                    } finally {
                        setPlayersRefreshing(false);
                    }
                    break;
                }
            }
        } catch { }
    };

    const searchPlugins = async () => {
        if (!pluginSearch.trim()) return;
        setSelectedProject(null);
        setPluginVersions([]);
        try {
            if (pluginSource === 'modrinth') {
                // Pass detected server software as loader filter for relevant results
                const loaders = serverSoftware?.software && serverSoftware.software !== 'unknown'
                    ? [serverSoftware.software]
                    : undefined;
                const { data } = await pluginsApi.modrinthSearch(pluginSearch, 20, 0, loaders);
                setPluginResults(data?.hits || []);
            } else {
                const { data } = await pluginsApi.spigetSearch(pluginSearch);
                setPluginResults(data || []);
            }
        } catch { toast.error('Search failed'); }
    };

    const viewModrinthVersions = async (project: any) => {
        setSelectedProject(project);
        try {
            // Pass detected server software as loader filter for compatible versions
            const loaders = serverSoftware?.software && serverSoftware.software !== 'unknown'
                ? [serverSoftware.software]
                : undefined;
            const { data } = await pluginsApi.modrinthVersions(project.project_id, loaders);
            setPluginVersions(data || []);
        } catch { toast.error('Failed to load versions'); }
    };

    const installModrinthVersion = async (versionId: string) => {
        if (!server?.pteroUuid) return;
        const projectId = selectedProject?.project_id;
        if (!projectId) return;
        setInstallingPlugin(versionId);
        try {
            await pluginsApi.modrinthInstall(server.pteroUuid, projectId, versionId);
            toast.success('Plugin installed! Restart your server.');
            loadTabData('plugins');
        } catch { toast.error('Install failed'); }
        finally { setInstallingPlugin(null); }
    };

    const installSpigetResource = async (resourceId: number) => {
        if (!server?.pteroUuid) return;
        setInstallingPlugin(String(resourceId));
        try {
            await pluginsApi.spigetInstall(server.pteroUuid, resourceId);
            toast.success('Plugin installed! Restart your server.');
            loadTabData('plugins');
        } catch { toast.error('Install failed'); }
        finally { setInstallingPlugin(null); }
    };

    const removePlugin = async (fileName: string) => {
        if (!server?.pteroUuid) return;
        if (!confirm(`Remove ${fileName}?`)) return;
        try {
            await pluginsApi.remove(server.pteroUuid, fileName);
            toast.success('Plugin removed');
            loadTabData('plugins');
        } catch { toast.error('Failed to remove plugin'); }
    };

    const deleteBackup = async (backupId: string) => {
        if (!confirm('Delete this backup?')) return;
        try {
            await serversApi.deleteBackup(serverId, backupId);
            toast.success('Backup deleted');
            loadTabData('backups');
        } catch { toast.error('Failed to delete backup'); }
    };

    const downloadBackup = async (backupId: string) => {
        try {
            const { data } = await serversApi.downloadBackup(serverId, backupId);
            if (data?.url) window.open(data.url, '_blank');
            else toast.error('No download URL');
        } catch { toast.error('Failed to get download link'); }
    };

    const deleteDb = async (dbId: string) => {
        if (!confirm('Delete this database? This cannot be undone.')) return;
        try {
            await serversApi.deleteDb(serverId, dbId);
            toast.success('Database deleted');
            loadTabData('databases');
        } catch { toast.error('Failed to delete database'); }
    };

    const deleteFileAction = async (fileName: string, isFile: boolean) => {
        if (!confirm(`Delete ${fileName}?`)) return;
        try {
            await serversApi.deleteFiles(serverId, currentDir, [fileName]);
            toast.success('Deleted');
            loadFiles(currentDir);
        } catch { toast.error('Failed to delete'); }
    };

    const renameFileAction = async (oldName: string) => {
        if (!renameValue.trim() || renameValue === oldName) {
            setRenamingFile(null);
            return;
        }
        try {
            await serversApi.renameFile(serverId, currentDir, oldName, renameValue);
            toast.success('Renamed');
            setRenamingFile(null);
            loadFiles(currentDir);
        } catch { toast.error('Failed to rename'); }
    };

    const createFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await serversApi.createFolder(serverId, currentDir, newFolderName);
            toast.success('Folder created');
            setNewFolderName('');
            loadFiles(currentDir);
        } catch { toast.error('Failed to create folder'); }
    };

    const playerAction = async (action: string, targetPlayer?: string, reason?: string) => {
        const name = targetPlayer || playerInput.trim();
        if (!name || !server?.pteroUuid) return;
        setPlayerActionLoading(true);
        try {
            switch (action) {
                case 'whitelist': await playersApi.addWhitelist(server.pteroUuid, name); break;
                case 'ban': await playersApi.ban(server.pteroUuid, name, reason); break;
                case 'op': await playersApi.op(server.pteroUuid, name); break;
                case 'kick': await playersApi.kick(server.pteroUuid, name, reason); break;
            }
            toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)}: ${name}`);
            setPlayerInput('');
            setBanModal(null);
            setKickModal(null);
            // Reload player lists
            const [w, b, o] = await Promise.all([
                playersApi.whitelist(server.pteroUuid),
                playersApi.banned(server.pteroUuid),
                playersApi.ops(server.pteroUuid),
            ]);
            setWhitelist(w.data || []);
            setBanned(b.data || []);
            setOps(o.data || []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || `${action} failed`);
        } finally {
            setPlayerActionLoading(false);
        }
    };

    const openBanModal = () => {
        const name = playerInput.trim();
        if (!name) return toast.error('Enter a player name first');
        setBanModal({ player: name, reason: '' });
    };

    const openKickModal = () => {
        const name = playerInput.trim();
        if (!name) return toast.error('Enter a player name first');
        setKickModal({ player: name, reason: '' });
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!server) return <div className="text-center py-20 text-gray-400">Server not found</div>;

    const isSuspended = server.status === 'SUSPENDED';

    return (
        <div className="relative">
            {/* Suspension Overlay */}
            {isSuspended && (
                <div className="absolute inset-0 z-40 bg-dark/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="glass-card p-8 max-w-md text-center">
                        <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Server Suspended</h2>
                        <p className="text-gray-400 mb-4">This server has been suspended due to payment issues. Please renew to restore access.</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => router.back()} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">Go Back</button>
                            <a href="/dashboard/billing" className="btn-primary">Go to Billing</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-display font-bold">{server.name}</h1>
                        {serverSoftware && serverSoftware.software !== 'unknown' && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                                serverSoftware.software === 'paper' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                serverSoftware.software === 'spigot' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                serverSoftware.software === 'fabric' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                serverSoftware.software === 'forge' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                serverSoftware.software === 'velocity' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-white/10 text-gray-300 border border-white/10'
                            }`}>
                                <FileCode className="w-3 h-3" />
                                {serverSoftware.software.charAt(0).toUpperCase() + serverSoftware.software.slice(1)}
                                <span className="text-[10px] opacity-60">({serverSoftware.type})</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1"><MemoryStick className="w-3.5 h-3.5" /> {server.ram}MB</span>
                        <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {server.cpu}%</span>
                        <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {server.disk}MB</span>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => powerAction('start')} className="p-2.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors" title="Start"><Play className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('restart')} className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Restart"><RotateCcw className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('stop')} className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors" title="Stop"><Square className="w-5 h-5" /></button>
                    <button onClick={() => powerAction('kill')} className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Kill"><Skull className="w-5 h-5" /></button>
                    <div className="w-px bg-white/10 mx-1" />
                    <button onClick={deleteServer} disabled={deleting} className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete server">
                        {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
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
                        {/* Console Header Bar */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${consoleConnected ? 'bg-green-400 shadow-lg shadow-green-400/40' : 'bg-red-400'}`} />
                                <span className="text-xs text-gray-400">{consoleConnected ? 'Connected' : 'Disconnected'}</span>
                                <span className="text-xs text-gray-600">· Polling every 5s</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(consoleLogs.join('\n'));
                                        toast.success('Console copied to clipboard');
                                    }}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Copy console"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setConsoleLogs([])}
                                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Clear console"
                                >
                                    <Eraser className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setConsoleAutoScroll(!consoleAutoScroll)}
                                    className={`p-1.5 rounded-lg transition-colors ${consoleAutoScroll ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                                    title={consoleAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 rotate-[-90deg]" />
                                </button>
                            </div>
                        </div>
                        <div
                            ref={consoleRef}
                            className="bg-black/60 rounded-xl p-4 h-[400px] overflow-y-auto mb-4 font-mono text-xs leading-relaxed border border-white/5"
                            onScroll={() => {
                                if (!consoleRef.current) return;
                                const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
                                setConsoleAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
                            }}
                        >
                            {consoleLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <Terminal className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm">Waiting for console output...</p>
                                    <p className="text-xs mt-1 text-gray-600">Console polls every 5 seconds. Use commands below to interact.</p>
                                </div>
                            ) : (
                                consoleLogs.map((line, i) => {
                                    // Strip ANSI escape codes for clean display
                                    const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
                                    const isCmd = clean.startsWith('>');
                                    const isError = /\b(ERROR|SEVERE|FATAL)\b/i.test(clean);
                                    const isWarn = /\b(WARN|WARNING)\b/i.test(clean);
                                    const isInfo = /\b(INFO)\b/i.test(clean);
                                    return (
                                        <p key={i} className={`whitespace-pre-wrap break-all py-px ${
                                            isCmd ? 'text-primary font-medium' :
                                            isError ? 'text-red-400' :
                                            isWarn ? 'text-orange-400' :
                                            isInfo ? 'text-green-400/80' :
                                            'text-gray-300'
                                        }`}>
                                            {clean}
                                        </p>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    onKeyDown={handleCommandKeyDown}
                                    placeholder="Type a command... (↑/↓ for history)"
                                    className="input-field w-full pl-10 font-mono text-sm"
                                />
                            </div>
                            <button onClick={sendCommand} className="btn-primary px-6">Send</button>
                        </div>
                        {commandHistory.length > 0 && (
                            <p className="text-xs text-gray-600 mt-2">History: {commandHistory.length} command{commandHistory.length !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                )}

                {/* Files */}
                {tab === 'files' && (
                    <div>
                        {editingFile ? (
                            /* File Editor */
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setEditingFile(null); setFileContent(null); }} className="text-gray-400 hover:text-white transition-colors">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm text-primary font-mono">{editingFile}</span>
                                    </div>
                                    <button onClick={saveFile} className="btn-primary text-sm flex items-center gap-2">
                                        <Save className="w-4 h-4" /> Save
                                    </button>
                                </div>
                                <textarea
                                    value={fileEditContent}
                                    onChange={(e) => setFileEditContent(e.target.value)}
                                    className="w-full h-96 bg-black/50 rounded-xl p-4 font-mono text-sm text-green-400 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    spellCheck={false}
                                />
                            </div>
                        ) : (
                            /* File Browser */
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-gray-400">
                                        Path: <span className="text-primary font-mono">{currentDir}</span>
                                        {currentDir !== '/' && (
                                            <button onClick={() => loadFiles(currentDir.split('/').slice(0, -1).join('/') || '/')} className="ml-2 text-primary hover:underline">← Back</button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => loadFiles(currentDir)} className="p-2 text-gray-400 hover:text-white transition-colors" title="Refresh">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Create folder */}
                                <div className="flex gap-2 mb-4">
                                    <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="New folder name..." className="input-field flex-1 text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && createFolder()} />
                                    <button onClick={createFolder} className="btn-secondary text-sm flex items-center gap-1.5">
                                        <FolderPlus className="w-4 h-4" /> Create
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {files.map((f: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                                            <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => openFile(f)}>
                                                <FolderOpen className={`w-4 h-4 ${f.is_file ? 'text-gray-500' : 'text-primary'}`} />
                                                {renamingFile === f.name ? (
                                                    <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') renameFileAction(f.name); if (e.key === 'Escape') setRenamingFile(null); }}
                                                        onBlur={() => renameFileAction(f.name)}
                                                        className="input-field text-sm py-1 px-2 flex-1" autoFocus
                                                        onClick={(e) => e.stopPropagation()} />
                                                ) : (
                                                    <span className="flex-1 text-sm">{f.name}</span>
                                                )}
                                                <span className="text-xs text-gray-500">{f.is_file ? `${(f.size / 1024).toFixed(1)}KB` : 'DIR'}</span>
                                            </div>
                                            <div className="hidden group-hover:flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setRenamingFile(f.name); setRenameValue(f.name); }}
                                                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors" title="Rename">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteFileAction(f.name, f.is_file); }}
                                                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {files.length === 0 && <p className="text-gray-500 text-center py-8">Empty directory</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Databases */}
                {tab === 'databases' && (
                    <div>
                        <div className="flex gap-2 mb-4">
                            <input value={newDbName} onChange={(e) => setNewDbName(e.target.value)}
                                placeholder="Database name..." className="input-field flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && createDatabase()} />
                            <button onClick={createDatabase} className="btn-primary flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Create
                            </button>
                        </div>
                        <div className="space-y-3">
                            {databases.map((db: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                                    <Database className="w-5 h-5 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-medium">{db.name}</p>
                                        <p className="text-xs text-gray-500">{db.host}:{db.port} · User: {db.username || 'N/A'}</p>
                                    </div>
                                    <button onClick={() => deleteDb(db.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {databases.length === 0 && <p className="text-gray-500 text-center py-8">No databases — create one above</p>}
                        </div>
                    </div>
                )}

                {/* Backups */}
                {tab === 'backups' && (
                    <div>
                        <button onClick={async () => { try { await serversApi.createBackup(serverId); toast.success('Backup created'); loadTabData('backups'); } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create backup'); } }} className="btn-primary mb-4">Create Backup</button>
                        <div className="space-y-3">
                            {backups.map((b: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                                    <Archive className="w-5 h-5 text-primary" />
                                    <div className="flex-1"><p className="font-medium">{b.name}</p><p className="text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</p></div>
                                    <span className="text-xs text-gray-500">{(b.bytes / 1024 / 1024).toFixed(1)}MB</span>
                                    <button onClick={() => downloadBackup(b.uuid)} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Download">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteBackup(b.uuid)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                        {startup?.map((v: any, i: number) => {
                            const envKey = v.env_variable;
                            const currentValue = startupValues[envKey] ?? v.server_value ?? v.default_value ?? '';
                            return (
                                <div key={i} className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-sm text-gray-400">{v.name}</label>
                                        <span className="text-xs text-gray-600 font-mono">{envKey}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            className="input-field flex-1"
                                            value={currentValue}
                                            onChange={(e) => setStartupValues((prev) => ({ ...prev, [envKey]: e.target.value }))}
                                            aria-label={v.name || 'Startup variable'}
                                        />
                                        <button
                                            onClick={() => saveStartupVariable(envKey, currentValue)}
                                            className="p-2.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                            title="Save"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {v.description && (
                                        <p className="text-xs text-gray-600 mt-1">{v.description}</p>
                                    )}
                                </div>
                            );
                        })}
                        {(!startup || startup.length === 0) && <p className="text-gray-500 text-center py-8">No startup variables</p>}
                    </div>
                )}

                {/* Plugins */}
                {tab === 'plugins' && (
                    <div>
                        {/* Server Software Info */}
                        {serverSoftware && (
                            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm text-gray-400">
                                    Detected server software: <strong className="text-white">{serverSoftware.software !== 'unknown' ? serverSoftware.software.charAt(0).toUpperCase() + serverSoftware.software.slice(1) : 'Unknown'}</strong>
                                    {serverSoftware.software !== 'unknown' && (
                                        <span className="text-gray-500"> — installing to <code className="text-primary/80 bg-primary/5 px-1 py-0.5 rounded text-xs">/{serverSoftware.type === 'mod' ? 'mods' : 'plugins'}/</code></span>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Installed plugins (show at top for visibility) */}
                        {installedPlugins.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Puzzle className="w-4 h-4 text-green-400" />
                                        Installed ({installedPlugins.length})
                                    </h3>
                                    <button
                                        onClick={async () => {
                                            if (!server?.pteroUuid) return;
                                            setCheckingUpdates(true);
                                            try {
                                                const { data } = await pluginsApi.checkUpdates(server.pteroUuid);
                                                setPluginUpdates(data || []);
                                                toast.success(`Found info for ${(data || []).length} plugins`);
                                            } catch { toast.error('Failed to check updates'); }
                                            finally { setCheckingUpdates(false); }
                                        }}
                                        disabled={checkingUpdates}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                                    >
                                        {checkingUpdates ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        {checkingUpdates ? 'Checking...' : 'Check Updates'}
                                    </button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {installedPlugins.map((p: any, i: number) => {
                                        const update = pluginUpdates.find((u: any) => u.fileName === p.name);
                                        return (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 group">
                                            {update?.iconUrl ? (
                                                <img src={update.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                            ) : (
                                                <Puzzle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium truncate block">{update?.title || p.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {(p.size / 1024).toFixed(0)}KB
                                                    {update?.downloads && <span className="ml-2">{update.downloads.toLocaleString()} downloads</span>}
                                                    {update?.source && <span className="ml-1 text-gray-600">· {update.source}</span>}
                                                </span>
                                            </div>
                                            <button onClick={() => removePlugin(p.name)}
                                                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Remove">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Divider if installed plugins shown */}
                        {installedPlugins.length > 0 && <div className="border-t border-white/10 mb-6" />}

                        {/* Source Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => { setPluginSource('modrinth'); setPluginResults([]); setSelectedProject(null); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${pluginSource === 'modrinth' ? 'bg-green-500/10 text-green-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                Modrinth
                            </button>
                            <button onClick={() => { setPluginSource('spiget'); setPluginResults([]); setSelectedProject(null); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${pluginSource === 'spiget' ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                SpigotMC
                            </button>
                        </div>

                        {/* Warning for mod-based servers using Spiget */}
                        {pluginSource === 'spiget' && serverSoftware?.type === 'mod' && (
                            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                <span className="text-xs text-yellow-400">SpigotMC only has Bukkit/Spigot plugins. Your server uses <strong>{serverSoftware.software}</strong> — use Modrinth for compatible mods.</span>
                            </div>
                        )}

                        {/* Search */}
                        <div className="flex gap-2 mb-6">
                            <input value={pluginSearch} onChange={(e) => setPluginSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchPlugins()}
                                placeholder={`Search ${pluginSource === 'modrinth' ? 'Modrinth' : 'SpigotMC'}...`}
                                className="input-field flex-1" />
                            <button onClick={searchPlugins} className="btn-primary">Search</button>
                        </div>

                        {/* Modrinth Version Selector */}
                        {selectedProject && pluginSource === 'modrinth' && (
                            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold">{selectedProject.title}</h4>
                                        <p className="text-xs text-gray-500">{selectedProject.description}</p>
                                    </div>
                                    <button onClick={() => { setSelectedProject(null); setPluginVersions([]); }} className="text-gray-400 hover:text-white text-sm">✕ Close</button>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">Select version to install:</p>
                                <div className="max-h-48 overflow-y-auto space-y-1.5">
                                    {pluginVersions.map((v: any) => (
                                        <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                            <div>
                                                <span className="text-sm font-medium">{v.version_number}</span>
                                                <span className="text-xs text-gray-500 ml-2">{v.loaders?.join(', ')}</span>
                                                <span className="text-xs text-gray-600 ml-2">{v.game_versions?.slice(0, 3).join(', ')}</span>
                                            </div>
                                            <button
                                                onClick={() => installModrinthVersion(v.id)}
                                                disabled={installingPlugin === v.id}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {installingPlugin === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Install'}
                                            </button>
                                        </div>
                                    ))}
                                    {pluginVersions.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Loading versions...</p>}
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        <div className="grid gap-3">
                            {pluginSource === 'modrinth' ? (
                                pluginResults.map((p: any) => (
                                    <div key={p.project_id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                                        {p.icon_url ? (
                                            <img src={p.icon_url} alt="" className="w-10 h-10 rounded-lg" />
                                        ) : (
                                            <Puzzle className="w-10 h-10 text-primary flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{p.title}</p>
                                            <p className="text-xs text-gray-500 truncate">{p.description}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{(p.downloads || 0).toLocaleString()}</span>
                                        <button onClick={() => viewModrinthVersions(p)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap">
                                            Versions
                                        </button>
                                    </div>
                                ))
                            ) : (
                                pluginResults.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                                        {p.icon?.url ? (
                                            <img src={`https://api.spiget.org/v2/${p.icon.url}`} alt="" className="w-10 h-10 rounded-lg" />
                                        ) : (
                                            <Puzzle className="w-10 h-10 text-orange-400 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{p.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{p.tag}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">{(p.downloads || 0).toLocaleString()}</span>
                                        {p.premium ? (
                                            <span className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 whitespace-nowrap">Premium</span>
                                        ) : p.external ? (
                                            <span className="text-xs px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 whitespace-nowrap cursor-help" title="External resource — must be downloaded manually">External</span>
                                        ) : (
                                        <button onClick={() => installSpigetResource(p.id)}
                                            disabled={installingPlugin === String(p.id)}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors whitespace-nowrap disabled:opacity-50">
                                            {installingPlugin === String(p.id) ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Install'}
                                        </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* No search results state */}
                        {pluginSearch.trim() && pluginResults.length === 0 && (
                            <div className="text-center py-8">
                                <Search className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                                <p className="text-gray-500 text-sm">No results found for &quot;{pluginSearch}&quot;</p>
                                <p className="text-xs text-gray-600 mt-1">Try different keywords or switch to {pluginSource === 'modrinth' ? 'SpigotMC' : 'Modrinth'}</p>
                            </div>
                        )}

                        {/* Initial state when no search */}
                        {!pluginSearch.trim() && pluginResults.length === 0 && installedPlugins.length === 0 && (
                            <div className="text-center py-12">
                                <Puzzle className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-50" />
                                <p className="text-gray-400 font-medium">Search for plugins to install</p>
                                <p className="text-sm text-gray-600 mt-1">Browse thousands of {serverSoftware?.type === 'mod' ? 'mods' : 'plugins'} from Modrinth and SpigotMC</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Players */}
                {tab === 'players' && (
                    <div className="space-y-6">
                        {/* Ban Modal */}
                        {banModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)}>
                                <div className="glass-card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <UserX className="w-5 h-5 text-red-400" /> Ban Player
                                        </h3>
                                        <button onClick={() => setBanModal(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
                                        <img src={`https://mc-heads.net/avatar/${banModal.player}/32`} alt="" className="w-8 h-8 rounded" />
                                        <span className="font-medium">{banModal.player}</span>
                                    </div>
                                    <label className="text-sm text-gray-400 mb-1 block">Ban Reason (optional)</label>
                                    <input
                                        value={banModal.reason}
                                        onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                                        placeholder="e.g. Griefing, Hacking..."
                                        className="input-field w-full mb-4"
                                        onKeyDown={(e) => e.key === 'Enter' && playerAction('ban', banModal.player, banModal.reason)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setBanModal(null)} className="btn-secondary text-sm px-4">Cancel</button>
                                        <button
                                            onClick={() => playerAction('ban', banModal.player, banModal.reason)}
                                            disabled={playerActionLoading}
                                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {playerActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                                            Ban Player
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Kick Modal */}
                        {kickModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setKickModal(null)}>
                                <div className="glass-card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <LogOut className="w-5 h-5 text-orange-400" /> Kick Player
                                        </h3>
                                        <button onClick={() => setKickModal(null)} className="p-1 rounded hover:bg-white/10 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-white/5">
                                        <img src={`https://mc-heads.net/avatar/${kickModal.player}/32`} alt="" className="w-8 h-8 rounded" />
                                        <span className="font-medium">{kickModal.player}</span>
                                    </div>
                                    <label className="text-sm text-gray-400 mb-1 block">Kick Reason (optional)</label>
                                    <input
                                        value={kickModal.reason}
                                        onChange={(e) => setKickModal({ ...kickModal, reason: e.target.value })}
                                        placeholder="e.g. AFK, Breaking rules..."
                                        className="input-field w-full mb-4"
                                        onKeyDown={(e) => e.key === 'Enter' && playerAction('kick', kickModal.player, kickModal.reason)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setKickModal(null)} className="btn-secondary text-sm px-4">Cancel</button>
                                        <button
                                            onClick={() => playerAction('kick', kickModal.player, kickModal.reason)}
                                            disabled={playerActionLoading}
                                            className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {playerActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                            Kick Player
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Online Players Section */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="flex items-center gap-2 font-semibold">
                                    {onlinePlayers.count > 0 ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-gray-500" />}
                                    Online Players
                                    {onlinePlayers.max > 0 && (
                                        <span className="text-sm font-normal text-gray-400">({onlinePlayers.count}/{onlinePlayers.max})</span>
                                    )}
                                </h3>
                                <button
                                    onClick={() => {
                                        if (!server?.pteroUuid) return;
                                        playersApi.online(server.pteroUuid).then((r) => {
                                            setOnlinePlayers(r.data || { count: 0, max: 0, players: [] });
                                            toast.success('Refreshed online players');
                                        }).catch(() => toast.error('Failed to fetch online players'));
                                    }}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Refresh online players"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {onlinePlayers.players.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {onlinePlayers.players.map((name) => (
                                        <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <img src={`https://mc-heads.net/avatar/${name}/24`} alt="" className="w-6 h-6 rounded" />
                                            <span className="text-sm font-medium text-green-300">{name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No players online or server is offline. Click refresh to check.</p>
                            )}
                        </div>

                        {/* Player Actions Bar */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                            <h3 className="flex items-center gap-2 font-semibold mb-3">
                                <UserPlus className="w-4 h-4 text-primary" />
                                Player Actions
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        value={playerInput}
                                        onChange={(e) => setPlayerInput(e.target.value)}
                                        placeholder="Enter player name..."
                                        className="input-field w-full pl-10"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && playerInput.trim()) playerAction('whitelist');
                                        }}
                                        disabled={playerActionLoading}
                                    />
                                </div>
                                <button
                                    onClick={() => playerAction('whitelist')}
                                    disabled={playerActionLoading || !playerInput.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Shield className="w-4 h-4" /> Whitelist
                                </button>
                                <button
                                    onClick={() => playerAction('op')}
                                    disabled={playerActionLoading || !playerInput.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <Star className="w-4 h-4" /> OP
                                </button>
                                <button
                                    onClick={openBanModal}
                                    disabled={playerActionLoading || !playerInput.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <UserX className="w-4 h-4" /> Ban
                                </button>
                                <button
                                    onClick={openKickModal}
                                    disabled={playerActionLoading || !playerInput.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    <LogOut className="w-4 h-4" /> Kick
                                </button>
                            </div>
                            {playerActionLoading && (
                                <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                                </div>
                            )}
                        </div>

                        {/* Player Lists Grid */}
                        <div className="grid md:grid-cols-3 gap-4">
                            {/* Whitelist */}
                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-blue-500/5 border-b border-white/10">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                                        <Shield className="w-4 h-4 text-blue-400" />
                                        <span>Whitelist</span>
                                        <span className="text-xs font-normal text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{whitelist.length}</span>
                                    </h4>
                                    {playersRefreshing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                                </div>
                                <div className="p-2 max-h-64 overflow-y-auto">
                                    {whitelist.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                            <img src={`https://mc-heads.net/avatar/${p.name}/24`} alt="" className="w-6 h-6 rounded flex-shrink-0" />
                                            <span className="text-sm flex-1 truncate">{p.name || JSON.stringify(p)}</span>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await playersApi.removeWhitelist(server.pteroUuid, p.name);
                                                        toast.success(`Removed ${p.name} from whitelist`);
                                                        setWhitelist((prev) => prev.filter((_, idx) => idx !== i));
                                                    } catch { toast.error(`Failed to remove ${p.name}`); }
                                                }}
                                                className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove from whitelist"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {whitelist.length === 0 && (
                                        <div className="flex flex-col items-center py-6 text-gray-600">
                                            <Shield className="w-8 h-8 mb-2 opacity-30" />
                                            <span className="text-xs">No whitelisted players</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Operators */}
                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-yellow-500/5 border-b border-white/10">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                                        <Star className="w-4 h-4 text-yellow-400" />
                                        <span>Operators</span>
                                        <span className="text-xs font-normal text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{ops.length}</span>
                                    </h4>
                                    {playersRefreshing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                                </div>
                                <div className="p-2 max-h-64 overflow-y-auto">
                                    {ops.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                                            <img src={`https://mc-heads.net/avatar/${p.name}/24`} alt="" className="w-6 h-6 rounded flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm truncate block">{p.name || JSON.stringify(p)}</span>
                                                {p.level && <span className="text-xs text-yellow-500/60">Level {p.level}</span>}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await playersApi.deop(server.pteroUuid, p.name);
                                                        toast.success(`Removed OP from ${p.name}`);
                                                        setOps((prev) => prev.filter((_, idx) => idx !== i));
                                                    } catch { toast.error(`Failed to deop ${p.name}`); }
                                                }}
                                                className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove OP"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {ops.length === 0 && (
                                        <div className="flex flex-col items-center py-6 text-gray-600">
                                            <Star className="w-8 h-8 mb-2 opacity-30" />
                                            <span className="text-xs">No operators</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Banned */}
                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 bg-red-500/5 border-b border-white/10">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                                        <UserX className="w-4 h-4 text-red-400" />
                                        <span>Banned</span>
                                        <span className="text-xs font-normal text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">{banned.length}</span>
                                    </h4>
                                    {playersRefreshing && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
                                </div>
                                <div className="p-2 max-h-64 overflow-y-auto">
                                    {banned.map((p: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors group">
                                            <img src={`https://mc-heads.net/avatar/${p.name}/24`} alt="" className="w-6 h-6 rounded flex-shrink-0 opacity-60" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm truncate block text-red-300">{p.name || JSON.stringify(p)}</span>
                                                {p.reason && p.reason !== 'Banned by an operator.' && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MessageSquare className="w-3 h-3" /> {p.reason}
                                                    </span>
                                                )}
                                                {p.created && (
                                                    <span className="text-xs text-gray-600">{new Date(p.created).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await playersApi.unban(server.pteroUuid, p.name);
                                                        toast.success(`Unbanned ${p.name}`);
                                                        setBanned((prev) => prev.filter((_, idx) => idx !== i));
                                                    } catch { toast.error(`Failed to unban ${p.name}`); }
                                                }}
                                                className="p-1.5 rounded text-gray-600 hover:text-green-400 hover:bg-green-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Unban player"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {banned.length === 0 && (
                                        <div className="flex flex-col items-center py-6 text-gray-600">
                                            <UserX className="w-8 h-8 mb-2 opacity-30" />
                                            <span className="text-xs">No banned players</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Refresh All */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => loadTabData('players')}
                                disabled={playersRefreshing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${playersRefreshing ? 'animate-spin' : ''}`} />
                                Refresh All Lists
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
