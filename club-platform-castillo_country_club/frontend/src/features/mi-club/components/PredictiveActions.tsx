/**
 * @component PredictiveActions (Fase 25)
 * @namespace .glass-landing__predictive
 * @depends MiClubLanding.css
 * @note Context-aware action cards that change based on urgency,
 *       time, engagement, and AI recommendations.
 * @import import '../MiClubLanding.css';
 */

import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import type { PredictiveAction } from "../types";

interface PredictiveActionsProps {
  actions: PredictiveAction[];
}

export function PredictiveActions({
  actions,
}: PredictiveActionsProps) {
  const navigate = useNavigate();

  if (actions.length === 0) return null;

  return (
    <div className="glass-landing__predictive">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            className="glass-landing__predictive-card"
            onClick={() => navigate(action.route)}
            aria-label={`${action.label}: ${action.description}`}
          >
            <div className="glass-landing__predictive-card-header">
              <div
                className="glass-landing__predictive-card-icon"
                style={{
                  backgroundColor: `color-mix(in srgb, ${action.color} 12%, transparent)`,
                  color: action.color,
                }}
              >
                <Icon size={16} />
              </div>
              <ArrowRight
                size={14}
                className="glass-landing__predictive-card-arrow"
              />
            </div>
            <p className="glass-landing__predictive-card-label">
              {action.label}
            </p>
            <p className="glass-landing__predictive-card-desc">
              {action.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}