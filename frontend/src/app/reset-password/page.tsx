'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowRight, Check, X, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        match: password === confirmPassword && confirmPassword.length > 0,
    };
    const passwordValid = passwordChecks.length && passwordChecks.uppercase &&
        passwordChecks.lowercase && passwordChecks.number && passwordChecks.match;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !passwordValid) return;
        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            setSuccess(true);
            toast.success('Password reset successfully!');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Reset failed. The link may have expired.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="glass-card-3d p-8 max-w-md mx-4 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Invalid Reset Link</h3>
                    <p className="text-gray-400 text-sm mb-6">This password reset link is invalid or has expired.</p>
                    <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2 btn-3d">
                        Request New Link <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* 3D Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent/8 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-float-delay-2" />
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

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Password Reset!</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Your password has been updated. You can now sign in with your new password.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 btn-3d">
                                Sign In <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-display font-bold">Reset your password</h2>
                                <p className="text-gray-400 text-sm mt-2">Choose a strong new password for your account.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="New password"
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
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field pl-11 input-3d"
                                        required
                                    />
                                </div>

                                {/* Strength indicators */}
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

                                {confirmPassword.length > 0 && !passwordChecks.match && (
                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                        <X className="w-3 h-3" /> Passwords do not match
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !passwordValid}
                                    className="btn-primary w-full flex items-center justify-center gap-2 btn-3d"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Reset Password <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
