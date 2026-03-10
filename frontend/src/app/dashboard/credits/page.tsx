"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Gift, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { creditsApi } from "@/lib/api/credits";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export default function CreditsPage() {
  const queryClient = useQueryClient();
  const { data: credits } = useQuery({
    queryKey: ["credits"],
    queryFn: () => creditsApi.get().then((r) => r.data),
  });

  const { data: config } = useQuery({
    queryKey: ["credits-config"],
    queryFn: () => creditsApi.getConfig().then((r) => r.data),
  });

  const earnMutation = useMutation({
    mutationFn: () => creditsApi.earn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      toast.success(`Earned ${data.data?.amount || config?.amountPerEarn || 0} credits!`);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Cannot earn credits yet")),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Credits</h1>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available Credits</p>
            <p className="text-4xl font-bold mt-1 flex items-center gap-2">
              <Coins className="w-8 h-8 text-neon-orange" />
              {credits?.amount ?? 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-neon-orange/10">
            <Gift className="w-8 h-8 text-neon-orange" />
          </div>
        </div>
      </GlassCard>

      {config?.enabled && (
        <GlassCard className="p-6 space-y-4">
          <h2 className="font-semibold">Earn Credits</h2>
          <p className="text-sm text-muted-foreground">
            Earn <span className="text-neon-orange font-medium">{config.amountPerEarn}</span> credits every{" "}
            <span className="text-neon-orange font-medium">{config.cooldownMinutes}</span> minutes.
          </p>
          <Button variant="glow" onClick={() => earnMutation.mutate()} disabled={earnMutation.isPending} className="w-full">
            {earnMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Coins className="w-4 h-4 mr-2" />}
            Claim Credits
          </Button>
        </GlassCard>
      )}

      <GlassCard className="p-6 space-y-3">
        <h2 className="font-semibold text-sm">How Credits Work</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Credits can be used toward server renewals and services. Earn them by claiming periodically or through special promotions.</p>
        </div>
      </GlassCard>
    </div>
  );
}
