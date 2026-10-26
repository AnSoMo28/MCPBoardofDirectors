/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessTrends.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Trends
   Historical trends: activity breakdown chart, key metrics
   with deltas, goals summary, top activity spotlight.

   Proposals: P1 Observatory · P2 Compliance · P3 Glass Chart ·
     P4 Dashboard Strip · P5 Pulse Ring · P6 Simplify ·
     P7 Activity Spotlight · P8 Glass CSS
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Activity,
  Clock,
  Flame,
  Zap,
  Target,
} from "lucide-react";

import { StatCard } from "@/shared/components/layout/StatCard";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatNumber } from "@/shared/lib/utils";
import { CHART_COLORS } from "@/shared/lib/chartTheme";

import { ACTIVITY_TYPE_CONFIG } from "../types";
import type { WellnessReport } from "../types";
import "./WellnessTrends.css";

// ═══════════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════════

interface ChartDataItem {
  label: string;
  count: number;
  total_minutes: number;
  total_calories: number;
  percentage: number;
  fill: string;
  activity_type: string;
}

interface WellnessTrendsProps {
  report: WellnessReport;
  previousReport?: WellnessReport;
}

// ═══════════════════════════════════════════════════════════════
// §2  Goal Status Config
// ═══════════════════════════════════════════════════════════════

const GOAL_STATUS_COLORS: Record<string, string> = {
  active: "var(--color-emerald-400)",
  completed: "var(--color-teal-400)",
  paused: "var(--color-amber-400)",
  abandoned: "var(--color-rose-400)",
};

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: "activos",
  completed: "completados",
  paused: "pausados",
  abandoned: "abandonados",
};

// ═══════════════════════════════════════════════════════════════
// §3  Custom Tooltip
// ═══════════════════════════════════════════════════════════════

function ActivityTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ChartDataItem | undefined;
  if (!data) return null;

  return (
    <div className="wt__tooltip">
      <p className="wt__tooltip-title">{data.label}</p>
      <div className="wt__tooltip-body">
        <p>{data.count} actividades · {data.percentage}%</p>
        <p>{data.total_minutes.toLocaleString()} min</p>
        <p>{data.total_calories.toLocaleString()} cal</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §4  Goal Pulse Ring (P5)
// ═══════════════════════════════════════════════════════════════

function GoalPulseRings({ entries }: { entries: [string, number][] }) {
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <svg viewBox="0 0 100 100" className="wt__pulse-rings" role="img" aria-label="Objetivos por estado">
      {entries.map(([status, count], i) => {
        const pct = count / max;
        const r = 12 + pct * 28;
        const color = GOAL_STATUS_COLORS[status] || "var(--color-silver-500)";
        const cx = 30 + i * 20;
        const cy = 50;
        return (
          <g key={status}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              opacity="0.4"
              className="wt__pulse-ring"
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              opacity="0.06"
            />
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="wt__pulse-count"
            >
              {count}
            </text>
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              className="wt__pulse-label"
            >
              {GOAL_STATUS_LABELS[status] || status}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessTrends({ report, previousReport }: WellnessTrendsProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useBreakpoint();

  // ── Chart data ──
  const chartData = useMemo<ChartDataItem[]>(() => {
    if (!report.activity_breakdown?.length) return [];
    return [...report.activity_breakdown]
      .sort((a, b) => b.count - a.count)
      .map((item, index) => ({
        label:
          ACTIVITY_TYPE_CONFIG[item.activity_type]?.label ||
          item.activity_type,
        count: item.count,
        total_minutes: item.total_minutes,
        total_calories: item.total_calories,
        percentage: item.percentage,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        activity_type: item.activity_type,
      }));
  }, [report.activity_breakdown]);

  // ── Deltas ──
  const deltas = useMemo(() => {
    if (!previousReport) return null;
    return {
      activities: report.total_activities - previousReport.total_activities,
      minutes: report.total_minutes - previousReport.total_minutes,
      calories: report.total_calories - previousReport.total_calories,
      streak: report.streak_days - previousReport.streak_days,
    };
  }, [report, previousReport]);

  // ── Goals ──
  const goalEntries = Object.entries(report.goals_summary || {}) as [string, number][];
  const hasGoals = goalEntries.length > 0;

  // ── Top activity (P7) ──
  const topActivity = chartData[0];
  const top3 = chartData.slice(0, 3);

  // ── Empty ──
  if (!report.activity_breakdown?.length) {
    return (
      <EmptyState
        icon={<Activity size={28} />}
        title="Sin actividades registradas"
        description="Las tendencias aparecerán cuando se registren actividades de bienestar."
      />
    );
  }

  return (
    <div className="glass-wt">

      {/* ═══ Key Metrics — Dashboard Strip (P4) ═══ */}
      <div className="wt__strip">
        <StatCard
          title="Actividades"
          value={formatNumber(report.total_activities)}
          icon={<Activity className="w-5 h-5" />}
          change={deltas?.activities}
          changeLabel={deltas ? (deltas.activities > 0 ? "↑" : deltas.activities < 0 ? "↓" : "—") : undefined}
        />
        <StatCard
          title="Minutos"
          value={formatNumber(report.total_minutes)}
          icon={<Clock className="w-5 h-5" />}
          change={deltas?.minutes}
          changeLabel={deltas ? (deltas.minutes > 0 ? "↑" : deltas.minutes < 0 ? "↓" : "—") : undefined}
        />
        <StatCard
          title="Calorías"
          value={formatNumber(report.total_calories)}
          icon={<Flame className="w-5 h-5" />}
          change={deltas?.calories}
          changeLabel={deltas ? (deltas.calories > 0 ? "↑" : deltas.calories < 0 ? "↓" : "—") : undefined}
        />
        <StatCard
          title="Racha"
          value={`${report.streak_days}d`}
          icon={<Zap className="w-5 h-5" />}
          change={deltas?.streak}
          changeLabel={deltas ? (deltas.streak > 0 ? "↑" : deltas.streak < 0 ? "↓" : "—") : undefined}
        />
      </div>

      {/* ═══ Activity Breakdown Chart (P3) ═══ */}
      <div className="wt__chart-card">
        <div className="wt__chart-header">
          <h3 className="wt__chart-title">Frecuencia por Actividad</h3>
          <span className="wt__chart-period">
            {report.period_start} — {report.period_end}
          </span>
        </div>
        <div className="wt__chart-body">
          <ResponsiveContainer width="100%" height={isMobile ? 200 : 320}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                top: 5,
                right: 20,
                bottom: 5,
                left: isMobile ? 70 : 100,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "var(--color-silver-500)", fontSize: isMobile ? 10 : 11, fontFamily: "var(--font-mono)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={isMobile ? 65 : 95}
                tick={{ fill: "var(--color-silver-300)", fontSize: isMobile ? 10 : 11, fontFamily: "var(--font-ui)" }}
              />
              <Tooltip
                content={<ActivityTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                dataKey="count"
                name="Actividades"
                radius={[0, 4, 4, 0]}
                barSize={isMobile ? 16 : 24}
                animationDuration={prefersReducedMotion ? 0 : 800}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Bottom Row: Top Activity + Goals ═══ */}
      <div className="wt__details">

        {/* Top Activity Spotlight (P7) */}
        <div className="wt__top-card">
          <h4 className="wt__top-label">Actividad Principal</h4>
          {topActivity && (
            <>
              <p className="wt__top-name">{topActivity.label}</p>
              <span className="wt__top-rank">#1</span>
              <p className="wt__top-sub">Más frecuente del período</p>
              {/* Mini bars */}
              <div className="wt__top-bars">
                {top3.map((item, i) => (
                  <div key={i} className="wt__top-bar-row">
                    <span className="wt__top-bar-label">{item.label}</span>
                    <div className="wt__top-bar-track">
                      <div
                        className="wt__top-bar-fill"
                        style={{
                          width: `${(item.count / (top3[0]?.count || 1)) * 100}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <span className="wt__top-bar-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Goals Summary (P5) */}
        <div className="wt__goals-card">
          <div className="wt__goals-header">
            <Target size={14} />
            <h4 className="wt__goals-label">Objetivos</h4>
          </div>
          {hasGoals ? (
            <GoalPulseRings entries={goalEntries} />
          ) : (
            <p className="wt__goals-empty">Sin objetivos configurados</p>
          )}
        </div>
      </div>
    </div>
  );
}