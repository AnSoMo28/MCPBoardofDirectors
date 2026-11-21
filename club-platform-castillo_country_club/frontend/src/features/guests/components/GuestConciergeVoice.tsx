// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestConciergeVoice.tsx
// Phase 34 "The Gateway" — Capa 2: The Concierge Voice
// Level 6+ Agency · Production Grade
//
// The voice of the guest intelligence system.
// Renders a typewriter narrative that tells the staff what
// matters, why, and what to do — before they ask.
//
// Absorbes the functionality of:
//   - KPIStat cards (data is now in narrative form)
//   - GuestAdvisorBanner (insights are now in the voice)
//   - GuestBriefingOverlay (briefing is the voice itself)
//   - GuestPulse (status is the voice's tone)
//
// Depends on: conciergeNarrative.ts, useGuestDashboard
// Checklist: TSX-1-40, CSS-1-40, D3.3-6, D4.1-13
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

import type {
  GuestDashboardMode,
} from "../types";

import type {
  ConciergeNarrative,
  ConciergeAction,
  ConciergeInput,
  ConciergeTone,
} from "../lib/conciergeNarrative";

import { generateNarrativeSafe } from "../lib/conciergeNarrative";

import type { UseGuestDashboardReturn } from "../hooks/useGuestDashboard";

import "./GuestConciergeVoice.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════
function mapToneToMode(tone: ConciergeTone): GuestDashboardMode {
  switch (tone) {
    case "warm": return "calm";
    case "urgent": return "alert";
    case "commanding": return "critical";
    case "celebratory": return "celebration";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

interface GuestConciergeVoiceProps {
  /** Full dashboard data from useGuestDashboard. */
  readonly dashboard: UseGuestDashboardReturn;
  /** Callback when user clicks an action button. */
  readonly onAction?: (action: ConciergeAction) => void;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Check if user prefers reduced motion (instant text). */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  const attr = document.documentElement.getAttribute("data-prefers-reduced");
  if (attr === "true") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Build ConciergeInput from dashboard data. */
function buildConciergeInput(dashboard: UseGuestDashboardReturn): ConciergeInput {
  const hs = dashboard.healthScoreResult;
  const engines = dashboard.engines;
  const intel = dashboard.intelligenceSummary;

  return {
    mode: dashboard.dashboardMode,
    insights: dashboard.insights.map((i) => ({
      id: i.id,
      severity: i.severity,
      title: i.title,
      description: i.description,
      impact: i.impact,
      confidence: i.confidence,
      action: i.action
        ? {
            label: i.action.label,
            server: i.action.server ?? "guest_management",
            tool: i.action.tool ?? "",
            params: i.action.params ?? {},
            approval: i.action.approval ?? "auto",
          }
        : undefined,
      metric: i.metric,
      metricValue: i.metricValue,
    })),
    healthScore: hs?.score ?? 0,
    healthLevel: hs?.level ?? "sin datos",
    hasCritical: hs?.hasCritical ?? false,
    pipelineHealth: intel?.pipelineHealth ?? engines?.pipeline?.health ?? 0,
    quickWinCount: intel?.quickWinCount ?? engines?.pipeline?.quickWins?.length ?? 0,
    vipCount: intel?.vipCount ?? 0,
    dormantCount: intel?.dormantCount ?? 0,
    totalGuests: engines?.pipeline?.totalGuests ?? dashboard.analytics?.total_guests ?? 0,
    bottleneckStage: engines?.pipeline?.bottlenecks[0]?.stageLabel ?? null,
  };
}
// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * The Concierge Voice — speaks first, tells what matters.
 * Renders a typewriter narrative with action buttons.
 *
 * @example
 * <GuestConciergeVoice
 *   dashboard={dashboard}
 *   onAction={(action) => executeMCPTool(action)}
 * />
 */
export function GuestConciergeVoice({
  dashboard,
  onAction,
}: GuestConciergeVoiceProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // ── Build narrative from dashboard data ──
  const narrative: ConciergeNarrative = useMemo(() => {
    if (dashboard.isLoading) {
      return {
        greeting: "Buenos días",
        headline: "Cargando inteligencia de invitados...",
        body: "",
        actions: [],
        tone: "warm",
        priority: "info",
      };
    }

    const input = buildConciergeInput(dashboard);
    return generateNarrativeSafe(input);
  }, [dashboard]);

  // ── Typewriter effect ──
  const fullText = useMemo(
    () => `${narrative.greeting}. ${narrative.headline} ${narrative.body}`.trim(),
    [narrative],
  );

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (reducedMotion) {
      setDisplayedText(fullText);
      setIsTypingComplete(true);
      return;
    }

    setDisplayedText("");
    setIsTypingComplete(false);

    let charIndex = 0;
    const speed = 30; // ms per character

    intervalRef.current = setInterval(() => {
      charIndex++;
      if (charIndex >= fullText.length) {
        setDisplayedText(fullText);
        setIsTypingComplete(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      setDisplayedText(fullText.substring(0, charIndex));
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fullText, reducedMotion]);

  // ── Skip typing on click ──
  const handleSkip = useCallback(() => {
    if (!isTypingComplete) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayedText(fullText);
      setIsTypingComplete(true);
    }
  }, [isTypingComplete, fullText]);

  // ── Loading skeleton ──
  if (dashboard.isLoading) {
    return (
      <div
        className="gst-voice"
        data-mode="calm"
        data-state="loading"
        role="status"
        aria-label="Cargando inteligencia de invitados"
      >
        <div className="gst-voice__skeleton">
          <div className="gst-voice__skeleton-line gst-voice__skeleton-line--long" />
          <div className="gst-voice__skeleton-line gst-voice__skeleton-line--medium" />
          <div className="gst-voice__skeleton-line gst-voice__skeleton-line--short" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (dashboard.isError) {
    return (
      <div
        className="gst-voice"
        data-mode="critical"
        data-state="error"
        role="alert"
        aria-label="Error cargando inteligencia"
      >
        <p className="gst-voice__error-text">
          No se pudo cargar la inteligencia de invitados. Intentá de nuevo.
        </p>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div
      className="gst-voice"
      data-mode={mapToneToMode(narrative.tone)}
      data-tone={narrative.tone}
      data-priority={narrative.priority}
      data-state="data"
      role="region"
      aria-label="Concierge — inteligencia de invitados"
      aria-live="polite"
      onClick={handleSkip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleSkip();
      }}
      tabIndex={0}
    >
      {/* ── Priority indicator ── */}
      <div className="gst-voice__indicator" data-priority={narrative.priority}>
        <span className="gst-voice__indicator-dot" />
        <span className="gst-voice__indicator-label">
          {narrative.priority === "critical" ? "Urgente" :
           narrative.priority === "high" ? "Prioritario" :
           narrative.priority === "medium" ? "Atención" : "Normal"}
        </span>
      </div>

      {/* ── Greeting ── */}
      <p className="gst-voice__greeting">{narrative.greeting}</p>

      {/* ── Typewriter text ── */}
      <div className="gst-voice__text-container">
        <p className="gst-voice__text">
          {displayedText}
          {!isTypingComplete && (
            <span className="gst-voice__cursor" aria-hidden="true" />
          )}
        </p>
      </div>

      {/* ── Actions ── */}
      {isTypingComplete && narrative.actions.length > 0 && (
        <div className="gst-voice__actions" role="group" aria-label="Acciones disponibles">
          {narrative.actions.map((action, i) => (
            <Button
              key={`${action.tool}-${i}`}
              className="gst-voice__action"
              data-variant={action.variant}
              onClick={(e) => {
                e.stopPropagation();
                onAction?.(action);
              }}
              aria-label={action.label}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* ── Skip hint ── */}
      {!isTypingComplete && (
        <p className="gst-voice__skip-hint" aria-hidden="true">
          Click para ver completo
        </p>
      )}
    </div>
  );
}