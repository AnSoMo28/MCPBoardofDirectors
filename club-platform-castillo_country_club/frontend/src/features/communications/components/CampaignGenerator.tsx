// src/features/communications/components/CampaignGenerator.tsx
// ═══════════════════════════════════════════════════════════
// Campaign Generator — V2 Refactored
// "El Generador" — Glass UI Intelligence Campaign Composer
// Castillo Country Club — Phase 31
//
// Business logic: lib/communicationIntelligence.ts
// Temporal logic: lib/temporalRouter.ts
// Narrative logic: lib/narrativeEngine.ts
// Configuration: config.ts
//
// This component: hooks + JSX. Zero business logic.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  Rocket, Sparkles, Users, BarChart3, CalendarClock,
  CheckCircle2, AlertTriangle, Copy, Send, Target,
  Shield, TrendingDown, Clock, ArrowRight, Lightbulb,
  Mail, MessageSquare, Smartphone, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";

import type {
  CommunicationsCampaignGenerateData,
  CampaignVariant,
} from "@/shared/mocks/contracts";

import type {
  CommunicationAnalyticsResponse
} from "../types";

import {
  CAMPAIGN_SEGMENT_OPTIONS,
  CAMPAIGN_SEGMENT_TONE_PROFILES,
  CAMPAIGN_OBJECTIVE_SUGGESTIONS,
  CAMPAIGN_CHANNEL_OPTIONS,
} from "../config";

import {
  analyzeTextTone,
  scoreCampaignVariant,
  computeCampaignQualityScores,
  computeAudienceCoverage,
  computeEngagementDistributionHealth,
  parseFrequencyRiskFromDescription,
} from "../lib/communicationIntelligence";

import type {
  TextToneProfile,
  CampaignVariantScore,
  CampaignQualityScore,
  EngagementDistributionHealth,
  FrequencyRiskAssessment,
} from "../lib/communicationIntelligence";

import { computeOptimalTimeSlots } from "../lib/temporalRouter";
import type { OptimalTimeSlot } from "../lib/temporalRouter";

import { detectNarrativeThread } from "../lib/narrativeEngine";
import type { NarrativeThread } from "../lib/narrativeEngine";

import "./CampaignGenerator.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// Presentation helpers (no business logic)
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Smartphone,
};

function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-CR").format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ═══════════════════════════════════════════════════════════
// Inline sub-components (presentation-only SVG)
// ═══════════════════════════════════════════════════════════

function QualityGauge({ breakdown }: { breakdown: CampaignQualityScore }) {
  const { score } = breakdown;
  const level = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";

  return (
    <div className="campaign__gauge-container">
      <svg viewBox="0 0 100 65" className="campaign__gauge-svg">
        <path d={describeArc(50, 50, 36, -135, 135)} fill="none" stroke="color-mix(in srgb, var(--text-primary) 6%, transparent)" strokeWidth="7" strokeLinecap="round" />
        <path d={describeArc(50, 50, 36, -135, -135 + (score / 100) * 270)} fill="none" strokeWidth="7" strokeLinecap="round" className="campaign__gauge-fill" data-level={level} />
        <text x="50" y="44" textAnchor="middle" dominantBaseline="middle" className="campaign__gauge-score" data-level={level}>{score}</text>
        <text x="50" y="57" textAnchor="middle" dominantBaseline="middle" className="campaign__gauge-label">calidad</text>
      </svg>
      <div className="campaign__gauge-breakdown">
        {([
          { label: "Cobertura", score: breakdown.coverage },
          { label: "Tono", score: breakdown.tone },
          { label: "Canal", score: breakdown.channel },
          { label: "Cumplimiento", score: breakdown.compliance },
        ] as const).map((dim) => {
          const dl = dim.score >= 70 ? "good" : dim.score >= 40 ? "fair" : "poor";
          return (
            <div key={dim.label} className="campaign__gauge-dim">
              <span className="campaign__gauge-dim-label">{dim.label}</span>
              <div className="campaign__gauge-dim-track">
                <div className="campaign__gauge-dim-fill" data-level={dl} style={{ "--bar-width": `${dim.score}%` } as React.CSSProperties} />
              </div>
              <span className="campaign__gauge-dim-score" data-level={dl}>{dim.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeliveryRing({ total, deliverable, optOut }: { total: number; deliverable: number; optOut: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const effective = Math.max(0, deliverable - optOut);
  const failed = Math.max(0, total - deliverable);
  const effectivePct = total > 0 ? effective / total : 0;
  const optOutPct = total > 0 ? optOut / total : 0;
  const failedPct = total > 0 ? failed / total : 0;
  const eLen = effectivePct * circ;
  const oLen = optOutPct * circ;
  const fLen = failedPct * circ;
  const rate = total > 0 ? Math.round((effective / total) * 100) : 0;
  const rl = rate >= 80 ? "good" : rate >= 60 ? "fair" : "poor";

  return (
    <div className="campaign__ring-container">
      <svg viewBox="0 0 100 100" className="campaign__ring-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="color-mix(in srgb, var(--text-primary) 6%, transparent)" strokeWidth="9" />
        {eLen > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-emerald-400)" strokeWidth="9" strokeDasharray={`${eLen} ${circ - eLen}`} strokeDashoffset="0" transform="rotate(-90 50 50)" strokeLinecap="round" />}
        {oLen > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-rose-400)" strokeWidth="9" strokeDasharray={`${oLen} ${circ - oLen}`} strokeDashoffset={`${-eLen}`} transform="rotate(-90 50 50)" />}
        {fLen > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-silver-500)" strokeWidth="9" strokeDasharray={`${fLen} ${circ - fLen}`} strokeDashoffset={`${-(eLen + oLen)}`} transform="rotate(-90 50 50)" />}
        <text x="50" y="45" textAnchor="middle" dominantBaseline="middle" className="campaign__ring-score" data-level={rl}>{rate}%</text>
        <text x="50" y="58" textAnchor="middle" dominantBaseline="middle" className="campaign__ring-label">entrega</text>
      </svg>
      <div className="campaign__ring-legend">
        {([
          { label: `Efectiva: ${fmtNum(effective)}`, type: "effective" },
          { label: `Opt-out: ${fmtNum(optOut)}`, type: "optout" },
          { label: `No entregable: ${fmtNum(failed)}`, type: "failed" },
        ] as const).map((item) => (
          <div key={item.type} className="campaign__ring-legend-item">
            <span className="campaign__ring-dot" data-type={item.type} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToneBars({ profile, ideal }: {
  profile: TextToneProfile;
  ideal: { idealFormality: number; idealWarmth: number; idealUrgency: number; idealPersonalization: number };
}) {
  const dims = [
    { label: "Formalidad", actual: profile.formality, target: ideal.idealFormality },
    { label: "Calidez", actual: profile.warmth, target: ideal.idealWarmth },
    { label: "Urgencia", actual: profile.urgency, target: ideal.idealUrgency },
    { label: "Personal.", actual: profile.personalization, target: ideal.idealPersonalization },
  ];

  return (
    <div className="campaign__tone-bars">
      {dims.map((dim) => {
        const diff = Math.abs(dim.actual - dim.target);
        const ml = diff < 15 ? "good" : diff < 30 ? "fair" : "poor";
        return (
          <div key={dim.label} className="campaign__tone-bar-row">
            <span className="campaign__tone-bar-label">{dim.label}</span>
            <div className="campaign__tone-bar-track">
              <div className="campaign__tone-bar-fill" data-level={ml} style={{ "--bar-width": `${dim.actual}%` } as React.CSSProperties} />
              <div className="campaign__tone-bar-ideal" style={{ "--bar-pos": `${dim.target}%` } as React.CSSProperties} />
            </div>
            <span className="campaign__tone-bar-score">{dim.actual}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CampaignGenerator() {
  // ── State ───────────────────────────────────────────
  const [segment, setSegment] = useState("");
  const [objective, setObjective] = useState("");
  const [channel, setChannel] = useState("email");
  const [shouldFetch, setShouldFetch] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(0);

  // ── Queries ─────────────────────────────────────────
  const query = useMCPQuery<CommunicationsCampaignGenerateData>(
    "communication", "communications_campaign_generate",
    { segment, objective, channel },
    { enabled: shouldFetch },
  );
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication", "get_communication_analytics",
    { period: "last_90_days" },
    { staleTime: 300_000 },
  );
  const data = query.data ?? null;
  const clubAnalytics = analyticsQ.data?.analytics;

  // ── Intelligence computations (all delegated to lib/) ──
  const frequencyRisk = useMemo((): FrequencyRiskAssessment | null => {
    if (!data) return null;
    return parseFrequencyRiskFromDescription(data.channel_strategy.frequency);
  }, [data]);

  const engagementHealth = useMemo((): EngagementDistributionHealth | null => {
    if (!data) return null;
    return computeEngagementDistributionHealth(data.audience.by_engagement_level);
  }, [data]);

  const coverageScore = useMemo((): number => {
    if (!data) return 0;
    return computeAudienceCoverage(data.audience.total, data.audience.estimated_deliverable);
  }, [data]);

  const segmentIdeal = useMemo(() => {
    return CAMPAIGN_SEGMENT_TONE_PROFILES[segment] ?? CAMPAIGN_SEGMENT_TONE_PROFILES.Sociales;
  }, [segment]);

  const variantAnalyses = useMemo((): Array<{ tone: TextToneProfile; score: CampaignVariantScore }> => {
    if (!data) return [];
    return data.variants.map((v: CampaignVariant) => {
      const tone = analyzeTextTone(v.body);
      const score = scoreCampaignVariant(tone, segmentIdeal);
      return { tone, score };
    });
  }, [data, segmentIdeal]);

  const avgToneMatch = useMemo((): number => {
    if (variantAnalyses.length === 0) return 0;
    return Math.round(
      variantAnalyses.reduce((s, v) => s + v.score.toneMatch, 0) / variantAnalyses.length,
    );
  }, [variantAnalyses]);

  const channelFitScore = useMemo((): number => {
    if (!data || !clubAnalytics) return 70;
    const primary = data.channel_strategy.primary_channel;
    const ch = clubAnalytics.channel_breakdown.find((c) => c.channel === primary);
    return ch ? Math.min(100, Math.round(ch.percentage * 1.5 + 30)) : 60;
  }, [data, clubAnalytics]);

  const qualityBreakdown = useMemo((): CampaignQualityScore | null => {
    if (!data) return null;
    return computeCampaignQualityScores(coverageScore, avgToneMatch, channelFitScore, data.compliance_notes.length);
  }, [data, coverageScore, avgToneMatch, channelFitScore]);

  const timeSlots = useMemo((): OptimalTimeSlot[] => {
    if (!data) return [];
    return computeOptimalTimeSlots(data.channel_strategy.timing, clubAnalytics?.best_hour_to_send ?? "");
  }, [data, clubAnalytics]);

  const threadCtx = useMemo((): NarrativeThread => detectNarrativeThread(objective), [objective]);

  const scheduleCountdowns = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const DAY = 86400000;
    return [
      { label: "Draft", date: data.schedule.draft_by, days: Math.ceil((new Date(data.schedule.draft_by).getTime() - now) / DAY) },
      { label: "Revisión", date: data.schedule.review_by, days: Math.ceil((new Date(data.schedule.review_by).getTime() - now) / DAY) },
      { label: "Lanzamiento", date: data.schedule.launch_date, days: Math.ceil((new Date(data.schedule.launch_date).getTime() - now) / DAY) },
      { label: "Cierre", date: data.schedule.end_date, days: Math.ceil((new Date(data.schedule.end_date).getTime() - now) / DAY) },
    ];
  }, [data]);

  const bestVariantIdx = useMemo((): number => {
    if (variantAnalyses.length === 0) return 0;
    let best = 0;
    let bestScore = 0;
    variantAnalyses.forEach((v, i) => {
      if (v.score.composite > bestScore) { bestScore = v.score.composite; best = i; }
    });
    return best;
  }, [variantAnalyses]);

  // ── Handlers ────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!segment || !objective.trim()) {
      showToast({ type: "error", message: "Seleccioná un segmento y definí el objetivo" });
      return;
    }
    setShouldFetch(true);
    setSelectedVariant(0);
  }, [segment, objective]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: "success", message: "Contenido copiado al portapapeles" });
    } catch {
      showToast({ type: "error", message: "No se pudo copiar al portapapeles" });
    }
  }, []);

  // ═════════════════════════════════════════════════════
  // EMPTY STATE
  // ═════════════════════════════════════════════════════

  if (!shouldFetch) {
    return (
      <div className="glass-comm-campaign">
        <div className="campaign__hero">
          <div className="campaign__hero-icon"><Rocket size={28} /></div>
          <h2 className="campaign__hero-title">Generador de Campañas IA</h2>
          <p className="campaign__hero-sub">Definí el segmento, objetivo y canal. El motor AI genera una campaña completa con variantes A/B, estrategia de canales, métricas esperadas y cronograma.</p>
        </div>

        <div className="campaign__section-card">
          <div className="campaign__field">
            <label className="campaign__label">Segmento objetivo</label>
            <div className="campaign__segment-grid">
              {CAMPAIGN_SEGMENT_OPTIONS.map((seg, i) => (
                <Button variant="unstyled" key={seg.id} className="campaign__segment-btn" data-selected={segment === seg.id} data-segment={seg.token} onClick={() => setSegment(seg.id)} aria-pressed={segment === seg.id} style={{ "--stagger-i": i } as React.CSSProperties}>
                  <span className="campaign__segment-name">{seg.id}</span>
                  <span className="campaign__segment-count">{seg.count} familias</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="campaign__field">
            <label className="campaign__label" htmlFor="cg-objective">Objetivo de la campaña</label>
            <textarea id="cg-objective" value={objective} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)} placeholder="Ej: Incrementar participación en actividades deportivas del segmento Deportivos en 30%" className="campaign__textarea" rows={3} />
            <div className="campaign__suggestion-chips">
              {CAMPAIGN_OBJECTIVE_SUGGESTIONS.map((s) => (
                <Button variant="unstyled" key={s} className="campaign__suggestion-chip" data-selected={objective === s} onClick={() => setObjective(s)}>{s}</Button>
              ))}
            </div>
          </div>

          <div className="campaign__field">
            <label className="campaign__label">Canal principal</label>
            <div className="campaign__channel-grid">
              {CAMPAIGN_CHANNEL_OPTIONS.map((ch, i) => {
                const ChIcon = CHANNEL_ICONS[ch.id] ?? Mail;
                return (
                  <Button variant="unstyled" key={ch.id} className="campaign__channel-btn" data-selected={channel === ch.id} data-channel={ch.token} onClick={() => setChannel(ch.id)} aria-pressed={channel === ch.id} style={{ "--stagger-i": i } as React.CSSProperties}>
                    <ChIcon size={16} /><span>{ch.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <Button variant="unstyled" className="campaign__generate-btn" onClick={handleGenerate} disabled={!segment || !objective.trim()}>
            <Sparkles size={16} /><span>Generar Campaña</span>
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────
  if (query.isLoading && !data) {
    return (
      <div className="glass-comm-campaign">
        <div className="campaign__loading">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="campaign__skeleton campaign__skeleton--card" />)}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────
  if (!data) {
    return (
      <div className="glass-comm-campaign">
        <div className="campaign__section-card">
          <div className="campaign__error">
            <AlertTriangle size={24} /><h3>No se pudo generar</h3>
            <p>Intentá con otros parámetros.</p>
            <Button variant="unstyled" className="campaign__retry-btn" onClick={() => setShouldFetch(false)}>Nueva campaña</Button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════
  // RESULTS
  // ═════════════════════════════════════════════════════

  const engagementLevelEntries = Object.entries(data.audience.by_engagement_level) as [string, number][];
  const metricItems = [
    { label: "Apertura", value: data.expected_metrics.estimated_open_rate_pct },
    { label: "Click", value: data.expected_metrics.estimated_click_rate_pct },
    { label: "Conversión", value: data.expected_metrics.estimated_conversion_pct },
    { label: "Desuscripción", value: data.expected_metrics.estimated_unsubscribe_pct, invert: true },
  ];
  const strategyItems = [
    { label: "Canal primario", value: data.channel_strategy.primary_channel, token: "primary" },
    { label: "Canal secundario", value: data.channel_strategy.secondary_channel, token: "secondary" },
    { label: "Timing", value: data.channel_strategy.timing, token: "neutral" },
    { label: "Frecuencia", value: data.channel_strategy.frequency, token: "neutral" },
  ];

  return (
    <div className="glass-comm-campaign" data-loaded="true">
      {/* Compact Input */}
      <div className="campaign__compact-bar">
        <select value={segment} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSegment(e.target.value)} className="campaign__select campaign__select--compact">
          {CAMPAIGN_SEGMENT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.id} ({s.count})</option>)}
        </select>
        <input type="text" value={objective} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObjective(e.target.value)} className="campaign__input campaign__input--compact" />
        <Button variant="unstyled" className="campaign__generate-btn campaign__generate-btn--compact" onClick={() => {
          if (!segment || !objective.trim()) { showToast({ type: "error", message: "Completá los campos" }); return; }
          setSelectedVariant(0); query.refetch();
        }}><Sparkles size={14} /><span>Re-generar</span></Button>
      </div>

      {/* Fatigue Warning */}
      {frequencyRisk && frequencyRisk.risk !== "low" && (
        <div className="campaign__fatigue-warning" data-risk={frequencyRisk.risk}>
          <TrendingDown size={16} />
          <div>
            <span className="campaign__fatigue-label">Frecuencia: {frequencyRisk.risk === "excessive" ? "Excesiva" : frequencyRisk.risk === "high" ? "Alta" : "Normal"}</span>
            <p className="campaign__fatigue-detail">{frequencyRisk.detail}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="campaign__section-card campaign__summary">
        <h3 className="campaign__summary-name">{data.campaign_name}</h3>
        <p className="campaign__summary-segment">Segmento: {data.target_segment}</p>
        <p className="campaign__summary-objective">{data.objective}</p>
      </div>

      {/* Audience Intelligence */}
      <div className="campaign__section-card">
        <div className="campaign__section-header">
          <h3 className="campaign__section-title"><Users size={14} /> Inteligencia de Audiencia</h3>
          {engagementHealth && (
            <span className="campaign__health-badge" data-level={engagementHealth.level}>
              <Shield size={12} />{engagementHealth.level === "safe" ? "Saludable" : engagementHealth.level === "moderate" ? "Moderado" : engagementHealth.level === "elevated" ? "Elevado" : "Crítico"}
            </span>
          )}
        </div>

        <div className="campaign__audience-grid">
          {([
            { label: "Total familias", value: fmtNum(data.audience.total), token: "neutral" },
            { label: "Entregables", value: fmtNum(data.audience.estimated_deliverable), token: "positive" },
            { label: "Opt-out", value: fmtNum(data.audience.opt_out_count), token: "negative" },
            { label: "Cobertura", value: `${coverageScore}%`, token: coverageScore >= 80 ? "positive" : coverageScore >= 60 ? "neutral" : "negative" },
          ] as const).map((kpi, i) => (
            <div key={kpi.label} className="campaign__audience-kpi" style={{ "--stagger-i": i } as React.CSSProperties}>
              <span className="campaign__kpi-label">{kpi.label}</span>
              <span className="campaign__kpi-value" data-token={kpi.token}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {engagementHealth && (
          <div className="campaign__engagement-detail">
            <p className="campaign__engagement-text">{engagementHealth.detail}</p>
            <div className="campaign__engagement-bars">
              {engagementLevelEntries.map(([level, count]) => {
                const pct = data.audience.total > 0 ? Math.round((count / data.audience.total) * 100) : 0;
                return (
                  <div key={level} className="campaign__engagement-bar-row">
                    <span className="campaign__engagement-bar-label">{level}</span>
                    <div className="campaign__engagement-bar-track"><div className="campaign__engagement-bar-fill" data-level={level} style={{ "--bar-width": `${pct}%` } as React.CSSProperties} /></div>
                    <span className="campaign__engagement-bar-value" data-level={level}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="campaign__tier-section">
          <p className="campaign__tier-title">Por tier</p>
          <div className="campaign__tier-badges">
            {Object.entries(data.audience.by_tier).map(([tier, count]) => (
              <span key={tier} className="campaign__tier-badge" data-tier={tier.toLowerCase()}>{tier} <span className="campaign__tier-count">{count}</span></span>
            ))}
          </div>
        </div>
      </div>

      {/* Quality + Delivery Visuals */}
      <div className="campaign__visuals-row">
        {qualityBreakdown && (
          <div className="campaign__section-card campaign__visual-half">
            <div className="campaign__section-header"><h3 className="campaign__section-title"><Target size={14} /> Calidad</h3></div>
            <QualityGauge breakdown={qualityBreakdown} />
          </div>
        )}
        <div className="campaign__section-card campaign__visual-half">
          <div className="campaign__section-header"><h3 className="campaign__section-title"><Send size={14} /> Entrega</h3></div>
          <DeliveryRing total={data.audience.total} deliverable={data.audience.estimated_deliverable} optOut={data.audience.opt_out_count} />
        </div>
      </div>

      {/* A/B Variants */}
      {data.variants.length > 0 && (
        <div className="campaign__section-card">
          <div className="campaign__section-header">
            <h3 className="campaign__section-title"><Copy size={14} /> Variantes A/B</h3>
            <span className="campaign__best-badge">Recomendada: V{data.variants[bestVariantIdx]?.variant_id}</span>
          </div>

          <div className="campaign__variant-tabs">
            {data.variants.map((v, i) => (
              <Button variant="unstyled" key={v.variant_id} className="campaign__variant-tab" data-selected={i === selectedVariant} data-best={i === bestVariantIdx} onClick={() => setSelectedVariant(i)}>
                <span className="campaign__variant-tab-id">V{v.variant_id}</span>
                <span className="campaign__variant-tab-name">{v.name}</span>
                {variantAnalyses[i] && <span className="campaign__variant-tab-score">{variantAnalyses[i].score.composite}%</span>}
              </Button>
            ))}
          </div>

          {data.variants.length > 1 && (
            <div className="campaign__comparison-matrix">
              <div className="campaign__matrix-header"><span>Variante</span><span>Tono</span><span>Personal.</span><span>Score</span></div>
              {data.variants.map((v, i) => {
                const va = variantAnalyses[i];
                if (!va) return null;
                return (
                  <div key={v.variant_id} className="campaign__matrix-row" data-best={i === bestVariantIdx}>
                    <span className="campaign__matrix-name">V{v.variant_id}: {v.name}{i === bestVariantIdx && <span className="campaign__matrix-winner"> *</span>}</span>
                    <span className="campaign__matrix-value" data-level={va.score.toneMatch >= 70 ? "good" : va.score.toneMatch >= 40 ? "fair" : "poor"}>{va.score.toneMatch}%</span>
                    <span className="campaign__matrix-value" data-level={va.score.personalization >= 60 ? "good" : "fair"}>{va.score.personalization}%</span>
                    <span className="campaign__matrix-value campaign__matrix-composite" data-level={va.score.composite >= 70 ? "good" : va.score.composite >= 50 ? "fair" : "poor"}>{va.score.composite}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {data.variants[selectedVariant] && (() => {
            const v = data.variants[selectedVariant];
            const va = variantAnalyses[selectedVariant];
            const suggestions: string[] = [];
            if (va) {
              if (va.tone.personalization < 40) suggestions.push("Baja personalización — agregá nombre del socio o referencias específicas");
              if (va.tone.warmth < 40) suggestions.push("Tono frío — considerá agregar empatía y cercanía");
              if (va.tone.formality > 75 && (segment === "Deportivos" || segment === "Familiares")) suggestions.push("Tono más formal de lo ideal para este segmento — considerá humanizar");
              if (va.tone.wordCount < 50) suggestions.push("Mensaje muy corto — considerá expandir con más contexto");
              if (va.tone.wordCount > 350) suggestions.push("Mensaje largo — considerá condensar para mantener atención");
            }
            return (
              <div className="campaign__variant-content">
                <p className="campaign__variant-subject">{v.subject}</p>
                <p className="campaign__variant-body">{v.body}</p>
                {v.cta_text && <div className="campaign__variant-cta"><span>{v.cta_text}</span></div>}
                <div className="campaign__variant-hypothesis">
                  <p className="campaign__variant-hypothesis-label">Hipótesis</p>
                  <p className="campaign__variant-hypothesis-text">{v.hypothesis}</p>
                </div>
                {va && (
                  <div className="campaign__tone-section">
                    <p className="campaign__tone-section-label">Tono — Match: {va.score.toneMatch}%</p>
                    <ToneBars profile={va.tone} ideal={segmentIdeal} />
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div className="campaign__suggestions">
                    {suggestions.map((s, i) => <div key={i} className="campaign__suggestion-item"><Lightbulb size={12} /><span>{s}</span></div>)}
                  </div>
                )}
                <div className="campaign__variant-actions">
                  <Button variant="unstyled" className="campaign__copy-btn" onClick={() => handleCopy(v.body)}><Copy size={12} /><span>Copiar variante</span></Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Channel Strategy */}
      <div className="campaign__section-card">
        <div className="campaign__section-header">
          <h3 className="campaign__section-title"><Send size={14} /> Estrategia de Canales</h3>
          <span className="campaign__channel-fit" data-level={channelFitScore >= 70 ? "good" : channelFitScore >= 40 ? "fair" : "poor"}>Fit: {channelFitScore}%</span>
        </div>
        <div className="campaign__channel-strategy-grid">
          {strategyItems.map((item) => (
            <div key={item.label} className="campaign__channel-strategy-item" data-token={item.token}>
              <span className="campaign__channel-strategy-label">{item.label}</span>
              <span className="campaign__channel-strategy-value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="campaign__escalation-rule"><ArrowRight size={12} /><span>{data.channel_strategy.escalation_rule}</span></div>
        {clubAnalytics && (
          <div className="campaign__channel-comparison">
            <p className="campaign__channel-comparison-label">Rendimiento club (90d):</p>
            <div className="campaign__channel-comparison-items">
              {clubAnalytics.channel_breakdown.map((ch) => (
                <div key={ch.channel} className="campaign__channel-comparison-item" data-primary={ch.channel === data.channel_strategy.primary_channel}>
                  <span className="campaign__channel-comparison-name">{ch.channel}</span>
                  <span className="campaign__channel-comparison-pct">{ch.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Time Slots */}
      <div className="campaign__section-card">
        <div className="campaign__section-header"><h3 className="campaign__section-title"><Clock size={14} /> Horarios Óptimos</h3></div>
        <div className="campaign__time-slots">
          {timeSlots.map((slot, i) => (
            <div key={slot.time} className="campaign__time-slot" data-best={i === 0} style={{ "--stagger-i": i } as React.CSSProperties}>
              <span className="campaign__time-slot-score" data-best={i === 0}>{slot.score}%</span>
              <div className="campaign__time-slot-info">
                <span className="campaign__time-slot-time">{slot.time}</span>
                <span className="campaign__time-slot-label">{slot.label}</span>
              </div>
              <span className="campaign__time-slot-reason">{slot.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Narrative Context */}
      <div className="campaign__section-card campaign__narrative-context">
        <div className="campaign__section-header">
          <h3 className="campaign__section-title"><Eye size={14} /> Contexto Narrativo</h3>
          <span className="campaign__thread-badge" data-thread={threadCtx.token}>{threadCtx.label}</span>
        </div>
        <p className="campaign__narrative-framing">{threadCtx.framing}</p>
        {frequencyRisk && <p className="campaign__narrative-frequency">Frecuencia planificada: {data.channel_strategy.frequency} ({frequencyRisk.messagesPerWeek} msg/semana)</p>}
      </div>

      {/* Schedule */}
      <div className="campaign__section-card">
        <div className="campaign__section-header"><h3 className="campaign__section-title"><CalendarClock size={14} /> Cronograma</h3></div>
        <div className="campaign__schedule-timeline">
          {scheduleCountdowns.map((m, i) => {
            const isPast = m.days < 0;
            const isUrgent = m.days >= 0 && m.days <= 3;
            const isNext = i === scheduleCountdowns.findIndex((s) => s.days >= 0);
            return (
              <div key={m.label} className="campaign__schedule-milestone" data-past={isPast} data-urgent={isUrgent} data-next={isNext} style={{ "--stagger-i": i } as React.CSSProperties}>
                <div className="campaign__milestone-dot" data-past={isPast} data-urgent={isUrgent} />
                <div className="campaign__milestone-info">
                  <span className="campaign__milestone-label">{m.label}</span>
                  <span className="campaign__milestone-date">{fmtDate(m.date)}</span>
                </div>
                {!isPast && <span className="campaign__countdown-badge" data-urgent={isUrgent}>{m.days === 0 ? "Hoy" : m.days === 1 ? "Mañana" : `${m.days}d`}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expected Metrics */}
      <div className="campaign__section-card">
        <div className="campaign__section-header"><h3 className="campaign__section-title"><BarChart3 size={14} /> Métricas Esperadas</h3></div>
        <div className="campaign__metrics-grid">
          {metricItems.map((m) => {
            const good = m.invert ? m.value < 2 : m.value > 10;
            return (
              <div key={m.label} className="campaign__metric-card">
                <span className="campaign__metric-label">{m.label}</span>
                <span className="campaign__metric-value" data-level={good ? "good" : m.value > 0 ? "neutral" : "low"}>{m.value}%</span>
              </div>
            );
          })}
        </div>
        <div className="campaign__benchmark">
          <span className="campaign__benchmark-label">Benchmark:</span>
          <span className="campaign__benchmark-text">{data.expected_metrics.benchmark_comparison}</span>
        </div>
      </div>

      {/* Compliance */}
      {data.compliance_notes.length > 0 && (
        <div className="campaign__section-card">
          <div className="campaign__section-header"><h3 className="campaign__section-title"><CheckCircle2 size={14} /> Cumplimiento</h3></div>
          <div className="campaign__compliance-list">
            {data.compliance_notes.map((note, i) => (
              <div key={i} className="campaign__compliance-item"><CheckCircle2 size={10} /><span>{note}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="campaign__actions">
        <Button variant="unstyled" className="campaign__send-btn" onClick={() => showToast({ type: "info", message: "Campaña enviada para aprobación — pendiente revisión del staff" })}>
          <Send size={14} /><span>Programar Campaña</span>
        </Button>
      </div>
    </div>
  );
}