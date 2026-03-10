"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, IndianRupee } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/admin";
import type { UpiPayment } from "@/types";
import toast from "react-hot-toast";

export default function AdminBillingPage() {
  const queryClient = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["admin-pending-upi"],
    queryFn: () => adminApi.getPendingUpi().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveUpi(id),
    onSuccess: () => { toast.success("UPI payment approved"); queryClient.invalidateQueries({ queryKey: ["admin-pending-upi"] }); },
    onError: () => toast.error("Failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => adminApi.rejectUpi(id),
    onSuccess: () => { toast.success("UPI payment rejected"); queryClient.invalidateQueries({ queryKey: ["admin-pending-upi"] }); },
    onError: () => toast.error("Failed"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing Management</h1>

      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-sm">Pending UPI Approvals</h3>
          {pending && <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500">{pending.length}</span>}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pending && pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((upi: UpiPayment) => (
              <div key={upi.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-neon-orange" />
                    <span className="font-bold">₹{upi.amount}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">UTR: <span className="font-mono">{upi.utr}</span></p>
                  <p className="text-xs text-muted-foreground">User: {upi.userId}</p>
                  <p className="text-xs text-muted-foreground">{new Date(upi.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-neon-green/10 text-neon-green hover:bg-neon-green/20"
                    onClick={() => approveMutation.mutate(upi.id)} disabled={approveMutation.isPending}>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" className="bg-neon-red/10 text-neon-red hover:bg-neon-red/20"
                    onClick={() => rejectMutation.mutate(upi.id)} disabled={rejectMutation.isPending}>
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pending UPI payments.</p>
        )}
      </GlassCard>
    </div>
  );
}
