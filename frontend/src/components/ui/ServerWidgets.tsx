'use client';

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ═══════════════ Circular Progress Dial ═══════════════ */
export function CircularProgress({ value, label, sublabel, color, glowColor }: { 
  value: number; label: string; sublabel?: string; color: string; glowColor: string; 
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-5 rounded-2xl neo-card w-full overflow-hidden bg-[#09090b]/80 border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <div className="relative w-[96px] h-[96px] mb-3">
        <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="7" />
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={glowColor} />
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <motion.circle
            cx="48" cy="48" r={radius} fill="none"
            stroke={`url(#grad-${label})`} strokeWidth="7"
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: 'easeOut', type: 'spring', bounce: 0.2 }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={clamped} 
            initial={{ scale: 1.05, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[22px] font-black text-white tracking-tight tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          >
            {clamped}<span className="text-[13px] font-semibold text-gray-400">%</span>
          </motion.span>
        </div>
      </div>
      <span className="text-[11px] font-bold text-gray-300 tracking-[0.2em] uppercase">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-500 mt-1 tracking-wider">{sublabel}</span>}
    </div>
  );
}

/* ═══════════════ Realtime Resource Bar ═══════════════ */
export function ResourceBar({ value, max, label, unit, color, icon }: {
  value: number; max: number; label: string; unit: string; color: string; icon?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  
  const formatValue = (v: number) => {
    if (unit === 'MB' && v >= 1024) return `${(v / 1024).toFixed(1)} GB`;
    if (unit === 'bytes') {
      if (v >= 1073741824) return `${(v / 1073741824).toFixed(1)} GB`;
      if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
      if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
      return `${v} B`;
    }
    return `${v}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className="text-[10px] font-semibold text-gray-400 tracking-[0.15em] uppercase">{label}</span>
        </div>
        <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color }}>
          {formatValue(value)}
          {max > 0 && <span className="text-gray-600"> / {formatValue(max)}</span>}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden shadow-inner border border-white/[0.02]">
        <motion.div
           className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-[0_0_10px_currentColor]"
           animate={{ width: `${pct}%` }}
           transition={{ duration: 0.8, ease: 'easeOut' }}
           style={{ 
             backgroundColor: color, 
             boxShadow: `0 0 12px ${color}66, inset 0 2px 4px ${color}88` 
           }}
        />
      </div>
    </div>
  );
}

/* ═══════════════ 3D Premium Card Envelope ═══════════════ */
function Premium3DCard({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 20 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      style={{ perspective: 1200 }}
      className={`relative w-full ${className}`}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-full rounded-2xl bg-[#0a0a0c]/90 border border-white/[0.06] shadow-2xl p-6 overflow-hidden backdrop-blur-xl"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
        <motion.div 
          className="absolute -inset-1 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: useMotionTemplate`radial-gradient(400px circle at ${(useTransform(mouseX, [-0.5,0.5], [0,100]))}% ${(useTransform(mouseY, [-0.5,0.5], [0,100]))}%, rgba(255,255,255,0.06), transparent 40%)`
          }}
        />
        <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ Realtime Stats Panel ═══════════════ */
export function RealtimeStatsPanel({ stats, limits }: {
  stats: {
    cpuPercent: number;
    memoryBytes: number;
    diskBytes: number;
    networkRx: number;
    networkTx: number;
    uptime: number;
  };
  limits: {
    memory: number;
    disk: number;
    cpu: number;
  };
}) {
  const cpuPct = Math.min(100, Math.round(stats.cpuPercent));
  const memMB = stats.memoryBytes / 1048576;
  const memPct = limits.memory > 0 ? Math.min(100, Math.round((memMB / limits.memory) * 100)) : 0;
  const diskMB = stats.diskBytes / 1048576;
  const diskPct = limits.disk > 0 ? Math.min(100, Math.round((diskMB / limits.disk) * 100)) : 0;

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const getTier = (pct: number) => {
    if (pct >= 90) return { stroke: '#ef4444', text: 'text-red-400', bg: 'rgba(239,68,68,0.03)', shadow: 'rgba(239,68,68,0.2)' };
    if (pct >= 70) return { stroke: '#f59e0b', text: 'text-amber-400', bg: 'rgba(245,158,11,0.03)', shadow: 'rgba(245,158,11,0.2)' };
    return { stroke: '#38bdf8', text: 'text-sky-400', bg: 'rgba(56,189,248,0.03)', shadow: 'rgba(56,189,248,0.2)' };
  };

  return (
    <Premium3DCard className="xl:col-span-3">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[11px] font-bold text-gray-400 tracking-[0.25em] uppercase shadow-black drop-shadow-md">LIVE TELEMETRY</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/[0.08] shadow-[0_0_15px_rgba(56,189,248,0.15)]">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,1)] animate-pulse" />
          <span className="text-[9px] text-sky-100 font-bold tracking-[0.1em] uppercase">SYNC PING</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <PremiumGauge value={cpuPct} label="PROCESSOR" tier={getTier(cpuPct)} delay={0.1} />
        <PremiumGauge value={memPct} label="MEMORY" tier={getTier(memPct)} delay={0.2} />
        <PremiumGauge value={diskPct} label="STORAGE" tier={getTier(diskPct)} delay={0.3} />
      </div>

      <div className="space-y-5 bg-black/20 p-5 rounded-2xl border border-white/[0.03]">
        <ResourceBar 
          value={memMB} max={limits.memory} 
          label="Allocated RAM" unit="MB" 
          color="#38bdf8"
        />
        <ResourceBar 
          value={diskMB} max={limits.disk} 
          label="Disk Space" unit="MB" 
          color="#818cf8"
        />
        <div className="grid grid-cols-2 gap-6 pt-3 mt-3 border-t border-white/[0.04]">
          <ResourceBar 
            value={stats.networkRx} max={0} 
            label="Inbound" unit="bytes" 
            color="#34d399"
          />
          <ResourceBar 
            value={stats.networkTx} max={0} 
            label="Outbound" unit="bytes" 
            color="#a78bfa"
          />
        </div>
      </div>

      {stats.uptime > 0 && (
        <div className="mt-5 pb-1 flex items-center justify-between px-2">
          <span className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">System Uptime</span>
          <span className="text-[12px] font-mono font-black text-white px-3 py-1 rounded-md bg-white/[0.05] border border-white/[0.05] tabular-nums shadow-[0_0_10px_rgba(0,0,0,0.5)]">{formatUptime(stats.uptime)}</span>
        </div>
      )}
    </Premium3DCard>
  );
}

/* ═══════════════ Premium 3D Gauge ═══════════════ */
function PremiumGauge({ value, label, tier, delay = 0 }: {
  value: number; label: string; tier: { stroke: string; text: string; bg: string; shadow: string }; delay?: number;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const r = 36;
  const cx = 50;
  const cy = 50;
  const startAngle = 140;
  const sweep = 260;
  const circumference = (sweep / 360) * 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  const getD = () => {
    const start = { x: cx + r * Math.cos(((startAngle - 90) * Math.PI) / 180), y: cy + r * Math.sin(((startAngle - 90) * Math.PI) / 180) };
    const end = { x: cx + r * Math.cos(((startAngle + sweep - 90) * Math.PI) / 180), y: cy + r * Math.sin(((startAngle + sweep - 90) * Math.PI) / 180) };
    return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.4 }}
      className="flex flex-col items-center rounded-2xl p-4 transition-colors relative" 
      style={{ background: tier.bg, border: `1px solid ${tier.shadow.replace('0.2','0.08')}`, boxShadow: `0 4px 20px -5px ${tier.shadow}` }}
    >
      <div className="relative w-[90px] h-[70px] drop-shadow-2xl">
        <svg viewBox="0 0 100 80" className="w-full h-full" style={{ overflow: "visible" }}>
          {/* Subtle trail */}
          <path d={getD()} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" strokeLinecap="round" />
          {/* Glow filter */}
          <defs>
            <filter id={`glow-gauge-${label}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Filled Bar */}
          <motion.path
            d={getD()} fill="none" stroke={tier.stroke} strokeWidth="6" strokeLinecap="round"
            filter={`url(#glow-gauge-${label})`}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, type: 'spring', bounce: 0.2 }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center -translate-y-1">
          <motion.span 
            key={clamped}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-[20px] font-black tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${tier.text}`}
          >
            {clamped}<span className="text-[10px] text-white/50">%</span>
          </motion.span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mt-2">{label}</span>
    </motion.div>
  );
}
