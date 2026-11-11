// src/features/families/components/AdaptiveCardHero.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Adaptive Card Hero
// Level 6+ Agency · Production Grade
//
// Priority-driven hero slot inside family cards.
// Each card shows a different hero based on what the AI determined:
// - Churn warning → urgent red alert with proactive action
// - Milestone approaching → golden countdown
// - Engagement surge → celebratory green
// - Financial alert → amber/caution
// - New member → teal welcome
// - etc. (8 possible visual states)
//
// PRE-WRITE VERIFICATION:
//   AdaptiveCardPriority → ../ai-types.ts ✅ (NOT ../types)
//   PRIORITY_SLOTS       → ../config.ts §9 ✅
//   PrioritySlotConfig   → ../types.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() call → data-* attributes
//   - AdaptiveCardPriority from ./types → from ./ai-types
//   - useReducedMotion hook → CSS handles
//   - glass-adaptive-hero namespace → fm-adaptiveHero
//   - 8 inline color styles → CSS var bridges (--hero-*)
//   - className prop → removed
//   - Mutable props → readonly
//   - Missing data-testid → added
//   - No § markers → 8 CSS sections
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle, Star, DollarSign, PartyPopper,
  TrendingUp, Users, Route, Calendar, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AdaptiveCardPriority } from "../ai-types";
import { PRIORITY_SLOTS } from "../config";

import "./AdaptiveCardHero.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  AlertTriangle,
  Star,
  DollarSign,
  PartyPopper,
  TrendingUp,
  Users,
  Route,
  Calendar,
};

function getSlotIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Zap;
}

// ═══════════════════════════════════════════════════════════
// §2  Urgency Config — controls visual intensity
// ═══════════════════════════════════════════════════════════

interface UrgencyConfig {
  readonly label: string;
  readonly dataUrgency: string;
  readonly borderWeight: string;
  readonly glowIntensity: number;
}

const URGENCY_MAP: Record<AdaptiveCardPriority["urgency"], UrgencyConfig> = {
  immediate: {
    label: "Inmediato",
    dataUrgency: "immediate",
    borderWeight: "3px",
    glowIntensity: 1,
  },
  today: {
    label: "Hoy",
    dataUrgency: "today",
    borderWeight: "2px",
    glowIntensity: 0.6,
  },
  this_week: {
    label: "Esta semana",
    dataUrgency: "this_week",
    borderWeight: "2px",
    glowIntensity: 0.3,
  },
  upcoming: {
    label: "Próximo",
    dataUrgency: "upcoming",
    borderWeight: "1px",
    glowIntensity: 0,
  },
};

// ═══════════════════════════════════════════════════════════
// §3  Types
// ═══════════════════════════════════════════════════════════

interface AdaptiveCardHeroProps {
  readonly priority: AdaptiveCardPriority;
  readonly onAction?: (priority: AdaptiveCardPriority) => void;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * AdaptiveCardHero — priority-driven hero slot inside family cards.
 *
 * Renders a compact alert based on the highest-priority AI insight.
 * Visual intensity scales with urgency level.
 *
 * @example
 * <AdaptiveCardHero
 *   priority={deriveAdaptivePriority(family)}
 *   onAction={(p) => showToast({ type: "info", message: p.suggestedAction })}
 * />
 */
export function AdaptiveCardHero({
  priority,
  onAction,
}: AdaptiveCardHeroProps) {
  // ── Derived data (B-07) ──
  const slotCfg = useMemo(
    () => PRIORITY_SLOTS[priority.hero],
    [priority.hero],
  );

  const urgencyCfg = useMemo(
    (): UrgencyConfig => URGENCY_MAP[priority.urgency] ?? URGENCY_MAP.upcoming,
    [priority.urgency],
  );

  const SlotIcon = useMemo(
    () => getSlotIcon(slotCfg?.icon ?? "Zap"),
    [slotCfg?.icon],
  );

  // ── Handlers (B-08) ──
  const handleAction = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAction?.(priority);
    },
    [onAction, priority],
  );

  if (!slotCfg) return null;

  return (
    <div
      className="fm-adaptiveHero"
      data-testid="adaptive-hero"
      data-urgency={urgencyCfg.dataUrgency}
      role="alert"
      aria-label={`${slotCfg.label}: ${priority.reason}`}
      style={
        {
          "--hero-color": slotCfg.color,
          "--hero-bg": slotCfg.bgColor,
          "--hero-glow": `color-mix(in srgb, ${slotCfg.color} ${Math.round(urgencyCfg.glowIntensity * 20)}%, transparent)`,
          "--hero-border": urgencyCfg.borderWeight,
        } as CSSProperties
      }
    >
      {/* Header: icon + label + urgency */}
      <div className="fm-adaptiveHero__header">
        <div className="fm-adaptiveHero__icon-ring">
          <SlotIcon size={13} aria-hidden="true" />
        </div>
        <span className="fm-adaptiveHero__slot-label">
          {slotCfg.label}
        </span>
        <span className="fm-adaptiveHero__urgency-badge">
          {urgencyCfg.label}
        </span>
      </div>

      {/* AI Reason — narrative (P1) */}
      <p className="fm-adaptiveHero__reason">
        {priority.reason}
      </p>

      {/* Suggested Action — CTA (P3) */}
      {priority.suggestedAction && onAction && (
        <Button
          variant="unstyled"
          type="button"
          className="fm-adaptiveHero__action"
          onClick={handleAction}
        >
          <Zap size={10} aria-hidden="true" />
          {priority.suggestedAction}
        </Button>
      )}
    </div>
  );
}