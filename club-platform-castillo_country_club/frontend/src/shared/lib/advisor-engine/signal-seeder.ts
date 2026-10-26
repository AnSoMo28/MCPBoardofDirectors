// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Cross-Domain Signal Seeder
// F47-D — Enables fusion rules R26-R29 without visiting pages
//
// Pure function: takes already-loaded data, returns DomainSignal[].
// No hooks, no API calls, no side effects.
//
// Seeds 4 signals from data already available in useGlobalData:
//   - fin_revenue_decline (from aiReport)
//   - fin_margin_pressure (from aiReport)
//   - evt_capacity_alert (from calendarDays)
//   - evt_low_engagement (from calendarDays)
//
// The other 10 signals (comm_*, spt_*, age_*, guest_*, sat_*,
// ml_*, rec_*) are emitted when user visits those pages or
// when ThePulse on-demand queries load. This is correct —
// those are secondary domains.
//
// Usage:
//   const seeded = seedCrossDomainSignals(aiReport, calendarDays);
//   const merged = mergeWithBusSignals(seeded);
//   // pass merged to useGlobalAdvisor → useAdvisorEngine(config, data, merged)
// ═══════════════════════════════════════════════════════════

import type { DomainSignal } from "./types";
import { createSignal } from "./types";
import { signalBus } from "./signal-bus";
import type { AiFinancialReport } from "@/features/finance/types";
import type { CalendarDay } from "@/features/events/types";
import type { AIDomain } from "@/shared/types/ai-intelligence";

// ── Signal Definitions ─────────────────────────────────────
// These match the emitSignals on financial and event rules.
// targetDomains: ["global"] because these signals are consumed
// by Global Advisor rules R2, R13, R14, R16.

const FIN_REVENUE_DECLINE = {
  id: "fin_revenue_decline" as const,
  defaultSeverity: "high" as const,
  label: "Revenue decline detected",
  targetDomains: ["global" as AIDomain],
};

const FIN_MARGIN_PRESSURE = {
  id: "fin_margin_pressure" as const,
  defaultSeverity: "medium" as const,
  label: "Margin pressure detected",
  targetDomains: ["global" as AIDomain],
};

const EVT_CAPACITY_ALERT = {
  id: "evt_capacity_alert" as const,
  defaultSeverity: "medium" as const,
  label: "Event capacity near limit",
  targetDomains: ["global" as AIDomain],
};

const EVT_LOW_ENGAGEMENT = {
  id: "evt_low_engagement" as const,
  defaultSeverity: "medium" as const,
  label: "Low event engagement",
  targetDomains: ["global" as AIDomain],
};

// ── Seeder ─────────────────────────────────────────────────

/**
 * Seed cross-domain signals from already-loaded data.
 * These signals enable Global Advisor fusion rules (R2, R13,
 * R14, R16, R26-R29) without requiring the user to visit
 * the Financial or Events pages first.
 */
export function seedCrossDomainSignals(
  aiReport: AiFinancialReport | undefined | null,
  calendarDays: CalendarDay[] | undefined | null,
): DomainSignal[] {
  const signals: DomainSignal[] = [];

  // ── Financial signals ────────────────────────────────────

  if (aiReport) {
    const health = aiReport.health_score.total;
    const criticalCount = aiReport.financial_anomalies.filter(
      (a) => a.severity === "critical",
    ).length;

    // fin_revenue_decline: health below threshold OR critical anomalies
    if (health < 65 || criticalCount > 0) {
      signals.push(
        createSignal(
          FIN_REVENUE_DECLINE,
          "financial",
          100 - health, // Higher = worse (matches signal convention)
        ),
      );
    }

    // fin_margin_pressure: expense anomalies with significant overrun
    const expenseSpikes = aiReport.financial_anomalies.filter(
      (a) => a.domain === "expense" && a.deviation_pct > 15,
    );
    if (expenseSpikes.length > 0) {
      const maxDev = Math.max(...expenseSpikes.map((a) => a.deviation_pct));
      signals.push(
        createSignal(FIN_MARGIN_PRESSURE, "financial", maxDev),
      );
    }
  }

  // ── Event signals ────────────────────────────────────────

  if (calendarDays?.length) {
    const allEvents = calendarDays.flatMap((d) => d.events ?? []);
    const withCapacity = allEvents.filter((e) => e.max_capacity > 0);

    if (withCapacity.length > 0) {
      // evt_capacity_alert: any event above 85% capacity
      const nearCapacity = withCapacity.filter(
        (e) => e.current_attendance / e.max_capacity > 0.85,
      );
      if (nearCapacity.length > 0) {
        const maxUtil = Math.max(
          ...nearCapacity.map(
            (e) => (e.current_attendance / e.max_capacity) * 100,
          ),
        );
        signals.push(
          createSignal(EVT_CAPACITY_ALERT, "events", maxUtil),
        );
      }

      // evt_low_engagement: average attendance below 40%
      const avgUtil =
        withCapacity.reduce(
          (sum, e) =>
            sum + (e.current_attendance / e.max_capacity) * 100,
          0,
        ) / withCapacity.length;
      if (avgUtil < 40) {
        signals.push(
          createSignal(EVT_LOW_ENGAGEMENT, "events", avgUtil),
        );
      }
    }
  }

  return signals;
}

/**
 * Merge seeded signals with signals from the Signal Bus.
 * Seeded signals take precedence (based on fresh query data).
 * Bus signals fill gaps from pages the user already visited.
 */
export function mergeWithBusSignals(
  seeded: DomainSignal[],
): DomainSignal[] {
  const busSignals = signalBus.getAllSignals();
  const seen = new Set(seeded.map((s) => s.signalDefId));
  const merged = [...seeded];

  for (const s of busSignals) {
    if (!seen.has(s.signalDefId)) {
      merged.push(s);
    }
  }

  return merged;
}