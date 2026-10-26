// src/features/dashboard/components/TopActivities.tsx
// ═══════════════════════════════════════════════════════════
// Top Activities — Castillo Country Club
//
// Premium enhancements:
// + Podium glow + badge bounce (top 3)
// + Bar shimmer sweep (periodic gradient)
// + Change badge pill (semantic color)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { formatNumber, cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import type { ActivityData } from "../types";

interface TopActivitiesProps {
  data: ActivityData[];
}

const PODIUM_COLORS = [CHART_PALETTE.gold, CHART_PALETTE.teal, CHART_PALETTE.emerald];
const DEFAULT_BAR = CHART_PALETTE.terracotta;

const PODIUM_EMOJIS = ["🥇", "🥈", "🥉"];

/* ── Bar shimmer keyframe (injected once) ── */

const SHIMMER_CSS = `
@keyframes bar-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

if (typeof document !== "undefined" && !document.getElementById("ccc-bar-shimmer")) {
  const el = document.createElement("style");
  el.id = "ccc-bar-shimmer";
  el.textContent = SHIMMER_CSS;
  document.head.appendChild(el);
}

/* ── Component ── */

export function TopActivities({ data }: TopActivitiesProps) {
  const prefersReduced = useReducedMotion();
  const maxParticipants = useMemo(() => Math.max(...data.map((d) => d.participants), 1), [data]);

  const m = (delay = 0) =>
    prefersReduced
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } };

  const itemM = (index: number) =>
    prefersReduced
      ? {}
      : { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.35, delay: 0.1 * index } };

  const barM = (index: number, pct: number) =>
    prefersReduced
      ? { style: { width: `${pct}%` } }
      : { initial: { width: 0 }, animate: { width: `${pct}%` }, transition: { duration: 0.7, delay: 0.15 * index, ease: "easeOut" as const } };

  return (
    <motion.div {...m(0.35)} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} strokeWidth={1.5} style={{ color: CHART_PALETTE.gold }} />
        <h3 className="text-lg font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
          Actividades populares
        </h3>
      </div>

      <div className="space-y-4" role="list" aria-label="Actividades más populares">
        {data.map((activity, index) => {
          const pct = (activity.participants / maxParticipants) * 100;
          const isTop3 = index < 3;
          const barColor = isTop3 ? PODIUM_COLORS[index] : DEFAULT_BAR;
          const changePositive = activity.change > 0;
          const changeNegative = activity.change < 0;

          return (
            <motion.div key={activity.name} {...itemM(index)} role="listitem">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  {/* ── Rank badge: podium glow + bounce ── */}
                  {isTop3 ? (
                    <motion.span
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        "font-[family-name:var(--font-mono)] text-[var(--color-abyss)]",
                      )}
                      style={{
                        backgroundColor: barColor,
                        boxShadow: `0 0 12px color-mix(in srgb, ${barColor} 40%, transparent), 0 0 4px color-mix(in srgb, ${barColor} 25%, transparent)`,
                      }}
                      initial={prefersReduced ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={
                        prefersReduced
                          ? undefined
                          : { type: "spring", bounce: 0.5, duration: 0.6, delay: 0.2 + index * 0.1 }
                      }
                    >
                      {PODIUM_EMOJIS[index]}
                    </motion.span>
                  ) : (
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        "font-[family-name:var(--font-mono)] text-[var(--color-silver-400)] bg-[var(--color-surface-3)]",
                      )}
                    >
                      {index + 1}
                    </span>
                  )}

                  {activity.icon && (
                    <span className="text-base" role="img" aria-hidden="true">{activity.icon}</span>
                  )}
                  <span className={cn(
                    "text-sm font-medium font-[family-name:var(--font-ui)]",
                    isTop3 ? "text-[var(--color-silver-100)]" : "text-[var(--color-silver-400)]",
                  )}>
                    {activity.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-[var(--color-silver-100)]">
                    {formatNumber(activity.participants)}
                  </span>

                  {/* ── Change badge pill ── */}
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)]",
                      changePositive && "bg-[rgba(61,170,112,0.10)] text-[var(--color-emerald-400)]",
                      changeNegative && "bg-[rgba(196,100,112,0.10)] text-[var(--color-rose-400)]",
                      !changePositive && !changeNegative && "bg-[rgba(138,149,165,0.08)] text-[var(--color-silver-500)]",
                    )}
                  >
                    {changePositive ? "+" : ""}{activity.change.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* ── Progress bar with shimmer ── */}
              <div className="h-3 rounded-full overflow-hidden bg-[var(--color-surface-3)]">
                <motion.div
                  {...barM(index, pct)}
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    backgroundColor: barColor,
                    ...(prefersReduced ? { width: `${pct}%` } : {}),
                    ...(isTop3
                      ? { boxShadow: `0 0 8px color-mix(in srgb, ${barColor} 30%, transparent)` }
                      : {}),
                  }}
                >
                  {/* Shimmer sweep — only on top 3, not on reduced motion */}
                  {isTop3 && !prefersReduced && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
                        backgroundSize: "200% 100%",
                        animation: "bar-shimmer 3s ease-in-out infinite",
                        animationDelay: `${index * 0.4}s`,
                        borderRadius: "inherit",
                      }}
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}