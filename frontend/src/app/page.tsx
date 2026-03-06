'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { statsApi, plansApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Server, Shield, Zap, Globe, Clock, Headphones, Menu, X, ArrowRight, Cpu, Check } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import { Section, StaggerContainer, FadeUpItem, CircularProgress, AnimatedBar } from '@/components/ui/Animations';

/* ─── Floating Orbs Background ─── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-float opacity-40" />
      <div className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-transparent blur-3xl animate-float-delay-2 opacity-30" />
      <div className="absolute bottom-20 left-[30%] w-80 h-80 rounded-full bg-gradient-to-br from-neon-purple/15 to-transparent blur-3xl animate-float-delay-4 opacity-30" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    </div>
  );
}

/* ─── Abstract SVG Decorations ─── */
function AbstractSVG() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <svg className="absolute top-[15%] right-[15%] w-40 h-40 animate-spin-slow opacity-10" viewBox="0 0 100 100">
        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="url(#hexGrad)" strokeWidth="0.5" />
        <defs><linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00d4ff" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient></defs>
      </svg>
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
      <div className={`max-w-7xl mx-auto px-6 ${scrolled ? 'glass-card py-3 px-6 mx-4 rounded-2xl' : ''}`}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow-sm group-hover:shadow-glow-md transition-shadow">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white">GameHost</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {['Features', 'Pricing', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300">{item}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary text-sm flex items-center gap-2">Dashboard <ArrowRight className="w-4 h-4" /></Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm">Log In</Link>
                <Link href="/signup" className="btn-primary text-sm flex items-center gap-2">Get Started <ArrowRight className="w-4 h-4" /></Link>
              </>
            )}
          </div>
          <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4 space-y-2">
            {['Features', 'Pricing', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-gray-300 hover:text-white rounded-lg hover:bg-white/5">{item}</a>
            ))}
            <div className="pt-2 space-y-2">
              {user ? (
                <Link href="/dashboard" className="block btn-primary text-center text-sm">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="block btn-secondary text-center text-sm">Log In</Link>
                  <Link href="/signup" className="block btn-primary text-center text-sm">Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}

/* ─── Live Dashboard Card (Hero + About) ─── */
function useLiveStats() {
  const [stats, setStats] = useState({ activeServers: 0, servers: 0, users: 0 });
  const [bars, setBars] = useState<number[]>(Array.from({ length: 12 }, () => 30 + Math.random() * 60));
  const [liveMetrics, setLiveMetrics] = useState({ cpu: 0, mem: 0, disk: 0 });

  useEffect(() => {
    const fetchStats = () => statsApi.public().then(r => setStats(r.data)).catch(() => {});
    fetchStats();
    const iv = setInterval(fetchStats, 15000);
    return () => clearInterval(iv);
  }, []);

  // Simulate live-feeling bar fluctuations
  useEffect(() => {
    const iv = setInterval(() => {
      setBars(prev => prev.map(v => Math.max(15, Math.min(98, v + (Math.random() - 0.5) * 18))));
      setLiveMetrics(prev => ({
        cpu: Math.max(10, Math.min(99, (prev.cpu || 55) + (Math.random() - 0.48) * 8)),
        mem: Math.max(20, Math.min(95, (prev.mem || 68) + (Math.random() - 0.5) * 5)),
        disk: Math.max(30, Math.min(85, (prev.disk || 52) + (Math.random() - 0.5) * 3)),
      }));
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  return { stats, bars, liveMetrics };
}

/* ─── Hero Section ─── */
function HeroSection() {
  const { stats, bars, liveMetrics } = useLiveStats();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-20">
      <FloatingOrbs />
      <AbstractSVG />
      <AnimatedBackground />
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-primary" /></span>
            <span className="text-sm text-primary font-medium">Next-Gen Game Hosting Platform</span>
          </motion.div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] tracking-tight mb-6">
            <span className="text-white">Deploy Your</span><br />
            <span className="gradient-text-hero">Game Server</span><br />
            <span className="text-white">In Seconds</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 mb-10 leading-relaxed">
            Premium game server hosting with instant deployment, DDoS protection, and 99.9% uptime. Powered by enterprise-grade infrastructure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group">
              Start Free Server <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Explore Features
            </a>
          </div>
        </motion.div>

        {/* 3D Dashboard Mockup - LIVE */}
        <motion.div initial={{ opacity: 0, y: 60, rotateX: 15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }} className="mt-20 relative" style={{ perspective: 1200 }}>
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-neon-purple/10 to-accent/20 blur-3xl opacity-30 -z-10 scale-110" />
            <div className="glass-card p-1 rounded-3xl overflow-hidden">
              <div className="bg-dark-100/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-accent/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-white/5 flex items-center px-3">
                    <span className="text-xs text-gray-500">gamehost.io/dashboard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" /></span>
                    <span className="text-[10px] text-green-400 font-medium">LIVE</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Active Servers', val: stats.activeServers || 0, color: 'from-primary/20 to-primary/5', icon: '🎮' },
                    { label: 'CPU Usage', val: `${Math.round(liveMetrics.cpu)}%`, color: 'from-accent/20 to-accent/5', icon: '⚡' },
                    { label: 'Total Users', val: stats.users || 0, color: 'from-neon-purple/20 to-neon-purple/5', icon: '👥' },
                    { label: 'Uptime', val: '99.9%', color: 'from-green-500/20 to-green-500/5', icon: '🔒' },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.1 }}
                      className={`rounded-xl p-4 bg-gradient-to-br ${s.color} border border-white/5`}>
                      <div className="text-lg mb-1">{s.icon}</div>
                      <motion.div key={String(s.val)} initial={{ opacity: 0.6, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
                        className="text-xl font-bold text-white">{s.val}</motion.div>
                      <div className="text-xs text-gray-400">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Server Load</span>
                    <span className="text-[10px] text-primary font-medium">Real-time</span>
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {bars.map((h, i) => (
                      <motion.div key={i} animate={{ height: `${h}%` }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex-1 rounded-t-md bar-3d ${h > 80 ? 'bg-gradient-to-t from-accent/60 to-accent/20' : h > 60 ? 'bg-gradient-to-t from-yellow-500/60 to-yellow-500/20' : 'bg-gradient-to-t from-primary/60 to-primary/20'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Stats Strip ─── */
function StatsStrip() {
  const [stats, setStats] = useState({ servers: 0, users: 0, activeServers: 0 });
  useEffect(() => { statsApi.public().then(r => setStats(r.data)).catch(() => {}); }, []);

  return (
    <Section className="py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Servers', value: `${stats.activeServers || 0}+` },
          { label: 'Total Players', value: `${stats.users || 0}+` },
          { label: 'Uptime', value: '99.9%' },
          { label: 'DDoS Protected', value: '100%' },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
            <div className="text-3xl sm:text-4xl font-display font-bold gradient-text">{item.value}</div>
            <div className="text-sm text-gray-400 mt-1">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  const features = [
    { icon: <Zap className="w-6 h-6" />, title: 'Instant Deploy', desc: 'Your server is live within seconds. No waiting, no setup hassle.', color: 'from-primary to-cyan-400', glow: 'rgba(0,212,255,0.15)' },
    { icon: <Shield className="w-6 h-6" />, title: 'DDoS Protection', desc: 'Enterprise-grade DDoS mitigation keeps your server always online.', color: 'from-accent to-pink-400', glow: 'rgba(255,77,106,0.15)' },
    { icon: <Cpu className="w-6 h-6" />, title: 'Custom Resources', desc: 'Scale CPU, RAM and storage exactly how you need. Full control.', color: 'from-neon-purple to-violet-400', glow: 'rgba(124,58,237,0.15)' },
    { icon: <Globe className="w-6 h-6" />, title: 'Global Network', desc: 'Low latency worldwide with strategically placed data centers.', color: 'from-emerald-400 to-green-400', glow: 'rgba(16,185,129,0.15)' },
    { icon: <Clock className="w-6 h-6" />, title: '99.9% Uptime', desc: 'Redundant infrastructure ensures your game never goes down.', color: 'from-orange-400 to-amber-400', glow: 'rgba(249,115,22,0.15)' },
    { icon: <Headphones className="w-6 h-6" />, title: '24/7 Support', desc: 'Our team is always here to help via Discord and email.', color: 'from-blue-400 to-indigo-400', glow: 'rgba(96,165,250,0.15)' },
  ];
  return (
    <Section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">Features</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">Built for gamers, by gamers. Every feature designed for performance.</p>
        </div>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FadeUpItem key={i}>
              <div className="neo-card-interactive group h-full">
                <div className="relative mb-5">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-lg`}>{f.icon}</div>
                  <div className="absolute inset-0 w-14 h-14 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: `0 0 30px ${f.glow}` }} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </FadeUpItem>
          ))}
        </StaggerContainer>
      </div>
    </Section>
  );
}

/* ─── Pricing ─── */
function PricingSection() {
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => { plansApi.list().then(r => setPlans(r.data)).catch(() => {}); }, []);

  const planStyles = [
    { badge: 'bg-green-500/10 text-green-400', glow: 'rgba(16,185,129,0.1)' },
    { badge: 'bg-primary/10 text-primary', glow: 'rgba(0,212,255,0.15)' },
    { badge: 'bg-accent/10 text-accent', glow: 'rgba(255,77,106,0.15)' },
    { badge: 'bg-neon-purple/10 text-neon-purple', glow: 'rgba(124,58,237,0.15)' },
  ];

  return (
    <Section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-medium mb-4">Pricing</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">Start free. Scale when ready. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plans.map((plan: any, i: number) => {
            const style = planStyles[i % planStyles.length];
            const featured = plan.type === 'PREMIUM' && i === 1;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative neo-card-interactive ${featured ? 'ring-2 ring-primary/30 scale-[1.02]' : ''}`}
                style={{ boxShadow: featured ? `0 0 40px ${style.glow}` : undefined }}>
                {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-blue-500 text-xs font-bold text-white shadow-glow-sm">MOST POPULAR</div>}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${style.badge}`}>{plan.type}</div>
                <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                {plan.description && <p className="text-sm text-gray-400 mb-4">{plan.description}</p>}
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold text-white">{plan.type === 'FREE' ? 'Free' : plan.type === 'CUSTOM' ? 'Custom' : `₹${plan.pricePerMonth}`}</span>
                  {plan.type === 'PREMIUM' && <span className="text-gray-400 text-sm">/month</span>}
                </div>
                <div className="space-y-3 mb-6">
                  {[
                    { label: 'RAM', value: plan.ram >= 1024 ? `${(plan.ram / 1024).toFixed(1)} GB` : `${plan.ram} MB` },
                    { label: 'CPU', value: `${plan.cpu}%` },
                    { label: 'Disk', value: plan.disk >= 1024 ? `${(plan.disk / 1024).toFixed(1)} GB` : `${plan.disk} MB` },
                    { label: 'Backups', value: plan.backups },
                  ].map(spec => (
                    <div key={spec.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-2"><Check className="w-4 h-4 text-primary/60" />{spec.label}</span>
                      <span className="text-white font-medium">{spec.value}</span>
                    </div>
                  ))}
                </div>
                <Link href={plan.type === 'FREE' ? '/signup' : `/dashboard/servers/create?plan=${plan.id}`}
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${featured ? 'btn-primary' : 'btn-secondary'}`}>
                  {plan.type === 'FREE' ? 'Get Free Server' : 'Select Plan'}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ─── About ─── */
function AboutSection() {
  const [metrics, setMetrics] = useState({ cpu: 72, mem: 58, disk: 45 });
  const [aboutBars, setAboutBars] = useState([35, 55, 40, 70, 60, 85, 75]);

  useEffect(() => {
    const iv = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(20, Math.min(99, prev.cpu + (Math.random() - 0.47) * 7)),
        mem: Math.max(25, Math.min(95, prev.mem + (Math.random() - 0.5) * 5)),
        disk: Math.max(20, Math.min(80, prev.disk + (Math.random() - 0.5) * 3)),
      }));
      setAboutBars(prev => prev.map(v => Math.max(15, Math.min(95, v + (Math.random() - 0.5) * 16))));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Section id="about" className="py-24">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full border border-neon-purple/20 bg-neon-purple/5 text-neon-purple text-sm font-medium mb-4">About Us</span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-6">Built for Performance.<br /><span className="gradient-text">Designed for Gamers.</span></h2>
          <p className="text-gray-400 leading-relaxed mb-6">We leverage Pterodactyl panel and enterprise hardware to deliver the fastest, most reliable game hosting experience.</p>
          <div className="space-y-4">
            {['NVMe SSD Storage for blazing speeds', 'Automated backups & one-click restore', 'Full FTP & file manager access', 'Plugin & mod installer built-in'].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-primary" /></div>
                <span className="text-gray-300">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-neon-purple/10 blur-3xl opacity-30 -z-10" />
          <div className="premium-card"><div className="premium-card-inner space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Server Performance</h3>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" /></span>
                <span className="text-[10px] text-green-400 font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex justify-around">
              <CircularProgress value={Math.round(metrics.cpu)} size={90} color="#00d4ff" strokeWidth={7}><div className="text-center"><div className="text-lg font-bold text-white">{Math.round(metrics.cpu)}%</div><div className="text-[10px] text-gray-400">CPU</div></div></CircularProgress>
              <CircularProgress value={Math.round(metrics.mem)} size={90} color="#ff4d6a" strokeWidth={7}><div className="text-center"><div className="text-lg font-bold text-white">{Math.round(metrics.mem)}%</div><div className="text-[10px] text-gray-400">Memory</div></div></CircularProgress>
              <CircularProgress value={Math.round(metrics.disk)} size={90} color="#7c3aed" strokeWidth={7}><div className="text-center"><div className="text-lg font-bold text-white">{Math.round(metrics.disk)}%</div><div className="text-[10px] text-gray-400">Disk</div></div></CircularProgress>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-2"><span className="text-gray-400">Network Traffic</span><span className="text-primary text-xs">Real-time</span></div>
              <div className="flex items-end gap-1 h-16">
                {aboutBars.map((h, i) => (
                  <motion.div key={i} animate={{ height: `${h}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex-1 rounded-t-sm bar-3d ${
                      h > 75 ? 'bg-gradient-to-t from-accent/60 to-accent/20' : h > 55 ? 'bg-gradient-to-t from-yellow-500/50 to-yellow-500/15' : 'bg-gradient-to-t from-primary/50 to-primary/15'
                    }`} style={{ minHeight: '4px' }} />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
              </div>
            </div>
          </div></div>
        </div>
      </div>
    </Section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  return (
    <Section className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="relative premium-card overflow-hidden">
          <div className="premium-card-inner text-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="relative z-10 py-8">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Ready to Launch?</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">Get your game server running in under 60 seconds. Start with our free plan.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group">Create Free Server <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></Link>
              <Link href="/login" className="btn-secondary text-lg px-8 py-4">Sign In</Link>
            </div>
          </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center"><Server className="w-4 h-4 text-white" /></div>
              <span className="font-display font-bold text-white">GameHost</span>
            </div>
            <p className="text-sm text-gray-500">Premium game server hosting platform.</p>
          </div>
          {[
            { title: 'Platform', links: [{ l: 'Dashboard', h: '/dashboard' }, { l: 'Pricing', h: '#pricing' }, { l: 'Features', h: '#features' }] },
            { title: 'Support', links: [{ l: 'Discord', h: '#' }, { l: 'Email', h: '#' }] },
            { title: 'Legal', links: [{ l: 'Terms', h: '#' }, { l: 'Privacy', h: '#' }] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
              <div className="space-y-2">{col.links.map(link => <a key={link.l} href={link.h} className="block text-sm text-gray-500 hover:text-gray-300 transition-colors">{link.l}</a>)}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-8 text-center text-sm text-gray-600">&copy; {new Date().getFullYear()} GameHost. All rights reserved.</div>
      </div>
    </footer>
  );
}

/* ─── Main ─── */
export default function LandingPage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <StatsStrip />
      <FeaturesSection />
      <PricingSection />
      <AboutSection />
      <CTASection />
      <Footer />
    </main>
  );
}
