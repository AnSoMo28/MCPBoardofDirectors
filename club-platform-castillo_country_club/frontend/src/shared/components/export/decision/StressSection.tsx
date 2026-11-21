/**
 * @component StressSection (Fase 24 — §3)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { Activity } from "lucide-react";
import { formatCurrency } from "@/shared/lib/utils";
import type { StressMetric } from "../hooks/useDecisionDocument";
import { SectionSkeleton } from "./SectionSkeleton";
import './StressSection.css';

interface StressSectionProps {
  id: string;
  isLoading: boolean;
  metrics: StressMetric[];
  aiCommentary?: string;
}

function formatMetric(m: StressMetric): string {
  if (m.format === "percent") return `${(m.value * 100).toFixed(0)}%`;
  return formatCurrency(m.value);
}

export function StressSection({
  id,
  isLoading,
  metrics,
  aiCommentary,
}: StressSectionProps) {
  return (
    <div id={id} className="stress-section glass-decision__section">
      <div className="glass-decision__section-header">
        <Activity size={16} className="glass-decision__section-icon glass-decision__section-icon--rose" />
        <h2 className="glass-decision__section-title">3. Resiliencia Financiera</h2>
        {isLoading && (
          <span className="glass-decision__section-loading" aria-label="Cargando" />
        )}
      </div>

      {isLoading && metrics.length === 0 ? (
        <SectionSkeleton />
      ) : metrics.length > 0 ? (
        <>
          <div className="glass-decision__metric-grid">
            {metrics.map((m) => (
              <div key={m.label} className="glass-decision__metric-card">
                <p className="glass-decision__metric-label">{m.label}</p>
                <p className="glass-decision__metric-value">{formatMetric(m)}</p>
              </div>
            ))}
          </div>
          {aiCommentary && (
            <div className="glass-decision__commentary glass-decision__commentary--rose">
              <p>{aiCommentary}</p>
            </div>
          )}
        </>
      ) : (
        <p className="glass-decision__empty">
          Test de estrés no disponible. Ejecute una simulación en la pestaña Test de Estrés para incluirla.
        </p>
      )}
    </div>
  );
}