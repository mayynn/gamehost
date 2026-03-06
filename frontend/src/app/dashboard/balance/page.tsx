'use client';

import { useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, Loader2, IndianRupee, TrendingUp, CreditCard } from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';
import Link from 'next/link';

export default function BalancePage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      billingApi.balance().then(r => setBalance(r.data?.amount ?? r.data?.balance ?? r.data ?? 0)),
      billingApi.transactions().then(r => setTransactions(r.data?.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;

  const income = transactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const spent = transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);

  return (
    <StaggerContainer className="space-y-6">
      <FadeUpItem>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white">Balance</h1>
          <p className="text-sm text-gray-500 mt-1">Your wallet overview and transactions</p>
        </div>
      </FadeUpItem>

      {/* Balance Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <FadeUpItem>
          <div className="stat-card stat-card-green p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <Link href="/dashboard/billing" className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors">+ Add Funds</Link>
            </div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Current Balance</p>
            <p className="text-2xl font-display font-bold text-white mt-1 flex items-center gap-0.5"><IndianRupee className="w-5 h-5" />{balance.toFixed(2)}</p>
          </div>
        </FadeUpItem>
        <FadeUpItem>
          <div className="stat-card stat-card-cyan p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Total Income</p>
            <p className="text-2xl font-display font-bold text-emerald-400 mt-1">₹{income.toFixed(2)}</p>
          </div>
        </FadeUpItem>
        <FadeUpItem>
          <div className="stat-card stat-card-accent p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,77,106,0.12)', border: '1px solid rgba(255,77,106,0.2)' }}>
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Total Spent</p>
            <p className="text-2xl font-display font-bold text-accent mt-1">₹{spent.toFixed(2)}</p>
          </div>
        </FadeUpItem>
      </div>

      {/* Transactions */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-white">Transaction History</h2>
            <span className="text-[11px] text-gray-600 ml-auto">{transactions.length} transactions</span>
          </div>
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-gray-600 text-sm">No transactions yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {transactions.map((t: any) => (
                <div key={t.id} className="table-row">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {t.amount > 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{t.type?.replace(/_/g, ' ') || t.description || 'Transaction'}</p>
                    {t.description && t.type && <p className="text-[11px] text-gray-600 truncate">{t.description}</p>}
                    <p className="text-[11px] text-gray-600">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className={`text-sm font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeUpItem>
    </StaggerContainer>
  );
}
