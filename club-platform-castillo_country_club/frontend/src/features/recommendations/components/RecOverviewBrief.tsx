// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Overview Brief (2027 REWRITE)
//
// Replaces: RecommendationsOverview.tsx (Phase 10, never audited)
// Does NOT replace RecExecutiveBrief (Level B — separate component)
//
// "The Overview" — Auto-load overview that synthesizes data from three
// MCP sources (pricing, suggestions, insights) into a director's
// morning briefing with AI narrative, KPI cards, and latest report.
//
// Paradigm: Auto-load (3 MCP queries simultaneously).
// MCP: optimize_pricing (list), suggest_new_activities (list),
//   generate_quarterly_insights (list).
// Narrative: typed prose from derived data.
// KPI cards: pending pricing, pending suggestions, total reports.
// Latest insight: full display with achievements, activities, metrics.
// Section color-coding: emerald (achievements), amber (improvements).
//
// Glass namespace: .glass-rov
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency } from "@/shared/lib/utils";

import {
  SuggestionStatus,
  SUGGESTION_STATUS_CONFIG,
  INSIGHT_PERIOD_CONFIG,
  type PricingListResponse,
  type SuggestionsListResponse,
  type QuarterlyInsightsListResponse,
} from "../types";

import "./RecOverviewBrief.css";

// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE ENGINE
// ═══════════════════════════════════════════════════════════════════════

interface BriefData {
  pendingPricing: number;
  pendingSuggestions: number;
  totalInsights: number;
  totalPricing: number;
  totalSuggestions: number;
  latestPeriod: string | null;
  latestSatisfaction: number | null;
}

function generateNarrative(d: BriefData): string {
  const parts: string[] = [];

  // Opening
  if (d.pendingPricing === 0 && d.pendingSuggestions === 0) {
    parts.push("Sin acciones pendientes en este momento.");
  } else {
    const actions: string[] = [];
    if (d.pendingPricing > 0) {
      actions.push(
        `${d.pendingPricing} optimización${d.pendingPricing !== 1 ? "es" : ""} de precio pendiente${d.pendingPricing !== 1 ? "s" : ""}`,
      );
    }
    if (d.pendingSuggestions > 0) {
      actions.push(
        `${d.pendingSuggestions} sugerencia${d.pendingSuggestions !== 1 ? "s" : ""} de actividad pendiente${d.pendingSuggestions !== 1 ? "s" : ""}`,
      );
    }
    parts.push(`Se detectan ${actions.join(" y ")} que requieren revisión.`);
  }

  // Insights
  if (d.totalInsights > 0 && d.latestPeriod) {
    parts.push(
      `Último informe disponible: ${d.latestPeriod}.`,
    );
    if (d.latestSatisfaction !== null) {
      const level =
        d.latestSatisfaction >= 4.0
          ? "excelente"
          : d.latestSatisfaction >= 3.0
            ? "satisfactoria"
            : "por debajo de lo esperado";
      parts.push(
        `Satisfacción promedio de socios: ${d.latestSatisfaction.toFixed(1)}/5 — ${level}.`,
      );
    }
  } else {
    parts.push("Aún no se han generado informes trimestrales.");
  }

  // Recommendation
  if (d.pendingPricing > 0 || d.pendingSuggestions > 0) {
    parts.push("Se recomienda revisar las acciones pendientes.");
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════════════════
// TYPING EFFECT (respects reduced motion)
// ═══════════════════════════════════════════════════════════════════════

function useTypingEffect(
  text: string,
  speed: number,
  reducedMotion: boolean,
): string {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, reducedMotion]);

  return displayed;
}

// ═══════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════

function KpiCard({
  title,
  value,
  icon,
  kpiType,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  kpiType: string;
}) {
  return (
    <div className="rov-kpi" data-kpi-type={kpiType}>
      <div className="rov-kpi-icon">{icon}</div>
      <div className="rov-kpi-content">
        <span className="rov-kpi-value">{value}</span>
        <span className="rov-kpi-title">{title}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INSIGHT DETAIL CARD
// ═══════════════════════════════════════════════════════════════════════

function InsightCard({
  insight,
  reducedMotion,
}: {
  insight: NonNullable<QuarterlyInsightsListResponse["insights"]>[number];
  reducedMotion: boolean;
}) {
  const periodCfg = (INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[insight.period];
  const statusCfg = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[insight.status];

  const maxParticipation = useMemo(
    () =>
      Math.max(
        ...insight.top_activities.map((a: { participation: number }) => a.participation),
        1,
      ),
    [insight.top_activities],
  );

  return (
    <div className="rov-insight" data-status={insight.status}>
      {/* Header */}
      <div className="rov-insight-header">
        <div className="rov-insight-header-left">
          <div className="rov-insight-icon">
            <TrendingUp size={16} aria-hidden="true" />
          </div>
          <div>
            <h3 className="rov-insight-title">
              Informe {periodCfg?.label} {insight.year}
            </h3>
            <span className="rov-insight-subtitle">
              Generado el{" "}
              {new Date(insight.created_at).toLocaleDateString("es-CR")}
            </span>
          </div>
        </div>
        <span
          className="rov-badge rov-badge--status"
          data-status={insight.status}
        >
          {statusCfg?.label ?? insight.status}
        </span>
      </div>

      {/* Summary */}
      <p className="rov-insight-summary">{insight.summary}</p>

      {/* Metrics */}
      <div className="rov-insight-metrics">
        <div className="rov-metric" data-metric-type="members">
          <div className="rov-metric-icon">
            <Users size={14} aria-hidden="true" />
          </div>
          <div className="rov-metric-content">
            <span className="rov-metric-value">
              {insight.total_members_active.toLocaleString()}
            </span>
            <span className="rov-metric-label">Socios Activos</span>
          </div>
        </div>
        <div className="rov-metric" data-metric-type="events">
          <div className="rov-metric-icon">
            <CalendarDays size={14} aria-hidden="true" />
          </div>
          <div className="rov-metric-content">
            <span className="rov-metric-value">
              {insight.events_held}
            </span>
            <span className="rov-metric-label">Eventos</span>
          </div>
        </div>
        <div className="rov-metric" data-metric-type="attendance">
          <div className="rov-metric-icon">
            <UserCheck size={14} aria-hidden="true" />
          </div>
          <div className="rov-metric-content">
            <span className="rov-metric-value">
              {insight.avg_event_attendance.toFixed(1)}
            </span>
            <span className="rov-metric-label">Asistencia Prom.</span>
          </div>
        </div>
        <div className="rov-metric" data-metric-type="revenue">
          <div className="rov-metric-icon">
            <DollarSign size={14} aria-hidden="true" />
          </div>
          <div className="rov-metric-content">
            <span className="rov-metric-value">
              {formatCurrency(insight.revenue_total)}
            </span>
            <span className="rov-metric-label">Revenue</span>
          </div>
        </div>
      </div>

      {/* Top Activities */}
      {insight.top_activities.length > 0 && (
        <div className="rov-insight-section">
          <span className="rov-insight-section-title">
            Actividades Destacadas
          </span>
          <div className="rov-activities-chart">
            {insight.top_activities.slice(0, 4).map(
              (
                activity: { name: string; participation: number },
                i: number,
              ) => (
                <div
                  key={activity.name}
                  className="rov-activity-row"
                  style={
                    {
                      "--stagger-i": i,
                      "--bar-pct": `${(activity.participation / maxParticipation) * 100}%`,
                      "--bar-delay": reducedMotion
                        ? "0ms"
                        : `${i * 80 + 400}ms`,
                    } as React.CSSProperties
                  }
                >
                  <span className="rov-activity-rank">{i + 1}</span>
                  <span className="rov-activity-name">
                    {activity.name}
                  </span>
                  <div className="rov-activity-track">
                    <div className="rov-activity-fill" />
                  </div>
                  <span className="rov-activity-val">
                    {activity.participation}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Key Achievements */}
      {insight.key_achievements.length > 0 && (
        <div className="rov-insight-section">
          <span className="rov-insight-section-title">
            Logros Clave
          </span>
          <ul className="rov-achievements-list">
            {insight.key_achievements
              .slice(0, 3)
              .map((achievement: string, i: number) => (
                <li
                  key={i}
                  className="rov-achievement-item"
                  style={
                    {
                      "--stagger-i": i,
                    } as React.CSSProperties
                  }
                >
                  <CheckCircle size={12} aria-hidden="true" />
                  <span>{achievement}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Areas for Improvement */}
      {insight.areas_for_improvement.length > 0 && (
        <div className="rov-insight-section">
          <span className="rov-insight-section-title">
            Áreas de Mejora
          </span>
          <ul className="rov-improvements-list">
            {insight.areas_for_improvement
              .slice(0, 3)
              .map((item: string, i: number) => (
                <li
                  key={i}
                  className="rov-improvement-item"
                  style={
                    {
                      "--stagger-i": i,
                    } as React.CSSProperties
                  }
                >
                  <AlertTriangle size={12} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecommendationsOverview() {
  const prefersReduced = useReducedMotion();

  // ── Auto-load all three sources ────────────────────────────────────
  const { data: pricingData, isLoading: loadingPricing } =
    useMCPQuery<PricingListResponse>(
      "proactive_recommendation",
      "optimize_pricing",
      { action: "list" },
      { staleTime: 60_000 },
    );

  const { data: suggestionsData, isLoading: loadingSuggestions } =
    useMCPQuery<SuggestionsListResponse>(
      "proactive_recommendation",
      "suggest_new_activities",
      { action: "list" },
      { staleTime: 60_000 },
    );

  const { data: insightsData, isLoading: loadingInsights } =
    useMCPQuery<QuarterlyInsightsListResponse>(
      "proactive_recommendation",
      "generate_quarterly_insights",
      { action: "list" },
      { staleTime: 60_000 },
    );

  const isLoading = loadingPricing || loadingSuggestions || loadingInsights;

  // ── Derived data ───────────────────────────────────────────────────
  const pricings = pricingData?.pricings ?? [];
  const suggestions = suggestionsData?.suggestions ?? [];
  const insights = insightsData?.insights ?? [];

  const pendingPricing = pricings.filter(
    (p) =>
      p.status === SuggestionStatus.Proposed ||
      p.status === SuggestionStatus.UnderReview,
  ).length;

  const pendingSuggestions = suggestions.filter(
    (s) =>
      s.status === SuggestionStatus.Proposed ||
      s.status === SuggestionStatus.UnderReview,
  ).length;

  const latestInsight = insights.length > 0 ? insights[0] : null;

  // ── Narrative ──────────────────────────────────────────────────────
  const briefData: BriefData = useMemo(
    () => ({
      pendingPricing,
      pendingSuggestions,
      totalInsights: insights.length,
      totalPricing: pricings.length,
      totalSuggestions: suggestions.length,
      latestPeriod: latestInsight
        ? `${(INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[latestInsight.period]?.label} ${latestInsight.year}`
        : null,
      latestSatisfaction: latestInsight?.member_satisfaction_avg ?? null,
    }),
    [
      pendingPricing,
      pendingSuggestions,
      insights.length,
      pricings.length,
      suggestions.length,
      latestInsight,
    ],
  );

  const narrativeText = useMemo(
    () => generateNarrative(briefData),
    [briefData],
  );

  const displayedNarrative = useTypingEffect(
    narrativeText,
    25,
    prefersReduced,
  );

  const hasContent = pricings.length > 0 || suggestions.length > 0 || insights.length > 0;

  // ── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-rov">
        <div className="rov-loading">
          <div className="rov-skeleton rov-skeleton--narrative" />
          <div className="rov-skeleton-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rov-skeleton rov-skeleton--kpi"
                style={
                  {
                    "--skeleton-delay": `${i * 100}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="rov-skeleton rov-skeleton--insight" />
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────
  if (!hasContent) {
    return (
      <div className="glass-rov" role="region" aria-label="Resumen ejecutivo">
        <div className="rov-empty-wrap">
          <div className="rov-empty-icon-wrap">
            <FileText size={40} aria-hidden="true" />
          </div>
          <h3 className="rov-empty-title">Sin datos disponibles</h3>
          <p className="rov-empty-desc">
            Genere optimizaciones de precio, sugerencias de actividades o
            informes trimestrales para ver el resumen ejecutivo.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      className="glass-rov"
      role="region"
      aria-label="Resumen ejecutivo de recomendaciones"
    >
      {/* ── AI Narrative ────────────────────────────────────────────── */}
      <div className="rov-narrative">
        <div className="rov-narrative-header">
          <div className="rov-narrative-icon">
            <Sparkles size={14} aria-hidden="true" />
          </div>
          <span className="rov-narrative-label">Resumen Ejecutivo</span>
        </div>
        <p className="rov-narrative-text">
          {displayedNarrative}
          {!prefersReduced && displayedNarrative.length < narrativeText.length && (
            <span className="rov-cursor" aria-hidden="true" />
          )}
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="rov-kpis">
        <KpiCard
          kpiType="pricing"
          title="Optimizaciones Pendientes"
          value={String(pendingPricing)}
          icon={<DollarSign size={16} aria-hidden="true" />}
        />
        <KpiCard
          kpiType="suggestions"
          title="Sugerencias Pendientes"
          value={String(pendingSuggestions)}
          icon={<Lightbulb size={16} aria-hidden="true" />}
        />
        <KpiCard
          kpiType="insights"
          title="Informes Generados"
          value={String(insights.length)}
          icon={<BarChart3 size={16} aria-hidden="true" />}
        />
      </div>

      {/* ── Latest Insight ──────────────────────────────────────────── */}
      {latestInsight && (
        <InsightCard
          insight={latestInsight}
          reducedMotion={prefersReduced}
        />
      )}
    </div>
  );
}