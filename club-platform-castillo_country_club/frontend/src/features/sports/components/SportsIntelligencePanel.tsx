// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsIntelligencePanel.tsx
// §B4.3 — Sports Intelligence Panel V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// 9-dimension deep analysis. Each dimension is an expandable
// card with its own visualization. Engagement score ring.
// Cross-domain signals display.
// Living Protocol: 7/7
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color: X }} → data-attributes
//   ✗ useReducedMotion → window.matchMedia
//   ✗ className prop → removed
//   ✗ Loader2 spinner → shimmer skeleton
//   ✗ Dead imports: useMCPQuery, Button, cn, useReducedMotion, Loader2
//   ✓ data-mode, data-expanded, data-dimension, data-severity
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsIntelligencePanel
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from "lucide-react";
import type { SportsDashboardMode } from "../types";
import {
  SPORT_CONFIG,
  utilizationToBarData,
  enrollmentToBarData,
  tournamentMetricsToKPIs,
  equipmentUrgencyGroups,
  seasonalToChartData,
} from "../types";
import type { SportType } from "../types";
import type { SportsAnalytics_Contract } from "@/shared/mocks/contracts";
import "./SportsIntelligencePanel.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsIntelligencePanelProps {
  analytics: SportsAnalytics_Contract | null;
  ambientMode?: SportsDashboardMode;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveEngagementLevel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "fair";
  return "poor";
}

function buildIntelligenceNarrative(
  analytics: SportsAnalytics_Contract,
): string {
  const score = analytics.member_engagement_score;
  const level = deriveEngagementLevel(score);
  const levelLabel =
    level === "excellent"
      ? "excelente"
      : level === "good"
        ? "saludable"
        : level === "fair"
          ? "necesita atención"
          : "bajo";

  return `Inteligencia deportiva: engagement ${score.toFixed(1)}/100 (${levelLabel}). ${analytics.total_active_reservations} reservas activas. ${analytics.total_active_classes} clases activas. Análisis de 9 dimensiones.`;
}

// ═══════════════════════════════════════════════════════════
// §3 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §3.1 DimensionCard ───────────────────────────────────

function DimensionCard({
  title,
  icon,
  dimensionNum,
  children,
  defaultExpanded = true,
  ambientMode,
}: {
  title: string;
  icon: string;
  dimensionNum: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  ambientMode: SportsDashboardMode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className="spt-intel__dim"
      data-expanded={expanded}
      data-dimension={dimensionNum}
      data-mode={ambientMode}
    >
      <Button
        variant="unstyled"
        type="button"
        className="spt-intel__dim-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="spt-intel__dim-title-row">
          <span className="spt-intel__dim-icon">{icon}</span>
          <span className="spt-intel__dim-badge">D{dimensionNum}</span>
          <span className="spt-intel__dim-title">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="spt-intel__dim-chevron" />
        ) : (
          <ChevronDown className="spt-intel__dim-chevron" />
        )}
      </Button>
      {expanded && (
        <div className="spt-intel__dim-content">
          {children}
        </div>
      )}
    </div>
  );
}

// ── §3.2 HorizontalBar ───────────────────────────────────

function HorizontalBar({
  label,
  value,
  maxValue,
  suffix = "",
}: {
  label: string;
  value: number;
  maxValue: number;
  suffix?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const level = pct >= 65 ? "high" : pct >= 40 ? "medium" : pct >= 25 ? "low" : "critical";

  return (
    <div className="spt-intel__bar">
      <span className="spt-intel__bar-label">{label}</span>
      <div className="spt-intel__bar-track">
        <div
          className="spt-intel__bar-fill"
          data-level={level}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="spt-intel__bar-value" data-level={level}>
        {value.toLocaleString("es-CR")}{suffix}
      </span>
    </div>
  );
}

// ── §3.3 MiniRingGauge ───────────────────────────────────

function MiniRingGauge({
  score,
  size = 80,
  label,
  level,
}: {
  score: number;
  size?: number;
  label: string;
  level: "excellent" | "good" | "fair" | "poor";
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="spt-intel__ring">
      <div className="spt-intel__ring-container" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="spt-intel__ring-svg">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="spt-intel__ring-bg"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="spt-intel__ring-fg"
            data-engagement-level={level}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="spt-intel__ring-center">
          <span className="spt-intel__ring-score" data-engagement-level={level}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <span className="spt-intel__ring-label">{label}</span>
    </div>
  );
}

// ── §3.4 TrendIcon ───────────────────────────────────────

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "increasing")
    return <TrendingUp className="spt-intel__trend-icon" data-trend="increasing" />;
  if (trend === "decreasing")
    return <TrendingDown className="spt-intel__trend-icon" data-trend="decreasing" />;
  return <Minus className="spt-intel__trend-icon" data-trend="stable" />;
}

// ═══════════════════════════════════════════════════════════
// §4 — DIMENSION RENDERERS
// ═══════════════════════════════════════════════════════════

function renderPopularityDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const bars = analytics.sport_popularity ?? [];
  const maxPop = bars.length > 0 ? bars[0].total_activity : 1;

  return (
    <DimensionCard
      title="Popularidad por Deporte"
      icon="📊"
      dimensionNum={1}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__dim-bars">
        {bars.map((sport) => (
          <HorizontalBar
            key={sport.sport}
            label={`${SPORT_CONFIG[sport.sport as SportType]?.icon ?? ""} ${SPORT_CONFIG[sport.sport as SportType]?.label ?? sport.sport}`}
            value={sport.total_activity}
            maxValue={maxPop}
            suffix={` (#${sport.popularity_rank})`}
          />
        ))}
      </div>
      {bars.length > 0 && (
        <p className="spt-intel__dim-insight">
          {bars[0].sport} domina con {bars[0].activity_share_pct}% de la actividad total.
          {bars.length > 1 && ` Seguido por ${bars[1].sport} (${bars[1].activity_share_pct}%).`}
        </p>
      )}
    </DimensionCard>
  );
}

function renderUtilizationDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const bars = utilizationToBarData(analytics.court_utilization ?? []);

  return (
    <DimensionCard
      title="Utilización de Canchas"
      icon="🏟️"
      dimensionNum={2}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__dim-bars">
        {bars.map((bar) => (
          <div key={bar.court} className="spt-intel__dim-bar-group">
            <HorizontalBar
              label={bar.court}
              value={bar.utilization}
              maxValue={100}
              suffix="%"
            />
            <div className="spt-intel__dim-bar-meta">
              <TrendIcon trend={bar.trend} />
              <span>Peak: {bar.peakHours.join(", ") || "N/A"}</span>
              <span>·</span>
              <span>{bar.sport}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="spt-intel__dim-legend">
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="high" /> ≥65% target
        </span>
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="medium" /> 25-40%
        </span>
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="critical" /> &lt;25%
        </span>
      </div>
    </DimensionCard>
  );
}

function renderClassDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const bars = enrollmentToBarData(analytics.class_enrollment ?? []);
  const lowCount = bars.filter((b) => b.status === "low" || b.status === "critical").length;

  return (
    <DimensionCard
      title="Rendimiento de Clases"
      icon="🧘"
      dimensionNum={3}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__dim-bars">
        {bars.map((bar) => {
          const level = bar.fillRate >= 65 ? "high" : bar.fillRate >= 40 ? "medium" : bar.fillRate >= 25 ? "low" : "critical";
          return (
            <div key={bar.id} className="spt-intel__class-row">
              <div className="spt-intel__class-info">
                <p className="spt-intel__class-name">{bar.name}</p>
                <p className="spt-intel__class-sport">{bar.sport}</p>
              </div>
              <div className="spt-intel__bar-track">
                <div
                  className="spt-intel__bar-fill"
                  data-level={level}
                  style={{ width: `${Math.min(100, bar.fillRate)}%` }}
                />
              </div>
              <span className="spt-intel__bar-value" data-level={level}>
                {bar.enrolled}/{bar.capacity} ({bar.fillRate.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
      {lowCount > 0 && (
        <p className="spt-intel__dim-alert">
          ⚠ {lowCount} clase(s) con inscripción baja — considerar ajuste de horario o promoción.
        </p>
      )}
    </DimensionCard>
  );
}

function renderTournamentDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const kpis = tournamentMetricsToKPIs(analytics.tournament_metrics);

  return (
    <DimensionCard
      title="Métricas de Torneos"
      icon="🏆"
      dimensionNum={4}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="spt-intel__kpi-card">
            <span className="spt-intel__kpi-icon">{kpi.icon}</span>
            <p className="spt-intel__kpi-value" data-color={kpi.color ?? "default"}>
              {kpi.value}
            </p>
            <p className="spt-intel__kpi-label">{kpi.label}</p>
          </div>
        ))}
      </div>
      {analytics.tournament_metrics.by_status && (
        <div className="spt-intel__dim-status-row">
          <span className="spt-intel__dim-status-label">Por estado:</span>
          {Object.entries(analytics.tournament_metrics.by_status).map(([status, count]) => (
            <span key={status} className="spt-intel__dim-status-item">
              {status}: <strong>{String(count)}</strong>
            </span>
          ))}
        </div>
      )}
    </DimensionCard>
  );
}

function renderEquipmentDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const groups = equipmentUrgencyGroups(analytics.equipment_health ?? []);

  return (
    <DimensionCard
      title="Salud de Equipamiento"
      icon="📦"
      dimensionNum={5}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__eq-summary">
        {[
          { label: "OK", count: groups.ok.length, level: "high" as const },
          { label: "Atención", count: groups.warning.length, level: "medium" as const },
          { label: "Crítico", count: groups.critical.length, level: "critical" as const },
        ].map((g) => (
          <span key={g.label} className="spt-intel__eq-badge" data-level={g.level}>
            {g.label}: <strong>{g.count}</strong>
          </span>
        ))}
      </div>

      {groups.critical.length > 0 && (
        <div className="spt-intel__eq-group">
          <p className="spt-intel__eq-group-label" data-severity="critical">
            ⚠ Reemplazo urgente:
          </p>
          {groups.critical.map((item) => (
            <div key={item.id} className="spt-intel__eq-item" data-severity="critical">
              <span className="spt-intel__eq-item-name">{item.name}</span>
              <span className="spt-intel__eq-item-urgency">urgencia: {item.urgency}</span>
            </div>
          ))}
        </div>
      )}

      {groups.warning.length > 0 && (
        <div className="spt-intel__eq-group">
          <p className="spt-intel__eq-group-label" data-severity="warning">
            Mantenimiento necesario:
          </p>
          {groups.warning.map((item) => (
            <div key={item.id} className="spt-intel__eq-item" data-severity="warning">
              <span className="spt-intel__eq-item-name">{item.name}</span>
              <span className="spt-intel__eq-item-action">{item.action}</span>
            </div>
          ))}
        </div>
      )}
    </DimensionCard>
  );
}

function renderCoachingDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const stats = analytics.coaching_stats;

  return (
    <DimensionCard
      title="Efectividad de Coaching"
      icon="🎾"
      dimensionNum={6}
      ambientMode={ambientMode}
    >
      {stats.coaches.length > 0 ? (
        <div className="spt-intel__coach-list">
          {stats.coaches.map((coach, idx) => (
            <div key={coach.name} className="spt-intel__coach-row">
              <span className="spt-intel__coach-rank" data-rank={idx === 0 ? "first" : "other"}>
                {idx === 0 ? "🥇" : idx + 1}
              </span>
              <div className="spt-intel__coach-info">
                <p className="spt-intel__coach-name">{coach.name}</p>
                <p className="spt-intel__coach-sports">
                  {coach.popular_sports.map((s) => SPORT_CONFIG[s as SportType]?.icon ?? s).join(" ")}
                </p>
              </div>
              <div className="spt-intel__coach-stats">
                <span className="spt-intel__coach-stat">
                  <strong data-color="accent">{coach.session_count}</strong> sesiones
                </span>
                <span className="spt-intel__coach-stat">
                  <strong data-color="success">{coach.unique_members}</strong> socios
                </span>
                <span className="spt-intel__coach-stat">
                  <strong>{coach.avg_sessions_per_member}</strong>/socio
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="spt-intel__dim-empty">Sin datos de coaching.</p>
      )}
      <div className="spt-intel__dim-stats-row">
        <span>Total: <strong>{stats.total_sessions}</strong> sesiones</span>
        <span>Socios únicos: <strong>{stats.unique_members_coached}</strong></span>
        {stats.top_coach && <span>Top: <strong data-color="gold">{stats.top_coach}</strong></span>}
      </div>
    </DimensionCard>
  );
}

function renderSeasonalDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const data = seasonalToChartData(analytics.seasonal_patterns ?? []);
  const maxSeasonal = data.length > 0 ? Math.max(...data.map((s) => s.total)) : 1;
  const peakMonth = data.reduce(
    (max, m) => (m.total > max.total ? m : max),
    data[0],
  );

  return (
    <DimensionCard
      title="Patrones Estacionales"
      icon="📅"
      dimensionNum={7}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__season-chart">
        {data.map((month) => {
          const height = maxSeasonal > 0 ? (month.total / maxSeasonal) * 100 : 0;
          const level = month.isPeak ? "high" : month.total > maxSeasonal * 0.5 ? "medium" : "low";

          return (
            <div key={month.monthNum} className="spt-intel__season-bar">
              <span className="spt-intel__season-value">{month.total}</span>
              <div
                className="spt-intel__season-fill"
                data-level={level}
                data-peak={month.isPeak}
                style={{ height: `${Math.max(4, height)}%` }}
              />
              <span className="spt-intel__season-label">{month.month}</span>
            </div>
          );
        })}
      </div>
      <div className="spt-intel__dim-legend">
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="high" /> Temporada alta (dic-abr)
        </span>
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="medium" /> Actividad moderada
        </span>
        <span className="spt-intel__dim-legend-item">
          <span className="spt-intel__dim-legend-dot" data-level="low" /> Baja actividad
        </span>
      </div>
      <p className="spt-intel__dim-insight">
        Pico de actividad: {peakMonth?.month ?? "—"} ·
        Deportes dominantes: {[...new Set(data.filter((s) => s.dominantSport !== "—").map((s) => s.dominantSport))].join(", ")}
      </p>
    </DimensionCard>
  );
}

function renderEngagementDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const score = analytics.member_engagement_score;
  const level = deriveEngagementLevel(score);
  const coaching = analytics.coaching_stats;

  const summary =
    level === "excellent" || level === "good"
      ? "El engagement deportivo es saludable. Los socios están activos y comprometidos."
      : level === "fair"
        ? "El engagement necesita atención. Considerar nuevas actividades o promociones."
        : "Engagement bajo. Se requiere acción de reactivación deportiva.";

  return (
    <DimensionCard
      title="Engagement de Socios"
      icon="👥"
      dimensionNum={8}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__engage-layout">
        <MiniRingGauge
          score={score}
          size={100}
          label="Score Global"
          level={level}
        />
        <div className="spt-intel__engage-content">
          <div className="spt-intel__kpi-grid spt-intel__kpi-grid--compact">
            <div className="spt-intel__kpi-card">
              <p className="spt-intel__kpi-value" data-color="accent">{analytics.total_active_reservations}</p>
              <p className="spt-intel__kpi-label">Reservas</p>
            </div>
            <div className="spt-intel__kpi-card">
              <p className="spt-intel__kpi-value" data-color="success">{coaching.unique_members_coached}</p>
              <p className="spt-intel__kpi-label">En coaching</p>
            </div>
            <div className="spt-intel__kpi-card">
              <p className="spt-intel__kpi-value" data-color="gold">{analytics.tournament_metrics.total_tournaments}</p>
              <p className="spt-intel__kpi-label">Torneos</p>
            </div>
          </div>
          <p className="spt-intel__dim-insight">{summary}</p>
        </div>
      </div>
    </DimensionCard>
  );
}

function renderCrossDomainDimension(
  analytics: SportsAnalytics_Contract,
  ambientMode: SportsDashboardMode,
) {
  const score = analytics.member_engagement_score;
  const groups = equipmentUrgencyGroups(analytics.equipment_health ?? []);
  const seasonalData = seasonalToChartData(analytics.seasonal_patterns ?? []);
  const currentMonth = new Date().getMonth() + 1;
  const currentSeasonal = seasonalData.find((s) => s.monthNum === currentMonth);
  const coaching = analytics.coaching_stats;

  const signals = [
    {
      from: "Sports → Finance",
      signal: `Revenue estimado por torneos: ₡${(analytics.tournament_metrics.total_revenue / 1_000_000).toFixed(1)}M. Coaching como revenue premium.`,
      level: "high" as const,
    },
    {
      from: "Sports → Wellness",
      signal: `${coaching.unique_members_coached} socios con actividad deportiva activa complementan sus goals de bienestar.`,
      level: "medium" as const,
    },
    {
      from: "Sports → Communications",
      signal: score < 50
        ? "Engagement bajo — oportunidad de campaña de reactivación deportiva dirigida."
        : "Engagement saludable — buen momento para promover nuevos deportes o torneos.",
      level: score < 50 ? ("critical" as const) : ("high" as const),
    },
    {
      from: "Weather → Sports",
      signal: currentSeasonal?.isPeak
        ? "Temporada ALTA: Maximizar deportes outdoor — clima seco ideal."
        : "Temporada VERDE: Priorizar indoor y planificar temporada alta.",
      level: (currentSeasonal?.isPeak ? "high" : "medium") as "high" | "medium",
    },
    {
      from: "Equipment → Facilities",
      signal: groups.critical.length > 0
        ? `${groups.critical.length} item(s) con reemplazo urgente — impacto en presupuesto de facilities.`
        : "Equipamiento en buen estado — sin necesidad de CAPEX inmediato.",
      level: (groups.critical.length > 0 ? "critical" : "high") as "critical" | "high",
    },
  ];

  return (
    <DimensionCard
      title="Señales Cross-Domain"
      icon="🔗"
      dimensionNum={9}
      ambientMode={ambientMode}
    >
      <div className="spt-intel__signals">
        {signals.map((signal) => (
          <div key={signal.from} className="spt-intel__signal" data-level={signal.level}>
            <Zap className="spt-intel__signal-icon" data-level={signal.level} />
            <div className="spt-intel__signal-content">
              <p className="spt-intel__signal-from" data-level={signal.level}>{signal.from}</p>
              <p className="spt-intel__signal-text">{signal.signal}</p>
            </div>
          </div>
        ))}
      </div>
    </DimensionCard>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — SHIMMER SKELETON
// ═══════════════════════════════════════════════════════════

function ShimmerSkeleton() {
  return (
    <div className="spt-intel__skeleton" role="status" aria-label="Cargando analytics">
      <div className="spt-intel__skeleton-block spt-intel__skeleton-block--header" />
      <div className="spt-intel__skeleton-block spt-intel__skeleton-block--ring" />
      <div className="spt-intel__skeleton-block spt-intel__skeleton-block--dim" />
      <div className="spt-intel__skeleton-block spt-intel__skeleton-block--dim" />
      <div className="spt-intel__skeleton-block spt-intel__skeleton-block--dim" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsIntelligencePanel({
  analytics,
  ambientMode = "calm",
}: SportsIntelligencePanelProps) {
  // ── §6.1 — Degraded: loading ──────────────────────────
  if (!analytics) {
    return <ShimmerSkeleton />;
  }

  // ── §6.2 — Derived data ──────────────────────────────
  const engagementScore = analytics.member_engagement_score;
  const engagementLevel = deriveEngagementLevel(engagementScore);

  // ── §6.3 — Narrative ──────────────────────────────────
  const narrative = useMemo(
    () => buildIntelligenceNarrative(analytics),
    [analytics],
  );

  // ── §6.4 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-intel"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-intel__header">
        <Brain className="spt-intel__header-icon" />
        <div className="spt-intel__header-text">
          <h3 className="spt-intel__title">Inteligencia Deportiva — 9 Dimensiones</h3>
          <p className="spt-intel__subtitle">
            Análisis de {analytics.lookback_days} días · {analytics.total_active_reservations} reservas · {analytics.total_active_classes} clases
          </p>
        </div>
      </div>

      {/* ── Engagement Ring (top) ── */}
      <div className="spt-intel__engage-hero" data-engagement-level={engagementLevel}>
        <MiniRingGauge
          score={engagementScore}
          size={90}
          label="Engagement"
          level={engagementLevel}
        />
        <div className="spt-intel__engage-hero-text">
          <p className="spt-intel__engage-hero-score">
            <strong data-engagement-level={engagementLevel}>{engagementScore.toFixed(1)}</strong>{" "}
            / 100
          </p>
          <p className="spt-intel__engage-hero-desc">
            {engagementLevel === "excellent" || engagementLevel === "good"
              ? "Participación saludable"
              : engagementLevel === "fair"
                ? "Nivel de atención — monitorear tendencia"
                : "Participación baja — acción requerida"}
          </p>
          <p className="spt-intel__engage-hero-meta">
            Reservas: {analytics.total_active_reservations} · Clases: {analytics.total_active_classes}
          </p>
        </div>
      </div>

      {/* ── 9 Dimensions ── */}
      {renderPopularityDimension(analytics, ambientMode)}
      {renderUtilizationDimension(analytics, ambientMode)}
      {renderClassDimension(analytics, ambientMode)}
      {renderTournamentDimension(analytics, ambientMode)}
      {renderEquipmentDimension(analytics, ambientMode)}
      {renderCoachingDimension(analytics, ambientMode)}
      {renderSeasonalDimension(analytics, ambientMode)}
      {renderEngagementDimension(analytics, ambientMode)}
      {renderCrossDomainDimension(analytics, ambientMode)}

      {/* ── Footer: Narrative ── */}
      <div className="spt-intel__footer">
        <p className="spt-intel__narrative">{narrative}</p>
      </div>
    </section>
  );
}