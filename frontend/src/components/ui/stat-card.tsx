"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

function useCountUp(end: number, duration = 1000) {
  const [count, setCount] = React.useState(0);
  const prevEnd = React.useRef(0);

  React.useEffect(() => {
    if (end === prevEnd.current) return;
    const start = prevEnd.current;
    prevEnd.current = end;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);

  return count;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  color?: "orange" | "purple" | "cyan" | "green" | "red";
  className?: string;
}

const colorMap = {
  orange: { bg: "bg-neon-orange/10", text: "text-neon-orange", ring: "ring-neon-orange/20" },
  purple: { bg: "bg-neon-purple/10", text: "text-neon-purple", ring: "ring-neon-purple/20" },
  cyan: { bg: "bg-neon-cyan/10", text: "text-neon-cyan", ring: "ring-neon-cyan/20" },
  green: { bg: "bg-neon-green/10", text: "text-neon-green", ring: "ring-neon-green/20" },
  red: { bg: "bg-neon-red/10", text: "text-neon-red", ring: "ring-neon-red/20" },
};

export function StatCard({ title, value, icon: Icon, change, changeType = "neutral", color = "purple", className }: StatCardProps) {
  const colors = colorMap[color];
  const isNumeric = typeof value === "number";
  const animatedValue = useCountUp(isNumeric ? value : 0);

  return (
    <div className={cn(
      "glass-card p-6 group hover:bg-white/10 hover:border-white/20 transition-all duration-300",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{isNumeric ? animatedValue : value}</p>
          {change && (
            <p className={cn(
              "text-xs",
              changeType === "positive" && "text-neon-green",
              changeType === "negative" && "text-neon-red",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl ring-1", colors.bg, colors.ring)}>
          <Icon className={cn("w-6 h-6", colors.text)} />
        </div>
      </div>
    </div>
  );
}
