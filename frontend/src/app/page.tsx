'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Shield, Zap, Server, CreditCard, Puzzle, Globe } from 'lucide-react';

// ---------- 3D Components ----------

function FloatingCube({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.3;
        ref.current.rotation.y += 0.01 * speed;
    });

    return (
        <Float speed={speed} rotationIntensity={0.5} floatIntensity={2}>
            <mesh ref={ref} position={position}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={color} transparent opacity={0.6} wireframe />
            </mesh>
        </Float>
    );
}

function ParticleField() {
    const points = useMemo(() => {
        const positions = new Float32Array(2000 * 3);
        for (let i = 0; i < 2000; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        }
        return positions;
    }, []);

    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) ref.current.rotation.y += 0.0005;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[points, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#00d4ff" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
}

function HeroScene() {
    return (
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} className="!absolute inset-0">
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#7c3aed" />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <ParticleField />
            <FloatingCube position={[-3, 1.5, -2]} color="#00d4ff" speed={1.2} />
            <FloatingCube position={[3, -1, -3]} color="#7c3aed" speed={0.8} />
            <FloatingCube position={[0, 2, -4]} color="#3b82f6" speed={1} />
            <FloatingCube position={[-2, -2, -1]} color="#00d4ff" speed={0.6} />
            <FloatingCube position={[4, 0.5, -5]} color="#7c3aed" speed={1.5} />
        </Canvas>
    );
}

// ---------- Features ----------
const features = [
    { icon: Server, title: 'Instant Deploy', desc: 'One-click server provisioning powered by Pterodactyl Panel' },
    { icon: Shield, title: 'DDoS Protection', desc: 'Enterprise-grade protection for your game servers' },
    { icon: Zap, title: 'NVMe Storage', desc: 'Ultra-fast SSD storage for minimal lag and instant loading' },
    { icon: Puzzle, title: 'Plugin Installer', desc: 'Install mods & plugins from Modrinth and SpigotMC in one click' },
    { icon: CreditCard, title: 'Flexible Billing', desc: 'Multiple payment gateways with balance and credit system' },
    { icon: Globe, title: 'Global Network', desc: 'Servers across multiple regions for the best latency' },
];

// ---------- Plans Preview ----------
const plans = [
    { name: 'Starter', price: 'Free', ram: '1 GB', cpu: '50%', disk: '5 GB', color: 'from-green-500 to-emerald-500' },
    { name: 'Standard', price: '₹149/mo', ram: '4 GB', cpu: '200%', disk: '20 GB', color: 'from-primary to-blue-500' },
    { name: 'Premium', price: '₹499/mo', ram: '8 GB', cpu: '400%', disk: '50 GB', color: 'from-accent to-purple-500' },
];

// ---------- Main Page ----------
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-dark">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-dark/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-display font-bold gradient-text">
                        ⚡ GameHost
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a>
                        <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a>
                        <a href="#about" className="text-gray-400 hover:text-white transition-colors text-sm">About</a>
                        <Link href="/login" className="btn-primary text-sm px-5 py-2">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                <HeroScene />
                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
                            <Zap className="w-4 h-4" /> Lightning-fast game servers
                        </div>
                        <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
                            <span className="gradient-text">Game Hosting</span><br />
                            <span className="text-white">Reimagined.</span>
                        </h1>
                        <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                            Deploy high-performance game servers in seconds. Powered by Pterodactyl Panel
                            with automated billing, plugin management, and more.
                        </p>
                        <div className="flex gap-4">
                            <Link href="/login" className="btn-primary">
                                Start Free →
                            </Link>
                            <a href="#features" className="btn-secondary">
                                Learn More
                            </a>
                        </div>
                    </motion.div>
                </div>

                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-dark to-transparent" />
            </section>

            {/* Features */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-display font-bold mb-4">Why Choose <span className="gradient-text">GameHost</span></h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Everything you need to run game servers, from a simple free plan to a fully loaded premium setup.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card-hover p-6"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <f.icon className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-display font-bold mb-4">Simple <span className="gradient-text">Pricing</span></h2>
                        <p className="text-gray-400">Start free. Scale when you&apos;re ready.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className={`glass-card p-8 relative ${i === 1 ? 'ring-2 ring-primary/50 scale-105' : ''}`}
                            >
                                {i === 1 && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-blue-500 text-white text-xs font-bold rounded-full">
                                        POPULAR
                                    </div>
                                )}
                                <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                                <div className={`text-3xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent mb-6`}>
                                    {plan.price}
                                </div>
                                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.ram} RAM</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.cpu} CPU</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.disk} Disk</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Plugin Installer</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> DDoS Protection</li>
                                </ul>
                                <Link href="/login" className={i === 1 ? 'btn-primary w-full text-center block' : 'btn-secondary w-full text-center block'}>
                                    Get Started
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="text-xl font-display font-bold gradient-text">⚡ GameHost</span>
                    <p className="text-gray-500 text-sm">© {new Date().getFullYear()} GameHost. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
