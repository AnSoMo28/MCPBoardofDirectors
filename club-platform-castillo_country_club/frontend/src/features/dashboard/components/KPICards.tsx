// src/features/dashboard/components/KPICards.tsx
// ═══════════════════════════════════════════════════════════
// KPI Cards — Castillo Country Club
//
// Rewrite Fase 8 (v2):
// + Consumes useYoY() context from YearOverYearToggle
// + When YoY enabled: shows actual comparison data
// + Labels switch: "vs trim. anterior" → "vs {previousYear}"
// + formatCurrency maintained
// + useReducedMotion() maintained
// + aria-label maintained
// ═══════════════════════════════════════════════════════════

import { useNavigate } from "react-router";
import { StatCard } from "@/shared/components/layout/StatCard";
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/utils";
import type { KPIData } from "../types";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useYoY } from "./YearOverYearToggle";
import { motion } from "framer-motion";
import './KPICards.css';
import {
  DollarSign, Users, Activity, ThumbsUp, Building2, CalendarDays,
} from "lucide-react";

interface KPICardsProps {
  data: KPIData;
}

const KPI_ROUTES: Record<string, string> = {
  "Ingresos": "/admin/finance",
  "Familias activas": "/admin/families",
  "Engagement": "/admin/engagement",
  "NPS": "/admin/engagement",
  "Utilización instalaciones": "/admin/facilities",
  "Eventos": "/admin/events",
};

export function KPICards({ data }: KPICardsProps) {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const yoy = useYoY();

  const defaultLabel = "vs trim. anterior";
  const yoyLabel = yoy.enabled && yoy.comparisons
    ? `vs ${yoy.previousYear}`
    : defaultLabel;

  /* Resolve change values — YoY data takes precedence when enabled */
  function getChange(field: keyof KPIData, yoyKey: keyof NonNullable<typeof yoy.comparisons>): number {
    if (yoy.enabled && yoy.comparisons?.[yoyKey]) {
      return yoy.comparisons[yoyKey]!.change_pct;
    }
    return data[field] as number;
  }

  const container = reduced
    ? undefined
    : { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  const item = reduced
    ? undefined
    : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

  const cards = [
    {
      title: "Ingresos",
      value: formatCurrency(data.revenue),
      change: getChange("revenueChange", "revenue"),
      changeLabel: yoyLabel,
      icon: <DollarSign size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-gold-400)",

    },
    {
      title: "Familias activas",
      value: formatNumber(data.families),
      change: getChange("familiesChange", "families"),
      changeLabel: yoyLabel,
      icon: <Users size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-sage-400)",
    },
    {
      title: "Engagement",
      value: `${data.engagement.toFixed(1)}/100`,
      change: getChange("engagementChange", "engagement"),
      changeLabel: yoyLabel,
      icon: <Activity size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-teal-400)",

    },
    {
      title: "NPS",
      value: `+${data.nps}`,
      change: getChange("npsChange", "nps"),
      changeLabel: yoyLabel,
      icon: <ThumbsUp size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-emerald-400)",
    },
    {
      title: "Utilización instalaciones",
      value: formatPercent(data.facilityUtilization),
      change: getChange("facilityChange", "facilityUtilization"),
      changeLabel: yoyLabel,
      icon: <Building2 size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-terracotta-400)",
    },
    {
      title: "Eventos",
      value: formatNumber(data.events),
      change: getChange("eventsChange", "events"),
      changeLabel: yoyLabel,
      icon: <CalendarDays size={20} strokeWidth={1.5} />,
      iconColor: "var(--color-silver-300)",
    },
  ];

  return (
    <motion.div
      variants={container}
      initial={false}
      animate="show"
      className="k-p-i-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Indicadores clave del club"
    >
      {cards.map((card) => {
        const route = KPI_ROUTES[card.title];
        return (
          <motion.div key={card.title} variants={item}>
            <StatCard
              title={card.title}
              value={card.value}
              change={card.change}
              changeLabel={card.changeLabel}
              icon={card.icon}
              iconColor={card.iconColor}
              onClick={route ? () => navigate(route) : undefined}
              ariaLabel={route ? `${card.title} — ir a detalle` : undefined}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
