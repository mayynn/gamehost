/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.discordapp.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'cdn.modrinth.com' },
        ],
    },
    env: {
        // MUST be empty string for nginx-proxy mode (relative URLs).
        // Only set this if your backend runs on a completely different host.
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'GameHost',
    },
};

module.exports = nextConfig;
