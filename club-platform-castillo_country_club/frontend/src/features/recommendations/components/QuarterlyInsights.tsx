// src/features/recommendations/components/QuarterlyInsights.tsx
// Fase 10, B2 — CRUD + generación on-demand de insights trimestrales

import { useState, useCallback } from "react";
import {
  BarChart3,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  CalendarDays,
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { formatCurrency } from "@/shared/lib/utils";

import {
  CHART_COLORS,
  TOOLTIP_STYLE,
  AXIS_TICK,
  CHART,
} from "@/shared/lib/chartTheme";

import {
  InsightPeriod,
  INSIGHT_PERIOD_CONFIG,
  SUGGESTION_STATUS_CONFIG,
  type QuarterlyInsight,
  type QuarterlyInsightsListResponse,
} from "../types";

// ── Years for selector ─────────────────────────────────────

const AVAILABLE_YEARS = [2023, 2024, 2025, 2026];

// ── Main Component ─────────────────────────────────────────

export function QuarterlyInsights() {
  const prefersReduced = useReducedMotion();
  const { isMobile } = useBreakpoint();

  // ── State ──
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedPeriod, setSelectedPeriod] = useState<InsightPeriod>(
    InsightPeriod.Q1,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Level 1: List auto-load ──
  const {
    data: insightsData,
    isLoading,
  } = useMCPQuery<QuarterlyInsightsListResponse>(
    "proactive_recommendation",
    "generate_quarterly_insights",
    { action: "list" },
    { staleTime: 60_000 },
  );

  // ── Generate mutation ──
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

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({
      action: "generate",
      year: selectedYear,
      period: selectedPeriod,
    });
  }, [generateMutation, selectedYear, selectedPeriod]);

  const insights = insightsData?.insights ?? [];

  // ── Toggle expand ──
  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [],
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-[var(--radius-md)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-16 rounded-[var(--radius-md)]"
          />
        ))}
      </div>
    );
  }

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Insights trimestrales"
    >
      {/* ── Header actions ── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-silver-400)]">
          {insights.length} informe{insights.length !== 1 ? "s" : ""} disponible
          {insights.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={showGenerateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          onClick={() => setShowGenerateForm((prev) => !prev)}
        >
          {showGenerateForm ? "Cancelar" : "Generar Informe"}
        </Button>
      </div>

      {/* ── Generate Form ── */}
      {showGenerateForm && (
        <Card
          className={`p-5 space-y-4 ${
            prefersReduced
              ? ""
              : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Year */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-[var(--radius-md)]
                           bg-[var(--color-surface-1)] border border-white/[0.08]
                           text-sm font-ui text-[var(--color-silver-200)]
                           focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
              >
                {AVAILABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-ui font-medium text-[var(--color-silver-400)] mb-1.5">
                Período
              </label>
              <div className="flex gap-2">
                {Object.values(InsightPeriod).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriod(p)}
                    className={`flex-1 h-10 rounded-[var(--radius-md)] text-xs font-ui font-medium
                                border transition-colors
                                focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]
                                ${
                                  selectedPeriod === p
                                    ? "bg-[var(--color-gold-400)] text-[var(--color-abyss)] border-transparent"
                                    : "bg-[var(--color-surface-1)] text-[var(--color-silver-400)] border-white/[0.08] hover:border-white/[0.12]"
                                }`}
                    aria-pressed={selectedPeriod === p}
                  >
                    {INSIGHT_PERIOD_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<BarChart3 className="w-4 h-4" />}
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? "Generando..."
                : `Generar ${selectedPeriod} ${selectedYear}`}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Empty state ── */}
      {insights.length === 0 && !showGenerateForm && (
        <EmptyState
          icon={
            <BarChart3 className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin informes trimestrales"
          description="Genere su primer informe de insights trimestrales."
          action={<Button onClick={() => setShowGenerateForm(true)}>Generar Informe</Button>}
        />
      )}

      {/* ── Insights List ── */}
      {insights.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="rounded-[var(--radius-lg)] border border-white/[0.08] overflow-hidden">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="bg-[var(--color-surface-1)]">
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Período
                    </th>
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Socios
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Eventos
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Asistencia
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Satisfacción
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {insights.map((insight) => {
                    const isExpanded = expandedId === insight.id;
                    const statusCfg =
                      SUGGESTION_STATUS_CONFIG[insight.status];

                    return (
                      <tr
                        key={insight.id}
                        className={`border-t border-white/[0.06] cursor-pointer
                                    hover:bg-[var(--color-surface-1)] transition-colors
                                    ${isExpanded ? "bg-[var(--color-surface-1)]" : ""}`}
                        onClick={() => toggleExpand(insight.id)}
                        role="row"
                        aria-expanded={isExpanded}
                      >
                        <td className="px-4 py-3 font-ui font-semibold text-[var(--color-silver-100)]">
                          {INSIGHT_PERIOD_CONFIG[insight.period]?.label}{" "}
                          {insight.year}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusCfg?.variant ?? "default"} size="sm">
                            {statusCfg?.label ?? insight.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {insight.total_members_active.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {insight.events_held}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {insight.avg_event_attendance.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {insight.member_satisfaction_avg.toFixed(1)}/5
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {insights.map((insight) => {
              const isExpanded = expandedId === insight.id;
              const statusCfg =
                SUGGESTION_STATUS_CONFIG[insight.status];

              return (
                <Card
                  key={insight.id}
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(insight.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-ui font-semibold text-[var(--color-silver-100)]">
                      {INSIGHT_PERIOD_CONFIG[insight.period]?.label}{" "}
                      {insight.year}
                    </h4>
                    <Badge variant={statusCfg?.variant ?? "default"} size="sm">
                      {statusCfg?.label ?? insight.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--color-silver-500)]">Socios: </span>
                      <span className="font-mono text-[var(--color-silver-300)]">
                        {insight.total_members_active.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-silver-500)]">Eventos: </span>
                      <span className="font-mono text-[var(--color-silver-300)]">
                        {insight.events_held}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-silver-500)]">Asist.: </span>
                      <span className="font-mono text-[var(--color-silver-300)]">
                        {insight.avg_event_attendance.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--color-silver-500)]">Sat.: </span>
                      <span className="font-mono text-[var(--color-silver-300)]">
                        {insight.member_satisfaction_avg.toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-center">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Expanded Detail Panel ── */}
      {expandedId && (
        <InsightDetailPanel
          insight={insights.find((i) => i.id === expandedId) ?? null}
          isMobile={isMobile}
          prefersReduced={prefersReduced}
        />
      )}

      {/* Stagger + slideDown keyframes */}
      {!prefersReduced && (
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────

function InsightDetailPanel({
  insight,
  isMobile,
  prefersReduced,
}: {
  insight: QuarterlyInsight | null;
  isMobile: boolean;
  prefersReduced: boolean;
}) {
  if (!insight) return null;

  const chartData = insight.top_activities.map((a) => ({
    name: a.name.length > 18 ? a.name.slice(0, 16) + "…" : a.name,
    participation: a.participation,
  }));

  return (
    <Card
      className={`p-5 space-y-5 ${
        prefersReduced
          ? ""
          : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
      }`}
      role="region"
      aria-label={`Detalle del informe ${insight.period} ${insight.year}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-ui font-semibold text-[var(--color-silver-100)] text-base">
            Informe {insight.period} {insight.year}
          </h3>
          <p className="text-xs text-[var(--color-silver-500)] mt-0.5">
            Generado el{" "}
            {new Date(insight.created_at).toLocaleDateString("es-CR")}
          </p>
        </div>
        <Badge
          variant={
            SUGGESTION_STATUS_CONFIG[insight.status]?.variant ?? "default"
          }
        >
          {SUGGESTION_STATUS_CONFIG[insight.status]?.label ?? insight.status}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-[var(--color-silver-300)] leading-relaxed">
        {insight.summary}
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricBlock
          icon={<Users className="w-4 h-4" />}
          value={insight.total_members_active.toLocaleString()}
          label="Socios Activos"
        />
        <MetricBlock
          icon={<CalendarDays className="w-4 h-4" />}
          value={String(insight.events_held)}
          label="Eventos Realizados"
        />
        <MetricBlock
          icon={<TrendingUp className="w-4 h-4" />}
          value={insight.avg_event_attendance.toFixed(1)}
          label="Asistencia Promedio"
        />
        <MetricBlock
          icon={<DollarSign className="w-4 h-4" />}
          value={formatCurrency(insight.revenue_total)}
          label="Revenue Total"
        />
      </div>

      {/* Top Activities Chart */}
      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-3">
            Actividades Destacadas
          </p>
          <div className="w-full" style={{ minHeight: isMobile ? 150 : 200 }}>
            <ResponsiveContainer width="100%" height={isMobile ? 150 : 200}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 4,
                  right: 16,
                  bottom: 4,
                  left: isMobile ? 4 : 8,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART.gridStroke}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  {...AXIS_TICK}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={isMobile ? 70 : 110}
                  tick={{
                    fill: CHART.axisTick,
                    fontSize: isMobile ? 10 : 11,
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [
                    `${value} participantes`,
                    "Participación",
                  ]}
                />
                <Bar
                  dataKey="participation"
                  fill={CHART_COLORS[0]}
                  radius={[0, 4, 4, 0]}
                  barSize={isMobile ? 14 : 18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Three sections: Achievements, Improvements, Recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Key Achievements */}
        {insight.key_achievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-[var(--color-emerald-400)]" />
              Logros Clave
            </p>
            <ul className="space-y-1.5">
              {insight.key_achievements.map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--color-silver-300)] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-emerald-400)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for Improvement */}
        {insight.areas_for_improvement.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-amber-400)]" />
              Áreas de Mejora
            </p>
            <ul className="space-y-1.5">
              {insight.areas_for_improvement.map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--color-silver-300)] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-amber-400)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insight.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[var(--color-gold-400)]" />
              Recomendaciones
            </p>
            <ul className="space-y-1.5">
              {insight.recommendations.map((item, i) => (
                <li
                  key={i}
                  className="text-xs text-[var(--color-silver-300)] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-gold-400)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Metric Block (sub-component) ───────────────────────────

function MetricBlock({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
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
