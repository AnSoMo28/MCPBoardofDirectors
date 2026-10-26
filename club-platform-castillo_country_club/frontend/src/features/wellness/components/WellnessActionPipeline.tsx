/* ═══════════════════════════════════════════════════════════════
   Wellness Action Pipeline — "The Queue" (P8)
   Persistent chip queue with urgency countdown.
   ═══════════════════════════════════════════════════════════════ */

import { Zap, Check, Shield } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WellnessAdvisorInsight, WellnessMode } from "../types";
import type { AdvisorReactionInsight } from "@/features/dashboard/types";
import "./WellnessActionPipeline.css";

interface Props {
  insights: WellnessAdvisorInsight[];
  reactions: AdvisorReactionInsight[];
  actionStates: Record<string, string>;
  mode: WellnessMode;
  onExecute: (insightId: string) => void;
  className?: string;
}

const URGENCY_FILL: Record<string, number> = {
  auto: 1,
  semi: 0.6,
  hitl: 0.35,
};

export function WellnessActionPipeline({
  insights,
  reactions,
  actionStates,
  mode,
  onExecute,
  className,
}: Props) {
  const actionable = insights.filter(
    (i) => i.action && actionStates[i.id] !== "done",
  );

  if (actionable.length === 0) return null;

  return (
    <div className={cn("glass-wap", className)} data-mode={mode}>
      <div className="wap__header">
        <Zap size={13} />
        <span className="wap__title">Acciones pendientes</span>
        <span className="wap__count">{actionable.length}</span>
      </div>
      <div className="wap__chips">
        {actionable.map((insight, i) => {
          const action = insight.action!;
          const fill = URGENCY_FILL[action.approvalLevel] ?? 0.5;

          return (
            <button
              key={insight.id}
              className="wap__chip"
              data-stagger-i={i}
              onClick={() => onExecute(insight.id)}
              type="button"
              style={
                {
                  "--chip-fill": fill,
                } as React.CSSProperties
              }
            >
              <span className="wap__chip-fill" />
              <span className="wap__chip-content">
                {action.approvalLevel === "auto" ? (
                  <Zap size={11} />
                ) : (
                  <Shield size={11} />
                )}
                <span className="wap__chip-label">{action.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Reactions */}
      {reactions.length > 0 && (
        <div className="wap__reactions">
          {reactions.slice(0, 3).map((r) => (
            <div key={r.id} className="wap__reaction">
              <Check size={11} />
              <span>{r.reaction}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}