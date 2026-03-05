'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
    };
    const passwordValid = Object.values(passwordChecks).every(Boolean);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !passwordValid) return;
        setLoading(true);
        try {
            const res = await authApi.register({ email, name, password });
            toast.success(res.data.message);
            setSuccess(true);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* 3D Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-float-delay-2" />

                {/* 3D hex grid */}
                <div className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `radial-gradient(circle, rgba(124,58,237,0.4) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                        transform: 'perspective(400px) rotateX(50deg)',
                        transformOrigin: 'center bottom',
                    }}
                />

                {/* 3D floating spheres */}
                {[...Array(5)].map((_, i) => {
                    const configs = [
                        { l: '8%', t: '15%', s: 60, d: 7, o: 0.08 },
                        { l: '85%', t: '25%', s: 45, d: 9, o: 0.06 },
                        { l: '75%', t: '75%', s: 70, d: 8, o: 0.07 },
                        { l: '20%', t: '80%', s: 40, d: 10, o: 0.05 },
                        { l: '50%', t: '5%', s: 35, d: 6, o: 0.09 },
                    ];
                    const c = configs[i];
                    return (
                        <div
                            key={i}
                            className="absolute rounded-full animate-float"
                            style={{
                                left: c.l, top: c.t,
                                width: c.s, height: c.s,
                                animationDuration: `${c.d}s`,
                                animationDelay: `${i * 0.8}s`,
                                background: `radial-gradient(circle at 30% 30%, rgba(124,58,237,${c.o + 0.05}), rgba(0,212,255,${c.o}))`,
                                boxShadow: `0 8px 40px rgba(124,58,237,${c.o})`,
                            }}
                        />
                    );
                })}
            </div>

            {/* Signup Card */}
            <motion.div
                initial={{ opacity: 0, y: 30, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md mx-4"
                style={{ perspective: '1200px' }}
            >
                <div className="glass-card-3d p-8 md:p-10">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="text-3xl font-display font-bold gradient-text">
                            ⚡ GameHost
                        </Link>
                        <p className="text-gray-400 mt-3 text-sm">Create your account to get started</p>
                    </div>

                    {success ? (
                        /* Success State */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-6"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Check your email!</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                We&apos;ve sent a verification link to <span className="text-white font-medium">{email}</span>.
                                Click the link to activate your account.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 btn-3d">
                                Go to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : (
                        /* Registration Form */
                        <>
                            <form onSubmit={handleRegister} className="space-y-4 mb-6">
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field pl-11 input-3d"
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field pl-11 input-3d"
                                        required
                                    />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pl-11 pr-11 input-3d"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Password strength indicators */}
                                {password.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="grid grid-cols-2 gap-1.5 text-xs"
                                    >
                                        {[
                                            { label: '8+ characters', ok: passwordChecks.length },
                                            { label: 'Uppercase', ok: passwordChecks.uppercase },
                                            { label: 'Lowercase', ok: passwordChecks.lowercase },
                                            { label: 'Number', ok: passwordChecks.number },
                                        ].map((c) => (
                                            <div key={c.label} className={`flex items-center gap-1.5 ${c.ok ? 'text-green-400' : 'text-gray-500'}`}>
                                                {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {c.label}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !passwordValid}
                                    className="btn-primary w-full flex items-center justify-center gap-2 btn-3d"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Create Account <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-gray-500 uppercase tracking-wider">or sign up with</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* OAuth */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <a href={authApi.googleUrl}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10
                                        rounded-xl text-white text-sm font-medium transition-all duration-300
                                        hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:-translate-y-0.5">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>Google</span>
                                </a>
                                <a href={authApi.discordUrl}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#5865F2]/10 border border-[#5865F2]/20
                                        rounded-xl text-white text-sm font-medium transition-all duration-300
                                        hover:bg-[#5865F2]/20 hover:border-[#5865F2]/40 hover:shadow-lg hover:-translate-y-0.5">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#5865F2">
                                        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    <span>Discord</span>
                                </a>
                            </div>

                            {/* Login link */}
                            <div className="text-center">
                                <p className="text-sm text-gray-500">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
