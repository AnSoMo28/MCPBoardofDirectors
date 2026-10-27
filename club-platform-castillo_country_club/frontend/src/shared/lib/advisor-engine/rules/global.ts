// src/shared/lib/advisor-engine/rules/global.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Global Advisor Rules (Declarative)
//
// 29 rules across 5 layers:
//   diagnostic (1-5, 26-27), strategy (6-11, 28),
//   prediction (12-16), innovation (17-21),
//   execution (22-25, 29).
//
// 0 API calls. Cross-agent intelligence from cached data.
//
// CONSUMES (14 signals — all cross-domain):
//   Financial:    fin_revenue_decline, fin_margin_pressure
//   Events:       evt_capacity_alert, evt_low_engagement
//   Communication: comm_delivery_critical
//   Sports:       spt_utilization_drop, spt_capacity_warning
//   AgeGroup:     age_group_imbalance
//   Guest:        guest_pipeline_alert
//   Satisfaction: sat_critical_decline
//   ML:           ml_model_degradation, ml_prediction_confidence_drop
//   Recommendation: rec_pending_actions
//
// EMITS:
//   sys_risk_change (cross-domain risk signal)
//
// B6 changes: +4 fusion rules (R26-R29), R1+R13 enhanced with
// multi-signal consumption, consumeSignals metadata on all rules.
//
// Bug fixes vs original hook (F20):
//   - Rule 8: `if (!ev) return` killed entire useMemo → now returns null per-rule
//   - 17 duplicate target_view properties → single URL
//   - Rule 5: dead code (revenue_change_pct/expense_change_pct) removed
//   - All action fields use snake_case (AdvisorCommand)
//   - All [0] assertions → safe access
//
// P5 NOTE: SEASON_CONFIG still imported from finance/types.
// ═══════════════════════════════════════════════════════════

import type { DomainSignal, RuleDefinition, HealthFactorDef, CausalChain } from "../types";
import { buildInsight } from "../evaluate";
import { computeConfidence, combineConfidences, CONFIDENCE_PRESETS } from "../confidence";
import { computeCalibratedConfidence } from "../calibration";
import type { CalibrationResult } from "../calibration-types";
import { signalBus } from "../signal-bus";
import type { RAGContext } from "../types";
import type { RAGCitation } from "@/shared/types/ai-intelligence";
import {
  compactCurrency,
  getCurrentSeason,
  MONTH_NAMES,
} from "@/shared/lib/utils";
import type { CalendarDay, EventBrief } from "@/features/events/types";
import type { ExecutiveSummaryData } from "@/features/dashboard/types";
import type { AiFinancialReport } from "@/features/finance/types";
import { SEASON_CONFIG } from "@/features/finance/types";
import type { AIDomain } from "@/shared/types/ai-intelligence";


// ── Types ───────────────────────────────────────────────

export interface GlobalContext {
  domain: "global";
  signals: DomainSignal[];
  summary: ExecutiveSummaryData | undefined;
  aiReport: AiFinancialReport | null;
  calendarDays: CalendarDay[];
  pendingApprovals: number;
  todayEvents: number;
  today: string;
  now: Date;
  upcomingDays: CalendarDay[];
  upcomingEvents: EventBrief[];
  next7Days: CalendarDay[];
  next7Events: EventBrief[];
  season: "high" | "low" | "transition";
  ragContext?: RAGContext[];
  /** Causal chains detected from cross-domain signals (F49) */
  causalChains?: CausalChain[];
  /** Calibration map for confidence adjustment (F50) */
  calibrationMap?: Map<string, CalibrationResult>;
}

// ── Context Builder ─────────────────────────────────────

export function buildGlobalCtx(
  rawData: unknown,
  signals?: readonly DomainSignal[],
): GlobalContext {
  const inputs = rawData as {
    summary?: ExecutiveSummaryData;
    aiReport?: AiFinancialReport | null;
    calendarDays: CalendarDay[];
    pendingApprovals: number;
    todayEvents: number;
    ragContext?: RAGContext[];
    causalChains?: CausalChain[];
    calibrationMap?: Map<string, CalibrationResult>;
  };
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const cal = inputs.calendarDays;

  const upcomingDays = cal.filter((d) => d.date >= today);
  const upcomingEvents = upcomingDays.flatMap((d) => d.events);

  const next7Days = upcomingDays.filter((d) => {
    const diff = Math.ceil(
      (new Date(d.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff >= 0 && diff <= 7;
  });
  const next7Events = next7Days.flatMap((d) => d.events);

  return {
    domain: "global",
    signals: [...(signals ?? signalBus.getAllSignals())],
    summary: inputs.summary,
    aiReport: inputs.aiReport ?? null,
    calendarDays: cal,
    pendingApprovals: inputs.pendingApprovals,
    todayEvents: inputs.todayEvents,
    today,
    now,
    upcomingDays,
    upcomingEvents,
    next7Days,
    next7Events,
    season: getCurrentSeason(),
    ragContext: inputs.ragContext,
    causalChains: inputs.causalChains,
    calibrationMap: inputs.calibrationMap,
  };
}

// ── Constants ───────────────────────────────────────────

const DOMAIN: AIDomain = "global";

// ── RAG Helpers (F48-C) ─────────────────────────────────

/**
 * Extract RAG citations from context for display in AdvisorBanner.
 * Filters by minimum relevance threshold.
 */
function extractCitations(ctx: GlobalContext): RAGCitation[] | undefined {
  if (!ctx.ragContext?.length) return undefined;
  const citations = ctx.ragContext
    .filter((r) => r.relevance >= 0.5)
    .map((r) => ({
      source: r.source,
      relevance: r.relevance,
      documentId: r.documentIds?.[0],
    }));
  return citations.length > 0 ? citations : undefined;
}

/**
 * Boost confidence with RAG grounding if context available.
 * Uses combineConfidences with rule (60%) + RAG (40%) weighting.
 */
function boostWithRAG(baseConfidence: number, ctx: GlobalContext): number {
  if (!ctx.ragContext?.length) return baseConfidence;
  const avgRelevance =
    ctx.ragContext.reduce((sum, r) => sum + r.relevance, 0) /
    ctx.ragContext.length;
  const totalCitations = ctx.ragContext.reduce(
    (sum, r) => sum + r.citationCount,
    0,
  );
  const ragScore = computeConfidence(
    CONFIDENCE_PRESETS.ragGrounded(avgRelevance * 100, totalCitations),
  ).score;
  return combineConfidences([
    { score: baseConfidence, weight: 0.6, source: "rule" },
    { score: ragScore, weight: 0.4, source: "rag" },
  ]);
}
/**
 * Apply calibration to a confidence score (F50).
 * Chains after boostWithRAG. If no calibration data exists,
 * returns the original confidence unchanged.
 */
function applyCalibration(
  confidence: number,
  ruleId: string,
  ctx: GlobalContext,
): number {
  if (!ctx.calibrationMap) return confidence;
  return computeCalibratedConfidence(confidence, ruleId, ctx.calibrationMap);
}
// ── Rules ───────────────────────────────────────────────

export const GLOBAL_RULES: RuleDefinition<GlobalContext>[] = [
  // ═══════════════════════════════════════════════════
  // LAYER 1: DIAGNOSTIC (rules 1–5, 26–27)
  // "¿Qué está pasando cross-agent?"
  // ═══════════════════════════════════════════════════

  // Rule 1: Systemic Risk Score
  // B6: Enhanced with ML degradation signals
  {
    id: "systemic_risk",
    name: "Systemic Risk Score",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 10,
    consumeSignals: ["ml_model_degradation", "ml_prediction_confidence_drop"],
    emitSignals: [
      {
        id: "sys_risk_change",
        defaultSeverity: "high",
        label: "Systemic risk level changed",
        targetDomains: [
          "financial",
          "events",
          "communication",
          "engagement",
        ],
      },
    ],
    evaluate: (ctx) => {
      const hasFinance = !!ctx.aiReport;
      const hasEvents = ctx.calendarDays.length > 0;

      const healthScore = ctx.aiReport?.health_score.total ?? 70;
      const criticalAnomalies = (
        ctx.aiReport?.financial_anomalies ?? []
      ).filter((a) => a.severity === "critical").length;
      const conflictDays = ctx.upcomingDays.filter(
        (d) => d.has_conflicts,
      ).length;

      // B6: ML model health signals
      const mlDegraded = ctx.signals.some(
        (s) => s.signalDefId === "ml_model_degradation",
      );
      const mlLowConfidence = ctx.signals.some(
        (s) => s.signalDefId === "ml_prediction_confidence_drop",
      );

      const riskPenalty =
        criticalAnomalies * 8 +
        conflictDays * 5 +
        (mlDegraded ? 6 : 0) +
        (mlLowConfidence ? 4 : 0);
      const systemicRisk = Math.max(
        0,
        Math.min(100, 100 - healthScore + riskPenalty),
      );
      const grade =
        systemicRisk < 25
          ? "A"
          : systemicRisk < 45
            ? "B"
            : systemicRisk < 65
              ? "C"
              : systemicRisk < 80
                ? "D"
                : "F";

      const domainsDown = [
        hasFinance && healthScore < 60,
        criticalAnomalies > 0,
        conflictDays > 0,
        ctx.pendingApprovals > 3,
        mlDegraded,
        mlLowConfidence,
      ].filter(Boolean).length;

      // F49: Causal chains amplify systemic risk
      const activeChains = ctx.causalChains?.filter((c) => c.isActive) ?? [];
      const longChains = activeChains.filter((c) => c.chainLength >= 3);
      if (domainsDown < 2 && systemicRisk <= 50 && longChains.length === 0) return null;

      // Bump risk if causal chains active
      const chainPenalty = longChains.length * 5;
      const adjustedRisk = Math.min(100, systemicRisk + chainPenalty);

      const baseConfidence = hasFinance && hasEvents ? 90 : 65;
      return buildInsight({
        id: "global_systemic_risk",
        impact: adjustedRisk > 65 ? "high" : "medium",
        title: `Riesgo sistémico: ${Math.round(adjustedRisk)}/100 (${grade})${longChains.length > 0 ? ` — ${longChains.length} cadena(s) causal(es)` : ""}`,
        reasoning: [
          `${domainsDown} dominios con señales de riesgo.`,
          criticalAnomalies > 0
            ? `${criticalAnomalies} anomalía(s) crítica(s).`
            : "",
          conflictDays > 0
            ? `${conflictDays} día(s) con conflictos.`
            : "",
          ctx.pendingApprovals > 3
            ? `${ctx.pendingApprovals} aprobaciones pendientes.`
            : "",
          mlDegraded
            ? "Modelos ML degradados — predicciones menos confiables."
            : "",
          mlLowConfidence
            ? "Confianza de predicciones ML por debajo del umbral."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: applyCalibration(boostWithRAG(baseConfidence, ctx), "global_systemic_risk", ctx), 
        layer: "diagnostic",
        domain: DOMAIN,
        citations: extractCitations(ctx),
      });
    },
  },

  // Rule 2: Cross-Agent Anomaly Correlation
  {
    id: "anomaly_correlation",
    name: "Cross-Agent Anomaly Correlation",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 15,
    consumeSignals: ["fin_revenue_decline"],
    evaluate: (ctx) => {
      const finAnomalies = ctx.aiReport?.financial_anomalies ?? [];
      const criticalFin = finAnomalies.filter(
        (a) => a.severity === "critical" || a.severity === "high",
      );
      const upcomingConflicts = ctx.upcomingDays.filter(
        (d) => d.has_conflicts,
      );

      const hasFinSignal = ctx.signals.some(
        (s) => s.signalDefId === "fin_revenue_decline",
      );

      if (criticalFin.length === 0 && upcomingConflicts.length === 0) {
        return null;
      }
      if (!hasFinSignal && (criticalFin.length === 0 || upcomingConflicts.length === 0)) {
        return null;
      }

      return buildInsight({
        id: "global_anomaly_correlation",
        impact: "high",
        title:
          "Patrón cross-agent: anomalías + conflictos simultáneos",
        reasoning: [
          `${criticalFin.length} anomalía(s) financiera(s) de alta severidad coinciden con ${upcomingConflicts.length} conflicto(s) de calendario.`,
          hasFinSignal
            ? "Signal de deterioro financiero activo."
            : "",
          "Investigar causa raíz.",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: 80,
        layer: "diagnostic",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // Rule 3: Approval Bottleneck
  {
    id: "approval_bottleneck",
    name: "Approval Bottleneck",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 12,
    evaluate: (ctx) => {
      if (ctx.pendingApprovals <= 0) return null;
      return buildInsight({
        id: "global_approval_bottleneck",
        impact: ctx.pendingApprovals >= 5 ? "high" : "medium",
        title: `${ctx.pendingApprovals} aprobación(es) pendiente(s)`,
        reasoning:
          "Aprobaciones acumuladas bloquean operaciones: gastos, eventos, y pricing pendientes de confirmación.",
        confidence: 95,
        layer: "diagnostic",
        domain: DOMAIN,
        target_view: "/admin/approvals",
        action: {
          type: "mutate",
          server: "hitl",
          tool: "approve_request",
          params: { approve_all_pending: true },
          approval_level: "auto",
          label: `Aprobar ${ctx.pendingApprovals} pendiente(s)`,
          confirm_message: `Se aprobarán ${ctx.pendingApprovals} solicitudes pendientes. Incluye gastos, eventos y pricing en cola.`,
          estimated_impact: `Liberar ${ctx.pendingApprovals} operaciones bloqueadas`,
        },
      });
    },
  },

  // Rule 4: Data Freshness Map
  {
    id: "data_freshness",
    name: "Data Freshness Map",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 60,
    evaluate: (ctx) => {
      const stale: string[] = [];
      if (!ctx.summary) stale.push("Executive");
      if (!ctx.aiReport) stale.push("Finance");
      if (ctx.calendarDays.length === 0) stale.push("Events");
      if (stale.length === 0 || stale.length === 3) return null;
      return buildInsight({
        id: "global_data_freshness",
        impact: "medium",
        title: `${stale.length} dominio(s) sin datos frescos`,
        reasoning: `Sin datos de: ${stale.join(", ")}. Navegá a esos módulos para actualizar el cache del Advisor.`,
        confidence: 100,
        layer: "diagnostic",
        domain: DOMAIN,
      });
    },
  },

  // Rule 5: Membership Decline
  {
    id: "membership_decline",
    name: "Membership Decline",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 20,
    evaluate: (ctx) => {
      if (!ctx.summary) return null;
      const memTrend = ctx.summary.membership.growth_rate_pct;
      if (memTrend >= -2) return null;
      return buildInsight({
        id: "global_membership_decline",
        impact: "high",
        title: `Membresía en declive: ${memTrend.toFixed(1)}%`,
        reasoning:
          "Pérdida neta de socios impacta revenue recurrente y valor del club.",
        confidence: 80,
        layer: "diagnostic",
        domain: DOMAIN,
        target_view: "/admin/families",
      });
    },
  },

  // Rule 26 (B6 NEW): Cross-Domain Communication Impact
  // Consumes: comm_delivery_critical
  {
    id: "fusion_communications",
    name: "Cross-Domain Communication Impact",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 14,
    consumeSignals: ["comm_delivery_critical"],
    evaluate: (ctx) => {
      const hasCommCritical = ctx.signals.some(
        (s) => s.signalDefId === "comm_delivery_critical",
      );
      if (!hasCommCritical) return null;

      const commSignal = ctx.signals.find(
        (s) => s.signalDefId === "comm_delivery_critical",
      );

      return buildInsight({
        id: "global_fusion_communications",
        impact: "high",
        title: "Problemas comunicacionales impactan operaciones globales",
        reasoning: [
          "Signal de comunicación crítica activo — delivery de mensajes fallando.",
          "Impacto cross-domain: socios no reciben notificaciones de eventos, facturación, o cambios operativos.",
          commSignal
            ? `Severidad: ${commSignal.severity}.`
            : "",
          "Priorizar resolución del canal de comunicación antes de campañas masivas.",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: 75,
        layer: "diagnostic",
        domain: DOMAIN,
        target_view: "/admin/communication",
      });
    },
  },

  // Rule 27 (B6 NEW): Facilities & Sports Intelligence
  // Consumes: spt_utilization_drop, spt_capacity_warning
  {
    id: "fusion_facilities",
    name: "Facilities & Sports Intelligence",
    layer: "diagnostic",
    domain: DOMAIN,
    priority: 16,
    consumeSignals: ["spt_utilization_drop", "spt_capacity_warning"],
    evaluate: (ctx) => {
      const hasUtilDrop = ctx.signals.some(
        (s) => s.signalDefId === "spt_utilization_drop",
      );
      const hasCapWarning = ctx.signals.some(
        (s) => s.signalDefId === "spt_capacity_warning",
      );

      if (!hasUtilDrop && !hasCapWarning) return null;

      const parts: string[] = [];

      if (hasUtilDrop) {
        const utilSignal = ctx.signals.find(
          (s) => s.signalDefId === "spt_utilization_drop",
        );
        parts.push(
          `Utilización deportiva caída: ${Math.round(utilSignal?.value ?? 0)}% bajo umbral mínimo.`,
        );
      }

      if (hasCapWarning) {
        parts.push(
          "Instalaciones deportivas cerca de capacidad máxima — riesgo de degradación de experiencia.",
        );
      }

      if (hasUtilDrop && hasCapWarning) {
        parts.push(
          "Patrón contradictorio: baja utilización + alta demanda en algunas áreas. Revisar distribución de horarios y accesibilidad por segmento.",
        );
      }

      return buildInsight({
        id: "global_fusion_facilities",
        impact: hasUtilDrop && hasCapWarning ? "high" : "medium",
        title: "Inteligencia deportiva: señal(es) cruzada(s)",
        reasoning: parts.join(" "),
        confidence: 70,
        layer: "diagnostic",
        domain: DOMAIN,
        target_view: "/admin/sports",
      });
    },
  },

  // ═══════════════════════════════════════════════════
  // LAYER 2: STRATEGY (rules 6–11, 28)
  // "¿Qué deberíamos hacer?"
  // ═══════════════════════════════════════════════════

  // Rule 6: Resource Allocation Optimizer
  {
    id: "resource_allocation",
    name: "Resource Allocation Optimizer",
    layer: "strategy",
    domain: DOMAIN,
    priority: 30,
    evaluate: (ctx) => {
      if (!ctx.summary || ctx.calendarDays.length === 0) return null;
      const weekEvents = ctx.next7Days.reduce(
        (s, d) => s + d.total_events,
        0,
      );
      const conflictDays = ctx.next7Days.filter(
        (d) => d.has_conflicts,
      ).length;
      if (weekEvents < 5 && conflictDays < 2) return null;
      return buildInsight({
        id: "global_resource_allocation",
        impact: "high",
        title: `${weekEvents} eventos esta semana — optimizar recursos`,
        reasoning: [
          conflictDays > 0
            ? `${conflictDays} día(s) con conflictos de horario.`
            : "",
          "Redistribuir staff de áreas con baja demanda hacia eventos saturados.",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: 70,
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/events",
      });
    },
  },

  // Rule 7: Revenue Mix Redesigner
  {
    id: "revenue_mix_redesign",
    name: "Revenue Mix Redesigner",
    layer: "strategy",
    domain: DOMAIN,
    priority: 35,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const conc = ctx.aiReport.revenue_concentration;
      if (!conc || conc.diversification_index <= 0 || conc.diversification_index >= 0.6) {
        return null;
      }
      const topSource = [...conc.sources].sort(
        (a, b) => b.share_pct - a.share_pct,
      )[0];
      return buildInsight({
        id: "global_revenue_mix_redesign",
        impact: "high",
        title: "Rediseñar mix de ingresos",
        reasoning: `${topSource?.label ?? "Principal"} concentra ${topSource?.share_pct ?? 0}% del revenue (HHI: ${conc.herfindahl_index.toFixed(0)}). Diseñar paquetes cross-sell: eventos premium + F&B + bienestar para diversificar.`,
        confidence: 75,
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // Rule 8: Pricing Strategy Advisor
  {
    id: "pricing_strategy",
    name: "Pricing Strategy Advisor",
    layer: "strategy",
    domain: DOMAIN,
    priority: 40,
    evaluate: (ctx) => {
      if (ctx.calendarDays.length === 0) return null;
      const freeHighAttendance = ctx.upcomingEvents.filter(
        (e) => e.pricing_model === "free" && e.current_attendance >= 20,
      );
      const ev = freeHighAttendance[0];
      if (!ev) return null;
      const estRevenue = ev.current_attendance * 15_000;
      return buildInsight({
        id: "global_pricing_strategy",
        impact: "high",
        title: `Oportunidad de pricing: "${ev.title}"`,
        reasoning: `${ev.current_attendance} asistentes a precio ₡0. Test A/B: ₡15K al ${Math.round(ev.current_attendance * 0.8)} asistentes = ${compactCurrency(estRevenue * 0.8)}. Eventos similares en CR privados cobran ₡10-25K.`,
        confidence: 65,
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/events",
      });
    },
  },

  // Rule 9: Member Lifecycle Orchestrator
  {
    id: "lifecycle_orchestrator",
    name: "Member Lifecycle Orchestrator",
    layer: "strategy",
    domain: DOMAIN,
    priority: 25,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const mbr = ctx.aiReport.member_economics;
      if (!mbr || mbr.ltv_cac_ratio <= 0 || mbr.ltv_cac_ratio >= 3.0) {
        return null;
      }
      return buildInsight({
        id: "global_lifecycle_orchestrator",
        impact: "high",
        title: `LTV/CAC ${mbr.ltv_cac_ratio.toFixed(1)}x — retención urgente`,
        reasoning: `Cada socio cuesta ${compactCurrency(mbr.cac_estimate)} adquirir pero solo genera ${compactCurrency(mbr.ltv_estimate)} lifetime. Invertir en retención (eventos exclusivos, beneficios VIP) es 5x más eficiente que adquisición.`,
        confidence: applyCalibration(boostWithRAG(80, ctx), "global_lifecycle_orchestrator", ctx),
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/families",
        citations: extractCitations(ctx),
      });
    },
  },

  // Rule 10: Cash Flow Timing Optimizer
  {
    id: "cashflow_timing",
    name: "Cash Flow Timing Optimizer",
    layer: "strategy",
    domain: DOMAIN,
    priority: 28,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const forecast = ctx.aiReport.cash_flow_forecast;
      if (!forecast?.periods?.length) return null;
      const negPeriods = forecast.periods.filter(
        (p) => p.cumulative_cash < 0,
      );
      const neg = negPeriods[0];
      if (!neg) return null;
      const negIdx = forecast.periods.indexOf(neg);
      const posAfter = forecast.periods.find(
        (p, i) => i > negIdx && p.cumulative_cash > 0,
      );
      return buildInsight({
        id: "global_cashflow_timing",
        impact: "high",
        title: `Timing de pagos: déficit en ${neg.label}`,
        reasoning: `Cash flow negativo de ${compactCurrency(neg.cumulative_cash)} en ${neg.label}.${posAfter ? ` Se recupera en ${posAfter.label}. Mover pagos de proveedores al mes siguiente para evitar necesidad de crédito.` : ""}`,
        confidence: 75,
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // Rule 11: Investment Priority Matrix
  {
    id: "investment_priority",
    name: "Investment Priority Matrix",
    layer: "strategy",
    domain: DOMAIN,
    priority: 32,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const recs = ctx.aiReport.recommendations;
      if (!recs?.length) return null;
      const quickWins = recs.filter(
        (r) =>
          r.implementation_effort === "low" &&
          (r.priority === "high" || r.priority === "critical"),
      );
      if (quickWins.length === 0) return null;
      const totalImpact = quickWins.reduce(
        (s, r) => s + r.estimated_impact_annual,
        0,
      );
      return buildInsight({
        id: "global_investment_priority",
        impact: "high",
        title: `${quickWins.length} quick wins priorizados`,
        reasoning: `Impacto combinado: ${compactCurrency(totalImpact)}/año. ${quickWins
          .map((r) => r.action)
          .slice(0, 2)
          .join(". ")}. Ejecutar en orden.`,
        confidence: applyCalibration(boostWithRAG(85, ctx), "global_investment_priority", ctx),
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/finance",
        citations: extractCitations(ctx),
      });
    },
  },

  // Rule 28 (B6 NEW): Demographic Balance Alert
  // Consumes: age_group_imbalance
  {
    id: "fusion_demographics",
    name: "Demographic Balance Alert",
    layer: "strategy",
    domain: DOMAIN,
    priority: 24,
    consumeSignals: ["age_group_imbalance"],
    evaluate: (ctx) => {
      const hasImbalance = ctx.signals.some(
        (s) => s.signalDefId === "age_group_imbalance",
      );
      if (!hasImbalance) return null;

      const imbalanceSignal = ctx.signals.find(
        (s) => s.signalDefId === "age_group_imbalance",
      );

      return buildInsight({
        id: "global_fusion_demographics",
        impact: "high",
        title: "Desbalance demográfico: riesgo de sostenibilidad",
        reasoning: [
          "Signal de desbalance de edad activo.",
          imbalanceSignal
            ? `Desviación: ${Math.round(Math.abs(imbalanceSignal.value))}% sobre umbral.`
            : "",
          "Impacto cross-domain: eventos no cubren todos los grupos etarios, comunicación pierde segmentos, membership renewal se concentra en un rango.",
          "Estrategia: diseñar programas específicos para el grupo sub-representado y medir participación.",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: 65,
        layer: "strategy",
        domain: DOMAIN,
        target_view: "/admin/families",
      });
    },
  },

  // ═══════════════════════════════════════════════════
  // LAYER 3: PREDICTION (rules 12–16)
  // "¿Qué va a pasar?"
  // ═══════════════════════════════════════════════════

  // Rule 12: 90-Day Financial Trajectory
  {
    id: "trajectory_90d",
    name: "90-Day Financial Trajectory",
    layer: "prediction",
    domain: DOMAIN,
    priority: 22,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const health = ctx.aiReport.health_score;
      const trend = health.trend_vs_previous;
      const projection = ctx.aiReport.projection;
      if (
        trend >= -3 &&
        !projection?.summary?.toLowerCase().includes("contracción")
      ) {
        return null;
      }
      const projectedHealth = Math.max(0, health.total + trend * 3);
      return buildInsight({
        id: "global_trajectory_90d",
        impact: "high",
        title: `Proyección 90 días: health ${Math.round(health.total)} → ${Math.round(projectedHealth)}`,
        reasoning: `Tendencia: ${trend > 0 ? "+" : ""}${trend.toFixed(1)} pts/período. Sin intervención, el health score será ~${Math.round(projectedHealth)} en 90 días. ${projection?.summary?.slice(0, 120) ?? ""}`,
        confidence: 60,
        layer: "prediction",
        domain: DOMAIN,
      });
    },
  },

  // Rule 13: Member Churn Predictor
  // B6: Enhanced with satisfaction decline + guest pipeline signals
  {
    id: "churn_predictor",
    name: "Member Churn Predictor",
    layer: "prediction",
    domain: DOMAIN,
    priority: 18,
    consumeSignals: ["evt_low_engagement", "sat_critical_decline", "guest_pipeline_alert"],
    evaluate: (ctx) => {
      if (!ctx.summary) return null;
      const churnRisk = ctx.summary.membership.churn_risk_count;
      if (churnRisk <= 0) return null;
      const avgRevenue =
        ctx.aiReport?.member_economics?.avg_revenue_per_member ?? 0;
      const lossEstimate = churnRisk * avgRevenue;

      const hasEngSignal = ctx.signals.some(
        (s) => s.signalDefId === "evt_low_engagement",
      );
      const hasSatDecline = ctx.signals.some(
        (s) => s.signalDefId === "sat_critical_decline",
      );
      const hasGuestAlert = ctx.signals.some(
        (s) => s.signalDefId === "guest_pipeline_alert",
      );

      // Multi-signal: compound risk escalation
      const activeSignals = [
        hasEngSignal && "baja participación en eventos",
        hasSatDecline && "satisfacción en declive crítico",
        hasGuestAlert && "pipeline de invitados comprometido",
      ].filter(Boolean);

      return buildInsight({
        id: "global_churn_predictor",
        impact: "high",
        title: `${churnRisk} socios en riesgo de churn`,
        reasoning: [
          `Pérdida estimada: ${compactCurrency(lossEstimate)}/año.`,
          activeSignals.length > 0
            ? `Señales activas (${activeSignals.length}): ${activeSignals.join("; ")}.`
            : "",
          "Valor de retención supera costo de adquisición.",
          hasSatDecline
            ? "Prioridad: resolver causa raíz de insatisfacción antes de campaña de retención."
            : "Programa: llamada personalizada + invitación evento exclusivo.",
          hasGuestAlert
            ? "Bonus: revitalizar programa de referidos para reactivar pipeline."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
           confidence: applyCalibration(boostWithRAG(70, ctx), "global_churn_predictor", ctx),
        layer: "prediction",
        domain: DOMAIN,
        target_view: "/admin/families",
        citations: extractCitations(ctx),
      });
    },
  },

  // Rule 14: Event Demand Forecaster
  {
    id: "demand_forecast",
    name: "Event Demand Forecaster",
    layer: "prediction",
    domain: DOMAIN,
    priority: 45,
    consumeSignals: ["evt_capacity_alert"],
    evaluate: (ctx) => {
      if (ctx.calendarDays.length === 0) return null;
      const season = ctx.season;
      const seasonCfg = SEASON_CONFIG[season];
      const nextMonth = new Date(
        ctx.now.getFullYear(),
        ctx.now.getMonth() + 1,
        1,
      );
      const nextMonthStr = `${nextMonth.getFullYear()}-${String(
        nextMonth.getMonth() + 1,
      ).padStart(2, "0")}`;
      const nextMonthEvents = ctx.calendarDays
        .filter((d) => d.date.startsWith(nextMonthStr))
        .reduce((s, d) => s + d.total_events, 0);

      const hasCapAlert = ctx.signals.some(
        (s) => s.signalDefId === "evt_capacity_alert",
      );

      if (season !== "high" || nextMonthEvents >= 4) return null;

      return buildInsight({
        id: "global_demand_forecast",
        impact: hasCapAlert ? "high" : "medium",
        title: `Temporada alta: solo ${nextMonthEvents} evento(s) próximo mes`,
        reasoning: `${MONTH_NAMES[nextMonth.getMonth()]} es temporada alta (factor +${((seasonCfg.factor - 1) * 100).toFixed(0)}%). Demanda estimada: 40% sobre promedio. ${hasCapAlert ? "Alerta de capacidad activa — eventos actuales ya saturados. " : ""}Programar más actividades.`,
        confidence: 75,
        layer: "prediction",
        domain: DOMAIN,
        target_view: "/admin/events",
      });
    },
  },

  // Rule 15: Revenue Seasonality Predictor
  {
    id: "seasonality_predictor",
    name: "Revenue Seasonality Predictor",
    layer: "prediction",
    domain: DOMAIN,
    priority: 50,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const forecast = ctx.aiReport.cash_flow_forecast;
      if (!forecast?.periods?.length || forecast.periods.length < 3) return null;
      const seasonal = forecast.assumptions?.some((a) =>
        a.toLowerCase().includes("estacional"),
      );
      if (!seasonal) return null;
      const season = ctx.season;
      const seasonLabel =
        season === "high"
          ? "alta (+8%)"
          : season === "low"
            ? "baja (-8%)"
            : "transición";
      const advice =
        season === "high"
          ? "Aprovechar para acumular reserva para temporada baja."
          : season === "low"
            ? "Reducir gastos discrecionales. Invertir en mantenimiento."
            : "Preparar transición hacia temporada alta.";
      return buildInsight({
        id: "global_seasonality_predictor",
        impact: "medium",
        title: `Estacionalidad Costa Rica: temporada ${seasonLabel}`,
        reasoning: `Factor aplicado en forecast. ${advice}`,
        confidence: 95,
        layer: "prediction",
        domain: DOMAIN,
      });
    },
  },

  // Rule 16: Vendor Cost Escalation
  {
    id: "vendor_escalation",
    name: "Vendor Cost Escalation",
    layer: "prediction",
    domain: DOMAIN,
    priority: 42,
    consumeSignals: ["fin_margin_pressure"],
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const expenseSpikes = ctx.aiReport.financial_anomalies.filter(
        (a) => a.domain === "expense" && a.deviation_pct > 15,
      );
      if (expenseSpikes.length === 0) return null;
      const totalImpact = expenseSpikes.reduce(
        (s, a) => s + Math.abs(a.estimated_annual_impact),
        0,
      );
      const hasMarginSignal = ctx.signals.some(
        (s) => s.signalDefId === "fin_margin_pressure",
      );
      return buildInsight({
        id: "global_vendor_escalation",
        impact: hasMarginSignal ? "high" : "medium",
        title: `${expenseSpikes.length} categoría(s) con escalación de costos`,
        reasoning: `Impacto: ${compactCurrency(totalImpact)}/año. ${expenseSpikes[0]?.detail ?? ""}${hasMarginSignal ? " Signal de presión de margen activo — priorizar renegociación." : ""} Renegociar contratos antes de renovación.`,
        confidence: 70,
        layer: "prediction",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // ═══════════════════════════════════════════════════
  // LAYER 4: INNOVATION (rules 17–21)
  // "¿Qué oportunidades estoy ignorando?"
  // ═══════════════════════════════════════════════════

  // Rule 17: Hidden Revenue Opportunities
  {
    id: "hidden_revenue",
    name: "Hidden Revenue Opportunities",
    layer: "innovation",
    domain: DOMAIN,
    priority: 55,
    evaluate: (ctx) => {
      if (!ctx.aiReport || ctx.calendarDays.length === 0) return null;
      const mbr = ctx.aiReport.member_economics;
      if (!mbr || mbr.avg_revenue_per_member <= 0 || mbr.avg_margin_per_member <= 0) {
        return null;
      }
      const eventCount = ctx.upcomingEvents.length;
      if (eventCount >= 5) return null;
      return buildInsight({
        id: "global_hidden_revenue",
        impact: "high",
        title: "Revenue ocioso: alta capacidad + pocos eventos",
        reasoning: `Revenue promedio por socio: ${compactCurrency(mbr.avg_revenue_per_member)}. Con más eventos/targeting, estimado +${compactCurrency(mbr.avg_revenue_per_member * 0.15)}/socio/año. Crear experiencias premium por segmento.`,
        confidence: 55,
        layer: "innovation",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // Rule 18: Cross-Sell Matrix
  {
    id: "cross_sell_matrix",
    name: "Cross-Sell Matrix",
    layer: "innovation",
    domain: DOMAIN,
    priority: 58,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const byTier = ctx.aiReport.member_economics?.by_tier;
      if (!byTier || byTier.length < 2) return null;
      const sortedByMargin = [...byTier].sort(
        (a, b) => a.margin_pct - b.margin_pct,
      );
      const lowest = sortedByMargin[0];
      const highest = sortedByMargin[sortedByMargin.length - 1];
      if (
        !lowest ||
        !highest ||
        lowest.margin_pct >= highest.margin_pct * 0.5
      ) {
        return null;
      }
      const upgradeRevenue =
        (highest.avg_revenue - lowest.avg_revenue) * lowest.count * 0.2;
      return buildInsight({
        id: "global_cross_sell_matrix",
        impact: "medium",
        title: `Cross-sell: upgrade ${lowest.tier} → ${highest.tier}`,
        reasoning: `${lowest.tier}: margen ${lowest.margin_pct.toFixed(1)}%, ${lowest.count} socios. ${highest.tier}: margen ${highest.margin_pct.toFixed(1)}%. Mover 20% de ${lowest.tier} a ${highest.tier} = +${compactCurrency(upgradeRevenue)}/año.`,
        confidence: 60,
        layer: "innovation",
        domain: DOMAIN,
        target_view: "/admin/families",
      });
    },
  },

  // Rule 19: Partnership Intelligence
  {
    id: "partnership_intelligence",
    name: "Partnership Intelligence",
    layer: "innovation",
    domain: DOMAIN,
    priority: 62,
    evaluate: (ctx) => {
      if (ctx.upcomingEvents.length === 0) return null;
      const eventsByCategory = new Map<string, number>();
      ctx.upcomingEvents.forEach((e) => {
        eventsByCategory.set(
          e.category,
          (eventsByCategory.get(e.category) ?? 0) + 1,
        );
      });
      const topCat = [...eventsByCategory.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];
      if (!topCat || topCat[1] < 3) return null;
      return buildInsight({
        id: "global_partnership_intelligence",
        impact: "medium",
        title: `Partnership opportunity: ${topCat[0]} (${topCat[1]} eventos)`,
        reasoning: `${topCat[1]} eventos de categoría "${topCat[0]}" este mes. Proveedores/brands de este segmento buscan exposición. Propuesta: sponsorship de eventos a cambio de descuentos para socios.`,
        confidence: 50,
        layer: "innovation",
        domain: DOMAIN,
        target_view: "/admin/events",
      });
    },
  },

  // Rule 20: Experience Gap Analysis
  {
    id: "experience_gap",
    name: "Experience Gap Analysis",
    layer: "innovation",
    domain: DOMAIN,
    priority: 65,
    evaluate: (ctx) => {
      if (!ctx.summary) return null;
      const mem = ctx.summary.membership;
      const total = mem.total_members;
      const active = mem.active_members;
      if (total <= 0) return null;
      const inactiveRate = ((total - active) / total) * 100;
      if (inactiveRate < 20) return null;
      return buildInsight({
        id: "global_experience_gap",
        impact: "medium",
        title: `Gap de engagement: ${inactiveRate.toFixed(0)}% socios inactivos`,
        reasoning: `${total - active} de ${total} socios no están activos. Diseñar experiencias específicas para reactivar segmento inactivo.`,
        confidence: 55,
        layer: "innovation",
        domain: DOMAIN,
      });
    },
  },

  // Rule 21: Competitive Benchmark Simulation
  {
    id: "competitive_benchmark",
    name: "Competitive Benchmark Simulation",
    layer: "innovation",
    domain: DOMAIN,
    priority: 48,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const health = ctx.aiReport.health_score.total;
      const mbr = ctx.aiReport.member_economics;
      const conc = ctx.aiReport.revenue_concentration;
      const benchmarks = {
        health: 75,
        ltvCac: 3.8,
        diversification: 0.72,
      };
      const gaps: string[] = [];
      if (health < benchmarks.health)
        gaps.push(
          `Health: ${Math.round(health)} vs benchmark ${benchmarks.health}`,
        );
      if (mbr?.ltv_cac_ratio > 0 && mbr.ltv_cac_ratio < benchmarks.ltvCac)
        gaps.push(
          `LTV/CAC: ${mbr.ltv_cac_ratio.toFixed(1)}x vs ${benchmarks.ltvCac}x`,
        );
      if (
        conc?.diversification_index > 0 &&
        conc.diversification_index < benchmarks.diversification
      )
        gaps.push(
          `Diversificación: ${(conc.diversification_index * 100).toFixed(0)}% vs ${(benchmarks.diversification * 100).toFixed(0)}%`,
        );
      if (gaps.length < 2) return null;
      return buildInsight({
        id: "global_competitive_benchmark",
        impact: "high",
        title: `${gaps.length} gaps vs clubes top de Costa Rica`,
        reasoning: `Benchmarks privados CR: ${gaps.join("; ")}. Cada gap es una línea de mejora en el roadmap.`,
        confidence: 50,
        layer: "innovation",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // ═══════════════════════════════════════════════════
  // LAYER 5: EXECUTION (rules 22–25, 29)
  // "¿Qué hacemos ahora?"
  // ═══════════════════════════════════════════════════

  // Rule 22: Weekly Action Plan
  {
    id: "weekly_plan",
    name: "Weekly Action Plan",
    layer: "execution",
    domain: DOMAIN,
    priority: 8,
    evaluate: (ctx) => {
      const actions: string[] = [];
      if (ctx.pendingApprovals > 0)
        actions.push(`Aprobar ${ctx.pendingApprovals} pendiente(s)`);

      const healthScore = ctx.aiReport?.health_score.total ?? 70;
      if (healthScore < 60)
        actions.push("Resolver alerta(s) de alto impacto en salud financiera");

      const weekEvents = ctx.next7Events.length;
      if (weekEvents > 0)
        actions.push(`Preparar ${weekEvents} evento(s) de esta semana`);

      if (actions.length === 0) return null;

      return buildInsight({
        id: "global_weekly_plan",
        impact: "high",
        title: `Plan de la semana: ${actions.length} acciones`,
        reasoning: actions.join(". ") + ".",
        confidence: 90,
        layer: "execution",
        domain: DOMAIN,
        ...(ctx.pendingApprovals > 0
          ? {
              action: {
                type: "mutate" as const,
                server: "hitl",
                tool: "approve_request",
                params: { approve_all_pending: true },
                approval_level: "auto" as const,
                label: "Aprobar pendientes del plan",
                confirm_message: `Se aprobarán ${ctx.pendingApprovals} solicitudes pendientes como primera acción del plan semanal.`,
                estimated_impact: `Desbloquear ${ctx.pendingApprovals} operaciones`,
              },
            }
          : {}),
      });
    },
  },

  // Rule 23: Board Meeting Auto-Brief
  {
    id: "board_brief",
    name: "Board Meeting Auto-Brief",
    layer: "execution",
    domain: DOMAIN,
    priority: 70,
    evaluate: (ctx) => {
      if (!ctx.summary || !ctx.aiReport) return null;
      const health = ctx.aiReport.health_score;
      const rev = ctx.summary.financial?.revenue ?? 0;
      const anomalyCount = ctx.aiReport.financial_anomalies.length;
      const recCount = ctx.aiReport.recommendations.length;
      return buildInsight({
        id: "global_board_brief",
        impact: "medium",
        title: "Briefing para junta directiva listo",
        reasoning: `Health: ${health.grade} (${Math.round(health.total)}/100). Revenue: ${compactCurrency(rev)}. ${anomalyCount} anomalías, ${recCount} recomendaciones. Tema principal: ${health.factors.sort((a, b) => a.score - b.score)[0]?.name ?? "general"}.`,
        confidence: applyCalibration(boostWithRAG(85, ctx), "global_investment_priority", ctx),
        layer: "execution",
        domain: DOMAIN,
        target_view: "/admin",
        citations: extractCitations(ctx),
        action: {
          type: "mutate",
          server: "advisor_intelligence",
          tool: "generate_board_brief",
          params: { period: "current_quarter" },
          approval_level: "auto",
          label: "Generar briefing con IA",
          confirm_message:
            "Se generará un briefing ejecutivo con análisis AI para la próxima reunión de la Junta Directiva. Incluye health score, anomalías, recomendaciones y Q&A preparado.",
          estimated_impact:
            "Briefing ejecutivo completo con talking points",
        },
      });
    },
  },

  // Rule 24: Scenario Suggestion
  {
    id: "scenario_suggestion",
    name: "Scenario Suggestion",
    layer: "execution",
    domain: DOMAIN,
    priority: 72,
    evaluate: (ctx) => {
      if (!ctx.aiReport) return null;
      const health = ctx.aiReport.health_score.total;
      const mbr = ctx.aiReport.member_economics;
      const margin =
        mbr?.avg_revenue_per_member > 0
          ? (mbr.avg_margin_per_member / mbr.avg_revenue_per_member) * 100
          : 0;
      if (health >= 70 && margin >= 15) return null;
      return buildInsight({
        id: "global_scenario_suggestion",
        impact: "medium",
        title: "Simular escenarios antes de decidir",
        reasoning: `Con health ${Math.round(health)}/100 y margen ${margin.toFixed(1)}%, cada decisión importa. Usá el Decision Cockpit para simular: aumento de cuota, nuevos eventos, reducción de costos.`,
        confidence: 70,
        layer: "execution",
        domain: DOMAIN,
        target_view: "/admin/finance",
      });
    },
  },

  // Rule 25: Monthly Health Report Ready
  {
    id: "monthly_report",
    name: "Monthly Health Report Ready",
    layer: "execution",
    domain: DOMAIN,
    priority: 80,
    evaluate: (ctx) => {
      if (!ctx.summary || !ctx.aiReport) return null;
      const health = ctx.aiReport.health_score;
      const anomalies = ctx.aiReport.financial_anomalies;
      const recs = ctx.aiReport.recommendations;
      return buildInsight({
        id: "global_monthly_report",
        impact: "low",
        title: "Reporte mensual del club — datos consolidados",
        reasoning: `Health ${health.grade}, ${anomalies.length} anomalías, ${recs.length} recomendaciones, ${ctx.todayEvents} eventos hoy. Todos los datos cross-agent consolidados para informe mensual.`,
        confidence: 95,
        layer: "execution",
        domain: DOMAIN,
        target_view: "/admin",
        action: {
          type: "mutate",
          server: "executive_dashboard",
          tool: "export_report",
          params: {
            report_type: "executive_summary",
            export_format: "pdf",
            audience: "internal",
          },
          approval_level: "semi",
          label: "Exportar PDF mensual",
          confirm_message: `Se exportará el reporte ejecutivo mensual en PDF. Incluye: health ${health.grade}, ${anomalies.length} anomalías, ${recs.length} recomendaciones.`,
          estimated_impact:
            "Reporte consolidado listo para distribución",
        },
      });
    },
  },

  // Rule 29 (B6 NEW): Advisor Actions Backlog
  // Consumes: rec_pending_actions
  {
    id: "fusion_actions_backlog",
    name: "Advisor Actions Backlog",
    layer: "execution",
    domain: DOMAIN,
    priority: 75,
    consumeSignals: ["rec_pending_actions"],
    evaluate: (ctx) => {
      const hasPending = ctx.signals.some(
        (s) => s.signalDefId === "rec_pending_actions",
      );
      if (!hasPending) return null;

      const recSignal = ctx.signals.find(
        (s) => s.signalDefId === "rec_pending_actions",
      );
      const pendingCount = Math.round(recSignal?.value ?? 0);

      if (pendingCount <= 0) return null;

      return buildInsight({
        id: "global_fusion_actions_backlog",
        impact: pendingCount >= 5 ? "high" : "medium",
        title: `${pendingCount} acciones recomendadas sin ejecutar`,
        reasoning: [
          `Hay ${pendingCount} acciones del Advisor acumuladas sin ejecutar.`,
          "Inercia operacional: el Advisor recomienda pero nadie ejecuta.",
          "Revisar cola de acciones y priorizar las de mayor impacto.",
          pendingCount >= 10
            ? "Alerta: backlog crítico. Dedicar sesión de trabajo para desbloquear."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: 85,
        layer: "execution",
        domain: DOMAIN,
      });
    },
  },

  // ═══════════════════════════════════════════════════
  // LAYER 3: PREDICTION (rule 30 — F49)
  // "Causal Chain Meta-Insight"
  // ═══════════════════════════════════════════════════

  // Rule 30 (F49 NEW): Causal Chain Meta-Insight
  // When causal chains are detected, generate a meta-insight
  // that describes the cascade and its compound risk.
  {
    id: "causal_chain_meta",
    name: "Causal Chain Meta-Insight",
    layer: "prediction",
    domain: DOMAIN,
    priority: 5,
    evaluate: (ctx) => {
      const chains = ctx.causalChains?.filter((c) => c.isActive && c.compoundConfidence >= 0.4);
      if (!chains?.length) return null;

      const longest = chains.reduce((a, b) =>
        a.chainLength > b.chainLength ? a : b,
      );
      const strongest = chains.reduce((a, b) =>
        a.compoundConfidence >= b.compoundConfidence ? a : b,
      );

      const impact = longest.compoundConfidence >= 0.6 || longest.chainLength >= 3
        ? "high" as const
        : "medium" as const;

      chains
                .map((c) => `• ${c.domainLabels.join(" → ")} (confianza: ${Math.round(c.compoundConfidence * 100)}%)`)
                .join("\n");

      return buildInsight({
        id: "global_causal_chain_meta",
        impact,
        title: `${chains.length} cadena(s) causal(es) detectada(s) — riesgo compuesto`,
        reasoning: [
          `Cadena más larga: ${longest.domainLabels.join(" → ")} (${longest.chainLength} dominios).`,
          `Cadena más fuerte: ${strongest.domainLabels.join(" → ")} (confianza: ${Math.round(strongest.compoundConfidence * 100)}%).`,
          longest.description,
          chains.length > 1
            ? `${chains.length} cadenas activas sugieren inestabilidad sistémica — investigar causa raíz.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        confidence: Math.round(strongest.compoundConfidence * 100),
        layer: "prediction",
        domain: DOMAIN,
        citations: extractCitations(ctx),
      });
    },
  },
];

// ── Health Factors ──────────────────────────────────────

export const GLOBAL_HEALTH_FACTORS: HealthFactorDef<GlobalContext>[] = [
  {
    id: "membership_growth",
    label: "Crecimiento de Membresía",
    weight: 0.2,
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      const growth = Math.min(
        Math.max(ctx.summary.membership.growth_rate_pct, -5),
        10,
      );
      return ((growth + 5) / 15) * 100;
    },
  },
  {
    id: "financial_health",
    label: "Salud Financiera",
    weight: 0.25,
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      const f = ctx.summary.financial;
      const collection = Math.min(f.collection_rate_pct, 100);
      const budget = Math.max(
        0,
        100 - Math.abs(f.budget_variance_pct) * 5,
      );
      return collection * 0.6 + budget * 0.4;
    },
  },
  {
    id: "utilization",
    label: "Utilización de Instalaciones",
    weight: 0.15,
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      const util = ctx.summary.operational.facility_utilization_pct;
      if (util >= 60 && util <= 85) return 100;
      if (util > 85) return Math.max(0, 100 - (util - 85) * 2);
      return (util / 60) * 80;
    },
  },
  {
    id: "satisfaction",
    label: "Satisfacción de Socios",
    weight: 0.2,
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      return Math.min(
        100,
        (ctx.summary.engagement.satisfaction_score / 5) * 100,
      );
    },
  },
  {
    id: "risk_management",
    label: "Gestión de Riesgo",
    weight: 0.2,
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      const penalty =
        Math.min(ctx.summary.membership.churn_risk_count / 50, 1) * 100;
      return 100 - penalty;
    },
  },
];