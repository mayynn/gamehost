'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Stagger children animation container
export function StaggerContainer({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade up item animation
export function FadeUpItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Circular Progress Ring
export function CircularProgress({ 
  value, max = 100, size = 80, strokeWidth = 6, 
  color = '#00d4ff', bgColor = 'rgba(255,255,255,0.06)',
  children, className 
}: { 
  value: number; max?: number; size?: number; strokeWidth?: number; 
  color?: string; bgColor?: string;
  children?: ReactNode; className?: string 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(value / max, 1);
  const offset = circumference - percent * circumference;

  return (
    <div className={`circular-progress ${className || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

// Animated bar chart
export function AnimatedBar({ 
  height, maxHeight = 100, color = 'from-primary to-blue-500', delay = 0, label, className 
}: { 
  height: number; maxHeight?: number; color?: string; delay?: number; label?: string; className?: string 
}) {
  const percent = Math.min((height / maxHeight) * 100, 100);
  return (
    <div className={`flex flex-col items-center gap-1 ${className || ''}`}>
      <div className="relative w-full h-full rounded-t-lg overflow-hidden" style={{ minHeight: 4 }}>
        <motion.div
          className={`absolute bottom-0 w-full bg-gradient-to-t ${color} rounded-t-lg bar-3d`}
          initial={{ height: 0 }}
          animate={{ height: `${percent}%` }}
          transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {label && <span className="text-xs text-gray-500 mt-1">{label}</span>}
    </div>
  );
}

// Loading skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg bg-white/5 ${className || ''}`} />;
}

// Section wrapper with fade-in on scroll
export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
