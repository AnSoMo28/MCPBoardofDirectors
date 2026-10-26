// src/features/dashboard/components/MembershipDonut.tsx
// ═══════════════════════════════════════════════════════════
// Membership Donut — Castillo Country Club
//
// Premium enhancements:
// + glass-card wrapper + tilt parallax
// + Center counter animation (Apple Fitness style)
// + Donut sweep-in animation
// + Legend stagger reveal
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent, cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { motion, useInView } from "framer-motion";
import { Card } from "@/shared/components/ui/Card";
import { CHART, TOOLTIP_STYLE } from "@/shared/lib/chartTheme";
import type { TierData } from "../types";
import { TIER_CONFIG } from "../types";

/* ══════════════════════════════════════════════════════════
   Animated Counter
   ══════════════════════════════════════════════════════════ */

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const started = useRef(false);

  useEffect(() => {
    if (reduced || !isInView) {
      if (isInView) setValue(target);
      return;
    }
    if (started.current) return;
    started.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration, reduced, isInView]);

  return { value, ref };
}

/* ══════════════════════════════════════════════════════════
   Types & Tooltip
   ══════════════════════════════════════════════════════════ */

interface MembershipDonutProps {
  data: TierData[];
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TierData & { total: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { tier, count, color, total } = payload[0].payload;
  return (
    <div
      style={{
        ...TOOLTIP_STYLE,
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
        <span style={{ fontWeight: 600, color: CHART.tooltipText }}>
          {TIER_CONFIG[tier]?.label || tier}
        </span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: CHART.axisLabel }}>
        {formatNumber(count)} familias ({formatPercent((count / total) * 100, 0)})
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export function MembershipDonut({ data }: MembershipDonutProps) {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
  const chartData = useMemo(() => data.map((d) => ({ ...d, total })), [data, total]);

  const { value: animatedTotal, ref: counterRef } = useAnimatedCounter(total);

  const m = reduced
    ? undefined
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.3 },
      };

  const legendItem = reduced
    ? undefined
    : ({
        hidden: { opacity: 0, x: -8 },
        visible: (i: number) => ({
          opacity: 1,
          x: 0,
          transition: { duration: 0.3, delay: 0.6 + i * 0.06, ease: "easeOut" as const },
        }),
      } as const);

  return (
    <motion.div {...(m ?? {})}>
      <Card tilt className="p-6">
        <h3 className="text-lg font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)] mb-6">
          Membresías por nivel
        </h3>

        <div className="flex flex-col items-center">
          <div className={cn("relative", isMobile ? "w-40 h-40" : "w-56 h-56")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 45 : 65}
                  outerRadius={isMobile ? 70 : 95}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="tier"
                  strokeWidth={0}
                  isAnimationActive={!reduced}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  animationBegin={200}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label — animated counter */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                ref={counterRef}
                className="text-3xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]"
              >
                {formatNumber(reduced ? total : animatedTotal)}
              </span>
              <span className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                familias
              </span>
            </div>
          </div>

          {/* Legend — staggered reveal */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6 w-full">
            {data.map((tier, i) => {
              const content = (
                <div key={tier.tier} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span className="text-sm text-[var(--color-silver-100)] font-[family-name:var(--font-ui)] truncate">
                    {TIER_CONFIG[tier.tier]?.label || tier.tier}
                  </span>
                  <span className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] ml-auto">
                    {formatNumber(tier.count)}
                  </span>
                </div>
              );

              if (reduced || !legendItem) return content;

              return (
                <motion.div
                  key={tier.tier}
                  custom={i}
                  variants={legendItem}
                  initial="hidden"
                  animate="visible"
                >
                  {content}
                </motion.div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}