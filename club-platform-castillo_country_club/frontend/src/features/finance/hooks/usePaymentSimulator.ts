// src/features/finance/hooks/usePaymentSimulator.ts
import { useState, useMemo, useCallback } from "react";
import type { FamilyAccountData } from "../types";
import type { AgingBucket } from "./useFamilyAccount";

export function usePaymentSimulator(account: FamilyAccountData | undefined) {
  const [simAmount, setSimAmount] = useState(0);

  const maxPayment = account?.balance ?? 0;
  const effective = Math.min(simAmount, maxPayment);

  const simBalance = (account?.balance ?? 0) - effective;

  /* Pay oldest debt first (FIFO): 90+ → 61-90 → 31-60 → 0-30 */
  const simAging: AgingBucket[] | null = useMemo(() => {
    if (!account || account.balance <= 0) return null;
    const b90p = account.aging_90_plus * 0.6;
    const b61  = account.aging_90_plus * 0.4;
    const b31  = account.aging_60;
    const b0   = account.aging_30;

    let rem = effective;
    const pay = (bucket: number) => { const p = Math.min(rem, bucket); rem -= p; return bucket - p; };

    const new90p = pay(b90p);
    const new61  = pay(b61);
    const new31  = pay(b31);
    const new0   = pay(b0);
    const total  = new0 + new31 + new61 + new90p;
    const pctOf  = (v: number) => (total > 0 ? (v / total) * 100 : 0);

    return [
      { label: "0 – 30d",  value: new0,   color: "var(--color-emerald-400)",    pct: pctOf(new0) },
      { label: "31 – 60d", value: new31,  color: "var(--color-amber-400)",      pct: pctOf(new31) },
      { label: "61 – 90d", value: new61,  color: "var(--color-terracotta-400)", pct: pctOf(new61) },
      { label: "90+ d",    value: new90p, color: "var(--color-rose-400)",       pct: pctOf(new90p) },
    ];
  }, [account, effective]);

  const monthsToPayoff = useMemo(() => {
    if (!account || account.monthly_dues <= 0) return null;
    if (simBalance <= 0) return 0;
    return Math.ceil(simBalance / account.monthly_dues);
  }, [account, simBalance]);

  const reset = useCallback(() => setSimAmount(0), []);

  return {
    simAmount, setSimAmount, effective,
    simBalance, simAging, monthsToPayoff,
    maxPayment, reset, hasSim: effective > 0,
  };
}