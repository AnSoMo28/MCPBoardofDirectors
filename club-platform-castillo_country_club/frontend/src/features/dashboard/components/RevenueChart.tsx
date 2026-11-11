// src/features/dashboard/components/RevenueChart.tsx
// ═══════════════════════════════════════════════════════════
// Revenue Sources Chart — Castillo Country Club
//
// Premium enhancements:
// + Bar fill animation (staggered draw-in)
// + Total counter animation (Apple Fitness style)
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency, cn } from "@/shared/lib/utils";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { motion, useInView } from "framer-motion";
import { Card } from "@/shared/components/ui/Card";
import {
  CHART, CHART_PALETTE, TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type { RevenueSourceData } from "../types";
import './RevenueChart.css';

/* ══════════════════════════════════════════════════════════
   Config
   ══════════════════════════════════════════════════════════ */

interface RevenueChartProps {
  data: RevenueSourceData[];
}

const BAR_COLORS = [
  CHART_PALETTE.gold,
  CHART_PALETTE.terracotta,
  CHART_PALETTE.teal,
  CHART_PALETTE.sage,
  CHART_PALETTE.amber,
];

/* ══════════════════════════════════════════════════════════
   Animated Counter — Apple Fitness style
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
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic — fast start, slow finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration, reduced, isInView]);

  return { value, ref };
}

/* ══════════════════════════════════════════════════════════
   Custom tooltip
   ══════════════════════════════════════════════════════════ */

function SourcesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: RevenueSourceData }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div
      style={{
        ...TOOLTIP_STYLE,
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <p
        style={{
          fontWeight: 600,
          marginBottom: 4,
          color: CHART.tooltipText,
          fontFamily: "var(--font-ui)",
        }}
      >
        {entry.payload.source}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 600,
          color: CHART.tooltipText,
        }}
      >
        {formatCurrency(entry.value)}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export function RevenueChart({ data }: RevenueChartProps) {
  const prefersReduced = useReducedMotion();
  const { isMobile } = useBreakpoint();

  const total = useMemo(
    () => data.reduce((s, d) => s + d.amount, 0),
    [data],
  );

  const { value: animatedTotal, ref: counterRef } = useAnimatedCounter(total);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        shortSource:
          d.source.length > 22
            ? d.source.slice(0, 20) + "…"
            : d.source,
      })),
    [data],
  );

  const m = prefersReduced
    ? undefined
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay: 0.2 },
      };

  // Bar animation variants — staggered draw-in
  return (
    <motion.div {...(m ?? {})}>
      <Card className="revenue-chart p-6">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-silver-100)] font-[family-name:var(--font-display)]">
              Fuentes de ingresos
            </h3>
            <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mt-1">
              Total período:{" "}
              <span
                ref={counterRef}
                className="font-semibold font-[family-name:var(--font-mono)] text-[var(--color-silver-100)]"
              >
                {formatCurrency(prefersReduced ? total : animatedTotal)}
              </span>
            </p>
          </div>
        </div>

        <div className={cn(isMobile ? "h-48" : "h-72")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={
                isMobile
                  ? { top: 4, right: 16, left: 0, bottom: 0 }
                  : { top: 4, right: 32, left: 8, bottom: 0 }
              }
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART.gridStroke}
                horizontal={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  `₡${(v / 1_000_000).toFixed(1)}M`
                }
                tick={{
                  ...AXIS_TICK,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <YAxis
                type="category"
                dataKey={isMobile ? "shortSource" : "source"}
                axisLine={false}
                tickLine={false}
                tick={{
                  ...AXIS_TICK,
                  fontFamily: "var(--font-ui)",
                }}
                width={isMobile ? 100 : 180}
              />
              <Tooltip content={<SourcesTooltip />} />
              <Bar
                dataKey="amount"
                name="Ingresos"
                radius={[0, 6, 6, 0]}
                maxBarSize={32}
                isAnimationActive={!prefersReduced}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={BAR_COLORS[i % BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
}