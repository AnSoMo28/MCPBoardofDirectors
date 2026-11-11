// ═══════════════════════════════════════════════════════════════════════
// Member360 — Decision Stage
// Phase 30 — Block 2.5: The Action
// ═══════════════════════════════════════════════════════════════════════
//
// The action scenario that appears when a member needs intervention.
// Not a card buried in a list — a STAGE. A scene. A call to action.
//
// Shows:
// - The narrative brief (what's happening)
// - The decision steps (what to do)
// - The countdown (how much time is left)
// - The CTA button (do it now)
//
// Only renders for at_risk and disengaging members.
// ═══════════════════════════════════════════════════════════════════════

import type {
  MemberTemperature
} from "../types";

import type { MemberPredictions } from "../lib/memberPredictions";
import type { MemberBriefingPackage } from "../lib/memberNarrative";
import "./MemberDecisionStage.css";
import { Button } from "@/shared/components/ui/Button";

interface MemberDecisionStageProps {
  temperature: MemberTemperature;
  predictions: MemberPredictions;
  narrative: MemberBriefingPackage | null;
  memberName: string;
}

/**
 * Decision stage — prominent action scenario for at-risk/disengaging members.
 */
export function MemberDecisionStage({
  temperature,
  predictions,
  narrative,
  memberName,
}: MemberDecisionStageProps) {
  const state = temperature.state;
  const stateIsCritical = state === "disengaging";
  const stateIsUrgent = state === "at_risk";

  // Find the most urgent window
  const urgentWindow = predictions.windows.find(
    (w) => w.status === "imminent" || w.status === "closing",
  );

  // Top action from next-best-action
  const topAction = predictions.nextBestAction.actions[0];

  // Decision brief from narrative (if available)
  const decisionBrief = narrative?.all.find(
    (n) => n.type === "decision_brief",
  );

  // Risk alert from narrative
  const riskAlert = narrative?.all.find(
    (n) => n.type === "risk_alert",
  );

  return (
    <div
      className="glass-m360-decision"
      data-member-state={state}
      data-urgency={stateIsCritical ? "critical" : stateIsUrgent ? "urgent" : "normal"}
      role="alert"
      aria-live="polite"
    >
      {/* Urgency bar — animated gradient at top */}
      <div className="glass-m360-decision__urgency-bar" />

      {/* Header */}
      <div className="glass-m360-decision__header">
        <span className="glass-m360-decision__icon">
          {stateIsCritical ? "●" : "◈"}
        </span>
        <div className="glass-m360-decision__header-text">
          <h3 className="glass-m360-decision__title">
            {riskAlert?.headline ?? `⚡ Plan de acción para ${memberName}`}
          </h3>
          <p className="glass-m360-decision__subtitle">
            {riskAlert?.subtitle ?? predictions.nextBestAction.strategy}
          </p>
        </div>

        {/* Countdown badge */}
        {urgentWindow && urgentWindow.daysRemaining !== null && (
          <div
            className="glass-m360-decision__countdown"
            data-window-status={urgentWindow.status}
          >
            <span className="glass-m360-decision__countdown-number">
              {urgentWindow.daysRemaining}
            </span>
            <span className="glass-m360-decision__countdown-label">
              días
            </span>
          </div>
        )}
      </div>

      {/* Decision steps */}
      {decisionBrief && (
        <div className="glass-m360-decision__steps">
          {decisionBrief.body.split("\n").filter(Boolean).map((step, i) => (
            <div
              key={i}
              className="glass-m360-decision__step"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <span className="glass-m360-decision__step-marker">
                {i + 1}
              </span>
              <span className="glass-m360-decision__step-text">
                {step.replace(/^\d+\.\s*\w+:\s*/, "")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fallback: next-best-action steps */}
      {!decisionBrief && topAction && (
        <div className="glass-m360-decision__steps">
          <div className="glass-m360-decision__step" style={{ "--stagger-i": 0 } as React.CSSProperties}>
            <span className="glass-m360-decision__step-marker">1</span>
            <span className="glass-m360-decision__step-text">{topAction.label}</span>
          </div>
          <div className="glass-m360-decision__step" style={{ "--stagger-i": 1 } as React.CSSProperties}>
            <span className="glass-m360-decision__step-marker">2</span>
            <span className="glass-m360-decision__step-text">{topAction.description}</span>
          </div>
          {predictions.nextBestAction.actions[1] && (
            <div className="glass-m360-decision__step" style={{ "--stagger-i": 2 } as React.CSSProperties}>
              <span className="glass-m360-decision__step-marker">3</span>
              <span className="glass-m360-decision__step-text">
                {predictions.nextBestAction.actions[1].label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expected outcome */}
      <p className="glass-m360-decision__outcome">
        {predictions.nextBestAction.expectedOutcome}
      </p>

      {/* CTA */}
      <div className="glass-m360-decision__cta-row">
        {topAction?.tool ? (
          <Button
            variant="unstyled"
            className="glass-m360-decision__cta"
            data-urgency={stateIsCritical ? "critical" : "urgent"}
          >
            {topAction.label}
            <span className="glass-m360-decision__cta-arrow">→</span>
          </Button>
        ) : (
          <Button
            variant="unstyled"
            className="glass-m360-decision__cta"
            data-urgency={stateIsCritical ? "critical" : "urgent"}
          >
            {stateIsCritical ? "Contactar ahora" : "Iniciar plan de retención"}
            <span className="glass-m360-decision__cta-arrow">→</span>
          </Button>
        )}

        <div className="glass-m360-decision__meta">
          <span className="glass-m360-decision__meta-item">
            Confianza: {Math.round(predictions.churnForecast.predictedProbability.confidence * 100)}%
          </span>
          <span className="glass-m360-decision__meta-item">
            {predictions.nextBestAction.actions.length} acciones
          </span>
        </div>
      </div>

      {/* Resonance indicator */}
      {predictions.windows.length > 0 && (
        <div className="glass-m360-decision__windows-bar">
          {predictions.windows.slice(0, 4).map((w) => (
            <span
              key={w.metric}
              className="glass-m360-decision__window-pip"
              data-window-status={w.status}
              title={`${w.metric}: ${w.daysRemaining ?? "—"}d`}
            >
              {w.daysRemaining ?? "—"}d
            </span>
          ))}
        </div>
      )}
    </div>
  );
}