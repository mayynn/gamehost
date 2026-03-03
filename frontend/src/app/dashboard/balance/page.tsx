'use client';
import { useState, useEffect } from 'react';
import { Wallet, Plus, History, Loader2 } from 'lucide-react';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function BalancePage() {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [payments, setPayments] = useState<any[]>([]);
    const [gateways, setGateways] = useState<any>({});
    const [processing, setProcessing] = useState(false);

    const refreshData = () => {
        billingApi.balance().then((r) => setBalance(r.data?.balance ?? r.data ?? 0)).catch(() => { });
        billingApi.payments().then((r) => setPayments((r.data || []).filter((p: any) => p.status === 'COMPLETED'))).catch(() => { });
    };

    useEffect(() => {
        refreshData();
        billingApi.gateways().then((r) => setGateways(r.data || {})).catch(() => { });
    }, []);

    const addFunds = async () => {
        const val = parseFloat(amount);
        if (!val || val < 10) return toast.error('Minimum ₹10');
        setProcessing(true);
        try {
            if (gateways.razorpay) {
                const loaded = await loadRazorpayScript();
                if (!loaded) return toast.error('Failed to load payment SDK');
                const { data } = await billingApi.razorpayCreate(val);
                const options = {
                    key: data.keyId || data.key_id,
                    amount: data.amount,
                    currency: data.currency || 'INR',
                    order_id: data.orderId || data.order_id,
                    name: 'GameHost',
                    description: `Add ₹${val} to balance`,
                    handler: async (response: any) => {
                        try {
                            await billingApi.razorpayVerify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            });
                            toast.success('Payment successful!');
                            setAmount('');
                            refreshData();
                        } catch { toast.error('Payment verification failed'); }
                    },
                    theme: { color: '#00d4ff' },
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.on('payment.failed', () => toast.error('Payment failed'));
                rzp.open();
            } else {
                // Fallback: direct balance add
                await billingApi.addBalance(val);
                toast.success('Balance added');
                setAmount('');
                refreshData();
            }
        } catch { toast.error('Failed'); }
        finally { setProcessing(false); }
    };

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-8">Balance</h1>
            <div className="glass-card p-8 text-center mb-8">
                <Wallet className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-5xl font-bold gradient-text mb-6">₹{typeof balance === 'number' ? balance.toFixed(2) : balance}</p>
                <div className="flex gap-2 max-w-sm mx-auto">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount (₹)" className="input-field flex-1" min="10"
                        onKeyDown={(e) => e.key === 'Enter' && addFunds()} />
                    <button onClick={addFunds} disabled={processing} className="btn-primary flex items-center gap-2">
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                    </button>
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
