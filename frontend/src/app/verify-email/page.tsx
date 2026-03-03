'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, X, Loader2, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }
        // The backend handles verification via GET /api/auth/verify-email?token=...
        // and redirects to /dashboard?verified=true or /login?error=verification_failed
        // This page is a fallback / direct-link handler
        window.location.href = `/api/auth/verify-email?token=${token}`;
    }, [token]);

    return (
        <div className="min-h-screen bg-dark flex items-center justify-center relative overflow-hidden">
            {/* 3D Background */}
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

                    {!token ? (
                        <div className="mt-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <X className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Invalid Link</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                This verification link is missing or invalid. Please request a new one.
                            </p>
                            <Link href="/login" className="btn-primary inline-flex items-center gap-2 btn-3d">
                                Go to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Verifying your email...</h3>
                            <p className="text-gray-400 text-sm">
                                Please wait while we verify your account. You&apos;ll be redirected automatically.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
