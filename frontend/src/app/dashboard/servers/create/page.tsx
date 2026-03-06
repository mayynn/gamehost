'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { plansApi, serversApi } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Server, Cpu, HardDrive, MemoryStick, ArrowRight, Loader2, Package, ChevronLeft, Rocket, Zap, Crown, Star } from 'lucide-react';
import Link from 'next/link';

const TYPE_CFG: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  FREE: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', text: 'text-emerald-400', icon: Star },
  PREMIUM: { bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)', text: 'text-primary', icon: Crown },
  CUSTOM: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', text: 'text-neon-purple', icon: Zap },
};

function CreateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan');

  const [plans, setPlans] = useState<any[]>([]);
  const [eggs, setEggs] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [name, setName] = useState('');
  const [eggId, setEggId] = useState<number>(0);
  const [nestId, setNestId] = useState<number>(0);
  const [nodeId, setNodeId] = useState<number | undefined>();
  const [ram, setRam] = useState(1024);
  const [cpu, setCpu] = useState(100);
  const [disk, setDisk] = useState(5120);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      plansApi.list().then(r => setPlans(r.data)),
      plansApi.eggs().then(r => setEggs(r.data)).catch(() => {}),
      plansApi.nodes().then(r => setNodes(r.data)).catch(() => {}),
    ]).finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    if (planId && plans.length) {
      const p = plans.find((pl: any) => pl.id === planId);
      if (p) { setSelectedPlan(p); setRam(p.ram); setCpu(p.cpu); setDisk(p.disk); }
    }
  }, [planId, plans]);

  useEffect(() => {
    if (selectedPlan?.type === 'CUSTOM' && ram && cpu && disk) {
      const t = setTimeout(() => {
        plansApi.calculate({ planId: selectedPlan.id, ram, cpu, disk })
          .then(r => setCustomPrice(r.data.price)).catch(() => {});
      }, 300);
      return () => clearTimeout(t);
    }
  }, [selectedPlan, ram, cpu, disk]);

  const handleCreate = async () => {
    if (!selectedPlan || !name || !eggId || !nestId) {
      toast.error('Please fill all required fields'); return;
    }
    setLoading(true);
    try {
      const body: any = { name, planId: selectedPlan.id, eggId, nestId };
      if (nodeId) body.nodeId = nodeId;
      if (selectedPlan.type === 'CUSTOM') { body.ram = ram; body.cpu = cpu; body.disk = disk; }
      const res = await serversApi.create(body);
      toast.success('Server created!');
      router.push(`/dashboard/servers/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/servers" className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white">Deploy Server</h1>
          <p className="text-sm text-gray-500 mt-1">Configure and deploy your game server</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="lg:col-span-2 space-y-5">
          {/* Plan Selection */}
          {!selectedPlan && (
            <div className="neo-card overflow-hidden">
              <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.15)' }}>
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-white">Select Plan</h2>
              </div>
              <div className="p-5 grid sm:grid-cols-2 gap-3">
                {plans.map((p: any) => {
                  const tc = TYPE_CFG[p.type] || TYPE_CFG.PREMIUM;
                  const TypeIcon = tc.icon;
                  return (
                    <button key={p.id} onClick={() => { setSelectedPlan(p); setRam(p.ram); setCpu(p.cpu); setDisk(p.disk); }}
                      className="text-left p-4 rounded-xl transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium mb-2 ${tc.text}`}
                        style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                        <TypeIcon className="w-3 h-3" /> {p.type}
                      </span>
                      <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                      <p className="text-[12px] text-gray-500 mt-1">{p.ram >= 1024 ? `${(p.ram/1024).toFixed(1)}GB` : `${p.ram}MB`} RAM · {p.cpu}% CPU · {p.disk >= 1024 ? `${(p.disk/1024).toFixed(1)}GB` : `${p.disk}MB`} Disk</p>
                      <p className="text-base font-bold text-white mt-2">{p.type === 'FREE' ? 'Free' : p.type === 'CUSTOM' ? 'Custom' : `₹${p.pricePerMonth}/mo`}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedPlan && (
            <>
              {/* Selected plan banner */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedPlan.name}</p>
                    <p className="text-[11px] text-gray-500">{selectedPlan.type} Plan</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlan(null)} className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors">Change</button>
              </div>

              {/* Server Name */}
              <div className="neo-card overflow-hidden">
                <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 className="text-sm font-semibold text-white">Server Name</h2>
                </div>
                <div className="p-5">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Awesome Server" className="input-field" maxLength={100} />
                </div>
              </div>

              {/* Custom Resources */}
              {selectedPlan.type === 'CUSTOM' && (
                <div className="neo-card overflow-hidden">
                  <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <Zap className="w-3.5 h-3.5 text-neon-purple" />
                    </div>
                    <h2 className="text-sm font-semibold text-white">Resources</h2>
                  </div>
                  <div className="p-5 space-y-6">
                    {[
                      { label: 'RAM', value: ram, set: setRam, min: selectedPlan.minRam || 512, max: selectedPlan.maxRam || 16384, icon: <MemoryStick className="w-4 h-4 text-emerald-400" />, format: (v: number) => v >= 1024 ? `${(v/1024).toFixed(1)} GB` : `${v} MB`, color: 'emerald' },
                      { label: 'CPU', value: cpu, set: setCpu, min: selectedPlan.minCpu || 50, max: selectedPlan.maxCpu || 800, icon: <Cpu className="w-4 h-4 text-primary" />, format: (v: number) => `${v}%`, color: 'primary' },
                      { label: 'Disk', value: disk, set: setDisk, min: selectedPlan.minDisk || 1024, max: selectedPlan.maxDisk || 51200, icon: <HardDrive className="w-4 h-4 text-neon-purple" />, format: (v: number) => v >= 1024 ? `${(v/1024).toFixed(1)} GB` : `${v} MB`, color: 'purple' },
                    ].map(r => (
                      <div key={r.label}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-gray-300 flex items-center gap-2">{r.icon} {r.label}</label>
                          <span className="text-sm font-mono font-semibold text-white px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>{r.format(r.value)}</span>
                        </div>
                        <input type="range" min={r.min} max={r.max} step={r.label === 'CPU' ? 10 : 128}
                          value={r.value} onChange={e => r.set(Number(e.target.value))}
                          className="w-full h-2 rounded-full bg-white/10 appearance-none cursor-pointer accent-primary" />
                        <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                          <span>{r.format(r.min)}</span><span>{r.format(r.max)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Egg Selection */}
              <div className="neo-card overflow-hidden">
                <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 className="text-sm font-semibold text-white">Game / Software</h2>
                  {eggId > 0 && <span className="text-[11px] text-emerald-400 ml-auto">Selected</span>}
                </div>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {eggs.map((egg: any) => (
                    <button key={`${egg.nest_id}-${egg.id}`}
                      onClick={() => { setEggId(egg.id); setNestId(egg.nest_id); }}
                      className="p-3 rounded-xl text-left transition-all text-sm"
                      style={eggId === egg.id && nestId === egg.nest_id ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--primary)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                      {egg.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Node Selection */}
              {nodes.length > 0 && (
                <div className="neo-card overflow-hidden">
                  <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 className="text-sm font-semibold text-white">Node <span className="text-gray-600 font-normal">(Optional)</span></h2>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button onClick={() => setNodeId(undefined)}
                      className="p-3 rounded-xl text-sm transition-all"
                      style={!nodeId ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--primary)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                      Auto Select
                    </button>
                    {nodes.map((n: any) => (
                      <button key={n.id} onClick={() => setNodeId(n.id)}
                        className="p-3 rounded-xl text-sm transition-all"
                        style={nodeId === n.id ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--primary)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                        {n.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Sidebar */}
        {selectedPlan && (
          <div className="lg:col-span-1">
            <div className="premium-card sticky top-8">
              <div className="premium-card-inner p-0">
                <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(0,212,255,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h2 className="text-sm font-display font-bold text-white">Order Summary</h2>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="text-white font-medium">{selectedPlan.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">RAM</span><span className="text-white font-mono text-[13px]">{ram >= 1024 ? `${(ram/1024).toFixed(1)} GB` : `${ram} MB`}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">CPU</span><span className="text-white font-mono text-[13px]">{cpu}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Disk</span><span className="text-white font-mono text-[13px]">{disk >= 1024 ? `${(disk/1024).toFixed(1)} GB` : `${disk} MB`}</span></div>
                  {name && <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-white truncate ml-4">{name}</span></div>}
                </div>
                <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-sm">Total</span>
                    <span className="text-2xl font-display font-bold text-white">
                      {selectedPlan.type === 'FREE' ? 'Free' :
                       selectedPlan.type === 'CUSTOM' ? (customPrice !== null ? `₹${customPrice.toFixed(2)}` : '...') :
                       `₹${selectedPlan.pricePerMonth}`}
                    </span>
                  </div>
                  {selectedPlan.type !== 'FREE' && <p className="text-[11px] text-gray-600 text-right">per month</p>}
                  <button onClick={handleCreate} disabled={loading || !name || !eggId}
                    className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Rocket className="w-4 h-4" /> Deploy Server</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateServerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>}>
      <CreateForm />
    </Suspense>
  );
}
