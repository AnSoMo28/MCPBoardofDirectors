// src/features/dashboard/components/AnomalyFeed.tsx
// ═══════════════════════════════════════════════════════════
// Anomaly Feed — Castillo Country Club
//
// Premium enhancements:
// + Glass anomaly items with left severity border
// + Severity-colored radial glow on hover
// + Critical pulsing border animation
// + Critical badge pulse
// + Recommendation teal accent card
// + Glass empty state
// + Severity badge bounce-in
// ═══════════════════════════════════════════════════════════

import { cn, timeAgo } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { motion } from "framer-motion";
import {
  AlertTriangle, TrendingDown, DollarSign, Waves, BarChart3, ChevronRight, Lightbulb,
} from "lucide-react";
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import { AnomalySeverity, ANOMALY_SEVERITY_CONFIG } from "../types";
import './AnomalyFeed.css';

export type Severity = "high" | "medium" | "low" | string;

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  detectedAt: string;
  category: string;
  recommendation?: string;
}

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  onAnomalyClick?: (anomaly: Anomaly) => void;
}

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  membership: TrendingDown,
  finance: DollarSign,
  facility: Waves,
  satisfaction: BarChart3,
};

const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  color: string;
  glow: string;
}> = {
  critical: {
    label: ANOMALY_SEVERITY_CONFIG[AnomalySeverity.Critical].label,
    color: CHART_PALETTE.rose,
    glow: "rgba(196, 100, 112, 0.12)",
  },
  high: {
    label: ANOMALY_SEVERITY_CONFIG[AnomalySeverity.High].label,
    color: CHART_PALETTE.rose,
    glow: "rgba(196, 100, 112, 0.08)",
  },
  medium: {
    label: ANOMALY_SEVERITY_CONFIG[AnomalySeverity.Medium].label,
    color: CHART_PALETTE.gold,
    glow: "rgba(201, 169, 110, 0.08)",
  },
  low: {
    label: ANOMALY_SEVERITY_CONFIG[AnomalySeverity.Low].label,
    color: CHART_PALETTE.teal,
    glow: "rgba(42, 154, 181, 0.06)",
  },
};

export function AnomalyFeed({ anomalies, onAnomalyClick }: AnomalyFeedProps) {
  const prefersReduced = useReducedMotion();

  const sorted = [...anomalies].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  const criticalCount = anomalies.filter((a) => a.severity === "critical" || a.severity === "high").length;

  const m = (delay = 0) =>
    prefersReduced
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } };

  return (
    <motion.div {...m(0.4)} className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} strokeWidth={1.5} style={{ color: "var(--color-gold-400)" }} />
          <h3 className="text-lg font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
            Alertas inteligentes
          </h3>
        </div>
        {criticalCount > 0 && (
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-bold font-[family-name:var(--font-mono)]",
              "bg-[rgba(196,100,112,0.10)] text-[var(--color-rose-400)]",
              !prefersReduced && "glass-anomaly-badge--critical",
            )}
          >
            {criticalCount} críticas
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="glass-panel py-10 text-center">
          <p className="text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Sin alertas activas</p>
        </div>
      ) : (
        <div className="space-y-3" role="feed" aria-label="Alertas del club">
          {sorted.map((anomaly, index) => {
            const IconComp = CATEGORY_ICONS[anomaly.category] || AlertTriangle;
            const sev = SEVERITY_CONFIG[anomaly.severity];
            const isCritical = anomaly.severity === "critical";
            const isHigh = anomaly.severity === "high";

            return (
              <motion.div
                key={anomaly.id}
                initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={prefersReduced ? { duration: 0 } : { duration: 0.3, delay: 0.06 * index }}
                onClick={() => onAnomalyClick?.(anomaly)}
                role={onAnomalyClick ? "button" : "article"}
                tabIndex={onAnomalyClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onAnomalyClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onAnomalyClick(anomaly);
                  }
                }}
                className={cn(
                  "glass-anomaly-feed-item",
                  onAnomalyClick && "glass-anomaly-feed-item--clickable",
                  (isCritical || isHigh) && "glass-anomaly-feed-item--critical",
                )}
                style={{
                  "--anomaly-severity-color": sev.color,
                  "--anomaly-glow": sev.glow,
                } as React.CSSProperties}
              >
                {/* Severity glow on hover */}
                <div className="glass-anomaly-feed-item__glow" aria-hidden="true" />

                {/* Category icon */}
                <div
                  className="relative z-[1] w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `color-mix(in srgb, ${sev.color} 12%, transparent)` }}
                >
                  <IconComp size={18} strokeWidth={1.5} style={{ color: sev.color }} />
                </div>

                {/* Content */}
                <div className="relative z-[1] flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-[family-name:var(--font-mono)]",
                        !prefersReduced && "glass-anomaly-severity-enter",
                      )}
                      style={{
                        backgroundColor: `color-mix(in srgb, ${sev.color} 15%, transparent)`,
                        color: sev.color,
                        animationDelay: `${0.1 + index * 0.06}s`,
                      }}
                    >
                      {sev.label}
                    </span>
                    <span className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      {timeAgo(anomaly.detectedAt)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1">
                    {anomaly.title}
                  </p>
                  <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] line-clamp-2">
                    {anomaly.description}
                  </p>

                  {/* Recommendation — teal accent card */}
                  {anomaly.recommendation && (
                    <div className="glass-anomaly-feed-reco">
                      <Lightbulb size={12} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
                      <span>Sugerencia: {anomaly.recommendation}</span>
                    </div>
                  )}
                </div>

                {/* Chevron */}
                {onAnomalyClick && (
                  <ChevronRight size={16} strokeWidth={1.5} className="relative z-[1] text-[var(--color-silver-400)] flex-shrink-0 mt-1" />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}