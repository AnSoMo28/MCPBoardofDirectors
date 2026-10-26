// src/features/finance/hooks/useTransactionFilter.ts
import { useState, useCallback } from "react";

export function useTransactionFilter() {
  const [txPage, setTxPage] = useState(1);
  const [txType, setTxType] = useState("");

  const handleTypeChange = useCallback((type: string) => {
    setTxType(type);
    setTxPage(1);
  }, []);

  const goPrev = useCallback(() => setTxPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback((max: number) => setTxPage((p) => Math.min(max, p + 1)), []);

  return { txPage, txType, handleTypeChange, goPrev, goNext };
}