// src/shared/mocks/contracts.ts
// ═══════════════════════════════════════════════════════════
// MCP Tool Response Contracts — Castillo Country Club
//
// Source of truth for ALL tool response shapes.
// - Frontend types DERIVE from these contracts
// - Mock factories MUST satisfy these contracts
// - Backend MUST return shapes matching these contracts
//
// When migrating a tool to backend real:
//   1. Delete the factory from mock-registry.ts
//   2. The contract stays (it's the interface, not the mock)
//   3. Verify backend response matches contract
//
// Naming: {ServerName}_{ToolName}Contract
// ═══════════════════════════════════════════════════════════

// ── Common ──

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BaseToolResponse {
  status: string;
  message: string;
}

export interface HITLResponse extends BaseToolResponse {
  request_id?: string;
  details?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// FINANCE AGENT
// ═══════════════════════════════════════════════════════════

/** get_financial_summary */
export interface get_financial_summary_Contract extends BaseToolResponse {
  data: {
    period: string;
    revenue_total: number;
    expenses_total: number;
    net_income: number;
    operating_margin_pct: number;
    collection_ratio_pct: number;
    budget_variance_pct: number;
    monthly_trend: Array<{
      month: string;
      revenue: number;
      expenses: number;
      net: number;
    }>;
    expense_breakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
      variance_pct: number;
    }>;
    revenue_by_source: Array<{
      source: string;
      amount: number;
      percentage: number;
    }>;
    cash_position: number;
    accounts_receivable: number;
    accounts_receivable_aging: Array<{
      bucket: string;
      amount: number;
      count: number;
    }>;
  };
}

/** generate_ai_analysis (scope: "financial") */
export interface generate_ai_analysis_financial_Contract extends BaseToolResponse {
  data: {
    report_type: string;
    generated_at: string;
    health_score: {
      score: number;
      grade: string;
      factors: Array<{
        name: string;
        score: number;
        weight: number;
        detail: string;
      }>;
    };
    cash_flow_forecast: {
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
    revenue_concentration: {
      hhi: number;
      diversification_index: number;
      top_sources: Array<{
        source: string;
        percentage: number;
        amount: number;
        trend: string;
      }>;
    };
    anomalies: Array<{
      type: string;
      description: string;
      severity: string;
      amount: number;
      date: string;
    }>;
    recommendations: Array<{
      category: string;
      recommendation: string;
      impact: string;
      priority: string;
      estimated_savings: number;
    }>;
    positive_trends: Array<{
      trend: string;
      impact: string;
    }>;
    alert_signals: Array<{
      signal: string;
      urgency: string;
      action_required: string;
    }>;
    projection: {
      next_quarter_revenue: number;
      next_quarter_expenses: number;
      year_end_balance: number;
      narrative: string;
      risk_factors: string[];
    };
    member_economics: {
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
}

/** generate_ai_analysis (scope: "engagement") */
export interface generate_ai_analysis_engagement_Contract extends BaseToolResponse {
  data: {
    health_summary: {
      avg_engagement_score: number;
      retention_rate_pct: number;
      trend: string;
      active_member_pct: number;
      wellness_participation_pct: number;
    };
    churn_analysis: {
      at_risk_count: number;
      predicted_churn_90d: number;
      churn_probability_distribution: Array<{ range: string; count: number }>;
      primary_churn_drivers: string[];
    };
    critical_families: Array<{
      family_name: string;
      risk_score: number;
      reason: string;
      recommendation: string;
      estimated_value_at_risk: number;
    }>;
    engagement_insights: {
      best_day_to_engage: string;
      best_time_to_engage: string;
      most_responsive_channel: string;
      top_3_drivers: string[];
    };
    retention_strategies: Array<{
      strategy: string;
      target_segment: string;
      impact_estimate: string;
      timeline: string;
    }>;
    activity_recommendations: Array<{
      activity: string;
      reason: string;
      estimated_demand: string;
      investment_estimate: number;
      roi_timeline: string;
    }>;
    financial_impact: {
      at_risk_annual_revenue: number;
      projected_churn_cost: number;
      recommended_retention_budget: number;
      expected_roi: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════
// MEMBER ENGAGEMENT AGENT — 6 tools (Phase B F30b)
// Backend: agents/member_engagement_agent.py
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums (VERIFICAR contra backend real) ──

export const CAMPAIGN_TYPES = [
  "reactivation", "retention", "upsell", "referral", "seasonal", "loyalty_tier"
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const REWARD_TYPES = [
  "points", "discount", "complimentary", "exclusive_access", "event_invitation", "merchandise"
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_STATUSES = ["active", "redeemed", "expired", "pending", "cancelled"] as const;
export type RewardStatus = (typeof REWARD_STATUSES)[number];

export const FEEDBACK_CHANNELS = ["in_app", "email", "whatsapp", "phone", "survey", "in_person"] as const;
export type FeedbackChannel = (typeof FEEDBACK_CHANNELS)[number];

export const FEEDBACK_SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type FeedbackSentiment = (typeof FEEDBACK_SENTIMENTS)[number];

// ── Tool 1: get_engagement_dashboard (AUTO) ──
// NOTA: shape legacy sin data wrapper — no romper componentes existentes.
// Se mantiene root-level para compatibilidad con EngagementDashboard.tsx.

export interface get_engagement_dashboard_Contract extends BaseToolResponse {
  summary: {
    total_families: number;
    total_members: number;
    active_30d: number;
    active_90d: number;
    avg_score: number;
    at_risk_count: number;
    dormant_count: number;
    improving_count: number;
    declining_count: number;
    nps_score: number;
    wellness_participation_pct: number;
    referral_rate_pct: number;
    facility_usage_pct: number;
  };
  level_distribution: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  monthly_trend: Array<{
    month: string;
    label: string;
    avg_score: number;
    active_pct: number;
    at_risk_pct: number;
    dormant_pct: number;
  }>;
  risk_factors: Array<{
    factor: string;
    label: string;
    count: number;
    percentage: number;
  }>;
  trend_summary: {
    improving: number;
    stable: number;
    declining: number;
  };
  families: Array<{
    family_id: string;
    family_name: string;
    engagement_score: number;
    engagement_level: string;
    trend: string;
    trend_pct: number;
    last_activity_label: string;
    visits_30d: number;
    wellness_active: boolean;
    nps_contribution: number | null;
  }>;
  pagination: PaginationMeta;
}

// ── Tool 2: get_engagement_insights (AUTO — intel) ──
// Per-member at-risk detection → Family Advisor (R1,R7,R8,R15)

export interface get_engagement_insights_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    family_name: string;
    engagement_score: number;
    engagement_level: string;
    trend: string;
    trend_pct: number;
    risk_level: "critical" | "high" | "medium" | "low" | "healthy";
    risk_factors: Array<{
      factor: string;
      impact: number;
      direction: "positive" | "negative";
      detail: string;
    }>;
    dimensions: Array<{
      dimension: string;
      score: number;
      weight: number;
      trend: "improving" | "stable" | "declining";
    }>;
    recommended_actions: Array<{
      action: string;
      priority: "high" | "medium" | "low";
      expected_impact: string;
      category: "communication" | "activity" | "recognition" | "social" | "financial";
    }>;
    peer_comparison: {
      tier_avg: number;
      club_avg: number;
      percentile: number;
    };
    last_activity_days_ago: number;
    confidence: number;
  };
}

// ── Tool 3: design_reactivation_campaign (HITL/AUTO CRUD) ──
// Campaign targeting ← Communication

export interface design_reactivation_campaign_Contract extends BaseToolResponse {
  data: {
    campaign_id: string;
    name: string;
    campaign_type: CampaignType;
    status: string;
    target_families: Array<{
      family_id: string;
      family_name: string;
      engagement_level: string;
      risk_level: string;
      ltv_at_risk: number;
    }>;
    total_targeted: number;
    channel_strategy: {
      primary_channel: string;
      secondary_channel: string;
      timing: string;
    };
    content: {
      subject: string;
      body_preview: string;
      cta_text: string;
    };
    expected_metrics: {
      estimated_reach: number;
      estimated_response_pct: number;
      estimated_reactivation_pct: number;
    };
    budget_estimate: number;
    roi_estimate: number;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 4: manage_loyalty_rewards (HITL/AUTO CRUD) ──
// Points lifecycle → Finance

export interface manage_loyalty_rewards_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    family_name: string;
    current_points: number;
    tier: string;
    lifetime_points: number;
    points_expiring_soon: number;
    expiry_date: string | null;
    rewards: Array<{
      reward_id: string;
      reward_type: RewardType;
      name: string;
      description: string;
      points_cost: number;
      status: RewardStatus;
      redeemed_at: string | null;
      expires_at: string | null;
    }>;
    recent_transactions: Array<{
      transaction_id: string;
      type: "earned" | "redeemed" | "expired" | "adjusted";
      points: number;
      description: string;
      date: string;
    }>;
    next_tier: string | null;
    points_to_next_tier: number | null;
  };
  request_id?: string;
}

// ── Tool 5: submit_feedback (AUTO — CRUD) ──
// Sentiment tracking → Satisfaction

export interface submit_feedback_Contract extends BaseToolResponse {
  data: {
    feedback_id: string;
    family_id: string;
    channel: FeedbackChannel;
    category: string;
    rating: number;
    sentiment: FeedbackSentiment;
    text: string | null;
    acknowledged: boolean;
    follow_up_required: boolean;
    created_at: string;
  };
}

// ── Tool 6: manage_referrals (AUTO — CRUD) ──
// Referral cascade → Family Advisor R15

export interface manage_referrals_Contract extends BaseToolResponse {
  data: {
    referral_id: string;
    referrer_family_id: string;
    referrer_family_name: string;
    referred_family_id: string | null;
    referred_name: string;
    referred_email: string | null;
    referred_phone: string | null;
    status: "pending" | "contacted" | "visited" | "converted" | "expired";
    visit_date: string | null;
    conversion_date: string | null;
    reward_points: number;
    notes: string;
    created_at: string;
  };
}

// ═══════════════════════════════════════════════════════════
// WELLNESS AGENT
// ═══════════════════════════════════════════════════════════

/** wellness_report */
export interface wellness_report_Contract extends BaseToolResponse {
  period_start: string;
  period_end: string;
  total_activities: number;
  total_minutes: number;
  total_calories: number;
  most_frequent_activity: string;
  activity_breakdown: Array<{
    activity: string;
    count: number;
    percentage: number;
  }>;
  goals_summary: {
    active: number;
    completed: number;
    paused: number;
    abandoned: number;
  };
  streak_days: number;
  summary: string;
}

// ═══════════════════════════════════════════════════════════
// SATISFACTION AGENT — 6 tools (Phase B F30b)
// Backend: agents/satisfaction_agent.py
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enum ──

export const SATISFACTION_CATEGORIES = [
  "venue", "food", "service", "cleanliness", "activities",
  "staff", "value", "entertainment", "facilities", "overall"
] as const;
export type SatisfactionCategory = (typeof SATISFACTION_CATEGORIES)[number];

// ── Tool 1: submit_satisfaction_survey (HITL — auto-approve) ──
// Auto-computes score + sentiment
// ← Events (post-event), ← Families (family-level)
//
// HALLAZGO #18 RESUELTO: Backend usa 10 categories × rating 1-5.
// El frontend permite rating/nps/text/choice.
// El contract refleja el shape del backend (source of truth).
// El frontend debe adaptarse al enviar: solo envía ratings por category.

export interface submit_satisfaction_survey_Contract extends BaseToolResponse {
  data: {
    survey_id: string;
    family_id: string;
    event_id: string | null;
    submitted_by: string;
    ratings: Record<SatisfactionCategory, number>;
    overall_score: number;
    sentiment: "positive" | "neutral" | "negative";
    comments: string | null;
    nps_score: number | null;
    category_averages: Record<SatisfactionCategory, number>;
    computed_at: string;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 2: get_survey_for_event (AUTO — data) ──
// → Events (post-event feedback loop)

export interface get_survey_for_event_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    event_date: string;
    surveys: Array<{
      survey_id: string;
      family_id: string;
      family_name: string;
      overall_score: number;
      sentiment: "positive" | "neutral" | "negative";
      nps_score: number | null;
      ratings: Record<SatisfactionCategory, number>;
      comments: string | null;
      submitted_at: string;
    }>;
    total_surveys: number;
    avg_overall_score: number;
    avg_nps: number | null;
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    category_averages: Record<SatisfactionCategory, number>;
    response_rate_pct: number;
  };
}

// ── Tool 3: analyze_event_satisfaction (SEMI — intel) ──
// AI-powered sentiment analysis
// → Events, → Executive Dashboard

export interface analyze_event_satisfaction_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    analysis_date: string;
    overall_score: number;
    overall_sentiment: "positive" | "neutral" | "negative";
    total_surveys_analyzed: number;
    category_scores: Array<{
      category: SatisfactionCategory;
      avg_score: number;
      trend: "improving" | "stable" | "declining";
      benchmark: number;
      delta: number;
    }>;
    sentiment_analysis: {
      positive_pct: number;
      neutral_pct: number;
      negative_pct: number;
      top_positive_themes: string[];
      top_negative_themes: string[];
    };
    key_findings: Array<{
      finding: string;
      severity: "positive" | "neutral" | "negative";
      category: SatisfactionCategory;
      evidence: string;
    }>;
    recommendations: Array<{
      area: string;
      recommendation: string;
      priority: "high" | "medium" | "low";
      estimated_impact: string;
    }>;
    ai_summary: string;
    confidence: number;
  };
}

// ── Tool 4: get_satisfaction_trends (AUTO — intel) ──
// Historical trends → Executive Dashboard, → Advisors

export interface get_satisfaction_trends_Contract extends BaseToolResponse {
  data: {
    current_nps: number;
    nps_trend: Array<{
      period: string;
      nps: number;
      promoters_pct: number;
      detractors_pct: number;
    }>;
    category_averages: Record<SatisfactionCategory, number>;
    sentiment_flow: Array<{
      period: string;
      positive: number;
      neutral: number;
      negative: number;
    }>;
    top_improvements: Array<{
      area: string;
      mentions: number;
      impact: string;
    }>;
    key_quotes: Array<{
      text: string;
      sentiment: string;
      family: string;
      date: string;
    }>;
    overall_trend: "improving" | "stable" | "declining";
    survey_volume_trend: Array<{
      period: string;
      count: number;
      response_rate_pct: number;
    }>;
  };
}

// ── Tool 5: generate_satisfaction_report (SEMI — report) ──
// Compound: analysis + trends + AI
// → Board Reports

export interface generate_satisfaction_report_Contract extends BaseToolResponse {
  data: {
    report_id: string;
    period_start: string;
    period_end: string;
    generated_at: string;
    executive_summary: string;
    overall_health: {
      avg_satisfaction: number;
      avg_nps: number;
      total_surveys: number;
      response_rate_pct: number;
      trend: "improving" | "stable" | "declining";
    };
    category_performance: Array<{
      category: SatisfactionCategory;
      avg_score: number;
      trend: "improving" | "stable" | "declining";
      benchmark: number;
    }>;
    event_highlights: Array<{
      event_id: string;
      event_title: string;
      event_date: string;
      satisfaction_score: number;
      attendance: number;
    }>;
    worst_performing: Array<{
      category: SatisfactionCategory;
      avg_score: number;
      worst_event: string;
      suggestion: string;
    }>;
    ai_insights: Array<{
      insight: string;
      priority: "high" | "medium" | "low";
      confidence: number;
    }>;
    recommendations: string[];
  };
  request_id?: string;
}

// ── Tool 6: get_satisfaction_questions (AUTO — data) ──
// Static 10 questions — no mutation

export interface get_satisfaction_questions_Contract extends BaseToolResponse {
  data: {
    questions: Array<{
      id: string;
      category: SatisfactionCategory;
      question: string;
      type: "rating" | "nps" | "text" | "choice";
      scale_min: number | null;
      scale_max: number | null;
      choices: string[] | null;
      is_required: boolean;
      order: number;
    }>;
    total_questions: number;
    version: string;
  };
}
// identify_social_clusters: contract definido en sección FAMILIES (F29)
// NO redefinir aquí — usar el que está más abajo en sección FAMILIES — Intelligence Contracts
// ═══════════════════════════════════════════════════════════
// PROACTIVE RECOMMENDATION AGENT — 8 tools (Phase B F30b)
// Backend: agents/proactive_recommendation_agent.py
// Re-auditado en F30 — HUB CENTRAL cross-domain
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums (⚠️ valores estimados — VERIFICAR contra backend) ──

export const PRICING_STRATEGIES = [
  "dynamic", "tiered", "bundled", "promotional", "premium"
] as const;
export type PricingStrategy = (typeof PRICING_STRATEGIES)[number];

export const RECOMMENDATION_TYPES = [
  "activity", "event", "pricing", "engagement", "operational", "social"
] as const;
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_PRIORITIES = [
  "critical", "high", "medium", "low"
] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

export const PREDICTION_CONFIDENCES = [
  "high", "medium", "low"
] as const;
export type PredictionConfidence = (typeof PREDICTION_CONFIDENCES)[number];

export const CLUSTER_TYPES = [
  "interest_based", "demographic", "activity_based", "social_graph", "tier_based"
] as const;
export type ClusterType = (typeof CLUSTER_TYPES)[number];

// ── Tool 1: optimize_pricing (HITL/AUTO CRUD) — NUEVO ──
// Pricing strategy → Finance

export interface optimize_pricing_Contract extends BaseToolResponse {
  data: {
    optimization_id: string;
    target: string;
    strategy: PricingStrategy;
    status: "draft" | "applied" | "rejected";
    current_pricing: Array<{
      item_id: string;
      item_name: string;
      category: string;
      current_price: number;
      suggested_price: number;
      price_change_pct: number;
      reasoning: string;
    }>;
    projected_impact: {
      revenue_change_pct: number;
      demand_change_pct: number;
      member_satisfaction_impact: string;
    };
    affected_families: number;
    estimated_annual_impact: number;
    risk_assessment: string;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 2: suggest_new_activities (HITL/AUTO CRUD) — NUEVO ──
// Demand-based ← AgeGroup, ← Satisfaction

export interface suggest_new_activities_Contract extends BaseToolResponse {
  data: {
    suggestion_id: string;
    activity_name: string;
    category: string;
    description: string;
    target_demographic: string;
    demand_score: number;
    demand_evidence: Array<{
      source: string;
      metric: string;
      value: number;
    }>;
    estimated_participation: number;
    estimated_revenue: number;
    investment_required: number;
    roi_timeline_months: number;
    similar_clubs_offer: boolean;
    venue_requirements: string;
    instructor_requirements: string | null;
    suggested_schedule: string;
    status: "proposed" | "approved" | "rejected" | "implemented";
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 3: generate_family_recommendations (AUTO — intel) — MIGRADO C→A ──
// Personalized recs ← Families, ← AgeGroup

export interface FamilyRecommendation {
  id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  score: number;
  reasoning: string;
  action_label: string;
  action_route: string | null;
  icon: string;
}

export interface generate_family_recommendations_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    family_name: string;
    recommendations: FamilyRecommendation[];
    total_recommendations: number;
    generated_at: string;
  };
}

// ── Tool 4: predict_event_attendance (AUTO — intel) — MIGRADO C→A ──
// Heuristic prediction ← Events
// HALLAZGO #15: multiplicadores fijos — contract refleja shape del backend

export interface predict_event_attendance_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    predicted_attendance: number;
    confidence: PredictionConfidence;
    capacity_risk: "low" | "medium" | "high" | "critical";
    factors: Array<{
      name: string;
      impact: number;
      direction: "positive" | "negative";
      detail: string;
    }>;
    historical_comparison: {
      similar_events_avg: number;
      category_avg: number;
      best_ever: number;
    };
    recommendation: string;
    generated_at: string;
  };
}

// ── Tool 5: detect_scheduling_conflicts (AUTO — intel) — MIGRADO A ──
// Cross-event conflicts ↔ Events
// HALLAZGO #13: DUPLICACIÓN con event_get_calendar
// NOTA: Este contract cubre el análisis CROSS-EVENT específico del proactive agent.
// event_get_calendar ya detecta conflicts inline (sección Events).
// Este es el análisis PROFUNDO con sugerencias de resolución.

export interface detect_scheduling_conflicts_Contract extends BaseToolResponse {
  data: {
    conflicts: Array<{
      id: string;
      event_a_id: string;
      event_a_name: string;
      event_b_id: string;
      event_b_name: string;
      conflict_type: "time_overlap" | "resource_overlap" | "audience_overlap" | "venue_overlap";
      severity: "high" | "medium" | "low";
      overlap_start: string;
      overlap_end: string;
      shared_resources: string[];
      affected_families: number;
      suggestion: string;
      auto_resolvable: boolean;
    }>;
    total_conflicts: number;
    risk_level: "low" | "medium" | "high";
    most_affected_date: string | null;
    generated_at: string;
  };
}

// ── Tool 6: personalize_communication (AUTO — intel) — MIGRADO C→A ──
// Template-based ← Families, ← Communication
// HALLAZGO #16: no usa claude_service — contract refleja shape actual

export interface personalize_communication_Contract extends BaseToolResponse {
  data: {
    draft_id: string;
    family_id: string;
    family_name: string;
    channel: string;
    subject: string;
    body: string;
    tone: string;
    personalization_data: {
      family_name: string;
      topic: string;
      interests: string[];
      recent_activity: string | null;
      tier: string;
    };
    alternative_versions: Array<{
      version: string;
      subject: string;
      body_preview: string;
    }>;
    estimated_engagement: string;
    created_at: string;
  };
}

// ── Tool 7: identify_social_clusters (AUTO — intel) ──
// Cluster analysis ↔ Families
// RESUELTO EN BLOQUE 0: contract F29 es source of truth
// (definido en sección FAMILIES — Intelligence Contracts)

// ── Tool 8: generate_quarterly_insights (AUTO — intel/report) — MIGRADO A ──
// ALL domains aggregated
// HALLAZGO #14: contract refleja shape del backend (datos hardcodeados son issue del backend, no del contract)

export interface generate_quarterly_insights_Contract extends BaseToolResponse {
  data: {
    id: string;
    year: number;
    period: string;
    generated_at: string;
    summary: string;
    overall_health_score: number;
    membership: {
      total_active: number;
      new_members: number;
      departures: number;
      net_growth: number;
      churn_rate_pct: number;
    };
    financial: {
      revenue_total: number;
      expenses_total: number;
      net_income: number;
      budget_variance_pct: number;
    };
    engagement: {
      avg_engagement_score: number;
      events_held: number;
      avg_event_attendance: number;
      nps_score: number;
      satisfaction_avg: number;
    };
    top_activities: Array<{
      name: string;
      attendance: number;
      growth_pct: number;
    }>;
    key_achievements: string[];
    areas_for_improvement: string[];
    recommendations: string[];
    ai_narrative: string | null;
    confidence: number;
  };
}

// ═══════════════════════════════════════════════════════════
// COMMUNICATION AGENT
// ═══════════════════════════════════════════════════════════

/** broadcast_club_announcement (HITL) */
export interface broadcast_club_announcement_Contract extends HITLResponse {}

/** manage_emergency_broadcast (ALWAYS_HUMAN) */
export interface manage_emergency_broadcast_Contract extends HITLResponse {}

/** send_personalized_notification */
export interface send_personalized_notification_Contract extends HITLResponse {}

/** manage_notification_templates (action: "list") */
export interface manage_notification_templates_list_Contract extends BaseToolResponse {
  templates: Array<{
    id: string;
    name: string;
    category: string;
    subject: string;
    body_template: string;
    channels: string[];
    variables: string[];
    is_active: boolean;
    created_at: string;
  }>;
}

/** schedule_notification (action: "list") */
export interface schedule_notification_list_Contract extends BaseToolResponse {
  scheduled: Array<{
    id: string;
    template_id: string;
    recipient_ids: string[];
    channel: string;
    scheduled_at: string;
    status: string;
    params: Record<string, string>;
    sent_at?: string;
    notes?: string;
  }>;
}

/** get_notification_history */
export interface get_notification_history_Contract extends BaseToolResponse {
  history: Array<{
    id: string;
    notification_type: string;
    title: string;
    channel: string;
    recipient_count: number;
    status: string;
    sent_at: string;
    created_by: string;
    notes?: string;
  }>;
  total: number;
}

/** list_announcements */
export interface list_announcements_Contract extends BaseToolResponse {
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    announcement_type: string;
    status: string;
    channels: string[];
    target_audience: string;
    scheduled_at?: string;
    sent_at?: string;
    created_by: string;
    priority: number;
    requires_acknowledgment: boolean;
    notes?: string;
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** get_communication_analytics */
export interface get_communication_analytics_Contract extends BaseToolResponse {
  analytics: {
    period: string;
    total_sent: number;
    total_recipients: number;
    delivery_rate_pct: number;
    avg_recipients_per_send: number;
    best_day_to_send: string;
    best_hour_to_send: string;
    channel_breakdown: Array<{
      channel: string;
      count: number;
      percentage: number;
    }>;
    type_breakdown: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
    status_breakdown: {
      sent: number;
      delivered: number;
      failed: number;
      cancelled: number;
    };
    daily_volume: Array<{
      date: string;
      count: number;
    }>;
    hourly_distribution: Array<{
      hour: string;
      count: number;
    }>;
  };
}

/** send_board_package */
export interface send_board_package_Contract extends BaseToolResponse {
  package?: {
    package_id: string;
    quarter: string;
    year: number;
    recipients: Array<{
      name: string;
      email: string;
      role: string;
    }>;
    delivery_mode: string;
    generated_at: string;
    contents: string[];
    status: string;
  };
}
// ═══════════════════════════════════════════════════════════
// COMMUNICATION PREFERENCES — 2 tools (Patrón B → A)
// Phase 11 — mock-only
// ═══════════════════════════════════════════════════════════

export interface manage_communication_preferences_Contract extends BaseToolResponse {
  data: {
    preferences: {
      id: string;
      member_id: string;
      email_enabled: boolean;
      push_enabled: boolean;
      sms_enabled: boolean;
      whatsapp_enabled: boolean;
      in_app_enabled: boolean;
      announcements: string;
      events: string;
      promotions: string;
      quiet_hours_start: string;
      quiet_hours_end: string;
    };
  };
}

export interface communication_insights_Contract extends BaseToolResponse {
  data: {
    insights: Array<{
      id: string;
      category: string;
      priority: string;
      title: string;
      description: string;
      confidence: number;
      metric: string | null;
      recommendation: string;
      action_label: string | null;
      action_route: string | null;
    }>;
    summary: string;
    generated_at: string;
  };
}

// ═══════════════════════════════════════════════════════════
// HITL AGENT
// ═══════════════════════════════════════════════════════════

/** get_pending_approvals */
export interface get_pending_approvals_Contract extends BaseToolResponse {
  requests: Array<{
    request_id: string;
    agent: string;
    tool: string;
    params: Record<string, unknown>;
    requested_by: string;
    approval_level: string;
    status: string;
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
  }>;
  total: number;
}

/** approve_request */
export interface approve_request_Contract extends BaseToolResponse {}

/** reject_request */
export interface reject_request_Contract extends BaseToolResponse {}

// ═══════════════════════════════════════════════════════════
// TOOL → CONTRACT MAPPING (for type-safe mock registry)
// ═══════════════════════════════════════════════════════════

/**
 * Maps "server.tool" → Contract type.
 * Use this to type the mock registry:
 *
 *   const mock: ToolContract<"member_engagement", "get_engagement_dashboard"> = { ... }
 */
// ── Executive Dashboard — imports for ToolContractMap usage ──
import type {
  ExecutiveSummaryResponse,
  FinancialOverviewResponse,
  MembershipHealthResponse,
  OperationalPulseResponse,
  DetectAnomaliesResponse,
  AgeGroupBalanceResponse,
  BoardReportResponse,
  ExportResponse,
} from "@/features/dashboard/types";

// ── Executive Dashboard — Re-exports from features/dashboard/types.ts ──
// Source of truth: features/dashboard/types.ts
// DO NOT duplicate these types here. Import from types.ts directly.

export type {
  DashboardPeriod,
  TrendDirection,
  AnomalySeverity,
  AnomalyDomain,
  ReportAudience,
  ReportQuarter,
  ExportFormat,
  MembershipKPI,
  FinancialKPI,
  OperationalKPI,
  EngagementKPI,
  ExecutiveSummaryData,
  AnomalyData,
  AgeGroupEntry,
  BoardReportData,
  ExportRequestData,
  ExecutiveSummaryResponse,
  FinancialOverviewResponse,
  MembershipHealthResponse,
  OperationalPulseResponse,
  DetectAnomaliesResponse,
  AgeGroupBalanceResponse,
  BoardReportResponse,
  ExportResponse,
  KPIData,
  TierData,
  ActivityData,
  RevenueSourceData,
  AnomalyUI,
  HitlItem,
  AgeGroupData,
  YoYComparison,
  YoYData,
} from "@/features/dashboard/types";

// ═══ EXECUTIVE AI ANALYSIS (cross-scope report) ═══


export interface AiExecutiveRiskScore {
  value: number;
  max: number;
  factors: string[];
}

export interface AiExecutiveCrossDomainInsight {
  domains: string[];
  insight: string;
  correlation: string;
}

export interface AiExecutiveRiskAlert {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affected_segment?: string;
}

export interface AiExecutiveRecommendation {
  priority: "high" | "medium" | "low";
  action: string;
  justification: string;
  estimated_impact: string;
  domain: string;
}

export interface AiExecutiveProjection {
  method: string;
  confidence: number;
  optimistic: string;
  base: string;
  pessimistic: string;
}

export interface AiExecutiveSuggestedAction {
  label: string;
  action_type: "contact" | "meeting" | "review" | "report";
  target?: string;
  priority: "high" | "medium" | "low";
}

export interface AiExecutiveReport {
  scope: "executive" | "financial" | "engagement";
  executive_summary: string;
  risk_score: AiExecutiveRiskScore;
  trend: "improving" | "stable" | "declining";
  confidence: number;
  horizon_days: number;
  cross_domain_insights: AiExecutiveCrossDomainInsight[];
  risk_alerts: AiExecutiveRiskAlert[];
  recommendations: AiExecutiveRecommendation[];
  projection: AiExecutiveProjection;
  suggested_actions: AiExecutiveSuggestedAction[];
}
// ═══════════════════════════════════════════════════════════
// TOOL CONTRACT MAP — Type-safe mock registry
// Maps "server.tool" → Contract type
//
// COBERTURA: 92/135+ tools (~68%)
// Agents F30b COMPLETOS: Member Engagement, Facility Mgmt,
//   Satisfaction, Cultural Social, Sports Recreation, Age Group,
//   Proactive Recommendation
// ═══════════════════════════════════════════════════════════

export interface ToolContractMap {

  // ═══ EXECUTIVE DASHBOARD (8 tools — F16 audit) ═══
  // Tipos definidos en features/dashboard/types.ts, re-exportados arriba
  "executive_dashboard.get_executive_summary": ExecutiveSummaryResponse;
  "executive_dashboard.get_financial_overview": FinancialOverviewResponse;
  "executive_dashboard.get_membership_health": MembershipHealthResponse;
  "executive_dashboard.get_operational_pulse": OperationalPulseResponse;
  "executive_dashboard.detect_anomalies": DetectAnomaliesResponse;
  "executive_dashboard.get_age_group_balance": AgeGroupBalanceResponse;
  "executive_dashboard.generate_board_report": BoardReportResponse;
  "executive_dashboard.export_report": ExportResponse;
  "executive_dashboard.generate_ai_analysis": AiExecutiveReport;

  // ═══ FINANCE (17 tools — completo) ═══
  "finance.get_financial_summary": get_financial_summary_Contract;
  "finance.generate_ai_analysis_financial": generate_ai_analysis_financial_Contract;
  "finance.generate_ai_analysis_engagement": generate_ai_analysis_engagement_Contract;
  "finance.expense_create": FinanceExpenseCreateResponse;
  "finance.invoice_create": FinanceInvoiceCreateResponse;
  "finance.budget_check": FinanceBudgetCheckResponse;
  "finance.payment_process": FinancePaymentProcessResponse;
  "finance.report_generate": FinanceReportGenerateResponse;
  "finance.account_status": FinanceAccountStatusResponse;
  "finance.category_update": FinanceCategoryUpdateResponse;
  "finance.scenario_simulate": FinanceScenarioSimulateResponse;
  "finance.opportunities_scan": FinanceOpportunitiesScanResponse;
  "finance.board_briefing": FinanceBoardBriefingResponse;
  "finance.member_profitability": FinanceMemberProfitabilityResponse;
  "finance.stress_test": FinanceStressTestResponse;
  "finance.seasonal_calendar": FinanceSeasonalCalendarResponse;
  "finance.narrative_generate": FinanceNarrativeGenerateResponse;
  "finance.decision_simulate": finance_decision_simulate_Contract;
  // ═══ DECISION COCKPIT (1 tool — F14d, Patrón A) ═══
  // "finance.decision_simulate": finance_decision_simulate_Contract;  

  // ═══ MEMBER ENGAGEMENT (6 tools — F30b COMPLETO) ═══
  "member_engagement.get_engagement_dashboard": get_engagement_dashboard_Contract;
  "member_engagement.get_engagement_insights": get_engagement_insights_Contract;
  "member_engagement.design_reactivation_campaign": design_reactivation_campaign_Contract;
  "member_engagement.manage_loyalty_rewards": manage_loyalty_rewards_Contract;
  "member_engagement.submit_feedback": submit_feedback_Contract;
  "member_engagement.manage_referrals": manage_referrals_Contract;

  // ═══ FACILITY MANAGEMENT (7 tools — F30b COMPLETO) ═══
  "facility_management.manage_facilities": manage_facilities_Contract;
  "facility_management.schedule_maintenance": schedule_maintenance_Contract;
  "facility_management.coordinate_event_setup": coordinate_event_setup_Contract;
  "facility_management.get_facility_occupancy": get_facility_occupancy_Contract;
  "facility_management.manage_inspections": manage_inspections_Contract;
  "facility_management.report_facility_issue": report_facility_issue_Contract;
  "facility_management.get_maintenance_schedule": get_maintenance_schedule_Contract;

  // ═══ SATISFACTION (6 tools — F30b COMPLETO) ═══
  "satisfaction.submit_satisfaction_survey": submit_satisfaction_survey_Contract;
  "satisfaction.get_survey_for_event": get_survey_for_event_Contract;
  "satisfaction.analyze_event_satisfaction": analyze_event_satisfaction_Contract;
  "satisfaction.get_satisfaction_trends": get_satisfaction_trends_Contract;
  "satisfaction.generate_satisfaction_report": generate_satisfaction_report_Contract;
  "satisfaction.get_satisfaction_questions": get_satisfaction_questions_Contract;

  // ═══ CULTURAL SOCIAL (6 tools — F30b COMPLETO) ═══
  "cultural_social.organize_formal_gala": organize_formal_gala_Contract;
  "cultural_social.manage_entertainment_acts": manage_entertainment_acts_Contract;
  "cultural_social.manage_cultural_program": manage_cultural_program_Contract;
  "cultural_social.manage_social_events": manage_social_events_Contract;
  "cultural_social.manage_art_exhibitions": manage_art_exhibitions_Contract;
  "cultural_social.get_cultural_calendar": cultural_social_get_cultural_calendar_Contract;
  "cultural_social.get_cultural_analytics": cultural_social_get_cultural_analytics_Contract;
  "cultural_social.get_cultural_summary": cultural_social_get_cultural_summary_Contract;
  "cultural_social.generate_cultural_proposals": cultural_social_generate_cultural_proposals_Contract;


  // ═══ SPORTS & RECREATION (11 tools — F32 audit) ═══
  "sports_recreation.manage_court_reservations": ManageCourtReservations_Contract;
  "sports_recreation.organize_tournament": OrganizeTournament_Contract;
  "sports_recreation.manage_fitness_classes": ManageFitnessClasses_Contract;
  "sports_recreation.coordinate_coaching": CoordinateCoaching_Contract;
  "sports_recreation.manage_sport_leagues": ManageSportLeagues_Contract;
  "sports_recreation.get_equipment_availability": GetEquipmentAvailability_Contract;
  "sports_recreation.get_sports_recommendations": GetSportsRecommendations_Contract;
  "sports_recreation.get_sports_analytics": GetSportsAnalytics_Contract;
  "sports_recreation.get_sports_health_summary": GetSportsHealthSummary_Contract;
  "sports_recreation.get_sports_calendar": GetSportsCalendar_Contract;
  "sports_recreation.generate_sports_proposals": GenerateSportsProposals_Contract;


  // ═══ AGE GROUP (7 tools — F30b COMPLETO) ═══
  "age_group.age_group_list": age_group_list_Contract;
  "age_group.age_group_get_activities": age_group_get_activities_Contract;
  "age_group.age_group_register_activity": age_group_register_activity_Contract;
  "age_group.age_group_get_demographics": age_group_get_demographics_Contract;
  "age_group.age_group_get_participation": age_group_get_participation_Contract;
  "age_group.age_group_recommend_activities": age_group_recommend_activities_Contract;
  "age_group.age_group_update_activity": age_group_update_activity_Contract;

  // ═══ PROACTIVE RECOMMENDATION (8 tools — F30b COMPLETO) ═══
  "proactive_recommendation.optimize_pricing": optimize_pricing_Contract;
  "proactive_recommendation.suggest_new_activities": suggest_new_activities_Contract;
  "proactive_recommendation.generate_family_recommendations": generate_family_recommendations_Contract;
  "proactive_recommendation.predict_event_attendance": predict_event_attendance_Contract;
  "proactive_recommendation.detect_scheduling_conflicts": detect_scheduling_conflicts_Contract;
  "proactive_recommendation.personalize_communication": personalize_communication_Contract;
  "proactive_recommendation.identify_social_clusters": identify_social_clusters_Contract;
  "proactive_recommendation.generate_quarterly_insights": generate_quarterly_insights_Contract;

  // ═══ EVENTS (16 tools — F19 audit, Patrón A) ═══
  "events.event_list": event_list_Contract;
  "events.event_detail": event_detail_Contract;
  "events.event_create": event_create_Contract;
  "events.event_update": event_update_Contract;
  "events.event_cancel": event_cancel_Contract;
  "events.event_get_calendar": event_get_calendar_Contract;
  "events.event_build_program": event_build_program_Contract;
  "events.event_manage_rsvps": event_manage_rsvps_Contract;
  "events.event_coordinate_vendors": event_coordinate_vendors_Contract;
  "events.event_manage_capacity": event_manage_capacity_Contract;
  "events.event_get_analytics": event_get_analytics_Contract;
  "events.event_clone_template": event_clone_template_Contract;
  "events.event_generate_report": event_generate_report_Contract;
  "events.event_recommend_optimization": event_recommend_optimization_Contract;
  "events.event_conflict_detection": event_conflict_detection_Contract;
  "events.event_engagement_boost": event_engagement_boost_Contract;

  // ═══ FAMILY PROFILE (17 tools — F29, Patrón A) ═══
  "family_profile.list_families": list_families_Contract;
  "family_profile.get_family": get_family_Contract;
  "family_profile.family_create": family_create_Contract;
  "family_profile.family_update_profile": family_update_profile_Contract;
  "family_profile.get_activity_history": get_activity_history_Contract;
  "family_profile.family_social_graph_enriched": family_social_graph_enriched_Contract;
  "family_profile.family_lifecycle_analysis": family_lifecycle_analysis_Contract;
  "family_profile.family_360_insight": family_360_insight_Contract;
  "family_profile.family_milestone_tracker": family_milestone_tracker_Contract;
  "family_profile.identify_social_clusters": identify_social_clusters_Contract;
  "family_profile.family_churn_prediction": family_churn_prediction_Contract;
  "family_profile.family_activity_recommendations": family_activity_recommendations_Contract;
  "family_profile.family_social_match": family_social_match_Contract;
  "family_profile.family_engagement_plan": family_engagement_plan_Contract;
  "family_profile.family_set_preferences": family_set_preferences_Contract;

  // ═══ COMMUNICATION (9 tools — completo desde F28) ═══
  "communication.broadcast_club_announcement": broadcast_club_announcement_Contract;
  "communication.manage_emergency_broadcast": manage_emergency_broadcast_Contract;
  "communication.send_personalized_notification": send_personalized_notification_Contract;
  "communication.manage_notification_templates_list": manage_notification_templates_list_Contract;
  "communication.schedule_notification_list": schedule_notification_list_Contract;
  "communication.get_notification_history": get_notification_history_Contract;
  "communication.list_announcements": list_announcements_Contract;
  "communication.get_communication_analytics": get_communication_analytics_Contract;
  "communication.send_board_package": send_board_package_Contract;

  // ═══ ADVISOR INTELLIGENCE (5 tools — completo desde F21) ═══
  "advisor_intelligence.generate_insight_narrative": AdvisorInsightNarrativeResponse;
  "advisor_intelligence.generate_action_plan": AdvisorActionPlanResponse;
  "advisor_intelligence.simulate_scenario": AdvisorScenarioResponse;
  "advisor_intelligence.generate_board_brief": AdvisorBoardBriefResponse;
  "advisor_intelligence.ask_advisor": AdvisorAskResponse;

  // ═══ DOCUMENT INTELLIGENCE / RAG (8 tools — completo desde F27) ═══
  "document_intelligence.search_documents": search_documents_Contract;
  "document_intelligence.knowledge_query": knowledge_query_Contract;
  "document_intelligence.query_documents": query_documents_Contract;
  "document_intelligence.search_similar": search_similar_Contract;
  "document_intelligence.get_repository_stats": get_repository_stats_Contract;
  "document_intelligence.ingest_document": ingest_document_Contract;
  "document_intelligence.generate_knowledge_report": generate_knowledge_report_Contract;
  "document_intelligence.manage_document_access": manage_document_access_Contract;

  // ═══ COMMUNICATION INTELLIGENCE (3 tools — F28) ═══
  "communication.generate_communication_insights": generate_communication_insights_Contract;
  "communication.get_communication_health": get_communication_health_Contract;
  "communication.get_campaign_performance": get_campaign_performance_Contract;


  // ═══ WELLNESS (12 tools — Patrón A) ═══
  "wellness.wellness_profile_get": wellness_profile_get_Contract;
  "wellness.wellness_profile_update": wellness_profile_update_Contract;
  "wellness.wellness_activity_log": wellness_activity_log_Contract;
  "wellness.wellness_goal_set": wellness_goal_set_Contract;
  "wellness.wellness_recommendations": wellness_recommendations_Contract;
  "wellness.wellness_schedule_class": wellness_schedule_class_Contract;
  "wellness.wellness_report": wellness_report_Contract;
  "wellness.wellness_predict": wellness_predict_Contract;
  "wellness.wellness_anomalies": wellness_anomalies_Contract;
  "wellness.wellness_correlate": wellness_correlate_Contract;
  "wellness.wellness_insights": wellness_insights_Contract;
  "wellness.wellness_goal_list": wellness_goal_list_Contract;

  // ═══ HITL (3 tools — completo) ═══
  "hitl.get_pending_approvals": get_pending_approvals_Contract;
  "hitl.approve_request": approve_request_Contract;
  "hitl.reject_request": reject_request_Contract;

  // ═══ COMPLIANCE (7 tools — F30b completo, Patrón A) ═══
  "compliance.manage_compliance_requirements": manage_compliance_requirements_Contract;
  "compliance.schedule_compliance_audit": schedule_compliance_audit_Contract;
  "compliance.track_corrective_actions": track_corrective_actions_Contract;
  "compliance.get_compliance_status": get_compliance_status_Contract;
  "compliance.get_compliance_risks": get_compliance_risks_Contract;
  "compliance.compliance_alert_list": ComplianceAlertListResponse;
  "compliance.compliance_report_generate": ComplianceReportResponse;

  // ═══ GUEST MANAGEMENT (6 tools — Patrón A) ═══
  "guest_management.register_guest": register_guest_Contract;
  "guest_management.plan_private_event": plan_private_event_Contract;
  "guest_management.manage_trial_memberships": manage_trial_memberships_Contract;
  "guest_management.manage_guest_privileges": manage_guest_privileges_Contract;
  "guest_management.get_guest_analytics": get_guest_analytics_Contract;
  "guest_management.guest_management_insights": guest_management_insights_Contract;

  // ═══ MEMBERS INTELLIGENCE HUB (4 tools — F14c, Patrón A) ═══
  "members.members_health_score": members_health_score_Contract;
  "members.members_segmentation": members_segmentation_Contract;
  "members.members_lifetime_value": members_lifetime_value_Contract;
  "members.members_churn_prevention": members_churn_prevention_Contract;



  // ═══ COMMUNICATIONS GENERATIVE (3 tools — F14d, Patrón A) ═══
  "communication.generate_personalized": communications_generate_personalized_Contract;
  "communication.campaign_generate": communications_campaign_generate_Contract;
  "communication.sentiment_analyze": communications_sentiment_analyze_Contract;

  // ═══ COMMUNICATION PREFERENCES (2 tools — F11, Patrón A) ═══
  "communication.manage_communication_preferences": manage_communication_preferences_Contract;
  "communication.communication_insights": communication_insights_Contract;

}

/** Extract contract type for a given server + tool */
/** Extract contract type for a given server + tool */
export type ToolContract<S extends keyof ToolContractMap> = ToolContractMap[S];

/** Type-safe contract lookup helper */
export type GetContract<S extends string, T extends string> =
  `${S}.${T}` extends keyof ToolContractMap
    ? ToolContractMap[`${S}.${T}`]
    : never;


// ═══════════════════════════════════════════════════════════
// WELLNESS TOOL CONTRACTS — Append after existing content
// ═══════════════════════════════════════════════════════════



// wellness_predict: contract unificado — Patrón A
// Unifica engagement predictions (30d/60d/90d) + risk model del backend
export interface wellness_predict_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    // Risk model
    risk_level: string;
    engagement_score: number;
    predicted_trend: string;
    churn_risk_pct: number;
    activity_forecast: {
      current_distribution: Record<string, number>;
      most_frequent: string;
      total_unique_dates: number;
      suggested_weekly_minutes: number;
    };
    factors: Array<{
      factor: string;
      impact: string;
    }>;
    top_recommendation: string;
    confidence: number;
  };
}

// ═══════════════════════════════════════════════════════════
// FASE 10 — Proactive Recommendations Contracts
// ═══════════════════════════════════════════════════════════

import type {
  PricingListResponse,
  PricingGetResponse,
  PricingCreateResponse,
  SuggestionsListResponse,
  SuggestionsGetResponse,
  SuggestionsCreateResponse,
  FamilyRecommendationsResponse,
  PredictAttendanceResponse,
  PersonalizeCommResponse,
  SocialClustersResponse,
  QuarterlyInsightsListResponse
} from "../../features/recommendations/types";

// Re-exports for mock system consumption
export type {
  PricingListResponse,
  PricingGetResponse,
  PricingCreateResponse,
  SuggestionsListResponse,
  SuggestionsGetResponse,
  SuggestionsCreateResponse,
  FamilyRecommendationsResponse,
  PredictAttendanceResponse,
  PersonalizeCommResponse,
  SocialClustersResponse,
  QuarterlyInsightsListResponse,
};

// ═══════════════════════════════════════════════════════════
// GUEST MANAGEMENT AGENT — 6 tools (Patrón B → A migration)
// Backend: agents/guest_management_agent.py
// ⚠️ Agent NO auditado en F30 — shapes derivados de Patrón B existente
// Enums: TrialType, TrialStatus, GuestCheckInStatus → ya en domain-enums.ts
// ═══════════════════════════════════════════════════════════

// ── Tool 1: register_guest (HITL) ──

export interface register_guest_Contract extends BaseToolResponse {
  data: {
    guest: {
      id: string;
      family_id: string;
      host_member_id: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string;
      visit_date: string;
      purpose: string;
      status: string;
      privileges: string[];
      notes: string;
      created_at: string;
      updated_at: string;
    };
    current_guests: number;
    limit: number;
  };
  request_id?: string;
}

// ── Tool 2: plan_private_event (HITL) ──

export interface plan_private_event_Contract extends BaseToolResponse {
  data: {
    event: {
      id: string;
      family_id: string;
      event_name: string;
      event_type: string;
      venue: string;
      date: string;
      start_time: string;
      end_time: string;
      guest_count: number;
      budget: number;
      estimated_cost: number;
      status: string;
      coordinator_member_id: string;
      description: string;
      special_requirements: string;
      catering_required: boolean;
      decoration_required: boolean;
      entertainment_required: boolean;
      notes: string;
      created_at: string;
      updated_at: string;
    };
  };
  request_id?: string;
}

// ── Tool 3: manage_trial_memberships (HITL/AUTO CRUD) ──

export interface manage_trial_memberships_Contract extends BaseToolResponse {
  data: {
    trial_membership: {
      id: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string;
      referred_by_family_id: string;
      trial_type: string;
      start_date: string;
      end_date: string;
      status: string;
      privileges: string[];
      notes: string;
      created_at: string;
      updated_at: string;
    };
  };
  request_id?: string;
}

// ── Tool 4: manage_guest_privileges (AUTO — CRUD) ──

export interface manage_guest_privileges_Contract extends BaseToolResponse {
  data: {
    guest_id: string;
    guest_name: string;
    privileges: Array<{ type: string; name: string }>;
    guest: {
      id: string;
      family_id: string;
      host_member_id: string;
      guest_name: string;
      guest_email: string;
      guest_phone: string;
      visit_date: string;
      purpose: string;
      status: string;
      privileges: string[];
      notes: string;
      created_at: string;
      updated_at: string;
    };
  };
}

// ── Tool 5: get_guest_analytics (AUTO — data) ──

export interface get_guest_analytics_Contract extends BaseToolResponse {
  data: {
    total_guests: number;
    total_private_events: number;
    total_trial_memberships: number;
    guests_by_status: Record<string, number>;
    guests_by_privilege: Array<{ privilege: string; count: number }>;
    events_by_type: Array<{ type: string; count: number }>;
    events_by_status: Array<{ status: string; count: number }>;
    trials_by_status: Array<{ status: string; count: number }>;
    trials_by_type: Array<{ type: string; count: number }>;
    guests_by_day_of_week: Array<{ day: string; count: number }>;
    top_host_families: Array<{ family_id: string; family_name: string; guest_count: number }>;
    trial_conversion_rate: number;
    avg_guests_per_event: number;
    avg_event_budget: number;
    upcoming_events: number;
    active_trials: number;
    trials_expiring_soon: number;
  };
}

// ── Tool 6: guest_management_insights (AUTO — intel, mock-only) ──

export interface guest_management_insights_Contract extends BaseToolResponse {
  data: {
    insights: Array<{
      id: string;
      category: string;
      priority: string;
      title: string;
      description: string;
      confidence: number;
      metric: string | null;
      recommendation: string;
      action_label: string | null;
    }>;
    summary: string;
    generated_at: string;
  };
}

// ═══════════════════════════════════════════════════════════
// FASE 13 — Finance Enhancement — Contracts
// Append to: src/shared/mocks/contracts.ts
// Source of truth for finance API response shapes.
// NEVER delete these contracts.
// ═══════════════════════════════════════════════════════════

import type {
  FinancialSummary,
  AiFinancialReport,
  ScenarioSimulationData,
  OpportunityScanData,
  BoardBriefingData,
} from "@/features/finance/types";

// ── Tool 1: finance_expense_create (HITL) ──

export interface FinanceExpenseCreateResponse {
  status: string;
  message: string;
  request_id?: string;
  description?: string;
  amount?: number;
  category?: string;
}

// ── Tool 2: finance_invoice_create (HITL) ──

export interface FinanceInvoiceCreateResponse {
  status: string;
  message: string;
  request_id?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  family_id?: string;
}

// ── Tool 3: finance_budget_check (AUTO) ──

export interface BudgetLineData {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  utilization_pct: number;
}

export interface FinanceBudgetCheckResponse {
  status: string;
  message: string;
  data?: {
    period: string;
    total_budgeted: number;
    total_spent: number;
    total_remaining: number;
    utilization_pct: number;
    lines: BudgetLineData[];
  };
  total_budgeted: number;
  total_spent: number;
  total_remaining: number;
  utilization_pct: number;
}

// ── Tool 4: finance_payment_process (HITL) ──

export interface FinancePaymentProcessResponse {
  status: string;
  message: string;
  request_id?: string;
  amount?: number;
  method?: string;
  family_id?: string;
}

// ── Tool 5: finance_report_generate (SEMI) ──

export interface FinanceReportGenerateResponse {
  status: string;
  message: string;
  data?: {
    report_type: string;
    period_start: string;
    period_end: string;
    total_income: number;
    total_expenses: number;
    net_result: number;
    expense_breakdown: Array<Record<string, unknown>>;
    income_breakdown: Array<Record<string, unknown>>;
    summary: string;
  };
  report_type?: string;
  period?: string;
}

// ── Tool 6: finance_account_status (AUTO) ──

export interface InvoiceData {
  id: string;
  family_id: string;
  family_name: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  due_date: string;
  paid_date: string;
  notes: string;
}

export interface FinanceAccountStatusResponse {
  status: string;
  message: string;
  data?: {
    family_id: string;
    family_name: string;
    total_invoiced: number;
    total_paid: number;
    balance_due: number;
    overdue_amount: number;
    overdue_count: number;
    last_payment_date: string;
    invoices: InvoiceData[];
  };
  balance_due?: number;
  overdue_amount?: number;
}

// ── Tool 7: finance_category_update (SEMI) ──

export interface FinanceCategoryUpdateResponse {
  status: string;
  message: string;
  category?: string;
  budget_amount?: number;
}

// ── Tool 8: generate_ai_analysis (AUTO) ──

export interface GenerateAiAnalysisResponse {
  status: string;
  message: string;
  data: AiFinancialReport;
}

// ── Bridge Mock: get_financial_summary (mock-only) ──

export interface GetFinancialSummaryResponse extends FinancialSummary {
  status: string;
}

// ── Tool 9: finance_scenario_simulate (AUTO — NEW AI) ──

export interface FinanceScenarioSimulateResponse {
  status: string;
  message: string;
  data: ScenarioSimulationData;
}

// ── Tool 10: finance_opportunities_scan (AUTO — NEW AI) ──

export interface FinanceOpportunitiesScanResponse {
  status: string;
  message: string;
  data: OpportunityScanData;
}

// ── Tool 11: finance_board_briefing (AUTO — NEW AI) ──

export interface FinanceBoardBriefingResponse {
  status: string;
  message: string;
  data: BoardBriefingData;
}
// ═══════════════════════════════════════════════════════════
// Fase 14 — 3 New Intelligence Feature Contracts (mock-only)
// Append to: src/shared/mocks/contracts.ts
//
// Tools: finance_member_profitability, finance_stress_test,
//        finance_seasonal_calendar
// All mock-only — no backend implementation yet.
// ═══════════════════════════════════════════════════════════

// ── Tool 12: finance_member_profitability (AUTO — mock-only) ──

export interface MemberProfitabilityFamily {
  family_id: string;
  family_name: string;
  tier: string;
  member_count: number;
  revenue_12m: number;
  cost_12m: number;
  margin_pct: number;
  trend_pct: number;
  ltv_estimate: number;
  churn_risk_score: number; // 0-100
  quadrant: "star" | "workhorse" | "potential" | "risk";
  top_revenue_source: string;
  last_activity_date: string;
  ai_insight: string;
}

export interface MemberProfitabilitySummary {
  total_families: number;
  avg_revenue: number;
  avg_margin: number;
  star_count: number;
  workhorse_count: number;
  potential_count: number;
  risk_count: number;
  revenue_concentration_top10_pct: number;
}

export interface MemberProfitabilityData {
  families: MemberProfitabilityFamily[];
  summary: MemberProfitabilitySummary;
  quadrant_strategies: {
    star: string;
    workhorse: string;
    potential: string;
    risk: string;
  };
}

export interface FinanceMemberProfitabilityResponse {
  status: string;
  message: string;
  data: MemberProfitabilityData;
}

// ── Tool 13: finance_stress_test (AUTO — mock-only) ──

export interface StressTestMetrics {
  p_positive_cashflow_12m: number; // 0-1
  p_health_above_60: number;       // 0-1
  max_probable_loss_p95: number;   // colones (negative)
  min_reserve_recommended: number; // colones
  critical_month: string;
}

export interface FanChartPoint {
  month: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface DistributionSummary {
  mean_net_12m: number;
  std_dev: number;
  skewness: number;
  worst_case: number;
  best_case: number;
}

export interface StressTestData {
  scenario_name: string;
  iterations: number;
  metrics: StressTestMetrics;
  fan_chart: FanChartPoint[];
  distribution_summary: DistributionSummary;
  assumptions: string[];
  ai_commentary: string;
}

export interface FinanceStressTestResponse {
  status: string;
  message: string;
  data: StressTestData;
}

// ── Tool 14: finance_seasonal_calendar (AUTO — mock-only) ──

export interface SeasonalEvent {
  name: string;
  type: string;
  impact: string;
}

export interface SeasonalMaintenance {
  item: string;
  impact: string;
}

export interface SeasonalObligation {
  item: string;
  amount: number;
}

export interface SeasonalAction {
  action: string;
  category: "cost_saving" | "revenue_opportunity" | "cash_management" | "planning";
  estimated_impact: number;
  deadline: string;
  priority: "high" | "medium" | "low";
}

export interface SeasonalMonth {
  month: number;
  label: string;
  season: "high" | "low" | "transition";
  revenue_factor: number;
  projected_revenue: number;
  projected_expenses: number;
  projected_net: number;
  cash_reserve_required: number;
  events: SeasonalEvent[];
  maintenance: SeasonalMaintenance[];
  obligations: SeasonalObligation[];
  recommended_actions: SeasonalAction[];
}

export interface SeasonalAnnualSummary {
  high_season_revenue: number;
  low_season_revenue: number;
  seasonality_gap_pct: number;
  total_obligations: number;
  critical_cash_months: number[];
  recommended_reserve: number;
}

export interface SeasonalCalendarData {
  year: number;
  months: SeasonalMonth[];
  annual_summary: SeasonalAnnualSummary;
}

export interface FinanceSeasonalCalendarResponse {
  status: string;
  message: string;
  data: SeasonalCalendarData;
}
// ── Tool: finance_narrative_generate (SEMI — mock-only) ──
// Fase 14b — Narrative Engine

export interface NarrativeInsight {
  id: string;
  title: string;
  body: string;
  type: "positive" | "negative" | "neutral" | "alert";
  impact_estimate: number; // colones CR
  confidence: number; // 0-100
  data_source: string;
}

export interface NarrativeRecommendation {
  id: string;
  title: string;
  description: string;
  rationale: string;
  estimated_impact: number; // colones CR
  timeframe: string;
  priority: "high" | "medium" | "low";
  category: "revenue" | "cost" | "retention" | "operations";
  effort: "low" | "medium" | "high";
}

export interface NarrativeComparison {
  metric: string;
  current: number;
  previous: number;
  budget: number;
  yoy_change_pct: number;
  vs_budget_pct: number;
}

export interface NarrativeSection {
  id: string;
  title: string;
  content: string;
  type: "financial" | "membership" | "operations" | "risks" | "outlook";
}

export interface NarrativeRiskAlert {
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
  suggested_action: string;
  affected_area: string;
  deadline: string;
}

export interface NarrativeGenerateData {
  period: string;
  audience: string;
  detail_level: string;
  generated_at: string;
  executive_summary: string;
  sections: NarrativeSection[];
  insights: NarrativeInsight[];
  recommendations: NarrativeRecommendation[];
  comparisons: NarrativeComparison[];
  risk_alerts: NarrativeRiskAlert[];
  narrative_confidence: number;
  word_count: number;
  estimated_read_time_minutes: number;
}

export interface FinanceNarrativeGenerateResponse {
  status: string;
  message: string;
  data: NarrativeGenerateData;
}

// ── Tool: export_report (HITL — mock-only) ──
// Fase 14b — Export Intelligence

export interface ExportSectionIncluded {
  section_id: string;
  title: string;
  pages: number;
}

export interface ExportReportData {
  export_id: string;
  format: "pdf" | "excel" | "csv";
  report_type: string;
  file_name: string;
  file_size_bytes: number;
  pages: number;
  generated_at: string;
  expires_at: string;
  download_url: string;
  status: "ready" | "generating" | "error";
  includes_charts: boolean;
  includes_narrative: boolean;
  watermark: string | null;
  sections_included: ExportSectionIncluded[];
}

export interface ExportReportResponse {
  status: string;
  message: string;
  data: ExportReportData;
}
// ── Tool: members_health_score (AUTO — mock-only) ──
// Fase 14c — Member Intelligence Hub — Health Score
// ═══════════════════════════════════════════════════════════
// MEMBERS INTELLIGENCE HUB — 4 tools (Patrón C → A)
// Fase 14c — mock-only, no backend yet
// ═══════════════════════════════════════════════════════════

export interface members_health_score_Contract extends BaseToolResponse {
  data: MembersHealthScoreData;
}

export interface members_segmentation_Contract extends BaseToolResponse {
  data: MembersSegmentationData;
}

export interface members_lifetime_value_Contract extends BaseToolResponse {
  data: MembersLifetimeValueData;
}

export interface members_churn_prevention_Contract extends BaseToolResponse {
  data: MembersChurnPreventionData;
}

// ═══════════════════════════════════════════════════════════
// DECISION COCKPIT — 1 tool (Patrón C → A)
// Fase 14d — mock-only
// ═══════════════════════════════════════════════════════════

export interface finance_decision_simulate_Contract extends BaseToolResponse {
  data: FinanceDecisionSimulateData;
}

export interface communications_generate_personalized_Contract extends BaseToolResponse {
  data: CommunicationsGeneratePersonalizedData;
}

export interface communications_campaign_generate_Contract extends BaseToolResponse {
  data: CommunicationsCampaignGenerateData;
}

export interface communications_sentiment_analyze_Contract extends BaseToolResponse {
  data: CommunicationsSentimentAnalyzeData;
}


export interface HealthDimension {
  id: string;
  name: string;
  score: number;           // 0-100
  weight: number;          // porcentaje ponderación (30, 25, 20, 15, 10)
  previous_score: number;
  trend: "improving" | "stable" | "declining";
  color: string;           // hex para Recharts (data-driven, no hardcoded en JSX)
}

export interface FamilyHealthScore {
  family_id: string;
  family_name: string;
  tier: "Platinum" | "Gold" | "Silver";
  segment: string;
  overall_score: number;
  dimensions: HealthDimension[];
  weakest_dimension: string;
  score_delta_30d: number;
  score_delta_90d: number;
  risk_level: "critical" | "high" | "medium" | "low" | "healthy";
  suggested_action: string;
  last_activity_days_ago: number;
}

export interface HealthScoreDistribution {
  range: string;           // "0-20", "20-40", etc.
  count: number;
  pct: number;
  color: string;
}

export interface HealthScoreTrendPoint {
  month: string;           // "2025-01"
  avg_score: number;
  min_score: number;
  max_score: number;
}

export interface HealthFactorImportance {
  factor: string;
  weight_pct: number;
  variance_explained_pct: number;
  description: string;
}

export interface MembersHealthScoreData {
  club_overall_score: number;
  club_previous_score: number;
  club_trend: "improving" | "stable" | "declining";
  dimensions: HealthDimension[];
  distribution: HealthScoreDistribution[];
  trend_12m: HealthScoreTrendPoint[];
  at_risk_families: FamilyHealthScore[];
  factor_importance: HealthFactorImportance[];
  total_families: number;
  families_critical: number;
  families_healthy: number;
  families_improving: number;
  generated_at: string;
}


// ── Tool: members_segmentation (AUTO — mock-only) ──
// Fase 14c — Member Intelligence Hub — Micro-Segmentation

export interface MicroMemberSegment {
  id: string;
  name: string;
  icon: string;
  color: string;           // hex
  family_count: number;
  pct_of_total: number;
  avg_monthly_spend: number;
  avg_visits_per_month: number;
  avg_spend_per_visit: number;
  trend: "growing" | "stable" | "shrinking";
  trend_pct: number;
  peak_hours: string;
  preferred_activities: string[];
  communication_preference: "email" | "whatsapp" | "phone" | "in_person";
  churn_risk_pct: number;
}

export interface SegmentPersona {
  segment_id: string;
  persona_name: string;
  description: string;
  typical_family: string;
  motivations: string[];
  pain_points: string[];
  best_channel: string;
  best_time: string;
  avg_lifetime_years: number;
  nps_score: number;
}

export interface SegmentMigration {
  from_segment: string;
  to_segment: string;
  family_count: number;
  period: string;
  direction: "positive" | "negative" | "neutral";
}

export interface SegmentRevenueBreakdown {
  segment_id: string;
  segment_name: string;
  color: string;
  fb_revenue: number;
  activities_revenue: number;
  events_revenue: number;
  other_revenue: number;
  total_revenue: number;
  revenue_pct: number;
}

export interface CampaignReadiness {
  segment_id: string;
  segment_name: string;
  email_open_rate_pct: number;
  whatsapp_read_rate_pct: number;
  response_rate_pct: number;
  best_channel: string;
  readiness_score: number; // 0-100
}

export interface MembersSegmentationData {
  segments: MicroMemberSegment[];
  personas: SegmentPersona[];
  migrations: SegmentMigration[];
  revenue_by_segment: SegmentRevenueBreakdown[];
  campaign_readiness: CampaignReadiness[];
  segment_stability: Record<string, number>; // segment_id → stability index 0-100
  total_families: number;
  generated_at: string;
}


// ── Tool: members_lifetime_value (AUTO — mock-only) ──
// Fase 14c — Member Intelligence Hub — Predictive LTV

export interface FamilyLTV {
  family_id: string;
  family_name: string;
  tier: "Platinum" | "Gold" | "Silver";
  segment: string;
  ltv_current: number;
  ltv_p10: number;
  ltv_p50: number;
  ltv_p90: number;
  monthly_margin: number;
  retention_prob_12m: number;  // 0-1
  retention_prob_36m: number;  // 0-1
  churn_risk_pct: number;
  upgrade_prob_pct: number;
  referral_rate: number;
  payback_months: number;
}

export interface LTVDistribution {
  range: string;
  count: number;
  pct: number;
  total_value: number;
}

export interface LTVSensitivityFactor {
  factor: string;
  base_change_pct: number;
  ltv_impact_pct: number;
  direction: "positive" | "negative";
  description: string;
}

export interface MonteCarloDataPoint {
  month: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface LTVByTier {
  tier: string;
  color: string;
  avg_ltv: number;
  median_ltv: number;
  count: number;
  total_ltv: number;
}

export interface LTVPaybackPoint {
  month: number;
  cumulative_margin: number;
  intervention_cost: number;
  net_position: number;
}

export interface MembersLifetimeValueData {
  avg_ltv: number;
  median_ltv: number;
  total_portfolio_ltv: number;
  ltv_growth_rate_pct: number;
  families: FamilyLTV[];
  distribution: LTVDistribution[];
  sensitivity: LTVSensitivityFactor[];
  monte_carlo: MonteCarloDataPoint[];
  by_tier: LTVByTier[];
  payback: LTVPaybackPoint[];
  inflation_rate_pct: number;
  discount_rate_pct: number;
  generated_at: string;
}


// ── Tool: members_churn_prevention (SEMI on-demand — mock-only) ──
// Fase 14c — Member Intelligence Hub — Churn Prevention

export interface ChurnRiskFamily {
  family_id: string;
  family_name: string;
  tier: "Platinum" | "Gold" | "Silver";
  segment: string;
  churn_probability_pct: number;
  ltv_at_risk: number;
  days_since_last_visit: number;
  primary_risk_factor: string;
  secondary_risk_factors: string[];
  recommended_intervention: string;
  intervention_cost: number;
  intervention_roi: number;
  cascade_risk_family_ids: string[];
}

export interface ChurnIntervention {
  id: string;
  type: string;
  name: string;
  description: string;
  avg_cost: number;
  success_rate_pct: number;
  avg_roi: number;
  best_for_segments: string[];
  best_for_risk_factors: string[];
  timeline_days: number;
  effort: "low" | "medium" | "high";
}

export interface ChurnRiskFactor {
  factor: string;
  affected_families: number;
  pct_of_at_risk: number;
  avg_impact_on_score: number;
}

export interface HistoricalSave {
  family_id: string;
  family_name: string;
  intervention_type: string;
  date: string;
  outcome: "saved" | "lost" | "pending";
  ltv_preserved: number;
  cost: number;
  roi: number | null;
}

export interface MembersChurnPreventionData {
  total_at_risk: number;
  total_ltv_at_risk: number;
  active_interventions: number;
  historical_success_rate_pct: number;
  top_families: ChurnRiskFamily[];
  interventions: ChurnIntervention[];
  risk_factors: ChurnRiskFactor[];
  historical_saves: HistoricalSave[];
  cost_of_inaction: number;
  recommended_budget: number;
  generated_at: string;
}

// ── Tool: finance_decision_simulate (AUTO on-demand — mock-only) ──
// Fase 14d — Decision Cockpit — Simulación de decisiones estratégicas

export interface DecisionScenario {
  name: string; // "Optimista" | "Base" | "Pesimista"
  probability_pct: number;
  revenue_delta: number;
  membership_delta: number;
  cash_flow_delta: number;
  implementation_cost: number;
  roi_pct: number;
  risk_level: "bajo" | "medio" | "alto" | "crítico";
  risk_factors: string[];
  timeline_months: number;
  key_assumptions: string[];
}

export interface DecisionHistoricalPrecedent {
  decision: string;
  date: string;
  chosen_scenario: string;
  actual_outcome: string;
  revenue_impact: number;
  lessons_learned: string;
}

export interface DecisionAIRecommendation {
  recommended_scenario: string;
  confidence_pct: number;
  reasoning: string;
  critical_success_factors: string[];
  watch_items: string[];
  suggested_kpis: string[];
}

export interface FinanceDecisionSimulateData {
  decision_summary: string;
  context_analysis: string;
  scenarios: DecisionScenario[];
  recommendation: DecisionAIRecommendation;
  historical_precedents: DecisionHistoricalPrecedent[];
  sensitivity_notes: string[];
  generated_at: string;
}

// ── Tool: communications_generate_personalized (SEMI on-demand — mock-only) ──
// Fase 14d — Comunicación Generativa — Personalización por familia

export interface PersonalizedContent {
  channel: string;
  subject: string;
  body: string;
  preview_text: string;
  cta_text: string;
  cta_action: string;
}

export interface ToneAnalysis {
  detected_tone: string;
  formality_score: number;   // 0-100
  warmth_score: number;      // 0-100
  urgency_score: number;     // 0-100
  personalization_score: number; // 0-100
}

export interface PersonalizationDetail {
  field: string;
  value: string;
  impact_on_engagement: string;
}

export interface PastCommunicationPerformance {
  campaign_name: string;
  date: string;
  channel: string;
  open_rate_pct: number | null;
  response_rate_pct: number | null;
  sentiment: "positivo" | "neutral" | "negativo";
}

export interface CommunicationsGeneratePersonalizedData {
  family_id: string;
  family_name: string;
  channel: string;
  occasion: string;
  content: PersonalizedContent;
  tone_analysis: ToneAnalysis;
  personalization_details: PersonalizationDetail[];
  suggested_send_time: string;
  past_communication_performance: PastCommunicationPerformance[];
  alternative_versions: PersonalizedContent[];
  generated_at: string;
}


// ── Tool: communications_campaign_generate (SEMI on-demand — mock-only) ──
// Fase 14d — Comunicación Generativa — Generación de campañas

export interface CampaignVariant {
  variant_id: string;
  name: string;
  subject: string;
  body: string;
  cta_text: string;
  hypothesis: string;
}

export interface CampaignAudienceBreakdown {
  total: number;
  by_tier: Record<string, number>;
  by_segment: Record<string, number>;
  by_engagement_level: Record<string, number>;
  opt_out_count: number;
  estimated_deliverable: number;
}

export interface CampaignExpectedMetrics {
  estimated_open_rate_pct: number;
  estimated_click_rate_pct: number;
  estimated_conversion_pct: number;
  estimated_unsubscribe_pct: number;
  benchmark_comparison: string;
}

export interface CampaignChannelStrategy {
  primary_channel: string;
  secondary_channel: string;
  timing: string;
  frequency: string;
  escalation_rule: string;
}

export interface CampaignSchedule {
  draft_by: string;
  review_by: string;
  launch_date: string;
  end_date: string;
}

export interface CommunicationsCampaignGenerateData {
  campaign_name: string;
  objective: string;
  target_segment: string;
  audience: CampaignAudienceBreakdown;
  variants: CampaignVariant[];
  channel_strategy: CampaignChannelStrategy;
  expected_metrics: CampaignExpectedMetrics;
  schedule: CampaignSchedule;
  compliance_notes: string[];
  generated_at: string;
}

// ── Tool: communications_sentiment_analyze (AUTO — mock-only) ──
// Fase 14d — Sentiment Monitor — Análisis de sentimiento

export interface SentimentTrendPoint {
  period: string;
  overall_score: number;    // 0-100
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
  volume: number;
}

export interface ChannelSentiment {
  channel: string;
  score: number;
  volume: number;
  trend: "improving" | "stable" | "declining";
  top_positive_topic: string;
  top_negative_topic: string;
}

export interface SentimentTopic {
  topic: string;
  mentions: number;
  sentiment_score: number;  // 0-100
  trend: "improving" | "stable" | "declining";
  representative_quotes: string[];
}

export interface SentimentAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  affected_families: number;
  recommended_action: string;
  detected_at: string;
}

export interface SentimentKeywordInsight {
  keyword: string;
  frequency: number;
  sentiment: "positive" | "neutral" | "negative";
  associated_topics: string[];
}

export interface SentimentComparison {
  score_delta: number;
  period: string;
  notable_changes: string[];
}

export interface CommunicationsSentimentAnalyzeData {
  overall_score: number;
  overall_trend: "improving" | "stable" | "declining";
  total_communications_analyzed: number;
  trend_timeline: SentimentTrendPoint[];
  channel_breakdown: ChannelSentiment[];
  topics: SentimentTopic[];
  alerts: SentimentAlert[];
  top_positive_keywords: SentimentKeywordInsight[];
  top_negative_keywords: SentimentKeywordInsight[];
  comparison_with_previous: SentimentComparison;
  generated_at: string;
}

// EventCreateMockResponse → event_create_Contract: definido en sección Events Module (F18)

// ── Tools: families server — additional mocks (Fase 17) ──
// create_family (HITL), update_family (HITL), get_activity_history (AUTO),
// get_social_graph enriched (AUTO), AI intelligence (on-demand)
// ═══════════════════════════════════════════════════════════
// FAMILY PROFILE — 17 tools (Patrón C → A migration)
// Backend: agents/family_profile.py
// Auditado F29 — 17 tools, 0 HITL, 13 AUTO, 4 SEMI, 9 intel
// Shapes derivados de Patrón B/C existentes + F29 contracts
// ═══════════════════════════════════════════════════════════

// ── Sub-types ──

export interface FamilyDetailData {
  family: import("@/features/families/types").Family;
  recentActivity: import("@/features/families/types").ActivityRecord[];
  financialSummary: import("@/features/families/types").FinancialSummary;
  socialConnections: import("@/features/families/types").SocialConnection[];
}

export interface EnrichedSocialConnection {
  connected_family_id: string;
  connected_family_name: string;
  strength: number;
  relationship: string;
  shared_activities: string[];
  shared_events: number;
  last_interaction: string | null;
  connected_tier: string | null;
  connected_engagement: number | null;
  ai_insight: string | null;
}

export interface SocialClusterData {
  id: string;
  name: string;
  family_ids: string[];
  common_interest: string;
  avg_strength: number;
}

export interface SuggestedConnectionData {
  family_id: string;
  family_name: string;
  tier: string;
  match_score: number;
  reason: string;
}

export interface ActivityRecommendation {
  id: string;
  activity_name: string;
  category: string;
  match_score: number;
  reason: string;
  target_members: string[];
  estimated_engagement: number;
  scheduling_suggestion: string;
}

export interface SocialMatchSuggestion {
  family_id: string;
  family_name: string;
  tier: string;
  match_score: number;
  common_interests: string[];
  shared_demographics: string[];
  reason: string;
  suggested_activity: string;
}

export interface EngagementPlanAction {
  id: string;
  action: string;
  category: "communication" | "activity" | "recognition" | "social" | "financial";
  priority: "high" | "medium" | "low";
  timing: string;
  expected_impact: string;
  assigned_to: string;
}

// ── Tool 1: list_families (AUTO) ──

export interface list_families_Contract extends BaseToolResponse {
  data: import("@/features/families/types").FamilyListResponse;
}

// ── Tool 2: get_family (AUTO) ──

export interface get_family_Contract extends BaseToolResponse {
  data: FamilyDetailData;
}

// ── Tool 3: family_create (HITL) ──

export interface family_create_Contract extends BaseToolResponse {
  data: {
    id: string;
    name: string;
    tier: string;
    status: string;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 4: family_update_profile (HITL) ──
// Ya definido en sección F29 — mantener family_update_profile_Contract existente

// ── Tool 5: get_activity_history (AUTO) ──

export interface get_activity_history_Contract extends BaseToolResponse {
  data: {
    activities: import("@/features/families/types").ActivityRecord[];
    total: number;
    period: { from: string; to: string };
  };
}

// ── Tool 6: get_social_graph_enriched (AUTO) ──
// Ya definido en sección F29 — mantener family_social_graph_enriched_Contract existente

// ── Tool 7: family_lifecycle_analysis (AUTO — intel) ──
// Ya definido en sección F29 — mantener family_lifecycle_analysis_Contract existente

// ── Tool 8: family_360_insight (SEMI — intel) ──
// Ya definido en sección F29 — mantener family_360_insight_Contract existente

// ── Tool 9: family_milestone_tracker (AUTO — intel) ──
// Ya definido en sección F29 — mantener family_milestone_tracker_Contract existente

// ── Tool 10: identify_social_clusters (AUTO — intel) ──
// Ya definido en sección F29 — mantener identify_social_clusters_Contract existente

// ── Tool 11: family_churn_prediction (AUTO — intel, on-demand) ──

export interface family_churn_prediction_Contract extends BaseToolResponse {
  data: {
    risk_score: number;
    risk_level: "low" | "medium" | "high" | "critical";
    factors: Array<{
      name: string;
      impact: number;
      direction: "positive" | "negative";
      detail: string;
    }>;
    recommendation: string;
    confidence: number;
  };
}

// ── Tool 12: family_activity_recommendations (AUTO — intel, on-demand) ──

export interface family_activity_recommendations_Contract extends BaseToolResponse {
  data: {
    recommendations: ActivityRecommendation[];
    based_on: {
      interests: string[];
      demographics: string[];
      history: string[];
    };
  };
}

// ── Tool 13: family_social_match (AUTO — intel, on-demand) ──

export interface family_social_match_Contract extends BaseToolResponse {
  data: {
    suggestions: SocialMatchSuggestion[];
  };
}

// ── Tool 14: family_engagement_plan (SEMI — intel, on-demand) ──

export interface family_engagement_plan_Contract extends BaseToolResponse {
  data: {
    current_score: number;
    target_score: number;
    timeframe: string;
    actions: EngagementPlanAction[];
    ai_summary: string;
    estimated_roi: string;
  };
}

// ── Tool 15: family_set_preferences (SEMI) ──

export interface family_set_preferences_Contract extends BaseToolResponse {
  data: {
    preferences: {
      preferred_language: string;
      notification_channels: string[];
      interests: string[];
      privacy_level: string;
      dietary_notes: string | null;
    };
  };
}

// ── Tools 16-17: generate_family_recommendations + personalize_communication ──
// Ya definidos en Proactive Recommendation (Bloque 7)
// Se consumen desde ahí — NO redefinir


// ═══════════════════════════════════════════════════════════
// ── Events Module (Fase 18) ──
// ═══════════════════════════════════════════════════════════

// ── Tool: event_get_calendar (AUTO) ──

export interface EventCalendarBrief {
  id: string;
  title: string;
  category: string;
  status: string;
  date_start: string;
  date_end: string;
  location: string;
  current_attendance: number;
  max_capacity: number;
  pricing_model: string;
}

export interface EventCalendarDayData {
  date: string;
  events: EventCalendarBrief[];
  total_events: number;
  has_conflicts: boolean;
}


// ── Tool: event_create (HITL) ──

export interface event_create_Contract extends BaseToolResponse {
  request_id: string;
  event_title: string;
  event_date: string;
}
// ═══════════════════════════════════════════════════════════
// EVENTS — Contracts faltantes (alineación F30b)
// Backend: agents/event_orchestrator.py (16 tools, auditado F19)
// ═══════════════════════════════════════════════════════════

// ── Tool: event_update (HITL) ──
// ⚠️ Si EventUpdateMockResponse ya existe con Patrón C, migrar a esto

export interface event_update_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    updated_by: string;
    updated_at: string;
    request_id?: string;
  };
  request_id?: string;
}

// ═══════════════════════════════════════════════════════════
// EVENTS MODULE — 16 tools (Patrón C → A migration)
// Backend: agents/event_orchestrator.py
// Auditado en F19 — 16 tools, 3 HITL, 10 AUTO, 3 SEMI
// ═══════════════════════════════════════════════════════════

// ── Sub-types (mantener — son data shapes, no responses) ──

export interface EventCalendarBrief {
  id: string;
  title: string;
  category: string;
  status: string;
  date_start: string;
  date_end: string;
  location: string;
  current_attendance: number;
  max_capacity: number;
  pricing_model: string;
}

export interface EventCalendarDayData {
  date: string;
  events: EventCalendarBrief[];
  total_events: number;
  has_conflicts: boolean;
}

export interface ProgramItemData {
  id: string;
  event_id: string;
  title: string;
  time_start: string;
  time_end: string;
  description: string;
  location: string;
  responsible: string;
  notes: string;
  order: number;
}

export interface RsvpData {
  id: string;
  event_id: string;
  family_id: string;
  family_name: string;
  member_ids: string[];
  status: string;
  guests_count: number;
  dietary_restrictions: string;
  notes: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
}

export interface VendorData {
  id: string;
  event_id: string;
  name: string;
  service_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  quoted_cost: number;
  final_cost: number | null;
  contract_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Tool 1: event_list (AUTO) ──

export interface event_list_Contract extends BaseToolResponse {
  data: import("@/features/events/types").EventListResponse;
}

// ── Tool 2: event_detail (AUTO) ──

export interface event_detail_Contract extends BaseToolResponse {
  data: import("@/features/events/types").EventResponse;
}

// ── Tool 3: event_create (HITL) ──
// Ya migrado en Bloque 0 — mantener event_create_Contract existente

// ── Tool 4: event_update (HITL) ──

export interface event_update_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    updated_by: string;
    updated_at: string;
    request_id?: string;
  };
}

// ── Tool 5: event_get_calendar (AUTO) ──

export interface event_get_calendar_Contract extends BaseToolResponse {
  data: {
    calendar: EventCalendarDayData[];
    total_events: number;
    conflict_days: number;
  };
}

// ── Tool 6: event_build_program (SEMI) ──

export interface event_build_program_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    program_items: ProgramItemData[];
    total_items: number;
  };
}

// ── Tool 7: event_manage_rsvps (AUTO — conditional HITL bulk≥10) ──

export interface event_manage_rsvps_Contract extends BaseToolResponse {
  data: {
    rsvps: RsvpData[];
    total: number;
    approval_escalated: boolean;
    escalation_reason: string | null;
  };
  request_id?: string;
}

// ── Tool 8: event_coordinate_vendors (HITL — list is AUTO) ──

export interface event_coordinate_vendors_Contract extends BaseToolResponse {
  data: {
    vendors: VendorData[];
  };
  request_id?: string;
}

// ── Tool 9: event_manage_capacity (AUTO) ──

export interface event_manage_capacity_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    max_capacity: number;
    current_attendance: number;
    waitlist_count: number;
    available_spots: number;
    occupancy_pct: number;
    is_full: boolean;
    is_waitlist_active: boolean;
  };
}

// ── Tool 10: event_get_analytics (AUTO) ──

export interface event_get_analytics_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    total_rsvps: number;
    confirmed_attendance: number;
    declined_count: number;
    no_shows: number;
    waitlisted_count: number;
    attendance_rate: number;
    cancellation_rate: number;
    revenue: number;
    average_guests_per_family: number;
    age_distribution: Record<string, number>;
    peak_rsvp_date: string | null;
    days_until_event: number | null;
  };
}

// ── Tool 11: event_clone_template (SEMI) ──

export interface event_clone_template_Contract extends BaseToolResponse {
  data: {
    id: string;
    title: string;
    status: string;
    date_start: string;
    date_end: string;
    description: string;
    category: string;
    event_type: string;
    location: string;
    max_capacity: number;
    current_attendance: number;
    waitlist_count: number;
    pricing_model: string;
    price_per_person: number;
    requires_rsvp: boolean;
    is_members_only: boolean;
    allow_guests: boolean;
    max_guests_per_family: number;
    tags: string[];
    created_by: string;
  };
}

// ── Tool 12: event_generate_report (SEMI — financial→HITL) ──

export interface event_generate_report_Contract extends BaseToolResponse {
  data: {
    report_type: string;
    period_start: string;
    period_end: string;
    total_events: number;
    completed_events: number;
    cancelled_events: number;
    upcoming_events: number;
    total_attendance: number;
    average_attendance: number;
    total_revenue: number;
    top_categories: Array<{ category: string; count: number }>;
    top_events: EventCalendarBrief[];
    recommendations: string[];
    generated_at: string;
  };
  request_id?: string;
}

// ── Tool 13: event_recommend_optimization (AUTO — AI on-demand) ──

export interface event_recommend_optimization_Contract extends BaseToolResponse {
  data: {
    recommendations: Array<{
      id: string;
      area: "pricing" | "timing" | "capacity" | "promotion" | "venue";
      suggestion: string;
      estimated_impact: string;
      priority: "high" | "medium" | "low";
      effort: "low" | "medium" | "high";
    }>;
    overall_score: number;
    ai_summary: string;
  };
}

// ── Tool 14: event_conflict_detection (AUTO — AI on-demand) ──

export interface event_conflict_detection_Contract extends BaseToolResponse {
  data: {
    conflicts: Array<{
      event_id: string;
      event_title: string;
      conflict_type: "time_overlap" | "resource_overlap" | "audience_overlap";
      severity: "high" | "medium" | "low";
      detail: string;
      resolution_suggestion: string;
    }>;
    total_conflicts: number;
    risk_level: "low" | "medium" | "high";
    ai_summary: string;
  };
}

// ── Tool 15: event_engagement_boost (SEMI — AI on-demand) ──

export interface event_engagement_boost_Contract extends BaseToolResponse {
  data: {
    strategies: Array<{
      id: string;
      channel: "email" | "push" | "whatsapp" | "in_app" | "phone";
      action: string;
      target_audience: string;
      timing: string;
      expected_rsvp_increase: string;
      priority: "high" | "medium" | "low";
    }>;
    current_engagement_score: number;
    projected_engagement_score: number;
    ai_summary: string;
    estimated_roi: string;
  };
}

// ── Tool 16: event_cancel (HITL) ──
// Ya creado en Bloque 11 — mantener event_cancel_Contract existente


// ── Tool: event_cancel (HITL) ──
// ⚠️ Shape estimado — verificar si existe en backend

export interface event_cancel_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    event_title: string;
    cancellation_reason: string;
    affected_rsvps: number;
    notifications_sent: number;
    refund_required: boolean;
    cancelled_by: string;
    cancelled_at: string;
  };
  request_id?: string;
}

// ── Tool: event_build_program (SEMI) ──

export interface ProgramItemData {
  id: string;
  event_id: string;
  title: string;
  time_start: string;
  time_end: string;
  description: string;
  location: string;
  responsible: string;
  notes: string;
  order: number;
}


// ── Tool: event_manage_rsvps (AUTO — conditional HITL bulk≥10) ──

export interface RsvpData {
  id: string;
  event_id: string;
  family_id: string;
  family_name: string;
  member_ids: string[];
  status: string;
  guests_count: number;
  dietary_restrictions: string;
  notes: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
}


// ── Tool: event_coordinate_vendors (HITL — list is AUTO) ──

export interface VendorData {
  id: string;
  event_id: string;
  name: string;
  service_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  quoted_cost: number;
  final_cost: number | null;
  contract_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}


// ── Tool: event_manage_capacity (AUTO) ──

export interface EventManageCapacityMockResponse {
  status: string;
  message: string;
  data: {
    event_id: string;
    event_title: string;
    max_capacity: number;
    current_attendance: number;
    waitlist_count: number;
    available_spots: number;
    occupancy_pct: number;
    is_full: boolean;
    is_waitlist_active: boolean;
  };
}


// ── Executive Dashboard: get_executive_summary ──────────────
// ExecutiveSummaryData, ExecutiveMembershipKPI, ExecutiveFinancialKPI,
// ExecutiveOperationalKPI, ExecutiveEngagementKPI, ExecutiveSummaryResponse
// → YA RE-EXPORTADOS desde features/dashboard/types.ts (ver sección re-exports arriba)

// ── Executive Dashboard: get_operational_pulse ──────────────
// OperationalPulseResponse → YA RE-EXPORTADO desde features/dashboard/types.ts
// OperationalPulseData → YA RE-EXPORTADO como OperationalKPI en features/dashboard/types.ts
// ── Compliance: compliance_alert_list ───────────────────────

export interface ComplianceAlert {
  id: string;
  title: string;
  description: string;
  area: string;
  risk_level: string;
  status: string;
  due_date: string;
  responsible: string;
  created_at: string;
}

export interface ComplianceAlertListResponse {
  status: string;
  message: string;
  data: ComplianceAlert[];
  total: number;
  open_count: number;
}


// ── Executive Dashboard: detect_anomalies ───────────────────

export interface AnomalyContextEntry {
  key: string;
  value: number | string;
}

export interface AnomalyItem {
  id: string;
  domain: string;
  severity: string;
  title: string;
  description: string;
  context: Record<string, number | string>;
  suggested_action: string;
}


// ── Compliance: compliance_report_generate ──────────────────

export interface ComplianceReportAreaSummary {
  area: string;
  compliant: number;
  warnings: number;
  non_compliant: number;
  pending: number;
  score_pct: number;
}

export interface ComplianceReportItem {
  id: string;
  status: string;
  requirement: string;
  area: string;
  responsible: string;
  next_due_date: string;
  regulation_reference: string;
  notes?: string;
}

export interface ComplianceReportRiskItem {
  id: string;
  requirement: string;
  area: string;
  risk_level: string;
  days_until_deadline: number;
  potential_fine_crc: number;
  remediation_steps: string[];
}

export interface ComplianceReportData {
  overall_score: number;
  overall_status: string;
  overall_score_pct: number;
  summary: string;
  last_full_audit: string;
  next_full_audit: string;
  total_items: number;
  area_summaries: ComplianceReportAreaSummary[];
  items: ComplianceReportItem[];
  at_risk_items: ComplianceReportRiskItem[];
  ai_summary: string;
}

export interface ComplianceReportResponse {
  status: string;
  message: string;
  data: ComplianceReportData;
  overall_score: number;
}

// ═══════════════════════════════════════════════════════════
// COMPLIANCE AGENT — 7 tools (5 nuevos + 2 existentes)
// Backend: agents/compliance.py
// ⚠️ Los 5 contracts nuevos están basados en la auditoría F15ext.
// Shapes marcados como estimados — VERIFICAR contra backend real.
// ═══════════════════════════════════════════════════════════

// ── Tool 1: manage_compliance_requirements (AUTO — CRUD) ──
// ⚠️ Shape estimado

export interface manage_compliance_requirements_Contract extends BaseToolResponse {
  data: {
    requirement_id: string;
    title: string;
    description: string;
    area: string;
    regulation_reference: string;
    requirement_type: "regulatory" | "internal" | "safety" | "financial" | "environmental";
    status: "active" | "inactive" | "under_review";
    responsible: string;
    frequency: string;
    last_checked: string | null;
    next_due_date: string;
    compliance_status: "compliant" | "warning" | "non_compliant" | "pending";
    evidence_count: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
}

// ── Tool 2: schedule_compliance_audit (HITL) ──
// ⚠️ Shape estimado — único HITL del agent

export interface schedule_compliance_audit_Contract extends BaseToolResponse {
  data: {
    audit_id: string;
    audit_type: "internal" | "external" | "regulatory" | "spot_check";
    title: string;
    description: string;
    scheduled_date: string;
    estimated_duration_days: number;
    areas: string[];
    auditor: string;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    checklist_items: number;
    findings_count: number | null;
    overall_result: string | null;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 3: track_corrective_actions (AUTO — CRUD) ──
// ⚠️ Shape estimado

export interface track_corrective_actions_Contract extends BaseToolResponse {
  data: {
    action_id: string;
    finding_id: string;
    requirement_id: string;
    title: string;
    description: string;
    severity: "critical" | "major" | "minor";
    responsible: string;
    due_date: string;
    status: "open" | "in_progress" | "completed" | "overdue" | "verified";
    progress_pct: number;
    evidence_count: number;
    verification_date: string | null;
    verified_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
}

// ── Tool 4: get_compliance_status (AUTO — data) ──
// Overall compliance dashboard data
// ⚠️ Shape estimado

export interface get_compliance_status_Contract extends BaseToolResponse {
  data: {
    overall_score: number;
    overall_status: string;
    total_requirements: number;
    compliant_count: number;
    warning_count: number;
    non_compliant_count: number;
    pending_count: number;
    by_area: Array<{
      area: string;
      score_pct: number;
      requirements: number;
      compliant: number;
      warnings: number;
      non_compliant: number;
    }>;
    upcoming_deadlines: Array<{
      requirement_id: string;
      title: string;
      area: string;
      due_date: string;
      days_remaining: number;
      responsible: string;
    }>;
    overdue_count: number;
    last_full_audit: string | null;
    next_full_audit: string | null;
  };
}

// ── Tool 5: get_compliance_risks (AUTO — intel) ──
// Risk assessment
// ⚠️ Shape estimado

export interface get_compliance_risks_Contract extends BaseToolResponse {
  data: {
    risks: Array<{
      id: string;
      requirement_id: string;
      title: string;
      area: string;
      risk_level: "critical" | "high" | "medium" | "low";
      probability: number;
      impact_description: string;
      potential_fine_crc: number;
      days_until_deadline: number;
      remediation_steps: string[];
      responsible: string;
      status: string;
    }>;
    total_risks: number;
    critical_count: number;
    estimated_exposure_crc: number;
    ai_summary: string;
  };
}

// ═══════════════════════════════════════════════════════════
// FACILITY MANAGEMENT AGENT — 7 tools (Phase B F30b)
// Backend: agents/facility_management_agent.py
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums (⚠️ valores estimados — VERIFICAR contra backend) ──

export const FACILITY_TYPES = [
  "pool", "gym", "tennis_court", "soccer_field", "basketball_court",
  "banquet_hall", "restaurant", "spa", "kids_area", "meeting_room",
  "outdoor_terrace", "garden", "parking", "other"
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_STATUSES = [
  "operational", "maintenance", "closed", "reserved", "limited_capacity"
] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const MAINTENANCE_TYPES = [
  "preventive", "corrective", "emergency", "cosmetic", "upgrade", "inspection"
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_PRIORITIES = [
  "critical", "high", "medium", "low"
] as const;
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];

export const MAINTENANCE_STATUSES = [
  "scheduled", "in_progress", "completed", "cancelled", "deferred", "overdue"
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const INSPECTION_RESULTS = [
  "pass", "fail", "conditional_pass", "needs_followup", "not_inspected"
] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const SETUP_STATUSES = [
  "pending", "in_progress", "completed", "cancelled", "modified"
] as const;
export type SetupStatus = (typeof SETUP_STATUSES)[number];

// ═══════════════════════════════════════════════════════════
// CULTURAL SOCIAL AGENT — 6 tools (Phase B F30b)
// Backend: agents/cultural_social_agent.py
// SIN FRONTEND — contracts + types desde cero
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums (⚠️ valores del backend auditado en F30) ──

export const CULTURAL_EVENT_TYPES = [
  "dinner", "gala", "mixer", "exhibition", "concert", "workshop", "festival"
] as const;
export type CulturalEventType = (typeof CULTURAL_EVENT_TYPES)[number];

export const CULTURAL_EVENT_STATUSES = [
  "planning", "confirmed", "in_progress", "completed", "cancelled"
] as const;
export type CulturalEventStatus = (typeof CULTURAL_EVENT_STATUSES)[number];

export const ENTERTAINMENT_TYPES = [
  "live_music", "dj", "band", "comedian", "magician", "dancers", "speaker"
] as const;
export type EntertainmentType = (typeof ENTERTAINMENT_TYPES)[number];

export const CULTURAL_CATEGORIES = [
  "music", "art", "theater", "dance", "cinema", "literature", "gastronomy"
] as const;
export type CulturalCategory = (typeof CULTURAL_CATEGORIES)[number];

// VenueType: domain-specific para Cultural Social
// Mapeo a FacilityType: restaurant_ballroom→banquet_hall, garden_terrace→outdoor_terrace,
// pool_area→pool, auditorium→meeting_room, art_gallery→other, vip_lounge→other
export const VENUE_TYPES = [
  "restaurant_ballroom", "garden_terrace", "pool_area",
  "auditorium", "art_gallery", "vip_lounge"
] as const;
export type VenueType = (typeof VENUE_TYPES)[number];

export const FORMALITY_LEVELS = [
  "casual", "smart_casual", "business", "formal", "black_tie"
] as const;
export type FormalityLevel = (typeof FORMALITY_LEVELS)[number];

export const EXHIBITION_STATUSES = [
  "setup", "open", "closing", "closed", "cancelled"
] as const;
export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number];

export const PERFORMANCE_STATUSES = [
  "scheduled", "soundcheck", "performing", "break", "encore", "completed"
] as const;
export type PerformanceStatus = (typeof PERFORMANCE_STATUSES)[number];

export const ARTIST_STATUSES = ["active", "inactive", "blacklisted"] as const;
export type ArtistStatus = (typeof ARTIST_STATUSES)[number];

// ── Shared sub-types ──

export interface CulturalEntertainmentAct {
  act_id: string;
  name: string;
  type: EntertainmentType;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: ArtistStatus;
  fee: number;
  technical_requirements: string | null;
  past_performances: number;
  rating: number | null;
}

export interface CulturalVenueBooking {
  venue: VenueType;
  facility_id: string | null;
  capacity: number;
  setup_requirements: string | null;
  cost: number;
  confirmed: boolean;
}

// ── Tool 1: organize_formal_gala (HITL) ──
// → Facilities (venue), → Finance (budget)

export interface organize_formal_gala_Contract extends BaseToolResponse {
  data: {
    gala_id: string;
    title: string;
    description: string;
    date: string;
    time_start: string;
    time_end: string;
    venue: CulturalVenueBooking;
    formality_level: FormalityLevel;
    target_attendance: number;
    current_rsvps: number;
    budget: number;
    estimated_cost: number;
    entertainment: CulturalEntertainmentAct[];
    catering: {
      menu_type: string;
      dietary_options: string[];
      cost_per_person: number;
    };
    dress_code: string;
    rsvp_deadline: string;
    status: CulturalEventStatus;
    created_by: string;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 2: manage_entertainment_acts (HITL/AUTO CRUD) ──
// → Events (actos como eventos)

export interface manage_entertainment_acts_Contract extends BaseToolResponse {
  data: {
    act_id: string;
    name: string;
    type: EntertainmentType;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    status: ArtistStatus;
    fee: number;
    technical_requirements: string | null;
    past_performances: number;
    rating: number | null;
    genres: string[];
    available_dates: string[];
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  request_id?: string;
}

// ── Tool 3: manage_cultural_program (HITL/AUTO CRUD) ──
// → Families (organizer), → Finance (budget)

export interface manage_cultural_program_Contract extends BaseToolResponse {
  data: {
    program_id: string;
    name: string;
    category: CulturalCategory;
    description: string;
    season: string;
    start_date: string;
    end_date: string;
    venue: VenueType;
    frequency: string;
    events_count: number;
    completed_events: number;
    total_attendance: number;
    avg_attendance: number;
    budget: number;
    spent: number;
    organizer_family_id: string | null;
    organizer_name: string | null;
    status: "active" | "paused" | "completed" | "cancelled";
    next_event_date: string | null;
    created_at: string;
    updated_at: string;
  };
  request_id?: string;
}

// ── Tool 4: manage_social_events (AUTO — CRUD) ──
// → Events, → Facilities

export interface manage_social_events_Contract extends BaseToolResponse {
  data: {
    event_id: string;
    title: string;
    description: string;
    event_type: CulturalEventType;
    status: CulturalEventStatus;
    date: string;
    time_start: string;
    time_end: string;
    venue: VenueType;
    capacity: number;
    current_attendance: number;
    waitlist_count: number;
    formality_level: FormalityLevel;
    is_members_only: boolean;
    allow_guests: boolean;
    max_guests_per_family: number;
    price_per_person: number;
    tags: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
  };
}

// ── Tool 5: manage_art_exhibitions (AUTO — CRUD) ──
// → Facilities (gallery space)

export interface manage_art_exhibitions_Contract extends BaseToolResponse {
  data: {
    exhibition_id: string;
    title: string;
    artist_name: string;
    category: CulturalCategory;
    description: string;
    venue: VenueType;
    status: ExhibitionStatus;
    start_date: string;
    end_date: string;
    opening_reception_date: string | null;
    pieces_count: number;
    pieces_sold: number;
    total_sales: number;
    curator_notes: string | null;
    visitor_count: number;
    avg_rating: number | null;
    images_count: number;
    created_at: string;
    updated_at: string;
  };
}

// ── Tool 6: get_cultural_calendar (AUTO — data+fusion) ──
// → Events (event_get_calendar — calendar fusion)

export interface CulturalCalendarEvent {
  event_id: string;
  title: string;
  event_type: CulturalEventType;
  category: CulturalCategory | null;
  status: CulturalEventStatus;
  date: string;
  time_start: string;
  time_end: string;
  venue: VenueType;
  venue_name: string;
  attendance: number;
  capacity: number;
  formality_level: FormalityLevel | null;
  is_open: boolean;
}

/** F31 Enhanced: calendar now includes programs + conflicts + summary */
export interface cultural_social_get_cultural_calendar_Contract extends BaseToolResponse {
  data: {
    calendar: Array<{
      title: string;
      type: 'event' | 'exhibition' | 'program';
      event_type?: string;
      category?: string;
      date: string;
      end_date?: string;
      start_time?: string;
      end_time?: string;
      venue: string;
      venue_type?: string;
      status: string;
      formality?: string;
      description: string;
      guest_count?: number;
      budget?: number;
      artist?: string;
      num_pieces?: number;
      opening_reception?: boolean;
      season?: string;
      enrollment?: string;
    }>;
    total_items: number;
    summary: {
      event: number;
      exhibition: number;
      program: number;
    };
    conflicts: Array<{
      date: string;
      venue: string;
      items: string[];
      count: number;
    }>;
    has_conflicts: boolean;
  };
}

// ═══ F31 — CULTURAL SOCIAL INTELLIGENCE (3 new tools) ═══

/** 9-dimension cultural analytics — feeds Advisor + Executive Dashboard */
export interface cultural_social_get_cultural_analytics_Contract extends BaseToolResponse {
  data: {
    category_performance: Array<{
      category: string;
      event_count: number;
      total_attendance: number;
      avg_attendance: number;
      total_budget: number;
      avg_budget_per_event: number;
      engagement_score: number;
    }>;
    venue_utilization: Array<{
      venue: string;
      venue_type: string;
      total_bookings: number;
      total_guests: number;
      avg_guests: number;
      total_budget: number;
      utilization_rate: number;
    }>;
    entertainment_roi: Array<{
      entertainment_type: string;
      total_acts: number;
      contracted: number;
      contracted_rate: number;
      total_cost: number;
      avg_cost: number;
      total_duration: number;
      cost_per_minute: number;
    }>;
    attendance_trend: string;
    attendance_trend_pct: number;
    avg_attendance_30d: number;
    total_events_30d: number;
    total_budget_planned: number;
    total_budget_spent: number;
    budget_utilization_pct: number;
    budget_variance_pct: number;
    seasonal_patterns: Array<{
      season: string;
      program_count: number;
      total_budget: number;
      total_participants: number;
      max_participants: number;
      enrollment_rate: number;
      top_category: string;
    }>;
    current_season: string;
    total_programs: number;
    active_programs: number;
    avg_enrollment_pct: number;
    programs_below_threshold: number;
    total_exhibitions: number;
    active_exhibitions: number;
    avg_exhibition_duration_days: number;
    exhibitions_with_reception_pct: number;
    cross_domain_signals: string[];
  };
}

/** KPI summary for Executive Dashboard — health score + highlights + alerts */
export interface cultural_social_get_cultural_summary_Contract extends BaseToolResponse {
  data: {
    upcoming_events_30d: number;
    active_exhibitions: number;
    active_programs: number;
    total_entertainment_acts: number;
    total_budget: number;
    budget_utilized_pct: number;
    cultural_health_score: number;
    health_level: string;
    next_gala: {
      name: string;
      date: string;
      venue: string;
      formality: string;
      guest_count: number;
    } | null;
    featured_exhibition: {
      title: string;
      artist: string;
      venue: string;
      end_date: string;
    } | null;
    top_program: {
      name: string;
      category: string;
      enrollment: string;
    } | null;
    alerts: string[];
    events_this_week: number;
    events_next_week: number;
  };
}

/** THE GAME CHANGER — Cultural Engagement Motor: proactive proposals */
export interface cultural_social_generate_cultural_proposals_Contract extends BaseToolResponse {
  data: {
    proposals: Array<{
      id: string;
      category: string;
      title: string;
      description: string;
      target_members: string[];
      target_families: string[];
      target_demographic: string;
      venue_recommendation: string;
      expected_impact: {
        attendance_estimate: number;
        engagement_lift_pct: number;
        revenue_potential_crc: number;
      };
      cross_domain: {
        finance_budget_estimate: number;
        communication_campaign_idea: string;
        related_events: string[];
        family_connection: string;
        wellness_integration: string;
      };
      confidence: number;
      implementation_effort: string;
      suggested_timeline: string;
      action_steps: string[];
    }>;
    engagement_score: number;
    total_proposals: number;
    focus_area: string;
    priority_ranking: string[];
  };
}


// ── Tool 1: manage_facilities (AUTO — CRUD) ──
// ← Cultural Social (venue management)

export interface manage_facilities_Contract extends BaseToolResponse {
  data: {
    facility_id: string;
    facility_name: string;
    facility_type: FacilityType;
    status: FacilityStatus;
    capacity: number;
    current_occupancy: number;
    location: string;
    description: string;
    opening_time: string;
    closing_time: string;
    amenities: string[];
    active_setups: number;
    active_maintenance: number;
    last_inspection_date: string | null;
    last_inspection_result: InspectionResult | null;
    created_at: string;
    updated_at: string;
  };
}

// ── Tool 2: schedule_maintenance (HITL) ──
// Cascade: emergency → facility status change
// → Compliance (regulatory)

export interface schedule_maintenance_Contract extends BaseToolResponse {
  data: {
    maintenance_id: string;
    facility_id: string;
    facility_name: string;
    maintenance_type: MaintenanceType;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    description: string;
    scheduled_date: string;
    scheduled_time: string;
    estimated_duration_hours: number;
    assigned_to: string;
    cost: number;
    is_emergency: boolean;
    affects_facility_status: boolean;
    notes: string | null;
    created_at: string;
  };
  request_id?: string;
}

// ── Tool 3: coordinate_event_setup (HITL) ──
// ← Cultural Social + Events

export interface coordinate_event_setup_Contract extends BaseToolResponse {
  data: {
    setup_id: string;
    event_id: string;
    event_name: string;
    facility_id: string;
    facility_name: string;
    setup_status: SetupStatus;
    setup_date: string;
    setup_time_start: string;
    setup_time_end: string;
    requirements: Array<{
      item: string;
      quantity: number;
      status: string;
      notes: string | null;
    }>;
    assigned_team: string[];
    special_instructions: string | null;
    estimated_cost: number;
    created_at: string;
    updated_at: string;
  };
  request_id?: string;
}

// ── Tool 4: get_facility_occupancy (AUTO — data+fusion) ──
// → SmartSchedule, → Events

export interface FacilityOccupancyItem {
  facility_id: string;
  facility_name: string;
  facility_type: FacilityType;
  status: FacilityStatus;
  current_setups: number;
  active_maintenance: number;
  capacity: number;
  current_occupancy: number;
  occupancy_pct: number;
  opening_time: string;
  closing_time: string;
  next_available_slot: string | null;
}

export interface get_facility_occupancy_Contract extends BaseToolResponse {
  data: {
    facilities: FacilityOccupancyItem[];
    total_facilities: number;
    avg_occupancy_pct: number;
    facilities_at_capacity: number;
    facilities_under_maintenance: number;
    timestamp: string;
  };
}

// ── Tool 5: manage_inspections (AUTO — CRUD) ──
// → Compliance (regulatory requirements)

export interface manage_inspections_Contract extends BaseToolResponse {
  data: {
    inspection_id: string;
    facility_id: string;
    facility_name: string;
    inspection_type: string;
    result: InspectionResult;
    score: number | null;
    inspector: string;
    inspection_date: string;
    findings: Array<{
      category: string;
      severity: "critical" | "major" | "minor" | "observation";
      description: string;
      corrective_action: string | null;
      deadline: string | null;
    }>;
    next_inspection_date: string | null;
    photos_count: number;
    notes: string | null;
    created_at: string;
  };
}

// ── Tool 6: report_facility_issue (AUTO — mutation) ──
// Auto-creates maintenance request → Maintenance cascade

export interface report_facility_issue_Contract extends BaseToolResponse {
  data: {
    issue_id: string;
    facility_id: string;
    facility_name: string;
    reported_by: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    location_detail: string;
    status: "open" | "acknowledged" | "in_progress" | "resolved";
    auto_created_maintenance_id: string | null;
    photos_count: number;
    created_at: string;
    resolved_at: string | null;
  };
}

// ── Tool 7: get_maintenance_schedule (AUTO — data) ──
// → Compliance, → SmartSchedule

export interface MaintenanceScheduleItem {
  id: string;
  facility_id: string;
  facility_name: string;
  maintenance_type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration_hours: number;
  assigned_to: string;
  cost: number;
  notes: string | null;
  created_at: string;
}

export interface get_maintenance_schedule_Contract extends BaseToolResponse {
  data: {
    schedule: MaintenanceScheduleItem[];
    total: number;
    upcoming_count: number;
    overdue_count: number;
    emergency_count: number;
    total_estimated_cost: number;
  };
}

// ═══════════════════════════════════════════════════════════
// SPORTS RECREATION AGENT — 7 tools (Phase B F30b)
// Backend: agents/sports_recreation_agent.py
// SIN FRONTEND — contracts + types desde cero
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums (⚠️ valores estimados — VERIFICAR contra backend) ──

export const SPORT_TYPES = [
  "tennis", "soccer", "basketball", "volleyball", "swimming",
  "golf", "fitness", "yoga", "pilates", "martial_arts",
  "cycling", "running", "padel", "squash", "other"
] as const;
export type SportType = (typeof SPORT_TYPES)[number];

export const TOURNAMENT_FORMATS = [
  "single_elimination", "double_elimination", "round_robin",
  "swiss_system", "league_playoff", "friendly"
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
  "draft", "open_registration", "registration_closed",
  "in_progress", "completed", "cancelled"
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const LEAGUE_FORMATS = [
  "season_round_robin", "double_round_robin",
  "divisions", "ladder", "casual"
] as const;
export type LeagueFormat = (typeof LEAGUE_FORMATS)[number];

export const CLASS_TYPES = [
  "group", "private", "semi_private", "bootcamp",
  "workshop", "drop_in"
] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "all_levels"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const EQUIPMENT_CONDITIONS = [
  "new", "good", "fair", "needs_repair", "retired"
] as const;
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

// ── Shared sub-types ──

export interface CourtReservation {
  reservation_id: string;
  facility_id: string;
  facility_name: string;
  court_name: string;
  sport_type: SportType;
  date: string;
  time_start: string;
  time_end: string;
  family_id: string;
  family_name: string;
  purpose: "regular" | "lesson" | "tournament_block" | "league_match" | "event";
  status: "confirmed" | "pending" | "cancelled" | "no_show";
  players: number;
  notes: string | null;
  cost: number;
  is_conditional_hitl: boolean;
}

export interface TournamentParticipant {
  family_id: string;
  family_name: string;
  team_name: string | null;
  registration_date: string;
  seed: number | null;
  status: "registered" | "confirmed" | "withdrawn" | "disqualified";
  skill_level: SkillLevel;
}

// ── Tool 1: manage_court_reservations (AUTO/HITL — conditional) ──
// → Facilities (court booking)
//
// PATRÓN: Conditional HITL Escalation
// AUTO para reservas regulares, LESSON, LEAGUE_MATCH
// HITL para purpose == "tournament_block" o "event"
//
// El contract refleja ambos paths:
// - Si AUTO: status="success", no request_id
// - Si HITL: status="pending_approval", request_id presente

// export interface manage_court_reservations_Contract extends BaseToolResponse {
//   data: {
//     reservation: CourtReservation;
//     availability_context: {
//       court_occupancy_pct: number;
//       same_day_reservations: number;
//       conflicting_reservations: CourtReservation[];
//     };
//     approval_escalated: boolean;
//     escalation_reason: string | null;
//   };
//   request_id?: string;
// }

// ── Tool 2: organize_tournament (HITL) ──
// → Facilities (venue), → Events (tournament as event)

// export interface organize_tournament_Contract extends BaseToolResponse {
//   data: {
//     tournament_id: string;
//     name: string;
//     sport_type: SportType;
//     format: TournamentFormat;
//     status: TournamentStatus;
//     start_date: string;
//     end_date: string;
//     registration_open: string;
//     registration_close: string;
//     venue: string;
//     facility_ids: string[];
//     max_participants: number;
//     current_participants: number;
//     participants: TournamentParticipant[];
//     entry_fee: number;
//     total_prize_pool: number;
//     bracket: Array<{
//       round: number;
//       match_number: number;
//       player_a: string | null;
//       player_b: string | null;
//       winner: string | null;
//       score: string | null;
//       scheduled_date: string | null;
//     }>;
//     rules: string;
//     organizer_family_id: string;
//     created_at: string;
//   };
//   request_id?: string;
// }

// ── Tool 3: manage_fitness_classes (AUTO — CRUD) ──
// ← AgeGroup (age-appropriate), → Wellness

// export interface manage_fitness_classes_Contract extends BaseToolResponse {
//   data: {
//     class_id: string;
//     name: string;
//     sport_type: SportType;
//     class_type: ClassType;
//     skill_level: SkillLevel;
//     instructor: string;
//     description: string;
//     schedule: {
//       day_of_week: string;
//       time_start: string;
//       time_end: string;
//     };
//     venue: string;
//     facility_id: string;
//     max_capacity: number;
//     current_enrolled: number;
//     waitlist_count: number;
//     price_per_session: number;
//     age_groups: string[];
//     status: "active" | "paused" | "cancelled" | "full";
//     next_session_date: string | null;
//     avg_attendance: number;
//     rating: number | null;
//     created_at: string;
//     updated_at: string;
//   };
// }

// ── Tool 4: coordinate_coaching (AUTO — CRUD) ──
// ← Families (member coaching history)

// export interface coordinate_coaching_Contract extends BaseToolResponse {
//   data: {
//     session_id: string;
//     coach_name: string;
//     sport_type: SportType;
//     skill_level: SkillLevel;
//     family_id: string;
//     family_name: string;
//     member_ids: string[];
//     session_type: "private" | "semi_private" | "group";
//     date: string;
//     time_start: string;
//     time_end: string;
//     facility_id: string;
//     facility_name: string;
//     court_name: string;
//     focus_areas: string[];
//     progress_notes: string | null;
//     rating: number | null;
//     cost: number;
//     status: "scheduled" | "completed" | "cancelled" | "no_show";
//     next_session_date: string | null;
//     total_sessions_completed: number;
//     created_at: string;
//     updated_at: string;
//   };
// }

// ── Tool 5: manage_sport_leagues (HITL/AUTO CRUD) ──
// → Events (league matches as events)

// export interface manage_sport_leagues_Contract extends BaseToolResponse {
//   data: {
//     league_id: string;
//     name: string;
//     sport_type: SportType;
//     format: LeagueFormat;
//     season: string;
//     status: "draft" | "active" | "playoffs" | "completed" | "cancelled";
//     start_date: string;
//     end_date: string;
//     teams: Array<{
//       team_id: string;
//       team_name: string;
//       captain_family_id: string;
//       captain_name: string;
//       player_count: number;
//       wins: number;
//       losses: number;
//       draws: number;
//       points: number;
//       rank: number;
//     }>;
//     current_matchday: number;
//     total_matchdays: number;
//     standings_url: string | null;
//     entry_fee: number;
//     max_teams: number;
//     current_teams: number;
//     venue: string;
//     rules: string | null;
//     created_at: string;
//     updated_at: string;
//   };
//   request_id?: string;
// }

// ── Tool 6: get_equipment_availability (AUTO — data) ──
// → Facilities (equipment location)

// export interface get_equipment_availability_Contract extends BaseToolResponse {
//   data: {
//     sport_type: SportType | null;
//     equipment: Array<{
//       equipment_id: string;
//       name: string;
//       sport_type: SportType;
//       condition: EquipmentCondition;
//       facility_id: string;
//       facility_name: string;
//       is_available: boolean;
//       reserved_until: string | null;
//       reserved_by: string | null;
//       quantity_total: number;
//       quantity_available: number;
//       maintenance_due: string | null;
//       notes: string | null;
//     }>;
//     total_items: number;
//     available_items: number;
//     needs_repair_count: number;
//   };
// }

// ── Tool 7: get_sports_recommendations (AUTO — intel) ──
// Multi-source intelligence: classes + coaching + equipment
// ← Families (history), ← Wellness (fitness goals)

// export interface get_sports_recommendations_Contract extends BaseToolResponse {
//   data: {
//     family_id: string;
//     recommendations: Array<{
//       id: string;
//       type: "class" | "coaching" | "tournament" | "league" | "activity";
//       sport_type: SportType;
//       title: string;
//       description: string;
//       match_score: number;
//       reasoning: string;
//       factors: Array<{
//         factor: string;
//         weight: number;
//         detail: string;
//       }>;
//       action_label: string;
//       action_id: string | null;
//       schedule_suggestion: string | null;
//       estimated_cost: number | null;
//       skill_level: SkillLevel;
//     }>;
//     based_on: {
//       interests: string[];
//       skill_levels: Record<SportType, SkillLevel>;
//       past_activities: number;
//       coaching_sessions: number;
//       equipment_owned: string[];
//     };
//     overall_fitness_score: number | null;
//     suggested_sport: SportType | null;
//     confidence: number;
//   };
// }
// ═══════════════════════════════════════════════════════════
// AGE GROUP AGENT — 7 tools (Phase B F30b)
// Backend: agents/age_group.py
// Models: models/age_group_activity.py
// AgeGroupCategory(6) → ya en domain-enums.ts, importar de ahí
// ═══════════════════════════════════════════════════════════

// ── Domain-specific enums ──

export const ACTIVITY_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ActivityDifficulty = (typeof ACTIVITY_DIFFICULTIES)[number];

export const AGE_GROUP_ACTIVITY_STATUSES = ["active", "paused", "cancelled"] as const;
export type AgeGroupActivityStatus = (typeof AGE_GROUP_ACTIVITY_STATUSES)[number];

// ── Shared sub-types ──

export interface AgeGroupActivity {
  activity_id: string;
  name: string;
  description: string;
  age_group: string; // AgeGroupCategory from domain-enums.ts
  difficulty: ActivityDifficulty;
  status: AgeGroupActivityStatus;
  venue: string;
  facility_id: string | null;
  instructor: string | null;
  schedule: {
    day_of_week: string;
    time_start: string;
    time_end: string;
  };
  max_participants: number;
  current_participants: number;
  min_age: number;
  max_age: number;
  price_per_session: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// ── Tool 1: age_group_list (AUTO — data) ──
// Summary stats → Executive Dashboard

export interface age_group_list_Contract extends BaseToolResponse {
  data: {
    age_groups: Array<{
      age_group: string;
      total_activities: number;
      active_activities: number;
      total_enrolled: number;
      capacity: number;
      utilization_pct: number;
      avg_satisfaction: number | null;
      popular_activity: string | null;
    }>;
    total_families_served: number;
    total_children_enrolled: number;
    overall_utilization_pct: number;
    most_popular_group: string | null;
    least_popular_group: string | null;
  };
}

// ── Tool 2: age_group_get_activities (AUTO — data) ──
// ← Families (age-based filtering)

export interface age_group_get_activities_Contract extends BaseToolResponse {
  data: {
    activities: AgeGroupActivity[];
    total: number;
    age_group: string | null;
    status_filter: AgeGroupActivityStatus | null;
  };
}

// ── Tool 3: age_group_register_activity (HITL) ──
// → Facilities (venue booking)

export interface age_group_register_activity_Contract extends BaseToolResponse {
  data: {
    activity: AgeGroupActivity;
    created_by: string;
    approval_required: boolean;
  };
  request_id?: string;
}

// ── Tool 4: age_group_get_demographics (AUTO — intel) ──
// Demographics → Executive Dashboard

export interface age_group_get_demographics_Contract extends BaseToolResponse {
  data: {
    distribution: Array<{
      age_group: string;
      count: number;
      percentage: number;
      gender_split: {
        male: number;
        female: number;
        other: number;
      };
      trend: "growing" | "stable" | "declining";
      trend_pct: number;
    }>;
    total_children: number;
    avg_age: number;
    median_age: number;
    families_with_children: number;
    families_without_children: number;
    coverage_pct: number;
    underserved_groups: string[];
    generated_at: string;
  };
}

// ── Tool 5: age_group_get_participation (AUTO — intel) ──
// Satisfaction + retention → Satisfaction

export interface age_group_get_participation_Contract extends BaseToolResponse {
  data: {
    by_age_group: Array<{
      age_group: string;
      enrolled: number;
      active_30d: number;
      attendance_rate_pct: number;
      retention_rate_pct: number;
      satisfaction_avg: number | null;
      trend: "improving" | "stable" | "declining";
    }>;
    by_activity: Array<{
      activity_id: string;
      activity_name: string;
      age_group: string;
      enrolled: number;
      attendance_rate_pct: number;
      waitlist_count: number;
      satisfaction_avg: number | null;
    }>;
    overall_attendance_pct: number;
    overall_retention_pct: number;
    no_show_rate_pct: number;
    peak_hours: Array<{
      hour: string;
      utilization_pct: number;
    }>;
    seasonal_pattern: Array<{
      month: string;
      enrollment: number;
      attendance_pct: number;
    }>;
    generated_at: string;
  };
}

// ── Tool 6: age_group_recommend_activities (AUTO — intel) ──
// Family-based recommendations ← Families

export interface age_group_recommend_activities_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    family_name: string;
    children: Array<{
      member_id: string;
      name: string;
      age: number;
      age_group: string;
      current_activities: string[];
      recommendations: Array<{
        activity_id: string;
        activity_name: string;
        match_score: number;
        reasoning: string;
        schedule: string;
        skill_level: SkillLevel;
        friends_enrolled: number;
      }>;
    }>;
    family_recommendations: Array<{
      type: "sibling_discount" | "family_package" | "new_activity";
      title: string;
      description: string;
      savings: number | null;
    }>;
    confidence: number;
  };
}

// ── Tool 7: age_group_update_activity (SEMI) ──

export interface age_group_update_activity_Contract extends BaseToolResponse {
  data: {
    activity: AgeGroupActivity;
    changes: Record<string, { old: unknown; new: unknown }>;
    updated_by: string;
    updated_at: string;
  };
}

// ── Re-exports from recommendations module ─────────────────
// These types are source-of-truth from features/recommendations/types.ts
// Re-exported here for cross-agent component convenience.

export type {
  SchedulingConflict,
  SchedulingConflictsResponse,
  QuarterlyInsight,
  QuarterlyInsightGetResponse,
  TopActivity,
  ConflictSeverity,
  InsightPeriod,
  SuggestionStatus,
} from "@/features/recommendations/types";

// ═══════════════════════════════════════════════════════════
// Advisor Intelligence — Fase 21
// ═══════════════════════════════════════════════════════════

// ── Advisor Intelligence: generate_insight_narrative ─────

export interface AdvisorInsightNarrativeResponse {
  status: string;
  narrative: {
    insight_id: string;
    root_cause: string;
    benchmark_comparison: string;
    recommendation: string;
    estimated_impact: string;
    full_narrative: string;
    adjusted_confidence: number;
  };
  _approval_level: string;
  _agent: string;
}

// ── Advisor Intelligence: generate_action_plan ──────────

export interface AdvisorActionPlanItemResponse {
  title: string;
  reasoning: string;
  urgency: "today" | "this_week" | "this_month";
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approval_level: "auto" | "semi" | "hitl";
  source_insight_id: string;
  confidence: number;
}

export interface AdvisorActionPlanResponse {
  status: string;
  plan: {
    summary: string;
    items: AdvisorActionPlanItemResponse[];
    total_estimated_impact: string;
  };
  _approval_level: string;
  _agent: string;
}

// ── Advisor Intelligence: simulate_scenario ─────────────

export interface AdvisorScenarioProjection {
  name: "optimistic" | "base" | "pessimistic";
  description: string;
  projected_metrics: Record<string, number | string>;
  probability: number;
}

export interface AdvisorScenarioResponse {
  status: string;
  simulation: {
    scenarios: AdvisorScenarioProjection[];
    risk_assessment: string;
    recommended_scenario: string;
  };
  _approval_level: string;
  _agent: string;
}

// ── Advisor Intelligence: generate_board_brief ──────────

export interface AdvisorBoardBriefQA {
  question: string;
  answer: string;
}

export interface AdvisorBoardBriefResponse {
  status: string;
  brief: {
    brief_md: string;
    key_points: string[];
    talking_points: string[];
    q_and_a: AdvisorBoardBriefQA[];
  };
  _approval_level: string;
  _agent: string;
}

// ── Advisor Intelligence: ask_advisor ───────────────────

export interface AdvisorAskSuggestedAction {
  label: string;
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approval_level: string;
}

export interface AdvisorAskResponse {
  status: string;
  answer: {
    answer: string;
    evidence: string[];
    related_insights: string[];
    suggested_action: AdvisorAskSuggestedAction | null;
  };
  _approval_level: string;
  _agent: string;
}
// ═══════════════════════════════════════════════════════════
// WELLNESS — Goal List, Prediction, Anomalies (F26a)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// WELLNESS AGENT — 12 tools (Patrón D → A migration)
// Backend: agents/wellness.py
// Auditado F26 — 12 tools, 0 HITL, 12 AUTO, 4 intel
// ═══════════════════════════════════════════════════════════

// ── Tool 1: wellness_profile_get (AUTO) ──

export interface wellness_profile_get_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    overall_score: number;
    dimensions: Array<{
      dimension: string;
      score: number;
      weight: number;
      trend: "improving" | "stable" | "declining";
    }>;
    streak_days: number;
    total_activities: number;
    total_minutes: number;
    last_activity_date: string | null;
    preferred_activities: string[];
    goals_active: number;
  };
}

// ── Tool 2: wellness_profile_update (SEMI) ──

export interface wellness_profile_update_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    updated_fields: string[];
    new_score: number;
    updated_at: string;
  };
}

// ── Tool 3: wellness_activity_log (AUTO) ──

export interface wellness_activity_log_Contract extends BaseToolResponse {
  data: {
    log_id: string;
    family_id: string;
    activity: string;
    duration_minutes: number;
    calories: number;
    date: string;
    notes: string | null;
    logged_by: string;
  };
}

// ── Tool 4: wellness_goal_set (SEMI) ──

export interface wellness_goal_set_Contract extends BaseToolResponse {
  data: {
    goal_id: string;
    family_id: string;
    goal_type: string;
    title: string;
    description: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: string;
    target_date: string;
    created_at: string;
  };
}

// ── Tool 5: wellness_recommendations (AUTO) ──

export interface wellness_recommendations_Contract extends BaseToolResponse {
  data: {
    recommendations: Array<{
      id: string;
      activity: string;
      reason: string;
      match_score: number;
      schedule_suggestion: string;
      category: string;
    }>;
    total: number;
  };
}

// ── Tool 6: wellness_schedule_class (HITL) ──

export interface wellness_schedule_class_Contract extends BaseToolResponse {
  class_name: string;
  member_name: string;
  request_id?: string;
}

// ── Tool 7: wellness_report (AUTO) ──
// Ya existe como wellness_report_Contract — mantener sin cambios

// ── Tool 8: wellness_predict (AUTO — intel) ──
// Ya unificado en Bloque 0 — mantener wellness_predict_Contract existente

// ── Tool 9: wellness_anomalies (AUTO — intel) ──

export interface WellnessAnomalyData {
  id: string;
  anomaly_type: string;
  severity: string;
  title: string;
  description: string;
  detected_value: number;
  expected_min: number;
  expected_max: number;
  affected_member: string;
  detected_at: string;
  suggested_action: string;
}

export interface wellness_anomalies_Contract extends BaseToolResponse {
  data: {
    family_id: string;
    total_anomalies: number;
    critical_count: number;
    anomalies: WellnessAnomalyData[];
    summary: string;
  };
}

// ── Tool 10: wellness_correlate (AUTO — intel) ──

export interface wellness_correlate_Contract extends BaseToolResponse {
  data: {
    correlations: {
      wellness_to_retention: { coefficient: number; significance: string };
      wellness_to_revenue: { coefficient: number; significance: string };
      wellness_to_satisfaction: { coefficient: number; significance: string };
    };
    segment_insights: Array<{
      segment: string;
      wellness_score: number;
      retention_rate: number;
      correlation: string;
    }>;
    activity_value_ranking: Array<{
      activity: string;
      participation_count: number;
      avg_score_impact: number;
      retention_impact: number;
    }>;
  };
}

// ── Tool 11: wellness_insights (AUTO — intel) ──

export interface wellness_insights_Contract extends BaseToolResponse {
  data: {
    generated_at: string;
    health_score: number;
    executive_summary: string;
    key_findings: Array<{
      finding: string;
      severity: "positive" | "neutral" | "negative";
      evidence: string;
    }>;
    trend_analysis: {
      period: string;
      direction: "improving" | "stable" | "declining";
      velocity: string;
      comparison: string;
    };
    critical_insights: Array<{
      insight: string;
      priority: "high" | "medium" | "low";
      action: string;
    }>;
    predictions: {
      next_month_engagement: string;
      churn_risk_members: number;
      growth_opportunity: string;
    };
  };
}

// ── Tool 12: wellness_goal_list (AUTO) ──

export interface WellnessGoalData {
  id: string;
  family_id: string;
  goal_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  target_date: string;
  created_at: string;
}

export interface wellness_goal_list_Contract extends BaseToolResponse {
  data: {
    goals: WellnessGoalData[];
    total: number;
  };
}


export interface WellnessPredictionFactor {
  factor: string;
  impact: string;
}

export interface WellnessActivityForecast {
  current_distribution: Record<string, number>;
  most_frequent: string;
  total_unique_dates: number;
  suggested_weekly_minutes: number;
}

export interface WellnessPredictionData {
  family_id: string;
  risk_level: string;
  engagement_score: number;
  predicted_trend: string;
  churn_risk_pct: number;
  activity_forecast: WellnessActivityForecast;
  factors: WellnessPredictionFactor[];
  top_recommendation: string;
  confidence: number;
}

// wellness_predict_Contract: ya definido arriba en sección WELLNESS TOOL CONTRACTS (Patrón A unificado)



export interface WellnessAnomalyResponseData {
  family_id: string;
  total_anomalies: number;
  critical_count: number;
  anomalies: WellnessAnomalyData[];
  summary: string;
}

// ══════════════════════════════════════════════════════════
// Document Intelligence (RAG) — 8 tools
// Backend: agents/document_intelligence_agent.py
// Backend: models/document_intelligence.py
// ══════════════════════════════════════════════════════════

export interface DocumentIntelligenceDocument {
  id: string;
  title: string;
  file_name: string;
  document_type: string;
  category: string;
  access_level: string;
  status: string;
  ingestion_status: string;
  tags: string[];
  chunk_count: number;
  content_preview: string;
  file_size_bytes: number;
  page_count: number;
  has_tables: boolean;
  uploaded_by: string;
  notes: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentIntelligenceKnowledgeSource {
  document_id: string;
  title: string;
  snippet: string;
  relevance: number;
  document_type: string;
}

// search_documents → DocumentRepository UI
export interface search_documents_Contract {
  status: string;
  results: Array<{
    document: DocumentIntelligenceDocument;
    relevance_score: number;
    snippet: string;
    highlighted_terms: string[];
  }>;
  total: number;
  query_time_ms: number;
}

// knowledge_query → KnowledgeQuery UI (RAG conversational)
export interface knowledge_query_Contract {
  status: string;
  answer: string;
  sources: DocumentIntelligenceKnowledgeSource[];
  confidence: number;
  conversation_id: string;
}

// query_documents → semantic chunk search
export interface query_documents_Contract {
  status: string;
  message: string;
  results: Array<{
    chunk_id: string;
    document_id: string;
    document_name: string;
    content: string;
    relevance_score: number;
    chunk_index: number;
    section_title: string;
  }>;
  total_results: number;
}

// search_similar → find similar documents
export interface search_similar_Contract {
  status: string;
  source_document: string;
  similar_documents: Array<{
    document_id: string;
    file_name: string;
    document_type: string;
    category: string;
    similarity_score: number;
  }>;
}

// get_repository_stats → repository statistics
export interface get_repository_stats_Contract {
  status: string;
  message: string;
  stats: {
    total_documents: number;
    total_chunks: number;
    total_size_bytes: number;
    by_type: Record<string, number>;
    by_category: Record<string, number>;
    by_access_level: Record<string, number>;
    rag?: {
      vectorstore: Record<string, unknown>;
      conversations: Record<string, unknown>;
      bm25_index_size: number;
      embeddings: Record<string, unknown>;
      reranker: Record<string, unknown>;
    };
  };
}

// ingest_document → document ingestion
export interface ingest_document_Contract {
  status: string;
  message: string;
  document: DocumentIntelligenceDocument | Record<string, unknown>;
}

// generate_knowledge_report → HITL report
export interface generate_knowledge_report_Contract {
  status: string;
  request_id?: string;
  message: string;
  details?: {
    topic: string;
    audience: string;
    categories: string[];
  };
  report?: Record<string, unknown>;
}

// manage_document_access → HITL access control
export interface manage_document_access_Contract {
  status: string;
  request_id?: string;
  message: string;
  documents?: Array<{
    document_id: string;
    file_name: string;
    title: string;
    access_level: string;
    document_type: string;
    category: string;
  }>;
  document_access?: Record<string, string>;
  details?: {
    document_id: string;
    file_name: string;
    current_level: string;
    requested_level: string;
  };
}

// ═══════════════════════════════════════════════════════════
// F28 — Communication Intelligence Contracts
// 1:1 with backend Pydantic models (models/communication.py)
// ═══════════════════════════════════════════════════════════

// ── generate_communication_insights ──────────────────────

export interface CommunicationInsightDimension_Contract {
  dimension: string;
  score: number;
  status: string;
  finding: string;
  recommendation: string;
  benchmark?: string;
  metric_value?: number | null;
  metric_unit?: string | null;
}

export interface generate_communication_insights_Contract {
  status: string;
  message: string;
  overall_score: number;
  dimensions: CommunicationInsightDimension_Contract[];
  alerts: string[];
  opportunities: string[];
  generated_at: string;
}

// ── get_communication_health ─────────────────────────────

export interface CommunicationHealthFactors_Contract {
  delivery: number;
  diversity: number;
  reliability: number;
  frequency: number;
  engagement: number;
}

export interface CommunicationHealthData_Contract {
  score: number;
  level: string;
  factors: CommunicationHealthFactors_Contract;
  trend: string;
  benchmark_comparison: string;
}

export interface get_communication_health_Contract {
  status: string;
  message: string;
  health: CommunicationHealthData_Contract;
}

// ── get_campaign_performance ─────────────────────────────

export interface CampaignPerformanceData_Contract {
  id: string;
  name: string;
  status: string;
  channels: string[];
  total_sent: number;
  success_count: number;
  success_rate: number;
  engagement_score: number;
}

export interface CampaignSummary_Contract {
  total_campaigns: number;
  total_sent: number;
  avg_engagement: number;
  top_channel: string;
  top_type: string;
}

export interface get_campaign_performance_Contract {
  status: string;
  message: string;
  campaigns: CampaignPerformanceData_Contract[];
  summary: CampaignSummary_Contract;
  top_performers: CampaignPerformanceData_Contract[];
  recommendations: string[];
}
// ══════════════════════════════════════════════════════════
// FAMILIES — Intelligence Contracts (F29)
// ══════════════════════════════════════════════════════════

// ── family_update_profile ─────────────────────────────────

export interface FamilyResponse_Contract {
  id: string;
  name: string;
  tier: string;
  status: string;
  email: string;
  phone: string;
  address: string | null;
  join_date: string;
  engagement_score: number;
  referral_family_id: string | null;
  notes: string | null;
  members: unknown[];
  created_at: string;
  updated_at: string;
  member_count: number;
  age_groups_present: string[];
}

export interface family_update_profile_Contract {
  status: string;
  family: FamilyResponse_Contract;
  message: string;
}

// ── family_lifecycle_analysis ─────────────────────────────

export interface LifecycleRecommendation_Contract {
  action: string;
  priority: string;
  expected_impact: string;
}

export interface LifecycleAnalysisData_Contract {
  current_stage: string;
  stage_progress: number;
  next_transition: string;
  days_at_stage: number;
  recommendations: LifecycleRecommendation_Contract[];
  confidence: number;
}

export interface family_lifecycle_analysis_Contract {
  status: string;
  data: LifecycleAnalysisData_Contract;
  message: string;
}

// ── family_360_insight ────────────────────────────────────

export interface DomainScore_Contract {
  domain: string;
  score: number;
  status: string;
  finding: string;
  recommendation: string;
}

export interface CrossDomainCorrelation_Contract {
  domains: string[];
  correlation: string;
  insight: string;
  impact: string;
}

export interface Insight360Data_Contract {
  overall_score: number;
  domains: DomainScore_Contract[];
  top_insights: string[];
  cross_domain_correlations: CrossDomainCorrelation_Contract[];
  ai_summary: string;
}

export interface family_360_insight_Contract {
  status: string;
  data: Insight360Data_Contract;
  rag_citations: string;
  message: string;
}

// ── family_social_graph_enriched ──────────────────────────

export interface EnrichedConnection_Contract {
  connected_family_id: string;
  connected_family_name: string;
  strength: number;
  relationship: string;
  shared_activities: string[];
  shared_events: number;
  last_interaction: string | null;
  connected_tier: string | null;
  connected_engagement: number | null;
  ai_insight: string | null;
}

export interface SocialCluster_Contract {
  id: string;
  name: string;
  family_ids: string[];
  common_interest: string;
  avg_strength: number;
}

export interface SuggestedConn_Contract {
  family_id: string;
  family_name: string;
  tier: string;
  match_score: number;
  reason: string;
}

export interface EnrichedGraphData_Contract {
  family_id: string;
  family_name: string;
  connections: EnrichedConnection_Contract[];
  total_connections: number;
  clusters: SocialCluster_Contract[];
  suggested_connections: SuggestedConn_Contract[];
}

export interface family_social_graph_enriched_Contract {
  status: string;
  data: EnrichedGraphData_Contract;
  message: string;
}

// ── family_milestone_tracker ──────────────────────────────

export interface Milestone_Contract {
  id: string;
  type: string;
  title: string;
  date: string;
  days_until: number;
  member_name: string | null;
  suggested_action: string;
  priority: string;
}

export interface MilestoneTrackerData_Contract {
  upcoming: Milestone_Contract[];
  recent: Milestone_Contract[];
  suggestions: string[];
}

export interface family_milestone_tracker_Contract {
  status: string;
  data: MilestoneTrackerData_Contract;
  message: string;
}
// ── identify_social_clusters ──────────────────────────────

export interface SocialClusterDetail_Contract {
  id: string;
  name: string;
  family_ids: string[];
  common_interest: string;
  avg_strength: number;
  cohesion_score: number;
  suggested_event: string;
}

export interface IsolatedFamily_Contract {
  family_id: string;
  family_name: string;
  tier: string;
  engagement: number;
  suggestion: string;
}

export interface SocialClustersData_Contract {
  total_families: number;
  total_connections: number;
  avg_connections_per_family: number;
  social_density: number;
  clusters: SocialClusterDetail_Contract[];
  isolated_families: IsolatedFamily_Contract[];
  cross_tier_connections: number;
  integration_rate: number;
}

export interface identify_social_clusters_Contract {
  status: string;
  data: SocialClustersData_Contract;
  message: string;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SPORTS & RECREATION — 11 tools (F32)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Shared sub-types ──────────────────────────────────────────────────────────

export interface CourtReservation_Contract {
  id: string;
  court_name: string;
  sport: string;
  member_id: string;
  member_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  purpose: string;
  notes: string | null;
  created_at: string;
}

export interface Tournament_Contract {
  id: string;
  name: string;
  sport: string;
  format: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  venue: string;
  organizer_member_id: string;
  entry_fee: number;
  prizes: string[];
  rules: string | null;
  status: string;
  created_at: string;
}

export interface FitnessClass_Contract {
  id: string;
  name: string;
  sport: string;
  class_type: string;
  instructor: string;
  skill_level: string;
  schedule_day: string;
  schedule_time: string;
  duration_minutes: number;
  max_capacity: number;
  current_enrolled: number;
  location: string;
  equipment_needed: string[];
  is_active: boolean;
  created_at: string;
}

export interface CoachingSession_Contract {
  id: string;
  sport: string;
  coach_name: string;
  member_id: string;
  member_name: string;
  skill_level: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  focus_areas: string[];
  notes: string | null;
  status: string;
  created_at: string;
}

export interface EquipmentItem_Contract {
  id: string;
  name: string;
  sport: string;
  location: string;
  condition: string;
  total_quantity: number;
  available_quantity: number;
  brand: string | null;
  notes: string | null;
  last_maintenance: string | null;
}

export interface SportLeague_Contract {
  id: string;
  name: string;
  sport: string;
  format: string;
  teams: string[];
  season: string;
  start_date: string;
  end_date: string;
  coordinator_member_id: string;
  max_teams: number;
  current_round: number;
  standings: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface SportsRecommendation_Contract {
  id: string;
  member_id: string;
  sport: string;
  reason: string;
  confidence_score: number;
  suggested_class: string | null;
  suggested_coach: string | null;
  created_at: string;
}

// ── Intelligence sub-types ────────────────────────────────────────────────────

export interface SportPopularity_Contract {
  sport: string;
  total_activity: number;
  reservation_count: number;
  class_count: number;
  tournament_count: number;
  coaching_count: number;
  popularity_rank: number;
  activity_share_pct: number;
}

export interface CourtUtilization_Contract {
  court_name: string;
  sport: string;
  total_slots: number;
  booked_slots: number;
  utilization_pct: number;
  peak_hours: string[];
  avg_daily_bookings: number;
  trend: string;
}

export interface ClassEnrollment_Contract {
  class_id: string;
  name: string;
  sport: string;
  class_type: string;
  enrolled: number;
  capacity: number;
  fill_rate_pct: number;
  is_underperforming: boolean;
  instructor: string;
  schedule_day: string;
}

export interface TournamentMetrics_Contract {
  total_tournaments: number;
  by_status: Record<string, number>;
  avg_participation_rate: number;
  total_revenue: number;
  upcoming_count: number;
  in_progress_count: number;
  completed_count: number;
  avg_entry_fee: number;
}

export interface EquipmentLifecycle_Contract {
  equipment_id: string;
  name: string;
  sport: string;
  condition: string;
  urgency_score: number;
  needs_attention: boolean;
  days_since_maintenance: number | null;
  recommended_action: string;
}

export interface CoachStat_Contract {
  name: string;
  session_count: number;
  unique_members: number;
  popular_sports: string[];
  avg_sessions_per_member: number;
}

export interface CoachingEffectiveness_Contract {
  coaches: CoachStat_Contract[];
  total_sessions: number;
  avg_sessions_per_member: number;
  unique_members_coached: number;
  top_coach: string | null;
}

export interface SeasonalPattern_Contract {
  month: number;
  month_name: string;
  activity_count: number;
  dominant_sport: string | null;
  is_peak_season: boolean;
  reservation_count: number;
  class_count: number;
  tournament_count: number;
}

export interface SportsAnalytics_Contract {
  sport_popularity: SportPopularity_Contract[];
  court_utilization: CourtUtilization_Contract[];
  class_enrollment: ClassEnrollment_Contract[];
  tournament_metrics: TournamentMetrics_Contract;
  equipment_health: EquipmentLifecycle_Contract[];
  coaching_stats: CoachingEffectiveness_Contract;
  seasonal_patterns: SeasonalPattern_Contract[];
  member_engagement_score: number;
  peak_hours: Record<string, number>;
  total_active_reservations: number;
  total_active_classes: number;
  lookback_days: number;
}

export interface SportsHealthFactor_Contract {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  status: string;
  detail: string;
}

export interface SportsHealthSummary_Contract {
  health_score: number;
  level: string;
  factors: SportsHealthFactor_Contract[];
  trend: string;
  alerts: string[];
  recommendations: string[];
  generated_at: string;
}

export interface SportsCalendarItem_Contract {
  id: string;
  type: string;
  title: string;
  sport: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  participants: number | null;
  status: string;
  is_conflict: boolean;
  conflict_reason: string | null;
  weather_risk: string | null;
  entity_id: string;
}

export interface SportsProposal_Contract {
  id: string;
  type: string;
  title: string;
  description: string;
  target_sport: string;
  expected_participants: number;
  confidence_score: number;
  reasoning: string;
  cross_domain_signals: string[];
  estimated_revenue: number | null;
  suggested_date: string | null;
  action_label: string;
  approval: string;
}

// ── Tool Response Contracts ───────────────────────────────────────────────────

export interface ManageCourtReservations_Contract {
  status: string;
  message: string;
  reservation?: CourtReservation_Contract;
  request_id?: string;
  details?: Record<string, unknown>;
}

export interface OrganizeTournament_Contract {
  status: string;
  message: string;
  request_id?: string;
  details?: {
    name: string;
    sport: string;
    format: string;
    start_date: string;
    end_date: string;
    max_participants: number;
    venue: string;
    entry_fee: number;
    prizes: string[];
  };
  tournament?: Tournament_Contract;
}

export interface ManageFitnessClasses_Contract {
  status: string;
  message: string;
  classes?: FitnessClass_Contract[];
  fitness_class?: FitnessClass_Contract;
}

export interface CoordinateCoaching_Contract {
  status: string;
  message: string;
  sessions?: CoachingSession_Contract[];
  session?: CoachingSession_Contract;
}

export interface ManageSportLeagues_Contract {
  status: string;
  message: string;
  leagues?: SportLeague_Contract[];
  league?: SportLeague_Contract;
  request_id?: string;
  details?: Record<string, unknown>;
}

export interface GetEquipmentAvailability_Contract {
  status: string;
  message: string;
  equipment: EquipmentItem_Contract[];
  total_items: number;
  available_items: number;
}

export interface GetSportsRecommendations_Contract {
  status: string;
  message: string;
  recommendations: SportsRecommendation_Contract[];
}

export interface GetSportsAnalytics_Contract {
  status: string;
  message: string;
  analytics: SportsAnalytics_Contract;
}

export interface GetSportsHealthSummary_Contract {
  status: string;
  message: string;
  health_summary: SportsHealthSummary_Contract;
}

export interface GetSportsCalendar_Contract {
  status: string;
  message: string;
  calendar: SportsCalendarItem_Contract[];
  total_items: number;
  conflict_count: number;
  date_range: { from: string; to: string };
}

export interface GenerateSportsProposals_Contract {
  status: string;
  message: string;
  proposals: SportsProposal_Contract[];
  total_proposals: number;
}
// ══════════════════════════════════════════════════════════════════════════════
// FACILITY MANAGEMENT CONTRACTS (F33)
// Backend alignment: models/facility_management.py
// ══════════════════════════════════════════════════════════════════════════════

// ── Sub-type contracts ───────────────────────────────────────────────────────

export interface Facility_Contract {
  id: string;
  name: string;
  facility_type: string;
  status: string;
  location: string;
  capacity: number;
  description: string;
  amenities: string[];
  opening_time: string;
  closing_time: string;
  responsible_member_id: string;
  base_rate: number;
  notes: string | null;
}

export interface MaintenanceTask_Contract {
  id: string;
  facility_id: string;
  facility_name: string;
  maintenance_type: string;
  status: string;
  priority: string;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration_hours: number;
  assigned_to: string;
  cost: number;
  completed_at: string | null;
  notes: string | null;
}

export interface EventSetup_Contract {
  id: string;
  event_id: string;
  event_name: string;
  facility_id: string;
  facility_name: string;
  status: string;
  setup_date: string;
  setup_time: string;
  event_start: string;
  event_end: string;
  requirements: string[];
  assigned_to: string;
  coordinator_member_id: string;
  notes: string | null;
}

export interface Inspection_Contract {
  id: string;
  facility_id: string;
  facility_name: string;
  result: string;
  inspector_member_id: string;
  inspection_date: string;
  findings: string;
  corrective_actions: string[];
  next_inspection_date: string | null;
  notes: string | null;
}

export interface FacilityReservation_Contract {
  id: string;
  facility_id: string;
  facility_name: string;
  family_id: string;
  family_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  guest_count: number;
  purpose: string;
  notes: string | null;
  created_by: string;
  created_at: string | null;
}

export interface CrossDomainSignal_Contract {
  domain: string;
  signal: string;
  impact: string;
  severity: string;
}

export interface AnalyticsDimension_Contract {
  dimension_id: string;
  name: string;
  score: number;
  status: string;
  findings: string[];
  recommendations: string[];
  data: Record<string, unknown>;
}

export interface AmenityUtilizationItem_Contract {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  status: string;
  current_occupancy: number;
  capacity: number;
  utilization_pct: number;
  peak_hours: string[];
  trend: string;
  forecast_pct: number;
  time_series: Array<{ date: string; utilization: number; reservations: number }>;
  base_rate: number;
  estimated_monthly_revenue: number;
}

export interface SpaceOptimizationSuggestion_Contract {
  facility_id: string;
  facility_name: string;
  suggestion_type: string;
  current_use: string;
  suggested_use: string;
  estimated_impact: string;
  priority: string;
  roi_estimate: string | null;
}

export interface FacilityHealthFactor_Contract {
  name: string;
  score: number;
  weight: number;
  detail: string;
  contribution: number;
}

// ── Tool Response Contracts ──────────────────────────────────────────────────

export interface ManageFacilities_Contract {
  status: string;
  message: string;
  facilities?: Facility_Contract[];
  facility?: Facility_Contract;
}

export interface ScheduleMaintenance_Contract {
  status: string;
  message: string;
  request_id?: string;
  details?: {
    facility_name: string;
    maintenance_type: string;
    priority: string;
    scheduled_date: string;
    cost: number;
  };
  maintenance?: MaintenanceTask_Contract;
}

export interface CoordinateEventSetup_Contract {
  status: string;
  message: string;
  request_id?: string;
  details?: {
    event_name: string;
    facility_name: string;
    setup_date: string;
    requirements: string[];
  };
  setup?: EventSetup_Contract;
}

export interface GetFacilityOccupancy_Contract {
  status: string;
  message: string;
  occupancy: Array<{
    facility_id: string;
    facility_name: string;
    facility_type: string;
    status: string;
    current_setups: number;
    active_maintenance: number;
    capacity: number;
    opening_time: string;
    closing_time: string;
  }>;
}

export interface ManageInspections_Contract {
  status: string;
  message: string;
  inspections?: Inspection_Contract[];
  inspection?: Inspection_Contract;
}

export interface ReportFacilityIssue_Contract {
  status: string;
  message: string;
  maintenance: MaintenanceTask_Contract;
}

export interface GetMaintenanceSchedule_Contract {
  status: string;
  message: string;
  schedule: MaintenanceTask_Contract[];
  total: number;
}

export interface CreateFacilityReservation_Contract {
  status: string;
  message: string;
  request_id?: string;
  details?: {
    facility_name: string;
    family_name: string;
    date: string;
    start_time: string;
    end_time: string;
    guest_count: number;
    purpose: string;
  };
  reservation?: FacilityReservation_Contract;
  conflicts?: FacilityReservation_Contract[];
}

export interface GetFacilityReservations_Contract {
  status: string;
  message: string;
  reservations: FacilityReservation_Contract[];
  total: number;
}

export interface GetFacilityAnalytics_Contract {
  status: string;
  message: string;
  overall_score: number;
  overall_grade: string;
  overall_level: string;
  trend: string;
  dimensions: AnalyticsDimension_Contract[];
  cross_domain_signals: CrossDomainSignal_Contract[];
  generated_at: string;
}

export interface GetAmenityUtilization_Contract {
  status: string;
  message: string;
  overall_utilization_pct: number;
  facilities: AmenityUtilizationItem_Contract[];
  total_capacity: number;
  total_occupancy: number;
  peak_facility: string;
  lowest_facility: string;
  generated_at: string;
}

export interface GetSpaceOptimization_Contract {
  status: string;
  message: string;
  suggestions: SpaceOptimizationSuggestion_Contract[];
  underutilized_count: number;
  overutilized_count: number;
  total_potential_savings: number;
  generated_at: string;
}

export interface GetFacilityHealth_Contract {
  status: string;
  message: string;
  score: number;
  grade: string;
  level: string;
  trend: string;
  factors: FacilityHealthFactor_Contract[];
  alerts: string[];
  generated_at: string;
}
// ── Member 360 Intelligence Contracts ────────────────────────────────────────

export interface MemberIdentity_Contract {
  member_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  tier: string;
  role: string;
  family_id: string;
  family_name: string;
  join_date: string;
  age?: number | null;
  age_group?: string | null;
}

export interface HealthFactor_Contract {
  name: string;
  score: number;
  weight: number;
  trend: string;
  details?: string | null;
}

export interface JourneyMilestone_Contract {
  milestone_id: string;
  date: string;
  milestone_type: string;
  title: string;
  description?: string | null;
  domain?: string | null;
  celebrated: boolean;
}

export interface SocialConnection_Contract {
  connected_member_id: string;
  connected_name: string;
  connection_type: string;
  strength: number;
  shared_activities: number;
  last_interaction?: string | null;
}

export interface EngagementProposal_Contract {
  proposal_id: string;
  proposal_type: string;
  title: string;
  description: string;
  domain: string;
  priority: string;
  estimated_impact: string;
  confidence: number;
  suggested_action?: string | null;
  related_members: string[];
  expires_at?: string | null;
}

export interface Member360Preview_Contract {
  member_id: string;
  first_name: string;
  last_name: string;
  tier: string;
  role: string;
  family_name: string;
  health_score: number;
  health_level: string;
  churn_risk: string;
  engagement_score: number;
  journey_stage: string;
  last_activity_date?: string | null;
}

export interface GetMember360Profile_Contract {
  member: MemberIdentity_Contract;
  health_score: number;
  health_level: string;
  journey_stage: string;
  days_in_stage: number;
  churn_risk: string;
  churn_score: number;
  engagement_score: number;
  ltv_estimate: number;
  ltv_trend: string;
  active_domains: string[];
  total_activities_90d: number;
  last_activity_date?: string | null;
  connections_count: number;
  satisfaction_nps?: number | null;
  upcoming_milestones: JourneyMilestone_Contract[];
  top_risks: string[];
  generated_at: string;
}

export interface GetMemberHealthScore_Contract {
  member_id: string;
  composite_score: number;
  health_level: string;
  factors: HealthFactor_Contract[];
  trend: string;
  trend_detail?: string | null;
  previous_score?: number | null;
  benchmark_percentile?: number | null;
  generated_at: string;
}

export interface GetMemberJourney_Contract {
  member_id: string;
  current_stage: string;
  days_in_stage: number;
  stage_history: Array<{
    stage: string;
    entered_at: string;
    exited_at?: string | null;
    duration_days: number;
  }>;
  milestones: JourneyMilestone_Contract[];
  next_expected_transition?: string | null;
  next_transition_date?: string | null;
  journey_health: string;
  generated_at: string;
}

export interface GetMemberChurnPrediction_Contract {
  member_id: string;
  churn_risk: string;
  churn_score: number;
  confidence: number;
  risk_factors: Array<{
    source: string;
    factor: string;
    weight: number;
    detail: string;
    severity?: string;
  }>;
  protective_factors: Array<{
    source: string;
    factor: string;
    detail: string;
  }>;
  time_horizon_days: number;
  recommended_actions: string[];
  similar_churned_count?: number | null;
  generated_at: string;
}

export interface GetMemberLTVAnalysis_Contract {
  member_id: string;
  current_ltv: number;
  monthly_avg_spend: number;
  ltv_trend: string;
  ltv_tier: string;
  spend_breakdown: Array<{
    domain: string;
    amount: number;
    percentage: number;
  }>;
  projection_12m?: number | null;
  projection_confidence?: number | null;
  benchmark_vs_tier?: number | null;
  peak_month?: string | null;
  low_month?: string | null;
  generated_at: string;
}

export interface GetMemberActivitySummary_Contract {
  member_id: string;
  total_activities: number;
  period_days: number;
  by_domain: Array<{
    domain: string;
    count: number;
    percentage: number;
    trend: string;
    last_activity?: string | null;
  }>;
  activity_heatmap: Array<{
    weekday: string;
    hour: number;
    count: number;
  }>;
  favorite_venues: Array<{
    venue: string;
    visits: number;
  }>;
  activity_streak_current: number;
  activity_streak_longest: number;
  generated_at: string;
}

export interface GetMemberSocialProfile_Contract {
  member_id: string;
  connections_count: number;
  connections: SocialConnection_Contract[];
  cluster_membership: string[];
  cluster_details: Array<{
    cluster: string;
    members_count: number;
    cohesion: number;
    match_score: number;
  }>;
  referrals_made: number;
  referrals_converted: number;
  social_influence_score: number;
  recommended_connections: Array<{
    member_id: string;
    name: string;
    reason: string;
    shared_interests: string[];
  }>;
  generated_at: string;
}

export interface GenerateMemberEngagementProposals_Contract {
  member_id: string;
  proposals: EngagementProposal_Contract[];
  total_proposals: number;
  cross_domain_signals: Array<{
    signal: string;
    value: number;
    status: string;
  }>;
  generated_at: string;
}

export interface GetMemberRiskAssessment_Contract {
  member_id: string;
  overall_risk: string;
  risk_score: number;
  risk_factors: Array<{
    source: string;
    factor: string;
    severity: string;
    weight: number;
    detail: string;
    mitigation?: string;
  }>;
  protective_factors: Array<{
    source: string;
    factor: string;
    detail: string;
  }>;
  risk_trend: string;
  similar_at_risk_count?: number | null;
  generated_at: string;
}

export interface SearchMembers360_Contract {
  members: Member360Preview_Contract[];
  total: number;
  page: number;
  page_size: number;
  filters_applied: Record<string, unknown>;
  generated_at: string;
}
// ── Guest Management Intelligence (F40) ──────────────



export interface GuestHealthFactor {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  impact: "high" | "medium" | "low";
  detail: string;
}

export interface GuestHealthScore {
  score: number;
  level: MemberHealthLevel;
  factors: GuestHealthFactor[];
  trend: TrendDirection;
  summary: string;
  generated_at: string;
}

export interface ConversionFunnelStage {
  stage:
    | "guest_registered"
    | "guest_checked_in"
    | "repeat_guest"
    | "trial_applicant"
    | "converted_member";
  label: string;
  count: number;
  rate_pct: number;
  cumulative_rate_pct: number;
  avg_days_in_stage: number;
  dropoff_count: number;
  benchmark_rate_pct: number;
  vs_benchmark: number;
}

export interface ConversionFunnel {
  stages: ConversionFunnelStage[];
  overall_conversion_pct: number;
  overall_benchmark_pct: number;
  total_guests: number;
  total_converted: number;
  pipeline_value: number;
  generated_at: string;
}

export interface GuestTemporalTrend {
  month: string;
  new_guests: number;
  unique_visitors: number;
  check_ins: number;
  trials_created: number;
  trials_converted: number;
  private_events: number;
  avg_visit_frequency: number;
}

export interface GuestAnalyticsEnhanced {
  total_guests: number;
  active_guests: number;
  total_private_events: number;
  upcoming_events: number;
  total_trial_memberships: number;
  active_trials: number;
  converted_trials: number;
  guest_to_trial_rate: number;
  trial_to_member_rate: number;
  temporal_trends: GuestTemporalTrend[];
  top_referrers: {
    family_id: string;
    referral_count: number;
    converted_count: number;
  }[];
  privilege_usage: {
    privilege_type: string;
    usage_count: number;
    unique_guests: number;
  }[];
  peak_visit_days: {
    day: string;
    visit_count: number;
  }[];
  event_guest_correlation: {
    event_type: string;
    avg_guests_generated: number;
    total_events: number;
  }[];
  top_purposes: {
    purpose: string;
    count: number;
  }[];
  generated_at: string;
}

export interface GuestForecastItem {
  metric: string;
  current_value: number;
  predicted_value: number;
  change_pct: number;
  confidence: number;
  trend: string;
  period: string;
  factors: string[];
}

export interface GuestDemandForecast {
  forecasts: GuestForecastItem[];
  trial_capacity_needed: number;
  seasonal_multiplier: number;
  peak_months: string[];
  forecast_horizon_months: number;
  data_quality_note: string;
  generated_at: string;
}

export interface GuestEngagementProposal {
  proposal_id: string;
  proposal_type:
    | "trial_invitation"
    | "follow_up_campaign"
    | "privilege_expansion"
    | "referral_activation"
    | "event_outreach"
    | "conversion_nudge";
  title: string;
  description: string;
  target_family_id: string;
  target_guest_ids: string[];
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  confidence: number;
  cross_domain_signals: string[];
  suggested_action: {
    action: string;
    domain: string;
    params: Record<string, unknown>;
  };
  created_at: string;
}

export interface GuestEngagementProposalList {
  proposals: GuestEngagementProposal[];
  total: number;
  high_priority_count: number;
  cross_domain_count: number;
  generated_at: string;
}

export interface GuestIntelligenceReport {
  health_score: GuestHealthScore | null;
  funnel: ConversionFunnel | null;
  analytics: GuestAnalyticsEnhanced | null;
  forecast: GuestDemandForecast | null;
  proposals: GuestEngagementProposalList | null;
  generated_at: string;
}

// ── ML Intelligence (F40, enhanced F44) ────────────────────

import type {
  SeverityLevel,
  ScenarioType,
  DriftStatus,
} from "@/shared/types/domain-enums";

export interface DomainQualityScore {
  domain: string;
  display_name: string;
  completeness_pct: number;
  freshness_hours: number;
  consistency_score: number;
  overall_score: number;
  status: "excellent" | "good" | "partial" | "minimal";
  gaps: string[];
  recommendation: string;
}

export interface DataQualityReport {
  overall_score: number;
  overall_status: "excellent" | "good" | "partial" | "minimal";
  domains: DomainQualityScore[];
  total_domains: number;
  domains_ready_for_ml: number;
  critical_gaps: string[];
  recommendation: string;
  generated_at: string;
}

export interface AnomalyFactor {
  name: string;
  value: number;
  expected_range_min: number;
  expected_range_max: number;
  deviation_sigma: number;
  contribution_pct: number;
}

/** F44: Vote from a single detection method in the ensemble. */
export interface EnsembleVote {
  method: string;
  is_anomaly: boolean;
  score: number;
  threshold: number;
}

export interface Anomaly {
  anomaly_id: string;
  domain: string;
  metric: string;
  anomaly_type: "point" | "contextual" | "collective" | "drift";
  severity: SeverityLevel;
  current_value: number;
  expected_value: number;
  deviation_pct: number;
  confidence: number;
  factors: AnomalyFactor[];
  explanation: string;
  affected_domains: string[];
  suggested_action: string;
  detected_at: string;
  /** F44: Detection method used (ensemble, isolation_forest, z_score_iqr) */
  detection_method: string;
  /** F44: Consensus level (unanimous, majority, single) */
  ensemble_consensus: string;
  /** F44: Individual votes from ensemble methods */
  ensemble_votes: EnsembleVote[];
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  total_anomalies: number;
  critical_count: number;
  high_count: number;
  domains_affected: string[];
  systemic_risk_score: number;
  /** F44: Detection method (ensemble or legacy) */
  detection_method: string;
  /** F44: Number of methods in ensemble */
  ensemble_size: number;
  generated_at: string;
}

export interface ForecastFactor {
  name: string;
  weight: number;
  direction: "positive" | "negative" | "neutral";
  description: string;
}

export interface ForecastPoint {
  period: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  /** F44: Prophet trend component (None if exp smoothing) */
  trend_component: number | null;
  /** F44: Prophet seasonal + holiday component */
  seasonal_component: number | null;
}

export interface DemandForecast {
  target:
    | "revenue"
    | "membership"
    | "event_attendance"
    | "facility_occupancy"
    | "guest_volume"
    | "satisfaction";
  display_name: string;
  current_value: number;
  forecast_points: ForecastPoint[];
  factors: ForecastFactor[];
  seasonal_pattern: string;
  trend: "improving" | "stable" | "declining";
  vs_last_period_pct: number;
  data_quality_note: string;
  /** F44: Model used (prophet or exponential_smoothing) */
  model_type: string;
  /** F44: Prophet decomposition (trend, yearly, holidays) */
  prophet_components: Record<string, number> | null;
  generated_at: string;
}

export interface RevenueScenario {
  scenario_type: ScenarioType;
  label: string;
  monthly_values: Record<string, number>;
  quarterly_total: number;
  vs_budget_pct: number;
  probability: number;
  key_assumptions: string[];
}

export interface RevenueForecast {
  horizon_months: number;
  current_monthly_revenue: number;
  budget_monthly: number;
  scenarios: RevenueScenario[];
  recommended_scenario: ScenarioType;
  factors: ForecastFactor[];
  confidence: number;
  /** F44: Model used (prophet or exponential_smoothing) */
  model_type: string;
  generated_at: string;
}

export interface ChurnMLScore {
  member_id: string;
  member_name: string;
  tier: string;
  ml_churn_score: number;
  rule_churn_score: number;
  discrepancy: number;
  churn_risk: "low" | "medium" | "high" | "critical";
  top_features: {
    feature: string;
    importance: number;
    direction: string;
  }[];
  explanation: string;
  recommended_action: string;
}

export interface ChurnMLReport {
  scores: ChurnMLScore[];
  total_at_risk: number;
  total_analyzed: number;
  avg_ml_score: number;
  avg_rule_score: number;
  significant_discrepancies: number;
  top_churn_features: {
    feature: string;
    importance_pct: number;
  }[];
  segment_breakdown: Record<
    string,
    {
      count: number;
      avg_ml_score: number;
      avg_rule_score: number;
      high_risk_count: number;
    }
  >;
  generated_at: string;
}

export interface MemberSegment {
  segment_id: string;
  label: "champion" | "loyal" | "potential" | "at_risk" | "dormant";
  display_name: string;
  member_count: number;
  percentage: number;
  avg_ltv: number;
  avg_engagement: number;
  avg_satisfaction: number;
  avg_visit_frequency: number;
  churn_risk_pct: number;
  revenue_contribution_pct: number;
  characteristics: string[];
  recommended_strategy: string;
  key_features: {
    feature: string;
    value: number;
    vs_avg: number;
  }[];
}

export interface MemberSegmentation {
  segments: MemberSegment[];
  total_members: number;
  silhouette_score: number;
  optimal_k: number;
  key_differentiators: string[];
  generated_at: string;
}

/** F44: PSI-based drift assessment for a single model. */
export interface DriftReport {
  model_name: string;
  psi_score: number;
  status: DriftStatus;
  baseline_window: string;
  current_window: string;
  bins_used: number;
  retrain_recommended: boolean;
  details: Record<string, unknown>[];
}

export interface ModelPerformance {
  model_name: string;
  display_name: string;
  model_type: "anomaly_detection" | "forecasting" | "churn" | "clustering";
  accuracy: number;
  mae: number;
  mape: number;
  drift_detected: boolean;
  drift_magnitude: number;
  feature_importance: {
    feature: string;
    importance_pct: number;
  }[];
  last_trained: string;
  training_samples: number;
  status: "healthy" | "degraded" | "retrain_needed";
  /** F44: PSI value (<0.10 stable, 0.10-0.20 mild, >0.20 significant) */
  psi_score: number | null;
  /** F44: PSI-based drift status */
  psi_status: DriftStatus | null;
  /** F44: PSI threshold that triggers retrain */
  retrain_threshold: number;
}

export interface ModelHealthReport {
  models: ModelPerformance[];
  total_models: number;
  healthy_count: number;
  degraded_count: number;
  retrain_needed_count: number;
  avg_accuracy: number;
  any_drift: boolean;
  next_scheduled_training: string;
  /** F44: Aggregate drift across all models */
  overall_drift_status: DriftStatus;
  /** F44: Per-model PSI drift reports */
  drift_reports: DriftReport[];
  /** F44: When next PSI evaluation runs */
  next_evaluation: string;
  generated_at: string;
}

export interface ChatContext {
  active_domains: string[];
  recent_anomalies: number;
  active_insights: number;
  latest_predictions: Record<string, unknown>;
  member_count: number;
  current_month: string;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
  evidence: {
    source: string;
    data: string;
    confidence: number;
  }[];
  related_insights: string[];
  suggested_action: {
    action: string;
    domain: string;
    params: Record<string, unknown>;
  } | null;
  confidence: number;
  context_used: string[];
  generated_at: string;
}

export interface SimulationScenario {
  scenario_type: ScenarioType;
  label: string;
  description: string;
  predictions: Record<string, unknown>;
  probability: number;
  key_assumptions: string[];
  risks: string[];
}

export interface SimulationResponse {
  question: string;
  scenarios: SimulationScenario[];
  recommended_scenario: ScenarioType;
  risk_assessment: string;
  cross_domain_impacts: {
    domain: string;
    impact: string;
    severity: string;
  }[];
  confidence: number;
  data_sources: string[];
  generated_at: string;
}

export interface PredictionExplanation {
  prediction_id: string;
  prediction_type: "churn" | "revenue" | "demand" | "anomaly";
  predicted_value: number;
  factors: {
    feature: string;
    weight: number;
    direction: string;
    value: number;
    explanation: string;
  }[];
  sensitivity: {
    change: string;
    impact_on_prediction: string;
  }[];
  comparison_to_rules: string;
  confidence: number;
  limitations: string[];
  generated_at: string;
}

// ── Satisfaction Intelligence (F40) ──────────────────

import type {
  MemberHealthLevel,
  TrendDirection,
} from "@/shared/types/domain-enums";

export interface SatisfactionHealthFactor {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  impact: "high" | "medium" | "low";
  detail: string;
}

export interface SatisfactionHealthScore {
  score: number;
  overall_score: number;
  level: MemberHealthLevel;
  factors: SatisfactionHealthFactor[];
  trend: TrendDirection;
  sentiment_summary: {
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
  };
  alerts: string[];
  summary: string;
  generated_at: string;
}

export interface CategoryScore {
  category: string;
  display_name: string;
  avg_score: number;
  trend: TrendDirection;
  event_count: number;
  best_event: string;
  worst_event: string;
  vs_club_avg: number;
}

export interface EventTypeComparison {
  event_type: string;
  display_name: string;
  event_count: number;
  avg_score: number;
  total_responses: number;
  sentiment_breakdown: Record<string, number>;
  best_category: string;
  worst_category: string;
  vs_club_avg: number;
  trend: TrendDirection;
}

export interface SentimentFlowPoint {
  month: string;
  avg_score: number;
  survey_count: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  nps_proxy: number;
}

export interface NPSSummary {
  nps_score: number;
  promoter_pct: number;
  passive_pct: number;
  detractor_pct: number;
  promoter_count: number;
  passive_count: number;
  detractor_count: number;
  total_surveys: number;
  classification: "positive" | "neutral" | "negative";
}

export interface SatisfactionIntelligence {
  total_surveys: number;
  total_events_surveyed: number;
  overall_avg: number;
  response_rate_pct: number;
  category_scores: CategoryScore[];
  event_type_comparisons: EventTypeComparison[];
  sentiment_flow: SentimentFlowPoint[];
  nps: NPSSummary | null;
  cross_domain_signals: {
    domain: string;
    signal: string;
    relevance: string;
  }[];
  generated_at: string;
}

export interface SatisfactionBenchmark {
  metric: string;
  display_name: string;
  current_value: number;
  avg_score: number;
  value: number;
  club_average: number;
  benchmark_value: number;
  benchmark_score: number;
  benchmark: number;
  vs_club: number;
  vs_benchmark: number;
  percentile: number;
  category: string;
  status: "on_track" | "needs_attention" | "critical";
}

export interface SatisfactionBenchmarkReport {
  overall_benchmarks: SatisfactionBenchmark[];
  category_benchmarks: SatisfactionBenchmark[];
  event_type_benchmarks: SatisfactionBenchmark[];
  outlier_categories: {
    category: string;
    avg_score: number;
    deviation: number;
    direction: "above" | "below";
  }[];
  best_performing_event_type: string;
  worst_performing_event_type: string;
  generated_at: string;
}

export interface SatisfactionEngagementProposal {
  proposal_id: string;
  proposal_type:
    | "category_review"
    | "format_replication"
    | "survey_follow_up"
    | "event_redesign"
    | "staff_training"
    | "pricing_review";
  title: string;
  description: string;
  target_event_id: string;
  target_event_type: string;
  target_category: string;
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  expected_impact: string;
  effort: "low" | "medium" | "high";
  confidence: number;
  cross_domain_signals: string[];
  suggested_action: {
    action: string;
    domain: string;
    params: Record<string, unknown>;
  };
  created_at: string;
}

export interface SatisfactionEngagementProposalList {
  proposals: SatisfactionEngagementProposal[];
  total: number;
  high_priority_count: number;
  cross_domain_count: number;
  generated_at: string;
}

export interface SatisfactionIntelligenceReport {
  health_score: SatisfactionHealthScore | null;
  intelligence: SatisfactionIntelligence | null;
  benchmarks: SatisfactionBenchmarkReport | null;
  proposals: SatisfactionEngagementProposalList | null;
  generated_at: string;
}

// ── AgeGroup Intelligence (F40) ───────────────────────

export interface AgeGroupHealthFactor {
  name: string;
  score: number;
  weight: number;
  weighted_score: number;
  impact: "high" | "medium" | "low";
  detail: string;
}

export interface AgeGroupHealthScore {
  score: number;
  overall_score: number;
  level: MemberHealthLevel;
  factors: AgeGroupHealthFactor[];
  trend: "improving" | "stable" | "declining";
  alerts: string[];
  summary: string;
  generated_at: string;
}

export interface AgeRecommendationEnhanced {
  family_id: string;
  family_name: string;
  children: {
    name: string;
    age: number;
    age_group: string;
    current_activities: string[];
    recommended_activities: {
      activity: string;
      category: string;
      match_score: number;
      reason: string;
    }[];
    developmental_focus: string[];
  }[];
  priority: "high" | "medium" | "low";
  confidence: number;
  cross_sell_opportunities: string[];
  sibling_benefits: string[];
}

export interface AgeGroupTemporalTrend {
  month: string;
  teens_enrolled: number;
  kids_enrolled: number;
  seniors_enrolled: number;
  family_participation: number;
  retention_rate: number;
  new_enrollments: number;
  activities_held: number;
}
export interface AgeDistributionEntry {
  age_range: string;
  count: number;
  percentage: number;
}
export interface ProgramPopularityEntry {
  program: string;
  enrollment_count: number;
  total_enrolled: number;
  capacity: number;
  fill_rate_pct: number;
  satisfaction_avg: number;
  retention_rate: number;
}

export interface AgeGroupAnalyticsEnhanced {
  total_children_enrolled: number;
  total_seniors_enrolled: number;
  teens_enrolled: number;
  kids_enrolled: number;
  family_participation_rate: number;
  retention_rate: number;
  avg_satisfaction: number;
  monthly_trends: AgeGroupTemporalTrend[];
  program_popularity: ProgramPopularityEntry[];
  age_distribution: AgeDistributionEntry[];
  peak_activity_months: string[];
  generated_at: string;
}

export interface AgeGroupEngagementProposal {
  proposal_id: string;
  proposal_type: string;
  title: string;
  description: string;
  target_family_ids: string[];
  target_age_group: string;
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  expected_impact: string;
  effort: "low" | "medium" | "high";
  estimated_revenue: number;
  confidence: number;
  cross_domain_signals: string[];
  suggested_action: {
    action: string;
    domain: string;
    params: Record<string, unknown>;
  };
  created_at: string;
}

export interface AgeGroupEngagementProposalList {
  proposals: AgeGroupEngagementProposal[];
  total: number;
  high_priority_count: number;
  cross_domain_count: number;
  generated_at: string;
}
