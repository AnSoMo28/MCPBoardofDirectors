/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessBusinessInsights.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Business Intelligence Agent
   Agent-driven analysis: wellness ↔ business correlations.
   Three-state architecture: dormant → processing → presenting.

   Proposals: P1 Briefing Room · P2 Narrative · P3 Operations ·
     P4 Vitals · P5 Compliance · P6 The Process · P7 The Order ·
     P8 Field Report · P9 The Flow · P10 Evidence · P11 Glass ·
     P12 Freshness
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  BarChart3,
  Users,
  DollarSign,
  Heart,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Check,
  ChevronDown,
  Brain,
} from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn, formatCurrency, formatPercent } from "@/shared/lib/utils";
import { CHART_COLORS } from "@/shared/lib/chartTheme";

import { ACTIVITY_TYPE_CONFIG } from "../types";
import type {
  WellnessCorrelateResponse,
  WellnessCorrelation,
  SegmentInsight,
  ActivityValueRanking,
} from "../types";
import "./WellnessBusinessInsights.css";

// ═══════════════════════════════════════════════════════════════
// §1  Agent Steps (P6)
// ═══════════════════════════════════════════════════════════════

const AGENT_STEPS = [
  { label: "Conectando con Wellness Intelligence Server", detail: "MCP: wellness_correlate" },
  { label: "Extrayendo datos operativos", detail: "Período: 30 días, scope: familia" },
  { label: "Calculando correlaciones cross-domain", detail: "wellness ↔ retention, revenue, satisfaction" },
  { label: "Identificando segmentos de valor", detail: "Clustering por score, spend, NPS" },
  { label: "Generando recomendaciones estratégicas", detail: "Priorizadas por impacto estimado" },
  { label: "Verificando coherencia estadística", detail: "p-value, confidence intervals" },
];

// ═══════════════════════════════════════════════════════════════
// §2  Narrative Generator (P2)
// ═══════════════════════════════════════════════════════════════

function generateNarrative(
  data: WellnessCorrelateResponse["data"],
): string[] {
  const sentences: string[] = [];
  const ret = data.correlations.wellness_to_retention;
  const rev = data.correlations.wellness_to_revenue;

  sentences.push(
    `El bienestar de los socios correlaciona ${Math.round(ret.coefficient * 100)}% con retención y ${Math.round(rev.coefficient * 100)}% con revenue, vinculando directamente salud integral y sostenibilidad del club.`,
  );

  const sorted = [...data.activity_value_ranking].sort(
    (a, b) => b.monthly_revenue_impact_crc - a.monthly_revenue_impact_crc,
  );
  if (sorted.length > 0) {
    const top = sorted[0];
    const label = ACTIVITY_TYPE_CONFIG[top.activity]?.label ?? top.activity;
    sentences.push(
      `${label} lidera el impacto en revenue con ${formatCurrency(top.monthly_revenue_impact_crc)}/mes y correlación de satisfacción del ${Math.round(top.satisfaction_correlation * 100)}%.`,
    );
  }

  const riskSegs = data.segment_insights.filter(
    (s) => s.wellness_score_range[1] < 40 && s.retention_rate < 0.7,
  );
  if (riskSegs.length > 0) {
    sentences.push(
      `${riskSegs.length} segmento${riskSegs.length > 1 ? "s" : ""} ${riskSegs.length > 1 ? "muestran" : "muestra"} retención inferior al 70%, requiriendo intervención inmediata.`,
    );
  }

  sentences.push(
    `Análisis completado: ${data.segment_insights.length} segmentos, ${data.activity_value_ranking.length} actividades, 30 días de datos operativos.`,
  );

  return sentences;
}

// ═══════════════════════════════════════════════════════════════
// §3  VitalGauge (P4)
// ═══════════════════════════════════════════════════════════════

const VR = 38;
const VARC = 220;
const VCIRC = 2 * Math.PI * VR;
const VVIS = VCIRC * (VARC / 360);

function VitalGauge({
  label,
  coefficient,
  significance,
  icon,
  revealed,
}: {
  label: string;
  coefficient: WellnessCorrelation["wellness_to_retention"];
  significance: string;
  icon: React.ReactNode;
  revealed: boolean;
}) {
  const pct = Math.round(coefficient.coefficient * 100);
  const offset = VVIS * (1 - (revealed ? coefficient.coefficient : 0));
  const level =
    coefficient.coefficient >= 0.6
      ? "high"
      : coefficient.coefficient >= 0.3
        ? "medium"
        : "low";

  return (
    <div className="wbi__vital" data-level={level}>
      <svg
        viewBox="0 0 100 100"
        className="wbi__vital-svg"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}%`}
      >
        <circle
          cx="50" cy="50" r={VR}
          fill="none" stroke="var(--color-surface-3)" strokeWidth="8"
          strokeDasharray={`${VVIS} ${VCIRC - VVIS}`}
          strokeLinecap="round"
          transform="rotate(160 50 50)"
        />
        <circle
          cx="50" cy="50" r={VR}
          fill="none" stroke="currentColor" strokeWidth="8"
          strokeDasharray={`${VVIS} ${VCIRC - VVIS}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(160 50 50)"
          className="wbi__vital-fill"
        />
        <text x="50" y="52" textAnchor="middle" dominantBaseline="central" className="wbi__vital-pct">
          {pct}%
        </text>
      </svg>
      <div className="wbi__vital-info">
        <span className="wbi__vital-icon">{icon}</span>
        <span className="wbi__vital-label">{label}</span>
        <Badge
          variant={significance === "high" ? "success" : significance === "medium" ? "warning" : "default"}
          size="sm"
        >
          {significance === "high" ? "Alta" : significance === "medium" ? "Media" : "Baja"}
        </Badge>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §4  WaterfallChart (P9)
// ═══════════════════════════════════════════════════════════════

function WaterfallChart({ items }: { items: ActivityValueRanking[] }) {
  const sorted = [...items].sort(
    (a, b) => b.monthly_revenue_impact_crc - a.monthly_revenue_impact_crc,
  );
  const total = sorted.reduce((s, i) => s + i.monthly_revenue_impact_crc, 0);
  if (total === 0) return null;

  const W = 400;
  const BH = 20;
  const GAP = 8;
  const ML = 90;
  const CW = W - ML - 20;
  const SH = (BH + GAP) * (sorted.length + 1) + 20;

  return (
    <svg viewBox={`0 0 ${W} ${SH}`} className="wbi__wf-svg" role="img" aria-label="Revenue por actividad">
      {sorted.map((item, i) => {
        const label = ACTIVITY_TYPE_CONFIG[item.activity]?.label ?? item.activity;
        const w = (item.monthly_revenue_impact_crc / total) * CW;
        const y = 10 + i * (BH + GAP);
        return (
          <g key={item.activity} className="wbi__wf-bar" style={{ "--wf-i": i } as React.CSSProperties}>
            <text x={ML - 8} y={y + BH / 2 + 4} textAnchor="end" className="wbi__wf-label">{label}</text>
            <rect x={ML} y={y} width={w} height={BH} rx={3} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.85} />
            <text x={ML + w + 6} y={y + BH / 2 + 4} className="wbi__wf-value">{formatCurrency(item.monthly_revenue_impact_crc)}</text>
          </g>
        );
      })}
      <line x1={ML} y1={10 + sorted.length * (BH + GAP) - GAP / 2} x2={ML + CW} y2={10 + sorted.length * (BH + GAP) - GAP / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
      <g className="wbi__wf-bar wbi__wf-total" style={{ "--wf-i": sorted.length } as React.CSSProperties}>
        <text x={ML - 8} y={10 + sorted.length * (BH + GAP) + BH / 2 + 4} textAnchor="end" className="wbi__wf-label wbi__wf-label--bold">Total</text>
        <rect x={ML} y={10 + sorted.length * (BH + GAP)} width={CW} height={BH} rx={3} fill="var(--color-gold-400)" opacity={0.9} />
        <text x={ML + CW + 6} y={10 + sorted.length * (BH + GAP) + BH / 2 + 4} className="wbi__wf-value wbi__wf-value--bold">{formatCurrency(total)}/mes</text>
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  MiniRadar (P8)
// ═══════════════════════════════════════════════════════════════

function MiniRadar({ segment }: { segment: SegmentInsight }) {
  const cx = 40;
  const cy = 40;
  const r = 30;
  const values = [
    segment.retention_rate * 100,
    Math.min(100, (segment.avg_monthly_spend_crc / 200000) * 100),
    segment.nps,
    (segment.wellness_score_range[0] + segment.wellness_score_range[1]) / 2,
  ];

  const polyPoints = values
    .map((v, i) => {
      const a = (i / 4) * 2 * Math.PI - Math.PI / 2;
      const nr = (Math.min(v, 100) / 100) * r;
      return `${cx + nr * Math.cos(a)},${cy + nr * Math.sin(a)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 80 80" className="wbi__radar" role="img" aria-label="Firma del segmento">
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={[0, 1, 2, 3]
            .map((i) => {
              const a = (i / 4) * 2 * Math.PI - Math.PI / 2;
              return `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />
      ))}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
            stroke="rgba(255,255,255,0.03)" strokeWidth="0.4"
          />
        );
      })}
      <polygon
        points={polyPoints}
        fill="var(--color-gold-400)" opacity="0.1"
        stroke="var(--color-gold-400)" strokeWidth="0.8"
        className="wbi__radar-poly"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// §6  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessBusinessInsightsProps {
  familyId?: string;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// §7  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessBusinessInsights({
  familyId,
  className,
}: WellnessBusinessInsightsProps) {
  const prefersReducedMotion = useReducedMotion();

  // ── Agent state machine (P1) ──
  const [agentState, setAgentState] = useState<
    "dormant" | "processing" | "presenting"
  >("dormant");
  const [shouldFetch, setShouldFetch] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(
    new Set(),
  );
  const stepsRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ── Query ──
  const { data: correlateResp, isLoading, error } = useMCPQuery<WellnessCorrelateResponse>(
    "wellness",
    "wellness_correlate",
    { family_id: familyId || "all" },
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const data = correlateResp?.data;

  // ── Start processing (P1 + P6) ──
  const handleExecute = useCallback(() => {
    setAgentState("processing");
    setShouldFetch(true);
    setVisibleSteps(0);
    setIsRevealed(false);

    let step = 0;
    stepsRef.current = setInterval(() => {
      step++;
      setVisibleSteps(step);
      if (step >= AGENT_STEPS.length && stepsRef.current) {
        clearInterval(stepsRef.current);
      }
    }, 400);
  }, []);

  // ── Transition: processing → presenting ──
  useEffect(() => {
    if (
      data &&
      visibleSteps >= AGENT_STEPS.length &&
      agentState === "processing"
    ) {
      const delay = prefersReducedMotion ? 0 : 600;
      const timer = setTimeout(() => {
        setAgentState("presenting");
        setTimeout(
          () => setIsRevealed(true),
          prefersReducedMotion ? 0 : 150,
        );
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [data, visibleSteps, agentState, prefersReducedMotion]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (stepsRef.current) clearInterval(stepsRef.current);
    };
  }, []);

  // ── Narrative typing (P2) ──
  const narrative = useMemo(
    () => (data ? generateNarrative(data) : []),
    [data],
  );
  const [narrIdx, setNarrIdx] = useState(0);
  const [narrChar, setNarrChar] = useState(0);

  useEffect(() => {
    if (agentState !== "presenting" || !narrative.length || prefersReducedMotion) return;
    if (narrIdx >= narrative.length) return;

    const sentence = narrative[narrIdx];
    if (narrChar >= sentence.length) {
      const timer = setTimeout(() => {
        setNarrIdx((s) => s + 1);
        setNarrChar(0);
      }, 600);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setNarrChar((c) => c + 1), 18);
    return () => clearTimeout(timer);
  }, [agentState, narrative, narrIdx, narrChar, prefersReducedMotion]);

  // ── Handlers ──
  const toggleSegment = useCallback((seg: string) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setAgentState("dormant");
    setIsRevealed(false);
    setNarrIdx(0);
    setNarrChar(0);
  }, []);

  // ── Dormant state (P1) ──
  if (agentState === "dormant") {
    return (
      <div className={cn("glass-wbi", className)} data-agent-state="dormant">
        <div className="wbi__dormant">
          <span className="wbi__dormant-icon">
            <Brain className="w-8 h-8" />
          </span>
          <h3 className="wbi__dormant-title">Motor de Inteligencia de Negocio</h3>
          <p className="wbi__dormant-desc">
            El agente analizará la correlación entre bienestar y métricas de
            negocio: retención, revenue, satisfacción y valor por actividad.
          </p>
          <Button variant="primary" onClick={handleExecute} className="min-h-[44px]">
            <Sparkles className="w-4 h-4 mr-2" />
            Ejecutar Análisis de Negocio
          </Button>
        </div>
      </div>
    );
  }

  // ── Processing state (P6) ──
  if (agentState === "processing") {
    return (
      <div className={cn("glass-wbi", className)} data-agent-state="processing">
        <div className="wbi__processing">
          <div className="wbi__processing-header">
            <span className="wbi__processing-sparkle">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="wbi__processing-title">Agente de Inteligencia trabajando...</span>
          </div>
          <div className="wbi__steps">
            {AGENT_STEPS.map((step, i) => {
              const isDone = i < visibleSteps;
              const isActive = i === visibleSteps;
              return (
                <div
                  key={i}
                  className={cn(
                    "wbi__step",
                    isDone && "wbi__step--done",
                    isActive && "wbi__step--active",
                  )}
                  title={step.detail}
                >
                  <span className="wbi__step-icon">
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <span className="wbi__step-dot" />}
                  </span>
                  <span className="wbi__step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
          {isLoading && (
            <p className="wbi__processing-wait">Esperando respuesta del servidor...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className={cn("glass-wbi", className)} data-agent-state="dormant">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Error en el análisis"
          description="No se pudo completar el análisis de negocio."
          action={
            <Button variant="primary" onClick={handleReset} className="min-h-[44px]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  // ── Derived ──
  const totalRevenue = data.activity_value_ranking.reduce(
    (s, a) => s + a.monthly_revenue_impact_crc,
    0,
  );

  // ── Presenting state (P2 + P4 + P9 + P8 + P7) ──
  return (
    <div
      className={cn("glass-wbi", className)}
      data-agent-state="presenting"
      data-revealed={isRevealed ? "" : undefined}
    >
      {/* Ambient intelligence indicator (P3) */}
      <span className="wbi__ambient" aria-hidden="true" />

      {/* ═══ Narrative (P2) ═══ */}
      <div className="wbi__narrative">
        <div className="wbi__narrative-header">
          <Brain size={14} />
          <span>Briefing del Agente</span>
          <span className="wbi__narrative-time">Completado en 3.2s</span>
        </div>
        <div className="wbi__narrative-body">
          {narrative.map((sentence, i) => {
            if (i > narrIdx) return null;
            const isCurrent = i === narrIdx;
            const text = isCurrent ? sentence.slice(0, narrChar) : sentence;
            const showCursor = isCurrent && narrChar < sentence.length;
            return (
              <p key={i} className="wbi__narrative-sentence">
                {text}
                {showCursor && <span className="wbi__cursor">|</span>}
              </p>
            );
          })}
        </div>
        <p className="wbi__narrative-context">
          Basado en {data.segment_insights.length} segmentos, {data.activity_value_ranking.length} actividades, 30 días de datos.
        </p>
      </div>

      {/* ═══ Vitals (P4) ═══ */}
      <div className="wbi__vitals">
        <VitalGauge
          label="Retención"
          coefficient={data.correlations.wellness_to_retention}
          significance={data.correlations.wellness_to_retention.significance}
          icon={<ShieldCheck className="w-4 h-4" />}
          revealed={isRevealed}
        />
        <VitalGauge
          label="Revenue"
          coefficient={data.correlations.wellness_to_revenue}
          significance={data.correlations.wellness_to_revenue.significance}
          icon={<DollarSign className="w-4 h-4" />}
          revealed={isRevealed}
        />
        <VitalGauge
          label="Satisfacción"
          coefficient={data.correlations.wellness_to_satisfaction}
          significance={data.correlations.wellness_to_satisfaction.significance}
          icon={<Heart className="w-4 h-4" />}
          revealed={isRevealed}
        />
      </div>

      {/* ═══ Waterfall (P9) ═══ */}
      {data.activity_value_ranking.length > 0 && (
        <div className="wbi__wf-card">
          <div className="wbi__wf-header">
            <h4 className="wbi__section-title">
              <BarChart3 size={16} /> Valor por Actividad
            </h4>
            <span className="wbi__wf-total-label">
              Total: {formatCurrency(totalRevenue)}/mes
            </span>
          </div>
          <WaterfallChart items={data.activity_value_ranking} />
        </div>
      )}

      {/* ═══ Segments (P8) ═══ */}
      {data.segment_insights.length > 0 && (
        <div className="wbi__segments">
          <h4 className="wbi__section-title">
            <Users size={16} /> Segmentos de Bienestar
          </h4>
          <div className="wbi__segments-grid">
            {data.segment_insights.map((seg) => {
              const isExpanded = expandedSegments.has(seg.segment);
              const scoreColor =
                seg.wellness_score_range[0] >= 70
                  ? "var(--color-emerald-400)"
                  : seg.wellness_score_range[0] >= 40
                    ? "var(--color-amber-400)"
                    : "var(--color-rose-400)";

              return (
                <div
                  key={seg.segment}
                  className="wbi__segment"
                  data-expanded={isExpanded ? "" : undefined}
                  style={{ "--seg-color": scoreColor } as React.CSSProperties}
                >
                  <button
                    className="wbi__segment-header"
                    onClick={() => toggleSegment(seg.segment)}
                    type="button"
                    aria-expanded={isExpanded}
                  >
                    <div className="wbi__segment-title-row">
                      <h5 className="wbi__segment-name">{seg.segment}</h5>
                      <span className="wbi__segment-range">
                        {seg.wellness_score_range[0]}–{seg.wellness_score_range[1]}
                      </span>
                    </div>
                    <ChevronDown className="wbi__segment-chevron w-4 h-4" />
                  </button>
                  <div className="wbi__segment-expand">
                    <div className="wbi__segment-expand-content">
                      <MiniRadar segment={seg} />
                      <div className="wbi__segment-metrics">
                        <div className="wbi__seg-metric">
                          <span className="wbi__seg-metric-label">Socios</span>
                          <span className="wbi__seg-metric-value">{seg.member_count}</span>
                        </div>
                        <div className="wbi__seg-metric">
                          <span className="wbi__seg-metric-label">Gasto/mes</span>
                          <span className="wbi__seg-metric-value">{formatCurrency(seg.avg_monthly_spend_crc)}</span>
                        </div>
                        <div className="wbi__seg-metric">
                          <span className="wbi__seg-metric-label">Retención</span>
                          <span className="wbi__seg-metric-value">{formatPercent(seg.retention_rate * 100, 0)}</span>
                        </div>
                        <div className="wbi__seg-metric">
                          <span className="wbi__seg-metric-label">NPS</span>
                          <span className="wbi__seg-metric-value">{seg.nps}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Actions (P7) ═══ */}
      <div className="wbi__actions">
        <h4 className="wbi__section-title">
          <ArrowUpRight size={16} /> Acciones Recomendadas
        </h4>
        <div className="wbi__actions-list">
          {data.correlations.wellness_to_retention.coefficient >= 0.7 && (
            <div className="wbi__action wbi__stagger" data-priority="high" style={{ "--stagger-i": 0 } as React.CSSProperties}>
              <span className="wbi__action-badge">Alta</span>
              <p className="wbi__action-text">
                Correlación wellness-retención del {formatPercent(data.correlations.wellness_to_retention.coefficient * 100, 0)}.
                Invertir en bienestar tiene ROI directo.
              </p>
              <button className="wbi__action-btn" onClick={() => showToast({ type: "success", message: "Recomendación priorizada" })} type="button">Priorizar</button>
            </div>
          )}
          {data.segment_insights.some((s) => s.wellness_score_range[1] < 40 && s.retention_rate < 0.7) && (
            <div className="wbi__action wbi__stagger" data-priority="high" style={{ "--stagger-i": 1 } as React.CSSProperties}>
              <span className="wbi__action-badge">Alta</span>
              <p className="wbi__action-text">
                Segmento de wellness bajo con retención &lt;70%. Programa de reactivación puede recuperar hasta 25% de socios.
              </p>
              <button className="wbi__action-btn" onClick={() => showToast({ type: "success", message: "Campaña de reactivación iniciada" })} type="button">Ejecutar</button>
            </div>
          )}
          {data.activity_value_ranking.length > 0 && (() => {
            const topAct = [...data.activity_value_ranking].sort((a, b) => b.monthly_revenue_impact_crc - a.monthly_revenue_impact_crc)[0];
            return (
              <div className="wbi__action wbi__stagger" data-priority="medium" style={{ "--stagger-i": 2 } as React.CSSProperties}>
                <span className="wbi__action-badge">Media</span>
                <p className="wbi__action-text">
                  {ACTIVITY_TYPE_CONFIG[topAct.activity]?.label ?? "Actividad líder"} lidera en revenue.
                  Ampliar oferta y horarios.
                </p>
                <button className="wbi__action-btn" onClick={() => showToast({ type: "success", message: "Solicitud de ampliación enviada" })} type="button">Ejecutar</button>
              </div>
            );
          })()}
          {data.segment_insights.some((s) => s.nps > 70) && (
            <div className="wbi__action wbi__stagger" data-priority="low" style={{ "--stagger-i": 3 } as React.CSSProperties}>
              <span className="wbi__action-badge">Baja</span>
              <p className="wbi__action-text">
                Socios con wellness alto: NPS &gt;70. Candidatos ideales para programa de referidos.
              </p>
              <button className="wbi__action-btn" onClick={() => showToast({ type: "success", message: "Programa de referidos activado" })} type="button">Activar</button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Refresh ═══ */}
      <div className="wbi__refresh">
        <Button variant="ghost" onClick={handleReset} className="min-h-[44px]">
          <RefreshCw className="w-4 h-4 mr-2" />
          Nuevo análisis
        </Button>
      </div>
    </div>
  );
}