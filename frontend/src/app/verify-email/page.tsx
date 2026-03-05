'use client';

import { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, X, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <VerifyEmailPageInner />
        </Suspense>
    );
}

function VerifyEmailPageInner() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('This verification link is missing or invalid.');
            return;
        }

        // Verify via API call instead of full-page redirect
        authApi.verifyEmail(token)
            .then(() => {
                setStatus('success');
            })
            .catch((e: any) => {
                // If the API doesn't have a dedicated endpoint, fall back to redirect
                if (e?.response?.status === 404) {
                    window.location.href = `/api/auth/verify-email?token=${token}`;
                    return;
                }
                setStatus('error');
                setErrorMsg(e?.response?.data?.message || 'Verification failed. The link may be expired or already used.');
            });

        // Timeout fallback — if nothing happens in 15s, show error
        const timeout = setTimeout(() => {
            setStatus((prev) => prev === 'loading' ? 'error' : prev);
            setErrorMsg((prev) => prev || 'Verification timed out. Please try again.');
        }, 15000);

        return () => clearTimeout(timeout);
    }, [token]);

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float-delay-2" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="glass-card-3d p-8 md:p-10 text-center">
                    <Link href="/" className="text-3xl font-display font-bold gradient-text">
                        ⚡ GameHost
                    </Link>

                    {status === 'error' && (
                        <div className="mt-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <X className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Verification Failed</h3>
                            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
                            <div className="flex flex-col gap-3">
                                <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2 btn-3d">
                                    Go to Login <ArrowRight className="w-4 h-4" />
                                </Link>
                                {token && (
                                    <button
                                        onClick={() => { setStatus('loading'); setErrorMsg(''); window.location.href = `/api/auth/verify-email?token=${token}`; }}
                                        className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
                                    >
                                        <RefreshCw className="w-4 h-4" /> Retry Verification
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="mt-8">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                            >
                                <Check className="w-8 h-8 text-green-400" />
                            </motion.div>
                            <h3 className="text-lg font-semibold mb-2">Email Verified!</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Your email has been verified successfully. You can now log in.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2 btn-3d">
                                Go to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="mt-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Verifying your email...</h3>
                            <p className="text-gray-400 text-sm">
                                Please wait while we verify your account.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
