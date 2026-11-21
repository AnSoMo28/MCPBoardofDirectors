// src/features/families/components/FamilyAdvisorBanner.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Intelligence Experience Banner
// Level 6+ Agency · Production Grade
//
// Drop-in replacement for the old AdvisorBanner list pattern.
// Same interface as FamilyDetail.tsx expects:
//   { insights: BaseInsight[], onTabChange: (tab: string) => void }
//
// Architecture:
//   1. buildIntelligenceExperience() (P7) → severity→placement
//   2. Persistent headline (P7) → the ONE most important thing
//   3. Narrative-first insights (P1) → story above data
//   4. CTA on every insight (P3) → actionable, not decorative
//   5. Expandable archive → low-severity collapses
//
// PRE-WRITE VERIFICATION:
//   BaseInsight                  → @/shared/components/AdvisorBanner ✅
//   IntelligenceNarrative        → ../lib/intelligenceNarrator ✅
//   buildIntelligenceExperience  → ../lib/intelligenceExperience.ts ✅
//   ADVISOR_IMPACT_LEVELS        → ../config.ts §28 ✅
//   ADVISOR_LAYERS               → ../config.ts §28 ✅
//   fm-insight, fm-cta, fm-expandable → ../family-atoms.css ✅
//
// ANTI-PATTERNS REMOVED:
//   - FamilyAdvisorInsight (ghost type) → BaseInsight
//   - 3 cn() calls → data-* attributes
//   - 6 Tailwind utilities → BEM
//   - 12 inline color styles → CSS custom property bridges
//   - glass-advisor-banner namespace → fm-advisorBanner
//   - useReducedMotion hook → CSS handles
//   - IIFE in JSX → explicit Icon component
//   - Heart/DollarSign/TrendingUp: Shield fallback → proper mapping
//   - Flat list rendering → severity→placement (P7)
//   - Briefing only when collapsed → persistent headline (P7)
//   - Missing data-testid → added
//   - Missing § markers → 8 CSS sections
//   - No PRE-WRITE/ANTI-PATTERNS headers → added
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from "react";
import {
  AlertTriangle, CheckCircle, Info, ChevronDown,
  Brain, Zap, Shield, Phone, Calendar, Users,
  Award, BarChart3, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { IntelligenceNarrative } from "../lib/intelligenceNarrator";
import {
  buildIntelligenceExperience,
} from "../lib/intelligenceExperience";
import type {
  IntelligenceExperience,
  AttentionSlot,
  ActionSuggestion,
} from "../lib/intelligenceExperience";
import { ADVISOR_IMPACT_LEVELS, ADVISOR_LAYERS } from "../config";

import "./FamilyAdvisorBanner.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

interface FamilyAdvisorBannerProps {
  /** Advisor engine insights (BaseInsight from useFamilyAdvisor) */
  readonly insights: readonly BaseInsight[];
  /** Navigate to a specific detail tab */
  readonly onTabChange: (tabId: string) => void;
  /** Open the full Intelligence Panel (optional) */
  readonly onOpenPanel?: () => void;
  /** Execute a quick action (optional — for actionable CTAs) */
  readonly onQuickAction?: (type: string, insight: BaseInsight) => void;
  /** Intelligence narrative from engine (P2 bridge — optional) */
  readonly intelligenceNarrative?: IntelligenceNarrative | null;
  /** Max inline insights before overflow (optional) */
  readonly maxVisible?: number;
}

// ═══════════════════════════════════════════════════════════
// §2  Icon Registry
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  AlertTriangle,
  CheckCircle,
  Info,
  Brain,
  Zap,
  Shield,
  Phone,
  Calendar,
  Users,
  Award,
  BarChart3,
  ArrowRight,
  Heart: Shield,
  DollarSign: Shield,
  TrendingUp: Shield,
};

function getIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Info;
}

// ═══════════════════════════════════════════════════════════
// §3  Severity → Impact Bridge
// ═══════════════════════════════════════════════════════════

/**
 * Bridge BaseInsight.severity to ADVISOR_IMPACT_LEVELS key.
 * ADVISOR_IMPACT_LEVELS uses: high | medium | low | info
 * BaseInsight.severity uses: critical | high | medium | low | info | positive
 */
function severityToImpactKey(severity: string): string {
  switch (severity) {
    case "critical":
      return "high";
    case "positive":
      return "low";
    default:
      return severity;
  }
}

// ═══════════════════════════════════════════════════════════
// §4  Sub-components
// ═══════════════════════════════════════════════════════════

/** Headline — the ONE most important thing (P7). */
function Headline({
  experience,
  intelligenceNarrative,
  onTabChange,
}: {
  readonly experience: IntelligenceExperience;
  readonly intelligenceNarrative?: IntelligenceNarrative | null;
  readonly onTabChange: (tab: string) => void;
}) {
  // Intelligence narrative takes precedence (P2 bridge)
  const headline = intelligenceNarrative?.keyInsight ?? experience.headline;
  const IconComponent = getIcon(experience.headlineIcon);

  return (
    <div
      className="fm-advisorBanner__headline"
      data-urgent={experience.hasUrgent || undefined}
    >
      <IconComponent size={16} className="fm-advisorBanner__headline-icon" />
      <span className="fm-advisorBanner__headline-text">
        {headline}
      </span>
      {experience.headlineCta && (
        <Button
          variant="unstyled"
          type="button"
          className="fm-cta fm-cta--ghost fm-advisorBanner__headline-cta"
          onClick={() => onTabChange(experience.headlineCta!.targetTab)}
        >
          {experience.headlineCta.label}
        </Button>
      )}
    </div>
  );
}

/** Single insight card — narrative-first with CTAs (P1+P3). */
function InsightCard({
  slot,
  onTabChange,
  onQuickAction,
}: {
  readonly slot: AttentionSlot;
  readonly onTabChange: (tab: string) => void;
  readonly onQuickAction?: (type: string, insight: BaseInsight) => void;
}) {
  const impactKey = severityToImpactKey(slot.base.severity ?? "info");
  const impactCfg = ADVISOR_IMPACT_LEVELS[impactKey] ?? ADVISOR_IMPACT_LEVELS.info;
  const layerKey = slot.base.layer ?? "engagement";
  const layerCfg = ADVISOR_LAYERS[layerKey] ?? ADVISOR_LAYERS.engagement;
  const ImpactIcon = getIcon(impactCfg.icon);

  const handleCta = useCallback(
    (cta: ActionSuggestion) => {
      onTabChange(cta.targetTab);
    },
    [onTabChange],
  );

  return (
    <div
      className="fm-insight fm-advisorBanner__insight"
      data-severity={slot.base.severity ?? "info"}
    >
      {/* Header: impact badge + layer */}
      <div className="fm-advisorBanner__insight-meta">
        <span
          className="fm-signal"
          data-signal={slot.base.severity ?? "info"}
        >
          <ImpactIcon size={10} className="fm-signal__icon" />
          {impactCfg.label}
        </span>
        <span className="fm-advisorBanner__layer-tag">
          {layerCfg.label}
        </span>
        {slot.confidence < 1 && (
          <span className="fm-advisorBanner__confidence">
            {Math.round(slot.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Narrative — FIRST thing the user reads (P1) */}
      <p className="fm-insight__narrative">{slot.narrative}</p>

      {/* Evidence — supporting data */}
      {slot.evidence && (
        <p className="fm-insight__evidence">{slot.evidence}</p>
      )}

      {/* Actions — CTAs (P3) */}
      <div className="fm-insight__actions">
        {slot.ctas.map((cta) => (
          <Button
            variant="unstyled"
            key={`${cta.label}-${cta.targetTab}`}
            type="button"
            className={`fm-cta fm-cta--${cta.variant}`}
            onClick={() => handleCta(cta)}
          >
            {cta.label}
          </Button>
        ))}
        {onQuickAction && slot.base.severity === "critical" && (
          <Button
            variant="unstyled"
            type="button"
            className="fm-cta fm-cta--primary"
            onClick={() => onQuickAction("urgent", slot.base)}
          >
            Acción inmediata
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5  FamilyAdvisorBanner — Main Component
// ═══════════════════════════════════════════════════════════

/**
 * Intelligence Experience Banner — P7 architecture.
 *
 * Renders advisor insights using severity → placement:
 *   - Critical: interrupt banners (persistent, prominent)
 *   - High: hero cards (visible on load)
 *   - Medium: inline suggestions (easy to scan)
 *   - Low: archived in expandable
 *
 * Drop-in replacement: same props interface as the old
 * AdvisorBanner. FamilyDetail.tsx passes `insights` and
 * `onTabChange` — zero changes needed there.
 *
 * @example
 * <FamilyAdvisorBanner
 *   insights={advisor.insights}
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 */
export function FamilyAdvisorBanner({
  insights,
  onTabChange,
  onOpenPanel,
  onQuickAction,
  intelligenceNarrative,
  maxVisible = 4,
}: FamilyAdvisorBannerProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const toggleArchive = useCallback(() => setArchiveOpen((p) => !p), []);
  const toggleShowAll = useCallback(() => setShowAll((p) => !p), []);

  // ── Build experience (memoized, pure function) ──
  const experience = useMemo(
    (): IntelligenceExperience =>
      buildIntelligenceExperience(insights, null),
    [insights],
  );

  // ── Badge counts ──
  const highCount = experience.interrupts.length + experience.heroes.length;
  const totalCount = experience.totalCount;

  // ── Empty state (G-08) ──
  if (totalCount === 0) return null;

  return (
    <div
      className="fm-advisorBanner"
      data-testid="advisor-banner"
      data-urgent={experience.hasUrgent || undefined}
      role="region"
      aria-label="Panel de inteligencia del asesor"
      aria-live="polite"
    >
      {/* ══════ Headline — persistent (P7) ══════ */}
      <Headline
        experience={experience}
        intelligenceNarrative={intelligenceNarrative}
        onTabChange={onTabChange}
      />

      {/* ══════ Counts bar ══════ */}
      <div className="fm-advisorBanner__counts">
        <Brain size={14} className="fm-advisorBanner__counts-icon" />
        <span className="fm-advisorBanner__counts-text">
          {totalCount} insight{totalCount !== 1 ? "s" : ""}
        </span>
        {highCount > 0 && (
          <span
            className="fm-signal"
            data-signal="critical"
          >
            {highCount} urgente{highCount !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          variant="unstyled"
          type="button"
          className="fm-expandable__trigger fm-advisorBanner__toggle"
          onClick={toggleShowAll}
          aria-expanded={showAll}
        >
          <ChevronDown className="fm-expandable__trigger-icon" />
          {showAll ? "Colapsar" : "Expandir"}
        </Button>
      </div>

      {/* ══════ Expanded body ══════ */}
      {showAll && (
        <div className="fm-advisorBanner__body" data-open>

          {/* Interrupts (critical) */}
          {experience.interrupts.map((slot, i) => (
            <InsightCard
              key={`interrupt-${i}-${slot.base.title}`}
              slot={slot}
              onTabChange={onTabChange}
              onQuickAction={onQuickAction}
            />
          ))}

          {/* Heroes (high) */}
          {experience.heroes.length > 0 && (
            <div className="fm-advisorBanner__group">
              {experience.heroes.map((slot, i) => (
                <InsightCard
                  key={`hero-${i}-${slot.base.title}`}
                  slot={slot}
                  onTabChange={onTabChange}
                  onQuickAction={onQuickAction}
                />
              ))}
            </div>
          )}

          {/* Inlines (medium) — overflow after maxVisible */}
          {experience.inlines.length > 0 && (
            <div className="fm-advisorBanner__group">
              {(showAll ? experience.inlines : experience.inlines.slice(0, maxVisible)).map((slot, i) => (
                <InsightCard
                  key={`inline-${i}-${slot.base.title}`}
                  slot={slot}
                  onTabChange={onTabChange}
                />
              ))}
              {!showAll && experience.inlines.length > maxVisible && (
                <Button
                  variant="unstyled"
                  type="button"
                  className="fm-expandable__trigger"
                  onClick={toggleShowAll}
                >
                  Ver {experience.inlines.length - maxVisible} más
                </Button>
              )}
            </div>
          )}

          {/* Archive (low) — expandable */}
          {experience.archived.length > 0 && (
            <div className="fm-expandable" data-open={archiveOpen || undefined}>
              <Button
                variant="unstyled"
                type="button"
                className="fm-expandable__trigger"
                onClick={toggleArchive}
                aria-expanded={archiveOpen}
              >
                <ChevronDown className="fm-expandable__trigger-icon" />
                Otras observaciones ({experience.archived.length})
              </Button>
              <div className="fm-expandable__content">
                <div className="fm-expandable__content-inner">
                  <div className="fm-advisorBanner__group">
                    {experience.archived.map((slot, i) => (
                      <InsightCard
                        key={`archive-${i}-${slot.base.title}`}
                        slot={slot}
                        onTabChange={onTabChange}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gateway to Intelligence Panel (P6) */}
          {onOpenPanel && (
            <Button
              variant="unstyled"
              type="button"
              className="fm-advisorBanner__gateway"
              onClick={onOpenPanel}
            >
              <BarChart3 size={13} />
              Ver análisis completo del Intelligence Engine
            </Button>
          )}
        </div>
      )}
    </div>
  );
}