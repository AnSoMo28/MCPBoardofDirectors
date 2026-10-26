/**
 * @module features/settings/types (Fase 25 — NEW)
 * @note Types for the settings page: agent status, profile AI metrics.
 */

/* ═══════════════════════════════════════
   Profile AI Metrics
   ═══════════════════════════════════════ */

export interface ProfileAIMetric {
  label: string;
  value: string | number;
  max?: number;
  color: string;
}

/* ═══════════════════════════════════════
   Agent Status
   ═══════════════════════════════════════ */

export interface SettingAgentStatus {
  id: string;
  label: string;
  accent: string;
  isActive: boolean;
  statusText: string;
}