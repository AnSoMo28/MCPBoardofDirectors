// src/features/finance/components/family-account/TransactionTimeline.tsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Activity
} from "lucide-react";
import { Button, Skeleton, FilterDropdown, EmptyState } from "@/shared/components/ui";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, cn } from "@/shared/lib/utils";
import type { TransactionListResponse, TransactionStatus } from "../../types";
import {
  TRANSACTION_TYPE_CONFIG, TRANSACTION_STATUS_CONFIG,
} from "../../types";
import type { UseQueryResult } from "@tanstack/react-query";
import './FamilyAccountGlass.css';
/* ── Types ───────────────────────────────────────── */

type Transaction = TransactionListResponse["transactions"][number];

interface Props {
  txQ: UseQueryResult<TransactionListResponse>;
  txType: string;
  onTypeChange: (type: string) => void;
  onPagePrev: () => void;
  onPageNext: (max: number) => void;
}

/* ── Group by date ───────────────────────────────── */

function fmtDateGroup(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function groupByDate(txs: Transaction[]): Array<{ dateKey: string; items: Transaction[] }> {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const key = fmtDateGroup(tx.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }));
}

/* ── Transaction Row ─────────────────────────────── */

function TransactionRow({ tx, reduced }: { tx: Transaction; reduced: boolean }) {
  const typeCfg = TRANSACTION_TYPE_CONFIG[tx.type] ?? TRANSACTION_TYPE_CONFIG.charge;
  const statusCfg = TRANSACTION_STATUS_CONFIG[tx.status as TransactionStatus] ?? TRANSACTION_STATUS_CONFIG.completed;
  const isCharge = typeCfg.sign === "+";
  const absAmt = Math.abs(tx.amount);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-tx-node group"
    >
      <div
        className={cn(
          "glass-tx-node-inner flex items-center gap-3 p-3 rounded-xl transition-colors",
          "border border-white/[0.04] hover:border-white/[0.08]",
          "bg-[var(--color-surface-2)]/50 hover:bg-[var(--color-surface-2)]",
        )}
        style={{
          borderLeft: `3px solid ${isCharge ? "var(--color-rose-400)" : "var(--color-emerald-400)"}`,
        }}
      >
        {/* Amount bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate">
              {tx.description}
            </p>
            {tx.facility_name && (
              <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]
                               hidden sm:inline px-1.5 py-0.5 rounded bg-[var(--color-surface-3)]">
                {tx.facility_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              {tx.category_label}
            </span>
            <span className="text-[10px] text-[var(--color-silver-600)]">·</span>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium font-[family-name:var(--font-mono)]"
                  style={{ color: statusCfg.color, backgroundColor: statusCfg.bgColor }}>
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className={cn(
            "text-[15px] font-bold font-[family-name:var(--font-mono)] tabular-nums",
            isCharge ? "text-[var(--color-rose-400)]" : "text-[var(--color-emerald-400)]",
          )}>
            {isCharge ? "+" : "−"}{formatCurrency(absAmt)}
          </p>
          <p className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-mono)]">
            {new Date(tx.date).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────── */

export default function TransactionTimeline({
  txQ, txType, onTypeChange, onPagePrev, onPageNext,
}: Props) {
  const reduced = useReducedMotion();

  const grouped = useMemo(() => {
    if (!txQ.data) return [];
    return groupByDate(txQ.data.transactions);
  }, [txQ.data]);

  if (txQ.isLoading && !txQ.data) {
    return <Skeleton className="h-80 rounded-xl mt-4" />;
  }

  if (!txQ.data || txQ.data.transactions.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          icon={<Activity className="w-8 h-8" />}
          title="Sin transacciones"
          description="No se encontraron transacciones para los filtros seleccionados."
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Filter */}
      <FilterDropdown
        label="Tipo"
        value={txType}
        onChange={onTypeChange}
        options={[
          { value: "", label: "Todos los tipos" },
          ...Object.entries(TRANSACTION_TYPE_CONFIG).map(([value, cfg]) => ({
            value, label: cfg.label,
          })),
        ]}
      />

      {/* Desktop timeline */}
      <div className="hidden sm:block">
        <div className="glass-tx-timeline relative pl-10">
          {/* Vertical line */}
          <div className="glass-tx-timeline__line" />

          {grouped.map((group, gi) => (
            <div key={group.dateKey} className="mb-2">
              {/* Date milestone */}
              <motion.div
                className="glass-tx-timeline__date font-[family-name:var(--font-ui)]"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: gi * 0.05 }}
              >
                {group.dateKey}
              </motion.div>

              {/* Transactions */}
              <div className="space-y-2 pb-2">
                {group.items.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} reduced={reduced} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {grouped.map((group) => (
          <div key={group.dateKey}>
            <p className="text-[11px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider
                          font-[family-name:var(--font-ui)] mb-2 pl-1">
              {group.dateKey}
            </p>
            <div className="space-y-2">
              {group.items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} reduced={reduced} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {txQ.data.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
          <p className="text-sm font-[family-name:var(--font-ui)] text-[var(--color-silver-400)]">
            Página {txQ.data.page} de {txQ.data.total_pages} ({txQ.data.total} transacciones)
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" aria-label="Página anterior" onClick={onPagePrev}
                    disabled={txQ.data.page === 1} icon={<ChevronLeft size={14} />} className="text-xs h-8">
              Anterior
            </Button>
            <Button variant="ghost" aria-label="Página siguiente"
                    onClick={() => onPageNext(txQ.data!.total_pages)}
                    disabled={txQ.data.page === txQ.data.total_pages} className="text-xs h-8">
              Siguiente <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}