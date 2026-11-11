/**
 * @component RiskAlertsSection (Fase 24 — §7)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { AlertTriangle } from "lucide-react";
import { NARRATIVE_RISK_SEVERITY_CONFIG } from "@/features/finance/types";
import type { NarrativeRiskAlert } from "@/features/finance/types";
import './RiskAlertsSection.css';

interface RiskAlertsSectionProps {
  id: string;
  alerts: NarrativeRiskAlert[];
}

export function RiskAlertsSection({ id, alerts }: RiskAlertsSectionProps) {
  if (alerts.length === 0) return null;

  return (
    <div id={id} className="risk-alerts-section glass-decision__section">
      <div className="glass-decision__section-header">
        <AlertTriangle size={16} className="glass-decision__section-icon" style={{ color: "var(--color-amber-400, #fbbf24)" }} />
        <h2 className="glass-decision__section-title">7. Alertas de Riesgo</h2>
      </div>

      <div className="glass-decision__alert-list">
        {alerts.map((alert, idx) => {
          const cfg = NARRATIVE_RISK_SEVERITY_CONFIG[alert.severity];
          return (
            <div
              key={idx}
              className="glass-decision__alert-card"
              style={{ borderLeftColor: cfg?.color }}
            >
              <div className="glass-decision__alert-header">
                <h4 className="glass-decision__alert-title">{alert.title}</h4>
                <span
                  className="glass-decision__alert-severity"
                  style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                >
                  {cfg?.label}
                </span>
              </div>
              <p className="glass-decision__alert-body">{alert.description}</p>
              <div className="glass-decision__alert-action">
                <p className="glass-decision__alert-action-label">Acción sugerida</p>
                <p className="glass-decision__alert-action-text">
                  {alert.suggested_action}
                </p>
              </div>
              <div className="glass-decision__alert-meta">
                <span>{alert.affected_area}</span>
                <span>
                  Deadline:{" "}
                  {new Date(alert.deadline).toLocaleDateString("es-CR")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}