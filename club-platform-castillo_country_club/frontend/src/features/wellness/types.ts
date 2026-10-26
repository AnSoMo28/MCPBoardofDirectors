/* ═══════════════════════════════════════════════════════════════
   features/wellness/types.ts
   v36 rewrite — Silver Tide Glass UI

   WellnessAI — Type definitions, configuration maps, and
   score calculation engine for the Castillo Country Club
   wellness intelligence system.

   Derived from: backend/src/club_mcp/models/wellness.py

   Changes v36:
     P1: All configs use CSS vars (var(--color-xxx)) instead of
         CHART_PALETTE hex — theme-aware, light-mode compatible
     P2: WELLNESS_LEVEL_CONFIG gains bgColor per level
     P3: getWellnessLevel derives from config (no hardcoded thresholds)
     P4: classifyActivitySocial derives from ACTIVITY_TYPE_CONFIG
         (SOCIAL_ACTIVITY_TYPES eliminated)
     P5: GOAL_TYPE_CONFIG gains bgColor
     P6: ACTIVITY_TYPE_CONFIG gains color per activity
     P7: WellnessInsights flattened type (no envelope)
     P8: calculateWellnessScore accepts optional periodDays param
     P10: CHART_PALETTE import removed — CSS vars are source of truth
          SVG components that need raw hex should import CHART_PALETTE
          directly from @/shared/lib/chartTheme
   ═══════════════════════════════════════════════════════════════ */

// ── Enums (matching Python backend exactly) ──────────────────

export type WellnessGoalType =
  | 'fitness'
  | 'nutrition'
  | 'mental_health'
  | 'weight'
  | 'flexibility'
  | 'endurance'
  | 'strength'
  | 'custom';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export type ActivityType =
  | 'gym'
  | 'yoga'
  | 'pilates'
  | 'swimming'
  | 'tennis'
  | 'spa'
  | 'personal_training'
  | 'group_class'
  | 'meditation'
  | 'other';

export type ClassLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// ── Core Models (mirrors Pydantic models) ───────────────────

export interface WellnessProfile {
  id: string;
  family_id: string;
  family_name: string;
  fitness_level: ClassLevel;
  health_conditions: string[];
  allergies: string[];
  dietary_restrictions: string[];
  preferred_activities: ActivityType[];
  emergency_contact: string;
  emergency_phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface WellnessGoal {
  id: string;
  family_id: string;
  goal_type: WellnessGoalType;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: GoalStatus;
  target_date: string;
  created_at: string;
}

export interface WellnessActivity {
  id: string;
  family_id: string;
  member_name: string;
  activity_type: ActivityType;
  description: string;
  duration_minutes: number;
  calories_burned: number;
  distance_km: number;
  notes: string;
  date: string;
  created_at: string;
}

export interface WellnessClass {
  id: string;
  name: string;
  description: string;
  activity_type: ActivityType;
  instructor: string;
  level: ClassLevel;
  max_participants: number;
  duration_minutes: number;
  location: string;
  schedule_day: string;
  schedule_time: string;
  enrolled_count: number;
}

export interface ClassAppointment {
  id: string;
  class_id: string;
  class_name: string;
  family_id: string;
  member_name: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
}

export interface WellnessRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  related_class_id: string;
}

export interface WellnessReport {
  period_start: string;
  period_end: string;
  total_activities: number;
  total_minutes: number;
  total_calories: number;
  most_frequent_activity: string;
  activity_breakdown: ActivityBreakdownItem[];
  goals_summary: Record<string, number>;
  streak_days: number;
  summary: string;
}

// ── Activity Breakdown ──────────────────────────────────────

export interface ActivityBreakdownItem {
  activity_type: ActivityType;
  count: number;
  total_minutes: number;
  total_calories: number;
  percentage: number;
}

// ── MCP Response Types (backend tools) ──────────────────────

export interface WellnessProfileGetResponse {
  status: 'success' | 'not_found';
  message: string;
  data?: WellnessProfile;
}

export interface WellnessProfileUpdateResponse {
  status: 'success' | 'error';
  message: string;
  data?: WellnessProfile;
}

export interface WellnessActivityLogResponse {
  status: 'success' | 'error';
  message: string;
  data?: WellnessActivity;
}

export interface WellnessGoalSetResponse {
  status: 'success' | 'error';
  message: string;
  data?: WellnessGoal;
}

export interface WellnessRecommendationsResponse {
  status: 'success';
  message: string;
  data: WellnessRecommendation[];
  total: number;
}

export interface WellnessScheduleClassResponse {
  status: 'pending_approval' | 'error';
  message: string;
  request_id?: string;
  class_name?: string;
  member_name?: string;
}

// ── Intelligence Layer ──────────────────────────────────────

export type EngagementTrend = 'improving' | 'stable' | 'declining';

export interface WellnessPredictions {
  engagement_30d: {
    score: number;
    confidence: number;
    trend: EngagementTrend;
  };
  engagement_60d: {
    score: number;
    confidence: number;
    trend: EngagementTrend;
  };
  engagement_90d: {
    score: number;
    confidence: number;
    trend: EngagementTrend;
  };
}

export interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface RecommendedIntervention {
  action: string;
  expected_impact: string;
  urgency: 'today' | 'this_week' | 'this_month';
  related_class_id?: string;
}

export interface WellnessPredictResponse {
  status: 'success';
  data: {
    family_id: string;
    predictions: WellnessPredictions;
    risk_factors: RiskFactor[];
    recommended_interventions: RecommendedIntervention[];
  };
}

export type AnomalyType =
  | 'sudden_drop'
  | 'gradual_decline'
  | 'monotony'
  | 'post_event_abandon'
  | 'seasonal_pattern'
  | 'social_isolation';

export type AnomalySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WellnessAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  detected_at: string;
  metric: string;
  expected_value: number;
  actual_value: number;
  description: string;
  suggested_action: string;
}

export interface WellnessAlert {
  level: 'critical' | 'warning' | 'info';
  message: string;
  created_at: string;
}

export interface WellnessAnomaliesResponse {
  status: 'success';
  data: {
    family_id: string;
    anomaly_count: number;
    anomalies: WellnessAnomaly[];
    alerts: WellnessAlert[];
  };
}

export interface WellnessCorrelation {
  wellness_to_retention: {
    coefficient: number;
    significance: 'high' | 'medium' | 'low';
  };
  wellness_to_revenue: {
    coefficient: number;
    significance: 'high' | 'medium' | 'low';
  };
  wellness_to_satisfaction: {
    coefficient: number;
    significance: 'high' | 'medium' | 'low';
  };
}

export interface SegmentInsight {
  segment: string;
  wellness_score_range: [number, number];
  avg_monthly_spend_crc: number;
  retention_rate: number;
  nps: number;
  member_count: number;
}

export interface ActivityValueRanking {
  activity: ActivityType;
  avg_participants: number;
  monthly_revenue_impact_crc: number;
  satisfaction_correlation: number;
  churn_risk_reduction: number;
}

export interface WellnessCorrelateResponse {
  status: 'success';
  data: {
    correlations: WellnessCorrelation;
    segment_insights: SegmentInsight[];
    activity_value_ranking: ActivityValueRanking[];
  };
}

export type InsightCategory = 'engagement' | 'risk' | 'opportunity' | 'financial';

export interface WellnessKeyFinding {
  category: InsightCategory;
  finding: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
}

export interface WellnessTrendAnalysis {
  period: string;
  direction: 'improving' | 'stable' | 'declining';
  velocity: string;
  comparison: string;
}

export interface CriticalInsight {
  insight: string;
  confidence: number;
  recommended_action: string;
  deadline?: string;
}

// ── P7: Flattened Insights (no envelope) ────────────────────

export interface WellnessInsights {
  generated_at: string;
  health_score: number;
  executive_summary: string;
  key_findings: WellnessKeyFinding[];
  trend_analysis: WellnessTrendAnalysis;
  critical_insights: CriticalInsight[];
  predictions: {
    next_month_engagement: string;
    churn_risk_members: number;
    growth_opportunity: string;
  };
}

export interface WellnessInsightsResponse {
  status: 'success';
  data: WellnessInsights;
}

// ── Advisor Intelligence (F23) ─────────────────────────────

export type WellnessAdvisorLayer = 'macro' | 'micro' | 'fusion';

export interface WellnessAdvisorAction {
  type: 'mutate';
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approvalLevel: 'auto' | 'semi' | 'hitl';
  label: string;
  confirmMessage: string;
  estimatedImpact: string;
}

export interface WellnessAdvisorInsight {
  id: string;
  layer: WellnessAdvisorLayer;
  impact: 'high' | 'medium' | 'low';
  title: string;
  reasoning: string;
  targetTab?: string;
  confidence: number;
  thresholdContext?: {
    effective: number;
    explanation: string;
  };
  personaId?: string;
  action?: WellnessAdvisorAction;
}

// ── Wellness Personas (F23) ────────────────────────────────

export type WellnessPersonaId =
  | 'athlete'
  | 'zen_seeker'
  | 'social_butterfly'
  | 'weekend_warrior'
  | 'recoverer'
  | 'explorer'
  | 'dormant'
  | 'newcomer';

export interface WellnessPersona {
  id: WellnessPersonaId;
  label: string;
  description: string;
  icon: string;
  crossDomain: {
    events: string[];
    finance: string[];
    communications: string[];
  };
  riskFactors: string[];
}

// ── Frontend Score Engine Types ─────────────────────────────

export type ScoreDimensionId =
  | 'activity'
  | 'consistency'
  | 'variety'
  | 'social'
  | 'trend';

export interface ScoreDimension {
  id: ScoreDimensionId;
  label: string;
  score: number;
  weight: number;
  color: string;
  description: string;
}

export type WellnessLevel =
  | 'critical'
  | 'low'
  | 'moderate'
  | 'good'
  | 'excellent';

export interface WellnessScoreData {
  composite: number;
  dimensions: ScoreDimension[];
  level: WellnessLevel;
  trend: number;
  total_activities: number;
  period_days: number;
}

// ═══════════════════════════════════════════════════════════════
// §7  CONFIGURATION MAPS
// P1: All colors use CSS vars — theme-aware
// P2: bgColor added to level config
// P5: bgColor added to goal config
// P6: color added to activity config
// P10: SVG components needing raw hex should import
//      CHART_PALETTE directly from @/shared/lib/chartTheme
// ═══════════════════════════════════════════════════════════════

export const WELLNESS_LEVEL_CONFIG: Record<
  WellnessLevel,
  { label: string; range: [number, number]; color: string; bgColor: string }
> = {
  critical: {
    label: 'Crítico',
    range: [0, 30],
    color: 'var(--color-rose-400)',
    bgColor: 'color-mix(in srgb, var(--color-rose-400) 12%, transparent)',
  },
  low: {
    label: 'Bajo',
    range: [30, 50],
    color: 'var(--color-amber-400)',
    bgColor: 'color-mix(in srgb, var(--color-amber-400) 12%, transparent)',
  },
  moderate: {
    label: 'Moderado',
    range: [50, 70],
    color: 'var(--color-emerald-400)',
    bgColor: 'color-mix(in srgb, var(--color-emerald-400) 12%, transparent)',
  },
  good: {
    label: 'Bueno',
    range: [70, 85],
    color: 'var(--color-teal-400)',
    bgColor: 'color-mix(in srgb, var(--color-teal-400) 12%, transparent)',
  },
  excellent: {
    label: 'Excelente',
    range: [85, 101],
    color: 'var(--color-gold-400)',
    bgColor: 'color-mix(in srgb, var(--color-gold-400) 12%, transparent)',
  },
};

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; social: boolean; category: string; color: string }
> = {
  gym: {
    label: 'Gimnasio',
    icon: 'Dumbbell',
    social: false,
    category: 'fitness',
    color: 'var(--color-emerald-400)',
  },
  yoga: {
    label: 'Yoga',
    icon: 'Flower2',
    social: true,
    category: 'mind_body',
    color: 'var(--color-teal-400)',
  },
  pilates: {
    label: 'Pilates',
    icon: 'Activity',
    social: true,
    category: 'mind_body',
    color: 'var(--color-teal-400)',
  },
  swimming: {
    label: 'Natación',
    icon: 'Waves',
    social: false,
    category: 'fitness',
    color: 'var(--color-emerald-400)',
  },
  tennis: {
    label: 'Tenis',
    icon: 'Circle',
    social: true,
    category: 'sport',
    color: 'var(--color-amber-400)',
  },
  spa: {
    label: 'Spa',
    icon: 'Sparkles',
    social: false,
    category: 'recovery',
    color: 'var(--color-gold-400)',
  },
  personal_training: {
    label: 'Entrenamiento Personal',
    icon: 'UserCheck',
    social: false,
    category: 'fitness',
    color: 'var(--color-emerald-400)',
  },
  group_class: {
    label: 'Clase Grupal',
    icon: 'Users',
    social: true,
    category: 'social',
    color: 'var(--color-sage-400)',
  },
  meditation: {
    label: 'Meditación',
    icon: 'Brain',
    social: false,
    category: 'mind_body',
    color: 'var(--color-teal-400)',
  },
  other: {
    label: 'Otra',
    icon: 'MoreHorizontal',
    social: false,
    category: 'fitness',
    color: 'var(--color-silver-400)',
  },
};

export const GOAL_TYPE_CONFIG: Record<
  WellnessGoalType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  fitness: {
    label: 'Fitness',
    icon: 'Dumbbell',
    color: 'var(--color-emerald-400)',
    bgColor: 'color-mix(in srgb, var(--color-emerald-400) 12%, transparent)',
  },
  nutrition: {
    label: 'Nutrición',
    icon: 'Apple',
    color: 'var(--color-sage-400)',
    bgColor: 'color-mix(in srgb, var(--color-sage-400) 12%, transparent)',
  },
  mental_health: {
    label: 'Salud Mental',
    icon: 'Brain',
    color: 'var(--color-teal-400)',
    bgColor: 'color-mix(in srgb, var(--color-teal-400) 12%, transparent)',
  },
  weight: {
    label: 'Peso',
    icon: 'Scale',
    color: 'var(--color-amber-400)',
    bgColor: 'color-mix(in srgb, var(--color-amber-400) 12%, transparent)',
  },
  flexibility: {
    label: 'Flexibilidad',
    icon: 'Move',
    color: 'var(--color-gold-400)',
    bgColor: 'color-mix(in srgb, var(--color-gold-400) 12%, transparent)',
  },
  endurance: {
    label: 'Resistencia',
    icon: 'Heart',
    color: 'var(--color-terracotta-400)',
    bgColor: 'color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)',
  },
  strength: {
    label: 'Fuerza',
    icon: 'Zap',
    color: 'var(--color-rose-400)',
    bgColor: 'color-mix(in srgb, var(--color-rose-400) 12%, transparent)',
  },
  custom: {
    label: 'Personalizado',
    icon: 'Target',
    color: 'var(--color-silver-400)',
    bgColor: 'color-mix(in srgb, var(--color-silver-400) 12%, transparent)',
  },
};

export const SCORE_DIMENSION_DEFAULTS: Omit<ScoreDimension, 'score'>[] = [
  {
    id: 'activity',
    label: 'Actividad',
    weight: 0.3,
    color: 'var(--color-emerald-400)',
    description: 'Frecuencia de actividades en los últimos 30 días',
  },
  {
    id: 'consistency',
    label: 'Consistencia',
    weight: 0.25,
    color: 'var(--color-teal-400)',
    description: 'Regularidad y racha de asistencia',
  },
  {
    id: 'variety',
    label: 'Variedad',
    weight: 0.15,
    color: 'var(--color-gold-400)',
    description: 'Diversidad de tipos de actividad',
  },
  {
    id: 'social',
    label: 'Social',
    weight: 0.15,
    color: 'var(--color-sage-400)',
    description: 'Participación en actividades grupales',
  },
  {
    id: 'trend',
    label: 'Tendencia',
    weight: 0.15,
    color: 'var(--color-terracotta-400)',
    description: 'Dirección del progreso vs período anterior',
  },
];

// ═══════════════════════════════════════════════════════════════
// §8  SCORE CALCULATION ENGINE
// P3: getWellnessLevel derives from WELLNESS_LEVEL_CONFIG
// P4: classifyActivitySocial derives from ACTIVITY_TYPE_CONFIG
// P8: calculateWellnessScore accepts optional periodDays
// ═══════════════════════════════════════════════════════════════

// P4: Single source of truth — derive from ACTIVITY_TYPE_CONFIG
export function classifyActivitySocial(type: ActivityType): boolean {
  return ACTIVITY_TYPE_CONFIG[type]?.social ?? false;
}

// P3: Config-driven level classification
export function getWellnessLevel(score: number): WellnessLevel {
  // Iterate config: ranges are [min, max) except last which is [85, 101]
  const levels = Object.entries(WELLNESS_LEVEL_CONFIG) as [
    WellnessLevel,
    (typeof WELLNESS_LEVEL_CONFIG)[WellnessLevel],
  ][];

  for (const [key, cfg] of levels) {
    if (score >= cfg.range[0] && score < cfg.range[1]) {
      return key;
    }
  }

  // Score === 100 falls outside [85, 101) check — guarantee excellent
  return 'excellent';
}

/**
 * Composite Wellness Score — multi-dimensional engine.
 *
 * Activity    (30%): target 12/month (3 per week)
 * Consistency (25%): streak relative to 14-day benchmark
 * Variety     (15%): unique types / 6 max
 * Social      (15%): proportion of group/social activities
 * Trend       (15%): current vs previous × 50 (50 = same)
 *
 * P8: periodDays parameter (default 30)
 */
export function calculateWellnessScore(
  report: WellnessReport,
  previousReport?: WellnessReport,
  periodDays: number = 30,
): WellnessScoreData {
  const { total_activities, streak_days, activity_breakdown } = report;

  // Activity: 12/month target, capped at 100
  const activityScore = Math.min(100, (total_activities / 12) * 100);

  // Consistency: 14-day streak = full marks
  const consistencyScore = Math.min(100, (streak_days / 14) * 100);

  // Variety: 6 distinct types = full marks
  const uniqueTypes = activity_breakdown.length;
  const varietyScore = Math.min(100, (uniqueTypes / 6) * 100);

  // Social: proportion of social activities (P4: derived from config)
  const socialCount = activity_breakdown
    .filter((item) => classifyActivitySocial(item.activity_type))
    .reduce((sum, item) => sum + item.count, 0);
  const totalCount = activity_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const socialScore = totalCount > 0 ? (socialCount / totalCount) * 100 : 0;

  // Trend: ratio × 50 — 50 is neutral (same as previous)
  let trendScore = 50;
  if (previousReport && previousReport.total_activities > 0) {
    const ratio = total_activities / previousReport.total_activities;
    trendScore = Math.min(100, ratio * 50);
  }

  const dimensions: ScoreDimension[] = [
    { ...SCORE_DIMENSION_DEFAULTS[0], score: Math.round(activityScore) },
    { ...SCORE_DIMENSION_DEFAULTS[1], score: Math.round(consistencyScore) },
    { ...SCORE_DIMENSION_DEFAULTS[2], score: Math.round(varietyScore) },
    { ...SCORE_DIMENSION_DEFAULTS[3], score: Math.round(socialScore) },
    { ...SCORE_DIMENSION_DEFAULTS[4], score: Math.round(trendScore) },
  ];

  const composite = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  const level = getWellnessLevel(composite);

  const trend = previousReport
    ? total_activities - previousReport.total_activities
    : 0;

  return {
    composite,
    dimensions,
    level,
    trend,
    total_activities,
    period_days: periodDays,
  };
}

// ═══════════════════════════════════════════════════════════════
// §9  ACTIVITY CATEGORY PREDICATES (P2)
// Single source of truth for activity classification.
// Used by useWellnessAdvisor + wellnessPersonas.
// ═══════════════════════════════════════════════════════════════

export function isHighIntensity(type: ActivityType): boolean {
  const cat = ACTIVITY_TYPE_CONFIG[type]?.category;
  return cat === "fitness" || cat === "sport";
}

export function isRecovery(type: ActivityType): boolean {
  const cat = ACTIVITY_TYPE_CONFIG[type]?.category;
  return cat === "recovery" || cat === "mind_body";
}

export function isSocial(type: ActivityType): boolean {
  return ACTIVITY_TYPE_CONFIG[type]?.social ?? false;
}

// ═══════════════════════════════════════════════════════════════
// §10  DASHBOARD MODE (P1)
// Shared across all wellness components via data-mode attribute.
// ═══════════════════════════════════════════════════════════════

export type WellnessMode = "calm" | "alert" | "critical";