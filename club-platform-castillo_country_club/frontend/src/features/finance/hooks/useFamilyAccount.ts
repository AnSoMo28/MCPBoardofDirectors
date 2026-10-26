// src/features/finance/hooks/useFamilyAccount.ts
import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { keepPreviousData } from "@tanstack/react-query";
import type {
  FamilyAccountData,
  TransactionListResponse,
  Invoice,
} from "../types";
import { ACCOUNT_STATUS_CONFIG } from "../types";

/* ── Aging bucket type ───────────────────────────── */

export interface AgingBucket {
  label: string;
  value: number;
  color: string;
  pct: number;
}

/* ── Hook ────────────────────────────────────────── */

interface Opts {
  familyId?: string;
  txPage: number;
  txType: string;
  activeTab: string;
}

export function useFamilyAccount({ familyId, txPage, txType, activeTab }: Opts) {
  const accountQ = useMCPQuery<FamilyAccountData>(
    "finance",
    "get_family_account",
    familyId ? { family_id: familyId } : {},
    { staleTime: 60_000 },
  );

  const txQ = useMCPQuery<TransactionListResponse>(
    "finance",
    "get_transactions",
    {
      ...(familyId ? { family_id: familyId } : {}),
      page: txPage,
      page_size: 15,
      ...(txType ? { type: txType } : {}),
    },
    { enabled: activeTab === "transactions", placeholderData: keepPreviousData },
  );

  const invQ = useMCPQuery<Invoice[]>(
    "finance",
    "get_invoices",
    familyId ? { family_id: familyId } : {},
    { enabled: activeTab === "invoices" },
  );

  const account = accountQ.data;

  const agingBuckets: AgingBucket[] = useMemo(() => {
    if (!account || account.balance <= 0) return [];
    const b90 = account.aging_90_plus * 0.4;
    const b90p = account.aging_90_plus * 0.6;
    const total = account.aging_30 + account.aging_60 + account.aging_90_plus;
    const pctOf = (v: number) => (total > 0 ? (v / total) * 100 : 0);
    return [
      { label: "0 – 30d",  value: account.aging_30,              color: "var(--color-emerald-400)",    pct: pctOf(account.aging_30) },
      { label: "31 – 60d", value: account.aging_60,              color: "var(--color-amber-400)",      pct: pctOf(account.aging_60) },
      { label: "61 – 90d", value: b90,                           color: "var(--color-terracotta-400)", pct: pctOf(b90) },
      { label: "90+ d",    value: b90p,                          color: "var(--color-rose-400)",       pct: pctOf(b90p) },
    ];
  }, [account]);

  const healthRatio = useMemo(() => {
    if (!account || account.monthly_dues <= 0) return 0;
    return account.balance / account.monthly_dues;
  }, [account]);

  const statusCfg = useMemo(
    () => ACCOUNT_STATUS_CONFIG[account?.status ?? "current"] ?? ACCOUNT_STATUS_CONFIG.current,
    [account],
  );

  return { accountQ, txQ, invQ, account, agingBuckets, healthRatio, statusCfg, familyId };
}