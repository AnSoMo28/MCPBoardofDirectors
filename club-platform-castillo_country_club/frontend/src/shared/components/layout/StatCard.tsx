// src/shared/components/layout/StatCard.tsx
// Sprint 12A — Responsive internal scaling
// A/B Patch: remove redundant hover, glass icon container
// ═══════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  iconColor?: string;
  sparkline?: number[];
  onClick?: () => void;
  ariaLabel?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconColor = "var(--color-gold-400)",
  sparkline,
  onClick,
  ariaLabel,
}: StatCardProps) {
  const changePositive = change !== undefined && change > 0;
  const changeNegative = change !== undefined && change < 0;
  const changeNeutral = change === 0;

  return (
    <div
      className={cn(
        "glass-card p-4 sm:p-5 lg:p-6",
        onClick && "cursor-pointer",
      )}
      role={onClick ? "link" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Header: title + icon */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] truncate">
          {title}
        </p>
        <div
          className={cn(
            "w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--radius-md)]",
            "flex items-center justify-center flex-shrink-0",
            "backdrop-blur-[6px]",
          )}
          style={{
            backgroundColor: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
            boxShadow: `0 0 12px color-mix(in srgb, ${iconColor} 8%, transparent)`,
          }}
        >
          <div style={{ color: iconColor }}>{icon}</div>
        </div>
      </div>

      {/* Value */}
      <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-silver-100)] mb-1.5 sm:mb-2">
        {value}
      </p>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mb-3">
          {changePositive && (
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-emerald-400)]" />
          )}
          {changeNegative && (
            <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-rose-400)]" />
          )}
          {changeNeutral && (
            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/30" />
          )}
          <span
            className={cn(
              "text-xs sm:text-sm font-semibold font-[family-name:var(--font-mono)]",
              changePositive && "text-[var(--color-emerald-400)]",
              changeNegative && "text-[var(--color-rose-400)]",
              changeNeutral && "text-white/30",
            )}
          >
            {changePositive ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-white/30 font-[family-name:var(--font-ui)]">
              {changeLabel}
            </span>
          )}
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <MiniSparkline data={sparkline} positive={changePositive} />
      )}
    </div>
  );
}

function MiniSparkline({
  data,
  positive,
}: {
  data: number[];
  positive?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const color = positive
    ? "var(--color-emerald-400)"
    : "var(--color-rose-300)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-7"
      preserveAspectRatio="none"
    >
      {/* Glow layer */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.15"
      />
      {/* Sharp line */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}