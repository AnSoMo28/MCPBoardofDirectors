// src/features/families/components/IntelligenceGlance.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Intelligence Glance Component
// Level 6+ Agency · Production Grade
//
// "The Quick Read" — a floating intelligence card that appears
// contextually. Bloomberg Terminal alert meets Apple notification.
// The AI has analyzed the family in 0.3 seconds and delivers
// a concise, urgent briefing. Every pixel is information.
//
// VISUAL CONCEPT:
//   Dense. Sharp. No waste. The card floats with glass depth.
//   The AI badge glows with authority. Signals pulse by severity.
//   The temperature bar breathes with zone color. Actions are
//   gold-accented CTAs. The whole card reveals in a cascade.
//
// Sections:
//   1. Header: AI badge + close button
//   2. Headline: narrative-first statement (P1)
//   3. Signals: severity-colored signal dots
//   4. Temperature: zone-colored bar + trend
//   5. Recommendation: AI suggestion text
//   6. Confidence: quality indicator bar
//   7. Actions: CTA buttons (P3)
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (inset highlight, gold edge, shadow)
//   D2: Stagger (7 section groups)
//   D3: Cubic-bezier easing on entrance
//   D4: Mono for data, UI for body, mono-uppercased for labels
//   D5: Severity-driven dynamic colors via data-attributes
//   D6: Pseudo-element depth (AI glow, signal pulse)
//   D7: Hover on actions
//   D8: Ultra-tight spatial density (compact card)
//   D9: Responsive (intrinsic sizing)
//   D10: role="dialog", aria-label, keyboard close
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-glance* namespaced keyframes
//
// PRE-WRITE VERIFICATION:
//   Family       → ../types.ts §1 ✅
//   GlanceInsight → ../lib/familySignals.ts ✅ (verified in hooks)
//   Trend        → ../lib/familySignals.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-* attributes
//   - ~25 glass-intelligence-glance → fm-glance
//   - Tailwind in TrendIcon/SignalDot → BEM classes
//   - Mutable props → readonly
//   - className/style props → removed
//   - Inline colors → CSS var bridges
//   - No stagger → 7 stagger groups
//   - No glass morphism → ADD (inset highlight, gold edge)
//   - No entry animation → ADD cubic-bezier cascade
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  X, TrendingUp, TrendingDown, Minus, Sparkles, Brain,
} from "lucide-react";

import type { Family } from "../types";
import type { GlanceInsight, Trend } from "../lib/familySignals";

import "./IntelligenceGlance.css";

// ═══════════════════════════════════════════════════════════
// §1  Sub-components
// ═══════════════════════════════════════════════════════════

function TrendIndicator({ trend }: { readonly trend: Trend }) {
  return (
    <span className="fm-glance__trend-icon" data-trend={trend}>
      {trend === "up" && <TrendingUp size={12} aria-hidden="true" />}
      {trend === "down" && <TrendingDown size={12} aria-hidden="true" />}
      {trend === "stable" && <Minus size={12} aria-hidden="true" />}
    </span>
  );
}

function SignalDot({ severity }: { readonly severity: "critical" | "warning" | "info" }) {
  return (
    <span className="fm-glance__signal-dot" data-severity={severity} />
  );
}

// ═══════════════════════════════════════════════════════════
// §2  Types
// ═══════════════════════════════════════════════════════════

interface IntelligenceGlanceProps {
  readonly family: Family;
  readonly insight: GlanceInsight;
  readonly onClose: () => void;
  readonly onViewProfile: () => void;
  readonly onSendMessage?: () => void;
}

// ═══════════════════════════════════════════════════════════
// §3  Component
// ═══════════════════════════════════════════════════════════

/**
 * IntelligenceGlance — "The Quick Read"
 *
 * A floating intelligence card with AI synthesis:
 *   - Headline narrative (P1)
 *   - Top signals with severity indicators
 *   - Temperature bar with zone coloring
 *   - Recommendation with action (P3)
 *   - Confidence quality indicator
 *
 * @example
 * <IntelligenceGlance
 *   family={selectedFamily}
 *   insight={glanceInsight}
 *   onClose={() => setOpen(false)}
 *   onViewProfile={() => navigate(`/families/${id}`)}
 * />
 */
export function IntelligenceGlance({
  family,
  insight,
  onClose,
  onViewProfile,
  onSendMessage,
}: IntelligenceGlanceProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Escape key ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Focus ──
  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  // ── Derived (B-07) ──
  const confidencePercent = useMemo(
    () => Math.round(insight.confidence * 100),
    [insight.confidence],
  );

  const trendLabel = useMemo(() => {
    if (insight.trend === "up") return "Ascendente";
    if (insight.trend === "down") return "Descendente";
    return "Estable";
  }, [insight.trend]);

  // ── Handlers (B-08) ──
  const handleSendMessage = useCallback(() => {
    onSendMessage?.();
  }, [onSendMessage]);

  const handleViewProfile = useCallback(() => {
    onViewProfile();
  }, [onViewProfile]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // ── Signal severity counts for badge ──
  const criticalCount = useMemo(
    () => insight.signals.filter((s) => s.severity === "critical").length,
    [insight.signals],
  );

  return (
    <div
      ref={cardRef}
      className="fm-glance"
      data-testid="intelligence-glance"
      data-headline-type={insight.headlineType}
      tabIndex={-1}
      role="dialog"
      aria-label={`Intelligence glance para ${family.familyName}`}
    >
      {/* ══════ Header: AI Badge + Close ══════ */}
      <div className="fm-glance__header">
        <span className="fm-glance__ai-badge">
          <Brain size={10} aria-hidden="true" />
          AI
          {criticalCount > 0 && (
            <span className="fm-glance__ai-badge-count">{criticalCount}</span>
          )}
        </span>
        <button
          type="button"
          className="fm-glance__close"
          onClick={handleClose}
          aria-label="Cerrar"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* ══════ Headline — P1 Narrative First ══════ */}
      <p className="fm-glance__headline">{insight.headline}</p>

      {/* ══════ Signals — Severity-Colored ══════ */}
      {insight.signals.length > 0 && (
        <div className="fm-glance__signals">
          {insight.signals.map((signal, i) => (
            <div
              key={`${signal.label}-${i}`}
              className="fm-glance__signal"
              data-severity={signal.severity}
            >
              <SignalDot severity={signal.severity} />
              <span className="fm-glance__signal-label">{signal.label}</span>
              <span className="fm-glance__signal-value">{signal.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══════ Temperature + Trend ══════ */}
      <div className="fm-glance__metrics">
        <div
          className="fm-glance__temp"
          style={
            {
              "--glance-temp": `${insight.temperature}%`,
              "--glance-temp-color": insight.temperatureColor,
            } as CSSProperties
          }
        >
          <div className="fm-glance__temp-track">
            <div className="fm-glance__temp-fill" />
          </div>
          <span className="fm-glance__temp-label">
            {insight.temperatureZone} · {insight.temperature}/100
          </span>
        </div>
        <div className="fm-glance__trend">
          <TrendIndicator trend={insight.trend} />
          <span className="fm-glance__trend-label">{trendLabel}</span>
        </div>
      </div>

      {/* ══════ Recommendation — AI Voice ══════ */}
      <div className="fm-glance__recommendation">
        <Sparkles size={10} className="fm-glance__rec-icon" aria-hidden="true" />
        <p>{insight.recommendation}</p>
      </div>

      {/* ══════ Confidence Bar ══════ */}
      <div
        className="fm-glance__confidence"
        style={{ "--glance-conf": `${confidencePercent}%` } as CSSProperties}
      >
        <div className="fm-glance__confidence-track">
          <div className="fm-glance__confidence-fill" />
        </div>
        <span className="fm-glance__confidence-label">{confidencePercent}% confianza</span>
      </div>

      {/* ══════ Actions — CTAs (P3) ══════ */}
      <div className="fm-glance__actions">
        {onSendMessage && (
          <button
            type="button"
            className="fm-glance__action"
            onClick={handleSendMessage}
          >
            Enviar mensaje
          </button>
        )}
        <button
          type="button"
          className="fm-glance__action fm-glance__action--primary"
          onClick={handleViewProfile}
        >
          Ver perfil →
        </button>
      </div>
    </div>
  );
}