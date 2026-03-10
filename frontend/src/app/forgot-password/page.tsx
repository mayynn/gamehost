"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
      toast.success("Reset link sent if the email exists.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-neon-orange/15 blur-[120px]" />
        <div className="absolute bottom-1/3 -left-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/15 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <GlassCard className="p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-gradient">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold neon-text">GameHost</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">Forgot Password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {sent ? "Check your email for the reset link." : "Enter your email to receive a reset link."}
          </p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-neon-green" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">We sent a reset link to {email}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center mt-6">
            <Link href="/login" className="text-primary hover:underline">Back to login</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
