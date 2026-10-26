// src/features/dashboard/components/AgeBalanceWidget.tsx
// ═══════════════════════════════════════════════════════════
// Age Balance Widget — Castillo Country Club
//
// Premium enhancements:
// + Glass wrapper (glass-card)
// + Gini SVG gauge (animated arc with glow)
// + Member bar shimmer sweep
// + Hover glow on group rows
// + Gap indicator bounce-in
// + AI Recommendation → teal accent card (reuse)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { formatNumber, formatPercent } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { motion } from "framer-motion";
import { Scale, Sparkles } from "lucide-react";
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import { Card } from "@/shared/components/ui/Card";
import type { AgeGroupData } from "../types";
import './AgeBalanceWidget.css';
/* ══════════════════════════════════════════════════════════
   Types & Helpers
   ══════════════════════════════════════════════════════════ */

interface AgeBalanceWidgetProps {
  data: AgeGroupData[];
  giniCoefficient: number;
  aiRecommendation?: string;
}

function calculateBalanceLevel(gini: number) {
  if (gini <= 0.15)
    return { label: "Excelente", color: CHART_PALETTE.emerald, description: "Distribución equilibrada entre todos los grupos etarios." };
  if (gini <= 0.3)
    return { label: "Buena", color: CHART_PALETTE.gold, description: "Ligero desbalance que puede mejorarse con actividades dirigidas." };
  if (gini <= 0.45)
    return { label: "Moderada", color: CHART_PALETTE.amber, description: "Desbalance notable. Considerar programas específicos." };
  return { label: "Crítica", color: CHART_PALETTE.rose, description: "Desbalance severo. Se requieren acciones inmediatas." };
}

/* ══════════════════════════════════════════════════════════
   GiniGauge — Animated SVG arc
   ══════════════════════════════════════════════════════════ */

function GiniGauge({
  gini,
  color,
  label,
  reduced,
}: {
  gini: number;
  color: string;
  label: string;
  reduced: boolean;
}) {
  const size = 40;
  const r = 15;
  const circumference = 2 * Math.PI * r;
  // Gini is 0–1, lower is better. Invert for visual (full arc = good)
  const invertedScore = (1 - gini) * 100;
  const filled = (invertedScore / 100) * circumference;

  return (
    <div
      className="relative flex-shrink-0 glass-age-gauge"
      style={{ "--gini-color": color } as React.CSSProperties}
      title={`Gini: ${gini.toFixed(2)} — ${label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduced ? { strokeDashoffset: circumference - filled } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={reduced ? { duration: 0 } : { duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)]" style={{ color }}>
          {gini.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export function AgeBalanceWidget({ data, giniCoefficient, aiRecommendation }: AgeBalanceWidgetProps) {
  const prefersReduced = useReducedMotion();
  const balance = useMemo(() => calculateBalanceLevel(giniCoefficient), [giniCoefficient]);

  const m = (delay = 0) =>
    prefersReduced
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } };

  const itemM = (index: number) =>
    prefersReduced
      ? {}
      : { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3, delay: 0.08 * index } };

  const barM = (index: number, extra: number, pct: number) =>
    prefersReduced
      ? { style: { width: `${pct}%` } }
      : { initial: { width: 0 }, animate: { width: `${pct}%` }, transition: { duration: 0.6, delay: 0.1 * index + extra, ease: "easeOut" as const } };

  return (
    <motion.div {...m(0.5)}>
      <Card tilt className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Scale size={20} strokeWidth={1.5} style={{ color: "var(--color-teal-400)" }} />
            <h3 className="text-lg font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
              Balance etario
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Gini gauge */}
            <GiniGauge
              gini={giniCoefficient}
              color={balance.color}
              label={balance.label}
              reduced={prefersReduced}
            />
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${balance.color} 12%, transparent)` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: balance.color }} />
              <span className="text-xs font-bold font-[family-name:var(--font-mono)]" style={{ color: balance.color }}>
                {balance.label}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mb-4 text-xs font-[family-name:var(--font-ui)]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: CHART_PALETTE.teal }} />
            <span className="text-[var(--color-silver-400)]">Miembros</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: CHART_PALETTE.gold, opacity: 0.7 }} />
            <span className="text-[var(--color-silver-400)]">Participación actividades</span>
          </div>
        </div>

        {/* Distribution bars */}
        <div className="space-y-1 mb-6">
          {data.map((group, index) => {
            const gap = Math.abs(group.memberPct - group.activityPct);
            const activityHigher = group.activityPct > group.memberPct;

            return (
              <motion.div key={group.ageGroup} {...itemM(index)} className="glass-age-group-row">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                    <span className="text-sm font-medium text-[var(--color-silver-100)] font-[family-name:var(--font-ui)]">
                      {group.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-[family-name:var(--font-mono)]">
                    <span className="text-[var(--color-silver-100)]">{formatNumber(group.memberCount)}</span>
                    <span className="text-[var(--color-silver-500)]">{formatPercent(group.memberPct, 0)}</span>
                  </div>
                </div>

                {/* Dual bars with shimmer on member bar */}
                <div className="space-y-1">
                  <div className="h-2.5 rounded-full overflow-hidden bg-[var(--color-surface-3)]">
                    <motion.div
                      {...barM(index, 0, group.memberPct)}
                      className="h-full rounded-full relative overflow-hidden"
                      style={{ backgroundColor: CHART_PALETTE.teal, ...(prefersReduced ? { width: `${group.memberPct}%` } : {}) }}
                    >
                      {/* Shimmer sweep on member bar */}
                      {!prefersReduced && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                            backgroundSize: "200% 100%",
                            animation: "bar-shimmer 3.5s ease-in-out infinite",
                            animationDelay: `${index * 0.3}s`,
                            borderRadius: "inherit",
                          }}
                        />
                      )}
                    </motion.div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[var(--color-surface-3)]">
                    <motion.div
                      {...barM(index, 0.05, group.activityPct)}
                      className="h-full rounded-full opacity-70"
                      style={{ backgroundColor: CHART_PALETTE.gold, ...(prefersReduced ? { width: `${group.activityPct}%` } : {}) }}
                    />
                  </div>
                </div>

                {/* Gap indicator — bounce-in */}
                {gap > 5 && (
                  <motion.p
                    initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 0.35, delay: 0.2 + index * 0.06, ease: "easeOut" }}
                    className="text-[10px] font-[family-name:var(--font-mono)] mt-1"
                    style={{ color: activityHigher ? CHART_PALETTE.emerald : CHART_PALETTE.gold }}
                  >
                    {activityHigher
                      ? `↑ Actividades +${gap.toFixed(0)}pp por encima`
                      : `↓ Actividades −${gap.toFixed(0)}pp por debajo`}
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* AI Recommendation — teal accent card (reuse pattern) */}
        {(aiRecommendation || balance.description) && (
          <div className="glass-anomaly-feed-reco">
            <Sparkles size={14} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-gold-400)" }} />
            <div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider block mb-1"
                style={{ color: "var(--color-teal-400)" }}
              >
                Recomendación
              </span>
              <span className="text-sm text-[var(--color-silver-100)] font-[family-name:var(--font-ui)] leading-relaxed">
                {aiRecommendation || balance.description}
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}