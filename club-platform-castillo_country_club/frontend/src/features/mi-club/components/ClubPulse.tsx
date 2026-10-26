/**
 * @component ClubPulse (Fase 25)
 * @namespace .glass-landing__pulse
 * @depends MiClubLanding.css
 * @note Ambient club status bar. Non-interactive, purely informational.
 *       Shows next event, family engagement. Barely visible — ambient.
 * @import import '../MiClubLanding.css';
 */

import { CalendarDays, TrendingUp } from "lucide-react";
import type { ClubPulseData } from "../types";

interface ClubPulseProps {
  data: ClubPulseData;
}

export function ClubPulse({ data }: ClubPulseProps) {
  return (
    <div
      className="glass-landing__pulse"
      role="status"
      aria-label="Estado del club"
    >
      {data.nextEvent && (
        <span className="glass-landing__pulse-item">
          <CalendarDays size={12} />
          <span className="glass-landing__pulse-item-value">
            {data.nextEvent.title}
          </span>
          <span>{data.nextEvent.time}</span>
        </span>
      )}

      <span className="glass-landing__pulse-divider" />

      <span className="glass-landing__pulse-item">
        <TrendingUp size={12} />
        <span>Tu familia:</span>
        <span className="glass-landing__pulse-item-value">
          {data.familyPointsThisMonth}pts este mes
        </span>
        {data.familyPointsDelta !== null && (
          <span
            style={{
              color:
                data.familyPointsDelta >= 0
                  ? "var(--color-emerald-400)"
                  : "var(--color-rose-400)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
            }}
          >
            {data.familyPointsDelta >= 0 ? "+" : ""}
            {data.familyPointsDelta}%
          </span>
        )}
      </span>
    </div>
  );
}