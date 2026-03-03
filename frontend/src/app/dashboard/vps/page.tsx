'use client';

import { useState, useEffect } from 'react';
import { vpsApi, billingApi } from '@/lib/api';
import { Server, Plus, Power, Square, Trash2, ArrowUpRight, RefreshCw, Clock, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VpsPage() {
    const [vpsList, setVpsList] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [hostname, setHostname] = useState('');
    const [os, setOs] = useState('ubuntu-22.04');
    const [balance, setBalance] = useState(0);
    const [creating, setCreating] = useState(false);
    const [renewingId, setRenewingId] = useState<string | null>(null);

    const availableOs = [
        { value: 'ubuntu-22.04', label: 'Ubuntu 22.04 LTS' },
        { value: 'ubuntu-24.04', label: 'Ubuntu 24.04 LTS' },
        { value: 'debian-12', label: 'Debian 12' },
        { value: 'centos-9', label: 'CentOS Stream 9' },
        { value: 'almalinux-9', label: 'AlmaLinux 9' },
        { value: 'rocky-9', label: 'Rocky Linux 9' },
    ];

    useEffect(() => {
        Promise.all([
            vpsApi.list().then((r) => setVpsList(r.data || [])),
            vpsApi.plans().then((r) => setPlans(r.data || [])),
            billingApi.balance().then((r) => setBalance(r.data?.amount || 0)),
        ]).finally(() => setLoading(false));
    }, []);

    const refreshList = () => {
        vpsApi.list().then((r) => setVpsList(r.data || []));
        billingApi.balance().then((r) => setBalance(r.data?.amount || 0));
    };

    const createVps = async () => {
        if (!selectedPlan) return toast.error('Select a plan');
        if (!hostname.trim()) return toast.error('Enter a hostname');
        if (balance < selectedPlan.price) return toast.error(`Insufficient balance. Need ₹${selectedPlan.price}, have ₹${balance.toFixed(2)}`);
        setCreating(true);
        try {
            await vpsApi.create({ planId: selectedPlan.id, os, hostname: hostname.trim() });
            toast.success('VPS provisioning started! Balance deducted.');
            setShowCreate(false);
            setHostname('');
            setSelectedPlan(null);
            refreshList();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to create VPS');
        } finally { setCreating(false); }
    };

    const powerAction = async (id: string, action: string) => {
        try {
            await vpsApi.control(id, action);
            toast.success(`${action} sent`);
            setTimeout(refreshList, 3000);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Action failed');
        }
    };

    const renewVps = async (id: string) => {
        setRenewingId(id);
        try {
            await vpsApi.renew(id);
            toast.success('VPS renewed for 30 days!');
            refreshList();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Renewal failed');
        } finally { setRenewingId(null); }
    };

    const terminateVps = async (id: string) => {
        if (!confirm('Are you sure you want to terminate this VPS? All data will be lost.')) return;
        try {
            await vpsApi.terminate(id);
            toast.success('VPS terminated');
            refreshList();
        } catch { toast.error('Termination failed'); }
    };

    const daysRemaining = (expiresAt: string | null) => {
        if (!expiresAt) return null;
        const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-display font-bold">VPS Hosting</h1>
                    <p className="text-gray-400 mt-1">Manage your virtual private servers</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Wallet className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">₹{balance.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New VPS
                    </button>
                </div>
            </div>

            {/* Create VPS */}
            {showCreate && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="font-semibold mb-4">Deploy New VPS</h3>

                    {plans.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No VPS plans available at this time.</p>
                    ) : (
                        <>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                                {plans.map((plan: any) => (
                                    <button key={plan.id}
                                        onClick={() => setSelectedPlan(plan)}
                                        className={`p-4 rounded-xl border text-left transition-all ${selectedPlan?.id === plan.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}>
                                        <p className="font-semibold">{plan.name}</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            {plan.ram}MB RAM · {plan.cpu} vCPU · {plan.disk}GB Disk
                                            {plan.bandwidth > 0 && ` · ${plan.bandwidth}TB BW`}
                                        </p>
                                        <p className="text-primary font-bold mt-2">₹{plan.price}/mo</p>
                                        {balance < plan.price && (
                                            <p className="text-xs text-red-400 mt-1">Insufficient balance</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label htmlFor="vps-hostname" className="text-sm font-medium text-gray-300 mb-2 block">Hostname</label>
                                    <input id="vps-hostname" type="text" value={hostname} onChange={(e) => setHostname(e.target.value)}
                                        placeholder="my-vps-server" className="input-field w-full" maxLength={63} />
                                </div>
                                <div>
                                    <label htmlFor="vps-os" className="text-sm font-medium text-gray-300 mb-2 block">Operating System</label>
                                    <select id="vps-os" value={os} onChange={(e) => setOs(e.target.value)}
                                        className="input-field w-full bg-dark">
                                        {availableOs.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {selectedPlan && (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4 text-sm text-gray-400">
                                    <span className="font-medium text-white">Summary:</span> {selectedPlan.name} — ₹{selectedPlan.price}/mo will be deducted from your balance. Renews monthly.
                                </div>
                            )}
                            <button onClick={createVps} disabled={creating || !selectedPlan}
                                className="btn-primary disabled:opacity-50">
                                {creating ? 'Deploying...' : `Deploy VPS${selectedPlan ? ` — ₹${selectedPlan.price}` : ''}`}
                            </button>
                        </>
                    )}
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
                    {vpsList.map((vps: any) => {
                        const days = daysRemaining(vps.expiresAt);
                        const isExpiringSoon = days !== null && days <= 7;
                        const isExpired = days !== null && days <= 0;

                        return (
                            <div key={vps.id} className="glass-card p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-3 h-3 rounded-full ${vps.status === 'ACTIVE' ? 'bg-green-400 shadow-lg shadow-green-400/30' :
                                            vps.status === 'PROVISIONING' ? 'bg-blue-400 animate-pulse' :
                                                vps.status === 'SUSPENDED' ? 'bg-orange-400' : 'bg-red-400'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold">{vps.hostname || vps.planName}</h3>
                                        <p className="text-sm text-gray-500">{vps.ip || 'Provisioning...'} · {vps.os || 'Ubuntu 22.04'}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${vps.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                                            vps.status === 'PROVISIONING' ? 'bg-blue-500/10 text-blue-400' :
                                                vps.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
                                        }`}>{vps.status}</span>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                                    {vps.ram && <span>{vps.ram}MB RAM</span>}
                                    {vps.cpu && <span>{vps.cpu} vCPU</span>}
                                    {vps.disk && <span>{vps.disk}GB Disk</span>}
                                    {vps.bandwidth > 0 && <span>{vps.bandwidth}TB BW</span>}
                                    {vps.sellPrice != null && <span className="text-primary font-medium">₹{vps.sellPrice}/mo</span>}
                                    {vps.vpsPlan?.displayName && <span className="text-gray-600">Plan: {vps.vpsPlan.displayName}</span>}
                                    {!vps.vpsPlan?.displayName && vps.planName && <span className="text-gray-600">Plan: {vps.planName}</span>}
                                </div>

                                {/* Expiry info */}
                                {days !== null && (
                                    <div className={`flex items-center gap-2 text-xs mb-4 px-3 py-2 rounded-lg ${isExpired ? 'bg-red-500/10 text-red-400' :
                                            isExpiringSoon ? 'bg-orange-500/10 text-orange-400' :
                                                'bg-white/5 text-gray-500'
                                        }`}>
                                        <Clock className="w-3.5 h-3.5" />
                                        {isExpired ? (
                                            <span>Expired — Renew to prevent data loss</span>
                                        ) : (
                                            <span>Expires in {days} day{days !== 1 ? 's' : ''} ({new Date(vps.expiresAt).toLocaleDateString()})</span>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 flex-wrap">
                                    {vps.status === 'ACTIVE' && (
                                        <>
                                            <button onClick={() => powerAction(vps.id, 'start')} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20" title="Start"><Power className="w-4 h-4" /></button>
                                            <button onClick={() => powerAction(vps.id, 'stop')} className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" title="Stop"><Square className="w-4 h-4" /></button>
                                            <button onClick={() => powerAction(vps.id, 'restart')} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Restart"><ArrowUpRight className="w-4 h-4" /></button>
                                        </>
                                    )}
                                    {/* Renew button — visible for active, suspended, or expired */}
                                    {(vps.status === 'ACTIVE' || vps.status === 'SUSPENDED') && vps.sellPrice > 0 && (
                                        <button
                                            onClick={() => renewVps(vps.id)}
                                            disabled={renewingId === vps.id}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isExpiringSoon || isExpired
                                                ? 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                            title="Renew for 30 days"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${renewingId === vps.id ? 'animate-spin' : ''}`} />
                                            {renewingId === vps.id ? 'Renewing...' : `Renew ₹${vps.sellPrice}`}
                                        </button>
                                    )}
                                    <button onClick={() => terminateVps(vps.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Terminate">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
