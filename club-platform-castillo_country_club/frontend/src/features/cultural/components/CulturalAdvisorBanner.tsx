/**
 * CulturalAdvisorBanner — F31 (P14 Pattern)
 *
 * Renders cultural advisor insights with:
 * - Health score gauge (left)
 * - Insights list (expandable cards)
 * - Execute action → callback to parent
 * - Deep Analysis → AIInsightNarrative inline (on-demand, Rule #19)
 * - Alerts
 *
 * Architecture:
 *   useCulturalAdvisor(summary, analytics) → insights
 *   CulturalAdvisorBanner(insights) → UI
 *   "Deep Analysis" → useMCPQuery(advisor_intelligence, generate_insight_narrative)
 */

import { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { cn } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useMCPQuery } from '@/shared/hooks/useMCPQuery';

import CulturalHealthScore from './CulturalHealthScore';
import type { CulturalAdvisorInsight } from '../lib/advisor/types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface CulturalAdvisorBannerProps {
  insights: CulturalAdvisorInsight[];
  healthScore?: number;
  healthLevel?: string;
  alerts?: string[];
  onExecute?: (insight: CulturalAdvisorInsight) => void;
}

// ══════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: typeof AlertTriangle; label: string }> = {
  high:   { color: 'var(--color-rose-400)',    bg: 'var(--color-rose-bg)',    icon: AlertTriangle, label: 'Alta' },
  medium: { color: 'var(--color-amber-400)',   bg: 'var(--color-amber-bg)',   icon: TrendingUp,    label: 'Media' },
  low:    { color: 'var(--color-teal-400)',    bg: 'var(--color-teal-bg)',    icon: Lightbulb,     label: 'Oportunidad' },
};

const LAYER_LABELS: Record<string, string> = {
  health:      'Salud Cultural',
  engagement:  'Engagement',
  strategy:    'Estrategia',
  prediction:  'Predicción',
  innovation:  'Innovación',
};

// ══════════════════════════════════════════════════════════
//  INSIGHT CARD (inline sub-component)
// ══════════════════════════════════════════════════════════

function InsightCard({
  insight,
  isExpanded,
  onToggleNarrative,
  onExecute,
}: {
  insight: CulturalAdvisorInsight;
  isExpanded: boolean;
  onToggleNarrative: () => void;
  onExecute?: (insight: CulturalAdvisorInsight) => void;
}) {
  const sev = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.medium;
  const SevIcon = sev.icon;

  // AI Narrative query — only when expanded (Rule #19: on-demand)
  const { data: narrativeRaw, isLoading: narrativeLoading } = useMCPQuery<{
    data: {
      root_cause?: string;
      recommendation?: string;
      benchmark_comparison?: string;
      estimated_impact?: string;
    };
  }>(
    'advisor_intelligence',
    'generate_insight_narrative',
    insight.trigger?.params ?? {},
    { enabled: isExpanded },
  );

  const narrative = narrativeRaw?.data;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        'bg-[var(--color-surface-0)]',
        isExpanded
          ? 'border-[color-mix(in_srgb,var(--color-gold-400)_20%,transparent)]'
          : 'border-[color-mix(in_srgb,var(--color-silver-600)_15%,transparent)]',
      )}
    >
      {/* ── Row: badge + content + action ── */}
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: sev.bg }}
        >
          <SevIcon className="h-3.5 w-3.5" style={{ color: sev.color }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge
              variant={insight.severity === 'high' ? 'error' : insight.severity === 'medium' ? 'warning' : 'info'}
              className="text-[10px]"
            >
              {sev.label}
            </Badge>
            <span className="text-[10px] text-[var(--color-silver-500)]">
              {LAYER_LABELS[insight.layer] ?? insight.layer}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-silver-500)]">
              {insight.confidence}% confianza
            </span>
          </div>

          <h4 className="mb-1 text-sm font-semibold text-[var(--color-silver-100)]">
            {insight.title}
          </h4>

          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-silver-300)]">
            {insight.description}
          </p>

          {/* Action + Deep Analysis buttons */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {insight.action && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[32px] gap-1.5 text-[var(--color-gold-400)] hover:text-[var(--color-gold-300)]"
                onClick={() => onExecute?.(insight)}
              >
                <Zap className="h-3 w-3" />
                {insight.action.label}
              </Button>
            )}

            {insight.trigger && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[32px] gap-1.5 text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]"
                onClick={onToggleNarrative}
              >
                <Sparkles className="h-3 w-3" />
                {isExpanded ? 'Cerrar' : 'Análisis Profundo'}
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Impact score */}
        <div className="flex flex-col items-center">
          <span
            className="font-[family-name:var(--font-mono)] text-lg font-bold"
            style={{ color: sev.color }}
          >
            {insight.impact}
          </span>
          <span className="text-[9px] text-[var(--color-silver-500)]">impacto</span>
        </div>
      </div>

      {/* ── Narrative: full-width, below flex (P14 rule) ── */}
      {isExpanded && (
        <div className="mt-3 rounded-md border border-[color-mix(in_srgb,var(--color-gold-400)_10%,transparent)] bg-[var(--color-surface-1)] p-3">
          {narrativeLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-[var(--color-silver-400)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-gold-400)]" />
              Generando análisis profundo...
            </div>
          ) : narrative ? (
            <div className="space-y-2 text-xs leading-relaxed text-[var(--color-silver-300)]">
              {narrative.root_cause && (
                <p><strong className="text-[var(--color-silver-100)]">Causa raíz:</strong> {narrative.root_cause}</p>
              )}
              {narrative.recommendation && (
                <p><strong className="text-[var(--color-silver-100)]">Recomendación:</strong> {narrative.recommendation}</p>
              )}
              {narrative.benchmark_comparison && (
                <p><strong className="text-[var(--color-silver-100)]">Benchmark CR:</strong> {narrative.benchmark_comparison}</p>
              )}
              {narrative.estimated_impact && (
                <p><strong className="text-[var(--color-silver-100)]">Impacto estimado:</strong> {narrative.estimated_impact}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-silver-500)]">
              No se pudo generar el análisis. Intentá de nuevo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN BANNER
// ══════════════════════════════════════════════════════════

export default function CulturalAdvisorBanner({
  insights,
  healthScore = 0,
  healthLevel = 'unknown',
  alerts = [],
  onExecute,
}: CulturalAdvisorBannerProps) {
  const [expandedNarrative, setExpandedNarrative] = useState<string | null>(null);
  const prefersReduced = useReducedMotion();

  const highCount = useMemo(() => insights.filter((i) => i.severity === 'high').length, [insights]);
  const mediumCount = useMemo(() => insights.filter((i) => i.severity === 'medium').length, [insights]);

  const handleToggleNarrative = useCallback((insightId: string) => {
    setExpandedNarrative((prev) => (prev === insightId ? null : insightId));
  }, []);

  const handleExecute = useCallback(
    (insight: CulturalAdvisorInsight) => {
      if (insight.action?.route) {
        window.location.href = insight.action.route;
        return;
      }
      onExecute?.(insight);
    },
    [onExecute],
  );

  // ── No insights = all clear ──
  if (insights.length === 0) {
    return (
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-[color-mix(in_srgb,var(--color-emerald-400)_15%,transparent)] bg-[var(--color-emerald-bg)] p-4">
        <CulturalHealthScore score={healthScore} level={healthLevel} size="sm" animated={!prefersReduced} />
        <div>
          <p className="text-sm font-semibold text-[var(--color-emerald-400)]">
            Todo en orden — programación cultural saludable
          </p>
          <p className="text-xs text-[var(--color-silver-400)]">
            Health Score: {healthScore}/100 ({healthLevel}). Sin alertas activas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {/* ── Header: Health Score + Summary ── */}
      <div
        className={cn(
          'glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center',
          !prefersReduced && 'animate-in fade-in-0 duration-300',
        )}
      >
        <CulturalHealthScore
          score={healthScore}
          level={healthLevel}
          size="md"
          animated={!prefersReduced}
        />

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-silver-100)]">
            Asesor Cultural — {insights.length} hallazgo(s)
          </h3>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--color-silver-400)]">
            {highCount > 0 && (
              <span className="text-[var(--color-rose-400)]">
                {highCount} prioridad alta
              </span>
            )}
            {mediumCount > 0 && (
              <span className="text-[var(--color-amber-400)]">
                {mediumCount} prioridad media
              </span>
            )}
            <span className="text-[var(--color-teal-400)]">
              {insights.length - highCount - mediumCount} oportunidades
            </span>
          </div>
        </div>

        {/* Generate proposals CTA */}
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[40px] shrink-0 gap-1.5 border border-[color-mix(in_srgb,var(--color-gold-400)_20%,transparent)] text-[var(--color-gold-400)] hover:bg-[color-mix(in_srgb,var(--color-gold-400)_10%,transparent)]"
          onClick={() => {
            onExecute?.({
              id: 'proposals-cta',
              severity: 'low',
              domain: 'cultural',
              layer: 'innovation',
              title: 'Generar propuestas',
              description: '',
              impact: 0,
              confidence: 0,
              action: {
                label: 'Motor de Engagement',
                server: 'cultural_social',
                tool: 'generate_cultural_proposals',
                params: { focus_area: 'all' },
              },
            } as CulturalAdvisorInsight);
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Motor de Engagement
        </Button>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-amber-400)_15%,transparent)] bg-[var(--color-amber-bg)] px-4 py-2.5">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-amber-300)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Insights list ── */}
      <div className="space-y-2">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            isExpanded={expandedNarrative === insight.id}
            onToggleNarrative={() => handleToggleNarrative(insight.id)}
            onExecute={handleExecute}
          />
        ))}
      </div>
    </div>
  );
}
