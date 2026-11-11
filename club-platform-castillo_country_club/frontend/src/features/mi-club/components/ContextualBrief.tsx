import { cn } from "@/shared/lib/utils";
import type { BriefSegment } from "../types";
import './ContextualBrief.css';

type AvatarRingLevel = "healthy" | "good" | "warning" | "critical";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ContextualBriefProps {
  segments: BriefSegment[];
  avatarInitials: string;
  engagementScore: number | null;
}

/* ═══════════════════════════════════════
   Avatar Status Ring
   ═══════════════════════════════════════ */

function AvatarRing({ score }: { score: number | null }) {
  const level: AvatarRingLevel =
    score === null
      ? "warning"
      : score >= 60
        ? "healthy"
        : score >= 40
          ? "good"
          : "warning";

  const colors: Record<AvatarRingLevel, string> = {
    healthy: "var(--color-emerald-400)",
    good: "var(--color-teal-400)",
    warning: "var(--color-amber-400)",
    critical: "var(--color-rose-400)",
  };

  const color = colors[level];
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 50));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="contextual-brief glass-landing__brief-avatar-ring">
      <svg viewBox="0 0 66 66">
        <circle
          cx="33"
          cy="33"
          r={r}
          className="glass-landing__brief-avatar-ring-bg"
        />
        <circle
          cx="33"
          cy="33"
          r={r}
          className="glass-landing__brief-avatar-ring-fill"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            stroke: color,
          }}
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ContextualBrief({
  segments,
  avatarInitials,
  engagementScore,
}: ContextualBriefProps) {
  return (
    <div className="glass-landing__brief" role="banner">
      <div className="glass-landing__brief-header">
        <div className="glass-landing__brief-avatar">
          <div className="glass-landing__brief-avatar-circle">
            {avatarInitials}
          </div>
          <AvatarRing score={engagementScore} />
        </div>
        <div className="glass-landing__brief-info">
          <p className="glass-landing__brief-narrative">
            {segments.map((seg, i) => {
              const Icon = seg.icon;
              return (
                <span
                  key={i}
                  className={cn(
                    "glass-landing__brief-segment",
                    seg.emphasis === "highlight" &&
                      "glass-landing__brief-segment--highlight",
                    seg.emphasis === "urgent" &&
                      "glass-landing__brief-segment--urgent",
                  )}
                >
                  {Icon && (
                    <span className="glass-landing__brief-segment-icon">
                      <Icon size={14} />
                    </span>
                  )}
                  {seg.text}{" "}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </div>
  );
}