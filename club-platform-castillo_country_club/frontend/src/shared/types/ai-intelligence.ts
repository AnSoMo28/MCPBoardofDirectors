// ═══════════════════════════════════════════════════════════
// AI INTELLIGENCE TYPE SYSTEM — Castillo Country Club
//
// Generic base types for ALL AI-powered features.
// Domain-specific AI types EXTEND these generics.
//
// RULES:
//   1. Generic types defined HERE. Domain aliases import from here.
//   2. Each AI output has: confidence, reasoning, impact.
//   3. Domain types add domain-specific fields on top.
//   4. NEVER create ad-hoc AI response types in domain files.
//
// Architecture:
//   Generic base (this file)
//     → Domain extensions (features/*/types.ts)
//       → Components consume domain types
//
// Advisor Engine types (RuleDefinition, DomainSignal, etc.)
// live in @/shared/lib/advisor-engine/types.ts — import from there.
//
// Created: June 2026 — Cross-Domain Audit (F30)
// Updated: F45 — Architecture Consolidation (alignment + fixes)
// ═══════════════════════════════════════════════════════════

import type { SeverityLevel } from "./domain-enums";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — AI PRIMITIVES
// Atomic building blocks used across all AI types.
// ═══════════════════════════════════════════════════════════

/**
 * A single factor contributing to an AI output.
 * Used in predictions, analyses, recommendations.
 */
export interface AIFactor {
  name: string;
  impact: number;
  direction: "positive" | "negative" | "neutral";
  detail: string;
  weight?: number;
}

/**
 * A factor contributing to a health score.
 * DIFFERENT from AIFactor — health factors have score (0-100) not impact.
 *
 * NOTE: The Advisor Engine's HealthScoreComposer uses HealthFactorDef<T>
 * which is more generic. This type is for backward compatibility with
 * backend Pydantic models.
 */
export interface HealthScoreFactor {
  name: string;
  score: number;
  weight: number;
  contribution?: number;
  trend?: "improving" | "stable" | "declining";
  detail: string;
}

// ... (AIRecommendation through AIRiskFactor — UNCHANGED)

/**
 * A single recommendation from an AI analysis.
 * Universal across finance, engagement, events, wellness, etc.
 */
export interface AIRecommendation {
  /** Category/domain this recommendation belongs to */
  category: string;

  /** Recommendation text */
  recommendation: string;

  /** Estimated impact description (e.g., "+₡1.8M/año", "15% less churn") */
  impact: string;

  /** Priority level */
  priority: "low" | "medium" | "high" | "urgent";

  /** Optional estimated savings/revenue in colones */
  estimated_value?: number;

  /** Optional implementation effort */
  effort?: "low" | "medium" | "high";

  /** Optional timeline */
  timeline?: string;
}

/**
 * A metric projected by AI (used in simulations, forecasts).
 */
export interface AIProjectedMetric {
  /** Metric name */
  name: string;

  /** Projected value */
  value: number;

  /** Unit (e.g., "colones", "percentage", "count") */
  unit: string;

  /** Confidence interval lower bound */
  confidence_low?: number;

  /** Confidence interval upper bound */
  confidence_high?: number;
}

/**
 * A trend point for time-series AI data.
 */
export interface AITrendPoint {
  /** Period identifier (e.g., "2026-01", "Q1-2026") */
  period: string;

  /** Human-readable label */
  label: string;

  /** Metric values for this period */
  metrics: Record<string, number>;
}

/**
 * An alert or signal detected by AI.
 */
export interface AIAlert {
  /** Alert text */
  signal: string;

  /** Urgency level */
  urgency: "low" | "medium" | "high" | "critical";

  /** Suggested action to address */
  action_required: string;

  /** Optional domain this alert relates to */
  domain?: string;
}

/**
 * A positive trend detected by AI.
 */
export interface AIPositiveTrend {
  /** Trend description */
  trend: string;

  /** Estimated positive impact */
  impact: string;
}

/**
 * Risk factor identified by AI.
 */
export interface AIRiskFactor {
  /** Risk name */
  name: string;

  /** Risk description */
  description: string;

  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";

  /** Probability (0-100) */
  probability?: number;

  /** Mitigation suggestion */
  mitigation?: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — GENERIC AI OUTPUT TYPES
// Parameterized types that domain-specific types extend.
// ═══════════════════════════════════════════════════════════

/**
 * Generic prediction output.
 * @template T — The type of the predicted value (number, string, object).
 *
 * Usage:
 *   type AttendancePrediction = AIPrediction<number>;
 *   type ChurnPrediction = AIPrediction<{ risk_level: string; probability: number }>;
 */
export interface AIPrediction<T> {
  /** What was predicted */
  predicted: T;

  /** Confidence in the prediction (0-100) */
  confidence: number;

  /** Factors that influenced this prediction */
  factors: AIFactor[];

  /** Human-readable recommendation based on prediction */
  recommendation: string;

  /** Similar historical data for comparison */
  baseline?: T;

  /** When this prediction was generated */
  generated_at?: string;
}

/**
 * Generic analysis output — multi-dimensional intelligence report.
 * Used by: finance generate_ai_analysis, satisfaction analyze_event,
 * engagement insights, communication insights.
 */
export interface AIAnalysis {
  /** Unique analysis ID */
  id?: string;

  /** What was analyzed */
  subject: string;

  /** Domain this analysis covers */
  domain: string;

  /** Health or quality score (0-100) */
  health_score?: AIHealthScore;

  /** Key findings */
  findings: AIFinding[];

  /** Actionable recommendations */
  recommendations: AIRecommendation[];

  /** Alerts requiring attention */
  alerts?: AIAlert[];

  /** Positive trends detected */
  positive_trends?: AIPositiveTrend[];

  /** Risk factors identified */
  risk_factors?: AIRiskFactor[];

  /** AI-generated executive summary (markdown) */
  summary?: string;

  /** When this analysis was generated */
  generated_at: string;
}

/**
 * Health score — composite metric used across domains.
 * Used by: finance health_score, executive health_score,
 * communication health, wellness score.
 */
export interface AIHealthScore {
  /** Overall score (0-100) */
  score: number;

  /** Letter grade (A, B, C, D, F) */
  grade: string;

  /** Human-readable level */
  level: string;

  /** Individual factors contributing to the score */
  factors: HealthScoreFactor[];
}

/**
 * A single finding from an AI analysis.
 */
export interface AIFinding {
  /** Finding category (e.g., "anomaly", "trend", "insight") */
  type: string;

  /** Description of the finding */
  description: string;

  /** Severity or importance */
  severity: "info" | "low" | "medium" | "high" | "critical";

  /** Supporting data */
  evidence?: Record<string, unknown>;

  /** Domain this finding relates to */
  domain?: string;
}

/**
 * Generic narrative output — AI-generated explanation.
 * Used by: generate_insight_narrative, advisor chat responses.
 */
export interface AINarrative {
  /** Root cause explanation */
  root_cause: string;

  /** Comparison with benchmarks */
  benchmark_comparison: string;

  /** Concrete recommendation */
  recommendation: string;

  /** Estimated impact of recommendation */
  estimated_impact: string;

  /** Full narrative (markdown) */
  full_text: string;

  /** Confidence adjusted by AI analysis */
  confidence: number;

  /** Sources or evidence cited */
  evidence?: string[];
}

/**
 * Generic scenario for simulation.
 * Used by: simulate_scenario, event optimization, financial stress test.
 */
export interface AIScenario {
  /** Scenario name */
  name: "optimistic" | "base" | "pessimistic" | string;

  /** Description of this scenario's outcome */
  description: string;

  /** Projected metrics for this scenario */
  projected_metrics: Record<string, number | string>;

  /** Probability of this scenario occurring (0-100) */
  probability: number;

  /** Key assumptions for this scenario */
  assumptions?: string[];
}

/**
 * Generic simulation result.
 * Used by: simulate_scenario, financial stress test, event planning.
 */
export interface AISimulation {
  /** Scenarios generated */
  scenarios: AIScenario[];

  /** Overall risk assessment */
  risk_assessment: string;

  /** Which scenario the AI recommends */
  recommended_scenario: string;

  /** Confidence in the recommendation (0-100) */
  confidence: number;

  /** Suggested action based on simulation */
  suggested_action?: string;

  /** When simulation was run */
  generated_at?: string;
}

/**
 * Generic action plan — AI-generated prioritized action list.
 * Used by: generate_action_plan, engagement campaigns, wellness plans.
 */
export interface AIActionPlan {
  /** Executive summary of the plan */
  summary: string;

  /** Prioritized action items */
  items: AIActionPlanItem[];

  /** Total estimated impact across all items */
  total_estimated_impact: string;

  /** Timeframe for the plan */
  timeframe?: string;

  /** When plan was generated */
  generated_at: string;
}

/**
 * Single item within an action plan.
 */
export interface AIActionPlanItem {
  /** Action title */
  title: string;

  /** Why this action */
  reasoning: string;

  /** Temporal urgency */
  urgency: "today" | "this_week" | "this_month" | "this_quarter";

  /** Estimated impact */
  estimated_impact: string;

  /** Priority within the plan */
  priority: "low" | "medium" | "high" | "urgent";

  /** Confidence in this recommendation (0-100) */
  confidence: number;

  /** Optional: MCP server + tool to execute */
  executable?: {
    server: string;
    tool: string;
    params: Record<string, unknown>;
    approval_level?: "auto" | "semi" | "hitl";
  };

  /** Optional: source insight ID for feedback loop */
  source_insight_id?: string;
}

/**
 * Board/executive brief — AI-generated document for leadership.
 * Used by: generate_board_brief, satisfaction reports, quarterly insights.
 */
export interface AIBrief {
  /** Document title */
  title: string;

  /** Brief content in markdown */
  content_markdown: string;

  /** Key takeaways */
  key_points: string[];

  /** Talking points for presentation */
  talking_points: string[];

  /** Anticipated Q&A */
  q_and_a: Array<{
    question: string;
    answer: string;
  }>;

  /** When generated */
  generated_at: string;

  /** Target audience */
  audience: "admin" | "board" | "members" | "external";
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — ADVISOR INTELLIGENCE TYPES
// Types for the Advisor Architecture (hooks + banners + actions).
// These are GENERIC — domain Advisors add their own insight shapes.
// ═══════════════════════════════════════════════════════════

/**
 * Impact level for advisor insights.
 * Used by ALL advisor hooks (financial, event, family, communication, etc.)
 */
export const ADVISOR_IMPACT_LEVELS = ["high", "medium", "low"] as const;
export type AdvisorImpactLevel = typeof ADVISOR_IMPACT_LEVELS[number];

/**
 * Generic advisor insight — base for all domain-specific insights.
 * Each domain hook returns insights that extend this shape.
 *
 * Usage in domain hook:
 *   interface FinancialAdvisorInsight extends AdvisorInsightBase {
 *     layer: "macro" | "micro" | "fusion";
 *     domain: "financial";
 *   }
 */
/**
 * A citation from RAG document retrieval.
 * Displayed in AdvisorBanner alongside reasoning.
 * F48-C — "The Memory"
 */
export interface RAGCitation {
  /** Source document name (displayed to user) */
  source: string;
  /** Retrieval relevance score (0-1) */
  relevance: number;
  /** Document ID for linking */
  documentId?: string;
}

export interface AdvisorInsightBase {
  /** Unique insight ID */
  id: string;

  /** Impact level */
  impact: AdvisorImpactLevel;

  /** Short title for display */
  title: string;

  /** Detailed reasoning */
  reasoning: string;

  /** Confidence score (0-100) */
  confidence: number;

  /** Optional: layer within the domain's architecture */
  layer?: AdvisorLayer;

  /** Optional: domain identifier */
  domain?: AIDomain;

  /** Optional: metric path this insight relates to (e.g., "summary.membership.churn_rate") */
  metric?: string;

  /** Optional: current value of the metric */
  metricValue?: number;

  /** Optional: detailed description for display (goal engine, command executor) */
  description?: string;

  /** Optional: actionable command */
  action?: AdvisorCommand;

  /** Optional: which view/tab this insight targets */
  target_view?: string;

  /** Optional: target entity ID */
  target_id?: string;

  /** Optional: target date */
  target_date?: string;

  /** RAG citations supporting this insight (F48-C) */
  citations?: RAGCitation[];
}
/**
 * Executable command attached to an advisor insight.
 * The AdvisorBanner renders an "Execute" button when this exists.
 */
export interface AdvisorCommand {
  action?: string;
  /** Command type — currently always "mutate" */
  type: "mutate";

  /** MCP server to call */
  server: string;

  /** MCP tool to call */
  tool: string;

  /** Pre-filled parameters */
  params: Record<string, unknown>;

  /** Approval level determines UI flow */
  approval_level: "auto" | "semi" | "hitl";

  /** Button label */
  label: string;

  /** Confirmation message for HITL modal */
  confirm_message?: string;

  /** Estimated impact display text */
  estimated_impact?: string;

  /** Risk summary for HITL modal */
  risk_summary?: string;
}

/**
 * Execution state for advisor actions.
 * Used by banners to track loading/feedback per insight.
 */
export type AdvisorActionState = "idle" | "loading" | "done" | "error";

/**
 * Reaction insight generated after an advisor action is executed.
 * Closes the feedback loop: detect → recommend → execute → confirm.
 */
export interface AdvisorReaction {
  /** Unique reaction ID */
  id: string;

  /** Source insight that triggered the action */
  source_insight_id: string;

  /** Label of the action executed */
  source_action: string;

  /** Lifecycle status */
  status: "executing" | "done" | "impact_measured";

  /** When executed (ISO string for serialization consistency) */
  executed_at: string;

  /** Generated confirmation text */
  reaction: string;

  /** Estimated impact of the action */
  estimated_impact: string;

  /** Next step recommended */
  next_step: string;

  /** Confidence in impact estimate (0-100) */
  confidence: number;

  /** MCP server used */
  server: string;

  /** MCP tool used */
  tool: string;
}

/**
 * Reaction status display config.
 */
export const REACTION_STATUS_DISPLAY: Record<
  AdvisorReaction["status"],
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

/**
 * Advisor layer identifiers — used across all domain advisors.
 * Not all domains use all layers.
 */
export const ADVISOR_LAYERS = [
  "macro", "micro", "fusion",
  "diagnostic", "strategy", "prediction", "innovation", "execution",
  "health", "lifecycle", "social", "financial", "engagement",
  "utilization", "cross_domain", "maintenance",
  "compliance", "space", "revenue", "event_readiness",
] as const;
export type AdvisorLayer = typeof ADVISOR_LAYERS[number];

// ═══════════════════════════════════════════════════════════
// SECTION 4 — DOMAIN-SPECIFIC AI TYPE ALIASES
// Convenience aliases that map generic types to domain contexts.
// Domain types.ts files can import these OR define their own.
// ═══════════════════════════════════════════════════════════

/**
 * Event attendance prediction.
 * Source: proactive_recommendation.predict_event_attendance
 */
export type EventAttendancePrediction = AIPrediction<number> & {
  event_id: string;
  event_name: string;
  similar_events_avg?: number;
};

/**
 * Financial health analysis.
 * Source: finance.generate_ai_analysis
 */
export type FinancialAnalysis = AIAnalysis & {
  domain: "financial";
  cash_flow_forecast?: {
    months: number;
    periods: Array<{
      month: string;
      projected_revenue: number;
      projected_expenses: number;
      net_cash_flow: number;
      cumulative_balance: number;
      confidence_high: number;
      confidence_low: number;
    }>;
  };
  revenue_concentration?: {
    hhi: number;
    diversification_index: number;
    top_sources: Array<{
      source: string;
      percentage: number;
      amount: number;
      trend: string;
    }>;
  };
  member_economics?: {
    arpu_monthly: number;
    cac: number;
    ltv: number;
    ltv_cac_ratio: number;
    by_tier: Array<{
      tier: string;
      arpu: number;
      churn_rate_pct: number;
      ltv: number;
    }>;
  };
};

/**
 * Satisfaction analysis for an event.
 * Source: satisfaction.analyze_event_satisfaction
 */
export type SatisfactionAnalysis = AIAnalysis & {
  domain: "satisfaction";
  event_id: string;
  event_name: string;
  total_responses: number;
  overall_avg: number;
  category_averages: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  top_praises?: string[];
  top_improvements?: string[];
  key_quotes?: string[];
};

/**
 * Engagement analysis for the club.
 * Source: member_engagement.get_engagement_insights + generate_ai_analysis_engagement
 */
export type EngagementAnalysis = AIAnalysis & {
  domain: "engagement";
  churn_analysis?: {
    at_risk_count: number;
    predicted_churn_90d: number;
    churn_probability_distribution: Array<{ range: string; count: number }>;
    primary_churn_drivers: string[];
  };
  critical_families?: Array<{
    family_name: string;
    risk_score: number;
    reason: string;
    recommendation: string;
    estimated_value_at_risk: number;
  }>;
  retention_strategies?: Array<{
    strategy: string;
    target_segment: string;
    impact_estimate: string;
    timeline: string;
  }>;
  financial_impact?: {
    at_risk_annual_revenue: number;
    projected_churn_cost: number;
    recommended_retention_budget: number;
    expected_roi: number;
  };
};

/**
 * Communication health analysis.
 * Source: communication.get_communication_health + generate_communication_insights
 */
export type CommunicationAnalysis = AIAnalysis & {
  domain: "communication";
  health_factors?: Array<{
    name: string;
    score: number;
    status: "healthy" | "attention" | "critical";
    detail: string;
  }>;
  channel_performance?: Array<{
    channel: string;
    delivery_rate: number;
    open_rate: number;
    engagement_rate: number;
    trend: "improving" | "stable" | "declining";
  }>;
};

/**
 * Family profile intelligence.
 * Source: family_profile.family_360_insight, family_predict_churn
 */
export type FamilyIntelligence = AIAnalysis & {
  domain: "family";
  family_id: string;
  churn_risk?: AIPrediction<{
    risk_level: string;
    probability: number;
  }>;
  lifecycle_stage?: string;
  engagement_score?: number;
  recommendations?: Array<{
    type: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    confidence: number;
  }>;
};

/**
 * Wellness analysis for a member/family.
 * Source: wellness.wellness_insights, wellness_correlate
 */
export type WellnessAnalysis = AIAnalysis & {
  domain: "wellness";
  wellness_score?: number;
  correlations?: Array<{
    factor_a: string;
    factor_b: string;
    correlation: number;
    significance: string;
  }>;
  goal_progress?: {
    active: number;
    completed: number;
    on_track: number;
    behind: number;
  };
};

/**
 * Event optimization recommendations.
 * Source: events (mock-only AI tools)
 */
export type EventOptimization = AIAnalysis & {
  domain: "events";
  event_id?: string;
  optimization_areas: Array<{
    area: "pricing" | "timing" | "capacity" | "promotion" | "venue";
    suggestion: string;
    estimated_impact: string;
    priority: "high" | "medium" | "low";
    effort: "low" | "medium" | "high";
  }>;
  overall_score: number;
};

/**
 * Conflict analysis for scheduling.
 * Source: proactive_recommendation.detect_scheduling_conflicts
 */
export type ConflictAnalysis = {
  conflicts: Array<{
    event_a_name: string;
    event_b_name: string;
    conflict_type: "time_overlap" | "resource_overlap" | "audience_overlap";
    severity: SeverityLevel;
    detail: string;
    resolution_suggestion: string;
  }>;
  total_conflicts: number;
  risk_level: "low" | "medium" | "high";
  summary: string;
  generated_at: string;
};
/**
 * Facilities domain analysis.
 * Source: facility_management.get_facility_health + get_facility_analytics
 */
export type FacilitiesAnalysis = AIAnalysis & {
  domain: "facilities";
  occupancy_rate?: number;
  maintenance_score?: number;
  utilization_by_space?: Array<{
    space_name: string;
    utilization_pct: number;
    trend: "improving" | "stable" | "declining";
  }>;
  upcoming_maintenance?: number;
  roi_by_space?: Array<{
    space_name: string;
    revenue: number;
    cost: number;
    roi_pct: number;
  }>;
};

/**
 * ML Intelligence analysis — cross-domain ML insights.
 * Source: ml_intelligence server (anomaly, demand, revenue, churn, segmentation, model health)
 */
export type MLAnalysis = AIAnalysis & {
  domain: "ml_intelligence";
  anomaly_count?: number;
  systemic_risk_score?: number;
  models_healthy?: number;
  models_total?: number;
  drift_status?: string;
};

// Re-export SeverityLevel for use in this file's types


// ═══════════════════════════════════════════════════════════
// SECTION 5 — AI RESPONSE WRAPPERS
// Standard response shape for all AI tool responses.
// Ensures consistent error handling + loading states.
// ═══════════════════════════════════════════════════════════

/**
 * Standard wrapper for AI tool responses.
 * All MCP AI tools should return this shape.
 */
export interface AIResponse<T> {
  status: "success" | "error" | "pending_approval";
  message: string;
  data?: T;
  error?: string;
  request_id?: string;
  generated_at?: string;
}

/**
 * Wrapper for AI responses that include confidence metadata.
 */
export interface AIConfidentResponse<T> extends AIResponse<T> {
  confidence: number;
  model_version?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — CONSTANTS & CONFIGS
// ═══════════════════════════════════════════════════════════

/**
 * Advisor impact level display config.
 * Shared across ALL advisor banners.
 */
export const ADVISOR_IMPACT_DISPLAY: Record<
  AdvisorImpactLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    sortOrder: number;
  }
> = {
  high: {
    label: "Alto",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    sortOrder: 0,
  },
  medium: {
    label: "Medio",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    sortOrder: 1,
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    sortOrder: 2,
  },
};

/**
 * AI domain identifiers — used for routing, tracking, and display.
 */
export const AI_DOMAINS = [
  "financial", "events", "engagement", "communication",
  "family", "wellness", "satisfaction", "facilities",
  "cultural_social", "sports", "executive", "global",
  "ml_intelligence",
] as const;

export type AIDomain = typeof AI_DOMAINS[number];

export const AI_DOMAIN_DISPLAY: Record<
  AIDomain,
  { label: string; color: string; icon: string }
> = {
  financial: {
    label: "Finanzas",
    color: "var(--color-gold-400)",
    icon: "DollarSign",
  },
  events: {
    label: "Eventos",
    color: "var(--color-terracotta-400)",
    icon: "CalendarDays",
  },
  engagement: {
    label: "Engagement",
    color: "var(--color-emerald-400)",
    icon: "TrendingUp",
  },
  communication: {
    label: "Comunicaciones",
    color: "var(--color-teal-400)",
    icon: "MessageSquare",
  },
  family: {
    label: "Familias",
    color: "var(--color-sage-400)",
    icon: "Users",
  },
  wellness: {
    label: "Bienestar",
    color: "var(--color-emerald-400)",
    icon: "Heart",
  },
  satisfaction: {
    label: "Satisfacción",
    color: "var(--color-amber-400)",
    icon: "Star",
  },
  facilities: {
    label: "Instalaciones",
    color: "var(--color-terracotta-400)",
    icon: "Building2",
  },
  cultural_social: {
    label: "Cultural & Social",
    color: "var(--color-terracotta-400)",
    icon: "Palette",
  },
  sports: {
    label: "Deportes",
    color: "var(--color-emerald-300)",
    icon: "Trophy",
  },
  executive: {
    label: "Ejecutivo",
    color: "var(--color-gold-400)",
    icon: "Crown",
  },
  global: {
    label: "Global",
    color: "var(--color-teal-400)",
    icon: "Globe",
  },
  ml_intelligence: {
    label: "ML Intelligence",
    color: "var(--color-teal-400)",
    icon: "Brain",
  },

};

// ═══════════════════════════════════════════════════════════
// SECTION 7 — HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Compute confidence level from numeric score.
 */
export function getConfidenceLevel(
  score: number,
): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
/**

Confidence display colors — SEPARATE from impact colors.
CONFIDENCE ≠ IMPACT. They are independent dimensions:
Impact: rose (high) → amber (medium) → silver (low) ← danger scale
Confidence: teal (high) → amber (medium) → rose (low) ← reliability scale
For the full Confidence system with presets and computation,
see @/shared/lib/advisor-engine/confidence.ts
*/
const CONFIDENCE_COLORS: Record<"low" | "medium" | "high", string> = {
high: "var(--color-teal-400)",
medium: "var(--color-amber-400)",
low: "var(--color-rose-400)",
};

/**

Get display-ready confidence label + color.
NOTE: Uses confidence-specific colors (teal/amber/rose), NOT impact colors.
For full confidence computation with factors and presets,
use computeConfidence() from @/shared/lib/advisor-engine/confidence.ts
*/
export function getConfidenceDisplay(score: number): {
  level: "low" | "medium" | "high";
  label: string;
  color: string;
} {
  const level = getConfidenceLevel(score);
  return {
    level,
    label: `${score}% — ${level === "high" ? "Alta" : level === "medium" ? "Media" : "Baja"}`,
    color: CONFIDENCE_COLORS[level],
  };
}


/**
 * Sort advisor insights by impact + confidence (descending).
 * Used by all AdvisorBanner components.
 */
export function sortInsightsByPriority<T extends AdvisorInsightBase>(
  insights: T[],
): T[] {
  const impactOrder: Record<AdvisorImpactLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  return [...insights].sort((a, b) => {
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return b.confidence - a.confidence;
  });
}

/**
 * Filter insights by minimum impact level.
 */
export function filterInsightsByImpact<T extends AdvisorInsightBase>(
  insights: T[],
  minImpact: AdvisorImpactLevel,
): T[] {
  const threshold: Record<AdvisorImpactLevel, number> = {
    high: 2,
    medium: 1,
    low: 0,
  };
  return insights.filter((i) => threshold[i.impact] >= threshold[minImpact]);
}

/**
 * Generate a unique insight ID.
 */
export function generateInsightId(domain: string, ruleId: string): string {
  return `insight_${domain}_${ruleId}_${Date.now()}`;
}

/**
 * Generate a unique reaction ID.
 */
export function generateReactionId(): string {
  return `reaction_${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════
// QUICK REFERENCE
//
// ┌──────────────────────────────────────────────────────┐
// │ Import pattern (domain types.ts):                    │
// │                                                      │
// │ import {                                           │
// │   type AIPrediction,                               │
// │   type AIAnalysis,                                 │
// │   type AdvisorInsightBase,                         │
// │   type AdvisorCommand,                             │
// │   type HealthScoreFactor,                          │
// │   sortInsightsByPriority,                          │
// │ } from "@/shared/types/ai-intelligence";           │
// │                                                      │
// │ // Domain-specific extension:                        │
// │ interface MyInsight extends AdvisorInsightBase {    │
// │   layer: "macro" | "micro" | "fusion";            │
// │ }                                                    │
// │                                                      │
// │ // Advisor Engine (F45):                             │
// │ import {                                           │
// │   type RuleDefinition,                             │
// │   type AdvisorConfig,                              │
// │   type DomainSignal,                               │
// │   computeHealthScore,                              │
// │   computeConfidence,                               │
// │ } from "@/shared/lib/advisor-engine";              │
// └──────────────────────────────────────────────────────┘
//
// Primitives:              8 (AIFactor, HealthScoreFactor, AIRecommendation,
//                             AIProjectedMetric, AITrendPoint, AIAlert,
//                             AIPositiveTrend, AIRiskFactor)
// Output types:           10 (AIPrediction<T>, AIAnalysis, AIHealthScore,
//                             AIFinding, AINarrative, AIScenario, AISimulation,
//                             AIActionPlan, AIActionPlanItem, AIBrief)
// Advisor types:           5 (AdvisorInsightBase, AdvisorCommand, AdvisorActionState,
//                             AdvisorReaction, AdvisorLayer)
// Domain aliases:         10 (EventAttendance, Financial, Satisfaction, Engagement,
//                             Communication, Family, Wellness, EventOptimization,
//                             ConflictAnalysis, Facilities, ML)
// Response wrappers:       2 (AIResponse<T>, AIConfidentResponse<T>)
// Constants/Configs:       4 (ADVISOR_IMPACT_DISPLAY, AI_DOMAINS, AI_DOMAIN_DISPLAY,
//                             REACTION_STATUS_DISPLAY)
// Helpers:                 6 (getConfidenceLevel, getConfidenceDisplay,
//                             sortInsightsByPriority, filterInsightsByImpact,
//                             generateInsightId, generateReactionId)
//
// Advisor Engine (F45):
//   Types:    @/shared/lib/advisor-engine/types.ts (RuleDefinition, DomainSignal, etc.)
//   Evaluate: @/shared/lib/advisor-engine/evaluate.ts (evaluateRules, sortInsights)
//   Health:   @/shared/lib/advisor-engine/health-score.ts (computeHealthScore)
//   Confidence: @/shared/lib/advisor-engine/confidence.ts (computeConfidence, CONFIDENCE_DISPLAY)
// ═══════════════════════════════════════════════════════════
