'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
    [key: string]: any;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    /** Re-fetch /auth/me and update context */
    refresh: () => Promise<void>;
    /** Clear user from context (does NOT call API logout) */
    clearUser: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    loading: true,
    refresh: async () => {},
    clearUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await authApi.getMe();
            setUser(res.data.user ?? null);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearUser = useCallback(() => {
        setUser(null);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <AuthContext.Provider value={{ user, loading, refresh, clearUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
