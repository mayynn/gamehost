import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
    title: 'GameHost - Premium Game Server Hosting',
    description: 'Deploy and manage game servers with ease. Minecraft, Rust, ARK and more. Powered by Pterodactyl.',
    keywords: 'game hosting, minecraft hosting, server hosting, pterodactyl, game servers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body>
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
            </body>
        </html>
    );
}
