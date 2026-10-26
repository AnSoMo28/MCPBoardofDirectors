// src/features/finance/components/family-account/AccountScorecard.tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Calendar, TrendingUp, Clock } from "lucide-react";
import { Card } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, timeAgo } from "@/shared/lib/utils";
import type { FamilyAccountData } from "../../types";
import './FamilyAccountGlass.css';

/* ── Animated counter ────────────────────────────── */

function useCounter(end: number, dur = 900) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) { setVal(end); prev.current = end; return; }
    const from = prev.current;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const v = from + (end - from) * ease;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, dur, reduced]);

  return val;
}

/* ── Health Gauge SVG ────────────────────────────── */

function HealthGauge({ ratio, size = 80 }: { ratio: number; size?: number }) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const fill = Math.max(0, Math.min(1, 1 - ratio / 3));
  const color =
    ratio <= 1 ? "var(--color-emerald-400)" :
    ratio <= 2 ? "var(--color-amber-400)" :
    "var(--color-rose-400)";

  // Semi-circular arc from left to right
  const sx = cx - r;
  const ex = cx + r;

  return (
    <svg width={size} height={size / 2 + 8} className="flex-shrink-0">
      {/* Track */}
      <path
        d={`M ${sx} ${cy} A ${r} ${r} 0 0 1 ${ex} ${cy}`}
        fill="none" stroke="var(--color-surface-3)" strokeWidth="6" strokeLinecap="round"
      />
      {/* Fill */}
      <motion.path
        d={`M ${sx} ${cy} A ${r} ${r} 0 0 1 ${ex} ${cy}`}
        fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        pathLength="1" strokeDasharray="1"
        initial={{ strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 1 - fill }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] as const, delay: 0.3 }}
      />
    </svg>
  );
}

/* ── Props ───────────────────────────────────────── */

interface Props {
  account: FamilyAccountData;
  healthRatio: number;
  statusCfg: { label: string; color: string; bgColor: string };
  simBalance?: number;
  isSimulating?: boolean;
}

/* ── Scorecard ───────────────────────────────────── */

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function AccountScorecard({
  account, healthRatio, statusCfg, simBalance, isSimulating,
}: Props) {
  const reduced = useReducedMotion();
  const displayBal = useCounter(isSimulating ? (simBalance ?? 0) : account.balance);

  const cards: Array<{
    label: string;
    icon: typeof CreditCard;
    value: string;
    sub?: string;
    color?: string;
    extra?: React.ReactNode;
  }> = [
    {
      label: "Saldo Actual",
      icon: CreditCard,
      value: formatCurrency(displayBal),
      color: statusCfg.color,
      extra: (
        <span
          className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-ui)]"
          style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}
        >
          {isSimulating ? "Simulando" : statusCfg.label}
        </span>
      ),
    },
    {
      label: "Próximo Vencimiento",
      icon: Calendar,
      value: new Date(account.next_due_date).toLocaleDateString("es-CR", {
        day: "numeric", month: "short", year: "numeric",
      }),
      sub: `Cuota: ${formatCurrency(account.monthly_dues)}`,
    },
    {
      label: "Consumo del Año",
      icon: TrendingUp,
      value: formatCurrency(account.ytd_spent),
      sub: `Pagado: ${formatCurrency(account.ytd_paid)}`,
    },
    {
      label: "Último Pago",
      icon: Clock,
      value: account.last_payment_amount ? formatCurrency(account.last_payment_amount) : "—",
      sub: account.last_payment_date ? timeAgo(account.last_payment_date) : "Sin pagos registrados",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.08, delayChildren: 0.05 } as any}
    >
      {cards.map((card, i) => {
        const Icon = card.icon;
        const isBalance = i === 0;
        return (
          <motion.div
            key={card.label}
            initial={reduced ? false : { opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, ...SPRING }}
          >
            <Card
              className={`
                glass-account-scorecard p-5 relative overflow-hidden
                ${isBalance && account.status !== "current" ? "glass-account-scorecard--status-" + account.status : ""}
              `}
            >
              {/* Ambient orb */}
              <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.06] transition-opacity duration-500"
                style={{ backgroundColor: card.color ?? "var(--color-gold-400)" }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${card.color ?? "var(--color-gold-400)"}15` }}
                    >
                      <Icon size={14} style={{ color: card.color ?? "var(--color-gold-400)" }} />
                    </div>
                    <p className="text-[11px] font-semibold text-[var(--color-silver-500)]
                                  font-[family-name:var(--font-ui)] uppercase tracking-wider">
                      {card.label}
                    </p>
                  </div>
                  {isBalance && <HealthGauge ratio={isSimulating ? (simBalance ?? 0) / account.monthly_dues : healthRatio} />}
                </div>

                {/* Value */}
                <p className="text-[26px] font-bold font-[family-name:var(--font-display)]
                              text-[var(--color-silver-100)] leading-none tracking-tight tabular-nums">
                  {card.value}
                </p>

                {/* Sub */}
                {card.sub && (
                  <p className="text-xs mt-2 font-[family-name:var(--font-ui)] text-[var(--color-silver-500)]">
                    {card.sub}
                  </p>
                )}

                {/* Extra */}
                {card.extra}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}