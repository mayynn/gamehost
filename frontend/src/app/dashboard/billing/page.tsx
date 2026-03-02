'use client';

import { useState, useEffect } from 'react';
import { billingApi } from '@/lib/api';
import { CreditCard, Clock, CheckCircle, XCircle, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BillingPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [gateways, setGateways] = useState<any>({});
    const [balance, setBalance] = useState(0);
    const [addAmount, setAddAmount] = useState('');
    const [utrInput, setUtrInput] = useState('');
    const [upiAmount, setUpiAmount] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            billingApi.payments().then((r) => setPayments(r.data || [])),
            billingApi.gateways().then((r) => setGateways(r.data || {})),
            billingApi.balance().then((r) => setBalance(r.data || 0)),
        ]).finally(() => setLoading(false));
    }, []);

    const addFunds = async (gateway: string) => {
        const amount = parseFloat(addAmount);
        if (!amount || amount < 10) return toast.error('Minimum amount is ₹10');
        try {
            if (gateway === 'razorpay') {
                const { data } = await billingApi.razorpayCreate(amount);
                toast.success(`Razorpay order created: ${data.orderId}`);
                // In production, open Razorpay checkout here
            } else if (gateway === 'cashfree') {
                const { data } = await billingApi.cashfreeCreate(amount);
                toast.success(`Cashfree session created: ${data.sessionId}`);
            }
        } catch { toast.error('Payment creation failed'); }
    };

    const submitUtr = async () => {
        if (!utrInput || !upiAmount) return toast.error('Fill UTR and amount');
        try {
            await billingApi.upiSubmit({ utr: utrInput, amount: parseFloat(upiAmount) });
            toast.success('UTR submitted for review');
            setUtrInput(''); setUpiAmount('');
        } catch { toast.error('Submission failed'); }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'PENDING': return <Clock className="w-4 h-4 text-orange-400" />;
            default: return <XCircle className="w-4 h-4 text-red-400" />;
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-2">Billing</h1>
            <p className="text-gray-400 mb-8">Manage payments and add funds to your balance</p>

            {/* Balance Card */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-sm text-gray-400">Current Balance</p>
                        <p className="text-3xl font-bold gradient-text">₹{balance}</p>
                    </div>
                    <Banknote className="w-10 h-10 text-primary" />
                </div>
                <div className="flex gap-2">
                    <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)}
                        placeholder="Amount (₹)" className="input-field flex-1" />
                    {gateways.razorpay && <button onClick={() => addFunds('razorpay')} className="btn-primary text-sm px-4">Razorpay</button>}
                    {gateways.cashfree && <button onClick={() => addFunds('cashfree')} className="btn-secondary text-sm px-4">Cashfree</button>}
                </div>
            </div>

            {/* UPI Section */}
            {gateways.upi && (
                <div className="glass-card p-6 mb-6">
                    <h3 className="font-semibold mb-4">UPI Payment</h3>
                    <p className="text-sm text-gray-400 mb-4">Send payment to our UPI ID and submit the UTR number below for verification.</p>
                    <div className="flex gap-2">
                        <input value={upiAmount} onChange={(e) => setUpiAmount(e.target.value)} placeholder="Amount (₹)" className="input-field w-32" type="number" />
                        <input value={utrInput} onChange={(e) => setUtrInput(e.target.value)} placeholder="UTR Number" className="input-field flex-1" />
                        <button onClick={submitUtr} className="btn-primary px-4">Submit UTR</button>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div className="glass-card p-6">
                <h3 className="font-semibold mb-4">Payment History</h3>
                <div className="space-y-3">
                    {payments.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                            {statusIcon(p.status)}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">₹{p.amount} via {p.gateway}</p>
                                <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-xs font-medium ${p.status === 'COMPLETED' ? 'text-green-400' : p.status === 'PENDING' ? 'text-orange-400' : 'text-red-400'}`}>
                                {p.status}
                            </span>
                        </div>
                    ))}
                    {payments.length === 0 && <p className="text-gray-500 text-center py-8">No payments yet</p>}
                </div>
            </div>
        </div>
    );
}
