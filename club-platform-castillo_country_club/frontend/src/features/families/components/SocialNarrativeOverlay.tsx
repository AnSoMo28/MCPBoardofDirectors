// src/features/families/components/SocialNarrativeOverlay.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Social Narrative Overlay
// Level 6+ Agency · Production Grade
//
// "The Intelligence Dossier"
//
// A glass overlay panel that appears when clicking a node
// in the social graph. A classified intelligence briefing
// about a family's social position in the network.
//
// VISUAL CONCEPT:
//   A glass panel slides in from the right like a classified
//   dossier being placed on the desk. The position story is
//   the profile header — WHO this family is in the network.
//   Connection stories are relationship reports. Risks flash
//   with urgency. Opportunities glow with gold. A network
//   health bar at the bottom provides global context.
//
// Signature Visual Elements:
//   1. Gold edge light (::before on panel)
//   2. Tone atmosphere wash (::after, tinted by position story tone)
//   3. Narrative card cascade (stagger from top to bottom)
//   4. Tone-driven card borders (data-tone → border-left color)
//   5. Action button gold accent
//   6. Section label mono-uppercase with extending line
//   7. Network health bar with gradient fill
//
// Sections:
//   1. Header — node name + close button
//   2. Position narrative (always present)
//   3. Connections — top bond narratives
//   4. Risks — risk + decay narratives
//   5. Opportunities — introduction narratives
//   6. Network health footer
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (gold edge, tone atmosphere, noise)
//   D2: Stagger (section groups + card cascade)
//   D3: Cubic-bezier easing on entrance
//   D4: Mono for labels/scores, UI for body, mono-uppercased for sections
//   D5: Tone-driven dynamic colors via data-attribute
//   D6: Pseudo-element depth (gold edge, tone wash, section lines)
//   D7: Hover on cards, action buttons, close
//   D8: Dense (compact panel, tight gaps)
//   D9: Responsive (bottom sheet on mobile)
//   D10: role="dialog", aria-label, Escape close
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-narr* namespaced keyframes (5)
//
// PRE-WRITE VERIFICATION:
//   SocialNarrative     → ../lib/socialNarrative.ts §1 ✅
//   NodeNarrativeSet    → ../lib/socialNarrative.ts §1 ✅
//   NetworkNarrative    → ../lib/socialNarrative.ts §1 ✅
//   NarrativeTone       → ../types.ts §1              ✅
//   NARRATIVE_TEMPLATES → ../config.ts §22            ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 1 → removed
//   - className prop → removed
//   - Mutable props → readonly
//   - HealthBadge hardcoded score → parse from headline
//   - Tailwind inline (~8 utilities) → BEM classes
//   - style={{ backgroundColor, color }} → CSS var bridge
//   - No stagger → ADD 6 section groups
//   - No glass morphism → ADD (gold edge, tone wash)
//   - No light mode → ADD
//   - No reduced motion → ADD
//   - No print → ADD
//   - No keyframes → ADD 5 fm-narr*
//   - No data-testid → ADD
//   - No Escape handler → ADD
// ═══════════════════════════════════════════════════════════

import { useEffect, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  X, Eye, Zap, AlertTriangle, PartyPopper,
  Network, TrendingUp, TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  SocialNarrative,
  NodeNarrativeSet,
  NetworkNarrative,
} from "../lib/socialNarrative";

import "./SocialNarrativeOverlay.css";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Eye, Zap, AlertTriangle, PartyPopper,
  Network, TrendingUp, TrendingDown,
};

function resolveIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Eye;
}

// ═══════════════════════════════════════════════════════════
// §2  Score Parser — Extract score from NetworkNarrative headline
// ═══════════════════════════════════════════════════════════

/**
 * Extract health score from NetworkNarrative headline.
 * Format: "Red social activa — 78/100"
 * Returns null if no match.
 */
function parseHealthScore(headline: string): number | null {
  const match = headline.match(/—\s*(\d+)\s*\//);
  return match ? Number(match[1]) : null;
}

// ═══════════════════════════════════════════════════════════
// §3  Sub-components
// ═══════════════════════════════════════════════════════════

// ── §3.1  Narrative Card ──
// Source: SocialNarrative from socialNarrative.ts §1
//   id, type, tone, headline, body, icon, color, bgColor,
//   priority, sourceIds, action?: { label, type }

interface NarrativeCardProps {
  readonly narrative: SocialNarrative;
  readonly onAction?: (type: string) => void;
  readonly style?: CSSProperties;
}

function NarrativeCard({ narrative, onAction }: NarrativeCardProps) {
  const Icon = resolveIcon(narrative.icon);

  const handleAction = useCallback(() => {
    if (narrative.action) {
      onAction?.(narrative.action.type);
    }
  }, [narrative.action, onAction]);

  return (
    <div
      className="fm-narr-card"
      data-tone={narrative.tone}
      style={
        {
          "--narr-color": narrative.color,
          "--narr-bg": narrative.bgColor,
        } as CSSProperties
      }
    >
      <div className="fm-narr-card__header">
        <span className="fm-narr-card__icon">
          <Icon size={10} aria-hidden="true" />
        </span>
        <span className="fm-narr-card__headline">{narrative.headline}</span>
      </div>
      <p className="fm-narr-card__body">{narrative.body}</p>
      {narrative.action && (
        <button
          type="button"
          className="fm-narr-card__action"
          onClick={handleAction}
        >
          <Zap size={8} aria-hidden="true" />
          {narrative.action.label}
        </button>
      )}
    </div>
  );
}

// ── §3.2  Network Health Bar ──
// Source: NetworkNarrative from socialNarrative.ts §1
//   headline (contains score), summary, stories[], healthStatement

interface NetworkHealthBarProps {
  readonly narrative: NetworkNarrative;
}

function NetworkHealthBar({ narrative }: NetworkHealthBarProps) {
  const score = useMemo(
    () => parseHealthScore(narrative.headline),
    [narrative.headline],
  );

  if (score === null) return null;

  const color =
    score >= 70 ? "var(--color-emerald-400)" :
    score >= 40 ? "var(--color-amber-400)" :
    "var(--color-rose-400)";

  return (
    <div className="fm-narr__health">
      <div className="fm-narr__health-header">
        <span className="fm-narr__health-label">Salud de Red</span>
        <span
          className="fm-narr__health-score"
          style={{ "--health-color": color } as CSSProperties}
        >
          {score}/100
        </span>
      </div>
      <div className="fm-narr__health-bar-track">
        <div
          className="fm-narr__health-bar-fill"
          style={{ "--health-width": `${score}%`, "--health-color": color } as CSSProperties}
        />
      </div>
      <p className="fm-narr__health-statement">{narrative.healthStatement}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  Props
// ═══════════════════════════════════════════════════════════

interface SocialNarrativeOverlayProps {
  readonly nodeNarrative: NodeNarrativeSet | null;
  readonly networkNarrative: NetworkNarrative | null;
  readonly onClose: () => void;
  readonly onAction?: (type: string, sourceIds: readonly string[]) => void;
}

// ═══════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════

/**
 * SocialNarrativeOverlay — "The Intelligence Dossier"
 *
 * Glass overlay panel that appears when clicking a node in the
 * social graph. Shows the family's complete social intelligence
 * briefing: position, connections, risks, opportunities.
 *
 * @example
 * <SocialNarrativeOverlay
 *   nodeNarrative={selectedNarrative}
 *   networkNarrative={networkNarrative}
 *   onClose={() => setSelected(null)}
 * />
 */
export function SocialNarrativeOverlay({
  nodeNarrative,
  networkNarrative,
  onClose,
  onAction,
}: SocialNarrativeOverlayProps) {
  // ── Escape key ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Action handler (B-08) ──
  const handleAction = useCallback(
    (type: string, sourceIds: readonly string[]) => {
      onAction?.(type, sourceIds);
    },
    [onAction],
  );

  // ── Card action factory ──
  const makeCardAction = useCallback(
    (sourceIds: readonly string[]) =>
      (type: string) => handleAction(type, sourceIds),
    [handleAction],
  );

  // ── Tone of position story (for atmosphere) ──
  const positionTone = nodeNarrative?.position.tone ?? "observational";

  // ── Guard ──
  if (!nodeNarrative) return null;

  const { position, connections, risks, opportunities } = nodeNarrative;

  return (
    <div
      className="fm-narr"
      data-testid="social-narrative-overlay"
      data-tone={positionTone}
      role="dialog"
      aria-label={`Narrativa social AI para ${nodeNarrative.nodeName}`}
    >
      {/* ══════ Header ══════ */}
      <div className="fm-narr__header">
        <h3 className="fm-narr__title">{nodeNarrative.nodeName}</h3>
        <button
          type="button"
          className="fm-narr__close"
          onClick={onClose}
          aria-label="Cerrar narrativa"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* ══════ Body ══════ */}
      <div className="fm-narr__body">
        {/* ── Position ── */}
        <span className="fm-narr__section-label">Posición</span>
        <NarrativeCard
          narrative={position}
          onAction={makeCardAction(position.sourceIds)}
        />

        {/* ── Connections ── */}
        {connections.length > 0 && (
          <>
            <span className="fm-narr__section-label">Conexiones clave</span>
            {connections.map((n) => (
              <NarrativeCard
                key={n.id}
                narrative={n}
                onAction={makeCardAction(n.sourceIds)}
              />
            ))}
          </>
        )}

        {/* ── Risks ── */}
        {risks.length > 0 && (
          <>
            <span className="fm-narr__section-label">Alertas</span>
            {risks.map((n) => (
              <NarrativeCard
                key={n.id}
                narrative={n}
                onAction={makeCardAction(n.sourceIds)}
              />
            ))}
          </>
        )}

        {/* ── Opportunities ── */}
        {opportunities.length > 0 && (
          <>
            <span className="fm-narr__section-label">Oportunidades</span>
            {opportunities.map((n) => (
              <NarrativeCard
                key={n.id}
                narrative={n}
                onAction={makeCardAction(n.sourceIds)}
              />
            ))}
          </>
        )}
      </div>

      {/* ══════ Footer: Network Health ══════ */}
      {networkNarrative && (
        <NetworkHealthBar narrative={networkNarrative} />
      )}
    </div>
  );
}