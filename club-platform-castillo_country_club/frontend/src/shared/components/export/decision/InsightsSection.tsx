/**
 * @component InsightsSection (Fase 24 — §5)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { Lightbulb } from "lucide-react";
import { formatCurrency } from "@/shared/lib/utils";
import { NARRATIVE_INSIGHT_TYPE_CONFIG } from "@/features/finance/types";
import type { NarrativeInsight } from "@/features/finance/types";

interface InsightsSectionProps {
  id: string;
  insights: NarrativeInsight[];
}

export function InsightsSection({ id, insights }: InsightsSectionProps) {
  return (
    <div id={id} className="glass-decision__section">
      <div className="glass-decision__section-header">
        <Lightbulb size={16} className="glass-decision__section-icon glass-decision__section-icon--teal" />
        <h2 className="glass-decision__section-title">5. Insights Clave</h2>
      </div>

      <div className="glass-decision__insight-grid">
        {insights.map((insight) => {
          const cfg = NARRATIVE_INSIGHT_TYPE_CONFIG[insight.type];
          return (
            <div
              key={insight.id}
              className="glass-decision__insight-card"
              style={{ borderLeftColor: cfg?.color }}
            >
              <div className="glass-decision__insight-header">
                <span
                  className="glass-decision__insight-badge"
                  style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                >
                  {cfg?.label}
                </span>
                <span className="glass-decision__insight-confidence">
                  {insight.confidence}%
                </span>
              </div>
              <h4 className="glass-decision__insight-title">{insight.title}</h4>
              <p className="glass-decision__insight-body">{insight.body}</p>
              {insight.impact_estimate !== 0 && (
                <p
                  className="glass-decision__insight-impact"
                  style={{
                    color:
                      insight.impact_estimate > 0
                        ? "var(--color-emerald-400, #34d399)"
                        : "var(--color-rose-400, #fb7185)",
                  }}
                >
                  {insight.impact_estimate > 0 ? "+" : ""}
                  {formatCurrency(insight.impact_estimate)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}