// src/features/recommendations/components/RecommendationsOverview.tsx
// Fase 10, B1 — Overview con auto-load de datos

import {
  DollarSign,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  UserCheck,
  CheckCircle,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { StatCard } from "@/shared/components/layout/StatCard";
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { formatCurrency } from "@/shared/lib/utils";
import './RecommendationsOverview.css';

import {
  SuggestionStatus,
  SUGGESTION_STATUS_CONFIG,
  INSIGHT_PERIOD_CONFIG,
  type PricingListResponse,
  type SuggestionsListResponse,
  type QuarterlyInsightsListResponse,
} from "../types";

// ── Metric Cell (sub-component local) ──────────────────────

function MetricCell({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="recommendations-overview flex items-center gap-2.5 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
      <div className="shrink-0 text-[var(--color-silver-500)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-ui font-semibold text-[var(--color-silver-100)] truncate">
          {value}
        </p>
        <p className="text-[10px] text-[var(--color-silver-500)] leading-tight">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function RecommendationsOverview() {
  // ── Level 1: Data auto-load ──

  const {
    data: pricingData,
    isLoading: loadingPricing,
  } = useMCPQuery<PricingListResponse>(
    "proactive_recommendation",
    "optimize_pricing",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const {
    data: suggestionsData,
    isLoading: loadingSuggestions,
  } = useMCPQuery<SuggestionsListResponse>(
    "proactive_recommendation",
    "suggest_new_activities",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const {
    data: insightsData,
    isLoading: loadingInsights,
  } = useMCPQuery<QuarterlyInsightsListResponse>(
    "proactive_recommendation",
    "generate_quarterly_insights",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const isLoading = loadingPricing || loadingSuggestions || loadingInsights;

  // ── Derived counts ──

  const pendingPricing =
    pricingData?.pricings?.filter(
      (p) =>
        p.status === SuggestionStatus.Proposed ||
        p.status === SuggestionStatus.UnderReview,
    ).length ?? 0;

  const pendingSuggestions =
    suggestionsData?.suggestions?.filter(
      (s) =>
        s.status === SuggestionStatus.Proposed ||
        s.status === SuggestionStatus.UnderReview,
    ).length ?? 0;

  const latestInsight = insightsData?.insights?.[0];

  // ── Loading ──

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-28 rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
        <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  // ── Render ──

  return (
    <div
      className="space-y-6"
      role="region"
      aria-label="Resumen de recomendaciones proactivas"
    >
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Optimizaciones Pendientes"
          value={String(pendingPricing)}
          icon={
            <DollarSign className="w-5 h-5 text-[var(--color-gold-400)]" />
          }
        />
        <StatCard
          title="Sugerencias Pendientes"
          value={String(pendingSuggestions)}
          icon={
            <Lightbulb className="w-5 h-5 text-[var(--color-amber-400)]" />
          }
        />
        <StatCard
          title="Informes Generados"
          value={String(insightsData?.insights?.length ?? 0)}
          icon={
            <BarChart3 className="w-5 h-5 text-[var(--color-teal-400)]" />
          }
        />
      </div>

      {/* ── Latest Insight ── */}
      {latestInsight ? (
        <Card className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-[var(--color-gold-400)]" />
                <h3 className="font-ui font-semibold text-[var(--color-silver-100)]">
                  Último Informe:{" "}
                  {INSIGHT_PERIOD_CONFIG[latestInsight.period]?.label}{" "}
                  {latestInsight.year}
                </h3>
              </div>
              <p className="text-sm text-[var(--color-silver-400)] line-clamp-2">
                {latestInsight.summary}
              </p>
            </div>
            <Badge
              variant={
                SUGGESTION_STATUS_CONFIG[latestInsight.status]?.variant ??
                "default"
              }
            >
              {SUGGESTION_STATUS_CONFIG[latestInsight.status]?.label ??
                latestInsight.status}
            </Badge>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCell
              value={latestInsight.total_members_active.toLocaleString()}
              label="Socios Activos"
              icon={<Users className="w-4 h-4" />}
            />
            <MetricCell
              value={String(latestInsight.events_held)}
              label="Eventos"
              icon={<CalendarDays className="w-4 h-4" />}
            />
            <MetricCell
              value={latestInsight.avg_event_attendance.toFixed(1)}
              label="Asistencia Prom."
              icon={<UserCheck className="w-4 h-4" />}
            />
            <MetricCell
              value={formatCurrency(latestInsight.revenue_total)}
              label="Revenue"
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          {/* Top Activities */}
          {latestInsight.top_activities.length > 0 && (
            <div>
              <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-2">
                Actividades Destacadas
              </p>
              <div className="flex flex-wrap gap-2">
                {latestInsight.top_activities.slice(0, 3).map((act) => (
                  <span
                    key={act.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-1)] border border-white/[0.06] text-xs text-[var(--color-silver-300)]"
                  >
                    <span className="font-medium text-[var(--color-silver-200)]">
                      {act.name}
                    </span>
                    <span className="text-[var(--color-silver-500)]">
                      · {act.participation}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Achievements */}
          {latestInsight.key_achievements.length > 0 && (
            <div>
              <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-2">
                Logros Clave
              </p>
              <ul className="space-y-1.5">
                {latestInsight.key_achievements
                  .slice(0, 3)
                  .map((achievement, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[var(--color-silver-300)]"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--color-emerald-400)] mt-0.5 shrink-0" />
                      <span>{achievement}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Card>
      ) : (
        <EmptyState
          icon={
            <BarChart3 className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin informes trimestrales"
          description="Genere su primer informe de insights desde la pestaña de Insights."
        />
      )}
    </div>
  );
}
