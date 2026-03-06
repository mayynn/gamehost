'use client';

import { useEffect, useState } from 'react';
import { plansApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Package, MemoryStick, Cpu, HardDrive, Zap, Check, Loader2, Crown, Sliders, Rocket, Star, ArrowRight } from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);
  const [limits, setLimits] = useState<any>(null);
  const [customRam, setCustomRam] = useState(1024);
  const [customCpu, setCustomCpu] = useState(100);
  const [customDisk, setCustomDisk] = useState(5120);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  useEffect(() => {
    plansApi.list().then(r => setPlans(r.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCustom) {
      plansApi.get(selectedCustom).then(r => {
        const p = r.data;
        if (p) {
          setLimits({ minRam: p.minRam || 512, maxRam: p.maxRam || 16384, minCpu: p.minCpu || 50, maxCpu: p.maxCpu || 800, minDisk: p.minDisk || 1024, maxDisk: p.maxDisk || 51200 });
          setCustomRam(p.minRam || p.ram || 1024);
          setCustomCpu(p.minCpu || p.cpu || 100);
          setCustomDisk(p.minDisk || p.disk || 5120);
        }
      }).catch(() => {});
    }
  }, [selectedCustom]);

  useEffect(() => {
    if (selectedCustom) {
      const t = setTimeout(() => {
        plansApi.calculate({ planId: selectedCustom, ram: customRam, cpu: customCpu, disk: customDisk })
          .then(r => setCustomPrice(r.data.price)).catch(() => {});
      }, 300);
      return () => clearTimeout(t);
    }
  }, [selectedCustom, customRam, customCpu, customDisk]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <span className="text-xs text-gray-600">Loading plans…</span>
      </div>
    </div>
  );

  const fmtRes = (v: number) => v >= 1024 ? `${(v/1024).toFixed(1)} GB` : `${v} MB`;
  const planColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    FREE: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', text: '#34d399', badge: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20' },
    PREMIUM: { bg: 'rgba(0,212,255,0.04)', border: 'rgba(0,212,255,0.12)', text: '#00d4ff', badge: 'bg-primary/10 text-primary border-primary/20' },
    CUSTOM: { bg: 'rgba(124,58,237,0.04)', border: 'rgba(124,58,237,0.12)', text: '#a78bfa', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  };

  return (
    <StaggerContainer className="space-y-8">
      {/* Header */}
      <FadeUpItem>
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Server Plans</h1>
            <p className="text-gray-500 text-sm mt-1">Choose the perfect plan for your game server</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            {plans.length} plans available
          </div>
        </div>
      </FadeUpItem>

      {/* Plans Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan: any, i: number) => {
          const isFeatured = plan.type === 'PREMIUM' && i === Math.floor(plans.filter((p: any) => p.type !== 'FREE').length / 2);
          const colors = planColors[plan.type] || planColors.PREMIUM;
          return (
            <FadeUpItem key={plan.id}>
              <div className={`relative rounded-2xl h-full flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${isFeatured ? 'ring-1 ring-primary/20' : ''}`}
                style={{
                  background: `linear-gradient(180deg, ${colors.bg} 0%, var(--bg-card) 40%)`,
                  border: `1px solid ${colors.border}`,
                }}>
                {/* Featured ribbon */}
                {isFeatured && (
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }} />
                )}

                <div className="p-6 flex flex-col h-full">
                  {/* Plan header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${colors.badge}`}>
                        {plan.type === 'PREMIUM' && <Crown className="w-3 h-3" />}
                        {plan.type === 'CUSTOM' && <Sliders className="w-3 h-3" />}
                        {plan.type === 'FREE' && <Star className="w-3 h-3" />}
                        {plan.type}
                      </span>
                    </div>
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-primary" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.15)' }}>
                        <Zap className="w-3 h-3" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-display font-bold text-white">{plan.name}</h3>
                  {plan.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.description}</p>}

                  {/* Resources */}
                  <div className="mt-5 space-y-2.5 flex-1">
                    {[
                      { icon: <MemoryStick className="w-3.5 h-3.5" />, label: 'RAM', val: fmtRes(plan.ram) },
                      { icon: <Cpu className="w-3.5 h-3.5" />, label: 'CPU', val: `${plan.cpu}%` },
                      { icon: <HardDrive className="w-3.5 h-3.5" />, label: 'Disk', val: fmtRes(plan.disk) },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-2.5 text-sm">
                        <span style={{ color: colors.text }}>{r.icon}</span>
                        <span className="text-gray-500 text-xs">{r.label}</span>
                        <span className="text-white font-medium ml-auto text-xs">{r.val}</span>
                      </div>
                    ))}
                    {plan.backups > 0 && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-gray-400">{plan.backups} Backups</span>
                      </div>
                    )}
                    {plan.databases > 0 && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-gray-400">{plan.databases} Databases</span>
                      </div>
                    )}
                  </div>

                  {/* Price + CTA */}
                  <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="mb-3">
                      <span className="text-2xl font-display font-bold text-white">
                        {plan.type === 'FREE' ? 'Free' : plan.type === 'CUSTOM' ? 'Custom' : `₹${plan.pricePerMonth}`}
                      </span>
                      {plan.type === 'PREMIUM' && <span className="text-xs text-gray-600 ml-1">/month</span>}
                    </div>
                    {plan.type === 'CUSTOM' ? (
                      <button onClick={() => setSelectedCustom(selectedCustom === plan.id ? null : plan.id)}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${selectedCustom === plan.id ? 'btn-primary' : 'btn-secondary'}`}>
                        <Sliders className="w-4 h-4" /> {selectedCustom === plan.id ? 'Hide Builder' : 'Configure'}
                      </button>
                    ) : (
                      <button onClick={() => router.push(`/dashboard/servers/create?plan=${plan.id}`)}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${isFeatured ? 'btn-primary' : 'btn-secondary'}`}>
                        <Rocket className="w-4 h-4" /> Deploy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </FadeUpItem>
          );
        })}
      </div>

      {/* Custom Builder */}
      {selectedCustom && limits && (
        <FadeUpItem>
          <div className="neo-card overflow-hidden">
            <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(124,58,237,0.04)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <Sliders className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Custom Resource Builder</h2>
                <p className="text-xs text-gray-500">Drag the sliders to configure your server</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {[
                { label: 'RAM', value: customRam, set: setCustomRam, min: limits.minRam, max: limits.maxRam, step: 128, icon: <MemoryStick className="w-4 h-4" />, fmt: fmtRes, color: '#00d4ff' },
                { label: 'CPU', value: customCpu, set: setCustomCpu, min: limits.minCpu, max: limits.maxCpu, step: 10, icon: <Cpu className="w-4 h-4" />, fmt: (v: number) => `${v}%`, color: '#7c3aed' },
                { label: 'Disk', value: customDisk, set: setCustomDisk, min: limits.minDisk, max: limits.maxDisk, step: 128, icon: <HardDrive className="w-4 h-4" />, fmt: fmtRes, color: '#10b981' },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-gray-300 flex items-center gap-2">
                      <span style={{ color: r.color }}>{r.icon}</span> {r.label}
                    </label>
                    <span className="text-sm font-bold px-3 py-1 rounded-lg" style={{ background: `${r.color}10`, color: r.color, border: `1px solid ${r.color}20` }}>
                      {r.fmt(r.value)}
                    </span>
                  </div>
                  <input type="range" min={r.min} max={r.max} step={r.step} value={r.value} onChange={e => r.set(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-medium"><span>{r.fmt(r.min)}</span><span>{r.fmt(r.max)}</span></div>
                </div>
              ))}
            </div>

            <div className="p-5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Estimated Price</div>
                <span className="text-2xl font-display font-bold text-white">{customPrice !== null ? `₹${customPrice.toFixed(2)}` : '...'}<span className="text-sm text-gray-600 font-normal">/mo</span></span>
              </div>
              <button onClick={() => router.push(`/dashboard/servers/create?plan=${selectedCustom}`)} className="btn-primary text-sm flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Deploy Server
              </button>
            </div>
          </div>
        </FadeUpItem>
      )}
    </StaggerContainer>
  );
}
