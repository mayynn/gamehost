'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { Shield, Zap, Server, CreditCard, Puzzle, Globe, Menu, X, ChevronDown, Users, Clock, Sparkles, LayoutDashboard } from 'lucide-react';
import { plansApi, statsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════ 3D SCENE COMPONENTS ═══════════════

/* ── Rotating double-helix network with energy pulses ── */
function HelixNetwork() {
    const linesRef = useRef<THREE.LineSegments>(null);
    const nodesRef = useRef<THREE.Points>(null);
    const pulseRef = useRef<THREE.Points>(null);
    const helixPoints = 120;
    const turns = 4;
    const radius = 3;
    const height = 40;
    const pulseCount = 24;

    const { nodePositions, nodeColors, linePositions, lineColors, pulsePositions, pulseData } = useMemo(() => {
        const nPos = new Float32Array(helixPoints * 2 * 3);
        const nCol = new Float32Array(helixPoints * 2 * 3);
        const lPos: number[] = [];
        const lCol: number[] = [];
        const pPos = new Float32Array(pulseCount * 3);
        const pData = new Float32Array(pulseCount * 2);

        const c1 = new THREE.Color('#00d4ff');
        const c2 = new THREE.Color('#7c3aed');
        const c3 = new THREE.Color('#3b82f6');

        for (let i = 0; i < helixPoints; i++) {
            const t = i / helixPoints;
            const angle = t * Math.PI * 2 * turns;
            const y = (t - 0.5) * height;

            const x1 = Math.cos(angle) * radius;
            const z1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle + Math.PI) * radius;
            const z2 = Math.sin(angle + Math.PI) * radius;

            nPos[i * 6] = x1;
            nPos[i * 6 + 1] = y;
            nPos[i * 6 + 2] = z1;
            nPos[i * 6 + 3] = x2;
            nPos[i * 6 + 4] = y;
            nPos[i * 6 + 5] = z2;

            const color = new THREE.Color();
            color.lerpColors(c1, c2, t);
            nCol[i * 6] = color.r; nCol[i * 6 + 1] = color.g; nCol[i * 6 + 2] = color.b;
            const color2 = new THREE.Color();
            color2.lerpColors(c3, c1, t);
            nCol[i * 6 + 3] = color2.r; nCol[i * 6 + 4] = color2.g; nCol[i * 6 + 5] = color2.b;

            /* Cross-bridge rungs every 6 nodes */
            if (i % 6 === 0) {
                lPos.push(x1, y, z1, x2, y, z2);
                const bridgeCol = new THREE.Color();
                bridgeCol.lerpColors(c1, c3, t);
                lCol.push(bridgeCol.r, bridgeCol.g, bridgeCol.b, bridgeCol.r, bridgeCol.g, bridgeCol.b);
            }

            /* Strand connections along each helix */
            if (i > 0) {
                const prev = i - 1;
                const pt = prev / helixPoints;
                const pa = pt * Math.PI * 2 * turns;
                const py = (pt - 0.5) * height;
                lPos.push(Math.cos(pa) * radius, py, Math.sin(pa) * radius, x1, y, z1);
                lCol.push(color.r, color.g, color.b, color.r, color.g, color.b);
                lPos.push(Math.cos(pa + Math.PI) * radius, py, Math.sin(pa + Math.PI) * radius, x2, y, z2);
                lCol.push(color2.r, color2.g, color2.b, color2.r, color2.g, color2.b);
            }
        }

        for (let i = 0; i < pulseCount; i++) {
            pPos[i * 3] = 0; pPos[i * 3 + 1] = 0; pPos[i * 3 + 2] = 0;
            pData[i * 2] = Math.random();
            pData[i * 2 + 1] = i % 2 === 0 ? 0 : 1;
        }

        return {
            nodePositions: nPos,
            nodeColors: nCol,
            linePositions: new Float32Array(lPos),
            lineColors: new Float32Array(lCol),
            pulsePositions: pPos,
            pulseData: pData,
        };
    }, []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (linesRef.current) {
            linesRef.current.rotation.y = t * 0.06;
            const mat = linesRef.current.material as THREE.LineBasicMaterial;
            mat.opacity = 0.12 + Math.sin(t * 0.3) * 0.04;
        }
        if (nodesRef.current) {
            nodesRef.current.rotation.y = t * 0.06;
            const mat = nodesRef.current.material as THREE.PointsMaterial;
            mat.opacity = 0.65 + Math.sin(t * 0.5) * 0.15;
        }

        /* Animate energy pulses along helix strands */
        if (pulseRef.current) {
            pulseRef.current.rotation.y = t * 0.06;
            const arr = pulseRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < pulseCount; i++) {
                const progress = (pulseData[i * 2] + t * 0.08) % 1;
                const strand = pulseData[i * 2 + 1];
                const angle = progress * Math.PI * 2 * turns;
                const offset = strand === 0 ? 0 : Math.PI;
                arr[i * 3] = Math.cos(angle + offset) * radius;
                arr[i * 3 + 1] = (progress - 0.5) * height;
                arr[i * 3 + 2] = Math.sin(angle + offset) * radius;
            }
            (pulseRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
    });

    return (
        <group position={[5, 0, -8]} rotation={[0.15, -0.3, 0.12]}>
            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
                    <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
                </bufferGeometry>
                <lineBasicMaterial vertexColors transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
            </lineSegments>
            <points ref={nodesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
                    <bufferAttribute attach="attributes-color" args={[nodeColors, 3]} />
                </bufferGeometry>
                <pointsMaterial size={0.12} vertexColors transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
            <points ref={pulseRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[pulsePositions, 3]} />
                </bufferGeometry>
                <pointsMaterial size={0.3} color="#00d4ff" transparent opacity={0.9} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
        </group>
    );
}

/* ── Floating connected node constellation ── */
function NodeConstellation() {
    const groupRef = useRef<THREE.Group>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const pointsRef = useRef<THREE.Points>(null);
    const nodeCount = 60;
    const maxDist = 6;

    const { positions, basePositions, lineData, lineColors, pointColors } = useMemo(() => {
        const pos = new Float32Array(nodeCount * 3);
        const bpos = new Float32Array(nodeCount * 3);
        const pcol = new Float32Array(nodeCount * 3);
        const palette = [new THREE.Color('#00d4ff'), new THREE.Color('#7c3aed'), new THREE.Color('#3b82f6'), new THREE.Color('#06b6d4')];

        for (let i = 0; i < nodeCount; i++) {
            const x = (Math.random() - 0.5) * 30;
            const y = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20 - 10;
            pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
            bpos[i * 3] = x; bpos[i * 3 + 1] = y; bpos[i * 3 + 2] = z;
            const c = palette[Math.floor(Math.random() * palette.length)];
            pcol[i * 3] = c.r; pcol[i * 3 + 1] = c.g; pcol[i * 3 + 2] = c.b;
        }

        const lineVerts: number[] = [];
        const lColors: number[] = [];
        for (let i = 0; i < nodeCount; i++) {
            for (let j = i + 1; j < nodeCount; j++) {
                const dx = bpos[i * 3] - bpos[j * 3];
                const dy = bpos[i * 3 + 1] - bpos[j * 3 + 1];
                const dz = bpos[i * 3 + 2] - bpos[j * 3 + 2];
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (d < maxDist) {
                    lineVerts.push(bpos[i * 3], bpos[i * 3 + 1], bpos[i * 3 + 2]);
                    lineVerts.push(bpos[j * 3], bpos[j * 3 + 1], bpos[j * 3 + 2]);
                    const alpha = 1 - d / maxDist;
                    const lc = new THREE.Color('#3b82f6');
                    lColors.push(lc.r * alpha, lc.g * alpha, lc.b * alpha);
                    lColors.push(lc.r * alpha, lc.g * alpha, lc.b * alpha);
                }
            }
        }
        return {
            positions: pos,
            basePositions: bpos,
            lineData: new Float32Array(lineVerts),
            lineColors: new Float32Array(lColors),
            pointColors: pcol,
        };
    }, []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.02;
        }
        if (pointsRef.current) {
            const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < nodeCount; i++) {
                arr[i * 3] = basePositions[i * 3] + Math.sin(t * 0.3 + i * 0.5) * 0.4;
                arr[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.25 + i * 0.7) * 0.3;
            }
            (pointsRef.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef}>
            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[lineData, 3]} />
                    <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
                </bufferGeometry>
                <lineBasicMaterial vertexColors transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
            </lineSegments>
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                    <bufferAttribute attach="attributes-color" args={[pointColors, 3]} />
                </bufferGeometry>
                <pointsMaterial size={0.15} vertexColors transparent opacity={0.6} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
            </points>
        </group>
    );
}

/* ── Central pulsing energy core ── */
function EnergyCore() {
    const ringRef1 = useRef<THREE.Mesh>(null);
    const ringRef2 = useRef<THREE.Mesh>(null);
    const ringRef3 = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (ringRef1.current) {
            ringRef1.current.rotation.x = t * 0.5;
            ringRef1.current.rotation.z = t * 0.2;
            const s = 1 + Math.sin(t * 0.8) * 0.1;
            ringRef1.current.scale.set(s, s, s);
        }
        if (ringRef2.current) {
            ringRef2.current.rotation.y = t * 0.4;
            ringRef2.current.rotation.x = t * 0.3;
            const s = 1 + Math.cos(t * 0.6) * 0.08;
            ringRef2.current.scale.set(s, s, s);
        }
        if (ringRef3.current) {
            ringRef3.current.rotation.z = t * 0.35;
            ringRef3.current.rotation.y = t * 0.25;
        }
        if (coreRef.current) {
            const pulse = 0.06 + Math.sin(t * 1.2) * 0.025;
            const mat = coreRef.current.material as THREE.MeshBasicMaterial;
            mat.opacity = pulse;
            const cs = 1 + Math.sin(t * 1.5) * 0.15;
            coreRef.current.scale.set(cs, cs, cs);
        }
    });

    return (
        <group position={[-4, 1, -12]}>
            <mesh ref={ringRef1}>
                <torusGeometry args={[2.5, 0.02, 16, 100]} />
                <meshBasicMaterial color="#00d4ff" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh ref={ringRef2}>
                <torusGeometry args={[2.0, 0.015, 16, 100]} />
                <meshBasicMaterial color="#7c3aed" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh ref={ringRef3}>
                <torusGeometry args={[1.5, 0.012, 16, 100]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh ref={coreRef}>
                <sphereGeometry args={[1.2, 32, 32]} />
                <meshBasicMaterial color="#00d4ff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
        </group>
    );
}

/* ── Drifting embers / data-particles ── */
function DataEmbers() {
    const count = 800;
    const ref = useRef<THREE.Points>(null);

    const { positions, velocities, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const vel = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const palette = [new THREE.Color('#00d4ff'), new THREE.Color('#7c3aed'), new THREE.Color('#3b82f6'), new THREE.Color('#e2e8f0')];

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 60;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
            pos[i * 3 + 2] = Math.random() * -50 - 5;
            vel[i * 3] = (Math.random() - 0.5) * 0.005;
            vel[i * 3 + 1] = 0.004 + Math.random() * 0.008;
            vel[i * 3 + 2] = (Math.random() - 0.5) * 0.003;
            const c = palette[Math.floor(Math.random() * palette.length)];
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        return { positions: pos, velocities: vel, colors: col };
    }, []);

    useFrame(() => {
        if (!ref.current) return;
        const arr = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            arr[i * 3] += velocities[i * 3];
            arr[i * 3 + 1] += velocities[i * 3 + 1];
            arr[i * 3 + 2] += velocities[i * 3 + 2];
            if (arr[i * 3 + 1] > 25) {
                arr[i * 3] = (Math.random() - 0.5) * 60;
                arr[i * 3 + 1] = -25;
                arr[i * 3 + 2] = Math.random() * -50 - 5;
            }
        }
        (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                <bufferAttribute attach="attributes-color" args={[colors, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.035} vertexColors transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
    );
}

function CameraRig() {
    const { camera } = useThree();
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        camera.position.x = Math.sin(t * 0.04) * 0.8;
        camera.position.y = Math.cos(t * 0.025) * 0.4;
        camera.lookAt(0, 0, -8);
    });
    return null;
}

function HeroScene() {
    return (
        <Canvas
            camera={{ position: [0, 0, 10], fov: 60 }}
            className="!absolute inset-0"
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            fallback={<div className="absolute inset-0 bg-dark" />}
        >
            <color attach="background" args={['#0a0e17']} />
            <fog attach="fog" args={['#0a0e17', 30, 65]} />

            <ambientLight intensity={0.08} />
            <pointLight position={[10, 10, 5]} intensity={0.4} color="#00d4ff" distance={60} />
            <pointLight position={[-10, -5, -10]} intensity={0.25} color="#7c3aed" distance={50} />
            <pointLight position={[0, 8, -20]} intensity={0.2} color="#3b82f6" distance={60} />

            <HelixNetwork />
            <NodeConstellation />
            <EnergyCore />
            <DataEmbers />

            <CameraRig />
        </Canvas>
    );
}

// ═══════════════ ANIMATED COUNTER ═══════════════

function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
    const [count, setCount] = useState(0);
    const numTarget = parseInt(target.replace(/[^0-9]/g, ''));
    useEffect(() => {
        let start = 0;
        const duration = 2000;
        const step = Math.ceil(numTarget / (duration / 16));
        const timer = setInterval(() => {
            start += step;
            if (start >= numTarget) { setCount(numTarget); clearInterval(timer); }
            else setCount(start);
        }, 16);
        return () => clearInterval(timer);
    }, [numTarget]);
    return <>{count.toLocaleString()}{suffix}</>;
}

// ═══════════════ FEATURES ═══════════════

const features = [
    { icon: Server, title: 'Instant Deploy', desc: 'One-click server provisioning powered by Pterodactyl Panel. Your server is online in seconds.', color: 'from-cyan-500 to-blue-500' },
    { icon: Shield, title: 'DDoS Protection', desc: 'Enterprise-grade mitigation keeps your servers online during attacks.', color: 'from-green-500 to-emerald-500' },
    { icon: Zap, title: 'NVMe Storage', desc: 'Ultra-fast SSD storage for minimal lag and instant world loading.', color: 'from-yellow-500 to-orange-500' },
    { icon: Puzzle, title: 'Plugin Manager', desc: 'Install mods & plugins from Modrinth and SpigotMC with a single click.', color: 'from-purple-500 to-pink-500' },
    { icon: CreditCard, title: 'Flexible Billing', desc: 'Multiple payment gateways with balance, credits, and UPI support.', color: 'from-blue-500 to-indigo-500' },
    { icon: Globe, title: 'Global Network', desc: 'Multiple regions worldwide for the lowest possible latency.', color: 'from-teal-500 to-cyan-500' },
];

const defaultStats = [
    { icon: Server, key: 'activeServers', value: '0', suffix: '+', label: 'Active Servers' },
    { icon: Users, key: 'totalUsers', value: '0', suffix: '+', label: 'Happy Players' },
    { icon: Clock, key: 'uptime', value: '99.9', suffix: '%', label: 'Uptime SLA' },
    { icon: Sparkles, key: 'totalPlugins', value: '10', suffix: 'K+', label: 'Plugins Available' },
];

const planColors = [
    'from-green-500 to-emerald-500',
    'from-primary to-blue-500',
    'from-accent to-purple-500',
    'from-orange-500 to-red-500',
];

// ═══════════════ MAIN PAGE ═══════════════

export default function LandingPage() {
    const { user: authUser } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [stats, setStats] = useState(defaultStats);
    const [mobileNav, setMobileNav] = useState(false);
    const { scrollYProgress } = useScroll();
    const navBg = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

    useEffect(() => {
        plansApi.list().then((r) => {
            const data = r.data || [];
            setPlans(data.filter((p: any) => p.type !== 'CUSTOM').slice(0, 4));
        }).catch(() => { });

        // Fetch real-time stats
        const fetchStats = () => {
            statsApi.public().then((r) => {
                const d = r.data;
                setStats([
                    { icon: Server, key: 'activeServers', value: String(d.activeServers || 0), suffix: '+', label: 'Active Servers' },
                    { icon: Users, key: 'totalUsers', value: String(d.totalUsers || 0), suffix: '+', label: 'Happy Players' },
                    { icon: Clock, key: 'uptime', value: String(d.uptime || '99.9'), suffix: '%', label: 'Uptime SLA' },
                    { icon: Sparkles, key: 'totalPlugins', value: String(Math.floor(parseInt(d.totalPlugins || '10000') / 1000)), suffix: 'K+', label: 'Plugins Available' },
                ]);
            }).catch(() => { });
        };
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // refresh every 60s
        return () => clearInterval(interval);
    }, []);

    const scrollToSection = useCallback((id: string) => {
        setMobileNav(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    return (
        <div className="min-h-screen bg-dark">
            {/* ── Navbar ── */}
            <motion.nav
                className="fixed top-0 w-full z-50 border-b transition-colors duration-300"
                style={{
                    backgroundColor: `rgba(10, 14, 23, ${navBg.get() < 0.5 ? 0.6 : 0.9})`,
                    borderColor: `rgba(255, 255, 255, ${navBg.get() < 0.5 ? 0.03 : 0.08})`,
                    backdropFilter: 'blur(20px)',
                }}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-display font-bold gradient-text">
                        ⚡ GameHost
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white transition-colors text-sm">Features</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</button>
                        <button onClick={() => scrollToSection('about')} className="text-gray-400 hover:text-white transition-colors text-sm">About</button>
                        {authUser ? (
                            <Link href="/dashboard" className="btn-primary text-sm px-5 py-2 inline-flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                            </Link>
                        ) : (
                            <Link href="/login" className="btn-primary text-sm px-5 py-2">Get Started</Link>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                        onClick={() => setMobileNav(!mobileNav)}
                        aria-label={mobileNav ? 'Close menu' : 'Open menu'}
                    >
                        {mobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile dropdown */}
                {mobileNav && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-white/5 bg-dark/95 backdrop-blur-xl"
                    >
                        <div className="px-6 py-4 space-y-3">
                            <button onClick={() => scrollToSection('features')} className="block w-full text-left text-gray-300 hover:text-white py-2 text-sm">Features</button>
                            <button onClick={() => scrollToSection('pricing')} className="block w-full text-left text-gray-300 hover:text-white py-2 text-sm">Pricing</button>
                            <button onClick={() => scrollToSection('about')} className="block w-full text-left text-gray-300 hover:text-white py-2 text-sm">About</button>
                            {authUser ? (
                                <Link href="/dashboard" className="btn-primary text-sm px-5 py-2 block text-center mt-2" onClick={() => setMobileNav(false)}>
                                    <span className="inline-flex items-center gap-2 justify-center"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>
                                </Link>
                            ) : (
                                <Link href="/login" className="btn-primary text-sm px-5 py-2 block text-center mt-2" onClick={() => setMobileNav(false)}>Get Started</Link>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.nav>

            {/* ── Hero ── */}
            <section className="relative min-h-screen flex items-center overflow-hidden">
                <HeroScene />
                <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        className="max-w-2xl"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6"
                        >
                            <Zap className="w-4 h-4" />
                            <span>Lightning-fast game servers</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.1] mb-6">
                            <span className="gradient-text">Game Hosting</span><br />
                            <span className="text-white">Reimagined.</span>
                        </h1>
                        <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-xl">
                            Deploy high-performance game servers in seconds. Powered by Pterodactyl Panel
                            with automated billing, plugin management, and more.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            {authUser ? (
                                <Link href="/dashboard" className="btn-primary group">
                                    Go to Dashboard <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                                </Link>
                            ) : (
                                <Link href="/login" className="btn-primary group">
                                    Start Free <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                                </Link>
                            )}
                            <button onClick={() => scrollToSection('features')} className="btn-secondary">
                                Learn More
                            </button>
                        </div>
                    </motion.div>

                    {/* Scroll indicator */}
                    <motion.div
                        className="absolute bottom-8 left-1/2 -translate-x-1/2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                    >
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <ChevronDown className="w-6 h-6 text-gray-600" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Gradient overlays */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-dark via-dark/50 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-dark/30 to-transparent pointer-events-none" />
            </section>

            {/* ── Stats Strip ── */}
            <section className="relative -mt-4 z-20">
                <div className="max-w-5xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="glass-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4"
                    >
                        {stats.map((s) => (
                            <div key={s.key} className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <s.icon className="w-4 h-4 text-primary" />
                                    <span className="text-2xl md:text-3xl font-display font-bold gradient-text">
                                        <AnimatedCounter target={s.value} suffix={s.suffix} />
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <span className="text-primary text-sm font-medium tracking-wider uppercase">Features</span>
                        <h2 className="text-4xl font-display font-bold mt-3 mb-4">Why Choose <span className="gradient-text">GameHost</span></h2>
                        <p className="text-gray-400 max-w-xl mx-auto">Everything you need to run game servers, from a simple free plan to a fully loaded premium setup.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08, duration: 0.5 }}
                                className="glass-card-hover p-6 group relative overflow-hidden"
                            >
                                {/* Hover glow */}
                                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${f.color} rounded-full opacity-0 group-hover:opacity-[0.07] blur-3xl transition-opacity duration-500`} />
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} bg-opacity-10 flex items-center justify-center mb-4 relative`}>
                                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${f.color} opacity-10`} />
                                    <f.icon className="w-6 h-6 text-white relative z-10" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section id="pricing" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <span className="text-primary text-sm font-medium tracking-wider uppercase">Pricing</span>
                        <h2 className="text-4xl font-display font-bold mt-3 mb-4">Simple <span className="gradient-text">Pricing</span></h2>
                        <p className="text-gray-400">Start free. Scale when you&apos;re ready.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {plans.map((plan, i) => (
                            <motion.div
                                key={plan.id || plan.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12, duration: 0.5 }}
                                className={`glass-card p-8 relative group hover:border-primary/30 transition-all duration-300 ${i === 2 ? 'ring-2 ring-primary/50 md:scale-105' : ''}`}
                            >
                                {i === 2 && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-accent to-purple-500 text-white text-xs font-bold rounded-full shadow-lg shadow-accent/30">
                                        POPULAR
                                    </div>
                                )}
                                <h3 className="text-xl font-display font-bold mb-1">{plan.name}</h3>
                                <div className={`text-3xl font-bold bg-gradient-to-r ${planColors[i % planColors.length]} bg-clip-text text-transparent mb-6`}>
                                    {plan.type === 'FREE' ? 'Free' : `₹${plan.pricePerMonth}/mo`}
                                </div>
                                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.ram >= 1024 ? `${(plan.ram / 1024).toFixed(0)} GB` : `${plan.ram} MB`} RAM</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.cpu}% CPU</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {plan.disk >= 1024 ? `${(plan.disk / 1024).toFixed(0)} GB` : `${plan.disk} MB`} Disk</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Plugin Installer</li>
                                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> DDoS Protection</li>
                                </ul>
                                <Link href={authUser ? '/dashboard/servers/create' : '/login'} className={i === 2 ? 'btn-primary w-full text-center block' : 'btn-secondary w-full text-center block'}>
                                    {authUser ? 'Create Server' : 'Get Started'}
                                </Link>
                            </motion.div>
                        ))}
                        {plans.length === 0 && (
                            <>
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className="glass-card p-8 animate-pulse">
                                        <div className="h-6 w-24 bg-white/10 rounded mb-3" />
                                        <div className="h-10 w-32 bg-white/10 rounded mb-6" />
                                        <div className="space-y-3">
                                            {[0, 1, 2, 3, 4].map((j) => <div key={j} className="h-4 bg-white/5 rounded" />)}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ── About ── */}
            <section id="about" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <span className="text-primary text-sm font-medium tracking-wider uppercase">About Us</span>
                            <h2 className="text-4xl font-display font-bold mt-3 mb-6">Built by Gamers,<br /><span className="gradient-text">for Gamers</span></h2>
                            <p className="text-gray-400 leading-relaxed mb-6">
                                We started GameHost because we were tired of overpriced, underperforming game server hosting.
                                Our platform is built on open-source technology — Pterodactyl Panel at its core — with a modern
                                dashboard, instant deployment, and transparent pricing.
                            </p>
                            <p className="text-gray-400 leading-relaxed mb-8">
                                Whether you&apos;re running a small Minecraft SMP with friends or managing a large network,
                                GameHost scales with you. Start free, upgrade when you need more power.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {authUser ? (
                                    <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
                                ) : (
                                    <>
                                        <Link href="/login" className="btn-primary">Get Started Free</Link>
                                        <Link href="/signup" className="btn-secondary">Create Account</Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="grid grid-cols-2 gap-4"
                        >
                            {[
                                { label: 'Uptime', value: '99.9%', desc: 'SLA guarantee' },
                                { label: 'Support', value: '24/7', desc: 'Discord & email' },
                                { label: 'Deploy', value: '<10s', desc: 'Server provisioning' },
                                { label: 'Regions', value: 'Multi', desc: 'Global network' },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="glass-card p-6 text-center"
                                >
                                    <p className="text-2xl font-display font-bold gradient-text mb-1">{item.value}</p>
                                    <p className="text-sm font-medium text-white mb-0.5">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="py-16">
                <div className="max-w-4xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-dark to-accent/20 p-12 text-center border border-white/10"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,212,255,0.1),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(124,58,237,0.1),transparent_50%)]" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to <span className="gradient-text">Get Started</span>?</h2>
                            <p className="text-gray-400 max-w-lg mx-auto mb-8">
                                Deploy your first server for free in under 10 seconds. No credit card required.
                            </p>
                            <Link href={authUser ? '/dashboard' : '/signup'} className="btn-primary text-lg px-8 py-4 inline-block">
                                {authUser ? 'Go to Dashboard →' : 'Create Free Account →'}
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div className="md:col-span-2">
                            <span className="text-xl font-display font-bold gradient-text">⚡ GameHost</span>
                            <p className="text-gray-500 text-sm mt-3 max-w-sm">
                                High-performance game server hosting powered by open-source technology.
                                Start free, scale infinitely.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Product</h4>
                            <div className="space-y-2">
                                <button onClick={() => scrollToSection('features')} className="block text-sm text-gray-500 hover:text-white transition-colors">Features</button>
                                <button onClick={() => scrollToSection('pricing')} className="block text-sm text-gray-500 hover:text-white transition-colors">Pricing</button>
                                <Link href={authUser ? '/dashboard' : '/login'} className="block text-sm text-gray-500 hover:text-white transition-colors">Dashboard</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-3">Support</h4>
                            <div className="space-y-2">
                                <Link href={authUser ? '/dashboard/support' : '/login'} className="block text-sm text-gray-500 hover:text-white transition-colors">Help Center</Link>
                                <button onClick={() => scrollToSection('about')} className="block text-sm text-gray-500 hover:text-white transition-colors">About Us</button>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-600 text-sm">© {new Date().getFullYear()} GameHost. All rights reserved.</p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            All systems operational
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
