// src/features/engagement/components/SatisfactionBenchmarkPanel.tsx
/**
 * SatisfactionBenchmarkPanel — Benchmark comparison for satisfaction metrics.
 * Shows: overall metrics vs benchmark with status badges,
 * category comparison bars with benchmark markers.
 */

import { cn } from "@/shared/lib/utils";
import { BarChart3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

import type { SatisfactionBenchmarkReport } from "@/shared/mocks/contracts";

// ═══ CONFIG ═════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof CheckCircle }
> = {
  on_track: {
    label: "En meta",
    color: "var(--color-emerald-400)",
    bgColor: "var(--color-emerald-bg)",
    icon: CheckCircle,
  },
  attention: {
    label: "Atención",
    color: "var(--color-amber-400)",
    bgColor: "var(--color-amber-bg)",
    icon: AlertTriangle,
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "var(--color-rose-bg)",
    icon: XCircle,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.attention;
}

function getVsBenchmarkColor(vs: number): string {
  if (vs >= 0) return "var(--color-emerald-400)";
  if (vs >= -0.3) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

// ═══ COMPONENT ═════════════════════════════════════════════════════════════

interface Props {
  benchmark: SatisfactionBenchmarkReport;
  className?: string;
}

export function SatisfactionBenchmarkPanel({ benchmark, className }: Props) {
  const { overall_benchmarks, category_benchmarks } = benchmark;

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
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: "var(--color-teal-400)" }} />
          <h3 className="text-sm font-semibold text-[var(--color-silver-100)]">
            Benchmarks
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overall metrics */}
        {overall_benchmarks.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider font-medium mb-3">
              Métricas Generales
            </p>
            <div className="space-y-3">
              {overall_benchmarks.map((m) => {
                const stCfg = getStatusConfig(m.status);
                const StIcon = stCfg.icon;
                const vsColor = getVsBenchmarkColor(m.vs_benchmark);

                return (
                  <div
                    key={m.metric}
                    className="rounded-lg p-3 bg-[var(--color-surface-0)] border border-[rgba(255,255,255,0.04)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StIcon className="w-3.5 h-3.5" style={{ color: stCfg.color }} />
                        <span className="text-xs font-medium text-[var(--color-silver-200)]">
                          {m.display_name}
                        </span>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ color: stCfg.color, backgroundColor: stCfg.bgColor }}
                      >
                        {stCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className="font-[family-name:var(--font-mono)] text-sm font-bold"
                        style={{ color: "var(--color-silver-100)" }}
                      >
                        {typeof m.value === "number" && m.value % 1 !== 0
                          ? m.value.toFixed(1)
                          : m.value}
                      </span>
                      <span className="text-[11px] text-[var(--color-silver-500)]">
                        vs benchmark {m.benchmark}
                      </span>
                      <span
                        className="font-[family-name:var(--font-mono)] text-[11px] font-bold ml-auto"
                        style={{ color: vsColor }}
                      >
                        {m.vs_benchmark > 0 ? "+" : ""}
                        {typeof m.vs_benchmark === "number"
                          ? m.vs_benchmark.toFixed(1)
                          : m.vs_benchmark}
                      </span>
                      <span className="text-[10px] text-[var(--color-silver-500)]">
                        P{m.percentile}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category benchmarks */}
        {category_benchmarks.length > 0 && (
          <div className="pt-3 border-t border-[rgba(255,255,255,0.04)]">
            <p className="text-[10px] text-[var(--color-silver-500)] uppercase tracking-wider font-medium mb-3">
              Por Categoría
            </p>
            <div className="space-y-2">
              {category_benchmarks.map((cat) => {
                const stCfg = getStatusConfig(cat.status);
                const vsColor = getVsBenchmarkColor(cat.vs_benchmark);

                // Bar: score 1-5 scale
                const barPct = (cat.avg_score / 5) * 100;
                const benchPct = (cat.benchmark_score / 5) * 100;

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[var(--color-silver-300)]">
                        {cat.display_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-[family-name:var(--font-mono)] text-[11px] font-semibold"
                          style={{ color: "var(--color-silver-200)" }}
                        >
                          {cat.avg_score.toFixed(1)}
                        </span>
                        <span
                          className="font-[family-name:var(--font-mono)] text-[10px] font-bold"
                          style={{ color: vsColor }}
                        >
                          {cat.vs_benchmark > 0 ? "+" : ""}
                          {cat.vs_benchmark.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Bar with benchmark marker */}
                    <div className="relative h-2 rounded-full bg-[var(--color-surface-2)] overflow-visible">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: stCfg.color,
                        }}
                      />
                      {/* Benchmark marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-[var(--color-silver-100)]"
                        style={{ left: `${benchPct}%` }}
                        title={`Benchmark: ${cat.benchmark_score}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-[var(--color-silver-600)] mt-2">
              ── línea blanca = benchmark
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
