// src/shared/hooks/useEvolutionAlerts.ts
// ═══════════════════════════════════════════════════════════
// Hook: Evolution Alerts for NotificationCenter (F57-B7)
//
// Reads evolution results from localStorage and returns
// an array of notifications for the NotificationCenter.
//
// Lightweight: only reads from localStorage, no computation.
//
// Rules: #9 (defensive data)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { getEvolutionAlerts, type EvolutionNotification } from "@/shared/lib/advisor-engine/alert-dispatcher";

/**
 * Get evolution-based notifications from the Self-Awareness system.
 * Returns an empty array if no evolution data is available.
 */
export function useEvolutionAlerts(): EvolutionNotification[] {
  return useMemo(() => getEvolutionAlerts(), []);
}