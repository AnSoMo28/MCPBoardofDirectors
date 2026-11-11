// src/features/finance/FamilyAccount.tsx
// Castillo Country Club — Family Account
// Rewrite completo — Fase 20
//
// Arquitectura: hooks extraídos, 5 sub-componentes,
// IA reorganizada (scorecard + aging + simulator siempre visibles).

import { useState } from "react";
import { useParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, ArrowRightLeft, FileText, AlertCircle
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button, Skeleton, EmptyState } from "@/shared/components/ui";
import { DetailTabs, type DetailTab } from "@/shared/components/layout/DetailTabs";
import ExportButton from "@/shared/components/export/ExportButton";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { showToast } from "@/shared/components/ui";

import { useFamilyAccount } from "./hooks/useFamilyAccount";
import { useTransactionFilter } from "./hooks/useTransactionFilter";
import { usePaymentSimulator } from "./hooks/usePaymentSimulator";

import AccountScorecard from "./components/family-account/AccountScorecard";
import AgingWaterfall from "./components/family-account/AgingWaterfall";
import PaymentSimulator from "./components/family-account/PaymentSimulator";
import TransactionTimeline from "./components/family-account/TransactionTimeline";
import InvoiceJourney from "./components/family-account/InvoiceJourney";
import './FamilyAccount.css';

/* ── Tabs ────────────────────────────────────────── */

const TABS: DetailTab[] = [
  { id: "transactions", label: "Transacciones", icon: ArrowRightLeft },
  { id: "invoices", label: "Facturas", icon: FileText },
];

/* ── Motion ──────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Component ───────────────────────────────────── */

interface Props { familyId?: string }

export default function FamilyAccount({ familyId: propId }: Props = {}) {
  const routeParams = useParams();
  const familyId = propId ?? routeParams.id;
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState("transactions");

  const filters = useTransactionFilter();
  const { accountQ, txQ, invQ, account, agingBuckets, healthRatio, statusCfg } =
    useFamilyAccount({
      familyId,
      txPage: filters.txPage,
      txType: filters.txType,
      activeTab,
    });

  const simulator = usePaymentSimulator(account);

  /* ── Guards ─────────────────────────────────────── */

  if (!familyId) {
    return (
      <PageContainer title="Cuenta Familiar">
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="Sin familia asociada"
          description="No se encontró una familia vinculada a tu cuenta."
        />
      </PageContainer>
    );
  }

  if (accountQ.isLoading) {
    return (
      <PageContainer title="Cuenta Familiar" subtitle="Cargando…">
        <div className="family-account grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl mt-6" />
      </PageContainer>
    );
  }

  if (accountQ.error || !account) {
    return (
      <PageContainer title="Cuenta Familiar">
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="Error al cargar cuenta"
          description="No se pudo obtener la información. Intentá de nuevo."
          action={
            <Button variant="secondary" onClick={() => accountQ.refetch()}>
              Reintentar
            </Button>
          }
        />
      </PageContainer>
    );
  }

  /* ── Render ─────────────────────────────────────── */

  return (
    <PageContainer
      title="Cuenta Familiar"
      subtitle={account.family_name}
      actions={
        <div className="flex items-center gap-2">
          <ExportButton
            module="family-account"
            onPrint={() => showToast({ type: "info", message: "Vista de impresión lista" })}
          />
          {account.balance > 0 && (
            <Button
              variant="primary"
              onClick={() => showToast({ type: "info", message: "Flujo de pago — conectar con finance_payment_process" })}
              icon={<CreditCard className="w-4 h-4" />}
              className="bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110 font-semibold"
            >
              Realizar Pago
            </Button>
          )}
        </div>
      }
    >
      {/* ═══ Scorecard — siempre visible ═══ */}
      <AccountScorecard
        account={account}
        healthRatio={healthRatio}
        statusCfg={statusCfg}
        simBalance={simulator.hasSim ? simulator.simBalance : undefined}
        isSimulating={simulator.hasSim}
      />

      {/* ═══ Aging + Simulator — siempre visibles ═══ */}
      {account.balance > 0 && (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.2, ease: EASE }}
        >
          <AgingWaterfall
            buckets={simulator.hasSim && simulator.simAging ? simulator.simAging : agingBuckets}
            isSimulated={simulator.hasSim}
          />
          <PaymentSimulator simulator={simulator} account={account} />
        </motion.div>
      )}

      {/* ═══ Tabs — solo la lista cambia ═══ */}
      <motion.div
        className="mt-6"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.3, ease: EASE }}
      >
        <DetailTabs
          tabs={TABS}
          active={activeTab}
          onChange={(id) => setActiveTab(id)}
          ariaLabel="Transacciones y facturas"
        />

        <AnimatePresence mode="wait">
          {activeTab === "transactions" && (
            <motion.div
              key="tx"
              initial={{ opacity: 0, x: reduced ? 0 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : 8 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <TransactionTimeline
                txQ={txQ}
                txType={filters.txType}
                onTypeChange={filters.handleTypeChange}
                onPagePrev={filters.goPrev}
                onPageNext={filters.goNext}
              />
            </motion.div>
          )}

          {activeTab === "invoices" && (
            <motion.div
              key="inv"
              initial={{ opacity: 0, x: reduced ? 0 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : 8 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <InvoiceJourney invQ={invQ} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PageContainer>
  );
}