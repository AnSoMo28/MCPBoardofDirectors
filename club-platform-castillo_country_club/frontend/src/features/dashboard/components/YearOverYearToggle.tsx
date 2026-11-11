// src/features/dashboard/components/YearOverYearToggle.tsx
// ═══════════════════════════════════════════════════════════
// Year-over-Year Toggle — Castillo Country Club
//
// Provides YoY context to children. KPICards consumes useYoY()
// to switch labels and show delta indicators.
//
// Rewrite Fase 8 (v2):
// + yoyData prop with real comparison data from backend
// + Enriched context: { enabled, year, previousYear, comparisons }
// + rgba() → color-mix() / CSS vars
// + useReducedMotion() maintained
// ═══════════════════════════════════════════════════════════

import { useState, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, CalendarDays } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";

/* ── Types ── */

export interface YoYComparison {
  current: number;
  previous: number;
  change_pct: number;
}

export interface YoYData {
  revenue?: YoYComparison;
  families?: YoYComparison;
  engagement?: YoYComparison;
  nps?: YoYComparison;
  facilityUtilization?: YoYComparison;
  events?: YoYComparison;
}

/* ── Context ── */

interface YoYContextValue {
  enabled: boolean;
  year: number;
  previousYear: number;
  comparisons: YoYData | null;
}

const YoYContext = createContext<YoYContextValue>({
  enabled: false,
  year: new Date().getFullYear(),
  previousYear: new Date().getFullYear() - 1,
  comparisons: null,
});

export function useYoY() {
  return useContext(YoYContext);
}

/* ── Provider ── */

interface YearOverYearToggleProps {
  children: ReactNode;
  yoyData?: YoYData | null;
  className?: string;
}

export default function YearOverYearToggle({
  children,
  yoyData = null,
  className,
}: YearOverYearToggleProps) {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  return (
    <YoYContext.Provider
      value={{
        enabled: enabled && !!yoyData,
        year: currentYear,
        previousYear,
        comparisons: yoyData,
      }}
    >
      <div className={cn("space-y-4", className)}>
        {/* Toggle header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays
              size={16}
              strokeWidth={1.5}
              className="text-[var(--color-silver-500)]"
            />
            <span className="text-sm font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]">
              Comparación
            </span>
          </div>

          <Button
            variant="unstyled"
            type="button"
            onClick={() => setEnabled((v) => !v)}
            disabled={!yoyData}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-[family-name:var(--font-ui)]",
              "transition-all duration-300 border min-h-[44px]",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
              !yoyData && "opacity-50 cursor-not-allowed",
            )}
            style={{
              background: enabled
                ? "color-mix(in srgb, var(--color-teal-400) 10%, transparent)"
                : "transparent",
              borderColor: enabled
                ? "color-mix(in srgb, var(--color-teal-400) 30%, transparent)"
                : "rgba(255,255,255,0.08)",
              color: enabled
                ? "var(--color-teal-400)"
                : "var(--color-silver-400)",
            }}
            aria-pressed={enabled}
            aria-label={`${enabled ? "Desactivar" : "Activar"} comparación interanual`}
          >
            <ArrowRightLeft size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {enabled ? "Comparando" : "vs Año Anterior"}
            </span>
            <span className="sm:hidden">
              {enabled ? `${previousYear}` : "YoY"}
            </span>

            {/* Toggle switch */}
            <div
              className="relative w-10 h-5 rounded-full transition-colors duration-300"
              style={{
                background: enabled
                  ? "var(--color-teal-400)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={reduced ? undefined : { left: enabled ? 22 : 2 }}
                style={{ left: enabled ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </div>
          </Button>
        </div>

        {/* YoY info bar (shown when enabled) */}
        <AnimatePresence>
          {enabled && yoyData && (
            <motion.div
              {...(reduced
                ? {}
                : {
                    initial: { height: 0, opacity: 0 },
                    animate: { height: "auto", opacity: 1 },
                    exit: { height: 0, opacity: 0 },
                    transition: { duration: 0.25, ease: "easeOut" },
                  })}
              className="overflow-hidden"
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--color-teal-400) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    Periodo actual:
                  </span>
                  <span className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-mono)]">
                    {currentYear}
                  </span>
                </div>
                <ArrowRightLeft
                  size={12}
                  strokeWidth={1.5}
                  className="text-[var(--color-silver-600)]"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                    Comparado con:
                  </span>
                  <span className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-mono)]">
                    {previousYear}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {children}
      </div>
    </YoYContext.Provider>
  );
}
