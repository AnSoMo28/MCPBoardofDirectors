/**
 * @component ScenarioSection (Fase 24 — §2)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScenarioDelta } from "../hooks/useDecisionDocument";
import { SectionSkeleton } from "./SectionSkeleton";

interface ScenarioSectionProps {
  id: string;
  isLoading: boolean;
  deltas: ScenarioDelta[];
  aiCommentary?: string;
}

function deltaColorHex(val: number, invert = false): string {
  if (val === 0) return "var(--color-silver-400, #a09a92)";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "var(--color-emerald-400, #34d399)" : "var(--color-rose-400, #fb7185)";
}

export function ScenarioSection({
  id,
  isLoading,
  deltas,
  aiCommentary,
}: ScenarioSectionProps) {
  return (
    <div id={id} className="glass-decision__section">
      <div className="glass-decision__section-header">
        <BarChart3 size={16} className="glass-decision__section-icon glass-decision__section-icon--teal" />
        <h2 className="glass-decision__section-title">2. Impacto de Escenarios</h2>
        {isLoading && (
          <span className="glass-decision__section-loading" aria-label="Cargando" />
        )}
      </div>

      {isLoading && deltas.length === 0 ? (
        <SectionSkeleton />
      ) : deltas.length > 0 ? (
        <>
          <div className="glass-decision__delta-grid">
            {deltas.map((d) => (
              <div key={d.label} className="glass-decision__delta-card">
                <p className="glass-decision__delta-label">{d.label}</p>
                <p className="glass-decision__delta-value">{d.format(d.scenario)}</p>
                <div className="glass-decision__delta-change">
                  {d.delta > 0 ? (
                    <TrendingUp size={10} />
                  ) : d.delta < 0 ? (
                    <TrendingDown size={10} />
                  ) : (
                    <Minus size={10} />
                  )}
                  <span style={{ color: deltaColorHex(d.delta, d.invert) }}>
                    {d.delta > 0 ? "+" : ""}
                    {d.format(d.delta)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {aiCommentary && (
            <div className="glass-decision__commentary glass-decision__commentary--teal">
              <p>{aiCommentary}</p>
            </div>
          )}
        </>
      ) : (
        <p className="glass-decision__empty">
          Simulación no disponible. Ejecute un escenario en la pestaña Simulador para incluirlo.
        </p>
      )}
    </div>
  );
}