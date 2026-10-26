// src/features/communications/components/CommunicationOverview.tsx
// ═══════════════════════════════════════════════════════════
// Communication Intelligence Overview — V2 Rewrite
// Castillo Country Club — Phase 31 "The Voice"
//
// Global view of communication health. NOT per-member.
// Health Score · Pulse KPIs · Channel Health · Timeline ·
// Pipeline · Satisfaction Correlation · AI Insights
//
// V2: Glass-ified. Zero framer-motion, zero Tailwind,
// zero shared UI. Data-attributes only.
//
// Imports VERIFIED against types.ts:
//   CommunicationAnalyticsData ✅  CommunicationAnalyticsResponse ✅
//   HistoryItem ✅  HistoryResponse ✅
//   ScheduledItem ✅  ScheduledListResponse ✅
//   SatisfactionTrendsResponse ✅  SatisfactionTrendsData ✅
//   CommunicationInsightsResponse ✅  CommunicationIntelligenceInsight ✅
//   calculateCommunicationHealth ✅  formatCommunicationDate ✅
//   INSIGHT_CATEGORY_CONFIG ✅  INSIGHT_PRIORITY_CONFIG ✅
//   useCommunicationAdvisor ✅
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";

import {
  Send, TrendingUp, TrendingDown, CalendarDays, Clock,
  CalendarClock, Megaphone, BarChart3, Package, RefreshCw,
  Heart, AlertTriangle, Lightbulb, Radio, Zap,
  ArrowRight, FileText, Smartphone, Phone, MessageSquare, Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

import type {
  CommunicationAnalyticsData,
  CommunicationAnalyticsResponse,
  HistoryItem,
  HistoryResponse,
  ScheduledItem,
  ScheduledListResponse,
  SatisfactionTrendsResponse,
  SatisfactionTrendsData,
  CommunicationInsightsResponse,
  CommunicationIntelligenceInsight
} from "../types";

import {
  calculateCommunicationHealth,
  formatCommunicationDate,
  INSIGHT_PRIORITY_CONFIG,
} from "../types";

import { useCommunicationAdvisor } from "../hooks/useCommunicationAdvisor";
import { CommunicationAdvisorBanner } from "./CommunicationAdvisorBanner";

import "./CommunicationOverview.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const CHANNEL_ICON_MAP: Record<string, LucideIcon> = {
  email: FileText,
  push: Zap,
  sms: Smartphone,
  whatsapp: Phone,
  in_app: MessageSquare,
};

const CHANNEL_LABEL_MAP: Record<string, string> = {
  email: "Email",
  push: "Push",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "In-App",
};
const FACTOR_LABELS: Record<string, string> = {
  delivery: "Entrega",
  diversity: "Diversidad",
  reliability: "Fiabilidad",
};

const SHORT_DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ═══════════════════════════════════════════════════════════
// SUB-COMP 1: Health Score Gauge (SVG 360°)
// ═══════════════════════════════════════════════════════════

function HealthScoreGauge({
  score,
  label,
  factors,
}: {
  score: number;
  label: string;
  factors: { delivery: number; diversity: number; reliability: number };
}) {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="overview__gauge-card">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overview__gauge-svg"
        role="img"
        aria-label={`Health score: ${score} de 100, ${label}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="overview__gauge-track"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="overview__gauge-fill"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          data-score={score >= 80 ? "high" : score >= 50 ? "medium" : "low"}
        />
        <text
          x={size / 2}
          y={size / 2 - 10}
          textAnchor="middle"
          dominantBaseline="central"
          className="overview__gauge-number"
        >
          {score}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 22}
          textAnchor="middle"
          className="overview__gauge-label"
        >
          {label}
        </text>
      </svg>

      <div className="overview__gauge-factors">
        {(["delivery", "diversity", "reliability"] as const).map(
          (key: "delivery" | "diversity" | "reliability") => {
            const value = factors[key];
            return (
              <div key={key} className="overview__factor-row">
                <span className="overview__factor-label">
                  {FACTOR_LABELS[key] ?? key}
                </span>
                <div className="overview__factor-track">
                  <div
                    className="overview__factor-fill"
                    style={{ width: `${value}%` } as React.CSSProperties}
                    data-score={value >= 80 ? "high" : value >= 50 ? "medium" : "low"}
                  />
                </div>
                <span className="overview__factor-value">{value}%</span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 2: Channel Health Matrix
// ═══════════════════════════════════════════════════════════

function ChannelHealthMatrix({
  channelBreakdown,
}: {
  channelBreakdown: CommunicationAnalyticsData["channel_breakdown"];
}) {
  const allChannels = ["email", "push", "sms", "whatsapp", "in_app"];

  return (
    <div className="overview__section-card">
      <div className="overview__section-header">
        <h3 className="overview__section-title">Salud por Canal</h3>
        <p className="overview__section-sub">Diversificación y volumen</p>
      </div>
      <div className="overview__channel-list">
        {allChannels.map((ch: string) => {
          const data = channelBreakdown.find(
            (c: CommunicationAnalyticsData["channel_breakdown"][number]) =>
              c.channel === ch,
          );
          const count = data?.count ?? 0;
          const pct = data?.percentage ?? 0;
          const ChIcon = CHANNEL_ICON_MAP[ch] ?? Radio;
          const chLabel = CHANNEL_LABEL_MAP[ch] ?? ch;

          const healthLevel: "active" | "low" | "minimal" | "unused" =
            pct >= 20 ? "active" : pct >= 5 ? "low" : count > 0 ? "minimal" : "unused";

          return (
            <div
              key={ch}
              className="overview__channel-row"
              data-channel={ch}
              data-health={healthLevel}
            >
              <div className="overview__channel-icon" data-channel={ch}>
                <ChIcon size={16} />
              </div>
              <div className="overview__channel-info">
                <div className="overview__channel-header">
                  <span className="overview__channel-name">{chLabel}</span>
                  <span className="overview__channel-health" data-health={healthLevel}>
                    {healthLevel === "active" ? "Activo" :
                     healthLevel === "low" ? "Bajo uso" :
                     healthLevel === "minimal" ? "Mínimo" : "Sin uso"}
                  </span>
                </div>
                <div className="overview__channel-bar-track">
                  <div
                    className="overview__channel-bar-fill"
                    data-channel={ch}
                    style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` } as React.CSSProperties}
                  />
                </div>
                <div className="overview__channel-meta">
                  <span>{count} envíos</span>
                  <span>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 3: Communication Timeline (30 days)
// ═══════════════════════════════════════════════════════════

function CommunicationTimeline({ history }: { history: HistoryItem[] }) {
  const days = useMemo(() => {
    const now = new Date();
    const result: Array<{
      date: string;
      count: number;
      mainType: string | null;
      label: string;
      shortDay: string;
      isToday: boolean;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayComms = history.filter((h: HistoryItem) =>
        h.sent_at?.startsWith(dateStr),
      );
      const count = dayComms.length;

      const typeCounts: Record<string, number> = {};
      dayComms.forEach((h: HistoryItem) => {
        typeCounts[h.notification_type] =
          (typeCounts[h.notification_type] || 0) + 1;
      });
      const mainType =
        count > 0
          ? Object.entries(typeCounts).sort(
              (a: [string, number], b: [string, number]) => b[1] - a[1],
            )[0]?.[0] ?? null
          : null;

      result.push({
        date: dateStr,
        count,
        mainType,
        label: `${d.getDate()} ${d.toLocaleString("es", { month: "short" })}`,
        shortDay: SHORT_DAYS[d.getDay()],
        isToday: i === 0,
      });
    }
    return result;
  }, [history]);

  const gaps = useMemo(() => {
    const result: Array<{ start: number; end: number; length: number }> = [];
    let gapStart = -1;
    days.forEach(
      (
        day: { date: string; count: number; label: string },
        idx: number,
      ) => {
        if (day.count === 0) {
          if (gapStart === -1) gapStart = idx;
        } else {
          if (gapStart !== -1 && idx - gapStart >= 3) {
            result.push({ start: gapStart, end: idx - 1, length: idx - gapStart });
          }
          gapStart = -1;
        }
      },
    );
    if (gapStart !== -1 && days.length - gapStart >= 3) {
      result.push({ start: gapStart, end: days.length - 1, length: days.length - gapStart });
    }
    return result;
  }, [days]);

  const maxCount = Math.max(...days.map((d: { count: number }) => d.count), 1);

  return (
    <div className="overview__section-card">
      <div className="overview__section-header">
        <h3 className="overview__section-title">Línea Temporal</h3>
        <p className="overview__section-sub">30 días de actividad</p>
      </div>

      <div className="overview__timeline-scroll">
        <div className="overview__timeline-strip">
          {days.map(
            (
              day: {
                date: string;
                count: number;
                mainType: string | null;
                label: string;
                shortDay: string;
                isToday: boolean;
              },
              idx: number,
            ) => {
              const dotType = day.mainType ?? "";
              const barH = day.count > 0
                ? Math.max((day.count / maxCount) * 24, 4)
                : 2;

              return (
                <div
                  key={day.date}
                  className="overview__timeline-day"
                  data-active={day.count > 0}
                  data-today={day.isToday}
                  title={`${day.label} (${day.shortDay}): ${day.count} comunicación(es)`}
                >
                  <div
                    className="overview__timeline-bar"
                    style={{ height: `${barH}px` } as React.CSSProperties}
                    data-type={dotType}
                  />
                  <div
                    className="overview__timeline-dot"
                    data-type={dotType}
                    data-size={day.count > 3 ? "large" : day.count > 0 ? "medium" : "small"}
                  />
                  {(idx % 5 === 0 || day.isToday || idx === 0) && (
                    <span className="overview__timeline-label">{day.label}</span>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="overview__timeline-gaps">
          {gaps.map(
            (gap: { start: number; end: number; length: number }, idx: number) => (
              <div key={idx} className="overview__gap-warning">
                <AlertTriangle size={12} />
                <span>
                  {gap.length} días sin comunicaciones ({days[gap.start]?.label} –{" "}
                  {days[gap.end]?.label})
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 4: Upcoming Pipeline
// ═══════════════════════════════════════════════════════════

function UpcomingPipeline({ scheduled }: { scheduled: ScheduledItem[] }) {
  const upcoming = useMemo(
    () =>
      scheduled
        .filter((s: ScheduledItem) => s.status === "queued")
        .sort(
          (a: ScheduledItem, b: ScheduledItem) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
        )
        .slice(0, 5),
    [scheduled],
  );

  return (
    <div className="overview__section-card">
      <div className="overview__section-header">
        <h3 className="overview__section-title">Próximos Envíos</h3>
        <p className="overview__section-sub">Comunicaciones programadas</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="overview__empty-inline">
          <CalendarClock size={20} className="overview__empty-inline-icon" />
          <span>Sin envíos programados</span>
        </div>
      ) : (
        <div className="overview__pipeline-list">
          {upcoming.map((item: ScheduledItem, idx: number) => {
            const ChIcon = CHANNEL_ICON_MAP[item.channel] ?? Radio;
            const chLabel = CHANNEL_LABEL_MAP[item.channel] ?? item.channel;

            return (
              <div key={item.id} className="overview__pipeline-row" data-channel={item.channel}>
                <span className="overview__pipeline-num">{idx + 1}</span>
                <div className="overview__pipeline-icon" data-channel={item.channel}>
                  <ChIcon size={14} />
                </div>
                <div className="overview__pipeline-info">
                  <span className="overview__pipeline-template">
                    Template: {item.template_id}
                  </span>
                  <span className="overview__pipeline-meta">
                    {item.recipient_ids.length} dest. · {chLabel}
                  </span>
                </div>
                <span className="overview__pipeline-time">
                  {formatCommunicationDate(item.scheduled_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 5: Satisfaction Correlation (on-demand)
// ═══════════════════════════════════════════════════════════

function SatisfactionCorrelation({
  communicationCount,
}: {
  communicationCount: number;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const satQ = useMCPQuery<SatisfactionTrendsResponse>(
    "satisfaction",
    "get_satisfaction_trends",
    { months: 6 },
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const trends: SatisfactionTrendsData | undefined = satQ.data?.trends;

  if (!shouldFetch) {
    return (
      <div className="overview__section-card overview__section-card--cta">
        <div className="overview__cta-content">
          <h3 className="overview__section-title">Impacto en Satisfacción</h3>
          <p className="overview__section-sub">
            Correlacioná tus comunicaciones con la satisfacción del socio.
          </p>
        </div>
        <button
          className="overview__cta-btn"
          onClick={() => setShouldFetch(true)}
        >
          <Heart size={16} />
          <span>Analizar correlación</span>
        </button>
      </div>
    );
  }

  if (satQ.isLoading) {
    return <div className="overview__skeleton overview__skeleton--tall" />;
  }

  if (satQ.isError) {
    return (
      <div className="overview__section-card">
        <div className="overview__error">
          <AlertTriangle size={20} />
          <span>No se pudieron cargar las tendencias de satisfacción.</span>
          <button className="overview__retry-btn" onClick={() => satQ.refetch()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!trends) return null;

  const trendLevel: "improving" | "declining" | "stable" =
    trends.overall_trend === "improving"
      ? "improving"
      : trends.overall_trend === "declining"
        ? "declining"
        : "stable";

  const TrendIcon =
    trendLevel === "improving"
      ? TrendingUp
      : trendLevel === "declining"
        ? TrendingDown
        : Minus;

  const trendLabel =
    trendLevel === "improving" ? "Mejorando" :
    trendLevel === "declining" ? "En declive" : "Estable";

  const latestMonth = trends.monthly_averages?.[trends.monthly_averages.length - 1];
  const previousMonth = trends.monthly_averages?.[trends.monthly_averages.length - 2];
  const scoreDelta =
    latestMonth && previousMonth
      ? latestMonth.avg_score - previousMonth.avg_score
      : null;

  return (
    <div className="overview__section-card">
      <div className="overview__section-header">
        <div>
          <h3 className="overview__section-title">Impacto en Satisfacción</h3>
          <p className="overview__section-sub">
            {trends.months_analyzed} meses · {trends.total_surveys} encuestas
          </p>
        </div>
        <div className="overview__trend-badge" data-trend={trendLevel}>
          <TrendIcon size={14} />
          <span>{trendLabel}</span>
        </div>
      </div>

      {latestMonth && (
        <div className="overview__sat-latest">
          <div className="overview__sat-latest-score">
            <span className="overview__sat-latest-label">Último mes</span>
            <span className="overview__sat-latest-value" data-trend={trendLevel}>
              {latestMonth.avg_score.toFixed(1)}
            </span>
            <span className="overview__sat-latest-unit">/5.0</span>
          </div>
          {scoreDelta !== null && (
            <div className="overview__sat-delta">
              <span className="overview__sat-delta-label">vs. mes anterior</span>
              <span
                className="overview__sat-delta-value"
                data-direction={scoreDelta > 0 ? "up" : scoreDelta < 0 ? "down" : "flat"}
              >
                {scoreDelta > 0 ? "+" : ""}
                {scoreDelta.toFixed(1)}pts
              </span>
            </div>
          )}
          <div className="overview__sat-surveys">
            <span className="overview__sat-surveys-label">
              Encuestas ({latestMonth.month})
            </span>
            <span className="overview__sat-surveys-value">
              {latestMonth.survey_count}
            </span>
          </div>
        </div>
      )}

      <div className="overview__sat-insight" data-trend={trendLevel}>
        <p>
          {trendLevel === "improving"
            ? `Tus ${communicationCount} comunicaciones coinciden con tendencia positiva. ${scoreDelta !== null && scoreDelta > 0 ? `+${scoreDelta.toFixed(1)}pts vs mes anterior.` : ""}`
            : trendLevel === "declining"
              ? `Satisfacción en baja. Evaluá contenido y segmentación. ${scoreDelta !== null && scoreDelta < 0 ? `${scoreDelta.toFixed(1)}pts vs mes anterior.` : ""}`
              : `Satisfacción estable con ${communicationCount} comunicaciones. Explorá nuevos formatos.`}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 6: Quick Actions
// ═══════════════════════════════════════════════════════════

function QuickActions({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const actions: Array<{
    label: string;
    sub: string;
    icon: LucideIcon;
    tab: string;
    token: string;
  }> = [
    { label: "Nuevo Comunicado", sub: "Broadcast masivo", icon: Megaphone, tab: "centro", token: "gold" },
    { label: "Programar Envío", sub: "Con plantilla", icon: CalendarClock, tab: "herramientas", token: "teal" },
    { label: "Analytics Profundo", sub: "Charts e insights", icon: BarChart3, tab: "analytics", token: "emerald" },
    { label: "Board Package", sub: "Paquete junta", icon: Package, tab: "centro", token: "gold" },
  ];

  return (
    <div className="overview__quick-actions">
      <h3 className="overview__section-title">Acciones Rápidas</h3>
      <div className="overview__quick-grid">
        {actions.map(
          (action: typeof actions[number], idx: number) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={action.label}
                className="overview__quick-btn"
                data-token={action.token}
                style={{ "--stagger-i": idx } as React.CSSProperties}
                onClick={() => onNavigate?.(action.tab)}
              >
                <div className="overview__quick-icon" data-token={action.token}>
                  <ActionIcon size={20} />
                </div>
                <div className="overview__quick-text">
                  <span className="overview__quick-label">{action.label}</span>
                  <span className="overview__quick-sub">{action.sub}</span>
                </div>
                <ArrowRight size={16} className="overview__quick-arrow" />
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CommunicationOverview({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(false);

  // ── MCP Queries ───────────────────────────────────────
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period: "current_month" },
    { staleTime: 120_000 },
  );

  const historyQ = useMCPQuery<HistoryResponse>(
    "communication",
    "get_notification_history",
    { limit: 50 },
    { staleTime: 60_000 },
  );

  const scheduledQ = useMCPQuery<ScheduledListResponse>(
    "communication",
    "schedule_notification",
    { action: "list" },
    { staleTime: 60_000 },
  );

  const aiInsightsQ = useMCPQuery<CommunicationInsightsResponse>(
    "communication",
    "communication_insights",
    {},
    { enabled: aiInsightsEnabled, staleTime: 0 },
  );

  // ── Data extraction ───────────────────────────────────
  const analytics: CommunicationAnalyticsData | undefined = analyticsQ.data?.analytics;
  const history: HistoryItem[] = historyQ.data?.history ?? [];
  const scheduled: ScheduledItem[] = scheduledQ.data?.scheduled ?? [];
  const aiInsights: CommunicationIntelligenceInsight[] = aiInsightsQ.data?.insights ?? [];
  const aiSummary: string = aiInsightsQ.data?.summary ?? "";

  // ── Health Score ──────────────────────────────────────
  const healthScore = useMemo(() => {
    if (!analytics || analytics.total_sent === 0) {
      return {
        score: 0,
        label: "Sin datos",
        factors: { delivery: 0, diversity: 0, reliability: 0 },
      };
    }
    return calculateCommunicationHealth(analytics);
  }, [analytics]);

  // ── Advisor insights ──────────────────────────────────
  const advisorInsights = useCommunicationAdvisor(
    analytics,
    history,
    scheduled,
  );

  // ── Pulse KPIs ────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!analytics) return [];
    return [
      { label: "Enviados", value: analytics.total_sent.toString(), sub: `${analytics.total_recipients} dest.`, icon: Send },
      { label: "Tasa Éxito", value: `${analytics.delivery_rate_pct.toFixed(0)}%`, sub: `${analytics.status_breakdown.sent + analytics.status_breakdown.delivered} exitosos`, icon: TrendingUp },
      { label: "Mejor Día", value: analytics.best_day_to_send, sub: "para envíos", icon: CalendarDays },
      { label: "Mejor Hora", value: analytics.best_hour_to_send, sub: analytics.best_day_to_send, icon: Clock },
      { label: "Programados", value: scheduled.filter((s: ScheduledItem) => s.status === "queued").length.toString(), sub: "próximos envíos", icon: CalendarClock },
    ];
  }, [analytics, scheduled]);

  // ── Loading ───────────────────────────────────────────
  const isLoading = analyticsQ.isLoading || historyQ.isLoading;

  if (isLoading) {
    return (
      <div className="glass-comm-overview">
        <div className="overview__loading">
          <div className="overview__skeleton overview__skeleton--gauge" />
          <div className="overview__skeleton-grid">
            {Array.from({ length: 5 }).map((_: unknown, i: number) => (
              <div key={i} className="overview__skeleton overview__skeleton--kpi" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────
  if (!analytics || analytics.total_sent === 0) {
    return (
      <div className="glass-comm-overview">
        <div className="overview__empty-state">
          <Heart size={32} className="overview__empty-icon" />
          <div>
            <span className="overview__empty-title">Bienvenido al Pulso</span>
            <span className="overview__empty-desc">
              Aún no hay datos de comunicaciones. Enviá tu primer comunicado para comenzar.
            </span>
          </div>
          <button
            className="overview__empty-btn"
            onClick={() => onNavigate?.("centro")}
          >
            Ir al Centro de Comunicaciones
          </button>
        </div>
        <QuickActions onNavigate={onNavigate} />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="glass-comm-overview" data-loaded="true">
      {/* ── Hero: Health Score + Pulse KPIs ──────────── */}
      <div className="overview__hero">
        <HealthScoreGauge
          score={healthScore.score}
          label={healthScore.label}
          factors={healthScore.factors}
        />
        <div className="overview__kpi-grid">
          {kpis.map(
            (kpi: { label: string; value: string; sub: string; icon: LucideIcon }) => {
              const KpiIcon = kpi.icon;
              return (
                <div key={kpi.label} className="overview__kpi-card">
                  <div className="overview__kpi-header">
                    <KpiIcon size={14} />
                    <span className="overview__kpi-label">{kpi.label}</span>
                  </div>
                  <span className="overview__kpi-value">{kpi.value}</span>
                  <span className="overview__kpi-sub">{kpi.sub}</span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ── Communication Advisor ───────────────────── */}
      <CommunicationAdvisorBanner
        insights={advisorInsights}
        onNavigate={onNavigate}
      />

      {/* ── AI Insights (on-demand) ─────────────────── */}
      <div className="overview__ai-section">
        <div className="overview__ai-header">
          <div>
            <h3 className="overview__section-title">
              <Lightbulb size={16} />
              Insights AI Profundos
            </h3>
            <p className="overview__section-sub">
              Análisis avanzado con recomendaciones cuantificadas
            </p>
          </div>
          {aiInsightsEnabled && aiInsights.length > 0 ? (
            <button className="overview__refresh-btn" onClick={() => aiInsightsQ.refetch()}>
              <RefreshCw size={14} />
              <span>Actualizar</span>
            </button>
          ) : (
            <button
              className="overview__generate-btn"
              onClick={() => setAiInsightsEnabled(true)}
            >
              <Lightbulb size={14} />
              <span>Generar Insights AI</span>
            </button>
          )}
        </div>

        {!aiInsightsEnabled && (
          <div className="overview__ai-placeholder">
            <p>
              Análisis profundo de timing óptimo, diversificación de canales,
              patrones de audiencia y riesgos de comunicación.
            </p>
          </div>
        )}

        {aiInsightsQ.isLoading && (
          <div className="overview__ai-loading">
            {Array.from({ length: 3 }).map((_: unknown, i: number) => (
              <div key={i} className="overview__skeleton overview__skeleton--insight" />
            ))}
          </div>
        )}

        {aiInsights.length > 0 && (
          <div className="overview__ai-insights">
            {aiSummary && (
              <div className="overview__ai-summary">
                <p>{aiSummary}</p>
              </div>
            )}
            <div className="overview__ai-grid">
              {aiInsights.map(
                (ins: CommunicationIntelligenceInsight, idx: number) => {
                  const priCfg = INSIGHT_PRIORITY_CONFIG[ins.priority] ?? INSIGHT_PRIORITY_CONFIG.medium;

                  return (
                    <div
                      key={ins.id}
                      className="overview__ai-card"
                      data-priority={ins.priority}
                      style={{ "--stagger-i": idx } as React.CSSProperties}
                    >
                      <div className="overview__ai-card-accent" data-priority={ins.priority} />
                      <div className="overview__ai-card-body">
                        <div className="overview__ai-card-badges">
                          <span
                            className="overview__ai-badge"
                            data-priority={ins.priority}
                          >
                            {priCfg.label}
                          </span>
                          <span className="overview__ai-confidence">
                            {ins.confidence}%
                          </span>
                        </div>
                        <h4 className="overview__ai-card-title">{ins.title}</h4>
                        {ins.metric && (
                          <span className="overview__ai-card-metric">{ins.metric}</span>
                        )}
                        <p className="overview__ai-card-desc">{ins.description}</p>
                        <div className="overview__ai-card-recommendation">
                          <span className="overview__ai-rec-arrow">→ </span>
                          {ins.recommendation}
                        </div>
                        {ins.action_label && ins.action_route && (
                          <button
                            className="overview__ai-action-link"
                            onClick={() => onNavigate?.("herramientas")}
                          >
                            {ins.action_label}
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Channel Health + Pipeline ───────────────── */}
      <div className="overview__two-col">
        <ChannelHealthMatrix channelBreakdown={analytics.channel_breakdown} />
        <UpcomingPipeline scheduled={scheduled} />
      </div>

      {/* ── Timeline ────────────────────────────────── */}
      <CommunicationTimeline history={history} />

      {/* ── Satisfaction Correlation ────────────────── */}
      <SatisfactionCorrelation communicationCount={analytics.total_sent} />

      {/* ── Quick Actions ───────────────────────────── */}
      <QuickActions onNavigate={onNavigate} />

      {/* ── Last updated ────────────────────────────── */}
      <div className="overview__last-updated">
        <span>Datos actualizados: {new Date(analyticsQ.dataUpdatedAt ?? Date.now()).toLocaleString("es-CR")}</span>
      </div>
    </div>
  );
}