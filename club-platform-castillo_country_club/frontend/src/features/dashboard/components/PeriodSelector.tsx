// src/features/dashboard/components/PeriodSelector.tsx
// ═══════════════════════════════════════════════════════════
// Rewrite Fase 8:
// + Validación: from < to antes de aplicar
// + useReducedMotion() en layoutId animation
// + aria-label ya existía — mantenido
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type DashboardPeriod = "current_quarter" | "last_quarter" | "ytd" | "custom";

interface PeriodOption {
  value: DashboardPeriod;
  label: string;
}

const PERIODS: PeriodOption[] = [
  { value: "current_quarter", label: "Trimestre" },
  { value: "last_quarter", label: "Trim. anterior" },
  { value: "ytd", label: "Año en curso" },
  { value: "custom", label: "Personalizado" },
];

interface PeriodSelectorProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod, range?: { from: string; to: string }) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const prefersReduced = useReducedMotion();
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const handleApply = () => {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) {
      setDateError("La fecha de inicio debe ser anterior a la fecha de fin.");
      return;
    }
    setDateError(null);
    onChange("custom", { from: customFrom, to: customTo });
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="inline-flex items-center gap-0.5 p-1 glass-card"
        role="tablist"
        aria-label="Período del dashboard"
      >
        {PERIODS.map((period) => (
          <button
            key={period.value}
            role="tab"
            aria-selected={value === period.value}
            onClick={() => { setDateError(null); onChange(period.value); }}
            className={cn(
              "relative px-4 py-2 text-sm rounded-[var(--radius-md)]",
              "font-[family-name:var(--font-ui)] font-medium",
              "min-h-[44px] transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)] focus-visible:outline-offset-2",
              value === period.value
                ? "text-white"
                : "text-[var(--color-silver-400)] hover:text-[var(--color-silver-100)]",
            )}
          >
            {value === period.value && !prefersReduced && (
              <motion.div
                layoutId="period-pill"
                className="absolute inset-0 rounded-[var(--radius-md)]"
                style={{ background: "var(--color-gold-400)" }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            {value === period.value && prefersReduced && (
              <div
                className="absolute inset-0 rounded-[var(--radius-md)]"
                style={{ background: "var(--color-gold-400)" }}
              />
            )}
            <span className="relative z-10">{period.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {value === "custom" && (
          <motion.div
            {...(prefersReduced ? {} : { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 } })}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Calendar size={16} strokeWidth={1.5} style={{ color: "var(--color-silver-500)", flexShrink: 0 }} />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setDateError(null); }}
                aria-label="Fecha inicio"
                className="glass-input px-3 py-2 text-sm"
                style={{ width: "auto", minHeight: 40 }}
              />
              <span className="text-[var(--color-silver-400)] text-sm font-[family-name:var(--font-ui)] hidden sm:inline">a</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setDateError(null); }}
                aria-label="Fecha fin"
                className="glass-input px-3 py-2 text-sm"
                style={{ width: "auto", minHeight: 40 }}
              />
              <button
                onClick={handleApply}
                disabled={!customFrom || !customTo}
                className="aurora-btn aurora-btn--gold px-4 py-2 text-sm rounded-[var(--radius-md)] font-[family-name:var(--font-ui)] font-semibold min-h-[44px] text-[var(--color-abyss)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">Aplicar</span>
              </button>
            </div>
            {dateError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[var(--color-rose-400)] font-[family-name:var(--font-ui)] ml-7"
                role="alert"
              >
                {dateError}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
