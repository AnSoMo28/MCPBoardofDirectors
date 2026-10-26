// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Family Stream v2 (2027 REWRITE)
//
// Replaces: FamilyRecommendations.tsx + RecFamilyStream v1
//
// "The Intelligence Briefing" — On-demand recommendation generator
// with intelligence stream layout, reasoning chain display, and
// domain signal visualization.
//
// Paradigm: ON-DEMAND (family ID input → MCP query → results).
// MCP tool: "generate_family_recommendations".
// Sort: score × priority weight (isHighPriority → 1.5× boost).
// Stream: left rail with priority-colored dots, cards flow right.
// Expand: CSS grid transition, reasoning chain with analysis → action.
// Domain signals via RECOMMENDATION_TYPE_CONFIG[rt].signalSource.
//
// Glass namespace: .glass-rfc
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
  Dumbbell,
  Lightbulb,
  Hash,
  Brain,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";

import type {
  FamilyRecommendationsResponse,
  Recommendation,
} from "../types";
import {
  RecommendationType,
  RECOMMENDATION_TYPE_CONFIG,
  PRIORITY_CONFIG,
  isHighPriority,
} from "../types";

import "./RecFamilyStream.css";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const REC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los tipos" },
  ...Object.values(RecommendationType).map((rt) => ({
    value: rt,
    label: RECOMMENDATION_TYPE_CONFIG[rt].label,
  })),
];

const DOMAIN_LABELS: Record<string, string> = {
  wellness: "Bienestar",
  events: "Eventos",
  finance: "Finanzas",
  sports: "Deportes",
  families: "Familias",
  internal: "Interno",
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getTypeIcon(type: RecommendationType): typeof Target {
  switch (type) {
    case RecommendationType.Wellness:
      return Dumbbell;
    default:
      return Lightbulb;
  }
}

function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function sortWeight(r: Recommendation): number {
  return r.score * (isHighPriority(r.priority) ? 1.5 : 1.0);
}

function getSignalSource(rec: Recommendation): string {
  const cfg = RECOMMENDATION_TYPE_CONFIG[rec.recommendation_type];
  return cfg?.signalSource ?? "internal";
}

// ═══════════════════════════════════════════════════════════════════════
// FORM FIELD
// ═══════════════════════════════════════════════════════════════════════

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rfc-field">
      <label htmlFor={htmlFor} className="rfc-field-label">
        {label}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN SIGNAL (compact inline)
// ═══════════════════════════════════════════════════════════════════════

function DomainSignalInline({ source }: { source: string }) {
  return (
    <span className="rfc-domain" data-signal-source={source}>
      <span className="rfc-domain-dot" data-signal-source={source} />
      <span className="rfc-domain-label">
        {DOMAIN_LABELS[source] ?? source}
      </span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// REASONING CHAIN (expanded content)
// ═══════════════════════════════════════════════════════════════════════

function ReasoningChain({
  reasoning,
  actionTitle,
}: {
  reasoning: string;
  actionTitle: string;
}) {
  return (
    <div className="rfc-chain">
      <div className="rfc-chain-step" data-step="analysis">
        <div className="rfc-chain-node" data-step="analysis">
          <Brain size={11} aria-hidden="true" />
        </div>
        <div className="rfc-chain-content">
          <span className="rfc-chain-label">Análisis</span>
          <p className="rfc-chain-text">{reasoning}</p>
        </div>
      </div>

      <div className="rfc-chain-connector" />

      <div className="rfc-chain-step" data-step="action">
        <div className="rfc-chain-node" data-step="action">
          <Zap size={11} aria-hidden="true" />
        </div>
        <div className="rfc-chain-content">
          <span className="rfc-chain-label">Acción recomendada</span>
          <p className="rfc-chain-text">{actionTitle}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RECOMMENDATION CARD
// ═══════════════════════════════════════════════════════════════════════

function RecommendationCard({
  recommendation: rec,
  index,
  isExpanded,
  onToggle,
  reducedMotion,
}: {
  recommendation: Recommendation;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}) {
  const typeConfig = RECOMMENDATION_TYPE_CONFIG[rec.recommendation_type];
  const priorityConfig = PRIORITY_CONFIG[rec.priority];
  const TypeIcon = getTypeIcon(rec.recommendation_type);
  const scoreLevel = getScoreLevel(rec.score);
  const signalSource = getSignalSource(rec);
  const delayMs = reducedMotion ? 0 : index * 80;

  return (
    <div
      className="rfc-card"
      data-score-level={scoreLevel}
      data-priority={rec.priority}
      data-signal-source={signalSource}
      style={
        {
          "--stagger-i": index,
          "--card-delay": `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* Header (clickable) */}
      <button
        type="button"
        className="rfc-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="rfc-card-header-left">
          <div
            className="rfc-card-type-icon"
            data-signal-source={signalSource}
          >
            <TypeIcon size={14} aria-hidden="true" />
          </div>
          <div className="rfc-card-title-area">
            <h4 className="rfc-card-title">{rec.title}</h4>
            <div className="rfc-card-badges">
              <span
                className="rfc-badge rfc-badge--type"
                data-signal-source={signalSource}
              >
                {typeConfig?.label ?? rec.recommendation_type}
              </span>
              <span
                className="rfc-badge rfc-badge--priority"
                data-priority={rec.priority}
              >
                {priorityConfig?.label ?? rec.priority}
              </span>
              {isHighPriority(rec.priority) && (
                <span className="rfc-badge rfc-badge--urgent">
                  <Zap size={9} aria-hidden="true" />
                  <span>Urgente</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rfc-card-header-right">
          <div className="rfc-card-score" data-score-level={scoreLevel}>
            <span className="rfc-card-score-value">
              {Math.round(rec.score)}
            </span>
          </div>
          <div className="rfc-card-expand-icon">
            {isExpanded ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </div>
        </div>
      </button>

      {/* Score bar */}
      <div className="rfc-score-bar" data-score-level={scoreLevel}>
        <div
          className="rfc-score-bar-fill"
          style={
            {
              "--score-pct": `${Math.min(100, Math.max(0, rec.score))}%`,
            } as React.CSSProperties
          }
        />
      </div>

      {/* Expand zone (CSS grid transition) */}
      <div
        className="rfc-expand-zone"
        data-expanded={isExpanded ? "" : undefined}
      >
        <div className="rfc-expand-inner">
          <div className="rfc-card-detail">
            {/* Description */}
            <p className="rfc-card-desc">{rec.description}</p>

            {/* Reasoning chain */}
            {rec.reasoning && (
              <ReasoningChain
                reasoning={rec.reasoning}
                actionTitle={rec.title}
              />
            )}

            {/* Footer: domain + tags */}
            <div className="rfc-card-footer">
              <DomainSignalInline source={signalSource} />
              {rec.tags.length > 0 && (
                <div className="rfc-card-tags">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="rfc-tag">
                      <Hash size={9} aria-hidden="true" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function FamilyRecommendations() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──────────────────────────────────────────────────────
  const [familyId, setFamilyId] = useState("");
  const [recType, setRecType] = useState("");
  const [limit, setLimit] = useState(5);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── On-demand MCP query ─────────────────────────────────────────────
  const { data, isLoading, isFetching } =
    useMCPQuery<FamilyRecommendationsResponse>(
      "proactive_recommendation",
      "generate_family_recommendations",
      {
        family_id: familyId || undefined,
        recommendation_type: recType || undefined,
        limit,
      },
      {
        enabled: shouldFetch && familyId.trim().length > 0,
        staleTime: 30_000,
      },
    );

  // ── Handlers ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!familyId.trim()) return;
    setShouldFetch(true);
    setExpandedId(null);
  }, [familyId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleGenerate();
    },
    [handleGenerate],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ── Sorted results (score × priority weight) ───────────────────────
  const recommendations = useMemo(() => {
    const raw = data?.recommendations ?? [];
    return [...raw].sort((a, b) => sortWeight(b) - sortWeight(a));
  }, [data]);

  const busy = isLoading || isFetching;

  // ── Summary stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (recommendations.length === 0) return null;

    const urgent = recommendations.filter((r: Recommendation) =>
      isHighPriority(r.priority),
    ).length;

    const avgScore =
      recommendations.reduce(
        (sum: number, r: Recommendation) => sum + r.score,
        0,
      ) / recommendations.length;

    // Domain breakdown from signalSource
    const domainCounts: Record<string, number> = {};
    for (const r of recommendations) {
      const source = getSignalSource(r);
      domainCounts[source] = (domainCounts[source] ?? 0) + 1;
    }
    const domains = Object.entries(domainCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return { total: recommendations.length, urgent, avgScore, domains };
  }, [recommendations]);

  return (
    <div
      className="glass-rfc"
      role="region"
      aria-label="Recomendaciones por familia"
    >
      {/* ── Input form ──────────────────────────────────────────────── */}
      <div className="rfc-form">
        <div className="rfc-form-grid">
          <FormField label="ID de Familia" htmlFor="rfc-family-id">
            <input
              id="rfc-family-id"
              className="rfc-input"
              placeholder="fam-001"
              value={familyId}
              onChange={(e) => {
                setFamilyId(e.target.value);
                setShouldFetch(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </FormField>

          <FormField label="Tipo (opcional)">
            <select
              className="rfc-select"
              value={recType}
              onChange={(e) => {
                setRecType(e.target.value);
                setShouldFetch(false);
              }}
            >
              {REC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Límite" htmlFor="rfc-limit">
            <input
              id="rfc-limit"
              className="rfc-input"
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => {
                setLimit(
                  Math.max(1, Math.min(20, Number(e.target.value))),
                );
                setShouldFetch(false);
              }}
            />
          </FormField>
        </div>

        <div className="rfc-form-actions">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!familyId.trim() || busy}
          >
            {busy ? "Generando..." : "Generar Recomendaciones"}
          </Button>
        </div>
      </div>

      {/* ── Loading skeletons ───────────────────────────────────────── */}
      {busy && shouldFetch && (
        <div className="rfc-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rfc-skeleton"
              style={
                {
                  "--skeleton-delay": `${i * 100}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* ── Empty: no results ───────────────────────────────────────── */}
      {!busy && shouldFetch && recommendations.length === 0 && (
        <div className="rfc-empty-wrap">
          <EmptyState
            icon={<Target size={32} className="rfc-empty-icon" />}
            title="Sin recomendaciones"
            description="No se generaron recomendaciones para los criterios seleccionados."
          />
        </div>
      )}

      {/* ── Empty: no fetch yet ─────────────────────────────────────── */}
      {!shouldFetch && !busy && (
        <div className="rfc-empty-wrap">
          <EmptyState
            icon={<Target size={32} className="rfc-empty-icon" />}
            title="Ingrese un ID de familia"
            description="Complete el campo de ID de familia y presione 'Generar Recomendaciones' para obtener sugerencias personalizadas."
          />
        </div>
      )}

      {/* ── Summary strip ───────────────────────────────────────────── */}
      {!busy && recommendations.length > 0 && stats && (
        <div className="rfc-summary">
          <span className="rfc-summary-count">
            {stats.total} recomendaci
            {stats.total !== 1 ? "ones" : "ón"} generada
            {stats.total !== 1 ? "s" : ""}
          </span>
          <div className="rfc-summary-stats">
            {stats.urgent > 0 && (
              <span className="rfc-summary-stat" data-priority="urgent">
                <Zap size={11} aria-hidden="true" />
                <span>
                  {stats.urgent} urgente{stats.urgent !== 1 ? "s" : ""}
                </span>
              </span>
            )}
            <span className="rfc-summary-stat" data-variant="score">
              Promedio: {Math.round(stats.avgScore)}
            </span>
          </div>
          <div className="rfc-summary-domains">
            {stats.domains.map(({ source, count }) => (
              <span
                key={source}
                className="rfc-domain-dot"
                data-signal-source={source}
                title={`${DOMAIN_LABELS[source] ?? source}: ${count}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Intelligence stream ─────────────────────────────────────── */}
      {!busy && recommendations.length > 0 && (
        <div className="rfc-stream" role="list">
          {recommendations.map((rec, index) => (
            <div key={rec.id} className="rfc-stream-item" role="listitem">
              <RecommendationCard
                recommendation={rec}
                index={index}
                isExpanded={expandedId === rec.id}
                onToggle={() => toggleExpand(rec.id)}
                reducedMotion={prefersReduced}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}