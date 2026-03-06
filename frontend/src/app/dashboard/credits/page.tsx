'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { creditsApi } from '@/lib/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Coins, Gift, Clock, Loader2, Play, CheckCircle, Sparkles, Zap, Info } from 'lucide-react';
import { StaggerContainer, FadeUpItem, CircularProgress } from '@/components/ui/Animations';

export default function CreditsPage() {
  const [credits, setCredits] = useState<number>(0);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [earning, setEarning] = useState(false);
  const [canEarn, setCanEarn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Promise.all([
      creditsApi.get().then(r => setCredits(r.data?.amount ?? r.data?.credits ?? r.data ?? 0)),
      creditsApi.config().then(r => setConfig(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const startTimer = useCallback(() => {
    if (!config) return;
    const seconds = config.timerSeconds || 30;
    setTimer(seconds);
    setCanEarn(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setCanEarn(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [config]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const earn = async () => {
    setEarning(true);
    try {
      const r = await creditsApi.earn();
      setCredits(r.data?.total ?? r.data?.credits ?? credits + (config?.reward || 1));
      toast.success(`Earned ${r.data?.earned ?? config?.reward ?? 1} credits!`);
      setCanEarn(false);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to earn credits'); }
    finally { setEarning(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;

  const timerPercent = config ? ((config.timerSeconds - timer) / config.timerSeconds) * 100 : 0;

  return (
    <StaggerContainer className="space-y-6">
      <FadeUpItem>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white">Credits</h1>
          <p className="text-sm text-gray-500 mt-1">Earn free credits by watching ads</p>
        </div>
      </FadeUpItem>

      {/* Balance Card */}
      <FadeUpItem>
        <div className="stat-card stat-card-purple p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Coins className="w-5 h-5 text-neon-purple" />
            </div>
            <Sparkles className="w-4 h-4 text-neon-purple/40" />
          </div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Your Credits</p>
          <p className="text-3xl font-display font-bold text-white mt-1">{credits.toFixed(0)}</p>
        </div>
      </FadeUpItem>

      {/* Earn Section */}
      {config && (
        <FadeUpItem>
          <div className="premium-card">
            <div className="premium-card-inner p-0">
              {/* Header */}
              <div className="p-6 pb-4 text-center" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.08) 0%, transparent 100%)' }}>
                <div className="inline-flex p-3.5 rounded-2xl mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <Gift className="w-8 h-8 text-neon-purple" />
                </div>
                <h2 className="text-lg font-display font-bold text-white">Earn Free Credits</h2>
                <p className="text-sm text-gray-500 mt-1">Watch a short timer to earn <span className="text-neon-purple font-semibold">{config.reward}</span> credits</p>
              </div>

              {/* Timer / Action Area */}
              <div className="p-6 pt-4 text-center space-y-5">
                {timer > 0 && (
                  <motion.div className="flex flex-col items-center gap-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <CircularProgress value={timerPercent} size={110} strokeWidth={6} />
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono font-medium text-white">{timer}s</span>
                      <span>remaining</span>
                    </div>
                  </motion.div>
                )}

                {!timer && !canEarn && (
                  <button onClick={startTimer} className="btn-primary inline-flex items-center gap-2 px-8 py-2.5">
                    <Play className="w-4 h-4" /> Start Timer
                  </button>
                )}

                {canEarn && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <button
                      onClick={earn}
                      disabled={earning}
                      className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}
                    >
                      {earning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Claim {config.reward} Credits
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </FadeUpItem>
      )}

      {/* Info */}
      <FadeUpItem>
        <div className="neo-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-white">How Credits Work</h3>
          </div>
          <ul className="text-sm text-gray-400 space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--neon-purple)' }} />
              Watch the timer to earn credits for free.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--neon-purple)' }} />
              Credits can be used to pay for services.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--neon-purple)' }} />
              {config ? `Earn ${config.reward} credits every ${config.timerSeconds} seconds.` : 'Credit rewards may vary.'}
            </li>
          </ul>
        </div>
      </FadeUpItem>
    </StaggerContainer>
  );
}
