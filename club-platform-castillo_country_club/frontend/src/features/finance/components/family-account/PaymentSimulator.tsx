// src/features/finance/components/family-account/PaymentSimulator.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency } from "@/shared/lib/utils";
import { Calculator, RotateCcw, CheckCircle2 } from "lucide-react";
import type { FamilyAccountData } from "../../types";
import type { usePaymentSimulator } from "../../hooks/usePaymentSimulator";
import './FamilyAccountGlass.css';
type Sim = ReturnType<typeof usePaymentSimulator>;

interface Props {
  simulator: Sim;
  account: FamilyAccountData;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PaymentSimulator({ simulator: sim, account }: Props) {
  const reduced = useReducedMotion();
  const { setSimAmount, effective, simBalance, monthsToPayoff, maxPayment, reset, hasSim } = sim;

  const sliderPct = maxPayment > 0 ? (effective / maxPayment) * 100 : 0;

  const payoffColor =
    monthsToPayoff === null ? "var(--color-silver-400)" :
    monthsToPayoff === 0 ? "var(--color-emerald-400)" :
    monthsToPayoff <= 3 ? "var(--color-amber-400)" :
    "var(--color-rose-400)";

  return (
    <Card className="glass-payment-sim p-5 relative overflow-hidden">
      {/* Ambient orb */}
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-[0.05]
                      bg-[var(--color-gold-400)]" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-gold-400)]/10">
              <Calculator size={14} className="text-[var(--color-gold-400)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                Simulador de Pago
              </h3>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                ¿Y si pagás hoy?
              </p>
            </div>
          </div>
          <AnimatePresence>
            {hasSim && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button variant="ghost" onClick={reset} icon={<RotateCcw size={13} />} className="text-xs h-8">
                  Reset
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Slider */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              Monto a pagar
            </span>
            <motion.span
              key={effective}
              initial={reduced ? false : { scale: 1.08 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold font-[family-name:var(--font-mono)] tabular-nums"
              style={{ color: hasSim ? "var(--color-gold-400)" : "var(--color-silver-400)" }}
            >
              {formatCurrency(effective)}
            </motion.span>
          </div>

          <input
            type="range"
            min={0}
            max={maxPayment}
            step={1000}
            value={effective}
            onChange={(e) => setSimAmount(Number(e.target.value))}
            className="glass-payment-slider w-full"
            style={{
              background: `linear-gradient(to right, var(--color-gold-400) ${sliderPct}%, var(--color-surface-3) ${sliderPct}%)`,
            }}
            aria-label={`Monto a pagar: ${formatCurrency(effective)}`}
          />

          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">₡0</span>
            <span className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
              {formatCurrency(maxPayment)}
            </span>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {hasSim ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
              className="space-y-3"
            >
              {/* Balance result */}
              <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-1">
                  Saldo restante
                </p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums"
                   style={{ color: simBalance <= 0 ? "var(--color-emerald-400)" : "var(--color-silver-200)" }}>
                  {simBalance <= 0 ? "¡Liquidado!" : formatCurrency(simBalance)}
                </p>
              </div>

              {/* Months to payoff */}
              <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]">
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-1">
                  Meses para liquidar (pagando cuota mensual)
                </p>
                <div className="flex items-center gap-2">
                  {monthsToPayoff === 0 && <CheckCircle2 size={16} className="text-[var(--color-emerald-400)]" />}
                  <p className="text-xl font-bold font-[family-name:var(--font-mono)] tabular-nums"
                     style={{ color: payoffColor }}>
                    {monthsToPayoff === 0 ? "Inmediato" : `${monthsToPayoff} mes${monthsToPayoff === 1 ? "" : "es"}`}
                  </p>
                </div>
              </div>

              {/* Savings highlight */}
              {effective > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-xl border border-[var(--color-emerald-400)]/20
                             bg-[var(--color-emerald-400)]/5"
                >
                  <p className="text-[11px] text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
                    Reducís tu saldo en{" "}
                    <span className="font-bold font-[family-name:var(--font-mono)]">
                      {((effective / account.balance) * 100).toFixed(0)}%
                    </span>
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                Mové el slider para simular un pago y ver el impacto en tu antigüedad de saldos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}