/**
 * @module features/ai-system/types (Fase 25 — NEW)
 * @note Type definitions for the AI System Health page.
 *       No runtime code — pure types.
 */

/* ═══════════════════════════════════════
   System Health
   ═══════════════════════════════════════ */

export type SystemHealthLevel =
  | "healthy"
  | "good"
  | "warning"
  | "critical";

/* ═══════════════════════════════════════
   Sections
   ═══════════════════════════════════════ */

export type SectionId =
  | "dashboard"
  | "commands"
  | "rules"
  | "simulator";

/* ═══════════════════════════════════════
   Activity Feed
   ═══════════════════════════════════════ */

export type ActivityType =
  | "analysis"
  | "proposal"
  | "approve"
  | "implement"
  | "command"
  | "simulation";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string; /* ISO string */
}

/* ═══════════════════════════════════════
   Awareness History
   ═══════════════════════════════════════ */

export interface AwarenessDataPoint {
  score: number;
  timestamp: number;
}

/* ═══════════════════════════════════════
   Pending Approval (for data sources)
   ═══════════════════════════════════════ */

export interface PendingApprovalSummary {
  id: string;
  title: string;
  status: string;
}