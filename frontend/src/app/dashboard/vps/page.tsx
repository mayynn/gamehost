'use client';

import { useEffect, useState, useCallback } from 'react';
import { vpsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Server, Plus, Loader2, MemoryStick, Cpu, HardDrive, Globe, Play, Square,
  RotateCcw, Trash2, RefreshCw, Clock, X, AlertTriangle, ChevronRight, Copy, Rocket, Monitor
} from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ACTIVE: { bg: 'rgba(16,185,129,0.08)', text: 'text-emerald-400', border: 'rgba(16,185,129,0.2)', dot: 'bg-emerald-400' },
  PROVISIONING: { bg: 'rgba(234,179,8,0.08)', text: 'text-yellow-400', border: 'rgba(234,179,8,0.2)', dot: 'bg-yellow-400 animate-pulse' },
  SUSPENDED: { bg: 'rgba(239,68,68,0.08)', text: 'text-red-400', border: 'rgba(239,68,68,0.2)', dot: 'bg-red-400' },
  TERMINATED: { bg: 'rgba(107,114,128,0.08)', text: 'text-gray-400', border: 'rgba(107,114,128,0.2)', dot: 'bg-gray-500' },
};

export default function VpsPage() {
  const [instances, setInstances] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [osOptions, setOsOptions] = useState<any[]>([]);
  const [selectedOs, setSelectedOs] = useState('');
  const [hostname, setHostname] = useState('');
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [terminateConfirm, setTerminateConfirm] = useState<string | null>(null);
  const [reinstalling, setReinstalling] = useState<string | null>(null);
  const [reinstallOs, setReinstallOs] = useState('');

  const fetchInstances = useCallback(async () => {
    try { const r = await vpsApi.list(); setInstances(r.data || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  const openCreate = async () => {
    setShowCreate(true);
    try { const r = await vpsApi.plans(); setPlans(r.data || []); }
    catch { toast.error('Failed to load VPS plans'); }
  };

  const pickPlan = async (plan: any) => {
    setSelectedPlan(plan);
    try { const r = await vpsApi.planOs(plan.id); setOsOptions(r.data || []); }
    catch { toast.error('Failed to load OS options'); }
  };

  const create = async () => {
    if (!selectedPlan || !selectedOs || !hostname.trim()) { toast.error('Fill all fields'); return; }
    setCreating(true);
    try { await vpsApi.create({ planId: selectedPlan.id, os: selectedOs, hostname: hostname.trim() }); toast.success('VPS provisioning started!'); setShowCreate(false); setSelectedPlan(null); setHostname(''); fetchInstances(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const control = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try { await vpsApi.control(id, action); toast.success(`Action: ${action}`); setTimeout(fetchInstances, 2000); }
    catch { toast.error('Failed'); }
    finally { setActionLoading(null); }
  };

  const renew = async (id: string) => {
    setActionLoading(`${id}-renew`);
    try { await vpsApi.renew(id); toast.success('VPS renewed!'); fetchInstances(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const terminate = async (id: string) => {
    try { await vpsApi.terminate(id); toast.success('VPS terminated'); setTerminateConfirm(null); fetchInstances(); }
    catch { toast.error('Failed'); }
  };

  const reinstall = async (id: string) => {
    if (!reinstallOs) { toast.error('Select an OS'); return; }
    try { await vpsApi.reinstall(id, reinstallOs); toast.success('Reinstalling...'); setReinstalling(null); fetchInstances(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;

  const activeCount = instances.filter(v => v.status === 'ACTIVE').length;

  return (
    <StaggerContainer className="space-y-6">
      <FadeUpItem>
        <div className="flex items-center justify-between">
          <div className="page-header">
            <h1 className="text-2xl font-display font-bold text-white">VPS Instances</h1>
            {instances.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{activeCount} active · {instances.length} total</p>
            )}
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2"><Rocket className="w-4 h-4" /> Deploy VPS</button>
        </div>
      </FadeUpItem>

      {instances.length === 0 ? (
        <FadeUpItem>
          <div className="neo-card p-14 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <Monitor className="w-8 h-8 text-primary/60" />
            </div>
            <p className="text-white font-medium">No VPS instances yet</p>
            <p className="text-sm text-gray-600 mt-1">Deploy your first virtual private server</p>
            <button onClick={openCreate} className="btn-primary text-sm mt-5 inline-flex items-center gap-2"><Rocket className="w-4 h-4" /> Deploy VPS</button>
          </div>
        </FadeUpItem>
      ) : (
        <div className="grid gap-4">
          {instances.map((v: any) => {
            const sc = STATUS_CFG[v.status] || STATUS_CFG.TERMINATED;
            const daysLeft = v.expiresAt ? Math.ceil((new Date(v.expiresAt).getTime() - Date.now()) / 86400000) : null;
            return (
              <FadeUpItem key={v.id}>
                <div className="neo-card overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                        <Server className={`w-5 h-5 ${sc.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{v.hostname || v.planName || 'VPS'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            <span className={sc.text}>{v.status}</span>
                          </span>
                          {v.os && <span className="text-[11px] text-gray-600">{v.os}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-gray-500">
                      {v.ram && <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3" />{v.ram >= 1024 ? `${(v.ram/1024).toFixed(0)}G` : `${v.ram}M`}</span>}
                      {v.cpu && <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{v.cpu} vCPU</span>}
                      {v.disk && <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{v.disk}G</span>}
                    </div>
                  </div>

                  {/* Details Row */}
                  {(v.ip || v.expiresAt) && (
                    <div className="px-5 pb-3 flex items-center gap-4 flex-wrap">
                      {v.ip && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-3.5 h-3.5 text-gray-600" />
                          <span className="font-mono text-gray-300 text-[13px]">{v.ip}</span>
                          <button onClick={() => { navigator.clipboard.writeText(v.ip); toast.success('Copied!'); }} className="text-gray-600 hover:text-primary transition-colors"><Copy className="w-3 h-3" /></button>
                        </div>
                      )}
                      {v.expiresAt && (
                        <div className={`flex items-center gap-1 text-[12px] ml-auto ${daysLeft !== null && daysLeft <= 3 ? 'text-red-400 font-medium' : daysLeft !== null && daysLeft <= 7 ? 'text-orange-400' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          Expires {new Date(v.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                    {v.status === 'ACTIVE' && (
                      <>
                        <button onClick={() => control(v.id, 'start')} disabled={!!actionLoading} title="Start"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 transition-colors" style={{ background: 'rgba(16,185,129,0.06)' }}>
                          <Play className="w-3.5 h-3.5" /></button>
                        <button onClick={() => control(v.id, 'stop')} disabled={!!actionLoading} title="Stop"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors" style={{ background: 'rgba(239,68,68,0.06)' }}>
                          <Square className="w-3.5 h-3.5" /></button>
                        <button onClick={() => control(v.id, 'restart')} disabled={!!actionLoading} title="Restart"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-30 transition-colors" style={{ background: 'rgba(234,179,8,0.06)' }}>
                          <RotateCcw className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setReinstalling(v.id); vpsApi.planOs(v.vpsPlanId).then(r => setOsOptions(r.data || [])).catch(() => {}); }} title="Reinstall"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/5 transition-colors" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <RefreshCw className="w-3.5 h-3.5" /></button>
                      </>
                    )}
                    <button onClick={() => renew(v.id)} disabled={!!actionLoading} className="ml-auto btn-secondary text-xs">
                      {actionLoading === `${v.id}-renew` ? <Loader2 className="w-3 h-3 animate-spin" /> : `Renew${v.sellPrice ? ` ₹${v.sellPrice}` : ''}`}
                    </button>
                    <button onClick={() => setTerminateConfirm(v.id)} className="btn-danger text-xs"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </FadeUpItem>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="neo-card max-w-lg w-full my-8 overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 flex items-center justify-between" style={{ background: 'linear-gradient(180deg, rgba(0,212,255,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <Rocket className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-base font-display font-bold text-white">Deploy VPS</h3>
                </div>
                <button onClick={() => { setShowCreate(false); setSelectedPlan(null); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                {!selectedPlan ? (
                  <div className="grid gap-2">
                    {plans.map((p: any) => (
                      <button key={p.id} onClick={() => pickPlan(p)} className="table-row group">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
                          <Server className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">{p.name || p.displayName}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{p.ram >= 1024 ? `${(p.ram/1024).toFixed(0)}G` : `${p.ram}M`} RAM · {p.cpu} vCPU · {p.disk}G Disk</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">₹{p.sellPrice || p.price}<span className="text-gray-600 text-[11px]">/mo</span></p>
                          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
                      <div>
                        <p className="text-sm font-medium text-white">{selectedPlan.name || selectedPlan.displayName}</p>
                        <p className="text-[11px] text-gray-500">₹{selectedPlan.sellPrice || selectedPlan.price}/mo</p>
                      </div>
                      <button onClick={() => setSelectedPlan(null)} className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors">Change</button>
                    </div>

                    <div>
                      <label className="text-[12px] text-gray-500 mb-2 block font-medium uppercase tracking-wider">Operating System</label>
                      <div className="grid grid-cols-2 gap-2">
                        {osOptions.map((os: any) => (
                          <button key={os.id} onClick={() => setSelectedOs(os.id || os.name)}
                            className={`p-3 rounded-xl text-sm text-left transition-all ${selectedOs === (os.id || os.name) ? 'text-primary' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                            style={selectedOs === (os.id || os.name) ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {os.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[12px] text-gray-500 mb-2 block font-medium uppercase tracking-wider">Hostname</label>
                      <input type="text" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="my-vps" className="input-field" />
                    </div>

                    <button onClick={create} disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                      {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Rocket className="w-4 h-4" /> Deploy VPS</>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminate Confirm */}
      <AnimatePresence>
        {terminateConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="neo-card overflow-hidden max-w-sm w-full">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Terminate VPS</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-400">This will permanently destroy this VPS and all its data. This action cannot be undone.</p>
                <div className="flex gap-3 justify-end mt-5">
                  <button onClick={() => setTerminateConfirm(null)} className="btn-secondary text-sm">Cancel</button>
                  <button onClick={() => terminate(terminateConfirm)} className="btn-danger text-sm">Terminate</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reinstall Modal */}
      <AnimatePresence>
        {reinstalling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="neo-card overflow-hidden max-w-sm w-full">
              <div className="p-5" style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.06) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><RefreshCw className="w-4 h-4 text-yellow-400" /> Reinstall OS</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {osOptions.map((os: any) => (
                    <button key={os.id || os.name} onClick={() => setReinstallOs(os.id || os.name)}
                      className={`p-3 rounded-xl text-sm text-left transition-all ${reinstallOs === (os.id || os.name) ? 'text-primary' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                      style={reinstallOs === (os.id || os.name) ? { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {os.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setReinstalling(null)} className="btn-secondary text-sm">Cancel</button>
                  <button onClick={() => reinstall(reinstalling)} className="btn-danger text-sm">Reinstall</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerContainer>
  );
}
