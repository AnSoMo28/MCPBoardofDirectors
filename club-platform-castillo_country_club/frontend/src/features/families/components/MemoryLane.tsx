// src/features/families/components/MemoryLane.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Memory Lane
// Level 6+ Agency · Apple Production Grade
//
// "The Emotional Timeline"
//
// AI-curated editorial timeline of defining family moments.
// Not an activity log — an editorial selection where the AI
// decided what matters, assigned significance, and tagged.
//
// PRE-WRITE VERIFICATION:
//   FamilyMemory     → ../ai-types.ts §8           ✅
//   MemoryType       → ../ai-types.ts §8 (union)   ✅
//   MEMORY_TYPES     → ../config.ts §13             ✅
//     Structure: { type, label, color, icon }
//     NO bgColor — use color-mix() in CSS
//   family-atoms.css → ../family-atoms.css          ✅
//     Uses: fm-glass-card, fm-section-label, fm-status-dot,
//           fm-action-btn, fm-ai-badge
//
// ANTI-PATTERNS REMOVED:
//   - FamilyMemory from ../types → ../ai-types
//   - cn() → removed
//   - className prop → removed
//   - Mutable props → readonly
//   - useReducedMotion unused → removed
//   - Inline style={{ bg, width, height }} → CSS data-hero
//   - Inline style={{ color, bg }} → CSS var --mem-color
//   - cn() conditional → data-weight, data-expanded
//   - typeCfg.bgColor (doesn't exist) → color-mix in CSS
//   - No atoms → 5 atoms applied
//   - No CTA → share button added
//   - No Escape → onKeyDown handler
//   - No AI badge → fm-ai-badge applied
//   - No data-testid → added
//   - No light/reduced/print → added
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  Award, Trophy, PartyPopper, Sparkles, Zap, Users,
  ChevronDown, ChevronUp, Camera, Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FamilyMemory } from "../ai-types";
import { MEMORY_TYPES } from "../config";

import "../family-atoms.css";
import "./MemoryLane.css";

// ═══════════════════════════════════════════════════════════
// §1  Icon Registry
// Maps icon string from MEMORY_TYPES §13 → Lucide component
// ═══════════════════════════════════════════════════════════

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Award, Trophy, PartyPopper, Sparkles, Zap, Users,
};

function resolveMemoryIcon(name: string): LucideIcon {
  return ICON_REGISTRY[name] ?? Award;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

type SignificanceWeight = "hero" | "prominent" | "standard" | "subtle";

function significanceWeight(significance: number): SignificanceWeight {
  if (significance >= 9) return "hero";
  if (significance >= 7) return "prominent";
  if (significance >= 4) return "standard";
  return "subtle";
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

function formatMemberInitials(memberId: string): string {
  return memberId
    .split(/[-_\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
}

// ═══════════════════════════════════════════════════════════
// §3  Sub-component: Memory Entry
// ═══════════════════════════════════════════════════════════

interface MemoryEntryProps {
  readonly memory: FamilyMemory;
  readonly isLast: boolean;
  readonly index: number;
  readonly onMemberClick?: (memberId: string) => void;
  readonly onShare?: (memory: FamilyMemory) => void;
}

function MemoryEntry({
  memory,
  isLast,
  index,
  onMemberClick,
  onShare,
}: MemoryEntryProps) {
  // MEMORY_TYPES §13: { type, label, color, icon }
  const typeCfg = useMemo(
    () => MEMORY_TYPES[memory.type] ?? MEMORY_TYPES.milestone,
    [memory.type],
  );

  const Icon = useMemo(
    () => resolveMemoryIcon(typeCfg.icon),
    [typeCfg.icon],
  );

  const weight = useMemo(
    () => significanceWeight(memory.significance),
    [memory.significance],
  );

  const isHero = weight === "hero" || weight === "prominent";
  const [expanded, setExpanded] = useState(isHero);
  const [mediaExpanded, setMediaExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // H-07: Escape collapses expanded entry
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        e.preventDefault();
        setExpanded(false);
      }
    },
    [expanded],
  );

  const formattedDate = useMemo(
    () => formatDate(memory.date),
    [memory.date],
  );

  return (
    <article
      className="fm-mem__entry"
      data-testid={`memory-entry-${memory.id}`}
      data-weight={weight}
      data-type={memory.type}
      style={
        {
          "--mem-color": typeCfg.color,
          "--mem-index": index,
        } as CSSProperties
      }
    >
      {/* ── Timeline connector: node dot + line ── */}
      <div className="fm-mem__connector" data-hero={isHero}>
        {/* P5: fm-status-dot atom provides base dot styling */}
        <div className="fm-status-dot fm-mem__node" />
        {!isLast && <div className="fm-mem__line" />}
      </div>

      {/* ── Content ── */}
      <div className="fm-mem__content">
        {/* Header: type badge + date + significance circle */}
        <div className="fm-mem__entry-header">
          <span className="fm-mem__type-badge">
            <Icon size={9} aria-hidden="true" />
            {typeCfg.label}
          </span>
          <span className="fm-mem__date">{formattedDate}</span>
          <span
            className="fm-mem__significance"
            title={`Significancia: ${memory.significance}/10`}
          >
            {memory.significance}
          </span>
        </div>

        {/* Title — always visible, expandable toggle */}
        <button
          type="button"
          className="fm-mem__title-btn"
          onClick={toggleExpand}
          onKeyDown={handleKeyDown}
          aria-expanded={expanded}
        >
          <h3 className="fm-mem__title">{memory.title}</h3>
          {expanded ? (
            <ChevronUp size={12} className="fm-mem__expand-icon" aria-hidden="true" />
          ) : (
            <ChevronDown size={12} className="fm-mem__expand-icon" aria-hidden="true" />
          )}
        </button>

        {/* Expandable body */}
        <div className="fm-mem__body" data-expanded={expanded}>
          {/* Narrative */}
          <p className="fm-mem__narrative">{memory.narrative}</p>

          {/* Media preview */}
          {memory.mediaUrl && (
            <div className="fm-mem__media">
              {/* P5: fm-action-btn atom provides base button styling */}
              <button
                type="button"
                className="fm-action-btn fm-mem__media-btn"
                onClick={() => setMediaExpanded(!mediaExpanded)}
              >
                <Camera size={11} aria-hidden="true" />
                {mediaExpanded ? "Ocultar" : "Ver imagen"}
              </button>
              {mediaExpanded && (
                <div className="fm-mem__media-preview">
                  <img
                    src={memory.mediaUrl}
                    alt={memory.title}
                    className="fm-mem__media-img"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Tags */}
          {memory.aiTags.length > 0 && (
            <div className="fm-mem__tags">
              {memory.aiTags.map((tag) => (
                <span key={tag} className="fm-mem__tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Member avatars */}
          {memory.members.length > 0 && (
            <div className="fm-mem__members">
              <Users size={10} className="fm-mem__members-icon" aria-hidden="true" />
              {memory.members.map((memberId) => (
                <button
                  key={memberId}
                  type="button"
                  className="fm-mem__member-avatar"
                  title={memberId}
                  onClick={() => onMemberClick?.(memberId)}
                >
                  {formatMemberInitials(memberId)}
                </button>
              ))}
            </div>
          )}

          {/* P3: CTA — Every insight has a button */}
          {onShare && (
            <div className="fm-mem__actions">
              <button
                type="button"
                className="fm-action-btn fm-mem__share-btn"
                onClick={() => onShare(memory)}
              >
                <Share2 size={10} aria-hidden="true" />
                Compartir
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  Props
// ═══════════════════════════════════════════════════════════

interface MemoryLaneProps {
  readonly memories: readonly FamilyMemory[];
  readonly onMemberClick?: (memberId: string) => void;
  readonly onShare?: (memory: FamilyMemory) => void;
}

// ═══════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════

/**
 * MemoryLane — "The Emotional Timeline"
 *
 * @example
 * <MemoryLane
 *   memories={enrichment.data.memories}
 *   onMemberClick={(id) => navigate(`/members/${id}`)}
 *   onShare={(mem) => shareMemory(mem)}
 * />
 */
export function MemoryLane({
  memories,
  onMemberClick,
  onShare,
}: MemoryLaneProps) {
  const sorted = useMemo(() => {
    return [...memories].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [memories]);

  if (sorted.length === 0) {
    return (
      <div
        className="fm-glass-card fm-mem"
        data-testid="memory-lane"
        data-count="0"
        role="region"
        aria-label="Memory Lane — momentos de la familia"
      >
        <div className="fm-mem__header">
          {/* P5: fm-section-label atom */}
          <span className="fm-section-label fm-mem__label">Memory Lane</span>
        </div>
        <p className="fm-mem__empty">
          Aún no hay momentos registrados para esta familia.
        </p>
      </div>
    );
  }

  return (
    <div
      className="fm-glass-card fm-mem"
      data-testid="memory-lane"
      data-count={sorted.length}
      role="region"
      aria-label="Memory Lane — momentos de la familia"
    >
      {/* ══════ Header ══════ */}
      <div className="fm-mem__header">
        {/* P5: fm-section-label atom */}
        <span className="fm-section-label fm-mem__label">Memory Lane</span>
        <div className="fm-mem__header-right">
          {/* P5: fm-ai-badge atom — AI attribution */}
          <span className="fm-ai-badge fm-mem__ai-badge">
            <Sparkles size={8} aria-hidden="true" />
            AI-curated
          </span>
          <span className="fm-mem__count">
            {sorted.length} momento{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ══════ Timeline ══════ */}
      <div className="fm-mem__timeline">
        {sorted.map((memory, i) => (
          <MemoryEntry
            key={memory.id}
            memory={memory}
            isLast={i === sorted.length - 1}
            index={i}
            onMemberClick={onMemberClick}
            onShare={onShare}
          />
        ))}
      </div>
    </div>
  );
}