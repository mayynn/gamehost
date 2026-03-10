"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      await authApi.resendVerification({ email: email.trim() });
      toast.success("Verification email sent!");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Failed to resend"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-neon-green/10 blur-[120px]" />
        <div className="absolute bottom-1/3 -left-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/15 blur-[120px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <GlassCard className="p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-gradient">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold neon-text">GameHost</span>
          </div>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neon-green/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-neon-green" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </p>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neon-orange/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-neon-orange" />
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-xs text-muted-foreground">{"Didn't receive the email? Enter your email to resend."}</p>
            <div className="flex gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleResend()} />
              <Button size="sm" onClick={handleResend} disabled={!email.trim() || sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend"}
              </Button>
            </div>
          </div>

          <Link href="/login">
            <Button variant="glow" className="w-full">Go to Login</Button>
          </Link>
        </GlassCard>
      </motion.div>
    </div>
  );
}
