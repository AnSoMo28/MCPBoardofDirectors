// src/features/communications/components/CommunicationAnalytics.tsx
// ═══════════════════════════════════════════════════════════
// CommunicationAnalytics V2 — El Análisis (Restructured)
// Namespace: glass-comm-analytics
//
// Architecture:
//   lib/analyticsIntelligence.ts  — pure functions + config + types
//   hooks/useCommunicationAnalytics.ts — data fetching + derived state
//   components/CommunicationAnalytics.tsx — presentation (this file)
//
// 10 innovations: Anomaly Detection, Receptivity Heatmap,
//   Channel Radar, Period Deltas, Diversification Score,
//   AI Insights (proactive), Content Matrix, Reach Suggestions,
//   Trend Sparkline + Forecast Cone, Velocity Monitor
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  Send, TrendingUp, Users, Clock, Brain, RefreshCw,
  Zap, AlertTriangle, ArrowRight,
  Radio, FileText, Activity, BarChart3, Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useCommunicationAnalytics } from "../hooks/useCommunicationAnalytics";
import {
  PERIOD_OPTIONS,
  TYPE_LABELS,
  PRIORITY_SORT,
  SEVERITY_LABELS,
  VELOCITY_LABELS,
  type Anomaly,
  type VelocityData,
  type TrendData,
  type Suggestion,
} from "../lib/analyticsIntelligence";
import type {
  CommunicationInsightsResponse,
  CommunicationIntelligenceInsight,
  CommunicationAnalyticsData,
} from "../types";
import {
  INSIGHT_CATEGORY_CONFIG,
  INSIGHT_PRIORITY_CONFIG,
} from "../types";
import "./CommunicationAnalytics.css";

/* ══════════════════════════════════════════════════════════
   Icon Maps (presentation concern — LucideIcon)
   ══════════════════════════════════════════════════════════ */

const KPI_ICONS: Record<string, LucideIcon> = {
  total: Send,
  rate: TrendingUp,
  recipients: Users,
  "best-day": Clock,
  "best-hour": Clock,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  timing: Clock,
  channel: Radio,
  audience: Users,
  content: FileText,
  frequency: Activity,
  risk: AlertTriangle,
  opportunity: Lightbulb,
};

/* ══════════════════════════════════════════════════════════
   SUB-COMP 1: Anomaly Strip
   ══════════════════════════════════════════════════════════ */

function AnomalyStrip({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return null;

  return (
    <div className="analytics__anomaly-strip">
      <div className="analytics__anomaly-header">
        <AlertTriangle size={16} />
        <span className="analytics__anomaly-count">
          {anomalies.length} anomalía{anomalies.length > 1 ? "s" : ""} detectada{anomalies.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="analytics__anomaly-list">
        {anomalies.map((a, idx) => (
          <div
            key={a.id}
            className="analytics__anomaly-card"
            data-severity={a.severity}
            style={{ "--stagger-i": idx } as CSSProperties}
          >
            <div className="analytics__anomaly-accent" data-severity={a.severity} />
            <div className="analytics__anomaly-body">
              <span className="analytics__anomaly-severity" data-severity={a.severity}>
                {SEVERITY_LABELS[a.severity]}
              </span>
              <h4 className="analytics__anomaly-title">{a.title}</h4>
              <p className="analytics__anomaly-detail">{a.detail}</p>
              {a.metric && <span className="analytics__anomaly-metric">{a.metric}</span>}
              <p className="analytics__anomaly-suggestion">
                <ArrowRight size={12} /> {a.suggestion}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 2: AI Insights (proactive auto-trigger)
   ══════════════════════════════════════════════════════════ */

function AIInsightsSection({
  autoTrigger,
  anomalyCount,
}: {
  autoTrigger: boolean;
  anomalyCount: number;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    if (autoTrigger && anomalyCount >= 2 && !autoTriggered) {
      setShouldFetch(true);
      setAutoTriggered(true);
    }
  }, [autoTrigger, anomalyCount, autoTriggered]);

  const insightsQ = useMCPQuery<CommunicationInsightsResponse>(
    "communication",
    "communication_insights",
    {},
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const insights: CommunicationIntelligenceInsight[] = insightsQ.data?.insights ?? [];
  const summary: string = insightsQ.data?.summary ?? "";

  const sortedInsights = useMemo(
    () => [...insights].sort((a, b) => (PRIORITY_SORT[a.priority] ?? 99) - (PRIORITY_SORT[b.priority] ?? 99)),
    [insights],
  );

  /* CTA */
  if (!shouldFetch) {
    return (
      <div className="analytics__section-card analytics__ai-cta">
        <div className="analytics__ai-cta-row">
          <div className="analytics__ai-cta-icon"><Brain size={24} /></div>
          <div className="analytics__ai-cta-text">
            <h3 className="analytics__section-title">Insights AI</h3>
            <p className="analytics__section-sub">Motor de AI para análisis profundo de comunicaciones</p>
          </div>
          <button className="analytics__generate-btn" onClick={() => setShouldFetch(true)}>
            <Brain size={16} /><span>Generar Análisis</span>
          </button>
        </div>
      </div>
    );
  }

  /* Loading */
  if (insightsQ.isLoading) {
    return (
      <div className="analytics__section-card">
        <div className="analytics__ai-loading">
          <Brain size={20} className="analytics__ai-spin" />
          <span>{autoTriggered ? "AI activado por anomalías — analizando..." : "Analizando comunicaciones..."}</span>
        </div>
        <div className="analytics__skeleton-grid analytics__skeleton-grid--3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="analytics__skeleton analytics__skeleton--card" />
          ))}
        </div>
      </div>
    );
  }

  /* Error */
  if (insightsQ.isError) {
    return (
      <div className="analytics__section-card">
        <div className="analytics__error-inline">
          <AlertTriangle size={18} />
          <span>Error al generar análisis.</span>
          <button className="analytics__retry-btn" onClick={() => insightsQ.refetch()}>Reintentar</button>
        </div>
      </div>
    );
  }

  /* Loaded */
  return (
    <div className="analytics__ai-loaded">
      <div className="analytics__ai-header">
        <div>
          <div className="analytics__ai-title-row">
            <Brain size={18} />
            <h3 className="analytics__section-title">
              {autoTriggered ? "Análisis AI Automático" : "Análisis AI Completado"}
            </h3>
          </div>
          <p className="analytics__section-sub">
            {sortedInsights.length} insights{autoTriggered ? " — activado por anomalías detectadas" : ""}
          </p>
        </div>
        <button className="analytics__refresh-btn" onClick={() => insightsQ.refetch()}>
          <RefreshCw size={14} /><span>Regenerar</span>
        </button>
      </div>

      {summary && <div className="analytics__ai-summary"><p>{summary}</p></div>}

      <div className="analytics__insight-grid">
        {sortedInsights.map((ins, idx) => {
          const catCfg = (INSIGHT_CATEGORY_CONFIG as Record<string, { label: string }>)[ins.category] ?? INSIGHT_CATEGORY_CONFIG.opportunity;
          const priCfg = (INSIGHT_PRIORITY_CONFIG as Record<string, { label: string }>)[ins.priority] ?? INSIGHT_PRIORITY_CONFIG.medium;
          const Icon = CATEGORY_ICONS[ins.category] ?? Zap;

          return (
            <div key={ins.id} className="analytics__insight-card" data-priority={ins.priority} style={{ "--stagger-i": idx } as CSSProperties}>
              <div className="analytics__insight-accent" data-priority={ins.priority} />
              <div className="analytics__insight-body">
                <div className="analytics__insight-badges">
                  <span className="analytics__cat-icon" data-cat={ins.category}><Icon size={14} /></span>
                  <span className="analytics__cat-label" data-cat={ins.category}>{catCfg.label}</span>
                  <span className="analytics__pri-badge" data-priority={ins.priority}>{priCfg.label}</span>
                </div>
                <h4 className="analytics__insight-title">{ins.title}</h4>
                <p className="analytics__insight-desc">{ins.description}</p>
                {ins.metric && <div className="analytics__insight-metric"><span>{ins.metric}</span></div>}
                <div className="analytics__confidence-row">
                  <span className="analytics__confidence-label">Confianza</span>
                  <span className="analytics__confidence-value">{ins.confidence}%</span>
                </div>
                <div className="analytics__confidence-track">
                  <div className="analytics__confidence-fill" style={{ "--confidence": `${ins.confidence}%`, "--stagger-i": idx } as CSSProperties} />
                </div>
                <div className="analytics__insight-rec">
                  <ArrowRight size={12} /><span>{ins.recommendation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 3: Trend Sparkline + Forecast Cone (SVG)
   ══════════════════════════════════════════════════════════ */

function TrendSparkline({
  dailyVolume,
  trend,
}: {
  dailyVolume: CommunicationAnalyticsData["daily_volume"];
  trend: TrendData;
}) {
  if (dailyVolume.length < 2) return null;

  const sorted = [...dailyVolume].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const forecastN = trend.forecast.length;
  const totalN = n + forecastN;

  const W = 800, H = 200;
  const PT = 28, PB = 32, PL = 36, PR = 80;
  const DW = W - PL - PR;
  const DH = H - PT - PB;

  const allValues = [
    ...sorted.map((d) => d.count),
    ...trend.forecast.map((f) => f.upper),
  ];
  const max = Math.max(...allValues, 1);
  const xStep = DW / Math.max(totalN - 1, 1);

  const points = sorted.map((d, i) => ({
    x: PL + i * xStep,
    y: PT + DH - (d.count / max) * DH,
    count: d.count,
    date: d.date,
  }));

  const lineStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaStr = `${points[0].x},${PT + DH} ${lineStr} ${points[points.length - 1].x},${PT + DH}`;

  const lastHist = points[points.length - 1];
  const forecastPoints = trend.forecast.map((f, i) => ({
    x: PL + (n + i) * xStep,
    centerY: PT + DH - (f.predicted / max) * DH,
    upperY: PT + DH - (f.upper / max) * DH,
    lowerY: PT + DH - (f.lower / max) * DH,
  }));

  const forecastCenterStr = [
    { x: lastHist.x, y: lastHist.y },
    ...forecastPoints.map((p) => ({ x: p.x, y: p.centerY })),
  ].map((p) => `${p.x},${p.y}`).join(" ");

  const coneStr = [
    ...forecastPoints.map((p) => `${p.x},${p.upperY}`),
    ...forecastPoints.slice().reverse().map((p) => `${p.x},${p.lowerY}`),
  ].join(" ");

  const gridSteps = [0, 0.5, 1];
  const gridLines = gridSteps.map((r) => ({ y: PT + DH * (1 - r), value: Math.round(max * r) }));
  const peakIdx = sorted.reduce((mi, d, i, arr) => (d.count > arr[mi].count ? i : mi), 0);
  const xLabelIdxs = new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]);

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Tendencia de Volumen</h3>
          <p className="analytics__section-sub">{n} días de actividad + proyección 7 días</p>
        </div>
        <span className="analytics__trend-badge" data-direction={trend.direction}>
          {trend.direction === "ascending" ? "↑ Ascendente" : trend.direction === "descending" ? "↓ Descendente" : "→ Estable"}
        </span>
      </div>
      <div className="analytics__sparkline-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="analytics__sparkline-svg" role="img" aria-label="Tendencia de volumen diario con proyección">
          {gridLines.map((g) => (
            <g key={g.value}>
              <line x1={PL} y1={g.y} x2={W - PR} y2={g.y} className="analytics__sparkline-grid" />
              <text x={PL - 6} y={g.y + 4} className="analytics__sparkline-ylabel">{g.value}</text>
            </g>
          ))}
          <line x1={lastHist.x} y1={PT} x2={lastHist.x} y2={PT + DH} className="analytics__sparkline-divider" />
          {forecastN > 0 && <polygon points={coneStr} className="analytics__sparkline-cone" data-direction={trend.direction} />}
          {forecastN > 0 && <polyline points={forecastCenterStr} className="analytics__sparkline-forecast" data-direction={trend.direction} />}
          <polygon points={areaStr} className="analytics__sparkline-area" />
          <polyline points={lineStr} className="analytics__sparkline-line" />
          {points.map((p, i) =>
            (i === peakIdx || i % Math.max(1, Math.floor(n / 8)) === 0) && (
              <circle key={i} cx={p.x} cy={p.y} r={i === peakIdx ? 5 : 2} className="analytics__sparkline-dot" data-peak={i === peakIdx} />
            ),
          )}
          {points.map((p, i) =>
            xLabelIdxs.has(i) && (
              <text key={i} x={p.x} y={H - 6} className="analytics__sparkline-xlabel">{p.date.slice(5)}</text>
            ),
          )}
          {forecastN > 0 && (
            <text x={PL + (n + forecastN / 2) * xStep} y={PT - 8} className="analytics__sparkline-forecast-label" textAnchor="middle">
              Proyección 7d
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 4: Receptivity Heatmap
   ══════════════════════════════════════════════════════════ */

function ReceptivityHeatmap({
  distribution,
  bestHour,
}: {
  distribution: CommunicationAnalyticsData["hourly_distribution"];
  bestHour: string;
}) {
  const hourlyMap: Record<string, number> = {};
  distribution.forEach((h) => {
    hourlyMap[h.hour.replace(/:00$/, "").padStart(2, "0")] = h.count;
  });

  const maxCount = Math.max(...Object.values(hourlyMap), 1);
  const normalizedBest = bestHour.replace(/:00$/, "").padStart(2, "0");
  const hours = Array.from({ length: 24 }, (_, i) => {
    const key = String(i).padStart(2, "0");
    return { key, count: hourlyMap[key] ?? 0 };
  });

  function getLevel(count: number): string {
    if (count === 0) return "empty";
    const ratio = count / maxCount;
    if (ratio < 0.25) return "low";
    if (ratio < 0.5) return "medium";
    if (ratio < 0.75) return "high";
    return "peak";
  }

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Receptividad Horaria</h3>
          <p className="analytics__section-sub">Pico: {bestHour}</p>
        </div>
      </div>
      <div className="analytics__heatmap-grid">
        {hours.map((h, idx) => (
          <div
            key={h.key}
            className="analytics__heat-cell"
            data-level={getLevel(h.count)}
            data-best={h.key === normalizedBest}
            title={`${h.key}:00 — ${h.count} envíos`}
            style={{ "--stagger-i": idx } as CSSProperties}
          />
        ))}
      </div>
      <div className="analytics__heatmap-labels">
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 5: Channel Radar (SVG Pentagon)
   ══════════════════════════════════════════════════════════ */

function ChannelRadar({ scores, labels }: { scores: number[]; labels: string[] }) {
  const cx = 100, cy = 100, r = 70;
  const n = scores.length;
  const angles = labels.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);

  function ringPoints(ringR: number): string {
    return angles.map((angle) => {
      const x = cx + ringR * Math.cos(angle);
      const y = cy + ringR * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  }

  const dataStr = scores.map((score, i) => {
    const x = cx + r * score * Math.cos(angles[i]);
    const y = cy + r * score * Math.sin(angles[i]);
    return `${x},${y}`;
  }).join(" ");

  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Radar de Efectividad</h3>
          <p className="analytics__section-sub">5 dimensiones de salud comunicacional</p>
        </div>
      </div>
      <div className="analytics__radar-wrap">
        <svg viewBox="0 0 200 200" className="analytics__radar-svg" role="img" aria-label="Radar de efectividad comunicacional">
          {rings.map((ring) => <polygon key={ring} points={ringPoints(r * ring)} className="analytics__radar-ring" />)}
          {angles.map((angle, i) => (
            <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} className="analytics__radar-axis" />
          ))}
          <polygon points={dataStr} className="analytics__radar-fill" />
          <polygon points={dataStr} className="analytics__radar-line" />
          {scores.map((score, i) => (
            <circle key={i} cx={cx + r * score * Math.cos(angles[i])} cy={cy + r * score * Math.sin(angles[i])} r={3} className="analytics__radar-dot" />
          ))}
          {labels.map((label, i) => {
            const lx = cx + (r + 18) * Math.cos(angles[i]);
            const ly = cy + (r + 18) * Math.sin(angles[i]);
            const deg = (angles[i] * 180) / Math.PI;
            const anchor = deg > -10 && deg < 10 ? "start" : deg > 170 || deg < -170 ? "end" : "middle";
            return <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" className="analytics__radar-label">{label}</text>;
          })}
        </svg>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 6: Diversification Gauge (SVG)
   ══════════════════════════════════════════════════════════ */

function DiversificationGauge({
  score,
  dominantChannel,
  dominantPct,
}: {
  score: number;
  dominantChannel: string;
  dominantPct: number;
}) {
  const W = 200, H = 110;
  const gx = W / 2, gy = H - 10, gr = 75;
  const scoreAngle = Math.PI - (score / 100) * Math.PI;
  const scoreX = gx + gr * Math.cos(scoreAngle);
  const scoreY = gy - gr * Math.sin(scoreAngle);
  const level = score >= 60 ? "good" : score >= 35 ? "warning" : "danger";

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Diversificación</h3>
          <p className="analytics__section-sub">Distribución entre canales</p>
        </div>
      </div>
      <div className="analytics__diversification-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="analytics__diversification-svg" role="img" aria-label={`Diversificación: ${score} de 100`}>
          <path d={`M ${gx - gr} ${gy} A ${gr} ${gr} 0 0 1 ${gx + gr} ${gy}`} fill="none" className="analytics__diversification-track" strokeWidth={10} />
          <path d={`M ${gx - gr} ${gy} A ${gr} ${gr} 0 0 1 ${scoreX} ${scoreY}`} fill="none" className="analytics__diversification-fill" data-level={level} strokeWidth={10} strokeLinecap="round" />
          <text x={gx} y={gy - 28} textAnchor="middle" className="analytics__diversification-score">{score}</text>
          <text x={gx} y={gy - 12} textAnchor="middle" className="analytics__diversification-unit">/100</text>
          <text x={gx} y={gy + 4} textAnchor="middle" className="analytics__diversification-detail">{dominantChannel}: {dominantPct}%</text>
        </svg>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 7: Content Matrix
   ══════════════════════════════════════════════════════════ */

function ContentMatrix({ typeBreakdown }: { typeBreakdown: CommunicationAnalyticsData["type_breakdown"] }) {
  if (typeBreakdown.length === 0) return null;
  const maxPct = Math.max(...typeBreakdown.map((t) => t.percentage), 1);

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Por Tipo de Contenido</h3>
          <p className="analytics__section-sub">Distribución y performance</p>
        </div>
      </div>
      <div className="analytics__bar-list">
        {typeBreakdown.map((t, idx) => (
          <div key={t.type} className="analytics__bar-row" style={{ "--stagger-i": idx } as CSSProperties}>
            <span className="analytics__bar-label analytics__bar-label--wide">{TYPE_LABELS[t.type] ?? t.type}</span>
            <div className="analytics__bar-track">
              <div className="analytics__bar-fill" data-type={t.type} style={{ "--bar-width": `${(t.percentage / maxPct) * 100}%` } as CSSProperties} />
            </div>
            <span className="analytics__bar-count">{t.count}</span>
            <span className="analytics__bar-pct">{t.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 8: Velocity Section
   ══════════════════════════════════════════════════════════ */

function VelocitySection({ velocity }: { velocity: VelocityData }) {
  const maxRef = Math.max(velocity.average * 2, velocity.current, 1);
  const currentPct = (velocity.current / maxRef) * 100;
  const avgPct = (velocity.average / maxRef) * 100;

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Velocidad de Envío</h3>
          <p className="analytics__section-sub">Últimos 7 días vs. promedio</p>
        </div>
        <span className="analytics__velocity-badge" data-level={velocity.level}>
          {VELOCITY_LABELS[velocity.level]}
        </span>
      </div>
      <div className="analytics__velocity-bars">
        <div className="analytics__velocity-row">
          <span className="analytics__velocity-label">Actual</span>
          <div className="analytics__bar-track">
            <div className="analytics__bar-fill analytics__velocity-current" data-level={velocity.level} style={{ "--bar-width": `${currentPct}%` } as CSSProperties} />
          </div>
          <span className="analytics__bar-count">{velocity.current.toFixed(1)}</span>
        </div>
        <div className="analytics__velocity-row">
          <span className="analytics__velocity-label">Promedio</span>
          <div className="analytics__bar-track">
            <div className="analytics__bar-fill analytics__velocity-avg" style={{ "--bar-width": `${avgPct}%` } as CSSProperties} />
          </div>
          <span className="analytics__bar-count">{velocity.average.toFixed(1)}</span>
        </div>
      </div>
      <div className="analytics__velocity-ratio">
        <span>Ratio: </span>
        <span className="analytics__velocity-ratio-value" data-level={velocity.level}>{velocity.ratio.toFixed(2)}x</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 9: Status Funnel
   ══════════════════════════════════════════════════════════ */

function StatusFunnel({ analytics }: { analytics: CommunicationAnalyticsData }) {
  const { status_breakdown, total_sent } = analytics;
  if (total_sent === 0) return null;

  const rows = [
    { label: "Enviados", count: status_breakdown.sent, dataAttr: "sent" },
    { label: "Entregados", count: status_breakdown.delivered, dataAttr: "delivered" },
    { label: "Fallidos", count: status_breakdown.failed, dataAttr: "failed" },
    { label: "Cancelados", count: status_breakdown.cancelled, dataAttr: "cancelled" },
  ];
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title">Ciclo de Vida</h3>
          <p className="analytics__section-sub">Distribución por estado</p>
        </div>
      </div>
      <div className="analytics__bar-list">
        {rows.map((row, idx) => (
          <div key={row.label} className="analytics__bar-row" style={{ "--stagger-i": idx } as CSSProperties}>
            <span className="analytics__bar-label">{row.label}</span>
            <div className="analytics__bar-track">
              <div className="analytics__bar-fill" data-status={row.dataAttr} style={{ "--bar-width": `${(row.count / maxCount) * 100}%` } as CSSProperties} />
            </div>
            <span className="analytics__bar-count">{row.count}</span>
            <span className="analytics__bar-pct">{((row.count / total_sent) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SUB-COMP 10: Reach Suggestions
   ══════════════════════════════════════════════════════════ */

function ReachSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="analytics__section-card">
      <div className="analytics__section-header">
        <div>
          <h3 className="analytics__section-title"><Lightbulb size={16} /> Sugerencias de Alcance</h3>
          <p className="analytics__section-sub">Recomendaciones basadas en tus datos</p>
        </div>
      </div>
      <div className="analytics__suggestion-list">
        {suggestions.map((s, idx) => (
          <div key={s.id} className="analytics__suggestion-card" data-priority={s.priority} style={{ "--stagger-i": idx } as CSSProperties}>
            <div className="analytics__suggestion-accent" data-priority={s.priority} />
            <div className="analytics__suggestion-body">
              <h4 className="analytics__suggestion-title">{s.title}</h4>
              <p className="analytics__suggestion-detail">{s.detail}</p>
              <p className="analytics__suggestion-action"><ArrowRight size={12} /> {s.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export function CommunicationAnalytics() {
  const {
    period,
    setPeriod,
    analytics,
    isLoading,
    isError,
    dataUpdatedAt,
    refetch,
    anomalies,
    diversification,
    trend,
    velocity,
    deltas,
    radar,
    suggestions,
    dominantChannel,
    kpis,
  } = useCommunicationAnalytics();

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="glass-comm-analytics">
        <div className="analytics__skeleton-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="analytics__skeleton analytics__skeleton--kpi" />
          ))}
        </div>
        <div className="analytics__skeleton analytics__skeleton--chart" />
        <div className="analytics__skeleton analytics__skeleton--chart" />
      </div>
    );
  }

  /* ── Error ── */
  if (isError) {
    return (
      <div className="glass-comm-analytics">
        <div className="analytics__section-card">
          <div className="analytics__error">
            <AlertTriangle size={24} />
            <h3>Error al cargar analytics</h3>
            <p>No pudimos obtener los datos. Intentá de nuevo.</p>
            <button className="analytics__retry-btn" onClick={refetch}>Reintentar</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!analytics || analytics.total_sent === 0) {
    return (
      <div className="glass-comm-analytics">
        <div className="analytics__header">
          <div>
            <h2 className="analytics__page-title">Analytics Profundo</h2>
            <p className="analytics__page-sub">Seleccioná un período</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="analytics__period-select"
            aria-label="Periodo de análisis"
          >
            {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="analytics__section-card">
          <div className="analytics__empty">
            <BarChart3 size={32} />
            <h3>Sin datos de comunicaciones</h3>
            <p>Enviá tu primer comunicado para ver analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loaded ── */
  return (
    <div className="glass-comm-analytics" data-loaded="true">
      {/* Header */}
      <div className="analytics__header">
        <div>
          <h2 className="analytics__page-title">Analytics Profundo</h2>
          <p className="analytics__page-sub">
            {analytics.total_sent.toLocaleString()} comunicaciones · Inteligencia activa
            {anomalies.length > 0 && (
              <span className="analytics__anomaly-inline"> · {anomalies.length} anomalía{anomalies.length > 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="analytics__period-select"
          aria-label="Periodo de análisis"
        >
          {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Innovation 1: Anomaly Strip */}
      <AnomalyStrip anomalies={anomalies} />

      {/* Innovation 4: KPIs + Deltas */}
      <div className="analytics__kpi-grid">
        {kpis.map((kpi, idx) => {
          const KpiIcon = KPI_ICONS[kpi.key] ?? Send;
          return (
            <div key={kpi.label} className="analytics__kpi-card" style={{ "--stagger-i": idx } as CSSProperties}>
              <div className="analytics__kpi-icon" data-token={kpi.token}><KpiIcon size={16} /></div>
              <span className="analytics__kpi-label">{kpi.label}</span>
              <span className="analytics__kpi-value">{kpi.value}</span>
              <span className="analytics__kpi-sub">{kpi.sub}</span>
              {deltas !== null && kpi.key === "total" && (
                <span className="analytics__kpi-delta" data-direction={deltas.direction}>
                  {deltas.direction === "up" ? "↑" : deltas.direction === "down" ? "↓" : "→"} {Math.abs(deltas.pctChange)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <hr className="analytics__divider" />

      {/* Innovation 6: AI Insights (proactive) */}
      <AIInsightsSection autoTrigger={true} anomalyCount={anomalies.length} />

      <hr className="analytics__divider" />

      {/* Innovation 9: Trend + Forecast */}
      <TrendSparkline dailyVolume={analytics.daily_volume ?? []} trend={trend} />

      {/* Innovation 2 + 3: Heatmap + Radar */}
      <div className="analytics__two-col">
        <ReceptivityHeatmap distribution={analytics.hourly_distribution ?? []} bestHour={analytics.best_hour_to_send} />
        <ChannelRadar scores={radar.scores} labels={radar.labels} />
      </div>

      {/* Innovation 7 + 5: Content + Diversification */}
      <div className="analytics__two-col">
        <ContentMatrix typeBreakdown={analytics.type_breakdown ?? []} />
        <DiversificationGauge score={diversification} dominantChannel={dominantChannel.label} dominantPct={dominantChannel.pct} />
      </div>

      {/* Innovation 10 + Status: Velocity + Funnel */}
      <div className="analytics__two-col">
        <VelocitySection velocity={velocity} />
        <StatusFunnel analytics={analytics} />
      </div>

      {/* Innovation 8: Reach Suggestions */}
      <ReachSuggestions suggestions={suggestions} />

      {/* Last Updated */}
      <div className="analytics__last-updated">
        <span>Datos actualizados: {new Date(dataUpdatedAt).toLocaleString("es-CR")}</span>
      </div>
    </div>
  );
}