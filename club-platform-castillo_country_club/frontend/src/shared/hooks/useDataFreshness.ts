// src/shared/hooks/useDataFreshness.ts
// ═══════════════════════════════════════════════════════════
// Data Freshness — Track how stale a query's data is
//
// Accepts a React Query result object and returns:
//   - label: human-readable ("2min", "1h", "Cargando...")
//   - color: semantic color
//   - isStale: boolean
//   - age: seconds since last fetch
//
// Updates every 30s via interval.
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";

interface QueryLike {
  dataUpdatedAt?: number;
  isLoading?: boolean;
  isFetching?: boolean;
  isStale?: boolean;
}

interface FreshnessResult {
  label: string;
  color: string;
  isStale: boolean;
  age: number; // seconds
}

export function useDataFreshness(query: QueryLike): FreshnessResult {
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to keep age fresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (query.isLoading || query.isFetching) {
      return { label: "Cargando...", color: "var(--color-silver-500)", isStale: false, age: 0 };
    }

    const updatedAt = query.dataUpdatedAt;
    if (!updatedAt || updatedAt === 0) {
      return { label: "Sin datos", color: "var(--color-silver-600)", isStale: true, age: Infinity };
    }

    const ageMs = now - updatedAt;
    const ageSec = Math.floor(ageMs / 1000);
    const ageMin = Math.floor(ageSec / 60);
    const ageHr = Math.floor(ageMin / 60);

    let label: string;
    let color: string;
    let isStale: boolean;

    if (ageSec < 120) {
      label = `${ageMin > 0 ? ageMin + "min" : ageSec + "s"}`;
      color = "var(--color-emerald-400)";
      isStale = false;
    } else if (ageMin < 10) {
      label = `${ageMin}min`;
      color = "var(--color-gold-400)";
      isStale = false;
    } else if (ageMin < 60) {
      label = `${ageMin}min`;
      color = "var(--color-amber-400)";
      isStale = true;
    } else {
      label = `${ageHr}h`;
      color = "var(--color-rose-400)";
      isStale = true;
    }

    return { label, color, isStale, age: ageSec };
  }, [query.dataUpdatedAt, query.isLoading, query.isFetching, now]);
}
