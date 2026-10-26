// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/conciergeNarrative.ts
// Phase 34 "The Gateway" — Concierge Narrative Engine
// Level 6+ Agency · Production Grade
//
// Generates the voice of the guest intelligence system.
// Takes enriched dashboard data and produces a human narrative
// that tells the staff what matters, why, and what to do.
//
// The narrative changes based on dashboard mode:
//   calm: warm, strategic, forward-looking
//   alert: direct, specific, actionable
//   critical: commanding, urgent, no-nonsense
//   celebration: acknowledging, proud, motivating
//
// Zero UI dependencies — pure data → text engine.
// Consumed by: GuestConciergeVoice component
//
// Budget: 5ms (pure function)
// ═══════════════════════════════════════════════════════════

import type { GuestDashboardMode } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/** Tone drives the voice's personality and visual treatment. */
export type ConciergeTone = "warm" | "urgent" | "commanding" | "celebratory";

/** Priority indicates the severity of the overall situation. */
export type ConciergePriority = "info" | "low" | "medium" | "high" | "critical";

/** Action the staff can take, backed by a real MCP tool call. */
export interface ConciergeAction {
  /** Button label (Spanish). */
  readonly label: string;
  /** MCP server name. */
  readonly server: string;
  /** MCP tool name. */
  readonly tool: string;
  /** Tool parameters. */
  readonly params: Readonly<Record<string, unknown>>;
  /** Whether the action needs confirmation before executing. */
  readonly approvalLevel: "auto" | "confirm";
  /** Visual weight: primary for the main action, secondary for alternatives. */
  readonly variant: "primary" | "secondary";
}

/** Minimal insight data needed for narrative generation.
 *  Decoupled from BaseInsight — no UI dependency. */
export interface ConciergeInsight {
  readonly id: string;
  readonly severity: string;
  readonly title: string;
  readonly description: string;
  readonly impact: string;
  readonly confidence: number;
  readonly action?: {
    readonly label: string;
    readonly server: string;
    readonly tool: string;
    readonly params: Readonly<Record<string, unknown>>;
    readonly approval: string;
  };
  readonly metric?: string;
  readonly metricValue?: string | number;
}

/** Input for narrative generation.
 *  Extracted from useGuestDashboard by the Voice component. */
export interface ConciergeInput {
  /** Current dashboard mode (drives tone). */
  readonly mode: GuestDashboardMode;
  /** Advisor insights sorted by priority. */
  readonly insights: readonly ConciergeInsight[];
  /** Overall health score 0-100. */
  readonly healthScore: number;
  /** Health level label (e.g., "bueno", "atención"). */
  readonly healthLevel: string;
  /** Whether any critical factors are active. */
  readonly hasCritical: boolean;
  /** Pipeline ecosystem health 0-100. */
  readonly pipelineHealth: number;
  /** Guests one step from conversion. */
  readonly quickWinCount: number;
  /** VIP candidate count. */
  readonly vipCount: number;
  /** Dormant guest count. */
  readonly dormantCount: number;
  /** Total guests in the ecosystem. */
  readonly totalGuests: number;
  /** Label of the primary bottleneck stage, null if none. */
  readonly bottleneckStage: string | null;
}

/** The complete narrative output rendered by the Voice component. */
export interface ConciergeNarrative {
  /** Time-based greeting (Buenos días / Buenas tardes / Buenas noches). */
  readonly greeting: string;
  /** The most important message — 1 sentence, punchy. */
  readonly headline: string;
  /** Supporting detail — 1-3 sentences with data. */
  readonly body: string;
  /** Actionable buttons backed by MCP tool calls. */
  readonly actions: readonly ConciergeAction[];
  /** Voice personality for visual treatment. */
  readonly tone: ConciergeTone;
  /** Severity indicator for the overall situation. */
  readonly priority: ConciergePriority;
}

// ═══════════════════════════════════════════════════════════
// §2 — THRESHOLDS (named, testable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  HEALTH_EXCELLENT: 85,
  HEALTH_GOOD: 70,
  HEALTH_ATTENTION: 50,
  PIPELINE_HEALTHY: 70,
  DORMANT_CONCERN: 5,
  HIGH_SEVERITY_BATCH: 3,
} as const;

const MAX_ACTIONS = 3;

// ═══════════════════════════════════════════════════════════
// §3 — TIME-BASED GREETING
// ═══════════════════════════════════════════════════════════

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

// ═══════════════════════════════════════════════════════════
// §4 — HEADLINE GENERATION
// The headline is the first thing the staff reads.
// It must be specific, human, and decisive.
// ═══════════════════════════════════════════════════════════

function generateHeadline(input: ConciergeInput): string {
  const {
    mode, insights, quickWinCount, vipCount,
    bottleneckStage, totalGuests,
  } = input;

  if (totalGuests === 0) {
    return "El pipeline está vacío — es momento de generar nuevos leads";
  }

  const criticalInsights = insights.filter((i) => i.severity === "critical");
  const highInsights = insights.filter((i) => i.severity === "high");

  switch (mode) {
    case "critical":
      if (criticalInsights.length > 0) {
        return `Situación crítica: ${criticalInsights[0].title}`;
      }
      return "El pipeline requiere intervención inmediata";

    case "alert":
      if (bottleneckStage) {
        return `La etapa '${bottleneckStage}' necesita atención — el flujo se está frenando`;
      }
      if (highInsights.length > 0) {
        return `${highInsights.length} invitado(s) necesitan atención prioritaria`;
      }
      return "Hay oportunidades pendientes que no pueden esperar";

    case "celebration":
      return "El ecosistema de invitados está en excelente forma";

    case "calm":
    default:
      if (quickWinCount > 0) {
        return `${quickWinCount} invitado(s) están a un paso de convertirse en miembros`;
      }
      if (vipCount > 0) {
        return `${vipCount} candidato(s) VIP identificados en el pipeline`;
      }
      return "El ecosistema de invitados está funcionando";
  }
}

// ═══════════════════════════════════════════════════════════
// §5 — BODY GENERATION
// The body provides data-driven supporting detail.
// 1-3 sentences, specific numbers, actionable context.
// ═══════════════════════════════════════════════════════════

function generateBody(input: ConciergeInput): string {
  const {
    mode, insights, healthScore, pipelineHealth,
    quickWinCount, vipCount, dormantCount,
    bottleneckStage, totalGuests,
  } = input;

  if (totalGuests === 0) {
    return "No hay invitados registrados en el sistema. Las campañas de captación y eventos privados son el motor principal de nuevos leads.";
  }

  switch (mode) {
    case "critical":
      return buildCriticalBody(insights, pipelineHealth, bottleneckStage);

    case "alert":
      return buildAlertBody(insights, pipelineHealth, dormantCount);

    case "celebration":
      return buildCelebrationBody(healthScore, pipelineHealth, vipCount, quickWinCount);

    case "calm":
    default:
      return buildCalmBody(pipelineHealth, quickWinCount, vipCount, dormantCount);
  }
}

function buildCriticalBody(
  insights: readonly ConciergeInsight[],
  pipelineHealth: number,
  bottleneckStage: string | null,
): string {
  const parts: string[] = [];

  if (bottleneckStage) {
    parts.push(`El bloqueo en '${bottleneckStage}' está deteniendo el flujo de conversión`);
  }
  if (pipelineHealth < THRESHOLDS.HEALTH_ATTENTION) {
    parts.push(`la salud del pipeline es ${pipelineHealth}/100`);
  }
  const topCritical = insights.find((i) => i.severity === "critical");
  if (topCritical) {
    parts.push(topCritical.description.substring(0, 120));
  }
  return parts.join(". ") + ". Se requiere acción inmediata.";
}

function buildAlertBody(
  insights: readonly ConciergeInsight[],
  pipelineHealth: number,
  dormantCount: number,
): string {
  const parts: string[] = [];

  if (pipelineHealth < THRESHOLDS.PIPELINE_HEALTHY) {
    parts.push(`El pipeline tiene salud ${pipelineHealth}/100`);
  }
  if (insights.length > 0) {
    parts.push(insights[0].title);
  }
  if (dormantCount > THRESHOLDS.DORMANT_CONCERN) {
    parts.push(`${dormantCount} invitados están inactivos y necesitan reactivación`);
  }
  return parts.join(". ") + ".";
}

function buildCelebrationBody(
  healthScore: number,
  pipelineHealth: number,
  vipCount: number,
  quickWinCount: number,
): string {
  const parts: string[] = [];
  parts.push(`La salud general es ${healthScore}/100 y el pipeline está a ${pipelineHealth}/100`);
  if (vipCount > 0) parts.push(`${vipCount} candidatos VIP activos`);
  if (quickWinCount > 0) parts.push(`${quickWinCount} quick wins disponibles para acelerar la conversión`);
  return parts.join(". ") + ". Mantener el momentum.";
}

function buildCalmBody(
  pipelineHealth: number,
  quickWinCount: number,
  vipCount: number,
  dormantCount: number,
): string {
  const parts: string[] = [];

  if (pipelineHealth >= THRESHOLDS.PIPELINE_HEALTHY) {
    parts.push(`El pipeline está saludable (${pipelineHealth}/100)`);
  } else {
    parts.push(`El pipeline necesita atención (${pipelineHealth}/100)`);
  }
  if (quickWinCount > 0) {
    parts.push(`${quickWinCount} invitado(s) solo necesitan el empujón final para convertirse`);
  }
  if (vipCount > 0) {
    parts.push(`${vipCount} candidatos VIP esperando atención prioritaria`);
  }
  if (dormantCount > THRESHOLDS.DORMANT_CONCERN) {
    parts.push(`${dormantCount} invitados dormantes que podrían reactivarse`);
  }
  return parts.join(". ") + ".";
}

// ═══════════════════════════════════════════════════════════
// §6 — ACTION EXTRACTION
// Extracts the most relevant actions from insights + context.
// Up to MAX_ACTIONS: 1 primary + 2 secondary.
// ═══════════════════════════════════════════════════════════

function extractActions(input: ConciergeInput): ConciergeAction[] {
  const actions: ConciergeAction[] = [];

  // Primary: from the most important insight that has an action
  const actionableInsight = input.insights.find((i) => i.action);
  if (actionableInsight?.action) {
    actions.push({
      label: actionableInsight.action.label,
      server: actionableInsight.action.server,
      tool: actionableInsight.action.tool,
      params: actionableInsight.action.params,
      approvalLevel: actionableInsight.action.approval === "auto" ? "auto" : "confirm",
      variant: "primary",
    });
  }

  // Secondary: quick win management
  if (input.quickWinCount > 0 && actions.length < MAX_ACTIONS) {
    actions.push({
      label: "Gestionar quick wins",
      server: "guest_management",
      tool: "generate_guest_engagement_proposals",
      params: { proposal_type: "conversion_nudge" },
      approvalLevel: "auto",
      variant: "secondary",
    });
  }

  // Tertiary: always offer full analytics
  if (actions.length < MAX_ACTIONS) {
    actions.push({
      label: "Ver analytics completos",
      server: "guest_management",
      tool: "get_guest_analytics_enhanced",
      params: {},
      approvalLevel: "auto",
      variant: "secondary",
    });
  }

  return actions.slice(0, MAX_ACTIONS);
}

// ═══════════════════════════════════════════════════════════
// §7 — TONE & PRIORITY DERIVATION
// ═══════════════════════════════════════════════════════════

function deriveTone(mode: GuestDashboardMode): ConciergeTone {
  switch (mode) {
    case "calm": return "warm";
    case "alert": return "urgent";
    case "critical": return "commanding";
    case "celebration": return "celebratory";
  }
}

function derivePriority(input: ConciergeInput): ConciergePriority {
  if (input.mode === "critical" || input.hasCritical) return "critical";
  if (input.mode === "alert") return "high";
  if (input.insights.some((i) => i.severity === "high")) return "high";
  if (input.insights.length > 0) return "medium";
  return "info";
}

// ═══════════════════════════════════════════════════════════
// §8 — EXPORTS
// ═══════════════════════════════════════════════════════════

/**
 * Generate a complete concierge narrative from dashboard data.
 * The narrative tells the staff what matters, why, and what to do next.
 *
 * @param input - Enriched dashboard data extracted by the Voice component
 * @returns Complete narrative with greeting, headline, body, actions, tone
 *
 * @example
 * const narrative = generateNarrative({
 *   mode: "alert",
 *   insights: advisorInsights,
 *   healthScore: 72,
 *   // ... other fields
 * });
 * // narrative.headline → "La etapa 'Primera Visita' necesita atención"
 * // narrative.actions → [{ label: "Revisar bloqueo", ... }]
 */
export function generateNarrative(input: ConciergeInput): ConciergeNarrative {
  return {
    greeting: getTimeGreeting(),
    headline: generateHeadline(input),
    body: generateBody(input),
    actions: extractActions(input),
    tone: deriveTone(input.mode),
    priority: derivePriority(input),
  };
}

/**
 * Safe variant — never throws. Returns a fallback narrative on error.
 * Used as a defensive wrapper by the Voice component.
 */
export function generateNarrativeSafe(input: ConciergeInput): ConciergeNarrative {
  try {
    return generateNarrative(input);
  } catch {
    return {
      greeting: getTimeGreeting(),
      headline: "Sistema de inteligencia de invitados activo",
      body: "Procesando datos del ecosistema...",
      actions: [{
        label: "Ver analytics",
        server: "guest_management",
        tool: "get_guest_analytics_enhanced",
        params: {},
        approvalLevel: "auto",
        variant: "secondary",
      }],
      tone: "warm",
      priority: "info",
    };
  }
}