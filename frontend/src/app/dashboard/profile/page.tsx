'use client';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    useEffect(() => { authApi.getMe().then((r) => setUser(r.data.user)).catch(() => { }); }, []);
    if (!user) return null;

    return (
        <div>
            <h1 className="text-2xl font-display font-bold mb-8">Profile</h1>
            <div className="glass-card p-8 max-w-2xl">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : user.name?.[0]}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user.name}</h2>
                        <p className="text-gray-400">{user.email}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Mail className="w-5 h-5 text-primary" /> <span className="text-sm">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Shield className="w-5 h-5 text-accent" /> <span className="text-sm">Role: {user.role}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <User className="w-5 h-5 text-primary" /> <span className="text-sm">Provider: {user.provider}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Calendar className="w-5 h-5 text-primary" /> <span className="text-sm">Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
                        <Shield className="w-5 h-5 text-green-400" /> <span className="text-sm">Pterodactyl: {user.pterodactylLinked ? 'Linked ✓' : 'Not linked'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
