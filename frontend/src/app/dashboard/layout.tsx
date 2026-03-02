'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Server, CreditCard, Wallet, Gift, HeadphonesIcon,
    User, Settings, Shield, Menu, X, LogOut, ChevronRight, Cloud
} from 'lucide-react';
import { authApi } from '@/lib/api';

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/servers', icon: Server, label: 'Servers' },
    { href: '/dashboard/plans', icon: CreditCard, label: 'Plans' },
    { href: '/dashboard/billing', icon: Wallet, label: 'Billing' },
    { href: '/dashboard/balance', icon: Wallet, label: 'Balance' },
    { href: '/dashboard/vps', icon: Cloud, label: 'VPS Hosting' },
    { href: '/dashboard/credits', icon: Gift, label: 'Earn Credits' },
    { href: '/dashboard/support', icon: HeadphonesIcon, label: 'Support' },
    { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authApi.getMe()
            .then((res) => { setUser(res.data.user); setLoading(false); })
            .catch(() => { router.push('/login'); });
    }, [router]);

    const handleLogout = async () => {
        await authApi.logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark flex">
            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-dark-50 border-r border-white/5
                         transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-white/5">
                        <Link href="/" className="text-xl font-display font-bold gradient-text">⚡ GameHost</Link>
                        <button className="ml-auto md:hidden text-gray-400" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Nav links */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </Link>
                            );
                        })}

                        {user?.role === 'ADMIN' && (
                            <>
                                <div className="pt-4 pb-2 px-4">
                                    <span className="text-xs text-gray-600 uppercase tracking-wider font-medium">Admin</span>
                                </div>
                                <Link
                                    href="/admin"
                                    className={pathname?.startsWith('/admin') ? 'sidebar-link-active' : 'sidebar-link'}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Shield className="w-5 h-5" />
                                    <span>Admin Panel</span>
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-white/5">
                        <div className="flex items-center gap-3 px-3 py-2">
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                {user?.name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main content */}
            <main className="flex-1 min-w-0">
                {/* Top bar */}
                <header className="h-16 border-b border-white/5 flex items-center px-6 bg-dark/80 backdrop-blur-xl sticky top-0 z-30">
                    <button className="md:hidden mr-4 text-gray-400" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm">
                            <Wallet className="w-4 h-4" />
                            ₹{user?.balance?.amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-sm">
                            <Gift className="w-4 h-4" />
                            {user?.credits?.amount || 0} credits
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
