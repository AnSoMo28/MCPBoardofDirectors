// src/features/finance/types.ts

// ── P&L Summary ──

export interface FinancialSummary {
  period: string;
  period_label: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  profit_margin: number;
  revenue_change_pct: number;
  expense_change_pct: number;
  revenue_by_category: RevenueCategory[];
  expense_by_category: ExpenseCategory[];
  monthly_trend: MonthlyTrend[];
}

export interface RevenueCategory {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  trend_pct: number;
}

export interface ExpenseCategory {
  category: string;
  label: string;
  amount: number;
  budget: number;
  variance: number;
  variance_pct: number;
}

export interface MonthlyTrend {
  month: string;
  month_label: string;
  revenue: number;
  expenses: number;
  net: number;
}

// ── Family Account ──

export interface FamilyAccountData {
  family_id: string;
  family_name: string;
  account_number: string;
  balance: number;
  credit_limit: number;
  status: "current" | "overdue" | "suspended";
  last_payment_date: string | null;
  last_payment_amount: number | null;
  next_due_date: string;
  monthly_dues: number;
  ytd_spent: number;
  ytd_paid: number;
  aging_30: number;
  aging_60: number;
  aging_90_plus: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  category_label: string;
  amount: number;
  type: "charge" | "payment" | "credit" | "adjustment";
  reference: string;
  facility_name?: string;
  status: "completed" | "pending" | "cancelled";
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  balance: number;
  status: "paid" | "partial" | "pending" | "overdue" | "cancelled";
  items: InvoiceItem[];
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// ── Config Maps (Silver Tide) ──

export const TRANSACTION_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; sign: string }
> = {
  charge: { label: "Cargo", color: "var(--color-silver-200)", sign: "+" },
  payment: { label: "Pago", color: "var(--color-emerald-400)", sign: "\u2212" },
  credit: { label: "Cr\u00e9dito", color: "var(--color-teal-400)", sign: "\u2212" },
  adjustment: { label: "Ajuste", color: "var(--color-amber-400)", sign: "\u00b1" },
};

export const ACCOUNT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  current: {
    label: "Al d\u00eda",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  overdue: {
    label: "Vencido",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  suspended: {
    label: "Suspendido",
    color: "var(--color-silver-200)",
    bgColor: "color-mix(in srgb, var(--color-silver-200) 10%, transparent)",
  },
};

export const INVOICE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  paid: {
    label: "Pagada",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  partial: {
    label: "Parcial",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  pending: {
    label: "Pendiente",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  overdue: {
    label: "Vencida",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  cancelled: {
    label: "Anulada",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

export const PERIOD_OPTIONS = [
  { value: "current_month", label: "Este mes" },
  { value: "current_quarter", label: "Este trimestre" },
  { value: "current_year", label: "Este a\u00f1o" },
  { value: "last_month", label: "Mes pasado" },
  { value: "last_quarter", label: "Trimestre pasado" },
  { value: "ytd", label: "A\u00f1o a la fecha" },
];

// ── Transaction status config (NEW) ──

export type TransactionStatus = "completed" | "pending" | "cancelled";

export const TRANSACTION_STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; color: string; bgColor: string }
> = {
  completed: {
    label: "Completado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};


// ── AI Financial Report (matches backend AiFinancialReport Pydantic model) ──

export interface HealthScoreFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  trend: "improving" | "stable" | "declining";
  detail: string;
}

export interface HealthScoreData {
  total: number;
  grade: string;
  factors: HealthScoreFactor[];
  trend_vs_previous: number;
}
export interface CashFlowPeriodData {
  label: string;
  projected_revenue: number;
  projected_expenses: number;
  projected_net: number;
  cumulative_cash: number;
  lower_bound: number;
  upper_bound: number;
}
export interface CashFlowForecastData {
  method: string;
  confidence: string;
  confidence_band_pct: number;
  periods: CashFlowPeriodData[];
  assumptions: string[];
}

export interface RevenueSourceData {
  name: string;
  label: string;
  share_pct: number;
  amount: number;
  trend: "growing" | "stable" | "declining";
}
export interface RevenueConcentrationData {
  entropy: number;
  max_entropy: number;
  diversification_index: number;
  herfindahl_index: number;
  sources: RevenueSourceData[];
  risk_assessment: string;
}
export interface FinancialAnomalyItem {
  id: string;
  domain: "revenue" | "expense" | "collection" | "budget";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  deviation_pct: number;
  estimated_annual_impact: number;
  suggested_action: string;
}

export interface FinancialRecommendationItem {
  id: string;
  category: "cost_reduction" | "revenue_growth" | "risk_mitigation" | "efficiency";
  action: string;
  justification: string;
  estimated_impact_annual: number;
  confidence: "high" | "medium" | "low";
  priority: "critical" | "high" | "medium" | "low";
  implementation_effort: "low" | "medium" | "high";
  deadline: string;
}
export interface TrendItemData {
  title: string;
  detail: string;
  metric: string;
  change_pct: number;
  period: string;
}

export interface AlertSignalData {
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  deviation_pct: number;
  threshold_exceeded: number;
}
export interface CashFlowProjectionData {
  method: string;
  confidence: string;
  summary: string;
  key_assumptions: string[];
  risk_factors: string[];
}
export interface TierEconomicsData {
  tier: string;
  avg_revenue: number;
  avg_cost: number;
  margin_pct: number;
  count: number;
}
export interface MemberEconomicsData {
  avg_revenue_per_member: number;
  avg_cost_per_member: number;
  avg_margin_per_member: number;
  ltv_estimate: number;
  cac_estimate: number;
  ltv_cac_ratio: number;
  by_tier: TierEconomicsData[];
}
export interface AiFinancialReport {
  health_score: HealthScoreData;
  cash_flow_forecast: CashFlowForecastData;
  revenue_concentration: RevenueConcentrationData;
  financial_anomalies: FinancialAnomalyItem[];
  recommendations: FinancialRecommendationItem[];
  positive_trends: TrendItemData[];
  alert_signals: AlertSignalData[];
  projection: CashFlowProjectionData;
  member_economics: MemberEconomicsData;
}
// ═══════════════════════════════════════════════════════════
// FASE 13 — Finance Enhancement
// Config Maps + Intelligence Interfaces
// Append to: src/features/finance/types.ts
// ═══════════════════════════════════════════════════════════

// ── Expense Category Config (Backend enum: ExpenseCategory) ──

export const EXPENSE_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  maintenance: {
    label: "Mantenimiento",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
  },
  food_beverage: {
    label: "Food & Beverage",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  staff: {
    label: "Personal",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  events: {
    label: "Eventos",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
  },
  utilities: {
    label: "Servicios Públicos",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  equipment: {
    label: "Equipamiento",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)",
  },
  marketing: {
    label: "Marketing",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  insurance: {
    label: "Seguros",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
  },
  other: {
    label: "Otros",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 12%, transparent)",
  },
};

// ── Payment Method Config (Backend enum: PaymentMethod) ──

export const PAYMENT_METHOD_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  cash: { label: "Efectivo", color: "var(--color-emerald-400)" },
  card: { label: "Tarjeta", color: "var(--color-teal-400)" },
  transfer: { label: "Transferencia", color: "var(--color-gold-400)" },
  check: { label: "Cheque", color: "var(--color-silver-300)" },
  other: { label: "Otro", color: "var(--color-silver-400)" },
};

// ── Payment Status Config (Backend enum: PaymentStatus) ──

export const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  paid: {
    label: "Pagado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  overdue: {
    label: "Vencido",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 12%, transparent)",
  },
  partial: {
    label: "Parcial",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
};

// ── Budget Period Config (Backend enum: BudgetPeriod) ──

export const BUDGET_PERIOD_CONFIG: Record<
  string,
  { label: string }
> = {
  monthly: { label: "Mensual" },
  quarterly: { label: "Trimestral" },
  yearly: { label: "Anual" },
};

// ── Health Grade Config ──

export const HEALTH_GRADE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; range: string }
> = {
  "A+": {
    label: "Excepcional",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    range: "95–100",
  },
  A: {
    label: "Excelente",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    range: "85–94",
  },
  "B+": {
    label: "Bueno",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    range: "75–84",
  },
  B: {
    label: "Aceptable",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    range: "65–74",
  },
  "C+": {
    label: "Regular",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    range: "55–64",
  },
  C: {
    label: "Preocupante",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    range: "45–54",
  },
  D: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    range: "35–44",
  },
  F: {
    label: "Emergencia",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    range: "0–34",
  },
};

// ── Anomaly Severity Config ──

export const ANOMALY_SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; order: number }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    order: 0,
  },
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    order: 1,
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    order: 2,
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    order: 3,
  },
};

// ── Alert Severity Config (alias — same structure as anomaly) ──

export const ALERT_SEVERITY_CONFIG = ANOMALY_SEVERITY_CONFIG;

// ── Recommendation Configs ──

export const RECOMMENDATION_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  cost_reduction: { label: "Reducción de costos", color: "var(--color-terracotta-400)" },
  revenue_growth: { label: "Crecimiento de ingresos", color: "var(--color-emerald-400)" },
  risk_mitigation: { label: "Mitigación de riesgo", color: "var(--color-amber-400)" },
  efficiency: { label: "Eficiencia operativa", color: "var(--color-teal-400)" },
};

export const RECOMMENDATION_PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; order: number }
> = {
  critical: {
    label: "Crítica",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    order: 0,
  },
  high: {
    label: "Alta",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    order: 1,
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    order: 2,
  },
  low: {
    label: "Baja",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    order: 3,
  },
};

export const RECOMMENDATION_EFFORT_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  low: { label: "Bajo", color: "var(--color-emerald-400)" },
  medium: { label: "Medio", color: "var(--color-amber-400)" },
  high: { label: "Alto", color: "var(--color-rose-400)" },
};

export const RECOMMENDATION_CONFIDENCE_CONFIG: Record<
  string,
  { label: string; color: string; pct: number }
> = {
  high: { label: "Alta", color: "var(--color-emerald-400)", pct: 85 },
  medium: { label: "Media", color: "var(--color-amber-400)", pct: 60 },
  low: { label: "Baja", color: "var(--color-rose-400)", pct: 35 },
};

// ── Budget Utilization Threshold ──

export const BUDGET_UTILIZATION_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  healthy: {
    label: "Saludable",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  warning: {
    label: "En riesgo",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  over: {
    label: "Sobrepresupuesto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export function getBudgetUtilizationStatus(
  pct: number,
): "healthy" | "warning" | "over" {
  if (pct > 100) return "over";
  if (pct > 90) return "warning";
  return "healthy";
}

// ── AI Analysis Period Config ──

export const AI_ANALYSIS_PERIOD_CONFIG: Record<
  string,
  { label: string; months: number }
> = {
  current_month: { label: "Este mes", months: 1 },
  last_month: { label: "Mes pasado", months: 1 },
  current_quarter: { label: "Este trimestre", months: 3 },
  last_quarter: { label: "Trimestre pasado", months: 3 },
  current_year: { label: "Este año", months: 12 },
  ytd: { label: "Año a la fecha", months: 12 },
};

// ── Opportunity Category Config ──

export const OPPORTUNITY_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  facility_utilization: {
    label: "Utilización de instalaciones",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  cross_sell: {
    label: "Cross-sell",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  upsell: {
    label: "Upsell",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  pricing: {
    label: "Pricing",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  temporal: {
    label: "Temporal/Estacional",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
  },
  partnership: {
    label: "Alianzas",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
  },
};

export const OPPORTUNITY_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: "Nueva",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  reviewed: {
    label: "Revisada",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  approved: {
    label: "Aprobada",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  implemented: {
    label: "Implementada",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
  },
  dismissed: {
    label: "Descartada",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
};

// ── Briefing Severity Config ──

export const BRIEFING_SECTION_SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  info: {
    label: "Informativo",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 8%, transparent)",
  },
  highlight: {
    label: "Destacado",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  alert: {
    label: "Alerta",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
};

export const METRIC_ASSESSMENT_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  positive: { label: "Positivo", color: "var(--color-emerald-400)" },
  negative: { label: "Negativo", color: "var(--color-rose-400)" },
  neutral: { label: "Neutro", color: "var(--color-silver-400)" },
};

// ═══════════════════════════════════════════════════════════
// Intelligence Interfaces — Scenario Simulator
// ═══════════════════════════════════════════════════════════

export interface ScenarioVariableConfig {
  key: string;
  label: string;
  type: "percentage" | "currency" | "count";
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  category: "revenue" | "expense" | "membership" | "pricing";
}

export interface ScenarioSnapshot {
  revenue: number;
  expenses: number;
  net: number;
  margin: number;
  health_score: number;
  cash_flow_12m: number;
}

export interface ScenarioDelta {
  revenue_change: number;
  expenses_change: number;
  net_change: number;
  margin_change: number;
  health_score_change: number;
  cash_flow_12m_change: number;
}

export interface ScenarioRisk {
  factor: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  affected_segments: string[];
  probability: number;
}

export interface ScenarioSimulationData {
  baseline: ScenarioSnapshot;
  scenario: ScenarioSnapshot;
  delta: ScenarioDelta;
  risks: ScenarioRisk[];
  ai_commentary: string;
  confidence: "high" | "medium" | "low";
  time_horizon_months: number;
}

export const SCENARIO_VARIABLE_DEFAULTS: ScenarioVariableConfig[] = [
  {
    key: "cuota_pct",
    label: "Cuota mensual",
    type: "percentage",
    min: -20,
    max: 30,
    step: 1,
    defaultValue: 0,
    unit: "%",
    category: "pricing",
  },
  {
    key: "socios_count",
    label: "Socios activos",
    type: "count",
    min: -30,
    max: 50,
    step: 1,
    defaultValue: 0,
    unit: "",
    category: "membership",
  },
  {
    key: "fb_pct",
    label: "Gastos F&B",
    type: "percentage",
    min: -30,
    max: 50,
    step: 1,
    defaultValue: 0,
    unit: "%",
    category: "expense",
  },
  {
    key: "eventos_mes",
    label: "Eventos privados/mes",
    type: "count",
    min: 0,
    max: 12,
    step: 1,
    defaultValue: 4,
    unit: "",
    category: "revenue",
  },
  {
    key: "guest_fee_pct",
    label: "Guest fee",
    type: "percentage",
    min: -20,
    max: 50,
    step: 1,
    defaultValue: 0,
    unit: "%",
    category: "pricing",
  },
  {
    key: "staff_pct",
    label: "Costo staff",
    type: "percentage",
    min: -15,
    max: 30,
    step: 1,
    defaultValue: 0,
    unit: "%",
    category: "expense",
  },
];

// ═══════════════════════════════════════════════════════════
// Intelligence Interfaces — Opportunity Scanner
// ═══════════════════════════════════════════════════════════

export interface OpportunityItem {
  id: string;
  category:
    | "facility_utilization"
    | "cross_sell"
    | "upsell"
    | "pricing"
    | "temporal"
    | "partnership";
  title: string;
  description: string;
  estimated_monthly_revenue: number;
  confidence: number;
  implementation_effort: "low" | "medium" | "high";
  time_to_revenue_weeks: number;
  data_basis: string;
  affected_segments: string[];
  risk_factors: string[];
  status: "new" | "reviewed" | "approved" | "implemented" | "dismissed";
}

export interface OpportunityScanData {
  opportunities: OpportunityItem[];
  total_opportunity_value: number;
  scan_date: string;
  data_quality_score: number;
}

// ═══════════════════════════════════════════════════════════
// Intelligence Interfaces — Board Briefing
// ═══════════════════════════════════════════════════════════

export interface BriefingMetric {
  label: string;
  value: string;
  change_pct: number;
  trend: "up" | "down" | "stable";
  assessment: "positive" | "negative" | "neutral";
}

export interface BriefingSection {
  id: string;
  title: string;
  content: string;
  severity: "info" | "highlight" | "alert" | "critical";
  items: string[];
}

export interface BriefingAlert {
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  requires_action: boolean;
}

export interface BriefingRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
  justification: string;
  estimated_impact: string;
}

export interface BriefingDecision {
  title: string;
  description: string;
  options: string[];
  deadline: string;
  impact_estimate: string;
}

export interface BoardBriefingData {
  sections: BriefingSection[];
  key_metrics: BriefingMetric[];
  alerts: BriefingAlert[];
  recommendations: BriefingRecommendation[];
  upcoming_decisions: BriefingDecision[];
  generated_at: string;
  period: string;
}

// ═══════════════════════════════════════════════════════════
// FIX #5 — Tier alignment backend ↔ frontend
// Append to: src/features/families/types.ts
// ═══════════════════════════════════════════════════════════
//
// ISSUE: Backend "basic"/"premium"/"vip" (3 tiers)
//        Frontend "platino"/"oro"/"plata"/"bronce" (4 tiers)
//
// SOLUTION: Backend-aligned types + bidirectional mapping.
// Existing frontend types remain untouched.
// ═══════════════════════════════════════════════════════════

// ── Backend-aligned tier types ──

export type BackendTier = "basic" | "premium" | "vip";

export const BACKEND_TIER_CONFIG: Record<
  BackendTier,
  { label: string; color: string; bgColor: string; order: number }
> = {
  basic: {
    label: "Básico",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)",
    order: 0,
  },
  premium: {
    label: "Premium",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    order: 1,
  },
  vip: {
    label: "VIP",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    order: 2,
  },
};

// ── Mapping tables ──

const FRONTEND_TO_BACKEND_TIER: Record<string, BackendTier> = {
  platino: "vip",
  oro: "premium",
  plata: "basic",
  bronce: "basic",
  vip: "vip",
  premium: "premium",
  basic: "basic",
};

const BACKEND_TO_FRONTEND_TIER: Record<BackendTier, string> = {
  vip: "platino",
  premium: "oro",
  basic: "plata",
};

// ── Utility functions ──

/**
 * Convert frontend tier name to backend tier name.
 * Returns the input as BackendTier if already valid, defaults to "basic".
 */
export function toBackendTier(frontendTier: string): BackendTier {
  return FRONTEND_TO_BACKEND_TIER[frontendTier] ?? "basic";
}

/**
 * Convert backend tier name to frontend tier name.
 * Returns the input unchanged if no mapping exists.
 */
export function toFrontendTier(backendTier: string): string {
  return BACKEND_TO_FRONTEND_TIER[backendTier as BackendTier] ?? backendTier;
}

/**
 * Get display config for a tier, accepting either frontend or backend values.
 * Returns BACKEND_TIER_CONFIG entry, or null if unmapped.
 */
export function getTierDisplayConfig(tier: string) {
  const backendTier = FRONTEND_TO_BACKEND_TIER[tier];
  if (backendTier) return BACKEND_TIER_CONFIG[backendTier];
  return null;
}

/**
 * Get all tiers as options array for selects/filters.
 */
export function getTierOptions(): Array<{ value: string; label: string }> {
  return (Object.entries(BACKEND_TIER_CONFIG) as Array<[BackendTier, (typeof BACKEND_TIER_CONFIG)[BackendTier]]>)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([value, cfg]) => ({ value, label: cfg.label }));
}
// ═══════════════════════════════════════════════════════════
// Fase 14 — Intelligence Feature Types + Configs
// Append to: src/features/finance/types.ts
//
// 3 feature additions:
//   - Member Profitability Matrix (quadrant, tier)
//   - Stress Test (scenarios, metrics, fan chart)
//   - Seasonal Calendar (seasons, layers, actions)
// ═══════════════════════════════════════════════════════════

// ── Re-exports from contracts (inner data types for component imports) ──

export type {
  MemberProfitabilityFamily,
  MemberProfitabilitySummary,
  MemberProfitabilityData,
  StressTestMetrics,
  FanChartPoint,
  DistributionSummary,
  StressTestData,
  SeasonalEvent,
  SeasonalMaintenance,
  SeasonalObligation,
  SeasonalAction,
  SeasonalMonth,
  SeasonalAnnualSummary,
  SeasonalCalendarData,
} from "@/shared/mocks/contracts";

// ── Quadrant Config (Member Profitability Matrix) ──

export const QUADRANT_CONFIG: Record<
  "star" | "workhorse" | "potential" | "risk",
  { label: string; color: string; bgColor: string; strategy: string }
> = {
  star: {
    label: "Star",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    strategy:
      "Fidelizar con beneficios exclusivos: acceso prioritario, descuentos F&B, estacionamiento VIP. Monitorear satisfacción trimestralmente para evitar migración.",
  },
  workhorse: {
    label: "Workhorse",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    strategy:
      "Optimizar costo de servicio: evaluar paquetes que reduzcan el costo sin afectar satisfacción. Renegociar contratos de servicios dedicados.",
  },
  potential: {
    label: "Potencial",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    strategy:
      "Activar con programas de consumo: cross-sell actividades, paquetes familiares, work-from-club. Cada colón adicional es casi puro margen.",
  },
  risk: {
    label: "Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    strategy:
      "Revisar términos de membresía. Programa de reactivación 90 días con seguimiento personalizado. Si no hay respuesta, conversación directa sobre opciones.",
  },
};

// ── Tier Display (backend tiers for profitability view) ──

export const TIER_DISPLAY: Record<string, { label: string; color: string; bgColor: string }> = {
  basic: {
    label: "Básico",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)",
  },
  premium: {
    label: "Premium",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  vip: {
    label: "VIP",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
};

// ── Stress Test Scenario Configs ──

export interface StressScenarioVariable {
  key: string;
  label: string;
  mu: number;
  sigma: number;
  unit: string;
  description: string;
}

export interface StressScenarioConfig {
  id: string;
  name: string;
  description: string;
  variables: StressScenarioVariable[];
}

export const STRESS_SCENARIO_CONFIGS: StressScenarioConfig[] = [
  {
    id: "recession",
    name: "Recesión Costa Rica",
    description:
      "Desaceleración económica con caída en consumo, pérdida de socios y apreciación del dólar",
    variables: [
      { key: "churn_rate", label: "Churn socios", mu: 8, sigma: 3, unit: "%", description: "Pérdida de membresías por crisis económica" },
      { key: "fb_decline", label: "Caída F&B", mu: 15, sigma: 5, unit: "%", description: "Reducción en consumo de food & beverage" },
      { key: "events_cancelled", label: "Eventos cancelados", mu: 25, sigma: 10, unit: "%", description: "Eventos sociales y corporativos cancelados" },
      { key: "fx_impact", label: "Tipo cambio USD/CRC", mu: 12, sigma: 4, unit: "%", description: "Apreciación del dólar impacta costos de importación" },
    ],
  },
  {
    id: "pandemic",
    name: "Pandemia 2.0",
    description: "Brote sanitario con cierre temporal y recuperación gradual de 6 meses",
    variables: [
      { key: "closure_months", label: "Meses cierre", mu: 2, sigma: 0.5, unit: "meses", description: "Duración del cierre obligatorio" },
      { key: "recovery_months", label: "Meses recuperación", mu: 6, sigma: 2, unit: "meses", description: "Tiempo hasta volver a niveles pre-cierre" },
      { key: "churn_rate", label: "Churn socios", mu: 15, sigma: 5, unit: "%", description: "Pérdida de membresías durante/post cierre" },
      { key: "fb_decline", label: "Caída F&B", mu: 40, sigma: 10, unit: "%", description: "Reducción drástica en consumo F&B" },
    ],
  },
  {
    id: "competition",
    name: "Competencia directa",
    description: "Nuevo club privado abre a 15 minutos con instalaciones modernas",
    variables: [
      { key: "churn_rate", label: "Churn socios", mu: 12, sigma: 4, unit: "%", description: "Migración hacia el nuevo club competidor" },
      { key: "guest_fees_decline", label: "Guest fees", mu: 20, sigma: 8, unit: "%", description: "Reducción en visitas de invitados" },
      { key: "events_decline", label: "Eventos", mu: 30, sigma: 10, unit: "%", description: "Pérdida de eventos hacia competidor" },
    ],
  },
  {
    id: "renovation",
    name: "Renovación mayor",
    description: "Cierre parcial de instalaciones para renovación de infraestructura",
    variables: [
      { key: "closure_months", label: "Meses parcial cierre", mu: 6, sigma: 1.5, unit: "meses", description: "Duración del cierre parcial" },
      { key: "expense_increase", label: "Aumento gastos", mu: 50, sigma: 15, unit: "%", description: "Incremento en gastos operativos por obra" },
      { key: "revenue_decline", label: "Caída revenue", mu: 25, sigma: 8, unit: "%", description: "Reducción de ingresos por acceso limitado" },
    ],
  },
  {
    id: "boom",
    name: "Boom de crecimiento",
    description: "Crecimiento acelerado por auge en la zona y marketing efectivo",
    variables: [
      { key: "member_growth", label: "Crecimiento socios", mu: 20, sigma: 8, unit: "%", description: "Nuevas membresías por alta demanda" },
      { key: "events_growth", label: "Crecimiento eventos", mu: 30, sigma: 10, unit: "%", description: "Incremento en reservas de eventos" },
      { key: "staff_growth", label: "Crecimiento staff", mu: 15, sigma: 5, unit: "%", description: "Nuevas contrataciones para soportar demanda" },
    ],
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Define tus propias variables μ y σ para un escenario a medida",
    variables: [
      { key: "var_1", label: "Variable 1", mu: 10, sigma: 3, unit: "%", description: "Variable personalizable" },
      { key: "var_2", label: "Variable 2", mu: 10, sigma: 3, unit: "%", description: "Variable personalizable" },
      { key: "var_3", label: "Variable 3", mu: 10, sigma: 3, unit: "%", description: "Variable personalizable" },
    ],
  },
];

// ── Stress Metric Config (KPI cards in results panel) ──

export const STRESS_METRIC_CONFIG: Record<
  string,
  { label: string; format: "percent" | "currency" | "month"; goodThreshold: number; warnThreshold: number }
> = {
  p_positive_cashflow_12m: { label: "P(Cash Flow +)", format: "percent", goodThreshold: 0.80, warnThreshold: 0.60 },
  p_health_above_60: { label: "P(Health > 60)", format: "percent", goodThreshold: 0.75, warnThreshold: 0.50 },
  max_probable_loss_p95: { label: "Pérdida máx. probable", format: "currency", goodThreshold: -10_000_000, warnThreshold: -20_000_000 },
  min_reserve_recommended: { label: "Reserva mínima", format: "currency", goodThreshold: 15_000_000, warnThreshold: 25_000_000 },
  critical_month: { label: "Mes más crítico", format: "month", goodThreshold: 0, warnThreshold: 0 },
};

// ── Season Config (Costa Rica seasonal patterns) ──

export const SEASON_CONFIG: Record<
  "high" | "low" | "transition",
  { label: string; color: string; bgColor: string; months: number[]; factor: number }
> = {
  high: {
    label: "Alta",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    months: [1, 2, 3, 4, 12],
    factor: 1.08,
  },
  low: {
    label: "Baja",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    months: [6, 7, 8, 9],
    factor: 0.92,
  },
  transition: {
    label: "Transición",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    months: [5, 10, 11],
    factor: 1.0,
  },
};

// ── Seasonal Layer Configs (toggleable timeline layers) ──

export interface SeasonalLayerConfig {
  id: string;
  label: string;
  color: string;
  defaultVisible: boolean;
}

export const SEASONAL_LAYER_CONFIGS: SeasonalLayerConfig[] = [
  { id: "revenue", label: "Revenue", color: "var(--color-emerald-400)", defaultVisible: true },
  { id: "expenses", label: "Gastos", color: "var(--color-rose-400)", defaultVisible: true },
  { id: "events", label: "Eventos", color: "var(--color-gold-400)", defaultVisible: true },
  { id: "maintenance", label: "Mantenimiento", color: "var(--color-amber-400)", defaultVisible: true },
  { id: "reserve", label: "Reserva", color: "var(--color-teal-400)", defaultVisible: false },
  { id: "actions", label: "Acciones AI", color: "var(--color-silver-200)", defaultVisible: false },
];

// ── Seasonal Action Category Config ──

export const SEASONAL_ACTION_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  cost_saving: {
    label: "Ahorro",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  revenue_opportunity: {
    label: "Revenue",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  cash_management: {
    label: "Tesorería",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  planning: {
    label: "Planificación",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
  },
};
// ══════════════════════════════════════════════════════════
// Fase 14b — Narrative Engine + Export Intelligence
// ══════════════════════════════════════════════════════════

// ── Re-exports from contracts ──
export type {
  NarrativeInsight,
  NarrativeRecommendation,
  NarrativeComparison,
  NarrativeSection,
  NarrativeRiskAlert,
  NarrativeGenerateData,
  FinanceNarrativeGenerateResponse,
  ExportSectionIncluded,
  ExportReportData,
  ExportReportResponse,
} from "@/shared/mocks/contracts";

// ── Narrative Engine Configs ──

export const NARRATIVE_PERIOD_CONFIG = [
  { id: "mayo_2026", label: "Mayo 2026" },
  { id: "q2_2026", label: "Q2 2026" },
  { id: "ytd_2026", label: "Año en curso" },
  { id: "anual_2025", label: "Anual 2025" },
] as const;

export const NARRATIVE_AUDIENCE_CONFIG: Record<
  string,
  { label: string; description: string }
> = {
  junta: {
    label: "Junta Directiva",
    description: "Briefing ejecutivo para directiva",
  },
  staff: { label: "Staff", description: "Detalle operativo para gerencia" },
  auditores: {
    label: "Auditores",
    description: "Formato para revisión externa",
  },
  bancos: { label: "Bancos", description: "Presentación crediticia" },
};

export const NARRATIVE_DETAIL_CONFIG: Record<
  string,
  { label: string; wordCount: string }
> = {
  ejecutivo: { label: "Ejecutivo", wordCount: "~500 palabras" },
  detallado: { label: "Detallado", wordCount: "~1,200 palabras" },
  completo: { label: "Completo", wordCount: "~2,500 palabras" },
};

export const NARRATIVE_INSIGHT_TYPE_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  positive: {
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    label: "Positivo",
  },
  negative: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "Negativo",
  },
  neutral: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
    label: "Neutral",
  },
  alert: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "Alerta",
  },
};

export const NARRATIVE_CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  revenue: {
    label: "Ingresos",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  cost: {
    label: "Costos",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  retention: {
    label: "Retención",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  operations: {
    label: "Operaciones",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
};

export const NARRATIVE_RISK_SEVERITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  high: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "Alto",
  },
  medium: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "Medio",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
    label: "Bajo",
  },
};

// ── Export Configs ──

export const EXPORT_FORMAT_CONFIG: Array<{
  id: "pdf" | "excel" | "csv";
  label: string;
  description: string;
}> = [
  { id: "pdf", label: "PDF", description: "Documento formateado con branding" },
  { id: "excel", label: "Excel", description: "Hoja de cálculo para análisis" },
  { id: "csv", label: "CSV", description: "Datos crudos para importar" },
];
// ═══════════════════════════════════════════════════════════
// Decision Cockpit (Fase 14d)
// ═══════════════════════════════════════════════════════════

// ── Re-exports de contracts ──
export type {
  finance_decision_simulate_Contract as FinanceDecisionSimulateResponse,
  FinanceDecisionSimulateData,
  DecisionScenario,
  DecisionAIRecommendation,
  DecisionHistoricalPrecedent,
} from "@/shared/mocks/contracts";

// ── Decision Risk Config ──

export const DECISION_RISK_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  bajo: {
    label: "Bajo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  medio: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  alto: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  crítico: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
};

// ── Decision Scenario Config ──

export const DECISION_SCENARIO_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  Optimista: {
    label: "Optimista",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
    borderColor: "var(--color-emerald-400)",
  },
  Base: {
    label: "Base",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 8%, transparent)",
    borderColor: "var(--color-gold-400)",
  },
  Pesimista: {
    label: "Pesimista",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    borderColor: "var(--color-rose-400)",
  },
};

export const SCENARIO_CATEGORY_LABELS: Record<string, string> = {
  pricing: "Precios",
  membership: "Membresías",
  expense: "Gastos",
  revenue: "Ingresos",
};
// ═══════════════════════════════════════════════════════════
// Fase 18 — Financial Advisor Intelligence Engine
// ═══════════════════════════════════════════════════════════
import type {
  AdvisorInsightBase,
  AdvisorCommand,
} from "@/shared/types/ai-intelligence";

/**
 * Financial advisor layer — subset of AdvisorLayer used by this domain.
 * Maps to the 3-layer architecture: macro (1-12), micro (13-16), fusion (17-18).
 */
export type AdvisorInsightLayer = "macro" | "micro" | "fusion";

/**
 * Financial Advisor Insight — extends the shared base type.
 *
 * STRUCTURAL ALIGNMENT with AdvisorInsightBase:
 *   - layer: added (financial-specific, 3 layers)
 *   - targetTab: RENAMED to target_view (aligns with AdvisorInsightBase)
 *   - action: added as AdvisorCommand (was missing — hook was adding it untyped)
 *
 * F47 TODO: Migrate to RuleDefinition<FinancialContext> declarative rules.
 */
export interface FinancialAdvisorInsight extends AdvisorInsightBase {
  /** Financial-specific layer */
  layer: AdvisorInsightLayer;

  /** Domain identifier */
  domain?: "financial";

  /**
   * Action to execute when user clicks "Ejecutar" in the banner.
   * Maps to AdvisorCommand from ai-intelligence.ts.
   */
  action?: AdvisorCommand;
}

