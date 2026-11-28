// src/features/families/components/LifecycleTimeline.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Lifecycle Timeline Component
// Level 6+ Agency · Production Grade
//
// "The River of Life" — the biography of a family's journey
// through the club. Not a timeline. A living, flowing river
// of time where every stage tells a chapter of their story.
//
// VISUAL CONCEPT:
//   The stage river FLOWS — CSS gradient animation makes water move.
//   The current position BEACONS — glowing pulse with concentric rings.
//   The projected future SHIMMERS — ghostly tributary with moving gradient.
//   The intervention window PORTALS — pulsing border when active.
//   The trigger events STRIKE — expandable lightning cards.
//   The health bars BREATHE — subtle oscillation showing vitality.
//
// Sections:
//   1. Header: section label + confidence
//   2. Current Stage Beacon: icon + label + countdown badge
//   3. Stage River: flowing gradient segments + you-are-here marker
//   4. Projection Arrow: animated flowing connection
//   5. Health Bars: per-stage vitality visualization
//   6. Intervention Window: portal with pulsing glow
//   7. Trigger Events: expandable inflection point cards
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (inset highlight, gold border-left)
//   D2: Stagger (10 section groups)
//   D3: Cubic-bezier easing on entrance
//   D4: Mono for data, display for stage, UI for body
//   D5: Stage-driven dynamic colors via CSS var bridges
//   D6: Pseudo-element depth (river flow, beacon rings, portal glow)
//   D7: Hover on segments + triggers
//   D8: Tight spatial density
//   D9: Responsive ≤768px
//   D10: role="region", aria-label
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-lc* namespaced keyframes (10 total)
//
// PRE-WRITE VERIFICATION:
//   LifecycleProjection    → ../ai-types.ts §N+3 ✅
//   LifecycleStageHistory  → ../ai-types.ts §N+3 ✅
//   LIFECYCLE_STAGES       → ../config.ts (EXISTS) ✅
//   LifecycleStageConfig   → ../types.ts (EXISTS) ✅
//
// ANTI-PATTERNS REMOVED:
//   - 3 cn() → data-* attributes
//   - ~40 glass-lifecycle-timeline → fm-lc
//   - LifecycleProjection from ../types → ../ai-types
//   - useReducedMotion → CSS handles
//   - className prop → removed
//   - ~15 inline color styles → CSS var bridges
//   - No stagger → 10 stagger groups
//   - No river flow → ADD flowing gradient animation
//   - No beacon → ADD concentric pulse rings
//   - No ghost shimmer → ADD moving gradient
//   - No portal glow → ADD intervention pulse
//   - No trigger expand → ADD height transition
//   - No health bar animation → ADD fill reveal
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  UserPlus, Rocket, TrendingUp, Crown, Minus,
  AlertTriangle, Moon, Sunrise, Zap, Clock,
  ChevronRight, Calendar, MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LifecycleProjection } from "../ai-types";
import { LIFECYCLE_STAGES } from "../config";

import "./LifecycleTimeline.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// ═══════════════════════════════════════════════════════════

const STAGE_ICON_REGISTRY: Record<string, LucideIcon> = {
  UserPlus, Rocket, TrendingUp, Crown, Minus,
  AlertTriangle, Moon, Sunrise,
};

function getStageIcon(name: string): LucideIcon {
  return STAGE_ICON_REGISTRY[name] ?? TrendingUp;
}

// ═══════════════════════════════════════════════════════════
// §2  Pure Helpers
// ═══════════════════════════════════════════════════════════

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function countdownText(days: number): {
  readonly text: string;
  readonly urgency: "imminent" | "soon" | "normal";
} {
  if (days <= 0) return { text: "Transición inminente", urgency: "imminent" };
  if (days === 1) return { text: "Mañana", urgency: "imminent" };
  if (days <= 7) return { text: `En ${days} días`, urgency: "imminent" };
  if (days <= 14) return { text: `En ${days} días`, urgency: "soon" };
  if (days <= 30) return { text: `En ~${Math.round(days / 7)} semanas`, urgency: "normal" };
  return { text: `En ~${Math.round(days / 30)} meses`, urgency: "normal" };
}

function interventionStatus(intervention: LifecycleProjection["interventionWindow"]): {
  readonly text: string;
  readonly active: boolean;
  readonly daysLeft: number;
  readonly state: "active" | "upcoming" | "closed";
} {
  if (!intervention) return { text: "", active: false, daysLeft: 0, state: "closed" };
  const now = Date.now();
  const opens = new Date(intervention.opens).getTime();
  const closes = new Date(intervention.closes).getTime();

  if (now >= opens && now <= closes) {
    const daysLeft = Math.ceil((closes - now) / 86400000);
    return { text: `${daysLeft}d restantes`, active: true, daysLeft, state: "active" };
  }
  if (now < opens) {
    const daysUntil = Math.ceil((opens - now) / 86400000);
    return { text: `En ${daysUntil}d`, active: false, daysLeft: daysUntil, state: "upcoming" };
  }
  return { text: "Cerrada", active: false, daysLeft: 0, state: "closed" };
}

// ═══════════════════════════════════════════════════════════
// §3  Types
// ═══════════════════════════════════════════════════════════

interface LifecycleTimelineProps {
  readonly projection: LifecycleProjection;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * LifecycleTimeline — "The River of Life"
 *
 * Renders the family's lifecycle journey as a flowing river of time:
 *   - Stage River with flowing gradient segments
 *   - Glowing beacon at current position
 *   - Ghost tributary for projected future
 *   - Intervention window portals
 *   - Trigger event lightning cards
 *   - Per-stage health bars
 *
 * This is not a timeline. It's the biography of a family's
 * life in the club. Every stage is a chapter.
 *
 * @example
 * <LifecycleTimeline projection={derivedProjection} />
 */
export function LifecycleTimeline({ projection }: LifecycleTimelineProps) {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  // ── Stage configs (B-07) ──
  const currentCfg = useMemo(
    () => LIFECYCLE_STAGES[projection.currentStage] ?? LIFECYCLE_STAGES.plateau,
    [projection.currentStage],
  );
  const projectedCfg = useMemo(
    () => LIFECYCLE_STAGES[projection.projectedStage] ?? LIFECYCLE_STAGES.plateau,
    [projection.projectedStage],
  );

  const CurrentIcon = useMemo(() => getStageIcon(currentCfg.icon), [currentCfg.icon]);
  const ProjectedIcon = useMemo(() => getStageIcon(projectedCfg.icon), [projectedCfg.icon]);

  // ── Countdown (B-07) ──
  const countdown = useMemo(
    () => countdownText(projection.estimatedDaysToTransition),
    [projection.estimatedDaysToTransition],
  );

  // ── Intervention (B-07) ──
  const windowInfo = useMemo(
    () => interventionStatus(projection.interventionWindow),
    [projection.interventionWindow],
  );

  // ── History sorted (B-07) ──
  const sortedHistory = useMemo(() => {
    return [...projection.historicalStages].sort(
      (a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime(),
    );
  }, [projection.historicalStages]);

  // ── Total span (B-07) ──
  const totalDays = useMemo(() => {
    if (sortedHistory.length === 0) return 365;
    const sum = sortedHistory.reduce((s, h) => s + h.durationDays, 0);
    return Math.max(sum, 30);
  }, [sortedHistory]);

  // ── Flags ──
  const isChanging = projection.currentStage !== projection.projectedStage;

  // ── Handlers (B-08) ──
  const handleTriggerToggle = useCallback((index: number) => {
    setExpandedEvent((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div
      className="fm-lc"
      data-testid="lifecycle-timeline"
      role="region"
      aria-label="Línea de tiempo del ciclo de vida"
      style={
        {
          "--lc-current-color": currentCfg.color,
          "--lc-current-bg": currentCfg.bgColor,
          "--lc-projected-color": projectedCfg.color,
          "--lc-projected-bg": projectedCfg.bgColor,
        } as CSSProperties
      }
    >
      {/* ══════ Header ══════ */}
      <div className="fm-lc__header">
        <span className="fm-lc__section-label">Ciclo de Vida</span>
        <span className="fm-lc__confidence">
          Confianza: {projection.confidence}%
        </span>
      </div>

      {/* ══════ Current Stage Beacon ══════ */}
      <div className="fm-lc__beacon">
        <div className="fm-lc__beacon-ring">
          <div className="fm-lc__beacon-icon">
            <CurrentIcon size={14} aria-hidden="true" />
          </div>
          {/* Concentric pulse rings */}
          <span className="fm-lc__beacon-pulse fm-lc__beacon-pulse--1" />
          <span className="fm-lc__beacon-pulse fm-lc__beacon-pulse--2" />
          <span className="fm-lc__beacon-pulse fm-lc__beacon-pulse--3" />
        </div>
        <div className="fm-lc__beacon-info">
          <span className="fm-lc__beacon-stage">{currentCfg.label}</span>
          <span className="fm-lc__beacon-desc">{currentCfg.description}</span>
          <span className="fm-lc__beacon-days">
            {projection.daysAtCurrentStage} días en esta etapa
          </span>
        </div>
        {isChanging && (
          <span className="fm-lc__countdown" data-urgency={countdown.urgency}>
            <Clock size={11} aria-hidden="true" />
            {countdown.text}
          </span>
        )}
      </div>

      {/* ══════ Stage River — THE FLOWING TIMELINE ══════ */}
      <div className="fm-lc__river">
        {/* River segments */}
        {sortedHistory.map((stage, i) => {
          const stageCfg = LIFECYCLE_STAGES[stage.stage] ?? LIFECYCLE_STAGES.plateau;
          const widthPct = Math.max(8, (stage.durationDays / totalDays) * 100);
          const isCurrent = stage.stage === projection.currentStage;
          const StageIcon = getStageIcon(stageCfg.icon);

          return (
            <div
              key={`${stage.stage}-${i}`}
              className="fm-lc__river-segment"
              data-current={isCurrent || undefined}
              data-has-trigger={!!stage.triggerEvent || undefined}
              style={
                {
                  "--seg-width": `${widthPct}%`,
                  "--seg-color": stageCfg.color,
                  "--seg-bg": stageCfg.bgColor,
                  "--seg-index": i,
                } as CSSProperties
              }
              title={`${stageCfg.label}: ${stage.durationDays} días`}
            >
              <div className="fm-lc__river-fill" />
              {/* Flow animation overlay */}
              <div className="fm-lc__river-flow" aria-hidden="true" />
              <div className="fm-lc__river-label">
                <StageIcon size={8} aria-hidden="true" />
                <span>{stageCfg.label}</span>
              </div>
              {/* You-are-here marker on current segment */}
              {isCurrent && (
                <div className="fm-lc__river-marker">
                  <MapPin size={10} aria-hidden="true" />
                </div>
              )}
              {/* Trigger event marker */}
              {stage.triggerEvent && (
                <div className="fm-lc__river-trigger-dot">
                  <Zap size={7} aria-hidden="true" />
                </div>
              )}
            </div>
          );
        })}

        {/* Projection ghost segment */}
        {isChanging && (
          <div
            className="fm-lc__river-ghost"
            style={
              {
                "--ghost-width": `${Math.max(10, (projection.estimatedDaysToTransition / totalDays) * 100)}%`,
                "--ghost-color": projectedCfg.color,
              } as CSSProperties
            }
          >
            <div className="fm-lc__river-ghost-fill" />
            <div className="fm-lc__river-ghost-shimmer" aria-hidden="true" />
            <div className="fm-lc__river-label">
              <ProjectedIcon size={8} aria-hidden="true" />
              <span>{projectedCfg.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* ══════ Projection Arrow ══════ */}
      {isChanging && (
        <div className="fm-lc__projection">
          <span className="fm-lc__projection-from">{currentCfg.label}</span>
          <div className="fm-lc__projection-line">
            <div className="fm-lc__projection-flow" aria-hidden="true" />
            <ChevronRight size={14} className="fm-lc__projection-chevron" aria-hidden="true" />
          </div>
          <span className="fm-lc__projection-to">{projectedCfg.label}</span>
          <span className="fm-lc__projection-est">~{projection.estimatedDaysToTransition}d</span>
        </div>
      )}

      {/* ══════ Health Bars per Stage ══════ */}
      <div className="fm-lc__health">
        <span className="fm-lc__health-label">Salud por etapa</span>
        <div className="fm-lc__health-bars">
          {sortedHistory.map((stage, i) => {
            const stageCfg = LIFECYCLE_STAGES[stage.stage] ?? LIFECYCLE_STAGES.plateau;
            const isCurrent = stage.stage === projection.currentStage;
            return (
              <div
                key={`h-${stage.stage}-${i}`}
                className="fm-lc__health-bar"
                data-current={isCurrent || undefined}
                style={
                  {
                    "--hb-color": stageCfg.color,
                    "--hb-height": `${stageCfg.healthScore}%`,
                    "--hb-index": i,
                  } as CSSProperties
                }
                title={`${stageCfg.label}: ${stageCfg.healthScore}%`}
              >
                <div className="fm-lc__health-track">
                  <div className="fm-lc__health-fill" />
                </div>
                <span className="fm-lc__health-score">{stageCfg.healthScore}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════ Intervention Window Portal ══════ */}
      {projection.interventionWindow && (
        <div
          className="fm-lc__portal"
          data-state={windowInfo.state}
          style={
            {
              "--portal-color": windowInfo.active
                ? "var(--color-rose-400)"
                : "var(--color-amber-400)",
            } as CSSProperties
          }
        >
          <div className="fm-lc__portal-header">
            <Calendar size={12} aria-hidden="true" />
            <span className="fm-lc__portal-title">Ventana de Intervención</span>
            <span className="fm-lc__portal-status">{windowInfo.text}</span>
          </div>
          <div className="fm-lc__portal-dates">
            <span>Abre: {formatDate(projection.interventionWindow.opens)}</span>
            <span>Cierra: {formatDate(projection.interventionWindow.closes)}</span>
          </div>
          {projection.interventionWindow.suggestedActions.length > 0 && (
            <div className="fm-lc__portal-actions">
              {projection.interventionWindow.suggestedActions.map((action, i) => (
                <span key={i} className="fm-lc__portal-action">
                  <Zap size={9} aria-hidden="true" />
                  {action}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════ Trigger Events — Expandable Lightning Cards ══════ */}
      {projection.triggerEvents.length > 0 && (
        <div className="fm-lc__triggers">
          <span className="fm-lc__triggers-label">Eventos detectados</span>
          <div className="fm-lc__triggers-list">
            {projection.triggerEvents.map((event, i) => (
              <Button
                variant="unstyled"
                key={i}
                type="button"
                className="fm-lc__trigger"
                data-expanded={expandedEvent === i || undefined}
                onClick={() => handleTriggerToggle(i)}
                aria-expanded={expandedEvent === i}
              >
                <div className="fm-lc__trigger-head">
                  <Zap size={9} aria-hidden="true" />
                  <span className="fm-lc__trigger-text">{event}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}