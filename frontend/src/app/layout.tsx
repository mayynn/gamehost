import type { Metadata } from 'next';
import ClientProviders from '@/components/ClientProviders';
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
                <ClientProviders>{children}</ClientProviders>
            </body>
        </html>
    );
}
