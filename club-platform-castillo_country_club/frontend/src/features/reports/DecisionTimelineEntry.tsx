/**
 * @component DecisionTimelineEntry (Fase 25 — REWRITE)
 * @namespace .glass-entry
 * @depends DecisionTimelineEntry.css
 * @note Full rewrite: CSS co-locado, hover-expand detail panel,
 *       confidence mini-bar, domain icon + color coding, connector fix.
 *       Backward-compatible: same named export, same props interface.
 * @import import './DecisionTimelineEntry.css';
 */

import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Heart,
  ThumbsUp,
  Award,
  MessageSquare,
  Users,
  Cpu,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { cn, timeAgo } from "@/shared/lib/utils";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface DecisionEntry {
  id: string;
  ruleId: string;
  domain: string;
  impact: "high" | "medium" | "low";
  outcome: "success" | "partial" | "failed" | "unknown";
  originalConfidence: number;
  executedAt: number;
  metricDelta?: number;
  feedback?: string;
}

/* ═══════════════════════════════════════
   Config — Outcome
   ═══════════════════════════════════════ */

const OUTCOME_CONFIG: Record<
  DecisionEntry["outcome"],
  { icon: LucideIcon; label: string }
> = {
  success: { icon: CheckCircle2, label: "Exitosa" },
  partial: { icon: MinusCircle, label: "Parcial" },
  failed: { icon: XCircle, label: "Fallida" },
  unknown: { icon: HelpCircle, label: "Sin datos" },
};

/* ═══════════════════════════════════════
   Config — Impact
   ═══════════════════════════════════════ */

const IMPACT_CONFIG: Record<
  DecisionEntry["impact"],
  { label: string }
> = {
  high: { label: "Alto" },
  medium: { label: "Medio" },
  low: { label: "Bajo" },
};

/* ═══════════════════════════════════════
   Config — Domain (icon + color + label)
   ═══════════════════════════════════════ */

interface DomainConfig {
  icon: LucideIcon;
  color: string;
  label: string;
}

const DOMAIN_CONFIG: Record<string, DomainConfig> = {
  financial: {
    icon: DollarSign,
    color: "var(--color-emerald-400, #34d399)",
    label: "Financiero",
  },
  events: {
    icon: Calendar,
    color: "var(--color-teal-400, #2dd4bf)",
    label: "Eventos",
  },
  engagement: {
    icon: Heart,
    color: "var(--color-rose-400, #fb7185)",
    label: "Engagement",
  },
  satisfaction: {
    icon: ThumbsUp,
    color: "var(--color-amber-400, #fbbf24)",
    label: "Satisfacción",
  },
  sports: {
    icon: Award,
    color: "var(--color-amber-400, #fbbf24)",
    label: "Deportes",
  },
  communication: {
    icon: MessageSquare,
    color: "var(--color-teal-400, #2dd4bf)",
    label: "Comunicación",
  },
  family: {
    icon: Users,
    color: "var(--color-gold-400, #c9a96e)",
    label: "Familias",
  },
  ml_intelligence: {
    icon: Cpu,
    color: "var(--color-purple-400, #c084fc)",
    label: "ML",
  },
  global: {
    icon: Globe,
    color: "var(--color-silver-400, #a09a92)",
    label: "Global",
  },
};

const DEFAULT_DOMAIN: DomainConfig = {
  icon: Globe,
  color: "var(--color-silver-400, #a09a92)",
  label: "General",
};

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

interface DecisionTimelineEntryProps {
  entry: DecisionEntry;
  isLast: boolean;
}

export function DecisionTimelineEntry({
  entry,
  isLast,
}: DecisionTimelineEntryProps) {
  const outcomeCfg = OUTCOME_CONFIG[entry.outcome] ?? OUTCOME_CONFIG.unknown;
  const impactCfg = IMPACT_CONFIG[entry.impact] ?? IMPACT_CONFIG.medium;
  const domainCfg = DOMAIN_CONFIG[entry.domain] ?? DEFAULT_DOMAIN;
  const Icon = outcomeCfg.icon;
  const DomainIcon = domainCfg.icon;

  const confidenceLevel =
    entry.originalConfidence >= 80
      ? "high"
      : entry.originalConfidence >= 50
        ? "medium"
        : "low";

  return (
    <div className="glass-entry" tabIndex={0}>
      {/* ── Rail: dot + connector ── */}
      <div className="glass-entry__rail">
        <div
          className={cn(
            "glass-entry__dot",
            `glass-entry__dot--${entry.outcome}`,
          )}
        >
          <Icon size={16} strokeWidth={1.5} />
        </div>
        {!isLast && <div className="glass-entry__connector" />}
      </div>

      {/* ── Content ── */}
      <div
        className={cn(
          "glass-entry__content",
          !isLast && "glass-entry__content--bordered",
        )}
      >
        {/* Header */}
        <div className="glass-entry__header">
          <div className="glass-entry__header-left">
            <p className="glass-entry__rule">
              {entry.ruleId.replace(/_/g, " ")}
            </p>
            <div className="glass-entry__meta">
              <span
                className={cn(
                  "glass-entry__impact-badge",
                  `glass-entry__impact-badge--${entry.impact}`,
                )}
              >
                {impactCfg.label}
              </span>
              <span
                className="glass-entry__domain"
                style={{ color: domainCfg.color }}
              >
                <DomainIcon className="glass-entry__domain-icon" />
                {domainCfg.label}
              </span>
            </div>
          </div>
          <span className="glass-entry__time">
            {timeAgo(new Date(entry.executedAt).toISOString())}
          </span>
        </div>

        {/* Outcome row */}
        <div className="glass-entry__outcome">
          <span
            className={cn(
              "glass-entry__outcome-badge",
              `glass-entry__outcome-badge--${entry.outcome}`,
            )}
          >
            <Icon size={10} strokeWidth={2} />
            {outcomeCfg.label}
          </span>
          <span className="glass-entry__confidence">
            Confianza: {entry.originalConfidence}%
          </span>
          {entry.metricDelta != null && entry.metricDelta !== 0 && (
            <span
              className={cn(
                "glass-entry__delta",
                entry.metricDelta > 0
                  ? "glass-entry__delta--positive"
                  : "glass-entry__delta--negative",
              )}
            >
              {entry.metricDelta > 0 ? (
                <TrendingUp size={10} />
              ) : (
                <TrendingDown size={10} />
              )}
              {entry.metricDelta > 0 ? "+" : ""}
              {entry.metricDelta.toFixed(1)}
            </span>
          )}
        </div>

        {/* Hover expand detail */}
        <div className="glass-entry__expand">
          {/* Confidence mini-bar */}
          <div className="glass-entry__confidence-bar">
            <div
              className={cn(
                "glass-entry__confidence-fill",
                `glass-entry__confidence-fill--${confidenceLevel}`,
              )}
              style={{ width: `${entry.originalConfidence}%` }}
            />
          </div>

          {/* Feedback */}
          {entry.feedback && (
            <p className="glass-entry__feedback">
              &ldquo;{entry.feedback}&rdquo;
            </p>
          )}

          {/* Full timestamp */}
          <p className="glass-entry__full-time">
            {new Date(entry.executedAt).toLocaleString("es-CR")}
          </p>
        </div>
      </div>
    </div>
  );
}