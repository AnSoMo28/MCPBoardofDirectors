// src/features/engagement/components/SatisfactionReport.tsx
// ═══════════════════════════════════════════════════════════
// Satisfaction Report — Survey Results Analysis Page
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE of V1. Eliminates:
//   - framer-motion
//   - recharts (PieChart, BarChart, RadialBarChart, etc.)
//   - default export
//   - Tailwind inline classes
//
// Replaces with:
//   - CSS keyframes
//   - Pure SVG (donut, bars, gauge)
//   - Named export
//   - Co-located CSS file
//
// Verified against types.ts:
//   SurveyResultsResponse, QuestionSummary, SentimentBreakdown,
//   SurveyInsight, SurveyComment, SENTIMENT_CONFIG
//
// Glass namespace: glass-eng-report
// Data attributes: data-nps-level, data-sentiment-majority
// Rules: R34, R35, R38, #62 (type verification)
// ═══════════════════════════════════════════════════════════

import {
  Smile,
  Meh,
  Frown,
  TrendingUp,
  MessageSquare,
  Star,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Card, CardHeader, Button } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import {
  type SurveyResultsResponse,
  type QuestionSummary,
  type SurveyInsight,
  type SurveyComment,
  SENTIMENT_CONFIG,
} from "./types";
import "./SatisfactionReport.css";


// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const SENTIMENT_ICONS: Record<string, LucideIcon> = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

const INSIGHT_TYPE_CONFIG: Record<
  string,
  { Icon: LucideIcon; label: string; color: string; bgColor: string }
> = {
  strength: {
    Icon: ThumbsUp,
    label: "Fortaleza",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
  },
  improvement: {
    Icon: ThumbsDown,
    label: "Mejora",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
  },
  trend: {
    Icon: TrendingUp,
    label: "Tendencia",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
  },
  anomaly: {
    Icon: AlertCircle,
    label: "Anomalía",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
  },
};


// ══════════════════════════════════════════════════════════════
// SVG CHART COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── NPS Bar Chart (pure SVG) ──────────────────────────────

function NPSBarChart({
  promoters,
  passives,
  detractors,
}: {
  promoters: number;
  passives: number;
  detractors: number;
}) {
  const data = [
    { label: "Promotores", value: promoters, color: "var(--color-emerald-400)" },
    { label: "Pasivos", value: passives, color: "var(--color-gold-400)" },
    { label: "Detractores", value: detractors, color: "var(--color-rose-400)" },
  ];

  const max = Math.max(promoters, passives, detractors, 1);
  const barW = 60;
  const gap = 30;
  const chartH = 160;
  const chartW = data.length * barW + (data.length - 1) * gap;
  const offsetX = (300 - chartW) / 2;

  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" role="img" aria-label="Distribución NPS">
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = offsetX + i * (barW + gap);
        const y = chartH - barH + 10;

        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={6}
              // style={{ fill: d.color }}
              className="eng-report__bar"
              style={{ fill: d.color, animationDelay: `${i * 0.15}s` } as React.CSSProperties}
            />
            <text
              x={x + barW / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={12}
              fontWeight="700"
              fontFamily="var(--font-mono, 'DM Mono', monospace)"
              style={{ fill: "var(--color-silver-200)" }}
            >
              {d.value}
            </text>
            <text
              x={x + barW / 2}
              y={chartH + 24}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
              style={{ fill: "var(--color-silver-400)" }}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Sentiment Donut Chart (pure SVG) ──────────────────────

function SentimentDonut({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative || 1;
  const r = 60;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: positive, color: "var(--color-emerald-400)" },
    { value: neutral, color: "var(--color-gold-400)" },
    { value: negative, color: "var(--color-rose-400)" },
  ];

  let cumulativeOffset = 0;

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="Distribución de sentimiento">
      {/* Background ring */}
      <circle
        cx={100}
        cy={100}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={28}
      />

      {/* Segments */}
      {segments.map((seg, i) => {
        const segLength = (seg.value / total) * circumference;
        const dashOffset = -cumulativeOffset;
        cumulativeOffset += segLength;

        return (
          <circle
            key={i}
            cx={100}
            cy={100}
            r={r}
            fill="none"
            strokeWidth={28}
            strokeDasharray={`${segLength} ${circumference - segLength}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            transform="rotate(-90, 100, 100)"
            style={{ stroke: seg.color } as React.CSSProperties}
            className="eng-report__donut-segment"
          />
        );
      })}

      {/* Center text */}
      <text
        x={100}
        y={95}
        textAnchor="middle"
        fontSize={22}
        fontWeight="700"
        fontFamily="var(--font-display, 'Italiana', serif)"
        style={{ fill: "var(--color-silver-200)" }}
      >
        {total}
      </text>
      <text
        x={100}
        y={114}
        textAnchor="middle"
        fontSize={10}
        fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
        style={{ fill: "var(--color-silver-400)" }}
      >
        respuestas
      </text>
    </svg>
  );
}

// ── Score Gauge (pure SVG, semicircular) ──────────────────

function ScoreGauge({ score, max = 5 }: { score: number; max?: number }) {
  const cx = 100;
  const cy = 90;
  const r = 65;
  const circumference = Math.PI * r;
  const fillRatio = Math.min(score / max, 1);
  const dashLength = circumference * fillRatio;
  const dashOffset = circumference - dashLength;

  const gaugeColor =
    score >= 4
      ? "var(--color-emerald-400)"
      : score >= 3
        ? "var(--color-gold-400)"
        : "var(--color-rose-400)";

  return (
    <svg viewBox="0 0 200 110" width="100%" height="100%" role="img" aria-label={`Satisfacción: ${score.toFixed(1)} de ${max}`}>
      {/* Background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={12}
        strokeLinecap="round"
      />

      {/* Foreground arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ stroke: gaugeColor } as React.CSSProperties}
        className="eng-report__gauge-arc"
      />

      {/* Score */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize={28}
        fontWeight="700"
        fontFamily="var(--font-display, 'Italiana', serif)"
        style={{ fill: "var(--color-silver-200)" }}
      >
        {score.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fontSize={10}
        fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
        style={{ fill: "var(--color-silver-400)" }}
      >
        de {max.toFixed(1)}
      </text>
    </svg>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

interface SatisfactionReportProps {
  surveyId?: string;
}

/**
 * Satisfaction Report — survey results analysis page.
 * Fetches its own data via useMCPQuery (get_survey_results).
 * Displays KPIs, charts (pure SVG), AI insights, question
 * breakdown, and recent comments.
 */
export function SatisfactionReport({ surveyId: propId }: SatisfactionReportProps) {
  const resultsQ = useMCPQuery<SurveyResultsResponse>(
    "engagement",
    "get_survey_results",
    propId ? { survey_id: propId } : {},
    { staleTime: 120_000 },
  );

  // ── Loading ─────────────────────────────────────────────
  if (resultsQ.isLoading) {
    return (
      <PageContainer title="Resultados de Encuesta" subtitle="Cargando análisis...">
        <div data-glass-eng-report="" className="eng-report">
          <div className="eng-report__kpis">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="eng-report__skeleton-card"
                style={{ "--stagger-i": i } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="eng-report__charts">
            <div className="eng-report__skeleton-card eng-report__skeleton-card--tall" />
            <div className="eng-report__skeleton-card eng-report__skeleton-card--tall" />
            <div className="eng-report__skeleton-card eng-report__skeleton-card--tall" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (resultsQ.error) {
    return (
      <PageContainer title="Resultados de Encuesta">
        <div data-glass-eng-report="" className="eng-report">
          <Card className="eng-report__error-card">
            <AlertCircle size={40} style={{ color: "var(--color-rose-400)" }} />
            <p className="eng-report__error-text">
              No se pudieron cargar los resultados
            </p>
            <Button variant="secondary" onClick={() => resultsQ.refetch()}>
              <RefreshCw size={14} />
              Reintentar
            </Button>
          </Card>
        </div>
      </PageContainer>
    );
  }

  const r = resultsQ.data;
  if (!r) return null;

  // ── Derived ─────────────────────────────────────────────
  const npsLevel =
    r.avg_nps >= 50 ? "excellent" : r.avg_nps >= 0 ? "good" : "poor";

  const sentimentMajority =
    r.sentiment_breakdown.positive >= r.sentiment_breakdown.neutral &&
    r.sentiment_breakdown.positive >= r.sentiment_breakdown.negative
      ? "positive"
      : r.sentiment_breakdown.negative > r.sentiment_breakdown.neutral
        ? "negative"
        : "neutral";

  return (
    <PageContainer
      title={`Resultados: ${r.survey_name}`}
      subtitle={`${r.total_responses} respuestas · ${r.completion_rate.toFixed(0)}% completado`}
    >
      <div
        data-glass-eng-report=""
        data-nps-level={npsLevel}
        data-sentiment-majority={sentimentMajority}
        className="eng-report"
      >
        {/* ── KPI Cards ─────────────────────────────────────── */}
        <div className="eng-report__kpis">
          {[
            {
              label: "Score Promedio",
              value: r.avg_overall_score.toFixed(1),
              suffix: "/5",
              Icon: Star,
              color: "var(--color-gold-400)",
            },
            {
              label: "NPS Promedio",
              value: r.avg_nps.toFixed(0),
              suffix: "",
              Icon: TrendingUp,
              color:
                r.avg_nps >= 50
                  ? "var(--color-emerald-400)"
                  : r.avg_nps >= 0
                    ? "var(--color-gold-400)"
                    : "var(--color-rose-400)",
            },
            {
              label: "Total Respuestas",
              value: r.total_responses.toString(),
              suffix: "",
              Icon: MessageSquare,
              color: "var(--color-teal-400)",
            },
            {
              label: "Tasa Completado",
              value: `${r.completion_rate.toFixed(0)}%`,
              suffix: "",
              Icon: Sparkles,
              color: "var(--color-amber-400)",
            },
          ].map((kpi, idx) => (
            <Card key={kpi.label} className="eng-report__kpi-card" style={{ "--stagger-i": idx } as React.CSSProperties}>
              <div className="eng-report__kpi-content">
                <div>
                  <p className="eng-report__kpi-label">{kpi.label}</p>
                  <p className="eng-report__kpi-value">
                    {kpi.value}
                    {kpi.suffix && (
                      <span className="eng-report__kpi-suffix">{kpi.suffix}</span>
                    )}
                  </p>
                </div>
                <div
                  className="eng-report__kpi-icon"
                  style={{
                    color: kpi.color,
                    backgroundColor: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                  }}
                >
                  <kpi.Icon size={20} />
                </div>
              </div>
              <div
                className="eng-report__kpi-glow"
                style={{ backgroundColor: kpi.color }}
              />
            </Card>
          ))}
        </div>

        {/* ── Charts ─────────────────────────────────────────── */}
        <div className="eng-report__charts">
          {/* NPS Distribution */}
          <Card className="eng-report__chart-card" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Net Promoter Score</h3>
              <p className="eng-report__section-subtitle">Distribución</p>
            </CardHeader>
            <div className="eng-report__chart-area">
              <NPSBarChart
                promoters={r.nps_distribution?.promoters ?? 0}
                passives={r.nps_distribution?.passives ?? 0}
                detractors={r.nps_distribution?.detractors ?? 0}
              />
            </div>
            <div className="eng-report__chart-center-label">
              <p className="eng-report__big-number" data-nps-level={npsLevel}>
                {r.avg_nps.toFixed(0)}
              </p>
              <p className="eng-report__big-number-label">NPS promedio</p>
            </div>
          </Card>

          {/* Sentiment Donut */}
          <Card className="eng-report__chart-card" style={{ "--stagger-i": 5 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Sentimiento</h3>
              <p className="eng-report__section-subtitle">Distribución de respuestas</p>
            </CardHeader>
            <div className="eng-report__chart-area">
              <SentimentDonut
                positive={r.sentiment_breakdown.positive}
                neutral={r.sentiment_breakdown.neutral}
                negative={r.sentiment_breakdown.negative}
              />
            </div>
            <div className="eng-report__sentiment-legend">
              {[
                { label: "Positivo", Icon: Smile, count: r.sentiment_breakdown.positive, color: "var(--color-emerald-400)" },
                { label: "Neutro", Icon: Meh, count: r.sentiment_breakdown.neutral, color: "var(--color-gold-400)" },
                { label: "Negativo", Icon: Frown, count: r.sentiment_breakdown.negative, color: "var(--color-rose-400)" },
              ].map((s) => (
                <div key={s.label} className="eng-report__sentiment-item">
                  <s.Icon size={14} style={{ color: s.color }} />
                  <span className="eng-report__sentiment-label">{s.label}</span>
                  <span className="eng-report__sentiment-count">{s.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Satisfaction Gauge */}
          <Card className="eng-report__chart-card" style={{ "--stagger-i": 6 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Satisfacción General</h3>
              <p className="eng-report__section-subtitle">Escala 1-5</p>
            </CardHeader>
            <div className="eng-report__chart-area">
              <ScoreGauge score={r.avg_overall_score} />
            </div>
          </Card>
        </div>

        {/* ── AI Insights ───────────────────────────────────── */}
        {r.ai_insights.length > 0 && (
          <Card className="eng-report__insights-card" style={{ "--stagger-i": 7 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Análisis IA</h3>
              <p className="eng-report__section-subtitle">
                Insights generados por el motor de inferencia
              </p>
            </CardHeader>
            <div className="eng-report__insights-grid">
              {r.ai_insights.map((insight: SurveyInsight, idx: number) => {
                const cfg = INSIGHT_TYPE_CONFIG[insight.type] ?? INSIGHT_TYPE_CONFIG.trend;
                const { Icon } = cfg;

                return (
                  <div
                    key={insight.id}
                    className="eng-report__insight-card"
                    data-insight-type={insight.type}
                    style={{
                      backgroundColor: cfg.bgColor,
                      "--stagger-i": idx,
                    } as React.CSSProperties}
                  >
                    <div className="eng-report__insight-header">
                      <Icon size={14} style={{ color: cfg.color }} />
                      <span className="eng-report__insight-type" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span className="eng-report__insight-confidence">
                        {(insight.confidence * 100).toFixed(0)}% confianza
                      </span>
                    </div>
                    <p className="eng-report__insight-title">{insight.title}</p>
                    <p className="eng-report__insight-description">{insight.description}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ── Question Breakdown ────────────────────────────── */}
        {r.question_summaries.length > 0 && (
          <Card className="eng-report__questions-card" style={{ "--stagger-i": 8 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Detalle por Pregunta</h3>
              <p className="eng-report__section-subtitle">Resultados individuales</p>
            </CardHeader>
            <div className="eng-report__questions-list">
              {r.question_summaries.map((qs: QuestionSummary, idx: number) => (
                <div key={qs.question_id} className="eng-report__question-item">
                  <div className="eng-report__question-row">
                    <span className="eng-report__question-number">{idx + 1}</span>
                    <div className="eng-report__question-body">
                      <p className="eng-report__question-text">{qs.question}</p>

                      {/* Stars */}
                      {qs.avg_score != null && (
                        <div className="eng-report__stars-row">
                          <div className="eng-report__stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < Math.round(qs.avg_score ?? 0) ? "var(--color-gold-400)" : "transparent"}
                                stroke={i < Math.round(qs.avg_score ?? 0) ? "var(--color-gold-400)" : "rgba(255,255,255,0.12)"}
                              />
                            ))}
                          </div>
                          <span className="eng-report__stars-value">
                            {(qs.avg_score ?? 0).toFixed(1)}
                          </span>
                        </div>
                      )}

                      {/* Distribution bars */}
                      {qs.distribution && qs.distribution.length > 0 && (
                        <div className="eng-report__dist-bars">
                          {qs.distribution.map((d) => (
                            <div key={d.label} className="eng-report__dist-row">
                              <span className="eng-report__dist-label">{d.label}</span>
                              <div className="eng-report__dist-bar-track">
                                <div
                                  className="eng-report__dist-bar-fill"
                                  style={{ width: `${d.percentage}%` }}
                                />
                              </div>
                              <span className="eng-report__dist-value">
                                {d.percentage.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Keywords */}
                      {qs.top_keywords && qs.top_keywords.length > 0 && (
                        <div className="eng-report__keywords">
                          {qs.top_keywords.map((kw: string) => (
                            <span key={kw} className="eng-report__keyword">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Recent Comments ───────────────────────────────── */}
        {r.recent_comments.length > 0 && (
          <Card className="eng-report__comments-card" style={{ "--stagger-i": 9 } as React.CSSProperties}>
            <CardHeader>
              <h3 className="eng-report__section-title">Comentarios Recientes</h3>
              <p className="eng-report__section-subtitle">Últimas respuestas de texto libre</p>
            </CardHeader>
            <div className="eng-report__comments-list">
              {r.recent_comments.map((c: SurveyComment, idx: number) => {
                const sentCfg = SENTIMENT_CONFIG[c.sentiment] ?? SENTIMENT_CONFIG.neutral;
                return (
                  <div key={c.id} className="eng-report__comment-item" style={{ "--stagger-i": idx } as React.CSSProperties}>
                    <div className="eng-report__comment-header">
                      <div className="eng-report__comment-meta">
                        <span className="eng-report__comment-name">{c.family_name}</span>
                        <span
                          className="eng-report__comment-sentiment-badge"
                          style={{ color: sentCfg.color, backgroundColor: sentCfg.bgColor }}
                        >
                          {sentCfg.label}
                        </span>
                      </div>
                      <span className="eng-report__comment-date">
                        {new Date(c.date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="eng-report__comment-text">{c.comment}</p>
                    {c.event_name && (
                      <p className="eng-report__comment-event">Evento: {c.event_name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}