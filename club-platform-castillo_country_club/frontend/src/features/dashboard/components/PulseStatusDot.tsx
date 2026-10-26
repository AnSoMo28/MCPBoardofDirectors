// src/features/dashboard/components/PulseStatusDot.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — The Pulse: Status Dot Indicator
// Lives inside the DetailTabs label for "El Pulso".
// Red pulsing = critical · Amber = warning · Green = OK
//
// Rules: #1 tokens, #18 reducedMotion
// ═══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

interface PulseStatusDotProps {
  criticalCount: number;
  warningCount: number;
}

export function PulseStatusDot({ criticalCount, warningCount }: PulseStatusDotProps) {
  const reduced = useReducedMotion();

  if (criticalCount > 0) {
    return (
      <motion.span
        animate={reduced ? {} : { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        className="inline-block w-2 h-2 rounded-full bg-[var(--color-rose-400)]"
        style={{ boxShadow: "0 0 6px var(--color-rose-400)" }}
        aria-label={`${criticalCount} crítico${criticalCount !== 1 ? "s" : ""}`}
      />
    );
  }

  if (warningCount > 0) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-[var(--color-amber-400)]"
        style={{ boxShadow: "0 0 4px var(--color-amber-400)" }}
        aria-label={`${warningCount} alerta${warningCount !== 1 ? "s" : ""}`}
      />
    );
  }

  return (
    <motion.span
      animate={reduced ? {} : { opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-emerald-400)]"
      aria-label="Todo normal"
    />
  );
}