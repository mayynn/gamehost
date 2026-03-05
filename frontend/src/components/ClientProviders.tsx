'use client';

import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Client-side providers that wrap the entire application.
 * Kept in a separate component so root layout.tsx can remain a Server Component
 * (required for Next.js metadata export).
 */
export default function ClientProviders({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1f2937',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                    },
                }}
            />
        </AuthProvider>
    );
}
