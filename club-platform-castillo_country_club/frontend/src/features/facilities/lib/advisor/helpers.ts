// src/features/facilities/lib/advisor/helpers.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — Helper Functions
//
// Pure utilities shared by all advisor rules:
//   - makeTrigger: config-derived action builder
//   - severityFromThresholds: threshold-based severity
//   - severityFromTrend: trend-based severity
//   - severityFromRange: range-based severity
//   - impactFromThreshold: impact level from value vs threshold
//   - impactFromDelta: impact level from percentage change
//   - buildInsight: standardized insight constructor
// ═══════════════════════════════════════════════════════════════

import type {
  FacilitiesAdvisorInsight,
  FacilitiesAdvisorLayer,
  FacilitiesAdvisorSeverity,
} from "../../types";

import type { AdvisorCommand } from "@/shared/types/ai-intelligence";

import { generateInsightId } from "@/shared/types/ai-intelligence";

import {
  buildAdvisorCommand
} from "../../config";
// ═══════════════════════════════════════════════════════════════
// ACTION BUILDER — Config-derived
//
// Wraps buildAdvisorCommand from config.ts so rules
// don't need to know server/tool names.
// ═══════════════════════════════════════════════════════════════

export function makeTrigger(
  actionType: "maint-schedule" | "issue-report" | "inspection-create" | "facility-update",
  params: Record<string, unknown>,
): AdvisorCommand {
  return buildAdvisorCommand(actionType, params);
}

// ═══════════════════════════════════════════════════════════════
// SEVERITY CALCULATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Threshold-based severity: compare a value against a threshold.
 * Used by rules FR1-FR5, FR9, FR14.
 */
export function severityFromThreshold(
  value: number,
  threshold: number,
  direction: "below" | "above",
): FacilitiesAdvisorSeverity {
  const gap = direction === "below"
    ? threshold - value
    : value - threshold;

  if (gap > threshold * 0.5) return "critical";
  if (gap > threshold * 0.2) return "warning";
  return "info";
}

/**
 * Trend-based severity: compare current vs previous period.
 * Used by rules FR6, FR10, FR11.
 */
export function severityFromTrend(
  _currentPct: number,
  changePct: number,
  warningThreshold: number,
  criticalThreshold: number,
): FacilitiesAdvisorSeverity {
  if (Math.abs(changePct) > criticalThreshold) return "critical";
  if (Math.abs(changePct) > warningThreshold) return "warning";
  return "info";
}

/**
 * Range-based severity: check if value is outside an acceptable range.
 * Used by rules FR7, FR8, FR12, FR13.
 */
export function severityFromRange(
  value: number,
  minAcceptable: number,
  maxAcceptable: number,
): FacilitiesAdvisorSeverity {
  if (value < minAcceptable * 0.5 || value > maxAcceptable * 1.5) return "critical";
  if (value < minAcceptable || value > maxAcceptable) return "warning";
  return "info";
}

/**
 * Impact level for AdvisorInsightBase. Maps severity to impact.
 */
export function impactFromSeverity(
  severity: FacilitiesAdvisorSeverity,
): "high" | "medium" | "low" {
  switch (severity) {
    case "critical": return "high";
    case "warning": return "medium";
    case "opportunity": return "low";
    case "info": return "low";
  }
}

// ═══════════════════════════════════════════════════════════════
// INSIGHT BUILDER — Standardized construction
// ═══════════════════════════════════════════════════════════════

/**
 * Build a FacilitiesAdvisorInsight with all required fields.
 * Centralizes construction so rules are DRY.
 */
export function buildInsight(
  ruleId: string,
  title: string,
  reasoning: string,
  layer: FacilitiesAdvisorLayer,
  severity: FacilitiesAdvisorSeverity,
  confidence: number,
  action?: AdvisorCommand,
  targetView?: string,
): FacilitiesAdvisorInsight {
  return {
    id: generateInsightId("facilities", ruleId),
    impact: impactFromSeverity(severity),
    title,
    reasoning,
    confidence: Math.min(95, Math.max(40, confidence)),
    layer,
    domain: "facilities",
    severity,
    // Fields required by FacilitiesAdvisorInsight
    actionable: !!action,
    threshold: undefined,
    command: action,
    action,
    ...(targetView ? { target_view: targetView } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════
// FORMATTERS — Human-readable descriptions for rules
// ═══════════════════════════════════════════════════════════════

export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `₡${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `₡${(amount / 1_000).toFixed(0)}k`;
  }
  return `₡${amount.toLocaleString("es-CR")}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatHealthPct(pct: number): string {
  if (pct >= 90) return `${pct}% (excelente)`;
  if (pct >= 75) return `${pct}% (bueno)`;
  if (pct >= 50) return `${pct}% (regular)`;
  if (pct >= 25) return `${pct}% (deficiente)`;
  return `${pct}% (crítico)`;
}

export function formatDaysToFailure(days: number): string {
  if (days <= 7) return `${days} días (INMINENTE)`;
  if (days <= 30) return `${days} días (urgente)`;
  if (days <= 90) return `${days} días`;
  return `${Math.round(days / 30)} meses`;
}