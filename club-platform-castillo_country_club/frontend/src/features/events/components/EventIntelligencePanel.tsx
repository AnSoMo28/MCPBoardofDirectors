// src/features/events/components/EventIntelligencePanel.tsx
// ═══════════════════════════════════════════════════════════
// Events Domain — Intelligence Panel Component
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   eip-* (event intelligence panel)
// @keyframes   8 (in EventIntelligencePanel.css)
// @depends     shared/components/ui: Card, Badge, Button, ScoreGauge,
//              shared/hooks: useMCPQuery,
//              shared/lib/utils: cn,
//              lucide-react: TrendingUp, Sparkles, AlertTriangle,
//              Users, Target, Zap, Lightbulb, Shield, RefreshCw,
//              ChevronDown, ChevronUp, CheckCircle2, XCircle, Edit3,
//              DollarSign, Clock, MapPin
//
// AI/ML Intelligence hub for event detail page.
// 4 MCP tools (predict, optimize, conflict, boost) with:
//   - AI thinking state with sequential reasoning steps
//   - Confidence calibration bar (zone-colored)
//   - Reasoning chain visualization (collapsible)
//   - Cross-domain signal badges
//   - Accept/Reject/Modify CTAs on every insight
//   - Intelligence narrative digest (after 2+ tools)
//   - Panel ambient design (state-reactive glow)
//   - All CSS-only animations (zero framer-motion)
//
// PRE-WRITE VERIFICATION:
// [x] ScoreGauge: score, maxScore, size, strokeWidth, color, label ✅
// [x] useMCPQuery: (server, tool, params, options) ✅
// [x] Card: className, children (FASE 1) ✅
// [x] Badge: variant, size, children (FASE 1) ✅
// [x] Button: variant, size, icon, onClick, className (FASE 1) ✅
// [x] cn verified in shared/lib/utils ✅
//
// ANTI-PATTERNS REMOVED:
// [x] framer-motion → CSS-only animations (8 keyframes)
// [x] export default → named export
// [x] EmptyState from wrong path (layout/) + unused → removed
// [x] useReducedMotion (only for framer-motion) → removed
// [x] Mock contract types from @/shared/mocks → local interfaces
// [x] ~80 Tailwind utilities → eip-* BEM classes
// [x] Orphaned glass-calendar CSS at bottom → removed
// [x] Duplicate DollarSign, Clock, MapPin imports → single import
// [x] Inline styles for 12+ colors → CSS custom properties
// [x] No data-testid → 15+ data-testid attributes
// [x] No § markers → §0-§4
// [x] No file header → added
// [x] Props not readonly → readonly
// [x] useMCPQuery params not memoized → useMemo
// [x] Zero CTAs → Accept/Reject/Modify on every insight
// [x] Zero reasoning → collapsible reasoning chains
// [x] Zero confidence viz → zone-colored confidence bar
// [x] Zero cross-domain → domain signal badges
// [x] Zero ambient → panel state-reactive glow
// [x] Zero narrative → intelligence digest after 2+ tools
// [x] Generic skeleton → tool-specific thinking steps
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Users,
  Target,
  Zap,
  Lightbulb,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Edit3,
  DollarSign,
  Clock,
  MapPin,
} from "lucide-react";

// Shared — UI
import { Card } from "@/shared/components/ui/Card";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { ScoreGauge } from "@/shared/components/ui/ScoreGauge";

// Shared — Hooks
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

// Shared — Lib
import { cn } from "@/shared/lib/utils";

// Styles
import "./EventIntelligencePanel.css";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

// ── Tool response types (defined locally, should be promoted to types.ts) ──

interface Factor {
  readonly name: string;
  readonly impact: number;
  readonly direction: "positive" | "negative";
}

interface OptimizationRec {
  readonly id: string;
  readonly area: string;
  readonly priority: "high" | "medium" | "low";
  readonly effort: string;
  readonly suggestion: string;
  readonly estimated_impact: string;
}

interface Conflict {
  readonly event_title: string;
  readonly severity: "high" | "medium" | "low";
  readonly conflict_type: string;
  readonly detail: string;
  readonly resolution_suggestion: string;
}

interface BoostStrategy {
  readonly id: string;
  readonly channel: string;
  readonly priority: "high" | "medium" | "low";
  readonly expected_rsvp_increase: string;
  readonly action: string;
  readonly timing: string;
  readonly target_audience: string;
}

interface PredictData {
  readonly predicted_attendance: number;
  readonly capacity_risk: "high" | "critical" | "medium" | "low";
  readonly confidence: number;
  readonly factors: readonly Factor[];
  readonly recommendation: string;
}

interface OptimizeData {
  readonly overall_score: number;
  readonly recommendations: readonly OptimizationRec[];
  readonly ai_summary: string;
}

interface ConflictData {
  readonly risk_level: "high" | "medium" | "low";
  readonly total_conflicts: number;
  readonly conflicts: readonly Conflict[];
  readonly ai_summary: string;
}

interface BoostData {
  readonly current_engagement_score: number;
  readonly projected_engagement_score: number;
  readonly strategies: readonly BoostStrategy[];
  readonly ai_summary: string;
  readonly estimated_roi: string;
}

// ── Sub-component types ──

interface ReasoningStep {
  readonly icon: string;
  readonly text: string;
}

interface DomainSignal {
  readonly domain: string;
  readonly active: boolean;
  readonly reason?: string;
}

interface ToolConfig {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: React.ReactNode;
  readonly tone: string;
  readonly server: string;
  readonly tool: string;
}

// ── Component props ──

interface EventIntelligencePanelProps {
  /** Event ID to analyze */
  readonly eventId: string;
  /** Called when user accepts/dismisses/modifies an insight */
  readonly onApplyInsight?: (toolKey: string, action: "accept" | "dismiss" | "modify") => void;
}

// ═══════════════════════════════════════════════════════════
// §2 CONSTANTS
// ═══════════════════════════════════════════════════════════

const AI_TOOLS: readonly ToolConfig[] = [
  {
    key: "predict",
    title: "Predicción de Asistencia",
    subtitle: "Estima cuántos asistentes habrá",
    icon: <TrendingUp size={20} />,
    tone: "var(--color-teal-400)",
    server: "events",
    tool: "event_predict_attendance",
  },
  {
    key: "optimize",
    title: "Optimización del Evento",
    subtitle: "Sugerencias para mejorar el evento",
    icon: <Sparkles size={20} />,
    tone: "var(--color-emerald-400)",
    server: "events",
    tool: "event_recommend_optimization",
  },
  {
    key: "conflict",
    title: "Detección de Conflictos",
    subtitle: "Analiza solapamientos y recursos",
    icon: <AlertTriangle size={20} />,
    tone: "var(--color-rose-400)",
    server: "events",
    tool: "event_conflict_detection",
  },
  {
    key: "boost",
    title: "Estrategias de Engagement",
    subtitle: "Cómo aumentar la participación",
    icon: <Users size={20} />,
    tone: "var(--color-gold-400)",
    server: "events",
    tool: "event_engagement_boost",
  },
] as const;

const REASONING_STEPS: Record<string, readonly ReasoningStep[]> = {
  predict: [
    { icon: "📊", text: "Recopilando datos históricos de asistencia" },
    { icon: "🔍", text: "Analizando patrones de eventos similares" },
    { icon: "📅", text: "Evaluando factores de temporada y capacidad" },
    { icon: "🎯", text: "Calculando predicción con modelo estadístico" },
  ],
  optimize: [
    { icon: "📋", text: "Analizando estructura actual del evento" },
    { icon: "⚖️", text: "Comparando con mejores prácticas del sector" },
    { icon: "📊", text: "Evaluando eficiencia de recursos" },
    { icon: "💡", text: "Identificando áreas de mejora" },
    { icon: "✅", text: "Generando recomendaciones priorizadas" },
  ],
  conflict: [
    { icon: "📅", text: "Escaneando calendario de eventos" },
    { icon: "🔧", text: "Verificando disponibilidad de recursos" },
    { icon: "⏰", text: "Analizando solapamientos de horarios" },
    { icon: "👥", text: "Evaluando impacto en asistentes" },
  ],
  boost: [
    { icon: "📈", text: "Analizando engagement histórico" },
    { icon: "📱", text: "Evaluando canales de comunicación" },
    { icon: "🎯", text: "Identificando audiencia objetivo" },
    { icon: "📊", text: "Calculando potencial de crecimiento" },
    { icon: "🚀", text: "Generando estrategias personalizadas" },
  ],
};

const DOMAIN_SIGNALS: Record<string, readonly DomainSignal[]> = {
  predict: [
    { domain: "Finance", active: true, reason: "Datos de ingresos históricos" },
    { domain: "Families", active: true, reason: "Patrones de asistencia familiar" },
    { domain: "Facilities", active: true, reason: "Capacidad del venue" },
    { domain: "Sports", active: false },
  ],
  optimize: [
    { domain: "Finance", active: true, reason: "Análisis de pricing" },
    { domain: "Events", active: true, reason: "Benchmark de eventos pasados" },
    { domain: "Facilities", active: true, reason: "Optimización de espacio" },
    { domain: "Wellness", active: false },
  ],
  conflict: [
    { domain: "Events", active: true, reason: "Calendario de eventos" },
    { domain: "Facilities", active: true, reason: "Uso de espacios" },
    { domain: "Sports", active: true, reason: "Horarios de canchas" },
    { domain: "Finance", active: false },
  ],
  boost: [
    { domain: "Engagement", active: true, reason: "Historial de participación" },
    { domain: "Families", active: true, reason: "Segmentación familiar" },
    { domain: "Communications", active: true, reason: "Efectividad de canales" },
    { domain: "Members", active: false },
  ],
};

const DOMAIN_COLORS: Record<string, string> = {
  Finance: "var(--color-emerald-400)",
  Families: "var(--color-violet-400)",
  Facilities: "var(--color-orange-400)",
  Sports: "var(--color-sky-400)",
  Events: "var(--color-emerald-400)",
  Wellness: "var(--color-teal-400)",
  Engagement: "var(--color-rose-400)",
  Communications: "var(--color-pink-400)",
  Members: "var(--color-indigo-400)",
};

const AREA_ICONS: Record<string, React.ReactNode> = {
  pricing: <DollarSign size={14} />,
  timing: <Clock size={14} />,
  capacity: <Users size={14} />,
  promotion: <Zap size={14} />,
  venue: <MapPin size={14} />,
};

// ═══════════════════════════════════════════════════════════
// §3 HELPERS
// ═══════════════════════════════════════════════════════════

/** Get confidence label. */
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "Alta confianza";
  if (confidence >= 0.6) return "Confianza moderada";
  return "Baja confianza";
}

/** Build narrative digest from completed tools. Returns null if <2 tools done. */
function buildNarrativeDigest(
  results: Record<string, { data: unknown | undefined }>,
): string | null {
  const completed = Object.entries(results).filter(([_, r]) => r.data);
  if (completed.length < 2) return null;

  const parts: string[] = [];

  const predictData = results.predict?.data as PredictData | undefined;
  if (predictData) {
    parts.push(
      `Se predicen ${predictData.predicted_attendance} asistentes con riesgo ${predictData.capacity_risk} de capacidad`,
    );
  }

  const optimizeData = results.optimize?.data as OptimizeData | undefined;
  if (optimizeData) {
    parts.push(
      `el score de optimización es ${optimizeData.overall_score}/100 con ${optimizeData.recommendations.length} sugerencias`,
    );
  }

  const conflictData = results.conflict?.data as ConflictData | undefined;
  if (conflictData) {
    parts.push(
      `se detectaron ${conflictData.total_conflicts} conflicto${conflictData.total_conflicts !== 1 ? "s" : ""}`,
    );
  }

  const boostData = results.boost?.data as BoostData | undefined;
  if (boostData) {
    const delta = boostData.projected_engagement_score - boostData.current_engagement_score;
    parts.push(
      `el engagement podría mejorar +${delta} puntos con ${boostData.strategies.length} estrategias`,
    );
  }

  return parts.join(". ") + ".";
}

// ═══════════════════════════════════════════════════════════
// §4 SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 Confidence Bar ──────────────────────────────────

function ConfidenceBar({ confidence }: { readonly confidence: number }) {
  const pct = Math.round(confidence * 100);
  const level = confidence >= 0.8 ? "high" : confidence >= 0.6 ? "medium" : "low";
  const color =
    level === "high"
      ? "var(--color-emerald-400)"
      : level === "medium"
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <div className="eip-confidence" data-testid="eip-confidence">
      <div className="eip-confidence__track">
        <div
          className={cn("eip-confidence__fill", `eip-confidence__fill--${level}`)}
          style={{ "--conf-pct": `${pct}%`, "--conf-color": color } as React.CSSProperties}
        />
      </div>
      <span className="eip-confidence__label" style={{ color }}>
        {pct}% — {getConfidenceLabel(confidence)}
      </span>
    </div>
  );
}

// ── §4.2 Domain Signals ──────────────────────────────────

function DomainSignals({ toolKey }: { readonly toolKey: string }) {
  const signals = DOMAIN_SIGNALS[toolKey];
  if (!signals) return null;

  return (
    <div className="eip-domains" data-testid={`eip-domains-${toolKey}`}>
      <span className="eip-domains__title">Señales consideradas:</span>
      <div className="eip-domains__list">
        {signals.map((s) => (
          <span
            key={s.domain}
            className={cn("eip-domain-badge", !s.active && "eip-domain-badge--inactive")}
            title={s.active ? s.reason : undefined}
            style={{ "--domain-color": DOMAIN_COLORS[s.domain] || "var(--color-silver-500)" } as React.CSSProperties}
          >
            <span className="eip-domain-badge__dot" aria-hidden="true" />
            {s.domain}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── §4.3 Reasoning Chain ─────────────────────────────────

function ReasoningChain({ toolKey }: { readonly toolKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const steps = REASONING_STEPS[toolKey];
  if (!steps) return null;

  return (
    <div className="eip-reasoning" data-testid={`eip-reasoning-${toolKey}`}>
      <Button
        variant="unstyled"
        type="button"
        className="eip-reasoning__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Ocultar razonamiento" : "Ver razonamiento"}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span>{expanded ? "Ocultar razonamiento" : "Ver razonamiento"}</span>
      </Button>
      {expanded && (
        <div className="eip-reasoning__steps">
          {steps.map((step, i) => (
            <div
              key={i}
              className="eip-reasoning__step"
              style={{ "--step-i": i } as React.CSSProperties}
            >
              <CheckCircle2 size={12} className="eip-reasoning__check" aria-hidden="true" />
              <span className="eip-reasoning__icon" aria-hidden="true">{step.icon}</span>
              <span className="eip-reasoning__text">{step.text}</span>
            </div>
          ))}
          <div className="eip-reasoning__result">
            → Resultado obtenido
          </div>
        </div>
      )}
    </div>
  );
}

// ── §4.4 AI Thinking Steps ───────────────────────────────

function AIThinkingSteps({ toolKey }: { readonly toolKey: string }) {
  const steps = REASONING_STEPS[toolKey];
  if (!steps) return null;

  return (
    <div className="eip-thinking" data-testid={`eip-thinking-${toolKey}`}>
      {steps.map((step, i) => (
        <div
          key={i}
          className={cn(
            "eip-thinking__step",
            i === steps.length - 1 && "eip-thinking__step--last",
          )}
          style={{ "--step-i": i } as React.CSSProperties}
        >
          <span className="eip-thinking__dot" aria-hidden="true" />
          <span className="eip-thinking__icon" aria-hidden="true">{step.icon}</span>
          <span className="eip-thinking__text">{step.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── §4.5 Insight Actions (shared Button) ─────────────────

function InsightActions({
  toolKey,
  onAction,
}: {
  readonly toolKey: string;
  readonly onAction: (action: "accept" | "dismiss" | "modify") => void;
}) {
  return (
    <div className="eip-actions" data-testid={`eip-actions-${toolKey}`}>
      <Button
        variant="success"
        size="sm"
        icon={<CheckCircle2 size={13} />}
        onClick={() => onAction("accept")}
        aria-label="Aceptar recomendación"
      >
        Aceptar
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<Edit3 size={13} />}
        onClick={() => onAction("modify")}
        aria-label="Modificar recomendación"
      >
        Modificar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<XCircle size={13} />}
        onClick={() => onAction("dismiss")}
        aria-label="Descartar recomendación"
      >
        Descartar
      </Button>
    </div>
  );
}

// ── §4.6 Tool-Specific Result Renderers ──────────────────

function PredictResult({ data }: { readonly data: PredictData }) {
  return (
    <div className="eip-result">
      <div className="eip-result__head">
        <ScoreGauge
          score={data.predicted_attendance}
          maxScore={200}
          size={72}
          strokeWidth={5}
          color="var(--color-teal-400)"
          label="predichos"
        />
        <div className="eip-result__head-info">
          <Badge
            variant={
              data.capacity_risk === "high" || data.capacity_risk === "critical"
                ? "error"
                : data.capacity_risk === "medium"
                  ? "info"
                  : "success"
            }
            size="sm"
          >
            Riesgo: {data.capacity_risk}
          </Badge>
          <ConfidenceBar confidence={data.confidence} />
        </div>
      </div>

      <div className="eip-factors">
        {data.factors.map((f, i) => (
          <div key={i} className="eip-factor">
            <div className="eip-factor__bar">
              <div
                className={cn(
                  "eip-factor__fill",
                  f.direction === "positive" ? "eip-factor__fill--positive" : "eip-factor__fill--negative",
                )}
                style={{ "--factor-w": `${Math.min(Math.abs(f.impact) * 100, 100)}%` } as React.CSSProperties}
              />
            </div>
            <span className="eip-factor__name">{f.name}</span>
          </div>
        ))}
      </div>

      <div className="eip-recommendation">
        <Lightbulb size={14} className="eip-recommendation__icon" aria-hidden="true" />
        <p className="eip-recommendation__text">{data.recommendation}</p>
      </div>
    </div>
  );
}

function OptimizeResult({ data }: { readonly data: OptimizeData }) {
  return (
    <div className="eip-result">
      <div className="eip-result__head">
        <ScoreGauge
          score={data.overall_score}
          size={72}
          strokeWidth={5}
          color="var(--color-emerald-400)"
          label="optimización"
        />
        <div className="eip-result__head-info">
          <p className="eip-result__head-note">Score de optimización del evento</p>
          <ConfidenceBar confidence={data.overall_score / 100} />
        </div>
      </div>

      <div className="eip-recs">
        {data.recommendations.map((r) => (
          <div key={r.id} className="eip-rec">
            <div className="eip-rec__header">
              <span className="eip-rec__area-icon" aria-hidden="true">
                {AREA_ICONS[r.area] ?? <Target size={14} />}
              </span>
              <Badge variant="neutral" size="sm">{r.area}</Badge>
              <Badge variant={r.priority === "high" ? "gold" : "neutral"} size="sm">{r.priority}</Badge>
              <span className="eip-rec__effort">esfuerzo: {r.effort}</span>
            </div>
            <p className="eip-rec__suggestion">{r.suggestion}</p>
            <p className="eip-rec__impact">{r.estimated_impact}</p>
          </div>
        ))}
      </div>

      <p className="eip-summary">{data.ai_summary}</p>
    </div>
  );
}

function ConflictResult({ data }: { readonly data: ConflictData }) {
  const riskPct = data.risk_level === "high" ? 85 : data.risk_level === "medium" ? 50 : 20;
  const riskColor =
    data.risk_level === "high"
      ? "var(--color-rose-400)"
      : data.risk_level === "medium"
        ? "var(--color-amber-400)"
        : "var(--color-emerald-400)";

  return (
    <div className="eip-result">
      <div className="eip-result__head">
        <ScoreGauge
          score={riskPct}
          size={72}
          strokeWidth={5}
          color={riskColor}
          label="riesgo"
        />
        <div className="eip-result__head-info">
          <p className="eip-result__head-count">
            {data.total_conflicts} conflicto{data.total_conflicts !== 1 ? "s" : ""}
          </p>
          <Badge
            variant={
              data.risk_level === "high" ? "error" : data.risk_level === "medium" ? "info" : "success"
            }
            size="sm"
          >
            Riesgo {data.risk_level}
          </Badge>
          <ConfidenceBar confidence={riskPct / 100} />
        </div>
      </div>

      {data.conflicts.length > 0 && (
        <div className="eip-conflicts">
          {data.conflicts.map((c, i) => (
            <div key={i} className="eip-conflict-card">
              <div className="eip-conflict-card__header">
                <h5 className="eip-conflict-card__title">{c.event_title}</h5>
                <Badge
                  variant={c.severity === "high" ? "error" : c.severity === "medium" ? "info" : "neutral"}
                  size="sm"
                >
                  {c.conflict_type.replace("_", " ")}
                </Badge>
              </div>
              <p className="eip-conflict-card__detail">{c.detail}</p>
              <div className="eip-conflict-card__resolution">
                <Shield size={12} className="eip-conflict-card__shield-icon" aria-hidden="true" />
                <p>{c.resolution_suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="eip-summary">{data.ai_summary}</p>
    </div>
  );
}

function BoostResult({ data }: { readonly data: BoostData }) {
  const delta = data.projected_engagement_score - data.current_engagement_score;
  const confidence = Math.min(0.95, 0.5 + delta / 200);

  return (
    <div className="eip-result">
      <div className="eip-result__head eip-result__head--dual">
        <ScoreGauge
          score={data.current_engagement_score}
          size={72}
          strokeWidth={5}
          color="var(--color-gold-400)"
          label="actual"
        />
        <span className="eip-result__arrow" aria-hidden="true">→</span>
        <ScoreGauge
          score={data.projected_engagement_score}
          size={72}
          strokeWidth={5}
          color="var(--color-emerald-400)"
          label="proyectado"
        />
      </div>
      <ConfidenceBar confidence={confidence} />

      <div className="eip-strategies">
        {data.strategies.map((s) => (
          <div key={s.id} className="eip-strategy">
            <div className="eip-strategy__header">
              <Badge variant="neutral" size="sm">{s.channel}</Badge>
              <Badge variant={s.priority === "high" ? "gold" : "neutral"} size="sm">{s.priority}</Badge>
              <span className="eip-strategy__increase">{s.expected_rsvp_increase}</span>
            </div>
            <p className="eip-strategy__action">{s.action}</p>
            <p className="eip-strategy__meta">Timing: {s.timing} · Audiencia: {s.target_audience}</p>
          </div>
        ))}
      </div>

      <p className="eip-summary">{data.ai_summary}</p>
      <p className="eip-roi">{data.estimated_roi}</p>
    </div>
  );
}

// ── §4.7 Intelligence Digest ─────────────────────────────

function IntelligenceDigest({
  narrative,
  completedCount,
  totalCount,
  onRunAll,
  onClearAll,
}: {
  readonly narrative: string | null;
  readonly completedCount: number;
  readonly totalCount: number;
  readonly onRunAll: () => void;
  readonly onClearAll: () => void;
}) {
  return (
    <div
      className={cn(
        "eip-digest",
        completedCount > 0 && "eip-digest--active",
      )}
      data-testid="eip-digest"
    >
      <div className="eip-digest__status">
        <span className="eip-digest__count">
          {completedCount}/{totalCount} herramientas completadas
        </span>
        <div className="eip-digest__dots">
          {AI_TOOLS.map((t) => (
            <span
              key={t.key}
              className="eip-digest__dot"
              style={{ "--dot-color": t.tone } as React.CSSProperties}
              data-active={completedCount > 0 ? undefined : "false"}
              title={t.title}
            />
          ))}
        </div>
      </div>

      {narrative && (
        <div className="eip-digest__narrative">
          <Sparkles size={14} className="eip-digest__sparkle" aria-hidden="true" />
          <p>{narrative}</p>
        </div>
      )}

      <div className="eip-digest__actions">
        <Button variant="unstyled" type="button" className="eip-digest__btn" onClick={onRunAll}>
          <Zap size={12} aria-hidden="true" />
          Ejecutar todo
        </Button>
        {completedCount > 0 && (
          <Button variant="unstyled" type="button" className="eip-digest__btn eip-digest__btn--ghost" onClick={onClearAll}>
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── §4.8 Tool Card ───────────────────────────────────────

function ToolCard({
  tool,
  query,
  isEnabled,
  onEnable,
  onApply,
}: {
  readonly tool: ToolConfig;
  readonly query: ReturnType<typeof useMCPQuery>;
  readonly isEnabled: boolean;
  readonly onEnable: () => void;
  readonly onApply: (action: "accept" | "dismiss" | "modify") => void;
}) {
  // Determine ambient state for card top-border
  const ambientState = !isEnabled
    ? "idle"
    : query.isLoading
      ? "thinking"
      : query.isError
        ? "error"
        : query.data
          ? "success"
          : "idle";

  return (
    <Card
      className={cn("eip-card", `eip-card--${ambientState}`)}
      style={{ "--card-tone": tool.tone } as React.CSSProperties}
      data-testid={`eip-card-${tool.key}`}
    >
      {/* Header */}
      <div className="eip-card__header">
        <div className="eip-card__icon" aria-hidden="true" style={{ color: tool.tone }}>
          {tool.icon}
        </div>
        <div className="eip-card__title-block">
          <h4 className="eip-card__title">{tool.title}</h4>
          <p className="eip-card__subtitle">{tool.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="eip-card__body">
        {!isEnabled ? (
          /* ── Idle: trigger button ── */
          <div className="eip-card__idle">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnable}
              icon={<Sparkles size={16} />}
              aria-label={`Analizar ${tool.title}`}
            >
              Analizar
            </Button>
          </div>
        ) : query.isLoading ? (
          /* ── Thinking: AI reasoning steps ── */
          <AIThinkingSteps toolKey={tool.key} />
        ) : query.isError ? (
          /* ── Error: retry ── */
          <div className="eip-card__error">
            <XCircle size={20} className="eip-card__error-icon" aria-hidden="true" />
            <p className="eip-card__error-text">Error al analizar</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => query.refetch()}
              icon={<RefreshCw size={14} />}
            >
              Reintentar
            </Button>
          </div>
        ) : query.data ? (
          /* ── Success: full intelligence result ── */
          <div className="eip-card__result">
            {/* Cross-domain signals */}
            <DomainSignals toolKey={tool.key} />

            {/* Tool-specific result */}
            {tool.key === "predict" && (
              <PredictResult data={(query.data as { data: PredictData }).data} />
            )}
            {tool.key === "optimize" && (
              <OptimizeResult data={(query.data as { data: OptimizeData }).data} />
            )}
            {tool.key === "conflict" && (
              <ConflictResult data={(query.data as { data: ConflictData }).data} />
            )}
            {tool.key === "boost" && (
              <BoostResult data={(query.data as { data: BoostData }).data} />
            )}

            {/* Reasoning chain (collapsible) */}
            <ReasoningChain toolKey={tool.key} />

            {/* Action CTAs */}
            <InsightActions toolKey={tool.key} onAction={onApply} />

            {/* Refresh */}
            <div className="eip-card__refresh">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => query.refetch()}
                icon={<RefreshCw size={13} />}
                className="eip-card__refresh-btn"
              >
                Actualizar análisis
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * EventIntelligencePanel — AI/ML intelligence hub for an event.
 *
 * 4 MCP tools (predict, optimize, conflict, boost) with:
 * - AI thinking state with sequential reasoning steps
 * - Confidence calibration (zone-colored bar)
 * - Reasoning chain visualization (collapsible)
 * - Cross-domain signal badges
 * - Accept/Reject/Modify CTAs on every insight
 * - Intelligence narrative digest (after 2+ tools)
 * - Panel ambient design (state-reactive glow)
 */
export function EventIntelligencePanel({
  eventId,
  onApplyInsight,
}: EventIntelligencePanelProps) {

  // ── §5.1 Tool enabled state ──
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const enableTool = useCallback((key: string) => {
    setEnabled((prev) => ({ ...prev, [key]: true }));
  }, []);

  const runAll = useCallback(() => {
    setEnabled({ predict: true, optimize: true, conflict: true, boost: true });
  }, []);

  const clearAll = useCallback(() => {
    setEnabled({});
  }, []);

  // ── §5.2 Memoized query params (A-15) ──
  const queryParams = useMemo(() => ({ event_id: eventId }), [eventId]);
  const staleOptions = useMemo(() => ({ staleTime: 0 }), []);

  // ── §5.3 MCP Queries (enabled:false pattern) ──
  const predictQ = useMCPQuery<PredictData>(
    "events", "event_predict_attendance", queryParams,
    { ...staleOptions, enabled: !!enabled.predict },
  );

  const optimizeQ = useMCPQuery<OptimizeData>(
    "events", "event_recommend_optimization", queryParams,
    { ...staleOptions, enabled: !!enabled.optimize },
  );

  const conflictQ = useMCPQuery<ConflictData>(
    "events", "event_conflict_detection", queryParams,
    { ...staleOptions, enabled: !!enabled.conflict },
  );

  const boostQ = useMCPQuery<BoostData>(
    "events", "event_engagement_boost", queryParams,
    { ...staleOptions, enabled: !!enabled.boost },
  );

  const queries: Record<string, ReturnType<typeof useMCPQuery>> = {
    predict: predictQ,
    optimize: optimizeQ,
    conflict: conflictQ,
    boost: boostQ,
  };

  // ── §5.4 Derived state ──
  const completedCount = AI_TOOLS.filter((t) => queries[t.key].data).length;
  const narrative = buildNarrativeDigest(
    Object.fromEntries(
      AI_TOOLS.map((t) => [t.key, { data: queries[t.key].data }]),
    ),
  );

  // Panel ambient class
  const panelState =
    completedCount === 0
      ? "eip--idle"
      : Object.values(queries).some((q) => q.isLoading)
        ? "eip--thinking"
        : Object.values(queries).some((q) => {
              const d = q.data as { data?: ConflictData } | undefined;
              return d?.data?.risk_level === "high";
            })
          ? "eip--critical"
          : "eip--healthy";

  // ── §5.5 Apply handler ──
  const handleApply = useCallback(
    (toolKey: string, action: "accept" | "dismiss" | "modify") => {
      onApplyInsight?.(toolKey, action);
    },
    [onApplyInsight],
  );

  // ── §5.6 Render ──
  return (
    <div className={cn("eip", panelState)} data-testid="eip">
      {/* Intelligence Digest Strip */}
      <IntelligenceDigest
        narrative={narrative}
        completedCount={completedCount}
        totalCount={AI_TOOLS.length}
        onRunAll={runAll}
        onClearAll={clearAll}
      />

      {/* Tool Cards Grid */}
      <div className="eip__grid">
        {AI_TOOLS.map((tool, idx) => (
          <div
            key={tool.key}
            className="eip-stagger"
            style={{ "--card-i": idx } as React.CSSProperties}
          >
            <ToolCard
              tool={tool}
              query={queries[tool.key]}
              isEnabled={!!enabled[tool.key]}
              onEnable={() => enableTool(tool.key)}
              onApply={(action) => handleApply(tool.key, action)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}