'use client';

import { useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CreditCard, Wallet, IndianRupee, Loader2, CheckCircle, Clock, XCircle, QrCode, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';

declare global { interface Window { Razorpay: any; Cashfree: any; } }

const AMOUNTS = [50, 100, 200, 500, 1000, 2000];

export default function BillingPage() {
  const [gateways, setGateways] = useState<any>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState(100);
  const [customAmt, setCustomAmt] = useState('');
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [gateway, setGateway] = useState('');
  const [utr, setUtr] = useState('');
  const [showUpi, setShowUpi] = useState(false);

  useEffect(() => {
    Promise.all([
      billingApi.gateways().then(r => { const g = r.data; setGateways(g); if (g.razorpay) setGateway('razorpay'); else if (g.cashfree) setGateway('cashfree'); else if (g.upi) setGateway('upi'); }),
      billingApi.payments().then(r => setPayments(r.data?.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const finalAmount = customAmt ? Number(customAmt) : amount;

  const payRazorpay = async () => {
    setPayLoading(true);
    try {
      const res = await billingApi.razorpayCreate(finalAmount);
      const { orderId, keyId, amount: orderAmt, currency } = res.data;
      const rzp = new window.Razorpay({
        key: keyId, amount: orderAmt, currency, order_id: orderId,
        handler: async (resp: any) => {
          try { await billingApi.razorpayVerify(resp); toast.success('Payment successful!'); billingApi.payments().then(r => setPayments(r.data?.data || r.data || [])); }
          catch { toast.error('Verification failed'); }
        },
        theme: { color: '#00d4ff' },
      });
      rzp.open();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Payment failed'); }
    finally { setPayLoading(false); }
  };

  const payCashfree = async () => {
    setPayLoading(true);
    try {
      const res = await billingApi.cashfreeCreate(finalAmount);
      const { sessionId, orderId } = res.data;
      if (window.Cashfree) {
        const cf = new window.Cashfree({ mode: 'production' });
        cf.checkout({ paymentSessionId: sessionId, returnUrl: window.location.href }).then(async () => {
          try { await billingApi.cashfreeVerify(orderId); toast.success('Payment successful!'); }
          catch { toast.error('Verification failed'); }
        });
      } else toast.error('Cashfree SDK not loaded');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setPayLoading(false); }
  };

  const submitUpi = async () => {
    if (!utr.trim() || utr.length < 6) { toast.error('Enter valid UTR (6+ chars)'); return; }
    setPayLoading(true);
    try { await billingApi.upiSubmit({ utr, amount: finalAmount }); toast.success('Submitted! Awaiting admin approval.'); setUtr(''); setShowUpi(false); billingApi.payments().then(r => setPayments(r.data?.data || r.data || [])); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setPayLoading(false); }
  };

  const handlePay = () => {
    if (finalAmount < 1) { toast.error('Minimum ₹1'); return; }
    if (gateway === 'razorpay') payRazorpay();
    else if (gateway === 'cashfree') payCashfree();
    else if (gateway === 'upi') setShowUpi(true);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;

  const gwConfig: Record<string, { icon: any; color: string; label: string; sub: string }> = {
    razorpay: { icon: <CreditCard className="w-5 h-5" />, color: '#00d4ff', label: 'Razorpay', sub: 'Cards, UPI, Netbanking' },
    cashfree: { icon: <Wallet className="w-5 h-5" />, color: '#10b981', label: 'Cashfree', sub: 'Cards, UPI, Wallets' },
    upi: { icon: <QrCode className="w-5 h-5" />, color: '#7c3aed', label: 'Manual UPI', sub: 'Pay & submit UTR' },
  };

  return (
    <StaggerContainer className="space-y-6">
      <FadeUpItem>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white">Add Funds</h1>
          <p className="text-sm text-gray-500 mt-1">Top up your wallet to deploy servers</p>
        </div>
      </FadeUpItem>

      {/* Payment Card */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          {/* Amount Selection */}
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Select Amount</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmt(''); }}
                    className="p-3 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={amount === a && !customAmt ? {
                      background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--primary)',
                      boxShadow: '0 0 15px rgba(0,212,255,0.08)',
                    } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                    ₹{a}
                  </button>
                ))}
              </div>
              <div className="relative mt-3">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input type="number" value={customAmt} onChange={e => setCustomAmt(e.target.value)} placeholder="Custom amount"
                  className="input-field text-sm pl-10" min={1} max={100000} />
              </div>
            </div>

            {/* Gateway Selection */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3 block">Payment Method</label>
              <div className="grid sm:grid-cols-3 gap-2.5">
                {Object.entries(gwConfig).filter(([key]) => gateways[key]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setGateway(key)}
                    className="p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 group"
                    style={gateway === key ? {
                      background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`,
                      boxShadow: `0 0 20px ${cfg.color}08`,
                    } : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}12`, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{cfg.label}</p>
                      <p className="text-[11px] text-gray-600">{cfg.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <div className="p-5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure payment
            </div>
            <button onClick={handlePay} disabled={payLoading || !gateway} className="btn-primary flex items-center gap-2 text-sm">
              {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Pay ₹{finalAmount} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </FadeUpItem>

      {/* UPI Modal */}
      <AnimatePresence>
        {showUpi && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="neo-card p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <QrCode className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Submit UPI Payment</h3>
                  <p className="text-xs text-gray-500">Amount: ₹{finalAmount}</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Send ₹{finalAmount} via UPI and enter the UTR number below.</p>
              <input type="text" value={utr} onChange={e => setUtr(e.target.value)} placeholder="UTR / Reference Number" className="input-field" minLength={6} />
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowUpi(false)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={submitUpi} disabled={payLoading} className="btn-primary text-sm">
                  {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment History */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Clock className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-white">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <div className="p-10 text-center text-gray-600 text-sm">No payments yet</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {payments.map((p: any) => (
                <div key={p.id} className="table-row">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    p.status === 'COMPLETED' ? 'bg-emerald-500/10' : p.status === 'PENDING' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                  }`}>
                    {p.status === 'COMPLETED' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                     p.status === 'PENDING' ? <Clock className="w-4 h-4 text-yellow-400" /> :
                     <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{p.gateway}</p>
                    <p className="text-[11px] text-gray-600">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₹{p.amount}</p>
                    <p className={`text-[11px] font-medium ${p.status === 'COMPLETED' ? 'text-emerald-400' : p.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeUpItem>
    </StaggerContainer>
  );
}
