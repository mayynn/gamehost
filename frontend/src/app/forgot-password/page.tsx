'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            setSent(true);
        } catch {
            toast.error('Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* 3D Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-float-delay-2" />
                <div className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px),
                                         linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px',
                        transform: 'perspective(600px) rotateX(55deg)',
                        transformOrigin: 'center top',
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, rotateX: -10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md mx-4"
                style={{ perspective: '1200px' }}
            >
                <div className="glass-card-3d p-8 md:p-10">
                    <div className="text-center mb-8">
                        <Link href="/" className="text-3xl font-display font-bold gradient-text">
                            ⚡ GameHost
                        </Link>
                    </div>

                    {sent ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Check your email</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                If an account with <span className="text-white font-medium">{email}</span> exists,
                                we&apos;ve sent a password reset link.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 btn-3d">
                                Back to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-display font-bold">Forgot your password?</h2>
                                <p className="text-gray-400 text-sm mt-2">
                                    Enter your email and we&apos;ll send you a reset link.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 btn-3d"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>

                            <div className="text-center mt-6">
                                <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1">
                                    <ArrowLeft className="w-3 h-3" /> Back to login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
