/* ═══════════════════════════════════════════════════════════════
   Wellness Segment Cards — "The Economics" (P10)
   Spotlight on current segment.
   ═══════════════════════════════════════════════════════════════ */

import { cn } from "@/shared/lib/utils";
import type { SegmentInsight, WellnessMode } from "../types";
import "./WellnessSegmentCards.css";

interface Props {
  segments: SegmentInsight[];
  currentScore: number;
  mode: WellnessMode;
  className?: string;
}

export function WellnessSegmentCards({
  segments,
  currentScore,
  mode,
  className,
}: Props) {
  if (segments.length === 0) return null;

  return (
    <div className={cn("glass-ws", className)} data-mode={mode}>
      <span className="ws__title">Segmentos de bienestar</span>
      <div className="ws__grid">
        {segments.map((seg) => {
          const isCurrent =
            currentScore >= seg.wellness_score_range[0] &&
            currentScore < seg.wellness_score_range[1];

          return (
            <div
              key={seg.segment}
              className={cn("ws__card", isCurrent && "ws__card--spotlight")}
            >
              <div className="ws__card-header">
                <span className="ws__card-seg">{seg.segment}</span>
                {isCurrent && <span className="ws__card-badge">Tú</span>}
              </div>
              <div className="ws__card-metrics">
                <div className="ws__card-metric">
                  <span className="ws__card-metric-label">Spend</span>
                  <span className="ws__card-metric-value ws__card-metric-value--mono">
                    ₡{(seg.avg_monthly_spend_crc / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="ws__card-metric">
                  <span className="ws__card-metric-label">Retención</span>
                  <span className="ws__card-metric-value">
                    {seg.retention_rate.toFixed(0)}%
                  </span>
                </div>
                <div className="ws__card-metric">
                  <span className="ws__card-metric-label">NPS</span>
                  <span className="ws__card-metric-value">{seg.nps}</span>
                </div>
                <div className="ws__card-metric">
                  <span className="ws__card-metric-label">Miembros</span>
                  <span className="ws__card-metric-value">
                    {seg.member_count}
                  </span>
                </div>
              </div>
              <span className="ws__card-range">
                Score: {seg.wellness_score_range[0]}–{seg.wellness_score_range[1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}