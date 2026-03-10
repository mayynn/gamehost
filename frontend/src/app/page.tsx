"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gamepad2,
  ArrowRight,
  Server,
  Shield,
  Zap,
  Globe,
  BarChart3,
  Users,
  Terminal,
  HardDrive,
  ChevronRight,
  Check,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/api/stats";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FloatingParticles = dynamic(
  () =>
    import("@/components/three/FloatingParticles").then((m) => ({
      default: m.FloatingParticles,
    })),
  { ssr: false }
);

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Zap,
    title: "Instant Deploy",
    desc: "Launch your game server in under 60 seconds with one-click setup and auto-configuration.",
  },
  {
    icon: Shield,
    title: "DDoS Protection",
    desc: "Enterprise-grade mitigation keeps your server online through any attack, included free.",
  },
  {
    icon: BarChart3,
    title: "Real-time Monitoring",
    desc: "Live CPU, RAM, disk, and network graphs so you always know how your server is performing.",
  },
  {
    icon: Globe,
    title: "Global Network",
    desc: "Low-latency nodes in multiple regions — your players connect fast, wherever they are.",
  },
  {
    icon: Terminal,
    title: "Full Console Access",
    desc: "Web-based console with real-time output. Manage your server like you're right there.",
  },
  {
    icon: Users,
    title: "Player Management",
    desc: "Whitelist, ban, op, and manage your community with built-in player controls.",
  },
];

const games = [
  { name: "Minecraft", color: "#62B47A" },
  { name: "Rust", color: "#CE422B" },
  { name: "Valheim", color: "#3E8FB0" },
  { name: "ARK", color: "#8B5CF6" },
  { name: "Terraria", color: "#22D3EE" },
  { name: "CS2", color: "#F59E0B" },
];

/* ─── Animated counter ─── */
function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const num = typeof value === "string" ? parseFloat(value) : value;

  useEffect(() => {
    let start = 0;
    const end = num;
    if (start === end) return;
    const duration = 1400;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [num]);

  return (
    <span>
      {typeof value === "string" && value.includes(".")
        ? display.toFixed(2)
        : display}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const { data: stats } = useQuery({
    queryKey: ["publicStats"],
    queryFn: () => statsApi.getPublic().then((r) => r.data),
  });

  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-stat]", {
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        y: 40,
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
      });

      gsap.from("[data-feature]", {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f] text-white overflow-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Game<span className="text-emerald-400">Host</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </a>
            <a href="#stats" className="text-sm text-white/60 hover:text-white transition-colors">
              Stats
            </a>
            <a href="#games" className="text-sm text-white/60 hover:text-white transition-colors">
              Games
            </a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center pt-16">
        <FloatingParticles className="absolute inset-0 pointer-events-none z-0" />

        {/* Background glows */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-emerald-500/8 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-cyan-500/5 blur-[100px]" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[300px] bg-purple-500/5 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              Game Servers{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Made Simple
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Deploy, manage, and scale your game servers with an intuitive control panel.
              Powered by enterprise infrastructure. Ready in seconds.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/signup"
                className="group flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                Start Free
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl transition-all"
              >
                <Terminal size={16} />
                Open Dashboard
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30"
            >
              {["99.99% Uptime SLA", "Free DDoS Protection", "24/7 Support", "No Hidden Fees"].map(
                (t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-500" />
                    {t}
                  </span>
                )
              )}
            </motion.div>

            {/* Terminal preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-16 max-w-3xl mx-auto"
            >
              <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden shadow-2xl shadow-emerald-500/5">
                {/* Window bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 text-xs text-white/30 font-mono">gamehost — server console</span>
                </div>
                {/* Terminal content */}
                <div className="p-5 font-mono text-sm leading-relaxed text-left">
                  <p className="text-white/30">
                    <span className="text-emerald-400">$</span> gamehost deploy --game minecraft --region us-east
                  </p>
                  <p className="text-white/40 mt-1">
                    ✓ Provisioning server... <span className="text-emerald-400">done</span>
                  </p>
                  <p className="text-white/40">
                    ✓ Installing Minecraft 1.21.4... <span className="text-emerald-400">done</span>
                  </p>
                  <p className="text-white/40">
                    ✓ Configuring firewall rules... <span className="text-emerald-400">done</span>
                  </p>
                  <p className="text-white/40">
                    ✓ Starting server... <span className="text-emerald-400">online</span>
                  </p>
                  <p className="text-white/50 mt-2">
                    <span className="text-emerald-400">→</span> Server ready at{" "}
                    <span className="text-cyan-400">play.gamehost.com:25565</span>
                  </p>
                  <p className="mt-2 text-white/20">
                    <span className="text-emerald-400">$</span>{" "}
                    <span className="animate-pulse">▌</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section id="stats" className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent" />
        <div ref={statsRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Active Servers", value: stats?.activeServers ?? 0, suffix: "+" },
              { label: "Happy Users", value: stats?.totalUsers ?? 0, suffix: "+" },
              { label: "Games Supported", value: stats?.totalServers ?? 6, suffix: "+" },
              { label: "Uptime", value: stats?.uptime ?? "99.99", suffix: "%" },
            ].map((stat) => (
              <div
                key={stat.label}
                data-stat
                className="text-center p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-colors"
              >
                <p className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-white/40 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-24">
        <div ref={featuresRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                host games
              </span>
            </h2>
            <p className="text-white/40 max-w-2xl mx-auto">
              Powerful features designed for gamers and server administrators.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                data-feature
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-7 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <feature.icon size={20} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Supported Games ─── */}
      <section id="games" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Deploy your favorite{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                games
              </span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              One-click install for the most popular game servers. More added every week.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {games.map((game) => (
              <motion.div
                key={game.name}
                whileHover={{ scale: 1.05, y: -4 }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: `${game.color}20` }}
                >
                  <Gamepad2 size={24} style={{ color: game.color }} />
                </div>
                <span className="text-sm font-medium text-white/70">{game.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Teaser ─── */}
      <section id="pricing" className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple,{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                transparent
              </span>{" "}
              pricing
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Start free. Scale when you need to. No surprises on your bill.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "Free",
                desc: "Perfect for trying things out",
                features: ["1 Server", "1 GB RAM", "Basic Support", "Community Access"],
                highlight: false,
              },
              {
                name: "Pro",
                price: "$9",
                period: "/mo",
                desc: "For serious gamers",
                features: ["5 Servers", "8 GB RAM", "Priority Support", "DDoS Protection", "Custom Domains"],
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                desc: "For communities & networks",
                features: ["Unlimited Servers", "Dedicated Nodes", "24/7 Support", "SLA Guarantee", "API Access"],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-b from-emerald-500/10 to-cyan-500/5 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/5"
                    : "bg-white/[0.02] border border-white/5 hover:border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white flex items-center gap-1">
                    <Star size={10} fill="white" /> Popular
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <p className="text-sm text-white/40 mb-5">{plan.desc}</p>
                <p className="text-4xl font-bold mb-6">
                  {plan.price}
                  {plan.period && <span className="text-lg text-white/40 font-normal">{plan.period}</span>}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center py-3 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                  }`}
                >
                  {plan.name === "Enterprise" ? "Contact Us" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-32">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Ready to launch your{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              server
            </span>
            ?
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Join thousands of gamers who trust GameHost for their servers. Deploy in under 60 seconds.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-10 py-4 rounded-xl transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] text-lg"
          >
            Get Started Free
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Gamepad2 size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold">
                Game<span className="text-emerald-400">Host</span>
              </span>
            </div>

            <div className="flex items-center gap-8 text-sm text-white/30">
              <a href="#" className="hover:text-white/60 transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Twitter
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Status
              </a>
              <a href="#" className="hover:text-white/60 transition-colors">
                Docs
              </a>
            </div>

            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} GameHost. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
