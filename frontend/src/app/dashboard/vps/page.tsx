'use client';

import { useState, useEffect } from 'react';
import { vpsApi } from '@/lib/api';
import { Server, Plus, Power, Square, Trash2, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VpsPage() {
    const [vpsList, setVpsList] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('');

    useEffect(() => {
        Promise.all([
            vpsApi.list().then((r) => setVpsList(r.data || [])),
            vpsApi.plans().then((r) => setPlans(r.data || [])),
        ]).finally(() => setLoading(false));
    }, []);

    const createVps = async () => {
        if (!selectedPlan) return toast.error('Select a plan');
        try {
            await vpsApi.create({ planId: selectedPlan });
            toast.success('VPS provisioning started');
            setShowCreate(false);
            vpsApi.list().then((r) => setVpsList(r.data || []));
        } catch { toast.error('Failed to create VPS'); }
    };

    const powerAction = async (id: string, action: string) => {
        try {
            await vpsApi.power(id, action);
            toast.success(`${action} sent`);
        } catch { toast.error('Action failed'); }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-display font-bold">VPS Hosting</h1>
                    <p className="text-gray-400 mt-1">Manage your virtual private servers</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New VPS
                </button>
            </div>

            {/* Create VPS */}
            {showCreate && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="font-semibold mb-4">Deploy New VPS</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        {plans.map((plan: any) => (
                            <button key={plan.id || plan.name}
                                onClick={() => setSelectedPlan(plan.id || plan.name)}
                                className={`p-4 rounded-xl border text-left transition-all ${selectedPlan === (plan.id || plan.name)
                                        ? 'border-primary bg-primary/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}>
                                <p className="font-semibold">{plan.name}</p>
                                <p className="text-sm text-gray-400 mt-1">{plan.ram || plan.memory}MB RAM · {plan.cpu} CPU · {plan.disk}GB Disk</p>
                                <p className="text-primary font-bold mt-2">₹{plan.price}/mo</p>
                            </button>
                        ))}
                    </div>
                    <button onClick={createVps} className="btn-primary">Deploy VPS</button>
                </div>
            )}

            {/* VPS List */}
            {vpsList.length === 0 ? (
                <div className="glass-card p-16 text-center">
                    <Server className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold mb-2">No VPS instances</h3>
                    <p className="text-gray-400 mb-6">Deploy your first VPS server</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary">Browse Plans</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {vpsList.map((vps: any) => (
                        <div key={vps.id} className="glass-card p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-3 h-3 rounded-full ${vps.status === 'ACTIVE' ? 'bg-green-400 shadow-lg shadow-green-400/30' :
                                        vps.status === 'PROVISIONING' ? 'bg-blue-400 animate-pulse' : 'bg-red-400'
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold">{vps.hostname || vps.planName}</h3>
                                    <p className="text-sm text-gray-500">{vps.ip || 'Provisioning...'} · {vps.os || 'Ubuntu 22.04'}</p>
                                </div>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${vps.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                                        vps.status === 'PROVISIONING' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                                    }`}>{vps.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                                <span>{vps.ram}MB RAM</span>
                                <span>{vps.cpu} CPU</span>
                                <span>{vps.disk}GB Disk</span>
                                <span>{vps.bandwidth}TB BW</span>
                                <span className="text-primary font-medium">₹{vps.priceMonth}/mo</span>
                            </div>
                            {vps.status === 'ACTIVE' && (
                                <div className="flex gap-2">
                                    <button onClick={() => powerAction(vps.id, 'start')} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20" title="Start"><Power className="w-4 h-4" /></button>
                                    <button onClick={() => powerAction(vps.id, 'stop')} className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" title="Stop"><Square className="w-4 h-4" /></button>
                                    <button onClick={() => powerAction(vps.id, 'restart')} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Restart"><ArrowUpRight className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
