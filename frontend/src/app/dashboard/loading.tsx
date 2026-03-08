import { Loader2, Zap } from 'lucide-react';

export default function DashboardLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-dark, #060a14)' }}>
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center animate-pulse">
                    <Zap className="w-6 h-6 text-white" />
                </div>
                <Loader2 className="w-6 h-6 text-primary/60 animate-spin" />
            </div>
        </div>
    );
}
