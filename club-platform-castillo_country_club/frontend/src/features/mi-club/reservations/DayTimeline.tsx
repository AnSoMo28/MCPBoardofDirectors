/**
 * @component DayTimeline (Fase 25)
 * @namespace .glass-reservations__timeline
 * @depends MyReservations.css
 * @note Proportional horizontal timeline showing today's reservations
 *       as positioned blocks. "Now" indicator as vertical line.
 * @import import './MyReservations.css';
 */

import type { DayTimelineData } from "./types";

interface DayTimelineProps {
  data: DayTimelineData;
}

export function DayTimeline({ data }: DayTimelineProps) {
  return (
    <div className="glass-reservations__timeline">
      <div className="glass-reservations__timeline-track">
        {/* Reservation blocks */}
        {data.blocks.map((block) => (
          <div
            key={block.id}
            className={`glass-reservations__timeline-block${block.isInProgress ? " glass-reservations__timeline-block--active" : ""}`}
            style={{
              left: `${block.startPct}%`,
              width: `${block.widthPct}%`,
              backgroundColor: block.color,
            }}
            title={`${block.facilityName} ${block.isInProgress ? "(en curso)" : ""}`}
          >
            {block.widthPct > 8 && (
              <span className="glass-reservations__timeline-block-label">
                {block.facilityName}
              </span>
            )}
          </div>
        ))}

        {/* Now indicator */}
        {data.nowPct >= 0 && data.nowPct <= 100 && (
          <div
            className="glass-reservations__timeline-now"
            style={{ left: `${data.nowPct}%` }}
          />
        )}
      </div>

      {/* Hour labels */}
      <div className="glass-reservations__timeline-labels">
        {data.hourLabels.map((label) => (
          <span
            key={label.label}
            className="glass-reservations__timeline-label"
          >
            {label.label}
          </span>
        ))}
      </div>
    </div>
  );
}