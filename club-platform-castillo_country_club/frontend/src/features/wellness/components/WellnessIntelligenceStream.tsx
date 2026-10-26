/* ═══════════════════════════════════════════════════════════════
   Wellness Intelligence Stream — "The Pulse" (P2)
   Priority-sorted insight blocks with heartbeat.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WellnessAdvisorInsight, WellnessMode } from "../types";
import type { AdvisorReactionInsight } from "@/features/dashboard/types";
import "./WellnessIntelligenceStream.css";

interface Props {
  insights: WellnessAdvisorInsight[];
  reactions: AdvisorReactionInsight[];
  actionStates: Record<string, string>;
  mode: WellnessMode;
  onNavigate: (tab: string) => void;
  onExecute: (insightId: string) => void;
  className?: string;
}

const IMPACT_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  high: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    label: "Alta",
  },
  medium: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 6%, transparent)",
    label: "Media",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.03)",
    label: "Baja",
  },
};

function InsightBlock({
  insight,
  index,
  actionState,
  onNavigate,
  onExecute,
}: {
  insight: WellnessAdvisorInsight;
  index: number;
  actionState?: string;
  onNavigate: (tab: string) => void;
  onExecute: (insightId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = IMPACT_CONFIG[insight.impact] ?? IMPACT_CONFIG.low;
  const isDone = actionState === "done";

  return (
    <div
      className="wis__block"
      data-impact={insight.impact}
      data-stagger-i={index}
    >
      {/* ── Left pulse bar ── */}
      <div
        className="wis__pulse-bar"
        style={{ backgroundColor: cfg.color }}
      />

      {/* ── Content ── */}
      <div className="wis__content">
        <div className="wis__header">
          <span
            className="wis__impact-badge"
            style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
          >
            {cfg.label}
          </span>
          <span className="wis__layer">{insight.layer}</span>
          <span className="wis__confidence">{insight.confidence}%</span>
        </div>

        <h4 className="wis__title">{insight.title}</h4>

        <button
          className="wis__expand"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? "Menos" : "Detalle"}
        </button>

        {expanded && (
          <p className="wis__reasoning">{insight.reasoning}</p>
        )}

        {/* ── Actions ── */}
        <div className="wis__actions">
          {insight.targetTab && (
            <button
              className="wis__nav-btn"
              onClick={() => onNavigate(insight.targetTab!)}
              type="button"
            >
              Ver en {insight.targetTab}
            </button>
          )}
          {insight.action && !isDone && (
            <button
              className="wis__exec-btn"
              onClick={() => onExecute(insight.id)}
              type="button"
            >
              {insight.action.approvalLevel === "auto" ? (
                <Zap size={11} />
              ) : (
                <Shield size={11} />
              )}
              {insight.action.label}
            </button>
          )}
          {isDone && (
            <span className="wis__done">✓ Ejecutado</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WellnessIntelligenceStream({
  insights,
  actionStates,
  mode,
  onNavigate,
  onExecute,
  className,
}: Props) {
  if (insights.length === 0) return null;

  // In critical mode, show only high impact
  const filtered =
    mode === "critical"
      ? insights.filter((i) => i.impact === "high")
      : insights;

  return (
    <div className={cn("glass-wis", className)} data-mode={mode}>
      <div className="wis__heartbeat" />
      <div className="wis__header-row">
        <span className="wis__stream-title">Intelligence</span>
        <span className="wis__stream-count">{filtered.length}</span>
      </div>
      <div className="wis__stream">
        {filtered.map((insight, i) => (
          <InsightBlock
            key={insight.id}
            insight={insight}
            index={i}
            actionState={actionStates[insight.id]}
            onNavigate={onNavigate}
            onExecute={onExecute}
          />
        ))}
      </div>
    </div>
  );
}