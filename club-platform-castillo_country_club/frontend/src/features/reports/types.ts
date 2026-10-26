// src/features/reports/types.ts
// Pure type definitions for the reports module.
//
// Risk visualization types, configs, and helpers live in:
//   → shared/lib/riskTheme.ts
//
// Re-exported here for backward compatibility so existing
// imports from this path continue to work.

// ── Re-exports from riskTheme (backward compat) ──

export type { RiskCategory, RiskLevel } from "@/shared/lib/riskTheme";
export {
  RISK_CATEGORY_CONFIG,
  RISK_LEVEL_CONFIG,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  getRiskLevel,
  getRiskCellColor,
  getRiskCellBg,
} from "@/shared/lib/riskTheme";

// ── Report types ──

export type ReportType = "monthly" | "quarterly" | "annual" | "special";

export type ReportStatus = "draft" | "review" | "approved" | "published";

export interface BoardReport {
  id: string;
  title: string;
  type: ReportType;
  period: string;
  status: ReportStatus;
  generated_at: string;
  generated_by: "ai" | "human";
  approved_by?: string;
  sections: ReportSection[];
  executive_summary: string;
  metadata: ReportMetadata;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  type: "narrative" | "kpi" | "chart" | "table" | "recommendation";
  ai_confidence?: number;
}

export interface ReportMetadata {
  total_families: number;
  active_members: number;
  revenue_total: number;
  revenue_change_pct: number;
  occupancy_rate: number;
  satisfaction_nps: number;
  youth_engagement_pct: number;
  senior_engagement_pct: number;
}

// ── Risk data types ──

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  category: import("@/shared/lib/riskTheme").RiskCategory;
  probability: number;
  impact: number;
  score: number;
  level: import("@/shared/lib/riskTheme").RiskLevel;
  mitigation: string;
  owner: string;
  identified_at: string;
  review_date?: string;
}

export interface RiskSummary {
  total_risks: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  items: RiskItem[];
}

// ── Report config maps ──

export const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; description: string }
> = {
  monthly: {
    label: "Mensual",
    description: "Reporte operativo del mes",
  },
  quarterly: {
    label: "Trimestral",
    description: "Reporte para reunión de Junta",
  },
  annual: {
    label: "Anual",
    description: "Informe anual de gestión",
  },
  special: {
    label: "Especial",
    description: "Reporte ad-hoc",
  },
};

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badgeVariant: "success" | "warning" | "danger" | "default" }
> = {
  draft: { label: "Borrador", badgeVariant: "default" },
  review: { label: "En Revisión", badgeVariant: "warning" },
  approved: { label: "Aprobado", badgeVariant: "success" },
  published: { label: "Publicado", badgeVariant: "success" },
};
