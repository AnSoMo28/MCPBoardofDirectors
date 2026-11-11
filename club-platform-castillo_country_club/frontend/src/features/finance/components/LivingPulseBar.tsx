// ═══════════════════════════════════════════════════════════
// Living Pulse Bar — Ambient Health Indicator
// 3px bar, full-width, shows financial health score.
// Color/speed responds to ambient mode.
// ═══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import { HEALTH_GRADE_CONFIG } from "../types";
import type { AmbientMode } from "../hooks/useAmbientState";
import './LivingPulseBar.css';

interface LivingPulseBarProps {
  healthScore: number;
  healthGrade: string;
  mode: AmbientMode;
  className?: string;
}

const MODE_COLORS: Record<AmbientMode, string> = {
  serene: "var(--color-emerald-400)",
  alert: "var(--color-amber-400)",
  critical: "var(--color-rose-400)",
};

export function LivingPulseBar({
  healthScore,
  healthGrade,
  mode,
  className,
}: LivingPulseBarProps) {
  const reduced = useReducedMotion();
  const gradeCfg = HEALTH_GRADE_CONFIG[healthGrade];
  const fillColor = MODE_COLORS[mode];
  const clampedScore = Math.max(0, Math.min(100, healthScore));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Bar */}
      <div className="living-pulse-bar living-pulse-bar flex-1">
        <motion.div
          className="living-pulse-bar__fill"
          style={{ backgroundColor: fillColor }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.8, ease: [0.33, 1, 0.68, 1] }
          }
        />
        {!reduced && <div className="living-pulse-bar__shimmer" />}
      </div>

      {/* Score badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="text-[10px] font-bold font-[family-name:var(--font-mono)]"
          style={{ color: fillColor }}
        >
          {clampedScore}
        </span>
        {gradeCfg && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)]"
            style={{
              color: gradeCfg.color,
              backgroundColor: gradeCfg.bgColor,
            }}
          >
            {healthGrade}
          </span>
        )}
      </div>
    </div>
  );
}