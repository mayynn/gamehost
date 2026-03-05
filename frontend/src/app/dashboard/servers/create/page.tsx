'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { plansApi, serversApi } from '@/lib/api';
import { Server, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateServerPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <CreateServerPageInner />
        </Suspense>
    );
}

function CreateServerPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const planId = searchParams.get('plan');
    const customRam = searchParams.get('ram') ? Number(searchParams.get('ram')) : null;
    const customCpu = searchParams.get('cpu') ? Number(searchParams.get('cpu')) : null;
    const customDisk = searchParams.get('disk') ? Number(searchParams.get('disk')) : null;
    const isCustom = customRam !== null || customCpu !== null || customDisk !== null;

    const [plan, setPlan] = useState<any>(null);
    const [eggs, setEggs] = useState<any[]>([]);
    const [nodes, setNodes] = useState<any[]>([]);
    const [serverName, setServerName] = useState('');
    const [selectedEgg, setSelectedEgg] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);
    const [customPrice, setCustomPrice] = useState<number | null>(null);

    useEffect(() => {
        if (!planId) return;
        plansApi.get(planId).then((r) => {
            setPlan(r.data);
            // If custom plan, fetch price for the custom specs
            if (isCustom && r.data) {
                plansApi.calculate({
                    planId,
                    ram: customRam || r.data.ram,
                    cpu: customCpu || r.data.cpu,
                    disk: customDisk || r.data.disk,
                }).then((calc) => {
                    setCustomPrice(calc.data?.price || 0);
                }).catch(() => {});
            }
        }).catch(() => {});
        plansApi.eggs().then((r) => setEggs(r.data || [])).catch(() => { });
        plansApi.nodes().then((r) => setNodes(r.data || [])).catch(() => { });
    }, [planId, isCustom, customRam, customCpu, customDisk]);

    const displayRam = isCustom ? (customRam || plan?.ram || 0) : (plan?.ram || 0);
    const displayCpu = isCustom ? (customCpu || plan?.cpu || 0) : (plan?.cpu || 0);
    const displayDisk = isCustom ? (customDisk || plan?.disk || 0) : (plan?.disk || 0);

    const createServer = async () => {
        if (!serverName.trim()) return toast.error('Enter a server name');
        if (!selectedEgg) return toast.error('Select a game/egg');
        if (!planId) return toast.error('No plan selected');

        setCreating(true);
        try {
            const payload: any = {
                name: serverName,
                planId,
                eggId: selectedEgg.id,
                nestId: selectedEgg.nestId,
                nodeId: selectedNode,
            };

            // Pass custom specs for custom builder
            if (isCustom) {
                if (customRam) payload.ram = customRam;
                if (customCpu) payload.cpu = customCpu;
                if (customDisk) payload.disk = customDisk;
            }

            await serversApi.create(payload);
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
                {plan ? `${plan.name}${isCustom ? ' (Custom)' : ''} — ${displayRam}MB RAM · ${displayCpu}% CPU · ${displayDisk}MB Disk` : 'Loading plan...'}
            </p>

            <div className="glass-card p-6 space-y-6">
                {/* Server Name */}
                <div>
                    <label htmlFor="server-name" className="text-sm font-medium text-gray-300 mb-2 block">Server Name</label>
                    <input id="server-name" type="text" value={serverName} onChange={(e) => setServerName(e.target.value)}
                        placeholder="My Minecraft Server" className="input-field w-full" maxLength={50} />
                    <p className="text-xs text-gray-600 mt-1">{serverName.length}/50 characters — letters, numbers, spaces, hyphens allowed</p>
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
                    {eggs.length === 0 && <div className="col-span-full flex items-center justify-center py-8 text-gray-500"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading game types...</div>}
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
                                    <p className="text-xs text-gray-500 mt-1">{node.locationName || node.location?.short || (node.location_id ? `Location ${node.location_id}` : 'Auto')}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Summary</h4>
                    <div className="text-sm text-gray-400 space-y-1">
                        <p>Plan: <span className="text-white">{plan?.name || '...'}{isCustom ? ' (Custom)' : ''}</span></p>
                        <p>Game: <span className="text-white">{selectedEgg?.name || 'Not selected'}</span></p>
                        <p>RAM: <span className="text-white">{displayRam}MB ({(displayRam / 1024).toFixed(1)}GB)</span></p>
                        <p>CPU: <span className="text-white">{displayCpu}%</span></p>
                        <p>Disk: <span className="text-white">{displayDisk}MB ({(displayDisk / 1024).toFixed(1)}GB)</span></p>
                        <p>Price: <span className="text-primary font-bold">
                            {plan?.type === 'FREE' ? 'Free' : `₹${isCustom && customPrice !== null ? customPrice : plan?.pricePerMonth || 0}/mo`}
                        </span></p>
                    </div>
                </div>

                {/* Create Button */}
                <button
                    onClick={createServer}
                    disabled={creating || !serverName || !selectedEgg}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <><Server className="w-4 h-4" /> Deploy Server</>}
                </button>
            </div>
        </div>
    );
}
