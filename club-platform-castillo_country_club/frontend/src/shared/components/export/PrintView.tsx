/**
 * @component PrintView (Fase 24 — REWRITE)
 * @namespace .glass-print
 * @depends PrintLayout, ComparisonTable, usePrintNarrative,
 *          decision/InsightsSection*, decision/RiskAlertsSection*,
 *          PrintView.css
 * @note Print renderer with screen preview. Reuses DecisionDocument sub-components
 *       where data shapes match (insights, risks). Unique sections: comparison table,
 *       detailed analysis. Named + default export for backward compatibility.
 * @import import './PrintView.css';
 */

import { NARRATIVE_INSIGHT_TYPE_CONFIG, NARRATIVE_RISK_SEVERITY_CONFIG } from "@/features/finance/types";
import type { NarrativeGenerateData, NarrativeInsight, NarrativeRiskAlert } from "@/features/finance/types";
import { formatCurrency } from "@/shared/lib/utils";
import { PrintLayout } from "./PrintLayout";
import { ComparisonTable } from "./decision/ComparisonTable";
import { usePrintNarrative } from "./hooks/usePrintNarrative";
import "./PrintView.css";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface NarrativePrintViewProps {
  data: NarrativeGenerateData;
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function NarrativePrintView({
  data,
  isOpen,
  onClose,
}: NarrativePrintViewProps) {
  const doc = usePrintNarrative(data);

  return (
    <PrintLayout
      title="Narrativa Ejecutiva"
      subtitle={`${doc.period} — ${doc.audience} — Confianza: ${doc.confidence}%`}
      isOpen={isOpen}
      onClose={onClose}
      onPrint={doc.handlePrint}
      previewMode={doc.previewMode}
      onTogglePreview={doc.togglePreview}
    >
      {/* ── §1 Executive Summary ── */}
      <section className="glass-print__section">
        <h3 className="glass-print__heading">Resumen Ejecutivo</h3>
        <p className="glass-print__body">{doc.summary}</p>
      </section>

      {/* ── §2 Insights ── */}
      {doc.hasInsights && (
        <section className="glass-print__section">
          <h3 className="glass-print__heading">Insights Clave</h3>
          {doc.insights.map((insight: NarrativeInsight, idx: number) => {
            const cfg = NARRATIVE_INSIGHT_TYPE_CONFIG[insight.type];
            return (
              <div
                key={insight.id}
                className="glass-print__insight-card"
                style={{ borderLeftColor: cfg?.color ?? "#6b7280" }}
              >
                <p className="glass-print__insight-title">
                  {idx + 1}. {insight.title}
                  <span
                    className="glass-print__badge"
                    style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                  >
                    {cfg?.label}
                  </span>
                </p>
                <p className="glass-print__insight-body">{insight.body}</p>
                {insight.impact_estimate !== 0 && (
                  <p
                    className="glass-print__insight-meta"
                    style={{
                      color:
                        insight.impact_estimate > 0
                          ? "var(--color-emerald-400, #34d399)"
                          : "var(--color-rose-400, #fb7185)",
                    }}
                  >
                    Impacto: {insight.impact_estimate > 0 ? "+" : ""}
                    {formatCurrency(insight.impact_estimate)} — Confianza:{" "}
                    {insight.confidence}%
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ── §3 Comparisons ── */}
      {doc.hasComparisons && (
        <section className="glass-print__section">
          <h3 className="glass-print__heading">Comparativas</h3>
          <ComparisonTable rows={doc.comparisons} />
        </section>
      )}

      {/* ── §4 Recommendations ── */}
      {doc.hasRecommendations && (
        <section className="glass-print__section glass-print__section--break">
          <h3 className="glass-print__heading">Recomendaciones</h3>
          {doc.recommendations.map((rec, idx) => {
            const priCfg =
              NARRATIVE_RISK_SEVERITY_CONFIG[rec.priority];
            return (
              <div key={rec.id} className="glass-print__rec-item">
                <span className="glass-print__rec-number">{idx + 1}</span>
                <div className="glass-print__rec-content">
                  <p className="glass-print__rec-title">
                    {rec.title}
                    <span
                      className="glass-print__badge"
                      style={{
                        color: priCfg?.color,
                        backgroundColor: priCfg?.bgColor,
                      }}
                    >
                      {rec.priority}
                    </span>
                  </p>
                  <p className="glass-print__rec-description">
                    {rec.description}
                  </p>
                  <p className="glass-print__rec-impact">
                    +{formatCurrency(rec.estimated_impact)}
                    {rec.category === "revenue" ? "/mes" : ""} —{" "}
                    {rec.timeframe}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── §5 Risk Alerts ── */}
      {doc.hasRisks && (
        <section className="glass-print__section">
          <h3 className="glass-print__heading">Alertas de Riesgo</h3>
          {doc.risks.map((alert: NarrativeRiskAlert, idx: number) => {
            const cfg = NARRATIVE_RISK_SEVERITY_CONFIG[alert.severity];
            return (
              <div
                key={idx}
                className="glass-print__alert-card"
                style={{ borderLeftColor: cfg?.color ?? "#6b7280" }}
              >
                <p className="glass-print__alert-title">
                  {alert.title}
                  <span
                    className="glass-print__badge"
                    style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}
                  >
                    {cfg?.label}
                  </span>
                </p>
                <p className="glass-print__alert-body">{alert.description}</p>
                <div className="glass-print__alert-action">
                  <p className="glass-print__alert-action-label">
                    Acción sugerida
                  </p>
                  <p className="glass-print__alert-action-text">
                    {alert.suggested_action}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── §6 Detailed Sections ── */}
      {doc.hasDetails && (
        <section className="glass-print__section">
          <h3 className="glass-print__heading">Análisis Detallado</h3>
          {doc.details.map((section) => (
            <div
              key={section.id}
              className="glass-print__detail-block glass-print__detail-block--avoid"
            >
              <h4 className="glass-print__subheading">{section.title}</h4>
              <p className="glass-print__body">{section.content}</p>
            </div>
          ))}
        </section>
      )}
    </PrintLayout>
  );
}

export default NarrativePrintView;