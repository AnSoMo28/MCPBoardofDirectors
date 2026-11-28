/**
 * @component KPICards (Fase 25)
 * @namespace .glass-board__kpi*
 * @depends KPICards.css
 * @note 4 KPI cards with counter animation (Apple Fitness style).
 *       Each KPI has its own duration + easing for staggered count-up.
 * @import import './KPICards.css';
 */
import "./KPICards.css";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Users, DollarSign, BarChart3, Shield } from "lucide-react";
import type { BoardReportKPI } from "../hooks/useBoardReport";

/* ═══════════════════════════════════════
   Counter Animation
   ═══════════════════════════════════════ */

function useCounter(target: number, duration: number, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      /* easeOutCubic */
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setValue(Number(current.toFixed(decimals)));

      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    };

    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target, duration, decimals]);

  return value;
}

/* ═══════════════════════════════════════
   Icon Map
   ═══════════════════════════════════════ */

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={18} />,
  dollar: <DollarSign size={18} />,
  chart: <BarChart3 size={18} />,
  shield: <Shield size={18} />,
};

const COLOR_MAP: Record<string, string> = {
  users: "var(--color-teal-400, #2dd4bf)",
  dollar: "var(--color-emerald-400, #34d399)",
  chart: "var(--color-gold-400, #c9a96e)",
  shield: "var(--color-amber-400, #fbbf24)",
};

/* ═══════════════════════════════════════
   Individual KPI Card
   ═══════════════════════════════════════ */

function KPICard({ kpi, index }: { kpi: BoardReportKPI; index: number }) {
  const duration = 800 + index * 200;
  const decimals = kpi.id === "revenue" || kpi.id === "occupancy" ? 1 : 0;
  const animatedValue = useCounter(kpi.value, duration, decimals);
  const color = COLOR_MAP[kpi.icon] ?? "var(--color-silver-400, #a09a92)";

  const formatted =
    kpi.id === "revenue"
      ? `₡${(animatedValue / 1_000_000).toFixed(1)}M`
      : kpi.id === "occupancy"
        ? `${animatedValue.toFixed(1)}%`
        : animatedValue.toString();

  return (
    <div
      className="glass-board__kpi"
      style={{ "--kpi-color": color } as React.CSSProperties}
    >
      <div className="glass-board__kpi-icon-wrap">
        {ICON_MAP[kpi.icon] ?? <BarChart3 size={18} />}
      </div>
      <p className="glass-board__kpi-label">{kpi.label}</p>
      <p className="glass-board__kpi-value">{formatted}</p>
    </div>
  );
}

/* ═══════════════════════════════════════
   KPI Grid
   ═══════════════════════════════════════ */

interface KPICardsProps {
  kpis: BoardReportKPI[];
  fadeIn: Variants;
}

export function KPICards({ kpis, fadeIn }: KPICardsProps) {
  if (kpis.length === 0) return null;

  return (
    <motion.div id="board-kpis" variants={fadeIn} className="glass-board__kpis">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.id} kpi={kpi} index={i} />
      ))}
    </motion.div>
  );
}