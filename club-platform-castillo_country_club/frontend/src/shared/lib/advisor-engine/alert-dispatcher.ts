// src/shared/lib/advisor-engine/alert-dispatcher.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Evolution Alert Dispatcher (F57-B7)
//
// Reads evolution results from localStorage and generates
// notifications for the NotificationCenter.
//
// Triggers:
//   - Self-Awareness Score < 45 (critical)
//   - Proposals with "suppress_rule" type (rules underperforming)
//   - Proposals with "create_rule" type (coverage gaps)
//
// Storage key: "ccc_evolution_results" (set by useSystemEvolution)
//
// Rules: #1 tokens (no UI, just data)
// ═══════════════════════════════════════════════════════════

import type { EvolutionProposal, SelfAwarenessScore } from "./evolution-types";

// ── Types ──────────────────────────────────────────────────

export interface EvolutionNotification {
  id: string;
  type: "approval" | "event" | "anomaly" | "info";
  title: string;
  description: string;
  time: string;
  route: string;
  read: boolean;
  severity?: string;
}

interface StoredEvolutionResults {
  selfAwarenessScore?: SelfAwarenessScore;
  proposals?: EvolutionProposal[];
  storedAt?: number;
}

// ── Constants ──────────────────────────────────────────────

const STORAGE_KEY = "ccc_evolution_results";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Dispatcher ─────────────────────────────────────────────

/**
 * Get evolution-based notifications from stored results.
 * Returns an empty array if data is stale or missing.
 */
export function getEvolutionAlerts(): EvolutionNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const stored = JSON.parse(raw) as StoredEvolutionResults;
    if (!stored.storedAt || Date.now() - stored.storedAt > MAX_AGE_MS) {
      return []; // Stale data
    }

    const alerts: EvolutionNotification[] = [];
    const now = new Date().toISOString();

    // 1. Self-Awareness Score critical
    if (stored.selfAwarenessScore?.overall != null) {
      const score = stored.selfAwarenessScore.overall;
      if (score < 45) {
        alerts.push({
          id: `evo-awareness-${Math.round(score)}`,
          type: "anomaly",
          title: "Sistema AI requiere atención",
          description: `Puntuación de auto-conciencia: ${score}/100 (${stored.selfAwarenessScore.status}). Revise propuestas de mejora.`,
          time: now,
          route: "/admin/ai-system",
          read: false,
          severity: "high",
        });
      }
    }

    // 2. Critical proposals (suppress underperforming rules)
    if (stored.proposals) {
      const suppressProposals = stored.proposals.filter(
        (p) => p.type === "suppress_rule" && p.status === "pending",
      );
      for (const proposal of suppressProposals.slice(0, 2)) {
        alerts.push({
          id: `evo-suppress-${proposal.id}`,
          type: "info",
          title: "Regla con bajo rendimiento",
          description: `"${proposal.title}" — ${proposal.evidence}. Considere pausar o ajustar.`,
          time: now,
          route: "/admin/ai-system",
          read: false,
        });
      }

      // 3. Coverage gaps (create_rule proposals)
      const createProposals = stored.proposals.filter(
        (p) => p.type === "create_rule" && p.status === "pending",
      );
      if (createProposals.length > 0) {
        alerts.push({
          id: `evo-coverage-${createProposals.length}`,
          type: "info",
          title: "Brechas de cobertura detectadas",
          description: `${createProposals.length} métricas sin reglas de monitoreo. Cree reglas para mejorar la detección.`,
          time: now,
          route: "/admin/ai-system",
          read: false,
        });
      }
    }

    return alerts;
  } catch {
    return [];
  }
}