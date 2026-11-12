/**
 * @component MatrixCell (Fase 25)
 * @namespace .glass-risk__cell
 * @depends MatrixCell.css, riskTheme
 * @note Interactive grid cell with heat gradient, count circle,
 *       stagger animation, glow pulse.
 * @import import './MatrixCell.css';
 */
import "./MatrixCell.css";

import { cn } from "@/shared/lib/utils";
import { getRiskCellColor } from "@/shared/lib/riskTheme";
import type { RiskItem } from "@/features/reports/types";

/* ═══════════════════════════════════════
   Heat Level
   ═══════════════════════════════════════ */

function getHeatLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 4) return "low";
  if (score <= 8) return "medium";
  if (score <= 12) return "high";
  return "critical";
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface MatrixCellProps {
  probability: number;
  impact: number;
  risks: RiskItem[];
  isActive: boolean;
  onSelect: () => void;
  onFocus: () => void;
  cellRef: (el: HTMLDivElement | null) => void;
  staggerDelay: number;
}

export function MatrixCell({
  probability,
  impact,
  risks,
  isActive,
  onSelect,
  onFocus,
  cellRef,
  staggerDelay,
}: MatrixCellProps) {
  const score = probability * impact;
  const heatLevel = getHeatLevel(score);
  const circleColor = getRiskCellColor(score);
  const count = risks.length;
  const hasRisks = count > 0;

  return (
    <div
      ref={cellRef}
      className={cn(
        "glass-risk__cell",
        `glass-risk__cell--heat-${heatLevel}`,
        isActive && "glass-risk__cell--active",
        !hasRisks && "glass-risk__cell--empty",
        "glass-risk__cell--stagger",
        hasRisks && "glass-risk__cell--has-risks",
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
      role="gridcell"
      tabIndex={0}
      aria-label={`Probabilidad ${probability}, Impacto ${impact}: ${count} riesgo${count !== 1 ? "s" : ""}`}
      onClick={onSelect}
      onFocus={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {hasRisks ? (
        <div className="glass-risk__cell-circle">
          <div
            className="glass-risk__cell-count"
            style={{ backgroundColor: circleColor }}
          >
            {count}
          </div>
          <span className="glass-risk__cell-score" style={{ color: circleColor }}>
            {score}
          </span>
        </div>
      ) : (
        <span className="glass-risk__cell-empty-score">{score}</span>
      )}
    </div>
  );
}