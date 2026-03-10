"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-neon-red/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-neon-red" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "An error occurred while loading this page."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <Button variant="glow" onClick={reset}>
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    </div>
  );
}
