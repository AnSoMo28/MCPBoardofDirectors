// src/features/families/components/FamilyBrief.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Brief Component
// Level 6+ Agency · Production Grade
//
// "The Daily Intelligence Briefing" — where the AI speaks
// directly to the club director. Not a data card. A personal
// briefing from a brilliant analyst.
//
// The entire card atmosphere shifts chromatically based on the
// AI's emotional assessment of the family's situation.
//
// Sections:
//   1. Confidence Bar — thin top bar showing analysis quality
//   2. Meta Row — tone badge + freshness clock
//   3. Headline — dominant typographic statement with gradient underline
//   4. Narrative — AI voice, pull-quote treatment
//   5. Highlight Moment — spotlight stage with sentiment
//   6. Milestone Teaser — predictive countdown with urgency
//   7. Agent Attribution — which AI dimensions contributed
//   8. Footer — engine metadata
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism with TONE-TINTED gradient atmosphere
//   D2: Stagger (8 section groups)
//   D3: Cubic-bezier easing on entrance
//   D4: Display font for headline, serif for narrative, mono for data
//   D5: Tone-driven chromatic shifts across ENTIRE card
//   D6: Pseudo-element depth (tone glow, headline underline, moment spotlight)
//   D7: Hover on milestone CTA
//   D8: Tight editorial density
//   D9: Responsive ≤768px
//   D10: role="region", aria-label
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-brief* namespaced keyframes
//
// PRE-WRITE VERIFICATION:
//   FamilyBrief       → ../ai-types.ts §N+2 ✅
//   FamilyMilestone   → ../ai-types.ts §N+2 ✅
//   getDimensionConfig → ../config.ts §21 ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-* attributes
//   - glass-family-brief → fm-brief
//   - FamilyBrief/FamilyMilestone from ../types → ../ai-types
//   - useReducedMotion → CSS handles
//   - className prop → removed
//   - Inline colors → CSS var bridges (--brief-*)
//   - Tone only on badge → ENTIRE card atmosphere shifts
//   - No stagger → 8 stagger groups
//   - No headline underline → ADD animated gradient sweep
//   - No moment spotlight → ADD radial glow
//   - No milestone pulse → ADD countdown urgency
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { Zap, Clock, Calendar } from "lucide-react";

import type { FamilyBrief as BriefData, FamilyMilestone } from "../ai-types";
import { getDimensionConfig } from "../config";

import "./FamilyBrief.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1  Tone Config — maps aiTone → chromatic atmosphere
// ═══════════════════════════════════════════════════════════

interface ToneConfig {
  readonly label: string;
  readonly color: string;
  readonly glowColor: string;
  readonly dataTone: string;
}

const TONE_MAP: Record<BriefData["aiTone"], ToneConfig> = {
  celebratory: {
    label: "Celebratorio",
    color: "var(--color-gold-400)",
    glowColor: "rgba(201, 169, 110, 0.12)",
    dataTone: "celebratory",
  },
  confident: {
    label: "Confianza",
    color: "var(--color-silver-300)",
    glowColor: "rgba(200, 210, 225, 0.08)",
    dataTone: "confident",
  },
  neutral: {
    label: "Neutral",
    color: "var(--color-silver-500)",
    glowColor: "transparent",
    dataTone: "neutral",
  },
  caring: {
    label: "Cuidado",
    color: "var(--color-teal-400)",
    glowColor: "rgba(42, 154, 181, 0.10)",
    dataTone: "caring",
  },
  urgent: {
    label: "Urgente",
    color: "var(--color-rose-400)",
    glowColor: "rgba(196, 100, 112, 0.15)",
    dataTone: "urgent",
  },
};

// ═══════════════════════════════════════════════════════════
// §2  Sentiment Config
// ═══════════════════════════════════════════════════════════

const SENTIMENT_MAP: Record<
  BriefData["highlightMoment"]["sentiment"],
  { readonly emoji: string; readonly label: string; readonly dataSentiment: string }
> = {
  celebratory: { emoji: "🎉", label: "Momento de celebración", dataSentiment: "celebratory" },
  neutral: { emoji: "📋", label: "Momento notable", dataSentiment: "neutral" },
  concerning: { emoji: "⚠️", label: "Punto de atención", dataSentiment: "concerning" },
};

// ═══════════════════════════════════════════════════════════
// §3  Pure Helpers
// ═══════════════════════════════════════════════════════════

function freshnessLabel(isoDate: string): {
  readonly text: string;
  readonly level: "fresh" | "recent" | "stale";
} {
  try {
    const ms = Date.now() - new Date(isoDate).getTime();
    if (isNaN(ms) || ms < 0) return { text: "Ahora", level: "fresh" };
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return { text: `Hace ${minutes}m`, level: "fresh" };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { text: `Hace ${hours}h`, level: hours < 6 ? "fresh" : "recent" };
    const days = Math.floor(hours / 24);
    return { text: `Hace ${days}d`, level: "stale" };
  } catch {
    return { text: "Desconocido", level: "stale" };
  }
}

function confidenceLevel(confidence: number): "high" | "medium" | "low" | "critical" {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "medium";
  if (confidence >= 40) return "low";
  return "critical";
}

function milestoneUrgency(daysUntil: number): "today" | "imminent" | "soon" | "upcoming" {
  if (daysUntil === 0) return "today";
  if (daysUntil <= 3) return "imminent";
  if (daysUntil <= 7) return "soon";
  return "upcoming";
}

function milestoneCountdown(daysUntil: number): string {
  if (daysUntil === 0) return "Hoy";
  if (daysUntil === 1) return "Mañana";
  return `En ${daysUntil} días`;
}

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

// ═══════════════════════════════════════════════════════════
// §4  Types
// ═══════════════════════════════════════════════════════════

interface FamilyBriefProps {
  readonly brief: BriefData;
  readonly activeAgents?: readonly string[];
  readonly onMilestoneAction?: (milestone: FamilyMilestone) => void;
}

// ═══════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyBrief — "The Daily Intelligence Briefing"
 *
 * Renders an AI-generated narrative briefing where the Intelligence
 * Engine speaks directly to the club director. The entire card
 * atmosphere shifts chromatically based on the AI's emotional
 * assessment of the family's situation.
 *
 * Visual design: Editorial newspaper front page meets Bloomberg
 * Terminal meets Apple keynote slide.
 *
 * @example
 * <FamilyBrief
 *   brief={derivedBrief}
 *   activeAgents={["engagement", "social", "lifecycle"]}
 *   onMilestoneAction={(m) => showToast(m.suggestedAction)}
 * />
 */
export function FamilyBrief({ brief, activeAgents, onMilestoneAction }: FamilyBriefProps) {
  // ── Tone atmosphere (B-07) ──
  const toneCfg = useMemo(
    () => TONE_MAP[brief.aiTone] ?? TONE_MAP.neutral,
    [brief.aiTone],
  );

  const sentimentCfg = useMemo(
    () => SENTIMENT_MAP[brief.highlightMoment.sentiment] ?? SENTIMENT_MAP.neutral,
    [brief.highlightMoment.sentiment],
  );

  // ── Freshness (B-07) ──
  const freshness = useMemo(() => freshnessLabel(brief.generatedAt), [brief.generatedAt]);
  const confLevel = confidenceLevel(brief.confidence);

  // ── Agent configs (B-07) ──
  const agentConfigs = useMemo(() => {
    if (!activeAgents?.length) return [];
    return activeAgents.map((id) => getDimensionConfig(id));
  }, [activeAgents]);

  // ── Formatted date ──
  const momentDate = useMemo(() => formatDate(brief.highlightMoment.date), [brief.highlightMoment.date]);

  // ── Milestone urgency ──
  const msUrgency = brief.upcomingMilestone
    ? milestoneUrgency(brief.upcomingMilestone.daysUntil)
    : null;

  // ── Handlers (B-08) ──
  const handleMilestoneAction = useCallback(() => {
    if (brief.upcomingMilestone && onMilestoneAction) {
      onMilestoneAction(brief.upcomingMilestone);
    }
  }, [brief.upcomingMilestone, onMilestoneAction]);

  return (
    <article
      className="fm-brief"
      data-testid="family-brief"
      data-tone={toneCfg.dataTone}
      role="region"
      aria-label="AI Briefing de la familia"
      style={
        {
          "--brief-tone": toneCfg.color,
          "--brief-glow": toneCfg.glowColor,
        } as CSSProperties
      }
    >
      {/* ══════ Confidence Pulse Bar ══════ */}
      <div
        className="fm-brief__confidence-bar"
        data-confidence={confLevel}
        role="meter"
        aria-valuenow={brief.confidence}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confianza del Intelligence Engine: ${brief.confidence}%`}
        style={{ "--brief-conf": `${brief.confidence}%` } as CSSProperties}
      />

      {/* ══════ Meta: Tone + Freshness ══════ */}
      <div className="fm-brief__meta">
        <span className="fm-brief__tone-badge">
          <Zap size={9} aria-hidden="true" />
          {toneCfg.label}
        </span>
        <span
          className="fm-brief__freshness"
          data-freshness={freshness.level}
        >
          <Clock size={9} aria-hidden="true" />
          {freshness.text}
        </span>
      </div>

      {/* ══════ Headline — THE DOMINANT STATEMENT ══════ */}
      <h2 className="fm-brief__headline">
        {brief.headline}
      </h2>

      {/* ══════ Narrative — AI Voice ══════ */}
      <blockquote className="fm-brief__narrative">
        <p>{brief.narrative}</p>
      </blockquote>

      {/* ══════ Highlight Moment — Spotlight Stage ══════ */}
      <div
        className="fm-brief__moment"
        data-sentiment={sentimentCfg.dataSentiment}
      >
        <span className="fm-brief__moment-emoji" aria-hidden="true">
          {sentimentCfg.emoji}
        </span>
        <div className="fm-brief__moment-content">
          <span className="fm-brief__moment-label">
            {sentimentCfg.label}
          </span>
          <span className="fm-brief__moment-date">{momentDate}</span>
          <p className="fm-brief__moment-text">
            {brief.highlightMoment.text}
          </p>
        </div>
      </div>

      {/* ══════ Milestone Teaser — Predictive Countdown ══════ */}
      {brief.upcomingMilestone && (
        <div className="fm-brief__milestone" data-urgency={msUrgency}>
          <div className="fm-brief__milestone-header">
            <Calendar size={12} className="fm-brief__milestone-icon" aria-hidden="true" />
            <span className="fm-brief__milestone-countdown">
              {milestoneCountdown(brief.upcomingMilestone.daysUntil)}
            </span>
            <span className="fm-brief__milestone-title">
              {brief.upcomingMilestone.title}
              {brief.upcomingMilestone.memberName &&
                ` — ${brief.upcomingMilestone.memberName}`}
            </span>
          </div>
          <p className="fm-brief__milestone-action">
            {brief.upcomingMilestone.suggestedAction}
          </p>
          {onMilestoneAction && (
            <Button
              variant="unstyled"
              type="button"
              className="fm-brief__milestone-btn"
              onClick={handleMilestoneAction}
            >
              Ejecutar acción
            </Button>
          )}
        </div>
      )}

      {/* ══════ Agent Attribution ══════ */}
      {agentConfigs.length > 0 && (
        <div className="fm-brief__agents">
          <span className="fm-brief__agents-label">Basado en</span>
          {agentConfigs.map((agent) => (
            <span
              key={agent.id}
              className="fm-brief__agent-chip"
              title={agent.label}
              style={
                {
                  "--agent-color": agent.color,
                } as CSSProperties
              }
            >
              {agent.shortLabel}
            </span>
          ))}
        </div>
      )}

      {/* ══════ Footer ══════ */}
      <div className="fm-brief__footer">
        <span className="fm-brief__footer-text">
          Intelligence Engine · Confianza{" "}
          <span
            className="fm-brief__footer-conf"
            data-confidence={confLevel}
          >
            {brief.confidence}%
          </span>
        </span>
      </div>
    </article>
  );
}