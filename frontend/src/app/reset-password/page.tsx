"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Gamepad2, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

function ResetForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success("Password reset successfully!");
      router.push("/login");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 chars, uppercase, number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            minLength={8}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" variant="glow" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Reset Password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">Enter your new password below.</p>
          <Suspense fallback={<div className="h-20 animate-pulse bg-white/5 rounded-lg" />}>
            <ResetForm />
          </Suspense>
          <p className="text-sm text-muted-foreground text-center mt-6">
            <Link href="/login" className="text-primary hover:underline">Back to login</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
