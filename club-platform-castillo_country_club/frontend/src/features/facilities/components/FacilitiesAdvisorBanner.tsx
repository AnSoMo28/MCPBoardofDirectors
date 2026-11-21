// src/features/facilities/components/FacilitiesAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// FACILITIES ADVISOR BANNER — "El Oráculo Menor"
//
// Advisor insights with layer encoding, action execution,
// and expand/collapse.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — entry stagger, action pulse
//   ✅ SENSE 2: REACCIÓN — card hover translateY(-2px)
//   ✅ SENSE 3: MEMORIA — insight count, confidence %, layer
//   ✅ SENSE 4: INTENCIÓN — Ejecutar button with letter-spacing
//   ✅ SENSE 5: SINIESTRÍA — high impact cards visually dominant
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — banner summary sentence
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  Wrench,
  Building2,
  TrendingUp,
  Shield,
  Target,
  Layers,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";

import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { showToast } from "@/shared/components/ui/Toast";

import type {
  FacilitiesAdvisorInsight,
  FacilitiesDashboardMode,
} from "../types";
import {
  type AdvisorActionState,
} from "@/shared/types/ai-intelligence";
import "./FacilitiesAdvisorBanner.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const INITIAL_VISIBLE = 3;

const LAYER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  diagnostic: Shield,
  utilization: TrendingUp,
  maintenance: Wrench,
  compliance: Target,
  space: Building2,
  revenue: Layers,
  cross_domain: Layers,
  prediction: CalendarCheck,
  event_readiness: CalendarCheck,
};

const LAYER_LABELS: Record<string, string> = {
  diagnostic: "Diagnóstico",
  utilization: "Utilización",
  maintenance: "Mantenimiento",
  compliance: "Cumplimiento",
  space: "Espacios",
  revenue: "Revenue",
  cross_domain: "Cross-Domain",
  prediction: "Predicción",
  event_readiness: "Eventos",
};

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildBannerNarrative(
  insights: FacilitiesAdvisorInsight[],
  highCount: number,
  mediumCount: number,
): string {
  if (insights.length === 0) {
    return "Facilities Advisor — todo en orden, sin insights pendientes.";
  }

  const parts: string[] = [];
  parts.push(`${insights.length} insight${insights.length > 1 ? "s" : ""} disponible${insights.length > 1 ? "s" : ""}.`);

  if (highCount > 0) {
    parts.push(`${highCount} de alta prioridad.`);
  }
  if (mediumCount > 0) {
    parts.push(`${mediumCount} de prioridad media.`);
  }

  const actionable = insights.filter((i) => i.action != null).length;
  if (actionable > 0) {
    parts.push(`${actionable} con acción ejecutable.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface FacilitiesAdvisorBannerProps {
  insights: FacilitiesAdvisorInsight[];
  ambientMode?: FacilitiesDashboardMode;
  onExecute?: (insight: FacilitiesAdvisorInsight) => void;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Insight Card
// ═══════════════════════════════════════════════════════════

function InsightCard({
  insight,
  actionState,
  index,
  prefersReduced,
  onExecute,
}: {
  insight: FacilitiesAdvisorInsight;
  actionState: AdvisorActionState;
  index: number;
  prefersReduced: boolean;
  onExecute: (insight: FacilitiesAdvisorInsight) => void;
}) {
  const LayerIcon = LAYER_ICONS[insight.layer] ?? Sparkles;
  const layerLabel = LAYER_LABELS[insight.layer] ?? insight.layer;

  return (
    <div
      className="fac-advisor__card"
      data-impact={insight.impact}
      style={
        prefersReduced
          ? undefined
          : ({ "--stagger-i": index } as React.CSSProperties)
      }
    >
      <div className="fac-advisor__card-row">
        {/* Impact badge */}
        <span className="fac-advisor__impact" data-impact={insight.impact}>
          {insight.impact === "high" ? "Alto" : insight.impact === "medium" ? "Medio" : "Bajo"}
        </span>

        {/* Content */}
        <div className="fac-advisor__card-body">
          <div className="fac-advisor__card-meta">
            <LayerIcon className="fac-advisor__layer-icon" />
            <span className="fac-advisor__layer-label">{layerLabel}</span>
            <span className="fac-advisor__confidence">{insight.confidence}%</span>
          </div>
          <p className="fac-advisor__card-title">{insight.title}</p>
          <p className="fac-advisor__card-reasoning">{insight.reasoning}</p>
        </div>

        {/* Action button (Sense 4: INTENCIÓN) */}
        {insight.action && (
          <div className="fac-advisor__card-action">
            {actionState === "done" ? (
              <span className="fac-advisor__action-done">
                <CheckCircle2 className="fac-advisor__action-done-icon" />
                Listo
              </span>
            ) : (
              <Button
                variant="unstyled"
                className="fac-advisor__action-btn"
                data-loading={actionState === "loading" ? "true" : undefined}
                disabled={actionState === "loading"}
                onClick={() => onExecute(insight)}
              >
                <Zap className="fac-advisor__action-btn-icon" />
                {actionState === "loading" ? "Ejecutando…" : "Ejecutar"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function FacilitiesAdvisorBanner({
  insights,
  ambientMode = "calm",
  onExecute,
}: FacilitiesAdvisorBannerProps) {
  const prefersReduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [actionStates, setActionStates] = useState<Record<string, AdvisorActionState>>({});

  const highCount = useMemo(
    () => insights.filter((i) => i.impact === "high").length,
    [insights],
  );
  const mediumCount = useMemo(
    () => insights.filter((i) => i.impact === "medium").length,
    [insights],
  );

  const visibleInsights = expanded ? insights : insights.slice(0, INITIAL_VISIBLE);
  const hasMore = insights.length > INITIAL_VISIBLE;

  const narrative = buildBannerNarrative(insights, highCount, mediumCount);

  const handleExecute = useCallback(
    (insight: FacilitiesAdvisorInsight) => {
      if (!insight.action) return;

      if (insight.action.approval_level === "auto") {
        setActionStates((prev) => ({ ...prev, [insight.id]: "loading" }));
        setTimeout(() => {
          setActionStates((prev) => ({ ...prev, [insight.id]: "done" }));
          showToast({
            type: "success",
            message: `Acción ejecutada: ${insight.action!.label}`,
          });
        }, 800);
      }

      onExecute?.(insight);
    },
    [onExecute],
  );

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // ── Empty state ──
  if (insights.length === 0) {
    return (
      <div className="fac-advisor fac-advisor--empty" data-mode={ambientMode}>
        <Sparkles className="fac-advisor__empty-icon" />
        <span className="fac-advisor__empty-text">
          {narrative}
        </span>
      </div>
    );
  }

  return (
    <div
      className="fac-advisor"
      data-mode={ambientMode}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Header */}
      <div className="fac-advisor__header">
        <div className="fac-advisor__header-left">
          <span className="fac-advisor__sparkle-wrap">
            <Sparkles className="fac-advisor__sparkle-icon" />
          </span>
          <div className="fac-advisor__header-text">
            <span className="fac-advisor__title">Facilities Advisor</span>
            <span className="fac-advisor__subtitle">
              {highCount > 0 && `${highCount} alto`}
              {highCount > 0 && mediumCount > 0 && " · "}
              {mediumCount > 0 && `${mediumCount} medio`}
              {" — "}
              {insights.length} insight{insights.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Narrative (Sense 7) */}
      <p className="fac-advisor__narrative">{narrative}</p>

      {/* Insight cards */}
      <div className="fac-advisor__grid">
        {visibleInsights.map((insight, index) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            actionState={actionStates[insight.id] ?? "idle"}
            index={index}
            prefersReduced={prefersReduced}
            onExecute={handleExecute}
          />
        ))}
      </div>

      {/* Expand/collapse */}
      {hasMore && (
        <Button
          variant="unstyled"
          className="fac-advisor__toggle"
          onClick={handleToggle}
        >
          {expanded ? (
            <>
              <ChevronUp className="fac-advisor__toggle-icon" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="fac-advisor__toggle-icon" />
              Ver {insights.length - INITIAL_VISIBLE} más
            </>
          )}
        </Button>
      )}
    </div>
  );
}
