/**
 * @component TimelineStats (Fase 25)
 * @namespace .glass-timeline__stat, .glass-timeline__accuracy-ring
 * @depends TimelineStats.css
 * @note Stats grid with accuracy ring gauge. Counter animation on mount.
 * @import import './TimelineStats.css';
 */
import "./TimelineStats.css";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  MinusCircle
} from "lucide-react";
import type { TimelineStats as Stats } from "../hooks/useDecisionTimeline";

/* ═══════════════════════════════════════
   Counter Hook (inline, simple)
   ═══════════════════════════════════════ */

function useCounter(target: number, duration: number) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration]);

  return value;
}

/* ═══════════════════════════════════════
   Accuracy Ring
   ═══════════════════════════════════════ */

function AccuracyRing({ value }: { value: number }) {
  const animatedValue = useCounter(value, 1200);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const level =
    animatedValue >= 70 ? "high" : animatedValue >= 40 ? "medium" : "low";
  const color =
    level === "high"
      ? "var(--color-emerald-400, #34d399)"
      : level === "medium"
        ? "var(--color-amber-400, #fbbf24)"
        : "var(--color-rose-400, #fb7185)";

  return (
    <div className="glass-timeline__accuracy-ring">
      <svg className="glass-timeline__accuracy-svg" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={radius}
          className="glass-timeline__accuracy-track"
        />
        <circle
          cx="28" cy="28" r={radius}
          className={`glass-timeline__accuracy-fill glass-timeline__accuracy-fill--${level}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="glass-timeline__accuracy-text" style={{ color }}>
        {animatedValue}%
        <span className="glass-timeline__accuracy-label">Precisión</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Stat Card
   ═══════════════════════════════════════ */

interface StatItemProps {
  label: string;
  value: number;
  suffix?: string;
  color: string;
  icon: React.ReactNode;
}

function StatItem({ label, value, suffix, color, icon }: StatItemProps) {
  const animatedValue = useCounter(value, 800);
  return (
    <div className="glass-timeline__stat">
      <div className="glass-timeline__stat-icon" style={{ color }}>
        {icon}
      </div>
      <p className="glass-timeline__stat-label">{label}</p>
      <p className="glass-timeline__stat-value" style={{ color }}>
        {animatedValue}
        {suffix ?? ""}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   Stats Grid
   ═══════════════════════════════════════ */

interface TimelineStatsProps {
  stats: Stats;
  fadeIn: Variants;
}

export function TimelineStats({ stats, fadeIn }: TimelineStatsProps) {
  return (
    <motion.div variants={fadeIn} className="glass-timeline__stats">
      <StatItem
        label="Total"
        value={stats.total}
        color="var(--color-silver-200, #d4cfc7)"
        icon={<BarChart3 size={14} />}
      />
      <StatItem
        label="Exitosas"
        value={stats.success}
        color="var(--color-emerald-400, #34d399)"
        icon={<CheckCircle2 size={14} />}
      />
      <StatItem
        label="Parciales"
        value={stats.partial}
        color="var(--color-amber-400, #fbbf24)"
        icon={<MinusCircle size={14} />}
      />
      <AccuracyRing value={stats.accuracy} />
    </motion.div>
  );
}