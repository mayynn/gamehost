"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ResourceCardProps {
  title: string;
  value: number;
  maxValue: number;
  unit: string;
  icon: LucideIcon;
  color: string;
  className?: string;
}

export function ResourceCard({ title, value, maxValue, unit, icon: Icon, color, className }: ResourceCardProps) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const radius = 40;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("glass-card p-5 flex items-center gap-4 group hover:bg-white/10 transition-all duration-300", className)}>
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg width={96} height={96} className="-rotate-90">
          <circle cx={48} cy={48} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
          <circle
            cx={48} cy={48} r={radius} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xl font-bold mt-1">{percentage.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          {value.toFixed(1)} / {maxValue} {unit}
        </p>
      </div>
    </div>
  );
}
