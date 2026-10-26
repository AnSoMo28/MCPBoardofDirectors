// src/features/recommendations/components/PredictAttendance.tsx
// Fase 10, B3 — Predicción on-demand de asistencia a eventos

import { useState, useCallback } from "react";
import {
  TrendingUp,
  BarChart3,
  Info,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import {
  CONFIDENCE_CONFIG,
  type PredictAttendanceResponse,
} from "../types";

// ── Main Component ─────────────────────────────────────────

export function PredictAttendance() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──
  const [eventName, setEventName] = useState("");
  const [eventId, setEventId] = useState("");
  const [eventType, setEventType] = useState("");
  const [venueCapacity, setVenueCapacity] = useState(200);
  const [shouldFetch, setShouldFetch] = useState(false);

  // ── Level 2: On-demand query ──
  const { data, isLoading, isFetching } = useMCPQuery<PredictAttendanceResponse>(
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

  // ── Handlers ──
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

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Predicción de asistencia a eventos"
    >
      {/* ── Input form ── */}
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Event name — required */}
          <div>
            <label
              htmlFor="pred-event-name"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              Nombre del Evento <span className="text-[var(--color-rose-400)]">*</span>
            </label>
            <Input
              id="pred-event-name"
              placeholder="Gala de Primavera 2025"
              value={eventName}
              onChange={(e) => {
                setEventName(e.target.value);
                setShouldFetch(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Event ID — optional */}
          <div>
            <label
              htmlFor="pred-event-id"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              ID del Evento (opcional)
            </label>
            <Input
              id="pred-event-id"
              placeholder="evt-gala-spring"
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setShouldFetch(false);
              }}
            />
          </div>

          {/* Event type — optional */}
          <div>
            <label
              htmlFor="pred-event-type"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              Tipo de Evento (opcional)
            </label>
            <select
              id="pred-event-type"
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setShouldFetch(false);
              }}
              className="w-full h-10 px-3 rounded-[var(--radius-md)]
                         bg-[var(--color-surface-1)] border border-white/[0.08]
                         text-sm font-ui text-[var(--color-silver-200)]
                         focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
            >
              <option value="">Sin especificar</option>
              <option value="gala">Gala</option>
              <option value="tournament">Torneo</option>
              <option value="social">Social</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Deportivo</option>
            </select>
          </div>

          {/* Venue capacity */}
          <div>
            <label
              htmlFor="pred-capacity"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              Capacidad del Venue
            </label>
            <Input
              id="pred-capacity"
              type="number"
              min={0}
              value={venueCapacity}
              onChange={(e) => {
                setVenueCapacity(Math.max(0, Number(e.target.value)));
                setShouldFetch(false);
              }}
            />
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={<TrendingUp className="w-4 h-4" />}
            onClick={handlePredict}
            disabled={!eventName.trim() || busy}
          >
            {busy ? "Prediciendo..." : "Predecir Asistencia"}
          </Button>
        </div>
      </Card>

      {/* ── Loading ── */}
      {busy && shouldFetch && (
        <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
      )}

      {/* ── No fetch yet ── */}
      {!shouldFetch && (
        <EmptyState
          icon={
            <BarChart3 className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Ingrese datos del evento"
          description="Complete al menos el nombre del evento para generar una predicción de asistencia."
        />
      )}

      {/* ── Prediction result ── */}
      {!busy && prediction && (
        <Card
          className={`p-6 space-y-5 ${
            prefersReduced
              ? ""
              : "opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-ui font-semibold text-[var(--color-silver-100)] text-base">
                Predicción para {prediction.event_name}
              </h3>
              {prediction.event_id && (
                <p className="text-xs text-[var(--color-silver-500)] font-mono mt-0.5">
                  {prediction.event_id}
                </p>
              )}
            </div>
            <Badge
              variant={
                prediction.confidence === "high"
                  ? "success"
                  : prediction.confidence === "medium"
                    ? "warning"
                    : "danger"
              }
            >
              Confianza: {CONFIDENCE_CONFIG[prediction.confidence]?.label ?? prediction.confidence}
            </Badge>
          </div>

          {/* Main gauge — SVG radial */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Gauge SVG */}
            <div className="relative w-44 h-44 shrink-0">
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label={`${prediction.predicted_attendance} asistentes predichos`}
              >
                {/* Background track */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="var(--color-surface-1)"
                  strokeWidth="10"
                />
                {/* Prediction arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={
                    prediction.confidence === "high"
                      ? "var(--color-emerald-400)"
                      : prediction.confidence === "medium"
                        ? "var(--color-amber-400)"
                        : "var(--color-rose-400)"
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${
                    (Math.min(
                      100,
                      (prediction.predicted_attendance /
                        Math.max(
                          1,
                          prediction.similar_events_avg * 2,
                        )) *
                        100,
                    ) /
                      100) *
                    314
                  } 314`}
                />
              </svg>
              {/* Center value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-mono font-bold text-[var(--color-silver-100)]">
                  {prediction.predicted_attendance}
                </span>
                <span className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider">
                  Asistentes
                </span>
              </div>
            </div>

            {/* Comparison & details */}
            <div className="flex-1 space-y-4 w-full">
              {/* vs similar events */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-ui text-[var(--color-silver-400)]">
                    Promedio eventos similares
                  </span>
                  <span className="text-sm font-mono font-semibold text-[var(--color-silver-300)]">
                    {prediction.similar_events_avg}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-ui text-[var(--color-silver-400)]">
                    Diferencia
                  </span>
                  <span
                    className="text-sm font-mono font-semibold"
                    style={{
                      color:
                        prediction.predicted_attendance >=
                        prediction.similar_events_avg
                          ? "var(--color-emerald-400)"
                          : "var(--color-rose-400)",
                    }}
                  >
                    {prediction.predicted_attendance >=
                    prediction.similar_events_avg
                      ? "+"
                      : ""}
                    {prediction.predicted_attendance -
                      prediction.similar_events_avg}
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-ui text-[var(--color-silver-400)]">
                    Nivel de confianza
                  </span>
                  <span className="text-xs font-ui font-medium text-[var(--color-silver-300)]">
                    {CONFIDENCE_CONFIG[prediction.confidence]?.pct ?? 0}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-silver-600) 30%, transparent)`,
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${CONFIDENCE_CONFIG[prediction.confidence]?.pct ?? 0}%`,
                      backgroundColor:
                        CONFIDENCE_CONFIG[prediction.confidence]?.color ??
                        "var(--color-silver-400)",
                    }}
                  />
                </div>
              </div>

              {/* Factors */}
              {prediction.factors.length > 0 && (
                <div>
                  <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-2">
                    Factores considerados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.factors.map((factor) => (
                      <span
                        key={factor}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                                   font-ui bg-[var(--color-surface-1)] border border-white/[0.06]
                                   text-[var(--color-silver-400)]"
                      >
                        <Info className="w-2.5 h-2.5" />
                        {formatFactor(factor)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Created at */}
          <p className="text-[10px] text-[var(--color-silver-600)] text-right">
            Generado:{" "}
            {new Date(prediction.created_at).toLocaleString("es-CR")}
          </p>
        </Card>
      )}

      {/* Stagger keyframes */}
      {!prefersReduced && (
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function formatFactor(factor: string): string {
  const map: Record<string, string> = {
    historical_data: "Datos históricos",
    event_type: "Tipo de evento",
    seasonal_trends: "Tendencias estacionales",
    early_registrations: "Pre-registros",
  };
  return map[factor] ?? factor.replace(/_/g, " ");
}
