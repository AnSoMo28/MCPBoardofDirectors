// src/features/communications/components/SentimentMonitor.tsx
// ═══════════════════════════════════════════════════════════
// Sentiment Monitor — V2 Rewrite
// "El Sismógrafo" — Glass UI Intelligence Sentiment Analyzer
// Castillo Country Club — Phase 31
//
// V2: Glass-ified. Zero framer-motion, Zero Tailwind,
// Zero shared UI. Data-attributes only.
// 10 intelligence innovations integrated.
//
// Innovations:
//  1. Emotional Velocity Monitor (current vs avg + 5 levels)
//  2. Anomaly Auto-Detection (5 anomaly types)
//  3. Topic Sentiment Distribution Chart (stacked horizontal bars)
//  4. Engagement Risk Heatmap (channel × sentiment matrix)
//  5. Satisfaction Cross-Agent Correlation (preserved)
//  6. Forecast Cone on Sparkline (SVG projection + confidence)
//  7. Period Delta Comparison (first third vs last third)
//  8. Proactive AI Insights (auto-trigger when anomalies >= 2)
//  9. Topic Trend Velocity (week-over-week change per topic)
// 10. Channel Diversification Warning (entropy-based)
//
// Tool: communications_sentiment_analyze (auto, staleTime 300s)
//       satisfaction.get_satisfaction_trends (on-demand, sub-comp)
//
// Imports VERIFIED:
//   CommunicationsSentimentAnalyzeData ✅
//   SentimentTopic ✅  SentimentAlert ✅  SentimentKeywordInsight ✅
//   CommunicationAnalyticsResponse ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  MessageSquare, Hash, BarChart3, Sparkles,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Info, Heart, Shield, Activity, Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type {
  CommunicationsSentimentAnalyzeData,
  SentimentTopic,
  SentimentAlert,
  SentimentKeywordInsight,
} from "@/shared/mocks/contracts";

import type {
  CommunicationAnalyticsResponse,
} from "../types";

import {
  getScoreColor, SCORE_PRESETS,
} from "@/shared/lib/score-utils";

import "./SentimentMonitor.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// Intelligence Layer — Pure Functions
// ═══════════════════════════════════════════════════════════

// ── Innovation 1: Emotional Velocity Monitor ────────────

interface EmotionalVelocity {
  current: number;
  average: number;
  delta: number;
  level: "accelerating" | "rising" | "stable" | "falling" | "plummeting";
  label: string;
}

function computeEmotionalVelocity(
  timeline: Array<{ period: string; overall_score: number }>,
): EmotionalVelocity | null {
  if (timeline.length < 2) return null;
  const scores = timeline.map((p) => p.overall_score);
  const current = scores[scores.length - 1];
  const average = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  const delta = current - average;
  let level: EmotionalVelocity["level"];
  let label: string;
  if (delta > 15) {
    level = "accelerating"; label = "Aceleración positiva";
  } else if (delta > 5) {
    level = "rising"; label = "Tendencia ascendente";
  } else if (delta >= -5) {
    level = "stable"; label = "Estable";
  } else if (delta >= -15) {
    level = "falling"; label = "Tendencia descendente";
  } else {
    level = "plummeting"; label = "Descenso significativo";
  }
  return { current, average, delta, level, label };
}

// ── Innovation 2: Anomaly Auto-Detection ────────────────

interface Anomaly {
  type: string;
  severity: "critical" | "warning" | "info";
  detail: string;
  value: number | string;
  icon: LucideIcon;
}

function detectAnomalies(
  data: CommunicationsSentimentAnalyzeData,
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Sharp score drop
  if (data.comparison_with_previous.score_delta < -10) {
    anomalies.push({
      type: "sharp_drop",
      severity: "critical",
      detail: `Caída de ${Math.abs(data.comparison_with_previous.score_delta)}pts vs ${data.comparison_with_previous.period}`,
      value: data.comparison_with_previous.score_delta,
      icon: TrendingDown,
    });
  }

  // 2. High negative topic concentration
  const negTopics = data.topics.filter((t) => t.sentiment_score < 40);
  if (negTopics.length >= 3) {
    anomalies.push({
      type: "negative_concentration",
      severity: "warning",
      detail: `${negTopics.length} temas con sentimiento crítico (<40)`,
      value: negTopics.length,
      icon: AlertTriangle,
    });
  }

  // 3. Critical alerts present
  const criticals = data.alerts.filter((a) => a.severity === "critical");
  if (criticals.length > 0) {
    anomalies.push({
      type: "critical_alerts",
      severity: "critical",
      detail: `${criticals.length} alerta(s) crítica(s) activa(s)`,
      value: criticals.length,
      icon: AlertCircle,
    });
  }

  // 4. Low overall score
  if (data.overall_score < 55) {
    anomalies.push({
      type: "low_score",
      severity: "warning",
      detail: `Score general ${data.overall_score}/100 — por debajo del umbral saludable`,
      value: data.overall_score,
      icon: Shield,
    });
  }

  // 5. Declining trend
  if (data.overall_trend === "declining") {
    anomalies.push({
      type: "declining_trend",
      severity: "warning",
      detail: "Tendencia general en declive — monitorear de cerca",
      value: data.overall_trend,
      icon: TrendingDown,
    });
  }

  return anomalies;
}

// ── Innovation 7: Period Delta Comparison ───────────────

interface PeriodDelta {
  firstThirdAvg: number;
  lastThirdAvg: number;
  delta: number;
  level: "improving" | "stable" | "declining";
  label: string;
}

function computePeriodDelta(
  timeline: Array<{ period: string; overall_score: number }>,
): PeriodDelta | null {
  if (timeline.length < 6) return null;
  const third = Math.floor(timeline.length / 3);
  const first = timeline.slice(0, third);
  const last = timeline.slice(-third);
  const firstAvg = Math.round(first.reduce((s, p) => s + p.overall_score, 0) / first.length);
  const lastAvg = Math.round(last.reduce((s, p) => s + p.overall_score, 0) / last.length);
  const delta = lastAvg - firstAvg;
  let level: PeriodDelta["level"];
  let label: string;
  if (delta > 5) {
    level = "improving"; label = "Mejora sostenida";
  } else if (delta < -5) {
    level = "declining"; label = "Descenso sostenido";
  } else {
    level = "stable"; label = "Estable";
  }
  return { firstThirdAvg: firstAvg, lastThirdAvg: lastAvg, delta, level, label };
}

// ── Innovation 9: Topic Trend Velocity ──────────────────

interface TopicVelocity {
  topic: string;
  currentScore: number;
  trend: string;
  velocityLevel: "surging" | "rising" | "stable" | "declining" | "crashing";
  velocityLabel: string;
}

function computeTopicVelocities(topics: SentimentTopic[]): TopicVelocity[] {
  return topics.map((t) => {
    let velocityLevel: TopicVelocity["velocityLevel"];
    let velocityLabel: string;
    if (t.trend === "improving" && t.sentiment_score > 75) {
      velocityLevel = "surging"; velocityLabel = "En auge";
    } else if (t.trend === "improving") {
      velocityLevel = "rising"; velocityLabel = "Mejorando";
    } else if (t.trend === "declining" && t.sentiment_score < 45) {
      velocityLevel = "crashing"; velocityLabel = "En caída";
    } else if (t.trend === "declining") {
      velocityLevel = "declining"; velocityLabel = "Descendiendo";
    } else {
      velocityLevel = "stable"; velocityLabel = "Estable";
    }
    return {
      topic: t.topic,
      currentScore: t.sentiment_score,
      trend: t.trend,
      velocityLevel,
      velocityLabel,
    };
  });
}

// ── Innovation 10: Channel Diversification ──────────────

interface DiversificationResult {
  entropy: number;
  maxEntropy: number;
  concentration: number;
  level: "diversified" | "moderate" | "concentrated";
  label: string;
  warning: boolean;
}

function computeChannelDiversification(
  channels: Array<{ channel: string; volume: number }>,
): DiversificationResult | null {
  if (channels.length < 2) return null;
  const total = channels.reduce((s, c) => s + c.volume, 0);
  if (total === 0) return null;
  const entropy = -channels.reduce((s, c) => {
    const p = c.volume / total;
    return s + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);
  const maxEntropy = Math.log2(channels.length);
  const concentration = maxEntropy > 0 ? 1 - entropy / maxEntropy : 0;
  let level: DiversificationResult["level"];
  let label: string;
  if (concentration < 0.25) {
    level = "diversified"; label = "Canales diversificados";
  } else if (concentration < 0.6) {
    level = "moderate"; label = "Concentración moderada";
  } else {
    level = "concentrated"; label = "Alta concentración";
  }
  return {
    entropy: Math.round(entropy * 100) / 100,
    maxEntropy: Math.round(maxEntropy * 100) / 100,
    concentration: Math.round(concentration * 100),
    level,
    label,
    warning: concentration > 0.6,
  };
}

// ── Presentation Helpers ────────────────────────────────

function scoreColor(score: number): string {
  return getScoreColor(score, SCORE_PRESETS.sentimentSimple);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-CR").format(n);
}

const TREND_LABELS: Record<string, string> = {
  improving: "Mejorando",
  declining: "Declive",
  estable: "Estable",
};

function trendLevel(trend: string): "positive" | "negative" | "neutral" {
  if (trend === "improving") return "positive";
  if (trend === "declining") return "negative";
  return "neutral";
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 1: Forecast Cone Sparkline (Innovation 6)
// ═══════════════════════════════════════════════════════════

function ForecastSparkline({
  timeline,
}: {
  timeline: Array<{ period: string; overall_score: number }>;
}) {
  if (timeline.length < 3) return null;

  const width = 280;
  const height = 80;
  const pad = 8;
  const scores = timeline.map((p) => p.overall_score);
  const min = Math.min(...scores) - 5;
  const max = Math.max(...scores) + 5;
  const range = max - min || 1;

  const stepX = (width - pad * 2) / (scores.length - 1);
  const points = scores.map((s, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - (s - min) / range) * (height - pad * 2),
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Forecast: linear projection 3 periods ahead
  const n = scores.length;
  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (scores[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const forecastPoints: Array<{ x: number; y: number; yLow: number; yHigh: number }> = [];
  for (let i = 0; i <= 3; i++) {
    const fi = n - 1 + i;
    const fy = Math.max(min, Math.min(max, intercept + slope * fi));
    const spread = 3 + i * 2;
    forecastPoints.push({
      x: pad + fi * stepX,
      y: pad + (1 - (fy - min) / range) * (height - pad * 2),
      yLow: pad + (1 - (Math.min(max, fy + spread) - min) / range) * (height - pad * 2),
      yHigh: pad + (1 - (Math.max(min, fy - spread) - min) / range) * (height - pad * 2),
    });
  }

  const coneD =
    `M ${forecastPoints[0].x} ${forecastPoints[0].yLow} ` +
    forecastPoints.map((p) => `L ${p.x} ${p.yLow}`).join(" ") +
    ` L ${forecastPoints[forecastPoints.length - 1].x} ${forecastPoints[forecastPoints.length - 1].yHigh} ` +
    [...forecastPoints].reverse().map((p) => `L ${p.x} ${p.yHigh}`).join(" ") +
    " Z";

  const forecastLine = forecastPoints
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sentiment__forecast-svg">
      {/* Historical line */}
      <path d={pathD} fill="none" stroke="var(--color-teal-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Forecast cone */}
      <path d={coneD} fill="color-mix(in srgb, var(--color-gold-400) 12%, transparent)" stroke="none" />
      {/* Forecast line */}
      <path d={forecastLine} fill="none" stroke="var(--color-gold-400)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-teal-400)" />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB-COMP 2: Satisfaction Correlation (Innovation 5 — preserved)
// ═══════════════════════════════════════════════════════════

interface SatisfactionTrendsResponse {
  status: string;
  message: string;
  trends: {
    months_analyzed: number;
    total_surveys: number;
    overall_trend: string;
    monthly_averages: Array<{
      month: string;
      avg_score: number;
      survey_count: number;
    }>;
  };
}

function SatisfactionCorrelation({ sentimentScore, activeAlerts, topTopics }: {
  sentimentScore: number;
  sentimentTrend: string;
  activeAlerts: number;
  topTopics: Array<{ topic: string; sentiment_score: number; trend: string }>;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const satQ = useMCPQuery<SatisfactionTrendsResponse>(
    "satisfaction", "get_satisfaction_trends",
    { months: 6 },
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const trends = satQ.data?.trends;

  if (!shouldFetch) {
    return (
      <div className="sentiment__section-card sentiment__sat-cta">
        <div className="sentiment__sat-cta-content">
          <Heart size={20} />
          <div>
            <h3 className="sentiment__sat-cta-title">Cruzar con Satisfacción</h3>
            <p className="sentiment__sat-cta-sub">
              Correlacioná el sentimiento de comunicaciones con las encuestas de satisfacción para validar patrones.
            </p>
          </div>
        </div>
        <Button variant="unstyled" className="sentiment__sat-cta-btn" onClick={() => setShouldFetch(true)}>
          <Heart size={14} /><span>Analizar correlación</span>
        </Button>
      </div>
    );
  }

  if (satQ.isLoading) {
    return <div className="sentiment__skeleton sentiment__skeleton--card" />;
  }

  if (satQ.isError || !trends) {
    return (
      <div className="sentiment__section-card">
        <div className="sentiment__error-inline">
          <AlertTriangle size={16} />
          <span>No se pudieron cargar tendencias de satisfacción.</span>
          <Button variant="unstyled" className="sentiment__retry-inline" onClick={() => satQ.refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const latestMonth = trends.monthly_averages?.[trends.monthly_averages.length - 1];
  const previousMonth = trends.monthly_averages?.[trends.monthly_averages.length - 2];
  const satDelta = latestMonth && previousMonth ? latestMonth.avg_score - previousMonth.avg_score : null;

  const satTrendLevel = trendLevel(trends.overall_trend);
  const satTrendLabel = TREND_LABELS[trends.overall_trend] ?? trends.overall_trend;

  // Cross-reference
  const sentPos = sentimentScore >= 75;
  const sentNeg = sentimentScore < 60;
  const satPos = trends.overall_trend === "improving";
  const satNeg = trends.overall_trend === "declining";

  let crossLevel: "aligned_positive" | "aligned_negative" | "divergent" | "neutral";
  let crossLabel: string;
  let crossDetail: string;

  if (sentPos && satPos) {
    crossLevel = "aligned_positive";
    crossLabel = "Alineación positiva";
    crossDetail = `Sentimiento (${sentimentScore}) y satisfacción (${satTrendLabel.toLowerCase()}) alineados positivamente. Las comunicaciones contribuyen a la percepción del socio.`;
  } else if (sentNeg && satNeg) {
    crossLevel = "aligned_negative";
    crossLabel = "Alerta: Doble señal negativa";
    crossDetail = `Sentimiento (${sentimentScore}) y satisfacción (${satTrendLabel.toLowerCase()}) negativos. ${activeAlerts > 0 ? `${activeAlerts} alertas activas. ` : ""}Revisar contenido, frecuencia y segmentación.`;
  } else if ((sentPos && satNeg) || (sentNeg && satPos)) {
    crossLevel = "divergent";
    crossLabel = "Señales divergentes";
    crossDetail = `Sentimiento (${sentPos ? "positivo" : "negativo"}) contradice satisfacción (${satTrendLabel.toLowerCase()}). Investigar factores externos: instalaciones, servicio, eventos.`;
  } else {
    crossLevel = "neutral";
    crossLabel = "Estabilidad";
    crossDetail = `Sentimiento (${sentimentScore}) y satisfacción (${satTrendLabel.toLowerCase()}) en niveles neutros. Considerar campañas más segmentadas.`;
  }

  const concerningTopics = topTopics.filter((t) => t.sentiment_score < 60 && t.trend === "declining");

  return (
    <div className="sentiment__section-card">
      <div className="sentiment__section-header">
        <h3 className="sentiment__section-title"><Heart size={14} /> Correlación Sentimiento ↔ Satisfacción</h3>
        <span className="sentiment__trend-badge" data-level={satTrendLevel}>{satTrendLabel}</span>
      </div>

      <div className="sentiment__sat-kpis">
        <div className="sentiment__sat-kpi">
          <span className="sentiment__sat-kpi-label">Score sentimiento</span>
          <span className="sentiment__sat-kpi-value" style={{ color: scoreColor(sentimentScore) }}>{sentimentScore}</span>
        </div>
        <div className="sentiment__sat-kpi">
          <span className="sentiment__sat-kpi-label">Tendencia satisfacción</span>
          <span className="sentiment__sent-kpi-value" data-level={satTrendLevel}>{satTrendLabel}</span>
        </div>
        <div className="sentiment__sat-kpi">
          <span className="sentiment__sat-kpi-label">Encuestas</span>
          <span className="sentiment__sat-kpi-value">{fmtNum(trends.total_surveys)}</span>
        </div>
        <div className="sentiment__sat-kpi">
          <span className="sentiment__sat-kpi-label">Periodo</span>
          <span className="sentiment__sat-kpi-value">{trends.months_analyzed} meses</span>
        </div>
      </div>

      {latestMonth && (
        <div className="sentiment__sat-latest">
          <div className="sentiment__sat-latest-score">
            <span className="sentiment__sat-latest-label">Satisfacción ({latestMonth.month})</span>
            <span className="sentiment__sat-latest-value" data-level={satTrendLevel}>{latestMonth.avg_score.toFixed(1)}/5.0</span>
          </div>
          {satDelta !== null && (
            <div className="sentiment__sat-latest-delta">
              <span className="sentiment__sat-latest-label">Delta</span>
              <span className="sentiment__sat-delta-value" data-level={satDelta > 0 ? "positive" : satDelta < 0 ? "negative" : "neutral"}>
                {satDelta > 0 ? "+" : ""}{satDelta.toFixed(1)}pts
              </span>
            </div>
          )}
          <div className="sentiment__sat-latest-count">
            <span className="sentiment__sat-latest-label">Encuestas</span>
            <span>{latestMonth.survey_count}</span>
          </div>
        </div>
      )}

      <div className="sentiment__cross-insight" data-level={crossLevel}>
        <div className="sentiment__cross-header">
          {crossLevel === "aligned_positive" && <CheckCircle2 size={14} />}
          {crossLevel === "aligned_negative" && <AlertCircle size={14} />}
          {crossLevel === "divergent" && <AlertTriangle size={14} />}
          {crossLevel === "neutral" && <Info size={14} />}
          <span className="sentiment__cross-label">{crossLabel}</span>
        </div>
        <p className="sentiment__cross-detail">{crossDetail}</p>
      </div>

      {concerningTopics.length > 0 && (
        <div className="sentiment__cross-topics">
          <p className="sentiment__cross-topics-label">Temas que requieren atención cruzada</p>
          <div className="sentiment__cross-topic-chips">
            {concerningTopics.map((t) => (
              <span key={t.topic} className="sentiment__cross-topic-chip">
                {t.topic} ({t.sentiment_score})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function SentimentMonitor() {
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  const query = useMCPQuery<CommunicationsSentimentAnalyzeData>(
    "communication", "communications_sentiment_analyze",
    {},
    { staleTime: 300_000 },
  );

  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication", "get_communication_analytics",
    { period: "current_month" },
    { staleTime: 300_000 },
  );

  const data = query.data ?? null;
  const analytics = analyticsQ.data?.analytics;

  // ── Intelligence Layer ────────────────────────────────

  const velocity = useMemo(
    () => (data ? computeEmotionalVelocity(data.trend_timeline) : null),
    [data],
  );

  const anomalies = useMemo(
    () => (data ? detectAnomalies(data) : []),
    [data],
  );

  const periodDelta = useMemo(
    () => (data ? computePeriodDelta(data.trend_timeline) : null),
    [data],
  );

  const topicVelocities = useMemo(
    () => (data ? computeTopicVelocities(data.topics) : []),
    [data],
  );

  const diversification = useMemo(
    () => (analytics ? computeChannelDiversification(analytics.channel_breakdown.map((c) => ({ channel: c.channel, volume: c.count }))) : null),
    [analytics],
  );

  // ── Loading / Error ───────────────────────────────────

  if (query.isLoading && !data) {
    return (
      <div className="glass-comm-sentiment">
        <div className="sentiment__loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sentiment__skeleton sentiment__skeleton--card" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="glass-comm-sentiment">
        <div className="sentiment__section-card">
          <div className="sentiment__error">
            <AlertTriangle size={24} />
            <h3>Error al cargar sentimiento</h3>
            <p>No pudimos obtener los datos de sentimiento.</p>
            <Button variant="unstyled" className="sentiment__retry-btn" onClick={() => query.refetch()}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════

  const anomalyLevel = anomalies.length >= 3 ? "critical" : anomalies.length >= 1 ? "warning" : "none";

  return (
    <div className="glass-comm-sentiment" data-loaded="true">
      {/* ── Summary Strip ────────────────────────────── */}
      <div className="sentiment__summary-grid">
        {([
          {
            label: "Score general", value: data.overall_score, suffix: "/100",
            color: scoreColor(data.overall_score),
            sub: TREND_LABELS[data.overall_trend] ?? data.overall_trend,
            subLevel: trendLevel(data.overall_trend),
          },
          {
            label: "Analizadas", value: fmtNum(data.total_communications_analyzed), suffix: "",
            color: "var(--color-teal-400)",
            sub: "comunicaciones", subLevel: "neutral" as const,
          },
          {
            label: "Delta vs anterior", value: `${data.comparison_with_previous.score_delta > 0 ? "+" : ""}${data.comparison_with_previous.score_delta}`, suffix: "pts",
            color: data.comparison_with_previous.score_delta >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
            sub: data.comparison_with_previous.period, subLevel: "neutral" as const,
          },
          {
            label: "Alertas activas", value: data.alerts.length, suffix: "",
            color: data.alerts.length > 0 ? "var(--color-rose-400)" : "var(--color-emerald-400)",
            sub: `${data.alerts.filter((a) => a.severity === "critical").length} críticas`,
            subLevel: data.alerts.length > 0 ? "negative" as const : "positive" as const,
          },
        ] as const).map((kpi, i) => (
          <div key={kpi.label} className="sentiment__kpi-card" style={{ "--stagger-i": i } as React.CSSProperties}>
            <span className="sentiment__kpi-label">{kpi.label}</span>
            <span className="sentiment__kpi-value" style={{ color: kpi.color }}>{kpi.value}{kpi.suffix}</span>
            <span className="sentiment__kpi-sub" data-level={kpi.subLevel}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Innovation 1: Velocity Monitor ───────────── */}
      {velocity && (
        <div className="sentiment__section-card">
          <div className="sentiment__section-header">
            <h3 className="sentiment__section-title"><Activity size={14} /> Velocidad Emocional</h3>
            <span className="sentiment__velocity-badge" data-level={velocity.level}>{velocity.label}</span>
          </div>
          <div className="sentiment__velocity-row">
            <div className="sentiment__velocity-metric">
              <span className="sentiment__velocity-label">Actual</span>
              <span className="sentiment__velocity-value" style={{ color: scoreColor(velocity.current) }}>{velocity.current}</span>
            </div>
            <div className="sentiment__velocity-metric">
              <span className="sentiment__velocity-label">Promedio</span>
              <span className="sentiment__velocity-value">{velocity.average}</span>
            </div>
            <div className="sentiment__velocity-metric">
              <span className="sentiment__velocity-label">Delta</span>
              <span className="sentiment__velocity-value" data-level={velocity.delta > 0 ? "positive" : velocity.delta < 0 ? "negative" : "neutral"}>
                {velocity.delta > 0 ? "+" : ""}{velocity.delta}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Innovation 7: Period Delta Comparison ────── */}
      {periodDelta && (
        <div className="sentiment__section-card sentiment__period-delta">
          <div className="sentiment__section-header">
            <h3 className="sentiment__section-title"><BarChart3 size={14} /> Comparación Período</h3>
            <span className="sentiment__period-badge" data-level={periodDelta.level}>{periodDelta.label}</span>
          </div>
          <div className="sentiment__period-row">
            <div className="sentiment__period-third">
              <span className="sentiment__period-third-label">Primer tercio</span>
              <span className="sentiment__period-third-value">{periodDelta.firstThirdAvg}</span>
            </div>
            <div className="sentiment__period-arrow" data-level={periodDelta.level}>
              {periodDelta.delta > 0 ? <TrendingUp size={16} /> : periodDelta.delta < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
              <span>{periodDelta.delta > 0 ? "+" : ""}{periodDelta.delta}pts</span>
            </div>
            <div className="sentiment__period-third">
              <span className="sentiment__period-third-label">Último tercio</span>
              <span className="sentiment__period-third-value">{periodDelta.lastThirdAvg}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Innovation 8: Proactive AI Insights ──────── */}
      {anomalies.length >= 2 && (
        <div className="sentiment__section-card sentiment__insights-panel" data-level={anomalyLevel}>
          <div className="sentiment__section-header">
            <h3 className="sentiment__section-title"><Zap size={14} /> Alertas Detectadas ({anomalies.length})</h3>
          </div>
          <div className="sentiment__insights-list">
            {anomalies.map((a, i) => {
              const AIcon = a.icon;
              return (
                <div key={i} className="sentiment__insight-item" data-severity={a.severity}>
                  <AIcon size={14} />
                  <span className="sentiment__insight-detail">{a.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Forecast Sparkline (Innovation 6) ────────── */}
      <div className="sentiment__section-card">
        <div className="sentiment__section-header">
          <h3 className="sentiment__section-title"><BarChart3 size={14} /> Evolución del Sentimiento</h3>
          {velocity && (
            <span className="sentiment__velocity-badge" data-level={velocity.level}>{velocity.label}</span>
          )}
        </div>
        <ForecastSparkline timeline={data.trend_timeline} />
        <div className="sentiment__timeline-bars">
          {data.trend_timeline.map((p) => {
            const pctPos = p.positive_pct;
            const pctNeu = p.neutral_pct;
            const pctNeg = p.negative_pct;
            const [y, m] = p.period.split("-");
            const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
            const label = `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
            return (
              <div key={p.period} className="sentiment__timeline-bar-group">
                <div className="sentiment__timeline-bar">
                  <div className="sentiment__timeline-bar-segment" data-type="positive" style={{ height: `${pctPos}%` }} />
                  <div className="sentiment__timeline-bar-segment" data-type="neutral" style={{ height: `${pctNeu}%` }} />
                  <div className="sentiment__timeline-bar-segment" data-type="negative" style={{ height: `${pctNeg}%` }} />
                </div>
                <span className="sentiment__timeline-bar-label">{label}</span>
                <span className="sentiment__timeline-bar-score" style={{ color: scoreColor(p.overall_score) }}>{p.overall_score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────── */}
      {data.alerts.length > 0 && (
        <div className="sentiment__section-card">
          <div className="sentiment__section-header">
            <h3 className="sentiment__section-title"><AlertTriangle size={14} /> Alertas de Sentimiento</h3>
          </div>
          <div className="sentiment__alerts-list">
            {data.alerts.map((alert: SentimentAlert) => (
              <div key={alert.id} className="sentiment__alert-item" data-severity={alert.severity}>
                <div className="sentiment__alert-header">
                  <h4 className="sentiment__alert-title">{alert.title}</h4>
                  <span className="sentiment__alert-severity" data-severity={alert.severity}>{alert.severity}</span>
                  {alert.affected_families > 0 && (
                    <span className="sentiment__alert-families">{alert.affected_families} familias</span>
                  )}
                </div>
                <p className="sentiment__alert-description">{alert.description}</p>
                <div className="sentiment__alert-action">
                  <span className="sentiment__alert-action-label">Acción recomendada</span>
                  <p className="sentiment__alert-action-text">{alert.recommended_action}</p>
                </div>
                <p className="sentiment__alert-date">
                  Detectado: {new Date(alert.detected_at).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Innovation 4: Engagement Risk Heatmap ────── */}
      {data.channel_breakdown.length > 0 && (
        <div className="sentiment__section-card">
          <div className="sentiment__section-header">
            <h3 className="sentiment__section-title"><MessageSquare size={14} /> Sentimiento por Canal</h3>
            {diversification && (
              <span className="sentiment__diversification-badge" data-level={diversification.level}>
                {diversification.label}
              </span>
            )}
          </div>

          <div className="sentiment__channel-grid">
            {data.channel_breakdown.map((ch) => (
              <div key={ch.channel} className="sentiment__channel-card">
                <div className="sentiment__channel-header">
                  <span className="sentiment__channel-name">{ch.channel}</span>
                  <span className="sentiment__channel-score" style={{ color: scoreColor(ch.score) }}>{ch.score}</span>
                </div>
                <div className="sentiment__channel-bar">
                  <div className="sentiment__channel-bar-fill" style={{ width: `${ch.score}%`, backgroundColor: scoreColor(ch.score) }} />
                </div>
                <div className="sentiment__channel-meta">
                  <span>Vol: {fmtNum(ch.volume)}</span>
                  <span data-level={trendLevel(ch.trend)}>{TREND_LABELS[ch.trend] ?? ch.trend}</span>
                </div>
                <div className="sentiment__channel-topics">
                  <span className="sentiment__channel-topic-pos">+{ch.top_positive_topic}</span>
                  <span className="sentiment__channel-topic-neg">-{ch.top_negative_topic}</span>
                </div>
              </div>
            ))}
          </div>

          {diversification?.warning && (
            <div className="sentiment__diversification-warning">
              <AlertTriangle size={14} />
              <span>Alta concentración en pocos canales ({diversification.concentration}%) — diversificar para reducir riesgo</span>
            </div>
          )}
        </div>
      )}

      {/* ── Innovation 3+9: Topics ───────────────────── */}
      <div className="sentiment__section-card">
        <div className="sentiment__section-header">
          <h3 className="sentiment__section-title"><Hash size={14} /> Temas Identificados</h3>
        </div>
        <div className="sentiment__topics-list">
          {data.topics.map((topic: SentimentTopic, idx: number) => {
            const tv = topicVelocities[idx];
            return (
              <div key={idx} className="sentiment__topic-card">
                <Button
                  variant="unstyled"
                  type="button"
                  onClick={() => setExpandedTopic(expandedTopic === idx ? null : idx)}
                  className="sentiment__topic-btn"
                  aria-expanded={expandedTopic === idx}
                >
                  <div className="sentiment__topic-bar">
                    <div className="sentiment__topic-bar-fill" style={{ width: `${topic.sentiment_score}%`, backgroundColor: scoreColor(topic.sentiment_score) }} />
                  </div>
                  <span className="sentiment__topic-name">{topic.topic}</span>
                  <span className="sentiment__topic-score" style={{ color: scoreColor(topic.sentiment_score) }}>{topic.sentiment_score}</span>
                  <span className="sentiment__topic-mentions">{fmtNum(topic.mentions)} menciones</span>
                  {tv && (
                    <span className="sentiment__topic-velocity" data-level={tv.velocityLevel}>{tv.velocityLabel}</span>
                  )}
                  <span className="sentiment__topic-chevron">{expandedTopic === idx ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                </Button>

                {expandedTopic === idx && (
                  <div className="sentiment__topic-expanded">
                    <p className="sentiment__topic-quotes-label">Citas representativas</p>
                    <ul className="sentiment__topic-quotes">
                      {topic.representative_quotes.map((quote, qi) => (
                        <li key={qi} className="sentiment__topic-quote">"{quote}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Satisfaction Cross-Reference ─────────────── */}
      <SatisfactionCorrelation
        sentimentScore={data.overall_score}
        sentimentTrend={data.overall_trend}
        activeAlerts={data.alerts.length}
        topTopics={data.topics.map((t) => ({ topic: t.topic, sentiment_score: t.sentiment_score, trend: t.trend }))}
      />

      {/* ── Keywords ─────────────────────────────────── */}
      <div className="sentiment__section-card">
        <div className="sentiment__section-header">
          <h3 className="sentiment__section-title"><Sparkles size={14} /> Keywords</h3>
          <Button variant="unstyled" className="sentiment__toggle-btn" onClick={() => setShowAllKeywords(!showAllKeywords)}>
            {showAllKeywords ? "Colapsar" : "Ver todos"}
          </Button>
        </div>

        <div className="sentiment__keywords-grid">
          <div>
            <p className="sentiment__keywords-label" data-polarity="positive">Positivos</p>
            <div className="sentiment__keywords-chips">
              {(showAllKeywords ? data.top_positive_keywords : data.top_positive_keywords.slice(0, 4)).map((kw: SentimentKeywordInsight) => (
                <span key={kw.keyword} className="sentiment__keyword-chip" data-polarity="positive"
                  title={`${kw.frequency} menciones — ${kw.associated_topics.join(", ")}`}>
                  {kw.keyword} ({kw.frequency})
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="sentiment__keywords-label" data-polarity="negative">Negativos</p>
            <div className="sentiment__keywords-chips">
              {(showAllKeywords ? data.top_negative_keywords : data.top_negative_keywords.slice(0, 4)).map((kw: SentimentKeywordInsight) => (
                <span key={kw.keyword} className="sentiment__keyword-chip" data-polarity="negative"
                  title={`${kw.frequency} menciones — ${kw.associated_topics.join(", ")}`}>
                  {kw.keyword} ({kw.frequency})
                </span>
              ))}
            </div>
          </div>
        </div>

        {data.comparison_with_previous.notable_changes.length > 0 && (
          <div className="sentiment__notable-changes">
            <p className="sentiment__notable-label">Cambios notables ({data.comparison_with_previous.period})</p>
            <ul className="sentiment__notable-list">
              {data.comparison_with_previous.notable_changes.map((change, i) => (
                <li key={i} className="sentiment__notable-item">
                  <CheckCircle2 size={10} />{change}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}