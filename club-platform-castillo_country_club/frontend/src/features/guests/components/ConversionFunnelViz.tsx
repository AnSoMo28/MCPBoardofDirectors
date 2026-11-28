// src/features/guests/components/ConversionFunnelViz.tsx
/**
 * ConversionFunnelViz — Hero visualization for Guest Intelligence.
 *
 * CSS-only funnel with centered, progressively narrower bars.
 * Each stage shows: count, label, conversion %, benchmark comparison.
 * Dropoff indicators between stages.
 * Pipeline value footer.
 *
 * Key differentiator: transforms raw funnel data into a visual
 * that directors understand in 3 seconds.
 */

import { cn } from "@/shared/lib/utils";
import { ArrowDown, Target, DollarSign } from "lucide-react";
import './ConversionFunnelViz.css';

import type {
  ConversionFunnel
} from "@/shared/mocks/contracts";

// ═══ CONFIG ═════════════════════════════════════════════════════════════════

const STAGE_COLORS = [
  "var(--color-teal-400)",
  "var(--color-teal-300)",
  "var(--color-amber-400)",
  "var(--color-gold-400)",
  "var(--color-emerald-400)",
];

// ═══ HELPERS ════════════════════════════════════════════════════════════════

function getVsBenchmarkColor(vs: number): string {
  if (vs >= 0) return "var(--color-emerald-400)";
  if (vs >= -2) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

interface Props {
  funnel: ConversionFunnel;
  className?: string;
}

export function ConversionFunnelViz({ funnel, className }: Props) {
  const { stages, total_guests, overall_conversion_pct, overall_benchmark_pct, pipeline_value } = funnel;

  if (stages.length === 0 || total_guests === 0) return null;

  const maxCount = total_guests;

  // Build display stages: prepend total_visitors as "all visitors"
  const displayStages: Array<{
    key: string;
    label: string;
    count: number;
    pctOfTotal: number;
    convFromPrev: number | null;
    vsBenchmark: number | null;
    benchmarkPct: number | null;
  }> = [
    {
      key: "total_guests",
      label: "Visitantes Totales",
      count: total_guests,
      pctOfTotal: 100,
      convFromPrev: null,
      vsBenchmark: null,
      benchmarkPct: null,
    },
    ...stages.map((s, i) => ({
      key: s.stage,
      label: s.label,
      count: s.count,
      pctOfTotal: maxCount > 0 ? (s.count / maxCount) * 100 : 0,
      convFromPrev: i === 0 ? 100 : s.rate_pct,
      vsBenchmark: s.vs_benchmark,
      benchmarkPct: s.benchmark_rate_pct,
    })),
  ];

  const vsBenchmarkColor = getVsBenchmarkColor(overall_conversion_pct - overall_benchmark_pct);
  const pipelineM = pipeline_value / 1_000_000;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden",
        "bg-[var(--color-surface-1)] border border-[rgba(255,255,255,0.06)]",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Header */}
      <div className="conversion-funnel-viz px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: "var(--color-terracotta-400)" }} />
            <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">
              Funnel de Conversión
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-silver-400)]">Conversión global:</span>
              <span
                className="font-[family-name:var(--font-mono)] font-bold"
                style={{ color: vsBenchmarkColor }}
              >
                {overall_conversion_pct.toFixed(1)}%
              </span>
              <span className="text-[var(--color-silver-500)]">
                (benchmark: {overall_benchmark_pct}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-[var(--color-gold-400)]" />
              <span className="text-[var(--color-silver-400)]">Pipeline:</span>
              <span className="font-[family-name:var(--font-mono)] font-bold text-[var(--color-gold-400)]">
                ₡{pipelineM.toFixed(1)}M
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="p-4 space-y-1">
        {displayStages.map((stage, idx) => {
          const barWidth = Math.max(8, stage.pctOfTotal);
          const color = STAGE_COLORS[idx] ?? STAGE_COLORS[STAGE_COLORS.length - 1];

          return (
            <div key={stage.key}>
              {/* Dropoff indicator */}
              {idx > 0 && stage.convFromPrev !== null && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-3 h-3 text-[var(--color-silver-500)]" />
                    <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      {stage.convFromPrev.toFixed(1)}% continúa
                    </span>
                    {stage.benchmarkPct !== null && (
                      <span className="text-[10px] text-[var(--color-silver-600)]">
                        (benchmark: {stage.benchmarkPct}%)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stage bar */}
              <div className="flex items-center gap-3">
                {/* Label */}
                <div className="w-36 flex-shrink-0 text-right">
                  <p className="text-[11px] font-medium text-[var(--color-silver-300)] truncate">
                    {stage.label}
                  </p>
                </div>

                {/* Bar */}
                <div className="flex-1 flex items-center">
                  <div
                    className="h-9 rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                      minWidth: "48px",
                      opacity: 0.85,
                    }}
                  >
                    <span className="text-[12px] font-bold text-white font-[family-name:var(--font-mono)] drop-shadow-sm">
                      {stage.count}
                    </span>
                  </div>
                </div>

                {/* Percentage + benchmark */}
                <div className="w-20 flex-shrink-0 text-right">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] font-bold text-[var(--color-silver-200)]">
                    {stage.pctOfTotal.toFixed(1)}%
                  </span>
                  {stage.vsBenchmark !== null && stage.vsBenchmark !== 0 && (
                    <span
                      className="block text-[9px] font-[family-name:var(--font-mono)]"
                      style={{ color: getVsBenchmarkColor(stage.vsBenchmark) }}
                    >
                      {stage.vsBenchmark > 0 ? "+" : ""}
                      {stage.vsBenchmark.toFixed(1)} vs bench
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
