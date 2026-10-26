// src/features/engagement/components/EngagementAmbientCanvas.tsx
// ═══════════════════════════════════════════════════════════
// Ambient Canvas — CSS-only breathing background
// Castillo Country Club — Phase 31 "The Voice"
//
// Pure CSS animation. No JS. No canvas. No performance cost.
// Synchronized with deriveAmbientState() from config.
//
// Glass namespace: glass-eng-ambient
// Data attributes: data-state (calm | alert | critical)
// Rules: R34, R35, #8 (CSS stagger), #18 (reduced motion)
// ═══════════════════════════════════════════════════════════

import type { EngagementAmbientState } from "../types";
import "./EngagementAmbientCanvas.css";

interface EngagementAmbientCanvasProps {
  ambientState: EngagementAmbientState;
}

/**
 * CSS-only breathing background that reflects system emotional state.
 * Before the user reads a single number, they FEEL the state.
 *
 * calm:    slow teal pulse, barely visible, like calm water
 * alert:   amber pulse quickening, waves becoming visible
 * critical: rose pulse urgent, waves crashing, demands attention
 */
export function EngagementAmbientCanvas({
  ambientState,
}: EngagementAmbientCanvasProps) {
  return (
    <div
      data-glass-eng-ambient=""
      data-state={ambientState.mode}
      className="eng-ambient"
      style={
        {
          "--pulse-speed": `${ambientState.pulseSpeed}s`,
          "--pulse-intensity": ambientState.intensity,
          "--pulse-color": ambientState.color,
        } as React.CSSProperties
      }
    >
      <div className="eng-ambient__layer eng-ambient__layer--primary" />
      <div className="eng-ambient__layer eng-ambient__layer--secondary" />
      <div className="eng-ambient__layer eng-ambient__layer--tertiary" />
    </div>
  );
}