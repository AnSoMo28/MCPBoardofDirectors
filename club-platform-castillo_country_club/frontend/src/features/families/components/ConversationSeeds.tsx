// src/features/families/components/ConversationSeeds.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Conversation Seeds
// Level 6+ Agency · Production Grade
//
// "The Communication Playbook"
//
// AI-generated conversation starters for staff. The AI knows
// what to say, to whom, through which channel, and why.
// Staff copies or executes with one click.
//
// VISUAL CONCEPT:
//   A playbook of communication cards. Each card is a complete
//   briefing: channel icon, tone badge, context chip, the actual
//   seed text in quotes, a confidence meter, and the AI's reasoning.
//   Filter chips at the top let staff narrow by context. Cards
//   are sorted by confidence (highest first). A gold accent
//   highlights the recommended action.
//
// Signature Visual Elements:
//   1. Channel badge with icon (WhatsApp/Email/Phone/In-person)
//   2. Tone atmosphere per card (warm=gold, professional=silver,
//      celebratory=emerald, empathetic=teal)
//   3. Context chip with type-specific color
//   4. Seed text in display font with quote marks
//   5. Confidence bar with color gradient
//   6. AI "Basado en" transparency line
//   7. Copy + Execute action buttons
//   8. Filter chips with active state
//
// Sections:
//   1. Header — label + count
//   2. Filter Chips — context type filters
//   3. Seed Cards — per seed with all metadata
//   4. Actions — copy + execute per card
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (subtle wrapper, tone glow per card)
//   D2: Stagger (card cascade)
//   D3: Cubic-bezier easing on card reveal
//   D4: Mono for data, UI for body, mono-uppercased for labels
//   D5: Tone/context dynamic colors via data-attributes + CSS vars
//   D6: Pseudo-element depth (card tone border, quote mark)
//   D7: Hover on cards, filter chips, action buttons
//   D8: Dense (compact card, tight metadata)
//   D9: Responsive (card layout stacks)
//   D10: role="region", aria-label
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-seed* namespaced keyframes (4)
//
// PRE-WRITE VERIFICATION:
//   ConversationSeed → ../ai-types.ts §9         ✅
//   SEED_TONES       → ../config.ts §14           ✅
//   SEED_CHANNELS    → ../config.ts §14           ✅
//   ConversationSeed.context values → 6 values    ✅
//   ConversationSeed.tone values    → 4 values    ✅
//   ConversationSeed.channel values → 4 values    ✅
//   ConversationSeed.confidence     → 0-1 range   ✅ (CRITICAL: not 0-100)
//
// ANTI-PATTERNS REMOVED:
//   - ConversationSeed from ../types → ../ai-types
//   - confidence 0-1 shown as 0-100 → Math.round(confidence * 100)
//   - cn() × 2 → removed
//   - className prop → removed
//   - Mutable props → readonly
//   - useReducedMotion unused → removed
//   - Inline style={{ color/bg }} × 8 → CSS var bridges + data-attributes
//   - Inline style={{ borderColor }} × 2 → CSS var bridges
//   - Filter chip cn() conditional → data-active attribute
//   - No stagger → ADD card cascade
//   - No glass → ADD
//   - No data-testid → ADD
//   - No light/reduced/print → ADD
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import {
  User, Phone, Mail, MessageCircle, Copy, Check, Filter, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ConversationSeed } from "../ai-types";
import { SEED_TONES, SEED_CHANNELS } from "../config";

import "./ConversationSeeds.css";

// ═══════════════════════════════════════════════════════════
// §1  Registries
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICON_REGISTRY: Record<string, LucideIcon> = {
  User, Phone, Mail, MessageCircle,
};

function resolveChannelIcon(name: string): LucideIcon {
  return CHANNEL_ICON_REGISTRY[name] ?? MessageCircle;
}

interface ContextConfig {
  readonly label: string;
  readonly color: string;
}

const CONTEXT_MAP: Record<ConversationSeed["context"], ContextConfig> = {
  greeting:   { label: "Saludo",       color: "var(--color-teal-400)" },
  follow_up:  { label: "Seguimiento",  color: "var(--color-silver-300)" },
  milestone:  { label: "Hito",         color: "var(--color-gold-400)" },
  recovery:   { label: "Recuperación", color: "var(--color-rose-400)" },
  upsell:     { label: "Upgrade",      color: "var(--color-amber-400)" },
  feedback:   { label: "Feedback",     color: "var(--color-emerald-400)" },
};

const EXECUTE_CONFIG: Record<string, { readonly label: string; readonly icon: string }> = {
  whatsapp:  { label: "Enviar WhatsApp", icon: "MessageCircle" },
  email:     { label: "Abrir email",     icon: "Mail" },
  phone:     { label: "Llamada",         icon: "Phone" },
  in_person: { label: "Preparar",        icon: "User" },
};

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

function confidenceLevel(confidence: number): string {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "medium";
  if (confidence >= 0.4) return "low";
  return "uncertain";
}

function confidencePercent(confidence: number): number {
  return Math.round(confidence * 100);
}

// ═══════════════════════════════════════════════════════════
// §3  Props
// ═══════════════════════════════════════════════════════════

interface ConversationSeedsProps {
  readonly seeds: readonly ConversationSeed[];
  readonly onExecute?: (seed: ConversationSeed) => void;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * ConversationSeeds — "The Communication Playbook"
 *
 * AI-generated conversation starters for staff. Each seed is a
 * complete briefing: channel, tone, context, the actual text,
 * confidence meter, and AI reasoning.
 *
 * @example
 * <ConversationSeeds
 *   seeds={enrichment.data.conversationSeeds}
 *   onExecute={(seed) => openChannel(seed.channel, seed.seed)}
 * />
 */
export function ConversationSeeds({
  seeds,
  onExecute,
}: ConversationSeedsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    ConversationSeed["context"] | "all"
  >("all");

  // ── Available contexts (B-07) ──
  const availableContexts = useMemo(() => {
    const set = new Set(seeds.map((s) => s.context));
    return Array.from(set);
  }, [seeds]);

  // ── Filtered seeds (B-07) ──
  const filtered = useMemo(() => {
    if (activeFilter === "all") return seeds;
    return seeds.filter((s) => s.context === activeFilter);
  }, [seeds, activeFilter]);

  // ── Sorted by confidence (B-07) ──
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.confidence - a.confidence);
  }, [filtered]);

  // ── Copy handler (B-08) ──
  const handleCopy = useCallback(async (seed: ConversationSeed) => {
    try {
      await navigator.clipboard.writeText(seed.seed);
      setCopiedId(seed.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Silent fail — clipboard may not be available
    }
  }, []);

  // ── Filter handler (B-08) ──
  const handleFilter = useCallback(
    (ctx: ConversationSeed["context"] | "all") => {
      setActiveFilter(ctx);
    },
    [],
  );

  // ── Guard ──
  if (seeds.length === 0) return null;

  return (
    <div
      className="fm-seed"
      data-testid="conversation-seeds"
      role="region"
      aria-label="Seeds de conversación generados por AI"
    >
      {/* ══════ Header ══════ */}
      <div className="fm-seed__header">
        <span className="fm-seed__label">Conversation Seeds</span>
        <span className="fm-seed__count">
          <Sparkles size={9} aria-hidden="true" />
          {seeds.length} sugerencia{seeds.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ══════ Context Filter Chips ══════ */}
      {availableContexts.length > 1 && (
        <div className="fm-seed__filters">
          <Filter size={10} className="fm-seed__filter-icon" aria-hidden="true" />
          <button
            type="button"
            className="fm-seed__filter-chip"
            data-active={activeFilter === "all"}
            onClick={() => handleFilter("all")}
          >
            Todas
          </button>
          {availableContexts.map((ctx) => {
            const cfg = CONTEXT_MAP[ctx];
            return (
              <button
                key={ctx}
                type="button"
                className="fm-seed__filter-chip"
                data-active={activeFilter === ctx}
                style={
                  activeFilter === ctx
                    ? {
                        "--chip-color": cfg.color,
                      } as CSSProperties
                    : undefined
                }
                onClick={() => handleFilter(ctx)}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ══════ Seed Cards ══════ */}
      <div className="fm-seed__list">
        {sorted.map((seed, cardIndex) => {
          const toneCfg = SEED_TONES[seed.tone] ?? SEED_TONES.warm;
          const ctxCfg = CONTEXT_MAP[seed.context] ?? CONTEXT_MAP.greeting;
          const channelDef =
            SEED_CHANNELS.find((c) => c.id === seed.channel) ?? SEED_CHANNELS[0];
          const ChannelIcon = resolveChannelIcon(channelDef.icon);
          const execCfg = EXECUTE_CONFIG[seed.channel] ?? EXECUTE_CONFIG.in_person;
          const ExecIcon = resolveChannelIcon(execCfg.icon);
          const isCopied = copiedId === seed.id;
          const confPct = confidencePercent(seed.confidence);
          const confLevel = confidenceLevel(seed.confidence);

          return (
            <article
              key={seed.id}
              className="fm-seed__card"
              data-tone={seed.tone}
              data-confidence={confLevel}
              style={
                {
                  "--seed-tone": toneCfg.color,
                  "--seed-ctx": ctxCfg.color,
                  "--seed-conf": `${confPct}%`,
                  "--card-index": cardIndex,
                } as CSSProperties
              }
            >
              {/* ── Badges: Channel + Tone + Context ── */}
              <div className="fm-seed__card-header">
                <span className="fm-seed__channel-badge">
                  <ChannelIcon size={10} aria-hidden="true" />
                  {channelDef.label}
                </span>
                <span className="fm-seed__tone-badge">
                  {toneCfg.label}
                </span>
                <span className="fm-seed__context-badge">
                  {ctxCfg.label}
                </span>
              </div>

              {/* ── Seed text ── */}
              <p className="fm-seed__seed-text">
                &ldquo;{seed.seed}&rdquo;
              </p>

              {/* ── Target member ── */}
              {seed.targetMemberId && (
                <span className="fm-seed__target">
                  Dirigido a: {seed.targetMemberId}
                </span>
              )}

              {/* ── Confidence bar ── */}
              <div className="fm-seed__confidence" data-level={confLevel}>
                <div className="fm-seed__confidence-track">
                  <div className="fm-seed__confidence-fill" />
                </div>
                <span className="fm-seed__confidence-value">
                  {confPct}%
                </span>
              </div>

              {/* ── AI Reason ── */}
              <p className="fm-seed__reason">
                <span className="fm-seed__reason-label">Basado en:</span>{" "}
                {seed.basedOn}
              </p>

              {/* ── Actions ── */}
              <div className="fm-seed__actions">
                <button
                  type="button"
                  className="fm-seed__action"
                  data-action="copy"
                  data-copied={isCopied}
                  onClick={() => handleCopy(seed)}
                  disabled={isCopied}
                >
                  {isCopied ? (
                    <>
                      <Check size={11} aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={11} aria-hidden="true" />
                      Copiar
                    </>
                  )}
                </button>
                {onExecute && (
                  <button
                    type="button"
                    className="fm-seed__action"
                    data-action="execute"
                    style={{ "--seed-tone": toneCfg.color } as CSSProperties}
                    onClick={() => onExecute(seed)}
                  >
                    <ExecIcon size={11} aria-hidden="true" />
                    {execCfg.label}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}