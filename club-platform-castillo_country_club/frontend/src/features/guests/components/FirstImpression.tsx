// ═══════════════════════════════════════════════════════════
// src/features/guests/components/FirstImpression.tsx
// Phase 34 "The Gateway" — Signature: First Impression Analysis
// Level 6+ Agency · Production Grade
//
// Visualizes the 5-axis first impression analysis.
// Shows radar-like axis bars, overall score, and
// service recovery alert when score is critical.
//
// The first 30 seconds determine 80% of conversion probability.
//
// Depends on: FirstImpressionAnalysis (conversionChemistry.ts)
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   FirstImpressionAnalysis { guestId, visitId, overall,
//     axes(FirstImpressionAxes), alertRequired, alertMessage,
//     computedAt }                                        ← conversionChemistry.ts §4 ✅
//   FirstImpressionAxes { welcomeLatency, activityMatch,
//     socialTemperature, environmentalComfort,
//     departureSentiment } — all number 0-100             ← conversionChemistry.ts §4 ✅
// ═══════════════════════════════════════════════════════════

import type {
  FirstImpressionAnalysis,
  FirstImpressionAxes,
} from "../types";

import "./FirstImpression.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface FirstImpressionProps {
  /** First impression analysis from the engine. null → empty state. */
  readonly analysis: FirstImpressionAnalysis | null;
  /** Called when user acknowledges the service recovery alert. */
  readonly onAlertAcknowledge?: (analysis: FirstImpressionAnalysis) => void;
}

interface AxisDisplay {
  readonly key: keyof FirstImpressionAxes;
  readonly label: string;
  readonly labelKey: string;
  readonly value: number;
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const AXIS_DEFINITIONS: readonly {
  readonly key: keyof FirstImpressionAxes;
  readonly label: string;
  readonly labelKey: string;
  readonly description: string;
}[] = [
  {
    key: "welcomeLatency",
    label: "Bienvenida",
    labelKey: "guest.firstimpression.welcomeLatency",
    description: "Velocidad de la primera interacción con el staff",
  },
  {
    key: "activityMatch",
    label: "Actividad",
    labelKey: "guest.firstimpression.activityMatch",
    description: "Qué tanto la actividad asignada coincide con intereses del guest",
  },
  {
    key: "socialTemperature",
    label: "Social",
    labelKey: "guest.firstimpression.socialTemperature",
    description: "Interacciones sociales durante la visita",
  },
  {
    key: "environmentalComfort",
    label: "Ambiente",
    labelKey: "guest.firstimpression.environmentalComfort",
    description: "Comodidad del entorno físico percibida por el guest",
  },
  {
    key: "departureSentiment",
    label: "Despedida",
    labelKey: "guest.firstimpression.departureSentiment",
    description: "Sentimiento del guest al momento de retirarse",
  },
] as const;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Impression level from overall score. */
function impressionLevel(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "good";
  if (score >= 40) return "moderate";
  if (score >= 20) return "poor";
  return "critical";
}

/** Impression level label in Spanish. */
function impressionLevelLabel(score: number): string {
  if (score >= 80) return "Excepcional";
  if (score >= 60) return "Buena";
  if (score >= 40) return "Moderada";
  if (score >= 20) return "Débil";
  return "Crítica";
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function AxisBar({ axis }: { readonly axis: AxisDisplay }) {
  return (
    <div className="gst-impression__axis" data-testid={`impression-axis-${axis.key}`}>
      <div className="gst-impression__axis-header">
        <span className="gst-impression__axis-label">{axis.label}</span>
        <span className="gst-impression__axis-value">{axis.value}</span>
      </div>
      <div className="gst-impression__axis-track" title={axis.description}>
        <div
          className="gst-impression__axis-fill"
          data-level={impressionLevel(axis.value)}
          style={{ width: `${axis.value}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * First Impression Analysis — 5-axis visualization.
 * Shows welcome latency, activity match, social temperature,
 * environmental comfort, and departure sentiment.
 * Alerts staff when service recovery is needed.
 *
 * @example
 * <FirstImpression
 *   analysis={firstImpressionResult}
 *   onAlertAcknowledge={(a) => dismissAlert(a)}
 * />
 */
export function FirstImpression({
  analysis,
  onAlertAcknowledge,
}: FirstImpressionProps) {
  // ── Empty state ──
  if (!analysis) {
    return (
      <div
        className="gst-impression"
        data-state="empty"
        role="region"
        aria-label="Análisis de primera impresión"
        data-testid="first-impression"
      >
        <p className="gst-impression__empty-text">
          No hay datos de primera impresión disponibles.
        </p>
      </div>
    );
  }

  const axes: readonly AxisDisplay[] = AXIS_DEFINITIONS.map((def) => ({
    ...def,
    value: analysis.axes[def.key],
  }));

  return (
    <div
      className="gst-impression"
      data-state="data"
      data-level={impressionLevel(analysis.overall)}
      role="region"
      aria-label={`Primera impresión: ${analysis.overall}/100`}
      data-testid="first-impression"
    >
      {/* ── Alert Banner (service recovery) ── */}
      {analysis.alertRequired && (
        <div
          className="gst-impression__alert"
          role="alert"
          aria-label="Alerta de recuperación de servicio"
        >
          <div className="gst-impression__alert-content">
            <p className="gst-impression__alert-message">
              {analysis.alertMessage ?? "Primera impresión crítica. Recuperación de servicio requerida."}
            </p>
            {onAlertAcknowledge && (
              <Button
                variant="unstyled"
                className="gst-impression__alert-action"
                onClick={() => onAlertAcknowledge(analysis)}
                aria-label="Iniciar recuperación de servicio"
                data-testid="impression-alert-acknowledge"
              >
                Iniciar recuperación
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Overall Score ── */}
      <div className="gst-impression__header">
        <div className="gst-impression__overall">
          <span className="gst-impression__overall-score">{analysis.overall}</span>
          <span className="gst-impression__overall-label">
            {impressionLevelLabel(analysis.overall)}
          </span>
        </div>
      </div>

      {/* ── Axis Bars ── */}
      <div className="gst-impression__axes" role="list" aria-label="Ejes de primera impresión">
        {axes.map((axis) => (
          <AxisBar key={axis.key} axis={axis} />
        ))}
      </div>
    </div>
  );
}