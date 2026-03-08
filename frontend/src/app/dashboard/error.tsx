'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Dashboard error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-dark, #060a14)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Dashboard Error</h2>
                    <p className="text-sm text-gray-400">Something went wrong loading this page.</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <button onClick={reset}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, var(--primary, #00d4ff), #0ea5e9)', boxShadow: '0 4px 12px rgba(0,212,255,0.3)' }}>
                        <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                    <Link href="/dashboard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
