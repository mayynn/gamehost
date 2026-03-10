import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-neon-purple/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-neon-orange/10 blur-[120px]" />
      </div>
      <div className="relative text-center space-y-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neon-gradient">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-7xl font-bold neon-text">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg bg-neon-gradient text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
