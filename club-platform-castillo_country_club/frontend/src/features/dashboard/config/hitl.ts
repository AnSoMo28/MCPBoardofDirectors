/**
 * @module features/dashboard/config/hitl (Fase 25)
 * @note Types, constants, agent targets for HITL approval queue.
 *       HitlItem extended with optional AI context fields.
 */

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type HitlPriority = "high" | "medium" | "low";

export interface HitlItem {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  priority: HitlPriority;
  type: string;
  /** AI context — optional. If present, card shows decision preview. */
  agentTarget?: string;
  affectedScope?: string;
  reversible?: boolean;
}

/* ═══════════════════════════════════════
   Priority Display
   ═══════════════════════════════════════ */

export const PRIORITY_STYLES: Record<
  HitlPriority,
  { dot: string; label: string; accent: string }
> = {
  high: {
    dot: "var(--color-rose-400)",
    label: "Urgente",
    accent: "var(--color-rose-400)",
  },
  medium: {
    dot: "var(--color-gold-400)",
    label: "Normal",
    accent: "var(--color-gold-400)",
  },
  low: {
    dot: "var(--color-teal-400)",
    label: "Baja",
    accent: "var(--color-teal-400)",
  },
};

/* ═══════════════════════════════════════
   Agent Targets — maps item.type → agent name
   ═══════════════════════════════════════ */

export const AGENT_TARGETS: Record<string, string> = {
  membership: "Finanzas",
  payment: "Finanzas",
  billing: "Finanzas",
  event: "Eventos",
  reservation: "Eventos",
  access: "Operaciones",
  maintenance: "Operaciones",
  complaint: "Satisfacción",
  feedback: "Satisfacción",
  communication: "Comunicación",
  wellness: "Bienestar",
};

/* ═══════════════════════════════════════
   Animation Constants
   ═══════════════════════════════════════ */

export const HITL_TIMING = {
  containerDelay: 0.45,
  containerDuration: 0.5,
  cardDuration: 0.3,
  cardStagger: 0.06,
  /** How long the reject confirmation window lasts */
  rejectConfirmMs: 4000,
  /** How long the decision feedback (glow) shows before calling parent */
  decisionFeedbackMs: 800,
} as const;