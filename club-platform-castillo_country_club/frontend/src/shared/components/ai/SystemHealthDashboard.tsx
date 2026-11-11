// src/shared/components/ai/SystemHealthDashboard.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — System Health Dashboard
// Neural Consciousness Console — Fase 23 AI
//
// Crown jewel. Multi-layer consciousness ring, vital signs
// EKG, score count-up, dynamic ambient glow, glass console.
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  GitMerge,
  Layers,
  Lightbulb,
  Minus,
  Pause,
  Play,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  SystemHealthReport,
  RulePerformanceScore,
  RedundantPair,
  ConfidenceDrift,
  DomainCoverage,
  EvolutionEvent,
  SelfAwarenessScore,
  SuppressionDecision,
  EvolutionProposal,
} from "@/shared/lib/advisor-engine/evolution-types";
import {
  TIER_CONFIG,
  DRIFT_TYPE_CONFIG,
  EVOLUTION_ACTION_CONFIG,
  AWARENESS_STATUS_CONFIG,
  PROPOSAL_STATUS_CONFIG,
} from "@/shared/lib/advisor-engine/evolution-types";

import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import './SystemHealthDashboard.css';

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const ACTION_ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Pause,
  Play,
  Plus,
  Sliders,
  Shield,
  TrendingUp,
  Target,
  CheckCircle2,
  Activity,
  GitMerge,
};

const SUB_LABEL: Record<string, string> = {
  ruleHealth: "Reglas",
  coverage: "Cobertura",
  calibrationQuality: "Calibración",
  predictionAccuracy: "Predicción",
  userAdoption: "Adopción",
  evolutionActivity: "Evolución",
};

const GLOW_CLASS: Record<string, string> = {
  thriving: "glass-health__glow--thriving",
  healthy: "glass-health__glow--healthy",
  needs_attention: "glass-health__glow--needs",
  critical: "glass-health__glow--critical",
};

const VITAL_COLOR: Record<string, string> = {
  thriving: "var(--color-emerald-400)",
  healthy: "var(--color-teal-400)",
  needs_attention: "var(--color-amber-400)",
  critical: "var(--color-rose-400)",
};

const EASE = [0.16, 1, 0.3, 1] as any;

// ═══════════════════════════════════════════════
// SVG HELPERS
// ═══════════════════════════════════════════════

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, startDeg + sweepDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ═══════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════

function useCountUp(
  target: number,
  duration: number,
  enabled: boolean,
) {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    let start = 0;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return value;
}

function useSystemHealthDashboard(report: SystemHealthReport) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["awareness", "rules", "proposals"]),
  );
  const [flashId, setFlashId] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);

  const toggle = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const pendingProposals = useMemo(
    () => report.proposals.filter((p) => p.status === "pending"),
    [report.proposals],
  );

  const triggerFlash = useCallback(
    (id: string, type: "approve" | "reject") => {
      setFlashId({ id, type });
      setTimeout(() => setFlashId(null), 700);
    },
    [],
  );

  return {
    expandedSections,
    toggle,
    pendingProposals,
    flashId,
    triggerFlash,
  };
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

/* Vital Signs EKG */
function VitalSignsWave({ status }: { status: string }) {
  const color = VITAL_COLOR[status] ?? VITAL_COLOR.healthy;
  return (
    <svg
      className="glass-health__vital-svg"
      viewBox="0 0 400 60"
      preserveAspectRatio="none"
    >
      <path
        className="glass-health__vital-line"
        stroke={color}
        d="M 0,30 L 50,30 L 60,30 L 70,24 L 78,30 L 95,30 L 105,8 L 115,52 L 120,5 L 126,42 L 132,30 L 170,30 L 180,30 L 190,24 L 198,30 L 215,30 L 225,8 L 235,52 L 240,5 L 246,42 L 252,30 L 290,30 L 300,30 L 310,24 L 318,30 L 335,30 L 345,8 L 355,52 L 360,5 L 366,42 L 372,30 L 400,30"
      />
    </svg>
  );
}

/* Consciousness Ring — multi-layer SVG */
function ConsciousnessRing({
  overall,
  status,
  subScores,
  reduced,
}: {
  overall: number;
  status: SelfAwarenessScore["status"];
  subScores: Record<string, { value: number; weight: number }>;
  reduced: boolean;
}) {
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 78;
  const innerR = 62;
  const outerStroke = 8;
  const innerStroke = 5;

  const color = AWARENESS_STATUS_CONFIG[status].color;
  const circOuter = 2 * Math.PI * outerR;
  const arcOuter = circOuter * 0.75;
  const offsetOuter = arcOuter - (overall / 100) * arcOuter;

  const subEntries = Object.entries(subScores);
  const SEG_COUNT = subEntries.length || 6;
  const GAP_DEG = 8;
  const SEG_DEG = (270 - GAP_DEG * (SEG_COUNT - 1)) / SEG_COUNT;
  const starts = subEntries.map(
    (_, i) => -135 + i * (SEG_DEG + GAP_DEG),
  );

  const displayScore = useCountUp(overall, 1400, !reduced);

  return (
    <div
      className="glass-health__ring-wrap"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size}>
        {/* Outer track */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={outerStroke}
          strokeLinecap="round"
          strokeDasharray={`${arcOuter} ${circOuter - arcOuter}`}
          transform={`rotate(-135 ${cx} ${cy})`}
        />
        {/* Outer fill */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={color}
          strokeWidth={outerStroke}
          strokeLinecap="round"
          strokeDasharray={`${arcOuter} ${circOuter - arcOuter}`}
          transform={`rotate(-135 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          initial={reduced ? undefined : { strokeDashoffset: arcOuter }}
          animate={{ strokeDashoffset: offsetOuter }}
          transition={{ duration: reduced ? 0 : 1.4, ease: EASE, delay: 0.3 }}
        />

        {/* Inner sub-score segments */}
        {subEntries.map(([key, sub], i) => {
          const start = starts[i];
          const subColor =
            sub.value >= 70
              ? "var(--color-emerald-400)"
              : sub.value >= 45
                ? "var(--color-amber-400)"
                : "var(--color-rose-400)";
          const fillDeg = (sub.value / 100) * SEG_DEG;
          const trackD = describeArc(cx, cy, innerR, start, SEG_DEG);
          const fillD = fillDeg > 0 ? describeArc(cx, cy, innerR, start, fillDeg) : "";

          return (
            <g key={key}>
              <path
                d={trackD}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={innerStroke}
                strokeLinecap="round"
              />
              {fillDeg > 0 && (
                <motion.path
                  d={fillD}
                  fill="none"
                  stroke={subColor}
                  strokeWidth={innerStroke}
                  strokeLinecap="round"
                  initial={reduced ? undefined : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: reduced ? 0 : 0.8,
                    delay: 0.6 + i * 0.1,
                    ease: EASE,
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Center value */}
      <div className="glass-health__ring-center">
        <motion.span
          className="text-4xl font-black font-[family-name:var(--font-display)]"
          style={{ color }}
          initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {displayScore}
        </motion.span>
        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
          / 100
        </span>
      </div>
    </div>
  );
}

/* Sub-Score Row */
function SubScoreRow({
  name,
  sub,
  delay,
  reduced,
}: {
  name: string;
  sub: { value: number; weight: number; description: string };
  delay: number;
  reduced: boolean;
}) {
  const color =
    sub.value >= 70
      ? "var(--color-emerald-400)"
      : sub.value >= 45
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)";

  return (
    <motion.div
      className="glass-health__sub-row"
      initial={reduced ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay, ease: EASE }}
    >
      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] w-20 truncate">
        {SUB_LABEL[name] ?? name}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${sub.value}%` }}
          transition={{ duration: reduced ? 0 : 0.7, delay: delay + 0.1, ease: EASE }}
        />
      </div>
      <span
        className="text-[10px] font-bold font-[family-name:var(--font-mono)] w-7 text-right"
        style={{ color }}
      >
        {sub.value}
      </span>
      <span className="text-[7px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] w-5">
        ×{sub.weight}
      </span>
    </motion.div>
  );
}

/* KPI Card */
function KPICard({
  label,
  value,
  total,
  color,
  icon,
  delay,
  reduced,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: React.ReactNode;
  delay: number;
  reduced: boolean;
}) {
  const glowClass =
    color.includes("emerald")
      ? "glass-health__kpi-glow--emerald"
      : color.includes("amber")
        ? "glass-health__kpi-glow--amber"
        : color.includes("rose")
          ? "glass-health__kpi-glow--rose"
          : "glass-health__kpi-glow--gold";

  const displayValue = useCountUp(value, 900, !reduced);

  return (
    <motion.div
      className="glass-health__kpi"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: EASE }}
    >
      <div className={cn("glass-health__kpi-glow", glowClass)} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-xl font-black font-[family-name:var(--font-display)]"
            style={{ color }}
          >
            {displayValue}
          </span>
          <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
            / {total}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* Glass Section (collapsible) */
function GlassSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  badge,
  badgeColor,
  compact,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="glass-health__section">
      <Button
        variant="unstyled"
        type="button"
        onClick={onToggle}
        className="glass-health__section-head focus-visible:outline-2 focus-visible:outline-[var(--color-teal-400)] focus-visible:outline-offset-[-2px]"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {title}
              </span>
              {badge && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] font-semibold flex-shrink-0"
                  style={{
                    color: badgeColor ?? "var(--color-silver-400)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] block truncate">
              {subtitle}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-400)] flex-shrink-0" />
        )}
      </Button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            className="overflow-hidden"
          >
            <div className={cn("px-4 pb-4", compact && "pb-3")}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Proposal Card — enhanced with heat bar + flash */
function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onImplement,
  flashType,
}: {
  proposal: EvolutionProposal;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onImplement?: (id: string) => void;
  flashType?: "approve" | "reject" | null;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const cfg = PROPOSAL_STATUS_CONFIG[proposal.status];
  const priorityColor =
    proposal.priority === "high"
      ? "var(--color-rose-400)"
      : proposal.priority === "medium"
        ? "var(--color-amber-400)"
        : "var(--color-silver-400)";

  const heatPct =
    proposal.priority === "high" ? 100 : proposal.priority === "medium" ? 60 : 30;

  return (
    <div
      className={cn(
        "glass-health__proposal",
        flashType === "approve" && "glass-health__proposal-flash--approve",
        flashType === "reject" && "glass-health__proposal-flash--reject",
      )}
    >
      {/* Heat bar */}
      <div
        className="glass-health__proposal-heat"
        style={{
          background: `linear-gradient(90deg, ${priorityColor}, transparent ${heatPct}%)`,
        }}
      />

      <div className="flex items-start gap-3 mt-1">
        <Lightbulb
          className="w-4 h-4 flex-shrink-0 mt-0.5"
          style={{ color: priorityColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
              {proposal.title}
            </span>
            <span
              className="text-[8px] px-1 py-0.5 rounded font-[family-name:var(--font-mono)] font-bold uppercase flex-shrink-0"
              style={{
                color: priorityColor,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {proposal.priority}
            </span>
            <span
              className="text-[8px] px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] font-semibold flex-shrink-0"
              style={{
                color: cfg.color,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] line-clamp-2">
            {proposal.description}
          </p>

          <Button
            variant="unstyled"
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-[9px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] mt-1 hover:text-[var(--color-silver-400)] transition-colors"
          >
            {showEvidence ? "▾ Ocultar" : "▸ Evidencia"} ({proposal.evidence.length})
          </Button>

          <AnimatePresence>
            {showEvidence && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-1.5 space-y-0.5 pl-2 border-l border-white/[0.06]">
                  {proposal.evidence.map((ev, idx) => (
                    <p
                      key={idx}
                      className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]"
                    >
                      {ev}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      {proposal.status === "pending" && (
        <div className="flex items-center gap-2 mt-3 pl-7">
          {onApprove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApprove(proposal.id)}
              icon={<CheckCircle2 className="w-3 h-3" />}
              className="text-[var(--color-emerald-400)] text-[10px] min-h-[32px]"
            >
              Aprobar
            </Button>
          )}
          {onReject && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReject(proposal.id)}
              icon={<XCircle className="w-3 h-3" />}
              className="text-[var(--color-rose-400)] text-[10px] min-h-[32px]"
            >
              Rechazar
            </Button>
          )}
          <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)] ml-auto">
            {proposal.confidence}% conf · {proposal.effort}
          </span>
        </div>
      )}

      {proposal.status === "approved" && onImplement && (
        <div className="flex items-center gap-2 mt-3 pl-7">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onImplement(proposal.id)}
            icon={<Zap className="w-3 h-3" />}
            className="text-[10px] min-h-[32px]"
          >
            Implementar
          </Button>
        </div>
      )}
    </div>
  );
}

/* Tier Distribution — animated bar */
function TierDistribution({ scores }: { scores: RulePerformanceScore[] }) {
  const tiers = [
    "excellent",
    "good",
    "acceptable",
    "underperforming",
    "critical",
  ] as const;
  const counts = tiers.map((t) => ({
    tier: t,
    count: scores.filter((s) => s.tier === t).length,
    cfg: TIER_CONFIG[t],
  }));

  return (
    <div className="glass-health__tier-row">
      {counts.map(({ tier, count, cfg }) => {
        const pct =
          scores.length > 0 ? (count / scores.length) * 100 : 0;
        if (pct === 0) return null;
        return (
          <motion.div
            key={tier}
            className="glass-health__tier-segment"
            style={{ width: `${pct}%`, backgroundColor: cfg.color, opacity: 0.7 }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {count > 0 && (
              <span className="text-[8px] font-bold text-white font-[family-name:var(--font-mono)] drop-shadow">
                {count}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* Rule Score Row */
function RuleScoreRow({ score }: { score: RulePerformanceScore }) {
  const cfg = TIER_CONFIG[score.tier];
  return (
    <div className="glass-health__rule-row">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cfg.bgColor }}
      >
        <span
          className="text-xs font-black font-[family-name:var(--font-mono)]"
          style={{ color: cfg.color }}
        >
          {score.compositeScore}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate block">
          {score.ruleTitle}
        </span>
        <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
          {score.domain} · T:{Math.round(score.triggerRate * 100)}% A:
          {Math.round(score.actionRate * 100)}% S:
          {Math.round(score.successRate * 100)}%
        </span>
      </div>
      {score.trend !== "stable" && (
        <span>
          {score.trend === "improving" ? (
            <TrendingUp className="w-3 h-3 text-[var(--color-emerald-400)]" />
          ) : (
            <TrendingDown className="w-3 h-3 text-[var(--color-rose-400)]" />
          )}
        </span>
      )}
    </div>
  );
}

/* Domain Coverage Row */
function DomainCoverageRow({ domain }: { domain: DomainCoverage }) {
  const levelColors: Record<string, string> = {
    full: "var(--color-emerald-400)",
    good: "var(--color-teal-400)",
    partial: "var(--color-amber-400)",
    sparse: "var(--color-rose-400)",
    empty: "var(--color-rose-400)",
  };
  const color = levelColors[domain.level] ?? "var(--color-silver-500)";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] w-20 truncate capitalize">
        {domain.domain}
      </span>
      <div className="glass-health__cov-bar-track">
        <motion.div
          className="glass-health__cov-bar-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${domain.coveragePct}%` }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
        />
      </div>
      <div className="flex items-center gap-1.5 w-24 justify-end">
        <span
          className="text-[10px] font-bold font-[family-name:var(--font-mono)]"
          style={{ color }}
        >
          {domain.coveragePct}%
        </span>
        <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
          {domain.coveredMetrics}/{domain.totalMetrics}
        </span>
      </div>
    </div>
  );
}

/* Drift Row */
function DriftRow({ drift }: { drift: ConfidenceDrift }) {
  const cfg = DRIFT_TYPE_CONFIG[drift.driftType];
  return (
    <div className="glass-health__rule-row">
      <TrendingDown className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color }} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] truncate block">
          {drift.ruleTitle}
        </span>
        <span className="text-[8px] font-[family-name:var(--font-mono)]" style={{ color: cfg.color }}>
          {drift.driftAbsolute > 0 ? "+" : ""}
          {Math.round(drift.driftPct)}% en 30d
        </span>
      </div>
      <span
        className="text-[8px] px-1 py-0.5 rounded font-[family-name:var(--font-mono)] font-semibold flex-shrink-0"
        style={{ color: cfg.color, background: "rgba(255,255,255,0.04)" }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

/* Redundant Pair Row */
function RedundantPairRow({ pair }: { pair: RedundantPair }) {
  return (
    <div className="glass-health__rule-row">
      <GitMerge
        className="w-3.5 h-3.5 flex-shrink-0"
        style={{
          color: pair.isHighlyRedundant
            ? "var(--color-rose-400)"
            : "var(--color-amber-400)",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] truncate">
            {pair.ruleTitleA}
          </span>
          <Minus className="w-2.5 h-2.5 text-[var(--color-silver-600)] flex-shrink-0" />
          <span className="text-[10px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] truncate">
            {pair.ruleTitleB}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
            {Math.round(pair.coOccurrenceRate * 100)}% co-ocurrencia
          </span>
          {pair.isHighlyRedundant && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--color-rose-400)]/10 text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]">
              alta
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* Suppression Row */
const SUPPRESSION_LABELS: Record<string, string> = {
  never_triggered: "Nunca se activó",
  always_ignored: "Siempre ignorada",
  low_success_rate: "Baja tasa de éxito",
  confidence_collapse: "Colapso de confianza",
  redundant: "Redundante",
  manager_paused: "Pausada por gerente",
};

function SuppressionRow({ decision }: { decision: SuppressionDecision }) {
  return (
    <div className="glass-health__rule-row">
      <Shield className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-silver-400)]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] truncate">
            {decision.ruleTitle}
          </span>
          <span className="text-[9px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
            {decision.domain}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            {SUPPRESSION_LABELS[decision.reason] ?? decision.reason}
          </span>
          <span className="text-[9px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
            conf: {decision.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* Timeline Event — enhanced with node glow */
function TimelineEvent({ event }: { event: EvolutionEvent }) {
  const cfg = EVOLUTION_ACTION_CONFIG[event.actionType];
  const Icon = ACTION_ICON_MAP[cfg.icon];

  const nodeBg =
    event.outcome === "positive"
      ? cfg.color
      : event.outcome === "negative"
        ? "transparent"
        : "rgba(14,20,32,0.95)";

  return (
    <div className="relative pb-3">
      <div
        className="glass-health__timeline-node"
        style={{
          borderColor: cfg.color,
          backgroundColor: nodeBg,
          boxShadow: `0 0 8px ${cfg.color}40`,
        }}
      >
        {Icon && (
          <Icon
            className="w-2.5 h-2.5"
            style={{
              color:
                event.outcome === "positive"
                  ? "rgba(14,20,32,0.9)"
                  : cfg.color,
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
          {cfg.label}
        </span>
        <span className="text-[8px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
          {getTimeAgo(event.timestamp)}
        </span>
        {event.trigger === "human" && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--color-teal-400)]/10 text-[var(--color-teal-400)] font-[family-name:var(--font-mono)]">
            manual
          </span>
        )}
      </div>
      <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] line-clamp-2">
        {event.description}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getTimeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  return days < 30 ? `hace ${days}d` : `hace ${Math.floor(days / 30)}m`;
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

interface SystemHealthDashboardProps {
  report: SystemHealthReport;
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
  onImplementProposal?: (proposalId: string) => void;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

export function SystemHealthDashboard({
  report,
  onApproveProposal,
  onRejectProposal,
  onImplementProposal,
  onRunAnalysis,
  isAnalyzing = false,
}: SystemHealthDashboardProps) {
  const reduced = useReducedMotion();
  const {
    expandedSections,
    toggle,
    pendingProposals,
    flashId,
    triggerFlash,
  } = useSystemHealthDashboard(report);

  const {
    selfAwarenessScore: awareness,
    ruleScores,
    rulesPerformingWell,
    rulesUnderperforming,
    rulesCritical,
    redundantPairs,
    confidenceDrifts,
    driftAlertCount,
    coverageMatrix,
    predictionAccuracy,
    managerBehavior,
    recentEvents,
    suppressionDecisions,
    proposals,
    summary,
    topActions,
    executionMs,
  } = report;

  const sectionAnim = (delay: number) =>
    reduced
      ? undefined
      : ({
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: EASE },
        } as const);

  const handleApprove = useCallback(
    (id: string) => {
      triggerFlash(id, "approve");
      onApproveProposal?.(id);
    },
    [triggerFlash, onApproveProposal],
  );

  const handleReject = useCallback(
    (id: string) => {
      triggerFlash(id, "reject");
      onRejectProposal?.(id);
    },
    [triggerFlash, onRejectProposal],
  );

  return (
    <div className="glass-health">
      <div
        className={cn(
          "glass-health__glow",
          GLOW_CLASS[awareness.status] ?? "glass-health__glow--healthy",
        )}
        style={{
          animation: reduced ? "none" : "health-glow-breathe 6s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 p-5 lg:p-6 space-y-4">
        {/* ═══════════════════════════════ */}
        {/* HERO: CONSCIOUSNESS            */}
        {/* ═══════════════════════════════ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="glass-health__section overflow-hidden"
        >
          <div className="relative p-6 lg:p-8">
            {/* Vital Signs EKG */}
            <VitalSignsWave status={awareness.status} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[color-mix(in srgb,var(--color-teal-400)12%,transparent)]">
                  <Brain
                    className="w-5 h-5"
                    style={{
                      color: AWARENESS_STATUS_CONFIG[awareness.status].color,
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
                    Auto-Conciencia del Sistema
                  </h2>
                  <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                    {executionMs}ms · {ruleScores.length} reglas ·{" "}
                    {coverageMatrix.overallCoveragePct}% cobertura
                  </p>
                </div>
              </div>
              {onRunAnalysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRunAnalysis}
                  disabled={isAnalyzing}
                  icon={
                    <Activity
                      className={cn(
                        "w-3.5 h-3.5",
                        isAnalyzing && "animate-pulse",
                      )}
                    />
                  }
                  className="text-[var(--color-silver-400)] text-xs min-h-[36px]"
                >
                  {isAnalyzing ? "Analizando..." : "Re-analizar"}
                </Button>
              )}
            </div>

            {/* Ring + sub-scores + summary */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 items-center relative z-10">
              <div className="flex justify-center">
                <ConsciousnessRing
                  overall={awareness.overall}
                  status={awareness.status}
                  subScores={awareness.subScores}
                  reduced={!!reduced}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-bold font-[family-name:var(--font-display)]"
                    style={{
                      color: AWARENESS_STATUS_CONFIG[awareness.status].color,
                      backgroundColor:
                        AWARENESS_STATUS_CONFIG[awareness.status].bgColor,
                    }}
                  >
                    {AWARENESS_STATUS_CONFIG[awareness.status].label}
                  </span>
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                    {AWARENESS_STATUS_CONFIG[awareness.status].range}
                  </span>
                </div>

                <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] leading-relaxed">
                  {summary}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(awareness.subScores).map(([key, sub], i) => (
                    <SubScoreRow
                      key={key}
                      name={key}
                      sub={sub}
                      delay={reduced ? 0 : 0.8 + i * 0.08}
                      reduced={!!reduced}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Top actions */}
            {topActions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.06] relative z-10">
                <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider block mb-2">
                  Acciones prioritarias
                </span>
                <div className="flex flex-wrap gap-2">
                  {topActions.map((action, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "glass-health__chip",
                        action.priority === "high"
                          ? "text-[var(--color-rose-400)] bg-[color-mix(in srgb,var(--color-rose-400)8%,transparent)]"
                          : action.priority === "medium"
                            ? "text-[var(--color-amber-400)] bg-[color-mix(in srgb,var(--color-amber-400)8%,transparent)]"
                            : "text-[var(--color-silver-400)] bg-white/[0.04]",
                      )}
                    >
                      <Zap className="w-2.5 h-2.5" />
                      {action.action}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════ */}
        {/* KPI STRIP                      */}
        {/* ═══════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <KPICard
            label="Reglas saludables"
            value={rulesPerformingWell}
            total={ruleScores.length}
            color="var(--color-emerald-400)"
            icon={<ShieldCheck className="w-4 h-4" />}
            delay={reduced ? 0 : 0.15}
            reduced={!!reduced}
          />
          <KPICard
            label="Bajo rendimiento"
            value={rulesUnderperforming}
            total={ruleScores.length}
            color="var(--color-amber-400)"
            icon={<ShieldAlert className="w-4 h-4" />}
            delay={reduced ? 0 : 0.2}
            reduced={!!reduced}
          />
          <KPICard
            label="Brechas altas"
            value={coverageGapsCount(report)}
            total={report.coverageGaps.length}
            color="var(--color-rose-400)"
            icon={<AlertTriangle className="w-4 h-4" />}
            delay={reduced ? 0 : 0.25}
            reduced={!!reduced}
          />
          <KPICard
            label="Propuestas"
            value={pendingProposals.length}
            total={proposals.length}
            color="var(--color-gold-400)"
            icon={<Lightbulb className="w-4 h-4" />}
            delay={reduced ? 0 : 0.3}
            reduced={!!reduced}
          />
        </div>

        {/* ═══════════════════════════════ */}
        {/* PROPOSALS                      */}
        {/* ═══════════════════════════════ */}
        {pendingProposals.length > 0 && (
          <motion.div {...(sectionAnim(0.35) ?? {})}>
            <GlassSection
              title="Propuestas de evolución"
              subtitle={`${pendingProposals.length} pendiente(s)`}
              icon={<Lightbulb className="w-4 h-4 text-[var(--color-gold-400)]" />}
              expanded={expandedSections.has("proposals")}
              onToggle={() => toggle("proposals")}
              badge={`${pendingProposals.length}`}
              badgeColor="var(--color-gold-400)"
            >
              <div className="space-y-2.5">
                {pendingProposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onImplement={onImplementProposal}
                    flashType={
                      flashId?.id === p.id ? flashId.type : null
                    }
                  />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══════════════════════════════ */}
        {/* RULES + COVERAGE (2-col)       */}
        {/* ═══════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div {...(sectionAnim(0.4) ?? {})}>
            <GlassSection
              title="Rendimiento de reglas"
              subtitle={`${ruleScores.length} evaluadas`}
              icon={<BarChart3 className="w-4 h-4 text-[var(--color-teal-400)]" />}
              expanded={expandedSections.has("rules")}
              onToggle={() => toggle("rules")}
              badge={
                rulesCritical > 0 ? `${rulesCritical} crítica(s)` : undefined
              }
              badgeColor="var(--color-rose-400)"
            >
              <TierDistribution scores={ruleScores} />
              <div className="space-y-1.5 mt-3">
                {ruleScores
                  .filter((s) => s.compositeScore < 45)
                  .slice(0, 5)
                  .map((s) => (
                    <RuleScoreRow key={s.ruleId} score={s} />
                  ))}
                {ruleScores.filter((s) => s.compositeScore < 45).length ===
                  0 && (
                  <p className="text-xs text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)] flex items-center gap-1.5 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Todas las reglas con score ≥45
                  </p>
                )}
              </div>
            </GlassSection>
          </motion.div>

          <motion.div {...(sectionAnim(0.45) ?? {})}>
            <GlassSection
              title="Matriz de cobertura"
              subtitle={`${coverageMatrix.overallCoveragePct}% cubierto`}
              icon={<Layers className="w-4 h-4 text-[var(--color-amber-400)]" />}
              expanded={expandedSections.has("coverage")}
              onToggle={() => toggle("coverage")}
              badge={
                coverageMatrix.uncoveredCount > 0
                  ? `${coverageMatrix.uncoveredCount} sin cubrir`
                  : undefined
              }
              badgeColor="var(--color-rose-400)"
            >
              <div className="space-y-2">
                {coverageMatrix.domains.map((d) => (
                  <DomainCoverageRow key={d.domain} domain={d} />
                ))}
              </div>
              {coverageMatrix.criticalGaps.length > 0 && (
                <div className="glass-health__cov-gap mt-3">
                  <span className="text-[10px] text-[var(--color-rose-400)] font-[family-name:var(--font-mono)] uppercase tracking-wider block mb-1">
                    Métricas sin cobertura
                  </span>
                  {coverageMatrix.criticalGaps.map((gap) => (
                    <span
                      key={gap}
                      className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] block"
                    >
                      • {gap}
                    </span>
                  ))}
                </div>
              )}
            </GlassSection>
          </motion.div>
        </div>

        {/* ═══════════════════════════════ */}
        {/* 4-COLUMN INSIGHTS              */}
        {/* ═══════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Drift */}
          <motion.div {...(sectionAnim(0.5) ?? {})}>
            <GlassSection
              title="Deriva de confianza"
              subtitle={`${driftAlertCount} alerta(s)`}
              icon={<TrendingDown className="w-4 h-4 text-[var(--color-amber-400)]" />}
              expanded={expandedSections.has("drift")}
              onToggle={() => toggle("drift")}
              badge={driftAlertCount > 0 ? `${driftAlertCount}` : undefined}
              badgeColor="var(--color-rose-400)"
              compact
            >
              {confidenceDrifts.length === 0 ? (
                <p className="text-xs text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)] flex items-center gap-1.5 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confianzas estables
                </p>
              ) : (
                <div className="space-y-1.5">
                  {confidenceDrifts.slice(0, 4).map((d) => (
                    <DriftRow key={d.ruleId} drift={d} />
                  ))}
                </div>
              )}
            </GlassSection>
          </motion.div>

          {/* Predictions */}
          <motion.div {...(sectionAnim(0.55) ?? {})}>
            <GlassSection
              title="Precisión predictiva"
              subtitle={
                predictionAccuracy.meanAbsolutePctError !== null
                  ? `MAPE: ${predictionAccuracy.meanAbsolutePctError.toFixed(1)}%`
                  : "Sin datos"
              }
              icon={<Target className="w-4 h-4 text-[var(--color-teal-400)]" />}
              expanded={expandedSections.has("predictions")}
              onToggle={() => toggle("predictions")}
              compact
            >
              {predictionAccuracy.totalPredictions === 0 ? (
                <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] py-2">
                  Ejecutá una simulación para rastrear precisión.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {(
                      ["accurate", "close", "off", "way_off", "pending"] as const
                    ).map((lvl) => {
                      const c = predictionAccuracy.byAccuracy[lvl] ?? 0;
                      const p =
                        predictionAccuracy.totalPredictions > 0
                          ? (c / predictionAccuracy.totalPredictions) * 100
                          : 0;
                      if (p === 0) return null;
                      const colors: Record<string, string> = {
                        accurate: "var(--color-emerald-400)",
                        close: "var(--color-teal-400)",
                        off: "var(--color-amber-400)",
                        way_off: "var(--color-rose-400)",
                        pending: "var(--color-silver-600)",
                      };
                      return (
                        <div
                          key={lvl}
                          className="h-full rounded-full"
                          style={{
                            width: `${p}%`,
                            backgroundColor: colors[lvl],
                            opacity: 0.7,
                          }}
                          title={`${lvl}: ${c}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-[family-name:var(--font-mono)]">
                    <span className="text-[var(--color-emerald-400)]">
                      ● {predictionAccuracy.byAccuracy.accurate ?? 0} precisa(s)
                    </span>
                    <span className="text-[var(--color-teal-400)]">
                      ● {predictionAccuracy.byAccuracy.close ?? 0} cercana(s)
                    </span>
                    <span className="text-[var(--color-amber-400)]">
                      ● {predictionAccuracy.byAccuracy.off ?? 0} desviada(s)
                    </span>
                  </div>
                  {predictionAccuracy.bestPredictedMetric && (
                    <div className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                      Mejor:{" "}
                      <span className="text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)]">
                        {predictionAccuracy.bestPredictedMetric.metricPath
                          .split(".")
                          .pop()}
                      </span>{" "}
                      (MAPE{" "}
                      {predictionAccuracy.bestPredictedMetric.mape.toFixed(1)}%)
                    </div>
                  )}
                </div>
              )}
            </GlassSection>
          </motion.div>

          {/* Behavior */}
          <motion.div {...(sectionAnim(0.6) ?? {})}>
            <GlassSection
              title="Comportamiento"
              subtitle={`${managerBehavior.totalCommands} cmds en ${managerBehavior.periodDays}d`}
              icon={<Eye className="w-4 h-4 text-[var(--color-silver-300)]" />}
              expanded={expandedSections.has("behavior")}
              onToggle={() => toggle("behavior")}
              compact
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] w-14">
                    Adopción
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${managerBehavior.adoptionScore}%`,
                        backgroundColor:
                          managerBehavior.adoptionScore >= 70
                            ? "var(--color-emerald-400)"
                            : managerBehavior.adoptionScore >= 40
                              ? "var(--color-amber-400)"
                              : "var(--color-rose-400)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--color-silver-300)] font-[family-name:var(--font-mono)] w-8 text-right">
                    {managerBehavior.adoptionScore}%
                  </span>
                </div>
                {Object.entries(managerBehavior.commandsByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] capitalize">
                        {type}
                      </span>
                      <span className="text-[10px] text-[var(--color-silver-300)] font-[family-name:var(--font-mono)] font-semibold">
                        {count}
                      </span>
                    </div>
                  ))}
                {managerBehavior.topQueriedMetrics.length > 0 && (
                  <div className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] pt-1 border-t border-white/[0.04]">
                    Top:{" "}
                    <span className="text-[var(--color-teal-400)] font-[family-name:var(--font-mono)]">
                      {managerBehavior.topQueriedMetrics[0].metric}
                    </span>{" "}
                    ({managerBehavior.topQueriedMetrics[0].count}×)
                  </div>
                )}
              </div>
            </GlassSection>
          </motion.div>

          {/* Redundancy */}
          <motion.div {...(sectionAnim(0.65) ?? {})}>
            <GlassSection
              title="Redundancia"
              subtitle={`${redundantPairs.length} par(es)`}
              icon={<GitMerge className="w-4 h-4 text-[var(--color-amber-400)]" />}
              expanded={expandedSections.has("redundancy")}
              onToggle={() => toggle("redundancy")}
              badge={
                redundantPairs.length > 0
                  ? `${redundantPairs.length}`
                  : undefined
              }
              badgeColor="var(--color-amber-400)"
              compact
            >
              {redundantPairs.length === 0 ? (
                <p className="text-xs text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)] flex items-center gap-1.5 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sin redundancias
                </p>
              ) : (
                <div className="space-y-1.5">
                  {redundantPairs.slice(0, 4).map((p) => (
                    <RedundantPairRow
                      key={`${p.ruleIdA}-${p.ruleIdB}`}
                      pair={p}
                    />
                  ))}
                </div>
              )}
            </GlassSection>
          </motion.div>
        </div>

        {/* ═══════════════════════════════ */}
        {/* SUPPRESSION                    */}
        {/* ═══════════════════════════════ */}
        {suppressionDecisions.length > 0 && (
          <motion.div {...(sectionAnim(0.7) ?? {})}>
            <GlassSection
              title="Auto-supresión"
              subtitle={`${suppressionDecisions.length} regla(s) pausada(s)`}
              icon={<Shield className="w-4 h-4 text-[var(--color-silver-400)]" />}
              expanded={expandedSections.has("suppression")}
              onToggle={() => toggle("suppression")}
              badge={`${suppressionDecisions.length}`}
              badgeColor="var(--color-silver-400)"
            >
              <div className="space-y-1.5">
                {suppressionDecisions.slice(0, 6).map((d) => (
                  <SuppressionRow key={d.ruleId} decision={d} />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}

        {/* ═══════════════════════════════ */}
        {/* EVOLUTION TIMELINE             */}
        {/* ═══════════════════════════════ */}
        {recentEvents.length > 0 && (
          <motion.div {...(sectionAnim(0.75) ?? {})}>
            <GlassSection
              title="Historial de evolución"
              subtitle={`${recentEvents.length} evento(s) reciente(s)`}
              icon={<Clock className="w-4 h-4 text-[var(--color-silver-400)]" />}
              expanded={expandedSections.has("history")}
              onToggle={() => toggle("history")}
            >
              <div className="glass-health__timeline">
                {recentEvents.slice(0, 8).map((ev) => (
                  <TimelineEvent key={ev.id} event={ev} />
                ))}
              </div>
            </GlassSection>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* Helper — count high severity coverage gaps */
function coverageGapsCount(report: SystemHealthReport): number {
  return report.coverageGaps.filter(
    (g: any) => g.severity === "high" || g.severity === "critical",
  ).length;
}