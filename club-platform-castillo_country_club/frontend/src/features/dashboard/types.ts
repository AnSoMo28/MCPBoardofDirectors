// src/features/dashboard/types.ts
// ═══════════════════════════════════════════════════════════
// Fase 16 — ExecutiveDashboard Enhancement
// Source: backend/src/club_mcp/models/executive_dashboard.py
// Source: backend/src/club_mcp/agents/executive_dashboard_agent.py
//
// Pattern: features/recommendations/types.ts
// ═══════════════════════════════════════════════════════════
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import {
  AGE_GROUP_DISPLAY,
  LEGACY_DASHBOARD_AGE_GROUP_MAP,
  TIER_DISPLAY,
} from "@/shared/types/domain-enums";
import type {
  AdvisorInsightBase,
  AdvisorCommand,
  AdvisorLayer,
} from "@/shared/types/ai-intelligence";
// ── Enums ──────────────────────────────────────────────────

export enum DashboardPeriod {
  CurrentMonth = "current_month",
  CurrentQuarter = "current_quarter",
  YTD = "ytd",
  Custom = "custom",
}

/**
 * @deprecated Import from @/shared/types/domain-enums instead.
 * Will be removed in B5.
 */
export enum TrendDirection {
  Improving = "improving",
  Stable = "stable",
  Declining = "declining",
}

export enum AnomalySeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

export enum AnomalyDomain {
  Membership = "membership",
  Financial = "financial",
  Operational = "operational",
  Engagement = "engagement",
  Facilities = "facilities",
}

export enum ReportAudience {
  Internal = "internal",
  Board = "board",
  Members = "members",
  External = "external",
}

export enum ReportQuarter {
  Q1 = "Q1",
  Q2 = "Q2",
  Q3 = "Q3",
  Q4 = "Q4",
}

export enum ExportFormat {
  PDF = "pdf",
  Excel = "excel",
  CSV = "csv",
}

// ── Backend-Aligned Interfaces (1:1 con Pydantic) ─────────

export interface MembershipKPI {
  total_families: number;
  total_members: number;
  active_members: number;
  new_this_period: number;
  departures: number;
  net_growth: number;
  growth_rate_pct: number;
  churn_risk_count: number;
  avg_engagement_score: number;
  by_tier: Record<string, number>;
}

export interface FinancialKPI {
  revenue: number;
  expenses: number;
  net_income: number;
  outstanding_dues: number;
  collection_rate_pct: number;
  budget_variance_pct: number;
  revenue_growth_pct: number;
  top_revenue_sources: Array<{ source: string; amount: number }>;
}

export interface OperationalKPI {
  events_held: number;
  events_upcoming: number;
  avg_event_attendance: number;
  attendance_trend: TrendDirection;
  facility_utilization_pct: number;
  maintenance_pending: number;
  guest_visits: number;
  active_trial_memberships: number;
  top_activities: Array<{ name: string; participation: number; change_pct: number }>;
}

export interface EngagementKPI {
  satisfaction_score: number;
  loyalty_points_distributed: number;
  nps_score: number;
  engagement_trend: TrendDirection;
  at_risk_members: number;
  highly_engaged_pct: number;
  campaigns_active: number;
  referrals_this_period: number;
}

export interface ExecutiveSummaryData {
  id: string;
  period: DashboardPeriod;
  date_from: string;
  date_to: string;
  membership: MembershipKPI;
  financial: FinancialKPI;
  operational: OperationalKPI;
  engagement: EngagementKPI;
  trends: Record<string, string>;
  created_at?: string;
}

export interface AnomalyData {
  id: string;
  domain: AnomalyDomain;
  severity: AnomalySeverity;
  title: string;
  description: string;
  context: Record<string, unknown>;
  suggested_action: string;
  created_at?: string;
}

export interface AgeGroupEntry {
  members: number;
  activities: number;
  participation_pct: number;
}

export interface BoardReportData {
  id: string;
  year: number;
  quarter: ReportQuarter;
  executive_summary: string;
  membership_analysis: string;
  financial_performance: string;
  operational_excellence: string;
  member_satisfaction: string;
  strategic_recommendations: string[];
  risk_assessment: string[];
  outlook: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExportRequestData {
  id: string;
  report_type: string;
  export_format: ExportFormat;
  audience: ReportAudience;
  status: string;
  file_path: string;
  created_at?: string;
  updated_at?: string;
}

// ── Response Types ─────────────────────────────────────────

export interface ExecutiveSummaryResponse {
  status: string;
  message: string;
  summary: ExecutiveSummaryData;
}

export interface FinancialOverviewResponse {
  status: string;
  message: string;
  financial: FinancialKPI;
  margin_pct: number;
}

export interface MembershipHealthResponse {
  status: string;
  message: string;
  membership: MembershipKPI;
  tier_distribution_pct: Record<string, number>;
}

export interface OperationalPulseResponse {
  status: string;
  message: string;
  operational: OperationalKPI;
}

export interface DetectAnomaliesResponse {
  status: string;
  message: string;
  anomalies: AnomalyData[];
  total_anomalies: number;
  severity_counts: Record<string, number>;
}

export interface AgeGroupBalanceResponse {
  status: string;
  message: string;
  distribution: Record<string, AgeGroupEntry>;
  gini_coefficient: number;
  balance_score: string;
  underrepresented: string[];
  overrepresented: string[];
  recommendations: string[];
}

export interface BoardReportPendingResponse {
  status: "pending_approval";
  request_id: string;
  message: string;
  details: { year: number; quarter: string };
}

export interface BoardReportSuccessResponse {
  status: "success";
  message: string;
  report: BoardReportData;
}

export type BoardReportResponse = BoardReportPendingResponse | BoardReportSuccessResponse;

export interface ExportPendingResponse {
  status: "pending_approval";
  request_id: string;
  message: string;
  details: { report_type: string; format: string; audience: string };
}

export interface ExportSuccessResponse {
  status: "success";
  message: string;
  export: ExportRequestData;
}

export type ExportResponse = ExportPendingResponse | ExportSuccessResponse;

// ── Derived Types (sub-component interfaces) ──────────────

export interface KPIData {
  revenue: number;
  revenueChange: number;
  families: number;
  familiesChange: number;
  engagement: number;
  engagementChange: number;
  nps: number;
  npsChange: number;
  facilityUtilization: number;
  facilityChange: number;
  events: number;
  eventsChange: number;
}

export interface TierData {
  tier: string;
  count: number;
  color: string;
}

export interface ActivityData {
  name: string;
  participants: number;
  change: number;
  icon?: string;
}

export interface RevenueSourceData {
  source: string;
  amount: number;
}

export interface AnomalyUI {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  detectedAt: string;
  category: string;
  recommendation: string;
}

export interface HitlItem {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  priority: "high" | "medium" | "low";
  type: string;
}

export interface AgeGroupData {
  ageGroup: string;
  label: string;
  color: string;
  memberCount: number;
  memberPct: number;
  activityPct: number;
}

export interface YoYComparison {
  current: number;
  previous: number;
  change_pct: number;
}

export interface YoYData {
  revenue?: YoYComparison;
  families?: YoYComparison;
  engagement?: YoYComparison;
  nps?: YoYComparison;
  facilityUtilization?: YoYComparison;
  events?: YoYComparison;
}

// ── Config Maps ────────────────────────────────────────────

/**
 * Tier display — mapped from master MemberTier.
 * Only the 3 tiers used by dashboard, but sourced from master.
 */
export const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  basic: {
    label: TIER_DISPLAY.basic.label,
    color: TIER_DISPLAY.basic.color,
  },
  premium: {
    label: TIER_DISPLAY.premium.label,
    color: TIER_DISPLAY.premium.color,
  },
  vip: {
    label: TIER_DISPLAY.vip.label,
    color: TIER_DISPLAY.vip.color,
  },
};
/** CHART_PALETTE hex for Recharts SVG fill (Rule #3). */
const TIER_CHART_COLORS: Record<string, string> = {
  basic: CHART_PALETTE.silver,
  premium: CHART_PALETTE.gold,
  vip: CHART_PALETTE.teal,
};

export const ANOMALY_SEVERITY_CONFIG: Record<
  AnomalySeverity,
  { label: string; color: string; bg: string; border: string }
> = {
  [AnomalySeverity.Low]: {
    label: "Informativo",
    color: "var(--color-teal-400)",
    bg: "transparent",
    border: "rgba(255,255,255,0.06)",
  },
  [AnomalySeverity.Medium]: {
    label: "Atención",
    color: "var(--color-amber-400)",
    bg: "color-mix(in srgb, var(--color-amber-400) 5%, transparent)",
    border: "color-mix(in srgb, var(--color-amber-400) 20%, transparent)",
  },
  [AnomalySeverity.High]: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bg: "color-mix(in srgb, var(--color-rose-400) 5%, transparent)",
    border: "color-mix(in srgb, var(--color-rose-400) 20%, transparent)",
  },
  [AnomalySeverity.Critical]: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bg: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    border: "color-mix(in srgb, var(--color-rose-400) 30%, transparent)",
  },
};

export const ANOMALY_DOMAIN_CONFIG: Record<
  AnomalyDomain,
  { label: string; icon: string; route: string }
> = {
  [AnomalyDomain.Membership]: {
    label: "Membresía",
    icon: "TrendingDown",
    route: "/admin/families",
  },
  [AnomalyDomain.Financial]: {
    label: "Finanzas",
    icon: "DollarSign",
    route: "/admin/finance",
  },
  [AnomalyDomain.Operational]: {
    label: "Operaciones",
    icon: "Settings",
    route: "/admin/dashboard",
  },
  [AnomalyDomain.Engagement]: {
    label: "Engagement",
    icon: "BarChart3",
    route: "/admin/engagement",
  },
  [AnomalyDomain.Facilities]: {
    label: "Instalaciones",
    icon: "Building2",
    route: "/admin/facilities",
  },
};

export const TREND_CONFIG: Record<
  TrendDirection,
  { label: string; icon: string; color: string }
> = {
  [TrendDirection.Improving]: {
    label: "Mejorando",
    icon: "TrendingUp",
    color: "var(--color-emerald-400)",
  },
  [TrendDirection.Stable]: {
    label: "Estable",
    icon: "Minus",
    color: "var(--color-silver-400)",
  },
  [TrendDirection.Declining]: {
    label: "Descendiendo",
    icon: "TrendingDown",
    color: "var(--color-rose-400)",
  },
};

export const DASHBOARD_PERIOD_CONFIG: Record<
  DashboardPeriod,
  { label: string; shortLabel: string }
> = {
  [DashboardPeriod.CurrentMonth]: { label: "Mes actual", shortLabel: "Mes" },
  [DashboardPeriod.CurrentQuarter]: {
    label: "Trimestre actual",
    shortLabel: "Trim.",
  },
  [DashboardPeriod.YTD]: { label: "Año en curso", shortLabel: "YTD" },
  [DashboardPeriod.Custom]: { label: "Personalizado", shortLabel: "Custom" },
};

export const BALANCE_LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; description: string }
> = {
  excellent: {
    label: "Excelente",
    color: "var(--color-emerald-400)",
    description: "Distribución equilibrada entre todos los grupos etarios.",
  },
  good: {
    label: "Buena",
    color: "var(--color-gold-400)",
    description:
      "Ligero desbalance que puede mejorarse con actividades dirigidas.",
  },
  fair: {
    label: "Moderada",
    color: "var(--color-amber-400)",
    description: "Desbalance notable. Considerar programas específicos.",
  },
  poor: {
    label: "Crítica",
    color: "var(--color-rose-400)",
    description: "Desbalance severo. Se requieren acciones inmediatas.",
  },
};

// ── Age Group Mapping ──────────────────────────────────────

/**
 * Age group display — mapped from master AgeGroupCategory.
 * Legacy keys (children_0_5 etc.) mapped via LEGACY_DASHBOARD_AGE_GROUP_MAP.
 */


export const AGE_GROUP_MAP: Record<
  string,
  { label: string; color: string }
> = Object.fromEntries(
  Object.entries(LEGACY_DASHBOARD_AGE_GROUP_MAP).map(
    ([legacyKey, masterKey]) => [
      legacyKey,
      {
        label: `${AGE_GROUP_DISPLAY[masterKey].label} (${AGE_GROUP_DISPLAY[masterKey].ageRange})`,
        color: AGE_GROUP_DISPLAY[masterKey].color,
      },
    ],
  ),
);

// ── Transform Helpers ──────────────────────────────────────

/**
 * ExecutiveSummaryData (backend) → KPIData (KPICards sub-component).
 * Flattens the 4 KPI structs into a single flat object.
 * Change values: uses growth_pct where available, 0 otherwise.
 */
export function summaryToKPIs(summary: ExecutiveSummaryData): KPIData {
  return {
    revenue: summary.financial.revenue,
    revenueChange: summary.financial.revenue_growth_pct,
    families: summary.membership.total_families,
    familiesChange: summary.membership.growth_rate_pct,
    engagement: summary.membership.avg_engagement_score,
    engagementChange: 0,
    nps: summary.engagement.nps_score,
    npsChange: 0,
    facilityUtilization: summary.operational.facility_utilization_pct,
    facilityChange: 0,
    events: summary.operational.events_held,
    eventsChange: 0,
  };
}

/**
 * MembershipKPI.by_tier → TierData[] (MembershipDonut).
 * Maps tier keys via TIER_CONFIG for label + color.
 */
export function buildTierData(
  byTier: Record<string, number>,
): TierData[] {
  return Object.entries(byTier).map(([tier, count]) => ({
    tier,
    count,
    color: TIER_CHART_COLORS[tier] ?? CHART_PALETTE.silver,
  }));
}
/**
 * OperationalKPI.top_activities → ActivityData[] (TopActivities).
 * Maps field names: participation → participants, change_pct → change.
 */
export function buildActivityData(
  topActivities: OperationalKPI["top_activities"],
): ActivityData[] {
  return topActivities.map((a) => ({
    name: a.name,
    participants: a.participation,
    change: a.change_pct,
  }));
}

/**
 * FinancialKPI.top_revenue_sources → RevenueSourceData[] (RevenueChart).
 * Direct passthrough with typed shape.
 */
export function buildRevenueSources(
  financial: FinancialKPI,
): RevenueSourceData[] {
  return financial.top_revenue_sources.map((s) => ({
    source: s.source,
    amount: s.amount,
  }));
}

/**
 * AnomalyData (backend) → AnomalyUI (AnomalyFeed sub-component).
 * Maps: domain → category, created_at → detectedAt,
 *        suggested_action → recommendation.
 */
export function anomalyToUI(anomaly: AnomalyData): AnomalyUI {
  return {
    id: anomaly.id,
    title: anomaly.title,
    description: anomaly.description,
    severity: anomaly.severity,
    detectedAt: anomaly.created_at || new Date().toISOString(),
    category: anomaly.domain,
    recommendation: anomaly.suggested_action,
  };
}

/**
 * AgeGroupBalanceResponse → AgeGroupData[] (AgeBalanceWidget).
 * Maps backend age group keys to UI labels + colors via AGE_GROUP_MAP.
 * Computes memberPct from distribution totals.
 */
export function ageGroupToUI(
  response: AgeGroupBalanceResponse,
): AgeGroupData[] {
  const totalMembers = Object.values(response.distribution).reduce(
    (sum, entry) => sum + entry.members,
    0,
  );

  return Object.entries(response.distribution).map(([key, entry]) => ({
    ageGroup: key,
    label: AGE_GROUP_MAP[key]?.label ?? key.replace(/_/g, " "),
    color: AGE_GROUP_MAP[key]?.color ?? "var(--color-silver-500)",
    memberCount: entry.members,
    memberPct: totalMembers > 0 ? (entry.members / totalMembers) * 100 : 0,
    activityPct: entry.participation_pct,
  }));
}

/**
 * Calculates executive health score from summary data.
 * Returns 0-100 score with level + color.
 *
 * Factors:
 *   Membership growth  (0-20)  — growth_rate_pct
 *   Collection rate     (0-25)  — collection_rate_pct + budget_variance
 *   Utilization         (0-15)  — sweet spot 60-85%
 *   Satisfaction        (0-20)  — satisfaction_score × 4
 *   Risk management     (0-20)  — penalize churn_risk_count
 */
/**
 * @deprecated Use computeHealthScore from @/shared/lib/advisor-engine with
 * GLOBAL_HEALTH_FACTORS from @/shared/lib/advisor-engine/rules/global instead.
 * Will be removed in B5 when KPICards/IntelligenceStrip migrate.
 */
export function calculateExecutiveHealthScore(summary: ExecutiveSummaryData): {
  score: number;
  level: string;
  color: string;
} {
  const m = summary.membership;
  const f = summary.financial;
  const o = summary.operational;
  const e = summary.engagement;

  // Membership growth (0-20)
  const growthRaw = Math.min(Math.max(m.growth_rate_pct, -5), 10);
  const growthScore = ((growthRaw + 5) / 15) * 20;

  // Financial health (0-25)
  const collectionScore = Math.min(f.collection_rate_pct / 100, 1) * 15;
  const budgetScore =
    Math.max(0, 1 - Math.abs(f.budget_variance_pct) / 20) * 10;
  const financialScore = collectionScore + budgetScore;

  // Utilization (0-15) — sweet spot 60-85%
  const util = o.facility_utilization_pct;
  let utilScore: number;
  if (util >= 60 && util <= 85) utilScore = 15;
  else if (util > 85) utilScore = 15 - (util - 85) * 0.5;
  else utilScore = (util / 60) * 12;
  utilScore = Math.max(0, Math.min(15, utilScore));

  // Satisfaction (0-20)
  const satisfactionScore = Math.min(e.satisfaction_score / 5, 1) * 20;

  // Risk management (0-20)
  const riskPenalty = Math.min(m.churn_risk_count / 50, 1) * 20;
  const riskScore = 20 - riskPenalty;

  const total = Math.round(
    growthScore + financialScore + utilScore + satisfactionScore + riskScore,
  );
  const clamped = Math.max(0, Math.min(100, total));

  let level: string;
  let color: string;
  if (clamped >= 85) {
    level = "Excepcional";
    color = "var(--color-emerald-400)";
  } else if (clamped >= 65) {
    level = "Saludable";
    color = "var(--color-teal-400)";
  } else if (clamped >= 45) {
    level = "Atención";
    color = "var(--color-amber-400)";
  } else {
    level = "Crítico";
    color = "var(--color-rose-400)";
  }

  return { score: clamped, level, color };
}

// ── Advisor Recommendation Engine ─────────────────────────

export interface AdvisorRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "positive";
  title: string;
  description: string;
  action: {
    label: string;
    route: string;
    toast: string;
  };
}

export const RECO_PRIORITY_CONFIG: Record<
  AdvisorRecommendation["priority"],
  { label: string; color: string; bg: string; sort: number }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bg: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    sort: 0,
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    bg: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    sort: 1,
  },
  medium: {
    label: "Medio",
    color: "var(--color-gold-400)",
    bg: "color-mix(in srgb, var(--color-gold-400) 8%, transparent)",
    sort: 2,
  },
  positive: {
    label: "Positivo",
    color: "var(--color-emerald-400)",
    bg: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
    sort: 3,
  },
};

/**
 * Client-side recommendation engine for ExecutiveDashboard.
 * Computes from already-loaded data — 0ms latency, 0 network calls.
 *
 * Rules applied: Rule #19 (never auto-load intelligence — caller uses CTA).
 */
/**
 * @deprecated Logic migrated to declarative rules in
 * @/shared/lib/advisor-engine/rules/global.ts (GLOBAL_RULES, 25 rules).
 * Will be removed in B5 when consumers migrate to useGlobalAdvisor.
 */
export function generateExecutiveRecommendations(
  summary: ExecutiveSummaryData,
  anomalies?: DetectAnomaliesResponse,
  ageBalance?: AgeGroupBalanceResponse,
): AdvisorRecommendation[] {
  const recs: AdvisorRecommendation[] = [];
  const m = summary.membership;
  const f = summary.financial;
  const o = summary.operational;
  const e = summary.engagement;

  // ── Membership ─────────────────────────────────────────
  if (m.churn_risk_count > 20) {
    recs.push({
      id: "rec-churn",
      priority: "high",
      title: "Retención de membresías en riesgo",
      description: `${m.churn_risk_count} familias identificadas con riesgo de cancelación. La tasa de churn requiere atención inmediata para evitar pérdida de base.`,
      action: {
        label: "Gestionar retención",
        route: "/admin/families",
        toast: "Abriendo gestión de familias...",
      },
    });
  }

  if (m.growth_rate_pct < 2 && m.growth_rate_pct >= 0) {
    recs.push({
      id: "rec-growth-stagnation",
      priority: "medium",
      title: "Crecimiento de membresía estancado",
      description: `El crecimiento está en ${m.growth_rate_pct.toFixed(1)}%, por debajo del objetivo del 3%. Considerar campañas de adquisición y referidos.`,
      action: {
        label: "Ver membresías",
        route: "/admin/families",
        toast: "Abriendo panel de membresías...",
      },
    });
  }

  // ── Financial ──────────────────────────────────────────
  if (f.collection_rate_pct < 90) {
    recs.push({
      id: "rec-collection",
      priority: "high",
      title: "Tasa de cobro deficiente",
      description: `La cobranza está en ${f.collection_rate_pct.toFixed(1)}%. Hay ${(f.outstanding_dues / 1_000_000).toFixed(1)}M pendientes de cobro que afectan el flujo de caja.`,
      action: {
        label: "Gestionar cobranza",
        route: "/admin/finance",
        toast: "Abriendo centro de facturación...",
      },
    });
  }

  if (f.budget_variance_pct > 10) {
    recs.push({
      id: "rec-budget",
      priority: "medium",
      title: "Desviación presupuestaria significativa",
      description: `Los gastos exceden el presupuesto en ${f.budget_variance_pct.toFixed(1)}%. Revisar partidas desviadas y ajustar proyecciones.`,
      action: {
        label: "Ver finanzas",
        route: "/admin/finance",
        toast: "Abriendo dashboard financiero...",
      },
    });
  }

  // ── Operational ────────────────────────────────────────
  if (o.facility_utilization_pct < 60) {
    recs.push({
      id: "rec-utilization",
      priority: "medium",
      title: "Baja utilización de instalaciones",
      description: `La utilización está en ${o.facility_utilization_pct.toFixed(1)}%, por debajo del rango óptimo (60-85%). Evaluar promociones y horarios.`,
      action: {
        label: "Ver instalaciones",
        route: "/admin/facilities",
        toast: "Abriendo gestión de instalaciones...",
      },
    });
  }

  // ── Engagement ─────────────────────────────────────────
  if (e.nps_score < 30) {
    recs.push({
      id: "rec-nps",
      priority: "high",
      title: "NPS en zona crítica",
      description: `El NPS está en +${e.nps_score.toFixed(0)}, en zona crítica. Se recomienda encuesta de satisfacción profunda para identificar causas raíz.`,
      action: {
        label: "Ver engagement",
        route: "/admin/engagement",
        toast: "Abriendo panel de engagement...",
      },
    });
  }

  if (e.at_risk_members > 30) {
    recs.push({
      id: "rec-at-risk",
      priority: "high",
      title: "Miembros en riesgo de desvinculación",
      description: `${e.at_risk_members} miembros identificados como en riesgo. Implementar programa de reconexión personalizada.`,
      action: {
        label: "Gestionar engagement",
        route: "/admin/engagement",
        toast: "Abriendo panel de engagement...",
      },
    });
  }

  // ── Cross-reference: anomalies ─────────────────────────
  if (anomalies && anomalies.total_anomalies > 3) {
    const criticalCount =
      anomalies.severity_counts?.critical ??
      anomalies.severity_counts?.high ??
      0;
    recs.push({
      id: "rec-anomalies",
      priority: criticalCount > 0 ? "critical" : "high",
      title: "Múltiples anomalías activas",
      description: `${anomalies.total_anomalies} anomalías detectadas${criticalCount > 0 ? `, ${criticalCount} de alta severidad` : ""}. Revisión prioritaria recomendada.`,
      action: {
        label: "Ver anomalías",
        route: "/admin/dashboard",
        toast: "Mostrando anomalías...",
      },
    });
  }

  // ── Cross-reference: age balance ───────────────────────
  if (ageBalance && ageBalance.gini_coefficient > 0.3) {
    recs.push({
      id: "rec-age-balance",
      priority: "medium",
      title: "Desbalance etario significativo",
      description: `El coeficiente de Gini es ${ageBalance.gini_coefficient.toFixed(2)}, indicando desbalance entre grupos etarios. Grupos sub-representados: ${ageBalance.underrepresented.map((g) => g.replace(/_/g, " ")).join(", ")}.`,
      action: {
        label: "Ver balance etario",
        route: "/admin/dashboard",
        toast: "Mostrando balance etario...",
      },
    });
  }

  // ── Positive signals ───────────────────────────────────
  if (e.highly_engaged_pct > 50) {
    recs.push({
      id: "rec-engagement-strong",
      priority: "positive",
      title: "Engagement excepcional",
      description: `El ${e.highly_engaged_pct.toFixed(0)}% de los miembros están altamente comprometidos. Mantener programas de fidelidad actuales.`,
      action: {
        label: "Ver engagement",
        route: "/admin/engagement",
        toast: "Abriendo panel de engagement...",
      },
    });
  }

  if (m.growth_rate_pct > 3) {
    recs.push({
      id: "rec-growth-healthy",
      priority: "positive",
      title: "Crecimiento saludable",
      description: `El club crece a un ritmo del ${m.growth_rate_pct.toFixed(1)}% con ${m.new_this_period} nuevos ingresos este período. Estrategia efectiva.`,
      action: {
        label: "Ver familias",
        route: "/admin/families",
        toast: "Abriendo panel de familias...",
      },
    });
  }

  if (f.revenue_growth_pct > 5) {
    recs.push({
      id: "rec-revenue-growth",
      priority: "positive",
      title: "Ingresos en crecimiento",
      description: `Los ingresos crecieron ${f.revenue_growth_pct.toFixed(1)}% respecto al período anterior. Excelente performance financiera.`,
      action: {
        label: "Ver finanzas",
        route: "/admin/finance",
        toast: "Abriendo dashboard financiero...",
      },
    });
  }

  // Sort: critical → high → medium → positive
  return recs.sort(
    (a, b) =>
      RECO_PRIORITY_CONFIG[a.priority].sort -
      RECO_PRIORITY_CONFIG[b.priority].sort,
  );
}
// ═══════════════════════════════════════════════════════════
// Fase 20 — Global Cross-Agent Health Advisor
// ═══════════════════════════════════════════════════════════



/**
 * Global advisor layer — subset of AdvisorLayer used by the cross-agent advisor.
 * Maps to the 5-layer architecture: diagnostic → strategy → prediction → innovation → execution.
 */
export type GlobalAdvisorLayer = Extract<
  AdvisorLayer,
  "diagnostic" | "strategy" | "prediction" | "innovation" | "execution"
>;

/**
 * Global Advisor Insight — extends the shared base type.
 *
 * STRUCTURAL ALIGNMENT with AdvisorInsightBase:
 *   - layer: added (global-specific, 5 layers)
 *   - actionLabel: REMOVED → use action.label (AdvisorCommand)
 *   - actionRoute: REMOVED → use target_view (from AdvisorInsightBase)
 *   - action: added as AdvisorCommand (was missing — hook was adding it untyped)
 *
 * F47 TODO: Migrate to RuleDefinition<GlobalContext> declarative rules.
 */
export interface GlobalAdvisorInsight extends AdvisorInsightBase {
  /** Global-specific layer */
  layer: GlobalAdvisorLayer;

  /** Domain identifier */
  domain?: "global";

  /**
   * Action to execute when user clicks "Ejecutar" in the banner.
   * Maps to AdvisorCommand from ai-intelligence.ts.
   */
  action?: AdvisorCommand;
}
// ═══════════════════════════════════════════════════════════
// Advisor Action Bridge — F21
// Tipado fuerte para acciones ejecutables desde Advisor insights
// ═══════════════════════════════════════════════════════════

/**
 * Acción mutable que se puede ejecutar desde un Advisor insight.
 * Cada insight opcionalmente tiene un `action` de este tipo.
 * El banner renderiza botón "Ejecutar" solo si action existe.
 */
/**
 * @deprecated Use AdvisorCommand from @/shared/types/ai-intelligence instead.
 * Alias kept for backward compatibility. Will be removed in F47.
 */
export type AdvisorAction = AdvisorCommand;

/**
 * Estado de ejecución de una acción por insight ID.
 * Usado por banners para manejar loading/feedback por botón.
 */
/**
 * @deprecated Import from @/shared/types/ai-intelligence instead.
 * Alias kept for backward compatibility. Will be removed in B5.
 */
export type AdvisorActionState = "idle" | "loading" | "done" | "error";

/**
 * Action plan item generado por AI.
 * Extiende AdvisorAction con campos de planificación temporal.
 */
export interface AIActionPlanItem {
  title: string;
  reasoning: string;
  urgency: "today" | "this_week" | "this_month";
  action: AdvisorCommand;
  sourceInsightId: string;
  confidence: number;
}

/**
 * Plan de acción completo generado por AI.
 */
/**
 * @deprecated Use AIActionPlan from @/shared/types/ai-intelligence instead.
 * Will be removed in F47.
 */
export interface AIActionPlan {
  /** Resumen ejecutivo del plan */
  summary: string;

  /** Acciones priorizadas por urgencia */
  items: AIActionPlanItem[];

  /** Impacto total estimado */
  totalEstimatedImpact: string;

  /** Timestamp de generación */
  generatedAt: string;
}

/**
 * Narrativa AI generada para un insight específico.
 */
/**
 * @deprecated Use AINarrative from @/shared/types/ai-intelligence instead.
 * Will be removed in F47.
 */
export interface AIInsightNarrative {
  /** Insight ID al que pertenece */
  insightId: string;

  /** Explicación detallada del por qué */
  rootCause: string;

  /** Comparación con benchmarks de clubes CR */
  benchmarkComparison: string;

  /** Recomendación concreta */
  recommendation: string;

  /** Impacto estimado de la recomendación */
  estimatedImpact: string;

  /** Narrativa completa (markdown) */
  fullNarrative: string;

  /** Confianza ajustada por el análisis AI (puede diferir del determinístico) */
  adjustedConfidence: number;
}

/**
 * Escenario simulado por AI.
 */
/**
 * @deprecated Use AIScenario from @/shared/types/ai-intelligence instead.
 * Will be removed in F47.
 */
export interface AIScenario {
  /** Nombre del escenario */
  name: "optimistic" | "base" | "pessimistic";

  /** Descripción del outcome */
  description: string;

  /** Métricas proyectadas */
  projectedMetrics: Record<string, number | string>;

  /** Probabilidad estimada (0-100) */
  probability: number;
}

/**
 * Resultado completo de simulación de escenarios.
 */
/**
 * @deprecated Use AISimulation from @/shared/types/ai-intelligence instead.
 * Will be removed in F47.
 */
export interface AISimulationResult {
  /** Escenarios generados */
  scenarios: AIScenario[];

  /** Evaluación de riesgo general */
  riskAssessment: string;

  /** Escenario recomendado */
  recommendedScenario: "optimistic" | "base" | "pessimistic";

  /** Acción sugerida basada en el escenario recomendado */
  suggestedAction?: AdvisorCommand;
}
// ═══════════════════════════════════════════════════════════
// Advisor Reaction System — F22b
// Reaction insights generated after action execution.
// Closes the loop: detect → recommend → execute → confirm impact.
// ═══════════════════════════════════════════════════════════

/**
 * Status lifecycle of a reaction insight.
 * "executing"    → mutation in progress
 * "done"         → mutation completed, waiting for impact analysis
 * "impact_measured" → impact calculated, reaction ready to display
 */
export type AdvisorReactionStatus =
  | "executing"
  | "done"
  | "impact_measured";

/**
 * Reaction insight generated after an Advisor action is executed.
 * This is NOT a computed insight (like GlobalAdvisorInsight) — it's a
 * generated artifact that records what happened, estimates impact,
 * and suggests the next step. It persists in the session history.
 */
/**
 * @deprecated Use AdvisorReaction from @/shared/types/ai-intelligence instead.
 * Uses camelCase fields conflicting with AdvisorReaction snake_case convention.
 * Will be removed in B5.
 */
export interface AdvisorReactionInsight {
  id: string;
  sourceInsightId: string;

  /** Label of the action that was executed */
  sourceAction: string;

  /** Lifecycle status */
  status: AdvisorReactionStatus;

  /** When the action was executed */
  executedAt: Date;

  /** Generated confirmation text with domain-specific context */
  reaction: string;

  /** Estimated impact of the action (e.g. "+₡2.3M/año", "Liberar 5 operaciones") */
  estimatedImpact: string;

  /** Next step recommended by the Advisor */
  nextStep: string;

  /** Confidence in the impact estimate (0-100) */
  confidence: number;

  /** MCP server that executed the action */
  server: string;

  /** MCP tool that was called */
  tool: string;
}

/**
 * Config for reaction display styling by status.
 */
export const REACTION_STATUS_CONFIG: Record<
  AdvisorReactionStatus,
  { label: string; color: string; icon: string }
> = {
  executing: {
    label: "Ejecutando...",
    color: "var(--color-teal-400)",
    icon: "Loader2",
  },
  done: {
    label: "Completado",
    color: "var(--color-emerald-400)",
    icon: "Check",
  },
  impact_measured: {
    label: "Impacto medido",
    color: "var(--color-gold-400)",
    icon: "Sparkles",
  },
};
