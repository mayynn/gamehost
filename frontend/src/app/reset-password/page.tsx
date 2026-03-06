'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, ArrowRight, Server, Check, X } from 'lucide-react';
import AnimatedBackground from '@/components/ui/AnimatedBackground';

function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const allValid = checks.every(c => c.ok) && password === confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allValid || !token) return;
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reset failed. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="neo-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Invalid Link</h2>
        <p className="text-gray-400 mb-6">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2">Request New Link <ArrowRight className="w-4 h-4" /></Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="neo-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">Password Reset</h2>
        <p className="text-gray-400 mb-6">You can now sign in with your new password.</p>
        <Link href="/login" className="btn-primary inline-flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></Link>
      </div>
    );
  }

  return (
    <div className="premium-card"><div className="premium-card-inner p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-display font-bold text-white mb-2">Set New Password</h1>
        <p className="text-gray-400 text-sm">Choose a strong password for your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="input-field pl-11 pr-11" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {checks.map(c => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  {c.ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-600" />}
                  <span className={c.ok ? 'text-emerald-400' : 'text-gray-500'}>{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" className="input-field pl-11" />
          </div>
          {confirm.length > 0 && password !== confirm && <p className="text-xs text-red-400 mt-1">Passwords don&apos;t match</p>}
        </div>
        <button type="submit" disabled={loading || !allValid} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </div></div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <AnimatedBackground />
      <div className="absolute bottom-20 right-[15%] w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-float pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-glow-md"><Server className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-display font-bold text-white">GameHost</span>
          </Link>
        </div>
        <Suspense fallback={<div className="neo-card p-8 text-center"><span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" /></div>}>
          <ResetForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
