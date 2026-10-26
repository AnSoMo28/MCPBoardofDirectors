// src/features/finance/components/family-account/AgingWaterfall.tsx
import { motion } from "framer-motion";
import { Card } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency } from "@/shared/lib/utils";
import type { AgingBucket } from "../../hooks/useFamilyAccount";
import './FamilyAccountGlass.css';
interface Props {
  buckets: AgingBucket[];
  isSimulated?: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function AgingWaterfall({ buckets, isSimulated }: Props) {
  const reduced = useReducedMotion();

  if (buckets.length === 0) return null;

  return (
    <Card className="glass-aging-waterfall p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
            Antigüedad de Saldos
          </h3>
          <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-0.5">
            {isSimulated ? "Proyección con pago aplicado" : "Distribución del saldo pendiente"}
          </p>
        </div>
        {isSimulated && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                           font-[family-name:var(--font-mono)]
                           bg-[var(--color-gold-400)]/10 text-[var(--color-gold-400)] border border-[var(--color-gold-400)]/20">
            Simulado
          </span>
        )}
      </div>

      {/* Stacked bar */}
      <div className="glass-aging-bar h-10 rounded-xl overflow-hidden flex mb-4">
        {buckets.map((b, i) => (
          <motion.div
            key={b.label}
            className="glass-aging-segment relative flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: b.color }}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${Math.max(b.pct, 0)}%` }}
            transition={{
              duration: reduced ? 0 : 0.7,
              delay: reduced ? 0 : 0.2 + i * 0.1,
              ease: EASE,
            }}
          >
            {b.pct > 12 && (
              <span className="text-[10px] font-bold text-white/90 font-[family-name:var(--font-mono)]
                               drop-shadow-sm whitespace-nowrap">
                {b.pct.toFixed(0)}%
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b, i) => (
          <motion.div
            key={b.label}
            className="flex items-center gap-2"
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.06 }}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: b.color }} />
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] truncate">
                {b.label}
              </p>
              <p className="text-xs font-bold font-[family-name:var(--font-mono)] tabular-nums" style={{ color: b.color }}>
                {formatCurrency(b.value)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}