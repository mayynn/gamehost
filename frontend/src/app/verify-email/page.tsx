'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api';
import { Check, X, ArrowRight, Server, Loader2 } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    const timeout = setTimeout(() => setStatus(s => s === 'loading' ? 'error' : s), 15000);
    authApi.verifyEmail(token).then(() => setStatus('success')).catch(() => setStatus('error'));
    return () => clearTimeout(timeout);
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="neo-card p-8 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-white mb-2">Verifying Email...</h2>
        <p className="text-gray-400 text-sm">Please wait while we verify your email address.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="neo-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Email Verified!</h2>
        <p className="text-gray-400 mb-6">Your email has been verified. You can now access all features.</p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">Go to Dashboard <ArrowRight className="w-4 h-4" /></Link>
      </div>
    );
  }

  return (
    <div className="neo-card p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <X className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-display font-bold text-white mb-2">Verification Failed</h2>
      <p className="text-gray-400 mb-6">The verification link is invalid or has expired.</p>
      <Link href="/login" className="btn-secondary inline-flex items-center gap-2">Go to Login <ArrowRight className="w-4 h-4" /></Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <AnimatedBackground />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow-md"><Server className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-display font-bold text-white">GameHost</span>
          </Link>
        </div>
        <Suspense fallback={<div className="neo-card p-8 text-center"><Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" /></div>}>
          <VerifyContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
