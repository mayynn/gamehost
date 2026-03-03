'use client';

import { useState, useEffect, useCallback } from 'react';
import { plansApi } from '@/lib/api';
import { Check, Zap, Sliders, Loader2, PackageX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [ram, setRam] = useState(2048);
    const [cpu, setCpu] = useState(100);
    const [disk, setDisk] = useState(10240);
    const [customPrice, setCustomPrice] = useState(0);
    const router = useRouter();

    useEffect(() => {
        plansApi.list().then((r) => setPlans(r.data || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const updateCustomPrice = useCallback(async () => {
        const customPlan = plans.find((p) => p.type === 'CUSTOM');
        if (customPlan) {
            try {
                const { data } = await plansApi.calculate({ planId: customPlan.id, ram, cpu, disk });
                setCustomPrice(data?.price || 0);
            } catch { setCustomPrice(0); }
        }
    }, [plans, ram, cpu, disk]);

    useEffect(() => { if (showBuilder) updateCustomPrice(); }, [showBuilder, updateCustomPrice]);

    const planColors = ['from-green-500 to-emerald-500', 'from-primary to-blue-500', 'from-accent to-purple-500', 'from-orange-500 to-red-500'];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-display font-bold">Choose a Plan</h1>
                <p className="text-gray-400 mt-1">Select the perfect plan for your game server</p>
            </div>

            {/* Plans Grid */}
            {plans.filter((p) => p.type !== 'CUSTOM').length === 0 ? (
                <div className="glass-card p-16 text-center mb-8">
                    <PackageX className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold mb-2">No plans available</h3>
                    <p className="text-gray-400">Check back later — the admin hasn&apos;t created any plans yet.</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {plans.filter((p) => p.type !== 'CUSTOM').map((plan, i) => (
                    <div key={plan.id} className="glass-card-hover p-6 flex flex-col">
                        <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                        <div className={`text-3xl font-bold bg-gradient-to-r ${planColors[i % planColors.length]} bg-clip-text text-transparent mb-4`}>
                            {plan.type === 'FREE' ? 'Free' : `₹${plan.pricePerMonth}/mo`}
                        </div>
                        <p className="text-sm text-gray-400 mb-6">{plan.description || 'Game server hosting plan'}</p>
                        <ul className="space-y-3 flex-1 mb-6">
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{plan.ram}MB RAM</li>
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{plan.cpu}% CPU</li>
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{plan.disk}MB Disk</li>
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{plan.backups} Backups</li>
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />{plan.databases} Databases</li>
                            <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-primary" />Plugin Installer</li>
                        </ul>
                        <Link href={`/dashboard/servers/create?plan=${plan.id}`} className="btn-primary text-center w-full">
                            {plan.type === 'FREE' ? 'Deploy Free' : 'Deploy Server'}
                        </Link>
                    </div>
                ))}
            </div>
            )}

            {/* Custom Builder */}
            <div className="glass-card p-6">
                <button onClick={() => setShowBuilder(!showBuilder)} className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Sliders className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-semibold">Custom Builder</h3>
                        <p className="text-sm text-gray-400">Configure your own server specs</p>
                    </div>
                    <Zap className="w-5 h-5 text-accent" />
                </button>

                {showBuilder && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="grid md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label htmlFor="custom-ram" className="text-sm text-gray-400 mb-2 block">RAM: {ram}MB ({(ram / 1024).toFixed(1)}GB)</label>
                                <input id="custom-ram" type="range" min="512" max="16384" step="512" value={ram} onChange={(e) => setRam(Number(e.target.value))}
                                    className="w-full accent-primary" />
                            </div>
                            <div>
                                <label htmlFor="custom-cpu" className="text-sm text-gray-400 mb-2 block">CPU: {cpu}%</label>
                                <input id="custom-cpu" type="range" min="50" max="800" step="50" value={cpu} onChange={(e) => setCpu(Number(e.target.value))}
                                    className="w-full accent-primary" />
                            </div>
                            <div>
                                <label htmlFor="custom-disk" className="text-sm text-gray-400 mb-2 block">Disk: {disk}MB ({(disk / 1024).toFixed(1)}GB)</label>
                                <input id="custom-disk" type="range" min="1024" max="102400" step="1024" value={disk} onChange={(e) => setDisk(Number(e.target.value))}
                                    className="w-full accent-primary" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold gradient-text">₹{customPrice}/mo</div>
                            <button
                                onClick={() => {
                                    const customPlan = plans.find((p) => p.type === 'CUSTOM');
                                    if (customPlan) {
                                        router.push(`/dashboard/servers/create?plan=${customPlan.id}&ram=${ram}&cpu=${cpu}&disk=${disk}`);
                                    }
                                }}
                                className="btn-primary"
                            >
                                Deploy Custom Server
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
