'use client';

import { User, Mail, Shield, Calendar, Pencil, Key, Link2, Save, Loader2, X } from 'lucide-react';
import { authApi, usersApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        authApi.getMe().then((r) => {
            setUser(r.data.user);
            setEditName(r.data.user?.name || '');
        }).catch(() => { });
    }, []);

    const saveName = async () => {
        if (!editName.trim()) return toast.error('Name cannot be empty');
        setSaving(true);
        try {
            await usersApi.updateProfile({ name: editName.trim() });
            setUser((u: any) => ({ ...u, name: editName.trim() }));
            setEditing(false);
            toast.success('Name updated');
        } catch { toast.error('Failed to update name'); }
        finally { setSaving(false); }
    };

    const changePassword = async () => {
        if (!newPassword || newPassword.length < 8) return toast.error('Password must be at least 8 characters');
        if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
        setSaving(true);
        try {
            await authApi.resetPassword('', newPassword);
            setChangingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password updated');
        } catch { toast.error('Failed to change password'); }
        finally { setSaving(false); }
    };

    if (!user) return (
        <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    const isEmailUser = user.provider === 'EMAIL';

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-8">Profile</h1>

            {/* User Info Card */}
            <div className="glass-card p-8 max-w-2xl mb-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        {editing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="input-field"
                                    maxLength={50}
                                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                                />
                                <button onClick={saveName} disabled={saving} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button onClick={() => { setEditing(false); setEditName(user.name || ''); }} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold">{user.name}</h2>
                                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" title="Edit name">
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <p className="text-gray-400 mt-1">{user.email}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Mail className="w-5 h-5 text-primary" />
                        <span className="text-sm flex-1">{user.email}</span>
                        {user.emailVerified && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Verified</span>}
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Shield className="w-5 h-5 text-accent" />
                        <span className="text-sm flex-1">Role</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-gray-300'}`}>{user.role}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Link2 className="w-5 h-5 text-primary" />
                        <span className="text-sm flex-1">Auth Provider</span>
                        <span className="text-xs text-gray-300">{user.provider}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="text-sm flex-1">Joined</span>
                        <span className="text-xs text-gray-300">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <User className="w-5 h-5 text-green-400" />
                        <span className="text-sm flex-1">Pterodactyl</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${user.pterodactylLinked ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {user.pterodactylLinked ? 'Linked' : 'Not linked'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Linked Accounts */}
            {user.linkedAccounts && user.linkedAccounts.length > 0 && (
                <div className="glass-card p-6 max-w-2xl mb-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" /> Linked Accounts
                    </h3>
                    <div className="space-y-2">
                        {user.linkedAccounts.map((acc: any) => (
                            <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${acc.provider === 'GOOGLE' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                    {acc.provider?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{acc.email || acc.provider}</p>
                                    <p className="text-xs text-gray-500">{acc.provider}</p>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(acc.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Change Password (email users only) */}
            {isEmailUser && (
                <div className="glass-card p-6 max-w-2xl">
                    <button
                        onClick={() => setChangingPassword(!changingPassword)}
                        className="flex items-center gap-3 w-full"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-semibold">Change Password</h3>
                            <p className="text-sm text-gray-400">Update your account password</p>
                        </div>
                    </button>

                    {changingPassword && (
                        <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                            <div>
                                <label htmlFor="new-password" className="text-sm text-gray-400 mb-1 block">New Password</label>
                                <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    className="input-field w-full" placeholder="Minimum 8 characters" />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
                                <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-field w-full" placeholder="Re-enter new password"
                                    onKeyDown={(e) => e.key === 'Enter' && changePassword()} />
                            </div>
                            {newPassword && (
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div key={level} className={`h-1 flex-1 rounded-full ${newPassword.length >= level * 3 ? (level >= 3 ? 'bg-green-500' : level >= 2 ? 'bg-yellow-500' : 'bg-red-500') : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={changePassword}
                                disabled={saving}
                                className="btn-primary flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                Update Password
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
