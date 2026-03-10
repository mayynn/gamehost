"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, IndianRupee, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { billingApi } from "@/lib/api/billing";
import type { Payment, BalanceTransaction } from "@/types";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

  const { data: gateways } = useQuery({
    queryKey: ["gateways"],
    queryFn: () => billingApi.getGateways().then((r) => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ["balance"],
    queryFn: () => billingApi.getBalance().then((r) => r.data),
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: () => billingApi.getPayments().then((r) => r.data),
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => billingApi.getTransactions().then((r) => r.data),
  });

  const razorpayMutation = useMutation({
    mutationFn: (amt: number) => billingApi.createRazorpayOrder({ amount: amt }).then((r) => r.data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      // Open Razorpay checkout
      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            await billingApi.verifyRazorpay(response);
            toast.success("Payment successful!");
          } catch {
            toast.error("Payment verification failed");
          }
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: () => toast.error("Failed to create order"),
  });

  const cashfreeMutation = useMutation({
    mutationFn: (amt: number) => billingApi.createCashfreeOrder({ amount: amt }).then((r) => r.data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      if (data.payment_link) window.open(data.payment_link, "_blank");
    },
    onError: () => toast.error("Failed to create order"),
  });

  const upiMutation = useMutation({
    mutationFn: () => billingApi.submitUpi({ utr, amount: Number(amount) }),
    onSuccess: () => { toast.success("UPI payment submitted for approval"); setUtr(""); setAmount(""); setShowAddBalance(false); },
    onError: () => toast.error("Submission failed"),
  });

  const handlePay = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (selectedGateway === "razorpay") razorpayMutation.mutate(amt);
    else if (selectedGateway === "cashfree") cashfreeMutation.mutate(amt);
    else if (selectedGateway === "upi" && utr.trim()) upiMutation.mutate();
    else toast.error("Select a payment method");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="w-3.5 h-3.5 text-neon-green" />;
      case "PENDING": return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
      case "FAILED": return <XCircle className="w-3.5 h-3.5 text-neon-red" />;
      default: return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Balance</h1>

      {/* Balance card */}
      <div className="grid sm:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold mt-1 flex items-center gap-1"><IndianRupee className="w-7 h-7" /> {balance?.amount?.toFixed(2) ?? "0.00"}</p>
            </div>
            <div className="p-3 rounded-xl bg-neon-green/10"><Wallet className="w-6 h-6 text-neon-green" /></div>
          </div>
          <Button variant="glow" className="mt-4 w-full" onClick={() => setShowAddBalance(!showAddBalance)}>
            <Plus className="w-4 h-4 mr-2" /> Add Balance
          </Button>
        </GlassCard>

        {showAddBalance && (
          <GlassCard className="p-6 space-y-4">
            <h3 className="font-semibold text-sm">Add Balance</h3>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="mt-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              {gateways?.razorpay && (
                <button onClick={() => setSelectedGateway("razorpay")}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedGateway === "razorpay" ? "border-neon-orange bg-neon-orange/10 text-neon-orange" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                  Razorpay
                </button>
              )}
              {gateways?.cashfree && (
                <button onClick={() => setSelectedGateway("cashfree")}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedGateway === "cashfree" ? "border-neon-purple bg-neon-purple/10 text-neon-purple" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                  Cashfree
                </button>
              )}
              {gateways?.upi && (
                <button onClick={() => setSelectedGateway("upi")}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${selectedGateway === "upi" ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                  UPI Manual
                </button>
              )}
            </div>
            {selectedGateway === "upi" && gateways?.upi && (
              <div className="space-y-2">
                {gateways.upiId && <p className="text-sm">UPI ID: <span className="font-mono text-neon-cyan">{gateways.upiId}</span></p>}
                <div>
                  <Label>UTR / Transaction Reference</Label>
                  <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter UTR number" className="mt-1" />
                </div>
              </div>
            )}
            <Button onClick={handlePay} disabled={razorpayMutation.isPending || cashfreeMutation.isPending || upiMutation.isPending}
              className="w-full">Pay ₹{amount || "0"}</Button>
          </GlassCard>
        )}
      </div>

      {/* Payments history */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-sm mb-3">Payment History</h3>
        {payments && payments.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {payments.map((p: Payment) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm">
                <div className="flex items-center gap-3">
                  {statusIcon(p.status)}
                  <div>
                    <p className="font-medium">₹{p.amount}</p>
                    <p className="text-xs text-muted-foreground">{p.gateway} &middot; {new Date(p.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  p.status === "COMPLETED" ? "bg-neon-green/10 text-neon-green" :
                  p.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-neon-red/10 text-neon-red"
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        )}
      </GlassCard>

      {/* Transactions */}
      <GlassCard className="p-5">
        <h3 className="font-semibold text-sm mb-3">Balance Transactions</h3>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
            {transactions.map((t: BalanceTransaction) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 text-sm">
                <div className="flex items-center gap-3">
                  {t.amount > 0 ? <ArrowDownRight className="w-4 h-4 text-neon-green" /> : <ArrowUpRight className="w-4 h-4 text-neon-red" />}
                  <div>
                    <p className="font-medium">{t.description || t.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`font-mono ${t.amount > 0 ? "text-neon-green" : "text-neon-red"}`}>
                  {t.amount > 0 ? "+" : ""}₹{t.amount}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        )}
      </GlassCard>
    </div>
  );
}
