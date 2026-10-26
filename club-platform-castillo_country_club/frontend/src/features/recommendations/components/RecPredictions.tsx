// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Predictions v2 (2027 REWRITE)
//
// Replaces: PredictAttendance.tsx + RecPredictions v1
//
// "The Crystal Ball" — On-demand event attendance prediction with
// animated gauge, enhanced confidence cone, and factor cards.
//
// Paradigm: ON-DEMAND (event details → MCP → prediction).
// MCP tool: "predict_event_attendance".
// Gauge: SVG radial arc that animates on mount.
// Confidence: visual cone range with marker pulse.
// Comparison: horizontal bar chart (predicted vs avg).
// Factors: visual cards with icon-per-factor mapping.
//
// Glass namespace: .glass-rpa
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Database,
  Tag,
  Sun,
  UserCheck,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import {
  CONFIDENCE_CONFIG,
  type PredictAttendanceResponse,
} from "../types";

import "./RecPredictions.css";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════

const FACTOR_META: Record<
  string,
  { label: string; icon: typeof Database }
> = {
  historical_data: { label: "Datos históricos", icon: Database },
  event_type: { label: "Tipo de evento", icon: Tag },
  seasonal_trends: { label: "Tendencias estacionales", icon: Sun },
  early_registrations: { label: "Pre-registros", icon: UserCheck },
};

function formatFactor(factor: string): { label: string; icon: typeof Database } {
  return FACTOR_META[factor] ?? {
    label: factor.replace(/_/g, " "),
    icon: Tag,
  };
}

function getUncertaintyPct(confidence: string): number {
  switch (confidence) {
    case "high":
      return 10;
    case "medium":
      return 20;
    case "low":
      return 35;
    default:
      return 20;
  }
}

function getConfidenceLevel(confidence: string): "high" | "medium" | "low" {
  if (confidence === "high" || confidence === "medium" || confidence === "low") {
    return confidence;
  }
  return "medium";
}

function getTrendLevel(
  diffPct: number,
): "strong_positive" | "positive" | "flat" | "negative" | "strong_negative" {
  if (diffPct >= 15) return "strong_positive";
  if (diffPct > 3) return "positive";
  if (diffPct > -3) return "flat";
  if (diffPct > -15) return "negative";
  return "strong_negative";
}

// ═══════════════════════════════════════════════════════════════════════
// FORM FIELD
// ═══════════════════════════════════════════════════════════════════════

function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rpa-field">
      <label htmlFor={htmlFor} className="rpa-field-label">
        {label}
        {required && <span className="rpa-field-required"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GAUGE SVG (innovation: animated arc on mount)
// ═══════════════════════════════════════════════════════════════════════

function PredictionGauge({
  predicted,
  arcLength,
  confidence,
  reducedMotion,
}: {
  predicted: number;
  arcLength: number;
  confidence: string;
  reducedMotion: boolean;
}) {
  const circumference = 314; // 2 * π * 50
  const confidenceLevel = getConfidenceLevel(confidence);

  return (
    <div className="rpa-gauge">
      <svg
        viewBox="0 0 120 120"
        className="rpa-gauge-svg"
        role="img"
        aria-label={`${predicted} asistentes predichos`}
      >
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r="50"
          className="rpa-gauge-track"
        />

        {/* Tick marks (decorative) */}
        {[0, 50, 100, 150, 200, 250, 300].map((offset) => (
          <circle
            key={offset}
            cx="60"
            cy="60"
            r="50"
            className="rpa-gauge-tick"
            strokeDasharray="1 14"
            strokeDashoffset={-offset}
          />
        ))}

        {/* Animated arc */}
        <circle
          cx="60"
          cy="60"
          r="50"
          className="rpa-gauge-arc"
          data-confidence={confidenceLevel}
          strokeDasharray={`${reducedMotion ? arcLength : 0} ${circumference}`}
          style={
            {
              "--target-dash": `${arcLength} ${circumference}`,
              "--arc-delay": "0.3s",
            } as React.CSSProperties
          }
        />

        {/* End cap dot */}
        <circle
          cx="60"
          cy="60"
          r="50"
          className="rpa-gauge-cap"
          data-confidence={confidenceLevel}
          strokeDasharray="0 314"
          style={
            {
              "--target-dash-cap": `0.5 313.5`,
              "--cap-delay": "0.8s",
            } as React.CSSProperties
          }
        />
      </svg>

      <div className="rpa-gauge-center">
        <span
          className="rpa-gauge-value"
          data-confidence={confidenceLevel}
        >
          {predicted}
        </span>
        <span className="rpa-gauge-label">Asistentes</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPARISON BAR (innovation: side-by-side visual)
// ═══════════════════════════════════════════════════════════════════════

function ComparisonBar({
  predicted,
  avg,
  reducedMotion,
}: {
  predicted: number;
  avg: number;
  reducedMotion: boolean;
}) {
  const maxVal = Math.max(predicted, avg, 1);
  const predPct = (predicted / maxVal) * 100;
  const avgPct = (avg / maxVal) * 100;
  const diff = predicted - avg;
  const diffPct = avg > 0 ? Math.round((diff / avg) * 100) : 0;
  const trend = getTrendLevel(diffPct);

  return (
    <div className="rpa-compare">
      {/* Predicted bar */}
      <div className="rpa-compare-row">
        <span className="rpa-compare-label">Predicción</span>
        <div className="rpa-compare-bar-area">
          <div
            className="rpa-compare-bar"
            data-variant="predicted"
            style={
              {
                "--bar-pct": `${predPct}%`,
                "--bar-delay": reducedMotion ? "0ms" : "0.4s",
              } as React.CSSProperties
            }
          />
          <span className="rpa-compare-bar-value">{predicted}</span>
        </div>
      </div>

      {/* Average bar */}
      <div className="rpa-compare-row">
        <span className="rpa-compare-label">Promedio</span>
        <div className="rpa-compare-bar-area">
          <div
            className="rpa-compare-bar"
            data-variant="average"
            style={
              {
                "--bar-pct": `${avgPct}%`,
                "--bar-delay": reducedMotion ? "0ms" : "0.5s",
              } as React.CSSProperties
            }
          />
          <span className="rpa-compare-bar-value">{avg}</span>
        </div>
      </div>

      {/* Delta callout */}
      <div className="rpa-compare-delta" data-trend={trend}>
        {diff >= 0 ? (
          <TrendingUp size={14} aria-hidden="true" />
        ) : (
          <TrendingDown size={14} aria-hidden="true" />
        )}
        <span className="rpa-compare-delta-value">
          {diff >= 0 ? "+" : ""}
          {diff}
        </span>
        <span className="rpa-compare-delta-pct">
          ({diffPct >= 0 ? "+" : ""}{diffPct}%)
        </span>
        <span className="rpa-compare-delta-label">
          vs eventos similares
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONFIDENCE CONE (innovation: wider visual with animated reveal)
// ═══════════════════════════════════════════════════════════════════════

function ConfidenceCone({
  predicted,
  minRange,
  maxRange,
  uncertaintyPct,
  confidence,
  reducedMotion,
}: {
  predicted: number;
  minRange: number;
  maxRange: number;
  uncertaintyPct: number;
  confidence: string;
  reducedMotion: boolean;
}) {
  const confidenceLevel = getConfidenceLevel(confidence);
  return (
    <div className="rpa-cone">
      <div className="rpa-cone-header">
        <span className="rpa-cone-title">Rango estimado</span>
        <span
          className="rpa-cone-badge"
          data-confidence={confidenceLevel}
        >
          ±{uncertaintyPct}%
        </span>
      </div>

      {/* Visual cone */}
      <div className="rpa-cone-visual">
        {/* Background track */}
        <div className="rpa-cone-track" />

        {/* Cone shape (narrow at predicted, wide at edges) */}
        <div
          className="rpa-cone-shape"
          data-confidence={confidenceLevel}
          style={
            {
              "--cone-delay": reducedMotion ? "0ms" : "0.5s",
            } as React.CSSProperties
          }
        />

        {/* Predicted marker */}
        <div
          className="rpa-cone-marker"
          data-confidence={confidenceLevel}
          style={
            {
              "--marker-delay": reducedMotion ? "0ms" : "0.7s",
            } as React.CSSProperties
          }
        >
          <div className="rpa-cone-marker-dot" />
          <span className="rpa-cone-marker-label">{predicted}</span>
        </div>
      </div>

      {/* Min / Max labels */}
      <div className="rpa-cone-labels">
        <span className="rpa-cone-min">
          {minRange}
          <span className="rpa-cone-label-sub">mín</span>
        </span>
        <span className="rpa-cone-max">
          {maxRange}
          <span className="rpa-cone-label-sub">máx</span>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FACTOR CARDS (innovation: visual cards with icons)
// ═══════════════════════════════════════════════════════════════════════

function FactorCards({
  factors,
  index,
}: {
  factors: string[];
  index: number;
}) {
  return (
    <div className="rpa-factors">
      <span className="rpa-factors-title">Factores considerados</span>
      <div className="rpa-factors-grid">
        {factors.map((factor, fi) => {
          const meta = formatFactor(factor);
          const FactorIcon = meta.icon;
          return (
            <div
              key={factor}
              className="rpa-factor-card"
              style={
                {
                  "--stagger-i": index + fi,
                } as React.CSSProperties
              }
            >
              <div className="rpa-factor-icon">
                <FactorIcon size={14} aria-hidden="true" />
              </div>
              <span className="rpa-factor-label">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function PredictAttendance() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──────────────────────────────────────────────────────
  const [eventName, setEventName] = useState("");
  const [eventId, setEventId] = useState("");
  const [eventType, setEventType] = useState("");
  const [venueCapacity, setVenueCapacity] = useState(200);
  const [shouldFetch, setShouldFetch] = useState(false);

  // ── On-demand MCP query ─────────────────────────────────────────────
  const { data, isLoading, isFetching } =
    useMCPQuery<PredictAttendanceResponse>(
      "proactive_recommendation",
      "predict_event_attendance",
      {
        event_name: eventName || undefined,
        event_id: eventId || undefined,
        event_type: eventType || undefined,
        venue_capacity: venueCapacity,
      },
      {
        enabled: shouldFetch && eventName.trim().length > 0,
        staleTime: 30_000,
      },
    );

  // ── Handlers ────────────────────────────────────────────────────────
  const handlePredict = useCallback(() => {
    if (!eventName.trim()) return;
    setShouldFetch(true);
  }, [eventName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handlePredict();
    },
    [handlePredict],
  );

  const prediction = data?.prediction;
  const busy = isLoading || isFetching;

  // ── Derived values ──────────────────────────────────────────────────
  const gaugeData = useMemo(() => {
    if (!prediction) return null;
    const maxRef = Math.max(1, prediction.similar_events_avg * 2);
    const pct = Math.min(
      100,
      (prediction.predicted_attendance / maxRef) * 100,
    );
    const arcLength = (pct / 100) * 314;
    return { pct, arcLength };
  }, [prediction]);

  const coneData = useMemo(() => {
    if (!prediction) return null;
    const uncertaintyPct = getUncertaintyPct(prediction.confidence);
    const minRange = Math.round(
      prediction.predicted_attendance * (1 - uncertaintyPct / 100),
    );
    const maxRange = Math.round(
      prediction.predicted_attendance * (1 + uncertaintyPct / 100),
    );
    return { minRange, maxRange, uncertaintyPct };
  }, [prediction]);

  const confidenceConfig = prediction
    ? CONFIDENCE_CONFIG[prediction.confidence]
    : null;

  return (
    <div
      className="glass-rpa"
      role="region"
      aria-label="Predicción de asistencia a eventos"
    >
      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div className="rpa-form">
        <div className="rpa-form-grid">
          <FormField
            label="Nombre del Evento"
            htmlFor="rpa-event-name"
            required
          >
            <input
              id="rpa-event-name"
              className="rpa-input"
              placeholder="Gala de Primavera 2025"
              value={eventName}
              onChange={(e) => {
                setEventName(e.target.value);
                setShouldFetch(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </FormField>

          <FormField label="ID del Evento" htmlFor="rpa-event-id">
            <input
              id="rpa-event-id"
              className="rpa-input"
              placeholder="evt-gala-spring"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setShouldFetch(false);
              }}
            />
          </FormField>

          <FormField label="Tipo de Evento">
            <select
              className="rpa-select"
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setShouldFetch(false);
              }}
            >
              <option value="">Sin especificar</option>
              <option value="gala">Gala</option>
              <option value="tournament">Torneo</option>
              <option value="social">Social</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Deportivo</option>
            </select>
          </FormField>

          <FormField label="Capacidad del Venue" htmlFor="rpa-capacity">
            <input
              id="rpa-capacity"
              className="rpa-input"
              type="number"
              min={0}
              value={venueCapacity}
              onChange={(e) => {
                setVenueCapacity(
                  Math.max(0, Number(e.target.value)),
                );
                setShouldFetch(false);
              }}
            />
          </FormField>
        </div>

        <div className="rpa-form-actions">
          <Button
            variant="primary"
            onClick={handlePredict}
            disabled={!eventName.trim() || busy}
          >
            {busy ? "Prediciendo..." : "Predecir Asistencia"}
          </Button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {busy && shouldFetch && <div className="rpa-skeleton" />}

      {/* ── Empty: no fetch yet ───────────────────────────────────────── */}
      {!shouldFetch && !busy && (
        <div className="rpa-empty-wrap">
          <EmptyState
            icon={<BarChart3 size={32} className="rpa-empty-icon" />}
            title="Ingrese datos del evento"
            description="Complete al menos el nombre del evento para generar una predicción de asistencia."
          />
        </div>
      )}

      {/* ── Empty: no prediction ──────────────────────────────────────── */}
      {!busy && shouldFetch && !prediction && (
        <div className="rpa-empty-wrap">
          <EmptyState
            icon={<BarChart3 size={32} className="rpa-empty-icon" />}
            title="Sin predicción disponible"
            description="No se pudo generar una predicción para los datos ingresados."
          />
        </div>
      )}

      {/* ── Prediction result ─────────────────────────────────────────── */}
      {!busy && prediction && gaugeData && coneData && (
        <div className="rpa-result">
          {/* Header */}
          <div className="rpa-result-header">
            <div className="rpa-result-title-area">
              <h3 className="rpa-result-title">
                Predicción para {prediction.event_name}
              </h3>
              {prediction.event_id && (
                <span className="rpa-result-event-id">
                  {prediction.event_id}
                </span>
              )}
            </div>
            <span
              className="rpa-confidence-badge"
              data-confidence={getConfidenceLevel(prediction.confidence)}
            >
              {confidenceConfig?.label ?? prediction.confidence}
              <span className="rpa-confidence-badge-pct">
                {confidenceConfig?.pct ?? 0}%
              </span>
            </span>
          </div>

          {/* Gauge + Details */}
          <div className="rpa-gauge-section">
            <PredictionGauge
              predicted={prediction.predicted_attendance}
              arcLength={gaugeData.arcLength}
              confidence={prediction.confidence}
              reducedMotion={prefersReduced}
            />

            <div className="rpa-details">
              {/* Comparison bars */}
              <ComparisonBar
                predicted={prediction.predicted_attendance}
                avg={prediction.similar_events_avg}
                reducedMotion={prefersReduced}
              />

              {/* Confidence cone */}
              <ConfidenceCone
                predicted={prediction.predicted_attendance}
                minRange={coneData.minRange}
                maxRange={coneData.maxRange}
                uncertaintyPct={coneData.uncertaintyPct}
                confidence={prediction.confidence}
                reducedMotion={prefersReduced}
              />
            </div>
          </div>

          {/* Factors */}
          {prediction.factors.length > 0 && (
            <FactorCards
              factors={prediction.factors}
              index={prediction.factors.length}
            />
          )}

          {/* Timestamp */}
          <p className="rpa-timestamp">
            <Calendar size={10} aria-hidden="true" />
            <span>
              Generado:{" "}
              {new Date(prediction.created_at).toLocaleString("es-CR")}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}