'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Lock, Loader2, Check, Eye, EyeOff, Pencil, KeyRound } from 'lucide-react';
import { StaggerContainer, FadeUpItem } from '@/components/ui/Animations';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { if (user) setName(user.name || ''); }, [user]);

  const updateName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await usersApi.updateProfile({ name: name.trim() }); toast.success('Name updated'); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPass.length < 8) { toast.error('Password must be 8+ characters'); return; }
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    setChangingPass(true);
    try {
      await usersApi.changePassword({ currentPassword: currentPass || undefined, newPassword: newPass });
      toast.success('Password changed');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setChangingPass(false); }
  };

  const checks = [
    { label: '8+ characters', ok: newPass.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(newPass) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(newPass) },
    { label: 'Number', ok: /\d/.test(newPass) },
  ];

  return (
    <StaggerContainer className="space-y-6 max-w-2xl">
      <FadeUpItem>
        <div className="page-header">
          <h1 className="text-2xl font-display font-bold text-white">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings</p>
        </div>
      </FadeUpItem>

      {/* User Card */}
      <FadeUpItem>
        <div className="premium-card">
          <div className="premium-card-inner p-6">
            <div className="flex items-center gap-5">
              <div className="avatar text-2xl w-16 h-16">{user?.name?.[0]?.toUpperCase() || '?'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-display font-bold text-white">{user?.name}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--primary)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <Shield className="w-3 h-3" /> {user?.role}
                  </span>
                  <span className="text-[11px] text-gray-600">{user?.provider}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeUpItem>

      {/* Edit Name */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <Pencil className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-white">Display Name</h2>
          </div>
          <div className="p-5">
            <div className="flex gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field flex-1" maxLength={50} />
              <button onClick={updateName} disabled={saving || name === user?.name} className="btn-primary text-sm px-5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </FadeUpItem>

      {/* Change Password */}
      <FadeUpItem>
        <div className="neo-card overflow-hidden">
          <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <KeyRound className="w-3.5 h-3.5 text-neon-purple" />
            </div>
            <h2 className="text-sm font-semibold text-white">Change Password</h2>
          </div>
          <div className="p-5 space-y-3">
            {user?.provider === 'EMAIL' && (
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)}
                  placeholder="Current password" className="input-field pr-10" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="New password" className="input-field pr-10" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm new password" className="input-field" />

            {newPass && (
              <div className="grid grid-cols-2 gap-1.5 py-1">
                {checks.map(c => (
                  <p key={c.label} className={`text-xs flex items-center gap-1.5 ${c.ok ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {c.ok ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-gray-700 inline-block" />} {c.label}
                  </p>
                ))}
              </div>
            )}

            <button onClick={changePassword} disabled={changingPass || !newPass || newPass !== confirmPass}
              className="btn-primary text-sm w-full">
              {changingPass ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Change Password'}
            </button>
          </div>
        </div>
      </FadeUpItem>
    </StaggerContainer>
  );
}
