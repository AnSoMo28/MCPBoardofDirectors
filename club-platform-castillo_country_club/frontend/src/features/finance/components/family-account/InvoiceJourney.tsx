// src/features/finance/components/family-account/InvoiceJourney.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, AlertTriangle } from "lucide-react";
import { Skeleton, EmptyState } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import { INVOICE_STATUS_CONFIG } from "../../types";
import type { Invoice } from "../../types";
import type { UseQueryResult } from "@tanstack/react-query";
import './FamilyAccountGlass.css';
import { Button } from "@/shared/components/ui/Button";
interface Props {
  invQ: UseQueryResult<Invoice[]>;
}

const EASE = [0.16, 1, 0.3, 1] as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

function InvoiceCard({ inv, reduced }: { inv: Invoice; reduced: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = inv.balance > 0 && new Date(inv.due_date) < new Date();
  const derivedStatus = isOverdue ? "overdue" : inv.status;
  const cfg = INVOICE_STATUS_CONFIG[derivedStatus as keyof typeof INVOICE_STATUS_CONFIG]
  ?? INVOICE_STATUS_CONFIG[inv.status]
  ?? INVOICE_STATUS_CONFIG.pending;
  const paidPct = inv.amount > 0 ? (inv.paid_amount / inv.amount) * 100 : 0;

  const isPaid = inv.balance <= 0;

  const progressColor = isPaid
    ? "var(--color-emerald-400)"
    : isOverdue
    ? "var(--color-rose-400)"
    : "var(--color-gold-400)";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-invoice-journey", isOverdue && "glass-invoice-journey--overdue")}
    >
      {/* Header */}
      <Button
        variant="unstyled"
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]
                   focus-visible:outline-offset-2 rounded-lg"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[14px] font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                {inv.invoice_number}
              </p>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                           font-[family-name:var(--font-mono)]"
                style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
              >
                {cfg.label}
              </span>
              {isOverdue && (
                <AlertTriangle size={13} className="text-[var(--color-rose-400)] flex-shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              Emitida: {fmtDate(inv.date)} · Vence: {fmtDate(inv.due_date)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[16px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)] tabular-nums">
              {formatCurrency(inv.amount)}
            </p>
            {inv.balance > 0 && (
              <p className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-rose-400)] tabular-nums">
                Saldo: {formatCurrency(inv.balance)}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass-invoice-journey__progress mb-2">
          <motion.div
            className="glass-invoice-journey__progress-fill"
            style={{ backgroundColor: progressColor }}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${Math.min(paidPct, 100)}%` }}
            transition={{ duration: reduced ? 0 : 0.8, ease: EASE, delay: 0.1 }}
          />
          {/* Due date marker (at 100% position on timeline) */}
          {!isPaid && (
            <div
              className="glass-invoice-journey__marker"
              style={{ right: 0, opacity: 0.3 }}
            />
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium font-[family-name:var(--font-mono)]"
                style={{ color: progressColor }}>
            {paidPct.toFixed(0)}% pagado
          </span>
          <div className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
            <ChevronDown size={12} className={cn("transition-transform duration-200", expanded && "rotate-180")} />
            <span>{expanded ? "Menos" : "Detalle"}</span>
          </div>
        </div>
      </Button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex justify-between text-xs font-[family-name:var(--font-ui)]">
                <span className="text-[var(--color-silver-500)]">Total factura</span>
                <span className="text-[var(--color-silver-300)] font-[family-name:var(--font-mono)]">
                  {formatCurrency(inv.amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-[family-name:var(--font-ui)]">
                <span className="text-[var(--color-silver-500)]">Pagado</span>
                <span className="text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)]">
                  {formatCurrency(inv.paid_amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-[family-name:var(--font-ui)]">
                <span className="text-[var(--color-silver-500)]">Pendiente</span>
                <span className="text-[var(--color-rose-400)] font-[family-name:var(--font-mono)]">
                  {formatCurrency(inv.balance)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────── */

export default function InvoiceJourney({ invQ }: Props) {
  const reduced = useReducedMotion();

  if (invQ.isLoading && !invQ.data) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  if (!invQ.data || invQ.data.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Sin facturas"
          description="No se encontraron facturas registradas."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {invQ.data.map((inv) => (
        <InvoiceCard key={inv.id} inv={inv} reduced={reduced} />
      ))}
    </div>
  );
}