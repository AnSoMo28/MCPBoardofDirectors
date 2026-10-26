/* ═══════════════════════════════════════════════════════════════
   Wellness Correlation Matrix — "The Equation" (P9)
   3 visual equations: wellness × outcome.
   ═══════════════════════════════════════════════════════════════ */

import { cn } from "@/shared/lib/utils";
import type { WellnessCorrelation, WellnessMode } from "../types";
import "./WellnessCorrelationMatrix.css";

interface Props {
  correlations: WellnessCorrelation | null;
  mode: WellnessMode;
  className?: string;
}

const CORR_DEFS: {
  key: keyof WellnessCorrelation;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    key: "wellness_to_retention",
    label: "Retención",
    icon: "🔒",
    color: "var(--color-teal-400)",
  },
  {
    key: "wellness_to_revenue",
    label: "Revenue",
    icon: "₡",
    color: "var(--color-gold-400)",
  },
  {
    key: "wellness_to_satisfaction",
    label: "Satisfacción",
    icon: "★",
    color: "var(--color-emerald-400)",
  },
];

const SIG_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export function WellnessCorrelationMatrix({
  correlations,
  mode,
  className,
}: Props) {
  if (!correlations) return null;

  return (
    <div className={cn("glass-wc", className)} data-mode={mode}>
      <span className="wc__title">Correlaciones</span>
      <div className="wc__equations">
        {CORR_DEFS.map((def) => {
          const corr = correlations[def.key];
          const pct = Math.round(corr.coefficient * 100);
          const isHigh = corr.significance === "high" && corr.coefficient > 0.5;

          return (
            <div key={def.key} className={cn("wc__eq", isHigh && "wc__eq--high")}>
              <div className="wc__eq-top">
                <span className="wc__eq-icon" style={{ color: def.color }}>
                  {def.icon}
                </span>
                <span className="wc__eq-label">{def.label}</span>
              </div>
              <div className="wc__eq-bar">
                <div
                  className="wc__eq-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: def.color,
                  }}
                />
              </div>
              <div className="wc__eq-bottom">
                <span className="wc__eq-pct" style={{ color: def.color }}>
                  {pct}%
                </span>
                <span className="wc__eq-sig">
                  {SIG_LABEL[corr.significance] ?? corr.significance}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}