// src/features/engagement/components/EngagementDecisionStage.tsx
// ═══════════════════════════════════════════════════════════
// Decision Stage — Contextual action panel
// Castillo Country Club — Phase 31 "The Voice"
//
// Adapts to the dominant threat in the system.
// Shows what to do RIGHT NOW with executable actions.
//
// Glass namespace: glass-eng-decision
// Data attributes: data-scenario, data-urgency
// Rules: R34, R35, R38, R23, R24, R17 (Button shared)
// ═══════════════════════════════════════════════════════════

import {
  ShieldAlert,
  Rocket,
  ArrowRightLeft,
  TrendingDown,
  ChevronRight,
  Clock,
  Target,
  Gauge,
} from "lucide-react";
import type { DecisionScenario, DecisionScenarioType } from "../types";
import { DECISION_SCENARIO_DISPLAY } from "../types";
import { Button } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./EngagementDecisionStage.css";

// ── Icon mapping ───────────────────────────────────────────

const SCENARIO_ICONS: Record<DecisionScenarioType, typeof ShieldAlert> = {
  churn_prevention: ShieldAlert,
  engagement_boost: Rocket,
  lifecycle_transition: ArrowRightLeft,
  financial_exposure: TrendingDown,
};

// ── Urgency display ────────────────────────────────────────

const URGENCY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  medium: {
    label: "Medio",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

// ── Component ──────────────────────────────────────────────

interface EngagementDecisionStageProps {
  scenario: DecisionScenario | null;
  onExecuteAction?: (action: DecisionScenario["suggestedActions"][number]) => void;
}

/**
 * The "what to do RIGHT NOW" panel.
 * Adapts its appearance and content based on the dominant
 * scenario type and urgency level.
 */
export function EngagementDecisionStage({
  scenario,
  onExecuteAction,
}: EngagementDecisionStageProps) {
  if (!scenario) {
    return (
      <div data-glass-eng-decision="" data-scenario="none" data-urgency="low" className="eng-decision">
        <EmptyState
          title="Sin acciones urgentes"
          description="El sistema está estable. No hay escenarios que requieren intervención inmediata."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Ver dashboard completo
            </Button>
          }
        />
      </div>
    );
  }

  const scenarioCfg = DECISION_SCENARIO_DISPLAY[scenario.type];
  const urgencyCfg = URGENCY_CONFIG[scenario.urgency] ?? URGENCY_CONFIG.medium;
  const Icon = SCENARIO_ICONS[scenario.type] ?? Target;

  return (
    <div
      data-glass-eng-decision=""
      data-scenario={scenario.type}
      data-urgency={scenario.urgency}
      className="eng-decision"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="eng-decision__header">
        <div
          className="eng-decision__icon"
          style={{ color: scenarioCfg.color }}
        >
          <Icon size={20} />
        </div>

        <div className="eng-decision__header-text">
          <div className="eng-decision__header-badges">
            <span
              className="eng-decision__scenario-badge"
              style={{ color: scenarioCfg.color, backgroundColor: scenarioCfg.bgColor }}
            >
              {scenarioCfg.label}
            </span>
            <span
              className="eng-decision__urgency-badge"
              style={{ color: urgencyCfg.color, backgroundColor: urgencyCfg.bgColor }}
            >
              {urgencyCfg.label}
            </span>
          </div>
          <h2 className="eng-decision__title">{scenario.title}</h2>
        </div>
      </div>

      {/* ── Description ─────────────────────────────────────── */}
      <p className="eng-decision__description">{scenario.description}</p>

      {/* ── Metrics Row ─────────────────────────────────────── */}
      <div className="eng-decision__metrics">
        <div className="eng-decision__metric">
          <Gauge size={14} className="eng-decision__metric-icon" />
          <div>
            <p className="eng-decision__metric-label">Confianza</p>
            <p className="eng-decision__metric-value">{scenario.confidence}%</p>
          </div>
        </div>
        <div className="eng-decision__metric">
          <Target size={14} className="eng-decision__metric-icon" />
          <div>
            <p className="eng-decision__metric-label">Impacto</p>
            <p className="eng-decision__metric-value">{scenario.estimatedImpact}</p>
          </div>
        </div>
        {scenario.deadline && (
          <div className="eng-decision__metric">
            <Clock size={14} className="eng-decision__metric-icon" />
            <div>
              <p className="eng-decision__metric-label">Ventana</p>
              <p className="eng-decision__metric-value">{scenario.deadline}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      {scenario.suggestedActions.length > 0 && (
        <div className="eng-decision__actions">
          {scenario.suggestedActions.map((action, idx) => (
            <button
              key={`${action.tool}-${idx}`}
              type="button"
              className="eng-decision__action"
              data-approval={action.approval_level}
              onClick={() => onExecuteAction?.(action)}
            >
              <div className="eng-decision__action-content">
                <span className="eng-decision__action-label">{action.label}</span>
                {action.estimated_impact && (
                  <span className="eng-decision__action-impact">
                    {action.estimated_impact}
                  </span>
                )}
              </div>
              <div className="eng-decision__action-meta">
                <span className="eng-decision__action-approval">
                  {action.approval_level === "auto"
                    ? "Auto"
                    : action.approval_level === "hitl"
                      ? "Requiere aprobación"
                      : "Semi-automático"}
                </span>
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}