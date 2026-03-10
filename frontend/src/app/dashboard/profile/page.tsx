"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { User, Lock, Link2, Save, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth";
import { usersApi } from "@/lib/api/users";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils";

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => usersApi.updateProfile({ name }),
    onSuccess: () => { toast.success("Profile updated"); fetchUser(); },
    onError: () => toast.error("Update failed"),
  });

  const passwordMutation = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword: currentPassword || undefined, newPassword }),
    onSuccess: () => { toast.success("Password changed"); setCurrentPassword(""); setNewPassword(""); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Password change failed")),
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <GlassCard className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-orange to-neon-purple flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs ${user.role === "ADMIN" ? "bg-neon-orange/10 text-neon-orange" : "bg-neon-cyan/10 text-neon-cyan"}`}>{user.role}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${user.emailVerified ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"}`}>
                {user.emailVerified ? "Verified" : "Unverified"}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Edit Profile</h2>
        <div>
          <Label>Display Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || name === user.name}>
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h2>
        {user.provider === "EMAIL" && (
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1.5" />
          </div>
        )}
        <div>
          <Label>New Password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1.5" />
        </div>
        <Button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending || !newPassword}>
          {passwordMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Change Password
        </Button>
      </GlassCard>

      {user.linkedAccounts && user.linkedAccounts.length > 0 && (
        <GlassCard className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Link2 className="w-4 h-4" /> Linked Accounts</h2>
          {user.linkedAccounts.map((a) => (
            <div key={a.provider} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div>
                <p className="text-sm font-medium">{a.provider}</p>
                <p className="text-xs text-muted-foreground">{a.email || a.providerId}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-neon-green/10 text-neon-green">Connected</span>
            </div>
          ))}
        </GlassCard>
      )}

      <GlassCard className="p-6 space-y-2">
        <h2 className="font-semibold text-sm">Account Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs text-muted-foreground">Member Since</span><p>{new Date(user.createdAt).toLocaleDateString()}</p></div>
          {user.lastLoginAt && <div><span className="text-xs text-muted-foreground">Last Login</span><p>{new Date(user.lastLoginAt).toLocaleString()}</p></div>}
        </div>
      </GlassCard>
    </div>
  );
}
