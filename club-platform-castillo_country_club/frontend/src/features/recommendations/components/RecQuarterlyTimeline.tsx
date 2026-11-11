// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Quarterly Timeline v2 (2027 REWRITE)
//
// Replaces: QuarterlyInsights.tsx + RecQuarterlyTimeline v1
//
// "The Quarterly Report" — CRUD quarterly insights with temporal
// narrative, year timeline navigation, metric comparison, and
// enhanced activity chart.
//
// Paradigm: CRUD (auto-load list + generate mutation).
// MCP: "generate_quarterly_insights" { action: "list" | "generate" }.
// Year timeline: Q1-Q4 visual navigation with filled/empty states.
// Sections: color-coded achievement (emerald), improvement (amber),
//   recommendation (gold).
// Activity chart: ranked bars with stagger animation.
// Metric comparison: trend across quarters when multiple exist.
//
// Glass namespace: .glass-rqi
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Users,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Minus,
} from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { formatCurrency } from "@/shared/lib/utils";

import {
  InsightPeriod,
  INSIGHT_PERIOD_CONFIG,
  SUGGESTION_STATUS_CONFIG,
  type QuarterlyInsight,
  type QuarterlyInsightsListResponse,
} from "../types";

import "./RecQuarterlyTimeline.css";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const AVAILABLE_YEARS = [2023, 2024, 2025, 2026];

const SECTION_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; label: string; color: string }
> = {
  achievement: { icon: CheckCircle, label: "Logros Clave", color: "emerald" },
  improvement: { icon: AlertTriangle, label: "Áreas de Mejora", color: "amber" },
  recommendation: { icon: Lightbulb, label: "Recomendaciones", color: "gold" },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getSatisfactionLevel(value: number): "high" | "medium" | "low" {
  if (value >= 4.0) return "high";
  if (value >= 3.0) return "medium";
  return "low";
}

function getPeriodOrder(p: InsightPeriod): number {
  const map: Record<string, number> = {
    Q1: 0,
    Q2: 1,
    Q3: 2,
    Q4: 3,
  };
  return map[p] ?? 0;
}

function compareQuarters(
  current: QuarterlyInsight,
  previous: QuarterlyInsight | null,
): {
  revenue: { diff: number; pct: number; trend: "positive" | "negative" | "flat" };
  members: { diff: number; pct: number; trend: "positive" | "negative" | "flat" };
  attendance: { diff: number; pct: number; trend: "positive" | "negative" | "flat" };
} | null {
  if (!previous) return null;

  const revDiff = current.revenue_total - previous.revenue_total;
  const revPct = previous.revenue_total > 0
    ? Math.round((revDiff / previous.revenue_total) * 100)
    : 0;

  const memDiff = current.total_members_active - previous.total_members_active;
  const memPct = previous.total_members_active > 0
    ? Math.round((memDiff / previous.total_members_active) * 100)
    : 0;

  const attDiff = current.avg_event_attendance - previous.avg_event_attendance;
  const attPct = previous.avg_event_attendance > 0
    ? Math.round((attDiff / previous.avg_event_attendance) * 100)
    : 0;

  function trend(diff: number): "positive" | "negative" | "flat" {
    if (diff > 0) return "positive";
    if (diff < 0) return "negative";
    return "flat";
  }

  return {
    revenue: { diff: revDiff, pct: revPct, trend: trend(revDiff) },
    members: { diff: memDiff, pct: memPct, trend: trend(memDiff) },
    attendance: { diff: attDiff, pct: attPct, trend: trend(attDiff) },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// YEAR TIMELINE NAVIGATION (innovation v2)
// ═══════════════════════════════════════════════════════════════════════

function YearTimeline({
  year,
  insights,
  expandedId,
  onSelectInsight,
}: {
  year: number;
  insights: QuarterlyInsight[];
  expandedId: string | null;
  onSelectInsight: (id: string) => void;
}) {
  const allPeriods = Object.values(InsightPeriod) as InsightPeriod[];
  const yearInsights = insights.filter((i) => i.year === year);

  const periodMap: Partial<Record<InsightPeriod, QuarterlyInsight>> = {};
  for (const ins of yearInsights) {
    periodMap[ins.period] = ins;
  }

  return (
    <div className="rqi-timeline" role="navigation" aria-label={`Timeline ${year}`}>
      {allPeriods.map((period) => {
        const insight = periodMap[period];
        const periodCfg = (INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[period];
        const isActive = insight && expandedId === insight.id;
        const hasReport = !!insight;

        return (
          <Button
            variant="unstyled"
            key={period}
            type="button"
            className="rqi-timeline-period"
            data-has-report={hasReport ? "" : undefined}
            data-active={isActive ? "" : undefined}
            data-status={insight?.status}
            onClick={() => insight && onSelectInsight(insight.id)}
            disabled={!hasReport}
            aria-label={`${periodCfg?.label ?? period}${hasReport ? "" : " (sin informe)"}`}
          >
            <div className="rqi-timeline-dot">
              {hasReport && (
                <CheckCircle size={10} aria-hidden="true" />
              )}
            </div>
            <span className="rqi-timeline-label">
              {periodCfg?.label ?? period}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TREND BADGE (innovation v2)
// ═══════════════════════════════════════════════════════════════════════

function TrendBadge({
  trend,
  pct,
}: {
  trend: "positive" | "negative" | "flat";
  pct: number;
}) {
  return (
    <span className="rqi-trend" data-trend={trend}>
      {trend === "positive" ? (
        <TrendingUp size={10} aria-hidden="true" />
      ) : trend === "negative" ? (
        <TrendingDown size={10} aria-hidden="true" />
      ) : (
        <Minus size={10} aria-hidden="true" />
      )}
      <span>
        {pct >= 0 ? "+" : ""}{pct}%
      </span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INSIGHT SECTION (enhanced v2)
// ═══════════════════════════════════════════════════════════════════════

function InsightSection({
  sectionType,
  items,
}: {
  sectionType: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  const cfg = SECTION_CONFIG[sectionType];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div className="rqi-section" data-section-type={sectionType}>
      <h4 className="rqi-section-title">
        <div className="rqi-section-icon" data-section-type={sectionType}>
          <Icon size={12} aria-hidden="true" />
        </div>
        <span>{cfg.label}</span>
        <span className="rqi-section-count">{items.length}</span>
      </h4>
      <ul className="rqi-section-list">
        {items.map((item, i) => (
          <li
            key={i}
            className="rqi-section-item"
            style={
              {
                "--stagger-i": i,
              } as React.CSSProperties
            }
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// METRIC CELL
// ═══════════════════════════════════════════════════════════════════════

function MetricCell({
  metricType,
  icon,
  value,
  label,
  trend,
}: {
  metricType: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  trend?: { trend: "positive" | "negative" | "flat"; pct: number } | null;
}) {
  return (
    <div className="rqi-metric-cell" data-metric-type={metricType}>
      <div className="rqi-metric-icon">{icon}</div>
      <div className="rqi-metric-content">
        <span className="rqi-metric-value">{value}</span>
        <span className="rqi-metric-label">{label}</span>
      </div>
      {trend && (
        <TrendBadge trend={trend.trend} pct={trend.pct} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SATISFACTION GAUGE
// ═══════════════════════════════════════════════════════════════════════

function SatisfactionGauge({
  value,
  reducedMotion,
  size = "full",
}: {
  value: number;
  reducedMotion: boolean;
  size?: "mini" | "full";
}) {
  const clamped = Math.min(5, Math.max(0, value));
  const pct = (clamped / 5) * 100;
  const level = getSatisfactionLevel(clamped);

  if (size === "mini") {
    return (
      <div className="rqi-sat-mini" data-satisfaction-level={level}>
        <div className="rqi-sat-mini-track">
          <div
            className="rqi-sat-mini-fill"
            data-satisfaction-level={level}
            style={
              {
                "--sat-pct": `${pct}%`,
                "--sat-delay": reducedMotion ? "0ms" : "0.3s",
              } as React.CSSProperties
            }
          />
        </div>
        <span className="rqi-sat-mini-val" data-satisfaction-level={level}>
          {clamped.toFixed(1)}
        </span>
      </div>
    );
  }

  return (
    <div className="rqi-satisfaction" data-satisfaction-level={level}>
      <div className="rqi-satisfaction-header">
        <span className="rqi-satisfaction-label">
          Satisfacción Promedio
        </span>
        <span
          className="rqi-satisfaction-value"
          data-satisfaction-level={level}
        >
          {clamped.toFixed(1)}/5
        </span>
      </div>
      <div className="rqi-satisfaction-track">
        <div
          className="rqi-satisfaction-fill"
          data-satisfaction-level={level}
          style={
            {
              "--sat-pct": `${pct}%`,
              "--sat-delay": reducedMotion ? "0ms" : "0.3s",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════

function InsightDetailPanel({
  insight,
  previousInsight,
  reducedMotion,
}: {
  insight: QuarterlyInsight;
  previousInsight: QuarterlyInsight | null;
  reducedMotion: boolean;
}) {
  const statusCfg = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[insight.status];
  const periodCfg = (INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[insight.period];

  const maxParticipation = useMemo(
    () => Math.max(...insight.top_activities.map((a) => a.participation), 1),
    [insight.top_activities],
  );

  const comparison = useMemo(
    () => compareQuarters(insight, previousInsight),
    [insight, previousInsight],
  );

  return (
    <div
      className="rqi-detail-panel"
      data-status={insight.status}
      role="region"
      aria-label={`Detalle del informe ${periodCfg?.label} ${insight.year}`}
    >
      {/* Header */}
      <div className="rqi-detail-header">
        <div className="rqi-detail-header-left">
          <h3 className="rqi-detail-title">
            Informe {periodCfg?.label} {insight.year}
          </h3>
          <span className="rqi-detail-subtitle">
            Generado el{" "}
            {new Date(insight.created_at).toLocaleDateString("es-CR")}
          </span>
        </div>
        <span className="rqi-badge" data-status={insight.status}>
          {statusCfg?.label ?? insight.status}
        </span>
      </div>

      {/* Summary */}
      <p className="rqi-detail-summary">{insight.summary}</p>

      {/* Metrics grid with trend comparison */}
      <div className="rqi-detail-section">
        <span className="rqi-detail-section-title">Métricas Clave</span>
        <div className="rqi-metrics-grid">
          <MetricCell
            metricType="members"
            icon={<Users size={14} aria-hidden="true" />}
            value={insight.total_members_active.toLocaleString()}
            label="Socios Activos"
            trend={comparison?.members ?? null}
          />
          <MetricCell
            metricType="events"
            icon={<CalendarDays size={14} aria-hidden="true" />}
            value={String(insight.events_held)}
            label="Eventos Realizados"
            trend={null}
          />
          <MetricCell
            metricType="attendance"
            icon={<TrendingUp size={14} aria-hidden="true" />}
            value={insight.avg_event_attendance.toFixed(1)}
            label="Asistencia Promedio"
            trend={comparison?.attendance ?? null}
          />
          <MetricCell
            metricType="revenue"
            icon={<DollarSign size={14} aria-hidden="true" />}
            value={formatCurrency(insight.revenue_total)}
            label="Revenue Total"
            trend={comparison?.revenue ?? null}
          />
        </div>
      </div>

      {/* Satisfaction gauge */}
      <div className="rqi-detail-section">
        <SatisfactionGauge
          value={insight.member_satisfaction_avg}
          reducedMotion={reducedMotion}
          size="full"
        />
      </div>

      {/* Top Activities — CSS bar chart (enhanced v2) */}
      {insight.top_activities.length > 0 && (
        <div className="rqi-detail-section">
          <span className="rqi-detail-section-title">
            Actividades Destacadas
          </span>
          <div className="rqi-chart">
            {insight.top_activities.map((activity, i) => (
              <div
                key={activity.name}
                className="rqi-chart-row"
                style={
                  {
                    "--stagger-i": i,
                    "--bar-pct": `${(activity.participation / maxParticipation) * 100}%`,
                    "--bar-delay": reducedMotion
                      ? "0ms"
                      : `${i * 80 + 200}ms`,
                  } as React.CSSProperties
                }
              >
                <span className="rqi-chart-rank">{i + 1}</span>
                <span className="rqi-chart-label">{activity.name}</span>
                <div className="rqi-chart-track">
                  <div className="rqi-chart-fill" />
                </div>
                <span className="rqi-chart-val">
                  {activity.participation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Three insight sections */}
      <div className="rqi-sections-grid">
        <InsightSection
          sectionType="achievement"
          items={insight.key_achievements}
        />
        <InsightSection
          sectionType="improvement"
          items={insight.areas_for_improvement}
        />
        <InsightSection
          sectionType="recommendation"
          items={insight.recommendations}
        />
      </div>

      {/* Timestamps */}
      <div className="rqi-detail-timestamps">
        <span>
          <CalendarDays size={10} aria-hidden="true" />
          Creado:{" "}
          {new Date(insight.created_at).toLocaleDateString("es-CR")}
        </span>
        {insight.updated_at && (
          <span>
            Actualizado:{" "}
            {new Date(insight.updated_at).toLocaleDateString("es-CR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════════

function InsightMobileCard({
  insight,
  isExpanded,
  onToggle,
  reducedMotion,
}: {
  insight: QuarterlyInsight;
  isExpanded: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}) {
  const statusCfg = (SUGGESTION_STATUS_CONFIG as Record<string, { label: string }>)[insight.status];
  const periodCfg = (INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[insight.period];

  return (
    <div className="rqi-card" data-status={insight.status}>
      <Button
        variant="unstyled"
        type="button"
        className="rqi-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="rqi-card-header-left">
          <h4 className="rqi-card-period">
            {periodCfg?.label} {insight.year}
          </h4>
          <span className="rqi-badge" data-status={insight.status}>
            {statusCfg?.label ?? insight.status}
          </span>
        </div>
        <div className="rqi-card-header-right">
          {isExpanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </div>
      </Button>

      <div className="rqi-card-stats">
        <div className="rqi-card-stat">
          <span className="rqi-card-stat-label">Socios</span>
          <span className="rqi-card-stat-value rqi-card-stat-value--mono">
            {insight.total_members_active.toLocaleString()}
          </span>
        </div>
        <div className="rqi-card-stat">
          <span className="rqi-card-stat-label">Eventos</span>
          <span className="rqi-card-stat-value rqi-card-stat-value--mono">
            {insight.events_held}
          </span>
        </div>
        <div className="rqi-card-stat">
          <span className="rqi-card-stat-label">Asist.</span>
          <span className="rqi-card-stat-value rqi-card-stat-value--mono">
            {insight.avg_event_attendance.toFixed(1)}
          </span>
        </div>
        <div className="rqi-card-stat">
          <span className="rqi-card-stat-label">Satisfacción</span>
          <SatisfactionGauge
            value={insight.member_satisfaction_avg}
            reducedMotion={reducedMotion}
            size="mini"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function QuarterlyInsights() {
  const prefersReduced = useReducedMotion();

  // ── State ─────────────────────────────────────────────────────────
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedPeriod, setSelectedPeriod] = useState<InsightPeriod>(
    InsightPeriod.Q1,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── List query (auto-load) ────────────────────────────────────────
  const { data: insightsData, isLoading } =
    useMCPQuery<QuarterlyInsightsListResponse>(
      "proactive_recommendation",
      "generate_quarterly_insights",
      { action: "list" },
      { staleTime: 60_000 },
    );

  // ── Generate mutation ─────────────────────────────────────────────
  const generateMutation = useMCPMutation(
    "proactive_recommendation",
    "generate_quarterly_insights",
    {
      onSuccess: () => {
        showToast({
          type: "success",
          message: `Informe ${selectedPeriod} ${selectedYear} generado correctamente.`,
        });
        setShowGenerateForm(false);
      },
    },
  );

  // ── Handlers ──────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    generateMutation.mutate({
      action: "generate",
      year: selectedYear,
      period: selectedPeriod,
    });
  }, [generateMutation, selectedYear, selectedPeriod]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleTimelineSelect = useCallback((id: string) => {
    setExpandedId(id);
  }, []);

  const insights = insightsData?.insights ?? [];

  // ── Sorted insights (year desc, period desc) ──────────────────────
  const sortedInsights = useMemo(() => {
    return [...insights].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return getPeriodOrder(b.period) - getPeriodOrder(a.period);
    });
  }, [insights]);

  // ── Expanded insight + previous for comparison ────────────────────
  const expandedInsight = useMemo(
    () => sortedInsights.find((i) => i.id === expandedId) ?? null,
    [sortedInsights, expandedId],
  );

  const previousInsight = useMemo(() => {
    if (!expandedInsight) return null;
    const idx = sortedInsights.findIndex((i) => i.id === expandedId);
    return idx >= 0 && idx < sortedInsights.length - 1
      ? sortedInsights[idx + 1]
      : null;
  }, [sortedInsights, expandedId, expandedInsight]);

  // ── Years with reports ────────────────────────────────────────────
  const yearsWithReports = useMemo(() => {
    const years = new Set<number>();
    for (const ins of sortedInsights) {
      years.add(ins.year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [sortedInsights]);

  // ── Summary stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (sortedInsights.length === 0) return null;
    const latest = sortedInsights[0];
    return {
      total: sortedInsights.length,
      latestPeriod: `${(INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[latest.period]?.label} ${latest.year}`,
      avgSatisfaction: latest.member_satisfaction_avg,
    };
  }, [sortedInsights]);

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-rqi">
        <div className="rqi-loading">
          <div className="rqi-skeleton rqi-skeleton--header" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rqi-skeleton rqi-skeleton--row"
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
      className="glass-rqi"
      role="region"
      aria-label="Insights trimestrales"
    >
      {/* ── Header strip ───────────────────────────────────────────── */}
      <div className="rqi-header-strip">
        <div className="rqi-header-info">
          <span className="rqi-header-count">
            {sortedInsights.length} informe
            {sortedInsights.length !== 1 ? "s" : ""} disponible
            {sortedInsights.length !== 1 ? "s" : ""}
          </span>
          {stats && (
            <div className="rqi-header-stats">
              <span
                className="rqi-header-stat"
                data-variant="latest"
              >
                Último: {stats.latestPeriod}
              </span>
              <span
                className="rqi-header-stat"
                data-variant="satisfaction"
                data-satisfaction-level={getSatisfactionLevel(
                  stats.avgSatisfaction,
                )}
              >
                Satisfacción: {stats.avgSatisfaction.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => setShowGenerateForm((prev) => !prev)}
        >
          {showGenerateForm ? "Cancelar" : "Generar Informe"}
        </Button>
      </div>

      {/* ── Year timeline navigation (innovation v2) ───────────────── */}
      {yearsWithReports.length > 0 && (
        <div className="rqi-year-nav">
          {yearsWithReports.map((year) => (
            <div key={year} className="rqi-year-group">
              <span className="rqi-year-label">{year}</span>
              <YearTimeline
                year={year}
                insights={sortedInsights}
                expandedId={expandedId}
                onSelectInsight={handleTimelineSelect}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Generate form ──────────────────────────────────────────── */}
      {showGenerateForm && (
        <div className="rqi-generate-form">
          <div className="rqi-form-row">
            <div className="rqi-field">
              <label htmlFor="rqi-year" className="rqi-field-label">
                Año
              </label>
              <select
                id="rqi-year"
                className="rqi-select"
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number(e.target.value))
                }
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="rqi-field">
              <span className="rqi-field-label">Período</span>
              <div className="rqi-period-pills">
                {(
                  Object.values(InsightPeriod) as InsightPeriod[]
                ).map((p) => (
                  <Button
                    variant="unstyled"
                    key={p}
                    type="button"
                    className="rqi-period-pill"
                    data-active={
                      selectedPeriod === p ? "" : undefined
                    }
                    aria-pressed={selectedPeriod === p}
                    onClick={() => setSelectedPeriod(p)}
                  >
                    {(INSIGHT_PERIOD_CONFIG as Record<string, { label: string }>)[p]
                      ?.label ?? p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="rqi-form-actions">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? "Generando..."
                : `Generar ${selectedPeriod} ${selectedYear}`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {sortedInsights.length === 0 && !showGenerateForm && (
        <div className="rqi-empty-wrap">
          <EmptyState
            icon={
              <BarChart3 size={32} className="rqi-empty-icon" />
            }
            title="Sin informes trimestrales"
            description="Genere su primer informe de insights trimestrales."
            action={
              <Button
                variant="primary"
                onClick={() => setShowGenerateForm(true)}
              >
                Generar Informe
              </Button>
            }
          />
        </div>
      )}

      {/* ── Insights list ──────────────────────────────────────────── */}
      {sortedInsights.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="rqi-table-wrap">
            <table className="rqi-table" role="table">
              <thead>
                <tr className="rqi-table-header-row">
                  <th className="rqi-th">Período</th>
                  <th className="rqi-th">Estado</th>
                  <th className="rqi-th rqi-th--right">Socios</th>
                  <th className="rqi-th rqi-th--right">Eventos</th>
                  <th className="rqi-th rqi-th--right">Asistencia</th>
                  <th className="rqi-th rqi-th--right">Revenue</th>
                  <th className="rqi-th rqi-th--right">Satisfacción</th>
                  <th className="rqi-th rqi-th--narrow" />
                </tr>
              </thead>
              <tbody>
                {sortedInsights.map(
                  (insight: QuarterlyInsight, idx: number) => {
                    const isExpanded = expandedId === insight.id;
                    const statusCfg = (
                      SUGGESTION_STATUS_CONFIG as Record<
                        string,
                        { label: string }
                      >
                    )[insight.status];
                    const periodCfg = (
                      INSIGHT_PERIOD_CONFIG as Record<
                        string,
                        { label: string }
                      >
                    )[insight.period];

                    return (
                      <tr
                        key={insight.id}
                        className="rqi-table-row"
                        data-expanded={
                          isExpanded ? "" : undefined
                        }
                        data-status={insight.status}
                        onClick={() => toggleExpand(insight.id)}
                        role="row"
                        aria-expanded={isExpanded}
                        style={
                          {
                            "--stagger-i": idx,
                          } as React.CSSProperties
                        }
                      >
                        <td className="rqi-td rqi-td--period">
                          {periodCfg?.label} {insight.year}
                        </td>
                        <td className="rqi-td">
                          <span
                            className="rqi-badge"
                            data-status={insight.status}
                          >
                            {statusCfg?.label ?? insight.status}
                          </span>
                        </td>
                        <td className="rqi-td rqi-td--right rqi-td--mono">
                          {insight.total_members_active.toLocaleString()}
                        </td>
                        <td className="rqi-td rqi-td--right rqi-td--mono">
                          {insight.events_held}
                        </td>
                        <td className="rqi-td rqi-td--right rqi-td--mono">
                          {insight.avg_event_attendance.toFixed(1)}
                        </td>
                        <td className="rqi-td rqi-td--right rqi-td--mono">
                          {formatCurrency(insight.revenue_total)}
                        </td>
                        <td className="rqi-td rqi-td--right">
                          <SatisfactionGauge
                            value={insight.member_satisfaction_avg}
                            reducedMotion={prefersReduced}
                            size="mini"
                          />
                        </td>
                        <td className="rqi-td rqi-td--center">
                          {isExpanded ? (
                            <ChevronUp
                              size={14}
                              aria-hidden="true"
                              className="rqi-expand-icon"
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                              aria-hidden="true"
                              className="rqi-expand-icon"
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

          {/* Mobile cards */}
          <div className="rqi-mobile-cards">
            {sortedInsights.map((insight: QuarterlyInsight) => (
              <InsightMobileCard
                key={insight.id}
                insight={insight}
                isExpanded={expandedId === insight.id}
                onToggle={() => toggleExpand(insight.id)}
                reducedMotion={prefersReduced}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Expanded detail panel ──────────────────────────────────── */}
      {expandedInsight && (
        <InsightDetailPanel
          insight={expandedInsight}
          previousInsight={previousInsight}
          reducedMotion={prefersReduced}
        />
      )}
    </div>
  );
}