// ═══════════════════════════════════════════════════════════════════════
// Member360 — Intelligence Stream
// Phase 30 — Block 2.4: The River
// ═══════════════════════════════════════════════════════════════════════
//
// Priority-sorted vertical timeline. Replaces tabs.
// Each child is a StreamSection (defined in the dashboard).
// The stream manages visual flow, stagger, and section ordering.
//
// Sections can expand/collapse. Order is driven by tabOrder
// from the neural hub — which adapts by dashboard mode.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import type { DashboardMode, MemberState } from "../types";
import type { FocusPanelId } from "../hooks/useMember360Dashboard";

interface MemberIntelligenceStreamProps {
  mode: DashboardMode;
  tabOrder: FocusPanelId[];
  activeFocus: FocusPanelId;
  onFocusChange: (panel: FocusPanelId) => void;
  children: ReactNode;
}

/**
 * Container for the intelligence stream.
 * Children are StreamSection components rendered in tabOrder.
 * Visual flow adapts to dashboard mode.
 */
export function MemberIntelligenceStream({
  mode,
  tabOrder,
  activeFocus,
  onFocusChange,
  children,
}: MemberIntelligenceStreamProps) {
  return (
    <div
      className="glass-m360-stream"
      data-mode={mode}
      role="region"
      aria-label="Intelligence Stream"
    >
      {/* Stream header */}
      <div className="glass-m360-stream__header">
        <span className="glass-m360-stream__header-icon">◈</span>
        <h2 className="glass-m360-stream__header-title">
          Intelligence Stream
        </h2>
        <span className="glass-m360-stream__header-count">
          {tabOrder.length} secciones
        </span>
      </div>

      {/* Stream timeline line */}
      <div className="glass-m360-stream__timeline">
        <div className="glass-m360-stream__timeline-line" />
      </div>

      {/* Stream content — children render in DOM order from dashboard */}
      <div className="glass-m360-stream__content">
        {children}
      </div>
    </div>
  );
}