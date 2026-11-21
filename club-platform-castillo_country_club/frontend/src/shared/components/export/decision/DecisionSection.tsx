/**
 * @component DecisionSection (Fase 24 — §4)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { Crosshair } from "lucide-react";
import { formatCurrency } from "@/shared/lib/utils";
import { DECISION_SCENARIO_CONFIG, DECISION_RISK_CONFIG } from "@/features/finance/types";
import type { DecisionScenario } from "@/shared/mocks/contracts";
import type { FinanceDecisionSimulateResponse } from "@/features/finance/types";
import { SectionSkeleton } from "./SectionSkeleton";
import './DecisionSection.css';

interface DecisionSectionProps {
  id: string;
  isLoading: boolean;
  data: FinanceDecisionSimulateResponse["data"] | undefined;
}

export function DecisionSection({ id, isLoading, data }: DecisionSectionProps) {
  return (
    <div id={id} className="decision-section glass-decision__section">
      <div className="glass-decision__section-header">
        <Crosshair size={16} className="glass-decision__section-icon" />
        <h2 className="glass-decision__section-title">4. Decisiones Simuladas</h2>
        {isLoading && (
          <span className="glass-decision__section-loading" aria-label="Cargando" />
        )}
      </div>

      {isLoading && !data ? (
        <SectionSkeleton />
      ) : data ? (
        <>
          <p style={{ fontFamily: "var(--font-body, 'Source Serif 4', serif)", fontSize: 13, lineHeight: 1.7, margin: "0 0 14px", color: "var(--color-silver-300, #b8b2a9)" }}>
            {data.decision_summary}
          </p>

          <div className="glass-decision__scenario-grid">
            {data.scenarios.map((s: DecisionScenario) => {
              const sCfg = DECISION_SCENARIO_CONFIG[s.name] ?? DECISION_SCENARIO_CONFIG.Base;
              const rCfg = DECISION_RISK_CONFIG[s.risk_level] ?? DECISION_RISK_CONFIG.medio;
              return (
                <div
                  key={s.name}
                  className="glass-decision__scenario-card"
                  style={{ borderTopColor: sCfg.borderColor }}
                >
                  <div className="glass-decision__scenario-header">
                    <span className="glass-decision__scenario-name" style={{ color: sCfg.color }}>
                      {s.name}
                    </span>
                    <span
                      className="glass-decision__scenario-prob"
                      style={{ color: sCfg.color, backgroundColor: sCfg.bgColor }}
                    >
                      {s.probability_pct}%
                    </span>
                  </div>
                  <p className="glass-decision__scenario-revenue">
                    +{formatCurrency(s.revenue_delta)}
                  </p>
                  <div className="glass-decision__scenario-meta">
                    <span>ROI {s.roi_pct}%</span>
                    <span style={{ color: rCfg.color }}>Riesgo: {rCfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-decision__recommendation">
            <div className="glass-decision__recommendation-header">
              <span className="glass-decision__recommendation-label">
                Recomendación AI
              </span>
              {(() => {
                const cfg =
                  DECISION_SCENARIO_CONFIG[data.recommendation.recommended_scenario] ??
                  DECISION_SCENARIO_CONFIG.Base;
                return (
                  <span
                    className="glass-decision__recommendation-badge"
                    style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                  >
                    {data.recommendation.recommended_scenario} ({data.recommendation.confidence_pct}%)
                  </span>
                );
              })()}
            </div>
            <p className="glass-decision__recommendation-text">
              {data.recommendation.reasoning}
            </p>
          </div>
        </>
      ) : (
        <p className="glass-decision__empty">
          Simulación de decisiones no disponible. Ejecute una simulación en la pestaña Decisiones para incluirla.
        </p>
      )}
    </div>
  );
}