/**
 * @component RecommendationsSection (Fase 24 — §6)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/shared/lib/utils";
import {
  NARRATIVE_RISK_SEVERITY_CONFIG,
  NARRATIVE_CATEGORY_CONFIG,
} from "@/features/finance/types";
import type { NarrativeRecommendation } from "@/features/finance/types";

interface RecommendationsSectionProps {
  id: string;
  recommendations: NarrativeRecommendation[];
}

export function RecommendationsSection({
  id,
  recommendations,
}: RecommendationsSectionProps) {
  return (
    <div id={id} className="glass-decision__section">
      <div className="glass-decision__section-header">
        <TrendingUp size={16} className="glass-decision__section-icon" />
        <h2 className="glass-decision__section-title">6. Recomendaciones</h2>
      </div>

      <div className="glass-decision__rec-list">
        {recommendations.map((rec, idx) => {
          const priCfg = NARRATIVE_RISK_SEVERITY_CONFIG[rec.priority];
          const catCfg = NARRATIVE_CATEGORY_CONFIG[rec.category];
          return (
            <div key={rec.id} className="glass-decision__rec-item">
              <span className="glass-decision__rec-number">{idx + 1}</span>
              <div className="glass-decision__rec-content">
                <div className="glass-decision__rec-header">
                  <p className="glass-decision__rec-title">{rec.title}</p>
                  <span
                    className="glass-decision__rec-badge"
                    style={{ color: priCfg?.color, backgroundColor: priCfg?.bgColor }}
                  >
                    {rec.priority}
                  </span>
                  <span
                    className="glass-decision__rec-badge"
                    style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}
                  >
                    {catCfg?.label}
                  </span>
                </div>
                <p className="glass-decision__rec-description">{rec.description}</p>
                <p className="glass-decision__rec-impact">
                  +{formatCurrency(rec.estimated_impact)}
                  {rec.category === "revenue" ? "/mes" : ""} · {rec.timeframe}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}