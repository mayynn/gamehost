'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, ArrowRight, Server } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <AnimatedBackground />
      <div className="absolute top-20 left-[20%] w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-float pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow-md">
              <Server className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white">GameHost</span>
          </Link>
        </div>

        <div className="premium-card"><div className="premium-card-inner p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">Check Your Email</h2>
              <p className="text-gray-400 mb-6">If an account exists for {email}, you&apos;ll receive a reset link.</p>
              <Link href="/login" className="btn-secondary inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-display font-bold text-white mb-2">Forgot Password</h1>
                <p className="text-gray-400 text-sm">Enter your email and we&apos;ll send a reset link</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field pl-11" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/login" className="text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to Login</Link>
              </p>
            </>
          )}
        </div></div>
      </motion.div>
    </div>
  );
}
