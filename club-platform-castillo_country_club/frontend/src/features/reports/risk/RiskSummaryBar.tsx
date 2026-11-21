/**
 * @component RiskSummaryBar (Fase 25)
 * @namespace .glass-risk__summary
 * @depends RiskSummaryBar.css
 * @note Summary stats grid showing risk counts by level.
 * @import import './RiskSummaryBar.css';
 */
import "./RiskSummaryBar.css";

import { RISK_LEVEL_CONFIG } from "@/shared/lib/riskTheme";
import type { RiskSummary } from "@/features/reports/types";

interface RiskSummaryBarProps {
  risks: RiskSummary;
}

const LEVELS = ["critical", "high", "medium", "low"] as const;

export function RiskSummaryBar({ risks }: RiskSummaryBarProps) {
  return (
    <div className="glass-risk__summary">
      {LEVELS.map((key) => {
        const config = RISK_LEVEL_CONFIG[key];
        const count = risks[key];
        return (
          <div key={key} className="glass-risk__summary-card">
            <div
              className="glass-risk__summary-dot"
              style={{ backgroundColor: config.color }}
            />
            <div>
              <p className="glass-risk__summary-count">{count}</p>
              <p className="glass-risk__summary-label">{config.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}