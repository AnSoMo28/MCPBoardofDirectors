// src/features/recommendations/components/FamilyRecommendations.tsx
// Fase 10, B3 — Generación on-demand de recomendaciones por familia

import { useState, useCallback } from "react";
import {
  Target,
  Send,
  Star,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { FilterDropdown } from "@/shared/components/ui/FilterDropdown";

import {
  RecommendationType,
  RECOMMENDATION_TYPE_CONFIG,
  PRIORITY_CONFIG,
  type FamilyRecommendationsResponse,
  type Recommendation,
} from "../types";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
// ── Recommendation type filter options ─────────────────────

const REC_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  ...Object.values(RecommendationType).map((rt) => ({
    value: rt,
    label: RECOMMENDATION_TYPE_CONFIG[rt].label,
  })),
];

// ── Main Component ─────────────────────────────────────────

export function FamilyRecommendations() {
  const prefersReduced = useReducedMotion();

  // ── Form state ──
  const [familyId, setFamilyId] = useState("");
  const [recType, setRecType] = useState("");
  const [limit, setLimit] = useState(5);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Level 2: On-demand query ──
  const { data, isLoading, isFetching } = useMCPQuery<FamilyRecommendationsResponse>(
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

  // ── Handlers ──
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

  const recommendations = data?.recommendations ?? [];
  const busy = isLoading || isFetching;

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Recomendaciones por familia"
    >
      {/* ── Input form ── */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Family ID */}
          <div className="flex-1 min-w-0">
            <label
              htmlFor="rec-family-id"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              ID de Familia
            </label>
            <Input
              id="rec-family-id"
              placeholder="fam-001"
              value={familyId}
              onChange={(e) => {
                setFamilyId(e.target.value);
                setShouldFetch(false);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Type filter */}
          <div className="w-full sm:w-52">
            <label className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5">
              Tipo (opcional)
            </label>
            <FilterDropdown
              label="Tipo"
              options={[{ value: "", label: "Todos los tipos" }, ...REC_TYPE_OPTIONS]}
              value={recType}
              onChange={(v) => {
                setRecType(v);
                setShouldFetch(false);
              }}
            />
          </div>

          {/* Limit */}
          <div className="w-full sm:w-28">
            <label
              htmlFor="rec-limit"
              className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5"
            >
              Límite
            </label>
            <Input
              id="rec-limit"
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => {
                setLimit(Math.max(1, Math.min(20, Number(e.target.value))));
                setShouldFetch(false);
              }}
            />
          </div>
        </div>

        {/* Generate button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            icon={busy ? undefined : <Send className="w-4 h-4" />}
            onClick={handleGenerate}
            disabled={!familyId.trim() || busy}
          >
            {busy
              ? "Generando..."
              : "Generar Recomendaciones"}
          </Button>
        </div>
      </Card>

      {/* ── Loading ── */}
      {busy && shouldFetch && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-24 rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!busy && shouldFetch && recommendations.length === 0 && (
        <EmptyState
          icon={
            <Target className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin recomendaciones"
          description="No se generaron recomendaciones para los criterios seleccionados."
        />
      )}

      {/* ── No fetch yet ── */}
      {!shouldFetch && (
        <EmptyState
          icon={
            <Target className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Ingrese un ID de familia"
          description="Complete el campo de ID de familia y presione 'Generar Recomendaciones' para obtener sugerencias personalizadas."
        />
      )}

      {/* ── Results ── */}
      {!busy && recommendations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-silver-400)]">
            {recommendations.length} recomendaci
            {recommendations.length !== 1 ? "ones" : "ón"} generada
            {recommendations.length !== 1 ? "s" : ""}
          </p>

          {recommendations.map((rec, index) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              index={index}
              isExpanded={expandedId === rec.id}
              onToggle={() => toggleExpand(rec.id)}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recommendation Card ────────────────────────────────────

function RecommendationCard({
  recommendation: rec,
  index,
  isExpanded,
  onToggle,
  prefersReduced,
}: {
  recommendation: Recommendation;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  prefersReduced: boolean;
}) {
  const typeConfig = RECOMMENDATION_TYPE_CONFIG[rec.recommendation_type];
  const priorityConfig = PRIORITY_CONFIG[rec.priority];

  // Score color: <50 rose, 50-75 amber, >75 emerald
  const scoreColor = getScoreColor(rec.score, SCORE_PRESETS.recommendation);

  return (
    <Card
      className={`p-4 ${
        prefersReduced
          ? ""
          : "opacity-0 animate-[fadeUp_0.5s_ease_forwards]"
      }`}
      style={
        prefersReduced
          ? undefined
          : { animationDelay: `${index * 60}ms` }
      }
    >
      {/* Header row — clickable */}
      <Button
        variant="unstyled"
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 text-left
                   focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Type icon */}
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${typeConfig.color} 15%, transparent)`,
            }}
          >
            <Star
              className="w-4 h-4"
              style={{ color: typeConfig.color }}
            />
          </div>

          {/* Title + type + priority */}
          <div className="min-w-0 flex-1">
            <h4 className="font-ui font-semibold text-[var(--color-silver-100)] text-sm leading-tight truncate">
              {rec.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" size="sm">
                {typeConfig.label}
              </Badge>
              <Badge
                variant={priorityConfig.variant}
                size="sm"
              >
                {priorityConfig.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Score + expand icon */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Score gauge */}
          <div className="text-right">
            <p className="text-lg font-mono font-bold" style={{ color: scoreColor }}>
              {Math.round(rec.score)}
            </p>
            <p className="text-[9px] text-[var(--color-silver-500)] uppercase tracking-wider">
              Score
            </p>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
          )}
        </div>
      </Button>

      {/* Score bar */}
      <div className="mt-3">
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-silver-600) 30%, transparent)`,
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, rec.score))}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          className={`mt-4 space-y-3 pt-3 border-t border-white/[0.06] ${
            prefersReduced
              ? ""
              : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
          }`}
        >
          {/* Description */}
          <p className="text-sm text-[var(--color-silver-300)] leading-relaxed">
            {rec.description}
          </p>

          {/* Reasoning */}
          {rec.reasoning && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
              <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-1">
                Razonamiento
              </p>
              <p className="text-sm text-[var(--color-silver-300)]">
                {rec.reasoning}
              </p>
            </div>
          )}

          {/* Tags */}
          {rec.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rec.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                             font-ui bg-[var(--color-surface-1)] border border-white/[0.06]
                             text-[var(--color-silver-400)]"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
