'use client';
import { useState } from 'react';
import { Wallet, Plus, History } from 'lucide-react';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function BalancePage() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        billingApi.balance().then((r) => setBalance(r.data || 0)).catch(() => { });
        billingApi.payments().then((r) => setPayments((r.data || []).filter((p: any) => p.status === 'COMPLETED'))).catch(() => { });
    }, []);

    const addFunds = async () => {
        const val = parseFloat(amount);
        if (!val || val < 10) return toast.error('Minimum ₹10');
        try {
            const { data } = await billingApi.razorpayCreate(val);
            toast.success('Payment flow initiated');
        } catch { toast.error('Failed'); }
    };

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-8">Balance</h1>
            <div className="glass-card p-8 text-center mb-8">
                <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-5xl font-bold gradient-text mb-6">₹{balance.toFixed(2)}</p>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="input-field flex-1" />
                    <button onClick={addFunds} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add</button>
                </div>
            </div>
            <div className="glass-card p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-4"><History className="w-5 h-5" /> Recent Transactions</h3>
                <div className="space-y-2">
                    {payments.slice(0, 10).map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-sm">
                            <span>₹{p.amount} via {p.gateway}</span>
                            <span className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                    {payments.length === 0 && <p className="text-gray-500 text-center py-4">No transactions</p>}
                </div>
            </div>
        </div>
    );
}
