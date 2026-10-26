// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Narrative Engine
// Fase 19m REWRITE
//
// 6 innovations:
//   1. Cinematic Reading Flow (scroll-triggered progressive reveal)
//   2. Confidence Cascade (global → distribution → per-item)
//   3. Recommendation Impact Explorer (with/without action bars)
//   4. Presentation Mode (full-screen slides, keyboard nav)
//   5. Provenance Trail (data source chips on every insight)
//   6. Trajectory Projection (6-month forward in comparisons)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #14 EmptyState, #15 toast, #17 Button,
//   #18 reducedMotion, #19 on-demand, #20 breakpoint,
//   #21 responsive, #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, ChevronDown, ChevronUp,
  Clock, Target, Database, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Lightbulb, ShieldCheck, Eye, X,
  ChevronLeft, ChevronRight, Monitor,
} from "lucide-react";
import { Button, showToast } from "@/shared/components/ui";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type {
  NarrativeGenerateData, NarrativeInsight,
  NarrativeRecommendation, NarrativeComparison,
  NarrativeRiskAlert, NarrativeSection,
} from "../types";
import {
  NARRATIVE_AUDIENCE_CONFIG, NARRATIVE_DETAIL_CONFIG,
  NARRATIVE_INSIGHT_TYPE_CONFIG, NARRATIVE_PERIOD_CONFIG,
  NARRATIVE_CATEGORY_CONFIG, NARRATIVE_RISK_SEVERITY_CONFIG,
} from "../types";
import ExportButton from "@/shared/components/export/ExportButton";
import PrintView from "@/shared/components/export/PrintView";
import DecisionDocument from "@/shared/components/export/DecisionDocument";
import './NarrativeEngine.css';

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const container = document.getElementById("main-content");
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setProgress(scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function deltaColor(val: number, invert = false): string {
  if (val === 0) return "var(--color-silver-400)";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "var(--color-emerald-400)" : "var(--color-rose-400)";
}

function formatMetricValue(value: number, metric: string): string {
  if (metric === "Socios") return value.toString();
  if (metric === "Satisfacción") return `${value}/100`;
  return formatCurrency(value);
}

function projectTrajectory(current: number, yoyPct: number): number {
  return Math.round(current * (1 + yoyPct / 100 / 2));
}

function confidenceColor(pct: number): string {
  if (pct >= 80) return "var(--color-emerald-400)";
  if (pct >= 60) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function confidenceHex(pct: number): string {
  if (pct >= 80) return "#3DAA70";
  if (pct >= 60) return "#D4A840";
  return "#C46470";
}

const EXPENSE_INVERTED = new Set(["Gastos"]);

/* ══════════════════════════════════════════════════════════
   Presentation Slide Type
   ══════════════════════════════════════════════════════════ */

type PresentationSlide =
  | { kind: "summary" }
  | { kind: "insight"; index: number }
  | { kind: "comparisons" }
  | { kind: "recommendation"; index: number }
  | { kind: "risk"; index: number };

/* ══════════════════════════════════════════════════════════
   Neural Loading
   ══════════════════════════════════════════════════════════ */

function NeuralLoading({ audience }: { audience: string }) {
  const audienceLabel = NARRATIVE_AUDIENCE_CONFIG[audience]?.label ?? audience;
  return (
    <div className="glass-narrative-cascade p-8">
      <div className="relative z-[1] flex flex-col items-center justify-center py-8">
        <div className="relative w-20 h-20 mb-4">
          <Sparkles className="w-8 h-8 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-10 h-10 -mt-5 -ml-5 rounded-full border border-[rgba(201,169,110,0.25)]"
              style={{
                animation: `intel-loading-ring 2.4s ease-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">
          Generando narrativa ejecutiva...
        </p>
        <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
          Audiencia: {audienceLabel} — Analizando todos los módulos
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Confidence Cascade (Propuesta 2)
   ══════════════════════════════════════════════════════════ */

function ConfidenceCascade({ data }: { data: NarrativeGenerateData }) {
  const insightConfidences = data.insights.map((i) => i.confidence);
  const insightAvg = insightConfidences.length > 0
    ? Math.round(insightConfidences.reduce((a, b) => a + b, 0) / insightConfidences.length)
    : null;
  const high = insightConfidences.filter((c) => c >= 80).length;
  const medium = insightConfidences.filter((c) => c >= 60 && c < 80).length;
  const low = insightConfidences.filter((c) => c < 60).length;

  const overall = data.narrative_confidence;
  const r = 32;
  const circ = Math.PI * r;
  const fill = (overall / 100) * circ;

  return (
    <div className="glass-narrative-cascade p-5">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-4">
          <Target size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Confianza de la Narrativa
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Central gauge */}
          <div className="flex flex-col items-center">
            <svg width="72" height="44" viewBox="0 0 72 44" aria-hidden="true">
              <path
                d={`M ${36 - r} ${40} A ${r} ${r} 0 0 1 ${36 + r} ${40}`}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round"
              />
              <path
                d={`M ${36 - r} ${40} A ${r} ${r} 0 0 1 ${36 + r} ${40}`}
                fill="none" stroke={confidenceHex(overall)} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${fill} ${circ - fill}`}
                style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.33,1,0.68,1)" }}
              />
              <text x="36" y="34" textAnchor="middle" fill="var(--color-silver-100)" fontSize="15" fontWeight="bold" fontFamily="var(--font-display)">
                {overall}%
              </text>
            </svg>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">Global</span>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2 w-full">
            {insightAvg !== null && (
              <div className="glass-narrative-cascade__item flex items-center gap-3">
                <Lightbulb size={12} className="text-[var(--color-teal-400)] flex-shrink-0" />
                <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] w-24">
                  Insights ({data.insights.length})
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${insightAvg}%`, backgroundColor: confidenceHex(insightAvg), transition: "width 0.4s ease" }} />
                </div>
                <span className="text-xs font-[family-name:var(--font-mono)] w-8 text-right" style={{ color: confidenceColor(insightAvg) }}>
                  {insightAvg}%
                </span>
              </div>
            )}
            <div className="glass-narrative-cascade__item flex items-center gap-3">
              <Sparkles size={12} className="text-[var(--color-gold-400)] flex-shrink-0" />
              <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] w-24">
                Recomend.
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-3)]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, overall - 8)}%`, backgroundColor: confidenceHex(Math.max(0, overall - 8)), transition: "width 0.4s ease" }} />
              </div>
              <span className="text-xs font-[family-name:var(--font-mono)] w-8 text-right" style={{ color: confidenceColor(Math.max(0, overall - 8)) }}>
                {Math.max(0, overall - 8)}%
              </span>
            </div>
          </div>

          {/* Insight distribution */}
          {insightConfidences.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-[family-name:var(--font-ui)]">
              {high > 0 && (
                <span className="px-2 py-0.5 rounded bg-[color-mix(in srgb,var(--color-emerald-400)10%,transparent)] text-[var(--color-emerald-400)]">
                  {high} alta
                </span>
              )}
              {medium > 0 && (
                <span className="px-2 py-0.5 rounded bg-[color-mix(in srgb,var(--color-amber-400)10%,transparent)] text-[var(--color-amber-400)]">
                  {medium} media
                </span>
              )}
              {low > 0 && (
                <span className="px-2 py-0.5 rounded bg-[color-mix(in srgb,var(--color-rose-400)10%,transparent)] text-[var(--color-rose-400)]">
                  {low} baja
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Provenance Chip (Propuesta 5)
   ══════════════════════════════════════════════════════════ */

function ProvenanceChip({ source }: { source: string }) {
  return (
    <span className="glass-narrative-provenance" title={source}>
      <Database size={9} className="text-[var(--color-teal-400)]" />
      <span className="text-[10px] text-[var(--color-teal-400)] font-[family-name:var(--font-ui)]">
        {source}
      </span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   Presentation Mode (Propuesta 4)
   ══════════════════════════════════════════════════════════ */

function PresentationOverlay({
  data,
  isOpen,
  onClose,
}: {
  data: NarrativeGenerateData;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const reduced = useReducedMotion();

  const slides: PresentationSlide[] = useMemo(() => {
    const s: PresentationSlide[] = [{ kind: "summary" }];
    data.insights.forEach((_, i) => s.push({ kind: "insight", index: i }));
    if (data.comparisons.length > 0) s.push({ kind: "comparisons" });
    data.recommendations.forEach((_, i) => s.push({ kind: "recommendation", index: i }));
    data.risk_alerts.forEach((_, i) => s.push({ kind: "risk", index: i }));
    return s;
  }, [data]);

  const nextSlide = useCallback(() => setCurrentSlide((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prevSlide = useCallback(() => setCurrentSlide((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextSlide(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prevSlide(); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, nextSlide, prevSlide, onClose]);

  // Reset slide on open
  useEffect(() => { if (isOpen) setCurrentSlide(0); }, [isOpen]);

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  if (!slide) return null;

  const slideLabels: Record<PresentationSlide["kind"], string> = {
    summary: "Resumen Ejecutivo",
    insight: "Insight",
    comparisons: "Comparativas",
    recommendation: "Recomendación",
    risk: "Alerta de Riesgo",
  };

  const renderSlideContent = () => {
    switch (slide.kind) {
      case "summary":
        return (
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-4">
              Resumen Ejecutivo — {data.period}
            </p>
            <p className="text-xl sm:text-2xl text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed">
              {data.executive_summary}
            </p>
          </div>
        );
      case "insight": {
        const insight = data.insights[slide.index];
        if (!insight) return null;
        const cfg = NARRATIVE_INSIGHT_TYPE_CONFIG[insight.type];
        return (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase font-[family-name:var(--font-mono)]"
                style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}>
                {cfg?.label ?? insight.type}
              </span>
              <span className="text-xs font-[family-name:var(--font-mono)]" style={{ color: confidenceColor(insight.confidence) }}>
                {insight.confidence}% confianza
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-4 text-center">
              {insight.title}
            </h2>
            <p className="text-base text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed text-center mb-6">
              {insight.body}
            </p>
            {insight.impact_estimate !== 0 && (
              <p className="text-center text-3xl font-bold font-[family-name:var(--font-display)]"
                style={{ color: insight.impact_estimate > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                {insight.impact_estimate > 0 ? "+" : ""}{formatCurrency(insight.impact_estimate)}
              </p>
            )}
            <div className="flex justify-center mt-4">
              <ProvenanceChip source={insight.data_source} />
            </div>
          </div>
        );
      }
      case "comparisons": {
        return (
          <div className="max-w-3xl mx-auto w-full">
            <p className="text-xs text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-6 text-center">
              Comparativas Clave
            </p>
            <div className="space-y-3">
              {data.comparisons.map((c, idx) => {
                const invertExpense = EXPENSE_INVERTED.has(c.metric);
                return (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                    <span className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] w-40">
                      {c.metric}
                    </span>
                    <span className="text-lg font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                      {formatMetricValue(c.current, c.metric)}
                    </span>
                    <span className="text-sm font-[family-name:var(--font-mono)] flex items-center gap-1"
                      style={{ color: deltaColor(c.yoy_change_pct, invertExpense) }}>
                      {c.yoy_change_pct > 0 ? <TrendingUp size={14} /> : c.yoy_change_pct < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                      {c.yoy_change_pct > 0 ? "+" : ""}{c.yoy_change_pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case "recommendation": {
        const rec = data.recommendations[slide.index];
        if (!rec) return null;
        const priCfg = NARRATIVE_RISK_SEVERITY_CONFIG[rec.priority];
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--color-gold-400)] text-[var(--color-abyss)] font-[family-name:var(--font-mono)]">
                {slide.index + 1}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase font-[family-name:var(--font-mono)]"
                style={{ color: priCfg?.color, backgroundColor: priCfg?.bgColor }}>
                {rec.priority}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-4">
              {rec.title}
            </h2>
            <p className="text-base text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-6">
              {rec.description}
            </p>
            <p className="text-3xl font-bold font-[family-name:var(--font-display)] text-[var(--color-emerald-400)]">
              {rec.estimated_impact > 0 ? "+" : ""}{formatCurrency(rec.estimated_impact)}
            </p>
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-2">
              {rec.timeframe} — Esfuerzo: {rec.effort === "low" ? "Bajo" : rec.effort === "medium" ? "Medio" : "Alto"}
            </p>
          </div>
        );
      }
      case "risk": {
        const alert = data.risk_alerts[slide.index];
        if (!alert) return null;
        const cfg = NARRATIVE_RISK_SEVERITY_CONFIG[alert.severity];
        return (
          <div className="max-w-2xl mx-auto text-center">
            <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: cfg?.color }} />
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase font-[family-name:var(--font-mono)]"
                style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}>
                {cfg?.label ?? alert.severity}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-4">
              {alert.title}
            </h2>
            <p className="text-base text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-6">
              {alert.description}
            </p>
            <div className="inline-block p-4 rounded-xl bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)] text-left max-w-md">
              <p className="text-[10px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-1">
                Acción sugerida
              </p>
              <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                {alert.suggested_action}
              </p>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <motion.div
      className="glass-narrative-presentation"
      initial={reduced ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="glass-narrative-presentation__header">
        <div className="flex items-center gap-3">
          <Monitor size={16} className="text-[var(--color-gold-400)]" />
          <span className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
            {slideLabels[slide.kind]} {slide.kind === "insight" || slide.kind === "recommendation" || slide.kind === "risk" ? `${(slide as { index: number }).index + 1}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            {currentSlide + 1}/{slides.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-silver-500)] hover:text-[var(--color-silver-200)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar presentación"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="glass-narrative-presentation__body">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
            className="w-full"
          >
            {renderSlideContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="glass-narrative-presentation__footer">
        <button
          type="button"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-2 rounded-lg text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)] disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Slide anterior"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "glass-narrative-presentation__dot",
                i === currentSlide ? "glass-narrative-presentation__dot--active" : "glass-narrative-presentation__dot--inactive",
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="p-2 rounded-lg text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)] disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Siguiente slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function NarrativeEngine() {
  const motionV = useMotion();
  const scrollProgress = useScrollProgress();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [period, setPeriod] = useState("mayo_2026");
  const [audience, setAudience] = useState("junta");
  const [detailLevel, setDetailLevel] = useState("ejecutivo");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedImpact, setExpandedImpact] = useState<Set<string>>(new Set());
  const [showPrintView, setShowPrintView] = useState(false);
  const [showDecisionDoc, setShowDecisionDoc] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  /* ── MCP Query (on-demand, Rule #19) ── */
  const narrativeQ = useMCPQuery<{ status: string; data: NarrativeGenerateData }>(
    "finance",
    "finance_narrative_generate",
    { period, audience, detail_level: detailLevel },
    { enabled: shouldFetch, staleTime: 600_000 },
  );

  const narrative = narrativeQ.data?.data;

  /* ── Handlers ── */
  const handleGenerate = useCallback(() => {
    if (shouldFetch) {
      narrativeQ.refetch();
      showToast({ type: "info", message: "Regenerando narrativa..." });
    } else {
      setShouldFetch(true);
    }
  }, [shouldFetch, narrativeQ]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleImpact = useCallback((id: string) => {
    setExpandedImpact((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ══════════════════════════════════════════════════════
     Control Bar — glass + audience lens badge
     ══════════════════════════════════════════════════════ */

  const renderControlBar = () => (
    <div className="glass-narrative-section p-4">
      <div className="relative z-[1] flex flex-col gap-4">
        {/* Audience lens indicator */}
        <div className="flex items-center justify-between">
          <div className="narrative-lens-badge">
            <Eye size={12} className="text-[var(--color-gold-400)]" />
            <span className="text-xs font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)]">
              {NARRATIVE_AUDIENCE_CONFIG[audience]?.label ?? audience}
            </span>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              · {NARRATIVE_DETAIL_CONFIG[detailLevel]?.label}
            </span>
          </div>
          {narrative && (
            <Button
              variant="ghost"
              onClick={() => setPresentationMode(true)}
              icon={<Monitor size={14} />}
              className="text-xs min-h-[44px]"
            >
              Presentación
            </Button>
          )}
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Period */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5 font-[family-name:var(--font-ui)]">
              Período
            </p>
            <div className="flex flex-wrap gap-1.5">
              {NARRATIVE_PERIOD_CONFIG.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[40px] font-[family-name:var(--font-ui)]",
                    period === p.id
                      ? "bg-[var(--color-gold-400)] text-[var(--color-abyss)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5 font-[family-name:var(--font-ui)]">
              Audiencia
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(NARRATIVE_AUDIENCE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAudience(key)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[40px] font-[family-name:var(--font-ui)]",
                    audience === key
                      ? "bg-[var(--color-gold-400)] text-[var(--color-abyss)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]",
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5 font-[family-name:var(--font-ui)]">
              Detalle
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(NARRATIVE_DETAIL_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDetailLevel(key)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[40px] font-[family-name:var(--font-ui)]",
                    detailLevel === key
                      ? "bg-[var(--color-gold-400)] text-[var(--color-abyss)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-silver-400)] hover:text-[var(--color-silver-200)]",
                  )}
                >
                  {cfg.label}
                  <span className="ml-1 text-[10px] opacity-60">{cfg.wordCount}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleGenerate}
            icon={<Sparkles className={cn("w-4 h-4", narrativeQ.isLoading && "animate-pulse")} />}
            className="text-xs bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110"
            disabled={narrativeQ.isLoading}
          >
            {shouldFetch ? "Regenerar" : "Generar Narrativa"}
          </Button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     Empty State
     ══════════════════════════════════════════════════════ */

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6"
    >
      <div className="w-20 h-20 rounded-2xl bg-[color-mix(in srgb,var(--color-gold-400)12%,transparent)] flex items-center justify-center mb-6">
        <Sparkles size={36} className="text-[var(--color-gold-400)]" />
      </div>
      <h3 className="text-xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-200)] mb-2">
        Narrative Engine
      </h3>
      <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-body)] text-center max-w-md mb-6 leading-relaxed">
        Convierte datos crudos en inteligencia ejecutiva accionable. La AI analiza todos los módulos
        y genera un briefing narrativo personalizado con insights, recomendaciones y alertas de riesgo.
      </p>
      <Button
        variant="primary"
        onClick={handleGenerate}
        icon={<Sparkles size={16} />}
        className="text-sm bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110 px-6"
      >
        Generar Narrativa
      </Button>
      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-3">
        Tiempo estimado: ~3 segundos
      </p>
    </motion.div>
  );

  /* ══════════════════════════════════════════════════════
     Narrative Content — Cinematic Reading Flow (Propuesta 1)
     ══════════════════════════════════════════════════════ */

  const renderContent = (data: NarrativeGenerateData) => (
    <motion.div
      variants={motionV.container}
      initial={false}
      animate="visible"
      className="space-y-6"
    >
      {/* Reading Progress Bar (Propuesta 1) */}
      <div className="narrative-progress">
        <div className="narrative-progress__fill" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* ── Refetch indicator ── */}
      {narrativeQ.isLoading && (
        <div className="h-0.5 w-full bg-[var(--color-surface-3)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--color-gold-400)] rounded-full"
            animate={{ width: ["0%", "60%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      )}

      {/* ── Meta Bar ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-narrative-section p-4">
          <div className="relative z-[1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                <Clock size={12} />
                {new Date(data.generated_at).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                <FileText size={12} />
                {data.estimated_read_time_minutes} min · {data.word_count} palabras
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                module="narrativa-ejecutiva"
                data={{
                  period: data.period, audience: data.audience,
                  executive_summary: data.executive_summary, insights: data.insights,
                  recommendations: data.recommendations, comparisons: data.comparisons,
                  risk_alerts: data.risk_alerts,
                }}
                onPrint={() => setShowPrintView(true)}
                onDecisionDocument={() => setShowDecisionDoc(true)}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Executive Summary — Hero (Propuesta 1) ── */}
      <motion.div variants={motionV.item}>
        <div className="glass-narrative-hero p-6 sm:p-8">
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-[var(--color-gold-400)]" />
              <h3 className="text-sm font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)]">
                Resumen Ejecutivo
              </h3>
            </div>
            <p className="text-base sm:text-lg text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed">
              {data.executive_summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Confidence Cascade (Propuesta 2) ── */}
      <motion.div variants={motionV.item}>
        <ConfidenceCascade data={data} />
      </motion.div>

      {/* ── Key Insights — Glass + Provenance (Propuestas 1+5) ── */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Insights Clave
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-400)]">
            {data.insights.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.insights.map((insight: NarrativeInsight) => {
            const cfg = NARRATIVE_INSIGHT_TYPE_CONFIG[insight.type];
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
              >
                <div className="glass-narrative-insight p-4" style={{ borderLeft: `3px solid ${cfg?.color ?? "var(--color-silver-500)"}` }}>
                  <div className="relative z-[1]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                        style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}>
                        {cfg?.label ?? insight.type}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)] mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] leading-relaxed mb-3">
                      {insight.body}
                    </p>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {insight.impact_estimate !== 0 && (
                        <span className="text-xs font-medium font-[family-name:var(--font-mono)]"
                          style={{ color: insight.impact_estimate > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                          Impacto: {insight.impact_estimate > 0 ? "+" : ""}{formatCurrency(insight.impact_estimate)}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] font-[family-name:var(--font-ui)]" style={{ color: confidenceColor(insight.confidence) }}>
                        {insight.confidence}% confianza
                      </span>
                    </div>
                    <ProvenanceChip source={insight.data_source} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Comparisons — Table (desktop) + Cards (mobile) + Trajectory (Propuesta 6) ── */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Comparativas
          </h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block">
          <div className="glass-narrative-section overflow-hidden">
            <div className="relative z-[1] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {["Métrica", "Actual", "Anterior", "Presupuesto", "Δ YoY", "vs Presup.", "Proyección 6m"].map((h) => (
                      <th key={h} className={cn(
                        "py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]",
                        h === "Métrica" ? "text-left" : "text-right",
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.comparisons.map((c: NarrativeComparison, idx: number) => {
                    const invertExpense = EXPENSE_INVERTED.has(c.metric);
                    const projected = projectTrajectory(c.current, c.yoy_change_pct);
                    return (
                      <tr key={idx} className="border-b border-white/[0.04] last:border-0">
                        <td className="py-3 px-4 text-left text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] font-medium">
                          {c.metric}
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-200)] font-bold">
                          {formatMetricValue(c.current, c.metric)}
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                          {formatMetricValue(c.previous, c.metric)}
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                          {formatMetricValue(c.budget, c.metric)}
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] font-medium"
                          style={{ color: deltaColor(c.yoy_change_pct, invertExpense) }}>
                          <span className="flex items-center justify-end gap-1">
                            {c.yoy_change_pct > 0 ? <TrendingUp size={11} /> : c.yoy_change_pct < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                            {c.yoy_change_pct > 0 ? "+" : ""}{c.yoy_change_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-[family-name:var(--font-mono)] font-medium"
                          style={{ color: deltaColor(c.vs_budget_pct, invertExpense) }}>
                          <span className="flex items-center justify-end gap-1">
                            {c.vs_budget_pct > 0 ? <TrendingUp size={11} /> : c.vs_budget_pct < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                            {c.vs_budget_pct > 0 ? "+" : ""}{c.vs_budget_pct.toFixed(1)}%
                          </span>
                        </td>
                        {/* Trajectory Projection (Propuesta 6) */}
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-teal-400)]">
                            → {formatMetricValue(projected, c.metric)}
                          </span>
                          <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] ml-1">
                            DIC
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {data.comparisons.map((c: NarrativeComparison, idx: number) => {
            const invertExpense = EXPENSE_INVERTED.has(c.metric);
            const projected = projectTrajectory(c.current, c.yoy_change_pct);
            return (
              <div key={idx} className="glass-narrative-section p-3">
                <div className="relative z-[1]">
                  <p className="text-xs font-medium text-[var(--color-silver-500)] mb-2 font-[family-name:var(--font-ui)]">{c.metric}</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-[10px] text-[var(--color-silver-500)]">Actual</p>
                      <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                        {formatMetricValue(c.current, c.metric)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-silver-500)]">Anterior</p>
                      <p className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                        {formatMetricValue(c.previous, c.metric)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--color-silver-500)]">Proy. DIC</p>
                      <p className="text-sm font-[family-name:var(--font-mono)] text-[var(--color-teal-400)]">
                        {formatMetricValue(projected, c.metric)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2 border-t border-white/[0.04]">
                    <span className="text-xs font-medium font-[family-name:var(--font-mono)]" style={{ color: deltaColor(c.yoy_change_pct, invertExpense) }}>
                      YoY: {c.yoy_change_pct > 0 ? "+" : ""}{c.yoy_change_pct.toFixed(1)}%
                    </span>
                    <span className="text-xs font-medium font-[family-name:var(--font-mono)]" style={{ color: deltaColor(c.vs_budget_pct, invertExpense) }}>
                      vs Presup.: {c.vs_budget_pct > 0 ? "+" : ""}{c.vs_budget_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Recommendations — Impact Explorer (Propuesta 3) ── */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
            Recomendaciones
          </h3>
        </div>
        <div className="space-y-4">
          {data.recommendations.map((rec: NarrativeRecommendation, idx: number) => {
            const priCfg = NARRATIVE_RISK_SEVERITY_CONFIG[rec.priority];
            const catCfg = NARRATIVE_CATEGORY_CONFIG[rec.category];
            const isImpactOpen = expandedImpact.has(rec.id);
            const withAction = Math.abs(rec.estimated_impact);
            const withoutAction = Math.round(withAction * 0.25);
            const delta = withAction - withoutAction;
            const maxBar = withAction * 1.1;

            return (
              <div key={rec.id} className="glass-narrative-section p-5">
                <div className="relative z-[1]">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold bg-[var(--color-gold-400)] text-[var(--color-abyss)] font-[family-name:var(--font-mono)]">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                          {rec.title}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: priCfg?.color, backgroundColor: priCfg?.bgColor }}>
                          {rec.priority}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-ui)]"
                          style={{ color: catCfg?.color, backgroundColor: catCfg?.bgColor }}>
                          {catCfg?.label ?? rec.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mb-1">
                        {rec.description}
                      </p>
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)] italic mb-2">
                        {rec.rationale}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="text-xs font-medium font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)]">
                          {rec.estimated_impact > 0 ? "+" : ""}{formatCurrency(rec.estimated_impact)}
                          {rec.category === "revenue" ? "/mes" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                          <Clock size={10} /> {rec.timeframe}
                        </span>
                        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                          Esfuerzo: {rec.effort === "low" ? "Bajo" : rec.effort === "medium" ? "Medio" : "Alto"}
                        </span>
                      </div>

                      {/* Impact Explorer Toggle (Propuesta 3) */}
                      <button
                        type="button"
                        onClick={() => toggleImpact(rec.id)}
                        className="flex items-center gap-1 text-[10px] text-[var(--color-teal-400)] font-[family-name:var(--font-ui)] hover:text-[var(--color-teal-300)] transition-colors min-h-[32px]"
                      >
                        {isImpactOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isImpactOpen ? "Ocultar impacto" : "Ver impacto comparativo"}
                      </button>

                      <AnimatePresence>
                        {isImpactOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="glass-narrative-impact mt-2">
                              {/* With action */}
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] w-24 flex-shrink-0">
                                  Con acción:
                                </span>
                                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                                  <div className="glass-narrative-impact-bar h-full bg-[var(--color-emerald-400)]"
                                    style={{ width: `${(withAction / maxBar) * 100}%` }} />
                                </div>
                                <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-emerald-400)] w-24 text-right flex-shrink-0">
                                  +{formatCurrency(withAction)}
                                </span>
                              </div>
                              {/* Without action */}
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] w-24 flex-shrink-0">
                                  Sin acción:
                                </span>
                                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                                  <div className="glass-narrative-impact-bar h-full bg-[var(--color-silver-500)]"
                                    style={{ width: `${(withoutAction / maxBar) * 100}%` }} />
                                </div>
                                <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] w-24 text-right flex-shrink-0">
                                  +{formatCurrency(withoutAction)}
                                </span>
                              </div>
                              {/* Delta */}
                              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
                                <span className="text-[10px] text-[var(--color-gold-400)] font-[family-name:var(--font-ui)] w-24 flex-shrink-0 font-semibold">
                                  Delta:
                                </span>
                                <div className="flex-1" />
                                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-gold-400)] w-24 text-right flex-shrink-0">
                                  +{formatCurrency(delta)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Risk Alerts — Glass + Severity Animation ── */}
      {data.risk_alerts.length > 0 && (
        <motion.div variants={motionV.item}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-[var(--color-amber-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-amber-400)] font-[family-name:var(--font-ui)]">
              Alertas de Riesgo
            </h3>
          </div>
          <div className="space-y-3">
            {data.risk_alerts.map((alert: NarrativeRiskAlert, idx: number) => {
              const cfg = NARRATIVE_RISK_SEVERITY_CONFIG[alert.severity];
              const isCritical = alert.severity === "high";
              return (
                <div
                  key={idx}
                  className={cn(
                    "glass-narrative-risk p-4",
                    isCritical && "glass-narrative-risk--critical",
                  )}
                  style={{ "--risk-color": cfg?.color ?? "var(--color-amber-400)" } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                          {alert.title}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: cfg?.color, backgroundColor: cfg?.bgColor }}>
                          {cfg?.label ?? alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] mb-2">
                        {alert.description}
                      </p>
                      <div className="p-2.5 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)]">
                        <p className="text-[10px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-0.5">
                          Acción sugerida
                        </p>
                        <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                          {alert.suggested_action}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        {alert.affected_area}
                      </p>
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                        {new Date(alert.deadline).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Detailed Sections — Glass Accordion ── */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-[var(--color-silver-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Análisis Detallado
          </h3>
        </div>
        <div className="space-y-2">
          {data.sections.map((section: NarrativeSection) => (
            <div key={section.id} className="glass-narrative-section">
              <div className="relative z-[1]">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 min-h-[44px]",
                    "text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                  )}
                  aria-expanded={expandedSections.has(section.id)}
                >
                  <span className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    {section.title}
                  </span>
                  {expandedSections.has(section.id)
                    ? <ChevronUp size={16} className="text-[var(--color-silver-400)] flex-shrink-0" />
                    : <ChevronDown size={16} className="text-[var(--color-silver-400)] flex-shrink-0" />}
                </button>
                <AnimatePresence>
                  {expandedSections.has(section.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-white/[0.04]">
                        <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed pt-3">
                          {section.content}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {renderControlBar()}

      <AnimatePresence mode="wait">
        {!shouldFetch ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderEmptyState()}
          </motion.div>
        ) : narrativeQ.isLoading && !narrative ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NeuralLoading audience={audience} />
          </motion.div>
        ) : narrative ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderContent(narrative)}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Presentation Mode (Propuesta 4) */}
      <AnimatePresence>
        {narrative && presentationMode && (
          <PresentationOverlay
            data={narrative}
            isOpen={presentationMode}
            onClose={() => setPresentationMode(false)}
          />
        )}
      </AnimatePresence>

      {/* Print View */}
      {narrative && (
        <PrintView data={narrative} isOpen={showPrintView} onClose={() => setShowPrintView(false)} />
      )}

      {/* Decision Document */}
      <DecisionDocument isOpen={showDecisionDoc} onClose={() => setShowDecisionDoc(false)} />
    </div>
  );
}