'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { plansApi, serversApi } from '@/lib/api';
import { Server, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateServerPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const planId = searchParams.get('plan');

    const [plan, setPlan] = useState<any>(null);
    const [eggs, setEggs] = useState<any[]>([]);
    const [nodes, setNodes] = useState<any[]>([]);
    const [serverName, setServerName] = useState('');
    const [selectedEgg, setSelectedEgg] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!planId) return;
        plansApi.list().then((r) => {
            const found = (r.data || []).find((p: any) => p.id === planId);
            setPlan(found);
        });
        plansApi.eggs().then((r) => setEggs(r.data || [])).catch(() => { });
        plansApi.nodes().then((r) => setNodes(r.data || [])).catch(() => { });
    }, [planId]);

    const createServer = async () => {
        if (!serverName.trim()) return toast.error('Enter a server name');
        if (!selectedEgg) return toast.error('Select a game/egg');
        if (!planId) return toast.error('No plan selected');

        setCreating(true);
        try {
            await serversApi.create({
                name: serverName,
                planId,
                eggId: selectedEgg.id,
                nestId: selectedEgg.nestId,
                nodeId: selectedNode,
            });
            toast.success('Server created! Deploying...');
            router.push('/dashboard/servers');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to create server');
        } finally {
            setCreating(false);
        }
    };

    if (!planId) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400 mb-4">No plan selected</p>
                <button onClick={() => router.push('/dashboard/plans')} className="btn-primary">Browse Plans</button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <h1 className="text-2xl font-display font-bold mb-2">Create Server</h1>
            <p className="text-gray-400 mb-8">
                {plan ? `${plan.name} — ${plan.ram}MB RAM · ${plan.cpu}% CPU · ${plan.disk}MB Disk` : 'Loading plan...'}
            </p>

            <div className="glass-card p-6 space-y-6">
                {/* Server Name */}
                <div>
                    <label htmlFor="server-name" className="text-sm font-medium text-gray-300 mb-2 block">Server Name</label>
                    <input id="server-name" type="text" value={serverName} onChange={(e) => setServerName(e.target.value)}
                        placeholder="My Minecraft Server" className="input-field w-full" maxLength={50} />
                </div>

                {/* Game / Egg Selection */}
                <div>
                    <label className="text-sm font-medium text-gray-300 mb-3 block">Game Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {eggs.map((egg: any) => (
                            <button
                                key={egg.id}
                                onClick={() => setSelectedEgg(egg)}
                                className={`p-4 rounded-xl border text-left transition-all ${selectedEgg?.id === egg.id
                                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <p className="font-medium text-sm">{egg.name}</p>
                                {egg.nestName && <p className="text-xs text-gray-500 mt-1">{egg.nestName}</p>}
                            </button>
                        ))}
                    </div>
                    {eggs.length === 0 && <p className="text-gray-500 text-sm">No eggs available. Contact admin.</p>}
                </div>

                {/* Node Selection (if applicable) */}
                {nodes.length > 0 && plan?.nodeAssignMode !== 'ADMIN_LOCKED' && (
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-3 block">Server Location</label>
                        <div className="grid grid-cols-2 gap-3">
                            {nodes.map((node: any) => (
                                <button
                                    key={node.id}
                                    onClick={() => setSelectedNode(node.id)}
                                    className={`p-4 rounded-xl border text-left transition-all ${selectedNode === node.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <p className="font-medium text-sm">{node.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{node.location_id ? `Location ${node.location_id}` : 'Auto'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Summary</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                        <p>Plan: <span className="text-white">{plan?.name || '...'}</span></p>
                        <p>Game: <span className="text-white">{selectedEgg?.name || 'Not selected'}</span></p>
                        <p>Price: <span className="text-primary font-bold">{plan?.type === 'FREE' ? 'Free' : `₹${plan?.pricePerMonth}/mo`}</span></p>
                    </div>
                </div>

                {/* Create Button */}
                <button
                    onClick={createServer}
                    disabled={creating || !serverName || !selectedEgg}                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Server className="w-4 h-4" /> Deploy Server</>}
                </button>
            </div>
        </div>
    );
}
