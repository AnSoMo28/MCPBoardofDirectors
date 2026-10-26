// src/shared/lib/advisor-engine/evolution-proposer.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Evolution Proposer (F55)
//
// Takes a SystemHealthReport from the analyzer and generates
// actionable EvolutionProposals for self-improvement.
//
// Proposal generation is deterministic — no LLM, no API calls.
// Each proposal includes:
//   - Clear description + evidence
//   - Expected impact
//   - Implementation details (what to change)
//   - Confidence score
//   - Effort estimate
//
// Persists proposals to localStorage for manager review.
// Tracks proposal outcomes for the "LEARN" phase.
//
// Proposal lifecycle:
//   pending → approved → implemented → outcome tracked
//   pending → rejected
//   pending → expired (30 days)
//
// Depends on:
//   ./evolution-types (all types)
//   ./system-analyzer (SystemHealthReport, AnalyzerDataSources)
//   ./nl-rule-store (toggleCustomRule, updateRuleStatus)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  EvolutionProposal,
  SystemHealthReport,
  EvolutionEvent,
  SuppressionDecision,
} from "./evolution-types";
import type {
  RulePerformanceScore,
  RedundantPair,
  CoverageGap,
  ConfidenceDrift,
} from "./evolution-types";
import {
  updateRuleStatus,
} from "./nl-rule-store";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — LOCAL STORAGE
// ═══════════════════════════════════════════════════════════

const PROPOSALS_KEY = "ccc_evolution_proposals";
const EVENTS_KEY = "ccc_evolution_events";
const AWARENESS_HISTORY_KEY = "ccc_awareness_history";
const MAX_PROPOSALS = 50;
const MAX_EVENTS = 100;
const MAX_HISTORY = 20;
const PROPOSAL_EXPIRY_DAYS = 30;

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MAIN PROPOSER
// ═══════════════════════════════════════════════════════════

/**
 * Generate evolution proposals from a SystemHealthReport.
 * Each detected issue maps to one or more proposals.
 * Proposals are persisted to localStorage.
 */
export function generateProposals(
  report: SystemHealthReport,
): EvolutionProposal[] {
  const proposals: EvolutionProposal[] = [];
  const now = Date.now();

  // ── From critical rules ──
  for (const score of report.ruleScores) {
    if (score.compositeScore < 25 && score.evaluationCount >= 10) {
      proposals.push(buildSuppressionProposal(score, now));
    }
  }

  // ── From redundant pairs ──
  for (const pair of report.redundantPairs) {
    if (pair.isHighlyRedundant) {
      proposals.push(buildMergeProposal(pair, now));
    }
  }

  // ── From coverage gaps ──
  for (const gap of report.coverageGaps) {
    if (gap.severity === "high" || gap.severity === "medium") {
      proposals.push(buildCoverageProposal(gap, now));
    }
  }

  // ── From confidence drifts ──
  for (const drift of report.confidenceDrifts) {
    if (drift.driftType === "major_drift" || drift.driftType === "critical_drift") {
      proposals.push(buildDriftProposal(drift, now));
    }
  }

  // ── From suppression decisions ──
  for (const decision of report.suppressionDecisions) {
    if (decision.executionMode === "propose_for_approval") {
      proposals.push(buildSuppressionApprovalProposal(decision, now));
    }
  }

  // ── From self-awareness improvements ──
  for (const improvement of report.selfAwarenessScore.topImprovements) {
    if (improvement.impact === "high") {
      proposals.push(buildImprovementProposal(improvement, now));
    }
  }

  // ── Deduplicate against existing proposals ──
  const existing = getStoredProposals();
  const existingKeys = new Set(
    existing.map((p) => `${p.type}:${p.affectedRules.join(",")}:${p.title}`),
  );

  const unique = proposals.filter((p) => {
    const key = `${p.type}:${p.affectedRules.join(",")}:${p.title}`;
    return !existingKeys.has(key);
  });

  // ── Persist ──
  const merged = [...unique, ...existing].slice(0, MAX_PROPOSALS);
  storeProposals(merged);

  // ── Log evolution event ──
  if (unique.length > 0) {
    logEvent({
      actionType: "system_health_check",
      trigger: "system",
      triggeredBy: "system-analyzer",
      description: `${unique.length} nueva(s) propuesta(s) generadas. ${report.summary}`,
      affectedRules: unique.flatMap((p) => p.affectedRules),
      affectedDomains: [...new Set(unique.flatMap((p) => p.affectedDomains))],
      confidence: report.selfAwarenessScore.overall,
    });
  }

  return unique;
}

/**
 * Execute an approved proposal.
 * Returns true if the implementation succeeded.
 */
export function implementProposal(
  proposalId: string,
): { success: boolean; message: string; event?: EvolutionEvent } {
  const proposals = getStoredProposals();
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return { success: false, message: "Propuesta no encontrada." };

  const proposal = proposals[idx];
  if (proposal.status !== "approved") {
    return { success: false, message: `Estado actual: ${proposal.status}. Solo se pueden implementar propuestas aprobadas.` };
  }

  let success = false;
  let message = "";

  try {
    switch (proposal.type) {
      case "suppress_rule": {
        const ruleId = proposal.implementationDetails?.suppressRuleId ?? proposal.affectedRules[0];
        if (ruleId) {
          updateRuleStatus(ruleId, "paused");
          success = true;
          message = `Regla ${ruleId} pausada automáticamente.`;
        }
        break;
      }

      case "reactivate_rule": {
        const ruleId = proposal.affectedRules[0];
        if (ruleId) {
          updateRuleStatus(ruleId, "active");
          success = true;
          message = `Regla ${ruleId} reactivada.`;
        }
        break;
      }

      case "merge_rules":
      case "create_rule":
      case "adjust_threshold":
      case "improve_coverage":
      case "recalibrate_rule":
        // These require manual implementation or more complex logic
        // Mark as needing manual action
        success = true;
        message = `Propuesta marcada como implementada. Cambio manual requerido para: ${proposal.type}`;
        break;
    }

    if (success) {
      proposal.status = "implemented";
      proposals[idx] = proposal;
      storeProposals(proposals);

      const event = logEvent({
        actionType: proposal.type === "suppress_rule" ? "rule_suppressed"
          : proposal.type === "reactivate_rule" ? "rule_reactivated"
            : proposal.type === "merge_rules" ? "rule_merged"
              : "coverage_improved",
        trigger: "system",
        triggeredBy: `proposal_${proposalId}`,
        description: `Implementado: ${proposal.title}. ${message}`,
        affectedRules: proposal.affectedRules,
        affectedDomains: proposal.affectedDomains,
        confidence: proposal.confidence,
      });

      return { success: true, message, event };
    }
  } catch (e) {
    return {
      success: false,
      message: `Error al implementar: ${e instanceof Error ? e.message : "desconocido"}`,
    };
  }

  return { success: false, message: "Tipo de propuesta no soportado para implementación automática." };
}

/**
 * Manager approves a proposal.
 */
export function approveProposal(
  proposalId: string,
  reason?: string,
): boolean {
  const proposals = getStoredProposals();
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  proposals[idx] = {
    ...proposals[idx],
    status: "approved",
    managerResponse: {
      response: "approved",
      reason,
      respondedAt: Date.now(),
    },
  };

  storeProposals(proposals);
  return true;
}

/**
 * Manager rejects a proposal.
 */
export function rejectProposal(
  proposalId: string,
  reason?: string,
): boolean {
  const proposals = getStoredProposals();
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  proposals[idx] = {
    ...proposals[idx],
    status: "rejected",
    managerResponse: {
      response: "rejected",
      reason,
      respondedAt: Date.now(),
    },
  };

  storeProposals(proposals);

  logEvent({
    actionType: "system_health_check",
    trigger: "human",
    triggeredBy: "manager",
    description: `Propuesta rechazada: ${proposals[idx].title}. Razón: ${reason ?? "No especificada"}`,
    affectedRules: proposals[idx].affectedRules,
    affectedDomains: proposals[idx].affectedDomains,
    confidence: 100,
    outcome: "neutral",
  });

  return true;
}

/**
 * Mark proposal outcome (positive/negative/neutral).
 * Called after implementation has been running for some time.
 */
export function markProposalOutcome(
  proposalId: string,
  outcome: "positive" | "neutral" | "negative",
): boolean {
  const proposals = getStoredProposals();
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return false;

  logEvent({
    actionType: "system_health_check",
    trigger: "system",
    triggeredBy: `outcome_tracking_${proposalId}`,
    description: `Outcome de propuesta "${proposals[idx].title}": ${outcome}`,
    affectedRules: proposals[idx].affectedRules,
    affectedDomains: proposals[idx].affectedDomains,
    confidence: proposals[idx].confidence,
    outcome,
  });

  return true;
}

/**
 * Expire old pending proposals.
 */
export function expireOldProposals(): number {
  const proposals = getStoredProposals();
  const now = Date.now();
  const expiryMs = PROPOSAL_EXPIRY_DAYS * 86_400_000;
  let expired = 0;

  const updated = proposals.map((p) => {
    if (p.status === "pending" && now - p.proposedAt > expiryMs) {
      expired++;
      return { ...p, status: "expired" as const };
    }
    return p;
  });

  if (expired > 0) storeProposals(updated);
  return expired;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — PROPOSAL BUILDERS
// ═══════════════════════════════════════════════════════════

function buildSuppressionProposal(
  score: RulePerformanceScore,
  now: number,
): EvolutionProposal {
  const reasonText = score.triggerCount === 0
    ? "nunca se activó"
    : score.actionCount === 0
      ? "fue ignorada consistentemente"
      : "tasa de éxito muy baja";

  return {
    id: `prop_suppress_${score.ruleId}_${now}`,
    proposedAt: now,
    type: "suppress_rule",
    priority: score.compositeScore < 10 ? "high" : "medium",
    title: `Suprimir regla: "${score.ruleTitle}"`,
    description: `La regla "${score.ruleTitle}" tiene un score de ${score.compositeScore}/100. ${reasonText} durante ${score.evaluationCount} evaluaciones.`,
    evidence: [
      `Score compuesto: ${score.compositeScore}/100 (tier: ${score.tier})`,
      `Trigger rate: ${Math.round(score.triggerRate * 100)}% (${score.triggerCount}/${score.evaluationCount})`,
      `Action rate: ${Math.round(score.actionRate * 100)}% (${score.actionCount}/${score.triggerCount})`,
      `Success rate: ${Math.round(score.successRate * 100)}%`,
      `Confianza calibrada: ${Math.round(score.calibratedConfidence * 100)}%`,
    ],
    expectedImpact: {
      area: "Reducción de ruido",
      description: `Eliminar insights no accionables. Menos distracción para el manager.`,
    },
    affectedRules: [score.ruleId],
    affectedDomains: [score.domain],
    confidence: Math.round(100 - score.compositeScore),
    effort: "low",
    status: "pending",
    implementationDetails: {
      suppressRuleId: score.ruleId,
    },
  };
}

function buildMergeProposal(
  pair: RedundantPair,
  now: number,
): EvolutionProposal {
  return {
    id: `prop_merge_${pair.ruleIdA}_${pair.ruleIdB}_${now}`,
    proposedAt: now,
    type: "merge_rules",
    priority: pair.isHighlyRedundant ? "medium" : "low",
    title: `Fusionar: "${pair.ruleTitleA}" + "${pair.ruleTitleB}"`,
    description: pair.mergeDescription,
    evidence: [
      `Co-ocurrencia: ${Math.round(pair.coOccurrenceRate * 100)}% (${pair.coOccurrenceCount} veces juntas)`,
      `Regla más fuerte: ${pair.strongerRuleId}`,
      `Redundancia ${pair.isHighlyRedundant ? "alta" : "moderada"}`,
    ],
    expectedImpact: {
      area: "Simplificación",
      description: "Reducir ruido de alertas duplicadas. Un solo insight claro en vez de dos repetidos.",
    },
    affectedRules: [pair.ruleIdA, pair.ruleIdB],
    affectedDomains: [pair.domain],
    confidence: pair.confidence,
    effort: "medium",
    status: "pending",
    implementationDetails: {
      mergeRuleIds: [pair.ruleIdA, pair.ruleIdB],
      mergedRuleText: `Fusionar "${pair.ruleTitleA}" y "${pair.ruleTitleB}" en una sola regla que combine ambas condiciones.`,
    },
  };
}

function buildCoverageProposal(
  gap: CoverageGap,
  now: number,
): EvolutionProposal {
  const suggestedRule = gap.suggestedRule;

  return {
    id: `prop_coverage_${gap.id}_${now}`,
    proposedAt: now,
    type: "improve_coverage",
    priority: gap.severity === "high" ? "high" : "medium",
    title: `Cubrir brecha: ${gap.description.slice(0, 60)}`,
    description: gap.description,
    evidence: [
      `Tipo de brecha: ${gap.gapType}`,
      `Severidad: ${gap.severity}`,
      `Observaciones: ${gap.observationCount}`,
      `Dominios afectados: ${gap.domains.join(", ")}`,
    ],
    expectedImpact: {
      area: "Cobertura del sistema",
      description: suggestedRule
        ? `Agregar regla: "${suggestedRule.title}" para monitorear ${suggestedRule.metricPath}`
        : `Agregar monitoreo para la brecha detectada en ${gap.domains.join(", ")}`,
      metric: suggestedRule?.metricPath,
    },
    affectedRules: [],
    affectedDomains: gap.domains,
    confidence: gap.confidence,
    effort: "low",
    status: "pending",
    implementationDetails: suggestedRule
      ? {
          newRule: {
            title: suggestedRule.title,
            metricPath: suggestedRule.metricPath,
            operator: suggestedRule.operator,
            threshold: suggestedRule.threshold,
            unit: suggestedRule.unit,
            action: suggestedRule.action,
            domain: suggestedRule.domain,
          },
          targetMetric: suggestedRule.metricPath,
        }
      : undefined,
  };
}

function buildDriftProposal(
  drift: ConfidenceDrift,
  now: number,
): EvolutionProposal {
  return {
    id: `prop_drift_${drift.ruleId}_${now}`,
    proposedAt: now,
    type: drift.driftType === "critical_drift" ? "suppress_rule" : "recalibrate_rule",
    priority: drift.driftType === "critical_drift" ? "high" : "medium",
    title: `${drift.driftType === "critical_drift" ? "Suprimir" : "Recalibrar"}: "${drift.ruleTitle}"`,
    description: drift.explanation,
    evidence: [
      `Confianza actual: ${Math.round(drift.currentConfidence * 100)}%`,
      `Confianza hace 30 días: ${Math.round(drift.confidence30dAgo * 100)}%`,
      `Deriva: ${drift.driftAbsolute > 0 ? "+" : ""}${Math.round(drift.driftPct)}%`,
      `Tipo: ${drift.driftType}`,
      `Dirección: ${drift.direction}`,
    ],
    expectedImpact: {
      area: "Calibración",
      description: drift.driftType === "critical_drift"
        ? "Suprimir regla no confiable hasta recalibrar."
        : "Recalibrar con datos recientes para restaurar precisión.",
    },
    affectedRules: [drift.ruleId],
    affectedDomains: [drift.domain],
    confidence: Math.round(70 + drift.driftPct),
    effort: drift.driftType === "critical_drift" ? "low" : "medium",
    status: "pending",
    implementationDetails: {
      suppressRuleId: drift.driftType === "critical_drift" ? drift.ruleId : undefined,
    },
  };
}

function buildSuppressionApprovalProposal(
  decision: SuppressionDecision,
  now: number,
): EvolutionProposal {
  const reasonLabels: Record<SuppressionDecision["reason"], string> = {
    never_triggered: "nunca se activó",
    always_ignored: "siempre fue ignorada",
    low_success_rate: "tasa de éxito muy baja",
    confidence_collapse: "colapso de confianza",
    redundant: "es redundante con otra regla",
    manager_paused: "fue pausada por el manager",
  };

  return {
    id: `prop_auto_suppress_${decision.ruleId}_${now}`,
    proposedAt: now,
    type: "suppress_rule",
    priority: decision.confidence > 80 ? "high" : "medium",
    title: `Auto-suprimir: "${decision.ruleTitle}"`,
    description: `El sistema recomienda suprimir "${decision.ruleTitle}" porque ${reasonLabels[decision.reason]}.`,
    evidence: [
      `Razón: ${reasonLabels[decision.reason]}`,
      `Evaluaciones: ${decision.evidence.evaluationCount}`,
      `Triggers: ${decision.evidence.triggerCount}`,
      `Acciones: ${decision.evidence.actionCount}`,
      `Confianza actual: ${Math.round(decision.evidence.currentConfidence * 100)}%`,
    ],
    expectedImpact: {
      area: "Auto-limpieza",
      description: `Eliminar regla que consume recursos sin generar valor.`,
    },
    affectedRules: [decision.ruleId],
    affectedDomains: [decision.domain],
    confidence: decision.confidence,
    effort: "low",
    status: "pending",
    implementationDetails: {
      suppressRuleId: decision.ruleId,
    },
  };
}

function buildImprovementProposal(
  improvement: { area: string; description: string; impact: "high" | "medium" | "low"; effort: "low" | "medium" | "high" },
  now: number,
): EvolutionProposal {
  return {
    id: `prop_improve_${improvement.area.toLowerCase().replace(/\s+/g, "_")}_${now}`,
    proposedAt: now,
    type: "improve_coverage",
    priority: improvement.impact as "high" | "medium" | "low",
    title: `Mejorar: ${improvement.area}`,
    description: improvement.description,
    evidence: [
      `Área: ${improvement.area}`,
      `Impacto estimado: ${improvement.impact}`,
      `Esfuerzo estimado: ${improvement.effort}`,
    ],
    expectedImpact: {
      area: improvement.area,
      description: improvement.description,
    },
    affectedRules: [],
    affectedDomains: ["global"],
    confidence: 70,
    effort: improvement.effort as "low" | "medium" | "high",
    status: "pending",
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — PERSISTENCE
// ═══════════════════════════════════════════════════════════

export function getStoredProposals(): EvolutionProposal[] {
  try {
    const raw = localStorage.getItem(PROPOSALS_KEY);
    return raw ? (JSON.parse(raw) as EvolutionProposal[]) : [];
  } catch {
    return [];
  }
}

function storeProposals(proposals: EvolutionProposal[]): void {
  try {
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[EvolutionProposer] Failed to store proposals:", e);
    }
  }
}

export function getStoredEvents(): EvolutionEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as EvolutionEvent[]) : [];
  } catch {
    return [];
  }
}

function logEvent(params: Omit<EvolutionEvent, "id" | "timestamp">): EvolutionEvent {
  const event: EvolutionEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    ...params,
  };

  try {
    const existing = getStoredEvents();
    const updated = [event, ...existing].slice(0, MAX_EVENTS);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[EvolutionProposer] Failed to log event:", e);
    }
  }

  return event;
}

/**
 * Store self-awareness score in history.
 */
export function storeAwarenessHistory(score: number): void {
  try {
    const raw = localStorage.getItem(AWARENESS_HISTORY_KEY);
    const history: Array<{ score: number; timestamp: number }> = raw ? JSON.parse(raw) : [];
    const updated = [{ score, timestamp: Date.now() }, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(AWARENESS_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

export function getAwarenessHistory(): Array<{ score: number; timestamp: number }> {
  try {
    const raw = localStorage.getItem(AWARENESS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get proposal statistics.
 */
export function getProposalStats(): {
  total: number;
  pending: number;
  approved: number;
  implemented: number;
  rejected: number;
  expired: number;
  positiveOutcomes: number;
  implementationRate: number;
} {
  const proposals = getStoredProposals();
  const events = getStoredEvents();

  const pending = proposals.filter((p) => p.status === "pending").length;
  const approved = proposals.filter((p) => p.status === "approved").length;
  const implemented = proposals.filter((p) => p.status === "implemented").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const expired = proposals.filter((p) => p.status === "expired").length;
  const positiveOutcomes = events.filter(
    (e) => e.actionType !== "system_health_check" && e.outcome === "positive",
  ).length;

  const totalDecided = approved + implemented + rejected;
  const implementationRate = totalDecided > 0
    ? Math.round((implemented / totalDecided) * 100)
    : 0;

  return {
    total: proposals.length,
    pending,
    approved,
    implemented,
    rejected,
    expired,
    positiveOutcomes,
    implementationRate,
  };
}

/**
 * Clear all evolution data (for testing/reset).
 */
export function clearEvolutionData(): void {
  localStorage.removeItem(PROPOSALS_KEY);
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(AWARENESS_HISTORY_KEY);
}