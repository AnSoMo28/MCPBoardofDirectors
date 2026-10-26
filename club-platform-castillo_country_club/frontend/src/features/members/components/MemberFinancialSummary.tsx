/**
 * MemberFinancialSummary — Financial Intelligence Portrait
 * Phase 30 — Block 4.5: What They're Worth + Where It's Going
 *
 * LTV sparkline from ltv_history (data the existing component IGNORES).
 * Gauge ring showing realization vs projection.
 * Spend velocity derived from history.
 * Each domain bar tells its story with trend context.
 *
 * The numbers don't just report — they TREND, they PROJECT, they ADVISE.
 */

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Skeleton } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMemberLTVAnalysis } from "../hooks/useMember360MCP";
import type { MemberTemperature } from "../types";
import type { MemberPredictions } from "../lib/memberPredictions";
import {
  getDomainLabel,
  getDomainIcon,
  LTV_TIER_DISPLAY,
  type LTVTier,
  type ActivityDomain,
} from "../types";

import "./MemberFinancialSummary.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface MemberFinancialSummaryProps {
  memberId: string;
  temperature?: MemberTemperature;
  predictions?: MemberPredictions;
  className?: string;
}

/** Local type — may or may not exist in MCP response */
interface LTVHistoryPoint {
  month: string;
  ltv: number;
  spend: number;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function compactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `₡${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₡${(value / 1_000).toFixed(0)}K`;
  return `₡${value.toFixed(0)}`;
}

function getDomainBarColor(domain: string): string {
  const map: Record<string, string> = {
    events: "var(--color-gold-400)",
    sports: "var(--color-teal-400)",
    wellness: "var(--color-emerald-400)",
    cultural: "var(--color-gold-300)",
    dining: "var(--color-terracotta-400)",
    guests: "var(--color-amber-400)",
    social: "var(--color-silver-300)",
    communications: "var(--color-sage-400)",
  };
  return map[domain] ?? "var(--color-silver-400)";
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

/** SVG ring gauge — shows realization % */
function GaugeRing({
  value,
  color,
  reduced,
}: {
  value: number;
  color: string;
  reduced: boolean;
}) {
  const R = 20;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - Math.min(value, 100) / 100);

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      className="glass-m360-finance__gauge-svg"
    >
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke="var(--color-surface-3)"
        strokeWidth="4"
      />
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={reduced ? offset : CIRC}
        transform="rotate(-90 24 24)"
        className={
          reduced ? "" : "glass-m360-finance__gauge-arc"
        }
        style={reduced ? { strokeDashoffset: offset } : undefined}
      />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-silver-200)"
        fontSize="10"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
}

/** LTV sparkline — built from ltv_history */
function LTVSparkline({
  history,
  reduced,
}: {
  history: LTVHistoryPoint[];
  reduced: boolean;
}) {
  if (history.length < 2) return null;

  const W = 140;
  const H = 44;
  const PAD = 3;
  const values = history.map((h) => h.ltv);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${H} L ${points[0].x.toFixed(1)},${H} Z`;

  const lastPt = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="glass-m360-finance__sparkline-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="m360-ltv-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="var(--color-gold-400)"
            stopOpacity="0.2"
          />
          <stop
            offset="100%"
            stopColor="var(--color-gold-400)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#m360-ltv-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-gold-400)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          reduced
            ? ""
            : "glass-m360-finance__sparkline-line"
        }
      />
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="2.5"
        fill="var(--color-gold-400)"
        className={
          reduced
            ? ""
            : "glass-m360-finance__sparkline-dot"
        }
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberFinancialSummary({ memberId, predictions, className }: MemberFinancialSummaryProps) {
  const reduced = useReducedMotion();
  const { data, isLoading, isError } = useMemberLTVAnalysis(memberId);

  // Extract ltv_history (may not exist in all MCP responses)
  const ltvHistory = useMemo(() => {
    if (!data) return null;
    const raw = "ltv_history" in data ? (data as unknown as { ltv_history?: unknown[] }).ltv_history : undefined;
    return Array.isArray(raw) ? (raw as LTVHistoryPoint[]) : null;
  }, [data]);

  // Spend velocity: recent 3 months vs previous 3 months
  const spendVelocity = useMemo(() => {
    if (!ltvHistory || ltvHistory.length < 4) return null;
    const recent = ltvHistory.slice(-3);
    const earlier = ltvHistory.slice(-6, -3);
    if (earlier.length === 0) return null;
    const recentAvg =
      recent.reduce((s, h) => s + h.spend, 0) / recent.length;
    const earlierAvg =
      earlier.reduce((s, h) => s + h.spend, 0) / earlier.length;
    if (earlierAvg === 0) return null;
    return ((recentAvg - earlierAvg) / earlierAvg) * 100;
  }, [ltvHistory]);

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-m360-finance space-y-4">
        <Skeleton className="h-28 rounded-[18px]" />
        <Skeleton className="h-48 rounded-[18px]" />
      </div>
    );
  }

  if (isError || !data) {
    return <SectionError title="Error cargando análisis financiero" />;
  }

  const tierDisplay = LTV_TIER_DISPLAY[data.ltv_tier as LTVTier];
  const TrendIcon =
    data.ltv_trend === "improving"
      ? TrendingUp
      : data.ltv_trend === "declining"
        ? TrendingDown
        : Minus;
  const trendColor =
    data.ltv_trend === "improving"
      ? "var(--color-emerald-400)"
      : data.ltv_trend === "declining"
        ? "var(--color-rose-400)"
        : "var(--color-silver-400)";

  const maxSpend = Math.max(
    ...data.spend_breakdown.map((s) => s.amount),
    1,
  );

  // Gauge: LTV as % of projection
  const gaugeValue = data.projection_12m
    ? Math.min((data.current_ltv / data.projection_12m) * 100, 100)
    : null;

  return (
    <div
      className={cn("glass-m360-finance", className)}
      data-ltv-trend={data.ltv_trend}
      data-ltv-tier={data.ltv_tier}
    >
      {/* ── Hero: Gauge + LTV + Sparkline ── */}
      <div className="glass-m360-finance__hero">
        {/* Gauge ring */}
        {gaugeValue !== null && (
          <div className="glass-m360-finance__gauge">
            <GaugeRing
              value={gaugeValue}
              color={trendColor}
              reduced={reduced}
            />
          </div>
        )}

        {/* LTV info */}
        <div className="glass-m360-finance__hero-info">
          <p className="glass-m360-finance__hero-label">
            Lifetime Value
          </p>
          <p className="glass-m360-finance__hero-value">
            {compactCurrency(data.current_ltv)}
          </p>
          <div className="glass-m360-finance__hero-meta">
            <span
              className="glass-m360-finance__hero-trend"
              style={{ color: trendColor }}
            >
              <TrendIcon className="w-3.5 h-3.5" />
              {data.ltv_trend === "improving"
                ? "Creciendo"
                : data.ltv_trend === "declining"
                  ? "Bajando"
                  : "Estable"}
            </span>
            {tierDisplay && (
              <span
                className="glass-m360-finance__hero-tier"
                style={{
                  color: tierDisplay.color,
                  background: tierDisplay.bgColor,
                }}
              >
                {tierDisplay.label}
              </span>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {ltvHistory && ltvHistory.length > 1 && (
          <div className="glass-m360-finance__sparkline">
            <LTVSparkline history={ltvHistory} reduced={reduced} />
            <span className="glass-m360-finance__sparkline-label">
              Evolución
            </span>
          </div>
        )}
      </div>

      {/* ── KPI Row ── */}
      <div className="glass-m360-finance__kpis">
        <div className="glass-m360-finance__kpi">
          <p className="glass-m360-finance__kpi-label">
            Gasto Mensual
          </p>
          <p className="glass-m360-finance__kpi-value">
            {compactCurrency(data.monthly_avg_spend)}
          </p>
          <span className="glass-m360-finance__kpi-sub">
            promedio / mes
          </span>
        </div>

        <div className="glass-m360-finance__kpi">
          <p className="glass-m360-finance__kpi-label">
            Proyección 12m
          </p>
          <p className="glass-m360-finance__kpi-value">
            {data.projection_12m != null
              ? compactCurrency(data.projection_12m)
              : "N/A"}
          </p>
          {data.projection_confidence != null && (
            <span className="glass-m360-finance__kpi-sub">
              Confianza: {Math.round(data.projection_confidence)}%
            </span>
          )}
        </div>

        <div className="glass-m360-finance__kpi">
          <p className="glass-m360-finance__kpi-label">
            vs Benchmark
          </p>
          <p className="glass-m360-finance__kpi-value">
            {data.benchmark_vs_tier != null ? (
              <span
                style={{
                  color:
                    data.benchmark_vs_tier >= 0
                      ? "var(--color-emerald-400)"
                      : "var(--color-rose-400)",
                }}
              >
                {data.benchmark_vs_tier >= 0 ? "+" : ""}
                {data.benchmark_vs_tier.toFixed(1)}%
              </span>
            ) : (
              "N/A"
            )}
          </p>
          <span className="glass-m360-finance__kpi-sub">
            percentil tier
          </span>
        </div>

        {spendVelocity !== null && (
          <div className="glass-m360-finance__kpi">
            <p className="glass-m360-finance__kpi-label">
              Velocidad
            </p>
            <p
              className="glass-m360-finance__kpi-value"
              style={{
                color:
                  spendVelocity > 5
                    ? "var(--color-emerald-400)"
                    : spendVelocity < -5
                      ? "var(--color-rose-400)"
                      : "var(--color-silver-300)",
              }}
            >
              {spendVelocity > 0 ? "+" : ""}
              {spendVelocity.toFixed(0)}%
            </p>
            <span className="glass-m360-finance__kpi-sub">
              vs trimestre anterior
            </span>
          </div>
        )}
      </div>

      {/* ── Spend Breakdown ── */}
      <div className="glass-m360-finance__breakdown">
        <h3 className="glass-m360-finance__section-title">
          <BarChart3 className="w-4 h-4 text-[var(--color-silver-400)]" />
          Desglose por Dominio
        </h3>
        <div className="glass-m360-finance__breakdown-list">
          {data.spend_breakdown
            .sort((a, b) => b.amount - a.amount)
            .map((item, i) => {
              const domain = item.domain as ActivityDomain;
              const barColor = getDomainBarColor(item.domain);
              const pct = (item.amount / maxSpend) * 100;

              return (
                <div
                  key={item.domain}
                  className="glass-m360-finance__bar-row"
                  style={
                    {
                      "--stagger-i": i,
                      "--bar-color": barColor,
                    } as React.CSSProperties
                  }
                >
                  <span className="glass-m360-finance__bar-icon">
                    {getDomainIcon(domain)}
                  </span>
                  <span className="glass-m360-finance__bar-label">
                    {getDomainLabel(domain)}
                  </span>
                  <div className="glass-m360-finance__bar-track">
                    <div
                      className={cn(
                        "glass-m360-finance__bar-fill",
                        !reduced &&
                          "glass-m360-finance__bar-fill--animated",
                      )}
                      style={{
                        width: `${Math.max(2, pct)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <span className="glass-m360-finance__bar-amount">
                    {compactCurrency(item.amount)}
                  </span>
                  <span className="glass-m360-finance__bar-pct">
                    {item.percentage}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── LTV History Chart ── */}
      {ltvHistory && ltvHistory.length > 2 && (
        <div className="glass-m360-finance__history">
          <h3 className="glass-m360-finance__section-title">
            <Calendar className="w-4 h-4 text-[var(--color-silver-400)]" />
            Evolución LTV
          </h3>
          <LTVHistoryChart history={ltvHistory} reduced={reduced} />
        </div>
      )}

      {/* ── Forward Projection ── */}
      {predictions?.ltvProjection && (
        <div className="glass-m360-finance__projection">
          <h3 className="glass-m360-finance__section-title">
            Proyección Forward
          </h3>
          <div className="glass-m360-finance__projection-grid">
            <div className="glass-m360-finance__projection-kpi">
              <p className="glass-m360-finance__projection-label">
                LTV Actual
              </p>
              <p className="glass-m360-finance__projection-value">
                {compactCurrency(predictions.ltvProjection.current)}
              </p>
            </div>
            <div className="glass-m360-finance__projection-kpi">
              <p className="glass-m360-finance__projection-label">
                Proyectado 12m
              </p>
              <p
                className="glass-m360-finance__projection-value"
                style={{
                  color:
                    predictions.ltvProjection.projected12m.estimate >=
                    predictions.ltvProjection.current
                      ? "var(--color-emerald-400)"
                      : "var(--color-rose-400)",
                }}
              >
                {compactCurrency(
                  predictions.ltvProjection.projected12m.estimate,
                )}
              </p>
            </div>
            <div className="glass-m360-finance__projection-kpi">
              <p className="glass-m360-finance__projection-label">
                Confianza 12m
              </p>
              <p className="glass-m360-finance__projection-value">
                {Math.round(
                  predictions.ltvProjection.projected12m.confidence *
                    100,
                )}
                %
              </p>
            </div>
            <div className="glass-m360-finance__projection-kpi">
              <p className="glass-m360-finance__projection-label">
                Meses trayect.
              </p>
              <p className="glass-m360-finance__projection-value">
                {predictions.ltvProjection.monthlyTrajectory.length}
              </p>
            </div>
          </div>

          {/* Domain predictions */}
          {predictions.ltvProjection.domainPredictions.length > 0 && (
            <div className="glass-m360-finance__projection-domains">
              <p className="glass-m360-finance__projection-domains-label">
                Predicción por dominio:
              </p>
              {predictions.ltvProjection.domainPredictions.map(
                (dp) => {
                  const domain = dp.domain as ActivityDomain;
                  return (
                    <div
                      key={dp.domain}
                      className="glass-m360-finance__projection-domain-row"
                    >
                      <span className="glass-m360-finance__projection-domain-icon">
                        {getDomainIcon(domain)}
                      </span>
                      <span className="glass-m360-finance__projection-domain-label">
                        {getDomainLabel(domain)}
                      </span>
                      <span className="glass-m360-finance__projection-domain-current">
                        {compactCurrency(dp.currentMonthly)}/m
                      </span>
                      <span className="glass-m360-finance__projection-domain-arrow">
                        →
                      </span>
                      <span
                        className="glass-m360-finance__projection-domain-predicted"
                        style={{
                          color:
                            dp.trend === "growing"
                              ? "var(--color-emerald-400)"
                              : dp.trend === "declining"
                                ? "var(--color-rose-400)"
                                : "var(--color-silver-300)",
                        }}
                      >
                        {compactCurrency(dp.predictedMonthly)}/m
                      </span>
                      <span className="glass-m360-finance__projection-domain-trend">
                        {dp.trend === "growing"
                          ? "↑"
                          : dp.trend === "declining"
                            ? "↓"
                            : "→"}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* Risk factors */}
          {predictions.ltvProjection.riskFactors.length > 0 && (
            <div className="glass-m360-finance__projection-risks">
              {predictions.ltvProjection.riskFactors.map((rf, i) => (
                <span
                  key={i}
                  className="glass-m360-finance__projection-assumption"
                >
                  ⚠ {rf}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Seasonality ── */}
      {(data.peak_month || data.low_month) && (
        <div className="glass-m360-finance__seasonality">
          {data.peak_month && (
            <div className="glass-m360-finance__season-card glass-m360-finance__season-card--peak">
              <TrendingUp className="w-4 h-4 text-[var(--color-emerald-400)]" />
              <div>
                <p className="glass-m360-finance__season-label">
                  Mes pico
                </p>
                <p className="glass-m360-finance__season-value">
                  {data.peak_month}
                </p>
              </div>
            </div>
          )}
          {data.low_month && (
            <div className="glass-m360-finance__season-card glass-m360-finance__season-card--low">
              <TrendingDown className="w-4 h-4 text-[var(--color-amber-400)]" />
              <div>
                <p className="glass-m360-finance__season-label">
                  Mes bajo
                </p>
                <p className="glass-m360-finance__season-value">
                  {data.low_month}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LTV HISTORY CHART — Full-width sparkline with month labels
// ═══════════════════════════════════════════════════════════════════════

function LTVHistoryChart({
  history,
  reduced,
}: {
  history: LTVHistoryPoint[];
  reduced: boolean;
}) {
  const W = 300;
  const H = 80;
  const PAD_X = 4;
  const PAD_Y = 4;
  const LABEL_H = 14;
  const chartH = H - LABEL_H;

  const values = history.map((h) => h.ltv);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2),
    y: PAD_Y + (1 - (v - min) / range) * (chartH - PAD_Y * 2),
  }));

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${chartH} L ${points[0].x.toFixed(1)},${chartH} Z`;

  // Month labels (show first, middle, last)
  const labels = [
    { idx: 0, label: history[0].month },
    { idx: Math.floor(history.length / 2), label: history[Math.floor(history.length / 2)].month },
    { idx: history.length - 1, label: history[history.length - 1].month },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="glass-m360-finance__history-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id="m360-ltv-history-fill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="var(--color-gold-400)"
            stopOpacity="0.15"
          />
          <stop
            offset="100%"
            stopColor="var(--color-gold-400)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill="url(#m360-ltv-history-fill)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-gold-400)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          reduced
            ? ""
            : "glass-m360-finance__history-line"
        }
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2"
          fill="var(--color-gold-400)"
          opacity={i === points.length - 1 ? 1 : 0.5}
        />
      ))}

      {/* Month labels */}
      {labels.map(({ idx, label }) => (
        <text
          key={idx}
          x={points[idx].x}
          y={H - 2}
          textAnchor="middle"
          fill="var(--color-silver-600)"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          {label.slice(5)}
        </text>
      ))}
    </svg>
  );
}