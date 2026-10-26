/**
 * @module features/approvals/types (Fase 25 — MERGE)
 * @note Merges existing agent/status/level config with new approval request types.
 *       AGENT_LABELS uses real backend agent_name values.
 *       AGENT_ACCENT uses CHART_PALETTE from shared.
 *       ApprovalStatusConfig adds sortOrder from original.
 * @import import { AGENT_LABELS, AGENT_ACCENT, type ApprovalRequest } from './types';
 */

import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import {
  Clock,
  CheckCircle2,
  XCircle,
  X,
  type LucideIcon,
} from "lucide-react";

/* ═══════════════════════════════════════
   Approval Request Types (backend-aligned)
   ═══════════════════════════════════════ */

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type ApprovalLevel =
  | "auto"
  | "semi_auto"
  | "hitl"
  | "always_human";

export interface ApprovalRequest {
  request_id: string;
  agent: string;
  tool: string;
  params: Record<string, unknown>;
  requested_by: string;
  approval_level: ApprovalLevel;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  expires_at: string | null;
  risk_summary: string;
  estimated_impact: string;
  affected_count: number;
  requires_dual_approval: boolean;
  first_approval_by: string | null;
  second_approval_by: string | null;
}

export interface ApprovalListResponse {
  requests: ApprovalRequest[];
  total: number;
}

/* ═══════════════════════════════════════
   Status Config
   ═══════════════════════════════════════ */

export interface ApprovalStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
  sortOrder: number;
}

export const APPROVAL_STATUS_CONFIG: Record<
  ApprovalStatus,
  ApprovalStatusConfig
> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "rgba(251, 191, 36, 0.1)",
    icon: Clock,
    sortOrder: 0,
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-emerald-400)",
    bgColor: "rgba(52, 211, 153, 0.1)",
    icon: CheckCircle2,
    sortOrder: 1,
  },
  rejected: {
    label: "Rechazado",
    color: "var(--color-rose-400)",
    bgColor: "rgba(251, 113, 133, 0.1)",
    icon: XCircle,
    sortOrder: 2,
  },
  expired: {
    label: "Expirado",
    color: "var(--color-silver-500)",
    bgColor: "rgba(122, 117, 112, 0.1)",
    icon: Clock,
    sortOrder: 3,
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-silver-500)",
    bgColor: "rgba(160, 154, 146, 0.1)",
    icon: X,
    sortOrder: 4,
  },
};

/* ═══════════════════════════════════════
   Level Config
   ═══════════════════════════════════════ */

export interface ApprovalLevelConfig {
  label: string;
  color: string;
  description: string;
}

export const APPROVAL_LEVEL_CONFIG: Record<
  ApprovalLevel,
  ApprovalLevelConfig
> = {
  auto: {
    label: "Auto",
    color: "var(--color-silver-400)",
    description: "Sin intervención humana",
  },
  semi_auto: {
    label: "Semi-auto",
    color: "var(--color-teal-400)",
    description: "Revisión condicional",
  },
  hitl: {
    label: "Requiere aprobación",
    color: "var(--color-amber-400)",
    description: "Aprobación humana requerida",
  },
  always_human: {
    label: "Siempre humano",
    color: "var(--color-rose-400)",
    description: "Doble confirmación requerida",
  },
};

/* ═══════════════════════════════════════
   Agent Labels (backend agent_name → display)
   Single source of truth. ApprovalQueue imports from here.
   ═══════════════════════════════════════ */

export const AGENT_LABELS: Record<string, string> = {
  /* Core agents (backend agent_name values) */
  finance: "Finanzas",
  family_profile: "Familias",
  guest_management: "Invitados",
  event_orchestrator: "Eventos",
  proactive_recommendation: "Recomendaciones",
  /* Extended agents */
  communication: "Comunicaciones",
  communication_agent: "Comunicaciones",
  member_engagement: "Engagement",
  satisfaction: "Satisfacción",
  wellness: "Bienestar",
  executive_dashboard: "Dashboard",
  operations: "Operaciones",
  hitl: "Sistema",
};

export const AGENT_ACCENT: Record<string, string> = {
  /* Core */
  finance: CHART_PALETTE.gold,
  family_profile: CHART_PALETTE.emerald,
  guest_management: CHART_PALETTE.terracotta,
  event_orchestrator: CHART_PALETTE.sage,
  proactive_recommendation: CHART_PALETTE.sage,
  /* Extended */
  communication: CHART_PALETTE.teal,
  communication_agent: CHART_PALETTE.teal,
  member_engagement: CHART_PALETTE.emerald,
  satisfaction: CHART_PALETTE.amber,
  wellness: CHART_PALETTE.teal,
  executive_dashboard: CHART_PALETTE.silver,
  operations: CHART_PALETTE.terracotta,
  hitl: CHART_PALETTE.silver,
};

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

export function getRiskColor(text: string | null | undefined): string {
  if (!text) return "var(--color-silver-400)";
  const lower = text.toLowerCase();
  if (
    lower.includes("crítico") ||
    lower.includes("critical") ||
    lower.includes("alto") ||
    lower.includes("emergency")
  )
    return "var(--color-rose-400)";
  if (
    lower.includes("medio") ||
    lower.includes("medium") ||
    lower.includes("masivo")
  )
    return "var(--color-amber-400)";
  return "var(--color-silver-400)";
}