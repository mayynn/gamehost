'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* Background animated elements */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float-delay-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
                    {/* Decorative circles */}
                    <div className="absolute inset-0 border border-primary/5 rounded-full" />
                    <div className="absolute inset-8 border border-primary/10 rounded-full" />
                    <div className="absolute inset-16 border border-primary/5 rounded-full" />
                </div>
                {/* Floating dots */}
                {[...Array(20)].map((_, i) => {
                    const positions = [
                        { l: '5%', t: '10%' }, { l: '15%', t: '25%' }, { l: '25%', t: '5%' }, { l: '35%', t: '80%' },
                        { l: '45%', t: '50%' }, { l: '55%', t: '15%' }, { l: '65%', t: '70%' }, { l: '75%', t: '35%' },
                        { l: '85%', t: '60%' }, { l: '95%', t: '20%' }, { l: '10%', t: '90%' }, { l: '20%', t: '45%' },
                        { l: '30%', t: '65%' }, { l: '40%', t: '30%' }, { l: '50%', t: '85%' }, { l: '60%', t: '40%' },
                        { l: '70%', t: '55%' }, { l: '80%', t: '75%' }, { l: '90%', t: '12%' }, { l: '3%', t: '52%' },
                    ];
                    return (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
                            style={{ left: positions[i].l, top: positions[i].t }}
                        />
                    );
                })}
            </div>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="glass-card p-8 md:p-10">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="text-3xl font-display font-bold gradient-text">
                            ⚡ GameHost
                        </Link>
                        <p className="text-gray-400 mt-3 text-sm">Sign in to manage your game servers</p>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="space-y-4">
                        <a
                            href={authApi.googleUrl}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white/5 border border-white/10
                         rounded-xl text-white font-medium transition-all duration-300
                         hover:bg-white/10 hover:border-white/20 hover:shadow-lg group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="group-hover:translate-x-0.5 transition-transform">Continue with Google</span>
                        </a>

                        <a
                            href={authApi.discordUrl}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#5865F2]/10 border border-[#5865F2]/20
                         rounded-xl text-white font-medium transition-all duration-300
                         hover:bg-[#5865F2]/20 hover:border-[#5865F2]/40 hover:shadow-lg group"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
                                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            <span className="group-hover:translate-x-0.5 transition-transform">Continue with Discord</span>
                        </a>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Secure Login</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Info */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500 leading-relaxed">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                            We never store passwords — OAuth only.
                        </p>
                    </div>
                </div>

                {/* Back link */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-primary transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
