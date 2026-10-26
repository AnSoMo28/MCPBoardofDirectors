/**
 * AdvisorReactionCard.tsx
 * src/shared/components/ui/AdvisorReactionCard.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-reaction
 * @keyframes   6 (ui-reaction-orb-breathe, ui-reaction-executing-border,
 *                 ui-reaction-check-in, ui-reaction-bar-shimmer,
 *                 ui-reaction-metric-fill, ui-reaction-item-in)
 *                 — in AdvisorReactionCard.css
 * @depends     globals.css §1 tokens, lucide-react, dashboard types
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] CheckCircle2, Loader2, Sparkles, ArrowRight verified in lucide-react
 * [x] AdvisorReactionInsight, AdvisorReactionStatus, REACTION_STATUS_CONFIG
 *     verified in features/dashboard/types
 * [x] All tokens verified against globals.css §1
 *
 * ANTI-PATTERNS REMOVED:
 * [x] framer-motion (8 instances) → CSS-only lifecycle (0KB)
 * [x] ~40 Tailwind utilities → BEM CSS
 * [x] ease: [0.25,0.1,0.25,1] → Apple easing
 * [x] transition: all → specific properties
 * [x] Hardcoded rgba(80,200,180,*) → color-mix()
 * [x] glass-reaction-card namespace → ui-reaction
 * [x] Non-namespaced keyframes → ui-reaction-*
 * [x] --color-abyss fallbacks → removed
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden → added
 * [x] Missing reduced motion → CSS
 * [x] Missing print → CSS
 * [x] Missing responsive → CSS
 * [x] Mutable props → readonly
 */

// ═══ React core ═══
import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";

// ═══ Third-party ═══
import { CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";

// ═══ Feature — types ═══
import type {
  AdvisorReactionStatus,
} from "@/features/dashboard/types";
import { type AdvisorReaction } from "@/shared/types/ai-intelligence";
import { REACTION_STATUS_CONFIG } from "@/features/dashboard/types";
import "./AdvisorReactionCard.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface AdvisorReactionCardProps {
  readonly reaction: AdvisorReaction;
  readonly onNextStep?: () => void;
  readonly className?: string;
  readonly showConnector?: boolean;
  readonly isLast?: boolean;
}

type AuraConfig = {
  readonly hue: number;
  readonly sat: string;
  readonly light: string;
  readonly pulseSpeed: string;
  readonly intensity: number;
};


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS — Status aura mapping
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_AURA: AuraConfig = {
  hue: 42, sat: "60%", light: "55%", pulseSpeed: "4s", intensity: 0.12,
};

const STATUS_AURA: Partial<Record<AdvisorReactionStatus, AuraConfig>> = {
  executing: {
    hue: 175, sat: "70%", light: "55%", pulseSpeed: "2s", intensity: 0.2,
  },
  impact_measured: {
    hue: 152, sat: "80%", light: "55%", pulseSpeed: "3s", intensity: 0.18,
  },
  done: {
    hue: 152, sat: "80%", light: "55%", pulseSpeed: "3s", intensity: 0.15,
  },
};

/** Status → CSS modifier class. */
const STATUS_CLASS: Record<AdvisorReactionStatus, string> = {
  executing: "ui-reaction--executing",
  impact_measured: "ui-reaction--impact-measured",
  done: "ui-reaction--done",
};


/* ═══════════════════════════════════════════════════════════════
   §3  HELPERS
   ═══════════════════════════════════════════════════════════════ */

function parseImpactPct(str: string): number {
  const match = str.match(/(\d+)/);
  return match ? Math.min(parseInt(match[1], 10), 100) : 50;
}


/* ═══════════════════════════════════════════════════════════════
   §4  SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function StatusIcon({ status }: { readonly status: AdvisorReactionStatus }) {
  if (status === "executing") {
    return (
      <span className="ui-reaction__status-icon ui-reaction__status-icon--spinning" aria-hidden="true">
        <Loader2 size={16} />
      </span>
    );
  }
  if (status === "done" || status === "impact_measured") {
    return (
      <span className="ui-reaction__status-icon ui-reaction__status-icon--done" aria-hidden="true">
        <CheckCircle2 size={16} />
      </span>
    );
  }
  return (
    <span className="ui-reaction__status-icon ui-reaction__status-icon--pending" aria-hidden="true">
      <Sparkles size={16} />
    </span>
  );
}

function MetricBar({
  label,
  value,
  color,
  widthPct,
  delay,
}: {
  readonly label: string;
  readonly value: string;
  readonly color: string;
  readonly widthPct: number;
  readonly delay: number;
}) {
  return (
    <div
      className="ui-reaction__metric"
      style={{
        "--metric-delay": `${delay}s`,
        "--metric-color": color,
      } as CSSProperties}
    >
      <span className="ui-reaction__metric-label">{label}</span>
      <div className="ui-reaction__metric-track">
        <div
          className="ui-reaction__metric-fill"
          style={{ width: `${Math.min(widthPct, 100)}%` }}
        >
          <span className="ui-reaction__metric-shimmer" aria-hidden="true" />
        </div>
      </div>
      <span className="ui-reaction__metric-value" style={{ color }}>
        {value}
      </span>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   §5  COMPONENT — AdvisorReactionCard
   Intelligence card with status aura, impact metric bars,
   timeline connector, and next-step CTA.
   CSS-only lifecycle (no framer-motion).
   ═══════════════════════════════════════════════════════════════ */

export function AdvisorReactionCard({
  reaction,
  onNextStep,
  className,
  showConnector = false,
  isLast = false,
}: AdvisorReactionCardProps) {
  const statusCfg = REACTION_STATUS_CONFIG[reaction.status];
  const auraCfg = STATUS_AURA[reaction.status] ?? DEFAULT_AURA;
  const cardRef = useRef<HTMLDivElement>(null);

  const isDone = reaction.status === "done" || reaction.status === "impact_measured";

  /* ── Apply aura CSS vars via ref ── */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--reaction-hue", `${auraCfg.hue}`);
    el.style.setProperty("--reaction-sat", auraCfg.sat);
    el.style.setProperty("--reaction-light", auraCfg.light);
    el.style.setProperty("--reaction-pulse-speed", auraCfg.pulseSpeed);
    el.style.setProperty("--reaction-intensity", `${auraCfg.intensity}`);
  }, [auraCfg]);

  return (
    <div
      ref={cardRef}
      data-testid="ui-reaction"
      className={cn(
        "ui-reaction",
        STATUS_CLASS[reaction.status],
        isDone && "ui-reaction--success",
        className,
      )}
    >
      {/* Timeline connector */}
      {showConnector && (
        <div className="ui-reaction__connector" aria-hidden="true">
          <div
            className={cn(
              "ui-reaction__connector-line",
              isDone && "ui-reaction__connector-line--filled",
              isLast && "ui-reaction__connector-line--last",
            )}
          />
        </div>
      )}

      {/* Glow orb — status-colored */}
      <span className="ui-reaction__orb" aria-hidden="true" />

      {/* Inner surface */}
      <div className="ui-reaction__inner">
        <div className="ui-reaction__layout">
          {/* Status icon */}
          <div className="ui-reaction__icon-col">
            <StatusIcon status={reaction.status} />
          </div>

          {/* Content */}
          <div className="ui-reaction__content">
            {/* Header: action + status badge */}
            <div className="ui-reaction__header">
              <span className="ui-reaction__action">
                {reaction.source_action}
              </span>
              <span
                className="ui-reaction__badge"
                style={{
                  color: statusCfg.color,
                  backgroundColor: `color-mix(in srgb, ${statusCfg.color} 12%, transparent)`,
                }}
              >
                {statusCfg.label}
              </span>
            </div>

            {/* Reaction text */}
            <p className="ui-reaction__text">
              {reaction.reaction}
            </p>

            {/* Metric bars */}
            <div className="ui-reaction__metrics">
              <MetricBar
                label="Impacto"
                value={reaction.estimated_impact}
                color="var(--color-emerald-400)"
                widthPct={parseImpactPct(reaction.estimated_impact)}
                delay={0.3}
              />
              <MetricBar
                label="Confianza"
                value={`${reaction.confidence}%`}
                color="var(--color-gold-400)"
                widthPct={reaction.confidence}
                delay={0.4}
              />
            </div>

            {/* Next step CTA */}
            {reaction.next_step && isDone && (
              <div className="ui-reaction__next-step">
                <ArrowRight size={12} className="ui-reaction__next-icon" aria-hidden="true" />
                <div className="ui-reaction__next-body">
                  <p className="ui-reaction__next-text">
                    {reaction.next_step}
                  </p>
                  {onNextStep && (
                    <button
                      type="button"
                      onClick={onNextStep}
                      className="ui-reaction__next-btn"
                    >
                      Ejecutar siguiente paso
                      <ArrowRight size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
