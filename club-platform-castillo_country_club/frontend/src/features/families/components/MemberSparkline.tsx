// src/features/families/components/MemberSparkline.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Member Sparkline
// Level 6+ Agency · Production Grade
//
// Reusable mini sparkline for member engagement.
// SVG path with gradient fill. 7 data points.
// Uses real history if available, falls back to synthetic.
//
// PRE-WRITE VERIFICATION:
//   No external dependencies ✅
//   Self-contained (generates own SVG) ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() call → removed (no className merge)
//   - glass-member-sparkline namespace → fm-sparkline
//   - Mutable props → readonly
//   - Inline stroke/fill colors → CSS custom property bridge
//   - className prop → removed (atomic reusable)
//   - No data-testid → added
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";

import "./MemberSparkline.css";

// ═══════════════════════════════════════════════════════════
// §1  Synthetic Data Generator
// ═══════════════════════════════════════════════════════════

/**
 * Generate 7 deterministic sparkline points from a score and seed ID.
 * Consistent across renders — same member always produces same shape.
 */
function generateSyntheticPoints(score: number, seed: string): readonly number[] {
  const normalized = score / 100;
  const hash = seed
    .split("")
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const wave = Math.sin((hash + i * 31) * 0.15) * 0.12;
    const drift = (i - 3) * 0.02;
    return Math.max(0.08, Math.min(1, normalized + wave + drift));
  });
}

// ═══════════════════════════════════════════════════════════
// §2  SVG Path Builder
// ═══════════════════════════════════════════════════════════

function buildSparklinePath(
  points: readonly number[],
  width: number,
  height: number,
): { readonly line: string; readonly area: string } {
  const stepX = width / (points.length - 1);
  const padding = 1;
  const usableHeight = height - padding * 2;

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: padding + usableHeight * (1 - p),
  }));

  // Smooth curve using cardinal spline
  const line = coords
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = coords[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area fill — close path along bottom
  const area = `${line} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return { line, area };
}

// ═══════════════════════════════════════════════════════════
// §3  Types
// ═══════════════════════════════════════════════════════════

interface MemberSparklineProps {
  /** Engagement score 0-100 */
  readonly score: number;
  /** Member ID for synthetic seed */
  readonly memberId: string;
  /** Optional real 7-day history. Falls back to synthetic. */
  readonly history?: readonly number[];
  /** Sparkline width */
  readonly width?: number;
  /** Sparkline height */
  readonly height?: number;
  /** Line color override (CSS value) */
  readonly color?: string;
  /** Show area fill under line */
  readonly showArea?: boolean;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * MemberSparkline — mini engagement trend visualization.
 *
 * Renders a 7-point smooth SVG sparkline with gradient fill.
 * Uses real history when available, synthetic when not.
 * Same member + score always produces the same shape.
 *
 * @example
 * <MemberSparkline score={73} memberId="m-001" />
 * <MemberSparkline score={45} memberId="m-002" history={[60,58,52,48,45,43,45]} />
 */
export function MemberSparkline({
  score,
  memberId,
  history,
  width = 64,
  height = 24,
  color,
  showArea = true,
}: MemberSparklineProps) {
  // ── Points (B-07) ──
  const points = useMemo(() => {
    if (history && history.length >= 7) {
      const max = Math.max(...history, 1);
      return history.slice(-7).map((v) => Math.max(0.08, v / max));
    }
    return generateSyntheticPoints(score, memberId);
  }, [history, score, memberId]);

  // ── SVG paths (B-07) ──
  const { line, area } = useMemo(
    () => buildSparklinePath(points, width, height),
    [points, width, height],
  );

  // ── Color from score (or override) ──
  const lineColor =
    color ??
    (score >= 70
      ? "var(--color-emerald-400)"
      : score >= 40
        ? "var(--color-amber-400)"
        : "var(--color-rose-400)");

  const gradientId = `spk-${memberId}`;
  const lastY = 1 + (height - 2) * (1 - points[points.length - 1]);

  return (
    <div
      className="fm-sparkline"
      data-testid={`sparkline-${memberId}`}
      role="img"
      aria-label={`Engagement trend: ${score}/100`}
      style={{ "--spk-color": lineColor } as CSSProperties}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="fm-sparkline__svg"
        aria-hidden="true"
      >
        {showArea && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        )}

        {showArea && (
          <path d={area} fill={`url(#${gradientId})`} className="fm-sparkline__area" />
        )}

        <path d={line} className="fm-sparkline__line" />
        <circle cx={width} cy={lastY} r="2" className="fm-sparkline__dot" />
      </svg>
    </div>
  );
}