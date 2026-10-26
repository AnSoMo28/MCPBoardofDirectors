// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Activity Cards v2 (2027 REWRITE)
//
// Replaces: ActivitySuggester.tsx + RecActivityCards v1
//
// "The Idea Board" — CRUD for activity suggestions with approval
// pipeline, enhanced interest visualization, and demand signal
// composite derived from existing fields.
//
// Paradigm: CRUD (auto-load list + create mutation).
// MCP: "suggest_new_activities" { action: "list" | "create" }.
// Approval pipeline: horizontal status steps (same as PricingCards).
// Interest bar: animated fill + level label + pulse on high.
// Demand signal: composite from requests + clubs_offer + interest.
// Similar clubs: enhanced visual badge.
//
// Glass namespace: .glass-ras
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Hash,
  Users,
  TrendingUp,
  Circle,
  XCircle
} from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { formatCurrency } from "@/shared/lib/utils";

import {
  SuggestionStatus,
  SUGGESTION_STATUS_CONFIG,
  type ActivitySuggestion,
  type SuggestionsListResponse,
  type SuggestionsCreateResponse,
} from "../types";

import "./RecActivityCards.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface SuggestionForm {
  name: string;
  description: string;
  target_demographic: string;
  estimated_interest: string;
  estimated_cost: string;
  similar_clubs_offer: boolean;
  member_requests_count: string;
  tags: string;
}

const INITIAL_FORM: SuggestionForm = {
  name: "",
  description: "",
  target_demographic: "",
  estimated_interest: "",
  estimated_cost: "",
  similar_clubs_offer: false,
  member_requests_count: "",
  tags: "",
};

// Approval pipeline order
const PIPELINE_STEPS: SuggestionStatus[] = [
  SuggestionStatus.Proposed,
  SuggestionStatus.UnderReview,
  SuggestionStatus.Approved,
  SuggestionStatus.Implemented,
];

const PIPELINE_REJECTED = SuggestionStatus.Rejected;

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getInterestLevel(value: number): "high" | "medium" | "low" {
  if (value >= 75) return "high";
  if (value >= 50) return "medium";
  return "low";
}

function getStepIndex(status: SuggestionStatus): number {
  const idx = PIPELINE_STEPS.indexOf(status);
  return idx >= 0 ? idx : 0;
}

/**
 * Demand signal composite — derived from existing fields.
 * No new fields invented. Pure function of:
 *   estimated_interest (0-100) → 50% weight
 *   member_requests_count (capped at 50, normalized to 100) → 30% weight
 *   similar_clubs_offer (boolean → 0 or 100) → 20% weight
 */
function getDemandSignal(s: ActivitySuggestion): {
  score: number;
  level: "surging" | "rising" | "stable" | "low";
} {
  const interestScore = Math.min(100, Math.max(0, s.estimated_interest));
  const requestsRaw = Math.min(50, Math.max(0, s.member_requests_count));
  const requestsScore = (requestsRaw / 50) * 100;
  const clubsScore = s.similar_clubs_offer ? 100 : 0;

  const score = Math.round(
    interestScore * 0.5 + requestsScore * 0.3 + clubsScore * 0.2,
  );

  let level: "surging" | "rising" | "stable" | "low";
  if (score >= 75) level = "surging";
  else if (score >= 50) level = "rising";
  else if (score >= 30) level = "stable";
  else level = "low";

  return { score, level };
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
    <div className="ras-field">
      <label htmlFor={htmlFor} className="ras-field-label">
        {label}
        {required && <span className="ras-field-required"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APPROVAL PIPELINE (innovation v2)
// ═══════════════════════════════════════════════════════════════════════

function ApprovalPipeline({ status }: { status: SuggestionStatus }) {
  const currentIdx = getStepIndex(status);
  const isRejected = status === PIPELINE_REJECTED;
  const statusCfg = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[status];

  return (
    <div
      className="ras-pipeline"
      data-status={status}
      data-rejected={isRejected ? "" : undefined}
    >
      {PIPELINE_STEPS.map((step, idx) => {
        const stepCfg = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[step];
        const isActive = idx === currentIdx && !isRejected;
        const isComplete = idx < currentIdx && !isRejected;

        return (
          <div
            key={step}
            className="ras-pipeline-step"
            data-state={
              isActive ? "active" : isComplete ? "complete" : "pending"
            }
          >
            <div className="ras-pipeline-node">
              {isComplete ? (
                <CheckCircle2 size={12} aria-hidden="true" />
              ) : (
                <Circle size={12} aria-hidden="true" />
              )}
            </div>
            <span className="ras-pipeline-label">
              {stepCfg?.label ?? step}
            </span>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                className="ras-pipeline-connector"
                data-filled={
                  idx < currentIdx && !isRejected ? "" : undefined
                }
              />
            )}
          </div>
        );
      })}

      {isRejected && (
        <div className="ras-pipeline-rejected">
          <XCircle size={12} aria-hidden="true" />
          <span>{statusCfg?.label ?? status}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INTEREST BAR (enhanced v2)
// ═══════════════════════════════════════════════════════════════════════

function InterestBar({
  value,
  reducedMotion,
}: {
  value: number;
  reducedMotion: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const level = getInterestLevel(clamped);

  return (
    <div className="ras-interest-bar" data-interest-level={level}>
      <div className="ras-interest-track">
        <div
          className="ras-interest-fill"
          data-interest-level={level}
          style={
            {
              "--interest-pct": `${clamped}%`,
              "--interest-delay": reducedMotion ? "0ms" : "0.3s",
            } as React.CSSProperties
          }
        />
      </div>
      <span className="ras-interest-value" data-interest-level={level}>
        {clamped}
      </span>
      <span className="ras-interest-label" data-interest-level={level}>
        {level === "high" ? "Alto" : level === "medium" ? "Medio" : "Bajo"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DEMAND SIGNAL (innovation v2 — derived from existing fields)
// ═══════════════════════════════════════════════════════════════════════

function DemandSignal({ suggestion }: { suggestion: ActivitySuggestion }) {
  const { score, level } = getDemandSignal(suggestion);

  return (
    <div className="ras-demand" data-demand-shift={level}>
      <div className="ras-demand-header">
        <TrendingUp size={11} aria-hidden="true" />
        <span className="ras-demand-label">Demanda</span>
        <span className="ras-demand-score">{score}</span>
      </div>
      <div className="ras-demand-bar">
        <div
          className="ras-demand-fill"
          data-demand-shift={level}
          style={
            {
              "--demand-pct": `${score}%`,
            } as React.CSSProperties
          }
        />
      </div>
      <span className="ras-demand-level" data-demand-shift={level}>
        {level === "surging"
          ? "Alta demanda"
          : level === "rising"
            ? "Demanda creciente"
            : level === "stable"
              ? "Demanda estable"
              : "Baja demanda"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIMILAR CLUBS BADGE (innovation v2)
// ═══════════════════════════════════════════════════════════════════════

function SimilarClubsBadge({
  offers,
}: {
  offers: boolean;
}) {
  return (
    <div className="ras-clubs-badge" data-offers={offers ? "" : undefined}>
      <div className="ras-clubs-icon-wrap">
        <Users size={11} aria-hidden="true" />
      </div>
      <span className="ras-clubs-text">
        {offers ? "Otros clubes lo ofrecen" : "Oportunidad única"}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════════

function SuggestionCard({
  suggestion: s,
  isExpanded,
  onToggle,
  reducedMotion,
}: {
  suggestion: ActivitySuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}) {
  const statusConfig = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[s.status];

  return (
    <div className="ras-card" data-status={s.status}>
      {/* Header */}
      <button
        type="button"
        className="ras-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="ras-card-header-left">
          <h4 className="ras-card-title">{s.name}</h4>
          <div className="ras-card-badges">
            <span
              className="ras-badge ras-badge--status"
              data-status={s.status}
            >
              {statusConfig?.label ?? s.status}
            </span>
            <SimilarClubsBadge offers={s.similar_clubs_offer} />
          </div>
        </div>
        <div className="ras-card-header-right">
          {isExpanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Description preview */}
      <p className="ras-card-desc">{s.description}</p>

      {/* Quick stats */}
      <div className="ras-card-quick-stats">
        <div className="ras-card-quick-stat">
          <span className="ras-card-quick-label">Demografía</span>
          <span className="ras-card-quick-value">
            {s.target_demographic}
          </span>
        </div>
        <div className="ras-card-quick-stat">
          <span className="ras-card-quick-label">Costo</span>
          <span className="ras-card-quick-value ras-card-quick-value--mono">
            {formatCurrency(s.estimated_cost)}
          </span>
        </div>
        <div className="ras-card-quick-stat">
          <span className="ras-card-quick-label">Solicitudes</span>
          <span className="ras-card-quick-value ras-card-quick-value--mono">
            {s.member_requests_count}
          </span>
        </div>
      </div>

      {/* Interest + demand */}
      <div className="ras-card-meters">
        <InterestBar value={s.estimated_interest} reducedMotion={reducedMotion} />
        <DemandSignal suggestion={s} />
      </div>

      {/* Pipeline + risk */}
      <div className="ras-card-pipeline">
        <ApprovalPipeline status={s.status} />
      </div>

      {/* Expanded: tags + description */}
      {isExpanded && (
        <div className="ras-card-detail">
          {s.tags.length > 0 && (
            <div className="ras-card-tags">
              {s.tags.map((tag) => (
                <span key={tag} className="ras-tag">
                  <Hash size={9} aria-hidden="true" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════

function SuggestionDetailPanel({
  suggestion,
  reducedMotion,
}: {
  suggestion: ActivitySuggestion;
  reducedMotion: boolean;
}) {
  const statusConfig = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[suggestion.status];

  return (
    <div className="ras-detail-panel" data-status={suggestion.status}>
      {/* Header */}
      <div className="ras-detail-header">
        <div className="ras-detail-header-left">
          <h3 className="ras-detail-title">{suggestion.name}</h3>
          <span className="ras-detail-demographic">
            {suggestion.target_demographic}
          </span>
        </div>
        <span
          className="ras-badge ras-badge--status"
          data-status={suggestion.status}
        >
          {statusConfig?.label ?? suggestion.status}
        </span>
      </div>

      {/* Approval pipeline */}
      <div className="ras-detail-section">
        <span className="ras-detail-section-title">
          Flujo de Aprobación
        </span>
        <ApprovalPipeline status={suggestion.status} />
      </div>

      {/* Description */}
      <div className="ras-detail-section">
        <span className="ras-detail-section-title">Descripción</span>
        <p className="ras-detail-desc">{suggestion.description}</p>
      </div>

      {/* Metrics grid */}
      <div className="ras-detail-section">
        <span className="ras-detail-section-title">Métricas</span>
        <div className="ras-detail-metrics">
          <div className="ras-metric-cell">
            <span className="ras-metric-label">Interés Estimado</span>
            <InterestBar
              value={suggestion.estimated_interest}
              reducedMotion={reducedMotion}
            />
          </div>
          <div className="ras-metric-cell">
            <span className="ras-metric-label">Costo Estimado</span>
            <span className="ras-metric-value">
              {formatCurrency(suggestion.estimated_cost)}
            </span>
          </div>
          <div className="ras-metric-cell">
            <span className="ras-metric-label">Solicitudes</span>
            <span className="ras-metric-value">
              {suggestion.member_requests_count}
            </span>
          </div>
          <div className="ras-metric-cell">
            <SimilarClubsBadge offers={suggestion.similar_clubs_offer} />
          </div>
        </div>
      </div>

      {/* Demand signal */}
      <div className="ras-detail-section">
        <span className="ras-detail-section-title">
          Señal de Demanda
        </span>
        <DemandSignal suggestion={suggestion} />
      </div>

      {/* Tags */}
      {suggestion.tags.length > 0 && (
        <div className="ras-detail-section">
          <span className="ras-detail-section-title">Etiquetas</span>
          <div className="ras-detail-tags">
            {suggestion.tags.map((tag) => (
              <span key={tag} className="ras-tag">
                <Hash size={9} aria-hidden="true" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="ras-detail-timestamps">
        <span>
          <Calendar size={10} aria-hidden="true" />
          Creado:{" "}
          {new Date(suggestion.created_at).toLocaleDateString("es-CR")}
        </span>
        {suggestion.updated_at && (
          <span>
            Actualizado:{" "}
            {new Date(suggestion.updated_at).toLocaleDateString("es-CR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function ActivitySuggester() {
  const prefersReduced = useReducedMotion();

  // ── State ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<SuggestionForm>({ ...INITIAL_FORM });

  // ── List query (auto-load) ────────────────────────────────────────
  const { data: listData, isLoading } =
    useMCPQuery<SuggestionsListResponse>(
      "proactive_recommendation",
      "suggest_new_activities",
      { action: "list" },
      { staleTime: 60_000 },
    );

  // ── Create mutation ───────────────────────────────────────────────
  const createMutation = useMCPMutation<SuggestionsCreateResponse>(
    "proactive_recommendation",
    "suggest_new_activities",
    {
      onSuccess: (data) => {
        showToast({
          type: "success",
          message:
            data?.message ?? "Actividad propuesta. Esperando aprobación.",
        });
        resetForm();
      },
    },
  );

  // ── Handlers ──────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setShowForm(false);
  }, []);

  const updateField = useCallback(
    (field: keyof SuggestionForm, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isFormValid =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.target_demographic.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isFormValid) return;
    createMutation.mutate({
      action: "create",
      name: form.name,
      description: form.description,
      target_demographic: form.target_demographic,
      estimated_interest: Number(form.estimated_interest) || 0,
      estimated_cost: Number(form.estimated_cost) || 0,
      similar_clubs_offer: form.similar_clubs_offer,
      member_requests_count: Number(form.member_requests_count) || 0,
      tags: form.tags,
    });
  }, [form, isFormValid, createMutation]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const suggestions = listData?.suggestions ?? [];

  // ── Expanded suggestion ───────────────────────────────────────────
  const expandedSuggestion = useMemo(
    () => suggestions.find((s) => s.id === expandedId) ?? null,
    [suggestions, expandedId],
  );

  // ── Summary stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (suggestions.length === 0) return null;
    const pending = suggestions.filter(
      (s: ActivitySuggestion) =>
        s.status === SuggestionStatus.Proposed ||
        s.status === SuggestionStatus.UnderReview,
    ).length;
    const approved = suggestions.filter(
      (s: ActivitySuggestion) =>
        s.status === SuggestionStatus.Approved ||
        s.status === SuggestionStatus.Implemented,
    ).length;
    const avgInterest =
      suggestions.reduce(
        (sum: number, s: ActivitySuggestion) =>
          sum + s.estimated_interest,
        0,
      ) / suggestions.length;
    const clubsOffer = suggestions.filter(
      (s: ActivitySuggestion) => s.similar_clubs_offer,
    ).length;
    return {
      total: suggestions.length,
      pending,
      approved,
      avgInterest: Math.round(avgInterest),
      clubsOffer,
    };
  }, [suggestions]);

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-ras">
        <div className="ras-loading">
          <div className="ras-skeleton ras-skeleton--header" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ras-skeleton ras-skeleton--row"
              style={
                {
                  "--skeleton-delay": `${i * 100}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      className="glass-ras"
      role="region"
      aria-label="Sugerencias de nuevas actividades"
    >
      {/* ── Header strip ────────────────────────────────────────────── */}
      <div className="ras-header-strip">
        <div className="ras-header-info">
          <span className="ras-header-count">
            {suggestions.length} sugerencia
            {suggestions.length !== 1 ? "s" : ""} registrada
            {suggestions.length !== 1 ? "s" : ""}
          </span>
          {stats && (
            <div className="ras-header-stats">
              {stats.pending > 0 && (
                <span
                  className="ras-header-stat"
                  data-variant="pending"
                >
                  {stats.pending} pendiente
                  {stats.pending !== 1 ? "s" : ""}
                </span>
              )}
              {stats.approved > 0 && (
                <span
                  className="ras-header-stat"
                  data-variant="approved"
                >
                  {stats.approved} aprobada
                  {stats.approved !== 1 ? "s" : ""}
                </span>
              )}
              <span
                className="ras-header-stat"
                data-variant="interest"
              >
                Interés promedio: {stats.avgInterest}
              </span>
              {stats.clubsOffer > 0 && (
                <span
                  className="ras-header-stat"
                  data-variant="clubs"
                >
                  {stats.clubsOffer} en otros clubes
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancelar" : "Nueva Sugerencia"}
        </Button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="ras-create-form">
          <div className="ras-form-grid">
            <FormField
              label="Nombre de la Actividad"
              htmlFor="ras-name"
              required
            >
              <input
                id="ras-name"
                className="ras-input"
                placeholder="Paddle Surf"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </FormField>

            <FormField
              label="Demografía Objetivo"
              htmlFor="ras-demo"
              required
            >
              <input
                id="ras-demo"
                className="ras-input"
                placeholder="Adultos 25-45"
                value={form.target_demographic}
                onChange={(e) =>
                  updateField("target_demographic", e.target.value)
                }
              />
            </FormField>

            <FormField
              label="Interés Estimado (0-100)"
              htmlFor="ras-interest"
            >
              <input
                id="ras-interest"
                className="ras-input"
                type="number"
                min={0}
                max={100}
                placeholder="78"
                value={form.estimated_interest}
                onChange={(e) =>
                  updateField("estimated_interest", e.target.value)
                }
              />
            </FormField>

            <FormField label="Costo Estimado (₡)" htmlFor="ras-cost">
              <input
                id="ras-cost"
                className="ras-input"
                type="number"
                min={0}
                placeholder="15000"
                value={form.estimated_cost}
                onChange={(e) =>
                  updateField("estimated_cost", e.target.value)
                }
              />
            </FormField>

            <FormField
              label="Solicitudes de Socios"
              htmlFor="ras-requests"
            >
              <input
                id="ras-requests"
                className="ras-input"
                type="number"
                min={0}
                placeholder="23"
                value={form.member_requests_count}
                onChange={(e) =>
                  updateField("member_requests_count", e.target.value)
                }
              />
            </FormField>

            <FormField label="Otros clubes lo ofrecen">
              <button
                type="button"
                className="ras-toggle"
                role="switch"
                aria-checked={form.similar_clubs_offer}
                data-checked={
                  form.similar_clubs_offer ? "" : undefined
                }
                onClick={() =>
                  updateField(
                    "similar_clubs_offer",
                    !form.similar_clubs_offer,
                  )
                }
              >
                <span className="ras-toggle-thumb" />
              </button>
            </FormField>
          </div>

          <FormField
            label="Descripción"
            htmlFor="ras-desc"
            required
          >
            <textarea
              id="ras-desc"
              className="ras-textarea"
              placeholder="Describa la actividad, equipamiento necesario y beneficios..."
              value={form.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              rows={3}
            />
          </FormField>

          <FormField
            label="Etiquetas (separadas por coma)"
            htmlFor="ras-tags"
          >
            <input
              id="ras-tags"
              className="ras-input"
              placeholder="acuático, fitness, outdoor"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
            />
          </FormField>

          <div className="ras-form-actions">
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Registrando..."
                : "Proponer Actividad"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {suggestions.length === 0 && !showForm && (
        <div className="ras-empty-wrap">
          <EmptyState
            icon={
              <Lightbulb size={32} className="ras-empty-icon" />
            }
            title="Sin sugerencias de actividades"
            description="Proponga una nueva actividad para enviarla a aprobación."
            action={
              <Button
                variant="primary"
                onClick={() => setShowForm(true)}
              >
                Nueva Sugerencia
              </Button>
            }
          />
        </div>
      )}

      {/* ── Desktop table ────────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <>
          <div className="ras-table-wrap">
            <table className="ras-table" role="table">
              <thead>
                <tr className="ras-table-header-row">
                  <th className="ras-th">Actividad</th>
                  <th className="ras-th">Demografía</th>
                  <th className="ras-th ras-th--right">Interés</th>
                  <th className="ras-th ras-th--right">Demanda</th>
                  <th className="ras-th ras-th--right">Costo</th>
                  <th className="ras-th ras-th--right">Solicitudes</th>
                  <th className="ras-th">Estado</th>
                  <th className="ras-th ras-th--narrow" />
                </tr>
              </thead>
              <tbody>
                {suggestions.map(
                  (s: ActivitySuggestion, idx: number) => {
                    const isExpanded = expandedId === s.id;
                    const statusConfig = (
                      SUGGESTION_STATUS_CONFIG as Record<
                        string,
                        { label: string }
                      >
                    )[s.status];
                    const demand = getDemandSignal(s);

                    return (
                      <tr
                        key={s.id}
                        className="ras-table-row"
                        data-expanded={
                          isExpanded ? "" : undefined
                        }
                        data-status={s.status}
                        onClick={() => toggleExpand(s.id)}
                        role="row"
                        aria-expanded={isExpanded}
                        style={
                          {
                            "--stagger-i": idx,
                          } as React.CSSProperties
                        }
                      >
                        <td className="ras-td ras-td--name">
                          <div className="ras-table-name-cell">
                            {s.similar_clubs_offer && (
                              <Users
                                size={12}
                                aria-hidden="true"
                                className="ras-clubs-icon"
                                data-offers=""
                              />
                            )}
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className="ras-td ras-td--demo">
                          {s.target_demographic}
                        </td>
                        <td className="ras-td ras-td--right">
                          <span
                            className="ras-table-interest"
                            data-interest-level={getInterestLevel(
                              s.estimated_interest,
                            )}
                          >
                            {s.estimated_interest}
                          </span>
                        </td>
                        <td className="ras-td ras-td--right">
                          <span
                            className="ras-table-demand"
                            data-demand-shift={demand.level}
                          >
                            {demand.score}
                          </span>
                        </td>
                        <td className="ras-td ras-td--right ras-td--mono">
                          {formatCurrency(s.estimated_cost)}
                        </td>
                        <td className="ras-td ras-td--right ras-td--mono">
                          {s.member_requests_count}
                        </td>
                        <td className="ras-td">
                          <span
                            className="ras-badge ras-badge--status"
                            data-status={s.status}
                          >
                            {statusConfig?.label ?? s.status}
                          </span>
                        </td>
                        <td className="ras-td ras-td--center">
                          {isExpanded ? (
                            <ChevronUp
                              size={14}
                              aria-hidden="true"
                              className="ras-expand-icon"
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                              aria-hidden="true"
                              className="ras-expand-icon"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────────────────── */}
          <div className="ras-mobile-cards">
            {suggestions.map((s: ActivitySuggestion) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isExpanded={expandedId === s.id}
                onToggle={() => toggleExpand(s.id)}
                reducedMotion={prefersReduced}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Expanded detail panel ───────────────────────────────────── */}
      {expandedSuggestion && (
        <SuggestionDetailPanel
          suggestion={expandedSuggestion}
          reducedMotion={prefersReduced}
        />
      )}
    </div>
  );
}