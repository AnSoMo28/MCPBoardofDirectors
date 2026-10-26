// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestAnalytics.tsx
// Phase 34 "The Gateway" — Guest Analytics Dashboard (Rewrite)
// Level 6+ Agency · Production Grade
//
// Intelligence dashboard with:
//   - KPI summary cards
//   - Quick deterministic insights
//   - AI insights (on-demand)
//   - Recharts: privileges, weekly, events, trials
//   - Top host families
//
// Original: framer-motion + cn() + Tailwind + inline colors
//   → CSS animations + BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestAnalyticsResponse { analytics(GuestAnalyticsData) }
//   GuestAnalyticsData { total_guests, guests_by_status,
//     guests_by_privilege, events_by_type, guests_by_day_of_week,
//     total_private_events, upcoming_events, active_trials,
//     trial_conversion_rate, avg_event_budget, avg_guests_per_event,
//     top_host_families, trials_expiring_soon, trials_by_status }    ← ../types ✅
//   GuestInsightsResponse { insights(GuestManagementInsight[]),
//     summary(string) }                                              ← ../types ✅
//   GuestManagementInsight { id, title, description, category,
//     priority, confidence(number), recommendation,
//     action_label?, metric? }                                       ← ../types ✅
//
// ANTI-PATTERNS REMOVED: framer-motion, cn(), Tailwind,
//   inline color styles, useReducedMotion, useBreakpoint for layout
// FIX: EmptyState action passed as object → ReactNode
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from "recharts";

import {
  Users, Calendar, TrendingUp, Award, AlertTriangle,
  Brain, RefreshCw, CheckCircle2, Lightbulb, Zap, ArrowRight,
  Clock, Shield, Target, PartyPopper, Sparkles,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { CardHeader, Button, Skeleton } from "@/shared/components/ui";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { formatNumber, formatCurrency } from "@/shared/lib/utils";

import {
  CHART, TOOLTIP_STYLE, AXIS_TICK, CHART_PALETTE,
} from "@/shared/lib/chartTheme";

import type {
  GuestAnalyticsResponse,
  GuestAnalyticsData,
  GuestInsightsResponse,
  GuestManagementInsight,
} from "../types";

import {
  PRIVILEGE_CONFIG,
  PRIVATE_EVENT_TYPE_CONFIG,
  TRIAL_STATUS_CONFIG_BACKEND,
  GUEST_INSIGHT_CATEGORY_CONFIG,
  GUEST_INSIGHT_PRIORITY_CONFIG,
} from "../types";

import "./GuestAnalytics.css";

// ═══════════════════════════════════════════════════════════
// §1 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const PRIVILEGE_HEX: Record<string, string> = {
  pool: CHART_PALETTE.teal,
  gym: CHART_PALETTE.emerald,
  dining: CHART_PALETTE.gold,
  tennis: CHART_PALETTE.terracotta,
  golf: CHART_PALETTE.sage,
  spa: CHART_PALETTE.rose,
  kids_area: CHART_PALETTE.silver,
  social_events: CHART_PALETTE.amber,
};

const EVENT_TYPE_HEX: Record<string, string> = {
  wedding: CHART_PALETTE.rose,
  baptism: CHART_PALETTE.teal,
  birthday: CHART_PALETTE.gold,
  anniversary: CHART_PALETTE.silver,
  corporate: CHART_PALETTE.emerald,
  quinceanera: CHART_PALETTE.gold,
  other: CHART_PALETTE.silver,
};

const TRIAL_STATUS_HEX: Record<string, string> = {
  pending_approval: CHART_PALETTE.amber,
  approved: CHART_PALETTE.teal,
  active: CHART_PALETTE.emerald,
  expired: CHART_PALETTE.silver,
  converted: CHART_PALETTE.gold,
  cancelled: CHART_PALETTE.rose,
};

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  conversion: Target,
  event: PartyPopper,
  privilege: Shield,
  frequency: Clock,
  risk: AlertTriangle,
  opportunity: Lightbulb,
};

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

interface QuickInsight {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly color: string;
  readonly title: string;
  readonly value: string;
}

function computeQuickInsights(data: GuestAnalyticsData): readonly QuickInsight[] {
  const insights: QuickInsight[] = [];

  if (data.top_host_families.length > 0) {
    const top = data.top_host_families[0];
    insights.push({
      id: "top-host",
      icon: Award,
      color: "var(--gst-analytics-gold)",
      title: "Familia anfitriona top",
      value: `${top.family_name} (${top.guest_count} invitados)`,
    });
  }

  if (data.events_by_type.length > 0) {
    const topEvent = [...data.events_by_type].sort((a, b) => b.count - a.count)[0];
    if (topEvent.count > 0) {
      insights.push({
        id: "top-event",
        icon: PartyPopper,
        color: "var(--gst-analytics-rose)",
        title: "Evento más solicitado",
        value: `${PRIVATE_EVENT_TYPE_CONFIG[topEvent.type as keyof typeof PRIVATE_EVENT_TYPE_CONFIG]?.label ?? topEvent.type} (${topEvent.count})`,
      });
    }
  }

  if (data.guests_by_day_of_week.length > 0) {
    const peak = [...data.guests_by_day_of_week].sort((a, b) => b.count - a.count)[0];
    insights.push({
      id: "peak-day",
      icon: Calendar,
      color: "var(--gst-analytics-teal)",
      title: "Día pico de visitas",
      value: `${peak.day} (${peak.count} invitados)`,
    });
  }

  if (data.guests_by_privilege.length > 0) {
    const topPriv = [...data.guests_by_privilege].sort((a, b) => b.count - a.count)[0];
    insights.push({
      id: "top-privilege",
      icon: Shield,
      color: "var(--gst-analytics-emerald)",
      title: "Privilegio más usado",
      value: `${PRIVILEGE_CONFIG[topPriv.privilege as keyof typeof PRIVILEGE_CONFIG]?.label ?? topPriv.privilege} (${topPriv.count})`,
    });
  }

  if (data.trials_expiring_soon > 0) {
    insights.push({
      id: "trials-expiring",
      icon: AlertTriangle,
      color: "var(--gst-analytics-amber)",
      title: "Trials por expirar",
      value: `${data.trials_expiring_soon} en los próximos 3 días`,
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════
// §3 — AI INSIGHT CARD
// ═══════════════════════════════════════════════════════════

function GuestInsightCard({
  insight,
  index,
}: {
  readonly insight: GuestManagementInsight;
  readonly index: number;
}) {
  const catCfg = GUEST_INSIGHT_CATEGORY_CONFIG[insight.category]
    ?? GUEST_INSIGHT_CATEGORY_CONFIG.opportunity;
  const priCfg = GUEST_INSIGHT_PRIORITY_CONFIG[insight.priority]
    ?? GUEST_INSIGHT_PRIORITY_CONFIG.medium;
  const Icon = CATEGORY_ICON_MAP[insight.category] ?? Zap;

  return (
    <div
      className="gst-analytics__insight-card"
      data-category={insight.category}
      data-priority={insight.priority}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="gst-analytics__insight-accent" data-priority={insight.priority} />

      <div className="gst-analytics__insight-content">
        <div className="gst-analytics__insight-header">
          <div className="gst-analytics__insight-cat" data-category={insight.category}>
            <Icon className="gst-analytics__insight-cat-icon" />
            <span className="gst-analytics__insight-cat-label">{catCfg.label}</span>
          </div>
          <span className="gst-analytics__insight-pri" data-priority={insight.priority}>
            {priCfg.label}
          </span>
        </div>

        <h4 className="gst-analytics__insight-title">{insight.title}</h4>
        <p className="gst-analytics__insight-desc">{insight.description}</p>

        {insight.metric && (
          <div className="gst-analytics__insight-metric">
            <p className="gst-analytics__insight-metric-text">{insight.metric}</p>
          </div>
        )}

        <div className="gst-analytics__insight-confidence">
          <div className="gst-analytics__confidence-header">
            <span className="gst-analytics__confidence-label">Confianza</span>
            <span className="gst-analytics__confidence-value">{insight.confidence}%</span>
          </div>
          <div className="gst-analytics__confidence-track">
            <div
              className="gst-analytics__confidence-fill"
              data-category={insight.category}
              style={{ "--fill-width": `${insight.confidence}%` } as React.CSSProperties}
            />
          </div>
        </div>

        <p className="gst-analytics__insight-recommendation">
          {insight.recommendation}
        </p>

        {insight.action_label && (
          <div className="gst-analytics__insight-action">
            <Button
              variant="ghost"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {insight.action_label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4 — AI INSIGHTS SECTION
// ═══════════════════════════════════════════════════════════

function AIInsightsSection() {
  const [shouldFetch, setShouldFetch] = useState(false);

  const insightsQ = useMCPQuery<GuestInsightsResponse>(
    "guest_management",
    "guest_management_insights",
    {},
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const insights = insightsQ.data?.insights ?? [];
  const summary = insightsQ.data?.summary;

  const sorted = useMemo(
    () =>
      [...insights].sort(
        (a, b) =>
          (GUEST_INSIGHT_PRIORITY_CONFIG[a.priority]?.sortOrder ?? 99) -
          (GUEST_INSIGHT_PRIORITY_CONFIG[b.priority]?.sortOrder ?? 99),
      ),
    [insights],
  );

  // ── Pre-fetch state ──
  if (!shouldFetch) {
    return (
      <div className="gst-analytics__ai-promo">
        <div className="gst-analytics__ai-promo-gradient" />
        <div className="gst-analytics__ai-promo-content">
          <div className="gst-analytics__ai-promo-info">
            <div className="gst-analytics__ai-promo-icon-wrap">
              <Brain className="gst-analytics__ai-promo-icon" />
            </div>
            <div>
              <h3 className="gst-analytics__ai-promo-title">
                Análisis Inteligente de Invitados
              </h3>
              <p className="gst-analytics__ai-promo-sub">
                Motor de AI · Datos de invitados, eventos y trials
              </p>
            </div>
          </div>
          <p className="gst-analytics__ai-promo-desc">
            Analizamos el comportamiento de invitados, conversión de trials y rendimiento
            de eventos para generar recomendaciones accionables.
          </p>
          <div className="gst-analytics__ai-promo-features">
            {["Conversión de trials", "Oportunidades de eventos", "Alertas de expiración", "Patrones de visita"].map(
              (item) => (
                <div key={item} className="gst-analytics__ai-feature">
                  <CheckCircle2 className="gst-analytics__ai-feature-icon" />
                  <span>{item}</span>
                </div>
              ),
            )}
          </div>
          <Button
            variant="primary"
            onClick={() => setShouldFetch(true)}
            icon={<Brain className="w-4 h-4" />}
          >
            Generar Análisis Guest AI
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (insightsQ.isLoading) {
    return (
      <div className="gst-analytics__ai-loading">
        <div className="gst-analytics__ai-loading-header">
          <Brain className="gst-analytics__ai-loading-icon" />
          <p className="gst-analytics__ai-loading-text">
            Analizando invitados, eventos y trials...
          </p>
        </div>
        <div className="gst-analytics__ai-loading-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skel-insight-${i}`} className="gst-analytics__skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (insightsQ.isError) {
    return (
      <div className="gst-analytics__ai-error">
        <EmptyState
          title="Error al generar análisis"
          description="No pudimos completar el análisis. Intentá de nuevo."
          icon={<AlertTriangle className="w-8 h-8" />}
          action={
            <Button
              variant="primary"
              onClick={() => {
                setShouldFetch(false);
                setTimeout(() => setShouldFetch(true), 100);
              }}
            >
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const highCount = sorted.filter((i) => i.priority === "high").length;

  return (
    <div className="gst-analytics__ai-results">
      <div className="gst-analytics__ai-results-header">
        <div className="gst-analytics__ai-results-title-wrap">
          <Brain className="gst-analytics__ai-results-icon" />
          <div>
            <h3 className="gst-analytics__ai-results-title">Análisis AI Completado</h3>
            <p className="gst-analytics__ai-results-sub">
              {sorted.length} insights · {highCount} alertas de alta prioridad
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setShouldFetch(false);
            setTimeout(() => setShouldFetch(true), 100);
          }}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Regenerar
        </Button>
      </div>

      {summary && (
        <div className="gst-analytics__ai-summary">
          <p className="gst-analytics__ai-summary-text">{summary}</p>
        </div>
      )}

      <div className="gst-analytics__insights-grid">
        {sorted.map((insight, idx) => (
          <GuestInsightCard key={insight.id} insight={insight} index={idx} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Analytics — intelligence dashboard.
 * KPIs, quick insights, AI analysis, and interactive charts.
 *
 * @example
 * <GuestAnalytics />
 */
export default function GuestAnalytics() {
  const { isMobile } = useBreakpoint();

  const analyticsQ = useMCPQuery<GuestAnalyticsResponse>(
    "guest_management",
    "get_guest_analytics",
    {},
    { staleTime: 120_000 },
  );

  const analytics = analyticsQ.data?.analytics;

  const quickInsights = useMemo(
    () => (analytics ? computeQuickInsights(analytics) : []),
    [analytics],
  );

  const privilegeChartData = useMemo(
    () =>
      (analytics?.guests_by_privilege ?? []).map((p) => ({
        name: PRIVILEGE_CONFIG[p.privilege as keyof typeof PRIVILEGE_CONFIG]?.label ?? p.privilege,
        count: p.count,
        fill: PRIVILEGE_HEX[p.privilege] ?? CHART_PALETTE.silver,
      })),
    [analytics],
  );

  const eventTypeChartData = useMemo(
    () =>
      (analytics?.events_by_type ?? [])
        .filter((e) => e.count > 0)
        .map((e) => ({
          name: PRIVATE_EVENT_TYPE_CONFIG[e.type as keyof typeof PRIVATE_EVENT_TYPE_CONFIG]?.label ?? e.type,
          count: e.count,
          fill: EVENT_TYPE_HEX[e.type] ?? CHART_PALETTE.silver,
        })),
    [analytics],
  );

  const weeklyData = useMemo(
    () =>
      (analytics?.guests_by_day_of_week ?? []).map((d) => ({
        name: d.day.slice(0, 3),
        count: d.count,
      })),
    [analytics],
  );

  const trialStatusData = useMemo(
    () =>
      (analytics?.trials_by_status ?? [])
        .filter((t) => t.count > 0)
        .map((t) => ({
          name: TRIAL_STATUS_CONFIG_BACKEND[t.status as keyof typeof TRIAL_STATUS_CONFIG_BACKEND]?.label ?? t.status,
          count: t.count,
          fill: TRIAL_STATUS_HEX[t.status] ?? CHART_PALETTE.silver,
        })),
    [analytics],
  );

  // ── Loading ──
  if (analyticsQ.isLoading) {
    return (
      <div className="gst-analytics" data-state="loading" role="region" aria-label="Analytics de invitados" data-testid="guest-analytics">
        <div className="gst-analytics__loading-kpis">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`skel-kpi-${i}`} className="gst-analytics__skeleton-kpi" />
          ))}
        </div>
        <Skeleton className="gst-analytics__skeleton-ai" />
        <div className="gst-analytics__loading-charts">
          <Skeleton className="gst-analytics__skeleton-chart" />
          <Skeleton className="gst-analytics__skeleton-chart" />
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!analytics || analytics.total_guests === 0) {
    return (
      <div className="gst-analytics" data-state="empty" role="region" aria-label="Analytics de invitados" data-testid="guest-analytics">
        <EmptyState
          title="Sin datos de invitados"
          description="Registrá tu primer invitado o evento privado para comenzar a ver analytics."
          icon={<Users className="w-8 h-8" />}
        />
      </div>
    );
  }

  const kpis = [
    { kpi: "total", label: "Total Invitados", value: formatNumber(analytics.total_guests), sub: `${analytics.guests_by_status.checked_in ?? 0} presentes`, Icon: Users },
    { kpi: "events", label: "Eventos Privados", value: analytics.total_private_events.toString(), sub: `${analytics.upcoming_events} próximos`, Icon: PartyPopper },
    { kpi: "trials", label: "Trials Activos", value: analytics.active_trials.toString(), sub: `${analytics.trial_conversion_rate}% conversión`, Icon: Sparkles },
    { kpi: "budget", label: "Budget Prom. Evento", value: formatCurrency(analytics.avg_event_budget), sub: `${analytics.avg_guests_per_event} invitados prom.`, Icon: TrendingUp },
  ];

  return (
    <div
      className="gst-analytics"
      data-state="data"
      role="region"
      aria-label="Analytics de invitados"
      data-testid="guest-analytics"
    >
      {/* ── KPI Row ── */}
      <div className="gst-analytics__kpis" data-count="4">
        {kpis.map((kpi) => (
          <div key={kpi.kpi} className="gst-analytics__kpi" data-kpi={kpi.kpi}>
            <div className="gst-analytics__kpi-icon-wrap" data-kpi={kpi.kpi}>
              <kpi.Icon className="gst-analytics__kpi-icon" />
            </div>
            <p className="gst-analytics__kpi-label">{kpi.label}</p>
            <p className="gst-analytics__kpi-value">{kpi.value}</p>
            <p className="gst-analytics__kpi-sub">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Insights ── */}
      {quickInsights.length > 0 && (
        <div className="gst-analytics__quick-insights">
          {quickInsights.map((qi) => {
            const QiIcon = qi.icon;
            return (
              <div key={qi.id} className="gst-analytics__quick-insight" data-insight={qi.id}>
                <QiIcon className="gst-analytics__quick-icon" style={{ color: qi.color } as React.CSSProperties} />
                <div className="gst-analytics__quick-info">
                  <p className="gst-analytics__quick-title">{qi.title}</p>
                  <p className="gst-analytics__quick-value">{qi.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="gst-analytics__divider" />

      {/* ── AI Insights ── */}
      <AIInsightsSection />

      {/* ── Divider ── */}
      <div className="gst-analytics__divider" />

      {/* ── Charts ── */}
      <div className="gst-analytics__charts">
        {/* Privileges */}
        {privilegeChartData.length > 0 && (
          <div className="gst-analytics__chart-card">
            <CardHeader>
              <h3 className="gst-analytics__chart-title">Invitados por Privilegio</h3>
              <p className="gst-analytics__chart-sub">Acceso a instalaciones</p>
            </CardHeader>
            <div className="gst-analytics__chart-container" data-height={isMobile ? "small" : "medium"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={privilegeChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.gridStroke} horizontal={false} />
                  <XAxis type="number" {...AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" {...AXIS_TICK} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {privilegeChartData.map((entry, idx) => (
                      <Cell key={`priv-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Weekly pattern */}
        {weeklyData.length > 0 && (
          <div className="gst-analytics__chart-card">
            <CardHeader>
              <h3 className="gst-analytics__chart-title">Visitas por Día</h3>
              <p className="gst-analytics__chart-sub">Patrón semanal</p>
            </CardHeader>
            <div className="gst-analytics__chart-container" data-height={isMobile ? "small" : "medium"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.gridStroke} />
                  <XAxis dataKey="name" {...AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis {...AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 32 : 48}>
                    {weeklyData.map((entry, idx) => {
                      const max = Math.max(...weeklyData.map((d) => d.count), 1);
                      return (
                        <Cell
                          key={`day-${idx}`}
                          fill={entry.count === max ? CHART_PALETTE.gold : CHART_PALETTE.teal}
                          opacity={entry.count === max ? 1 : 0.5}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Events by type */}
        {eventTypeChartData.length > 0 && (
          <div className="gst-analytics__chart-card">
            <CardHeader>
              <h3 className="gst-analytics__chart-title">Eventos por Tipo</h3>
              <p className="gst-analytics__chart-sub">Distribución de eventos privados</p>
            </CardHeader>
            <div className="gst-analytics__chart-container" data-height={isMobile ? "small" : "medium"}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTypeChartData} margin={{ bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.gridStroke} />
                  <XAxis dataKey="name" {...AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis {...AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={isMobile ? 32 : 48}>
                    {eventTypeChartData.map((entry, idx) => (
                      <Cell key={`evt-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Trial status */}
        {trialStatusData.length > 0 && (
          <div className="gst-analytics__chart-card">
            <CardHeader>
              <h3 className="gst-analytics__chart-title">Trials por Estado</h3>
              <p className="gst-analytics__chart-sub">Distribución de membresías de prueba</p>
            </CardHeader>
            <div className="gst-analytics__trial-bars">
              {trialStatusData.map((t) => {
                const maxCount = Math.max(...trialStatusData.map((d) => d.count), 1);
                return (
                  <div key={t.name} className="gst-analytics__trial-bar">
                    <span className="gst-analytics__trial-bar-label">{t.name}</span>
                    <div className="gst-analytics__trial-bar-track">
                      <div
                        className="gst-analytics__trial-bar-fill"
                        style={{
                          backgroundColor: t.fill,
                          "--fill-width": `${(t.count / maxCount) * 100}%`,
                        } as React.CSSProperties}
                      />
                    </div>
                    <span className="gst-analytics__trial-bar-count">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Top Host Families ── */}
      {analytics.top_host_families.length > 0 && (
        <div className="gst-analytics__families">
          <CardHeader>
            <h3 className="gst-analytics__chart-title">Familias Anfitrionas Top</h3>
            <p className="gst-analytics__chart-sub">Por número de invitados registrados</p>
          </CardHeader>
          <div className="gst-analytics__family-list">
            {analytics.top_host_families.map((fam, idx) => {
              const maxCount = analytics.top_host_families[0]?.guest_count ?? 1;
              return (
                <div key={fam.family_id} className="gst-analytics__family-row">
                  <span className="gst-analytics__family-rank">{idx + 1}</span>
                  <span className="gst-analytics__family-name">{fam.family_name}</span>
                  <div className="gst-analytics__family-track">
                    <div
                      className="gst-analytics__family-fill"
                      data-rank={idx === 0 ? "top" : "other"}
                      style={{
                        "--fill-width": `${(fam.guest_count / maxCount) * 100}%`,
                        "--fill-opacity": idx === 0 ? "1" : `${0.5 + 0.5 * (1 - idx / analytics.top_host_families.length)}`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <span className="gst-analytics__family-count">{fam.guest_count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}