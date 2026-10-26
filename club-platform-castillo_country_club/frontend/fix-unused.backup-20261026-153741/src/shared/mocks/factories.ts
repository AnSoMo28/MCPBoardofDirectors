// src/shared/mocks/factories.ts
// ═══════════════════════════════════════════════════════════
// Mock Factory Functions — Castillo Country Club
//
// Each factory returns data satisfying its contract.
// TypeScript enforces the shape at compile time.
//
// To add a new mock:
//   1. Define the contract in contracts.ts
//   2. Create a factory here that satisfies it
//   3. Register in mock-registry.ts
//
// To migrate to backend:
//   1. Delete the factory registration from mock-registry.ts
//   2. Done. Frontend code unchanged.
// ═══════════════════════════════════════════════════════════
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import type {
  get_financial_summary_Contract,
  generate_ai_analysis_financial_Contract,
  generate_ai_analysis_engagement_Contract,
  get_engagement_dashboard_Contract,
  wellness_report_Contract,
  get_satisfaction_trends_Contract,
  identify_social_clusters_Contract,
  generate_quarterly_insights_Contract,
  detect_scheduling_conflicts_Contract,
  broadcast_club_announcement_Contract,
  manage_emergency_broadcast_Contract,
  manage_notification_templates_list_Contract,
  schedule_notification_list_Contract,
  get_notification_history_Contract,
  list_announcements_Contract,
  get_communication_analytics_Contract,
  send_board_package_Contract,
  get_pending_approvals_Contract,
  approve_request_Contract,
  reject_request_Contract,
  ComplianceAlertListResponse,
  DetectAnomaliesResponse,
  wellness_goal_list_Contract,
  CommunicationInsightDimension_Contract,
  get_communication_health_Contract,
  get_campaign_performance_Contract,
  CampaignPerformanceData_Contract,
  ManageCourtReservations_Contract,
  OrganizeTournament_Contract,
  ManageFitnessClasses_Contract,
  CoordinateCoaching_Contract,
  ManageSportLeagues_Contract,
  GetEquipmentAvailability_Contract,
  GetSportsRecommendations_Contract,
  GetSportsAnalytics_Contract,
  GetSportsHealthSummary_Contract,
  GetSportsCalendar_Contract,
  GenerateSportsProposals_Contract,
  // ── Types renamed to match old usage (aliases) ──
  ExecutiveSummaryResponse,
  communications_generate_personalized_Contract as CommunicationsGeneratePersonalizedResponse,
  communications_campaign_generate_Contract as CommunicationsCampaignGenerateResponse,
  communications_sentiment_analyze_Contract as CommunicationsSentimentAnalyzeResponse,
  personalize_communication_Contract as PersonalizeCommunicationResponse,
  event_list_Contract as EventListMockResponse,
  event_detail_Contract as EventDetailMockResponse,
  event_create_Contract as EventCreateMockResponse,
  event_update_Contract as EventUpdateMockResponse,
  AiExecutiveReport,
  FinanceStressTestResponse,
  FinanceSeasonalCalendarResponse,
  FinanceNarrativeGenerateResponse,
  ExportReportResponse,

  get_family_Contract as FamilyDetailMockResponse,
  family_create_Contract as FamilyCreateMockResponse,
  family_update_profile_Contract as FamilyUpdateMockResponse,
  get_activity_history_Contract as ActivityHistoryMockResponse,
  family_social_graph_enriched_Contract as SocialGraphMockResponse,
  family_churn_prediction_Contract as FamilyChurnPredictionMockResponse,
  family_activity_recommendations_Contract as FamilyActivityRecommendationsMockResponse,
  family_social_match_Contract as FamilySocialMatchMockResponse,
  family_engagement_plan_Contract as FamilyEngagementPlanMockResponse,
  family_set_preferences_Contract as FamilyPreferencesMockResponse,  
} from "./contracts";

import type {
  MembersHealthScoreResponse,
  MembersSegmentationResponse,
  MembersLifetimeValueResponse,
  MembersChurnPreventionResponse,
} from "@/features/members/types";

import type { FinanceDecisionSimulateResponse } from "@/features/finance/types";
import type { FinanceMemberProfitabilityResponse } from "./contracts";


import {
  InsightPeriod,
  SuggestionStatus,
  type SchedulingConflictsResponse,
  type QuarterlyInsightGetResponse,
  type RecommendationType,
  type RecommendationPriority,
} from "@/features/recommendations/types";

// ── Helpers ──

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

// ═══════════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD
// ═══════════════════════════════════════════════════════════

export function createExecutiveSummary(): ExecutiveSummaryResponse {
  return {
    status: "success",
    message: "Resumen ejecutivo generado.",
    summary: {
      period: "current_quarter" as unknown as import("@/features/dashboard/types").DashboardPeriod,
      kpis: {
        revenue: 125_000_000,
        revenueChange: 8.3,
        revenueSparkline: [95, 98, 102, 100, 110, 108, 115, 112, 118, 116, 122, 125],
        families: 145,
        familiesChange: 3.2,
        engagement: 78.5,
        engagementChange: -2.1,
        engagementSparkline: [82, 81, 80, 79, 78, 77, 78, 79, 78.5, 78, 78.5, 78.5],
        nps: 72,
        npsChange: -5.0,
        facilityUtilization: 61.5,
        facilityChange: 4.1,
        events: 45,
        eventsChange: 12.5,
      },
      revenue_trend: [
        { month: "Ene", revenue: 38_000_000, previousYear: 35_000_000 },
        { month: "Feb", revenue: 42_000_000, previousYear: 37_000_000 },
        { month: "Mar", revenue: 45_000_000, previousYear: 40_000_000 },
      ],
      membership_tiers: [
        { tier: "platino", count: 187, color: CHART_PALETTE.silver },
        { tier: "oro", count: 374, color: CHART_PALETTE.gold },
        { tier: "plata", count: 436, color: "#8A95A5" },
        { tier: "bronce", count: 250, color: CHART_PALETTE.terracotta },
      ],
      top_activities: [
        { name: "Tenis", participants: 450, change: 12.5, icon: "🎾" },
        { name: "Piscina", participants: 380, change: 8.3, icon: "🏊" },
        { name: "Yoga", participants: 290, change: 15.2, icon: "🧘" },
        { name: "Golf", participants: 210, change: -3.1, icon: "⛳" },
        { name: "Gimnasio", participants: 195, change: 6.7, icon: "💪" },
      ],
      anomalies: [
        {
          id: "anom-1", title: "Churn de membresías elevado",
          description: "12 familias en riesgo de cancelación.", severity: "high",
          detectedAt: hoursAgo(2), category: "membership",
          recommendation: "Contactar familias con oferta de reconexión.",
        },
        {
          id: "anom-2", title: "Sobrecosto en F&B",
          description: "Gastos de F&B superan presupuesto en 18%.", severity: "high",
          detectedAt: hoursAgo(5), category: "finance",
          recommendation: "Implementar mínimo de consumo para eventos privados.",
        },
      ],
      hitl_queue: [
        {
          id: "hitl-1", title: "Presupuesto renovación canchas",
          description: "₡35M para renovación.", requestedBy: "Carlos Mendoza",
          requestedAt: hoursAgo(3), priority: "high", type: "budget",
        },
      ],
      age_balance: [
        { ageGroup: "children", label: "Niños (0-12)", color: CHART_PALETTE.sage, memberCount: 412, memberPct: 18.2, activityPct: 15.5 },
        { ageGroup: "youth", label: "Jóvenes (13-17)", color: CHART_PALETTE.teal, memberCount: 234, memberPct: 10.3, activityPct: 12.8 },
        { ageGroup: "young_adult", label: "Adultos (18-35)", color: CHART_PALETTE.gold, memberCount: 548, memberPct: 24.2, activityPct: 28.5 },
        { ageGroup: "adult", label: "Profesionales (36-55)", color: CHART_PALETTE.terracotta, memberCount: 687, memberPct: 30.3, activityPct: 26.1 },
        { ageGroup: "senior", label: "Seniors (56+)", color: CHART_PALETTE.rose, memberCount: 386, memberPct: 17.0, activityPct: 17.1 },
      ],
      gini_coefficient: 0.21,
      yoy_comparison: {
        revenue: { current: 125_000_000, previous: 115_000_000, change_pct: 8.7 },
        families: { current: 145, previous: 140, change_pct: 3.6 },
        engagement: { current: 78.5, previous: 80.2, change_pct: -2.1 },
      },
    },
  } as unknown as ExecutiveSummaryResponse;
}

// ═══════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════

export function createFinancialSummary(): get_financial_summary_Contract {
  return {
    status: "success",
    message: "Resumen financiero generado.",
    data: {
      period: "current_quarter",
      revenue_total: 125_000_000,
      expenses_total: 89_500_000,
      net_income: 35_500_000,
      operating_margin_pct: 28.4,
      collection_ratio_pct: 94.2,
      budget_variance_pct: -3.1,
      monthly_trend: [
        { month: "Ene", revenue: 38_000_000, expenses: 29_500_000, net: 8_500_000 },
        { month: "Feb", revenue: 42_000_000, expenses: 30_000_000, net: 12_000_000 },
        { month: "Mar", revenue: 45_000_000, expenses: 30_000_000, net: 15_000_000 },
      ],
      expense_breakdown: [
        { category: "Personal", amount: 35_000_000, percentage: 39.1, variance_pct: 2.3 },
        { category: "Mantenimiento", amount: 18_000_000, percentage: 20.1, variance_pct: -5.2 },
        { category: "F&B", amount: 15_500_000, percentage: 17.3, variance_pct: 18.4 },
        { category: "Servicios", amount: 12_000_000, percentage: 13.4, variance_pct: 1.1 },
        { category: "Marketing", amount: 9_000_000, percentage: 10.1, variance_pct: -8.7 },
      ],
      revenue_by_source: [
        { source: "Cuotas", amount: 62_000_000, percentage: 49.6 },
        { source: "F&B", amount: 25_000_000, percentage: 20.0 },
        { source: "Deportes", amount: 18_000_000, percentage: 14.4 },
        { source: "Eventos", amount: 12_000_000, percentage: 9.6 },
        { source: "Spa", amount: 8_000_000, percentage: 6.4 },
      ],
      cash_position: 45_000_000,
      accounts_receivable: 18_500_000,
      accounts_receivable_aging: [
        { bucket: "0-30 días", amount: 8_200_000, count: 45 },
        { bucket: "31-60 días", amount: 5_100_000, count: 22 },
        { bucket: "61-90 días", amount: 3_200_000, count: 12 },
        { bucket: "90+ días", amount: 2_000_000, count: 8 },
      ],
    },
  };
}

export function createFinancialAIReport(): generate_ai_analysis_financial_Contract {
  return {
    status: "success",
    message: "Análisis AI financiero generado.",
    data: {
      report_type: "financial",
      generated_at: new Date().toISOString(),
      health_score: {
        score: 78,
        grade: "B+",
        factors: [
          { name: "Liquidez", score: 82, weight: 0.20, detail: "Posición de caja adecuada" },
          { name: "Eficiencia", score: 75, weight: 0.25, detail: "Margen operacional saludable" },
          { name: "Crecimiento", score: 80, weight: 0.20, detail: "Revenue creciendo 8.3% YoY" },
          { name: "Cobranza", score: 72, weight: 0.20, detail: "Collection ratio 94.2%" },
          { name: "Presupuesto", score: 68, weight: 0.15, detail: "F&B sobre presupuesto" },
        ],
      },
      cash_flow_forecast: {
        months: 6,
        periods: [
          { month: "Abr", projected_revenue: 43_000_000, projected_expenses: 30_500_000, net_cash_flow: 12_500_000, cumulative_balance: 57_500_000, confidence_high: 62_000_000, confidence_low: 53_000_000 },
          { month: "May", projected_revenue: 46_000_000, projected_expenses: 31_000_000, net_cash_flow: 15_000_000, cumulative_balance: 72_500_000, confidence_high: 78_000_000, confidence_low: 67_000_000 },
          { month: "Jun", projected_revenue: 39_000_000, projected_expenses: 29_000_000, net_cash_flow: 10_000_000, cumulative_balance: 82_500_000, confidence_high: 90_000_000, confidence_low: 75_000_000 },
        ],
      },
      revenue_concentration: {
        hhi: 0.32,
        diversification_index: 0.78,
        top_sources: [
          { source: "Cuotas", percentage: 49.6, amount: 62_000_000, trend: "stable" },
          { source: "F&B", percentage: 20.0, amount: 25_000_000, trend: "growing" },
          { source: "Deportes", percentage: 14.4, amount: 18_000_000, trend: "growing" },
        ],
      },
      anomalies: [
        { type: "expense_spike", description: "F&B 18% sobre presupuesto", severity: "high", amount: 2_800_000, date: daysAgo(5) },
        { type: "collection_drop", description: "Cobranza bajó 3pp", severity: "medium", amount: 1_500_000, date: daysAgo(12) },
      ],
      recommendations: [
        { category: "Costos", recommendation: "Implementar mínimo de consumo para eventos privados", impact: "₡2.8M/mes", priority: "high", estimated_savings: 2_800_000 },
        { category: "Revenue", recommendation: "Lanzar membresía familiar junior", impact: "₡1.5M/mes", priority: "medium", estimated_savings: 1_500_000 },
      ],
      positive_trends: [
        { trend: "Revenue creciendo 8.3% YoY", impact: "₡10M adicionales proyectados" },
      ],
      alert_signals: [
        { signal: "F&B sobre presupuesto", urgency: "high", action_required: "Revisar contratos de eventos" },
      ],
      projection: {
        next_quarter_revenue: 138_000_000,
        next_quarter_expenses: 92_000_000,
        year_end_balance: 65_000_000,
        narrative: "Proyección positiva con riesgo en F&B.",
        risk_factors: ["F&B sobrecosto", "Estacionalidad verano"],
      },
      member_economics: {
        arpu_monthly: 71_700,
        cac: 150_000,
        ltv: 25_800_000,
        ltv_cac_ratio: 172,
        by_tier: [
          { tier: "platino", arpu: 125_000, churn_rate_pct: 1.2, ltv: 62_500_000 },
          { tier: "oro", arpu: 85_000, churn_rate_pct: 2.5, ltv: 20_400_000 },
          { tier: "plata", arpu: 55_000, churn_rate_pct: 4.1, ltv: 8_050_000 },
          { tier: "bronce", arpu: 38_000, churn_rate_pct: 6.8, ltv: 3_350_000 },
        ],
      },
    },
  };
}

export function createEngagementAIReport(): generate_ai_analysis_engagement_Contract {
  return {
    status: "success",
    message: "Análisis AI de engagement generado.",
    data: {
      health_summary: {
        avg_engagement_score: 72.5,
        retention_rate_pct: 91.3,
        trend: "Ligeramente descendente (-2.1% vs trimestre anterior)",
        active_member_pct: 78.5,
        wellness_participation_pct: 34.2,
      },
      churn_analysis: {
        at_risk_count: 23,
        predicted_churn_90d: 8,
        churn_probability_distribution: [
          { range: "0-20%", count: 120 },
          { range: "20-40%", count: 35 },
          { range: "40-60%", count: 15 },
          { range: "60-80%", count: 8 },
          { range: "80-100%", count: 5 },
        ],
        primary_churn_drivers: ["Baja asistencia a eventos", "Sin actividad reciente", "Pagos atrasados"],
      },
      critical_families: [
        { family_name: "Familia Rodríguez", risk_score: 92, reason: "Sin visitas en 45 días", recommendation: "Llamada personal del gerente", estimated_value_at_risk: 8_500_000 },
        { family_name: "Familia Chen", risk_score: 85, reason: "Score engagement bajó 40% en 2 meses", recommendation: "Invitación a evento exclusivo", estimated_value_at_risk: 6_200_000 },
      ],
      engagement_insights: {
        best_day_to_engage: "Jueves",
        best_time_to_engage: "18:00-20:00",
        most_responsive_channel: "WhatsApp",
        top_3_drivers: ["Eventos sociales", "Clases de bienestar", "Promociones de temporada"],
      },
      retention_strategies: [
        { strategy: "Programa de reconexión personalizada", target_segment: "Familias at-risk", impact_estimate: "Recuperar 5-8 familias/trimestre", timeline: "4-6 semanas" },
        { strategy: "Evento exclusivo para dormantes", target_segment: "Familias inactivas 60+ días", impact_estimate: "Reactivar 3-5 familias", timeline: "2-3 semanas" },
      ],
      activity_recommendations: [
        { activity: "Padel nocturno", reason: "Demanda creciente en segmento 30-45", estimated_demand: "Alto", investment_estimate: 5_000_000, roi_timeline: "8-12 meses" },
      ],
      financial_impact: {
        at_risk_annual_revenue: 42_000_000,
        projected_churn_cost: 18_500_000,
        recommended_retention_budget: 3_500_000,
        expected_roi: 5.3,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT DASHBOARD
// ═══════════════════════════════════════════════════════════

export function createEngagementDashboard(): get_engagement_dashboard_Contract {
  return {
    status: "success",
    message: "Dashboard de engagement cargado.",
    summary: {
      total_families: 268,
      total_members: 847,
      active_30d: 198,
      active_90d: 241,
      avg_score: 72.5,
      at_risk_count: 23,
      dormant_count: 18,
      improving_count: 34,
      declining_count: 21,
      nps_score: 72,
      wellness_participation_pct: 34.2,
      referral_rate_pct: 8.5,
      facility_usage_pct: 61.5,
    },
    level_distribution: [
      { level: "highly_engaged", count: 45, percentage: 16.8 },
      { level: "engaged", count: 82, percentage: 30.6 },
      { level: "moderate", count: 95, percentage: 35.4 },
      { level: "disengaged", count: 28, percentage: 10.4 },
      { level: "inactive", count: 18, percentage: 6.7 },
    ],
    monthly_trend: [
      { month: "2025-01", label: "Ene", avg_score: 74.2, active_pct: 82, at_risk_pct: 8, dormant_pct: 3 },
      { month: "2025-02", label: "Feb", avg_score: 73.8, active_pct: 80, at_risk_pct: 9, dormant_pct: 3 },
      { month: "2025-03", label: "Mar", avg_score: 72.5, active_pct: 78, at_risk_pct: 10, dormant_pct: 4 },
    ],
    risk_factors: [
      { factor: "low_attendance", label: "Baja asistencia", count: 15, percentage: 35 },
      { factor: "no_recent_activity", label: "Sin actividad reciente", count: 12, percentage: 28 },
      { factor: "declining_usage", label: "Uso decreciente", count: 8, percentage: 19 },
      { factor: "payment_delays", label: "Retrasos en pagos", count: 5, percentage: 12 },
    ],
    trend_summary: {
      improving: 34,
      stable: 195,
      declining: 21,
    },
    families: [
      { family_id: "fam-001", family_name: "Familia González", engagement_score: 92, engagement_level: "highly_engaged", trend: "improving", trend_pct: 5.2, last_activity_label: "Hace 2 días", visits_30d: 12, wellness_active: true, nps_contribution: 9 },
      { family_id: "fam-002", family_name: "Familia Rodríguez", engagement_score: 35, engagement_level: "disengaged", trend: "declining", trend_pct: -18.3, last_activity_label: "Hace 45 días", visits_30d: 0, wellness_active: false, nps_contribution: 4 },
      { family_id: "fam-003", family_name: "Familia Chen", engagement_score: 68, engagement_level: "moderate", trend: "stable", trend_pct: 0.5, last_activity_label: "Hace 7 días", visits_30d: 4, wellness_active: true, nps_contribution: 7 },
      { family_id: "fam-004", family_name: "Familia Mora", engagement_score: 85, engagement_level: "engaged", trend: "improving", trend_pct: 8.1, last_activity_label: "Hace 1 día", visits_30d: 9, wellness_active: true, nps_contribution: 8 },
      { family_id: "fam-005", family_name: "Familia Jiménez", engagement_score: 15, engagement_level: "inactive", trend: "declining", trend_pct: -42.0, last_activity_label: "Hace 90+ días", visits_30d: 0, wellness_active: false, nps_contribution: null },
    ],
    pagination: { total: 268, page: 1, page_size: 10, total_pages: 27 },
  };
}
export function createExecutiveAiAnalysis(): AiExecutiveReport {
  return {
    scope: "executive",
    executive_summary:
      "El Castillo Country Club muestra salud operacional sólida con un score global de 74/100. " +
      "La membresía crece 4.2% YoY con retención del 91.3%. Riesgo principal: presión en márgenes " +
      "de F&B (+18% sobre presupuesto) que impacta flujo de caja proyectado. Oportunidad: " +
      "lanzamiento de membresía familiar junior podría generar ₡1.5M/mes adicionales.",
    risk_score: {
      value: 5,
      max: 10,
      factors: [
        "F&B sobre presupuesto",
        "Cobranza bajó 3pp",
        "Churn segmento bronce 6.8%",
        "Estacionalidad verano",
      ],
    },
    trend: "stable",
    confidence: 0.82,
    horizon_days: 90,
    cross_domain_insights: [
      {
        domains: ["finance", "engagement"],
        insight:
          "Familias con engagement score <50 tienen 3.2x más probabilidad de churn y representan ₡42M de revenue anual en riesgo",
        correlation:
          "Correlación negativa fuerte (r=-0.78) entre asistencia a eventos y probabilidad de churn",
      },
      {
        domains: ["events", "satisfaction"],
        insight:
          "Eventos sociales los jueves 18-20h tienen 40% más asistencia que otros horarios",
        correlation:
          "Satisfaction score sube 12pp en socios que asisten a 3+ eventos/mes",
      },
      {
        domains: ["finance", "operations"],
        insight:
          "Utilización de instalaciones deportivas al 72% genera cuellos de botja en horario pico (17-20h)",
        correlation:
          "Margen F&B cae 8pp cuando ocupación supera 85% por sobrecarga operativa",
      },
    ],
    risk_alerts: [
      {
        severity: "high",
        title: "Presión en márgenes de F&B",
        description:
          "Costos de alimentos subieron 18% vs presupuesto. Contratos con proveedores requieren renegociación antes de temporada alta.",
        affected_segment: "Operaciones",
      },
      {
        severity: "medium",
        title: "Churn acelerado en segmento bronce",
        description:
          "6.8% churn rate en tier bronce vs 4.1% promedio. 23 familias en riesgo alto (score >80).",
        affected_segment: "Membresías bronce",
      },
      {
        severity: "medium",
        title: "Cobranza en descenso",
        description:
          "Collection rate bajó de 97.2% a 94.2% en el último trimestre. ₡1.5M en mora 30+ días.",
        affected_segment: "Cuentas por cobrar",
      },
    ],
    recommendations: [
      {
        priority: "high",
        action: "Renegociar contratos de proveedores F&B",
        justification:
          "18% sobre presupuesto impacta margen operacional. Benchmark regional sugiere ahorro de 8-12%.",
        estimated_impact: "₡2.8M/mes en ahorro",
        domain: "finance",
      },
      {
        priority: "high",
        action: "Programa de reconexión para familias at-risk",
        justification:
          "23 familias con churn probability >60%. Valor en riesgo: ₡42M/año.",
        estimated_impact: "Recuperar 5-8 familias/trimestre",
        domain: "engagement",
      },
      {
        priority: "medium",
        action: "Lanzar membresía familiar junior",
        justification:
          "Demanda creciente en segmento 30-45 con hijos. Sin opción actual de membresía adaptada.",
        estimated_impact: "₡1.5M/mes nuevos ingresos",
        domain: "membership",
      },
    ],
    projection: {
      method: "Regresión multivariada + estacionalidad",
      confidence: 0.78,
      optimistic: "₡148M revenue Q2, margen neto 32%",
      base: "₡138M revenue Q2, margen neto 28%",
      pessimistic: "₡125M revenue Q2, margen neto 22%",
    },
    suggested_actions: [
      {
        label: "Revisar contratos F&B",
        action_type: "review",
        target: "Proveedores principales",
        priority: "high",
      },
      {
        label: "Llamadas a familias at-risk",
        action_type: "contact",
        target: "23 familias con churn score >60",
        priority: "high",
      },
      {
        label: "Reunión comité de membresía",
        action_type: "meeting",
        target: "Propuesta membresía junior",
        priority: "medium",
      },
      {
        label: "Reporte de cobranza Q1",
        action_type: "report",
        target: "Cuentas 30+ días",
        priority: "medium",
      },
    ],
  };
}
// ═══════════════════════════════════════════════════════════
// WELLNESS
// ═══════════════════════════════════════════════════════════

export function createWellnessReport(): wellness_report_Contract {
  return {
    status: "success",
    message: "Participación en wellness creció 12% vs trimestre anterior. Gimnasio y natación lideran.",
    period_start: "2025-01-01",
    period_end: "2025-03-31",
    total_activities: 18,
    total_minutes: 1_260,
    total_calories: 48_500,
    most_frequent_activity: "Gimnasio",
    activity_breakdown: [
      { activity: "Gimnasio", count: 6, percentage: 33.3 },
      { activity: "Natación", count: 4, percentage: 22.2 },
      { activity: "Yoga", count: 3, percentage: 16.7 },
      { activity: "Tenis", count: 2, percentage: 11.1 },
      { activity: "Spa", count: 2, percentage: 11.1 },
      { activity: "Clase grupal", count: 1, percentage: 5.6 },
    ],
    goals_summary: {
      active: 3,
      completed: 2,
      paused: 1,
      abandoned: 0,
    },
    streak_days: 14,
    summary: "Participación en wellness creció 12% vs trimestre anterior. Gimnasio y natación lideran.",
  };
}

// ═══════════════════════════════════════════════════════════
// SATISFACTION
// ═══════════════════════════════════════════════════════════

export function createSatisfactionTrends(): get_satisfaction_trends_Contract {
  return {
    status: "success",
    message: "Tendencias de satisfacción cargadas.",
    data: {
      current_nps: 72,
      nps_trend: [
        { period: "Q1 2024", nps: 68, promoters_pct: 72, detractors_pct: 14 },
        { period: "Q2 2024", nps: 70, promoters_pct: 74, detractors_pct: 12 },
        { period: "Q3 2024", nps: 74, promoters_pct: 78, detractors_pct: 10 },
        { period: "Q4 2024", nps: 72, promoters_pct: 75, detractors_pct: 11 },
      ],
      category_averages: {
        venue: 4.2,
        food: 3.8,
        service: 4.4,
        entertainment: 3.9,
        value: 3.5,
        activities: 4.1,
        staff: 4.3,
        cleanliness: 4.5,
        facilities: 4.0,
        overall: 4.0,
      },
      sentiment_flow: [
        { period: "Ene", positive: 65, neutral: 25, negative: 10 },
        { period: "Feb", positive: 68, neutral: 22, negative: 10 },
        { period: "Mar", positive: 62, neutral: 27, negative: 11 },
      ],
      top_improvements: [
        { area: "Horarios de actividades", mentions: 34, impact: "Alto" },
        { area: "Variedad gastronómica", mentions: 28, impact: "Medio" },
        { area: "Precios de spa", mentions: 15, impact: "Bajo" },
      ],
      key_quotes: [
        { text: "Las instalaciones son excelentes pero los horarios de yoga son limitados.", sentiment: "neutral", family: "Familia Pérez", date: daysAgo(3) },
        { text: "El servicio de piscina mejoró muchísimo este trimestre.", sentiment: "positive", family: "Familia Mora", date: daysAgo(7) },
      ],
      overall_trend: "stable",
      survey_volume_trend: [
        { period: "Q1 2024", count: 180, response_rate_pct: 62 },
        { period: "Q2 2024", count: 195, response_rate_pct: 67 },
        { period: "Q3 2024", count: 210, response_rate_pct: 72 },
        { period: "Q4 2024", count: 190, response_rate_pct: 65 },
      ],
    },
  };
}
// ═══════════════════════════════════════════════════════════
// PROACTIVE RECOMMENDATION
// ═══════════════════════════════════════════════════════════

export function createSocialClusters(): identify_social_clusters_Contract {
  return {
    status: "success",
    message: "Clusters sociales identificados.",
    data: {
      total_families: 268,
      total_connections: 1240,
      avg_connections_per_family: 4.6,
      social_density: 0.62,
      clusters: [
        {
          id: "cl-1", name: "Tenistas Activos",
          family_ids: ["fam-001", "fam-004", "fam-010"],
          common_interest: "Tenis",
          avg_strength: 0.85,
          cohesion_score: 0.78,
          suggested_event: "Torneo dobles mixto",
        },
        {
          id: "cl-2", name: "Familias Wellness",
          family_ids: ["fam-002", "fam-005", "fam-008"],
          common_interest: "Yoga",
          avg_strength: 0.72,
          cohesion_score: 0.68,
          suggested_event: "Retiro de bienestar familiar",
        },
        {
          id: "cl-3", name: "Jóvenes Profesionales",
          family_ids: ["fam-003", "fam-007"],
          common_interest: "Padel",
          avg_strength: 0.65,
          cohesion_score: 0.58,
          suggested_event: "Padel nocturno + networking",
        },
      ],
      isolated_families: [],
      cross_tier_connections: 45,
      integration_rate: 0.72,
    },
  };
}

export function createQuarterlyInsights(): generate_quarterly_insights_Contract {
  return {
    status: "success",
    message: "Insights trimestrales generados.",
    data: {
      id: "qi-2025-q1",
      year: 2025,
      period: "Q1",
      generated_at: new Date().toISOString(),
      summary: "Trimestre sólido con crecimiento en engagement y satisfacción.",
      overall_health_score: 74,
      membership: {
        total_active: 642,
        new_members: 42,
        departures: 8,
        net_growth: 34,
        churn_rate_pct: 1.2,
      },
      financial: {
        revenue_total: 125_000_000,
        expenses_total: 89_500_000,
        net_income: 35_500_000,
        budget_variance_pct: -3.1,
      },
      engagement: {
        avg_engagement_score: 72.5,
        events_held: 28,
        avg_event_attendance: 45,
        nps_score: 72,
        satisfaction_avg: 4.0,
      },
      top_activities: [
        { name: "Tenis", attendance: 450, growth_pct: 12.5 },
        { name: "Piscina", attendance: 380, growth_pct: 8.3 },
        { name: "Yoga", attendance: 290, growth_pct: 15.2 },
      ],
      key_achievements: [
        "NPS se mantuvo en +72 pese a aumento de cuotas",
        "Wellness participation creció 12%",
        "Nuevo programa juvenil con 35 inscritos",
      ],
      areas_for_improvement: [
        "Horarios de actividades limitados (34 menciones en encuestas)",
        "Variedad gastronómica por debajo de expectativas",
        "Utilización de piscina en horario matutino baja (45%)",
      ],
      recommendations: [
        "Ampliar horarios de yoga a 3 sesiones diarias",
        "Lanzar menú rotativo semanal en restaurante principal",
        "Implementar clases acuáticas matutinas para seniors",
      ],
      ai_narrative: null,
      confidence: 0.82,
    },
  };
}

export function createSchedulingConflicts(): detect_scheduling_conflicts_Contract {
  return {
    status: "success",
    message: "Conflictos de agenda detectados.",
    data: {
      conflicts: [
        {
          id: "sc-1",
          event_a_id: "evt-001",
          event_a_name: "Torneo de Tenis",
          event_b_id: "evt-002",
          event_b_name: "Clase de Yoga al aire libre",
          conflict_type: "resource_overlap",
          severity: "medium",
          overlap_start: "2025-04-12T08:00:00",
          overlap_end: "2025-04-12T10:00:00",
          shared_resources: ["Estacionamiento", "Vestidores"],
          affected_families: 12,
          suggestion: "Mover yoga a las 7:00 AM o usar studio indoor",
          auto_resolvable: true,
        },
      ],
      total_conflicts: 1,
      risk_level: "medium",
      most_affected_date: "2025-04-12",
      generated_at: new Date().toISOString(),
    },
  };
}

// ═══════════════════════════════════════════════════════════
// COMMUNICATION
// ═══════════════════════════════════════════════════════════

export function createBroadcastAnnouncement(): broadcast_club_announcement_Contract {
  return {
    status: "pending_approval",
    request_id: "apr-" + Date.now().toString(36),
    message: "Anuncio enviado a aprobación del administrador.",
    details: { title: "Nuevo comunicado", channels: ["email", "push"] },
  };
}

export function createEmergencyBroadcast(): manage_emergency_broadcast_Contract {
  return {
    status: "pending_approval",
    request_id: "apr-" + Date.now().toString(36),
    message: "Alerta de emergencia enviada a doble confirmación.",
    details: { emergency_type: "security", channels: ["push", "sms", "whatsapp"] },
  };
}

export function createTemplateList(): manage_notification_templates_list_Contract {
  return {
    status: "success",
    message: "Plantillas encontradas.",
    templates: [
      { id: "tmpl-1", name: "Bienvenida nuevos socios", category: "welcome", subject: "¡Bienvenido al Castillo Country Club!", body_template: "Estimado {nombre}, bienvenido...", channels: ["email"], variables: ["nombre"], is_active: true, created_at: daysAgo(90) },
      { id: "tmpl-2", name: "Recordatorio evento", category: "event_reminder", subject: "Recordatorio: {evento} el {fecha}", body_template: "Te esperamos en {evento}...", channels: ["email", "push"], variables: ["evento", "fecha"], is_active: true, created_at: daysAgo(60) },
      { id: "tmpl-3", name: "Cumpleaños", category: "birthday", subject: "¡Feliz cumpleaños, {nombre}!", body_template: "De parte de todo el equipo...", channels: ["email", "whatsapp"], variables: ["nombre"], is_active: true, created_at: daysAgo(120) },
    ],
  };
}

export function createScheduledList(): schedule_notification_list_Contract {
  return {
    status: "success",
    message: "Notificaciones programadas.",
    scheduled: [
      { id: "sched-1", template_id: "tmpl-2", recipient_ids: ["m-1", "m-2", "m-3"], channel: "email", scheduled_at: "2025-04-15T09:00:00", status: "queued", params: { evento: "Torneo de Primavera", fecha: "20 de Abril" } },
    ],
  };
}

export function createNotificationHistory(): get_notification_history_Contract {
  return {
    status: "success",
    message: "Historial cargado.",
    history: [
      { id: "log-1", notification_type: "announcement", title: "Mantenimiento programado piscina", channel: "email", recipient_count: 268, status: "sent", sent_at: daysAgo(2), created_by: "admin" },
      { id: "log-2", notification_type: "emergency", title: "Alerta de tormenta", channel: "push", recipient_count: 268, status: "delivered", sent_at: daysAgo(5), created_by: "admin" },
      { id: "log-3", notification_type: "personalized", title: "Invitación evento corporativo", channel: "email", recipient_count: 45, status: "sent", sent_at: daysAgo(7), created_by: "staff" },
      { id: "log-4", notification_type: "announcement", title: "Nuevo menú de temporada", channel: "push", recipient_count: 268, status: "sent", sent_at: daysAgo(10), created_by: "admin" },
    ],
    total: 4,
  };
}

export function createAnnouncementList(): list_announcements_Contract {
  return {
    status: "success",
    message: "Anuncios encontrados.",
    announcements: [
      { id: "ann-1", title: "Mantenimiento programado de piscina", body: "La piscina estará cerrada del 15 al 17 de abril por mantenimiento preventivo.", announcement_type: "maintenance", status: "sent", channels: ["email", "push"], target_audience: "all", sent_at: daysAgo(2), created_by: "admin", priority: 1, requires_acknowledgment: false },
      { id: "ann-2", title: "Torneo de Primavera 2025", body: "Inscripciones abiertas para el torneo anual de tenis.", announcement_type: "event", status: "sent", channels: ["email"], target_audience: "all", sent_at: daysAgo(5), created_by: "admin", priority: 1, requires_acknowledgment: false },
      { id: "ann-3", title: "Nuevo menú de temporada", body: "Descubrí los nuevos platos de nuestro chef ejecutivo.", announcement_type: "promotion", status: "draft", channels: ["email", "push"], target_audience: "all", created_by: "admin", priority: 2, requires_acknowledgment: false },
    ],
    total: 3,
    page: 1,
    page_size: 12,
    total_pages: 1,
  };
}

export function createCommunicationAnalytics(): get_communication_analytics_Contract {
  return {
    status: "success",
    message: "Analytics de comunicaciones.",
    analytics: {
      period: "current_month",
      total_sent: 24,
      total_recipients: 4_850,
      delivery_rate_pct: 96.5,
      avg_recipients_per_send: 202,
      best_day_to_send: "Martes",
      best_hour_to_send: "09:00",
      channel_breakdown: [
        { channel: "email", count: 14, percentage: 58.3 },
        { channel: "push", count: 8, percentage: 33.3 },
        { channel: "sms", count: 2, percentage: 8.3 },
      ],
      type_breakdown: [
        { type: "announcement", count: 12, percentage: 50.0 },
        { type: "event_reminder", count: 6, percentage: 25.0 },
        { type: "personalized", count: 4, percentage: 16.7 },
        { type: "emergency", count: 2, percentage: 8.3 },
      ],
      status_breakdown: { sent: 20, delivered: 3, failed: 1, cancelled: 0 },
      daily_volume: [
        { date: "2025-03-01", count: 2 }, { date: "2025-03-03", count: 1 },
        { date: "2025-03-05", count: 3 }, { date: "2025-03-08", count: 2 },
        { date: "2025-03-10", count: 4 }, { date: "2025-03-12", count: 1 },
        { date: "2025-03-15", count: 3 }, { date: "2025-03-18", count: 2 },
        { date: "2025-03-20", count: 3 }, { date: "2025-03-22", count: 1 },
        { date: "2025-03-25", count: 2 },
      ],
      hourly_distribution: [
        { hour: "07:00", count: 1 }, { hour: "08:00", count: 3 }, { hour: "09:00", count: 8 },
        { hour: "10:00", count: 5 }, { hour: "11:00", count: 3 }, { hour: "12:00", count: 1 },
        { hour: "14:00", count: 1 }, { hour: "15:00", count: 1 }, { hour: "16:00", count: 1 },
      ],
    },
  };
}

export function createBoardPackage(): send_board_package_Contract {
  return {
    status: "success",
    message: "Board Package Q1 2025: Enviado a toda la junta directiva.",
    package: {
      package_id: "bp-" + Date.now().toString(36),
      quarter: "Q1",
      year: 2025,
      recipients: [
        { name: "Director de Junta", email: "director@castillo.cr", role: "director" },
        { name: "Vicepresidente", email: "vp@castillo.cr", role: "vicepresident" },
      ],
      delivery_mode: "full_board",
      generated_at: new Date().toISOString(),
      contents: ["Resumen Ejecutivo", "Reporte Financiero", "Estado de Membresía"],
      status: "sent",
    },
  };
}

// ═══ PHASE 11 ADDITIONS ═══

// ── manage_communication_preferences ──

export function createMockPreferencesResponse(params?: Record<string, unknown>) {
  const action = (params?.action as string) || "get";

  const preferences = {
    id: "pref-001",
    member_id: (params?.member_id as string) || "member-001",
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: true,
    in_app_enabled: true,
    announcements: "realtime",
    events: "realtime",
    promotions: "weekly_digest",
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
  };

  if (action === "get") {
    return {
      status: "success",
      preferences,
    };
  }

  if (action === "create") {
    return {
      status: "success",
      message: "⚙️ Preferencias registradas exitosamente.",
      preferences: { ...preferences, id: "pref-new-001" },
    };
  }

  if (action === "update") {
    return {
      status: "success",
      message: "✏️ Preferencias actualizadas exitosamente.",
      preferences: { ...preferences, ...params },
    };
  }

  return { status: "success", preferences };
}

// ── communication_insights (AI on-demand) ──

export function createMockCommunicationInsightsResponse() {
  return {
    status: "success",
    message: "🧠 7 insights generados a partir del análisis de comunicaciones recientes.",
    generated_at: new Date().toISOString(),
    summary:
      "Se identificaron 3 oportunidades de mejora, 2 alertas de riesgo y 2 recomendaciones de optimización. " +
      "La comunicación del club muestra buena salud general pero con margen de mejora en diversificación de canales y timing.",
    insights: [
      {
        id: "ins-timing-001",
        category: "timing",
        priority: "high",
        title: "Martes 9AM: tu ventana de oro",
        description:
          "El análisis de 247 comunicaciones muestra que los envíos realizados los martes a las 9:00 AM alcanzan una tasa de apertura del 92%, un 34% por encima del promedio general.",
        confidence: 92,
        metric: "92% open rate vs 58% promedio",
        recommendation:
          "Concentrá los comunicados importantes (eventos, cambios de política) en esta ventana horaria para maximizar alcance.",
        action_label: "Programar envío",
        action_route: "/admin/communications",
      },
      {
        id: "ins-risk-001",
        category: "risk",
        priority: "high",
        title: "SMS con tasa de falla elevada",
        description:
          "El canal SMS registra una tasa de falla del 15%, muy por encima del 3% esperado. Esto afecta la entrega de notificaciones urgentes que dependen de este canal.",
        confidence: 88,
        metric: "15% failure rate en SMS",
        recommendation:
          "Investigá si hay números desactualizados en la base. Considerá usar WhatsApp como canal alternativo para notificaciones urgentes.",
        action_label: "Ver historial SMS",
      },
      {
        id: "ins-channel-001",
        category: "channel",
        priority: "medium",
        title: "WhatsApp subutilizado con excelente rendimiento",
        description:
          "WhatsApp solo se usa en el 15% de las comunicaciones pero tiene la tasa de entrega más alta (98%). Es el canal preferido por los socios costarricenses.",
        confidence: 85,
        metric: "98% delivery, solo 15% del volumen",
        recommendation:
          "Incrementá el uso de WhatsApp para comunicaciones informales, promociones y recordatorios. Especialmente efectivo para el segmento joven.",
      },
      {
        id: "ins-channel-002",
        category: "opportunity",
        priority: "medium",
        title: "Sobrerreliancia en email",
        description:
          "El 45% de todas las comunicaciones se envían por email. Si el dominio del club cae en una blacklist de spam, perderías casi la mitad de tu capacidad de comunicación.",
        confidence: 78,
        recommendation:
          "Distribuí más equitativamente entre email (30%), WhatsApp (30%), push (25%) y otros (15%). Esto crea redundencia natural.",
      },
      {
        id: "ins-content-001",
        category: "content",
        priority: "medium",
        title: "Promociones con engagement bajo",
        description:
          "Las comunicaciones tipo 'promotion' tienen un 40% menos de interacción que los anuncios de eventos. El contenido promocional no resuena con los socios del club.",
        confidence: 74,
        metric: "-40% engagement vs eventos",
        recommendation:
          "Reformulá las promociones como experiencias exclusivas en vez de descuentos. Usá storytelling: 'Solo para miembros del Castillo' funciona mejor que '20% off'.",
      },
      {
        id: "ins-frequency-001",
        category: "frequency",
        priority: "low",
        title: "Mensajes enviados en horario silencioso",
        description:
          "El 12% de las comunicaciones programadas se envían entre las 22:00 y las 07:00, el horario silencioso configurado por la mayoría de los socios.",
        confidence: 65,
        metric: "12% de envíos en quiet hours",
        recommendation:
          "Revisá las programaciones automáticas para asegurar que respeten las preferencias de horario silencioso de cada socio.",
      },
      {
        id: "ins-audience-001",
        category: "audience",
        priority: "low",
        title: "Segmentación por tier mejora engagement 2x",
        description:
          "Las notificaciones personalizadas a segmentos específicos (platino, oro, etc.) obtienen el doble de engagement que los broadcasts genéricos a 'all'.",
        confidence: 62,
        metric: "2x engagement con segmentación",
        recommendation:
          "Antes de enviar a 'todos los socios', evaluá si el contenido es relevante para todo el mundo. Si no, segmentá por tier, edad o actividad.",
      },
    ],
  };
}


// ═══════════════════════════════════════════════════════════
// HITL
// ═══════════════════════════════════════════════════════════

export function createPendingApprovals(): get_pending_approvals_Contract {
  return {
    status: "success",
    message: "Aprobaciones pendientes.",
    requests: [
      {
        request_id: "apr-001", agent: "finance", tool: "finance_expense_create",
        params: { amount: 35_000_000, description: "Renovación canchas de tenis" },
        requested_by: "Carlos Mendoza", approval_level: "hitl", status: "pending",
        created_at: hoursAgo(3), resolved_at: null, resolved_by: null, resolution_note: null,
        expires_at: null, risk_summary: "Gasto alto: ₡35M para renovación de instalaciones deportivas",
        estimated_impact: "Afecta presupuesto de mantenimiento Q1", affected_count: 0,
        requires_dual_approval: false, first_approval_by: null, second_approval_by: null,
      },
      {
        request_id: "apr-002", agent: "communication", tool: "manage_emergency_broadcast",
        params: { title: "Evacuación por tormenta", emergency_type: "weather" },
        requested_by: "Sistema", approval_level: "always_human", status: "pending",
        created_at: hoursAgo(1), resolved_at: null, resolved_by: null, resolution_note: null,
        expires_at: null, risk_summary: "ALERTA DE EMERGENCIA: Evacuación por tormenta. Push+SMS+WhatsApp.",
        estimated_impact: "Alerta masiva a todos los socios", affected_count: 847,
        requires_dual_approval: true, first_approval_by: null, second_approval_by: null,
      },
    ],
    total: 2,
  };
}

export function createApproveRequest(): approve_request_Contract {
  return { status: "success", message: "Solicitud aprobada correctamente." };
}

export function createRejectRequest(): reject_request_Contract {
  return { status: "success", message: "Solicitud rechazada." };
}
// ═══════════════════════════════════════════════════════════
// WELLNESS FACTORIES — Append after existing content
// ═══════════════════════════════════════════════════════════

import type {
  wellness_profile_get_Contract as WellnessProfileGetResponse,
  wellness_profile_update_Contract as WellnessProfileUpdateResponse,
  wellness_activity_log_Contract as WellnessActivityLogResponse,
  wellness_goal_set_Contract as WellnessGoalSetResponse,
  wellness_recommendations_Contract as WellnessRecommendationsResponse,
  wellness_schedule_class_Contract as WellnessScheduleClassResponse,
} from './contracts';

import type {
  WellnessCorrelateResponse,
  WellnessInsightsResponse,
} from '@/features/wellness/types';

// ── Shared mock constants ───────────────────────────────────

const MOCK_FAMILY_ID = 'fam_rodriguez_001';
// ── Factory: wellness_profile_get ───────────────────────────

export function createMockWellnessProfile(): WellnessProfileGetResponse {
  return {
    status: 'success',
    message:
      '🧘 Perfil de bienestar de Familia Rodríguez Vargas: Nivel intermediate, 3 actividades preferidas.',
    data: {
      family_id: MOCK_FAMILY_ID,
      overall_score: 72,
      dimensions: [
        { dimension: 'physical', score: 78, weight: 0.3, trend: 'improving' },
        { dimension: 'mental', score: 65, weight: 0.25, trend: 'stable' },
        { dimension: 'social', score: 70, weight: 0.2, trend: 'improving' },
        { dimension: 'nutritional', score: 68, weight: 0.15, trend: 'stable' },
        { dimension: 'sleep', score: 74, weight: 0.1, trend: 'declining' },
      ],
      streak_days: 14,
      total_activities: 18,
      total_minutes: 1260,
      last_activity_date: '2025-05-22',
      preferred_activities: ['gym', 'yoga', 'swimming'],
      goals_active: 3,
    },
  };
}

// ── Factory: wellness_profile_update ────────────────────────

export function createMockWellnessProfileUpdate(): WellnessProfileUpdateResponse {
  return {
    status: 'success',
    message:
      '✅ Perfil de bienestar actualizado para Familia Rodríguez Vargas. ¡Listo para entrenar! 💪',
    data: {
      family_id: MOCK_FAMILY_ID,
      updated_fields: ['preferred_activities', 'notes'],
      new_score: 74,
      updated_at: '2025-05-22T09:00:00Z',
    },
  };
}

// ── Factory: wellness_activity_log ──────────────────────────

export function createMockWellnessActivityLog(): WellnessActivityLogResponse {
  return {
    status: 'success',
    message:
      '🏊 ¡Actividad registrada! Mariana Rodríguez - swimming por 45 min. 🔥 320 cal quemadas!',
    data: {
      log_id: 'act_016',
      family_id: MOCK_FAMILY_ID,
      activity: 'swimming',
      duration_minutes: 45,
      calories: 320,
      date: '2025-05-22',
      notes: 'Nuevo récord personal de vueltas.',
      logged_by: 'Mariana Rodríguez',
    },
  };
}

// ── Factory: wellness_goal_set ──────────────────────────────

export function createMockWellnessGoalSet(): WellnessGoalSetResponse {
  return {
    status: 'success',
    message:
      '🎯 Objetivo "3 clases de yoga por semana" establecido: 12 sesiones/mes. ¡Tú puedes! 💪',
    data: {
      goal_id: 'goal_004',
      family_id: MOCK_FAMILY_ID,
      goal_type: 'flexibility',
      title: '3 clases de yoga por semana',
      description: 'Aumentar flexibilidad y reducir estrés con yoga regular.',
      target_value: 12,
      current_value: 0,
      unit: 'sesiones/mes',
      status: 'active',
      target_date: '2025-06-30',
      created_at: '2025-05-22T09:00:00Z',
    },
  };
}

// ── Factory: wellness_recommendations ───────────────────────

export function createMockWellnessRecommendations(): WellnessRecommendationsResponse {
  return {
    status: 'success',
    message: '💡 4 recomendaciones para ti. ⚡ 1 de alta prioridad.',
    data: {
      recommendations: [
        {
          id: 'rec-well-001',
          activity: 'Meditación',
          reason: 'Alta actividad física pero 0 minutos de mindfulness. La meditación 2x/semana mejora la recuperación un 23%.',
          match_score: 92,
          schedule_suggestion: 'Martes y jueves 7:00 AM',
          category: 'mind_body',
        },
        {
          id: 'rec-well-002',
          activity: 'Natación',
          reason: 'Natación actual (1x/semana) insuficiente para beneficio cardiovascular completo.',
          match_score: 78,
          schedule_suggestion: 'Jueves 6:00 PM',
          category: 'variety',
        },
        {
          id: 'rec-well-003',
          activity: 'Pilates grupal',
          reason: 'Socios con perfil similar reportan 18% más satisfacción al combinar pilates con su rutina.',
          match_score: 72,
          schedule_suggestion: 'Sábados 9:00 AM',
          category: 'social',
        },
        {
          id: 'rec-well-004',
          activity: 'Spa deportivo',
          reason: 'Con 15 actividades/mes, el cuerpo necesita recuperación estructurada.',
          match_score: 65,
          schedule_suggestion: '1 sábado por mes',
          category: 'recovery',
        },
      ],
      total: 4,
    },
  };
}

// ── Factory: wellness_schedule_class (HITL) ─────────────────

export function createMockWellnessScheduleClass(): WellnessScheduleClassResponse {
  return {
    status: 'pending_approval',
    message:
      '📅 Cita para "Yoga Restaurativo" el 2025-05-25 a las 09:00 para Mariana Rodríguez. Pendiente de aprobación. 🔔',
    request_id: 'req_wellness_001',
    class_name: 'Yoga Restaurativo',
    member_name: 'Mariana Rodríguez',
  };
}



// ── Factory: wellness_correlate (NUEVA) ─────────────────────

export function createMockWellnessCorrelate(): WellnessCorrelateResponse {
  return {
    status: 'success',
    data: {
      correlations: {
        wellness_to_retention: { coefficient: 0.78, significance: 'high' },
        wellness_to_revenue: { coefficient: 0.65, significance: 'medium' },
        wellness_to_satisfaction: { coefficient: 0.82, significance: 'high' },
      },
      segment_insights: [
        {
          segment: 'Wellness Alto (70-100)',
          wellness_score_range: [70, 100],
          avg_monthly_spend_crc: 185000,
          retention_rate: 0.96,
          nps: 72,
          member_count: 45,
        },
        {
          segment: 'Wellness Medio (40-69)',
          wellness_score_range: [40, 69],
          avg_monthly_spend_crc: 120000,
          retention_rate: 0.84,
          nps: 55,
          member_count: 78,
        },
        {
          segment: 'Wellness Bajo (0-39)',
          wellness_score_range: [0, 39],
          avg_monthly_spend_crc: 65000,
          retention_rate: 0.62,
          nps: 35,
          member_count: 32,
        },
      ],
      activity_value_ranking: [
        {
          activity: 'group_class',
          avg_participants: 12,
          monthly_revenue_impact_crc: 2400000,
          satisfaction_correlation: 0.85,
          churn_risk_reduction: 0.25,
        },
        {
          activity: 'yoga',
          avg_participants: 8,
          monthly_revenue_impact_crc: 1800000,
          satisfaction_correlation: 0.82,
          churn_risk_reduction: 0.2,
        },
        {
          activity: 'tennis',
          avg_participants: 4,
          monthly_revenue_impact_crc: 800000,
          satisfaction_correlation: 0.88,
          churn_risk_reduction: 0.22,
        },
        {
          activity: 'swimming',
          avg_participants: 6,
          monthly_revenue_impact_crc: 1200000,
          satisfaction_correlation: 0.78,
          churn_risk_reduction: 0.18,
        },
        {
          activity: 'gym',
          avg_participants: 15,
          monthly_revenue_impact_crc: 3200000,
          satisfaction_correlation: 0.72,
          churn_risk_reduction: 0.15,
        },
      ],
    },
  };
}

// ── Factory: wellness_insights (NUEVA) ──────────────────────

export function createMockWellnessInsights(): WellnessInsightsResponse {
  return {
    status: 'success',
    data: {
      generated_at: '2025-05-22T10:30:00Z',
      health_score: 72,
      executive_summary:
        'El bienestar general de la familia Rodríguez Vargas es sólido con un score de 72/100. ' +
        'La consistencia es el punto fuerte (racha de 12 días). ' +
        'La principal área de mejora es la variedad de actividades y la participación social. ' +
        'Se detectó una caída leve en frecuencia que requiere atención proactiva.',
      key_findings: [
        {
          category: 'engagement',
          finding:
            'Las actividades grupales generan 2.3x mayor impacto en retención que el gimnasio individual.',
          impact: 'high',
          action: 'Incorporar al menos 1 actividad grupal semanal.',
        },
        {
          category: 'opportunity',
          finding:
            '32 socios con wellness bajo son candidatos para un programa de reactivación personalizado.',
          impact: 'medium',
          action: 'Lanzar campaña de reactivación segmentada por nivel de wellness.',
        },
        {
          category: 'financial',
          finding:
            'Cada punto de mejora en wellness score genera un promedio de ₡8,500 adicionales de revenue mensual por socio.',
          impact: 'high',
          action: 'Priorizar inversiones en programas de bienestar con ROI demostrado.',
        },
        {
          category: 'risk',
          finding:
            '5 familias muestran patrón de abandono gradual en los últimos 30 días.',
          impact: 'medium',
          action: 'Activar protocolo de retención con llamada personal + oferta de reintroducción.',
        },
      ],
      trend_analysis: {
        period: 'Abril — Mayo 2025',
        direction: 'improving',
        velocity: '+2.1% por semana',
        comparison: 'vs Q1 2025',
      },
      critical_insights: [
        {
          insight:
            'La familia ha reducido su frecuencia un 33% en los últimos 14 días. Si la tendencia continúa, el score podría caer a 55 en 30 días.',
          confidence: 0.84,
          recommended_action:
            'Contactar proactivamente: llamada del staff + clase de reintroducción personalizada.',
          deadline: '2025-05-26',
        },
        {
          insight:
            'La clase de spinning tiene 15/12 inscritos. Hay demanda insatisfecha que impacta satisfacción.',
          confidence: 0.95,
          recommended_action:
            'Agregar un segundo horario de spinning (jueves 6:30pm).',
        },
      ],
      predictions: {
        next_month_engagement:
          '+5% basado en tendencia actual y efecto de recomendaciones aplicadas.',
        churn_risk_members: 5,
        growth_opportunity:
          'Un programa de wellness familiar puede incrementar engagement general un 18% y reducir churn 12%.',
      },
    },
  };
}
// ═══════════════════════════════════════════════════════════
// FASE 10 — Proactive Recommendations Factories
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
  QuarterlyInsightsListResponse,
} from "./contracts";

import {
  PricingStrategy,
  PredictionConfidence,
  ConflictSeverity,
  ClusterType,
} from "../../features/recommendations/types";

// ── Shared date helpers ────────────────────────────────────

const NOW = new Date().toISOString();
const DAYS_AGO_30 = new Date(
  Date.now() - 30 * 24 * 60 * 60 * 1000,
).toISOString();
const DAYS_AGO_7 = new Date(
  Date.now() - 7 * 24 * 60 * 60 * 1000,
).toISOString();

// ── 1. optimize_pricing ────────────────────────────────────

export function createMockPricingResponse(
  params?: Record<string, unknown>,
): PricingListResponse | PricingGetResponse | PricingCreateResponse {
  const action = (params?.action as string) ?? "list";

  const pricings = [
    {
      id: "pricing-001",
      service_name: "Clases de Yoga",
      current_price: 18000,
      suggested_price: 22500,
      strategy: PricingStrategy.DemandBased,
      expected_revenue_change: 45000,
      expected_demand_change: 15,
      reasoning:
        "Alta demanda en temporada alta, capacidad limitada a 15 participantes por sesión",
      risk_level: "medium",
      status: SuggestionStatus.Proposed,
      created_at: DAYS_AGO_30,
      updated_at: DAYS_AGO_30,
    },
    {
      id: "pricing-002",
      service_name: "Alquiler Salón Principal",
      current_price: 250000,
      suggested_price: 300000,
      strategy: PricingStrategy.Seasonal,
      expected_revenue_change: 120000,
      expected_demand_change: -5,
      reasoning:
        "Temporada de diciembre: alta demanda para eventos privados de fin de año",
      risk_level: "low",
      status: SuggestionStatus.Approved,
      created_at: DAYS_AGO_30,
      updated_at: NOW,
    },
    {
      id: "pricing-003",
      service_name: "Membresía VIP Anual",
      current_price: 850000,
      suggested_price: 950000,
      strategy: PricingStrategy.MemberTier,
      expected_revenue_change: 200000,
      expected_demand_change: -8,
      reasoning:
        "Alinear precio con beneficios premium expandidos del plan 2025",
      risk_level: "high",
      status: SuggestionStatus.UnderReview,
      created_at: DAYS_AGO_7,
      updated_at: NOW,
    },
  ];

  if (action === "get") {
    const id = params?.pricing_id as string;
    const found = pricings.find((p) => p.id === id) ?? pricings[0];
    return {
      status: "success",
      pricing: found,
    } satisfies PricingGetResponse;
  }

  if (action === "create") {
    return {
      status: "pending_approval",
      request_id: `req-pricing-${Date.now()}`,
      message:
        "💲 Optimización de precio registrada. Esperando aprobación de gerencia.",
      details: {
        service_name: (params?.service_name as string) ?? "Nuevo Servicio",
        current_price: (params?.current_price as number) ?? 0,
        suggested_price: (params?.suggested_price as number) ?? 0,
        change_pct: "+25.0%",
        strategy: (params?.strategy as string) ?? "demand_based",
        risk_level: (params?.risk_level as string) ?? "medium",
      },
    } satisfies PricingCreateResponse;
  }

  // Default: list
  return {
    status: "success",
    message: `💰 Encontramos ${pricings.length} optimización(es) de precios.`,
    pricings,
  } satisfies PricingListResponse;
}

// ── 2. suggest_new_activities ──────────────────────────────

export function createMockSuggestionsResponse(
  params?: Record<string, unknown>,
):
  | SuggestionsListResponse
  | SuggestionsGetResponse
  | SuggestionsCreateResponse {
  const action = (params?.action as string) ?? "list";

  const suggestions = [
    {
      id: "suggestion-001",
      name: "Paddle Surf",
      description:
        "Clases y alquiler de paddle surf en el lago del club. Incluye equipamiento completo.",
      target_demographic: "Adultos 25-45",
      estimated_interest: 78,
      estimated_cost: 15000,
      similar_clubs_offer: true,
      member_requests_count: 23,
      status: SuggestionStatus.Proposed,
      tags: ["acuático", "fitness", "outdoor"],
      created_at: DAYS_AGO_30,
      updated_at: DAYS_AGO_30,
    },
    {
      id: "suggestion-002",
      name: "Clases de Cocina Gourmet",
      description:
        "Talleres mensuales con chefs invitados. Temáticas: cocina tica, asiática, italiana.",
      target_demographic: "Familias y parejas",
      estimated_interest: 85,
      estimated_cost: 8500,
      similar_clubs_offer: true,
      member_requests_count: 41,
      status: SuggestionStatus.UnderReview,
      tags: ["gastronómico", "cultural", "familia"],
      created_at: DAYS_AGO_30,
      updated_at: DAYS_AGO_7,
    },
    {
      id: "suggestion-003",
      name: "Torneo de Pickleball",
      description:
        "Liga interna con torneos mensuales. Equipamiento disponible en el club.",
      target_demographic: "Todas las edades",
      estimated_interest: 72,
      estimated_cost: 5000,
      similar_clubs_offer: false,
      member_requests_count: 15,
      status: SuggestionStatus.Approved,
      tags: ["deporte", "competencia", "social"],
      created_at: DAYS_AGO_30,
      updated_at: NOW,
    },
  ];

  if (action === "get") {
    const id = params?.suggestion_id as string;
    const found = suggestions.find((s) => s.id === id) ?? suggestions[0];
    return {
      status: "success",
      suggestion: found,
    } satisfies SuggestionsGetResponse;
  }

  if (action === "create") {
    return {
      status: "pending_approval",
      request_id: `req-suggestion-${Date.now()}`,
      message:
        "💡 Actividad propuesta. Esperando aprobación del administrador.",
      details: {
        name: (params?.name as string) ?? "Nueva Actividad",
        target_demographic:
          (params?.target_demographic as string) ?? "General",
        estimated_interest: (params?.estimated_interest as number) ?? 0,
        estimated_cost: (params?.estimated_cost as number) ?? 0,
        member_requests_count:
          (params?.member_requests_count as number) ?? 0,
      },
    } satisfies SuggestionsCreateResponse;
  }

  return {
    status: "success",
    message: `💡 Encontramos ${suggestions.length} sugerencia(s) de actividades.`,
    suggestions,
  } satisfies SuggestionsListResponse;
}

// ── 3. generate_family_recommendations ─────────────────────

// ── Personalized recommendations per family profile ──
const FAMILY_RECOMMENDATIONS: Record<string, Array<{
  id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  score: number;
  reasoning: string;
  action_label: string;
  action_route: string;
  icon: string;
}>> = {
  "fam-001": [
    {
      id: "rec-001a", recommendation_type: "activity", title: "Torneo Inter-Clubs de Pádel",
      description: "Basado en su historial de torneos, le recomendamos inscribirse al próximo Inter-Clubs. Su familia participó en 3 torneos este año con excelente desempeño.",
      priority: "high", score: 92,
      reasoning: "Rodrigo ha jugado en 3 torneos de pádel este año. La familia completa asiste a los eventos deportivos. El equipo del club necesita refuerzos para la categoría avanzada.",
      action_label: "Inscribirse al torneo", action_route: "/mi-club/eventos", icon: "activity",
    },
    {
      id: "rec-002a", recommendation_type: "event", title: "Cena Maridaje Exclusiva Socios Oro",
      description: "Evento gastronómico privado con maridaje de vinos costarricenses. Exclusivo para socios nivel Oro y Platino.",
      priority: "medium", score: 78,
      reasoning: "La familia ha asistido a 4 eventos gastronómicos en los últimos 6 meses. Rodrigo y María Elena figuraron en la lista de espera del último Wine & Dine.",
      action_label: "Ver detalles del evento", action_route: "/mi-club/eventos", icon: "event",
    },
    {
      id: "rec-003a", recommendation_type: "social", title: "Conocé a la Familia Brenes Mora",
      description: "Comparten 3 actividades y asisten a los mismos eventos. Fernando Brenes es capitán del equipo de pádel donde Rodrigo juega regularmente.",
      priority: "medium", score: 74,
      reasoning: "Análisis de afinidad social: 3 actividades compartidas, 2 eventos conjuntos, interacción frecuente en canchas de pádel. Fortalecer esta conexión mejora el engagement de ambas familias.",
      action_label: "Ver perfil social", action_route: "/mi-club/familia", icon: "social",
    },
  ],
  "fam-002": [
    {
      id: "rec-001b", recommendation_type: "engagement", title: "Presidir Comité de Eventos de Temporada",
      description: "María Elena ya preside el comité de eventos sociales. Proponemos ampliar su liderazgo al comité de temporada navideña, el evento más importante del año.",
      priority: "high", score: 95,
      reasoning: "María Elena tiene el engagement más alto del club (91). Su gestión del comité de eventos sociales ha incrementado la asistencia un 23%. El comité de temporada necesita liderazgo experimentado.",
      action_label: "Aceptar liderazgo", action_route: "/mi-club/eventos", icon: "engagement",
    },
    {
      id: "rec-002b", recommendation_type: "activity", title: "Torneo de Golf Benéfico",
      description: "Evento solidario con recaudación para fundación local. La familia Herrera tiene historial en eventos benéficos del club.",
      priority: "medium", score: 82,
      reasoning: "La familia asistió a 2 eventos benéficos este año. Como socios platino, su participación genera visibilidad y atrae a otros socios de alto engagement.",
      action_label: "Ver torneo", action_route: "/mi-club/eventos", icon: "activity",
    },
    {
      id: "rec-003b", recommendation_type: "activity", title: "Retiro de Bienestar Premium",
      description: "Experiencia de fin de semana con yoga, meditación y gastronomía saludable. Diseñado para socios platino.",
      priority: "medium", score: 76,
      reasoning: "María Elena ha reservado spa 5 veces este trimestre. Los retiros premium tienen 95% de satisfacción entre socios platino.",
      action_label: "Reservar retiro", action_route: "/mi-club/reservas", icon: "wellness",
    },
  ],
  "fam-003": [
    {
      id: "rec-001c", recommendation_type: "pricing", title: "Plan de Pagos Flexible",
      description: "Su cuenta tiene un saldo pendiente de ₡180,000. Ofrecemos un plan de 3 cuotas sin interés para poner su cuenta al día y mantener beneficios activos.",
      priority: "high", score: 90,
      reasoning: "Saldo pendiente desde abril. Sin gestión, la cuenta entrará en suspensión en 30 días. El plan de pagos protege el acceso de los hijos a las clases de natación los sábados.",
      action_label: "Ver opciones de pago", action_route: "/mi-club/cuenta", icon: "financial",
    },
    {
      id: "rec-002c", recommendation_type: "activity", title: "Clases de Natación Familiar",
      description: "Los hijos ya participan en natación los sábados. Expandimos a clases familiares donde Carlos Andrés y su pareja pueden unirse.",
      priority: "medium", score: 72,
      reasoning: "Los niños asisten consistentemente a natación desde enero. Clases familiares aumentan engagement de los padres y fortalecen vínculo con el club.",
      action_label: "Ver horarios", action_route: "/mi-club/reservas", icon: "activity",
    },
    {
      id: "rec-003c", recommendation_type: "event", title: "Torneo de Natación Principiantes",
      description: "Primer torneo de natación para nivel principiante. Categorías infantiles y familiares. Ideal para motivar a los chicos.",
      priority: "medium", score: 65,
      reasoning: "Los hijos tienen 6 meses de clases de natación. Un torneo de nivel principiante les da un objetivo concreto y refuerza su conexión con el club.",
      action_label: "Inscribir familia", action_route: "/mi-club/eventos", icon: "event",
    },
  ],
  "fam-004": [
    {
      id: "rec-001d", recommendation_type: "activity", title: "Clases de Yoga Matutinas",
      description: "Nuevo horario de yoga a las 6:30am diseñado para padres con hijos en actividades infantiles. Mientras los chicos están en natación, Ana Lucía puede disfrutar de yoga.",
      priority: "high", score: 85,
      reasoning: "Ana Lucía trae a los hijos a natación los sábados. El 80% de socios con perfil similar disfrutan de actividades paralelas. El horario matutino tiene 40% de capacidad libre.",
      action_label: "Reservar clase", action_route: "/mi-club/reservas", icon: "activity",
    },
    {
      id: "rec-002d", recommendation_type: "activity", title: "Programa Actividades Juveniles — Verano",
      description: "Programa completo de actividades para chicos de 6-14 años: arte, deportes, naturaleza. Ideal para las vacaciones de diciembre.",
      priority: "medium", score: 78,
      reasoning: "Los hijos tienen 6 y 8 años según el perfil. El programa juvenil tiene 92% de retención de familias que lo prueban. Descuento 15% para socios bronce.",
      action_label: "Ver programa", action_route: "/mi-club/eventos", icon: "activity",
    },
    {
      id: "rec-003d", recommendation_type: "social", title: "Brunch de Nuevos Socios",
      description: "Evento exclusivo para socios que se unieron en el último año. networking informal con directiva y otros nuevos.",
      priority: "medium", score: 70,
      reasoning: "La familia se unió en enero 2023. Socios que asisten a eventos de bienvenida tienen 60% más retención a 2 años. Ana Lucía no ha asistido a ninguno aún.",
      action_label: "Confirmar asistencia", action_route: "/mi-club/eventos", icon: "social",
    },
  ],
  "fam-005": [
    {
      id: "rec-001e", recommendation_type: "activity", title: "Liderar el Equipo de Pádel Inter-Clubs",
      description: "Fernando es capitán del equipo y ganador del torneo inter-clubes 2025. Proponemos que lidere la preparación para el campeonato nacional.",
      priority: "high", score: 88,
      reasoning: "Fernando lleva 2 años como capitán. El equipo ganó el inter-clubes con récord de participación. Su liderazgo es clave para atraer nuevos jugadores al equipo.",
      action_label: "Ver calendario del equipo", action_route: "/mi-club/eventos", icon: "activity",
    },
    {
      id: "rec-002e", recommendation_type: "social", title: "Evento Networking Empresarial",
      description: "Cena exclusiva para socios con empresas o roles directivos. Networking de alto nivel con otros líderes del club.",
      priority: "medium", score: 75,
      reasoning: "Fernando tiene un perfil empresarial activo. Los eventos de networking para socios oro tienen tasa de satisfacción de 4.7/5 y generan conexiones comerciales valiosas.",
      action_label: "Reservar lugar", action_route: "/mi-club/eventos", icon: "social",
    },
    {
      id: "rec-003e", recommendation_type: "wellness", title: "Programa Wellness Deportivo",
      description: "Plan de rendimiento deportivo con seguimiento nutricional, fisioterapia preventiva y evaluación biomecánica para jugadores de pádel.",
      priority: "medium", score: 68,
      reasoning: "Fernando entrena pádel 4 veces por semana. Jugadores con programa wellness deportivo reducen lesiones un 35% y mejoran rendimiento un 18%.",
      action_label: "Conocer el programa", action_route: "/mi-club/reservas", icon: "wellness",
    },
  ],
  "fam-006": [
    {
      id: "rec-001f", recommendation_type: "engagement", title: "Reactivá tu Membresía — Condiciones Especiales",
      description: "Tu membresía está suspendida por falta de pago. Ofrecemos un plan especial de reactivación: 50% de descuento en la matrícula y 3 meses sin recargo.",
      priority: "high", score: 95,
      reasoning: "La familia lleva suspendida desde enero. Patricia tuvo engagement alto (22 ahora, pero fue 72 hace un año). Condiciones especiales para socios con historial >5 años.",
      action_label: "Ver plan de reactivación", action_route: "/mi-club/cuenta", icon: "engagement",
    },
    {
      id: "rec-002f", recommendation_type: "activity", title: "Actividades Gratuitas de Temporada",
      description: "Aunque tu membresía está suspendida, podés asistir a 2 eventos abiertos este mes: Día de la Familia y Feria Gastronómica.",
      priority: "medium", score: 70,
      reasoning: "Mantener contacto con el club durante la suspensión aumenta la probabilidad de reactivación en un 45%. Los eventos gratuitos son el primer paso.",
      action_label: "Ver eventos abiertos", action_route: "/mi-club/eventos", icon: "activity",
    },
    {
      id: "rec-003f", recommendation_type: "social", title: "Contactá tu Asesor de Bienestar",
      description: "Tu asigned advisor puede ayudarte con opciones de pago, plan de reactivación y actividades que se ajusten a tu situación actual.",
      priority: "medium", score: 60,
      reasoning: "El contacto personalizado con un asesor tiene 3x más tasa de reactivación que el contacto genérico. Patricia necesita una conversación, no un email automático.",
      action_label: "Solicitar contacto", action_route: "/mi-club/cuenta", icon: "social",
    },
  ],
  "fam-007": [
    {
      id: "rec-001g", recommendation_type: "engagement", title: "Tour de Inducción — Instalaciones VIP",
      description: "Como nuevo socio Oro, te ofrecemos un tour personalizado de las instalaciones VIP, presentación de directiva y activación de todos los beneficios de tu nivel.",
      priority: "high", score: 90,
      reasoning: "Diego está en proceso de inducción desde febrero. Socios que completan el tour en el primer mes tienen 80% más engagement a los 6 meses. Su empresa ya patrocina eventos.",
      action_label: "Agendar tour", action_route: "/mi-club/reservas", icon: "engagement",
    },
    {
      id: "rec-002g", recommendation_type: "social", title: "Evento Corporativo — Networking con Directiva",
      description: "Cena exclusiva donde empresas patrocinadoras conocen a la directiva del club. Ideal para fortalecer la relación corporativa de Diego.",
      priority: "medium", score: 80,
      reasoning: "La empresa de Diego patrocina eventos corporativos. La cena de networking genera compromiso a largo plazo y abre puertas para más patrocinios.",
      action_label: "Confirmar asistencia", action_route: "/mi-club/eventos", icon: "social",
    },
    {
      id: "rec-003g", recommendation_type: "activity", title: "Programa de Pádel para Principiantes",
      description: "Clases grupales los martes y jueves a las 7pm. Perfecto para socios que quieren iniciarse en pádel junto con sus hijos adolescentes.",
      priority: "medium", score: 72,
      reasoning: "Diego mencionó interés en pádel durante la entrevista de ingreso. El programa principiante tiene 6 socios nuevos inscritos — buen punto de networking para la familia.",
      action_label: "Inscribirse", action_route: "/mi-club/reservas", icon: "activity",
    },
  ],
  "fam-008": [
    {
      id: "rec-001h", recommendation_type: "financial", title: "Opciones de Reactivación de Membresía",
      description: "Tu membresía fue cancelada por deuda acumulada. Tenemos un programa especial de reactivación con plan de pagos a 12 meses y condonación parcial de intereses.",
      priority: "high", score: 85,
      reasoning: "Deuda de ₡1,100,000 acumulada. Sin gestión, la familia perderá el beneficio de antigüedad (desde 2022). El programa de reactivación es la última oportunidad antes de cobro judicial.",
      action_label: "Ver opciones", action_route: "/mi-club/cuenta", icon: "financial",
    },
    {
      id: "rec-002h", recommendation_type: "engagement", title: "Beneficios de Mantener tu Antigüedad",
      description: "Tu membresía desde 2022 te da derecho a beneficios de antigüedad. Si reactivás antes de diciembre, conservás tus 3 años acumulados.",
      priority: "medium", score: 65,
      reasoning: "Socios con >2 años de antigüedad tienen acceso a descuentos exclusivos y prioridad en eventos. Perder la antigüedad impacta el valor futuro de la membresía.",
      action_label: "Conocer beneficios", action_route: "/mi-club/cuenta", icon: "engagement",
    },
    {
      id: "rec-003h", recommendation_type: "social", title: "Contactá Bienestar Social del Club",
      description: "Nuestro equipo de bienestar puede evaluar opciones de apoyo y adaptar la membresía a tu situación actual.",
      priority: "medium", score: 55,
      reasoning: "Familias que contactan bienestar social tienen 25% más probabilidad de reactivación. El equipo puede ofrecer soluciones que no están en la web.",
      action_label: "Solicitar contacto", action_route: "/mi-club/cuenta", icon: "social",
    },
  ],
};

export function createMockFamilyRecommendationsResponse(
  params?: Record<string, unknown>,
): FamilyRecommendationsResponse {
  const familyId = (params?.family_id as string) ?? "fam-001";
  const profile = FAMILY_PROFILES[familyId];
  const fallbackId = profile ? familyId : "fam-001";
  const recs = FAMILY_RECOMMENDATIONS[fallbackId] ?? FAMILY_RECOMMENDATIONS["fam-001"];

  return {
    status: "success",
    message: `🎯 ${recs.length} recomendación(es) generada(s) para ${profile?.name ?? "la familia"}.`,
    recommendations: recs.map((rec) => ({
      ...rec,
      family_id: familyId,
      recommendation_type: rec.recommendation_type as RecommendationType,
      priority: rec.priority as RecommendationPriority,
      tags: [rec.recommendation_type],
      created_at: NOW,
      updated_at: NOW,
    })),
  };
}

// ── 4. predict_event_attendance ────────────────────────────

export function createMockPredictionResponse(
  params?: Record<string, unknown>,
): PredictAttendanceResponse {
  const eventName =
    (params?.event_name as string) ?? "Gala de Primavera 2025";

  return {
    status: "success",
    message: `📈 Predicción para '${eventName}': 185 asistentes esperados (confianza: alta).`,
    prediction: {
      id: `pred-${Date.now()}`,
      event_id: (params?.event_id as string) ?? "evt-gala-spring",
      event_name: eventName,
      predicted_attendance: 185,
      confidence: PredictionConfidence.High,
      factors: [
        "historical_data",
        "event_type",
        "seasonal_trends",
        "early_registrations",
      ],
      similar_events_avg: 145,
      created_at: NOW,
    },
  };
}

// ── 5. detect_scheduling_conflicts ─────────────────────────

export function createMockConflictsResponse(
  _params?: Record<string, unknown>,
): SchedulingConflictsResponse {
  return {
    status: "success",
    message: "⚠️ 2 conflicto(s) detectado(s).",
    conflicts: [
      {
        id: "conflict-001",
        event_a_id: "evt-yoga-am",
        event_a_name: "Clase de Yoga Matutina",
        event_b_id: "evt-pilates",
        event_b_name: "Pilates Avanzado",
        conflict_type: "venue_overlap",
        severity: ConflictSeverity.High,
        overlap_start: "08:00",
        overlap_end: "09:00",
        shared_resources: ["Studio A", "Instructor María Fernández"],
        suggestion:
          "Mover Pilates Avanzado a 9:30 o reubicar a Studio B",
        created_at: NOW,
      },
      {
        id: "conflict-002",
        event_a_id: "evt-tenis-juv",
        event_a_name: "Torneo de Tenis Juvenil",
        event_b_id: "evt-natacion-inf",
        event_b_name: "Clase Infantil de Natación",
        conflict_type: "resource_overlap",
        severity: ConflictSeverity.Medium,
        overlap_start: "15:00",
        overlap_end: "17:00",
        shared_resources: ["Estacionamiento zona B", "Lockers juveniles"],
        suggestion:
          "Separar horarios con 30 minutos de margen",
        created_at: NOW,
      },
    ],
    total_conflicts: 2,
  };
}

// ── 6. personalize_communication ───────────────────────────

export function createMockDraftResponse(
  params?: Record<string, unknown>,
): PersonalizeCommResponse {
  const familyName =
    (params?.family_name as string) ?? "Familia Rodríguez";

  return {
    status: "success",
    message: `✉️ Borrador de comunicación generado para ${familyName}.`,
    draft: {
      id: `draft-${Date.now()}`,
      family_id: (params?.family_id as string) ?? "fam-001",
      channel: (params?.channel as string) ?? "email",
      subject: `Invitación exclusiva para ${familyName}`,
      body:
        `Estimada ${familyName},\n\n` +
        `Tenemos el gusto de invitarles a nuestros próximos eventos exclusivos de primavera.\n\n` +
        `Próximos eventos:\n` +
        `• Gala de Primavera — 15 de Abril\n` +
        `• Torneo de Tenis — 20-22 de Abril\n` +
        `• Cena de Mariscos — 25 de Abril\n\n` +
        `¡Esperamos verles pronto!\n\n` +
        `Atentamente,\nCastillo Country Club`,
      tone: (params?.tone as string) ?? "friendly",
      personalization_data: {
        family_name: familyName,
        topic: (params?.topic as string) ?? "event_invitation",
      },
      created_at: NOW,
    },
  };
}

// ── 7. identify_social_clusters ────────────────────────────

export function createMockClustersResponse(
  params?: Record<string, unknown>,
): SocialClustersResponse {
  const minSize = (params?.min_size as number) ?? 2;

  const clusters = [
    {
      id: "cluster-001",
      name: "Familias Tenistas",
      cluster_type: ClusterType.Activity,
      description:
        "Grupo de familias que comparten pasión por el tenis. Participan activamente en torneos y clases grupales.",
      family_ids: [
        "fam-001", "fam-005", "fam-012", "fam-023", "fam-034",
        "fam-045", "fam-056", "fam-067", "fam-078", "fam-089",
        "fam-091", "fam-102", "fam-113", "fam-124",
      ],
      size: 14,
      avg_engagement: 87,
      shared_interests: ["tenis", "fitness", "competencia"],
      created_at: DAYS_AGO_30,
    },
    {
      id: "cluster-002",
      name: "Wellness Warriors",
      cluster_type: ClusterType.Interest,
      description:
        "Miembros enfocados en bienestar integral: yoga, spa, meditación y nutrición.",
      family_ids: [
        "fam-003", "fam-015", "fam-027", "fam-039", "fam-042",
        "fam-058", "fam-071", "fam-083", "fam-095",
      ],
      size: 9,
      avg_engagement: 79,
      shared_interests: ["yoga", "spa", "meditación", "nutrición"],
      created_at: DAYS_AGO_30,
    },
    {
      id: "cluster-003",
      name: "Padres Jóvenes Escazú",
      cluster_type: ClusterType.AgeBased,
      description:
        "Familias con padres menores de 35 años en la zona de Escazú. Alta participación en actividades infantiles.",
      family_ids: [
        "fam-002", "fam-008", "fam-014", "fam-020", "fam-026",
        "fam-032", "fam-038", "fam-044", "fam-050", "fam-056",
        "fam-062", "fam-068", "fam-074", "fam-080", "fam-086",
        "fam-092", "fam-098", "fam-104",
      ],
      size: 18,
      avg_engagement: 65,
      shared_interests: ["natación", "kids", "playground"],
      created_at: DAYS_AGO_30,
    },
  ];

  const filtered = clusters.filter((c) => c.size >= minSize);

  return {
    status: "success",
    message: `🔗 ${filtered.length} cluster(es) social(es) identificado(s).`,
    clusters: filtered,
    total_clusters: filtered.length,
  };
}

// ── 8. generate_quarterly_insights ─────────────────────────

export function createMockInsightsResponse(
  params?: Record<string, unknown>,
):
  | QuarterlyInsightsListResponse
  | QuarterlyInsightGetResponse {
  const action = (params?.action as string) ?? "list";

  const insight = {
    id: "insight-001",
    year: 2025,
    period: InsightPeriod.Q1,
    summary:
      "El Castillo Country Club cerró el primer trimestre con un sólido rendimiento. La participación en eventos deportivos aumentó un 15% y la satisfacción general se mantuvo en niveles excelentes.",
    total_members_active: 1250,
    events_held: 45,
    avg_event_attendance: 87.5,
    revenue_total: 42500000,
    top_activities: [
      { name: "Torneo de Tenis", participation: 120 },
      { name: "Cena Temática", participation: 95 },
      { name: "Clase de Yoga", participation: 80 },
      { name: "Natación Libre", participation: 72 },
      { name: "Fitness Grupal", participation: 65 },
    ],
    member_satisfaction_avg: 4.2,
    key_achievements: [
      "Incremento del 15% en asistencia a eventos",
      "Nuevos programas juveniles implementados exitosamente",
      "Satisfacción del socio estable en 4.2/5.0",
    ],
    areas_for_improvement: [
      "Mejorar comunicación digital con socios",
      "Ampliar horarios de fin de semana",
      "Más opciones gastronómicas para familias",
    ],
    recommendations: [
      "Lanzar programa de referidos con incentivos",
      "Expandir clases de bienestar y yoga",
      "Implementar app móvil para reservas",
    ],
    status: SuggestionStatus.Approved,
    created_at: "2025-03-31T10:00:00Z",
    updated_at: "2025-03-31T10:00:00Z",
  };

  if (action === "get") {
    return {
      status: "success",
      insight,
    } satisfies QuarterlyInsightGetResponse;
  }

  if (action === "generate") {
    return {
      status: "success",
      insight: {
        ...insight,
        id: `insight-${Date.now()}`,
        year: (params?.year as number) ?? 2025,
        period: (params?.period as InsightPeriod) ?? InsightPeriod.Q1,
        status: SuggestionStatus.Proposed,
      },
    } satisfies QuarterlyInsightGetResponse;
  }

  // Default: list
  return {
    status: "success",
    message: "📊 1 informe(s) trimestral(es) encontrado(s).",
    insights: [insight],
  } satisfies QuarterlyInsightsListResponse;
}

// ═══ PHASE 12 — Guest Management ═══

const TODAY = new Date().toISOString().split("T")[0];
() => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};
() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};
const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

// ── register_guest ──

export function createMockRegisterGuestResponse(params?: Record<string, unknown>) {
  const action = (params?.action as string) || "list";

  const mockGuest = {
    id: "guest-" + Math.random().toString(36).slice(2, 8),
    family_id: (params?.family_id as string) || "fam-001",
    host_member_id: (params?.host_member_id as string) || "member-001",
    guest_name: (params?.guest_name as string) || "Carlos Méndez",
    guest_email: (params?.guest_email as string) || "carlos@email.com",
    guest_phone: (params?.guest_phone as string) || "+506 8888-1234",
    visit_date: (params?.visit_date as string) || TODAY,
    purpose: (params?.purpose as string) || "social",
    status: "registered",
    privileges: ["pool", "dining"],
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const guestList = [
    { ...mockGuest, id: "guest-001", guest_name: "Carlos Méndez", status: "checked_in" },
    { ...mockGuest, id: "guest-002", guest_name: "Ana Rodríguez", status: "registered", privileges: ["pool"] },
    { ...mockGuest, id: "guest-003", guest_name: "Luis Herrera", status: "completed", purpose: "dining" },
    { ...mockGuest, id: "guest-004", guest_name: "María Solano", status: "registered", visit_date: TODAY },
    { ...mockGuest, id: "guest-005", guest_name: "Roberto Quesada", status: "cancelled", purpose: "sports" },
  ];

  if (action === "list") return { status: "success", message: "5 invitado(s)", guests: guestList };
  if (action === "get") return { status: "success", guest: mockGuest };
  if (action === "create") return { status: "success", message: `✅ Invitado '${mockGuest.guest_name}' registrado.`, guest: mockGuest };
  if (action === "check_in") return { status: "success", message: `🏃 Invitado ingresado al club.`, guest: { ...mockGuest, status: "checked_in" } };
  if (action === "cancel") return { status: "success", message: "❌ Registro cancelado.", guest: { ...mockGuest, status: "cancelled" } };

  return { status: "success", guests: guestList };
}

// ── plan_private_event ──

export function createMockPrivateEventResponse(params?: Record<string, unknown>) {
  const action = (params?.action as string) || "list";

  const events = [
    {
      id: "evt-001",
      family_id: "fam-003",
      event_name: "Boda Quesada-Solano",
      event_type: "wedding",
      venue: "Jardín Principal",
      date: futureDate(45),
      start_time: "16:00",
      end_time: "23:00",
      guest_count: 180,
      budget: 8500000,
      estimated_cost: 7800000,
      status: "contracted",
      coordinator_member_id: "member-003",
      description: "Ceremonia al atardecer con recepción en terraza.",
      special_requirements: "Arreglo floral tropical, DJ en vivo",
      catering_required: true,
      decoration_required: true,
      entertainment_required: true,
      notes: "Familia VIP — atención prioritaria",
      created_at: pastDate(30),
      updated_at: pastDate(5),
    },
    {
      id: "evt-002",
      family_id: "fam-007",
      event_name: "Bautizo Herrera",
      event_type: "baptism",
      venue: "Salón Familiar",
      date: futureDate(20),
      start_time: "11:00",
      end_time: "15:00",
      guest_count: 45,
      budget: 1500000,
      estimated_cost: 1200000,
      status: "approved",
      coordinator_member_id: "member-012",
      description: "Almuerzo íntimo familiar.",
      special_requirements: "Menú infantil especial",
      catering_required: true,
      decoration_required: false,
      entertainment_required: false,
      notes: "",
      created_at: pastDate(15),
      updated_at: pastDate(3),
    },
    {
      id: "evt-003",
      family_id: "fam-001",
      event_name: "15 Años Jiménez",
      event_type: "quinceanera",
      venue: "Salón de Eventos",
      date: futureDate(60),
      start_time: "19:00",
      end_time: "01:00",
      guest_count: 120,
      budget: 5000000,
      estimated_cost: 0,
      status: "inquiry",
      coordinator_member_id: "member-001",
      description: "Fiesta temática tropical.",
      special_requirements: "",
      catering_required: true,
      decoration_required: true,
      entertainment_required: true,
      notes: "Pendiente cotización de decoración",
      created_at: pastDate(2),
      updated_at: pastDate(2),
    },
    {
      id: "evt-004",
      family_id: "fam-015",
      event_name: "Retiro Corporativo TechCR",
      event_type: "corporate",
      venue: "Salón Ejecutivo",
      date: futureDate(10),
      start_time: "08:00",
      end_time: "17:00",
      guest_count: 60,
      budget: 3500000,
      estimated_cost: 3200000,
      status: "deposit_paid",
      coordinator_member_id: "member-020",
      description: "Jornada de team building con actividades al aire libre.",
      special_requirements: "Proyector, sistema de audio, coffee break AM/PM",
      catering_required: true,
      decoration_required: false,
      entertainment_required: false,
      notes: "",
      created_at: pastDate(20),
      updated_at: pastDate(1),
    },
  ];

  const mockEvent = events[0];

  if (action === "list") return { status: "success", message: `${events.length} evento(s)`, events };
  if (action === "get") return { status: "success", event: mockEvent };
  if (action === "create") return { status: "pending_approval", request_id: "req-evt-" + Date.now(), message: `🎉 Evento registrado. Esperando aprobación.`, details: { event_name: params?.event_name, event_type: params?.event_type, venue: params?.venue } };
  if (action === "update_status") return { status: "success", message: `✅ Evento actualizado.`, event: { ...mockEvent, status: params?.new_status ?? "approved" } };

  return { status: "success", events };
}

// ── manage_trial_memberships ──

export function createMockTrialMembershipsResponse(params?: Record<string, unknown>) {
  const action = (params?.action as string) || "list";

  const trials = [
    {
      id: "trial-001",
      guest_name: "Elena Vargas",
      guest_email: "elena.v@gmail.com",
      guest_phone: "+506 8777-5555",
      referred_by_family_id: "fam-002",
      trial_type: "month_trial",
      start_date: pastDate(10),
      end_date: futureDate(20),
      status: "active",
      privileges: ["pool", "gym", "dining"],
      notes: "Muy interesada en membership platino",
      created_at: pastDate(12),
      updated_at: pastDate(10),
    },
    {
      id: "trial-002",
      guest_name: "Marco Barrantes",
      guest_email: "marco.b@outlook.com",
      guest_phone: "+506 8999-1111",
      referred_by_family_id: "fam-005",
      trial_type: "week_trial",
      start_date: pastDate(5),
      end_date: futureDate(2),
      status: "active",
      privileges: ["golf", "dining", "spa"],
      notes: "Ex-miembro que quiere reactivarse",
      created_at: pastDate(7),
      updated_at: pastDate(5),
    },
    {
      id: "trial-003",
      guest_name: "Isabella Chen",
      guest_email: "isabella.chen@yahoo.com",
      guest_phone: "+506 8666-3333",
      referred_by_family_id: "fam-009",
      trial_type: "day_pass",
      start_date: TODAY,
      end_date: TODAY,
      status: "approved",
      privileges: ["pool", "dining"],
      notes: "Visita de evaluación",
      created_at: pastDate(1),
      updated_at: pastDate(1),
    },
    {
      id: "trial-004",
      guest_name: "Diego Rojas",
      guest_email: "diego.r@gmail.com",
      guest_phone: "+506 8555-7777",
      referred_by_family_id: "fam-001",
      trial_type: "month_trial",
      start_date: pastDate(35),
      end_date: pastDate(5),
      status: "converted",
      privileges: ["pool", "gym", "tennis", "dining"],
      notes: "Se convirtió en socio platino",
      created_at: pastDate(40),
      updated_at: pastDate(5),
    },
    {
      id: "trial-005",
      guest_name: "Laura Mora",
      guest_email: "laura.mora@hotmail.com",
      guest_phone: "+506 8444-2222",
      referred_by_family_id: "fam-011",
      trial_type: "week_trial",
      start_date: pastDate(14),
      end_date: pastDate(7),
      status: "expired",
      privileges: ["pool"],
      notes: "",
      created_at: pastDate(16),
      updated_at: pastDate(7),
    },
  ];

  const mockTrial = trials[0];

  if (action === "list") return { status: "success", message: `${trials.length} membresía(s)`, trial_memberships: trials };
  if (action === "get") return { status: "success", trial_membership: mockTrial };
  if (action === "create") return { status: "pending_approval", request_id: "req-trial-" + Date.now(), message: `🎲 Membresía de prueba registrada. Esperando aprobación.`, details: { guest_name: params?.guest_name, trial_type: params?.trial_type } };
  if (action === "update_status") return { status: "success", message: `✅ Membresía actualizada.`, trial_membership: { ...mockTrial, status: params?.new_status ?? "active" } };

  return { status: "success", trial_memberships: trials };
}

// ── manage_guest_privileges ──

export function createMockGuestPrivilegesResponse(params?: Record<string, unknown>) {
  const action = (params?.action as string) || "list";

  const allPrivileges = [
    { type: "pool", name: "Pool" },
    { type: "gym", name: "Gym" },
    { type: "dining", name: "Dining" },
    { type: "tennis", name: "Tennis" },
    { type: "golf", name: "Golf" },
    { type: "spa", name: "Spa" },
    { type: "kids_area", name: "Kids Area" },
    { type: "social_events", name: "Social Events" },
  ];

  if (action === "list") return { status: "success", message: "8 privilegios", privileges: allPrivileges };
  if (action === "get") return { status: "success", guest_id: params?.guest_id ?? "guest-001", guest_name: "Carlos Méndez", privileges: ["pool", "dining"] };
  if (action === "assign") return { status: "success", message: `✅ Privilegio asignado.`, guest: { id: params?.guest_id ?? "guest-001", privileges: ["pool", "dining", params?.privilege_type as string ?? "gym"] } };
  if (action === "revoke") return { status: "success", message: `✅ Privilegio revocado.`, guest: { id: params?.guest_id ?? "guest-001", privileges: ["pool"] } };

  return { status: "success", privileges: allPrivileges };
}

// ── get_guest_analytics ──

export function createMockGuestAnalyticsResponse() {
  return {
    status: "success",
    message: "📊 Analítica de 47 invitados, 4 eventos privados, 5 trials.",
    analytics: {
      total_guests: 47,
      total_private_events: 4,
      total_trial_memberships: 5,
      guests_by_status: {
        registered: 8,
        checked_in: 5,
        completed: 30,
        cancelled: 4,
      },
      guests_by_privilege: [
        { privilege: "pool", count: 32 },
        { privilege: "dining", count: 28 },
        { privilege: "gym", count: 12 },
        { privilege: "tennis", count: 8 },
        { privilege: "golf", count: 6 },
        { privilege: "spa", count: 5 },
        { privilege: "kids_area", count: 4 },
        { privilege: "social_events", count: 3 },
      ],
      events_by_type: [
        { type: "wedding", count: 2 },
        { type: "baptism", count: 1 },
        { type: "quinceanera", count: 1 },
        { type: "corporate", count: 0 },
        { type: "birthday", count: 0 },
        { type: "anniversary", count: 0 },
      ],
      events_by_status: [
        { status: "inquiry", count: 1 },
        { status: "quoted", count: 0 },
        { status: "approved", count: 1 },
        { status: "contracted", count: 1 },
        { status: "deposit_paid", count: 1 },
        { status: "confirmed", count: 0 },
        { status: "completed", count: 0 },
      ],
      trials_by_status: [
        { status: "pending_approval", count: 0 },
        { status: "approved", count: 1 },
        { status: "active", count: 2 },
        { status: "expired", count: 1 },
        { status: "converted", count: 1 },
        { status: "cancelled", count: 0 },
      ],
      trials_by_type: [
        { type: "day_pass", count: 1 },
        { type: "week_trial", count: 2 },
        { type: "month_trial", count: 2 },
      ],
      guests_by_day_of_week: [
        { day: "Lunes", count: 4 },
        { day: "Martes", count: 5 },
        { day: "Miércoles", count: 7 },
        { day: "Jueves", count: 6 },
        { day: "Viernes", count: 10 },
        { day: "Sábado", count: 12 },
        { day: "Domingo", count: 3 },
      ],
      top_host_families: [
        { family_id: "fam-001", family_name: "Familia Jiménez", guest_count: 12 },
        { family_id: "fam-003", family_name: "Familia Quesada", guest_count: 9 },
        { family_id: "fam-005", family_name: "Familia Barrantes", guest_count: 7 },
        { family_id: "fam-002", family_name: "Familia Vargas", guest_count: 6 },
        { family_id: "fam-009", family_name: "Familia Chen-Mora", guest_count: 5 },
      ],
      trial_conversion_rate: 20.0,
      avg_guests_per_event: 101,
      avg_event_budget: 4625000,
      upcoming_events: 3,
      active_trials: 2,
      trials_expiring_soon: 1,
    },
  };
}

// ── guest_management_insights (AI on-demand) ──

export function createMockGuestManagementInsightsResponse() {
  return {
    status: "success",
    message: "🧠 8 insights generados a partir del análisis de invitados y eventos.",
    generated_at: new Date().toISOString(),
    summary:
      "El programa de invitados muestra buena actividad con 47 invitados este mes. " +
      "Se detectaron 3 oportunidades de mejora en conversión de trials, 2 recomendaciones para eventos privados, " +
      "y 3 alertas operativas. La tasa de conversión de trials (20%) está por debajo del benchmark de clubes similares (35%).",
    insights: [
      {
        id: "ins-conv-001",
        category: "conversion",
        priority: "high",
        title: "Tasa de conversión de trials: 20% (benchmark: 35%)",
        description:
          "De los 5 trials recientes, solo 1 se convirtió en membresía. Los trials de 1 mes tienen mejor tasa de conversión que los de 1 semana. " +
          "Los candidatos con acceso a más privilegios (3+) tienen 2x más probabilidad de conversión.",
        confidence: 88,
        metric: "20% vs 35% benchmark",
        recommendation:
          "Extendé el trial mínimo a 2 semanas y ofrecé acceso completo (pool + gym + dining) en vez de acceso limitado. " +
          "El contacto personalizado en el día 5 del trial aumenta la conversión un 40%.",
        action_label: "Ver trials activos",
      },
      {
        id: "ins-event-001",
        category: "event",
        priority: "high",
        title: "Bodas representan el 50% del revenue de eventos",
        description:
          "Las bodas son el tipo de evento más rentable con un presupuesto promedio de $8.5M. " +
          "Sin embargo, solo hay 2 este año. Clubes similares procesan 6-8 bodas anuales.",
        confidence: 85,
        metric: "2 bodas/año vs 6-8 benchmark",
        recommendation:
          "Creá un paquete de 'Boda en el Castillo' con decoración, catering y coordinación incluidos. " +
          "Ofrecé tours de venue los sábados por la tarde para parejas interesadas.",
        action_label: "Ver eventos privados",
      },
      {
        id: "ins-priv-001",
        category: "privilege",
        priority: "medium",
        title: "Pool y Dining son los privilegios más demandados",
        description:
          "El 68% de los invitados accede a piscina y el 60% a gastronomía. " +
          "Golf y spa tienen baja demanda entre invitados (13% y 11%).",
        confidence: 92,
        metric: "Pool: 68%, Dining: 60%, Golf: 13%",
        recommendation:
          "Para trials, ofrecé pool+dining como combo base. " +
          "Considerá paquetes especiales de golf+spa para trial members como diferenciador premium.",
      },
      {
        id: "ins-risk-001",
        category: "risk",
        priority: "high",
        title: "1 trial por expirar en los próximos 3 días",
        description:
          "El trial de Marco Barrantes (referido por Familia Barrantes) expira en 2 días y no ha mostrado interés en membresía. " +
          "Sin seguimiento, hay 80% de probabilidad de que expire sin conversión.",
        confidence: 78,
        metric: "Expira: " + futureDate(2),
        recommendation:
          "Contactá hoy a Marco con una oferta de extensión o un descuento especial de membresía. " +
          "La familia Barrantes es top-3 en referidos — mantener la relación tiene valor estratégico.",
        action_label: "Ver trial",
      },
      {
        id: "ins-freq-001",
        category: "frequency",
        priority: "medium",
        title: "Viernes y sábados concentran el 47% de visitas",
        description:
          "Los viernes (10) y sábados (12) son los días pico de visitas de invitados. " +
          "Los domingos (3) y lunes (4) tienen baja actividad.",
        confidence: 90,
        metric: "Vie+Sáb: 22 de 47 (47%)",
        recommendation:
          "Programá staff adicional para viernes y sábados. " +
          "Considerá promociones especiales de invitados para domingos (brunch familiar) para distribuir la carga.",
      },
      {
        id: "ins-event-002",
        category: "opportunity",
        priority: "medium",
        title: "Eventos corporativos: mercado sin explotar",
        description:
          "Solo 1 de los 4 eventos privados es corporativo, pero tiene el ticket más alto por persona ($58K). " +
          "El segmento corporativo tiene margen 40% mayor que el social.",
        confidence: 72,
        metric: "1 evento corporativo, $3.5M budget",
        recommendation:
          "Desarrollá un paquete de 'Corporate Retreat' con team building, catering premium y acceso a todas las instalaciones. " +
          "Contactá empresas de tecnología de Escazú y Santa Ana — alta densidad de empresas que buscan venues.",
        action_label: "Crear evento corporativo",
      },
      {
        id: "ins-freq-002",
        category: "opportunity",
        priority: "low",
        title: "Familia Jiménez: anfitrión top con 12 invitados",
        description:
          "La familia Jiménez es la que más invitados trae (12). " +
          "Un programa de 'embajadores' con beneficios por referidos podría aumentar los registros un 25%.",
        confidence: 65,
        recommendation:
          "Implementá un programa de referidos: por cada 5 invitados que se conviertan en trials, " +
          "la familia anfitrión recibe un beneficio (cena, descuento, upgrade de tier).",
      },
      {
        id: "ins-risk-002",
        category: "risk",
        priority: "low",
        title: "4 invitados cancelados este mes",
        description:
          "La tasa de cancelación es del 8.5% (4 de 47). " +
          "Las cancelaciones aumentan los fines de semana — posible efecto de planes de último momento.",
        confidence: 58,
        metric: "8.5% cancellation rate",
        recommendation:
          "Implementá un recordatorio automático 24h antes de la visita. " +
          "Las familias que confirman su visita tienen 3x menos cancelaciones.",
      },
    ],
  };
}

// ── Guest Management Intelligence (F40) ──────────────

export function createMockGetGuestHealthScore(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🩺 Health score de invitados: 72/100 (Saludable). 1 factor crítico: conversión de trials.",
    health_score: {
      score: 72,
      level: "healthy" as const,
      factors: [
        {
          name: "Volumen de Invitados",
          score: 82,
          weight: 0.2,
          weighted_score: 16.4,
          impact: "medium" as const,
          detail:
            "142 invitados este mes, +18% vs mes anterior. Tendencia estable.",
        },
        {
          name: "Tasa de Conversión",
          score: 55,
          weight: 0.25,
          weighted_score: 13.75,
          impact: "high" as const,
          detail:
            "Trial conversion 20%, por debajo del benchmark CR (35%). Requiere acción.",
        },
        {
          name: "Visitas Recurrentes",
          score: 74,
          weight: 0.2,
          weighted_score: 14.8,
          impact: "medium" as const,
          detail:
            "42.9% de guests registrados repiten visita. Buena señal de engagement.",
        },
        {
          name: "Fuerza de Referidos",
          score: 80,
          weight: 0.15,
          weighted_score: 12.0,
          impact: "low" as const,
          detail:
            "Familia Jiménez lidera con 12 referidos. Programa de embajadores potencial.",
        },
        {
          name: "Pipeline de Eventos",
          score: 76,
          weight: 0.2,
          weighted_score: 15.2,
          impact: "medium" as const,
          detail:
            "4 eventos privados activos generando flujo constante de nuevos guests.",
        },
      ],
      trend: "stable" as const,
      summary:
        "Score saludable con oportunidad de mejora en conversión de trials. " +
        "Volumen y referidos son fortalezas. Acción prioritaria: mejorar funnel de conversión.",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetConversionFunnel(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🔽 Funnel de conversión: 245 invitados → 8 convertidos (3.3%). Benchmark CR: 5.0%.",
    funnel: {
      stages: [
        {
          stage: "guest_registered" as const,
          label: "Registrados",
          count: 245,
          rate_pct: 100.0,
          cumulative_rate_pct: 100.0,
          avg_days_in_stage: 0,
          dropoff_count: 0,
          benchmark_rate_pct: 100.0,
          vs_benchmark: 0,
        },
        {
          stage: "guest_checked_in" as const,
          label: "Check-in",
          count: 168,
          rate_pct: 68.6,
          cumulative_rate_pct: 68.6,
          avg_days_in_stage: 2.3,
          dropoff_count: 77,
          benchmark_rate_pct: 75.0,
          vs_benchmark: -6.4,
        },
        {
          stage: "repeat_guest" as const,
          label: "Visita Recurrente",
          count: 72,
          rate_pct: 42.9,
          cumulative_rate_pct: 29.4,
          avg_days_in_stage: 18.5,
          dropoff_count: 96,
          benchmark_rate_pct: 50.0,
          vs_benchmark: -7.1,
        },
        {
          stage: "trial_applicant" as const,
          label: "Solicitud Trial",
          count: 28,
          rate_pct: 38.9,
          cumulative_rate_pct: 11.4,
          avg_days_in_stage: 32.0,
          dropoff_count: 44,
          benchmark_rate_pct: 40.0,
          vs_benchmark: -1.1,
        },
        {
          stage: "converted_member" as const,
          label: "Convertido",
          count: 8,
          rate_pct: 28.6,
          cumulative_rate_pct: 3.3,
          avg_days_in_stage: 45.0,
          dropoff_count: 20,
          benchmark_rate_pct: 35.0,
          vs_benchmark: -6.4,
        },
      ],
      overall_conversion_pct: 3.3,
      overall_benchmark_pct: 5.0,
      total_guests: 245,
      total_converted: 8,
      pipeline_value: 12500000,
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetGuestAnalyticsEnhanced(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "📊 Analytics de invitados: 142 guests, 4 eventos, 5 trials, 2 activos.",
    analytics: {
      total_guests: 142,
      active_guests: 12,
      total_private_events: 4,
      upcoming_events: 3,
      total_trial_memberships: 5,
      active_trials: 2,
      converted_trials: 1,
      guest_to_trial_rate: 14.1,
      trial_to_member_rate: 20.0,
      temporal_trends: [
        {
          month: "2026-01",
          new_guests: 18,
          unique_visitors: 22,
          check_ins: 15,
          trials_created: 2,
          trials_converted: 0,
          private_events: 1,
          avg_visit_frequency: 1.8,
        },
        {
          month: "2026-02",
          new_guests: 22,
          unique_visitors: 28,
          check_ins: 19,
          trials_created: 3,
          trials_converted: 1,
          private_events: 0,
          avg_visit_frequency: 2.1,
        },
        {
          month: "2026-03",
          new_guests: 25,
          unique_visitors: 30,
          check_ins: 22,
          trials_created: 4,
          trials_converted: 1,
          private_events: 1,
          avg_visit_frequency: 2.3,
        },
        {
          month: "2026-04",
          new_guests: 20,
          unique_visitors: 25,
          check_ins: 18,
          trials_created: 3,
          trials_converted: 0,
          private_events: 1,
          avg_visit_frequency: 1.9,
        },
        {
          month: "2026-05",
          new_guests: 28,
          unique_visitors: 35,
          check_ins: 25,
          trials_created: 5,
          trials_converted: 1,
          private_events: 0,
          avg_visit_frequency: 2.4,
        },
        {
          month: "2026-06",
          new_guests: 29,
          unique_visitors: 35,
          check_ins: 26,
          trials_created: 5,
          trials_converted: 1,
          private_events: 1,
          avg_visit_frequency: 2.2,
        },
      ],
      top_referrers: [
        { family_id: "fam-001", referral_count: 12, converted_count: 2 },
        { family_id: "fam-003", referral_count: 9, converted_count: 1 },
        { family_id: "fam-005", referral_count: 7, converted_count: 1 },
        { family_id: "fam-002", referral_count: 6, converted_count: 0 },
        { family_id: "fam-009", referral_count: 5, converted_count: 0 },
      ],
      privilege_usage: [
        { privilege_type: "pool", usage_count: 98, unique_guests: 82 },
        { privilege_type: "dining", usage_count: 85, unique_guests: 71 },
        { privilege_type: "gym", usage_count: 35, unique_guests: 28 },
        { privilege_type: "tennis", usage_count: 22, unique_guests: 18 },
        { privilege_type: "golf", usage_count: 15, unique_guests: 12 },
        { privilege_type: "spa", usage_count: 12, unique_guests: 10 },
        { privilege_type: "kids_area", usage_count: 18, unique_guests: 15 },
      ],
      peak_visit_days: [
        { day: "Sábado", visit_count: 45 },
        { day: "Viernes", visit_count: 38 },
        { day: "Jueves", visit_count: 25 },
        { day: "Miércoles", visit_count: 22 },
        { day: "Domingo", visit_count: 20 },
        { day: "Martes", visit_count: 18 },
        { day: "Lunes", visit_count: 15 },
      ],
      event_guest_correlation: [
        { event_type: "wedding", avg_guests_generated: 150, total_events: 2 },
        {
          event_type: "quinceanera",
          avg_guests_generated: 120,
          total_events: 1,
        },
        { event_type: "corporate", avg_guests_generated: 60, total_events: 1 },
        { event_type: "baptism", avg_guests_generated: 45, total_events: 1 },
      ],
      top_purposes: [
        { purpose: "social", count: 58 },
        { purpose: "dining", count: 35 },
        { purpose: "sports", count: 28 },
        { purpose: "event", count: 15 },
        { purpose: "wellness", count: 6 },
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetGuestForecast(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🔮 Forecast 3 meses: volumen +18.3%, trials +60%, conversión +22.5%.",
    forecast: {
      forecasts: [
        {
          metric: "guest_volume",
          current_value: 142,
          predicted_value: 168,
          change_pct: 18.3,
          confidence: 0.72,
          trend: "improving",
          period: "Q3 2026",
          factors: [
            "Seasonal peak Jul-Aug",
            "New event pipeline",
            "Referral growth",
          ],
        },
        {
          metric: "trial_demand",
          current_value: 5,
          predicted_value: 8,
          change_pct: 60.0,
          confidence: 0.65,
          trend: "improving",
          period: "Q3 2026",
          factors: [
            "Hot leads pipeline",
            "Corporate event follow-up",
            "Summer trial promotions",
          ],
        },
        {
          metric: "conversion_rate",
          current_value: 20.0,
          predicted_value: 24.5,
          change_pct: 22.5,
          confidence: 0.58,
          trend: "improving",
          period: "Q3 2026",
          factors: [
            "Extended trial periods",
            "Full privilege access trials",
            "Personalized follow-up day 5",
          ],
        },
        {
          metric: "event_pipeline",
          current_value: 3,
          predicted_value: 5,
          change_pct: 66.7,
          confidence: 0.7,
          trend: "improving",
          period: "Q3 2026",
          factors: [
            "Wedding season inquiries",
            "Corporate retreat bookings",
            "Holiday party pipeline",
          ],
        },
      ],
      trial_capacity_needed: 10,
      seasonal_multiplier: 1.3,
      peak_months: ["Julio", "Agosto", "Diciembre"],
      forecast_horizon_months: 3,
      data_quality_note:
        "Basado en 6 meses de datos. Confianza mejora con más historia.",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGenerateGuestEngagementProposals(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🎯 5 propuestas de engagement generadas. 2 alta prioridad, 5 cross-domain.",
    proposals: {
      proposals: [
        {
          proposal_id: "gp-001",
          proposal_type: "trial_invitation" as const,
          title: "4 hot leads con 5+ visitas sin solicitud de trial",
          description:
            "Familias Jiménez (3 invitados recurrentes), Quesada (2), " +
            "Barrantes (2) y Chen-Mora (1) tienen invitados que han visitado " +
            "más de 5 veces sin aplicar a trial. Estos leads tienen 3x más " +
            "probabilidad de conversión que un guest nuevo.",
          target_family_id: "fam-001",
          target_guest_ids: [
            "guest-001",
            "guest-003",
            "guest-007",
            "guest-012",
          ],
          priority: "high" as const,
          impact: "high" as const,
          confidence: 0.85,
          cross_domain_signals: [
            "member_360: engagement alto en familias referidoras",
            "events: asistieron a eventos club con satisfaction 4.5+",
          ],
          suggested_action: {
            action: "send_trial_invitation",
            domain: "guest_management",
            params: {
              trial_type: "month_trial",
              privileges: ["pool", "gym", "dining"],
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "gp-002",
          proposal_type: "follow_up_campaign" as const,
          title: "2 trials por expirar en 7 días sin seguimiento",
          description:
            "Los trials de Marco Barrantes (expira en 2 días) y Elena Vargas " +
            "(expira en 7 días) no tienen seguimiento programado. Sin contacto, " +
            "80% probabilidad de expiración sin conversión.",
          target_family_id: "fam-005",
          target_guest_ids: ["trial-002", "trial-001"],
          priority: "high" as const,
          impact: "high" as const,
          confidence: 0.82,
          cross_domain_signals: [
            "communications: última comunicación hace 14 días",
            "finance: trial cost ₡85K sin ROI si expira",
          ],
          suggested_action: {
            action: "schedule_followup",
            domain: "communications",
            params: { template: "trial_expiring", urgency: "high" },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "gp-003",
          proposal_type: "referral_activation" as const,
          title: "Top referrers inactivos: Fam. Vargas y Chen-Mora",
          description:
            "Las familias Vargas (6 referidos) y Chen-Mora (5 referidos) no " +
            "han traído invitados en 60 días. Históricamente generan 2-3 " +
            "guests/mes.",
          target_family_id: "fam-002",
          target_guest_ids: [],
          priority: "medium" as const,
          impact: "medium" as const,
          confidence: 0.68,
          cross_domain_signals: [
            "member_360: engagement bajó 12% en ambas familias",
            "communications: sin interacción en 45 días",
          ],
          suggested_action: {
            action: "send_referral_incentive",
            domain: "communications",
            params: {
              incentive_type: "dinner_voucher",
              target: "inactive_referrers",
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "gp-004",
          proposal_type: "privilege_expansion" as const,
          title: "68% de guests usa solo pool — oportunidad cross-sell",
          description:
            "El 68% de invitados accede solo a piscina. Los guests que usan " +
            "3+ privilegios tienen 2.5x más probabilidad de solicitar trial.",
          target_family_id: "",
          target_guest_ids: [],
          priority: "medium" as const,
          impact: "medium" as const,
          confidence: 0.72,
          cross_domain_signals: [
            "satisfaction: guests con más privilegios reportan 4.3 vs 3.8",
            "wellness: spa y gym tienen capacidad disponible",
          ],
          suggested_action: {
            action: "expand_default_privileges",
            domain: "guest_management",
            params: {
              default_privileges: ["pool", "dining", "gym"],
              applies_to: "new_guests",
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "gp-005",
          proposal_type: "event_outreach" as const,
          title:
            "Evento corporativo TechCR generó 15 nuevos guests — follow-up",
          description:
            "El retiro corporativo de TechCR (60 asistentes, 15 nuevos) fue " +
            "hace 10 días. Sin follow-up, 70% se perderá en 30 días.",
          target_family_id: "fam-015",
          target_guest_ids: ["guest-025", "guest-026", "guest-027"],
          priority: "low" as const,
          impact: "medium" as const,
          confidence: 0.65,
          cross_domain_signals: [
            "events: satisfaction del evento 4.6/5",
            "finance: revenue ₡3.5M — margen 42%",
          ],
          suggested_action: {
            action: "send_post_event_followup",
            domain: "communications",
            params: {
              event_id: "evt-004",
              template: "corporate_guest_followup",
              include_trial_offer: true,
            },
          },
          created_at: new Date().toISOString(),
        },
      ],
      total: 5,
      high_priority_count: 2,
      cross_domain_count: 5,
      generated_at: new Date().toISOString(),
    },
  };
}

// ── ML Intelligence (F40) ────────────────────────────

export function createMockGetDataQualityReport(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "📋 Data quality: 78/100 general. 5 de 7 dominios listos para ML.",
    quality_report: {
      overall_score: 78,
      overall_status: "good" as const,
      domains: [
        {
          domain: "finance",
          display_name: "Finanzas",
          completeness_pct: 91,
          freshness_hours: 2,
          consistency_score: 95,
          overall_score: 91,
          status: "excellent" as const,
          gaps: [],
          recommendation: "Datos excelentes para forecasting revenue.",
        },
        {
          domain: "member_360",
          display_name: "Miembros",
          completeness_pct: 82,
          freshness_hours: 4,
          consistency_score: 88,
          overall_score: 82,
          status: "excellent" as const,
          gaps: ["Algunos miembros sin teléfono"],
          recommendation: "Listo para churn prediction y segmentación.",
        },
        {
          domain: "events",
          display_name: "Eventos",
          completeness_pct: 85,
          freshness_hours: 1,
          consistency_score: 90,
          overall_score: 85,
          status: "excellent" as const,
          gaps: [],
          recommendation: "Excelente para demand forecasting de eventos.",
        },
        {
          domain: "facilities",
          display_name: "Instalaciones",
          completeness_pct: 75,
          freshness_hours: 6,
          consistency_score: 80,
          overall_score: 75,
          status: "good" as const,
          gaps: ["Occupancy data incompleto los domingos"],
          recommendation: "Adecuado para análisis, mejorable para predicción.",
        },
        {
          domain: "communications",
          display_name: "Comunicaciones",
          completeness_pct: 70,
          freshness_hours: 8,
          consistency_score: 75,
          overall_score: 70,
          status: "good" as const,
          gaps: ["Historial de campañas parcial"],
          recommendation: "Suficiente para análisis de engagement.",
        },
        {
          domain: "satisfaction",
          display_name: "Satisfacción",
          completeness_pct: 52,
          freshness_hours: 24,
          consistency_score: 60,
          overall_score: 52,
          status: "partial" as const,
          gaps: [
            "Solo 40 encuestas en 6 meses",
            "12 eventos sin survey",
            "Comments no siempre completados",
          ],
          recommendation:
            "Mejorar response rate antes de confiar en predicciones ML.",
        },
        {
          domain: "guest_management",
          display_name: "Invitados",
          completeness_pct: 68,
          freshness_hours: 12,
          consistency_score: 72,
          overall_score: 68,
          status: "good" as const,
          gaps: ["Algunos guests sin email/teléfono"],
          recommendation: "Adecuado para conversion funnel analysis.",
        },
        {
          domain: "age_group",
          display_name: "Grupos Etarios",
          completeness_pct: 40,
          freshness_hours: 48,
          consistency_score: 55,
          overall_score: 40,
          status: "minimal" as const,
          gaps: [
            "Solo 6 meses de datos",
            "Enrollment history incompleta",
            "Sin satisfaction por grupo etario",
          ],
          recommendation:
            "Necesita más datos antes de forecasting confiable.",
        },
      ],
      total_domains: 8,
      domains_ready_for_ml: 5,
      critical_gaps: [
        "Satisfaction: solo 40 encuestas — insuficiente para NLP",
        "Age Group: 6 meses de datos — patrones estacionales no visibles",
      ],
      recommendation:
        "5 de 8 dominios tienen calidad suficiente para ML. " +
        "Priorizar: satisfaction surveys + age group enrollment tracking.",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetAnomalyReport(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🚨 3 anomalías detectadas: 1 high, 2 medium. Riesgo sistémico: 45/100.",
    anomaly_report: {
      anomalies: [
        {
          anomaly_id: "anom-001",
          domain: "finance",
          metric: "fnb_revenue",
          anomaly_type: "drift" as const,
          severity: "high" as const,
          current_value: 8200000,
          expected_value: 10000000,
          deviation_pct: -18.0,
          confidence: 0.88,
          factors: [
            {
              name: "Chef change",
              value: 1,
              expected_range_min: 0,
              expected_range_max: 0,
              deviation_sigma: 3.2,
              contribution_pct: 65,
            },
            {
              name: "Seasonal trend",
              value: 0.95,
              expected_range_min: 0.9,
              expected_range_max: 1.1,
              deviation_sigma: 0.8,
              contribution_pct: 20,
            },
            {
              name: "Menu variety",
              value: 0.7,
              expected_range_min: 0.8,
              expected_range_max: 1.0,
              deviation_sigma: 1.5,
              contribution_pct: 15,
            },
          ],
          explanation:
            "F&B revenue bajó 18% vs patrón histórico (z-score: -3.2). " +
            "Factor principal: cambio de chef asistente hace 6 semanas. " +
            "Impacta: finance, satisfaction (food scores bajando), events (catering quality).",
          affected_domains: ["finance", "satisfaction", "events"],
          suggested_action:
            "Revisar calidad de catering con el nuevo chef. Considerar tasting session.",
          detected_at: new Date().toISOString(),
          detection_method: "ensemble",
          ensemble_consensus: "unanimous",
          ensemble_votes: [
            { method: "isolation_forest", is_anomaly: true, score: 0.92, threshold: 0.7 },
            { method: "iqr", is_anomaly: true, score: 1.0, threshold: 1.5 },
          ],
        },
        {
          anomaly_id: "anom-002",
          domain: "member_360",
          metric: "new_member_engagement",
          anomaly_type: "contextual" as const,
          severity: "medium" as const,
          current_value: 42,
          expected_value: 56,
          deviation_pct: -25.0,
          confidence: 0.75,
          factors: [
            {
              name: "Onboarding gap",
              value: 0.6,
              expected_range_min: 0.8,
              expected_range_max: 1.0,
              deviation_sigma: 2.1,
              contribution_pct: 50,
            },
            {
              name: "Welcome event cancelled",
              value: 1,
              expected_range_min: 0,
              expected_range_max: 0,
              deviation_sigma: 2.5,
              contribution_pct: 35,
            },
            {
              name: "Communication delay",
              value: 14,
              expected_range_min: 3,
              expected_range_max: 7,
              deviation_sigma: 1.8,
              contribution_pct: 15,
            },
          ],
          explanation:
            "Engagement de nuevos miembros (últimos 90 días) es 25% menor que " +
            "la cohorte anterior. Bienvenida cancelada + comunicación tardía como factores.",
          affected_domains: ["member_360", "communications", "engagement"],
          suggested_action:
            "Reactivar welcome events. Programar comunicación de onboarding en día 1.",
          detected_at: new Date().toISOString(),
          detection_method: "ensemble",
          ensemble_consensus: "majority",
          ensemble_votes: [
            { method: "isolation_forest", is_anomaly: true, score: 0.78, threshold: 0.7 },
            { method: "iqr", is_anomaly: false, score: 0.55, threshold: 1.5 },
          ],
        },
        {
          anomaly_id: "anom-003",
          domain: "sports",
          metric: "tennis_bookings",
          anomaly_type: "point" as const,
          severity: "medium" as const,
          current_value: 185,
          expected_value: 138,
          deviation_pct: 34.0,
          confidence: 0.82,
          factors: [
            {
              name: "New coach effect",
              value: 1,
              expected_range_min: 0,
              expected_range_max: 0,
              deviation_sigma: 2.8,
              contribution_pct: 70,
            },
            {
              name: "Summer season",
              value: 1.2,
              expected_range_min: 1.0,
              expected_range_max: 1.15,
              deviation_sigma: 1.2,
              contribution_pct: 20,
            },
            {
              name: "Tournament registration",
              value: 1,
              expected_range_min: 0,
              expected_range_max: 0,
              deviation_sigma: 1.0,
              contribution_pct: 10,
            },
          ],
          explanation:
            "Tennis bookings +34% vs patrón (z-score: +2.8). " +
            "Factor principal: nuevo coach contratado hace 3 semanas. " +
            "Oportunidad: ampliar horarios, considerar clases grupales.",
          affected_domains: ["sports", "facilities"],
          suggested_action:
            "Evaluá ampliar disponibilidad de canchas. El nuevo coach es un activo — retener.",
          detected_at: new Date().toISOString(),
          detection_method: "ensemble",
          ensemble_consensus: "majority",
          ensemble_votes: [
            { method: "isolation_forest", is_anomaly: true, score: 0.81, threshold: 0.7 },
            { method: "iqr", is_anomaly: false, score: 0.62, threshold: 1.5 },
          ],
        },
      ],
      total_anomalies: 3,
      critical_count: 0,
      high_count: 1,
      domains_affected: [
        "finance",
        "member_360",
        "sports",
        "satisfaction",
        "events",
        "communications",
        "engagement",
        "facilities",
      ],
      systemic_risk_score: 45,
      detection_method: "ensemble",
      ensemble_size: 2,
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetDemandForecast(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "📈 Forecast de demanda: 6 targets, horizonte 3 meses. Revenue +7.3%, membership +3.2%.",
    demand_forecasts: [
      {
        target: "revenue" as const,
        display_name: "Ingresos",
        current_value: 45200000,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 48500000,
            lower_bound: 43200000,
            upper_bound: 53800000,
            confidence: 0.72,
            trend_component: 47100000,
            seasonal_component: 1400000,
          },
          {
            period: "2026-08",
            predicted_value: 49800000,
            lower_bound: 44100000,
            upper_bound: 55500000,
            confidence: 0.68,
            trend_component: 47500000,
            seasonal_component: 2300000,
          },
          {
            period: "2026-09",
            predicted_value: 47200000,
            lower_bound: 41500000,
            upper_bound: 52900000,
            confidence: 0.65,
            trend_component: 47800000,
            seasonal_component: -600000,
          },
        ],
        factors: [
          {
            name: "Seasonal peak",
            weight: 0.4,
            direction: "positive" as const,
            description: "Jul-Ago es temporada alta en CR",
          },
          {
            name: "Event pipeline",
            weight: 0.3,
            direction: "positive" as const,
            description: "5 eventos privados programados",
          },
          {
            name: "F&B recovery",
            weight: 0.2,
            direction: "negative" as const,
            description: "Revenue gastronómico aún deprimido por chef change",
          },
          {
            name: "New memberships",
            weight: 0.1,
            direction: "positive" as const,
            description: "3 nuevos miembros esperados vía trials",
          },
        ],
        seasonal_pattern: "Jul-Ago peak, Sep dip, Dec holiday spike",
        trend: "improving" as const,
        vs_last_period_pct: 7.3,
        data_quality_note:
          "Prophet con holidays CR + trend decomposition. 6 meses de datos.",
        model_type: "prophet",
        prophet_components: { trend: 47466667, yearly: 1033333, holidays: 500000 },
        generated_at: new Date().toISOString(),
      },
      {
        target: "membership" as const,
        display_name: "Membresías",
        current_value: 412,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 418,
            lower_bound: 414,
            upper_bound: 422,
            confidence: 0.75,
            trend_component: 415,
            seasonal_component: 3,
          },
          {
            period: "2026-08",
            predicted_value: 422,
            lower_bound: 416,
            upper_bound: 428,
            confidence: 0.72,
            trend_component: 417,
            seasonal_component: 5,
          },
          {
            period: "2026-09",
            predicted_value: 425,
            lower_bound: 418,
            upper_bound: 432,
            confidence: 0.7,
            trend_component: 420,
            seasonal_component: 5,
          },
        ],
        factors: [
          {
            name: "Trial pipeline",
            weight: 0.35,
            direction: "positive" as const,
            description: "2 trials activos + 4 hot leads",
          },
          {
            name: "Churn risk",
            weight: 0.25,
            direction: "negative" as const,
            description: "15 members en riesgo próximo trimestre",
          },
          {
            name: "Referral program",
            weight: 0.2,
            direction: "positive" as const,
            description: "Programa de referidos activo",
          },
          {
            name: "Seasonal",
            weight: 0.2,
            direction: "neutral" as const,
            description: "Verano = mayor interés en membresías",
          },
        ],
        seasonal_pattern: "Peak enrollment en verano y enero",
        trend: "improving" as const,
        vs_last_period_pct: 3.2,
        data_quality_note: "Prophet con holidays CR. Confianza media — churn model calibrándose.",
        model_type: "prophet",
        prophet_components: { trend: 417, yearly: 4.3, holidays: 1.7 },
        generated_at: new Date().toISOString(),
      },
      {
        target: "event_attendance" as const,
        display_name: "Asistencia a Eventos",
        current_value: 85,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 88,
            lower_bound: 82,
            upper_bound: 94,
            confidence: 0.68,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-08",
            predicted_value: 90,
            lower_bound: 84,
            upper_bound: 96,
            confidence: 0.65,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-09",
            predicted_value: 86,
            lower_bound: 78,
            upper_bound: 94,
            confidence: 0.62,
            trend_component: null,
            seasonal_component: null,
          },
        ],
        factors: [
          {
            name: "Summer events",
            weight: 0.4,
            direction: "positive" as const,
            description: "Temporada alta para eventos sociales",
          },
          {
            name: "Corporate bookings",
            weight: 0.3,
            direction: "positive" as const,
            description: "Retiros corporativos Q3",
          },
          {
            name: "Satisfaction feedback",
            weight: 0.3,
            direction: "neutral" as const,
            description: "Satisfaction estable mantiene interés",
          },
        ],
        seasonal_pattern: "Jul-Aug peak, Dec holiday, Feb dip",
        trend: "improving" as const,
        vs_last_period_pct: 3.5,
        data_quality_note: "Exponential smoothing (α=0.3). Attendance % basado en RSVP vs show-up.",
        model_type: "exponential_smoothing",
        prophet_components: null,
        generated_at: new Date().toISOString(),
      },
      {
        target: "facility_occupancy" as const,
        display_name: "Ocupación de Instalaciones",
        current_value: 62,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 68,
            lower_bound: 60,
            upper_bound: 76,
            confidence: 0.7,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-08",
            predicted_value: 72,
            lower_bound: 64,
            upper_bound: 80,
            confidence: 0.67,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-09",
            predicted_value: 65,
            lower_bound: 57,
            upper_bound: 73,
            confidence: 0.64,
            trend_component: null,
            seasonal_component: null,
          },
        ],
        factors: [
          {
            name: "Summer demand",
            weight: 0.45,
            direction: "positive" as const,
            description: "Pool y outdoor areas en alta demanda",
          },
          {
            name: "Tennis boom",
            weight: 0.25,
            direction: "positive" as const,
            description: "Bookings +34% por nuevo coach",
          },
          {
            name: "Gym stability",
            weight: 0.3,
            direction: "neutral" as const,
            description: "Gym mantiene occupancy estable",
          },
        ],
        seasonal_pattern: "Peak outdoor en verano, indoor estable todo el año",
        trend: "improving" as const,
        vs_last_period_pct: 9.7,
        data_quality_note: "Exponential smoothing. Occupancy de domingos incompleta.",
        model_type: "exponential_smoothing",
        prophet_components: null,
        generated_at: new Date().toISOString(),
      },
      {
        target: "guest_volume" as const,
        display_name: "Volumen de Invitados",
        current_value: 142,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 168,
            lower_bound: 148,
            upper_bound: 188,
            confidence: 0.72,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-08",
            predicted_value: 175,
            lower_bound: 152,
            upper_bound: 198,
            confidence: 0.68,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-09",
            predicted_value: 155,
            lower_bound: 135,
            upper_bound: 175,
            confidence: 0.65,
            trend_component: null,
            seasonal_component: null,
          },
        ],
        factors: [
          {
            name: "Event pipeline",
            weight: 0.35,
            direction: "positive" as const,
            description: "5 eventos privados generarán nuevos guests",
          },
          {
            name: "Referral growth",
            weight: 0.3,
            direction: "positive" as const,
            description: "Familia top referrers activas",
          },
          {
            name: "Trial follow-up",
            weight: 0.2,
            direction: "positive" as const,
            description: "Hot leads pipeline",
          },
          {
            name: "Summer season",
            weight: 0.15,
            direction: "positive" as const,
            description: "Más visitas en verano",
          },
        ],
        seasonal_pattern: "Jul-Aug peak, Dec holiday spike",
        trend: "improving" as const,
        vs_last_period_pct: 18.3,
        data_quality_note: "Exponential smoothing. Guest data quality: 68% (good).",
        model_type: "exponential_smoothing",
        prophet_components: null,
        generated_at: new Date().toISOString(),
      },
      {
        target: "satisfaction" as const,
        display_name: "Satisfacción",
        current_value: 4.1,
        forecast_points: [
          {
            period: "2026-07",
            predicted_value: 4.15,
            lower_bound: 3.9,
            upper_bound: 4.4,
            confidence: 0.58,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-08",
            predicted_value: 4.2,
            lower_bound: 3.95,
            upper_bound: 4.45,
            confidence: 0.55,
            trend_component: null,
            seasonal_component: null,
          },
          {
            period: "2026-09",
            predicted_value: 4.18,
            lower_bound: 3.9,
            upper_bound: 4.46,
            confidence: 0.52,
            trend_component: null,
            seasonal_component: null,
          },
        ],
        factors: [
          {
            name: "Food quality recovery",
            weight: 0.3,
            direction: "positive" as const,
            description: "Esperada mejora con ajustes de chef",
          },
          {
            name: "Value perception",
            weight: 0.25,
            direction: "negative" as const,
            description: "'Value' sigue siendo la categoría más baja",
          },
          {
            name: "Service excellence",
            weight: 0.25,
            direction: "positive" as const,
            description: "Servicio consistentemente alto",
          },
          {
            name: "Response rate",
            weight: 0.2,
            direction: "neutral" as const,
            description: "65% response rate estable",
          },
        ],
        seasonal_pattern: "Ligeramente más alto en eventos especiales",
        trend: "improving" as const,
        vs_last_period_pct: 2.4,
        data_quality_note:
          "Exponential smoothing. Solo 40 encuestas — confianza baja. Intervalos amplios.",
        model_type: "exponential_smoothing",
        prophet_components: null,
        generated_at: new Date().toISOString(),
      },
    ],
  };
}


export function createMockGetRevenueForecast(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "💰 Revenue forecast Q3: base ₡142M (±₡12M). 3 escenarios. Recomendado: base.",
    revenue_forecast: {
      horizon_months: 3,
      current_monthly_revenue: 45200000,
      budget_monthly: 48000000,
      scenarios: [
        {
          scenario_type: "optimistic" as const,
          label: "Optimista — Todo sale bien",
          monthly_values: {
            "2026-07": 52000000,
            "2026-08": 54500000,
            "2026-09": 49800000,
          },
          quarterly_total: 156300000,
          vs_budget_pct: 8.5,
          probability: 0.2,
          key_assumptions: [
            "F&B revenue se recupera en 4 semanas",
            "5 eventos privados confirmados ejecutan según plan",
            "3 nuevos miembros vía trials (Plata+)",
            "Nuevos programas de verano llenan capacidad",
          ],
        },
        {
          scenario_type: "base" as const,
          label: "Base — Tendencia actual",
          monthly_values: {
            "2026-07": 48500000,
            "2026-08": 49800000,
            "2026-09": 47200000,
          },
          quarterly_total: 145500000,
          vs_budget_pct: 0.7,
          probability: 0.55,
          key_assumptions: [
            "F&B se recupera parcialmente (70% del impacto)",
            "4 de 5 eventos privados se ejecutan",
            "2 nuevos miembros vía trials",
            "Seasonal peak jul-ago según histórico",
          ],
        },
        {
          scenario_type: "pessimistic" as const,
          label: "Pesimista — Cosas van mal",
          monthly_values: {
            "2026-07": 43200000,
            "2026-08": 44100000,
            "2026-09": 41500000,
          },
          quarterly_total: 128800000,
          vs_budget_pct: -10.6,
          probability: 0.25,
          key_assumptions: [
            "F&B no se recupera — chef change permanente",
            "2 eventos privados se cancelan",
            "Churn: 8 members pierden (80% del riesgo)",
            "Guest volume cae sin eventos pipeline",
          ],
        },
      ],
      recommended_scenario: "base" as const,
      factors: [
        {
          name: "Seasonal peak",
          weight: 0.35,
          direction: "positive" as const,
          description: "Jul-Ago temporada alta en Costa Rica",
        },
        {
          name: "Event pipeline",
          weight: 0.25,
          direction: "positive" as const,
          description: "₡18M+ en eventos privados programados",
        },
        {
          name: "F&B uncertainty",
          weight: 0.2,
          direction: "negative" as const,
          description: "Chef change impacta revenue gastronómico",
        },
        {
          name: "Churn risk",
          weight: 0.1,
          direction: "negative" as const,
          description: "15 members en riesgo = ~₡4.5M/quarter exposure",
        },
        {
          name: "New memberships",
          weight: 0.1,
          direction: "positive" as const,
          description: "Pipeline de trials activos",
        },
      ],
      confidence: 0.68,
      model_type: "prophet",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetChurnMLScores(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🤖 Churn ML: 412 analizados, 15 en riesgo. 4 discrepancias significativas ML vs reglas.",
    churn_report: {
      scores: [
        {
          member_id: "member-034",
          member_name: "Roberto Montero",
          tier: "plata",
          ml_churn_score: 82,
          rule_churn_score: 76,
          discrepancy: 6,
          churn_risk: "critical" as const,
          top_features: [
            { feature: "tenure_months", importance: 32, direction: "negative" },
            { feature: "visit_frequency_drop", importance: 28, direction: "negative" },
            { feature: "satisfaction_trend", importance: 22, direction: "negative" },
            { feature: "communication_response", importance: 18, direction: "negative" },
          ],
          explanation:
            "Miembro plata con 11 meses de tenure. Visitas bajaron 60% en 2 " +
            "meses. Última satisfaction 2.8. No responde comunicaciones.",
          recommended_action:
            "Contacto personalizado del gerente. Ofrecer beneficio de retención.",
        },
        {
          member_id: "member-112",
          member_name: "Ana Lucía Quesada",
          tier: "oro",
          ml_churn_score: 71,
          rule_churn_score: 68,
          discrepancy: 3,
          churn_risk: "high" as const,
          top_features: [
            { feature: "engagement_drop", importance: 35, direction: "negative" },
            { feature: "event_attendance_decline", importance: 25, direction: "negative" },
            { feature: "billing_dispute", importance: 22, direction: "negative" },
            { feature: "family_changes", importance: 18, direction: "neutral" },
          ],
          explanation:
            "Socio oro 3 años. Engagement bajó 40% tras disputa de facturación " +
            "en mayo. No asiste a eventos desde abril.",
          recommended_action:
            "Resolver disputa de facturación urgentemente. Invitación evento VIP.",
        },
        {
          member_id: "member-067",
          member_name: "Diego Vargas",
          tier: "plata",
          ml_churn_score: 65,
          rule_churn_score: 45,
          discrepancy: 20,
          churn_risk: "high" as const,
          top_features: [
            { feature: "communication_drop", importance: 40, direction: "negative" },
            { feature: "visit_pattern_change", importance: 28, direction: "negative" },
            { feature: "peer_group_churn", importance: 18, direction: "negative" },
            { feature: "price_sensitivity", importance: 14, direction: "negative" },
          ],
          explanation:
            "ML detectó: comunicación bajó 70% — reglas no capturan este patrón. " +
            "3 de sus 5 contactos frecuentes también churnearon (peer effect).",
          recommended_action:
            "Incluir en programa de reconexión social. Evento con su grupo de pares.",
        },
        {
          member_id: "member-201",
          member_name: "Carolina Chen",
          tier: "basic",
          ml_churn_score: 58,
          rule_churn_score: 38,
          discrepancy: 20,
          churn_risk: "medium" as const,
          top_features: [
            { feature: "value_perception", importance: 38, direction: "negative" },
            { feature: "usage_decline", importance: 30, direction: "negative" },
            { feature: "competitor_proximity", importance: 18, direction: "negative" },
            { feature: "family_size_change", importance: 14, direction: "positive" },
          ],
          explanation:
            "ML detectó: percepción de valor baja (satisfaction value: 2.5/5). " +
            "Reglas no capturan este factor indirecto. Uso bajó 45%.",
          recommended_action:
            "Ofrecer upgrade trial a Plata con beneficios adicionales.",
        },
      ],
      total_at_risk: 15,
      total_analyzed: 412,
      avg_ml_score: 32,
      avg_rule_score: 28,
      significant_discrepancies: 4,
      top_churn_features: [
        { feature: "visit_frequency_decline", importance_pct: 28 },
        { feature: "engagement_score_drop", importance_pct: 24 },
        { feature: "communication_response_rate", importance_pct: 18 },
        { feature: "satisfaction_trend", importance_pct: 15 },
        { feature: "tenure_months", importance_pct: 8 },
        { feature: "peer_group_behavior", importance_pct: 4 },
        { feature: "price_sensitivity", importance_pct: 3 },
      ],
      segment_breakdown: {
        platino: { count: 2, avg_ml_score: 28, avg_rule_score: 25, high_risk_count: 0 },
        oro: { count: 3, avg_ml_score: 45, avg_rule_score: 42, high_risk_count: 1 },
        plata: { count: 5, avg_ml_score: 55, avg_rule_score: 42, high_risk_count: 2 },
        bronce: { count: 3, avg_ml_score: 38, avg_rule_score: 35, high_risk_count: 0 },
        basic: { count: 2, avg_ml_score: 48, avg_rule_score: 38, high_risk_count: 1 },
      },
      top_risk_drivers: [
        "visit_frequency_decline",
        "engagement_score_drop",
        "communication_response_rate",
        "satisfaction_trend",
        "tenure_months",
        "peer_group_behavior",
        "price_sensitivity",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetMemberSegments(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "👥 Segmentación: 5 clusters, 412 miembros, silhouette 0.62. Champion 15%, At-risk 20%.",
    segmentation: {
      segments: [
        {
          segment_id: "seg-001",
          label: "champion" as const,
          display_name: "Campeones",
          member_count: 62,
          percentage: 15.0,
          avg_ltv: 12500000,
          avg_engagement: 92,
          avg_satisfaction: 4.6,
          avg_visit_frequency: 18.5,
          churn_risk_pct: 2,
          revenue_contribution_pct: 35,
          characteristics: [
            "Alto uso de todas las instalaciones",
            "Asisten a 80%+ de eventos",
            "Referidos frecuentes (3+ por año)",
            "Tenure promedio 4+ años",
          ],
          recommended_strategy:
            "Programa VIP con beneficios exclusivos. Embajadores de marca.",
          key_features: [
            { feature: "ltv", value: 12500000, vs_avg: 8200000 },
            { feature: "engagement", value: 92, vs_avg: 58 },
            { feature: "visits/month", value: 18.5, vs_avg: 8.2 },
          ],
        },
        {
          segment_id: "seg-002",
          label: "loyal" as const,
          display_name: "Leales",
          member_count: 115,
          percentage: 28.0,
          avg_ltv: 7200000,
          avg_engagement: 72,
          avg_satisfaction: 4.2,
          avg_visit_frequency: 12.3,
          churn_risk_pct: 5,
          revenue_contribution_pct: 30,
          characteristics: [
            "Uso consistente pero no máximo",
            "Asisten a 50%+ de eventos",
            "Tenure promedio 2-4 años",
            "Potencial para upgrade a champion",
          ],
          recommended_strategy:
            "Incrementar engagement con actividades personalizadas. Cross-sell servicios.",
          key_features: [
            { feature: "ltv", value: 7200000, vs_avg: 2900000 },
            { feature: "engagement", value: 72, vs_avg: 14 },
            { feature: "visits/month", value: 12.3, vs_avg: 4.1 },
          ],
        },
        {
          segment_id: "seg-003",
          label: "potential" as const,
          display_name: "Con Potencial",
          member_count: 91,
          percentage: 22.0,
          avg_ltv: 3800000,
          avg_engagement: 55,
          avg_satisfaction: 3.9,
          avg_visit_frequency: 7.8,
          churn_risk_pct: 15,
          revenue_contribution_pct: 18,
          characteristics: [
            "Miembros nuevos (< 1 año)",
            "Uso moderado, explorando servicios",
            "Algunos con engagement creciente",
            "Responden bien a onboarding",
          ],
          recommended_strategy:
            "Programa de onboarding robusto. Guía personalizada de actividades.",
          key_features: [
            { feature: "tenure", value: 8, vs_avg: 28 },
            { feature: "engagement_growth", value: 12, vs_avg: 2 },
            { feature: "service_adoption", value: 2.5, vs_avg: 4.1 },
          ],
        },
        {
          segment_id: "seg-004",
          label: "at_risk" as const,
          display_name: "En Riesgo",
          member_count: 82,
          percentage: 20.0,
          avg_ltv: 4500000,
          avg_engagement: 35,
          avg_satisfaction: 3.4,
          avg_visit_frequency: 4.2,
          churn_risk_pct: 42,
          revenue_contribution_pct: 12,
          characteristics: [
            "Visitas y engagement en declive",
            "Satisfaction por debajo del promedio",
            "Many no han visitado en 30+ días",
            "Algunos con billing issues",
          ],
          recommended_strategy:
            "Campaña de retención urgente. Contacto personal. Beneficio de permanencia.",
          key_features: [
            { feature: "visit_decline", value: -45, vs_avg: 0 },
            { feature: "engagement", value: 35, vs_avg: -23 },
            { feature: "satisfaction", value: 3.4, vs_avg: -0.7 },
          ],
        },
        {
          segment_id: "seg-005",
          label: "dormant" as const,
          display_name: "Durmientes",
          member_count: 62,
          percentage: 15.0,
          avg_ltv: 1200000,
          avg_engagement: 12,
          avg_satisfaction: 3.1,
          avg_visit_frequency: 1.2,
          churn_risk_pct: 65,
          revenue_contribution_pct: 5,
          characteristics: [
            "Cero o casi cero actividad",
            "Mantenimiento de membresía pasivo",
            "Sin asistencia a eventos",
            "Posible membresía familiar (socio principal activo)",
          ],
          recommended_strategy:
            "Evaluar si vale la pena retener. Para los que sí: programa de reactivación agresivo.",
          key_features: [
            { feature: "visits_90d", value: 1.2, vs_avg: -87 },
            { feature: "engagement", value: 12, vs_avg: -46 },
            { feature: "last_event_days", value: 180, vs_avg: 152 },
          ],
        },
      ],
      total_members: 412,
      silhouette_score: 0.62,
      optimal_k: 5,
      key_differentiators: [
        "Visit frequency es el #1 diferenciador entre clusters",
        "Engagement score separa champion de loyal",
        "Tenure distingue potential (nuevos) de at_risk (antiguos declinando)",
        "Communication response rate predice churn en at_risk y dormant",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetModelHealth(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🧠 Health de modelos: 5 activos, accuracy promedio 84%. 1 drift significativo. PSI evaluado.",
    model_health: {
      models: [
        {
          model_name: "anomaly_detector",
          display_name: "Detector de Anomalías",
          model_type: "anomaly_detection" as const,
          accuracy: 87,
          mae: 0,
          mape: 0,
          drift_detected: false,
          drift_magnitude: 0.05,
          feature_importance: [
            { feature: "z_score", importance_pct: 35 },
            { feature: "iqr_range", importance_pct: 28 },
            { feature: "domain_context", importance_pct: 22 },
            { feature: "cross_domain_correlation", importance_pct: 15 },
          ],
          last_trained: "2026-06-08T10:00:00Z",
          training_samples: 1200,
          status: "healthy" as const,
          psi_score: 0.04,
          psi_status: "stable" as const,
          retrain_threshold: 0.20,
        },
        {
          model_name: "demand_forecaster",
          display_name: "Pronóstico de Demanda",
          model_type: "forecasting" as const,
          accuracy: 79,
          mae: 3200,
          mape: 8.5,
          drift_detected: true,
          drift_magnitude: 0.32,
          feature_importance: [
            { feature: "seasonal_pattern", importance_pct: 40 },
            { feature: "historical_trend", importance_pct: 28 },
            { feature: "alpha_smoothing", importance_pct: 20 },
            { feature: "external_events", importance_pct: 12 },
          ],
          last_trained: "2026-06-03T14:00:00Z",
          training_samples: 180,
          status: "degraded" as const,
          psi_score: 0.25,
          psi_status: "significant" as const,
          retrain_threshold: 0.20,
        },
        {
          model_name: "revenue_forecaster",
          display_name: "Pronóstico de Ingresos",
          model_type: "forecasting" as const,
          accuracy: 84,
          mae: 2100000,
          mape: 4.8,
          drift_detected: false,
          drift_magnitude: 0.12,
          feature_importance: [
            { feature: "monthly_revenue_history", importance_pct: 38 },
            { feature: "event_pipeline", importance_pct: 25 },
            { feature: "membership_trend", importance_pct: 20 },
            { feature: "seasonal_decomposition", importance_pct: 17 },
          ],
          last_trained: "2026-06-05T08:00:00Z",
          training_samples: 180,
          status: "healthy" as const,
          psi_score: 0.08,
          psi_status: "stable" as const,
          retrain_threshold: 0.20,
        },
        {
          model_name: "churn_predictor",
          display_name: "Predicción de Churn",
          model_type: "churn" as const,
          accuracy: 81,
          mae: 0,
          mape: 0,
          drift_detected: false,
          drift_magnitude: 0.18,
          feature_importance: [
            { feature: "visit_frequency_decline", importance_pct: 28 },
            { feature: "engagement_score", importance_pct: 24 },
            { feature: "communication_response", importance_pct: 18 },
            { feature: "satisfaction_trend", importance_pct: 15 },
            { feature: "tenure", importance_pct: 8 },
            { feature: "peer_behavior", importance_pct: 4 },
            { feature: "price_sensitivity", importance_pct: 3 },
          ],
          last_trained: "2026-06-01T12:00:00Z",
          training_samples: 412,
          status: "retrain_needed" as const,
          psi_score: 0.15,
          psi_status: "mild" as const,
          retrain_threshold: 0.20,
        },
        {
          model_name: "member_segmenter",
          display_name: "Segmentación de Miembros",
          model_type: "clustering" as const,
          accuracy: 86,
          mae: 0,
          mape: 0,
          drift_detected: false,
          drift_magnitude: 0.08,
          feature_importance: [
            { feature: "visit_frequency", importance_pct: 30 },
            { feature: "engagement_score", importance_pct: 25 },
            { feature: "ltv", importance_pct: 20 },
            { feature: "tenure_months", importance_pct: 15 },
            { feature: "satisfaction_avg", importance_pct: 10 },
          ],
          last_trained: "2026-06-04T16:00:00Z",
          training_samples: 412,
          status: "healthy" as const,
          psi_score: 0.06,
          psi_status: "stable" as const,
          retrain_threshold: 0.20,
        },
      ],
      total_models: 5,
      healthy_count: 3,
      degraded_count: 1,
      retrain_needed_count: 1,
      avg_accuracy: 83.4,
      any_drift: true,
      next_scheduled_training: "2026-06-15T00:00:00Z",
      overall_drift_status: "significant",
      drift_reports: [
        {
          model_name: "anomaly_detector",
          psi_score: 0.04,
          status: "stable",
          baseline_window: "2026-01 to 2026-03",
          current_window: "2026-04 to 2026-06",
          bins_used: 10,
          retrain_recommended: false,
          details: [],
        },
        {
          model_name: "demand_forecaster",
          psi_score: 0.25,
          status: "significant",
          baseline_window: "2026-01 to 2026-03",
          current_window: "2026-04 to 2026-06",
          bins_used: 10,
          retrain_recommended: true,
          details: [
            { bin: 0, baseline_pct: 10, current_pct: 4, psi_contribution: 0.04 },
            { bin: 1, baseline_pct: 10, current_pct: 6, psi_contribution: 0.02 },
            { bin: 2, baseline_pct: 10, current_pct: 8, psi_contribution: 0.01 },
            { bin: 3, baseline_pct: 10, current_pct: 10, psi_contribution: 0.00 },
            { bin: 4, baseline_pct: 10, current_pct: 12, psi_contribution: 0.01 },
            { bin: 5, baseline_pct: 10, current_pct: 11, psi_contribution: 0.00 },
            { bin: 6, baseline_pct: 10, current_pct: 13, psi_contribution: 0.02 },
            { bin: 7, baseline_pct: 10, current_pct: 12, psi_contribution: 0.01 },
            { bin: 8, baseline_pct: 10, current_pct: 14, psi_contribution: 0.04 },
            { bin: 9, baseline_pct: 10, current_pct: 10, psi_contribution: 0.00 },
          ],
        },
        {
          model_name: "revenue_forecaster",
          psi_score: 0.08,
          status: "stable",
          baseline_window: "2026-01 to 2026-03",
          current_window: "2026-04 to 2026-06",
          bins_used: 10,
          retrain_recommended: false,
          details: [],
        },
        {
          model_name: "churn_predictor",
          psi_score: 0.15,
          status: "mild",
          baseline_window: "2026-01 to 2026-03",
          current_window: "2026-04 to 2026-06",
          bins_used: 10,
          retrain_recommended: false,
          details: [],
        },
        {
          model_name: "member_segmenter",
          psi_score: 0.06,
          status: "stable",
          baseline_window: "2026-01 to 2026-03",
          current_window: "2026-04 to 2026-06",
          bins_used: 10,
          retrain_recommended: false,
          details: [],
        },
      ],
      next_evaluation: "2026-06-22T00:00:00Z",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockChatClubManager(
  params?: Record<string, unknown>
) {
  return {
    status: "success",
    message: "💬 Club Manager AI respondió con contexto de 8 dominios.",
    response: {
      conversation_id: "conv-" + Date.now().toString(36).slice(-6),
      answer:
        "El club muestra salud general buena (78/100) con áreas de atención:\n\n" +
        "✅ **Fortalezas:** Revenue estable (+7.3% Q3 forecast), tennis en boom " +
        "(+34% bookings), satisfacción en mejora (3.9→4.2 en 6 meses).\n\n" +
        "⚠️ **Atención:** F&B revenue -18% (chef change), new member engagement " +
        "-25%, 15 members en riesgo de churn.\n\n" +
        "🔴 **Acción urgente:** Resolver la calidad de catering (impacta satisfaction " +
        "y revenue simultáneamente). Programar contacto con los 4 members con " +
        "discrepancia ML>Rules (ML ve señales que las reglas no capturan).",
      evidence: [
        {
          source: "finance",
          data: "F&B revenue: ₡8.2M vs ₡10M esperado (-18%)",
          confidence: 0.88,
        },
        {
          source: "member_360",
          data: "New member engagement: 42 vs 56 esperado (-25%)",
          confidence: 0.75,
        },
        {
          source: "satisfaction",
          data: "Overall: 4.1, food: 3.8 (declining), service: 4.4 (improving)",
          confidence: 0.82,
        },
        {
          source: "ml_intelligence",
          data: "15 members at risk, 4 with ML-Rules discrepancy >15pts",
          confidence: 0.81,
        },
      ],
      related_insights: [
        "Anomalía: F&B revenue -18% (drift detected)",
        "Churn ML: 4 discrepancias significativas con reglas",
        "Tennis boom: oportunidad de ampliar programas",
        "Satisfaction trend: improving pero food category declining",
      ],
      suggested_action: {
        action: "generate_action_plan",
        domain: "advisor_intelligence",
        params: {
          focus: ["fnb_recovery", "churn_retention", "new_member_engagement"],
          timeframe: "30_days",
        },
      },
      confidence: 0.85,
      context_used: [
        "finance",
        "member_360",
        "satisfaction",
        "ml_intelligence",
        "events",
        "sports",
        "guest_management",
        "communications",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockExplainPrediction(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🔍 Explicación de predicción churn para member-034: ML 82%, factores degradados.",
    explanation: {
      prediction_id: "pred-034-churn",
      prediction_type: "churn" as const,
      predicted_value: 82,
      factors: [
        {
          feature: "visit_frequency_decline",
          weight: 0.28,
          direction: "negative",
          value: -60,
          explanation:
            "Visitas bajaron de 15/mes a 6/mes en 2 meses (-60%). " +
            "Esto es el factor #1 del churn score.",
        },
        {
          feature: "engagement_score",
          weight: 0.24,
          direction: "negative",
          value: 35,
          explanation:
            "Engagement cayó de 72 a 35 en 60 días. Uso de servicios reducido " +
            "drásticamente — solo pool, sin eventos.",
        },
        {
          feature: "communication_response",
          weight: 0.18,
          direction: "negative",
          value: 0,
          explanation:
            "0% response rate en últimos 3 emails. Sin interacción digital " +
            "en 45 días. ML detecta esto como fuerte predictor de churn.",
        },
        {
          feature: "satisfaction_trend",
          weight: 0.15,
          direction: "negative",
          value: 2.8,
          explanation:
            "Última satisfaction: 2.8/5 (bajo 3.0 = zona crítica). " +
            "Tendencia: 4.2 → 3.5 → 2.8 en 3 meses.",
        },
        {
          feature: "tenure",
          weight: 0.08,
          direction: "negative",
          value: 11,
          explanation:
            "11 meses de tenure — zona de alto riesgo. Miembros con 6-18 " +
            "meses tienen 2x más probabilidad de churn que los de 2+ años.",
        },
        {
          feature: "peer_behavior",
          weight: 0.04,
          direction: "negative",
          value: 1,
          explanation:
            "2 de sus 5 contactos frecuentes también están en riesgo. " +
            "Efecto peer group detectado por ML.",
        },
        {
          feature: "tier",
          weight: 0.03,
          direction: "neutral",
          value: 0,
          explanation:
            "Tier plata: zona media de riesgo. Ni tan comprometido como " +
            "platino ni tan price-sensitive como basic.",
        },
      ],
      sensitivity: [
        {
          change: "Si visitas vuelven a 10+/mes",
          impact_on_prediction: "Churn baja de 82% a 52% (-30 puntos)",
        },
        {
          change: "Si engagement sube a 50+",
          impact_on_prediction: "Churn baja de 82% a 58% (-24 puntos)",
        },
        {
          change: "Si satisfaction sube a 3.5+",
          impact_on_prediction: "Churn baja de 82% a 65% (-17 puntos)",
        },
        {
          change: "Si communication response > 50%",
          impact_on_prediction: "Churn baja de 82% a 70% (-12 puntos)",
        },
      ],
      comparison_to_rules:
        "ML score: 82% vs Rule score: 76% (discrepancia: +6 puntos). " +
        "ML detecta el patrón de comunicación como factor más fuerte que " +
        "las reglas capturan. Las reglas priorizan visit_frequency, ML ve " +
        "que communication_drop es leading indicator.",
      confidence: 0.82,
      limitations: [
        "Solo 11 meses de datos — patrones anuales incompletos",
        "Model churn necesita reentrenamiento (status: retrain_needed)",
        "Peer group basado en 5 contactos — sample pequeño",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockSimulateHypothetical(
  params?: Record<string, unknown>
) {
  const question =
    (params?.question as string) ||
    "¿Qué pasa si aumento la cuota mensual un 15% en julio?";
  return {
    status: "success",
    message:
      "🎯 Simulación: 3 escenarios para '" + question.slice(0, 60) + "...'",
    simulation: {
      question,
      scenarios: [
        {
          scenario_type: "optimistic" as const,
          label: "Los socios lo aceptan",
          description:
            "La mayoría de socios valoran el club lo suficiente para aceptar " +
            "el aumento. Solo los dormant se van.",
          predictions: {
            revenue_change_pct: 12.8,
            members_lost: 5,
            new_churn_risk: 8,
            net_revenue_impact: 3200000,
            member_satisfaction_impact: -0.2,
          },
          probability: 0.2,
          key_assumptions: [
            "Platino y Oro no reaccionan al aumento",
            "Solo 30% de Basic considera alternativas",
            "Comunicación clara sobre valor agregado",
          ],
          risks: [
            "Si satisfaction 'value' ya está en 3.5, un aumento empeora percepción",
            "Competidor cercano podría capitalizar descontento",
          ],
        },
        {
          scenario_type: "base" as const,
          label: "Impacto moderado",
          description:
            "Algunos socios en segmentos price-sensitive reconsideran. " +
            "Churn sube moderadamente pero el revenue neto es positivo.",
          predictions: {
            revenue_change_pct: 8.2,
            members_lost: 12,
            new_churn_risk: 18,
            net_revenue_impact: 1800000,
            member_satisfaction_impact: -0.4,
          },
          probability: 0.55,
          key_assumptions: [
            "Plata y Bronce son los más sensibles al precio",
            "8-12 members adicionales en riesgo de churn",
            "Algunos migran a plan más básico en vez de irse",
          ],
          risks: [
            "12 members perdidos = ~₡3.6M/trimestre de LTV",
            "Reputación: 'el club se puso caro' en word-of-mouth",
            "Satisfaction category 'value' baja a 3.1",
          ],
        },
        {
          scenario_type: "pessimistic" as const,
          label: "Rechazo significativo",
          description:
            "Los socios en riesgo (20% del total) ven el aumento como " +
            "la gota que derrama el vaso. Churn spike + reacciones negativas.",
          predictions: {
            revenue_change_pct: -2.5,
            members_lost: 25,
            new_churn_risk: 35,
            net_revenue_impact: -1200000,
            member_satisfaction_impact: -0.8,
          },
          probability: 0.25,
          key_assumptions: [
            "Members at_risk y dormant se van masivamente",
            "Word-of-mouth negativo afecta trials y referidos",
            "Satisfaction 'value' cae a 2.8",
          ],
          risks: [
            "Net revenue negativo — pierde más de lo que gana",
            "Cascada: referidos se cancelan, trials no se convierten",
            "Posible cobertura mediática negativa (club exclusivo sube precios)",
          ],
        },
      ],
      recommended_scenario: "base" as const,
      risk_assessment:
        "Riesgo moderado-alto. El aumento de 15% es viable pero riesgoso " +
        "con 20% de members en segmento at_risk/dormant. Recomendación: 10% " +
        "de aumento + beneficio nuevo (acceso golf) para justificar. Esto " +
        "reduce churn estimado de 12 a 7 members y net revenue sube a +₡2.8M.",
      cross_domain_impacts: [
        {
          domain: "finance",
          impact: "Revenue impact: +₡1.8M a -₡1.2M dependiendo del escenario",
          severity: "high",
        },
        {
          domain: "member_360",
          impact: "Churn risk sube de 15 a 18-35 members dependiendo del escenario",
          severity: "high",
        },
        {
          domain: "satisfaction",
          impact: "Category 'value' baja 0.3-0.7 puntos",
          severity: "medium",
        },
        {
          domain: "communications",
          impact: "Necesita campaña de comunicación pre-aumento para mitigar reacción",
          severity: "medium",
        },
        {
          domain: "guest_management",
          impact: "Trial conversion podría bajar 5-10% si perception de precio sube",
          severity: "low",
        },
      ],
      confidence: 0.65,
      data_sources: [
        "finance",
        "member_360",
        "satisfaction",
        "ml_intelligence",
        "engagement",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetSatisfactionHealthScore(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🩺 Health score de satisfacción: 76/100 (Saludable). 1 categoría en atención: value.",
    health_score: {
      score: 76,
      level: "healthy" as const,
      factors: [
        {
          name: "Satisfacción General",
          score: 82,
          weight: 0.25,
          weighted_score: 20.5,
          impact: "high" as const,
          detail:
            "Overall avg 4.1/5 basado en 40 encuestas. Consistente los últimos 3 meses.",
        },
        {
          name: "Balance por Categoría",
          score: 68,
          weight: 0.2,
          weighted_score: 13.6,
          impact: "medium" as const,
          detail:
            "8 de 10 categorías sobre 3.5. 'value' y 'food' están por debajo del promedio.",
        },
        {
          name: "Ratio de Sentimiento",
          score: 78,
          weight: 0.2,
          weighted_score: 15.6,
          impact: "medium" as const,
          detail:
            "65% positivo, 25% neutral, 10% negativo. Ratio saludable.",
        },
        {
          name: "Tasa de Respuesta",
          score: 65,
          weight: 0.15,
          weighted_score: 9.75,
          impact: "high" as const,
          detail:
            "65% response rate. Por encima del benchmark (50%) pero mejorable.",
        },
        {
          name: "Tendencia",
          score: 72,
          weight: 0.2,
          weighted_score: 14.4,
          impact: "low" as const,
          detail:
            "Tendencia estable con ligera mejora: 3.9 → 4.0 → 4.1 últimos 3 meses.",
        },
      ],
      trend: "improving" as const,
      summary:
        "Score saludable con tendencia positiva. Valor y comida son áreas de mejora. " +
        "NPS estimado -5 (zona riesgo). Response rate sobre benchmark.",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetSatisfactionIntelligence(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "📊 Intelligence de satisfacción: 40 encuestas, 12 eventos, 10 categorías, NPS -5.",
    intelligence: {
      total_surveys: 40,
      total_events_surveyed: 12,
      overall_avg: 4.1,
      response_rate_pct: 65.0,
      category_scores: [
        {
          category: "venue",
          display_name: "Sede",
          avg_score: 4.3,
          trend: "stable",
          event_count: 12,
          best_event: "Retiro Corporativo TechCR",
          worst_event: "Boda Quesada-Solano",
          vs_club_avg: 0.2,
        },
        {
          category: "food",
          display_name: "Comida",
          avg_score: 3.8,
          trend: "declining",
          event_count: 12,
          best_event: "Gala de Verano",
          worst_event: "Bautizo Herrera",
          vs_club_avg: -0.3,
        },
        {
          category: "service",
          display_name: "Servicio",
          avg_score: 4.4,
          trend: "improving",
          event_count: 12,
          best_event: "15 Años Jiménez",
          worst_event: "Cena Familiar Abril",
          vs_club_avg: 0.3,
        },
        {
          category: "entertainment",
          display_name: "Entretenimiento",
          avg_score: 3.9,
          trend: "stable",
          event_count: 10,
          best_event: "Gala de Verano",
          worst_event: "Bautizo Herrera",
          vs_club_avg: -0.2,
        },
        {
          category: "value",
          display_name: "Valor Percibido",
          avg_score: 3.5,
          trend: "declining",
          event_count: 12,
          best_event: "Retiro Corporativo TechCR",
          worst_event: "Boda Quesada-Solano",
          vs_club_avg: -0.6,
        },
        {
          category: "organization",
          display_name: "Organización",
          avg_score: 4.2,
          trend: "improving",
          event_count: 12,
          best_event: "Retiro Corporativo TechCR",
          worst_event: "Evento Social Marzo",
          vs_club_avg: 0.1,
        },
        {
          category: "ambiance",
          display_name: "Ambiente",
          avg_score: 4.1,
          trend: "stable",
          event_count: 12,
          best_event: "15 Años Jiménez",
          worst_event: "Cena Familiar Abril",
          vs_club_avg: 0.0,
        },
        {
          category: "cleanliness",
          display_name: "Limpieza",
          avg_score: 4.5,
          trend: "stable",
          event_count: 12,
          best_event: "Gala de Verano",
          worst_event: "Evento Social Marzo",
          vs_club_avg: 0.4,
        },
        {
          category: "timing",
          display_name: "Puntualidad",
          avg_score: 4.0,
          trend: "stable",
          event_count: 12,
          best_event: "Retiro Corporativo TechCR",
          worst_event: "15 Años Jiménez",
          vs_club_avg: -0.1,
        },
        {
          category: "overall",
          display_name: "General",
          avg_score: 4.1,
          trend: "improving",
          event_count: 12,
          best_event: "Gala de Verano",
          worst_event: "Boda Quesada-Solano",
          vs_club_avg: 0.0,
        },
      ],
      event_type_comparisons: [
        {
          event_type: "corporate",
          display_name: "Corporativo",
          event_count: 3,
          avg_score: 4.6,
          total_responses: 18,
          sentiment_breakdown: { positive: 15, neutral: 2, negative: 1 },
          best_category: "organization",
          worst_category: "value",
          vs_club_avg: 0.5,
          trend: "improving",
        },
        {
          event_type: "wedding",
          display_name: "Bodas",
          event_count: 2,
          avg_score: 3.8,
          total_responses: 14,
          sentiment_breakdown: { positive: 8, neutral: 4, negative: 2 },
          best_category: "venue",
          worst_category: "value",
          vs_club_avg: -0.3,
          trend: "stable",
        },
        {
          event_type: "quinceanera",
          display_name: "15 Años",
          event_count: 2,
          avg_score: 4.3,
          total_responses: 10,
          sentiment_breakdown: { positive: 8, neutral: 2, negative: 0 },
          best_category: "ambiance",
          worst_category: "timing",
          vs_club_avg: 0.2,
          trend: "stable",
        },
        {
          event_type: "baptism",
          display_name: "Bautizos",
          event_count: 2,
          avg_score: 3.6,
          total_responses: 8,
          sentiment_breakdown: { positive: 4, neutral: 3, negative: 1 },
          best_category: "service",
          worst_category: "food",
          vs_club_avg: -0.5,
          trend: "declining",
        },
        {
          event_type: "social",
          display_name: "Sociales",
          event_count: 3,
          avg_score: 4.0,
          total_responses: 12,
          sentiment_breakdown: { positive: 7, neutral: 4, negative: 1 },
          best_category: "cleanliness",
          worst_category: "entertainment",
          vs_club_avg: -0.1,
          trend: "stable",
        },
      ],
      sentiment_flow: [
        {
          month: "2026-01",
          avg_score: 3.9,
          survey_count: 5,
          positive_pct: 60.0,
          negative_pct: 12.0,
          neutral_pct: 28.0,
          nps_proxy: -8,
        },
        {
          month: "2026-02",
          avg_score: 4.0,
          survey_count: 6,
          positive_pct: 62.0,
          negative_pct: 10.0,
          neutral_pct: 28.0,
          nps_proxy: -6,
        },
        {
          month: "2026-03",
          avg_score: 3.8,
          survey_count: 7,
          positive_pct: 55.0,
          negative_pct: 15.0,
          neutral_pct: 30.0,
          nps_proxy: -10,
        },
        {
          month: "2026-04",
          avg_score: 4.0,
          survey_count: 6,
          positive_pct: 63.0,
          negative_pct: 8.0,
          neutral_pct: 29.0,
          nps_proxy: -5,
        },
        {
          month: "2026-05",
          avg_score: 4.1,
          survey_count: 8,
          positive_pct: 67.0,
          negative_pct: 9.0,
          neutral_pct: 24.0,
          nps_proxy: -3,
        },
        {
          month: "2026-06",
          avg_score: 4.2,
          survey_count: 8,
          positive_pct: 70.0,
          negative_pct: 7.0,
          neutral_pct: 23.0,
          nps_proxy: -1,
        },
      ],
      nps: {
        nps_score: -5,
        promoter_pct: 35.0,
        passive_pct: 55.0,
        detractor_pct: 10.0,
        promoter_count: 14,
        passive_count: 22,
        detractor_count: 4,
        total_surveys: 40,
        classification: "neutral",
      },
      cross_domain_signals: [
        {
          domain: "events",
          signal:
            "Eventos corporativos con satisfaction 4.6+ → replicar formato para weddings",
          relevance: "high",
        },
        {
          domain: "member_360",
          signal:
            "Familias con satisfaction < 3.0 tienen 2.5x más churn probability",
          relevance: "high",
        },
        {
          domain: "finance",
          signal:
            "Correlación: satisfaction 4.5+ → 40% más revenue per event",
          relevance: "medium",
        },
        {
          domain: "communications",
          signal: "12 eventos completados sin encuesta enviada — follow-up pendiente",
          relevance: "medium",
        },
        {
          domain: "guest_management",
          signal:
            "Guests que asistieron a eventos con satisfaction 4.5+ → 3x más likely a convertir",
          relevance: "medium",
        },
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetSatisfactionBenchmark(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "📏 Benchmarks de satisfacción: overall 4.1 vs benchmark CR 4.3. 2 categorías críticas.",
    benchmarks: {
      overall_benchmarks: [
        {
          metric: "Satisfacción General",
          current_value: 4.1,
          club_average: 4.1,
          benchmark_value: 4.3,
          vs_club: 0.0,
          vs_benchmark: -0.2,
          status: "needs_attention",
        },
        {
          metric: "Response Rate",
          current_value: 65.0,
          club_average: 65.0,
          benchmark_value: 50.0,
          vs_club: 0.0,
          vs_benchmark: 15.0,
          status: "on_track",
        },
        {
          metric: "NPS Proxy",
          current_value: -5.0,
          club_average: -5.0,
          benchmark_value: 10.0,
          vs_club: 0.0,
          vs_benchmark: -15.0,
          status: "critical",
        },
      ],
      category_benchmarks: [
        {
          metric: "Comida",
          current_value: 3.8,
          club_average: 4.1,
          benchmark_value: 4.2,
          vs_club: -0.3,
          vs_benchmark: -0.4,
          status: "needs_attention",
        },
        {
          metric: "Servicio",
          current_value: 4.4,
          club_average: 4.1,
          benchmark_value: 4.3,
          vs_club: 0.3,
          vs_benchmark: 0.1,
          status: "on_track",
        },
        {
          metric: "Valor Percibido",
          current_value: 3.5,
          club_average: 4.1,
          benchmark_value: 4.0,
          vs_club: -0.6,
          vs_benchmark: -0.5,
          status: "critical",
        },
        {
          metric: "Limpieza",
          current_value: 4.5,
          club_average: 4.1,
          benchmark_value: 4.3,
          vs_club: 0.4,
          vs_benchmark: 0.2,
          status: "on_track",
        },
      ],
      event_type_benchmarks: [
        {
          metric: "Corporativo",
          current_value: 4.6,
          club_average: 4.1,
          benchmark_value: 4.3,
          vs_club: 0.5,
          vs_benchmark: 0.3,
          status: "on_track",
        },
        {
          metric: "Bodas",
          current_value: 3.8,
          club_average: 4.1,
          benchmark_value: 4.3,
          vs_club: -0.3,
          vs_benchmark: -0.5,
          status: "needs_attention",
        },
        {
          metric: "Bautizos",
          current_value: 3.6,
          club_average: 4.1,
          benchmark_value: 4.0,
          vs_club: -0.5,
          vs_benchmark: -0.4,
          status: "critical",
        },
      ],
      outlier_categories: [
        {
          category: "Limpieza",
          avg_score: 4.5,
          deviation: 0.4,
          direction: "above",
        },
        {
          category: "Valor Percibido",
          avg_score: 3.5,
          deviation: -0.6,
          direction: "below",
        },
        {
          category: "Servicio",
          avg_score: 4.4,
          deviation: 0.3,
          direction: "above",
        },
      ],
      best_performing_event_type: "corporate",
      worst_performing_event_type: "baptism",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGenerateSatisfactionEngagementProposals(
  params?: Record<string, unknown>
) {
  void params;
  return {
    status: "success",
    message:
      "🎯 5 propuestas de engagement de satisfacción. 2 alta prioridad, 4 cross-domain.",
    proposals: {
      proposals: [
        {
          proposal_id: "sp-001",
          proposal_type: "category_review" as const,
          title: "Category 'food' bajó 0.8pts en 3 eventos consecutivos",
          description:
            "La satisfacción con comida ha bajado de 4.3 a 3.5 en los últimos " +
            "3 eventos (Bautizo, Cena Abril, Social Mayo). El ingrediente común: " +
            "cambio de chef asistente hace 6 semanas. Bautizos y eventos pequeños " +
            "son los más afectados (3.2 avg vs 4.1 para corporativos).",
          target_event_id: "",
          target_event_type: "",
          target_category: "food",
          priority: "high" as const,
          impact: "high" as const,
          confidence: 0.88,
          cross_domain_signals: [
            "events: 3 eventos consecutivos con misma tendencia",
            "finance: food cost 32% del budget — alto impacto en margen",
          ],
          suggested_action: {
            action: "schedule_chef_review",
            domain: "operations",
            params: {
              focus: "small_events_menu",
              include_tasting: true,
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "sp-002",
          proposal_type: "format_replication" as const,
          title:
            "Eventos corporativos tienen satisfaction 4.6 — replicar formato para weddings",
          description:
            "Los 3 eventos corporativos promedian 4.6/5 (el más alto de todos " +
            "los tipos). Los elementos diferenciadores: organización impecable, " +
            "coffee breaks, y comunicación pre-evento. Las bodas promedian 3.8 — " +
            "aplicar los mismos protocolos podría cerrar la brecha.",
          target_event_id: "",
          target_event_type: "wedding",
          target_category: "",
          priority: "high" as const,
          impact: "high" as const,
          confidence: 0.82,
          cross_domain_signals: [
            "events: corporate format = 4.6, wedding format = 3.8",
            "finance: weddings representan 45% del revenue de eventos",
          ],
          suggested_action: {
            action: "create_wedding_enhanced_package",
            domain: "events",
            params: {
              include_protocols: ["pre_event_comm", "coffee_break", "coordinator_plus"],
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "sp-003",
          proposal_type: "survey_follow_up" as const,
          title: "12 eventos completados sin encuesta enviada",
          description:
            "12 eventos de los últimos 3 meses no tienen survey. Esto afecta " +
            "la response rate y la calidad del análisis. 7 de estos eventos " +
            "fueron sociales pequeños que usualmente generan buen feedback.",
          target_event_id: "",
          target_event_type: "",
          target_category: "",
          priority: "medium" as const,
          impact: "medium" as const,
          confidence: 0.75,
          cross_domain_signals: [
            "communications: no se envió post-event survey automation",
            "member_360: familias sin feedback = engagement desconocido",
          ],
          suggested_action: {
            action: "enable_auto_survey",
            domain: "communications",
            params: {
              trigger: "event_completed",
              delay_hours: 24,
              template: "post_event_survey",
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "sp-004",
          proposal_type: "pricing_review" as const,
          title:
            "Category 'value' (3.5) es la más baja — gap con 'quality' (4.1)",
          description:
            "Los socios valoran la calidad (venue 4.3, service 4.4, cleanliness 4.5) " +
            "pero sienten que el precio no justifica el valor total (3.5). " +
            "Las bodas y bautizos son los más afectados. Corporativos no (presupuesto empresa).",
          target_event_id: "",
          target_event_type: "",
          target_category: "value",
          priority: "medium" as const,
          impact: "high" as const,
          confidence: 0.72,
          cross_domain_signals: [
            "finance: avg_event_budget ₡4.6M — percepción vs realidad",
            "guest_management: trial conversion baja — posible factor precio",
          ],
          suggested_action: {
            action: "review_event_pricing",
            domain: "finance",
            params: {
              focus: ["wedding_packages", "baptism_packages"],
              include_value_adds: true,
            },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "sp-005",
          proposal_type: "event_redesign" as const,
          title:
            "Bautizos con satisfaction 3.6 — el tipo de evento más bajo",
          description:
            "Los 2 bautizos encuestados promedian 3.6/5 — el más bajo de todos. " +
            "Problemas: comida (3.2), entretenimiento (3.4). Los bautizos " +
            "tradicionalmente usan catering externo sin supervisión del club.",
          target_event_id: "",
          target_event_type: "baptism",
          target_category: "",
          priority: "low" as const,
          impact: "medium" as const,
          confidence: 0.65,
          cross_domain_signals: [
            "events: bautizos = 2 eventos/año, bajo volumen pero alto impacto reputacional",
            "finance: margen bajo en bautizos vs corporativos",
          ],
          suggested_action: {
            action: "redesign_baptism_package",
            domain: "events",
            params: {
              include_supervised_catering: true,
              add_entertainment_options: true,
            },
          },
          created_at: new Date().toISOString(),
        },
      ],
      total: 5,
      high_priority_count: 2,
      cross_domain_count: 4,
      generated_at: new Date().toISOString(),
    },
  };
}
// ═══════════════════════════════════════════════════════════
// FASE 13 — Finance Enhancement — Factories
// Append to: src/shared/mocks/factories.ts
// All monetary values in Costa Rican colones (₡).
// Realistic data for Castillo Country Club.
// ═══════════════════════════════════════════════════════════

import type {
  GetFinancialSummaryResponse,
  FinanceExpenseCreateResponse,
  FinanceInvoiceCreateResponse,
  FinanceBudgetCheckResponse,
  FinancePaymentProcessResponse,
  FinanceReportGenerateResponse,
  FinanceAccountStatusResponse,
  FinanceCategoryUpdateResponse,
  GenerateAiAnalysisResponse,
  FinanceScenarioSimulateResponse,
  FinanceOpportunitiesScanResponse,
  FinanceBoardBriefingResponse,
} from "./contracts";

// ── 1. Financial Summary (bridge mock for sparklines + KPIs) ──

export function createMockFinancialSummary(
  period: string = "current_quarter",
): GetFinancialSummaryResponse {
  return {
    status: "success",
    period,
    period_label: "2do Trimestre 2026",
    total_revenue: 42_300_000,
    total_expenses: 34_800_000,
    net_income: 7_500_000,
    profit_margin: 17.7,
    revenue_change_pct: 8.2,
    expense_change_pct: 5.1,
    revenue_by_category: [
      { category: "memberships", label: "Cuotas de membresía", amount: 25_500_000, percentage: 60.3, trend_pct: 4.1 },
      { category: "food_beverage", label: "Food & Beverage", amount: 8_400_000, percentage: 19.9, trend_pct: 23.0 },
      { category: "events", label: "Eventos privados", amount: 4_500_000, percentage: 10.6, trend_pct: 15.8 },
      { category: "sports", label: "Actividades deportivas", amount: 2_400_000, percentage: 5.7, trend_pct: 6.2 },
      { category: "other", label: "Otros (guest fees, rentals)", amount: 1_500_000, percentage: 3.5, trend_pct: -2.1 },
    ],
    expense_by_category: [
      { category: "staff", label: "Personal", amount: 12_600_000, budget: 14_500_000, variance: -1_900_000, variance_pct: -13.1 },
      { category: "maintenance", label: "Mantenimiento", amount: 6_300_000, budget: 5_500_000, variance: 800_000, variance_pct: 14.5 },
      { category: "food_beverage", label: "Food & Beverage", amount: 5_400_000, budget: 7_000_000, variance: -1_600_000, variance_pct: -22.9 },
      { category: "utilities", label: "Servicios públicos", amount: 3_600_000, budget: 4_500_000, variance: -900_000, variance_pct: -20.0 },
      { category: "equipment", label: "Equipamiento", amount: 2_400_000, budget: 3_000_000, variance: -600_000, variance_pct: -20.0 },
      { category: "events", label: "Eventos", amount: 1_800_000, budget: 2_500_000, variance: -700_000, variance_pct: -28.0 },
      { category: "marketing", label: "Marketing", amount: 1_500_000, budget: 2_000_000, variance: -500_000, variance_pct: -25.0 },
      { category: "insurance", label: "Seguros", amount: 900_000, budget: 1_200_000, variance: -300_000, variance_pct: -25.0 },
      { category: "other", label: "Otros", amount: 300_000, budget: 800_000, variance: -500_000, variance_pct: -62.5 },
    ],
    monthly_trend: [
      { month: "2026-01", month_label: "Ene", revenue: 15_100_000, expenses: 11_900_000, net: 3_200_000 },
      { month: "2026-02", month_label: "Feb", revenue: 14_200_000, expenses: 11_500_000, net: 2_700_000 },
      { month: "2026-03", month_label: "Mar", revenue: 14_500_000, expenses: 11_800_000, net: 2_700_000 },
      { month: "2026-04", month_label: "Abr", revenue: 14_800_000, expenses: 12_000_000, net: 2_800_000 },
      { month: "2026-05", month_label: "May", revenue: 13_500_000, expenses: 11_500_000, net: 2_000_000 },
      { month: "2026-06", month_label: "Jun", revenue: 14_000_000, expenses: 11_300_000, net: 2_700_000 },
    ],
  };
}

// ── 2. Expense Create (HITL) ──

export function createMockFinanceExpenseCreate(
  params?: Record<string, unknown>,
): FinanceExpenseCreateResponse {
  return {
    status: "pending_approval",
    message: `💰 Gasto "${params?.description ?? "Reparación bomba piscina"}" por ₡${Number(params?.amount ?? 850_000).toLocaleString()} categoría ${String(params?.category ?? "maintenance")} registrado. Pendiente de aprobación.`,
    request_id: `exp-${Date.now()}`,
    description: String(params?.description ?? "Reparación bomba piscina"),
    amount: Number(params?.amount ?? 850_000),
    category: String(params?.category ?? "maintenance"),
  };
}

// ── 3. Invoice Create (HITL) ──

export function createMockFinanceInvoiceCreate(
  params?: Record<string, unknown>,
): FinanceInvoiceCreateResponse {
  const subtotal = Number(params?.subtotal ?? 1_250_000);
  const taxRate = Number(params?.tax_rate ?? 13);
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax;
  return {
    status: "pending_approval",
    message: `📄 Factura por ₡${total.toLocaleString()} generada para la familia. Pendiente de aprobación.`,
    request_id: `inv-${Date.now()}`,
    subtotal,
    tax,
    total,
    family_id: String(params?.family_id ?? "fam-001"),
  };
}

// ── 4. Budget Check (AUTO) ──

export function createMockFinanceBudgetCheck(
  params?: Record<string, unknown>,
): FinanceBudgetCheckResponse {
  const period = String(params?.period ?? "quarterly");
  const lines = [
    { category: "staff", budgeted: 14_500_000, spent: 12_600_000, remaining: 1_900_000, utilization_pct: 86.9 },
    { category: "maintenance", budgeted: 5_500_000, spent: 6_300_000, remaining: -800_000, utilization_pct: 114.5 },
    { category: "food_beverage", budgeted: 7_000_000, spent: 5_400_000, remaining: 1_600_000, utilization_pct: 77.1 },
    { category: "utilities", budgeted: 4_500_000, spent: 3_600_000, remaining: 900_000, utilization_pct: 80.0 },
    { category: "equipment", budgeted: 3_000_000, spent: 2_400_000, remaining: 600_000, utilization_pct: 80.0 },
    { category: "events", budgeted: 2_500_000, spent: 1_800_000, remaining: 700_000, utilization_pct: 72.0 },
    { category: "marketing", budgeted: 2_000_000, spent: 1_500_000, remaining: 500_000, utilization_pct: 75.0 },
    { category: "insurance", budgeted: 1_200_000, spent: 900_000, remaining: 300_000, utilization_pct: 75.0 },
    { category: "other", budgeted: 800_000, spent: 300_000, remaining: 500_000, utilization_pct: 37.5 },
  ];
  const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const utilizationPct = Math.round((totalSpent / totalBudgeted) * 1000) / 10;
  return {
    status: "success",
    message: `⚠️ Presupuesto ${period}: ₡${(totalSpent / 1_000_000).toFixed(1)}M de ₡${(totalBudgeted / 1_000_000).toFixed(1)}M utilizado (${utilizationPct}%). Restante: ₡${(totalRemaining / 1_000_000).toFixed(1)}M`,
    data: { period, total_budgeted: totalBudgeted, total_spent: totalSpent, total_remaining: totalRemaining, utilization_pct: utilizationPct, lines },
    total_budgeted: totalBudgeted,
    total_spent: totalSpent,
    total_remaining: totalRemaining,
    utilization_pct: utilizationPct,
  };
}

// ── 5. Payment Process (HITL) ──

export function createMockFinancePaymentProcess(
  params?: Record<string, unknown>,
): FinancePaymentProcessResponse {
  return {
    status: "pending_approval",
    message: `💳 Pago de ₡${Number(params?.amount ?? 2_500_000).toLocaleString()} vía ${String(params?.method ?? "transfer")} registrado. Pendiente de aprobación.`,
    request_id: `pay-${Date.now()}`,
    amount: Number(params?.amount ?? 2_500_000),
    method: String(params?.method ?? "transfer"),
    family_id: String(params?.family_id ?? "fam-001"),
  };
}

// ── 6. Report Generate (SEMI) ──

export function createMockFinanceReportGenerate(
  params?: Record<string, unknown>,
): FinanceReportGenerateResponse {
  const dateFrom = String(params?.date_from ?? "2026-04-01");
  const dateTo = String(params?.date_to ?? "2026-06-30");
  return {
    status: "success",
    message: `📊 Reporte generado: ${dateFrom} a ${dateTo}. Ingresos ₡42.3M, Gastos ₡34.8M, Resultado neto ₡7.5M (17.7%).`,
    data: {
      report_type: String(params?.report_type ?? "income_expense"),
      period_start: dateFrom,
      period_end: dateTo,
      total_income: 42_300_000,
      total_expenses: 34_800_000,
      net_result: 7_500_000,
      income_breakdown: [
        { category: "memberships", label: "Cuotas", amount: 25_500_000, trend_pct: 4.1 },
        { category: "food_beverage", label: "F&B", amount: 8_400_000, trend_pct: 23.0 },
        { category: "events", label: "Eventos", amount: 4_500_000, trend_pct: 15.8 },
        { category: "sports", label: "Deportes", amount: 2_400_000, trend_pct: 6.2 },
        { category: "other", label: "Otros", amount: 1_500_000, trend_pct: -2.1 },
      ],
      expense_breakdown: [
        { category: "staff", label: "Personal", amount: 12_600_000, trend_pct: 3.2 },
        { category: "maintenance", label: "Mantenimiento", amount: 6_300_000, trend_pct: 31.0 },
        { category: "food_beverage", label: "F&B", amount: 5_400_000, trend_pct: 18.5 },
        { category: "utilities", label: "Servicios", amount: 3_600_000, trend_pct: 2.1 },
        { category: "equipment", label: "Equipamiento", amount: 2_400_000, trend_pct: -5.0 },
        { category: "events", label: "Eventos", amount: 1_800_000, trend_pct: 12.0 },
        { category: "marketing", label: "Marketing", amount: 1_500_000, trend_pct: 0.0 },
        { category: "insurance", label: "Seguros", amount: 900_000, trend_pct: 0.0 },
        { category: "other", label: "Otros", amount: 300_000, trend_pct: -15.0 },
      ],
      summary: `Reporte Q2 2026: Ingresos ₡42.3M (+8.2%), Gastos ₡34.8M (+5.1%), Margen 17.7%. Mantenimiento 31% sobre presupuesto por reparación de piscina.`,
    },
    report_type: String(params?.report_type ?? "income_expense"),
    period: `${dateFrom} a ${dateTo}`,
  };
}

// ── 7. Account Status (AUTO) ──

export function createMockFinanceAccountStatus(
  params?: Record<string, unknown>,
): FinanceAccountStatusResponse {
  const families: Record<string, FinanceAccountStatusResponse["data"]> = {
    "fam-001": {
      family_id: "fam-001",
      family_name: "Familia Castillo Montero",
      total_invoiced: 8_750_000,
      total_paid: 6_250_000,
      balance_due: 2_500_000,
      overdue_amount: 1_250_000,
      overdue_count: 1,
      last_payment_date: "2026-05-10",
      invoices: [
        { id: "inv-001", family_id: "fam-001", family_name: "Familia Castillo Montero", subtotal: 2_250_000, tax: 292_500, total: 2_542_500, status: "paid", due_date: "2026-04-15", paid_date: "2026-04-12", notes: "" },
        { id: "inv-002", family_id: "fam-001", family_name: "Familia Castillo Montero", subtotal: 2_500_000, tax: 325_000, total: 2_825_000, status: "overdue", due_date: "2026-05-15", paid_date: "", notes: "Evento privado abril" },
        { id: "inv-003", family_id: "fam-001", family_name: "Familia Castillo Montero", subtotal: 2_250_000, tax: 292_500, total: 2_542_500, status: "sent", due_date: "2026-06-15", paid_date: "", notes: "" },
      ],
    },
    "fam-002": {
      family_id: "fam-002",
      family_name: "Familia Quesada Vargas",
      total_invoiced: 5_400_000,
      total_paid: 5_400_000,
      balance_due: 0,
      overdue_amount: 0,
      overdue_count: 0,
      last_payment_date: "2026-06-02",
      invoices: [
        { id: "inv-004", family_id: "fam-002", family_name: "Familia Quesada Vargas", subtotal: 2_700_000, tax: 351_000, total: 3_051_000, status: "paid", due_date: "2026-05-15", paid_date: "2026-05-14", notes: "" },
        { id: "inv-005", family_id: "fam-002", family_name: "Familia Quesada Vargas", subtotal: 2_700_000, tax: 351_000, total: 3_051_000, status: "paid", due_date: "2026-06-15", paid_date: "2026-06-02", notes: "" },
      ],
    },
    "fam-003": {
      family_id: "fam-003",
      family_name: "Familia Solano Brenes",
      total_invoiced: 3_600_000,
      total_paid: 1_800_000,
      balance_due: 1_800_000,
      overdue_amount: 0,
      overdue_count: 0,
      last_payment_date: "2026-04-20",
      invoices: [
        { id: "inv-006", family_id: "fam-003", family_name: "Familia Solano Brenes", subtotal: 1_800_000, tax: 234_000, total: 2_034_000, status: "paid", due_date: "2026-04-15", paid_date: "2026-04-20", notes: "" },
        { id: "inv-007", family_id: "fam-003", family_name: "Familia Solano Brenes", subtotal: 1_800_000, tax: 234_000, total: 2_034_000, status: "pending", due_date: "2026-06-15", paid_date: "", notes: "" },
      ],
    },
  };
  const fid = String(params?.family_id ?? "fam-001");
  const fam = families[fid] ?? families["fam-001"]!;
  return {
    status: "success",
    message: fam.balance_due <= 0
      ? `✅ Estado de cuenta: al día.`
      : `⚠️ Estado de cuenta: saldo ₡${fam.balance_due.toLocaleString()}.${fam.overdue_count > 0 ? ` ¡${fam.overdue_count} factura(s) vencida(s)!` : ""}`,
    data: fam,
    balance_due: fam.balance_due,
    overdue_amount: fam.overdue_amount,
  };
}

// ── 8. Category Update (SEMI) ──

export function createMockFinanceCategoryUpdate(
  params?: Record<string, unknown>,
): FinanceCategoryUpdateResponse {
  return {
    status: "success",
    message: `✅ Presupuesto de "${String(params?.category ?? "maintenance")}" actualizado a ₡${Number(params?.budget_amount ?? 6_000_000).toLocaleString()}.`,
    category: String(params?.category ?? "maintenance"),
    budget_amount: Number(params?.budget_amount ?? 6_000_000),
  };
}

// ── 9. AI Financial Analysis (AUTO) ──

export function createMockGenerateAiAnalysis(
  params?: Record<string, unknown>,
): GenerateAiAnalysisResponse {
  const period = String(params?.period ?? "current_quarter");
  return {
    status: "success",
    message: `📊 Análisis financiero generado para ${period}`,
    data: {
      health_score: {
        total: 78.4,
        grade: "B+",
        trend_vs_previous: 3.2,
        factors: [
          { name: "Liquidez", score: 72.0, weight: 0.20, contribution: 14.4, trend: "improving", detail: "Ratio flujo/gasto mensual: 1.6x" },
          { name: "Eficiencia", score: 82.5, weight: 0.25, contribution: 20.6, trend: "stable", detail: "Utilización presupuestaria: 80.8%" },
          { name: "Crecimiento", score: 75.3, weight: 0.20, contribution: 15.1, trend: "improving", detail: "Margen operativo: 17.7%" },
          { name: "Cobranza", score: 80.1, weight: 0.20, contribution: 16.0, trend: "stable", detail: "Estimado basado en estructura de ingresos" },
          { name: "Presupuesto", score: 76.8, weight: 0.15, contribution: 11.5, trend: "declining", detail: "Variación presupuestaria: -8.8%" },
        ],
      },
      cash_flow_forecast: {
        method: "run_rate_with_seasonality",
        confidence: "medium",
        confidence_band_pct: 80.0,
        periods: [
          { label: "Jul 2026", projected_revenue: 12_880_000, projected_expenses: 11_300_000, projected_net: 1_580_000, cumulative_cash: 9_080_000, lower_bound: 980_000, upper_bound: 2_180_000 },
          { label: "Ago 2026", projected_revenue: 12_880_000, projected_expenses: 11_300_000, projected_net: 1_580_000, cumulative_cash: 10_660_000, lower_bound: 880_000, upper_bound: 2_280_000 },
          { label: "Sep 2026", projected_revenue: 12_880_000, projected_expenses: 11_300_000, projected_net: 1_580_000, cumulative_cash: 12_240_000, lower_bound: 780_000, upper_bound: 2_380_000 },
          { label: "Oct 2026", projected_revenue: 14_100_000, projected_expenses: 11_300_000, projected_net: 2_800_000, cumulative_cash: 15_040_000, lower_bound: 1_900_000, upper_bound: 3_700_000 },
          { label: "Nov 2026", projected_revenue: 15_260_000, projected_expenses: 11_300_000, projected_net: 3_960_000, cumulative_cash: 19_000_000, lower_bound: 2_860_000, upper_bound: 5_060_000 },
          { label: "Dic 2026", projected_revenue: 16_420_000, projected_expenses: 11_300_000, projected_net: 5_120_000, cumulative_cash: 24_120_000, lower_bound: 3_720_000, upper_bound: 6_520_000 },
        ],
        assumptions: [
          "Ingresos mensuales promedio: ₡14.1M",
          "Gastos mensuales promedio: ₡11.6M",
          "Factor estacional Costa Rica: +8% dic-may, -8% jun-sep",
          "Proyección basada en tasa actual sin cambios estructurales",
        ],
      },
      revenue_concentration: {
        entropy: 1.847,
        max_entropy: 2.322,
        diversification_index: 0.795,
        herfindahl_index: 4_258,
        sources: [
          { name: "memberships", label: "Cuotas de membresía", share_pct: 60.3, amount: 25_500_000, trend: "stable" },
          { name: "food_beverage", label: "Food & Beverage", share_pct: 19.9, amount: 8_400_000, trend: "growing" },
          { name: "events", label: "Eventos privados", share_pct: 10.6, amount: 4_500_000, trend: "growing" },
          { name: "sports", label: "Actividades deportivas", share_pct: 5.7, amount: 2_400_000, trend: "stable" },
          { name: "other", label: "Otros", share_pct: 3.5, amount: 1_500_000, trend: "declining" },
        ],
        risk_assessment: "RIESGO MEDIO: Diversificación 79.5%. Concentración moderada — 60% del ingreso depende de cuotas. Oportunidad de crecimiento en F&B y eventos corporativos.",
      },
      financial_anomalies: [
        {
          id: "budget_overrun_maintenance",
          domain: "budget",
          severity: "high",
          title: "Sobrepresupuesto: Mantenimiento",
          detail: "114.5% utilizado — ₡6.3M de ₡5.5M presupuestado. Reparación de bomba de piscina y mantenimiento de áreas verdes.",
          deviation_pct: 14.5,
          estimated_annual_impact: 3_200_000,
          suggested_action: "Auditar gastos de mantenimiento y evaluar contrato de servicio preventivo.",
        },
        {
          id: "revenue_concentration",
          domain: "revenue",
          severity: "medium",
          title: "Concentración de ingresos en cuotas",
          detail: "HHI = 4,258. 'Cuotas de membresía' representa 60% del ingreso total. Diversificación recomendada.",
          deviation_pct: 10.0,
          estimated_annual_impact: 0,
          suggested_action: "Desarrollar programas de eventos corporativos y membresías trial para diversificar.",
        },
        {
          id: "expense_growth_maintenance",
          domain: "expense",
          severity: "high",
          title: "Aumento de gastos: Mantenimiento",
          detail: "Crecimiento de 31% vs periodo anterior. Impulsado por reparaciones mayores no presupuestadas.",
          deviation_pct: 31.0,
          estimated_annual_impact: 4_800_000,
          suggested_action: "Implementar programa de mantenimiento preventivo. Reservar fondo para reparaciones mayores.",
        },
      ],
      recommendations: [
        {
          id: "rec_1",
          category: "cost_reduction",
          action: "Implementar contrato de mantenimiento preventivo con proveedor preferido",
          justification: "Gastos de mantenimiento 31% sobre tendencia. Un contrato preventivo reduce costos de emergencia 40-60%.",
          estimated_impact_annual: 2_400_000,
          confidence: "high",
          priority: "high",
          implementation_effort: "medium",
          deadline: "",
        },
        {
          id: "rec_2",
          category: "revenue_growth",
          action: "Desarrollar programa de eventos corporativos para empresas de Escazú y Santa Ana",
          justification: "Margen de 17.7% permite inversión. Eventos corporativos tienen 3x margen vs eventos sociales.",
          estimated_impact_annual: 5_400_000,
          confidence: "medium",
          priority: "high",
          implementation_effort: "high",
          deadline: "",
        },
        {
          id: "rec_3",
          category: "risk_mitigation",
          action: "Implementar programa de cobranza proactiva con recordatorios a 7 días de vencimiento",
          justification: "1 factura vencida por ₡1.25M. Cobranza proactiva reduce aging 90+ en 60%.",
          estimated_impact_annual: 1_500_000,
          confidence: "medium",
          priority: "medium",
          implementation_effort: "low",
          deadline: "",
        },
        {
          id: "rec_4",
          category: "efficiency",
          action: "Ajustar presupuesto operativo según estacionalidad costarricense",
          justification: "Temporada alta (dic-abr) requiere más staff y F&B. Temporada baja (jun-set) permite mantenimiento mayor.",
          estimated_impact_annual: 1_200_000,
          confidence: "high",
          priority: "low",
          implementation_effort: "low",
          deadline: "",
        },
        {
          id: "rec_5",
          category: "revenue_growth",
          action: "Programa Happy Hour Premium viernes 5-7pm con DJ en pool area",
          justification: "Viernes tienen 3.2x más tráfico que martes. El consumo F&B cae después de las 5pm hacia bares externos.",
          estimated_impact_annual: 4_800_000,
          confidence: "medium",
          priority: "medium",
          implementation_effort: "low",
          deadline: "",
        },
        {
          id: "rec_6",
          category: "risk_mitigation",
          action: "Diversificar portafolio de ingresos reduciendo dependencia de cuotas a menos de 50%",
          justification: "HHI de 4,258 indica concentración alta. Un socio que se va impacta más que si los ingresos estuvieran diversificados.",
          estimated_impact_annual: 8_400_000,
          confidence: "low",
          priority: "medium",
          implementation_effort: "high",
          deadline: "",
        },
      ],
      positive_trends: [
        { title: "Crecimiento explosivo en F&B", detail: "+23% vs trimestre anterior tras renovación del menú.", metric: "food_beverage", change_pct: 23.0, period: "vs Q1 2026" },
        { title: "Eventos privados en récord", detail: "+15.8% con 12 eventos este trimestre. Boda de ₡8.5M fue el hito.", metric: "events", change_pct: 15.8, period: "vs Q1 2026" },
        { title: "Resultado neto positivo sostenido", detail: "Ingreso neto de ₡7.5M con margen de 17.7% — 6 meses consecutivos positivos.", metric: "net_income", change_pct: 17.7, period: "Q2 2026" },
      ],
      alert_signals: [
        { title: "Gastos de mantenimiento +31%", detail: "Impulsado por reparaciones no presupuestadas. Si la tendencia continúa, impacto anual de ₡4.8M.", severity: "high", deviation_pct: 31.0, threshold_exceeded: 20.0 },
        { title: "Facturas vencidas acumulándose", detail: "₡1.25M en facturas vencidas > 30 días. Riesgo de aging 90+ si no se actúa.", severity: "medium", deviation_pct: 14.3, threshold_exceeded: 10.0 },
      ],
      projection: {
        method: "run_rate_with_seasonality",
        confidence: "medium",
        summary: "Proyección a 6 meses: ingreso neto acumulado de ₡24.1M. Tendencia de crecimiento impulsada por temporada alta (oct-dic). Margen saludable de 17.7% permite planificación de inversiones estratégicas.",
        key_assumptions: ["Margen operativo actual: 17.7%", "Revenue mensual promedio: ₡14.1M", "Patrón estacional Costa Rica aplicado"],
        risk_factors: ["Estacionalidad costarricense (baja junio-septiembre)", "Posible incremento en costos de servicios públicos", "Riesgo de churn de socios de alto valor", "Gastos de mantenimiento imprevisibles"],
      },
      member_economics: {
        avg_revenue_per_member: 211_500,
        avg_cost_per_member: 174_000,
        avg_margin_per_member: 37_500,
        ltv_estimate: 750_000,
        cac_estimate: 31_725,
        ltv_cac_ratio: 23.6,
        by_tier: [
          { tier: "Premium", avg_revenue: 312_000, avg_cost: 198_000, margin_pct: 36.5, count: 85 },
          { tier: "Básico", avg_revenue: 144_000, avg_cost: 156_000, margin_pct: -8.3, count: 72 },
          { tier: "VIP", avg_revenue: 486_000, avg_cost: 234_000, margin_pct: 51.9, count: 30 },
        ],
      },
    },
  };
}

// ── 10. Scenario Simulation (AUTO — NEW AI) ──

export function createMockScenarioSimulation(
  _params?: Record<string, unknown>,
): FinanceScenarioSimulateResponse {
  return {
    status: "success",
    message: "🔄 Simulación ejecutada: aumento de cuota 8%",
    data: {
      baseline: {
        revenue: 42_300_000,
        expenses: 34_800_000,
        net: 7_500_000,
        margin: 17.7,
        health_score: 78.4,
        cash_flow_12m: 30_000_000,
      },
      scenario: {
        revenue: 46_200_000,
        expenses: 35_100_000,
        net: 11_100_000,
        margin: 24.0,
        health_score: 83.6,
        cash_flow_12m: 44_400_000,
      },
      delta: {
        revenue_change: 3_900_000,
        expenses_change: 300_000,
        net_change: 3_600_000,
        margin_change: 6.3,
        health_score_change: 5.2,
        cash_flow_12m_change: 14_400_000,
      },
      risks: [
        {
          factor: "Churn segmento Básico",
          severity: "medium",
          detail: "3 familias en segmento Básico superarían 15% de ingreso comprometido con cuota.",
          affected_segments: ["Básico"],
          probability: 0.35,
        },
        {
          factor: "Margen temporada baja",
          severity: "low",
          detail: "En temporada baja (jun-set), el margen podría caer a 9.2% sin ajuste de gastos.",
          affected_segments: ["Todos"],
          probability: 0.20,
        },
      ],
      ai_commentary: "El aumento del 8% en cuotas es financieramente saludable siempre que se combine con un programa de retención para el segmento Básico. La alternativa de 5% general + 12% segmento Premium/VIP preserva margen con menor riesgo de churn. El cash flow proyectado a 12 meses mejora ₡14.4M, lo cual permite financiar la cancha de pádel sin deuda.",
      confidence: "medium",
      time_horizon_months: 12,
    },
  };
}

// ── 11. Opportunity Scan (AUTO — NEW AI) ──

export function createMockOpportunityScan(): FinanceOpportunitiesScanResponse {
  return {
    status: "success",
    message: "🔍 Scanner completado: 5 oportunidades identificadas por ₡6.5M/mes potencial",
    data: {
      opportunities: [
        {
          id: "opp-001",
          category: "facility_utilization",
          title: "Happy Hour Premium — Viernes 5-7pm",
          description: "Los viernes tienen 3.2x más tráfico que martes. Un happy hour premium con DJ en pool area captura revenue que hoy se pierde hacia bares externos de Escazú.",
          estimated_monthly_revenue: 1_200_000,
          confidence: 82,
          implementation_effort: "low",
          time_to_revenue_weeks: 2,
          data_basis: "Análisis de tráfico por día + consumo F&B por horario",
          affected_segments: ["Premium", "VIP", "Jóvenes profesionales"],
          risk_factors: ["Posible cannibalización de consumo regular del viernes"],
          status: "new",
        },
        {
          id: "opp-002",
          category: "temporal",
          title: "Programa Work-From-Club para temporada baja",
          description: "Socios remotos en temporada baja (jun-set) buscan espacios de trabajo. Paquete: cowork + almuerzo + acceso gym por ₡85K/mes.",
          estimated_monthly_revenue: 1_800_000,
          confidence: 74,
          implementation_effort: "medium",
          time_to_revenue_weeks: 4,
          data_basis: "Encuesta de satisfacción 2025: 34% de socios trabajan remoto",
          affected_segments: ["Premium", "Básico", "Profesionales remotos"],
          risk_factors: ["Necesita acondicionar espacio de cowork", "Demanda solo en temporada baja"],
          status: "new",
        },
        {
          id: "opp-003",
          category: "partnership",
          title: "Eventos corporativos para empresas de Escazú/Santa Ana",
          description: "La zona corporativa de Escazú y Santa Ana tiene 200+ empresas. Eventos corporativos tienen 3x margen vs sociales. Paquete: salón + catering + AV por ₡1.5M-3M.",
          estimated_monthly_revenue: 2_500_000,
          confidence: 68,
          implementation_effort: "high",
          time_to_revenue_weeks: 8,
          data_basis: "Benchmarking con Cariari Country Club y Valle del Sol",
          affected_segments: ["Corporativo"],
          risk_factors: ["Requiere inversión en equipo AV", "Necesita equipo de ventas dedicado"],
          status: "new",
        },
        {
          id: "opp-004",
          category: "pricing",
          title: "Guest fee premium fines de semana",
          description: "Los guest fees actuales están 15% bajo el mercado. Implementar fee premium sábados/domings (+₡5K por guest) sin impactar días de baja afluencia.",
          estimated_monthly_revenue: 400_000,
          confidence: 88,
          implementation_effort: "low",
          time_to_revenue_weeks: 1,
          data_basis: "Comparativa de fees con 5 clubes de la GAM",
          affected_segments: ["Todos los socios con invitados"],
          risk_factors: ["Percepción negativa si se implementa sin comunicación"],
          status: "new",
        },
        {
          id: "opp-005",
          category: "cross_sell",
          title: "Paquetes gym + F&B para socios deportistas",
          description: "45% de socios que usan el gym nunca consumen F&B. Paquete post-workout: batido proteico + snack por ₡3.5K, vendido como plan mensual ₡45K.",
          estimated_monthly_revenue: 600_000,
          confidence: 71,
          implementation_effort: "medium",
          time_to_revenue_weeks: 3,
          data_basis: "Cruce de datos: acceso gym vs consumo F&B por socio",
          affected_segments: ["Deportistas", "Premium", "VIP"],
          risk_factors: ["Necesita desarrollo de menú específico", "Margen de F&B en snacks es bajo"],
          status: "new",
        },
      ],
      total_opportunity_value: 6_500_000,
      scan_date: "2026-06-15T10:30:00Z",
      data_quality_score: 78,
    },
  };
}

// ── 12. Board Briefing (AUTO — NEW AI) ──

export function createMockBoardBriefing(): FinanceBoardBriefingResponse {
  return {
    status: "success",
    message: "📋 Briefing ejecutivo generado para 2do Trimestre 2026",
    data: {
      period: "2do Trimestre 2026",
      generated_at: "2026-06-15T10:30:00Z",
      key_metrics: [
        { label: "Revenue", value: "₡42.3M", change_pct: 8.2, trend: "up", assessment: "positive" },
        { label: "Margen operativo", value: "17.7%", change_pct: 2.1, trend: "up", assessment: "positive" },
        { label: "Health Score", value: "78/100 (B+)", change_pct: 3.2, trend: "up", assessment: "positive" },
        { label: "Socios activos", value: "187", change_pct: 2.2, trend: "up", assessment: "positive" },
      ],
      sections: [
        {
          id: "numbers",
          title: "Números clave",
          content: "El trimestre cerró con ingresos de ₡42.3M (+8.2% vs mismo trimestre del año anterior), gastos de ₡34.8M, y un resultado neto de ₡7.5M. El margen operativo de 17.7% se encuentra dentro del benchmark de clubes privados (15-25%).",
          severity: "highlight",
          items: [
            "Revenue ₡42.3M (+8.2% vs Q2 2025)",
            "Margen 17.7% — dentro de benchmark privado (15-25%)",
            "Health Score 78/100 (B+) — ↗ +3 puntos vs trimestre anterior",
            "187 socios activos (neto +4 este trimestre)",
          ],
        },
        {
          id: "trends",
          title: "Tendencias a destacar",
          content: "F&B tuvo un crecimiento explosivo de 23% tras la renovación del menú. Los eventos privados alcanzaron un récord de 12 eventos con ingresos de ₡4.5M.",
          severity: "highlight",
          items: [
            "✅ F&B revenue creció 23% tras renovación de menú — impulsado por el nuevo chef ejecutivo",
            "⚠️ Gastos de mantenimiento +31% — reparación de bomba de piscina (₡1.8M no presupuestado)",
            "✅ Eventos privados: 12 este trimestre (récord) — boda Castillo/Quirós por ₡8.5M fue el hito",
          ],
        },
        {
          id: "alerts",
          title: "Alertas que requieren atención",
          content: "Hay 8 facturas vencidas por un total de ₡6.8M que requieren acción de cobranza inmediata. La concentración de ingresos en cuotas (62%) presenta riesgo de dependencia.",
          severity: "alert",
          items: [
            "🔴 8 facturas vencidas > 60 días — total ₡6.8M",
            "🟡 Concentración: 62% del revenue viene de cuotas de membresía",
            "🟡 Gastos de staff crecen más rápido que ingresos (3.2% vs 8.2%)",
          ],
        },
        {
          id: "recommendations",
          title: "Recomendaciones priorizadas",
          content: "Las tres acciones de mayor impacto este trimestre: implementar cobranza proactiva, desarrollar eventos corporativos, y renegociar contrato de mantenimiento preventivo.",
          severity: "info",
          items: [
            "1. Implementar programa de cobranza proactiva con recordatorios automáticos — impacto ₡1.5M/año",
            "2. Desarrollar revenue de eventos corporativos para Escazú/Santa Ana — impacto ₡5.4M/año",
            "3. Renegociar contrato de mantenimiento preventivo — impacto ₡2.4M/año",
          ],
        },
      ],
      alerts: [
        { title: "Facturas vencidas acumulándose", detail: "₡6.8M en facturas > 60 días. Si no se actúa, aging 90+ podría duplicarse en el próximo trimestre.", severity: "high", requires_action: true },
        { title: "Concentración de ingresos", detail: "62% del revenue depende de cuotas. Un evento de churn masivo tendría impacto desproporcionado.", severity: "medium", requires_action: true },
        { title: "Costo de servicios públicos al alza", detail: "ICE y AyA anunciaron incrementos tarifarios del 8% para Q3. Impacto estimado: ₡288K/mes adicionales.", severity: "low", requires_action: false },
      ],
      recommendations: [
        { id: "br-1", priority: "high", action: "Implementar programa de cobranza proactiva", justification: "₡6.8M vencidos. Recordatorios automáticos a 7 días reducen aging 90+ en 60% según benchmarks.", estimated_impact: "₡1.5M/año recuperados" },
        { id: "br-2", priority: "high", action: "Desarrollar canal de eventos corporativos", justification: "Margen de 3x vs eventos sociales. La zona de Escazú/Santa Ana tiene 200+ empresas potenciales.", estimated_impact: "₡5.4M/año nuevos ingresos" },
        { id: "br-3", priority: "medium", action: "Renegociar contrato de mantenimiento con proveedor preferido", justification: "Gastos 31% sobre tendencia. Contrato preventivo reduce costos de emergencia 40-60%.", estimated_impact: "₡2.4M/año ahorrados" },
      ],
      upcoming_decisions: [
        {
          title: "Aumento de cuotas 2027",
          description: "Propuesta de aumento del 8% general o modelo híbrido (5% general + 12% Premium/VIP).",
          options: ["8% general", "5% general + 12% Premium/VIP", "Mantener actual con nuevos beneficios"],
          deadline: "2026-09-30",
          impact_estimate: "₡3.9M adicionales por trimestre (escenario 8%)",
        },
        {
          title: "Inversión cancha de pádel",
          description: "Construcción de 2 canchas de pádel con iluminación profesional.",
          options: ["Aprobar ₡85M (IRR 22%, payback 3.8 años)", "Fase 1: 1 cancha ₡48M", "Posponer a 2027"],
          deadline: "2026-08-15",
          impact_estimate: "₡12M/año revenue adicional estimado",
        },
      ],
    },
  };
}
// ═══════════════════════════════════════════════════════════
// Fase 14 — 3 New Intelligence Feature Factories
// Append to: src/shared/mocks/factories.ts
//
// Requires imports at top of file:
//   import type {
//     FinanceMemberProfitabilityResponse,
//     FinanceStressTestResponse,
//     FinanceSeasonalCalendarResponse,
//   } from "./contracts";
// ═══════════════════════════════════════════════════════════

// ── 13. Member Profitability Matrix (AUTO — mock-only) ──

export function createMockMemberProfitability(): FinanceMemberProfitabilityResponse {
  return {
    status: "success",
    message: "📊 Análisis de rentabilidad completado: 8 familias segmentadas en 4 cuadrantes",
    data: {
      families: [
        {
          family_id: "fam-001",
          family_name: "Castillo Montero",
          tier: "vip",
          member_count: 6,
          revenue_12m: 4_800_000,
          cost_12m: 2_304_000,
          margin_pct: 52.0,
          trend_pct: 15.2,
          ltv_estimate: 22_000_000,
          churn_risk_score: 8,
          quadrant: "star",
          top_revenue_source: "Cuotas + Eventos privados",
          last_activity_date: "2026-06-14",
          ai_insight:
            "Top 5% en revenue. Familia fundadora con alta lealtad y uso intensivo de eventos privados. Candidata a programa VIP con beneficios exclusivos: acceso prioritario, descuento 15% en F&B, estacionamiento reservado.",
        },
        {
          family_id: "fam-002",
          family_name: "Quesada Vargas",
          tier: "premium",
          member_count: 4,
          revenue_12m: 3_200_000,
          cost_12m: 1_792_000,
          margin_pct: 44.0,
          trend_pct: 8.1,
          ltv_estimate: 14_500_000,
          churn_risk_score: 12,
          quadrant: "star",
          top_revenue_source: "Cuotas + F&B",
          last_activity_date: "2026-06-12",
          ai_insight:
            "Consumo consistente en F&B — top 10% en gasto por visita. Propuesta: paquete familiar de eventos sociales con 10% descuento para aumentar frecuencia de visita y cross-sell deportes.",
        },
        {
          family_id: "fam-003",
          family_name: "Solano Brenes",
          tier: "basic",
          member_count: 3,
          revenue_12m: 1_400_000,
          cost_12m: 1_148_000,
          margin_pct: 18.0,
          trend_pct: 22.5,
          ltv_estimate: 5_200_000,
          churn_risk_score: 25,
          quadrant: "potential",
          top_revenue_source: "Cuotas",
          last_activity_date: "2026-06-08",
          ai_insight:
            "Tendencia ascendente fuerte (+22.5%). El uso de gym aumentó 40% en 6 meses. Cross-sell: paquete gym + F&B mensual ₡45K para acelerar consumo y mover a Premium.",
        },
        {
          family_id: "fam-004",
          family_name: "Montero Quirós",
          tier: "premium",
          member_count: 5,
          revenue_12m: 3_800_000,
          cost_12m: 3_344_000,
          margin_pct: 12.0,
          trend_pct: 3.1,
          ltv_estimate: 12_800_000,
          churn_risk_score: 15,
          quadrant: "workhorse",
          top_revenue_source: "Cuotas + Eventos + Deportes",
          last_activity_date: "2026-06-13",
          ai_insight:
            "Alto consumo en todas las categorías pero el costo de servicio es elevado (88%). Evaluar si los 3 hijos en programa juvenil justifican instructor dedicado vs clases grupales.",
        },
        {
          family_id: "fam-005",
          family_name: "Vargas Rojas",
          tier: "basic",
          member_count: 2,
          revenue_12m: 800_000,
          cost_12m: 864_000,
          margin_pct: -8.0,
          trend_pct: -12.3,
          ltv_estimate: 2_100_000,
          churn_risk_score: 65,
          quadrant: "risk",
          top_revenue_source: "Cuotas",
          last_activity_date: "2026-04-22",
          ai_insight:
            "Última actividad hace 2 meses. Margen negativo — consume más de lo que factura. Programa de reactivación de 90 días con seguimiento personalizado antes de conversación de no renovación.",
        },
        {
          family_id: "fam-006",
          family_name: "Jiménez Castro",
          tier: "premium",
          member_count: 4,
          revenue_12m: 2_900_000,
          cost_12m: 1_508_000,
          margin_pct: 48.0,
          trend_pct: 10.4,
          ltv_estimate: 16_200_000,
          churn_risk_score: 5,
          quadrant: "star",
          top_revenue_source: "Cuotas + Eventos",
          last_activity_date: "2026-06-15",
          ai_insight:
            "Churn risk más bajo del club (5/100). Anfitriones frecuentes de eventos privados — candidatos a programa de descuento corporativo para traer eventos de su empresa en Escazú.",
        },
        {
          family_id: "fam-007",
          family_name: "Rodríguez Mora",
          tier: "basic",
          member_count: 3,
          revenue_12m: 1_100_000,
          cost_12m: 858_000,
          margin_pct: 22.0,
          trend_pct: 18.7,
          ltv_estimate: 4_800_000,
          churn_risk_score: 30,
          quadrant: "potential",
          top_revenue_source: "Cuotas + Piscina",
          last_activity_date: "2026-06-10",
          ai_insight:
            "Familia joven con crecimiento orgánico. Los hijos están en edad de programa juvenil — inscripción en academias de tenis o natación aumentaría engagement y revenue mensual estimado ₡85K.",
        },
        {
          family_id: "fam-008",
          family_name: "Brenes Alfaro",
          tier: "vip",
          member_count: 7,
          revenue_12m: 5_200_000,
          cost_12m: 4_784_000,
          margin_pct: 8.0,
          trend_pct: 2.1,
          ltv_estimate: 18_500_000,
          churn_risk_score: 20,
          quadrant: "workhorse",
          top_revenue_source: "Cuotas + F&B + Eventos + Deportes",
          last_activity_date: "2026-06-14",
          ai_insight:
            "Mayor revenue absoluto del club pero margen bajo (8%). 7 miembros consumen servicios intensivos. Evaluar paquete familiar personalizado que optimice costos (clases grupales vs privadas) sin perder revenue.",
        },
      ],
      summary: {
        total_families: 8,
        avg_revenue: 2_900_000,
        avg_margin: 24.5,
        star_count: 3,
        workhorse_count: 2,
        potential_count: 2,
        risk_count: 1,
        revenue_concentration_top10_pct: 22.4,
      },
      quadrant_strategies: {
        star: "Fidelizar con beneficios exclusivos: acceso prioritario a eventos, descuentos en F&B, estacionamiento VIP. Monitorear satisfacción trimestralmente para evitar migración hacia competidores como Cariari o Valle del Sol.",
        workhorse: "Optimizar costo de servicio: evaluar paquetes de actividades que reduzcan el costo de atención sin afectar satisfacción. Renegociar contratos de servicios dedicados y evaluar ROI de cada servicio premium.",
        potential: "Activar con programas de consumo: cross-sell actividades, paquetes familiares, work-from-club. El bajo costo de servicio significa que cada colón adicional de revenue es casi puro margen.",
        risk: "Revisar términos de membresía y nivel de compromiso. Programa de reactivación de 90 días con seguimiento personalizado. Si no hay respuesta, conversación directa sobre opciones de membresía o no renovación.",
      },
    },
  };
}

// ── 14. Stress Test Monte Carlo (AUTO — mock-only) ──
// Mock returns "Recesión Costa Rica 2026" regardless of params.
// Backend will run real Monte Carlo when implemented.

export function createMockStressTest(
  _params?: Record<string, unknown>,
): FinanceStressTestResponse {
  return {
    status: "success",
    message: "🎲 Test de estrés completado: 1,000 iteraciones — 87% probabilidad cash flow positivo",
    data: {
      scenario_name: "Recesión Costa Rica 2026",
      iterations: 1000,
      metrics: {
        p_positive_cashflow_12m: 0.87,
        p_health_above_60: 0.72,
        max_probable_loss_p95: -18_300_000,
        min_reserve_recommended: 22_000_000,
        critical_month: "Ago 2026",
      },
      fan_chart: [
        { month: "Jul 2026", p10: -500_000,   p25: 400_000,    p50: 1_200_000,  p75: 2_000_000,  p90: 3_100_000  },
        { month: "Ago 2026", p10: -5_400_000,  p25: -3_600_000, p50: -1_800_000, p75: 100_000,    p90: 2_100_000  },
        { month: "Sep 2026", p10: -8_200_000,  p25: -5_400_000, p50: -2_600_000, p75: 200_000,    p90: 3_000_000  },
        { month: "Oct 2026", p10: -9_100_000,  p25: -5_600_000, p50: -2_100_000, p75: 1_400_000,  p90: 4_900_000  },
        { month: "Nov 2026", p10: -10_800_000, p25: -5_600_000, p50: -500_000,   p75: 4_600_000,  p90: 9_700_000  },
        { month: "Dic 2026", p10: -9_000_000,  p25: -3_100_000, p50: 2_800_000,  p75: 8_700_000,  p90: 14_600_000 },
        { month: "Ene 2027", p10: -7_200_000,  p25: -900_000,   p50: 5_300_000,  p75: 11_500_000, p90: 17_700_000 },
        { month: "Feb 2027", p10: -5_500_000,  p25: 700_000,    p50: 6_900_000,  p75: 13_100_000, p90: 19_300_000 },
        { month: "Mar 2027", p10: -4_200_000,  p25: 2_300_000,  p50: 8_900_000,  p75: 15_500_000, p90: 22_100_000 },
        { month: "Abr 2027", p10: -3_500_000,  p25: 3_400_000,  p50: 10_400_000, p75: 17_400_000, p90: 24_400_000 },
        { month: "May 2027", p10: -3_200_000,  p25: 3_900_000,  p50: 11_000_000, p75: 18_100_000, p90: 25_200_000 },
        { month: "Jun 2027", p10: -3_000_000,  p25: 4_100_000,  p50: 11_200_000, p75: 18_300_000, p90: 25_400_000 },
      ],
      distribution_summary: {
        mean_net_12m: 11_200_000,
        std_dev: 8_500_000,
        skewness: -0.3,
        worst_case: -18_300_000,
        best_case: 35_200_000,
      },
      assumptions: [
        "Churn de socios: μ=8%, σ=3% (distribución normal, concentrado en tier básico)",
        "Caída en consumo F&B: μ=15%, σ=5% (temporada baja amplificada por recesión)",
        "Eventos cancelados: μ=25%, σ=10% (principalmente corporativos y sociales grandes)",
        "Tipo de cambio USD/CRC: μ=+12%, σ=4% (impacto en costos de importación F&B)",
        "Inflación Costa Rica 2026: 3.5%±1% (impacto en gastos operativos generales)",
        "No se consideran nuevos ingresos de membresías durante periodo de recesión",
      ],
      ai_commentary:
        "El test de estrés Monte Carlo con 1,000 iteraciones muestra que el Castillo Country Club tiene un 87% de probabilidad de mantener cash flow positivo durante los próximos 12 meses bajo el escenario de recesión. Sin embargo, el mes más crítico es agosto 2026, cuando la combinación de temporada baja, caída estacional en consumo y posible reducción de eventos crea una ventana de vulnerabilidad con mediana negativa de ₡-1.8M. La reserva mínima recomendada de ₡22M proporciona un colchón de seguridad que cubre el percentil 95 de pérdidas (₡-18.3M). El 72% de probabilidad de mantener health score sobre 60 indica resiliencia operativa, pero sugiere monitorear de cerca los gastos de mantenimiento y la retención de socios en tier básico, donde el churn simulado es significativamente mayor. La asimetría negativa (-0.3) indica que los escenarios adversos son más extremos que los favorables — la junta debe priorizar la constitución de reservas antes de agosto.",
    },
  };
}

// ── 15. Seasonal Calendar (AUTO — mock-only) ──

export function createMockSeasonalCalendar(): FinanceSeasonalCalendarResponse {
  return {
    status: "success",
    message: "📅 Calendario financiero estacional 2026 generado — 12 meses, 3 temporadas, 14 acciones recomendadas",
    data: {
      year: 2026,
      months: [
        // ── Enero: High Season ──
        {
          month: 1,
          label: "Ene 2026",
          season: "high",
          revenue_factor: 1.08,
          projected_revenue: 3_807_000,
          projected_expenses: 2_950_000,
          projected_net: 857_000,
          cash_reserve_required: 6_000_000,
          events: [
            { name: "Fiestas de Palmares — grupo social organizado", type: "cultural", impact: "high" },
            { name: "Recepción de Año Nuevo — cena de socios", type: "social", impact: "medium" },
          ],
          maintenance: [],
          obligations: [],
          recommended_actions: [
            { action: "Cerrar contratos de eventos corporativos para Q1", category: "revenue_opportunity", estimated_impact: 1_500_000, deadline: "2026-01-31", priority: "high" },
          ],
        },
        // ── Febrero: High Season ──
        {
          month: 2,
          label: "Feb 2026",
          season: "high",
          revenue_factor: 1.08,
          projected_revenue: 3_807_000,
          projected_expenses: 3_400_000,
          projected_net: 407_000,
          cash_reserve_required: 7_000_000,
          events: [
            { name: "San Valentín — cena especial en restaurante", type: "social", impact: "medium" },
          ],
          maintenance: [],
          obligations: [
            { item: "Pago parcial impuesto sobre la renta", amount: 500_000 },
          ],
          recommended_actions: [
            { action: "Renegociar contratos de bebidas antes de cierre fiscal", category: "cost_saving", estimated_impact: 800_000, deadline: "2026-02-28", priority: "medium" },
          ],
        },
        // ── Marzo: High Season ──
        {
          month: 3,
          label: "Mar 2026",
          season: "high",
          revenue_factor: 1.08,
          projected_revenue: 3_807_000,
          projected_expenses: 2_850_000,
          projected_net: 957_000,
          cash_reserve_required: 6_000_000,
          events: [
            { name: "Boda Rodríguez/Fernández — paquete completo", type: "social", impact: "high" },
          ],
          maintenance: [],
          obligations: [],
          recommended_actions: [
            { action: "Pre-campaña de renovación de membresías", category: "planning", estimated_impact: 0, deadline: "2026-03-31", priority: "medium" },
          ],
        },
        // ── Abril: High Season ──
        {
          month: 4,
          label: "Abr 2026",
          season: "high",
          revenue_factor: 1.08,
          projected_revenue: 3_807_000,
          projected_expenses: 2_900_000,
          projected_net: 907_000,
          cash_reserve_required: 6_000_000,
          events: [
            { name: "Semana Santa — campamento juvenil + brunch domingo", type: "cultural", impact: "high" },
            { name: "Boda Quirós/Montero — evento premium", type: "social", impact: "high" },
          ],
          maintenance: [],
          obligations: [
            { item: "Declaración fiscal trimestral (costo contador)", amount: 0 },
          ],
          recommended_actions: [
            { action: "Lanzar paquetes de verano para familias", category: "revenue_opportunity", estimated_impact: 2_000_000, deadline: "2026-04-15", priority: "high" },
          ],
        },
        // ── Mayo: Transition ──
        {
          month: 5,
          label: "May 2026",
          season: "transition",
          revenue_factor: 1.0,
          projected_revenue: 3_525_000,
          projected_expenses: 4_700_000,
          projected_net: -1_175_000,
          cash_reserve_required: 8_500_000,
          events: [
            { name: "Día de la Madre — brunch especial + spa", type: "social", impact: "medium" },
          ],
          maintenance: [],
          obligations: [
            { item: "Aguinaldo staff (1er semestre)", amount: 1_800_000 },
          ],
          recommended_actions: [
            { action: "Iniciar programa Work-From-Club para temporada baja", category: "revenue_opportunity", estimated_impact: 1_800_000, deadline: "2026-05-15", priority: "high" },
            { action: "Renegociar contratos F&B antes de temporada baja", category: "cost_saving", estimated_impact: 4_200_000, deadline: "2026-05-31", priority: "high" },
          ],
        },
        // ── Junio: Low Season ──
        {
          month: 6,
          label: "Jun 2026",
          season: "low",
          revenue_factor: 0.92,
          projected_revenue: 3_243_000,
          projected_expenses: 3_200_000,
          projected_net: 43_000,
          cash_reserve_required: 8_500_000,
          events: [],
          maintenance: [
            { item: "Mantenimiento mayor piscina — cierre parcial 2 semanas", impact: "partial_closure" },
          ],
          obligations: [],
          recommended_actions: [
            { action: "Implementar Happy Hour Premium viernes 5-7pm en pool area", category: "revenue_opportunity", estimated_impact: 1_200_000, deadline: "2026-06-01", priority: "medium" },
          ],
        },
        // ── Julio: Low Season ──
        {
          month: 7,
          label: "Jul 2026",
          season: "low",
          revenue_factor: 0.92,
          projected_revenue: 3_243_000,
          projected_expenses: 3_050_000,
          projected_net: 193_000,
          cash_reserve_required: 8_000_000,
          events: [
            { name: "Fiestas patrias — evento temático familiar", type: "cultural", impact: "medium" },
          ],
          maintenance: [
            { item: "Mantenimiento piscina — finalización y reapertura", impact: "partial_closure" },
          ],
          obligations: [],
          recommended_actions: [
            { action: "Lanzar paquete gym + F&B para socios deportistas", category: "revenue_opportunity", estimated_impact: 600_000, deadline: "2026-07-01", priority: "medium" },
          ],
        },
        // ── Agosto: Low Season ──
        {
          month: 8,
          label: "Ago 2026",
          season: "low",
          revenue_factor: 0.92,
          projected_revenue: 3_243_000,
          projected_expenses: 3_100_000,
          projected_net: 143_000,
          cash_reserve_required: 8_000_000,
          events: [],
          maintenance: [
            { item: "Preparación de instalaciones para temporada alta", impact: "none" },
          ],
          obligations: [],
          recommended_actions: [
            { action: "Reservar cash para aguinaldos + primas de final de año", category: "cash_management", estimated_impact: 0, deadline: "2026-08-31", priority: "high" },
          ],
        },
        // ── Septiembre: Low Season ──
        {
          month: 9,
          label: "Sep 2026",
          season: "low",
          revenue_factor: 0.92,
          projected_revenue: 3_243_000,
          projected_expenses: 2_900_000,
          projected_net: 343_000,
          cash_reserve_required: 8_000_000,
          events: [
            { name: "Día del Niño — actividades familiares en club", type: "social", impact: "low" },
          ],
          maintenance: [],
          obligations: [],
          recommended_actions: [
            { action: "Encuesta de satisfacción pre-temporada alta", category: "planning", estimated_impact: 0, deadline: "2026-09-15", priority: "medium" },
          ],
        },
        // ── Octubre: Transition ──
        {
          month: 10,
          label: "Oct 2026",
          season: "transition",
          revenue_factor: 1.0,
          projected_revenue: 3_525_000,
          projected_expenses: 2_950_000,
          projected_net: 575_000,
          cash_reserve_required: 7_500_000,
          events: [
            { name: "Halloween — fiesta temática + actividades niños", type: "social", impact: "medium" },
          ],
          maintenance: [],
          obligations: [],
          recommended_actions: [
            { action: "Early bird renovación membresías 2027 — 5% descuento anticipado", category: "revenue_opportunity", estimated_impact: 3_500_000, deadline: "2026-10-15", priority: "high" },
          ],
        },
        // ── Noviembre: Transition ──
        {
          month: 11,
          label: "Nov 2026",
          season: "transition",
          revenue_factor: 1.0,
          projected_revenue: 3_525_000,
          projected_expenses: 5_500_000,
          projected_net: -1_975_000,
          cash_reserve_required: 10_000_000,
          events: [
            { name: "Quinceañeras — 3 eventos reservados", type: "social", impact: "high" },
          ],
          maintenance: [],
          obligations: [
            { item: "Prima navideña staff", amount: 1_200_000 },
            { item: "Aguinaldo staff (2do semestre)", amount: 1_800_000 },
          ],
          recommended_actions: [
            { action: "Cerrar contratos de eventos corporativos diciembre", category: "revenue_opportunity", estimated_impact: 2_500_000, deadline: "2026-11-15", priority: "high" },
          ],
        },
        // ── Diciembre: High Season ──
        {
          month: 12,
          label: "Dic 2026",
          season: "high",
          revenue_factor: 1.08,
          projected_revenue: 3_807_000,
          projected_expenses: 3_500_000,
          projected_net: 307_000,
          cash_reserve_required: 7_000_000,
          events: [
            { name: "Cena de Navidad — evento social premium", type: "social", impact: "high" },
            { name: "Fiesta de Fin de Año — DJ + catering", type: "social", impact: "high" },
            { name: "Eventos corporativos cierre de año (2 empresas)", type: "corporate", impact: "high" },
          ],
          maintenance: [],
          obligations: [
            { item: "Bono navideño administración", amount: 500_000 },
          ],
          recommended_actions: [
            { action: "Capturar revenue de eventos corporativos de fin de año", category: "revenue_opportunity", estimated_impact: 3_000_000, deadline: "2026-12-01", priority: "high" },
          ],
        },
      ],
      annual_summary: {
        high_season_revenue: 19_035_000,   // Ene-Apr + Dic: 3,807,000 × 5
        low_season_revenue: 12_972_000,    // Jun-Sep: 3,243,000 × 4
        seasonality_gap_pct: 31.8,
        total_obligations: 5_800_000,      // 500K + 1.8M + 1.2M + 1.8M + 500K
        critical_cash_months: [5, 11],     // Mayo y Noviembre — aguinaldos
        recommended_reserve: 10_000_000,
      },
    },
  };
}
// ── Fase 14b — Narrative Engine ──

export function createMockNarrativeGenerate(
  params?: Record<string, unknown>,
): FinanceNarrativeGenerateResponse {
  const period = (params?.period as string) ?? "mayo_2026";
  const audience = (params?.audience as string) ?? "junta";
  const detailLevel = (params?.detail_level as string) ?? "ejecutivo";

  return {
    status: "success",
    message:
      "🧠 Narrativa ejecutiva generada — 5 insights, 4 recomendaciones, 3 alertas de riesgo",
    data: {
      period,
      audience,
      detail_level: detailLevel,
      generated_at: "2026-05-24T08:30:00-06:00",
      executive_summary:
        "Castillo Country Club cerró mayo 2026 con resultados operativos dentro de las proyecciones estacionales, aunque con señales que ameritan acción inmediata. Los ingresos totales alcanzaron ₡3,525,000 — un 4.1% por encima del mismo mes del año anterior — impulsados por el crecimiento en alimentos y bebidas (+12.3%) y la estabilidad de la base de membresía. Sin embargo, los gastos operativos de ₡4,700,000, incluyendo el pago de aguinaldos (₡1,800,000), generaron un déficit mensual de ₡1,175,000. Este resultado era esperado y está cubierto por la reserva operativa de ₡22,000,000. Las cuentas por cobrar muestran un deterioro preocupante con ₡2,100,000 en aging superior a 60 días. Las oportunidades identificadas por el sistema de inteligencia sugieren un potencial de ₡1,800,000 mensuales adicionales si se ejecutan las recomendaciones priorizadas a continuación.",
      sections: [
        {
          id: "financial",
          title: "Situación Financiera",
          content:
            "Mayo 2026 refleja el patrón estacional esperado para la transición a temporada baja. Los ingresos de ₡3,525,000 representan un factor de 1.0 sobre la base, consistente con el calendario estacional del club. Los gastos de ₡4,700,000 incluyen el pago de aguinaldos (₡1,800,000), una obligación laboral que Mayo comparte con Noviembre como los meses de mayor presión de caja. El flujo de caja operativo se redujo a ₡18,425,000, aún por encima del mínimo recomendado de ₡10,000,000. Las cuentas por cobrar muestran un deterioro: ₡2,100,000 con aging superior a 60 días, un 34% por encima del trimestre anterior. Las 4 familias que concentran el 78% del saldo vencido requieren gestión inmediata.",
          type: "financial",
        },
        {
          id: "membership",
          title: "Análisis de Membresía",
          content:
            "La base de socios se mantiene en 142 familias activas, con 2 nuevas incorporaciones (familia Pérez Solano — Premium, referido por Castillo Montero) y 1 salida en proceso (familia Herrera — Básico, reubicación a Guanacaste). La distribución por tier es estable: VIP 18%, Premium 45%, Básico 37%. El engagement score promedio cayó 4 puntos (de 72 a 68), impulsado por la menor actividad estacional. Cuatro familias muestran señales de alerta: Vargas Rojas (engagement 32/100, churn risk 65%), Rodríguez Mora (engagement 45, aging 38 días), Solano Brenes (engagement 48, aging 45 días). La tasa de churn anualizada se mantiene en 4.2%, dentro del benchmark de industria (3-6%).",
          type: "membership",
        },
        {
          id: "operations",
          title: "Operaciones",
          content:
            "La operación del club mantuvo estándares normales durante mayo. El restaurante operó al 62% de capacidad promedio (vs 78% en temporada alta), con los viernes como día pico (92%). El gimnasio mostró un repunte de 18% en uso gracias al programa Reto Fitness Mayo (34 inscritos). Las canchas de tenis mantuvieron 85% de utilización en fines de semana. Se completó el mantenimiento preventivo del sistema de riego del campo de golf sin incidentes. La satisfacción promedio subió de 79 a 82 puntos, impulsada por la valoración del nuevo menú del chef.",
          type: "operations",
        },
        {
          id: "risks",
          title: "Panorama de Riesgos",
          content:
            "Tres riesgos requieren monitoreo activo. Primero: la presión de caja en noviembre 2026, cuando coinciden aguinaldos (₡1,800,000), prima navideña (₡1,200,000) y bono de administración (₡500,000), totalizando ₡3,500,000 en obligaciones extraordinarias. Segundo: el contrato de bebidas con Distribuidora Central vence el 31 de julio sin cláusula de renovación automática — sin negociación, el impacto estimado es +₡680,000/año. Tercero: el deterioro del aging de cuentas por cobrar, particularmente la familia Vargas Rojas con ₡890,000 a 62 días, cuyo patrón es consistente con 3 churns anteriores del mismo segmento.",
          type: "risks",
        },
        {
          id: "outlook",
          title: "Perspectiva",
          content:
            "Junio 2026 marca el inicio formal de la temporada baja con un revenue factor de 0.92. Se proyectan ingresos de ₡3,243,000 y gastos de ₡3,200,000, resultando en un margen ajustado de +₡43,000. Las acciones priorizadas incluyen: implementar Happy Hour Premium viernes en pool area, lanzar programa Work-From-Club para capturar el segmento de profesionales remotos, e iniciar la negociación con proveedores de F&B antes del vencimiento de julio. El mantenimiento programado de piscina (2 semanas) se recomienda coordinar para la tercera y cuarta semana de junio, ventana de menor demanda.",
          type: "outlook",
        },
      ],
      insights: [
        {
          id: "ins-1",
          title: "Crecimiento sostenido en alimentos y bebidas",
          body: "Los ingresos por F&B crecieron 12.3% interanual, impulsados por el nuevo menú del chef ejecutivo lanzado en marzo. El ticket promedio subió de ₡18,500 a ₡21,200, con especial aceptación del menú de degustación de los viernes. Este segmento representa el 28% del revenue total.",
          type: "positive",
          impact_estimate: 1_200_000,
          confidence: 85,
          data_source: "Resumen financiero MCP — finance_summary",
        },
        {
          id: "ins-2",
          title: "Aging problemático en cuentas por cobrar",
          body: "Las cuentas por cobrar superaron los ₡2,100,000 con aging mayor a 60 días, un incremento del 34% respecto al trimestre anterior. Cuatro familias concentran el 78% del saldo vencido: Vargas Rojas (₡890,000), Solano Brenes (₡420,000), Rodríguez Mora (₡380,000) y un caso nuevo en investigación.",
          type: "negative",
          impact_estimate: -2_100_000,
          confidence: 92,
          data_source: "Reporte de aging — finance_account_status",
        },
        {
          id: "ins-3",
          title: "Base de membresía estable con señales de alerta",
          body: "142 socios activos, +2 incorporaciones, -1 salida en proceso. Churn anualizado 4.2% dentro de benchmark. Sin embargo, 4 familias muestran engagement bajo (<50/100) que requiere intervención antes de la temporada alta.",
          type: "neutral",
          impact_estimate: 0,
          confidence: 78,
          data_source: "Dashboard de engagement — member_engagement",
        },
        {
          id: "ins-4",
          title: "Contrato de bebidas vence en 68 días sin backup",
          body: "Distribuidora Central es el único proveedor de bebidas alcohólicas desde 2021. El contrato vence julio 31 con descuento del 15% que no se ha negociado en 3 años. Sin alternativa identificada, el club pierde poder de negociación.",
          type: "alert",
          impact_estimate: -680_000,
          confidence: 95,
          data_source: "Registro de contratos — contract_registry",
        },
        {
          id: "ins-5",
          title: "Boom en uso del gimnasio por programa fitness",
          body: "El uso del gimnasio aumentó 18% en mayo respecto al promedio de 6 meses, impulsado por el Reto Fitness Mayo (34 inscritos). Los socios participantes muestran un 23% más de gasto en F&B post-workout. Oportunidad de repetir el programa mensualmente.",
          type: "positive",
          impact_estimate: 480_000,
          confidence: 72,
          data_source: "Plataforma de bienestar — wellness_report",
        },
      ],
      recommendations: [
        {
          id: "rec-1",
          title: 'Implementar "Martes de Parrilla"',
          description:
            "Evento semanal de parrilla gourmet en el área de pool, martes 6-9pm. Incluye DJ, menú especial y bebidas. Target: clusters Sociales y Familiares.",
          rationale:
            "El restaurante opera al 40% los martes. Eventos temáticos similares en clubs premium de CR muestran +35% de afluencia. Bajo riesgo operativo.",
          estimated_impact: 1_200_000,
          timeframe: "2 semanas",
          priority: "high",
          category: "revenue",
          effort: "low",
        },
        {
          id: "rec-2",
          title: "Contacto personalizado a familias con aging >60 días",
          description:
            "Llamada personal del gerente general a las 4 familias con saldo vencido. Ofrecer plan de pagos flexible. Priorizar Vargas Rojas (₡890,000).",
          rationale:
            "El contacto personal recupera el 72% de cuentas problemáticas según datos históricos del club. Esperar >90 días reduce la tasa de recuperación a 31%.",
          estimated_impact: 2_100_000,
          timeframe: "1 semana",
          priority: "high",
          category: "retention",
          effort: "low",
        },
        {
          id: "rec-3",
          title: "Renegociar contratos F&B antes de temporada baja",
          description:
            "Iniciar negociación con los 3 proveedores principales. Solicitar al menos 2 cotizaciones alternativas. Objetivo: mantener descuento del 15% o mejorarlo.",
          rationale:
            "La temporada baja es el mejor momento para negociar (menor volumen = menor urgencia aparente). El vencimiento de julio 31 crea deadline natural.",
          estimated_impact: 680_000,
          timeframe: "6 semanas",
          priority: "medium",
          category: "cost",
          effort: "medium",
        },
        {
          id: "rec-4",
          title: "Programar mantenimiento de piscina en ventana óptima",
          description:
            "Coordinar mantenimiento mayor para 3ra y 4ta semana de junio. Comunicar a socios con 2 semanas de anticipación. Ofrecer alternativas (gimnasio, golf).",
          rationale:
            "Junio tiene el menor uso de piscina del año. Postergar a julio incrementa quejas en 3x según datos históricos.",
          estimated_impact: 450_000,
          timeframe: "4 semanas",
          priority: "medium",
          category: "operations",
          effort: "low",
        },
      ],
      comparisons: [
        {
          metric: "Ingresos",
          current: 3_525_000,
          previous: 3_387_000,
          budget: 3_600_000,
          yoy_change_pct: 4.1,
          vs_budget_pct: -2.1,
        },
        {
          metric: "Gastos",
          current: 4_700_000,
          previous: 3_100_000,
          budget: 4_500_000,
          yoy_change_pct: 51.6,
          vs_budget_pct: 4.4,
        },
        {
          metric: "Neto",
          current: -1_175_000,
          previous: -850_000,
          budget: -900_000,
          yoy_change_pct: -38.2,
          vs_budget_pct: -30.6,
        },
        {
          metric: "Socios",
          current: 142,
          previous: 141,
          budget: 145,
          yoy_change_pct: 0.7,
          vs_budget_pct: -2.1,
        },
        {
          metric: "Satisfacción",
          current: 82,
          previous: 79,
          budget: 85,
          yoy_change_pct: 3.8,
          vs_budget_pct: -3.5,
        },
      ],
      risk_alerts: [
        {
          title: "Presión de flujo de caja en noviembre 2026",
          severity: "high",
          description:
            "Noviembre concentra ₡3,500,000 en obligaciones extraordinarias (aguinaldos + prima navideña + bono administración). Con el patrón estacional de ingresos, el flujo de caja podría caer por debajo del mínimo recomendado si no se planifica.",
          suggested_action:
            "Iniciar reserva incremental de ₡500,000/mes desde agosto. Total acumulado para noviembre: ₡2,000,000.",
          affected_area: "Finanzas",
          deadline: "2026-08-01",
        },
        {
          title: "Familia Vargas Rojas — riesgo alto de churn",
          severity: "medium",
          description:
            "Engagement score de 32/100 (promedio club: 68). Solo 2 reservas en últimos 90 días. Aging: ₡890,000 a 62 días. Patrón consistente con 3 churns anteriores del mismo segmento.",
          suggested_action:
            "Llamada personal del gerente esta semana. Ofrecer plan de pagos + cena de bienvenida. Si no hay respuesta en 2 semanas, escalar a junta.",
          affected_area: "Membresía",
          deadline: "2026-05-31",
        },
        {
          title: "Contrato de bebidas sin proveedor alternativo",
          severity: "medium",
          description:
            "Distribuidora Central es proveedor único desde 2021. Contrato vence julio 31. Sin alternativa, negociación desde posición de debilidad.",
          suggested_action:
            "Solicitar cotizaciones a Bebidas del Pacífico e Importadora del Sur antes del 15 de junio. Incluir en agenda de próxima junta.",
          affected_area: "Operaciones / Compras",
          deadline: "2026-06-15",
        },
      ],
      narrative_confidence: 87,
      word_count: 847,
      estimated_read_time_minutes: 4,
    },
  };
}

// ── Fase 14b — Export Report ──

export function createMockExportReport(
  params?: Record<string, unknown>,
): ExportReportResponse {
  const format = (params?.format as string) ?? "pdf";
  const reportType = (params?.report_type as string) ?? "financial_summary";
  const audience = (params?.audience as string) ?? "internal";
  const ext = format === "excel" ? "xlsx" : format;
  const today = new Date().toISOString().split("T")[0];

  return {
    status: "success",
    message: `📄 Reporte exportado exitosamente en formato ${format.toUpperCase()}`,
    data: {
      export_id: `EXP-${Date.now()}`,
      format: format as "pdf" | "excel" | "csv",
      report_type: reportType,
      file_name: `castillo-${reportType}-${today}.${ext}`,
      file_size_bytes:
        format === "pdf" ? 245_760 : format === "excel" ? 89_600 : 12_288,
      pages: format === "pdf" ? 8 : 1,
      generated_at: new Date().toISOString(),
      expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      download_url: "/api/exports/mock-download",
      status: "ready",
      includes_charts: format === "pdf",
      includes_narrative: format === "pdf",
      watermark: audience === "external" ? "CONFIDENCIAL" : null,
      sections_included: [
        { section_id: "summary", title: "Resumen Ejecutivo", pages: 1 },
        { section_id: "financials", title: "Estado Financiero", pages: 3 },
        { section_id: "membership", title: "Análisis de Membresía", pages: 2 },
        { section_id: "recommendations", title: "Recomendaciones", pages: 2 },
      ],
    },
  };
}
// ── Fase 14c — Member Intelligence Hub ──

// ── members_health_score ──

export function createMockMembersHealthScore(
  _params?: Record<string, unknown>,
): MembersHealthScoreResponse {
  const now = new Date().toISOString();

  const dimensions = [
    {
      id: "engagement",
      name: "Engagement",
      score: 68,
      weight: 30,
      previous_score: 73,
      trend: "declining" as const,
      color: "#2A9AB5",
    },
    {
      id: "financial",
      name: "Financiero",
      score: 78,
      weight: 25,
      previous_score: 76,
      trend: "improving" as const,
      color: "#C9A96E",
    },
    {
      id: "social",
      name: "Social",
      score: 71,
      weight: 20,
      previous_score: 74,
      trend: "declining" as const,
      color: "#3DAA70",
    },
    {
      id: "communication",
      name: "Comunicación",
      score: 74,
      weight: 15,
      previous_score: 72,
      trend: "improving" as const,
      color: "#B8C0CC",
    },
    {
      id: "satisfaction",
      name: "Satisfacción",
      score: 69,
      weight: 10,
      previous_score: 75,
      trend: "declining" as const,
      color: "#D4A840",
    },
  ];

  return {
    status: "success",
    message: "🩺 Score de salud calculado para 142 familias",
    data: {
      club_overall_score: 72,
      club_previous_score: 76,
      club_trend: "declining",
      dimensions,
      distribution: [
        { range: "0-20", count: 3, pct: 2, color: "#C46470" },
        { range: "20-40", count: 9, pct: 6, color: "#D47A5A" },
        { range: "40-60", count: 24, pct: 17, color: "#D4A840" },
        { range: "60-80", count: 58, pct: 41, color: "#2A9AB5" },
        { range: "80-100", count: 48, pct: 34, color: "#3DAA70" },
      ],
      trend_12m: [
        { month: "2025-01", avg_score: 76, min_score: 28, max_score: 95 },
        { month: "2025-02", avg_score: 77, min_score: 30, max_score: 95 },
        { month: "2025-03", avg_score: 78, min_score: 31, max_score: 96 },
        { month: "2025-04", avg_score: 77, min_score: 30, max_score: 95 },
        { month: "2025-05", avg_score: 76, min_score: 29, max_score: 95 },
        { month: "2025-06", avg_score: 75, min_score: 28, max_score: 94 },
        { month: "2025-07", avg_score: 74, min_score: 28, max_score: 94 },
        { month: "2025-08", avg_score: 73, min_score: 27, max_score: 93 },
        { month: "2025-09", avg_score: 72, min_score: 27, max_score: 93 },
        { month: "2025-10", avg_score: 71, min_score: 26, max_score: 92 },
        { month: "2025-11", avg_score: 72, min_score: 27, max_score: 93 },
        { month: "2025-12", avg_score: 72, min_score: 27, max_score: 93 },
      ],
      at_risk_families: [
        {
          family_id: "FAM-003",
          family_name: "Quesada Vargas",
          tier: "Gold" as const,
          segment: "Sociales",
          overall_score: 31,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 15, weight: 30, previous_score: 52, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 58, weight: 25, previous_score: 60, trend: "stable" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 25, weight: 20, previous_score: 55, trend: "declining" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 20, weight: 15, previous_score: 48, trend: "declining" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 40, weight: 10, previous_score: 62, trend: "declining" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Engagement",
          score_delta_30d: -12,
          score_delta_90d: -28,
          risk_level: "critical",
          suggested_action: "Llamada personal del gerente esta semana. Historial de alto gasto en eventos — posible insatisfacción reciente con servicio de banquetes.",
          last_activity_days_ago: 45,
        },
        {
          family_id: "FAM-007",
          family_name: "Montero Quirós",
          tier: "Platinum" as const,
          segment: "Ejecutivos",
          overall_score: 38,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 30, weight: 30, previous_score: 55, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 65, weight: 25, previous_score: 68, trend: "stable" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 22, weight: 20, previous_score: 40, trend: "declining" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 40, weight: 15, previous_score: 52, trend: "declining" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 35, weight: 10, previous_score: 58, trend: "declining" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Social",
          score_delta_30d: -8,
          score_delta_90d: -22,
          risk_level: "critical",
          suggested_action: "Familia referente del cluster Ejecutivo. Reunión con gerente + invitación a evento exclusivo. Riesgo de cascada si churnea.",
          last_activity_days_ago: 32,
        },
        {
          family_id: "FAM-011",
          family_name: "Vargas Rojas",
          tier: "Gold" as const,
          segment: "Sociales",
          overall_score: 42,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 18, weight: 30, previous_score: 45, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 52, weight: 25, previous_score: 55, trend: "stable" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 45, weight: 20, previous_score: 60, trend: "declining" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 30, weight: 15, previous_score: 50, trend: "declining" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 55, weight: 10, previous_score: 65, trend: "declining" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Engagement",
          score_delta_30d: -9,
          score_delta_90d: -18,
          risk_level: "critical",
          suggested_action: "Aging >60 días (₡1.8M). Contacto inmediato para cobro + encuesta de satisfacción. Mencionado en alerta de Fase 14b.",
          last_activity_days_ago: 58,
        },
        {
          family_id: "FAM-019",
          family_name: "Obando Salazar",
          tier: "Silver" as const,
          segment: "Invisibles",
          overall_score: 45,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 12, weight: 30, previous_score: 18, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 62, weight: 25, previous_score: 60, trend: "improving" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 35, weight: 20, previous_score: 38, trend: "stable" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 28, weight: 15, previous_score: 32, trend: "declining" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 72, weight: 10, previous_score: 70, trend: "improving" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Engagement",
          score_delta_30d: -3,
          score_delta_90d: -8,
          risk_level: "high",
          suggested_action: "Paga puntual pero no visita. WhatsApp personal para reconectar — 67% read rate en segmento Invisible.",
          last_activity_days_ago: 67,
        },
        {
          family_id: "FAM-025",
          family_name: "Zamora Villalobos",
          tier: "Gold" as const,
          segment: "Deportivos",
          overall_score: 48,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 42, weight: 30, previous_score: 65, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 55, weight: 25, previous_score: 58, trend: "stable" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 50, weight: 20, previous_score: 55, trend: "stable" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 48, weight: 15, previous_score: 50, trend: "stable" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 30, weight: 10, previous_score: 68, trend: "declining" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Satisfacción",
          score_delta_30d: -7,
          score_delta_90d: -15,
          risk_level: "high",
          suggested_action: "Caída fuerte en satisfacción (-38pts). Posible problema con cancha de tenis #3 (reportes de iluminación). Verificar incidencia.",
          last_activity_days_ago: 28,
        },
        {
          family_id: "FAM-031",
          family_name: "Brenes Gutiérrez",
          tier: "Silver" as const,
          segment: "Familiares",
          overall_score: 51,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 48, weight: 30, previous_score: 52, trend: "stable" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 32, weight: 25, previous_score: 55, trend: "declining" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 58, weight: 20, previous_score: 60, trend: "stable" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 62, weight: 15, previous_score: 58, trend: "improving" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 55, weight: 10, previous_score: 58, trend: "stable" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Financiero",
          score_delta_30d: -4,
          score_delta_90d: -10,
          risk_level: "high",
          suggested_action: "Score financiero cayendo rápido (-23pts). Aging reciente detectado. Plan de pago podría evitar churn.",
          last_activity_days_ago: 21,
        },
        {
          family_id: "FAM-037",
          family_name: "Alfaro Montero",
          tier: "Gold" as const,
          segment: "Sociales",
          overall_score: 54,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 55, weight: 30, previous_score: 58, trend: "stable" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 62, weight: 25, previous_score: 60, trend: "improving" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 50, weight: 20, previous_score: 52, trend: "stable" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 35, weight: 15, previous_score: 55, trend: "declining" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 60, weight: 10, previous_score: 62, trend: "stable" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Comunicación",
          score_delta_30d: -2,
          score_delta_90d: -6,
          risk_level: "medium",
          suggested_action: "Dejó de abrir emails (open rate bajó de 45% a 8%). Cambiar canal a WhatsApp.",
          last_activity_days_ago: 14,
        },
        {
          family_id: "FAM-042",
          family_name: "Mora Ramírez",
          tier: "Silver" as const,
          segment: "Invisibles",
          overall_score: 56,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 22, weight: 30, previous_score: 25, trend: "stable" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 70, weight: 25, previous_score: 68, trend: "improving" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 45, weight: 20, previous_score: 48, trend: "stable" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 55, weight: 15, previous_score: 52, trend: "improving" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 68, weight: 10, previous_score: 65, trend: "improving" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Engagement",
          score_delta_30d: 0,
          score_delta_90d: -2,
          risk_level: "medium",
          suggested_action: "Invisible pero estable. Financiero y satisfacción mejorando. Invitar a actividad grupal para reconectar.",
          last_activity_days_ago: 52,
        },
        {
          family_id: "FAM-048",
          family_name: "Castro Fernández",
          tier: "Gold" as const,
          segment: "Deportivos",
          overall_score: 58,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 62, weight: 30, previous_score: 50, trend: "improving" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 58, weight: 25, previous_score: 55, trend: "improving" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 35, weight: 20, previous_score: 30, trend: "improving" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 65, weight: 15, previous_score: 60, trend: "improving" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 70, weight: 10, previous_score: 65, trend: "improving" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Social",
          score_delta_30d: 5,
          score_delta_90d: 12,
          risk_level: "medium",
          suggested_action: "En trayectoria ascendente (+12pts en 90d). Social sigue débil — emparejar con familia del cluster Deportivos para torneos.",
          last_activity_days_ago: 8,
        },
        {
          family_id: "FAM-055",
          family_name: "Herrera Barrantes",
          tier: "Platinum" as const,
          segment: "Sociales",
          overall_score: 60,
          dimensions: [
            { id: "engagement", name: "Engagement", score: 55, weight: 30, previous_score: 62, trend: "declining" as const, color: "#2A9AB5" },
            { id: "financial", name: "Financiero", score: 72, weight: 25, previous_score: 70, trend: "improving" as const, color: "#C9A96E" },
            { id: "social", name: "Social", score: 58, weight: 20, previous_score: 65, trend: "declining" as const, color: "#3DAA70" },
            { id: "communication", name: "Comunicación", score: 50, weight: 15, previous_score: 55, trend: "stable" as const, color: "#B8C0CC" },
            { id: "satisfaction", name: "Satisfacción", score: 48, weight: 10, previous_score: 62, trend: "declining" as const, color: "#D4A840" },
          ],
          weakest_dimension: "Satisfacción",
          score_delta_30d: -3,
          score_delta_90d: -8,
          risk_level: "low",
          suggested_action: "Platinum con tendencia decreciente. Monitorear — si satisfacción baja de 40, activar intervención inmediata.",
          last_activity_days_ago: 10,
        },
      ],
      factor_importance: [
        { factor: "Frecuencia de visitas", weight_pct: 35, variance_explained_pct: 42, description: "El predictor más fuerte de engagement. Visitas <2/mes correlacionan con 78% de churn." },
        { factor: "Gasto mensual", weight_pct: 25, variance_explained_pct: 28, description: "Gasto decreciente indica desinterés progresivo. Tasa de cambio importa más que nivel absoluto." },
        { factor: "Conexiones sociales", weight_pct: 20, variance_explained_pct: 15, description: "Familias con <3 conexiones activas tienen 3x más probabilidad de churn." },
        { factor: "Engagement comunicaciones", weight_pct: 15, variance_explained_pct: 10, description: "Open rate de emails + respuesta a WhatsApp. Familiar que no responde está desconectándose." },
        { factor: "Satisfacción declarada", weight_pct: 5, variance_explained_pct: 5, description: "Último NPS o survey. Peso bajo porque es lagging indicator — cuando baja, el daño ya ocurrió." },
      ],
      total_families: 142,
      families_critical: 12,
      families_healthy: 106,
      families_improving: 18,
      generated_at: now,
    },
  };
}

// ── members_segmentation ──

export function createMockMembersSegmentation(
  _params?: Record<string, unknown>,
): MembersSegmentationResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message: "👥 Micro-segmentación completada: 5 clusters identificados en 142 familias",
    data: {
      segments: [
        {
          id: "deportivos",
          name: "Deportivos",
          icon: "Dumbbell",
          color: "#2A9AB5",
          family_count: 38,
          pct_of_total: 27,
          avg_monthly_spend: 185_000,
          avg_visits_per_month: 8.2,
          avg_spend_per_visit: 22_500,
          trend: "stable",
          trend_pct: 2,
          peak_hours: "06:00 – 09:00",
          preferred_activities: ["Tenis", "Pádel", "Natación", "Gimnasio", "Yoga"],
          communication_preference: "whatsapp",
          churn_risk_pct: 18,
        },
        {
          id: "sociales",
          name: "Sociales",
          icon: "Wine",
          color: "#C9A96E",
          family_count: 31,
          pct_of_total: 22,
          avg_monthly_spend: 310_000,
          avg_visits_per_month: 5.4,
          avg_spend_per_visit: 57_400,
          trend: "growing",
          trend_pct: 8,
          peak_hours: "18:00 – 22:00",
          preferred_activities: ["Restaurante", "Bar", "Eventos privados", "Catas", "Celebraciones"],
          communication_preference: "email",
          churn_risk_pct: 22,
        },
        {
          id: "ejecutivos",
          name: "Ejecutivos",
          icon: "Briefcase",
          color: "#B8C0CC",
          family_count: 24,
          pct_of_total: 17,
          avg_monthly_spend: 245_000,
          avg_visits_per_month: 6.1,
          avg_spend_per_visit: 40_200,
          trend: "stable",
          trend_pct: -1,
          peak_hours: "11:00 – 14:00",
          preferred_activities: ["Business lunch", "Salas de reunión", "Gimnasio", "Tenis express"],
          communication_preference: "email",
          churn_risk_pct: 15,
        },
        {
          id: "familiares",
          name: "Familiares",
          icon: "Users",
          color: "#3DAA70",
          family_count: 32,
          pct_of_total: 23,
          avg_monthly_spend: 220_000,
          avg_visits_per_month: 6.8,
          avg_spend_per_visit: 32_400,
          trend: "growing",
          trend_pct: 5,
          peak_hours: "09:00 – 12:00, 15:00 – 18:00",
          preferred_activities: ["Kids Club", "Piscina familiar", "Eventos temáticos", "Clases grupales"],
          communication_preference: "whatsapp",
          churn_risk_pct: 12,
        },
        {
          id: "invisibles",
          name: "Invisibles",
          icon: "EyeOff",
          color: "#C46470",
          family_count: 17,
          pct_of_total: 12,
          avg_monthly_spend: 45_000,
          avg_visits_per_month: 1.2,
          avg_spend_per_visit: 37_500,
          trend: "shrinking",
          trend_pct: -12,
          peak_hours: "Sin patrón claro",
          preferred_activities: ["Sin actividad dominante"],
          communication_preference: "whatsapp",
          churn_risk_pct: 58,
        },
      ],
      personas: [
        {
          segment_id: "deportivos",
          persona_name: "El Deportista Comprometido",
          description: "Visita el club principalmente para deporte. Alto engagement con canchas, gimnasio y piscina. Gasto moderado pero constante.",
          typical_family: "Pareja 35-50, sin hijos o hijos adolescentes que también practican deporte",
          motivations: ["Competencia", "Salud", "Comunidad deportiva", "Rutina"],
          pain_points: ["Mantenimiento de canchas", "Disponibilidad en horario pico", "Falta de torneos regulares"],
          best_channel: "WhatsApp grupal del deporte",
          best_time: "6:00-7:00 AM (antes de la sesión)",
          avg_lifetime_years: 6.2,
          nps_score: 72,
        },
        {
          segment_id: "sociales",
          persona_name: "El Anfitrión Distinguido",
          description: "El club es su extensión social. Alto gasto en F&B y eventos. Trae invitados frecuentemente. Valora exclusividad.",
          typical_family: "Pareja 45-60, adultos, círculo social amplio",
          motivations: ["Estatus", "Exclusividad", "Red social", "Celebraciones"],
          pain_points: ["Espera personalización", "Sensibilidad a caída de calidad", "Quiere reconocimiento especial"],
          best_channel: "Email personalizado del gerente",
          best_time: "Jueves-Viernes 16:00-18:00 (planificación de fin de semana)",
          avg_lifetime_years: 8.5,
          nps_score: 65,
        },
        {
          segment_id: "ejecutivos",
          persona_name: "El Profesional Estratégico",
          description: "Usa el club como extensión de su vida profesional. Business lunches, reuniones, networking. Eficiente con el tiempo.",
          typical_family: "Ejecutivo 40-55, alto cargo, agenda ajustada",
          motivations: ["Conveniencia", "Networking", "Imagen profesional", "Eficiencia"],
          pain_points: ["Tiempos de espera", "WiFi/Salas", "Falta de opciones express"],
          best_channel: "Email directo, conciso",
          best_time: "Lunes 8:00 (planificación semanal)",
          avg_lifetime_years: 5.8,
          nps_score: 68,
        },
        {
          segment_id: "familiares",
          persona_name: "La Familia Conectada",
          description: "El club es el espacio de calidad familiar. Actividades para niños, fines de semana completos, celebraciones familiares.",
          typical_family: "Familia 30-45, 2-3 hijos, abuelos ocasionales",
          motivations: ["Tiempo en familia", "Actividades para hijos", "Seguridad", "Comunidad"],
          pain_points: ["Variedad de kids club", "Precios de actividades infantiles", "Horarios compatibles con colegio"],
          best_channel: "WhatsApp con info práctica",
          best_time: "Miércoles-Jueves 20:00 (planificación fin de semana)",
          avg_lifetime_years: 7.1,
          nps_score: 75,
        },
        {
          segment_id: "invisibles",
          persona_name: "El Socio Desconectado",
          description: "Paga membresía pero casi no visita. Puede estar satisfecho pero desconectado, o acumulando insatisfacción silenciosa.",
          typical_family: "Variable — sin patrón claro. Muchos con mudanza reciente o cambio de rutina",
          motivations: ["Desconocidos — no hay data suficiente"],
          pain_points: ["Desconocidos — posible falta de awareness de beneficios"],
          best_channel: "WhatsApp personal (67% read rate vs 12% email)",
          best_time: "Sábado 10:00 (momento de reflexión sobre ocio)",
          avg_lifetime_years: 3.2,
          nps_score: 42,
        },
      ],
      migrations: [
        { from_segment: "Deportivos", to_segment: "Invisibles", family_count: 5, period: "Q1 2025", direction: "negative" },
        { from_segment: "Familiares", to_segment: "Sociales", family_count: 3, period: "Q1 2025", direction: "neutral" },
        { from_segment: "Invisibles", to_segment: "Deportivos", family_count: 2, period: "Q1 2025", direction: "positive" },
        { from_segment: "Ejecutivos", to_segment: "Sociales", family_count: 2, period: "Q1 2025", direction: "neutral" },
        { from_segment: "Sociales", to_segment: "Invisibles", family_count: 2, period: "Q1 2025", direction: "negative" },
        { from_segment: "Invisibles", to_segment: "Familiares", family_count: 1, period: "Q1 2025", direction: "positive" },
        { from_segment: "Deportivos", to_segment: "Familiares", family_count: 2, period: "Q1 2025", direction: "neutral" },
        { from_segment: "Ejecutivos", to_segment: "Invisibles", family_count: 1, period: "Q1 2025", direction: "negative" },
      ],
      revenue_by_segment: [
        { segment_id: "sociales", segment_name: "Sociales", color: "#C9A96E", fb_revenue: 5_310_000, activities_revenue: 930_000, events_revenue: 2_480_000, other_revenue: 890_000, total_revenue: 9_610_000, revenue_pct: 32 },
        { segment_id: "deportivos", segment_name: "Deportivos", color: "#2A9AB5", fb_revenue: 2_110_000, activities_revenue: 3_520_000, events_revenue: 700_000, other_revenue: 700_000, total_revenue: 7_030_000, revenue_pct: 23 },
        { segment_id: "familiares", segment_name: "Familiares", color: "#3DAA70", fb_revenue: 2_530_000, activities_revenue: 2_820_000, events_revenue: 970_000, other_revenue: 720_000, total_revenue: 7_040_000, revenue_pct: 23 },
        { segment_id: "ejecutivos", segment_name: "Ejecutivos", color: "#B8C0CC", fb_revenue: 2_410_000, activities_revenue: 1_180_000, events_revenue: 1_770_000, other_revenue: 520_000, total_revenue: 5_880_000, revenue_pct: 19 },
        { segment_id: "invisibles", segment_name: "Invisibles", color: "#C46470", fb_revenue: 290_000, activities_revenue: 100_000, events_revenue: 190_000, other_revenue: 185_000, total_revenue: 765_000, revenue_pct: 3 },
      ],
      campaign_readiness: [
        { segment_id: "familiares", segment_name: "Familiares", email_open_rate_pct: 38, whatsapp_read_rate_pct: 82, response_rate_pct: 28, best_channel: "whatsapp", readiness_score: 88 },
        { segment_id: "deportivos", segment_name: "Deportivos", email_open_rate_pct: 22, whatsapp_read_rate_pct: 78, response_rate_pct: 32, best_channel: "whatsapp", readiness_score: 82 },
        { segment_id: "sociales", segment_name: "Sociales", email_open_rate_pct: 55, whatsapp_read_rate_pct: 68, response_rate_pct: 24, best_channel: "email", readiness_score: 75 },
        { segment_id: "ejecutivos", segment_name: "Ejecutivos", email_open_rate_pct: 48, whatsapp_read_rate_pct: 45, response_rate_pct: 18, best_channel: "email", readiness_score: 62 },
        { segment_id: "invisibles", segment_name: "Invisibles", email_open_rate_pct: 12, whatsapp_read_rate_pct: 67, response_rate_pct: 8, best_channel: "whatsapp", readiness_score: 35 },
      ],
      segment_stability: {
        deportivos: 72,
        sociales: 68,
        ejecutivos: 87,
        familiares: 81,
        invisibles: 43,
      },
      total_families: 142,
      generated_at: now,
    },
  };
}

// ── members_lifetime_value ──

export function createMockMembersLifetimeValue(
  _params?: Record<string, unknown>,
): MembersLifetimeValueResponse {
  const now = new Date().toISOString();

  // Monte Carlo: 36 meses con bandas que se ensanchan
  const monteCarlo = Array.from({ length: 36 }, (_, i) => {
    const base = 8_400_000 * Math.pow(1.004, i);
    const spread = base * 0.008 * Math.sqrt(i + 1);
    const d = new Date(2025, 4 + i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: monthStr,
      p10: Math.round(base - spread * 2.3),
      p25: Math.round(base - spread * 1.2),
      p50: Math.round(base),
      p75: Math.round(base + spread * 1.2),
      p90: Math.round(base + spread * 2.3),
    };
  });

  // Payback: 13 meses (0-12)
  const payback = Array.from({ length: 13 }, (_, i) => ({
    month: i,
    cumulative_margin: i === 0 ? 0 : Math.round(120_000 * i + 10_000 * (i * i) / 2),
    intervention_cost: 425_000,
    net_position:
      (i === 0 ? 0 : Math.round(120_000 * i + 10_000 * (i * i) / 2)) - 425_000,
  }));

  return {
    status: "success",
    message: "💎 LTV predictivo calculado para 142 familias — Portfolio: ₡1.19B",
    data: {
      avg_ltv: 8_400_000,
      median_ltv: 7_100_000,
      total_portfolio_ltv: 1_192_800_000,
      ltv_growth_rate_pct: 5.2,
      families: [
        { family_id: "FAM-001", family_name: "Rodríguez Solano", tier: "Platinum", segment: "Sociales", ltv_current: 16_200_000, ltv_p10: 12_100_000, ltv_p50: 16_200_000, ltv_p90: 21_800_000, monthly_margin: 420_000, retention_prob_12m: 0.96, retention_prob_36m: 0.88, churn_risk_pct: 8, upgrade_prob_pct: 0, referral_rate: 3.2, payback_months: 2 },
        { family_id: "FAM-002", family_name: "Jiménez Oreamuno", tier: "Platinum", segment: "Ejecutivos", ltv_current: 14_100_000, ltv_p10: 10_500_000, ltv_p50: 14_100_000, ltv_p90: 19_200_000, monthly_margin: 380_000, retention_prob_12m: 0.94, retention_prob_36m: 0.85, churn_risk_pct: 12, upgrade_prob_pct: 0, referral_rate: 1.8, payback_months: 3 },
        { family_id: "FAM-003", family_name: "Quesada Vargas", tier: "Gold", segment: "Sociales", ltv_current: 9_200_000, ltv_p10: 4_800_000, ltv_p50: 8_600_000, ltv_p90: 13_100_000, monthly_margin: 245_000, retention_prob_12m: 0.38, retention_prob_36m: 0.15, churn_risk_pct: 73, upgrade_prob_pct: 5, referral_rate: 1.5, payback_months: 12 },
        { family_id: "FAM-005", family_name: "Herrera Barrantes", tier: "Platinum", segment: "Sociales", ltv_current: 15_800_000, ltv_p10: 11_800_000, ltv_p50: 15_800_000, ltv_p90: 21_100_000, monthly_margin: 395_000, retention_prob_12m: 0.91, retention_prob_36m: 0.82, churn_risk_pct: 15, upgrade_prob_pct: 0, referral_rate: 2.8, payback_months: 2 },
        { family_id: "FAM-007", family_name: "Montero Quirós", tier: "Platinum", segment: "Ejecutivos", ltv_current: 12_300_000, ltv_p10: 6_200_000, ltv_p50: 11_500_000, ltv_p90: 17_800_000, monthly_margin: 310_000, retention_prob_12m: 0.58, retention_prob_36m: 0.32, churn_risk_pct: 52, upgrade_prob_pct: 0, referral_rate: 2.1, payback_months: 8 },
        { family_id: "FAM-009", family_name: "Pérez Arce", tier: "Gold", segment: "Deportivos", ltv_current: 8_100_000, ltv_p10: 5_900_000, ltv_p50: 8_100_000, ltv_p90: 11_200_000, monthly_margin: 215_000, retention_prob_12m: 0.88, retention_prob_36m: 0.75, churn_risk_pct: 18, upgrade_prob_pct: 15, referral_rate: 1.2, payback_months: 4 },
        { family_id: "FAM-011", family_name: "Vargas Rojas", tier: "Gold", segment: "Sociales", ltv_current: 7_800_000, ltv_p10: 3_500_000, ltv_p50: 7_200_000, ltv_p90: 11_500_000, monthly_margin: 200_000, retention_prob_12m: 0.42, retention_prob_36m: 0.18, churn_risk_pct: 65, upgrade_prob_pct: 8, referral_rate: 0.8, payback_months: 10 },
        { family_id: "FAM-013", family_name: "Castro Fernández", tier: "Gold", segment: "Deportivos", ltv_current: 7_200_000, ltv_p10: 5_200_000, ltv_p50: 7_200_000, ltv_p90: 10_100_000, monthly_margin: 195_000, retention_prob_12m: 0.84, retention_prob_36m: 0.72, churn_risk_pct: 22, upgrade_prob_pct: 12, referral_rate: 1.4, payback_months: 5 },
        { family_id: "FAM-015", family_name: "Alfaro Montero", tier: "Gold", segment: "Sociales", ltv_current: 6_800_000, ltv_p10: 4_500_000, ltv_p50: 6_800_000, ltv_p90: 9_800_000, monthly_margin: 180_000, retention_prob_12m: 0.72, retention_prob_36m: 0.55, churn_risk_pct: 35, upgrade_prob_pct: 10, referral_rate: 1.1, payback_months: 6 },
        { family_id: "FAM-019", family_name: "Obando Salazar", tier: "Silver", segment: "Invisibles", ltv_current: 4_100_000, ltv_p10: 1_800_000, ltv_p50: 3_600_000, ltv_p90: 6_200_000, monthly_margin: 115_000, retention_prob_12m: 0.45, retention_prob_36m: 0.22, churn_risk_pct: 61, upgrade_prob_pct: 3, referral_rate: 0.3, payback_months: 11 },
        { family_id: "FAM-021", family_name: "Sánchez Pinto", tier: "Silver", segment: "Familiares", ltv_current: 4_800_000, ltv_p10: 3_200_000, ltv_p50: 4_800_000, ltv_p90: 7_100_000, monthly_margin: 140_000, retention_prob_12m: 0.82, retention_prob_36m: 0.68, churn_risk_pct: 25, upgrade_prob_pct: 18, referral_rate: 1.6, payback_months: 5 },
        { family_id: "FAM-025", family_name: "Zamora Villalobos", tier: "Gold", segment: "Deportivos", ltv_current: 8_500_000, ltv_p10: 4_200_000, ltv_p50: 7_900_000, ltv_p90: 12_300_000, monthly_margin: 220_000, retention_prob_12m: 0.52, retention_prob_36m: 0.28, churn_risk_pct: 58, upgrade_prob_pct: 8, referral_rate: 0.9, payback_months: 9 },
        { family_id: "FAM-031", family_name: "Brenes Gutiérrez", tier: "Silver", segment: "Familiares", ltv_current: 5_400_000, ltv_p10: 3_100_000, ltv_p50: 5_100_000, ltv_p90: 7_800_000, monthly_margin: 155_000, retention_prob_12m: 0.68, retention_prob_36m: 0.48, churn_risk_pct: 40, upgrade_prob_pct: 12, referral_rate: 0.7, payback_months: 7 },
        { family_id: "FAM-042", family_name: "Mora Ramírez", tier: "Silver", segment: "Invisibles", ltv_current: 4_200_000, ltv_p10: 2_100_000, ltv_p50: 3_800_000, ltv_p90: 6_400_000, monthly_margin: 120_000, retention_prob_12m: 0.62, retention_prob_36m: 0.38, churn_risk_pct: 45, upgrade_prob_pct: 5, referral_rate: 0.4, payback_months: 9 },
        { family_id: "FAM-048", family_name: "Villalobos Chen", tier: "Silver", segment: "Familiares", ltv_current: 3_800_000, ltv_p10: 2_600_000, ltv_p50: 3_800_000, ltv_p90: 5_500_000, monthly_margin: 105_000, retention_prob_12m: 0.90, retention_prob_36m: 0.78, churn_risk_pct: 15, upgrade_prob_pct: 22, referral_rate: 1.9, payback_months: 4 },
      ],
      distribution: [
        { range: "₡0 – ₡3M", count: 28, pct: 20, total_value: 61_600_000 },
        { range: "₡3M – ₡6M", count: 42, pct: 30, total_value: 189_000_000 },
        { range: "₡6M – ₡9M", count: 38, pct: 27, total_value: 273_600_000 },
        { range: "₡9M – ₡12M", count: 22, pct: 15, total_value: 231_000_000 },
        { range: "₡12M+", count: 12, pct: 8, total_value: 170_400_000 },
      ],
      sensitivity: [
        { factor: "Gasto F&B mensual", base_change_pct: 15, ltv_impact_pct: 22, direction: "positive", description: "+15% en gasto F&B → +22% LTV. El driver más potente por margen alto de F&B." },
        { factor: "Frecuencia de visitas", base_change_pct: 20, ltv_impact_pct: 18, direction: "positive", description: "+20% visitas → +18% LTV. Más visitas = más gasto incremental + menor churn risk." },
        { factor: "Probabilidad de churn", base_change_pct: 20, ltv_impact_pct: -31, direction: "negative", description: "+20% churn risk → -31% LTV. El factor negativo más destructivo. Retención es clave." },
        { factor: "Tasa de referidos", base_change_pct: 50, ltv_impact_pct: 15, direction: "positive", description: "+50% referidos → +15% LTV. Cada referido aporta ~₡180K de valor indirecto." },
        { factor: "Probabilidad de upgrade", base_change_pct: 30, ltv_impact_pct: 12, direction: "positive", description: "+30% prob upgrade → +12% LTV. Silver→Gold promedio: +₡3.7M lifetime." },
        { factor: "Inflación CR", base_change_pct: 2, ltv_impact_pct: -4, direction: "negative", description: "+2% inflación → -4% LTV. Margen comprimido si pricing no ajusta." },
      ],
      monte_carlo: monteCarlo,
      by_tier: [
        { tier: "Platinum", color: "#C9A96E", avg_ltv: 12_300_000, median_ltv: 11_800_000, count: 18, total_ltv: 221_400_000 },
        { tier: "Gold", color: "#D4A840", avg_ltv: 7_800_000, median_ltv: 7_200_000, count: 56, total_ltv: 436_800_000 },
        { tier: "Silver", color: "#B8C0CC", avg_ltv: 4_100_000, median_ltv: 3_800_000, count: 68, total_ltv: 278_800_000 },
      ],
      payback,
      inflation_rate_pct: 3.5,
      discount_rate_pct: 9.0,
      generated_at: now,
    },
  };
}

// ── members_churn_prevention ──

export function createMockMembersChurnPrevention(
  _params?: Record<string, unknown>,
): MembersChurnPreventionResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message: "🛡️ Análisis de retención: 14 familias en riesgo — ₡47M en LTV en riesgo",
    data: {
      total_at_risk: 14,
      total_ltv_at_risk: 47_200_000,
      active_interventions: 6,
      historical_success_rate_pct: 68,
      top_families: [
        {
          family_id: "FAM-003",
          family_name: "Quesada Vargas",
          tier: "Gold",
          segment: "Sociales",
          churn_probability_pct: 73,
          ltv_at_risk: 9_200_000,
          days_since_last_visit: 45,
          primary_risk_factor: "Decline en visitas (-75%)",
          secondary_risk_factors: ["Aging ₡1.8M", "Comunicación no respondida"],
          recommended_intervention: "Cena privada con gerente",
          intervention_cost: 85_000,
          intervention_roi: 108,
          cascade_risk_family_ids: ["FAM-037", "FAM-015"],
        },
        {
          family_id: "FAM-011",
          family_name: "Vargas Rojas",
          tier: "Gold",
          segment: "Sociales",
          churn_probability_pct: 65,
          ltv_at_risk: 7_800_000,
          days_since_last_visit: 58,
          primary_risk_factor: "Engagement cero (58 días sin visita)",
          secondary_risk_factors: ["Aging ₡1.8M", "Satisfacción en declive"],
          recommended_intervention: "Llamada personal + plan de pago",
          intervention_cost: 5_000,
          intervention_roi: 1_560,
          cascade_risk_family_ids: [],
        },
        {
          family_id: "FAM-019",
          family_name: "Obando Salazar",
          tier: "Silver",
          segment: "Invisibles",
          churn_probability_pct: 61,
          ltv_at_risk: 4_100_000,
          days_since_last_visit: 67,
          primary_risk_factor: "Invisible crónico (1.2 visitas/mes)",
          secondary_risk_factors: ["Bajo awareness de beneficios", "Sin conexiones sociales"],
          recommended_intervention: "WhatsApp personal + invitación a día de prueba",
          intervention_cost: 15_000,
          intervention_roi: 273,
          cascade_risk_family_ids: [],
        },
        {
          family_id: "FAM-025",
          family_name: "Zamora Villalobos",
          tier: "Gold",
          segment: "Deportivos",
          churn_probability_pct: 58,
          ltv_at_risk: 8_500_000,
          days_since_last_visit: 28,
          primary_risk_factor: "Satisfacción colapsó (-38pts)",
          secondary_risk_factors: ["Posible incidente en cancha #3", "Engagement en caída"],
          recommended_intervention: "Paquete de actividades + compensación",
          intervention_cost: 65_000,
          intervention_roi: 131,
          cascade_risk_family_ids: ["FAM-009"],
        },
        {
          family_id: "FAM-007",
          family_name: "Montero Quirós",
          tier: "Platinum",
          segment: "Ejecutivos",
          churn_probability_pct: 52,
          ltv_at_risk: 12_300_000,
          days_since_last_visit: 32,
          primary_risk_factor: "Social score mínimo (22/100)",
          secondary_risk_factors: ["Patrón de desconexión progresiva", "Cluster ejecutivo debilitándose"],
          recommended_intervention: "Reunión ejecutiva con gerente + beneficio exclusivo",
          intervention_cost: 15_000,
          intervention_roi: 820,
          cascade_risk_family_ids: ["FAM-002"],
        },
        {
          family_id: "FAM-042",
          family_name: "Mora Ramírez",
          tier: "Silver",
          segment: "Invisibles",
          churn_probability_pct: 45,
          ltv_at_risk: 4_200_000,
          days_since_last_visit: 52,
          primary_risk_factor: "Engagement mínimo (22/100)",
          secondary_risk_factors: ["Sin patrón de visita claro"],
          recommended_intervention: "Invitación a actividad grupal",
          intervention_cost: 8_000,
          intervention_roi: 525,
          cascade_risk_family_ids: [],
        },
        {
          family_id: "FAM-031",
          family_name: "Brenes Gutiérrez",
          tier: "Silver",
          segment: "Familiares",
          churn_probability_pct: 40,
          ltv_at_risk: 5_400_000,
          days_since_last_visit: 21,
          primary_risk_factor: "Score financiero colapsó (-23pts)",
          secondary_risk_factors: ["Aging reciente", "Posible dificultad económica"],
          recommended_intervention: "Plan de pago flexible + descuento temporal",
          intervention_cost: 120_000,
          intervention_roi: 45,
          cascade_risk_family_ids: ["FAM-021"],
        },
      ],
      interventions: [
        {
          id: "INT-001",
          type: "experiencia",
          name: "Cena privada con gerente",
          description: "Cena exclusiva para 2 en el restaurante premium con el gerente general. Incluye menú degustación y bebidas. Momento para escuchar, reconocer y resolver.",
          avg_cost: 85_000,
          success_rate_pct: 72,
          avg_roi: 920,
          best_for_segments: ["Sociales", "Ejecutivos"],
          best_for_risk_factors: ["Decline en visitas", "Satisfacción en declive"],
          timeline_days: 7,
          effort: "medium",
        },
        {
          id: "INT-002",
          type: "contacto",
          name: "Llamada personal directa",
          description: "Llamada del gerente o staff senior directamente al socio. Tono personal, no comercial. Objetivo: escuchar, detectar problema, ofrecer solución.",
          avg_cost: 5_000,
          success_rate_pct: 45,
          avg_roi: 2_800,
          best_for_segments: ["Sociales", "Familiares", "Ejecutivos", "Deportivos"],
          best_for_risk_factors: ["Engagement cero", "Comunicación no respondida"],
          timeline_days: 1,
          effort: "low",
        },
        {
          id: "INT-003",
          type: "incentivo",
          name: "Descuento en upgrade de tier",
          description: "Ofrecer upgrade temporal a tier superior por 3 meses con precio del tier actual. Reduce barrera de percepción de valor.",
          avg_cost: 120_000,
          success_rate_pct: 58,
          avg_roi: 410,
          best_for_segments: ["Ejecutivos", "Deportivos"],
          best_for_risk_factors: ["Percepción de valor", "Bajo uso de amenities"],
          timeline_days: 14,
          effort: "medium",
        },
        {
          id: "INT-004",
          type: "experiencia",
          name: "Invitación a evento exclusivo",
          description: "Evento limitado a 20 socios: cata de vinos, noche de jazz, o cena temática. Crea conexión emocional y social.",
          avg_cost: 35_000,
          success_rate_pct: 65,
          avg_roi: 850,
          best_for_segments: ["Sociales", "Deportivos"],
          best_for_risk_factors: ["Conexiones sociales débiles", "Sin patrón de visita"],
          timeline_days: 10,
          effort: "medium",
        },
        {
          id: "INT-005",
          type: "programa",
          name: "Paquete de actividades personalizado",
          description: "3 actividades diseñadas para el perfil de la familia: clase de pádel, sesión de bienbaby, brunch familiar. Objetivo: crear nuevos hábitos de visita.",
          avg_cost: 65_000,
          success_rate_pct: 52,
          avg_roi: 680,
          best_for_segments: ["Deportivos", "Familiares"],
          best_for_risk_factors: ["Bajo uso de actividades", "Engagement en caída"],
          timeline_days: 21,
          effort: "high",
        },
        {
          id: "INT-006",
          type: "governance",
          name: "Reunión con junta directiva",
          description: "Miembro de la junta directiva se reúne personalmente con el socio. Transmite que el club valora su membresía al más alto nivel.",
          avg_cost: 15_000,
          success_rate_pct: 48,
          avg_roi: 2_200,
          best_for_segments: ["Ejecutivos", "Sociales"],
          best_for_risk_factors: ["Socio de alto valor en riesgo", "Crisis de confianza"],
          timeline_days: 5,
          effort: "low",
        },
      ],
      risk_factors: [
        { factor: "Decline en visitas", affected_families: 8, pct_of_at_risk: 57, avg_impact_on_score: -18 },
        { factor: "Aging >60 días", affected_families: 5, pct_of_at_risk: 36, avg_impact_on_score: -22 },
        { factor: "Comunicación no respondida", affected_families: 6, pct_of_at_risk: 43, avg_impact_on_score: -15 },
        { factor: "Satisfacción en declive", affected_families: 4, pct_of_at_risk: 29, avg_impact_on_score: -12 },
        { factor: "Sin conexiones sociales", affected_families: 3, pct_of_at_risk: 21, avg_impact_on_score: -10 },
        { factor: "Incidente reportado", affected_families: 2, pct_of_at_risk: 14, avg_impact_on_score: -25 },
      ],
      historical_saves: [
        { family_id: "FAM-060", family_name: "Mena Solís", intervention_type: "Cena privada", date: "2025-03-15", outcome: "saved", ltv_preserved: 8_200_000, cost: 85_000, roi: 96 },
        { family_id: "FAM-062", family_name: "Rojas Jiménez", intervention_type: "Llamada personal", date: "2025-02-28", outcome: "saved", ltv_preserved: 5_100_000, cost: 5_000, roi: 1_020 },
        { family_id: "FAM-064", family_name: "Cascante Mora", intervention_type: "Evento exclusivo", date: "2025-03-01", outcome: "saved", ltv_preserved: 6_400_000, cost: 35_000, roi: 183 },
        { family_id: "FAM-066", family_name: "Durán Campos", intervention_type: "Paquete actividades", date: "2025-01-20", outcome: "saved", ltv_preserved: 4_800_000, cost: 65_000, roi: 74 },
        { family_id: "FAM-068", family_name: "Leiva Aguilar", intervention_type: "Descuento tier", date: "2025-04-05", outcome: "saved", ltv_preserved: 7_500_000, cost: 120_000, roi: 63 },
        { family_id: "FAM-070", family_name: "Fonseca Torres", intervention_type: "Reunión junta", date: "2025-02-10", outcome: "saved", ltv_preserved: 3_900_000, cost: 15_000, roi: 260 },
        { family_id: "FAM-072", family_name: "Sandí Quirós", intervention_type: "Llamada personal", date: "2025-03-22", outcome: "lost", ltv_preserved: 0, cost: 5_000, roi: null },
        { family_id: "FAM-074", family_name: "Madrigal Peña", intervention_type: "Cena privada", date: "2025-04-10", outcome: "saved", ltv_preserved: 5_300_000, cost: 85_000, roi: 62 },
        { family_id: "FAM-076", family_name: "Gamboa Retana", intervention_type: "Evento exclusivo", date: "2025-01-15", outcome: "lost", ltv_preserved: 0, cost: 35_000, roi: null },
        { family_id: "FAM-078", family_name: "Calderón Fuentes", intervention_type: "Paquete actividades", date: "2025-04-20", outcome: "pending", ltv_preserved: 0, cost: 65_000, roi: null },
      ],
      cost_of_inaction: 47_200_000,
      recommended_budget: 425_000,
      generated_at: now,
    },
  };
}
// ── finance_decision_simulate ──

export function createMockFinanceDecisionSimulate(
  _params?: Record<string, unknown>,
): FinanceDecisionSimulateResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message: "🎯 Simulación completada: 3 escenarios para membresía junior (18-28 años)",
    data: {
      decision_summary:
        "Implementar programa de membresía junior (18-28 años) para hijos de socios actuales a tarifa preferencial del 60% del tier correspondiente",
      context_analysis:
        "Actualmente 47 familias tienen hijos en rango 18-28 años. 12 de ellas muestran declive en engagement (-30% visitas promedio). 8 hijos se dieron de baja en los últimos 24 meses. Tendencia regional: 3 clubs en GAM ofrecen programas similares con adopción del 15-25%.",
      scenarios: [
        {
          name: "Optimista",
          probability_pct: 35,
          revenue_delta: 42_000_000,
          membership_delta: 18,
          cash_flow_delta: 32_000_000,
          implementation_cost: 15_000_000,
          roi_pct: 280,
          risk_level: "bajo",
          risk_factors: ["Adopción depende de percepción de valor entre juniors"],
          timeline_months: 6,
          key_assumptions: [
            "Tasa de adopción 38% (18 de 47 familias elegibles)",
            "No hay canibalización de membresías full existentes",
            "Junior members generan gasto adicional promedio de ₡85,000/mes en F&B y actividades",
          ],
        },
        {
          name: "Base",
          probability_pct: 45,
          revenue_delta: 24_000_000,
          membership_delta: 10,
          cash_flow_delta: 18_000_000,
          implementation_cost: 15_000_000,
          roi_pct: 160,
          risk_level: "medio",
          risk_factors: [
            "Resistencia de socios fundadores perciben devaluación del brand",
            "Posible fricción en la asamblea general de junio",
          ],
          timeline_months: 9,
          key_assumptions: [
            "Tasa de adopción 21% (10 de 47 familias)",
            "Algunos socios expresan preocupación en asamblea — se resuelve con piloto previo",
            "Junior members usan amenities mayormente en horarios off-peak",
          ],
        },
        {
          name: "Pesimista",
          probability_pct: 20,
          revenue_delta: 8_000_000,
          membership_delta: 4,
          cash_flow_delta: 4_000_000,
          implementation_cost: 15_000_000,
          roi_pct: 53,
          risk_level: "alto",
          risk_factors: [
            "Baja adopción por falta de awareness entre familias elegibles",
            "Resistencia activa de 3 miembros de la junta directiva",
            "Posible canibalización: 2 familias solicitan downgrade a tarifa junior",
          ],
          timeline_months: 12,
          key_assumptions: [
            "Tasa de adopción 8.5% (4 de 47 familias)",
            "2 socios existentes piden cambio a tarifa junior — impacto neto negativo ₡3.2M",
            "Implementación requiere cambio de reglamento interno — proceso de 3 meses",
          ],
        },
      ],
      recommendation: {
        recommended_scenario: "Base",
        confidence_pct: 72,
        reasoning:
          "El escenario base ofrece el mejor balance riesgo-retorno. Con ₡24M de ingreso incremental y ROI del 160%, la inversión se recupera en 10 meses. La implementación por fases (piloto de 15 familias → lanzamiento general) mitiga el riesgo de rechazo. El histórico del club muestra que programas similares alcanzan resultados entre base y optimista cuando se comunican con anticipación.",
        critical_success_factors: [
          "Piloto con 15 familias seleccionadas antes del lanzamiento general",
          "Comunicación clara de que NO afecta beneficios de socios existentes",
          "Evento de lanzamiento exclusivo para familias elegibles (cena + demo de amenities)",
          "Tracking mensual de adopción, satisfaction score y gasto incremental",
        ],
        watch_items: [
          "Reacción de socios fundadores en asamblea de junio 2025",
          "Competencia: Reserva Conchal anunció programa similar en abril",
          "Impacto en parking y facilidades en horarios pico si adopción es >30%",
          "Necesidad de ajustar precios si el tipo de cambio USD/CRC afecta costos operativos",
        ],
        suggested_kpis: [
          "Tasa de adopción mensual (target: 5 familias/mes en piloto)",
          "NPS de junior members (target: >70)",
          "Gasto adicional promedio por familia con junior member (target: >₡65,000/mes)",
          "Retention rate familias con programa vs sin programa (target: +15pts)",
        ],
      },
      historical_precedents: [
        {
          decision: "Programa de familia extendida para fines de semana",
          date: "2022-08-15",
          chosen_scenario: "Optimista",
          actual_outcome:
            "Resultado entre base y optimista — 65 familias adoptaron (proyectábamos 80)",
          revenue_impact: 21_500_000,
          lessons_learned:
            "La adopción cultural toma 2-3 meses más de lo estimado. El boca a boca entre socios fue el driver principal de adopción tardía.",
        },
        {
          decision: "Tarifa preferente para menores en actividades deportivas",
          date: "2023-03-01",
          chosen_scenario: "Conservador",
          actual_outcome:
            "Superó expectativas — 120 inscritos vs 80 proyectados",
          revenue_impact: 12_800_000,
          lessons_learned:
            "Reducir barreras de precio en actividades de bajo costo tiene alta elasticidad. No aplica directamente a membresías completas, pero valida la demanda latente.",
        },
        {
          decision: "Descuento early renewal para socios Gold",
          date: "2024-01-10",
          chosen_scenario: "Base",
          actual_outcome:
            "Casi exacto al proyectado — 28 renuevas tempranas de 35 esperadas",
          revenue_impact: 18_200_000,
          lessons_learned:
            "Los incentivos financieros funcionan mejor en segmentos que ya están evaluando alternativas. Timing Q1 es óptimo para renovaciones.",
        },
      ],
      sensitivity_notes: [
        "Si la tasa de adopción sube 10pts sobre el escenario base, el ROI sube a 220% y el payback se acorta a 7 meses",
        "Si hay 1 caso de downgrade de Platinum a junior, el impacto neto negativo es ₡3.2M — mitigable con cláusula de permanencia mínima",
        "El costo de implementación tiene ±15% de variación según proveedor tecnológico para el módulo de registro",
        "Timing óptimo de lanzamiento: antes de diciembre 2025 para capturar renovaciones Q1 2026 y temporada alta de actividades",
      ],
      generated_at: now,
    },
  };
}

// ── communications_generate_personalized ──

export function createMockCommunicationsGeneratePersonalized(
  _params?: Record<string, unknown>,
): CommunicationsGeneratePersonalizedResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message:
      "✉️ Comunicación personalizada generada: Montero Quirós — reconocimiento de antigüedad 15 años",
    data: {
      family_id: "FAM-007",
      family_name: "Montero Quirós",
      channel: "email",
      occasion: "Reconocimiento de antigüedad — 15 años de membresía",
      content: {
        channel: "email",
        subject:
          "Don Carlos, 15 años de excelencia juntos — Su reconocimiento especial",
        body: [
          "Estimado Don Carlos Montero Quirós,",
          "",
          "En nombre de toda la familia del Castillo Country Club, es un honor reconocer los 15 años que su familia ha sido parte esencial de nuestra comunidad.",
          "",
          "Desde su incorporación en 2010, los Montero Quirós han sido pilares de nuestra vida social y ejecutiva. Su participación en el Torneo de Golf Anual, su liderazgo en el Comité de Eventos y la presencia constante en nuestras galas han enriquecido el espíritu de nuestro club.",
          "",
          "Como expresión de nuestro agradecimiento, nos complace ofrecerle:",
          "",
          "• Acceso exclusivo al nuevo Salón Ejecutivo durante el próximo trimestre",
          "• Cena degustación para 2 en nuestro restaurante premium, cortesía del club",
          "• Un juego personalizado de palos de golf con el monograma de su familia",
          "",
          "Será un placer coordinar estos detalles con usted. Nuestro equipo de Servicio al Socio lo contactará en los próximos días.",
          "",
          "Con profundo agradecimiento,",
          "",
          "Lic. Patricia Solano",
          "Gerente General",
          "Castillo Country Club",
        ].join("\n"),
        preview_text:
          "15 años de excelencia — Su reconocimiento especial le espera",
        cta_text: "Agendar mi cena de reconocimiento",
        cta_action: "rsvp_recognition_dinner",
      },
      tone_analysis: {
        detected_tone: "formal-cálido",
        formality_score: 88,
        warmth_score: 82,
        urgency_score: 15,
        personalization_score: 91,
      },
      personalization_details: [
        {
          field: "Tratamiento",
          value: "Don Carlos",
          impact_on_engagement: "Alto — reconocimiento de estatus en cultura costarricense",
        },
        {
          field: "Antigüedad exacta",
          value: "15 años (desde 2010)",
          impact_on_engagement: "Alto — datos específicos demuestran atención personal",
        },
        {
          field: "Actividades mencionadas",
          value: "Golf, Comité de Eventos, Galas",
          impact_on_engagement: "Muy alto — demuestra conocimiento profundo de su historia en el club",
        },
        {
          field: "Beneficios ofrecidos",
          value: "Salón Ejecutivo + Cena premium + Golf personalizado",
          impact_on_engagement: "Alto — alineados con intereses del perfil Ejecutivo/Platinum",
        },
      ],
      suggested_send_time:
        "Martes 09:00 AM — mejor tasa de apertura para segmento Ejecutivos (48% vs 32% promedio general)",
      past_communication_performance: [
        {
          campaign_name: "Invitación Torneo Golf 2024",
          date: "2024-03-10",
          channel: "email",
          open_rate_pct: 62,
          response_rate_pct: 35,
          sentiment: "positivo",
        },
        {
          campaign_name: "Renovación anticipada 2024",
          date: "2024-11-15",
          channel: "email",
          open_rate_pct: 55,
          response_rate_pct: 28,
          sentiment: "neutral",
        },
        {
          campaign_name: "Cena de fin de año 2024",
          date: "2024-12-01",
          channel: "whatsapp",
          open_rate_pct: 88,
          response_rate_pct: 45,
          sentiment: "positivo",
        },
      ],
      alternative_versions: [
        {
          channel: "whatsapp",
          subject: "",
          body: [
            "Don Carlos, el Castillo Country Club celebra sus 15 años como parte de nuestra familia 🎉",
            "",
            "Para agradecer su lealtad, tenemos preparado un reconocimiento especial:",
            "✅ Acceso al nuevo Salón Ejecutivo por 3 meses",
            "✅ Cena degustación premium para 2",
            "✅ Set de golf personalizado con su monograma",
            "",
            "¿Cuándo le gustaría coordinar los detalles? Estamos a su completa disposición.",
            "",
            "— Lic. Patricia Solano, Gerente General",
          ].join("\n"),
          preview_text: "",
          cta_text: "Responder por WhatsApp",
          cta_action: "reply_whatsapp",
        },
        {
          channel: "sms",
          subject: "",
          body: "Castillo CC: Don Carlos, celebramos sus 15 años con nosotros. Tenemos un reconocimiento especial preparado. Lo contactaremos pronto. — Gerencia General",
          preview_text: "",
          cta_text: "",
          cta_action: "",
        },
      ],
      generated_at: now,
    },
  };
}

// ── communications_campaign_generate ──

export function createMockCommunicationsCampaignGenerate(
  _params?: Record<string, unknown>,
): CommunicationsCampaignGenerateResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message:
      "🏟️ Campaña generada: Torneo de Pádel Primavera 2025 — segmento Deportivos (38 familias)",
    data: {
      campaign_name: "Torneo de Pádel Primavera 2025",
      objective:
        "Incrementar participación en actividades deportivas del segmento Deportivos en 30%, posicionando el torneo como evento social-deportivo premium de la temporada",
      target_segment: "Deportivos",
      audience: {
        total: 38,
        by_tier: { Platinum: 4, Gold: 18, Silver: 16 },
        by_segment: { Deportivos: 38 },
        by_engagement_level: { alto: 22, medio: 12, bajo: 4 },
        opt_out_count: 3,
        estimated_deliverable: 35,
      },
      variants: [
        {
          variant_id: "A",
          name: "Enfoque Competitivo",
          subject: "🏆 Demuestre su nivel — Torneo de Pádel Primavera 2025",
          body: [
            "Estimado socio,",
            "",
            "La cancha lo espera. El Torneo de Pádel Primavera 2025 del Castillo Country Club es su oportunidad de demostrar el nivel que lo distingue.",
            "",
            "📅 14-15 de Junio 2025",
            "📍 4 canchas de pádel con iluminación premium",
            "🏅 Premios: Viaje a Cancún para el campeón + trofeos artesanales",
            "🍽️ Cena de clausura con DJ en vivo",
            "",
            "Categorías: Open | Senior | Mixto",
            "Inversión: ₡35,000 por pareja",
            "",
            "Cupos limitados a 32 parejas — Inscripciones abiertas.",
            "",
            "Comisión Deportiva",
            "Castillo Country Club",
          ].join("\n"),
          cta_text: "Inscribirme ahora",
          hypothesis:
            "El enfoque competitivo resuena con el 58% del segmento que participó en torneos previos. Palabra 'demuestre' activa motivación de estatus y logro.",
        },
        {
          variant_id: "B",
          name: "Enfoque Social-Deportivo",
          subject: "🎾 Juegue, conéctese, disfrute — Torneo de Pádel Primavera",
          body: [
            "Estimado socio,",
            "",
            "Más que un torneo: es el evento deportivo-social de la temporada. El Torneo de Pádel Primavera 2025 combina competencia amistosa, conexión con otros socios y una experiencia gastronómica inolvidable.",
            "",
            "📅 14-15 de Junio 2025",
            "📍 4 canchas de pádel premium",
            "🤝 Formato mixto — conozca nuevos socios en la cancha",
            "🍽️ Brunch entre jornadas + Cena de clausura con DJ",
            "🏅 Premios experienciales para TODOS los participantes",
            "",
            "Inversión: ₡35,000 por pareja | 32 cupos disponibles",
            "",
            "Porque el pádel se disfruta más en buena compañía.",
            "",
            "Comisión Deportiva",
            "Castillo Country Club",
          ].join("\n"),
          cta_text: "Reservar mi lugar",
          hypothesis:
            "El enfoque social resuena con el 42% del segmento cuyo motivador principal es la comunidad. 'Conéctese' apela a necesidad de pertenencia — especialmente efectivo en segmento Deportivos con engagement medio.",
        },
      ],
      channel_strategy: {
        primary_channel: "email",
        secondary_channel: "whatsapp",
        timing:
          "Email: Martes 9:00 AM | WhatsApp follow-up: Jueves 6:00 PM si no abrió email en 48h",
        frequency:
          "3 toques: lanzamiento (Día 0), recordatorio con conteo de cupos (Día 5), último cupo (Día 10)",
        escalation_rule:
          "Si no hay respuesta tras 3 toques digitales → llamada personal del staff deportivo",
      },
      expected_metrics: {
        estimated_open_rate_pct: 45,
        estimated_click_rate_pct: 14,
        estimated_conversion_pct: 9,
        estimated_unsubscribe_pct: 0.3,
        benchmark_comparison:
          "Open rate 45% vs benchmark club 38% (+7pts por segmentación precisa). Conversion 9% vs torneo anterior 6.5% (+2.5pts por A/B testing).",
      },
      schedule: {
        draft_by: "2025-05-28",
        review_by: "2025-05-30",
        launch_date: "2025-06-03",
        end_date: "2025-06-13",
      },
      compliance_notes: [
        "Ley 8968 Protección de Datos: opt-out respetado (3 familias excluidas automáticamente)",
        "Horario de envío respeta franja no intrusiva (8AM-8PM) según política interna del club",
        "Contenido no incluye claims promocionales externos — cumple código de autorregulación",
        "A/B test: 50% Variant A, 50% Variant B — winner se envía a no-abridores en Día 5",
      ],
      generated_at: now,
    },
  };
}

// ── communications_sentiment_analyze ──

export function createMockCommunicationsSentimentAnalyze(
  _params?: Record<string, unknown>,
): CommunicationsSentimentAnalyzeResponse {
  const now = new Date().toISOString();

  return {
    status: "success",
    message:
      "📊 Sentimiento analizado: 847 comunicaciones — score general 74/100 (+6pts vs trimestre anterior)",
    data: {
      overall_score: 74,
      overall_trend: "improving",
      total_communications_analyzed: 847,
      trend_timeline: [
        { period: "2024-05", overall_score: 68, positive_pct: 45, neutral_pct: 38, negative_pct: 17, volume: 62 },
        { period: "2024-06", overall_score: 70, positive_pct: 48, neutral_pct: 35, negative_pct: 17, volume: 58 },
        { period: "2024-07", overall_score: 65, positive_pct: 40, neutral_pct: 37, negative_pct: 23, volume: 71 },
        { period: "2024-08", overall_score: 67, positive_pct: 42, neutral_pct: 38, negative_pct: 20, volume: 65 },
        { period: "2024-09", overall_score: 71, positive_pct: 50, neutral_pct: 32, negative_pct: 18, volume: 69 },
        { period: "2024-10", overall_score: 73, positive_pct: 52, neutral_pct: 30, negative_pct: 18, volume: 74 },
        { period: "2024-11", overall_score: 72, positive_pct: 51, neutral_pct: 31, negative_pct: 18, volume: 78 },
        { period: "2024-12", overall_score: 76, positive_pct: 58, neutral_pct: 28, negative_pct: 14, volume: 82 },
        { period: "2025-01", overall_score: 69, positive_pct: 44, neutral_pct: 34, negative_pct: 22, volume: 70 },
        { period: "2025-02", overall_score: 71, positive_pct: 47, neutral_pct: 33, negative_pct: 20, volume: 68 },
        { period: "2025-03", overall_score: 73, positive_pct: 51, neutral_pct: 31, negative_pct: 18, volume: 75 },
        { period: "2025-04", overall_score: 74, positive_pct: 53, neutral_pct: 30, negative_pct: 17, volume: 75 },
      ],
      channel_breakdown: [
        {
          channel: "email",
          score: 76,
          volume: 312,
          trend: "improving",
          top_positive_topic: "Eventos sociales",
          top_negative_topic: "Facturación",
        },
        {
          channel: "whatsapp",
          score: 81,
          volume: 245,
          trend: "stable",
          top_positive_topic: "Actividades deportivas",
          top_negative_topic: "Estacionamiento",
        },
        {
          channel: "sms",
          score: 68,
          volume: 89,
          trend: "stable",
          top_positive_topic: "Recordatorios útiles",
          top_negative_topic: "Frecuencia de envío",
        },
        {
          channel: "app_push",
          score: 72,
          volume: 148,
          trend: "improving",
          top_positive_topic: "Promociones personalizadas",
          top_negative_topic: "Notificaciones irrelevantes",
        },
        {
          channel: "encuestas",
          score: 70,
          volume: 53,
          trend: "improving",
          top_positive_topic: "Mejoras en instalaciones",
          top_negative_topic: "Estacionamiento",
        },
      ],
      topics: [
        {
          topic: "Gastronomía",
          mentions: 198,
          sentiment_score: 82,
          trend: "improving",
          representative_quotes: [
            "El nuevo chef hizo maravillas con el menú de temporada",
            "La cena temática de marzo fue espectacular — ¡volvería mil veces!",
            "El servicio en el restaurante principal mejoró notablemente este trimestre",
          ],
        },
        {
          topic: "Instalaciones deportivas",
          mentions: 167,
          sentiment_score: 78,
          trend: "stable",
          representative_quotes: [
            "Las canchas de pádel están en perfecto estado, felicidades al equipo de mantenimiento",
            "El gym necesita equipo nuevo de cardio — las trotadoras ya tienen 5 años",
            "La piscina infantil es un éxito total con las familias",
          ],
        },
        {
          topic: "Estacionamiento",
          mentions: 124,
          sentiment_score: 52,
          trend: "declining",
          representative_quotes: [
            "Las obras del estacionamiento norte están insoportables — ¿para cuándo terminan?",
            "No encuentro lugar los fines de semana desde que cerraron el ala norte",
            "El valet parking debería ser permanente, no solo en eventos especiales",
          ],
        },
        {
          topic: "Eventos sociales",
          mentions: 112,
          sentiment_score: 81,
          trend: "improving",
          representative_quotes: [
            "La gala de primavera fue el evento del año — elegancia pura",
            "Los niños amaron el día de Halloween, gracias por la organización",
            "Me encantó el concepto de las noches de jazz — algo diferente y sofisticado",
          ],
        },
        {
          topic: "Facturación y cobros",
          mentions: 98,
          sentiment_score: 61,
          trend: "stable",
          representative_quotes: [
            "La nueva plataforma de pagos es mucho más fácil de usar",
            "Sigo sin entender el desglose de mi factura mensual desde la migración",
            "Me cobraron una actividad que cancelé con 3 días de anticipación",
          ],
        },
        {
          topic: "Atención al socio",
          mentions: 89,
          sentiment_score: 77,
          trend: "improving",
          representative_quotes: [
            "María en recepción siempre es increíblemente amable y resolutiva",
            "La respuesta por WhatsApp es rápida y eficiente — así sí se puede",
            "Tardaron 3 días en resolver mi solicitud de reserva — mejoraría el SLA",
          ],
        },
        {
          topic: "Precios y membresía",
          mentions: 59,
          sentiment_score: 64,
          trend: "stable",
          representative_quotes: [
            "La relación calidad-precio sigue siendo la mejor de la zona",
            "El aumento del 8% no se justifica sin mejoras visibles en infraestructura",
            "Comparado con otros clubs en Escazú y Santa Ana, seguimos teniendo buena tarifa",
          ],
        },
      ],
      alerts: [
        {
          id: "SENT-ALERT-001",
          severity: "warning",
          title: "Estacionamiento: quejas incrementaron 340% en 8 semanas",
          description:
            "Desde el inicio de la construcción del ala norte (feb 2025), las menciones negativas sobre estacionamiento pasaron de 8 a 35 por mes. El sentimiento cayó de 72 a 52. Sin acción, esto puede erosionar la satisfacción general en 5-8pts para julio.",
          affected_families: 42,
          recommended_action:
            "Comunicar cronograma detallado de obras por email + WhatsApp. Implementar shuttle temporal desde parqueo externo los fines de semana. Activar valet parking permanente en eventos.",
          detected_at: "2025-04-28T10:15:00Z",
        },
        {
          id: "SENT-ALERT-002",
          severity: "info",
          title: "Facturación: confusión post-migración del sistema",
          description:
            "23 quejas sobre desglose de facturas en las últimas 4 semanas. Patrón indica que la migración al nuevo sistema generó líneas poco claras para consumos de F&B y cargos de actividades.",
          affected_families: 23,
          recommended_action:
            "Enviar email explicativo con comparativo visual factura antigua vs nueva. Crear FAQ interactivo en la app. Capacitar a recepción para resolver dudas frecuentes.",
          detected_at: "2025-04-25T14:30:00Z",
        },
        {
          id: "SENT-ALERT-003",
          severity: "critical",
          title: "2 familias Platinum con sentimiento negativo sostenido (3 meses)",
          description:
            "FAM-007 (Montero Quirós) y FAM-012 (Hernández Solís) han expresado sentimiento negativo en 3 comunicaciones consecutivas (feb-mar-abr 2025). Patrón sugiere disengagement activo. Riesgo de churn de alto valor si no se interviene en los próximos 14 días.",
          affected_families: 2,
          recommended_action:
            "Activar protocolo de retención inmediato: llamada personal del gerente general esta semana. Coordinar cena de reconocimiento. Verificar cruce con herramienta de churn_prevention (MemberChurnPrevention).",
          detected_at: "2025-05-01T09:00:00Z",
        },
      ],
      top_positive_keywords: [
        { keyword: "excelente", frequency: 87, sentiment: "positive", associated_topics: ["Gastronomía", "Eventos sociales", "Atención al socio"] },
        { keyword: "hermoso", frequency: 64, sentiment: "positive", associated_topics: ["Instalaciones deportivas", "Eventos sociales"] },
        { keyword: "familia", frequency: 58, sentiment: "positive", associated_topics: ["Eventos sociales", "Actividades infantiles"] },
        { keyword: "delicioso", frequency: 52, sentiment: "positive", associated_topics: ["Gastronomía"] },
        { keyword: "agradable", frequency: 45, sentiment: "positive", associated_topics: ["Instalaciones deportivas", "Atención al socio"] },
        { keyword: "increíble", frequency: 38, sentiment: "positive", associated_topics: ["Eventos sociales", "Gastronomía"] },
        { keyword: "profesional", frequency: 35, sentiment: "positive", associated_topics: ["Atención al socio", "Instalaciones deportivas"] },
      ],
      top_negative_keywords: [
        { keyword: "estacionamiento", frequency: 89, sentiment: "negative", associated_topics: ["Estacionamiento"] },
        { keyword: "obras", frequency: 56, sentiment: "negative", associated_topics: ["Estacionamiento", "Instalaciones deportivas"] },
        { keyword: "factura", frequency: 42, sentiment: "negative", associated_topics: ["Facturación y cobros"] },
        { keyword: "espera", frequency: 38, sentiment: "negative", associated_topics: ["Atención al socio", "Facturación y cobros"] },
        { keyword: "ruido", frequency: 28, sentiment: "negative", associated_topics: ["Estacionamiento", "Instalaciones deportivas"] },
        { keyword: "caro", frequency: 22, sentiment: "negative", associated_topics: ["Precios y membresía"] },
      ],
      comparison_with_previous: {
        score_delta: 6,
        period: "Q1 2025 vs Q4 2024",
        notable_changes: [
          "Gastronomía subió 8pts — impacto positivo directo del nuevo chef ejecutivo contratado en enero 2025",
          "Estacionamiento bajó 20pts — inicio de obras del ala norte en febrero sin comunicación previa suficiente",
          "Eventos sociales subió 5pts — éxito rotundo de la gala de primavera y la serie de noches de jazz",
          "Atención al socio subió 4pts — implementación de respuesta WhatsApp en menos de 2 horas",
        ],
      },
      generated_at: now,
    },
  };
}

// ── Shared family profile data (matches createMockFamilyList) ──
const FAMILY_PROFILES: Record<string, {
  name: string;
  tier: string;
  status: string;
  churnRisk: string;
  engagement: number;
  balance: number;
  memberCount: number;
  since: string;
  address: string;
  notes: string;
  contactId: string;
  contactFirst: string;
  contactLast: string;
  contactEmail: string;
  contactPhone: string;
  contactDob: string;
  lastActivity: string;
  lastActivityDesc: string;
}> = {
  "fam-001": {
    name: "Familia Castillo Montero", tier: "oro", status: "active", churnRisk: "low",
    engagement: 82, balance: 1_250_000, memberCount: 5, since: "2018-03-15",
    address: "Residencias Los Laureles, Escazú, San José",
    notes: "Familia fundadora. Participan activamente en torneos de pádel y eventos de gala.",
    contactId: "m-001", contactFirst: "Rodrigo", contactLast: "Castillo Montero",
    contactEmail: "rodrigo.castillo@castillo.cr", contactPhone: "+506 8801-2345", contactDob: "1975-08-22",
    lastActivity: "2025-05-25",
    lastActivityDesc: "Cancha de pádel reservada — Torneo corporativo",
  },
  "fam-002": {
    name: "Familia Herrera Solano", tier: "platino", status: "active", churnRisk: "low",
    engagement: 91, balance: 2_800_000, memberCount: 7, since: "2015-11-08",
    address: "Condominio Valle del Sol, Santa Ana",
    notes: "Socios platino desde 2015. María Elena preside el comité de eventos sociales del club.",
    contactId: "m-010", contactFirst: "María Elena", contactLast: "Herrera Solano",
    contactEmail: "mariaelena.herrera@gmail.com", contactPhone: "+506 8812-6789", contactDob: "1972-03-14",
    lastActivity: "2025-05-28",
    lastActivityDesc: "Comité de eventos sociales — reunión mensual",
  },
  "fam-003": {
    name: "Familia Vargas Quirós", tier: "plata", status: "active", churnRisk: "medium",
    engagement: 55, balance: -180_000, memberCount: 3, since: "2020-07-22",
    address: "Residencial Montesol, Escazú",
    notes: "Pendiente de pago desde abril. Contactar para ofrecer plan de pagos flexible.",
    contactId: "m-020", contactFirst: "Carlos Andrés", contactLast: "Vargas Quirós",
    contactEmail: "c.vargas@outlook.com", contactPhone: "+506 8823-4567", contactDob: "1980-11-05",
    lastActivity: "2025-05-08",
    lastActivityDesc: "Clase de natación — sesión familiar",
  },
  "fam-004": {
    name: "Familia Jiménez Oviedo", tier: "bronce", status: "active", churnRisk: "medium",
    engagement: 38, balance: 45_000, memberCount: 2, since: "2023-01-10",
    address: "Curridabat, San José",
    notes: "Socios nuevos. Hijos participan en programa infantil de natación los sábados.",
    contactId: "m-030", contactFirst: "Ana Lucía", contactLast: "Jiménez Oviedo",
    contactEmail: "analucia.jo@hotmail.com", contactPhone: "+506 8834-1234", contactDob: "1988-06-20",
    lastActivity: "2025-05-18",
    lastActivityDesc: "Programa infantil de natación",
  },
  "fam-005": {
    name: "Familia Brenes Mora", tier: "oro", status: "active", churnRisk: "low",
    engagement: 76, balance: 680_000, memberCount: 4, since: "2019-05-30",
    address: "Los Yoses, San Pedro",
    notes: "Fernando es capitán del equipo de pádel. Ganadores del torneo inter-clubes 2025.",
    contactId: "m-040", contactFirst: "Fernando", contactLast: "Brenes Mora",
    contactEmail: "fbrenes@castillo.cr", contactPhone: "+506 8845-5678", contactDob: "1970-12-01",
    lastActivity: "2025-05-23",
    lastActivityDesc: "Entrenamiento equipo de pádel",
  },
  "fam-006": {
    name: "Familia Salazar Ulloa", tier: "plata", status: "suspended", churnRisk: "high",
    engagement: 22, balance: -520_000, memberCount: 3, since: "2017-09-12",
    address: "Rohrmoser, Pavas",
    notes: "Suspendida por falta de pago. Última actividad en enero. Alto riesgo de cancelación.",
    contactId: "m-050", contactFirst: "Patricia", contactLast: "Salazar Ulloa",
    contactEmail: "p.salazar@gmail.com", contactPhone: "+506 8856-9012", contactDob: "1976-04-18",
    lastActivity: "2025-01-15",
    lastActivityDesc: "Último pago de mensualidad",
  },
  "fam-007": {
    name: "Familia Rodríguez Paniagua", tier: "oro", status: "pending", churnRisk: "low",
    engagement: 68, balance: 950_000, memberCount: 6, since: "2024-02-01",
    address: "Escazú Village, Escazú",
    notes: "Nuevo socio oro — proceso de inducción en curso. Empresa patrocina eventos corporativos.",
    contactId: "m-060", contactFirst: "Diego", contactLast: "Rodríguez Paniagua",
    contactEmail: "diego.rp@empresa.cr", contactPhone: "+506 8867-3456", contactDob: "1982-09-10",
    lastActivity: "2025-05-27",
    lastActivityDesc: "Evento corporativo — networking con directiva",
  },
  "fam-008": {
    name: "Familia Madrigal Venegas", tier: "bronce", status: "cancelled", churnRisk: "high",
    engagement: 12, balance: -1_100_000, memberCount: 2, since: "2022-06-20",
    address: "Moravia, San José",
    notes: "Cancelada por falta de pago. Deuda pendiente. No contactar sin aprobación de gerencia.",
    contactId: "m-070", contactFirst: "Sofía", contactLast: "Madrigal Venegas",
    contactEmail: "sofia.mv@yahoo.com", contactPhone: "+506 8878-7890", contactDob: "1990-02-14",
    lastActivity: "2024-12-01",
    lastActivityDesc: "Última visita al club antes de cancelación",
  },
};

export function createMockFamilyDetail(
  params?: Record<string, unknown>,
): FamilyDetailMockResponse {
  const familyId = (params?.familyId as string) ?? "fam-001";
  const p = FAMILY_PROFILES[familyId] ?? FAMILY_PROFILES["fam-001"];

  const primaryContact = {
    id: p.contactId,
    firstName: p.contactFirst,
    lastName: p.contactLast,
    dateOfBirth: p.contactDob,
    email: p.contactEmail,
    phone: p.contactPhone,
    role: "titular" as const,
    engagementScore: p.engagement,
    activities:
      p.tier === "platino" ? ["Tenis", "Gastronomía", "Yoga", "Spa"] :
      p.tier === "oro" ? ["Pádel", "Golf", "Gastronomía"] :
      p.tier === "plata" ? ["Natación", "Fitness"] : ["Actividades generales"],
    status: p.status === "suspended" ? "inactive" as const : "active" as const,
    joinedAt: p.since,
  };

  const members = [
    primaryContact,
    ...(p.memberCount >= 3 ? [{
      id: `${p.contactId}-spouse`,
      firstName: "María Elena",
      lastName: p.contactLast.split(" ")[0],
      dateOfBirth: "1978-05-12",
      email: "",
      phone: "",
      role: "conyuge" as const,
      engagementScore: Math.round(p.engagement * 0.85),
      activities: ["Yoga", "Spa"],
      status: (p.status === "suspended" ? "inactive" : "active") as "active" | "inactive",
      joinedAt: p.since,
    }] : []),
    ...(p.memberCount >= 4 ? [{
      id: `${p.contactId}-child1`,
      firstName: "Sofía",
      lastName: p.contactLast.split(" ")[0],
      dateOfBirth: "2005-08-20",
      email: "",
      phone: "",
      role: "hijo" as const,
      engagementScore: Math.round(p.engagement * 0.55),
      activities: ["Natación", "Arte"],
      status: (p.status === "suspended" ? "inactive" : "active") as "active" | "inactive",
      joinedAt: p.since,
    }] : []),
  ];

  const creditLimit =
    p.tier === "platino" ? 5_000_000 :
    p.tier === "oro" ? 3_000_000 :
    p.tier === "plata" ? 1_500_000 : 750_000;

  return {
    status: "success",
    message: `Detalle de ${p.name} cargado.`,
    data: {
      family: {
        id: familyId,
        familyName: p.name,
        status: p.status as any,
        tier: p.tier as any,
        since: p.since,
        memberCount: p.memberCount,
        totalBalance: p.balance,
        engagementScore: p.engagement,
        churnRisk: p.churnRisk as any,
        lastActivity: p.status === "cancelled" ? "2025-11-05" : "2025-05-20",
        address: p.address,
        notes: p.notes,
        primaryContact,
        members,
      },
      recentActivity: [
        { id: `${familyId}-act-01`, type: "reservation", description: "Cancha de pádel reservada — Torneo corporativo", date: "2025-05-20T09:00:00" },
        { id: `${familyId}-act-02`, type: "charge", description: "Catering evento corporativo — 45 personas", date: "2025-05-19T14:30:00", amount: 185_000 },
        { id: `${familyId}-act-03`, type: "event", description: "Inscripción al Brunch Familiar de mayo", date: "2025-05-18T10:00:00" },
        { id: `${familyId}-act-04`, type: "payment", description: "Pago mensualidad mayo 2025", date: "2025-05-05T08:00:00", amount: 145_000 },
        { id: `${familyId}-act-05`, type: "communication", description: "Confirmación de asistencia a cena de gala", date: "2025-05-03T16:00:00" },
        { id: `${familyId}-act-06`, type: "reservation", description: "Spa — Masaje de pareja", date: "2025-04-28T11:00:00" },
        { id: `${familyId}-act-07`, type: "charge", description: "Consumo restaurante — cena familiar", date: "2025-04-25T20:00:00", amount: 87_000 },
        { id: `${familyId}-act-08`, type: "event", description: "Torneo de pádel — semifinal", date: "2025-04-20T15:00:00" },
      ],
      financialSummary: {
        currentBalance: p.balance,
        creditLimit,
        lastPaymentDate: "2025-05-05",
        lastPaymentAmount: 145_000,
        ytdCharges: 780_000,
        ytdPayments: 580_000,
      },
      socialConnections: [
        {
          connectedFamilyId: "fam-002",
          connectedFamilyName: "Familia Herrera Solano",
          relationship: "Amigos personales — socios desde 2015",
          strength: 0.85,
        },
        {
          connectedFamilyId: "fam-005",
          connectedFamilyName: "Familia Brenes Mora",
          relationship: "Compañeros de pádel — torneos frecuentes",
          strength: 0.72,
        },
        {
          connectedFamilyId: "fam-003",
          connectedFamilyName: "Familia Vargas Quirós",
          relationship: "Hijos comparten clases de natación",
          strength: 0.55,
        },
        {
          connectedFamilyId: "fam-007",
          connectedFamilyName: "Familia Rodríguez Paniagua",
          relationship: "Evento benéfico 2024 — mesa compartida",
          strength: 0.30,
        },
      ],

    },
  };
}

import type {
  EventAccessType,
  EventPricingModel,
  RecurrencePattern,
} from "@/features/events/types";

// ═══════════════════════════════════════════
// Events — Mock Data (Fase 15 QA)
// ═══════════════════════════════════════════

const MOCK_EVENTS: Array<{
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  date_start: string;
  date_end: string;
  start_time: string;
  end_time: string;
  location: string;
  facility_id: string;
  facility_name: string;
  max_capacity: number;
  current_attendance: number;
  waitlist_count: number;
  cost: number;
  is_free: boolean;
  pricing_model: string;
  requires_rsvp: boolean;
  rsvp_deadline?: string;
  organizer: string;
  tags: string[];
  recurrence_pattern?: RecurrencePattern;
  ai_summary?: string;
}> = [
  {
    id: "EVT-001",
    title: "Torneo de Pádel Corporativo Grupo Nacional",
    description:
      "Torneo anual de pádel para empresas patrocinadoras. 16 parejas, formato round-robin con eliminación directa. Incluye catering premium, hidratación deportiva y premios para los tres primeros puestos.",
    category: "sports",
    status: "published",
    date_start: "2025-05-20",
    date_end: "2025-05-20",
    start_time: "09:00",
    end_time: "17:00",
    location: "Canchas de Pádel 1-4",
    facility_id: "FAC-PADEL",
    facility_name: "Canchas de Pádel",
    max_capacity: 45,
    current_attendance: 38,
    waitlist_count: 4,
    cost: 0,
    is_free: true,
    pricing_model: "free",    
    requires_rsvp: true,
    rsvp_deadline: "2025-05-18T23:59:00",
    organizer: "Departamento de Deportes",
    tags: ["Deporte", "Corporativo", "Competencia", "Pádel"],
    ai_summary:
      "Torneo con alta demanda — 84% de capacidad confirmada. 4 familias en lista de espera sugiere ampliar a 24 parejas el próximo año.",
  },
  {
    id: "EVT-002",
    title: "Cena de Gala — Noche de Estrellas",
    description:
      "Evento insignia de temporada. Cena de 5 tiempos maridada con vinos seleccionados por el sommelier. Música en vivo por el Cuarteto de Jazz Escazú. Dress code: formal. Incluye copa de bienvenida y recuerdo conmemorativo.",
    category: "gastronomic",
    status: "published",
    date_start: "2025-05-24",
    date_end: "2025-05-24",
    start_time: "19:30",
    end_time: "23:30",
    location: "Salón VIP",
    facility_id: "FAC-SALON",
    facility_name: "Salón VIP",
    max_capacity: 50,
    current_attendance: 42,
    waitlist_count: 6,
    cost: 45000,
    is_free: false,
    pricing_model: "paid",    
    requires_rsvp: true,
    rsvp_deadline: "2025-05-22T18:00:00",
    organizer: "Chef Ejecutivo Carlos Rodríguez",
    tags: ["Gala", "Gastronómico", "Exclusivo", "Música en vivo"],
    ai_summary:
      "Evento con mayor demanda del mes. Sentiment del evento similar (abril): 4.8/5. Recomendar spots adicionales en terraza.",
  },
  {
    id: "EVT-003",
    title: "Brunch Familiar Dominical",
    description:
      "Brunch buffet con estaciones temáticas: gallo pinto gourmet, frutas tropicales, panadería artesanal, estación de omelettes y bar de jugos naturales. Zona infantil con actividades supervisadas. Café de Dota de especialidad incluido.",
    category: "social",
    status: "published",
    date_start: "2025-05-25",
    date_end: "2025-05-25",
    start_time: "10:00",
    end_time: "14:00",
    location: "Restaurante Principal",
    facility_id: "FAC-REST",
    facility_name: "Restaurante Principal",
    max_capacity: 80,
    current_attendance: 55,
    waitlist_count: 0,
    cost: 12000,
    is_free: false,
    pricing_model: "paid",    
    requires_rsvp: true,
    rsvp_deadline: "2025-05-23T23:59:00",
    organizer: "Comité Social",
    tags: ["Familiar", "Social", "Gastronómico", "Infantil"],
    ai_summary:
      "Evento popular con 69% de capacidad. Recomendar promoción en WhatsApp para llegar al 85%.",
  },
  {
    id: "EVT-004",
    title: "Yoga al Amanecer",
    description:
      "Sesión de yoga vinyasa guiada por la instructora Laura Vargas. Apto para todos los niveles. Incluye esterilla, bloques y agua infusionada. Duración: 75 minutos.",
    category: "cultural",
    status: "published",
    date_start: "2025-05-22",
    date_end: "2025-05-22",
    start_time: "06:30",
    end_time: "07:45",
    location: "Terraza del Spa",
    facility_id: "FAC-SPA",
    facility_name: "Terraza del Spa",
    max_capacity: 20,
    current_attendance: 14,
    waitlist_count: 0,
    cost: 0,
    is_free: true,
    pricing_model: "free",    
    requires_rsvp: true,   
    rsvp_deadline: "2025-05-21T20:00:00",
    organizer: "Wellness Center",
    tags: ["Bienestar", "Yoga", "Salud", "Temprano"],
    ai_summary:
      "Clase con demanda creciente — 70% ocupación. Considerar agregar segunda sesión los miércoles.",
  },
  {
    id: "EVT-005",
    title: "Inauguración Temporada de Piscina 2025",
    description:
      "Evento de apertura de temporada. DJ en vivo, bar de cócteles tropicales, zona de juegos acuáticos para niños, competencia de clavados. Incluye toallas premium y protector solar. Horario extendido hasta las 20:00.",
    category: "seasonal",
    status: "published",
    date_start: "2025-06-01",
    date_end: "2025-06-01",
    start_time: "10:00",
    end_time: "20:00",
    location: "Piscina Principal",
    facility_id: "FAC-POOL",
    facility_name: "Piscina Principal",
    max_capacity: 120,
    current_attendance: 67,
    waitlist_count: 0,
    cost: 0,
    is_free: true,
    pricing_model: "free",    
    requires_rsvp: false,
    organizer: "Comité de Eventos",
    tags: ["Temporada", "Familiar", "Piscina", "DJ"],
    ai_summary:
      "Evento de temporada alta. Históricamente alcanza 85% de capacidad. Recomendar refuerzo de bartenders.",
  },
  {
    id: "EVT-006",
    title: "Taller de Pintura Acuarela para Niños",
    description:
      "Taller creativo para niños de 6 a 12 años. Técnicas básicas de acuarela con temática tropical: tucanes, orquídeas y paisajes costarricenses. Incluye todos los materiales.",
    category: "kids",
    status: "draft",
    date_start: "2025-05-28",
    date_end: "2025-05-28",
    start_time: "10:00",
    end_time: "12:00",
    location: "Sala de Actividades",
    facility_id: "FAC-SALA",
    facility_name: "Sala de Actividades",
    max_capacity: 15,
    current_attendance: 0,
    waitlist_count: 0,
    cost: 8000,
    is_free: false,
    pricing_model: "paid",
    requires_rsvp: true,
    rsvp_deadline: "2025-05-26T23:59:00",
    organizer: "Área Recreativa",
    tags: ["Infantil", "Arte", "Taller", "Creatividad"],
  },
  {
    id: "EVT-007",
    title: "Reunión Comité Directivo — Mayo 2025",
    description:
      "Reunión mensual del comité directivo. Agenda: aprobación presupuesto Q3, renovación canchas de tenis, nuevo convenio de catering, informe satisfacción Q1.",
    category: "corporate",
    status: "published",
    date_start: "2025-05-30",
    date_end: "2025-05-30",
    start_time: "14:00",
    end_time: "16:30",
    location: "Sala de Juntas",
    facility_id: "FAC-JUNTA",
    facility_name: "Sala de Juntas",
    max_capacity: 20,
    current_attendance: 12,
    waitlist_count: 0,
    cost: 0,
    is_free: true,
    pricing_model: "free",    
    requires_rsvp: true,
    rsvp_deadline: "2025-05-28T18:00:00",
    organizer: "Presidencia",
    tags: ["Corporativo", "Directivo", "Mensual"],
  },
  {
    id: "EVT-008",
    title: "Cena Privada — Aniversario 15 años Montero Quirós",
    description:
      "Cena de reconocimiento a la familia Montero Quirós por 15 años como socios Platinum. Menú degustación de 7 tiempos con maridaje premium. Montaje personalizado con flores y velas.",
    category: "private",
    status: "published",
    date_start: "2025-05-20",
    date_end: "2025-05-20",
    start_time: "19:30",
    end_time: "23:00",
    location: "Salón VIP",
    facility_id: "FAC-SALON",
    facility_name: "Salón VIP",
    max_capacity: 10,
    current_attendance: 6,
    waitlist_count: 0,
    cost: 0,
    is_free: true,
    pricing_model: "free",    
    requires_rsvp: true,
    rsvp_deadline: "2025-05-18T23:59:00",
    organizer: "Gerencia General",
    tags: ["Privado", "Exclusivo", "Aniversario", "Reconocimiento"],
    ai_summary:
      "Evento de alto valor — reconocimiento a socio Platinum de 15 años. Experiencia personalizada = retención.",
  },
];

const MOCK_RSVPS: import("@/features/events/types").RsvpRecord[] = [
  {
    id: "RSVP-001",
    event_id: "EVT-001",
    family_id: "fam-001",
    family_name: "Castillo Montero",
    member_ids: ["m-001", "m-002"],
    status: "confirmed",
    guests_count: 4,
    dietary_restrictions: "",
    notes: "Carlos y Diego juegan. María Elena e Isabella como espectadoras.",
    total_cost: 0,
    created_at: "2025-05-10T14:30:00",
    updated_at: "2025-05-10T14:30:00",
  },
  {
    id: "RSVP-002",
    event_id: "EVT-001",
    family_id: "fam-002",
    family_name: "Quesada Vargas",
    member_ids: ["m-011", "m-012"],
    status: "confirmed",
    guests_count: 2,
    dietary_restrictions: "",
    notes: "",
    total_cost: 0,
    created_at: "2025-05-11T09:15:00",
    updated_at: "2025-05-11T09:15:00",
  },
  {
    id: "RSVP-003",
    event_id: "EVT-001",
    family_id: "fam-005",
    family_name: "Herrera Solano",
    member_ids: ["m-040", "m-041"],
    status: "confirmed",
    guests_count: 6,
    dietary_restrictions: "",
    notes: "3 parejas — Herrera, Solano y primo de Guanacaste.",
    total_cost: 0,
    created_at: "2025-05-09T16:45:00",
    updated_at: "2025-05-09T16:45:00",
  },
  {
    id: "RSVP-004",
    event_id: "EVT-001",
    family_id: "fam-003",
    family_name: "Solano Brenes",
    member_ids: ["m-020"],
    status: "pending",
    guests_count: 3,
    dietary_restrictions: "",
    notes: "Confirmarán antes del viernes.",
    total_cost: 0,
    created_at: "2025-05-12T08:00:00",
    updated_at: "2025-05-12T08:00:00",
  },
];

// ── Factories ──

export function createMockEventList(
  params?: Record<string, unknown>,
): EventListMockResponse {
  const status = params?.status as string | undefined;

  const filtered = status
    ? MOCK_EVENTS.filter((e) => e.status === status)
    : MOCK_EVENTS;

  return {
    status: "success",
    message: "Listado de eventos",
    data: {
      events: filtered as unknown as import("@/features/events/types").EventBrief[],
      total: filtered.length,
      page: 1,
      total_pages: 1,
    },
  };
}

export function createMockEventDetail(
  params?: Record<string, unknown>,
): EventDetailMockResponse {
  const eventId = (params?.eventId as string) ?? "EVT-001";
  const ev = MOCK_EVENTS.find((e) => e.id === eventId) ?? MOCK_EVENTS[0];

  return {
    status: "success",
    message: `Detalle del evento: ${ev.title}`,
    data: {
      id: ev.id,
      title: ev.title,
      description: ev.description,
      category: ev.category as import("@/features/events/types").EventResponse["category"],
      event_type: "open" as EventAccessType,
      status: ev.status as import("@/features/events/types").EventResponse["status"],
      date_start: ev.date_start,
      date_end: ev.date_end,
      location: ev.location,
      facility_ids: [ev.facility_id],
      age_groups: ["adult"],
      max_capacity: ev.max_capacity,
      current_attendance: ev.current_attendance,
      waitlist_count: ev.waitlist_count,
      pricing_model: ev.is_free ? "free" as EventPricingModel : "paid" as EventPricingModel,
      price_per_person: ev.cost,
      is_members_only: true,
      allow_guests: true,
      max_guests_per_family: 2,
      recurrence: "none" as RecurrencePattern,
      requires_rsvp: ev.requires_rsvp,
      dress_code: "casual",
      notes: "",
      tags: [],
      created_by: "admin",
      created_at: "2025-01-15T10:00:00Z",
      updated_at: "2025-05-01T14:30:00Z",
      programs: [],
      rsvps: MOCK_RSVPS,
      vendors: [],
    },
  };
}
export function createMockEventUpdateStatus(): EventUpdateMockResponse {
  return {
    status: "success",
    message: "Evento actualizado.",
    data: {
      event_id: "EVT-001",
      changes: { status: { old: "draft", new: "published" } },
      updated_by: "admin",
      updated_at: new Date().toISOString(),
    },
  };
}
// ═══════════════════════════════════════════
// Families — FamilyList Mock Data (Fase 17)
// ═══════════════════════════════════════════

import type { FamilyListResponse, FamilyMember } from "@/features/families/types";

/** Helper: FamilyMember mínimo para list mock */
function fm(
  id: string,
  first: string,
  last: string,
  role: "titular" | "conyuge" | "hijo" | "dependiente" | "invitado_permanente",
  email: string,
  phone: string,
): FamilyMember {
  return {
    id,
    firstName: first,
    lastName: last,
    dateOfBirth: "1980-06-15",
    email,
    phone,
    role,
    engagementScore: 50,
    activities: [],
    status: "active",
    joinedAt: "2020-01-01",
  };
}

/** Mock: list_families — 8 familias costarricenses diversas */
export function createMockFamilyList(): FamilyListResponse {
  return {
    families: [
      {
        id: "fam-001",
        familyName: "Familia Castillo Montero",
        status: "active",
        tier: "oro",
        since: "2018-03-15",
        primaryContact: fm("m-001", "Rodrigo", "Castillo Montero", "titular", "rodrigo.castillo@castillo.cr", "+506 8801-2345"),
        members: [fm("m-001", "Rodrigo", "Castillo Montero", "titular", "rodrigo.castillo@castillo.cr", "+506 8801-2345")],
        memberCount: 5,
        totalBalance: 1_250_000,
        engagementScore: 82,
        churnRisk: "low",
        lastActivity: "2026-05-20",
      },
      {
        id: "fam-002",
        familyName: "Familia Herrera Solano",
        status: "active",
        tier: "platino",
        since: "2015-11-08",
        primaryContact: fm("m-010", "María Elena", "Herrera Solano", "titular", "mariaelena.herrera@gmail.com", "+506 8812-6789"),
        members: [fm("m-010", "María Elena", "Herrera Solano", "titular", "mariaelena.herrera@gmail.com", "+506 8812-6789")],
        memberCount: 7,
        totalBalance: 2_800_000,
        engagementScore: 91,
        churnRisk: "low",
        lastActivity: "2026-06-01",
      },
      {
        id: "fam-003",
        familyName: "Familia Vargas Quirós",
        status: "active",
        tier: "plata",
        since: "2020-07-22",
        primaryContact: fm("m-020", "Carlos Andrés", "Vargas Quirós", "titular", "c.vargas@outlook.com", "+506 8823-4567"),
        members: [fm("m-020", "Carlos Andrés", "Vargas Quirós", "titular", "c.vargas@outlook.com", "+506 8823-4567")],
        memberCount: 3,
        totalBalance: -180_000,
        engagementScore: 55,
        churnRisk: "medium",
        lastActivity: "2026-04-15",
      },
      {
        id: "fam-004",
        familyName: "Familia Jiménez Oviedo",
        status: "active",
        tier: "bronce",
        since: "2023-01-10",
        primaryContact: fm("m-030", "Ana Lucía", "Jiménez Oviedo", "titular", "analucia.jo@hotmail.com", "+506 8834-1234"),
        members: [fm("m-030", "Ana Lucía", "Jiménez Oviedo", "titular", "analucia.jo@hotmail.com", "+506 8834-1234")],
        memberCount: 2,
        totalBalance: 45_000,
        engagementScore: 38,
        churnRisk: "medium",
        lastActivity: "2026-03-28",
      },
      {
        id: "fam-005",
        familyName: "Familia Brenes Mora",
        status: "active",
        tier: "oro",
        since: "2019-05-30",
        primaryContact: fm("m-040", "Fernando", "Brenes Mora", "titular", "fbrenes@castillo.cr", "+506 8845-5678"),
        members: [fm("m-040", "Fernando", "Brenes Mora", "titular", "fbrenes@castillo.cr", "+506 8845-5678")],
        memberCount: 4,
        totalBalance: 680_000,
        engagementScore: 76,
        churnRisk: "low",
        lastActivity: "2026-05-25",
      },
      {
        id: "fam-006",
        familyName: "Familia Salazar Ulloa",
        status: "suspended",
        tier: "plata",
        since: "2017-09-12",
        primaryContact: fm("m-050", "Patricia", "Salazar Ulloa", "titular", "p.salazar@gmail.com", "+506 8856-9012"),
        members: [fm("m-050", "Patricia", "Salazar Ulloa", "titular", "p.salazar@gmail.com", "+506 8856-9012")],
        memberCount: 3,
        totalBalance: -520_000,
        engagementScore: 22,
        churnRisk: "high",
        lastActivity: "2026-01-10",
      },
      {
        id: "fam-007",
        familyName: "Familia Rodríguez Paniagua",
        status: "pending_approval",
        tier: "oro",
        since: "2024-02-01",
        primaryContact: fm("m-060", "Diego", "Rodríguez Paniagua", "titular", "diego.rp@empresa.cr", "+506 8867-3456"),
        members: [fm("m-060", "Diego", "Rodríguez Paniagua", "titular", "diego.rp@empresa.cr", "+506 8867-3456")],
        memberCount: 6,
        totalBalance: 950_000,
        engagementScore: 68,
        churnRisk: "low",
        lastActivity: "2026-05-18",
      },
      {
        id: "fam-008",
        familyName: "Familia Madrigal Venegas",
        status: "inactive",
        tier: "bronce",
        since: "2022-06-20",
        primaryContact: fm("m-070", "Sofía", "Madrigal Venegas", "titular", "sofia.mv@yahoo.com", "+506 8878-7890"),
        members: [fm("m-070", "Sofía", "Madrigal Venegas", "titular", "sofia.mv@yahoo.com", "+506 8878-7890")],
        memberCount: 2,
        totalBalance: -1_100_000,
        engagementScore: 12,
        churnRisk: "high",
        lastActivity: "2025-11-05",
      },
    ],
    total: 8,
    page: 1,
    totalPages: 1,
    limit: 20,
  };
}
// ═══════════════════════════════════════════
// Families — Additional Mocks (Fase 17)
// ═══════════════════════════════════════════

/** Mock: create_family — HITL response (pending approval) */
export function createMockFamilyCreate(): FamilyCreateMockResponse {
  return {
    status: "pending_approval",
    message: "Solicitud de creación recibida. Pendiente de aprobación.",
    data: {
      id: `fam-${String(Date.now()).slice(-6)}`,
      name: "Nueva Familia",
      tier: "plata",
      status: "pending",
      created_at: new Date().toISOString(),
    },
    request_id: `REQ-${String(Date.now()).slice(-6)}`,
  };
}

/** Mock: update_family */
export function createMockFamilyUpdate(): FamilyUpdateMockResponse {
  return {
    status: "success",
    message: "Perfil de familia actualizado exitosamente.",
    family: {
      id: "fam-001",
      name: "Familia Castillo Montero",
      tier: "oro",
      status: "active",
      email: "rodrigo.castillo@castillo.cr",
      phone: "+506 8801-2345",
      address: "Residencias Los Laureles, Escazú",
      join_date: "2018-03-15",
      engagement_score: 82,
      referral_family_id: null,
      notes: "Familia fundadora.",
      members: [],
      created_at: "2018-03-15T00:00:00Z",
      updated_at: new Date().toISOString(),
      member_count: 5,
      age_groups_present: ["adult", "youth"],
    },
  };
}

/** Mock: get_activity_history — 12 actividades costarricenses */
export function createMockActivityHistory(): ActivityHistoryMockResponse {
  return {
    status: "success",
    message: "Historial de actividades cargado.",
    data: {
      activities: [
        { id: "act-001", type: "reservation", description: "Cancha de pádel — Torneo interno", date: "2026-05-28T09:00:00", amount: 15000 },
        { id: "act-002", type: "event", description: "Cena de Gala — Noche de Estrellas", date: "2026-05-24T19:30:00", amount: 45000 },
        { id: "act-003", type: "reservation", description: "Spa — Masaje relajante 60min", date: "2026-05-20T14:00:00", amount: 35000 },
        { id: "act-004", type: "payment", description: "Pago cuota mensual — Mayo 2026", date: "2026-05-01T00:00:00", amount: 185000 },
        { id: "act-005", type: "event", description: "Brunch Familiar Dominical", date: "2026-04-27T10:00:00", amount: 12000 },
        { id: "act-006", type: "charge", description: "Tienda deportiva — Raqueta Babolat", date: "2026-04-22T11:30:00", amount: 89000 },
        { id: "act-007", type: "reservation", description: "Restaurante Principal — Cena familiar", date: "2026-04-18T19:00:00", amount: 67000 },
        { id: "act-008", type: "event", description: "Torneo de Pádel Corporativo", date: "2026-04-12T09:00:00", amount: 0 },
        { id: "act-009", type: "communication", description: "Newsletter: Temporada de piscina 2026", date: "2026-04-05T08:00:00" },
        { id: "act-010", type: "payment", description: "Pago cuota mensual — Abril 2026", date: "2026-04-01T00:00:00", amount: 185000 },
        { id: "act-011", type: "charge", description: "Alquiler kayak doble — Laguna", date: "2026-03-22T10:00:00", amount: 18000 },
        { id: "act-012", type: "reservation", description: "Yoga al Amanecer — Terraza del Spa", date: "2026-03-15T06:30:00", amount: 0 },
      ],
      total: 12,
      period: { from: "2026-03-01", to: "2026-05-31" },
    },
  };
}

/** Mock: get_social_graph — enriched with AI insights */
export function createMockSocialGraphEnriched(): SocialGraphMockResponse {
  return {
    status: "success",
    message: "Grafo social enriquecido cargado.",
    data: {
      family_id: "fam-001",
      family_name: "Familia Castillo Montero",
      connections: [
        {
          connected_family_id: "fam-005",
          connected_family_name: "Familia Brenes Mora",
          relationship: "Compañeros de pádel — torneos frecuentes",
          strength: 0.85,
          shared_activities: ["Pádel", "Torneo Corporativo", "Cena de Gala"],
          shared_events: 14,
          last_interaction: "2026-05-20",
          connected_tier: "oro",
          connected_engagement: 76,
          ai_insight: "Conexión deportiva sólida. 3 torneos juntos este año. Los hijos también participan en actividades infantiles conjuntas.",
        },
        {
          connected_family_id: "fam-002",
          connected_family_name: "Familia Herrera Solano",
          relationship: "Amigos personales — socios desde 2015",
          strength: 0.72,
          shared_activities: ["Cena de Gala", "Eventos sociales", "Brunch dominical"],
          shared_events: 22,
          last_interaction: "2026-05-24",
          connected_tier: "platino",
          connected_engagement: 91,
          ai_insight: "Vínculo social profundo — familias se frecuentan fuera del club. Herrera como mentora en actividades exclusivas Platinum.",
        },
        {
          connected_family_id: "fam-003",
          connected_family_name: "Familia Vargas Quirós",
          relationship: "Hijos en la misma escuela",
          strength: 0.58,
          shared_activities: ["Actividades infantiles", "Piscina", "Brunch dominical"],
          shared_events: 8,
          last_interaction: "2026-04-15",
          connected_tier: "plata",
          connected_engagement: 55,
          ai_insight: "Conexión generada por los niños. Potencial de fortalecimiento si participan en actividades familiares juntos.",
        },
        {
          connected_family_id: "fam-007",
          connected_family_name: "Familia Rodríguez Paniagua",
          relationship: "Nuevos socios — presentados en cena de bienvenida",
          strength: 0.42,
          shared_activities: ["Cena de bienvenida", "Yoga"],
          shared_events: 3,
          last_interaction: "2026-04-28",
          connected_tier: "oro",
          connected_engagement: 68,
          ai_insight: "Conexión nueva con alto potencial. Rodríguez busca integrarse — proponer actividad conjunta para fortalecer vínculo.",
        },
        {
          connected_family_id: "fam-006",
          connected_family_name: "Familia Salazar Ulloa",
          relationship: "Vecinos en Escazú — amistad antigua",
          strength: 0.35,
          shared_activities: ["Spa", "Restaurante"],
          shared_events: 5,
          last_interaction: "2026-01-10",
          connected_tier: "plata",
          connected_engagement: 22,
          ai_insight: "Conexión debilitándose — Salazar suspendida y con riesgo alto de churn. Contacto social podría ayudar en retención.",
        },
      ],
      total_connections: 5,
      clusters: [
        {
          id: "clust-001",
          name: "Deportivos",
          family_ids: ["fam-001", "fam-005", "fam-003"],
          common_interest: "Pádel y actividades deportivas",
          avg_strength: 0.72,
        },
        {
          id: "clust-002",
          name: "Gastronómicos",
          family_ids: ["fam-001", "fam-002", "fam-007"],
          common_interest: "Cenas temáticas y eventos gastronómicos",
          avg_strength: 0.57,
        },
      ],
      suggested_connections: [
        {
          family_id: "fam-004",
          family_name: "Familia Jiménez Oviedo",
          tier: "bronce",
          match_score: 64,
          reason: "Hijos en rango de edad similar. Interés registrado en actividades infantiles. Buena oportunidad de integrar socios nuevos.",
        },
        {
          family_id: "fam-008",
          family_name: "Familia Madrigal Venegas",
          tier: "bronce",
          match_score: 51,
          reason: "Aunque cancelada, compartían interés en eventos sociales. Reactivación + conexión social podría recuperar la membresía.",
        },
      ],
    },
  };
}

import type {
  FinancialOverviewResponse,
  MembershipHealthResponse,
  AgeGroupBalanceResponse,
  BoardReportPendingResponse,
} from "@/features/dashboard/types";
// ═══════════════════════════════════════════
// AI Family Intelligence — Mock Data (Fase 17)
// ═══════════════════════════════════════════

/** Mock: family_predict_churn — on-demand */
export function createMockFamilyChurnPrediction(): FamilyChurnPredictionMockResponse {
  return {
    status: "success",
    message: "OK",
    data: {
      risk_score: 72,
      risk_level: "high",
      factors: [
        { name: "Actividad reciente", impact: -28, direction: "negative", detail: "Sin reservaciones en 45 días — última actividad fue cena de gala el 24 de mayo" },
        { name: "Balance financiero", impact: -18, direction: "negative", detail: "Saldo pendiente de ₡520,000 — 2 meses sin pago de cuota" },
        { name: "Antigüedad", impact: 15, direction: "positive", detail: "9 años como socio — lealtad histórica fuerte" },
        { name: "Engagement familiar", impact: -12, direction: "negative", detail: "Solo 1 de 3 miembros activo en los últimos 60 días" },
        { name: "Conexiones sociales", impact: 8, direction: "positive", detail: "4 conexiones activas — ancla social importante" },
        { name: "Satisfacción previa", impact: 5, direction: "positive", detail: "NPS histórico: 8.2/10 — satisfacción alta cuando estaban activos" },
      ],
      recommendation: "Contacto personal del gerente dentro de esta semana + invitación a torneo de pádel del sábado (actividad de alta afinidad). Plan de reactivación de 30 días con seguimiento semanal. Revisar plan de pagos para el saldo pendiente.",
      confidence: 0.84,
    },
  };
}

/** Mock: family_recommend_activities — on-demand */
export function createMockFamilyActivityRecommendations(): FamilyActivityRecommendationsMockResponse {
  return {
    status: "success",
    message: "OK",
    data: {
      recommendations: [
        {
          id: "rec-001",
          activity_name: "Torneo de Pádel Mixto — Copa Castillo",
          category: "Deporte",
          match_score: 92,
          reason: "Familia participó en 3 torneos similares este año. Rodrigo juega pádel 2 veces por semana. Engagement post-torneo promedio: 85/100.",
          target_members: ["Rodrigo Castillo", "María Elena Castillo"],
          estimated_engagement: 85,
          scheduling_suggestion: "Sábado próximo, 09:00 — Canchas de Pádel 1-4",
      
        },
        {
          id: "rec-002",
          activity_name: "Cena Maridaje — Vinos de Chile con el Sommelier",
          category: "Gastronomía",
          match_score: 87,
          reason: "Alta afinidad gastronómica. Asistieron a 2 cenas temáticas este trimestre con valoración 4.8/5. Food & Beverage es su segunda categoría de gasto.",
          target_members: ["Familia completa"],
          estimated_engagement: 78,
          scheduling_suggestion: "Viernes 30 mayo, 19:30 — Salón VIP",
        },
        {
          id: "rec-003",
          activity_name: "Clase de Cocina Tica Gourmet para Niños",
          category: "Familiar",
          match_score: 81,
          reason: "3 hijos en rango 6-12 años. Actividad ideal para integrar a los más pequeños. Historial positivo en actividades infantiles.",
          target_members: ["Isabella Castillo", "Diego Castillo Jr.", "Sofía Castillo"],
          estimated_engagement: 72,
          scheduling_suggestion: "Domingo 1 junio, 10:00 — Cocina demostración",

        },
        {
          id: "rec-004",
          activity_name: "Retiro de Bienestar Familiar — Fin de semana",
          category: "Wellness",
          match_score: 74,
          reason: "Solo 1 visita al spa en 90 días. Retiro familiar puede reactivar interés en wellness. Paquete premium con descuento tier Oro.",
          target_members: ["Familia completa"],
          estimated_engagement: 68,
          scheduling_suggestion: "Fin de semana 14-15 junio — Spa & Wellness Center",
        },
      ],
      based_on: {
        interests: ["Pádel", "Gastronomía", "Actividades familiares", "Wellness"],
        demographics: ["Familia numerosa (5 miembros)", "Rango etario mixto (8-52 años)", "Tier Oro", "9 años de antigüedad"],
        history: ["8 eventos últimos 90 días", "3 actividades deportivas", "2 cenas temáticas", "1 visita al spa", "₡128,000 en F&B"],
      },
    },
  };
}

/** Mock: family_social_match — on-demand */
export function createMockFamilySocialMatch(): FamilySocialMatchMockResponse {
  return {
    status: "success",
    message: "OK",
    data: {
      suggestions: [
        {
          family_id: "fam-004",
          family_name: "Familia Jiménez Oviedo",
          tier: "bronce",
          match_score: 64,
          common_interests: ["Actividades infantiles", "Piscina", "Eventos sociales"],
          shared_demographics: ["Hijos en rango 6-12 años", "Familia activa"],
          reason: "Ambas familias tienen hijos pequeños que podrían ser compañeros de actividades. Jiménez es socio nuevo — presentación con Castillo ayudaría su integración al club.",
          suggested_activity: "Taller de pintura acuarela para niños — participar juntos",
        },
        {
          family_id: "fam-008",
          family_name: "Familia Madrigal Venegas",
          tier: "bronce",
          match_score: 51,
          common_interests: ["Eventos sociales", "Gastronomía"],
          shared_demographics: ["Antiguos socios activos"],
          reason: "Madrigal fue activa socialmente antes de cancelar. Conexión con una familia influyente como Castillo podría ser factor de retención si se reactiva.",
          suggested_activity: "Invitación como acompañante a Cena de Gala",
        },
      ],
    },
  };
}

/** Mock: family_engagement_plan — on-demand (SEMI) */
export function createMockFamilyEngagementPlan(): FamilyEngagementPlanMockResponse {
  return {
    status: "success",
    message: "OK",
    data: {
      current_score: 65,
      target_score: 82,
      timeframe: "90 días",
      actions: [
        {
          id: "plan-001",
          action: "Llamada personal del gerente — seguimiento post-gala y gestión de saldo",
          category: "communication",
          priority: "high",
          timing: "Esta semana",
          expected_impact: "+8 pts engagement — muestra interés genuino, abre diálogo sobre saldo pendiente",
          assigned_to: "Gerencia General",
        },
        {
          id: "plan-002",
          action: "Inscripción automática al Torneo de Pádel Mixto — confirmar asistencia vía WhatsApp",
          category: "activity",
          priority: "high",
          timing: "Próximo evento deportivo (sábado)",
          expected_impact: "+12 pts engagement — actividad de máxima afinidad, reactiva participación",
          assigned_to: "Depto. Deportes",
        },
        {
          id: "plan-003",
          action: "Reconocimiento: Familia destacada del mes — mención en newsletter y placa en el club",
          category: "recognition",
          priority: "medium",
          timing: "Primer lunes del mes próximo",
          expected_impact: "+6 pts engagement — reconocimiento social fortalece vínculo emocional",
          assigned_to: "Marketing",
        },
        {
          id: "plan-004",
          action: "Presentar a Familia Brenes Mora — organizar actividad social conjunta",
          category: "social",
          priority: "medium",
          timing: "Dentro de 2 semanas",
          expected_impact: "+10 pts engagement — fortalecer red social = mayor permanencia",
          assigned_to: "Comité Social",
        },
        {
          id: "plan-005",
          action: "Revisión de plan de pagos — ofrecer plan de cuotas flexible para ₡520K pendiente",
          category: "financial",
          priority: "high",
          timing: "Inmediato — coordinar con gerencia",
          expected_impact: "+15 pts engagement — resolver fricción financiera es el factor #1 de churn",
          assigned_to: "Finanzas",
        },
      ],
      ai_summary: "La familia Castillo Montero tiene alto potencial de recuperación. Su engagement bajó por inactividad reciente (45 días sin actividad) y saldo pendiente (₡520K), pero cuentan con 9 años de antigüedad, conexiones sociales sólidas (5 vínculos activos), e historial de participación intensa en deportes y gastronomía. Priorizar: (1) contacto personal del gerente esta semana, (2) reactivación deportiva con torneo de pádel, (3) plan financiero flexible. Si se ejecutan las 5 acciones en el plazo estimado, la probabilidad de alcanzar 82/100 de engagement es del 78%.",
      estimated_roi: "₡2.4M en retención de cuotas anuales + ₡800K en consumo adicional estimado — ROI de 8.5x sobre costo del plan",
    },
  };
}
/** Mock: family_set_preferences — SEMI-AUTO */
export function createMockFamilySetPreferences(): FamilyPreferencesMockResponse {
  return {
    status: "success",
    message: "OK",
    data: {
      preferences: {
        preferred_language: "es",
        notification_channels: ["email", "push"],
        interests: ["Pádel", "Gastronomía", "Actividades familiares"],
        privacy_level: "normal",
        dietary_notes: null,
      },
    },
  };
}
// ═══════════════════════════════════════════════════════════
// ── Events Module (Fase 18) ──
// ═══════════════════════════════════════════════════════════

/** Mock: event_get_calendar — datos (AUTO) */
export function createMockEventGetCalendar(
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const mm = String(month + 1).padStart(2, "0");

  const briefEvents = [
    { id: "evt-a1b2c3d4", title: "Torneo de Pádel de Primavera", category: "sports", status: "published", date_start: `${year}-${mm}-08T09:00:00Z`, date_end: `${year}-${mm}-08T18:00:00Z`, location: "Canchas de Pádel", current_attendance: 24, max_capacity: 32, pricing_model: "paid" },
    { id: "evt-e5f6g7h8", title: "Noche de Gala — Aniversario del Club", category: "festive", status: "published", date_start: `${year}-${mm}-15T19:00:00Z`, date_end: `${year}-${mm}-15T23:59:00Z`, location: "Salón de Eventos", current_attendance: 95, max_capacity: 120, pricing_model: "premium" },
    { id: "evt-i9j0k1l2", title: "Clase de Yoga Familiar", category: "family", status: "published", date_start: `${year}-${mm}-10T08:00:00Z`, date_end: `${year}-${mm}-10T09:30:00Z`, location: "Terraza del Spa", current_attendance: 12, max_capacity: 20, pricing_model: "free" },
    { id: "evt-m3n4o5p6", title: "Cena Temática: Sabores de Guanacaste", category: "social", status: "published", date_start: `${year}-${mm}-20T19:00:00Z`, date_end: `${year}-${mm}-20T22:00:00Z`, location: "Restaurante Principal", current_attendance: 38, max_capacity: 45, pricing_model: "paid" },
    { id: "evt-q7r8s9t0", title: "Junta Directiva Mensual", category: "corporate", status: "published", date_start: `${year}-${mm}-05T14:00:00Z`, date_end: `${year}-${mm}-05T16:00:00Z`, location: "Sala de Juntas", current_attendance: 8, max_capacity: 15, pricing_model: "free" },
    { id: "evt-u1v2w3x4", title: "Fiesta Infantil — Día del Niño", category: "children", status: "published", date_start: `${year}-${mm}-25T10:00:00Z`, date_end: `${year}-${mm}-25T14:00:00Z`, location: "Área de Piscina", current_attendance: 22, max_capacity: 40, pricing_model: "subsidized" },
    { id: "evt-y5z6a7b8", title: "Exposición de Arte Costarricense", category: "cultural", status: "published", date_start: `${year}-${mm}-18T17:00:00Z`, date_end: `${year}-${mm}-18T20:00:00Z`, location: "Galería del Club", current_attendance: 15, max_capacity: 30, pricing_model: "free" },
    { id: "evt-c9d0e1f2", title: "Evento Privado — Boda Quesada", category: "private", status: "published", date_start: `${year}-${mm}-22T16:00:00Z`, date_end: `${year}-${mm}-22T23:00:00Z`, location: "Jardín Principal", current_attendance: 80, max_capacity: 100, pricing_model: "premium" },
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = new Map<string, typeof briefEvents>();
  for (let d = 1; d <= daysInMonth; d++) {
    dayMap.set(`${year}-${mm}-${String(d).padStart(2, "0")}`, []);
  }
  for (const ev of briefEvents) {
    const evDate = ev.date_start.split("T")[0];
    if (dayMap.has(evDate)) dayMap.get(evDate)!.push(ev);
  }

  const calendar = Array.from(dayMap.entries()).map(([date, dayEvents]) => ({
    date,
    events: dayEvents,
    total_events: dayEvents.length,
    has_conflicts: dayEvents.length >= 2,
  }));

  return {
    status: "success",
    message: `📅 Calendario: ${briefEvents.length} eventos en el mes. (1 día con conflictos).`,
    data: calendar,
    total_events: briefEvents.length,
    conflict_days: 1,
  };
}

/** Mock: event_create — mutation (HITL) */
export function createMockEventCreate(): EventCreateMockResponse {
  return {
    status: "pending_approval",
    message: '🎉 Evento "Nuevo Evento" registrado. Está pendiente de aprobación por un administrador. Te avisamos en cuanto se confirme. 🔔',
    request_id: "req_evt_" + Math.random().toString(36).slice(2, 10),
    event_title: "Nuevo Evento",
    event_date: new Date().toISOString(),
  };
}

/** Mock: event_build_program — mutation (SEMI) */
export function createMockEventBuildProgram() {
  return {
    status: "success",
    message: '📋 Programa actualizado con 4 actividades. ¡Se ve increíble! 🌟',
    event_id: "evt-a1b2c3d4",
    program_items: [
      { id: "prog-001", event_id: "evt-a1b2c3d4", title: "Registro y Bienvenida", time_start: "08:30", time_end: "09:00", description: "Check-in de participantes, entrega de kits y desayuno ligero.", location: "Recepción Canchas", responsible: "María Fernández", notes: "Confirmar catering", order: 0 },
      { id: "prog-002", event_id: "evt-a1b2c3d4", title: "Primera Ronda — Categoría A", time_start: "09:00", time_end: "10:30", description: "Eliminatorias categoría avanzada.", location: "Canchas 1-4", responsible: "Carlos Montero", notes: "", order: 1 },
      { id: "prog-003", event_id: "evt-a1b2c3d4", title: "Almuerzo y Networking", time_start: "12:00", time_end: "13:30", description: "Buffet de almuerzo con opciones vegetarianas.", location: "Terraza Restaurante", responsible: "Chef Andrés Solano", notes: "Opciones sin gluten", order: 2 },
      { id: "prog-004", event_id: "evt-a1b2c3d4", title: "Final y Premiación", time_start: "15:00", time_end: "17:00", description: "Partido final + ceremonia de premiación con trofeos.", location: "Cancha Central", responsible: "Carlos Montero", notes: "Trofeos confirmados", order: 3 },
    ],
    total_items: 4,
  };
}

/** Mock: event_manage_rsvps — datos/mutation (AUTO — conditional HITL) */
export function createMockEventManageRsvps(
  params?: Record<string, unknown>,
) {
  const action = (params?.action as string) || "list";

  if (action === "list") {
    return {
      status: "success",
      message: '📋 6 RSVPs para "Torneo de Pádel de Primavera".',
      data: [
        { id: "rsvp-001", event_id: "evt-a1b2c3d4", family_id: "fm-castillo", family_name: "Familia Castillo Montero", member_ids: ["m-01", "m-02", "m-03"], status: "confirmed", guests_count: 2, dietary_restrictions: "Sin gluten", notes: "", total_cost: 25000, created_at: "2025-06-01T10:00:00Z", updated_at: "2025-06-01T10:00:00Z" },
        { id: "rsvp-002", event_id: "evt-a1b2c3d4", family_id: "fm-brenes", family_name: "Familia Brenes Mora", member_ids: ["m-04", "m-05"], status: "confirmed", guests_count: 0, dietary_restrictions: "", notes: "Juegan en categoría avanzada", total_cost: 10000, created_at: "2025-06-02T14:30:00Z", updated_at: "2025-06-02T14:30:00Z" },
        { id: "rsvp-003", event_id: "evt-a1b2c3d4", family_id: "fm-herrera", family_name: "Familia Herrera Solano", member_ids: ["m-06"], status: "pending", guests_count: 1, dietary_restrictions: "", notes: "", total_cost: 10000, created_at: "2025-06-03T09:15:00Z", updated_at: "2025-06-03T09:15:00Z" },
        { id: "rsvp-004", event_id: "evt-a1b2c3d4", family_id: "fm-vargas", family_name: "Familia Vargas Picado", member_ids: ["m-07", "m-08", "m-09"], status: "confirmed", guests_count: 0, dietary_restrictions: "Vegetariano", notes: "", total_cost: 15000, created_at: "2025-06-03T11:00:00Z", updated_at: "2025-06-03T11:00:00Z" },
        { id: "rsvp-005", event_id: "evt-a1b2c3d4", family_id: "fm-rodriguez", family_name: "Familia Rodríguez Chen", member_ids: ["m-10"], status: "declined", guests_count: 0, dietary_restrictions: "", notes: "Viaje programado", total_cost: 0, created_at: "2025-06-04T08:00:00Z", updated_at: "2025-06-04T08:00:00Z" },
        { id: "rsvp-006", event_id: "evt-a1b2c3d4", family_id: "fm-mendez", family_name: "Familia Méndez Arias", member_ids: ["m-11", "m-12"], status: "waitlisted", guests_count: 1, dietary_restrictions: "", notes: "Esperando lugar", total_cost: 0, created_at: "2025-06-05T16:45:00Z", updated_at: "2025-06-05T16:45:00Z" },
      ],
      total: 6,
    };
  }

  return {
    status: "success",
    message: '🎉 ¡RSVP confirmado! Nos emociona verlos ahí. 💛',
    data: {
      id: "rsvp-new-" + Math.random().toString(36).slice(2, 6),
      event_id: "evt-a1b2c3d4",
      family_id: "fm-nueva",
      family_name: "Familia Nueva",
      member_ids: ["m-new"],
      status: "confirmed",
      guests_count: 0,
      dietary_restrictions: "",
      notes: "",
      total_cost: 5000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/** Mock: event_coordinate_vendors — mutation (HITL — list is AUTO) */
export function createMockEventCoordinateVendors(
  params?: Record<string, unknown>,
) {
  const action = (params?.action as string) || "list";

  if (action === "list") {
    return {
      status: "success",
      message: '📋 3 proveedores para "Noche de Gala — Aniversario del Club".',
      data: [
        { id: "vnd-001", event_id: "evt-e5f6g7h8", name: "Catering Imperial", service_type: "catering", contact_name: "Roberto Jiménez", contact_phone: "+506 2234-5678", contact_email: "roberto@cateringimperial.cr", quoted_cost: 450000, final_cost: 420000, contract_status: "contracted", notes: "Menú degustación 5 tiempos", created_at: "2025-05-15T10:00:00Z", updated_at: "2025-05-20T14:00:00Z" },
        { id: "vnd-002", event_id: "evt-e5f6g7h8", name: "SonidoPRO Costa Rica", service_type: "av", contact_name: "Laura Vargas", contact_phone: "+506 8899-1234", contact_email: "laura@sonidopro.cr", quoted_cost: 180000, final_cost: null, contract_status: "quoted", notes: "Incluye DJ + pantalla LED", created_at: "2025-05-18T09:00:00Z", updated_at: "2025-05-18T09:00:00Z" },
        { id: "vnd-003", event_id: "evt-e5f6g7h8", name: "Flores del Valle", service_type: "decoration", contact_name: "Ana Lucía Mora", contact_phone: "+506 7766-5544", contact_email: "info@floresdelvalle.cr", quoted_cost: 95000, final_cost: null, contract_status: "pending", notes: "Centros de mesa + arco floral", created_at: "2025-05-20T11:00:00Z", updated_at: "2025-05-20T11:00:00Z" },
      ],
    };
  }

  return {
    status: "pending_approval",
    message: '📝 Solicitud para gestionar proveedor en "Noche de Gala" enviada al administrador. Pendiente de aprobación. 🔔',
    request_id: "req_vnd_" + Math.random().toString(36).slice(2, 10),
  };
}

/** Mock: event_manage_capacity — datos (AUTO) */
export function createMockEventManageCapacity() {
  return {
    status: "success",
    message: '📊 "Torneo de Pádel de Primavera": 24/32 asistentes (75% ocupación). — 2 en lista de espera.',
    data: {
      event_id: "evt-a1b2c3d4",
      event_title: "Torneo de Pádel de Primavera",
      max_capacity: 32,
      current_attendance: 24,
      waitlist_count: 2,
      available_spots: 8,
      occupancy_pct: 75.0,
      is_full: false,
      is_waitlist_active: true,
    },
  };
}

/** Mock: event_get_analytics — datos (AUTO) */
export function createMockEventGetAnalytics() {
  return {
    status: "success",
    message: '📈 Analytics de "Torneo de Pádel de Primavera": 24 confirmados de 30 invitados (80% asistencia), ₡150.000 en ingresos.',
    data: {
      event_id: "evt-a1b2c3d4",
      event_title: "Torneo de Pádel de Primavera",
      total_rsvps: 30,
      confirmed_attendance: 24,
      declined_count: 3,
      no_shows: 1,
      waitlisted_count: 2,
      attendance_rate: 80.0,
      cancellation_rate: 10.0,
      revenue: 150000,
      average_guests_per_family: 1.8,
      age_distribution: { "0-12": 4, "13-17": 6, "18-35": 8, "36-55": 9, "56+": 3 },
      peak_rsvp_date: "2025-06-02",
      days_until_event: 5,
    },
  };
}

/** Mock: event_clone_template — mutation (SEMI) */
export function createMockEventCloneTemplate() {
  return {
    status: "success",
    message: '📋 Evento clonado como "Torneo de Pádel — 15/07/2025". Recuerda revisar y publicar cuando esté listo. ✨',
    data: {
      id: "evt-clone-" + Math.random().toString(36).slice(2, 8),
      title: "Torneo de Pádel — 15/07/2025",
      status: "draft",
      date_start: "2025-07-15T09:00:00Z",
      date_end: "2025-07-15T18:00:00Z",
      description: "Torneo anual de pádel con categorías amateur y avanzada. Incluye almuerzo y premiación.",
      category: "sports",
      event_type: "open",
      location: "Canchas de Pádel",
      max_capacity: 32,
      current_attendance: 0,
      waitlist_count: 0,
      pricing_model: "paid",
      price_per_person: 5000,
      requires_rsvp: true,
      is_members_only: true,
      allow_guests: true,
      max_guests_per_family: 2,
      tags: ["Deporte", "Pádel", "Torneo", "Competencia"],
      created_by: "admin",
    },
  };
}

/** Mock: event_generate_report — mutation (SEMI — financial→HITL) */
export function createMockEventGenerateReport() {
  return {
    status: "success",
    message: "📊 Reporte ejecutivo: 12 eventos, 486 asistentes, ₡2.850.000 ingresos.",
    data: {
      report_type: "executive",
      period_start: "2025-06-01T00:00:00Z",
      period_end: "2025-06-30T23:59:59Z",
      total_events: 12,
      completed_events: 8,
      cancelled_events: 1,
      upcoming_events: 3,
      total_attendance: 486,
      average_attendance: 40.5,
      total_revenue: 2850000,
      top_categories: [
        { category: "sports", count: 4 },
        { category: "social", count: 3 },
        { category: "family", count: 2 },
        { category: "cultural", count: 2 },
        { category: "corporate", count: 1 },
      ],
      top_events: [
        { id: "evt-e5f6g7h8", title: "Noche de Gala — Aniversario del Club", category: "festive", status: "completed", date_start: "2025-06-15T19:00:00Z", date_end: "2025-06-15T23:59:00Z", location: "Salón de Eventos", current_attendance: 95, max_capacity: 120, pricing_model: "premium" },
      ],
      recommendations: [
        "Incrementar frecuencia de eventos deportivos — 80% de asistencia promedio vs 60% en eventos sociales",
        "Considerar eventos gastronómicos mensuales — alta demanda con lista de espera en 3 de los últimos 5",
        "Evaluar reducir precio de eventos corporativos — solo 12% de ocupación promedio",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

// ── AI Intelligence (on-demand, mock-only) ──

/** Mock: event_predict_attendance — AI on-demand (AUTO) */
export function createMockEventPredictAttendance() {
  return {
    status: "success",
    data: {
      predicted_attendance: 28,
      confidence: 0.87,
      factors: [
        { name: "Historial del tipo de evento", impact: 0.35, direction: "positive", detail: "Torneos de pádel tienen 85% de asistencia promedio en los últimos 12 meses" },
        { name: "Día de la semana", impact: -0.15, direction: "negative", detail: "Sábado atrae 12% menos que viernes para eventos deportivos" },
        { name: "Temporada alta", impact: 0.25, direction: "positive", detail: "Junio-julio muestra +20% participación por temporada seca" },
        { name: "Conflicto con otro evento", impact: -0.1, direction: "negative", detail: "Cena temática el mismo fin de semana puede restar 3-4 familias" },
        { name: "Trending: Pádel", impact: 0.2, direction: "positive", detail: "Búsqueda de pádel subió 40% en el club este trimestre" },
      ],
      capacity_risk: "low",
      recommendation: "El torneo tiene alta probabilidad de éxito. Considerar abrir 4 plazas adicionales en la lista de espera. Promover en WhatsApp con énfasis en las nuevas categorías mixtas.",
    },
  };
}

/** Mock: event_recommend_optimization — AI on-demand (AUTO) */
export function createMockEventRecommendOptimization() {
  return {
    status: "success",
    data: {
      recommendations: [
        { id: "opt-001", area: "pricing", suggestion: "Implementar early-bird pricing: ₡4.000 (vs ₡5.000 regular) para inscripciones antes del lunes previo", estimated_impact: "+15% inscripciones tempranas, +₡60.000 revenue neto", priority: "high", effort: "low" },
        { id: "opt-002", area: "timing", suggestion: "Mover hora de inicio de 9:00 a 8:30 — deportistas matutinos llegan 20min antes del horario oficial", estimated_impact: "Mejor experiencia, menos espera, +5% satisfacción", priority: "medium", effort: "low" },
        { id: "opt-003", area: "promotion", suggestion: "Enviar recordatorio personalizado 48h antes vía WhatsApp con bracket actualizado y mapa de canchas", estimated_impact: "-40% no-shows, +8% engagement", priority: "high", effort: "medium" },
        { id: "opt-004", area: "venue", suggestion: "Reservar cancha 5 como respaldo — 15% de jugadores piden cancha adicional el mismo día", estimated_impact: "Evitar cancelaciones de último momento", priority: "medium", effort: "low" },
      ],
      overall_score: 82,
      ai_summary: "El evento tiene buen potencial. Las 4 optimizaciones tienen costo mínimo y alto impacto. El early-bird pricing y el recordatorio WhatsApp son las de mayor ROI. Implementar todas puede aumentar la asistencia de 28 a 32 participantes.",
    },
  };
}

/** Mock: event_conflict_detection — AI on-demand (AUTO) */
export function createMockEventConflictDetection() {
  return {
    status: "success",
    data: {
      conflicts: [
        { event_id: "evt-m3n4o5p6", event_title: "Cena Temática: Sabores de Guanacaste", conflict_type: "audience_overlap", severity: "medium", detail: "6 familias confirmadas en ambos eventos. La cena es viernes y el torneo sábado — no hay solapamiento de horario, pero el cansancio puede reducir asistencia.", resolution_suggestion: "Enviar comunicación destacando que son eventos complementarios. Ofrecer descuento combo: 10% en ambos." },
        { event_id: "evt-i9j0k1l2", event_title: "Clase de Yoga Familiar", conflict_type: "resource_overlap", severity: "low", detail: "La clase de yoga usa Terraza del Spa 8:00-9:30. Algunos participantes del torneo podrían querer yoga de warm-up antes.", resolution_suggestion: "Sin acción necesaria — los horarios no se solapan. Posible cross-promotion." },
      ],
      total_conflicts: 2,
      risk_level: "low",
      ai_summary: "2 conflictos detectados, ninguno crítico. El más relevante es la audiencia compartida con la Cena de Guanacaste (6 familias). Recomendación: comunicar que ambos eventos se complementan y ofrecer paquete combo. No se requiere cambio de horario ni ubicación.",
    },
  };
}

/** Mock: event_engagement_boost — AI on-demand (SEMI) */
export function createMockEventEngagementBoost() {
  return {
    status: "success",
    data: {
      strategies: [
        { id: "boost-001", channel: "whatsapp", action: "Video teaser del torneo con highlights del año pasado + mensaje personalizado del coach Carlos Montero", target_audience: "Familias deportivas activas (18 familias)", timing: "Lunes previo, 10:00 AM", expected_rsvp_increase: "+25% tasa de respuesta", priority: "high" },
        { id: "boost-002", channel: "email", action: "Newsletter con bracket interactivo, perfil de participantes confirmados, y testimonio del ganador anterior", target_audience: "Todos los socios (120 familias)", timing: "2 semanas antes", expected_rsvp_increase: "+10% awareness", priority: "medium" },
        { id: "boost-003", channel: "push", action: "Push notification con countdown: '¡Faltan 3 días! 24 jugadores confirmados — quedan 8 cupos'", target_audience: "Familias que no han confirmado (42 familias)", timing: "3 días antes, 6:00 PM", expected_rsvp_increase: "+15% conversion de pendientes", priority: "high" },
        { id: "boost-004", channel: "in_app", action: "Banner en la app: 'Último llamado para inscribirse al Torneo de Pádel' con botón de RSVP directo", target_audience: "Usuarios activos de la app", timing: "1 semana antes, mantener hasta evento", expected_rsvp_increase: "+8% inscripciones via app", priority: "medium" },
      ],
      current_engagement_score: 72,
      projected_engagement_score: 85,
      ai_summary: "4 estrategias diseñadas. La más efectiva será el WhatsApp teaser (canal preferido del 78% de socios deportivos). Combinando las 4, el engagement score puede subir de 72 a 85 (+18%). Acción prioritaria: crear el video teaser esta semana.",
      estimatedROI: "₡180.000 en revenue adicional por 6 RSVPs extra + ₡45.000 en engagement de marca — ROI de 5.2x",
    },
  };
}
/** Mock: get_event — datos (mock-only, backend gap) — returns EventDetailMockResponse */
export function createMockEventGetDetail(
  params?: Record<string, unknown>,
): EventDetailMockResponse {
  const eventId = (params?.event_id as string) || "evt-a1b2c3d4";

  return {
    status: "success",
    message: "Evento cargado correctamente.",
    data: {
      id: eventId,
      title: "Torneo de Pádel de Primavera",
      description:
        "El torneo más esperado del club regresa con categorías amateur, avanzada y mixta. Incluye almuerzo gourmet, hidratación permanente, premios para los tres primeros lugares de cada categoría y una fiesta de clausura con DJ en vivo. ¡No te lo pierdas!",
      category: "sports",
      event_type: "open",
      status: "published",
      date_start: "2025-06-28T09:00:00Z",
      date_end: "2025-06-28T18:00:00Z",
      location: "Canchas de Pádel",
      facility_ids: ["fac-padel-1", "fac-padel-2", "fac-padel-3"],
      age_groups: ["all"],
      max_capacity: 32,
      current_attendance: 24,
      waitlist_count: 2,
      pricing_model: "paid",
      price_per_person: 5000,
      is_members_only: true,
      allow_guests: true,
      max_guests_per_family: 2,
      recurrence: "none",
      requires_rsvp: true,
      dress_code: "Deportivo",
      notes: "Traer raqueta propia. El club provee pelotas y protección solar.",
      tags: ["Deporte", "Pádel", "Torneo", "Competencia", "Familiar"],
      created_by: "Carlos Montero",
      created_at: "2025-05-15T10:00:00Z",
      updated_at: "2025-06-10T14:30:00Z",
      programs: [
        {
          id: "prog-001",
          event_id: eventId,
          time_start: "08:30",
          time_end: "09:00",
          title: "Registro y Bienvenida",
          description: "Check-in de participantes, entrega de kits y desayuno ligero.",
          location: "Recepción Canchas",
          responsible: "María Fernández",
          notes: "Confirmar catering",
          order: 0,
        },
        {
          id: "prog-002",
          event_id: eventId,
          time_start: "09:00",
          time_end: "10:30",
          title: "Primera Ronda — Categoría A",
          description: "Eliminatorias categoría avanzada.",
          location: "Canchas 1-4",
          responsible: "Carlos Montero",
          notes: "",
          order: 1,
        },
        {
          id: "prog-003",
          event_id: eventId,
          time_start: "10:30",
          time_end: "12:00",
          title: "Primera Ronda — Categoría B + Mixta",
          description: "Eliminatorias categoría amateur y torneo mixto.",
          location: "Canchas 1-4",
          responsible: "Laura Quesada",
          notes: "",
          order: 2,
        },
        {
          id: "prog-004",
          event_id: eventId,
          time_start: "12:00",
          time_end: "13:30",
          title: "Almuerzo y Networking",
          description: "Buffet de almuerzo con opciones vegetarianas y sin gluten.",
          location: "Terraza Restaurante",
          responsible: "Chef Andrés Solano",
          notes: "Opciones sin gluten etiquetadas",
          order: 3,
        },
        {
          id: "prog-005",
          event_id: eventId,
          time_start: "14:00",
          time_end: "15:30",
          title: "Semifinales",
          description: "Semifinales de todas las categorías.",
          location: "Canchas 1-2",
          responsible: "Carlos Montero",
          notes: "",
          order: 4,
        },
        {
          id: "prog-006",
          event_id: eventId,
          time_start: "16:00",
          time_end: "17:30",
          title: "Finales y Premiación",
          description: "Partidos finales + ceremonia de premiación con trofeos y premios patrocinados.",
          location: "Cancha Central",
          responsible: "Carlos Montero",
          notes: "Trofeos confirmados. Patrocinador: Gatorade CR",
          order: 5,
        },
      ],
      rsvps: [
        {
          id: "rsvp-001",
          event_id: eventId,
          family_id: "fm-castillo",
          family_name: "Familia Castillo Montero",
          member_ids: ["m-01", "m-02", "m-03"],
          status: "confirmed",
          guests_count: 2,
          dietary_restrictions: "Sin gluten",
          notes: "Juegan categoría avanzada",
          total_cost: 25000,
          created_at: "2025-06-01T10:00:00Z",
          updated_at: "2025-06-01T10:00:00Z",
        },
        {
          id: "rsvp-002",
          event_id: eventId,
          family_id: "fm-brenes",
          family_name: "Familia Brenes Mora",
          member_ids: ["m-04", "m-05"],
          status: "confirmed",
          guests_count: 0,
          dietary_restrictions: "",
          notes: "Categoría avanzada",
          total_cost: 10000,
          created_at: "2025-06-02T14:30:00Z",
          updated_at: "2025-06-02T14:30:00Z",
        },
        {
          id: "rsvp-003",
          event_id: eventId,
          family_id: "fm-herrera",
          family_name: "Familia Herrera Solano",
          member_ids: ["m-06"],
          status: "confirmed",
          guests_count: 1,
          dietary_restrictions: "",
          notes: "Categoría amateur",
          total_cost: 10000,
          created_at: "2025-06-03T09:15:00Z",
          updated_at: "2025-06-03T09:15:00Z",
        },
        {
          id: "rsvp-004",
          event_id: eventId,
          family_id: "fm-vargas",
          family_name: "Familia Vargas Picado",
          member_ids: ["m-07", "m-08", "m-09"],
          status: "confirmed",
          guests_count: 0,
          dietary_restrictions: "Vegetariano",
          notes: "Torneo mixto",
          total_cost: 15000,
          created_at: "2025-06-03T11:00:00Z",
          updated_at: "2025-06-03T11:00:00Z",
        },
        {
          id: "rsvp-005",
          event_id: eventId,
          family_id: "fm-rodriguez",
          family_name: "Familia Rodríguez Chen",
          member_ids: ["m-10"],
          status: "declined",
          guests_count: 0,
          dietary_restrictions: "",
          notes: "Viaje programado a Manuel Antonio",
          total_cost: 0,
          created_at: "2025-06-04T08:00:00Z",
          updated_at: "2025-06-04T08:00:00Z",
        },
        {
          id: "rsvp-006",
          event_id: eventId,
          family_id: "fm-mendez",
          family_name: "Familia Méndez Arias",
          member_ids: ["m-11", "m-12"],
          status: "waitlisted",
          guests_count: 1,
          dietary_restrictions: "",
          notes: "Esperando lugar en categoría avanzada",
          total_cost: 0,
          created_at: "2025-06-05T16:45:00Z",
          updated_at: "2025-06-05T16:45:00Z",
        },
      ],
      vendors: [
        {
          id: "vnd-001",
          event_id: eventId,
          name: "Catering Imperial",
          service_type: "catering",
          contact_name: "Roberto Jiménez",
          contact_phone: "+506 2234-5678",
          contact_email: "roberto@cateringimperial.cr",
          quoted_cost: 180000,
          final_cost: 165000,
          contract_status: "contracted",
          notes: "Buffet de almuerzo + hidratación permanente. Incluye opciones sin gluten y vegetarianas.",
          created_at: "2025-05-20T10:00:00Z",
          updated_at: "2025-05-25T14:00:00Z",
        },
        {
          id: "vnd-002",
          event_id: eventId,
          name: "Gatorade Costa Rica",
          service_type: "sponsorship",
          contact_name: "Andrea Salazar",
          contact_phone: "+506 8877-6655",
          contact_email: "andrea@gatorade.cr",
          quoted_cost: 0,
          final_cost: 0,
          contract_status: "contracted",
          notes: "Patrocinador: provee bebidas isotónicas y premios. Sin costo para el club.",
          created_at: "2025-05-22T09:00:00Z",
          updated_at: "2025-05-28T11:00:00Z",
        },
        {
          id: "vnd-003",
          event_id: eventId,
          name: "SonidoPRO Costa Rica",
          service_type: "av",
          contact_name: "Laura Vargas",
          contact_phone: "+506 8899-1234",
          contact_email: "laura@sonidopro.cr",
          quoted_cost: 85000,
          final_cost: null,
          contract_status: "quoted",
          notes: "Equipo de sonido para premiación + DJ para fiesta de clausura (16:00-18:00).",
          created_at: "2025-06-01T10:00:00Z",
          updated_at: "2025-06-01T10:00:00Z",
        },
      ],
    },
  };
}

/** Mock: update_event_status — mutation (mock-only, backend gap) */
export function createMockEventUpdateStatusNew(): {
  status: string;
  message: string;
} {
  return {
    status: "success",
    message: "✅ Estado del evento actualizado correctamente.",
  };
}
/** Mock: personalize_communication — AI compose drafts by topic */
const TOPIC_DRAFTS: Record<string, { subject: string; body: string }> = {
  event_invitation: {
    subject: "Invitación exclusiva para {familyName}",
    body:
      "Estimado/a {familyName},\n\n" +
      "Tenemos el gusto de invitarle a nuestros próximos eventos exclusivos del Castillo Country Club. " +
      "Su presencia enriquece nuestra comunidad y queremos asegurarnos de que no se pierda " +
      "las experiencias que hemos preparado para esta temporada.\n\n" +
      "Consulte nuestro calendario de eventos y reserve su lugar con anticipación.\n\n" +
      "¡Esperamos verle pronto!\n" +
      "Castillo Country Club",
  },
  activity_reminder: {
    subject: "{familyName}, no olvides tu próxima actividad",
    body:
      "Hola {familyName},\n\n" +
      "Le recordamos que tiene actividades programadas esta semana en el club. " +
      "Desde clases de fitness hasta reservas de cancha, todo está listo para su visita.\n\n" +
      "Recuerde que puede gestionar sus reservas desde el portal Mi Club.\n\n" +
      "¡Nos vemos pronto!\n" +
      "Castillo Country Club",
  },
  loyalty_reward: {
    subject: "¡{familyName}, tienes recompensas esperándote!",
    body:
      "¡Hola {familyName}!\n\n" +
      "Su lealtad al Castillo Country Club ha sido extraordinaria. Como reconocimiento, " +
      "tenemos beneficios exclusivos preparados especialmente para usted y su familia.\n\n" +
      "Desde descuentos en eventos especiales hasta acceso prioritario a nuevas actividades, " +
      "su membresía tiene más valor que nunca.\n\n" +
      "Consulte sus recompensas disponibles en el portal.\n\n" +
      "Con aprecio,\n" +
      "Castillo Country Club",
  },
  membership_renewal: {
    subject: "Renueva tu membresía, {familyName}",
    body:
      "Estimado/a {familyName},\n\n" +
      "Su membresía del Castillo Country Club está próxima a vencer. " +
      "Renueve ahora para mantener todos sus beneficios activos sin interrupciones.\n\n" +
      "Como socio valued, ofrecemos opciones de pago flexibles y beneficios de renovación temprana.\n\n" +
      "Contacte a nuestro equipo de bienestar para más información.\n\n" +
      "Atentamente,\n" +
      "Castillo Country Club",
  },
};

export function createMockPersonalizedCommunicationDraft(
  params?: Record<string, unknown>,
): PersonalizeCommunicationResponse {
  const topic = (params?.topic as string) ?? "event_invitation";
  const tone = (params?.tone as string) ?? "friendly";
  const familyName = (params?.family_name as string) || "Socio del Castillo";

  const template = TOPIC_DRAFTS[topic] ?? TOPIC_DRAFTS.event_invitation;

  return {
    status: "success",
    message: `✉️ Borrador de comunicación generado para ${familyName}.`,
    data: {
      draft_id: `draft-${Date.now().toString(36)}`,
      family_id: (params?.family_id as string) ?? "global",
      family_name: familyName,
      channel: (params?.channel as string) ?? "email",
      subject: template.subject.replace(/\{familyName\}/g, familyName),
      body: template.body.replace(/\{familyName\}/g, familyName),
      tone,
      personalization_data: {
        family_name: familyName,
        topic,
        interests: ["Gastronomía", "Eventos"],
        recent_activity: "Última visita hace 3 días",
        tier: "oro",
      },
      alternative_versions: [
        { version: "formal", subject: "Estimado socio", body_preview: "Nos complace invitarle..." },
      ],
      estimated_engagement: "+12-18% open rate",
      created_at: new Date().toISOString(),
    },
  };
}


// ── Executive Dashboard factories ──────────────────────────

import type {
  OperationalPulseResponse,
} from "./contracts";

export function createMockExecutiveSummary(): ExecutiveSummaryResponse {
  return {
    status: "success",
    message:
      "Resumen ejecutivo (Q2 2026): 1,247 familias, $4.25M revenue, 45 eventos, engagement 78.5/100.",
    summary: {
      id: `exec_${Date.now()}`,
      period: "current_quarter" as unknown as import("@/features/dashboard/types").DashboardPeriod,
      date_from: "2026-04-01",
      date_to: "2026-06-30",
      membership: {
        total_families: 1247,
        total_members: 3891,
        active_members: 3650,
        new_this_period: 42,
        departures: 8,
        net_growth: 34,
        growth_rate_pct: 3.2,
        churn_risk_count: 23,
        avg_engagement_score: 78.5,
        by_tier: { basic: 561, premium: 499, vip: 187 },
      },
      financial: {
        revenue: 4250000,
        expenses: 3180000,
        net_income: 1070000,
        outstanding_dues: 125000,
        collection_rate_pct: 94.0,
        budget_variance_pct: 5.3,
        revenue_growth_pct: 8.1,
        top_revenue_sources: [
          { source: "Cuotas de Membresía", amount: 2100000 },
          { source: "Eventos y Catering", amount: 980000 },
          { source: "Alquiler de Instalaciones", amount: 620000 },
          { source: "Food & Beverage", amount: 550000 },
        ],
      },
      operational: {
        events_held: 45,
        events_upcoming: 12,
        avg_event_attendance: 87.5,
        attendance_trend: "improving" as unknown as import("@/features/dashboard/types").TrendDirection,
        facility_utilization_pct: 72.0,
        maintenance_pending: 5,
        guest_visits: 312,
        active_trial_memberships: 18,
        top_activities: [
          { name: "Tenis", participation: 450, change_pct: 12.0 },
          { name: "Natación", participation: 380, change_pct: 8.0 },
          { name: "Yoga", participation: 290, change_pct: 15.0 },
          { name: "Golf", participation: 210, change_pct: 5.0 },
        ],
      },
      engagement: {
        satisfaction_score: 4.2,
        loyalty_points_distributed: 125000,
        nps_score: 35.0,
        engagement_trend: "improving",
        at_risk_members: 23,
        highly_engaged_pct: 45.0,
        campaigns_active: 3,
        referrals_this_period: 15,
      },
      trends: {
        membership_growth: "improving",
        revenue_trend: "improving",
        engagement_trend: "improving",
        attendance_trend: "improving",
        satisfaction_trend: "stable",
      },
    },
  };
}

export function createMockOperationalPulse(): OperationalPulseResponse {
  return {
    status: "success",
    message:
      "Operaciones: 45 eventos | Utilización: 72% | Mantenimiento pendiente: 5",
    operational: {
      events_held: 45,
      events_upcoming: 12,
      avg_event_attendance: 87.5,
      attendance_trend: "improving" as unknown as import("@/features/dashboard/types").TrendDirection,
      facility_utilization_pct: 72.0,
      maintenance_pending: 5,
      guest_visits: 312,
      active_trial_memberships: 18,
      top_activities: [
        { name: "Tenis", participation: 450, change_pct: 12.0 },
        { name: "Natación", participation: 380, change_pct: 8.0 },
        { name: "Yoga", participation: 290, change_pct: 15.0 },
        { name: "Golf", participation: 210, change_pct: 5.0 },
      ],
    },
  };
}


export function createMockComplianceAlertList(): ComplianceAlertListResponse {
  const alerts = [
    {
      id: "alert_001",
      title: "Certificación de seguridad contra incendios",
      description:
        "La certificación vence en 15 días. Se requiere inspección urgente por bomberos.",
      area: "safety",
      risk_level: "critical",
      status: "open",
      due_date: "2026-06-15",
      responsible: "Ing. Carlos Mora",
      created_at: "2026-05-20T08:00:00Z",
    },
    {
      id: "alert_002",
      title: "Renovación de póliza de seguro",
      description:
        "Póliza de responsabilidad civil general vence este mes. Cobertura mínima requerida por ley.",
      area: "legal",
      risk_level: "high",
      status: "open",
      due_date: "2026-06-30",
      responsible: "Lcda. Ana Vargas",
      created_at: "2026-05-01T09:00:00Z",
    },
    {
      id: "alert_003",
      title: "Inspección trimestral de piscina",
      description:
        "Inspección de calidad de agua, equipos de filtrado y cercas de seguridad.",
      area: "health",
      risk_level: "medium",
      status: "open",
      due_date: "2026-06-10",
      responsible: "Lic. María Fernández",
      created_at: "2026-05-15T10:00:00Z",
    },
    {
      id: "alert_004",
      title: "Capacitación en primeros auxilios",
      description:
        "Personal de F&B y eventos requiere actualización de certificación.",
      area: "safety",
      risk_level: "low",
      status: "open",
      due_date: "2026-07-15",
      responsible: "Departamento de RRHH",
      created_at: "2026-05-10T14:00:00Z",
    },
    {
      id: "alert_005",
      title: "Licencia sanitaria del restaurante",
      description:
        "Renovación de licencia sanitaria del restaurante principal ya completada.",
      area: "health",
      risk_level: "medium",
      status: "resolved",
      due_date: "2026-05-30",
      responsible: "Chef Ejecutivo",
      created_at: "2026-04-15T11:00:00Z",
    },
  ];

  const open = alerts.filter((a) => a.status === "open");

  return {
    status: "success",
    message: `🔔 ${alerts.length} alertas encontradas. ${open.length} abiertas. ⚠️ 1 crítica!`,
    data: alerts,
    total: alerts.length,
    open_count: open.length,
  };
}


export function createMockDetectAnomalies(
  params?: Record<string, unknown>,
): DetectAnomaliesResponse {
  const domain = (params?.domain as string) || "";
  const allAnomalies: DetectAnomaliesResponse["anomalies"] = [
    // ── Membership ──
    {
      id: "anom_mem_001",
      domain: "membership",
      severity: "medium",
      title: "Segmento básico con churn elevado",
      description:
        "El segmento Basic muestra una tasa de cancelación 2.3x mayor que el promedio del último trimestre. 23 socios en riesgo activo.",
      context: {
        churn_rate_basic: 4.1,
        churn_rate_avg: 1.8,
        members_affected: 23,
        revenue_at_risk: 34500,
      },
      suggested_action:
        "Lanzar campaña de reactivación para segmento básico con ofertas de upgrade a Premium. Contactar primero los 10 socios con mayor riesgo.",
    },
    {
      id: "anom_mem_002",
      domain: "membership",
      severity: "low",
      title: "Baja participación en segmento jóvenes 18-30",
      description:
        "La participación del segmento jóvenes cayó 8% respecto al trimestre anterior. Solo el 45% asiste a actividades regularmente.",
      context: {
        participation_pct: 45.0,
        previous_pct: 53.0,
        change: -8.0,
        segment_size: 380,
      },
      suggested_action:
        "Crear eventos dirigidos al segmento joven: noches de networking, torneos deportivos sociales, happy hours temáticos.",
    },

    // ── Financial ──
    {
      id: "anom_fin_001",
      domain: "financial",
      severity: "high",
      title: "Sobrecosto en Food & Beverage",
      description:
        "Los gastos de F&B superan el presupuesto en un 18% este trimestre. El sobrecosto acumulado es de $45,000.",
      context: {
        budget_pct_used: 118.0,
        overrun_amount: 45000,
        budget_allocated: 250000,
        top_overrun_category: "Proteínas",
      },
      suggested_action:
        "Renegociar contrato de catering y revisar menús para optimizar costos. Evaluar proveedores alternativos para la categoría de proteínas.",
    },
    {
      id: "anom_fin_002",
      domain: "financial",
      severity: "medium",
      title: "Cobranza pendiente acumulada",
      description:
        "$125,000 en cuotas pendientes de cobro. 34 familias con más de 60 días de atraso.",
      context: {
        outstanding_total: 125000,
        families_overdue: 34,
        avg_days_overdue: 72,
        oldest_invoice_days: 145,
      },
      suggested_action:
        "Activar protocolo de cobranza escalonada. Las 8 familias con más de 90 días requieren gestión directa del admin.",
    },

    // ── Operational ──
    {
      id: "anom_ops_001",
      domain: "operational",
      severity: "medium",
      title: "Utilización de piscina a la baja",
      description:
        "La utilización de la piscina disminuyó un 12% vs trimestre anterior, pasando de 70% a 58%.",
      context: {
        utilization_current: 58.0,
        utilization_previous: 70.0,
        change_pct: -12.0,
        capacity: 80,
      },
      suggested_action:
        "Evaluar horarios y promociones especiales para piscina. Considerar clases acuáticas en horarios de baja demanda.",
    },
    {
      id: "anom_ops_002",
      domain: "operational",
      severity: "low",
      title: "Tiempo de respuesta de mantenimiento elevado",
      description:
        "El tiempo promedio de respuesta a reportes de mantenimiento subió de 2.1 a 3.8 días.",
      context: {
        avg_response_days: 3.8,
        target_days: 2.0,
        open_tickets: 5,
        escalated: 1,
      },
      suggested_action:
        "Revisar asignación de recursos de mantenimiento. Priorizar los 2 tickets de alta urgencia pendientes.",
    },

    // ── Engagement ──
    {
      id: "anom_eng_001",
      domain: "engagement",
      severity: "high",
      title: "NPS en descenso significativo",
      description:
        "El NPS bajó de +42 a +35 en el último trimestre. El detractor principal es la calidad del servicio de F&B.",
      context: {
        nps_current: 35,
        nps_previous: 42,
        change: -7,
        top_detractor: "Food & Beverage",
        promoters_pct: 52,
        detractors_pct: 17,
      },
      suggested_action:
        "Realizar encuesta de satisfacción profunda enfocada en F&B. Implementar programa de mejora con el chef ejecutivo.",
    },
    {
      id: "anom_eng_002",
      domain: "engagement",
      severity: "medium",
      title: "Caída en asistencia a eventos culturales",
      description:
        "Los eventos culturales (conciertos, exposiciones) tuvieron 30% menos asistencia que el trimestre anterior.",
      context: {
        cultural_events_held: 8,
        avg_attendance: 45,
        previous_avg_attendance: 65,
        change_pct: -30.7,
      },
      suggested_action:
        "Evaluar el formato de eventos culturales. Considerar colaboraciones con artistas locales y promoción en redes sociales del club.",
    },
  ];

  // Filter by domain if specified
  const filtered = domain
    ? allAnomalies.filter((a) => a.domain === domain)
    : allAnomalies;

  // Compute severity counts
  const severityCounts: Record<string, number> = {};
  for (const a of filtered) {
    severityCounts[a.severity] = (severityCounts[a.severity] || 0) + 1;
  }

  const sevStr = Object.entries(severityCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");

  return {
    status: "success",
    message: `⚠️ ${filtered.length} anomalía(s) detectada(s). ${sevStr}`,
    anomalies: filtered,
    total_anomalies: filtered.length,
    severity_counts: severityCounts,
  };
}


export function createMockComplianceReport(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").ComplianceReportResponse {
  const now = new Date();
  const lastAudit = new Date(now);
  lastAudit.setMonth(lastAudit.getMonth() - 2);
  const nextAudit = new Date(now);
  nextAudit.setMonth(nextAudit.getMonth() + 3);

  const overallScore = 82;
  const overallStatus =
    overallScore >= 80
      ? "compliant"
      : overallScore >= 60
        ? "needs_attention"
        : "critical";

  return {
    status: "success",
    message:
      "Reporte de cumplimiento generado. Score general: 82/100. 3 áreas cumplen totalmente, 2 requieren atención.",
    overall_score: overallScore,
    data: {
      overall_score: overallScore,
      overall_status: overallStatus,
      overall_score_pct: overallScore,
      summary:
        "El Castillo Country Club mantiene un nivel de cumplimiento sólido con un 82% de score general. " +
        "Las áreas de Seguridad y Legal cumplen totalmente. Se requiere atención en la renovación de la " +
        "póliza de seguro y la inspección trimestral de piscina.",
      last_full_audit: lastAudit.toISOString().slice(0, 10),
      next_full_audit: nextAudit.toISOString().slice(0, 10),
      total_items: 14,
      area_summaries: [
        { area: "Seguridad", compliant: 3, warnings: 0, non_compliant: 0, pending: 0, score_pct: 100 },
        { area: "Salud", compliant: 2, warnings: 1, non_compliant: 0, pending: 1, score_pct: 75 },
        { area: "Legal", compliant: 2, warnings: 0, non_compliant: 0, pending: 0, score_pct: 100 },
        { area: "Ambiental", compliant: 1, warnings: 1, non_compliant: 0, pending: 0, score_pct: 85 },
        { area: "Laboral", compliant: 2, warnings: 0, non_compliant: 0, pending: 0, score_pct: 100 },
        { area: "Inocuidad", compliant: 1, warnings: 0, non_compliant: 1, pending: 0, score_pct: 60 },
      ],
      items: [
        {
          id: "chk_001",
          status: "compliant",
          requirement: "Certificación de seguridad contra incendios vigente",
          area: "Seguridad",
          responsible: "Ing. Carlos Mora",
          next_due_date: "2027-01-15",
          regulation_reference: "Norma CENACOP-001-2024",
        },
        {
          id: "chk_002",
          status: "compliant",
          requirement: "Extintores inspeccionados y con carga vigente",
          area: "Seguridad",
          responsible: "Ing. Carlos Mora",
          next_due_date: "2026-12-01",
          regulation_reference: "NFPA 10",
        },
        {
          id: "chk_003",
          status: "compliant",
          requirement: "Señalización de emergencia en todas las áreas",
          area: "Seguridad",
          responsible: "Ing. Carlos Mora",
          next_due_date: "2026-11-30",
          regulation_reference: "Norma INTE 37020",
        },
        {
          id: "chk_004",
          status: "warning",
          requirement: "Inspección trimestral de piscina — calidad de agua y equipos",
          area: "Salud",
          responsible: "Lic. María Fernández",
          next_due_date: "2026-06-20",
          regulation_reference: "Ministerio de Salud — Reglamento Piscinas",
          notes: "Inspección vencida hace 5 días. Programar urgente.",
        },
        {
          id: "chk_005",
          status: "pending_review",
          requirement: "Certificado de potabilidad del agua",
          area: "Salud",
          responsible: "Lic. María Fernández",
          next_due_date: "2026-07-01",
          regulation_reference: "Decreto 37838-S",
        },
        {
          id: "chk_006",
          status: "compliant",
          requirement: "Licencia sanitaria del restaurante principal",
          area: "Salud",
          responsible: "Chef Ejecutivo",
          next_due_date: "2027-03-15",
          regulation_reference: "Decreto 29912-S",
        },
        {
          id: "chk_007",
          status: "compliant",
          requirement: "Póliza de responsabilidad civil general",
          area: "Legal",
          responsible: "Lcda. Ana Vargas",
          next_due_date: "2026-09-30",
          regulation_reference: "Ley 7337 — Responsabilidad Civil",
        },
        {
          id: "chk_008",
          status: "compliant",
          requirement: "Registro de constitución y estatutos actualizados",
          area: "Legal",
          responsible: "Lcda. Ana Vargas",
          next_due_date: "2027-01-01",
          regulation_reference: "Código de Comercio",
        },
        {
          id: "chk_009",
          status: "compliant",
          requirement: "Plan de manejo de residuos sólidos",
          area: "Ambiental",
          responsible: "Ing. Roberto Soto",
          next_due_date: "2026-12-31",
          regulation_reference: "Ley 8839 — Gestión Integral de Residuos",
        },
        {
          id: "chk_010",
          status: "warning",
          requirement: "Informe de emisiones atmosféricas anual",
          area: "Ambiental",
          responsible: "Ing. Roberto Soto",
          next_due_date: "2026-07-15",
          regulation_reference: "Decreto 37719-S-MINAE",
          notes: "Pendiente de firma del auditor ambiental.",
        },
        {
          id: "chk_011",
          status: "compliant",
          requirement: "Registros de planilla y CCSS al día",
          area: "Laboral",
          responsible: "Dra. Patricia Solano",
          next_due_date: "2026-08-01",
          regulation_reference: "Código de Trabajo Art. 374",
        },
        {
          id: "chk_012",
          status: "compliant",
          requirement: "Reglamento interno de trabajo registrado",
          area: "Laboral",
          responsible: "Dra. Patricia Solano",
          next_due_date: "2027-01-01",
          regulation_reference: "Código de Trabajo Art. 380",
        },
        {
          id: "chk_013",
          status: "compliant",
          requirement: "HACCP implementado en cocina principal",
          area: "Inocuidad",
          responsible: "Chef Ejecutivo",
          next_due_date: "2026-10-15",
          regulation_reference: "Codex Alimentarius",
        },
        {
          id: "chk_014",
          status: "non_compliant",
          requirement: "Registros de temperatura de cadena de frío",
          area: "Inocuidad",
          responsible: "Chef Ejecutivo",
          next_due_date: "2026-06-01",
          regulation_reference: "Decreto 37838-S Anexo III",
          notes: "Faltan registros de los últimos 14 días. Acción correctiva inmediata requerida.",
        },
      ],
      at_risk_items: [
        {
          id: "risk_001",
          requirement: "Inspección trimestral de piscina",
          area: "Salud",
          risk_level: "high",
          days_until_deadline: -5,
          potential_fine_crc: 2500000,
          remediation_steps: [
            "Contactar laboratorio certificado para análisis de calidad de agua",
            "Programar inspección de equipos de filtrado y bombeo",
            "Verificar niveles de cloro, pH y temperatura en registro diario",
            "Coordinar visita del inspector del Ministerio de Salud",
          ],
        },
        {
          id: "risk_002",
          requirement: "Registros de temperatura de cadena de frío",
          area: "Inocuidad",
          risk_level: "high",
          days_until_deadline: -14,
          potential_fine_crc: 1800000,
          remediation_steps: [
            "Implementar registro digital de temperatura con alertas automáticas",
            "Capacitar personal de cocina en procedimiento de registro cada 4 horas",
            "Auditar inventario recibido en los últimos 14 días",
            "Designar responsable de verificación diaria",
          ],
        },
        {
          id: "risk_003",
          requirement: "Póliza de seguro contra desastres naturales",
          area: "Legal",
          risk_level: "medium",
          days_until_deadline: 45,
          potential_fine_crc: 0,
          remediation_steps: [
            "Solicitar cotizaciones a 3 aseguradoras autorizadas",
            "Evaluar cobertura actual vs. valor de las instalaciones",
            "Presentar propuesta a la junta directiva para aprobación",
            "Firmar póliza antes de inicio de temporada de lluvias",
          ],
        },
      ],
      ai_summary:
        "El cumplimiento general es sólido (82/100). Sin embargo, dos items críticos requieren acción inmediata: " +
        "la inspección de piscina está vencida y faltan registros de temperatura de cadena de frío. " +
        "Resolver estos dos puntos elevaría el score por encima de 90. Las multas potenciales acumulan ₡4.3M. " +
        "Se recomienda priorizar la inspección de piscina esta semana.",
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Fase 16 — ExecutiveDashboard Enhancement
// ═══════════════════════════════════════════════════════════


// ── get_financial_overview ──────────────────────────────────

export function createMockFinancialOverview(): FinancialOverviewResponse {
  return {
    status: "success",
    message:
      "💰 Revenue: $4,250,000 | Expenses: $3,180,000 | Net: $1,070,000 | Margin: 25.2%",
    financial: {
      revenue: 4250000,
      expenses: 3180000,
      net_income: 1070000,
      outstanding_dues: 125000,
      collection_rate_pct: 94.0,
      budget_variance_pct: 5.3,
      revenue_growth_pct: 8.1,
      top_revenue_sources: [
        { source: "Cuotas de Membresía", amount: 2100000 },
        { source: "Eventos y Catering", amount: 980000 },
        { source: "Alquiler de Instalaciones", amount: 620000 },
        { source: "Food & Beverage", amount: 550000 },
      ],
    },
    margin_pct: 25.2,
  };
}

// ── get_membership_health ───────────────────────────────────

export function createMockMembershipHealth(): MembershipHealthResponse {
  return {
    status: "success",
    message:
      "👥 Membresía: 1,247 familias | Crecimiento: +3.2% | En riesgo: 23",
    membership: {
      total_families: 1247,
      total_members: 3891,
      active_members: 3650,
      new_this_period: 42,
      departures: 8,
      net_growth: 34,
      growth_rate_pct: 3.2,
      churn_risk_count: 23,
      avg_engagement_score: 78.5,
      by_tier: { basic: 561, premium: 499, vip: 187 },
    },
    tier_distribution_pct: { basic: 45.0, premium: 40.0, vip: 15.0 },
  };
}

// ── get_age_group_balance ───────────────────────────────────

export function createMockAgeGroupBalance(): AgeGroupBalanceResponse {
  return {
    status: "success",
    message: "🟡 Balance etario (current_quarter): good (Gini: 0.1847)",
    distribution: {
      children_0_5: {
        members: 320,
        activities: 8,
        participation_pct: 65.0,
      },
      children_6_12: {
        members: 480,
        activities: 15,
        participation_pct: 78.0,
      },
      teens_13_17: {
        members: 290,
        activities: 10,
        participation_pct: 52.0,
      },
      young_adults_18_30: {
        members: 380,
        activities: 12,
        participation_pct: 45.0,
      },
      adults_31_50: {
        members: 890,
        activities: 20,
        participation_pct: 72.0,
      },
      seniors_51_plus: {
        members: 530,
        activities: 14,
        participation_pct: 68.0,
      },
    },
    gini_coefficient: 0.1847,
    balance_score: "good",
    underrepresented: ["teens_13_17", "young_adults_18_30"],
    overrepresented: ["adults_31_50"],
    recommendations: [
      "Crear programas específicos para: teens_13_17, young_adults_18_30",
      "Evaluar actividades para jóvenes con interés en deportes y tecnología",
    ],
  };
}

// ── generate_quarterly_board_report (HITL → pending) ────────

export function createMockBoardReport(
  params?: Record<string, unknown>,
): BoardReportPendingResponse {
  const year = (params?.year as number) || 2026;
  const quarter = (params?.quarter as string) || "Q2";
  return {
    status: "pending_approval",
    request_id: `apr_board_${Date.now()}`,
    message: `📊 Informe ${quarter} ${year} registrado. Esperando aprobación del administrador.`,
    details: { year, quarter },
  };
}
// ═══════════════════════════════════════════════════════════
// Advisor Intelligence — Fase 21
// ═══════════════════════════════════════════════════════════

// ── generate_insight_narrative ───────────────────────────

export function createMockAdvisorNarrative(
  params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").AdvisorInsightNarrativeResponse {
  const insightId = (params?.insight_data as Record<string, unknown>)?.id as string ?? "health_critical";
  const insightTitle = (params?.insight_data as Record<string, unknown>)?.title as string ?? "Salud financiera: C (62/100)";

  const narratives: Record<string, import("@/shared/mocks/contracts").AdvisorInsightNarrativeResponse["narrative"]> = {
    health_critical: {
      insight_id: "health_critical",
      root_cause:
        "El health score de 62/100 refleja una combinación de factores: el margen operativo cayó a 12.3% (benchmark CR: 18-22%), driven por un incremento de ₡2.3M en costos de catering este trimestre. La temporada alta de bodas (Ene-Abr) generó ingresos récord pero los costos de proveedores crecieron 34% por renovación de contratos sin cap de incremento. Comparado con Q4 2025, el health score era 71/100 — una caída de 9 puntos en un trimestre.",
      benchmark_comparison:
        "El health score promedio de clubes privados en Costa Rica es 75/100. Castillo está 13 puntos por debajo. Reserva Conchal reportó 78/100 y Los Sueños 82/100 en el mismo período. Nuestro margen de 12.3% está 6 puntos por debajo del benchmark de 18-22%. El único indicador que supera el benchmark es la tasa de retención (94% vs 88% promedio).",
      recommendation:
        "1. Renegociar contratos de catering con cap de incremento del 12% — plazo: próximas 2 semanas. 2. Implementar pricing dinámico para eventos premium en temporada alta (+₡5K-10K por asistente). 3. Revisar gastos discrecionales del club house — identificar ₡500K/mes en reducciones. Todo esto es alcanzable en este trimestre.",
      estimated_impact: "+₡3.8M/año en margen recuperado",
      full_narrative:
        "## Diagnóstico\n\nEl health score de 62/100 posiciona a Castillo en zona de atención. El deterioro no es estructural — es un pico temporal causado por la renovación de contratos de catering sin protección de precios.\n\n## Causa Raíz\n\nEl 70% de la caída del margen se explica por el incremento de ₡2.3M en costos de catering. Los proveedores aprovecharon la temporada alta para imponer incrementos del 25-34%, y el club los aceptó sin negociar caps.\n\n## Benchmark Costa Rica\n\nCastillo opera 13 puntos debajo del promedio de clubes privados. Sin embargo, la retención de socios (94%) es nuestra ventaja competitiva — Reserva Conchal pierde el doble de socios.\n\n## Recomendación\n\nLa acción inmediata es renegociar los contratos de catering. En paralelo, el pricing dinámico para eventos premium puede generar ₡2.1M adicionales este año. Combinado: +₡3.8M/año en margen recuperado, proyectando un health score de 72/100 para Q4.",
      adjusted_confidence: 88,
    },
    approval_bottleneck: {
      insight_id: "approval_bottleneck",
      root_cause:
        "Hay 5 solicitudes de aprobación pendientes acumuladas en el sistema: 3 gastos recurrentes de mantenimiento (₡850K total), 1 solicitud de evento especial, y 1 aprobación de pricing para evento premium. La acumulación indica que el proceso de aprobación tiene un bottleneck — el admin no está revisando la cola diariamente.",
      benchmark_comparison:
        "En clubes privados de CR con sistema HITL, el promedio de resolución es 4-8 horas. Castillo tiene solicitudes de hace 72+ horas. Los Sueños resuelve el 95% en 24h con un sistema de aprobación móvil.",
      recommendation:
        "1. Aprobar los 3 gastos recurrentes HOY — son gastos de mantenimiento predecibles, bajo riesgo. 2. Implementar aprobación automática para gastos recurrentes <₡300K. 3. Configurar notificaciones push para la cola de aprobaciones.",
      estimated_impact: "Liberar ₡850K en gastos operativos + reducir tiempo de aprobación 60%",
      full_narrative:
        "## El problema\n\n5 aprobaciones pendientes no es un número crítico, pero el patrón es preocupante: las solicitudes llevan 72+ horas sin resolución.\n\n## Análisis\n\n3 de las 5 son gastos recurrentes de mantenimiento (jardinería, piscina, seguridad) que se repiten mensualmente. Estos NO deberían requerir aprobación manual cada vez — son operación básica del club.\n\n## Recomendación\n\nAprobar los 3 gastos recurrentes inmediatamente. Luego, configurar auto-aprobación para gastos recurrentes <₡300K con historial positivo. Esto elimina el 60% de la cola de aprobaciones sin aumentar el riesgo.",
      adjusted_confidence: 92,
    },
    systemic_risk: {
      insight_id: "systemic_risk",
      root_cause:
        "El riesgo sistémico de 62/100 (grado C) resulta de la convergencia de 3 factores: health financiero deteriorado (62/100), 2 anomalías críticas activas, y 2 días con conflictos de calendario esta semana. Cada factor aisladamente es manejable, pero la combinación crea un riesgo compuesto que requiere atención inmediata.",
      benchmark_comparison:
        "El riesgo sistémico promedio de clubes CR es 35/100 (grado B). Castillo opera 27 puntos por encima. Solo Reserva Conchal tuvo un pico similar (68/100) durante su reestructuración de proveedores en 2024, y tomaron 3 meses para volver a B.",
      recommendation:
        "Priorizar: 1) Resolver los 2 conflictos de calendario esta semana (reubicar o combinar eventos). 2) Aprobar gastos pendientes para liberar cash operativo. 3) Revisar las 2 anomalías críticas con el equipo financiero antes del viernes.",
      estimated_impact: "Reducir riesgo sistémico de C (62) a B (42) en 30 días",
      full_narrative:
        "## Situación\n\nEl riesgo sistémico de 62/100 indica que múltiples áreas del club están bajo estrés simultáneamente. Esto no es una crisis — es una acumulación de tensiones que, sin intervención, puede escalar.\n\n## Factores de riesgo\n\n1. **Financiero**: Health score deteriorándose, margen bajo benchmark. 2. **Operacional**: Conflictos de calendario creando fricción en eventos. 3. **Decisiones**: 5 aprobaciones pendientes bloqueando operaciones.\n\n## Plan de acción\n\nSemana 1: Resolver conflictos de calendario y aprobar gastos pendientes. Semana 2: Revisar anomalías financieras con equipo. Semana 3: Implementar auto-aprobación para gastos recurrentes. Meta: volver a grado B (42-45) en 30 días.",
      adjusted_confidence: 82,
    },
  };

  const narrative = narratives[insightId] ?? {
    insight_id: insightId,
    root_cause: `Análisis detallado del insight "${insightTitle}". Los datos indican una situación que requiere atención. El club presenta señales mixtas entre las áreas financiera y operacional.`,
    benchmark_comparison: "Comparado con clubes privados de Costa Rica, Castillo opera dentro de rangos normales para esta métrica específica, aunque con margen de mejora.",
    recommendation: "Revisar los datos del insight en el dashboard correspondiente y tomar acción según la prioridad asignada por el Advisor.",
    estimated_impact: "Impacto moderado en operaciones del club",
    full_narrative: `## ${insightTitle}\n\nEste insight requiere revisión manual. Los datos disponibles sugieren que la situación es manejable con acción oportuna.\n\nConsulte el dashboard correspondiente para datos actualizados.`,
    adjusted_confidence: 65,
  };

  return {
    status: "success",
    narrative,
    _approval_level: "auto",
    _agent: "advisor_intelligence",
  };
}

// ── generate_action_plan ─────────────────────────────────

export function createMockAdvisorActionPlan(
  params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").AdvisorActionPlanResponse {
  const insights = params?.insights as Array<Record<string, unknown>> ?? [];
  const insightIds = insights.map((i) => i.id as string);

  const items: import("@/shared/mocks/contracts").AdvisorActionPlanItemResponse[] = [];

  // Always include approval action if there are pending ones
  if (insightIds.includes("approval_bottleneck") || insightIds.includes("weekly_plan")) {
    items.push({
      title: "Aprobar gastos recurrentes pendientes",
      reasoning: "3 gastos de mantenimiento (₡850K total) llevan 72h+ sin resolver. Son gastos recurrentes predecibles — bajo riesgo.",
      urgency: "today",
      server: "hitl",
      tool: "approve_request",
      params: { request_ids: ["apr_001", "apr_002", "apr_003"] },
      approval_level: "auto",
      source_insight_id: "approval_bottleneck",
      confidence: 92,
    });
  }

  if (insightIds.includes("anomalies_critical") || insightIds.includes("systemic_risk")) {
    items.push({
      title: "Generar reporte financiero detallado",
      reasoning: "2 anomalías críticas activas con impacto anual de ₡1.8M. Se necesita análisis detallado antes de la reunión del viernes.",
      urgency: "today",
      server: "finance",
      tool: "finance_report_generate",
      params: { period: "current_quarter", focus: "anomalies" },
      approval_level: "semi",
      source_insight_id: "anomalies_critical",
      confidence: 88,
    });
  }

  if (insightIds.includes("waitlist_active") || insightIds.includes("capacity_risk")) {
    items.push({
      title: "Aumentar capacidad de eventos con lista de espera",
      reasoning: "58 personas en listas de espera. Aumentar capacidad un 15% en eventos con infraestructura disponible.",
      urgency: "this_week",
      server: "events",
      tool: "event_manage_capacity",
      params: { action: "increase", percentage: 15 },
      approval_level: "auto",
      source_insight_id: "waitlist_active",
      confidence: 80,
    });
  }

  if (insightIds.includes("free_monetize") || insightIds.includes("pricing_strategy")) {
    items.push({
      title: "Clonar evento gratuito con pricing premium",
      reasoning: "Evento gratuito lleno con 12 en lista de espera. Revenue potencial: ₡900K a ₡15K/persona.",
      urgency: "this_week",
      server: "events",
      tool: "event_clone_template",
      params: { pricing_model: "paid", price_per_person: 15000 },
      approval_level: "semi",
      source_insight_id: "free_monetize",
      confidence: 75,
    });
  }

  if (insightIds.includes("board_brief") || insightIds.includes("monthly_report")) {
    items.push({
      title: "Generar briefing para Junta Directiva",
      reasoning: "Health C (62), 3 anomalías, 2 conflictos. La junta necesita contexto antes de la reunión del viernes.",
      urgency: "this_week",
      server: "executive_dashboard",
      tool: "generate_quarterly_board_report",
      params: { period: "current_quarter", format: "pdf" },
      approval_level: "hitl",
      source_insight_id: "board_brief",
      confidence: 85,
    });
  }

  if (insightIds.includes("empty_period") || insightIds.includes("demand_forecast")) {
    items.push({
      title: "Programar evento para período vacío",
      reasoning: "0 eventos en los próximos 14 días + temporada alta. Cada semana sin evento = ₡350K en revenue perdido.",
      urgency: "this_week",
      server: "events",
      tool: "event_create",
      params: { template: "social", category: "family" },
      approval_level: "hitl",
      source_insight_id: "empty_period",
      confidence: 70,
    });
  }

  if (insightIds.includes("budget_overrun_multiple")) {
    items.push({
      title: "Revisar categorías presupuestarias excedidas",
      reasoning: "3 categorías sobre presupuesto por >10%. Sobregiro total: ₡1.2M/año. Acción: actualizar límites presupuestarios.",
      urgency: "this_month",
      server: "finance",
      tool: "finance_category_update",
      params: { review: true },
      approval_level: "semi",
      source_insight_id: "budget_overrun_multiple",
      confidence: 82,
    });
  }

  // Ensure at least 3 items for a useful plan
  if (items.length < 3) {
    items.push({
      title: "Exportar reporte ejecutivo mensual",
      reasoning: "Consolidar todos los datos cross-agent en un reporte PDF para revisión del equipo directivo.",
      urgency: "this_week",
      server: "executive_dashboard",
      tool: "export_report",
      params: { format: "pdf", period: "current_month" },
      approval_level: "semi",
      source_insight_id: "monthly_report",
      confidence: 90,
    });
  }

  return {
    status: "success",
    plan: {
      summary: `Plan de acción con ${items.length} prioridades. #1: ${items[0]?.title ?? "Revisar insights"}. Impacto total estimado: +₡4.2M en eficiencia operativa.`,
      items,
      total_estimated_impact: "+₡4.2M/año en eficiencia operativa y revenue recuperado",
    },
    _approval_level: "auto",
    _agent: "advisor_intelligence",
  };
}

// ── simulate_scenario ────────────────────────────────────

export function createMockAdvisorScenario(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").AdvisorScenarioResponse {
  return {
    status: "success",
    simulation: {
      scenarios: [
        {
          name: "optimistic",
          description:
            "Renegociación exitosa de contratos de catering (cap 12%) + pricing dinámico implementado en 3 eventos premium + auto-aprobación de gastos recurrentes reduce cola 60%.",
          projected_metrics: {
            revenue_change_pct: 8.2,
            expense_change_pct: -3.5,
            net_impact_crc: 3800000,
            health_score_change: 12,
            member_impact: "0% churn adicional. Retención estable en 94%.",
          },
          probability: 25,
        },
        {
          name: "base",
          description:
            "Renegociación parcial de catering (algunos proveedores aceptan cap). Pricing dinámico en 1-2 eventos. Gastos recurrentes se mantienen.",
          projected_metrics: {
            revenue_change_pct: 4.1,
            expense_change_pct: 1.2,
            net_impact_crc: 1800000,
            health_score_change: 6,
            member_impact: "Riesgo de 2-3 churns si se aumenta pricing sin experiencia diferenciada.",
          },
          probability: 50,
        },
        {
          name: "pessimistic",
          description:
            "Proveedores rechazan cap de incremento. Pricing dinámico rechazado por socios. Gastos operativos siguen subiendo.",
          projected_metrics: {
            revenue_change_pct: 1.0,
            expense_change_pct: 8.5,
            net_impact_crc: -1200000,
            health_score_change: -8,
            member_impact: "Riesgo de 5-8 churns. Socios premium sensibles a precio.",
          },
          probability: 25,
        },
      ],
      risk_assessment:
        "El riesgo principal es la dependencia de proveedores de catering — hay solo 3 proveedores calificados en la zona montañosa de CR. Mitigante: iniciar negociación con proveedor alterno de Heredia como leverage.",
      recommended_scenario: "base",
    },
    _approval_level: "auto",
    _agent: "advisor_intelligence",
  };
}

// ── generate_board_brief ─────────────────────────────────

export function createMockAdvisorBoardBrief(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").AdvisorBoardBriefResponse {
  return {
    status: "success",
    brief: {
      brief_md:
        "# Briefing Ejecutivo — Castillo Country Club\n" +
        "## Resumen\n" +
        "El club opera con un health score de C (62/100), 13 puntos debajo del benchmark de clubes privados de Costa Rica. " +
        "La situación no es crítica pero requiere acción inmediata en dos frentes: renegociación de contratos de catering y optimización de pricing para eventos premium.\n\n" +
        "## Indicadores Clave\n" +
        "| Indicador | Actual | Benchmark CR | Gap |\n" +
        "|-----------|--------|-------------|-----|\n" +
        "| Health Score | 62/100 | 75/100 | -13 |\n" +
        "| Margen Operativo | 12.3% | 18-22% | -6pp |\n" +
        "| LTV/CAC | 2.8x | 3.0x+ | -0.2x |\n" +
        "| Retención | 94% | 88% | +6pp ✅ |\n\n" +
        "## Situación Financiera\n" +
        "Revenue: ₡48.2M este trimestre (+8% YoY). Expenses: ₡42.3M (+13% YoY). " +
        "El gap de 5pp entre crecimiento de revenue y expenses erosiona el margen. " +
        "Causa principal: incremento de ₡2.3M en costos de catering.\n\n" +
        "## Actividades y Eventos\n" +
        "12 eventos este mes. 2 con conflictos de calendario. 3 gratuitos con alta asistencia " +
        "(oportunidad de monetización: +₡2.1M estimado). 58 personas en listas de espera.\n\n" +
        "## Áreas de Atención\n" +
        "1. **Contratos de catering** — Renegociar con cap de 12% antes de próximo ciclo de facturación.\n" +
        "2. **Pricing de eventos** — Implementar pricing dinámico en 3 eventos premium este trimestre.\n" +
        "3. **Proceso de aprobaciones** — 5 solicitudes pendientes hace 72h+. Implementar auto-aprobación para gastos recurrentes.\n\n" +
        "## Recomendaciones\n" +
        "1. Aprobar renegociación de contratos de catering (impacto: +₡2.3M/año)\n" +
        "2. Autorizar pricing dinámico piloto en 3 eventos (impacto: +₡1.5M/año)\n" +
        "3. Delegar aprobación de gastos recurrentes <₡300K al staff operativo\n",
      key_points: [
        "Health score C (62/100) — 13 puntos debajo del benchmark de clubes CR (75). Acción inmediata requerida.",
        "Margen operativo 12.3% vs benchmark 18-22%. Causa: +₡2.3M en costos de catering por renovación sin cap.",
        "Retención de socios 94% — nuestra ventaja competitiva. Benchmark CR: 88%. Proteger este diferencial.",
        "12 eventos este mes, 3 gratuitos con alta asistencia = +₡2.1M en revenue potencial si se monetizan.",
        "5 aprobaciones pendientes hace 72h+. Proceso de aprobación es bottleneck operativo.",
      ],
      talking_points: [
        "Si preguntan por la caída del health score: es temporal, causado por catering. No es estructural. Plan de acción en marcha.",
        "Si preguntan por retención: es nuestro activo más fuerte (94% vs 88% benchmark). Los eventos y la experiencia de club lo mantienen.",
        "Si preguntan por presupuesto: 3 categorías sobre presupuesto por ₡1.2M total. Todas son gastos operativos previsibles que necesitan ajuste de límites.",
        "Si preguntan por competencia: Reserva Conchal y Los Sueños reportan health scores de 78 y 82 respectivamente. Estamos 13-20 puntos debajo pero con mejor retención.",
        "Si preguntan por el plan: 3 acciones priorizadas — catering, pricing, aprobaciones. Meta: health B (72+) en 90 días.",
      ],
      q_and_a: [
        {
          question: "¿Cuál es nuestra situación financiera actual?",
          answer: "Revenue de ₡48.2M este trimestre (+8% YoY), pero expenses crecieron ₡42.3M (+13%). El gap se debe a contratos de catering renovados sin protección de precios. No es estructural — es un pico que se corrige con renegociación.",
        },
        {
          question: "¿Qué riesgos enfrentamos?",
          answer: "Riesgo principal: dependencia de 3 proveedores de catering en la zona. Si uno falla, no hay backup inmediato. Mitigante: estamos contactando un proveedor alterno en Heredia. Riesgo secundario: 5 aprobaciones pendientes creando fricción operativa.",
        },
        {
          question: "¿Cómo estamos vs otros clubes de Costa Rica?",
          answer: "Health score 62 vs promedio CR de 75. Reserva Conchal: 78, Los Sueños: 82. Pero nuestra retención (94%) supera a ambos (88% promedio). El gap es en margen operativo y diversificación de ingresos.",
        },
        {
          question: "¿Cuánto cuesta resolver esto?",
          answer: "Las 3 acciones priorizadas no requieren inversión adicional. Renegociar contratos ahorra ₡2.3M/año. Pricing dinámico genera ₡1.5M/año. Auto-aprobación ahorra 20h/mes de tiempo administrativo. ROI: inmediato.",
        },
        {
          question: "¿Cuándo vemos resultados?",
          answer: "Semana 1-2: aprobar gastos pendientes + resolver conflictos de calendario. Mes 1: contratos renegociados. Mes 2-3: pricing dinámico implementado. Health score target: 72/100 (grado B) para fin de trimestre.",
        },
      ],
    },
    _approval_level: "auto",
    _agent: "advisor_intelligence",
  };
}

// ── ask_advisor (Conversation Context Window — F22a) ────

export function createMockAdvisorAsk(
  params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").AdvisorAskResponse {
  const question = (params?.question as string) ?? "";
  const history = (params?.conversation_history as Array<Record<string, unknown>>) ?? [];
  const hasHistory = history.length > 0;

  // ── Extract context from conversation history ──
  const previousUserTopics = hasHistory
    ? history
        .filter((e) => e.role === "user")
        .map((e) => String(e.content ?? "").slice(0, 60))
    : [];

  const lastAdvisorEvidence = hasHistory
    ? [...history]
        .reverse()
        .find((e) => e.role === "assistant" && Array.isArray(e.evidence_summary))
    : null;

  // ── Conversation-aware response ──
  if (hasHistory) {
    const refTopic = previousUserTopics[0]?.slice(0, 50) ?? "tu consulta anterior";
    const prevEvidence = (lastAdvisorEvidence?.evidence_summary as string[]) ?? [];

    return {
      status: "success",
      answer: {
        answer: `Construyendo sobre lo que analizamos sobre "${refTopic}"...\n\n` +
          `Los datos que mencioné antes siguen vigentes: el health score se mantiene en 62/100 y el margen en 12.3%. ` +
          `Sin embargo, puedo profundizar en tu nueva pregunta: "${question.slice(0, 80)}..."\n\n` +
          `Conectando con el análisis anterior, la situación tiene 3 dimensiones:\n\n` +
          `1. **Operacional**: El catering sigue siendo el driver principal del deterioro del margen. ` +
          `Necesitamos renegociar contratos antes de temporada alta (Dic-Abr).\n` +
          `2. **Financiera**: El gap entre revenue (+8%) y expenses (+13%) se está ampliando. ` +
          `Sin intervención, el margen cae a 8% en 2 trimestres.\n` +
          `3. **Experiencia del socio**: La retención al 94% enmascara problemas — los socios VIP ` +
          `(top 20%) generan el 60% del revenue, y su satisfacción está bajando.\n\n` +
          `Mi recomendación específica para tu pregunta: priorizar la acción que mencionamos antes ` +
          `de renegociar catering, pero ahora con datos actualizados del último trimestre.`,
        evidence: [
          ...(prevEvidence.length > 0
            ? [`Dato previo citado: ${prevEvidence[0]}`]
            : []),
          "Health score actual: 62/100 (grado C) — sin cambio desde última consulta",
          "Margen operativo: 12.3% — tendencia descendente (-0.8pp vs hace 30 días)",
          "Último trimestre: catering representó 34% de gastos operativos totales",
        ],
        related_insights: [
          "El insight de catering que analizamos antes se conecta directamente con tu pregunta sobre márgenes",
          "Recomendación anterior de pricing dinámico sigue siendo válida — estimación actualizada: +₡1.4M/trimestre",
          "Nuevo dato: 3 eventos corporativos confirmados para el próximo mes pueden ser catalizador para la renegociación",
        ],
        suggested_action: {
          label: "Renegociar contratos de catering (acción recomendada antes)",
          server: "finance",
          tool: "finance_category_update",
          params: { category: "catering", action: "renegotiate" },
          approval_level: "semi",
        },
      },
      _approval_level: "auto",
      _agent: "advisor_intelligence",
    };
  }

  // ── Default response (no history — first question) ──
  return {
    status: "success",
    answer: {
      answer: `Basándome en los datos actuales del Castillo Country Club, aquí va mi análisis sobre tu consulta: "${question.slice(0, 80)}..."\n\nEl club opera actualmente con un health score de 62/100, margen operativo de 12.3%, y una retención de socios del 94%. La situación financiera muestra señales mixtas — el revenue crece 8% pero los costos crecen más rápido (13%).\n\nMi recomendación: enfocarse en las 3 acciones de mayor impacto inmediato (renegociar catering, pricing dinámico, auto-aprobación de gastos recurrentes) que pueden mover el health score de C a B en 90 días.`,
      evidence: [
        "Health score actual: 62/100 (grado C) vs benchmark CR: 75/100",
        "Margen operativo: 12.3% — 6 puntos debajo del target de 18-22%",
        "Retención de socios: 94% — 6 puntos sobre el benchmark CR de 88%",
        "Revenue trimestral: ₡48.2M (+8% YoY). Expenses: ₡42.3M (+13% YoY)",
        "58 personas en listas de espera de eventos",
      ],
      related_insights: [
        "El deterioro del margen está concentrado en catering — el resto de las categorías operan dentro de rango",
        "Los eventos gratuitos con alta asistencia representan +₡2.1M en revenue potencial no capturado",
        "El proceso de aprobaciones es un bottleneck que afecta operaciones diarias",
      ],
      suggested_action: {
        label: "Generar plan de acción detallado",
        server: "advisor_intelligence",
        tool: "generate_action_plan",
        params: {},
        approval_level: "auto",
      },
    },
    _approval_level: "auto",
    _agent: "advisor_intelligence",
  };
}

// ═══════════════════════════════════════════════════════════
// WELLNESS — Goal List, Prediction, Anomalies (F26a)
// ═══════════════════════════════════════════════════════════

export function createMockWellnessGoalList(params?: { family_id?: string; status?: string }): wellness_goal_list_Contract {
  return {
    status: "success",
    message: "🎯 3 objetivo(s) encontrado(s). ⚡ 2 activo(s).",
    data: [
      {
        id: "goal_abc12345",
        family_id: params?.family_id ?? "fam-001",
        goal_type: "fitness",
        title: "Correr 5K sin parar",
        description: "Completar una carrera de 5 kilómetros continuos.",
        target_value: 5.0,
        current_value: 3.2,
        unit: "km",
        status: "active",
        target_date: "2026-09-30",
        created_at: "2026-01-15T10:00:00Z",
      },
      {
        id: "goal_def67890",
        family_id: params?.family_id ?? "fam-001",
        goal_type: "nutrition",
        title: "5 porciones de fruta al día",
        description: "Consumir al menos 5 porciones de frutas y verduras diarias.",
        target_value: 5.0,
        current_value: 3.0,
        unit: "porciones/día",
        status: "active",
        target_date: "2026-12-31",
        created_at: "2026-02-01T14:30:00Z",
      },
      {
        id: "goal_ghi11111",
        family_id: params?.family_id ?? "fam-001",
        goal_type: "mental_health",
        title: "Meditar 15 minutos diarios",
        description: "Practicar meditación mindfulness todos los días.",
        target_value: 15.0,
        current_value: 15.0,
        unit: "min/día",
        status: "completed",
        target_date: "2026-06-30",
        created_at: "2026-01-10T08:00:00Z",
      },
    ],
    total: 3,
  };
}

export function createMockWellnessPredict(params?: { family_id?: string }): import("@/shared/mocks/contracts").wellness_predict_Contract {
  return {
    status: "success",
    message: "🟡 Predicción: riesgo medium, engagement 58.5/100, tendencia stable.",
    data: {
      family_id: params?.family_id ?? "fam-001",
      risk_level: "medium",
      engagement_score: 58.5,
      predicted_trend: "stable",
      churn_risk_pct: 41.5,
      activity_forecast: {
        current_distribution: {
          gym: 8,
          yoga: 5,
          swimming: 3,
          tennis: 2,
        },
        most_frequent: "gym",
        total_unique_dates: 14,
        suggested_weekly_minutes: 150,
      },
      factors: [
        { factor: "Actividad física bajo recomendación OMS (150 min/sem)", impact: "medium" },
        { factor: "Pocas actividades — confianza limitada", impact: "low" },
      ],
      top_recommendation: "Aumentar frecuencia de actividades a 3 veces por semana",
      confidence: 55.0,
    },
  };
}

export function createMockWellnessAnomalies(params?: { family_id?: string }): import("@/shared/mocks/contracts").wellness_anomalies_Contract {
  return {
    status: "success",
    message: "⚠️ 2 anomalía(s), 1 de alta severidad.",
    data: {
      family_id: params?.family_id ?? "fam-001",
      total_anomalies: 2,
      critical_count: 1,
      anomalies: [
        {
          id: "anom_gap_fam-001",
          anomaly_type: "activity_gap",
          severity: "high",
          title: "Inactividad prolongada",
          description: "Han pasado 21 días desde la última actividad.",
          detected_value: 21,
          expected_min: 0,
          expected_max: 14,
          affected_member: "",
          detected_at: new Date().toISOString(),
          suggested_action: "Contactar a la familia para motivar el regreso.",
        },
        {
          id: "anom_stag_goal_abc12345",
          anomaly_type: "goal_stagnation",
          severity: "medium",
          title: "Objetivo estancado: Correr 5K sin parar",
          description: "Solo 64% de progreso hacia 'Correr 5K sin parar'.",
          detected_value: 64.0,
          expected_min: 10,
          expected_max: 100,
          affected_member: "",
          detected_at: new Date().toISOString(),
          suggested_action: "Revisar el objetivo 'Correr 5K sin parar' o ajustar la meta.",
        },
      ],
      summary: "⚠️ 2 anomalía(s), 1 de alta severidad.",
    },
  };
}
// ══════════════════════════════════════════════════════════
// Document Intelligence (RAG) — Mock Factories
// ══════════════════════════════════════════════════════════

import type {
  search_documents_Contract,
  knowledge_query_Contract,
  query_documents_Contract,
  search_similar_Contract,
  get_repository_stats_Contract,
  ingest_document_Contract,
  generate_knowledge_report_Contract,
  manage_document_access_Contract,
} from "./contracts";

const MOCK_DOCUMENTS = [
  {
    id: "doc-001",
    title: "Estatuto Social del Castillo Country Club",
    file_name: "estatuto_social_2020.pdf",
    document_type: "bylaw",
    category: "governance",
    access_level: "internal",
    status: "published",
    ingestion_status: "indexed",
    tags: ["estatuto", "governance", "legal"],
    chunk_count: 45,
    content_preview: "Artículo 1. El Castillo Country Club es una asociación sin fines de lucro...",
    file_size_bytes: 245760,
    page_count: 28,
    has_tables: false,
    uploaded_by: "admin",
    notes: "Versión vigente aprobada en asamblea ordinaria 2020",
    version: 3,
    created_at: "2020-03-15T10:00:00Z",
    updated_at: "2024-06-01T14:30:00Z",
  },
  {
    id: "doc-002",
    title: "Reglamento Interno de Instalaciones",
    file_name: "reglamento_instalaciones_2024.pdf",
    document_type: "regulation",
    category: "operational",
    access_level: "public",
    status: "published",
    ingestion_status: "indexed",
    tags: ["reglamento", "instalaciones", "horarios"],
    chunk_count: 32,
    content_preview: "Capítulo I. Disposiciones Generales. El uso de las instalaciones del club...",
    file_size_bytes: 189440,
    page_count: 18,
    has_tables: true,
    uploaded_by: "admin",
    notes: "",
    version: 2,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-10T09:00:00Z",
  },
  {
    id: "doc-003",
    title: "Acta de Asamblea Ordinaria 2024",
    file_name: "acta_asamblea_2024.docx",
    document_type: "minutes",
    category: "governance",
    access_level: "confidential",
    status: "published",
    ingestion_status: "indexed",
    tags: ["acta", "asamblea", "2024"],
    chunk_count: 28,
    content_preview: "Siendo las 19:00 horas del día 15 de marzo de 2024, en el salón principal...",
    file_size_bytes: 156672,
    page_count: 12,
    has_tables: true,
    uploaded_by: "secretaria",
    notes: "Acta firmada por presidente y secretaria",
    version: 1,
    created_at: "2024-03-20T08:00:00Z",
    updated_at: "2024-03-20T08:00:00Z",
  },
  {
    id: "doc-004",
    title: "Contrato Proveedor Catering 2024-2025",
    file_name: "contrato_catering_2024.pdf",
    document_type: "contract",
    category: "legal",
    access_level: "restricted",
    status: "published",
    ingestion_status: "indexed",
    tags: ["contrato", "catering", "proveedor"],
    chunk_count: 18,
    content_preview: "CONTRATO DE PRESTACIÓN DE SERVICIOS entre Castillo Country Club S.A...",
    file_size_bytes: 98304,
    page_count: 8,
    has_tables: false,
    uploaded_by: "admin",
    notes: "Vigente hasta diciembre 2025",
    version: 1,
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-02-01T10:00:00Z",
  },
  {
    id: "doc-005",
    title: "Informe Financiero Anual 2024",
    file_name: "informe_financiero_2024.xlsx",
    document_type: "financial_report",
    category: "financial",
    access_level: "confidential",
    status: "published",
    ingestion_status: "indexed",
    tags: ["finanzas", "anual", "2024", "estados financieros"],
    chunk_count: 52,
    content_preview: "Balance General al 31 de diciembre de 2024. Activos corrientes: ₡125,450,000...",
    file_size_bytes: 312320,
    page_count: 0,
    has_tables: true,
    uploaded_by: "contador",
    notes: "Auditado por firma externa",
    version: 1,
    created_at: "2025-02-15T09:00:00Z",
    updated_at: "2025-02-15T09:00:00Z",
  },
  {
    id: "doc-006",
    title: "Política de Invitados y Eventos Privados",
    file_name: "politica_invitados_2023.pdf",
    document_type: "policy",
    category: "operational",
    access_level: "public",
    status: "published",
    ingestion_status: "indexed",
    tags: ["invitados", "eventos", "política"],
    chunk_count: 12,
    content_preview: "Los socios podrán invitar hasta 4 acompañantes por visita al club...",
    file_size_bytes: 54272,
    page_count: 4,
    has_tables: false,
    uploaded_by: "admin",
    notes: "",
    version: 1,
    created_at: "2023-06-01T10:00:00Z",
    updated_at: "2023-06-01T10:00:00Z",
  },
];

export function createMockSearchDocuments(params?: {
  query?: string;
  document_types?: string[];
  limit?: number;
}): search_documents_Contract {
  const query = (params?.query || "").toLowerCase();
  const types = params?.document_types || [];
  const limit = params?.limit || 24;

  let filtered = MOCK_DOCUMENTS;
  if (query) {
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.content_preview.toLowerCase().includes(query) ||
        d.tags.some((t) => t.includes(query)),
    );
  }
  if (types.length > 0) {
    filtered = filtered.filter((d) => types.includes(d.document_type));
  }

  const results = filtered.slice(0, limit).map((doc) => ({
    document: doc as search_documents_Contract["results"][0]["document"],
    relevance_score: query ? 0.65 + Math.random() * 0.3 : 0.5,
    snippet: doc.content_preview,
    highlighted_terms: query ? query.split(" ").filter((w) => w.length > 2) : [],
  }));

  return {
    status: "success",
    results,
    total: filtered.length,
    query_time_ms: Math.round(15 + Math.random() * 40),
  };
}

export function createMockKnowledgeQuery(params?: {
  question?: string;
  conversation_id?: string;
}): knowledge_query_Contract {
  const q = (params?.question || "").toLowerCase();

  // Keyword-aware mock responses
  let answer = "";
  let sources: knowledge_query_Contract["sources"] = [];
  let confidence = 0.75;

  if (q.includes("presupuesto") || q.includes("financiero") || q.includes("cuota")) {
    answer = `Según el Informe Financiero Anual 2024, el presupuesto aprobado para el período fue de ₡485,000,000 (cuatrocientos ochenta y cinco millones de colones). Las cuotas de mantenimiento se establecieron en ₡85,000 mensuales para socios plenos, con un incremento del 4.2% respecto al año anterior. [Fuente: informe_financiero_2024.xlsx]

El Acta de Asamblea Ordinaria 2024 documenta que la aprobación del presupuesto se realizó con 89 votos a favor y 3 abstenciones. [Fuente: acta_asamblea_2024.docx]`;
    sources = [
      { document_id: "doc-005", title: "Informe Financiero Anual 2024", snippet: "Balance General al 31 de diciembre de 2024. Activos corrientes: ₡125,450,000...", relevance: 0.92, document_type: "financial_report" },
      { document_id: "doc-003", title: "Acta de Asamblea Ordinaria 2024", snippet: "Se procedió a la votación del presupuesto presentado por la comisión financiera...", relevance: 0.85, document_type: "minutes" },
    ];
    confidence = 0.88;
  } else if (q.includes("invitad") || q.includes("acompañante") || q.includes("visita")) {
    answer = `De acuerdo con la Política de Invitados y Eventos Privados, los socios pueden invitar hasta 4 acompañantes por visita al club. Para eventos privados, se requiere notificación previa con 48 horas de anticipación. [Fuente: politica_invitados_2023.pdf]

El Reglamento Interno de Instalaciones establece que los invitados deben ser registrados en recepción y portar la credencial temporal durante su estadía. [Fuente: reglamento_instalaciones_2024.pdf]`;
    sources = [
      { document_id: "doc-006", title: "Política de Invitados y Eventos Privados", snippet: "Los socios podrán invitar hasta 4 acompañantes por visita al club...", relevance: 0.94, document_type: "policy" },
      { document_id: "doc-002", title: "Reglamento Interno de Instalaciones", snippet: "Los invitados deberán ser registrados en la recepción principal...", relevance: 0.78, document_type: "regulation" },
    ];
    confidence = 0.91;
  } else if (q.includes("estatuto") || q.includes("gobierno") || q.includes("junta") || q.includes("directiva")) {
    answer = `Según el Estatuto Social del Castillo Country Club, la Junta Directiva está compuesta por un Presidente, Vicepresidente, Secretario, Tesorero y 3 vocales electos por la Asamblea General por un período de 2 años. [Fuente: estatuto_social_2020.pdf]

El quórum para sesiones de la Junta Directiva es de 4 miembros, y las decisiones se tomay por mayoría simple de los presentes. [Fuente: estatuto_social_2020.pdf]`;
    sources = [
      { document_id: "doc-001", title: "Estatuto Social del Castillo Country Club", snippet: "Artículo 15. La Junta Directiva estará compuesta por...", relevance: 0.95, document_type: "bylaw" },
    ];
    confidence = 0.93;
  } else if (q.includes("contrato") || q.includes("proveedor") || q.includes("catering")) {
    answer = `El contrato vigente con el proveedor de catering (2024-2025) establece un servicio exclusivo para eventos del club con una tarifa preferencial del 15% sobre precios de lista. El contrato incluye cláusula de exclusividad para eventos de más de 50 personas. [Fuente: contrato_catering_2024.pdf]`;
    sources = [
      { document_id: "doc-004", title: "Contrato Proveedor Catering 2024-2025", snippet: "CONTRATO DE PRESTACIÓN DE SERVICIOS entre Castillo Country Club S.A...", relevance: 0.90, document_type: "contract" },
    ];
    confidence = 0.85;
  } else {
    answer = `No encontré información específica sobre "${params?.question || "su consulta"}" en la documentación del club. Los documentos disponibles incluyen: Estatuto Social, Reglamento de Instalaciones, Actas de Asamblea, Informes Financieros, Contratos y Políticas operativas.

¿Podría reformular su pregunta o especificar qué tipo de documento le interesa?`;
    sources = [];
    confidence = 0.25;
  }

  return {
    status: "success",
    answer,
    sources,
    confidence,
    conversation_id: params?.conversation_id || `conv-${Date.now().toString(36)}`,
  };
}

export function createMockQueryDocuments(params?: {
  query?: string;
}): query_documents_Contract {
  const q = (params?.query || "").toLowerCase();

  if (!q) {
    return { status: "success", message: "🔍 Se requiere query para buscar.", results: [], total_results: 0 };
  }

  const chunks = MOCK_DOCUMENTS.filter(
    (d) =>
      d.title.toLowerCase().includes(q) ||
      d.content_preview.toLowerCase().includes(q),
  ).map((doc, i) => ({
    chunk_id: `chunk-${doc.id}-${i}`,
    document_id: doc.id,
    document_name: doc.file_name,
    content: doc.content_preview,
    relevance_score: 0.6 + Math.random() * 0.35,
    chunk_index: 0,
    section_title: "",
  }));

  return {
    status: "success",
    message: `🔍 ${chunks.length} fragmento(s) encontrado(s) para '${params?.query}'.`,
    results: chunks,
    total_results: chunks.length,
  };
}

export function createMockSearchSimilar(params?: {
  document_id?: string;
}): search_similar_Contract {
  const source = MOCK_DOCUMENTS.find((d) => d.id === params?.document_id);
  if (!source) {
    return { status: "not_found", source_document: "", similar_documents: [] };
  }

  const similar = MOCK_DOCUMENTS.filter((d) => d.id !== source.id)
    .slice(0, 3)
    .map((d) => ({
      document_id: d.id,
      file_name: d.file_name,
      document_type: d.document_type,
      category: d.category,
      similarity_score: 0.3 + Math.random() * 0.5,
    }));

  return {
    status: "success",
    source_document: source.file_name,
    similar_documents: similar,
  };
}

export function createMockRepositoryStats(): get_repository_stats_Contract {
  return {
    status: "success",
    message: `📊 Repositorio: ${MOCK_DOCUMENTS.length} documento(s), 187 fragmento(s), 1.0 MB.`,
    stats: {
      total_documents: MOCK_DOCUMENTS.length,
      total_chunks: MOCK_DOCUMENTS.reduce((s, d) => s + d.chunk_count, 0),
      total_size_bytes: MOCK_DOCUMENTS.reduce((s, d) => s + d.file_size_bytes, 0),
      by_type: {
        bylaw: 1, regulation: 1, policy: 1, minutes: 1,
        financial_report: 1, contract: 1,
      },
      by_category: {
        governance: 2, operational: 2, legal: 1, financial: 1,
      },
      by_access_level: {
        public: 2, internal: 1, confidential: 2, restricted: 1,
      },
      rag: {
        vectorstore: { total_chunks: 187, total_documents: 6 },
        conversations: { active_sessions: 0, total_messages: 0 },
        bm25_index_size: 187,
        embeddings: { model_name: "BAAI/bge-m3", device: "cpu", dimension: 1024 },
        reranker: { model_name: "BAAI/bge-reranker-v2-m3", device: "cpu" },
      },
    },
  };
}

export function createMockIngestDocument(params?: {
  file_name?: string;
}): ingest_document_Contract {
  return {
    status: "success",
    message: `📄 Documento '${params?.file_name || "documento.txt"}' indexado. 12 fragmento(s) creado(s).`,
    document: {
      id: `doc-${Date.now().toString(36)}`,
      title: params?.file_name || "documento.txt",
      file_name: params?.file_name || "documento.txt",
      document_type: "other",
      category: "operational",
      access_level: "internal",
      status: "published",
      ingestion_status: "indexed",
      tags: [],
      chunk_count: 12,
      content_preview: "Contenido del documento indexado...",
      file_size_bytes: 45000,
      page_count: 3,
      has_tables: false,
      uploaded_by: "admin",
      notes: "",
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export function createMockKnowledgeReport(): generate_knowledge_report_Contract {
  return {
    status: "pending_approval",
    request_id: `apr-${Date.now().toString(36)}`,
    message: "📋 Reporte registrado. Esperando aprobación del administrador.",
    details: {
      topic: "Resumen financiero y operativo",
      audience: "internal",
      categories: ["financial", "operational"],
    },
  };
}

export function createMockManageDocumentAccess(params?: {
  action?: string;
}): manage_document_access_Contract {
  if (params?.action === "list" || !params?.action) {
    return {
      status: "success",
      message: `🔒 ${MOCK_DOCUMENTS.length} documento(s) con niveles de acceso.`,
      documents: MOCK_DOCUMENTS.map((d) => ({
        document_id: d.id,
        file_name: d.file_name,
        title: d.title,
        access_level: d.access_level,
        document_type: d.document_type,
        category: d.category,
      })),
    };
  }

  return {
    status: "pending_approval",
    request_id: `apr-${Date.now().toString(36)}`,
    message: "🔒 Cambio de acceso registrado. Esperando aprobación.",
  };
}

// ═══════════════════════════════════════════════════════════
// F28 — Communication Intelligence Factories
// ═══════════════════════════════════════════════════════════

// ── generate_communication_insights ──────────────────────

export function createMockCommunicationInsights(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").generate_communication_insights_Contract {
  const now = new Date().toISOString();

  const dimensions: CommunicationInsightDimension_Contract[] = [
    {
      dimension: "timing",
      score: 78,
      status: "good",
      finding: "Mejor día: Martes, mejor hora: 10:00. Comunicaciones activas en 5/7 días.",
      recommendation: "Concentrá comunicaciones importantes los martes alrededor de las 10:00 para maximizar engagement.",
      benchmark: "Clubes CR promedio envían más los martes y jueves (10-11h)",
      metric_value: 5,
      metric_unit: "días activos / 7",
    },
    {
      dimension: "channel",
      score: 65,
      status: "attention",
      finding: "3/5 canales activos. Canal dominante: email (62%).",
      recommendation: "Diversificá hacia WhatsApp y push para reducir dependencia del email.",
      benchmark: "Clubes CR usan promedio 2.8 canales. Óptimo: ≥3 canales activos.",
      metric_value: 3,
      metric_unit: "canales activos",
    },
    {
      dimension: "audience",
      score: 40,
      status: "attention",
      finding: "8 de 45 comunicaciones personalizadas (18%). Predomina comunicación genérica.",
      recommendation: "Incrementá comunicaciones segmentadas para mejorar engagement hasta 2x.",
      benchmark: "Clubes CR elite: 25% personalizado. Tu ratio: 18%.",
      metric_value: 18,
      metric_unit: "% personalizado",
    },
    {
      dimension: "content",
      score: 72,
      status: "good",
      finding: "4 tipos de comunicación utilizados: announcement, emergency, personalized, announcement_publish.",
      recommendation: "Explorá recordatorios de pago, cumpleaños automatizados y promociones estacionales.",
      benchmark: "Clubes CR usan promedio 3-4 tipos de contenido.",
      metric_value: 4,
      metric_unit: "tipos de contenido",
    },
    {
      dimension: "frequency",
      score: 82,
      status: "good",
      finding: "2.3 comunicaciones/semana. Intervalo promedio: 3.1 días (σ=1.8). Comunicación regular.",
      recommendation: "Frecuencia adecuada. Mantené 2-3 comunicaciones/semana para engagement óptimo.",
      benchmark: "Óptimo CR: 2.5 comunicaciones/semana.",
      metric_value: 2.3,
      metric_unit: "comunicaciones/semana",
    },
    {
      dimension: "risk",
      score: 90,
      status: "good",
      finding: "Tasa de fallas: 2.2% (2 de 45). Riesgo bajo.",
      recommendation: "Sistema estable. Continuá monitoreando.",
      benchmark: "Máximo aceptable CR: 3.0%.",
      metric_value: 2.2,
      metric_unit: "% fallas",
    },
    {
      dimension: "opportunity",
      score: 55,
      status: "attention",
      finding: "Canales sin usar: in_app; Canales subutilizados: whatsapp, sms.",
      recommendation: "Activá WhatsApp (98% apertura) y SMS para emergencias y recordatorios urgentes.",
      benchmark: "Clubes CR con mejor engagement usan 3+ canales y >20% personalización.",
      metric_value: 2,
      metric_unit: "canales subutilizados",
    },
    {
      dimension: "sentiment",
      score: 50,
      status: "attention",
      finding: "Sin datos de sentimiento disponibles. El análisis de sentimiento requiere integración con el módulo de satisfacción.",
      recommendation: "Activá el análisis de sentimiento cruzando comunicaciones con encuestas de satisfacción para medir impacto real.",
      benchmark: "Análisis de sentimiento: feature disponible en Communication Intelligence.",
      metric_value: null,
      metric_unit: null,
    },
    {
      dimension: "health",
      score: 74,
      status: "good",
      finding: "Health Score compuesto: 74/100 (delivery 96% × 0.4 + diversity 65 × 0.3 + reliability 88 × 0.3).",
      recommendation: "Sistema comunicacional saludable.",
      benchmark: "Clubes CR promedio: 70/100. Tu score: 74/100.",
      metric_value: 74,
      metric_unit: "health score",
    },
  ];

  return {
    status: "success",
    message: "🧠 Insights comunicacionales: 74/100 general, 2 alertas.",
    overall_score: 74,
    dimensions,
    alerts: [
      "3/5 canales activos. Canal dominante: email (62%).",
      "8 de 45 comunicaciones personalizadas (18%). Predomina comunicación genérica.",
    ],
    opportunities: [
      "Diversificá hacia WhatsApp y push para reducir dependencia del email.",
      "Incrementá comunicaciones segmentadas para mejorar engagement hasta 2x.",
      "Activá WhatsApp (98% apertura) y SMS para emergencias y recordatorios urgentes.",
    ],
    generated_at: now,
  };
}

// ── get_communication_health ─────────────────────────────

export function createMockCommunicationHealth(): get_communication_health_Contract {
  return {
    status: "success",
    message: "❤️ Health Score: 74/100 (healthy). Tendencia: improving.",
    health: {
      score: 74,
      level: "healthy",
      factors: {
        delivery: 96.2,
        diversity: 65.0,
        reliability: 88.5,
        frequency: 78.3,
        engagement: 42.1,
      },
      trend: "improving",
      benchmark_comparison: "Consistente con el promedio de clubes CR (70/100).",
    },
  };
}

// ── get_campaign_performance ─────────────────────────────

export function createMockCampaignPerformance(
  _params?: Record<string, unknown>,
): get_campaign_performance_Contract {
  const campaigns: CampaignPerformanceData_Contract[] = [
    {
      id: "campaign-001",
      name: "Campaña: Announcement",
      status: "active",
      channels: ["email", "push"],
      total_sent: 28,
      success_count: 27,
      success_rate: 96.4,
      engagement_score: 82.5,
    },
    {
      id: "campaign-002",
      name: "Campaña: Personalized",
      status: "active",
      channels: ["email", "whatsapp"],
      total_sent: 8,
      success_count: 8,
      success_rate: 100,
      engagement_score: 91.3,
    },
    {
      id: "campaign-003",
      name: "Campaña: Emergency",
      status: "active",
      channels: ["push", "sms", "whatsapp"],
      total_sent: 2,
      success_count: 2,
      success_rate: 100,
      engagement_score: 78.0,
    },
    {
      id: "campaign-004",
      name: "Campaña: Announcement Publish",
      status: "active",
      channels: ["email"],
      total_sent: 5,
      success_count: 5,
      success_rate: 100,
      engagement_score: 65.2,
    },
    {
      id: "campaign-005",
      name: "Campaña: Announcement Archive",
      status: "active",
      channels: ["email"],
      total_sent: 2,
      success_count: 2,
      success_rate: 100,
      engagement_score: 40.0,
    },
  ];

  return {
    status: "success",
    message: `📊 ${campaigns.length} campañas virtuales derivadas del historial.`,
    campaigns,
    summary: {
      total_campaigns: campaigns.length,
      total_sent: campaigns.reduce((sum, c) => sum + c.total_sent, 0),
      avg_engagement: Math.round(
        campaigns.reduce((sum, c) => sum + c.engagement_score, 0) /
          campaigns.length,
      ),
      top_channel: "email",
      top_type: campaigns[0]?.name ?? "N/A",
    },
    top_performers: campaigns.slice(0, 3),
    recommendations: [
      `Tu mejor rendimiento es '${campaigns[1]?.name}' (${campaigns[1]?.engagement_score} engagement). Replicá su estrategia en otras campañas.`,
      "Segmentá audiencias para mejorar engagement promedio.",
      "Usá múltiples canales (email + WhatsApp) para mayor alcance.",
    ],
  };
}
// ══════════════════════════════════════════════════════════
// FAMILIES — Intelligence Factories (F29)
// ══════════════════════════════════════════════════════════

// ── family_update_profile ─────────────────────────────────

export function createMockFamilyUpdateProfile(
  params?: Record<string, unknown>,
): FamilyUpdateMockResponse {
  return {
    status: "success",
    family: {
      id: (params?.family_id as string) ?? "fam-001",
      name: (params?.name as string) ?? "Familia Garcia",
      tier: (params?.tier as string) ?? "vip",
      status: "active",
      email: "garcia@castillo.cr",
      phone: "+50688881111",
      address: "Castillo Country Club, Casa 12",
      join_date: "2022-01-15",
      engagement_score: 85,
      referral_family_id: null,
      notes: null,
      members: [],
      created_at: "2022-01-15T00:00:00Z",
      updated_at: new Date().toISOString(),
      member_count: 4,
      age_groups_present: ["adult", "kids"],
    },
    message: "Perfil actualizado correctamente.",
  };
}

// ── family_lifecycle_analysis ─────────────────────────────

export function createMockFamilyLifecycleAnalysis(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").family_lifecycle_analysis_Contract {
  return {
    status: "success",
    data: {
      current_stage: "peak",
      stage_progress: 0.8,
      next_transition:
        "Mantener pico. Riesgo si engagement baja a <60 por >90 dias.",
      days_at_stage: 312,
      recommendations: [
        {
          action: "Mantener excelencia y buscar oportunidades de upgrade",
          priority: "low",
          expected_impact: "Consolidar fidelidad a largo plazo",
        },
        {
          action: "Introducir programa de embajadores para familias peak",
          priority: "medium",
          expected_impact: "+referrals orgánicos, +sentido de pertenencia",
        },
      ],
      confidence: 0.85,
    },
    message:
      "Familia Garcia esta en etapa 'peak'. Siguiente transicion: Mantener pico.",
  };
}

// ── family_360_insight ────────────────────────────────────

export function createMockFamily360Insight(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").family_360_insight_Contract {
  return {
    status: "success",
    data: {
      overall_score: 76,
      domains: [
        {
          domain: "engagement",
          score: 85,
          status: "exceptional",
          finding:
            "Engagement de 85/100. Excelente participacion con el club.",
          recommendation: "Mantener nivel actual",
        },
        {
          domain: "activity",
          score: 72,
          status: "healthy",
          finding:
            "8 actividades registradas. Historial rico con variedad.",
          recommendation: "Explorar nuevas categorias como wellness",
        },
        {
          domain: "social",
          score: 68,
          status: "healthy",
          finding:
            "2 conexiones sociales con fuerza promedio de 60%.",
          recommendation:
            "Facilitar nuevas conexiones en proximos eventos",
        },
        {
          domain: "financial",
          score: 78,
          status: "healthy",
          finding:
            "Score financiero saludable. LTV en crecimiento.",
          recommendation:
            "Evaluar upgrade de tier para maximizar beneficios",
        },
      ],
      top_insights: [
        "2 conexiones sociales con fuerza promedio de 60%. Facilitar nuevas conexiones en proximos eventos",
        "8 actividades registradas. Historial rico con variedad. Explorar nuevas categorias como wellness",
      ],
      cross_domain_correlations: [
        {
          domains: ["engagement", "social"],
          correlation: "Engagement alto con red social moderada",
          insight:
            "La familia participa activamente pero tiene margen para expandir su red social.",
          impact: "medium",
        },
      ],
      ai_summary:
        "Familia Garcia: Score 360 de 76/100. Fortaleza: engagement. Atencion: social. 2 conexiones activas.",
    },
    rag_citations: "",
    message:
      "Score 360 de Familia Garcia: 76/100. Top insight: red social expandible.",
  };
}

// ── family_social_graph_enriched ──────────────────────────

export function createMockFamilyEnrichedGraph(
  _params?: Record<string, unknown>,
) {
  return {
    status: "success",
    data: {
      familyId: "fam-001",
      familyName: "Familia Garcia",
      connections: [
        {
          connected_family_id: "fam-002",
          connected_family_name: "Familia Rodriguez",
          strength: 0.82,
          relationship: "Familias amigas — se conocen del padel",
          sharedActivities: ["Padel", "Cenas de club"],
          sharedEvents: 6,
          lastInteraction: "2026-05-15",
          connectedTier: "premium",
          connectedEngagement: 58,
          ai_insight:
            "Conexion fuerte — familia aliada para actividades conjuntas",
        },
        {
          connected_family_id: "fam-004",
          connected_family_name: "Familia Morales",
          strength: 0.45,
          relationship: "Se conocieron en evento de bienvenida",
          sharedActivities: ["Natacion"],
          sharedEvents: 2,
          lastInteraction: "2026-04-05",
          connectedTier: "premium",
          connectedEngagement: 45,
          ai_insight:
            "Conexion en crecimiento — oportunidad de fortalecer en proximo evento",
        },
      ],
      totalConnections: 2,
      clusters: [
        {
          id: "cl-001",
          name: "Cluster Padel",
          family_ids: ["fam-002"],
          common_interest: "Padel",
          avg_strength: 0.82,
        },
      ],
      suggestedConnections: [
        {
          familyId: "fam-003",
          familyName: "Familia Chen",
          tier: "basic",
          matchScore: 35,
          reason: "Comparten interes: Yoga, Wellness",
        },
      ],
    },
    message:
      "Grafo social de Familia Garcia: 2 conexiones, 1 cluster, 1 sugerencias.",
  };
}

// ── family_milestone_tracker ──────────────────────────────

export function createMockFamilyMilestoneTracker(
  _params?: Record<string, unknown>,
): import("@/shared/mocks/contracts").family_milestone_tracker_Contract {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const in3Months = new Date(today);
  in3Months.setMonth(in3Months.getMonth() + 3);

  return {
    status: "success",
    data: {
      upcoming: [
        {
          id: "ms-001",
          type: "birthday",
          title: "Cumpleanos de Sofia Garcia (8 anos)",
          date: nextWeek.toISOString().split("T")[0],
          days_until: 7,
          member_name: "Sofia Garcia",
          suggested_action: "Mencion personalizada en comunicacion del club",
          priority: "high",
        },
        {
          id: "ms-002",
          type: "anniversary",
          title: "5° Aniversario como socios",
          date: "2027-01-15",
          days_until: 222,
          member_name: null,
          suggested_action:
            "Tarjeta firmada por la Junta + cena especial con 5% descuento",
          priority: "medium",
        },
        {
          id: "ms-003",
          type: "birthday",
          title: "Cumpleanos de Diego Garcia (12 anos)",
          date: in3Months.toISOString().split("T")[0],
          days_until: 89,
          member_name: "Diego Garcia",
          suggested_action: "Mencion personalizada en comunicacion del club",
          priority: "low",
        },
        {
          id: "ms-004",
          type: "birthday",
          title: "Cumpleanos de Carlos Garcia (49 anos)",
          date: in3Months.toISOString().split("T")[0],
          days_until: 92,
          member_name: "Carlos Garcia",
          suggested_action: "Mencion personalizada en comunicacion del club",
          priority: "low",
        },
      ],
      recent: [],
      suggestions: [
        "Proximo hito: Cumpleanos de Sofia Garcia en 7 dias. Preparar accion.",
        "Familia con alto engagement — considerar como candidata a Embajador",
      ],
    },
    message:
      "4 hitos proximos para Familia Garcia. 2 sugerencias de celebracion.",
  };
}
// ── identify_social_clusters ──────────────────────────────

export function createMockIdentifySocialClusters(
  _params?: Record<string, unknown>,
): identify_social_clusters_Contract {
  return {
    status: "success",
    data: {
      total_families: 45,
      total_connections: 78,
      avg_connections_per_family: 1.7,
      social_density: 0.04,
      clusters: [
        {
          id: "cluster-001",
          name: "Cluster Padel",
          family_ids: ["fam-001", "fam-002", "fam-006", "fam-009"],
          common_interest: "Pádel",
          avg_strength: 0.74,
          cohesion_score: 0.82,
          suggested_event: "Torneo interno de pádel — Cluster Padel",
        },
        {
          id: "cluster-002",
          name: "Cluster Familias Jóvenes",
          family_ids: ["fam-001", "fam-003", "fam-007"],
          common_interest: "Actividades infantiles",
          avg_strength: 0.55,
          cohesion_score: 0.61,
          suggested_event: "Día de juegos familiares — fin de semana",
        },
      ],
      isolated_families: [
        {
          family_id: "fam-005",
          family_name: "Familia Vargas",
          tier: "premium",
          engagement: 42,
          suggestion: "Sin conexiones. Integrar a evento social del Cluster Padel.",
        },
        {
          family_id: "fam-008",
          family_name: "Familia Solano",
          tier: "plata",
          engagement: 28,
          suggestion: "Familia aislada con engagement bajo. Intervención prioritaria.",
        },
      ],
      cross_tier_connections: 12,
      integration_rate: 0.68,
    },
    message:
      "Club: 45 familias, 78 conexiones, 2 clusters. 2 familias aisladas requieren atención.",
  };
}
// ══════════════════════════════════════════════════════════════
//  CULTURAL SOCIAL — Factories (F31)
// ══════════════════════════════════════════════════════════════

// ── Shared mock data constants ──

const MOCK_CULTURAL_EVENTS = [
  {
    id: "evt-cs-001", name: "Noche de Gala Invernal", event_type: "gala",
    status: "confirmed", formality: "black_tie", venue: "Salón Principal",
    venue_type: "ballroom", date: "2026-07-15", start_time: "19:00",
    end_time: "23:30", organizer_member_id: "mem-010", description:
    "Gala formal de invierno con cena de 5 tiempos, orquesta en vivo y subasta benéfica.",
    guest_count: 150, budget: 8500000, menu_theme: "Cocina europea contemporánea",
    dress_code: "Etiqueta rigurosa — smoking o vestido largo.",
    entertainment_ids: ["act-001", "act-003"], notes: null, created_at: "2026-05-01T10:00:00Z",
  },
  {
    id: "evt-cs-002", name: "Gala de Fin de Año", event_type: "gala",
    status: "planned", formality: "white_tie", venue: "Jardín Central",
    venue_type: "garden", date: "2026-12-31", start_time: "20:00",
    end_time: "02:00", organizer_member_id: "mem-001", description:
    "La celebración más exclusiva del año. Cena gourmet, show de fuegos artificiales y DJ internacional.",
    guest_count: 200, budget: 12000000, menu_theme: "Fusión latinoasiática",
    dress_code: "White tie — vestido de gala o frac.",
    entertainment_ids: ["act-002"], notes: "Confirmar pirotécnico con 30 días de anticipación",
    created_at: "2026-06-01T08:00:00Z",
  },
  {
    id: "evt-cs-003", name: "Wine Tasting Friday", event_type: "cocktail",
    status: "confirmed", formality: "casual", venue: "Lounge del Club",
    venue_type: "lounge", date: "2026-07-04", start_time: "18:00",
    end_time: "21:00", organizer_member_id: "mem-015", description:
    "Degustación de vinos costarricenses y argentinos con maridaje de quesos artesanales.",
    guest_count: 40, budget: 450000, menu_theme: "Maridaje de quesos",
    dress_code: "Casual elegante", entertainment_ids: [], notes: null,
    created_at: "2026-06-10T14:00:00Z",
  },
  {
    id: "evt-cs-004", name: "Cena Temática: Sabores de Costa Rica", event_type: "themed_party",
    status: "confirmed", formality: "semi_formal", venue: "Restaurante Principal",
    venue_type: "lounge", date: "2026-07-18", start_time: "19:30",
    end_time: "22:30", organizer_member_id: "mem-022", description:
    "Recorrido gastronómico por las 7 provincias con platos típicos y música en vivo.",
    guest_count: 80, budget: 1200000, menu_theme: "Gastronomía tica",
    dress_code: "Semi-formal", entertainment_ids: ["act-004"], notes: null,
    created_at: "2026-06-05T09:00:00Z",
  },
  {
    id: "evt-cs-005", name: "Holiday Brunch Familiar", event_type: "brunch",
    status: "planned", formality: "casual", venue: "Terraza del Club",
    venue_type: "terrace", date: "2026-12-20", start_time: "10:00",
    end_time: "14:00", organizer_member_id: "mem-008", description:
    "Brunch navideño para toda la familia con actividades para niños, música villancicos y Santa Claus.",
    guest_count: 120, budget: 1800000, menu_theme: "Navideño",
    dress_code: "Casual", entertainment_ids: [], notes: "Inflables y pintura facial para niños",
    created_at: "2026-06-15T11:00:00Z",
  },
];

const MOCK_ENTERTAINMENT_ACTS = [
  {
    id: "act-001", artist_name: "Los Soneros de Pacífico", entertainment_type: "live_band",
    status: "contracted", genre: "Salsa / Cumbia / Cumbia chicha", description:
    "Banda de 8 músicos especializada en ritmos tropicales. Perfecta para galas y eventos sociales.",
    duration_minutes: 120, cost: 1500000, contact_person: "Carlos Mora",
    contact_phone: "8888-1234", requirements: ["Escenario 4x3m mínimo", "Sistema de sonido propio"],
    event_id: "evt-cs-001", notes: null,
  },
  {
    id: "act-002", artist_name: "DJ Sofía Vibe", entertainment_type: "dj",
    status: "contracted", genre: "Electronic / Lounge / Deep House", description:
    "DJ residente de los mejores clubes de Escazú. Set elegante para eventos premium.",
    duration_minutes: 180, cost: 800000, contact_person: "Manager — Andrea López",
    contact_phone: "8765-4321", requirements: ["DJ booth", "Luces LED programables"],
    event_id: "evt-cs-002", notes: "Toca regularmente en Vertigo y Chubbs",
  },
  {
    id: "act-003", artist_name: "Cuarteto Clásico Castillo", entertainment_type: "cultural_performance",
    status: "confirmed", genre: "Clásica / Chamber Music", description:
    "Cuarteto de cuerdas con repertorio de cámara europeo y costarricense contemporáneo.",
    duration_minutes: 90, cost: 600000, contact_person: "Maestra Lucía Solano",
    contact_phone: "8555-9876", requirements: ["Piano de cola disponible", "Iluminación cálida"],
    event_id: "evt-cs-001", notes: null,
  },
  {
    id: "act-004", artist_name: "Compañía de Danza Folklórica", entertainment_type: "dance_performance",
    status: "proposed", genre: "Folclor costarricense / Danza tradicional", description:
    "Ensamble de 12 bailarines con vestuario típico. Presentan danzas de todas las provincias.",
    duration_minutes: 45, cost: 1200000, contact_person: "Directora — Marielos Quesada",
    contact_phone: "8333-4567", requirements: ["Escenario 6x4m", "Vestidor para 12 personas"],
    event_id: null, notes: "Ideal para Fiestas Patrias y eventos temáticos",
  },
  {
    id: "act-005", artist_name: "Pablo Herrera Comedy", entertainment_type: "comedian",
    status: "proposed", genre: "Stand-up comedy en español", description:
    "Comediante costarricense con shows limpios para audiencias familiares y corporativas.",
    duration_minutes: 60, cost: 600000, contact_person: "Pablo Herrera",
    contact_phone: "8999-1122", requirements: ["Micrófono inalámbrico", "Iluminación de spotlight"],
    event_id: null, notes: null,
  },
];

const MOCK_CULTURAL_PROGRAMS = [
  {
    id: "prog-001", name: "Serie Jazz en el Jardín", category: "music",
    description: "Ciclo mensual de conciertos de jazz al aire libre con artistas nacionales e internacionales.",
    season: "Verano 2026", start_date: "2026-01-15", end_date: "2026-03-15",
    coordinator_member_id: "mem-012", max_participants: 60, current_participants: 48,
    budget: 2500000, status: "completed", event_ids: [], notes: "Excelente recepción — repetir en 2027",
  },
  {
    id: "prog-002", name: "Taller de Acuarela Tropical", category: "visual_arts",
    description: "Taller de 4 sesiones para aprender técnicas de acuarela con temática de flora costarricense.",
    season: "Verano 2026", start_date: "2026-02-01", end_date: "2026-02-28",
    coordinator_member_id: "mem-020", max_participants: 20, current_participants: 20,
    budget: 800000, status: "completed", event_ids: [], notes: "Lista de espera de 8 personas",
  },
  {
    id: "prog-003", name: "Club de Lectura Nocturno", category: "literature",
    description: "Encuentro quincenal para discutir literatura latinoamericana contemporánea con guía experto.",
    season: "Invierno 2026", start_date: "2026-06-01", end_date: "2026-08-31",
    coordinator_member_id: "mem-018", max_participants: 25, current_participants: 18,
    budget: 350000, status: "active", event_ids: [], notes: null,
  },
  {
    id: "prog-004", name: "Cocina Costarricense: De la Finca a la Mesa", category: "gastronomy",
    description: "Serie de 6 talleres prácticos de cocina tica con chefs invitados. Ingredientes de productores locales.",
    season: "Invierno 2026", start_date: "2026-07-01", end_date: "2026-09-30",
    coordinator_member_id: "mem-025", max_participants: 16, current_participants: 12,
    budget: 1200000, status: "enrolling", event_ids: [], notes: "Patrocinado por Café Dota",
  },
];

const MOCK_EXHIBITIONS = [
  {
    id: "exh-001", title: "Colores de Costa Rica", artist_name: "María Fernández Rojas",
    category: "visual_arts", description: "Acuarelas y óleos inspirados en los paisajes del Pacífico sur.",
    venue: "Lounge del Club", venue_type: "lounge", start_date: "2026-06-01",
    end_date: "2026-06-30", status: "active", num_pieces: 45,
    curator_member_id: "mem-030", opening_reception: true, notes: null,
  },
  {
    id: "exh-002", title: "Esculturas del Valle Central", artist_name: "Roberto Jiménez Mora",
    category: "visual_arts", description: "Esculturas en piedra volcánica y metal reciclado.",
    venue: "Jardín Principal", venue_type: "garden", start_date: "2026-07-15",
    end_date: "2026-08-15", status: "scheduled", num_pieces: 12,
    curator_member_id: "mem-030", opening_reception: false, notes: "Logística de transporte pesado",
  },
  {
    id: "exh-003", title: "Fotografía: Vida Silvestre del Pacífico", artist_name: "Ana Chen Montero",
    category: "visual_arts", description: "Fotografía de naturaleza de la zona marina del Pacífico costarricense.",
    venue: "Galería Interior", venue_type: "auditorium", start_date: "2026-05-01",
    end_date: "2026-05-31", status: "dismantled", num_pieces: 30,
    curator_member_id: "", opening_reception: true, notes: "Muy visitada — considerar tour virtual",
  },
];

// ── Factory: get_cultural_calendar ──

export function createMockCulturalCalendar(): {
  status: string; message: string;
  data: {
    calendar: Array<Record<string, unknown>>;
    total_items: number;
    summary: { event: number; exhibition: number; program: number };
    conflicts: Array<{ date: string; venue: string; items: string[]; count: number }>;
    has_conflicts: boolean;
  };
} {
  const calendarItems: Array<Record<string, unknown>> = [];

  for (const ev of MOCK_CULTURAL_EVENTS) {
    if (ev.status !== "cancelled") {
      calendarItems.push({
        title: ev.name, type: "event", event_type: ev.event_type,
        date: ev.date, start_time: ev.start_time, end_time: ev.end_time,
        venue: ev.venue, venue_type: ev.venue_type, status: ev.status,
        formality: ev.formality, description: ev.description,
        guest_count: ev.guest_count, budget: ev.budget,
      });
    }
  }

  for (const ex of MOCK_EXHIBITIONS) {
    if (ex.status !== "cancelled") {
      calendarItems.push({
        title: ex.title, type: "exhibition", category: ex.category,
        date: ex.start_date, end_date: ex.end_date, venue: ex.venue,
        venue_type: ex.venue_type, status: ex.status, description: ex.description,
        artist: ex.artist_name, num_pieces: ex.num_pieces,
        opening_reception: ex.opening_reception,
      });
    }
  }

  for (const prog of MOCK_CULTURAL_PROGRAMS) {
    if (prog.status !== "cancelled") {
      calendarItems.push({
        title: prog.name, type: "program", category: prog.category,
        date: prog.start_date, end_date: prog.end_date, venue: "",
        status: prog.status, description: prog.description,
        season: prog.season,
        enrollment: `${prog.current_participants}/${prog.max_participants}`,
        budget: prog.budget,
      });
    }
  }

  calendarItems.sort((a, b) => (a.date as string).localeCompare(b.date as string));

  const summary = { event: 0, exhibition: 0, program: 0 };
  for (const item of calendarItems) {
    const t = item.type as string;
    if (t in summary) summary[t as keyof typeof summary]++;
  }

  // Conflict: Gala Invernal (Jul 15, Ballroom) vs Esculturas (Jul 15, Garden) — same date
  const conflicts = [
    { date: "2026-07-15", venue: "Múltiples", items: ["Noche de Gala Invernal", "Esculturas del Valle Central"], count: 2 },
  ];

  return {
    status: "success",
    message: `📅 Calendario cultural: ${calendarItems.length} actividad(es) programada(s).`,
    data: {
      calendar: calendarItems,
      total_items: calendarItems.length,
      summary,
      conflicts,
      has_conflicts: conflicts.length > 0,
    },
  };
}

// ── Factory: manage_social_events ──

export function createMockSocialEvents(params?: Record<string, unknown>): {
  status: string; message: string; data: Record<string, unknown>;
} {
  if (params?.action === "create") {
    return {
      status: "success",
      message: `🎉 Evento '${params.name ?? "Nuevo Evento"}' creado exitosamente.`,
      data: {
        event: {
          id: `evt-cs-${Date.now().toString(36)}`, name: params.name ?? "Nuevo Evento",
          event_type: params.event_type ?? "dinner", status: "planned",
          venue: params.venue ?? "Lounge", venue_type: params.venue_type ?? "lounge",
          date: params.date ?? "2026-07-25", start_time: params.start_time ?? "19:00",
          end_time: params.end_time ?? "22:00", formality: params.formality ?? "semi_formal",
          guest_count: params.guest_count ?? 50, budget: params.budget ?? 500000,
        },
      },
    };
  }

  return {
    status: "success",
    message: `📋 Encontramos ${MOCK_CULTURAL_EVENTS.length} eventos culturales.`,
    data: { events: MOCK_CULTURAL_EVENTS },
  };
}

// ── Factory: manage_cultural_program ──

export function createMockCulturalPrograms(params?: Record<string, unknown>): {
  status: string; message: string; data: Record<string, unknown>;
} {
  if (params?.action === "create") {
    return {
      status: "pending_approval",
      message: `🎨 Programa '${params.name ?? "Nuevo Programa"}' creado. Esperando aprobación del administrador.`,
      data: {
        request_id: `mock-req-${Date.now().toString(36)}`,
        details: { name: params.name, category: params.category, season: params.season },
      },
    };
  }

  return {
    status: "success",
    message: `📋 Encontramos ${MOCK_CULTURAL_PROGRAMS.length} programas culturales.`,
    data: { programs: MOCK_CULTURAL_PROGRAMS },
  };
}

// ── Factory: manage_entertainment_acts ──

export function createMockEntertainmentActs(params?: Record<string, unknown>): {
  status: string; message: string; data: Record<string, unknown>;
} {
  if (params?.action === "create") {
    return {
      status: "pending_approval",
      message: `🎪 Artista '${params.artist_name ?? "Nuevo Artista"}' registrado. Esperando aprobación del administrador.`,
      data: {
        request_id: `mock-req-${Date.now().toString(36)}`,
        details: { artist_name: params.artist_name, entertainment_type: params.entertainment_type, cost: params.cost },
      },
    };
  }

  return {
    status: "success",
    message: `📋 Encontramos ${MOCK_ENTERTAINMENT_ACTS.length} actos de entretenimiento.`,
    data: { acts: MOCK_ENTERTAINMENT_ACTS },
  };
}

// ── Factory: manage_art_exhibitions ──

export function createMockArtExhibitions(params?: Record<string, unknown>): {
  status: string; message: string; data: Record<string, unknown>;
} {
  if (params?.action === "create") {
    return {
      status: "success",
      message: `🖼️ Exposición '${params.title ?? "Nueva Exposición"}' creada exitosamente.`,
      data: {
        exhibition: {
          id: `exh-${Date.now().toString(36)}`, title: params.title ?? "Nueva Exposición",
          artist_name: params.artist_name ?? "Artista", category: params.category ?? "visual_arts",
          venue: params.venue ?? "Lounge", venue_type: params.venue_type ?? "lounge",
          start_date: params.start_date ?? "2026-08-01", end_date: params.end_date ?? "2026-08-31",
          status: "scheduled", num_pieces: params.num_pieces ?? 20,
        },
      },
    };
  }

  return {
    status: "success",
    message: `🖼️ Encontramos ${MOCK_EXHIBITIONS.length} exposiciones.`,
    data: { exhibitions: MOCK_EXHIBITIONS },
  };
}

// ── Factory: organize_formal_gala (always HITL) ──

export function createMockCulturalHITL(params?: Record<string, unknown>): {
  status: string; message: string; data: Record<string, unknown>;
} {
  return {
    status: "pending_approval",
    message: `🎭 Gala '${params?.name ?? "Nueva Gala"}' creada. Esperando aprobación del administrador.`,
    data: {
      request_id: `mock-req-${Date.now().toString(36)}`,
      details: {
        name: params?.name ?? "Nueva Gala", venue: params?.venue ?? "Salón Principal",
        formality: params?.formality ?? "black_tie", guest_count: params?.guest_count ?? 100,
        budget: params?.budget ?? 5000000,
      },
    },
  };
}

// ── Factory: get_cultural_analytics (9 dimensions) ──

export function createMockCulturalAnalytics(): {
  status: string; message: string; data: Record<string, unknown>;
} {
  return {
    status: "success",
    message: "📊 Análisis cultural: 6 categorías, 6 venues, 5 tipos de entretenimiento.",
    data: {
      // D1: Category Performance
      category_performance: [
        { category: "music", event_count: 3, total_attendance: 120, avg_attendance: 40,
          total_budget: 3100000, avg_budget_per_event: 1033333, engagement_score: 82 },
        { category: "gastronomy", event_count: 2, total_attendance: 96, avg_attendance: 48,
          total_budget: 1650000, avg_budget_per_event: 825000, engagement_score: 88 },
        { category: "visual_arts", event_count: 2, total_attendance: 45, avg_attendance: 22,
          total_budget: 800000, avg_budget_per_event: 400000, engagement_score: 65 },
        { category: "literature", event_count: 1, total_attendance: 18, avg_attendance: 18,
          total_budget: 350000, avg_budget_per_event: 350000, engagement_score: 55 },
      ],
      // D2: Venue Utilization
      venue_utilization: [
        { venue: "Salón Principal", venue_type: "ballroom", total_bookings: 4, total_guests: 350,
          avg_guests: 87.5, total_budget: 18500000, utilization_rate: 35 },
        { venue: "Lounge del Club", venue_type: "lounge", total_bookings: 6, total_guests: 180,
          avg_guests: 30, total_budget: 2250000, utilization_rate: 52 },
        { venue: "Jardín Central", venue_type: "garden", total_bookings: 3, total_guests: 280,
          avg_guests: 93, total_budget: 14000000, utilization_rate: 26 },
        { venue: "Terraza del Club", venue_type: "terrace", total_bookings: 2, total_guests: 140,
          avg_guests: 70, total_budget: 2400000, utilization_rate: 17 },
      ],
      // D3: Entertainment ROI
      entertainment_roi: [
        { entertainment_type: "live_band", total_acts: 3, contracted: 2, contracted_rate: 66.7,
          total_cost: 3200000, avg_cost: 1066667, total_duration: 300, cost_per_minute: 10667 },
        { entertainment_type: "dj", total_acts: 2, contracted: 1, contracted_rate: 50,
          total_cost: 1400000, avg_cost: 700000, total_duration: 360, cost_per_minute: 3889 },
        { entertainment_type: "cultural_performance", total_acts: 1, contracted: 1,
          contracted_rate: 100, total_cost: 600000, avg_cost: 600000,
          total_duration: 90, cost_per_minute: 6667 },
      ],
      // D4: Attendance Trends
      attendance_trend: "up", attendance_trend_pct: 12.5,
      avg_attendance_30d: 75, total_events_30d: 3,
      // D5: Budget Analysis
      total_budget_planned: 35000000, total_budget_spent: 22500000,
      budget_utilization_pct: 64.3, budget_variance_pct: -15.2,
      // D6: Seasonal Patterns
      seasonal_patterns: [
        { season: "Verano 2026", program_count: 2, total_budget: 3300000,
          total_participants: 68, max_participants: 80, enrollment_rate: 85, top_category: "music" },
        { season: "Invierno 2026", program_count: 2, total_budget: 1550000,
          total_participants: 30, max_participants: 41, enrollment_rate: 73.2, top_category: "gastronomy" },
      ],
      current_season: "Invierno 2026",
      // D7: Program Enrollment
      total_programs: 4, active_programs: 2, avg_enrollment_pct: 72.8,
      programs_below_threshold: 0,
      // D8: Exhibition Engagement
      total_exhibitions: 3, active_exhibitions: 1, avg_exhibition_duration_days: 30.3,
      exhibitions_with_reception_pct: 66.7,
      // D9: Cross-domain Signals
      cross_domain_signals: [
        "Alta demanda en gastronomía — 100% fill rate en taller anterior, lista de espera activa",
        "Sin programas de danza — categoría con potencial según interés demográfico",
        "Lounge es el venue más usado — considerar programación recurrente para crear rutina",
        "12 socios nuevos en Q3 sin asistencia a eventos culturales — oportunidad de invitación dirigida",
      ],
    },
  };
}

// ── Factory: get_cultural_summary ──

export function createMockCulturalSummary(): {
  status: string; message: string; data: Record<string, unknown>;
} {
  return {
    status: "success",
    message: "🎭 Resumen cultural: 3 eventos próximos, 1 exposición activa, 2 programas activos.",
    data: {
      upcoming_events_30d: 3, active_exhibitions: 1, active_programs: 2,
      total_entertainment_acts: 5, total_budget: 35000000, budget_utilized_pct: 64.3,
      cultural_health_score: 72, health_level: "saludable",
      next_gala: {
        name: "Noche de Gala Invernal", date: "2026-07-15",
        venue: "Salón Principal", formality: "black_tie", guest_count: 150,
      },
      featured_exhibition: {
        title: "Colores de Costa Rica", artist: "María Fernández Rojas",
        venue: "Lounge del Club", end_date: "2026-06-30",
      },
      top_program: {
        name: "Cocina Costarricense: De la Finca a la Mesa",
        category: "gastronomy", enrollment: "12/16 (75%)",
      },
      alerts: [
        "Exposición 'Colores de Costa Rica' finaliza el 30 de junio — considerar evento de clausura",
      ],
      events_this_week: 1, events_next_week: 0,
    },
  };
}

// ── Factory: generate_cultural_proposals (THE GAME CHANGER) ──

export function createMockCulturalProposals(): {
  status: string; message: string; data: Record<string, unknown>;
} {
  return {
    status: "success",
    message: "🎯 5 propuestas de engagement cultural para all.",
    data: {
      proposals: [
        {
          id: "prop-001", category: "lifestyle_integration",
          title: "Coworking & Coffee: Mañanas Productivas en el Club",
          description: "Convertir el Lounge en espacio de coworking de 7am-12pm de lunes a viernes para profesionales remotos. Café premium incluido, WiFi de alta velocidad, ambiente lounge. Los socios que hoy trabajan desde casa o cafeterías externalizan esta actividad — traerla al club aumenta visitas semanales de 2 a 5.",
          target_members: [], target_families: [], target_demographic: "young_professionals",
          venue_recommendation: "Lounge del Club — 7:00-12:00 L-V",
          expected_impact: { attendance_estimate: 25, engagement_lift_pct: 40, revenue_potential_crc: 3500000 },
          cross_domain: {
            finance_budget_estimate: 500000, communication_campaign_idea: "Campaña email + WhatsApp: 'Tu oficina con vista al jardín'",
            related_events: ["Wine Tasting Friday"], family_connection: "Padres trabajan, niños en actividades del club",
            wellness_integration: "Sesiones de yoga matutinas como complemento",
          },
          confidence: 85, implementation_effort: "low", suggested_timeline: "this_month",
          action_steps: [
            "Habilitar WiFi dedicado en Lounge (50Mbps mínimo)",
            "Configurar estaciones de trabajo (enchufes, escritos ajustables)",
            "Crear paquete mensual: ₡45,000/mes incluye café + workspace",
            "Lanzar campaña de comunicación: 'Castillo Cowork'",
          ],
        },
        {
          id: "prop-002", category: "targeted_invitation",
          title: "Invitación Personalizada: 12 Socios Nuevos sin Vida Cultural",
          description: "12 socios que se unieron en Q3 2025 y no han asistido a ningún evento cultural. Análisis de sus perfiles muestra interés en gastronomía (8) y música (6). Invitarlos a 'Cena Temática: Sabores de Costa Rica' con un welcome drink personalizado y presentación de otros socios con intereses similares.",
          target_members: ["mem-045", "mem-048", "mem-051", "mem-055", "mem-060", "mem-063",
                          "mem-067", "mem-070", "mem-072", "mem-075", "mem-078", "mem-080"],
          target_families: [], target_demographic: "all",
          venue_recommendation: "Restaurante Principal",
          expected_impact: { attendance_estimate: 10, engagement_lift_pct: 60, revenue_potential_crc: 1200000 },
          cross_domain: {
            finance_budget_estimate: 180000, communication_campaign_idea: "Email personalizado + llamada del concierge",
            related_events: ["Cena Temática: Sabores de Costa Rica"],
            family_connection: "Incluir familias en la invitación — niños bienvenidos",
            wellness_integration: "",
          },
          confidence: 78, implementation_effort: "low", suggested_timeline: "immediate",
          action_steps: [
            "Generar lista de 12 socios con perfil de interés gastronómico",
            "Enviar invitación personalizada con nombre y mención de su interés",
            "Reservar mesa de bienvenida con anfitrión designado",
            "Follow-up post-evento: encuesta + invitación al Club de Lectura",
          ],
        },
        {
          id: "prop-003", category: "group_cohesion",
          title: "Wine Club de Castillo: Comunidad Mensual de Enófilos",
          description: "Crear un club interno de vino con reunión mensual: degustación + charla de sommelier + cata a ciegas. Los 40 asistentes regulares de Wine Tasting Friday son la base. El club crea pertenencia, rutina de visita mensual y revenue recurrente de ₡35,000 por socio por sesión.",
          target_members: [], target_families: [], target_demographic: "all",
          venue_recommendation: "Lounge del Club — último viernes de cada mes",
          expected_impact: { attendance_estimate: 35, engagement_lift_pct: 25, revenue_potential_crc: 4200000 },
          cross_domain: {
            finance_budget_estimate: 800000, communication_campaign_idea: "Branding premium: 'Wine Club Castillo — Por invitación'",
            related_events: ["Wine Tasting Friday"],
            family_connection: "Evento solo adultos — complementar con Kids Night para padres",
            wellness_integration: "",
          },
          confidence: 82, implementation_effort: "medium", suggested_timeline: "this_month",
          action_steps: [
            "Diseñar identidad visual del Wine Club (logo, invitación exclusiva)",
            "Invitar a los 40 asistentes regulares de Wine Tasting como miembros fundadores",
            "Seleccionar primer sommelier invitado (contactar CAVAS del Río)",
            "Establecer membresía: ₡35,000/mes o ₡350,000/anual",
          ],
        },
        {
          id: "prop-004", category: "space_activation",
          title: "Galería Itinerante: Cada Rincón del Club es un Espacio de Arte",
          description: "Rotar obras de artistas costarricenses por los pasillos, restaurant y áreas comunes del club. No requiere una exposición formal — es arte ambiental que transforma la experiencia del socio cada día. Los artistas pueden vender obras, el club recibe comisión del 15%.",
          target_members: [], target_families: [], target_demographic: "all",
          venue_recommendation: "Pasillos, restaurante, lobby — rotación trimestral",
          expected_impact: { attendance_estimate: 0, engagement_lift_pct: 15, revenue_potential_crc: 900000 },
          cross_domain: {
            finance_budget_estimate: 200000, communication_campaign_idea: "Spotlight mensual: 'El artista del mes en Castillo'",
            related_events: ["Colores de Costa Rica", "Esculturas del Valle Central"],
            family_connection: "Arte accesible para niños — tour guiado familiar",
            wellness_integration: "El arte mejora el bienestar percibido del espacio",
          },
          confidence: 70, implementation_effort: "medium", suggested_timeline: "this_season",
          action_steps: [
            "Contactar 3 galerías de San José para propuesta de alianza",
            "Definir espacios del club aptos para exhibición (con medición de luz)",
            "Crear acuerdo de consignación: artista 85%, club 15%",
            "Lanzar con evento de inauguración: 'Arte Vivo en Castillo'",
          ],
        },
        {
          id: "prop-005", category: "activity_proposal",
          title: "Taller Familiar: Cocina Navideña Tica — De la Olla a la Mesa",
          description: "Taller práctico de cocina para familias donde padres e hijos preparan platos navideños costarricense juntos: tamales, rompompón, queque navideño. Refuerza tradiciones, crea recuerdos familiares en el club y posiciona a Castillo como el lugar donde la familia celebra. Máximo 10 familias.",
          target_members: [], target_families: ["fam-003", "fam-007", "fam-012", "fam-015"],
          target_demographic: "families",
          venue_recommendation: "Cocina del Restaurante — Sábado 14:00-18:00",
          expected_impact: { attendance_estimate: 40, engagement_lift_pct: 35, revenue_potential_crc: 800000 },
          cross_domain: {
            finance_budget_estimate: 300000, communication_campaign_idea: "WhatsApp familias: 'Crean recuerdos navideños juntos en Castillo'",
            related_events: ["Holiday Brunch Familiar"],
            family_connection: "Conecta con Holiday Brunch — los participantes se inscriben al brunch",
            wellness_integration: "Cocinar juntos fortalece vínculos familiares",
          },
          confidence: 88, implementation_effort: "low", suggested_timeline: "next_season",
          action_steps: [
            "Contactar chef del club para diseñar el taller",
            "Comprar ingredientes para 10 familias (₡150,000)",
            "Enviar invitación a familias con niños 6-14 años",
            "Crear recetario digital como recuerdo del taller",
          ],
        },
      ],
      engagement_score: 58,
      total_proposals: 5,
      focus_area: "all",
      priority_ranking: [
        "Invitación Personalizada: 12 Socios Nuevos sin Vida Cultural",
        "Taller Familiar: Cocina Navideña Tica",
        "Coworking & Coffee: Mañanas Productivas en el Club",
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORTS & RECREATION FACTORIES (F32 — 11 tools)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function timeAt(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ── manage_court_reservations ─────────────────────────────────────────────────

export function createMockManageCourtReservations(
  params?: Record<string, unknown>
): ManageCourtReservations_Contract {
  const action = (params?.action as string) ?? "create";
  const court = (params?.court_name as string) ?? "Cancha Tennis 1";
  const member = (params?.member_name as string) ?? "María Rodríguez";

  if (action === "cancel") {
    return {
      status: "success",
      message: `🎾 La reserva de ${court} ha sido cancelada exitosamente.`,
      reservation: {
        id: "res_mock_001",
        court_name: court,
        sport: (params?.sport as string) ?? "tennis",
        member_id: (params?.member_id as string) ?? "mbr-001",
        member_name: member,
        date: futureDate(1),
        start_time: timeAt(16),
        end_time: timeAt(17),
        status: "inactive",
        purpose: "regular",
        notes: null,
        created_at: new Date().toISOString(),
      },
    };
  }

  return {
    status: "success",
    message: `🎾 Cancha ${court} reservada para ${member} el ${futureDate(1)}.`,
    reservation: {
      id: `res_mock_${Date.now().toString(36)}`,
      court_name: court,
      sport: (params?.sport as string) ?? "tennis",
      member_id: (params?.member_id as string) ?? "mbr-001",
      member_name: member,
      date: (params?.date as string) ?? futureDate(1),
      start_time: (params?.start_time as string) ?? timeAt(16),
      end_time: (params?.end_time as string) ?? timeAt(17),
      status: "confirmed",
      purpose: (params?.purpose as string) ?? "regular",
      notes: (params?.notes as string) ?? null,
      created_at: new Date().toISOString(),
    },
  };
}

// ── organize_tournament ───────────────────────────────────────────────────────

export function createMockOrganizeTournament(
  params?: Record<string, unknown>
): OrganizeTournament_Contract {
  return {
    status: "pending_approval",
    message: `🏆 Torneo '${params?.name ?? "Copa Castillo Tennis"}' creado. Esperando aprobación del administrador.`,
    request_id: `mock-req-${Date.now().toString(36)}`,
    details: {
      name: (params?.name as string) ?? "Copa Castillo Tennis",
      sport: (params?.sport as string) ?? "tennis",
      format: (params?.format as string) ?? "single_elimination",
      start_date: futureDate(21),
      end_date: futureDate(23),
      max_participants: 16,
      venue: "Cancha Tennis 1 & 2",
      entry_fee: 25000,
      prizes: ["₡150.000 Primer Lugar", "₡75.000 Segundo Lugar", "₡25.000 Tercer Lugar"],
    },
  };
}

// ── manage_fitness_classes ────────────────────────────────────────────────────

export function createMockManageFitnessClasses(
  params?: Record<string, unknown>
): ManageFitnessClasses_Contract {
  const action = (params?.action as string) ?? "list";

  if (action === "get") {
    return {
      status: "success",
      message: "Clase encontrada",
      fitness_class: {
        id: (params?.class_id as string) ?? "cls-001",
        name: "Yoga Matutino",
        sport: "yoga",
        class_type: "group",
        instructor: "Ana Vargas",
        skill_level: "all_levels",
        schedule_day: "Lunes",
        schedule_time: timeAt(7),
        duration_minutes: 60,
        max_capacity: 20,
        current_enrolled: 18,
        location: "Salón Wellness",
        equipment_needed: ["mat de yoga", "bloques"],
        is_active: true,
        created_at: new Date().toISOString(),
      },
    };
  }

  return {
    status: "success",
    message: "📋 Encontramos 6 clases de fitness.",
    classes: [
      {
        id: "cls-001", name: "Yoga Matutino", sport: "yoga", class_type: "group",
        instructor: "Ana Vargas", skill_level: "all_levels", schedule_day: "Lunes",
        schedule_time: timeAt(7), duration_minutes: 60, max_capacity: 20,
        current_enrolled: 18, location: "Salón Wellness", equipment_needed: ["mat", "bloques"],
        is_active: true, created_at: new Date().toISOString(),
      },
      {
        id: "cls-002", name: "Spinning Intenso", sport: "fitness", class_type: "group",
        instructor: "Carlos Mora", skill_level: "intermediate", schedule_day: "Martes",
        schedule_time: timeAt(18), duration_minutes: 45, max_capacity: 20,
        current_enrolled: 15, location: "Gimnasio Principal", equipment_needed: ["bicicleta spinning"],
        is_active: true, created_at: new Date().toISOString(),
      },
      {
        id: "cls-003", name: "Pilates Reformer", sport: "pilates", class_type: "semi_private",
        instructor: "Laura Méndez", skill_level: "all_levels", schedule_day: "Miércoles",
        schedule_time: timeAt(10), duration_minutes: 50, max_capacity: 15,
        current_enrolled: 8, location: "Studio Pilates", equipment_needed: ["reformer"],
        is_active: true, created_at: new Date().toISOString(),
      },
      {
        id: "cls-004", name: "Tennis Grupal", sport: "tennis", class_type: "group",
        instructor: "Roberto Sánchez", skill_level: "beginner", schedule_day: "Jueves",
        schedule_time: timeAt(16), duration_minutes: 90, max_capacity: 16,
        current_enrolled: 5, location: "Cancha Tennis 2", equipment_needed: ["raqueta"],
        is_active: true, created_at: new Date().toISOString(),
      },
      {
        id: "cls-005", name: "Aqua Fitness", sport: "swimming", class_type: "group",
        instructor: "Patricia Solano", skill_level: "all_levels", schedule_day: "Viernes",
        schedule_time: timeAt(9), duration_minutes: 45, max_capacity: 15,
        current_enrolled: 12, location: "Piscina Semi-olímpica", equipment_needed: ["noodle", "pesas acuáticas"],
        is_active: true, created_at: new Date().toISOString(),
      },
      {
        id: "cls-006", name: "CrossFit WOD", sport: "fitness", class_type: "group",
        instructor: "Diego Fuentes", skill_level: "advanced", schedule_day: "Sábado",
        schedule_time: timeAt(8), duration_minutes: 60, max_capacity: 12,
        current_enrolled: 11, location: "Gimnasio Functional", equipment_needed: ["kettlebell", "barra"],
        is_active: true, created_at: new Date().toISOString(),
      },
    ],
  };
}

// ── coordinate_coaching ───────────────────────────────────────────────────────

export function createMockCoordinateCoaching(
  params?: Record<string, unknown>
): CoordinateCoaching_Contract {
  const action = (params?.action as string) ?? "list";

  if (action === "create") {
    return {
      status: "success",
      message: `🎾 Sesión con ${(params?.coach_name as string) ?? "Roberto Sánchez"} programada para ${futureDate(3)}.`,
      session: {
        id: `coach_mock_${Date.now().toString(36)}`,
        sport: (params?.sport as string) ?? "tennis",
        coach_name: (params?.coach_name as string) ?? "Roberto Sánchez",
        member_id: (params?.member_id as string) ?? "mbr-001",
        member_name: (params?.member_name as string) ?? "María Rodríguez",
        skill_level: (params?.skill_level as string) ?? "intermediate",
        date: (params?.date as string) ?? futureDate(3),
        start_time: (params?.start_time as string) ?? timeAt(10),
        end_time: (params?.end_time as string) ?? timeAt(11),
        location: (params?.location as string) ?? "Cancha Tennis 1",
        focus_areas: ["saque", "volea", "juego de pies"],
        notes: null,
        status: "scheduled",
        created_at: new Date().toISOString(),
      },
    };
  }

  return {
    status: "success",
    message: "📋 Encontramos 5 sesiones de coaching.",
    sessions: [
      {
        id: "coach-001", sport: "tennis", coach_name: "Roberto Sánchez",
        member_id: "mbr-001", member_name: "María Rodríguez", skill_level: "intermediate",
        date: futureDate(1), start_time: timeAt(10), end_time: timeAt(11),
        location: "Cancha Tennis 1", focus_areas: ["saque", "volea"], notes: null,
        status: "scheduled", created_at: new Date().toISOString(),
      },
      {
        id: "coach-002", sport: "golf", coach_name: "Laura Mora",
        member_id: "mbr-003", member_name: "Andrés Montero", skill_level: "beginner",
        date: futureDate(2), start_time: timeAt(8), end_time: timeAt(9, 30),
        location: "Driving Range", focus_areas: ["swing", "putting"], notes: "Primera sesión",
        status: "scheduled", created_at: new Date().toISOString(),
      },
      {
        id: "coach-003", sport: "padel", coach_name: "Diego Fuentes",
        member_id: "mbr-005", member_name: "Valentina Solís", skill_level: "advanced",
        date: futureDate(3), start_time: timeAt(17), end_time: timeAt(18),
        location: "Cancha de Pádel", focus_areas: ["bandeja", "víbora", "posición"], notes: null,
        status: "scheduled", created_at: new Date().toISOString(),
      },
      {
        id: "coach-004", sport: "tennis", coach_name: "Roberto Sánchez",
        member_id: "mbr-007", member_name: "Felipe Alvarado", skill_level: "advanced",
        date: futureDate(4), start_time: timeAt(16), end_time: timeAt(17),
        location: "Cancha Tennis 2", focus_areas: ["revés", "táctica"], notes: null,
        status: "scheduled", created_at: new Date().toISOString(),
      },
      {
        id: "coach-005", sport: "swimming", coach_name: "Patricia Solano",
        member_id: "mbr-010", member_name: "Sofía Brenes", skill_level: "beginner",
        date: futureDate(5), start_time: timeAt(9), end_time: timeAt(10),
        location: "Piscina Semi-olímpica", focus_areas: ["crol", "respiración"], notes: null,
        status: "scheduled", created_at: new Date().toISOString(),
      },
    ],
  };
}

// ── manage_sport_leagues ──────────────────────────────────────────────────────

export function createMockManageSportLeagues(
  params?: Record<string, unknown>
): ManageSportLeagues_Contract {
  const action = (params?.action as string) ?? "list";

  if (action === "create") {
    return {
      status: "pending_approval",
      message: `⚽ Liga '${params?.name ?? "Liga de Tennis"}' creada. Esperando aprobación del administrador.`,
      request_id: `mock-req-${Date.now().toString(36)}`,
      details: {
        name: (params?.name as string) ?? "Liga de Tennis",
        sport: (params?.sport as string) ?? "tennis",
        season: (params?.season as string) ?? "Verano 2026",
      },
    };
  }

  return {
    status: "success",
    message: "📋 Encontramos 3 ligas deportivas.",
    leagues: [
      {
        id: "lg-001", name: "Liga de Tennis Verano 2026", sport: "tennis",
        format: "round_robin", teams: ["Los Lobos", "Las Águilas", "Los Tigres", "Los Cóndores"],
        season: "Verano 2026", start_date: futureDate(7), end_date: futureDate(90),
        coordinator_member_id: "mbr-002", max_teams: 8, current_round: 0,
        standings: {}, status: "active", created_at: new Date().toISOString(),
      },
      {
        id: "lg-002", name: "Liga de Pádel Invierno", sport: "padel",
        format: "divisions", teams: ["Pádel Pro A", "Pádel Pro B", "Pádel Amateur A", "Pádel Amateur B"],
        season: "Invierno 2026", start_date: futureDate(-14), end_date: futureDate(60),
        coordinator_member_id: "mbr-006", max_teams: 6, current_round: 3,
        standings: { "Pádel Pro A": 9, "Pádel Pro B": 6, "Pádel Amateur A": 4 },
        status: "active", created_at: new Date().toISOString(),
      },
      {
        id: "lg-003", name: "Liga de Golf Mensual", sport: "golf",
        format: "double_round_robin", teams: ["Birdie Club", "Eagle Team", "Bogey Boys"],
        season: "Trimestral 2026-Q2", start_date: futureDate(-30), end_date: futureDate(30),
        coordinator_member_id: "mbr-004", max_teams: 4, current_round: 5,
        standings: { "Birdie Club": 15, "Eagle Team": 12, "Bogey Boys": 8 },
        status: "active", created_at: new Date().toISOString(),
      },
    ],
  };
}

// ── get_equipment_availability ────────────────────────────────────────────────

export function createMockGetEquipmentAvailability(
  params?: Record<string, unknown>
): GetEquipmentAvailability_Contract {
  const equipment = [
    { id: "eq-001", name: "Raquetas Wilson Pro Staff", sport: "tennis", location: "Cancha Tennis 1", condition: "good", total_quantity: 12, available_quantity: 8, brand: "Wilson", notes: null, last_maintenance: futureDate(-30) },
    { id: "eq-002", name: "Pelotas de Tennis (caja x24)", sport: "tennis", location: "Almacén Deportes", condition: "new", total_quantity: 6, available_quantity: 4, brand: "Penn", notes: null, last_maintenance: null },
    { id: "eq-003", name: "Palos de Golf (set completo)", sport: "golf", location: "Pro Shop Golf", condition: "good", total_quantity: 8, available_quantity: 5, brand: "Callaway", notes: null, last_maintenance: futureDate(-60) },
    { id: "eq-004", name: "Tablas de Surf", sport: "swimming", location: "Área Piscina", condition: "fair", total_quantity: 4, available_quantity: 3, brand: null, notes: "1 tabla con grieta menor", last_maintenance: futureDate(-120) },
    { id: "eq-005", name: "Pesas Kettlebell Set", sport: "fitness", location: "Gimnasio Principal", condition: "needs_repair", total_quantity: 10, available_quantity: 6, brand: "Rogue", notes: "2 con agarre dañado", last_maintenance: futureDate(-180) },
    { id: "eq-006", name: "Bicicletas Spinning", sport: "fitness", location: "Gimnasio Principal", condition: "good", total_quantity: 20, available_quantity: 18, brand: "Schwinn", notes: null, last_maintenance: futureDate(-15) },
    { id: "eq-007", name: "Barras de Pádel", sport: "padel", location: "Cancha de Pádel", condition: "good", total_quantity: 8, available_quantity: 6, brand: "Bullpadel", notes: null, last_maintenance: futureDate(-45) },
    { id: "eq-008", name: "Raquetas de Squash", sport: "squash", location: "Cancha de Squash", condition: "fair", total_quantity: 6, available_quantity: 5, brand: "Dunlop", notes: "1 con cordaje roto", last_maintenance: futureDate(-90) },
    { id: "eq-009", name: "Mats de Yoga", sport: "yoga", location: "Salón Wellness", condition: "new", total_quantity: 25, available_quantity: 22, brand: "Manduka", notes: null, last_maintenance: null },
    { id: "eq-010", name: "Noodles Acuáticos", sport: "swimming", location: "Área Piscina", condition: "needs_repair", total_quantity: 15, available_quantity: 10, brand: null, notes: "5 con espuma degradada", last_maintenance: futureDate(-200) },
    { id: "eq-011", name: "Conos de Entrenamiento", sport: "football", location: "Almacén Deportes", condition: "good", total_quantity: 30, available_quantity: 28, brand: null, notes: null, last_maintenance: futureDate(-10) },
    { id: "eq-012", name: "Reformer Pilates", sport: "pilates", location: "Studio Pilates", condition: "new", total_quantity: 8, available_quantity: 7, brand: "Balanced Body", notes: null, last_maintenance: null },
  ];

  let filtered = equipment;
  if (params?.sport) {
    filtered = equipment.filter((e) => e.sport === params.sport);
  }
  if (params?.location) {
    filtered = filtered.filter((e) => e.location === params.location);
  }

  const available = filtered.filter((e) => e.available_quantity > 0);

  return {
    status: "success",
    message: `📦 Encontramos ${filtered.length} items de equipamiento (${available.length} con disponibilidad).`,
    equipment: filtered,
    total_items: filtered.length,
    available_items: available.length,
  };
}

// ── get_sports_recommendations ────────────────────────────────────────────────

export function createMockGetSportsRecommendations(
  params?: Record<string, unknown>
): GetSportsRecommendations_Contract {
  const member = (params?.member_id as string) ?? "mbr-001";

  return {
    status: "success",
    message: "💡 Generamos 3 recomendaciones personalizadas para vos.",
    recommendations: [
      {
        id: "srec-001", member_id: member, sport: "yoga", reason: "Probá 'Yoga Matutino' los Lunes — muchos lugares disponibles, todos los niveles son bienvenidos.",
        confidence_score: 0.85, suggested_class: "Yoga Matutino", suggested_coach: "Ana Vargas",
        created_at: new Date().toISOString(),
      },
      {
        id: "srec-002", member_id: member, sport: "padel", reason: "Basado en tu historial de tennis, el pádel es el deporte trending en clubes privados de CR. ¡Tenemos cancha nueva!",
        confidence_score: 0.78, suggested_class: null, suggested_coach: "Diego Fuentes",
        created_at: new Date().toISOString(),
      },
      {
        id: "srec-003", member_id: member, sport: "fitness", reason: "CrossFit WOD tiene solo 1 espacio disponible — sesión de alto impacto ideal para complementar tu actividad.",
        confidence_score: 0.70, suggested_class: "CrossFit WOD", suggested_coach: "Diego Fuentes",
        created_at: new Date().toISOString(),
      },
    ],
  };
}

// ── get_sports_analytics ──────────────────────────────────────────────────────

export function createMockGetSportsAnalytics(
  params?: Record<string, unknown>
): GetSportsAnalytics_Contract {
  return {
    status: "success",
    message: `📊 Analytics deportivos generados (${(params?.lookback_days as number) ?? 30} días de historial).`,
    analytics: {
      sport_popularity: [
        { sport: "tennis", total_activity: 145, reservation_count: 89, class_count: 24, tournament_count: 8, coaching_count: 24, popularity_rank: 1, activity_share_pct: 38.2 },
        { sport: "golf", total_activity: 78, reservation_count: 42, class_count: 0, tournament_count: 12, coaching_count: 24, popularity_rank: 2, activity_share_pct: 20.5 },
        { sport: "fitness", total_activity: 62, reservation_count: 0, class_count: 48, tournament_count: 0, coaching_count: 14, popularity_rank: 3, activity_share_pct: 16.3 },
        { sport: "padel", total_activity: 45, reservation_count: 32, class_count: 0, tournament_count: 5, coaching_count: 8, popularity_rank: 4, activity_share_pct: 11.8 },
        { sport: "swimming", total_activity: 32, reservation_count: 18, class_count: 8, tournament_count: 0, coaching_count: 6, popularity_rank: 5, activity_share_pct: 8.4 },
        { sport: "yoga", total_activity: 18, reservation_count: 0, class_count: 16, tournament_count: 0, coaching_count: 2, popularity_rank: 6, activity_share_pct: 4.7 },
      ],
      court_utilization: [
        { court_name: "Cancha Tennis 1", sport: "tennis", total_slots: 420, booked_slots: 328, utilization_pct: 78.1, peak_hours: ["16:00", "17:00", "08:00"], avg_daily_bookings: 5.4, trend: "increasing" },
        { court_name: "Cancha de Pádel", sport: "padel", total_slots: 420, booked_slots: 302, utilization_pct: 71.9, peak_hours: ["17:00", "18:00", "19:00"], avg_daily_bookings: 4.8, trend: "increasing" },
        { court_name: "Gimnasio Principal", sport: "fitness", total_slots: 420, booked_slots: 286, utilization_pct: 68.1, peak_hours: ["07:00", "08:00", "18:00"], avg_daily_bookings: 4.2, trend: "stable" },
        { court_name: "Cancha Tennis 2", sport: "tennis", total_slots: 420, booked_slots: 273, utilization_pct: 65.0, peak_hours: ["16:00", "09:00", "10:00"], avg_daily_bookings: 4.1, trend: "stable" },
        { court_name: "Driving Range Golf", sport: "golf", total_slots: 420, booked_slots: 218, utilization_pct: 51.9, peak_hours: ["07:00", "08:00", "09:00"], avg_daily_bookings: 3.2, trend: "stable" },
        { court_name: "Piscina Semi-olímpica", sport: "swimming", total_slots: 420, booked_slots: 202, utilization_pct: 48.1, peak_hours: ["06:00", "07:00", "16:00"], avg_daily_bookings: 2.8, trend: "stable" },
        { court_name: "Cancha de Squash", sport: "squash", total_slots: 420, booked_slots: 118, utilization_pct: 28.1, peak_hours: ["18:00", "19:00"], avg_daily_bookings: 1.5, trend: "decreasing" },
      ],
      class_enrollment: [
        { class_id: "cls-001", name: "Yoga Matutino", sport: "yoga", class_type: "group", enrolled: 18, capacity: 20, fill_rate_pct: 90.0, is_underperforming: false, instructor: "Ana Vargas", schedule_day: "Lunes" },
        { class_id: "cls-006", name: "CrossFit WOD", sport: "fitness", class_type: "group", enrolled: 11, capacity: 12, fill_rate_pct: 91.7, is_underperforming: false, instructor: "Diego Fuentes", schedule_day: "Sábado" },
        { class_id: "cls-005", name: "Aqua Fitness", sport: "swimming", class_type: "group", enrolled: 12, capacity: 15, fill_rate_pct: 80.0, is_underperforming: false, instructor: "Patricia Solano", schedule_day: "Viernes" },
        { class_id: "cls-002", name: "Spinning Intenso", sport: "fitness", class_type: "group", enrolled: 15, capacity: 20, fill_rate_pct: 75.0, is_underperforming: false, instructor: "Carlos Mora", schedule_day: "Martes" },
        { class_id: "cls-003", name: "Pilates Reformer", sport: "pilates", class_type: "semi_private", enrolled: 8, capacity: 15, fill_rate_pct: 53.3, is_underperforming: false, instructor: "Laura Méndez", schedule_day: "Miércoles" },
        { class_id: "cls-004", name: "Tennis Grupal", sport: "tennis", class_type: "group", enrolled: 5, capacity: 16, fill_rate_pct: 31.3, is_underperforming: true, instructor: "Roberto Sánchez", schedule_day: "Jueves" },
      ],
      tournament_metrics: {
        total_tournaments: 6,
        by_status: { completed: 3, registration_open: 1, in_progress: 1, confirmed: 1 },
        avg_participation_rate: 76.5,
        total_revenue: 2450000,
        upcoming_count: 2,
        in_progress_count: 1,
        completed_count: 3,
        avg_entry_fee: 25000,
      },
      equipment_health: [
        { equipment_id: "eq-010", name: "Noodles Acuáticos", sport: "swimming", condition: "needs_repair", urgency_score: 92, needs_attention: true, days_since_maintenance: 200, recommended_action: "replace_urgent" },
        { equipment_id: "eq-005", name: "Pesas Kettlebell Set", sport: "fitness", condition: "needs_repair", urgency_score: 85, needs_attention: true, days_since_maintenance: 180, recommended_action: "replace_urgent" },
        { equipment_id: "eq-004", name: "Tablas de Surf", sport: "swimming", condition: "fair", urgency_score: 55, needs_attention: true, days_since_maintenance: 120, recommended_action: "schedule_maintenance" },
        { equipment_id: "eq-008", name: "Raquetas de Squash", sport: "squash", condition: "fair", urgency_score: 50, needs_attention: true, days_since_maintenance: 90, recommended_action: "schedule_maintenance" },
        { equipment_id: "eq-001", name: "Raquetas Wilson Pro Staff", sport: "tennis", condition: "good", urgency_score: 15, needs_attention: false, days_since_maintenance: 30, recommended_action: "ok" },
        { equipment_id: "eq-006", name: "Bicicletas Spinning", sport: "fitness", condition: "good", urgency_score: 10, needs_attention: false, days_since_maintenance: 15, recommended_action: "ok" },
      ],
      coaching_stats: {
        coaches: [
          { name: "Roberto Sánchez", session_count: 45, unique_members: 18, popular_sports: ["tennis"], avg_sessions_per_member: 2.5 },
          { name: "Laura Mora", session_count: 28, unique_members: 12, popular_sports: ["golf"], avg_sessions_per_member: 2.3 },
          { name: "Diego Fuentes", session_count: 22, unique_members: 10, popular_sports: ["padel"], avg_sessions_per_member: 2.2 },
          { name: "Patricia Solano", session_count: 15, unique_members: 8, popular_sports: ["swimming"], avg_sessions_per_member: 1.9 },
        ],
        total_sessions: 110,
        avg_sessions_per_member: 2.4,
        unique_members_coached: 48,
        top_coach: "Roberto Sánchez",
      },
      seasonal_patterns: [
        { month: 1, month_name: "Enero", activity_count: 58, dominant_sport: "tennis", is_peak_season: true, reservation_count: 32, class_count: 18, tournament_count: 8 },
        { month: 2, month_name: "Febrero", activity_count: 62, dominant_sport: "tennis", is_peak_season: true, reservation_count: 35, class_count: 18, tournament_count: 9 },
        { month: 3, month_name: "Marzo", activity_count: 55, dominant_sport: "tennis", is_peak_season: true, reservation_count: 30, class_count: 18, tournament_count: 7 },
        { month: 4, month_name: "Abril", activity_count: 48, dominant_sport: "golf", is_peak_season: true, reservation_count: 26, class_count: 16, tournament_count: 6 },
        { month: 5, month_name: "Mayo", activity_count: 35, dominant_sport: "fitness", is_peak_season: false, reservation_count: 18, class_count: 14, tournament_count: 3 },
        { month: 6, month_name: "Junio", activity_count: 30, dominant_sport: "fitness", is_peak_season: false, reservation_count: 15, class_count: 12, tournament_count: 3 },
        { month: 7, month_name: "Julio", activity_count: 38, dominant_sport: "fitness", is_peak_season: false, reservation_count: 18, class_count: 16, tournament_count: 4 },
        { month: 8, month_name: "Agosto", activity_count: 28, dominant_sport: "fitness", is_peak_season: false, reservation_count: 12, class_count: 14, tournament_count: 2 },
        { month: 9, month_name: "Setiembre", activity_count: 22, dominant_sport: "fitness", is_peak_season: false, reservation_count: 10, class_count: 10, tournament_count: 2 },
        { month: 10, month_name: "Octubre", activity_count: 20, dominant_sport: "fitness", is_peak_season: false, reservation_count: 8, class_count: 10, tournament_count: 2 },
        { month: 11, month_name: "Noviembre", activity_count: 32, dominant_sport: "tennis", is_peak_season: false, reservation_count: 16, class_count: 12, tournament_count: 4 },
        { month: 12, month_name: "Diciembre", activity_count: 50, dominant_sport: "tennis", is_peak_season: true, reservation_count: 28, class_count: 16, tournament_count: 6 },
      ],
      member_engagement_score: 68.5,
      peak_hours: { "16:00": 42, "17:00": 38, "08:00": 35, "18:00": 32, "09:00": 28, "07:00": 25, "10:00": 22 },
      total_active_reservations: 45,
      total_active_classes: 6,
      lookback_days: (params?.lookback_days as number) ?? 30,
    },
  };
}

// ── get_sports_health_summary ─────────────────────────────────────────────────

export function createMockGetSportsHealthSummary(
): GetSportsHealthSummary_Contract {
  return {
    status: "success",
    message: "🏋️ Salud deportiva: 72/100 (Saludable)",
    health_summary: {
      health_score: 72.0,
      level: "Saludable",
      factors: [
        { name: "Utilización de Canchas", score: 70.0, weight: 0.25, weighted_score: 17.5, status: "good", detail: "7 cancha(s) monitoreada(s)" },
        { name: "Inscripción en Clases", score: 66.0, weight: 0.20, weighted_score: 13.2, status: "good", detail: "6 clase(s) activa(s)" },
        { name: "Actividad de Torneos", score: 82.0, weight: 0.20, weighted_score: 16.4, status: "excellent", detail: "6 torneo(s) registrado(s)" },
        { name: "Estado de Equipamiento", score: 62.0, weight: 0.15, weighted_score: 9.3, status: "attention", detail: "12 item(s) en inventario" },
        { name: "Participación de Socios", score: 78.0, weight: 0.20, weighted_score: 15.6, status: "good", detail: "48 socio(s) con coaching activo" },
      ],
      trend: "stable",
      alerts: [
        "Cancha de Squash por debajo del 30% de utilización (28.1%)",
        "2 item(s) de equipamiento requieren reemplazo urgente",
        "Tennis Grupal con inscripción baja (31.3%)",
      ],
      recommendations: [
        "Promocionar squash con clase introductoria gratuita",
        "Programar reemplazo de noodles acuáticos y kettlebells dañados",
        "Revisar horario de Tennis Grupal — reubicar a horario más atractivo",
        "Aprovechar temporada alta para lanzar torneo de pádel",
      ],
      generated_at: new Date().toISOString(),
    },
  };
}

// ── get_sports_calendar ───────────────────────────────────────────────────────

export function createMockGetSportsCalendar(
  params?: Record<string, unknown>
): GetSportsCalendar_Contract {
  const d0 = todayISO();
  const d1 = futureDate(1);
  const d2 = futureDate(2);
  const d3 = futureDate(3);
  const d4 = futureDate(4);
  const d5 = futureDate(5);
  const d6 = futureDate(6);

  const calendar = [
    { id: `cal_r1_${d0}`, type: "reservation", title: "Cancha: Cancha Tennis 1", sport: "tennis", date: d0, start_time: timeAt(16), end_time: timeAt(17), location: "Cancha Tennis 1", participants: null, status: "confirmed", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "res-001" },
    { id: `cal_r2_${d0}`, type: "reservation", title: "Cancha: Cancha Tennis 1", sport: "tennis", date: d0, start_time: timeAt(16, 30), end_time: timeAt(17, 30), location: "Cancha Tennis 1", participants: null, status: "confirmed", is_conflict: true, conflict_reason: "Conflicto con: Cancha: Cancha Tennis 1", weather_risk: "low", entity_id: "res-002" },
    { id: `cal_r3_${d1}`, type: "reservation", title: "Cancha: Cancha de Pádel", sport: "padel", date: d1, start_time: timeAt(17), end_time: timeAt(18), location: "Cancha de Pádel", participants: null, status: "confirmed", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "res-003" },
    { id: `cal_cls1_${d0}`, type: "class", title: "🧘 Yoga Matutino", sport: "yoga", date: d0, start_time: timeAt(7), end_time: timeAt(8), location: "Salón Wellness", participants: 18, status: "active", is_conflict: false, conflict_reason: null, weather_risk: null, entity_id: "cls-001" },
    { id: `cal_cls2_${d1}`, type: "class", title: "🧘 Spinning Intenso", sport: "fitness", date: d1, start_time: timeAt(18), end_time: timeAt(18, 45), location: "Gimnasio Principal", participants: 15, status: "active", is_conflict: false, conflict_reason: null, weather_risk: null, entity_id: "cls-002" },
    { id: `cal_coach1_${d2}`, type: "coaching", title: "🎾 Coaching: Roberto Sánchez", sport: "tennis", date: d2, start_time: timeAt(10), end_time: timeAt(11), location: "Cancha Tennis 1", participants: 2, status: "scheduled", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "coach-001" },
    { id: `cal_trn1_${d3}`, type: "tournament", title: "🏆 Copa Castillo Tennis", sport: "tennis", date: d3, start_time: timeAt(9), end_time: timeAt(18), location: "Cancha Tennis 1 & 2", participants: 12, status: "in_progress", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "trn-001" },
    { id: `cal_trn1_${d4}`, type: "tournament", title: "🏆 Copa Castillo Tennis", sport: "tennis", date: d4, start_time: timeAt(9), end_time: timeAt(18), location: "Cancha Tennis 1 & 2", participants: 12, status: "in_progress", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "trn-001" },
    { id: `cal_lg1_${d5}`, type: "league", title: "⚽ Liga: Liga de Tennis Verano", sport: "tennis", date: d5, start_time: timeAt(10), end_time: timeAt(14), location: "Multiple courts", participants: 4, status: "active", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "lg-001" },
    { id: `cal_r4_${d6}`, type: "reservation", title: "Cancha: Driving Range Golf", sport: "golf", date: d6, start_time: timeAt(8), end_time: timeAt(9), location: "Driving Range Golf", participants: null, status: "confirmed", is_conflict: false, conflict_reason: null, weather_risk: "low", entity_id: "res-004" },
  ];

  return {
    status: "success",
    message: `📅 Calendario deportivo: ${calendar.length} actividades programadas.`,
    calendar,
    total_items: calendar.length,
    conflict_count: 1,
    date_range: { from: (params?.date_from as string) ?? d0, to: (params?.date_to as string) ?? d6 },
  };
}

// ── generate_sports_proposals ─────────────────────────────────────────────────

export function createMockGenerateSportsProposals(
): GenerateSportsProposals_Contract {
  return {
    status: "success",
    message: "💡 Motor de Engagement: 5 propuestas generadas.",
    proposals: [
      {
        id: "prop_001", type: "tournament_idea", title: "Organizar torneo de Pádel en los próximos 30 días",
        description: "El pádel es el deporte de mayor crecimiento en clubes privados de CR. La cancha tiene 72% de utilización — hay demanda para un torneo express de un día.",
        target_sport: "padel", expected_participants: 16, confidence_score: 0.88,
        reasoning: "Alta demanda + temporada seca + torneo anterior con 95% de participación = éxito garantizado.",
        cross_domain_signals: ["Cancha de pádel: 72% utilización — la más demandada después de tennis", "Temporada alta: clima ideal para eventos outdoor"],
        estimated_revenue: 800000, suggested_date: futureDate(14), action_label: "Crear torneo de pádel", approval: "HITL",
      },
      {
        id: "prop_002", type: "class_suggestion", title: "Reactivar 'Tennis Grupal' — inscripción al 31%",
        description: "La clase de Tennis Grupal con Roberto Sánchez solo tiene 5/16 inscritos. Considerar moverla a horario más atractivo (Martes/Jueves 7am) o fusionar con grupo de principiantes.",
        target_sport: "tennis", expected_participants: 11, confidence_score: 0.75,
        reasoning: "Baja inscripción indica posible problema de horario (Jueves 4pm compite con reservas individuales).",
        cross_domain_signals: ["Tennis Grupal: 31.3% fill rate — la más baja de todas las clases"],
        estimated_revenue: null, suggested_date: null,
        action_label: "Ajustar clase", approval: "AUTO",
      },
      {
        id: "prop_003", type: "new_activity", title: "Activitar Squash — equipamiento disponible, cancha subutilizada",
        description: "La cancha de Squash tiene solo 28% de utilización y hay 6 raquetas disponibles. Una clase introductoria gratuita los sábados podría generar interés.",
        target_sport: "squash", expected_participants: 12, confidence_score: 0.65,
        reasoning: "Squash es deporte nicho con alta retención una vez probado. Una sesión de introducción sin costo reduce la barrera de entrada.",
        cross_domain_signals: ["Cancha de Squash: 28% utilización — la más baja", "6 raquetas disponibles — inversión ociosa"],
        estimated_revenue: null, suggested_date: null,
        action_label: "Crear clase de squash", approval: "AUTO",
      },
      {
        id: "prop_004", type: "cross_sell", title: "Expandir coaching deportivo — solo 4 coaches para 11 deportes",
        description: "Coaching concentrado en tennis, golf, padel y swimming. 7 deportes sin coaching activo (basketball, volleyball, football, squash, yoga, pilates, fitness).",
        target_sport: "fitness", expected_participants: 8, confidence_score: 0.70,
        reasoning: "Diversificar coaching aumenta el engagement de socios que practican deportes menos representados. Fitness y Yoga son candidatos inmediatos.",
        cross_domain_signals: ["Coaching limitado a 4 de 11 deportes", "Fitness y Yoga tienen clases activas pero sin coaching privado"],
        estimated_revenue: null, suggested_date: null,
        action_label: "Ofrecer coaching diversificado", approval: "AUTO",
      },
      {
        id: "prop_005", type: "new_activity", title: "Temporada alta: maximizar deportes outdoor con programa especial",
        description: "Estamos en temporada seca (dic-abr). Es el mejor momento para promover tennis, golf, swimming y deportes al aire libre con un 'Outdoor Sports Week'.",
        target_sport: "tennis", expected_participants: 35, confidence_score: 0.92,
        reasoning: "Temporada seca en CR = clima perfecto para outdoor. Clubes que no capitalizan esto pierden engagement y revenue estacional.",
        cross_domain_signals: [
          "High season CR: clima favorable para deportes outdoor",
          "Actividad outdoor actual: 62% del total — puede subir a 75%",
          "Revenue de torneos en temporada alta: 2.5x vs temporada verde",
        ],
        estimated_revenue: 1200000, suggested_date: futureDate(10), action_label: "Crear Outdoor Sports Week", approval: "AUTO",
      },
    ],
    total_proposals: 5,
  };
}
// ══════════════════════════════════════════════════════════════════════════════
// FACILITY MANAGEMENT FACTORIES (F33)
// ══════════════════════════════════════════════════════════════════════════════

function facilityDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

import type {
  Facility_Contract,
  MaintenanceTask_Contract,
  Inspection_Contract,
  FacilityReservation_Contract,
  ManageFacilities_Contract,
  ScheduleMaintenance_Contract,
  CoordinateEventSetup_Contract,
  GetFacilityOccupancy_Contract,
  ManageInspections_Contract,
  ReportFacilityIssue_Contract,
  GetMaintenanceSchedule_Contract,
  CreateFacilityReservation_Contract,
  GetFacilityReservations_Contract,
  GetFacilityAnalytics_Contract,
  GetAmenityUtilization_Contract,
  GetSpaceOptimization_Contract,
  GetFacilityHealth_Contract,
  GetMember360Profile_Contract,
  GetMemberHealthScore_Contract,
  GetMemberJourney_Contract,
  GetMemberChurnPrediction_Contract,
  GetMemberLTVAnalysis_Contract,
  GetMemberActivitySummary_Contract,
  GetMemberSocialProfile_Contract,
  GenerateMemberEngagementProposals_Contract,
  GetMemberRiskAssessment_Contract,
  SearchMembers360_Contract,
  Member360Preview_Contract,
} from "./contracts";

// ── Seed data ────────────────────────────────────────────────────────────────

const MOCK_FACILITIES: Facility_Contract[] = [
  {
    id: "fac-001", name: "Piscina Principal", facility_type: "pool",
    status: "operational", location: "Zona Norte", capacity: 100,
    description: "Piscina olímpica con jacuzzi y área de niños",
    amenities: ["Jacuzzi", "Diving board", "Pool bar", "Tumbonas"],
    opening_time: "06:00", closing_time: "22:00",
    responsible_member_id: "", base_rate: 5000, notes: null,
  },
  {
    id: "fac-002", name: "Gimnasio", facility_type: "gym",
    status: "operational", location: "Edificio Central", capacity: 80,
    description: "Gimnasio equipado con zona de pesas, cardio y funcional",
    amenities: ["Pesas libres", "Cardio", "Functional", "Spinning"],
    opening_time: "05:00", closing_time: "23:00",
    responsible_member_id: "", base_rate: 3000, notes: null,
  },
  {
    id: "fac-003", name: "Cancha de Tenis #1", facility_type: "tennis_court",
    status: "operational", location: "Zona Deportiva Sur", capacity: 4,
    description: "Cancha de tenis de arcilla con iluminación nocturna",
    amenities: ["Iluminación", "Vestidores"],
    opening_time: "06:00", closing_time: "21:00",
    responsible_member_id: "", base_rate: 15000, notes: null,
  },
  {
    id: "fac-006", name: "Restaurante El Castillo", facility_type: "restaurant",
    status: "operational", location: "Zona Central", capacity: 120,
    description: "Restaurante gourmet con terraza panorámica",
    amenities: ["Terraza", "Barra", "VIP room", "Wine cellar"],
    opening_time: "11:00", closing_time: "23:00",
    responsible_member_id: "", base_rate: 25000, notes: null,
  },
  {
    id: "fac-008", name: "Salón El Dorado", facility_type: "ballroom",
    status: "operational", location: "Edificio Principal", capacity: 200,
    description: "Salón de eventos principal con sistema AV completo",
    amenities: ["Sonido profesional", "Iluminación escénica", "Pista de baile"],
    opening_time: "08:00", closing_time: "23:00",
    responsible_member_id: "", base_rate: 150000, notes: null,
  },
  {
    id: "fac-010", name: "Spa & Wellness", facility_type: "spa",
    status: "maintenance", location: "Edificio Norte", capacity: 20,
    description: "Spa completo con jacuzzi, sauna y cabinas de masaje",
    amenities: ["Sauna", "Jacuzzi", "Vapor", "6 cabinas"],
    opening_time: "09:00", closing_time: "20:00",
    responsible_member_id: "", base_rate: 35000, notes: "Renovación de jacuzzi en progreso",
  },
];

const MOCK_MAINTENANCE: MaintenanceTask_Contract[] = [
  {
    id: "m-001", facility_id: "fac-001", facility_name: "Piscina Principal",
    maintenance_type: "corrective", status: "scheduled", priority: "high",
    description: "Filtro de arena — reemplazo urgente",
    scheduled_date: facilityDate(-15), scheduled_time: "07:00",
    estimated_duration_hours: 4.0, assigned_to: "Técnico PoolsCR",
    cost: 850000, completed_at: null, notes: null,
  },
  {
    id: "m-002", facility_id: "fac-002", facility_name: "Gimnasio",
    maintenance_type: "preventive", status: "scheduled", priority: "medium",
    description: "Aire acondicionado — servicio preventivo",
    scheduled_date: facilityDate(5), scheduled_time: "08:00",
    estimated_duration_hours: 3.0, assigned_to: "AC Solutions",
    cost: 320000, completed_at: null, notes: null,
  },
  {
    id: "m-004", facility_id: "fac-010", facility_name: "Spa & Wellness",
    maintenance_type: "renovation", status: "in_progress", priority: "high",
    description: "Renovación de jacuzzi — reemplazo completo",
    scheduled_date: facilityDate(-5), scheduled_time: "07:00",
    estimated_duration_hours: 40.0, assigned_to: "SpaTech",
    cost: 3500000, completed_at: null, notes: null,
  },
];

const MOCK_INSPECTIONS: Inspection_Contract[] = [
  {
    id: "i-001", facility_id: "fac-001", facility_name: "Piscina Principal",
    result: "pass", inspector_member_id: "insp-01",
    inspection_date: facilityDate(-7),
    findings: "Calidad de agua OK. pH normal.",
    corrective_actions: [], next_inspection_date: facilityDate(23), notes: null,
  },
  {
    id: "i-004", facility_id: "fac-008", facility_name: "Salón El Dorado",
    result: "major_issues", inspector_member_id: "insp-03",
    inspection_date: facilityDate(-7),
    findings: "Pintura exterior descascarada. Goteras menores en techo.",
    corrective_actions: ["Pintura exterior urgente", "Sellado de techo"],
    next_inspection_date: facilityDate(7), notes: null,
  },
];

const MOCK_RESERVATIONS: FacilityReservation_Contract[] = [
  {
    id: "r-001", facility_id: "fac-001", facility_name: "Piscina Principal",
    family_id: "fam-001", family_name: "Familia Rodríguez",
    date: facilityDate(0), start_time: "10:00", end_time: "14:00",
    status: "confirmed", guest_count: 8, purpose: "Fiesta de cumpleaños",
    notes: null, created_by: "system", created_at: facilityDate(-3),
  },
  {
    id: "r-002", facility_id: "fac-008", facility_name: "Salón El Dorado",
    family_id: "fam-002", family_name: "Familia Mora",
    date: facilityDate(1), start_time: "18:00", end_time: "23:00",
    status: "confirmed", guest_count: 40, purpose: "Cena privada corporativa",
    notes: null, created_by: "system", created_at: facilityDate(-7),
  },
  {
    id: "r-003", facility_id: "fac-003", facility_name: "Cancha de Tenis #1",
    family_id: "fam-003", family_name: "Familia Jiménez",
    date: facilityDate(0), start_time: "08:00", end_time: "10:00",
    status: "confirmed", guest_count: 2, purpose: "Partido amistoso",
    notes: null, created_by: "system", created_at: facilityDate(-1),
  },
  {
    id: "r-005", facility_id: "fac-009", facility_name: "Jardín Los Ceibos",
    family_id: "fam-003", family_name: "Familia Jiménez",
    date: facilityDate(14), start_time: "16:00", end_time: "23:00",
    status: "pending", guest_count: 120, purpose: "Boda — Fam. Jiménez",
    notes: null, created_by: "system", created_at: facilityDate(-5),
  },
];

// ── Factory functions ────────────────────────────────────────────────────────

export function createMockManageFacilities(
  params?: Record<string, unknown>,
): ManageFacilities_Contract {
  const action = (params?.action as string) || "list";
  if (action === "get" && params?.facility_id) {
    const f = MOCK_FACILITIES.find((f) => f.id === params.facility_id);
    return {
      status: "success",
      message: "Instalación encontrada.",
      facility: f ?? MOCK_FACILITIES[0],
    };
  }
  return {
    status: "success",
    message: `📋 Encontramos ${MOCK_FACILITIES.length} instalaciones.`,
    facilities: MOCK_FACILITIES,
  };
}

export function createMockScheduleMaintenance(): ScheduleMaintenance_Contract {
  return {
    status: "pending_approval",
    request_id: `approval_${Date.now()}`,
    message: "🔧 Mantenimiento creado. Esperando aprobación.",
    details: {
      facility_name: "Piscina Principal",
      maintenance_type: "preventive",
      priority: "medium",
      scheduled_date: facilityDate(7),
      cost: 320000,
    },
  };
}

export function createMockCoordinateEventSetup(): CoordinateEventSetup_Contract {
  return {
    status: "pending_approval",
    request_id: `approval_${Date.now()}`,
    message: "🎪 Montaje para evento creado. Esperando aprobación.",
    details: {
      event_name: "Evento privado",
      facility_name: "Salón El Dorado",
      setup_date: facilityDate(7),
      requirements: ["Sonido", "Iluminación", "Catering"],
    },
  };
}

export function createMockGetFacilityOccupancy(): GetFacilityOccupancy_Contract {
  return {
    status: "success",
    message: `📊 Ocupación de ${MOCK_FACILITIES.length} instalación(es).`,
    occupancy: MOCK_FACILITIES.map((f) => ({
      facility_id: f.id,
      facility_name: f.name,
      facility_type: f.facility_type,
      status: f.status,
      current_setups: f.id === "fac-008" ? 2 : 0,
      active_maintenance: MOCK_MAINTENANCE.filter(
        (m) => m.facility_id === f.id && m.status !== "completed",
      ).length,
      capacity: f.capacity,
      opening_time: f.opening_time,
      closing_time: f.closing_time,
    })),
  };
}

export function createMockManageInspections(
  params?: Record<string, unknown>,
): ManageInspections_Contract {
  const action = (params?.action as string) || "list";
  if (action === "get" && params?.inspection_id) {
    const i = MOCK_INSPECTIONS.find((i) => i.id === params.inspection_id);
    return { status: "success", message: "Inspección encontrada.", inspection: i ?? MOCK_INSPECTIONS[0] };
  }
  return {
    status: "success",
    message: `📋 Encontramos ${MOCK_INSPECTIONS.length} inspecciones.`,
    inspections: MOCK_INSPECTIONS,
  };
}

export function createMockReportFacilityIssue(): ReportFacilityIssue_Contract {
  return {
    status: "success",
    message: "📝 Problema reportado. Tarea de mantenimiento creada.",
    maintenance: {
      id: `m-${Date.now().toString(36)}`,
      facility_id: "fac-001",
      facility_name: "Piscina Principal",
      maintenance_type: "corrective",
      status: "scheduled",
      priority: "medium",
      description: "[REPORTADO POR socio] Fuga menor en vestuario",
      scheduled_date: facilityDate(0),
      scheduled_time: "08:00",
      estimated_duration_hours: 2.0,
      assigned_to: "",
      cost: 0,
      completed_at: null,
      notes: "Reportado por: socio",
    },
  };
}

export function createMockGetMaintenanceSchedule(): GetMaintenanceSchedule_Contract {
  return {
    status: "success",
    message: `📅 Calendario: ${MOCK_MAINTENANCE.length} tarea(s) de mantenimiento.`,
    schedule: MOCK_MAINTENANCE,
    total: MOCK_MAINTENANCE.length,
  };
}

export function createMockCreateFacilityReservation(): CreateFacilityReservation_Contract {
  return {
    status: "pending_approval",
    request_id: `approval_${Date.now()}`,
    message: "📅 Reserva creada. Esperando aprobación.",
    details: {
      facility_name: "Salón El Dorado",
      family_name: "Familia Rodríguez",
      date: facilityDate(3),
      start_time: "18:00",
      end_time: "23:00",
      guest_count: 30,
      purpose: "Evento familiar",
    },
  };
}

export function createMockGetFacilityReservations(): GetFacilityReservations_Contract {
  return {
    status: "success",
    message: `📅 ${MOCK_RESERVATIONS.length} reserva(s) encontrada(s).`,
    reservations: MOCK_RESERVATIONS,
    total: MOCK_RESERVATIONS.length,
  };
}

export function createMockGetFacilityAnalytics(): GetFacilityAnalytics_Contract {
  return {
    status: "success",
    message: "📊 Analytics: score 78/100 (B)",
    overall_score: 78,
    overall_grade: "B",
    overall_level: "Saludable",
    trend: "stable",
    dimensions: [
      {
        dimension_id: "D1", name: "Health Score", score: 82, status: "saludable",
        findings: ["Score general: 82/100 (B)", "Factor Utilización: 75/100", "Factor Mantenimiento: 65/100"],
        recommendations: ["Programar mantenimiento atrasado de piscina"],
        data: { grade: "B", level: "Saludable" },
      },
      {
        dimension_id: "D2", name: "Utilización", score: 72, status: "saludable",
        findings: ["Utilización promedio: 58%", "Espacio más usado: Piscina Principal", "Espacio menos usado: Gimnasio"],
        recommendations: ["Expandir horarios en piscina para temporada alta"],
        data: { peak: "Piscina Principal", lowest: "Gimnasio" },
      },
      {
        dimension_id: "D3", name: "Mantenimiento", score: 55, status: "atencion",
        findings: ["1 tarea(s) atrasada(s)", "1 en progreso", "₡4.67M en costos totales"],
        recommendations: ["Programar mantenimiento atrasado de piscina inmediatamente"],
        data: { overdue_count: 1, total_cost: 4670000 },
      },
      {
        dimension_id: "D4", name: "Optimización de Espacios", score: 80, status: "saludable",
        findings: ["1 espacio(s) subutilizado(s)", "1 espacio(s) sobrecargado(s)", "Ahorro potencial: ₡180,000/mes"],
        recommendations: ["Evaluar reasignación de uso del Spa"],
        data: { suggestions_count: 2 },
      },
      {
        dimension_id: "D5", name: "Análisis de Revenue", score: 85, status: "excepcional",
        findings: ["Revenue mensual estimado: ₡8.2M", "Costo mensual mantenimiento: ₡4.67M", "Neto: ₡3.53M"],
        recommendations: ["Optimizar pricing en piscina y canchas de tenis"],
        data: { total_revenue: 8200000, total_cost: 4670000 },
      },
      {
        dimension_id: "D6", name: "Cumplimiento", score: 60, status: "saludable",
        findings: ["2 inspecciones recientes", "1 con hallazgos críticos"],
        recommendations: ["Resolver hallazgos críticos en Salón El Dorado"],
        data: {},
      },
      {
        dimension_id: "D7", name: "Preparación de Eventos", score: 85, status: "excepcional",
        findings: ["2 evento(s) próximamente"],
        recommendations: ["Confirmar setup de Gala Anual Castillo 2026"],
        data: {},
      },
      {
        dimension_id: "D8", name: "Señales Cross-Domain", score: 70, status: "saludable",
        findings: ["Sports: canchas deportivas cercanas a capacidad máxima", "Events: aumento en demanda de venues para Q3"],
        recommendations: ["Coordinar con Sports para redirigir a facilities alternativas"],
        data: {},
      },
      {
        dimension_id: "D9", name: "Insights Predictivos", score: 65, status: "saludable",
        findings: ["Demanda de piscina aumentará 30% en diciembre", "Gimnasio: patrón creciente de uso matutino (+15% mes/mes)"],
        recommendations: ["Preparar protocolo de control de acceso para piscina en diciembre"],
        data: {},
      },
    ],
    cross_domain_signals: [
      { domain: "sports", signal: "Canchas deportivas al 85% — sugerir alternativas en facilities", impact: "negative", severity: "medium" },
      { domain: "events", signal: "3 eventos confirmados este mes — Salón El Dorado estable", impact: "positive", severity: "low" },
      { domain: "finance", signal: "₡2.3M en mantenimiento Q2 — dentro del presupuesto", impact: "neutral", severity: "low" },
      { domain: "communications", signal: "Comunicación de cierre de Spa generó 0 quejas — buena gestión", impact: "positive", severity: "low" },
    ],
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetAmenityUtilization(): GetAmenityUtilization_Contract {
  const today = new Date();
  const timeSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().split("T")[0], utilization: 30 + (i * 8) + ((i % 3) * 5), reservations: 3 + i };
  });

  return {
    status: "success",
    message: "📊 Utilización promedio: 58.3%",
    overall_utilization_pct: 58.3,
    facilities: [
      { facility_id: "fac-001", facility_name: "Piscina Principal", facility_type: "pool", status: "operational", current_occupancy: 72, capacity: 100, utilization_pct: 72.0, peak_hours: ["10:00", "11:00", "14:00"], trend: "improving", forecast_pct: 75.0, time_series: timeSeries, base_rate: 5000, estimated_monthly_revenue: 6750000 },
      { facility_id: "fac-002", facility_name: "Gimnasio", facility_type: "gym", status: "operational", current_occupancy: 38, capacity: 80, utilization_pct: 47.5, peak_hours: ["06:00", "07:00", "17:00"], trend: "stable", forecast_pct: 48.0, time_series: timeSeries, base_rate: 3000, estimated_monthly_revenue: 5400000 },
      { facility_id: "fac-003", facility_name: "Cancha de Tenis #1", facility_type: "tennis_court", status: "operational", current_occupancy: 3, capacity: 4, utilization_pct: 75.0, peak_hours: ["08:00", "09:00", "16:00"], trend: "stable", forecast_pct: 72.0, time_series: timeSeries, base_rate: 15000, estimated_monthly_revenue: 4500000 },
      { facility_id: "fac-006", facility_name: "Restaurante El Castillo", facility_type: "restaurant", status: "operational", current_occupancy: 45, capacity: 120, utilization_pct: 37.5, peak_hours: ["12:00", "13:00", "20:00"], trend: "stable", forecast_pct: 38.0, time_series: timeSeries, base_rate: 25000, estimated_monthly_revenue: 3750000 },
      { facility_id: "fac-008", facility_name: "Salón El Dorado", facility_type: "ballroom", status: "operational", current_occupancy: 0, capacity: 200, utilization_pct: 12.0, peak_hours: ["18:00", "19:00", "20:00"], trend: "stable", forecast_pct: 15.0, time_series: timeSeries, base_rate: 150000, estimated_monthly_revenue: 600000 },
      { facility_id: "fac-010", facility_name: "Spa & Wellness", facility_type: "spa", status: "maintenance", current_occupancy: 0, capacity: 20, utilization_pct: 0.0, peak_hours: [], trend: "declining", forecast_pct: 0.0, time_series: timeSeries, base_rate: 35000, estimated_monthly_revenue: 0 },
    ],
    total_capacity: 524,
    total_occupancy: 158,
    peak_facility: "Cancha de Tenis #1",
    lowest_facility: "Spa & Wellness",
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetSpaceOptimization(): GetSpaceOptimization_Contract {
  return {
    status: "success",
    message: "🏗️ 2 sugerencia(s) de optimización. 1 subutilizados, 1 sobrecargados.",
    suggestions: [
      {
        facility_id: "fac-010", facility_name: "Spa & Wellness",
        suggestion_type: "underutilized", current_use: "spa",
        suggested_use: "Evaluar reasignación como zona de yoga o wellness lounge",
        estimated_impact: "Potencial: +₡120,000/mes", priority: "medium",
        roi_estimate: "15%",
      },
      {
        facility_id: "fac-001", facility_name: "Piscina Principal",
        suggestion_type: "expansion", current_use: "pool",
        suggested_use: "Expandir horario nocturno o agregar zona de descanso",
        estimated_impact: "Reducir espera: 72/100 actual", priority: "high",
        roi_estimate: null,
      },
    ],
    underutilized_count: 1,
    overutilized_count: 1,
    total_potential_savings: 180000,
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetFacilityHealth(): GetFacilityHealth_Contract {
  return {
    status: "success",
    message: "🏥 Health: 78/100 (B — Saludable)",
    score: 78,
    grade: "B",
    level: "Saludable",
    trend: "stable",
    factors: [
      { name: "Utilización", score: 72, weight: 0.25, detail: "158/524 personas hoy", contribution: 18.0 },
      { name: "Mantenimiento", score: 65, weight: 0.25, detail: "1 atrasados, 1 en progreso", contribution: 16.3 },
      { name: "Inspecciones", score: 80, weight: 0.20, detail: "2 inspecciones recientes", contribution: 16.0 },
      { name: "Satisfacción", score: 75, weight: 0.15, detail: "Estimado (agente de satisfacción pendiente)", contribution: 11.3 },
      { name: "Eficiencia de costos", score: 85, weight: 0.15, detail: "₡8.2M revenue vs ₡4.67M maint/mes", contribution: 12.8 },
    ],
    alerts: [
      "1 tarea(s) de mantenimiento atrasada(s)",
      "Salón El Dorado: inspección con resultado major_issues",
    ],
    generated_at: new Date().toISOString(),
  };
}
// ── Member 360 Intelligence Factories ────────────────────────────────────────

const MEMBER_360_SEED = [
  { id: "m-001", first: "Carlos",   last: "González",  tier: "platino", role: "primary",  family: "González",  fam_id: "fam-001", join: "2020-06-15", age: 52, age_group: "adults" },
  { id: "m-002", first: "María",    last: "González",  tier: "platino", role: "spouse",   family: "González",  fam_id: "fam-001", join: "2020-06-15", age: 49, age_group: "adults" },
  { id: "m-003", first: "Roberto",  last: "Jiménez",   tier: "oro",     role: "primary",  family: "Jiménez",   fam_id: "fam-002", join: "2023-06-10", age: 45, age_group: "adults" },
  { id: "m-004", first: "Ana",      last: "Vargas",    tier: "oro",     role: "spouse",   family: "Jiménez",   fam_id: "fam-002", join: "2023-06-10", age: 42, age_group: "adults" },
  { id: "m-005", first: "Diego",    last: "Ramírez",   tier: "plata",   role: "primary",  family: "Ramírez",   fam_id: "fam-003", join: "2024-06-10", age: 38, age_group: "adults" },
  { id: "m-006", first: "Sofía",    last: "Herrera",   tier: "plata",   role: "primary",  family: "Herrera",   fam_id: "fam-004", join: "2023-12-15", age: 55, age_group: "adults" },
  { id: "m-007", first: "Fernando", last: "Castro",    tier: "bronce",  role: "primary",  family: "Castro",    fam_id: "fam-005", join: "2024-12-10", age: 35, age_group: "adults" },
  { id: "m-008", first: "Valentina",last: "Solano",    tier: "oro",     role: "primary",  family: "Solano",    fam_id: "fam-006", join: "2022-06-10", age: 48, age_group: "adults" },
  { id: "m-009", first: "Andrés",   last: "Morales",   tier: "basic",   role: "primary",  family: "Morales",   fam_id: "fam-007", join: "2025-04-26", age: 29, age_group: "young_adults" },
  { id: "m-010", first: "Patricia", last: "Vega",      tier: "premium", role: "primary",  family: "Vega",      fam_id: "fam-008", join: "2019-01-10", age: 61, age_group: "adults" },
  { id: "m-011", first: "Luis",     last: "González",  tier: "platino", role: "child",    family: "González",  fam_id: "fam-001", join: "2020-06-15", age: 22, age_group: "young_adults" },
  { id: "m-012", first: "Elena",    last: "Brenes",    tier: "vip",     role: "primary",  family: "Brenes",    fam_id: "fam-009", join: "2016-06-01", age: 67, age_group: "seniors" },
];

function pickMember(memberId?: string) {
  const m = memberId ? MEMBER_360_SEED.find((s) => s.id === memberId) : null;
  return m ?? MEMBER_360_SEED[Math.floor(Math.random() * MEMBER_360_SEED.length)];
}

function randomBetween(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

export function createMockGetMember360Profile(params?: { member_id?: string }): GetMember360Profile_Contract {
  const m = pickMember(params?.member_id);
  const healthScore = randomBetween(35, 95);
  const healthLevel = healthScore >= 85 ? "excellent" : healthScore >= 65 ? "healthy" : healthScore >= 45 ? "attention" : "critical";
  const churnScore = 100 - healthScore;
  const churnRisk = churnScore < 30 ? "low" : churnScore < 50 ? "medium" : churnScore < 70 ? "high" : "critical";
  const domains = ["events", "sports", "wellness", "cultural", "dining", "social"];
  const activeCount = Math.max(1, Math.floor(healthScore / 20));
  const active = domains.slice(0, activeCount);

  return {
    member: {
      member_id: m.id,
      first_name: m.first,
      last_name: m.last,
      email: `${m.first.toLowerCase()}@castillo.cr`,
      tier: m.tier,
      role: m.role,
      family_id: m.fam_id,
      family_name: m.family,
      join_date: m.join,
      age: m.age,
      age_group: m.age_group,
    },
    health_score: healthScore,
    health_level: healthLevel,
    journey_stage: healthScore >= 80 ? "peak" : healthScore >= 60 ? "growing" : healthScore >= 40 ? "plateau" : "at_risk",
    days_in_stage: Math.floor(Math.random() * 120) + 15,
    churn_risk: churnRisk,
    churn_score: churnScore,
    engagement_score: healthScore + randomBetween(-10, 10),
    ltv_estimate: randomBetween(8000, 85000),
    ltv_trend: healthScore > 70 ? "improving" : healthScore > 50 ? "stable" : "declining",
    active_domains: active,
    total_activities_90d: Math.floor(healthScore / 5) + Math.floor(Math.random() * 5),
    last_activity_date: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString(),
    connections_count: Math.max(1, Math.floor(Math.random() * 12) + 1),
    satisfaction_nps: randomBetween(5, 9.5),
    upcoming_milestones: [
      {
        milestone_id: `ms-${m.id}-ann`,
        date: new Date(Date.now() + 30 * 86400000).toISOString(),
        milestone_type: "anniversary",
        title: "Aniversario próximo",
        celebrated: false,
      },
    ],
    top_risks: churnRisk !== "low" ? [`Engagement en ${healthLevel}`, "Pocas actividades recientes"] : [],
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberHealthScore(params?: { member_id?: string }): GetMemberHealthScore_Contract {
  const m = pickMember(params?.member_id);
  const scores = {
    engagement: randomBetween(30, 95),
    financial: randomBetween(40, 95),
    social: randomBetween(20, 90),
    satisfaction: randomBetween(35, 95),
    activity: randomBetween(25, 90),
  };
  const weights = { engagement: 0.30, financial: 0.25, social: 0.20, satisfaction: 0.15, activity: 0.10 };
  const composite = Object.entries(scores).reduce((sum, [k, v]) => sum + v * weights[k as keyof typeof weights], 0);
  const level = composite >= 85 ? "excellent" : composite >= 65 ? "healthy" : composite >= 45 ? "attention" : "critical";
  const prev = composite + randomBetween(-8, 8);

  return {
    member_id: m.id,
    composite_score: Math.round(composite * 10) / 10,
    health_level: level,
    factors: Object.entries(scores).map(([name, score]) => ({
      name,
      score: Math.round(score * 10) / 10,
      weight: weights[name as keyof typeof weights],
      trend: score > 70 ? "improving" : score > 45 ? "stable" : "declining",
      details: `${name}: ${Math.round(score)}/100`,
    })),
    trend: composite >= prev ? "improving" : composite >= prev - 3 ? "stable" : "declining",
    trend_detail: `${composite >= prev ? "+" : ""}${Math.round((composite - prev) * 10) / 10} pts vs mes anterior`,
    previous_score: Math.round(prev * 10) / 10,
    benchmark_percentile: randomBetween(40, 95),
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberJourney(params?: { member_id?: string }): GetMemberJourney_Contract {
  const m = pickMember(params?.member_id);
  const stages = ["onboarding", "growing", "peak", "plateau"];
  const current = stages[Math.floor(Math.random() * stages.length)];

  return {
    member_id: m.id,
    current_stage: current,
    days_in_stage: Math.floor(Math.random() * 120) + 15,
    stage_history: stages.slice(0, stages.indexOf(current) + 1).map((stage, i) => ({
      stage,
      entered_at: new Date(Date.now() - (stages.indexOf(current) - i + 1) * 90 * 86400000).toISOString(),
      exited_at: i < stages.indexOf(current) ? new Date(Date.now() - (stages.indexOf(current) - i) * 90 * 86400000).toISOString() : null,
      duration_days: 60 + Math.floor(Math.random() * 90),
    })),
    milestones: [
      { milestone_id: `ms-${m.id}-join`, date: m.join + "T10:00:00", milestone_type: "join", title: "Bienvenido al Castillo", celebrated: true },
      { milestone_id: `ms-${m.id}-act50`, date: new Date(Date.now() - 60 * 86400000).toISOString(), milestone_type: "achievement", title: "50 actividades completadas", domain: "multiple", celebrated: true },
      { milestone_id: `ms-${m.id}-next`, date: new Date(Date.now() + 20 * 86400000).toISOString(), milestone_type: "celebration", title: "Evento especial sugerido", celebrated: false },
    ],
    next_expected_transition: current === "peak" ? "plateau" : current === "growing" ? "peak" : "at_risk",
    next_transition_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0],
    journey_health: current === "peak" ? "healthy" : current === "growing" ? "accelerating" : "stalled",
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberChurnPrediction(params?: { member_id?: string }): GetMemberChurnPrediction_Contract {
  const m = pickMember(params?.member_id);
  const health = randomBetween(35, 90);
  const churnScore = 100 - health;
  const risk = churnScore < 30 ? "low" : churnScore < 50 ? "medium" : churnScore < 70 ? "high" : "critical";

  return {
    member_id: m.id,
    churn_risk: risk,
    churn_score: Math.round(churnScore * 10) / 10,
    confidence: randomBetween(70, 95),
    risk_factors: risk !== "low" ? [
      { source: "engagement", factor: "engagement_low", weight: 0.3, detail: "Engagement score por debajo del promedio", severity: risk === "critical" ? "critical" : "high" },
      { source: "activity", factor: "activity_declining", weight: 0.2, detail: "Actividad en descenso los últimos 30 días", severity: "medium" },
    ] : [],
    protective_factors: [
      { source: "financial", factor: "payments_current", detail: "Pagos al día" },
      { source: "social", factor: "connections_strong", detail: "Red social activa" },
    ],
    time_horizon_days: 90,
    recommended_actions: risk === "critical" || risk === "high" ? [
      "Contactar personalmente en las próximas 48 horas",
      "Ofrecer experiencia personalizada sin costo",
    ] : ["Incluir en programa de engagement"],
    similar_churned_count: Math.floor(Math.random() * 8) + 2,
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberLTVAnalysis(params?: { member_id?: string }): GetMemberLTVAnalysis_Contract {
  const m = pickMember(params?.member_id);
  const tierMult = { vip: 3.0, platino: 2.5, oro: 2.0, premium: 1.8, plata: 1.3, bronce: 1.0, basic: 0.7 }[m.tier] ?? 1.0;
  const monthly = Math.round((150 + Math.random() * 650) * tierMult);
  const tenure = Math.max(1, Math.floor((Date.now() - new Date(m.join).getTime()) / (30 * 86400000)));
  const ltv = monthly * tenure;

  return {
    member_id: m.id,
    current_ltv: ltv,
    monthly_avg_spend: monthly,
    ltv_trend: monthly > 400 ? "improving" : monthly > 200 ? "stable" : "declining",
    ltv_tier: ltv > 50000 ? "high_value" : ltv > 20000 ? "standard" : ltv > 5000 ? "low_value" : "negative_trend",
    spend_breakdown: [
      { domain: "events",   amount: Math.round(monthly * 0.30), percentage: 30 },
      { domain: "sports",   amount: Math.round(monthly * 0.25), percentage: 25 },
      { domain: "wellness", amount: Math.round(monthly * 0.15), percentage: 15 },
      { domain: "cultural", amount: Math.round(monthly * 0.10), percentage: 10 },
      { domain: "dining",   amount: Math.round(monthly * 0.12), percentage: 12 },
      { domain: "guests",   amount: Math.round(monthly * 0.08), percentage: 8 },
    ],
    projection_12m: ltv + monthly * 12,
    projection_confidence: randomBetween(65, 90),
    benchmark_vs_tier: randomBetween(-15, 25),
    peak_month: "Diciembre",
    low_month: "Septiembre",
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberActivitySummary(params?: { member_id?: string }): GetMemberActivitySummary_Contract {
  const m = pickMember(params?.member_id);
  const total = 8 + Math.floor(Math.random() * 20);
  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return {
    member_id: m.id,
    total_activities: total,
    period_days: 90,
    by_domain: [
      { domain: "events",   count: Math.floor(total * 0.3), percentage: 30, trend: "stable",     last_activity: new Date(Date.now() - 3 * 86400000).toISOString() },
      { domain: "sports",   count: Math.floor(total * 0.25), percentage: 25, trend: "improving", last_activity: new Date(Date.now() - 1 * 86400000).toISOString() },
      { domain: "wellness", count: Math.floor(total * 0.15), percentage: 15, trend: "stable",    last_activity: new Date(Date.now() - 7 * 86400000).toISOString() },
      { domain: "cultural", count: Math.floor(total * 0.10), percentage: 10, trend: "declining", last_activity: new Date(Date.now() - 14 * 86400000).toISOString() },
      { domain: "social",   count: Math.floor(total * 0.20), percentage: 20, trend: "stable",    last_activity: new Date(Date.now() - 5 * 86400000).toISOString() },
    ],
    activity_heatmap: weekdays.flatMap((day) =>
      [7, 9, 11, 14, 16, 18, 20].map((hour) => ({
        weekday: day,
        hour,
        count: [9, 11, 18].includes(hour) ? Math.floor(Math.random() * 6) : Math.floor(Math.random() * 3),
      }))
    ),
    favorite_venues: [
      { venue: "Piscina Principal", visits: 12 + Math.floor(Math.random() * 10) },
      { venue: "Gimnasio", visits: 8 + Math.floor(Math.random() * 8) },
      { venue: "Salón de Eventos", visits: 3 + Math.floor(Math.random() * 5) },
    ],
    activity_streak_current: Math.floor(Math.random() * 14),
    activity_streak_longest: 14 + Math.floor(Math.random() * 30),
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberSocialProfile(params?: { member_id?: string }): GetMemberSocialProfile_Contract {
  const m = pickMember(params?.member_id);
  const numConn = 2 + Math.floor(Math.random() * 8);
  const others = MEMBER_360_SEED.filter((s) => s.id !== m.id);
  const connected = others.slice(0, Math.min(numConn, others.length));

  return {
    member_id: m.id,
    connections_count: connected.length,
    connections: connected.map((c) => ({
      connected_member_id: c.id,
      connected_name: `${c.first} ${c.last}`,
      connection_type: c.family === m.family ? "family" : Math.random() > 0.5 ? "friend" : "co_activity",
      strength: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
      shared_activities: 1 + Math.floor(Math.random() * 12),
      last_interaction: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    })),
    cluster_membership: ["sports_enthusiasts", "family_oriented"].slice(0, 1 + Math.floor(Math.random() * 2)),
    cluster_details: [
      { cluster: "sports_enthusiasts", members_count: 15, cohesion: 0.72, match_score: 0.85 },
    ],
    referrals_made: Math.floor(Math.random() * 4),
    referrals_converted: Math.floor(Math.random() * 3),
    social_influence_score: randomBetween(25, 90),
    recommended_connections: [
      { member_id: "m-008", name: "Valentina Solano", reason: "Comparten interés en tennis", shared_interests: ["tennis", "wellness"] },
    ],
    generated_at: new Date().toISOString(),
  };
}

export function createMockGenerateMemberEngagementProposals(params?: { member_id?: string }): GenerateMemberEngagementProposals_Contract {
  const m = pickMember(params?.member_id);

  return {
    member_id: m.id,
    proposals: [
      {
        proposal_id: `prop-${m.id}-cross`,
        proposal_type: "cross_domain",
        title: "Descubrir Cultural",
        description: `${m.first} no ha participado en actividades culturales. Invitar a próxima exposición.`,
        domain: "cultural",
        priority: "medium",
        estimated_impact: "medium",
        confidence: 72,
        suggested_action: "Enviar invitación a exposición de arte costarricense",
        related_members: [],
      },
      {
        proposal_id: `prop-${m.id}-social`,
        proposal_type: "social_connection",
        title: "Expandir Red Social",
        description: "Conectar con familias compatibles en el próximo brunch social.",
        domain: "social",
        priority: "medium",
        estimated_impact: "medium",
        confidence: 68,
        suggested_action: "Incluir en lista de invitados al brunch de integración",
        related_members: ["m-008"],
      },
      {
        proposal_id: `prop-${m.id}-wellness`,
        proposal_type: "wellness_program",
        title: "Programa de Bienestar",
        description: "Ofrecer sesión de cortesía en el spa para explorar servicios de wellness.",
        domain: "wellness",
        priority: "low",
        estimated_impact: "medium",
        confidence: 65,
        suggested_action: "Enviar cupón de cortesía para primer servicio de wellness",
        related_members: [],
      },
    ],
    total_proposals: 3,
    cross_domain_signals: [
      { signal: "engagement_trend", value: 65, status: "ok" },
      { signal: "social_density", value: 45, status: "attention" },
      { signal: "active_domains_count", value: 3, status: "ok" },
    ],
    generated_at: new Date().toISOString(),
  };
}

export function createMockGetMemberRiskAssessment(params?: { member_id?: string }): GetMemberRiskAssessment_Contract {
  const m = pickMember(params?.member_id);
  const health = randomBetween(35, 90);
  const riskScore = 100 - health;
  const overall = riskScore < 30 ? "low" : riskScore < 50 ? "medium" : riskScore < 70 ? "high" : "critical";

  return {
    member_id: m.id,
    overall_risk: overall,
    risk_score: Math.round(riskScore * 10) / 10,
    risk_factors: overall !== "low" ? [
      { source: "engagement", factor: "low_engagement_score", severity: "high", weight: 0.3, detail: "Engagement por debajo del promedio del tier", mitigation: "Iniciar plan de engagement personalizado" },
      { source: "social", factor: "social_isolation", severity: "medium", weight: 0.2, detail: "Pocas conexiones sociales en el club", mitigation: "Incluir en eventos de networking" },
    ] : [],
    protective_factors: [
      { source: "financial", factor: "payments_current", detail: "Historial de pagos al día" },
    ],
    risk_trend: health > 70 ? "improving" : health > 50 ? "stable" : "declining",
    similar_at_risk_count: 3 + Math.floor(Math.random() * 10),
    generated_at: new Date().toISOString(),
  };
}

export function createMockSearchMembers360(): SearchMembers360_Contract {
  const previews: Member360Preview_Contract[] = MEMBER_360_SEED.map((m) => {
    const health = randomBetween(30, 95);
    const churnScore = 100 - health;
    return {
      member_id: m.id,
      first_name: m.first,
      last_name: m.last,
      tier: m.tier,
      role: m.role,
      family_name: m.family,
      health_score: Math.round(health * 10) / 10,
      health_level: health >= 85 ? "excellent" : health >= 65 ? "healthy" : health >= 45 ? "attention" : "critical",
      churn_risk: churnScore < 30 ? "low" : churnScore < 50 ? "medium" : churnScore < 70 ? "high" : "critical",
      engagement_score: Math.round((health + randomBetween(-10, 10)) * 10) / 10,
      journey_stage: health >= 80 ? "peak" : health >= 60 ? "growing" : health >= 40 ? "plateau" : "at_risk",
      last_activity_date: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString(),
    };
  });

  return {
    members: previews.sort((a, b) => b.health_score - a.health_score),
    total: previews.length,
    page: 1,
    page_size: 20,
    filters_applied: {},
    generated_at: new Date().toISOString(),
  };
}
// ── AgeGroup Intelligence Factories (F40) ─────────────

export function createMockGetActivityHealthScore(
  _params?: Record<string, unknown>
) {
  const factors: import("@/shared/mocks/contracts").AgeGroupHealthFactor[] = [
    {
      name: "Teen Retention",
      score: 55.0,
      weight: 0.25,
      weighted_score: 13.75,
      impact: "high",
      detail: "18→8 teens en 6 meses (-56%)",
    },
    {
      name: "Program Variety",
      score: 72.0,
      weight: 0.20,
      weighted_score: 14.4,
      impact: "medium",
      detail: "6 programas activos pero pocos nuevos",
    },
    {
      name: "Family Engagement",
      score: 65.0,
      weight: 0.20,
      weighted_score: 13.0,
      impact: "medium",
      detail: "68% de familias participan en programas",
    },
    {
      name: "Retention Rate",
      score: 68.0,
      weight: 0.20,
      weighted_score: 13.6,
      impact: "medium",
      detail: "Retención 68% (benchmark: 75%)",
    },
    {
      name: "Cross-sell Rate",
      score: 45.0,
      weight: 0.15,
      weighted_score: 6.75,
      impact: "high",
      detail: "Solo 23% de familias usan >1 programa",
    },
  ];

  return {
    status: "success",
    message:
      "🟢 Health Score: 62/100 (attention) 📉. 2 factor(es) críticos: Teen Retention, Cross-sell Rate.",
    health_score: {
      score: 62,
      overall_score: 62,
      level: "attention" as const,
      factors,
      trend: "declining" as const,
      alerts: [
        "Teen Retention bajó 56% en 6 meses",
        "Cross-sell Rate (23%) muy por debajo del benchmark (40%)",
      ],
      summary:
        "Score 62/100 (attention). 2 factor(es) críticos: Teen Retention, Cross-sell Rate.",
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGetAgeRecommendationEnhanced(
  _params?: Record<string, unknown>
) {
  return {
    status: "success",
    message:
      "📋 2 hijos con recomendaciones: Sofía (14, teens) → 3 actividades. Mateo (8, kids) → 2 actividades.",
    recommendations: [
      {
        family_id: "fam-003",
        family_name: "Familia Rodríguez-Vargas",
        children: [
          {
            name: "Sofía Rodríguez",
            age: 14,
            age_group: "teens",
            current_activities: ["tennis"],
            recommended_activities: [
              {
                activity: "Fútbol",
                category: "sports",
                match_score: 82,
                reason: "Complementa condición física + socialización",
              },
              {
                activity: "Programa Liderazgo Juvenil",
                category: "leadership",
                match_score: 75,
                reason: "Edad ideal para habilidades blandas",
              },
              {
                activity: "Natación Competitiva",
                category: "sports",
                match_score: 70,
                reason: "Cross-training ideal + disciplina",
              },
            ],
            developmental_focus: [
              "Coordinación motriz fina",
              "Trabajo en equipo",
              "Confianza",
            ],
          },
          {
            name: "Mateo Rodríguez",
            age: 8,
            age_group: "kids",
            current_activities: ["swimming", "art"],
            recommended_activities: [
              {
                activity: "Fútbol Kids",
                category: "sports",
                match_score: 88,
                reason: "Energía alta + socialización activa",
              },
              {
                activity: "Teatro Infantil",
                category: "cultural",
                match_score: 72,
                reason: "Complementa creatividad con expresión corporal",
              },
            ],
            developmental_focus: [
              "Coordinación gruesa",
              "Socialización",
              "Creatividad",
            ],
          },
        ],
        priority: "medium",
        confidence: 0.78,
        cross_sell_opportunities: [
          "Paquete familiar deportes: 15% dto por 2+ hijos",
          "Programa verano: camp multi-deporte para ambos",
        ],
        sibling_benefits: [
          "Descuento 10% segundo hijo",
          "Horarios coordinados para ambos",
        ],
      },
    ],
  };
}

export function createMockGetAgeGroupAnalyticsEnhanced(
  _params?: Record<string, unknown>
) {
  return {
    status: "success",
    message:
      "📊 Analytics: 42 kids, 8 teens, 22 seniors. Retención: 68%. Satisfaction: 3.2/5. 6 programas.",
    analytics: {
      total_children_enrolled: 42,
      total_seniors_enrolled: 22,
      teens_enrolled: 8,
      kids_enrolled: 34,
      family_participation_rate: 68.0,
      retention_rate: 68.0,
      avg_satisfaction: 3.2,
      monthly_trends: [
        { month: "2026-01", teens_enrolled: 18, kids_enrolled: 30, seniors_enrolled: 6, family_participation: 72, retention_rate: 75, new_enrollments: 8 },
        { month: "2026-02", teens_enrolled: 16, kids_enrolled: 32, seniors_enrolled: 7, family_participation: 70, retention_rate: 73, new_enrollments: 6 },
        { month: "2026-03", teens_enrolled: 14, kids_enrolled: 33, seniors_enrolled: 7, family_participation: 68, retention_rate: 70, new_enrollments: 5 },
        { month: "2026-04", teens_enrolled: 12, kids_enrolled: 34, seniors_enrolled: 8, family_participation: 66, retention_rate: 68, new_enrollments: 4 },
        { month: "2026-05", teens_enrolled: 10, kids_enrolled: 35, seniors_enrolled: 7, family_participation: 64, retention_rate: 66, new_enrollments: 3 },
        { month: "2026-06", teens_enrolled: 8, kids_enrolled: 34, seniors_enrolled: 9, family_participation: 68, retention_rate: 68, new_enrollments: 5 },
      ],
      program_popularity: [
        { program: "Natación Infantil", enrollment_count: 18, satisfaction_avg: 4.3, retention_rate: 82 },
        { program: "Fútbol Kids", enrollment_count: 14, satisfaction_avg: 4.1, retention_rate: 75 },
        { program: "Tennis Academy", enrollment_count: 12, satisfaction_avg: 3.8, retention_rate: 68 },
        { program: "Arte & Creatividad", enrollment_count: 10, satisfaction_avg: 4.0, retention_rate: 70 },
        { program: "Programa Senior Activo", enrollment_count: 22, satisfaction_avg: 4.5, retention_rate: 88 },
        { program: "Gaming Teens", enrollment_count: 6, satisfaction_avg: 3.5, retention_rate: 45 },
      ],
      age_distribution: [
        { age_range: "0-3", count: 8, percentage: 11.3 },
        { age_range: "4-7", count: 16, percentage: 22.5 },
        { age_range: "8-12", count: 18, percentage: 25.4 },
        { age_range: "13-17", count: 8, percentage: 11.3 },
        { age_range: "55-65", count: 12, percentage: 16.9 },
        { age_range: "65+", count: 9, percentage: 12.7 },
      ],
      peak_activity_months: ["Enero", "Julio", "Diciembre"],
      generated_at: new Date().toISOString(),
    },
  };
}

export function createMockGenerateAgeGroupEngagementProposals(
  _params?: Record<string, unknown>
) {
  return {
    status: "success",
    message: "💡 4 propuestas: 1 prioridad alta, 3 cross-domain.",
    proposals: {
      proposals: [
        {
          proposal_id: "agp-001",
          proposal_type: "TEEN_REENGAGEMENT",
          title: "Re-engagement teens: Gaming + Deportes combo",
          description: "18→8 teens en 6 meses (-56%). Proponer combo a familias con teens inactivos.",
          target_family_ids: ["fam-003", "fam-007", "fam-009"],
          target_age_group: "teens",
          priority: "high",
          impact: "high",
          confidence: 0.82,
          cross_domain_signals: [
            "Teen enrollment -56% en 6 meses",
            "Satisfaction teens: 3.2/5 (bajo benchmark 3.8)",
            "12 familias con teens sin programa",
          ],
          suggested_action: {
            action: "send_teen_reengagement_campaign",
            domain: "communication",
            params: { age_group: "teens", campaign_type: "combo_sports_gaming" },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "agp-002",
          proposal_type: "CROSS_SELL_SIBLING",
          title: "Cross-sell: siblings en 1 programa → ampliar",
          description: "Solo 23% de familias usan >1 programa. 14 familias con hermanos en solo 1 actividad.",
          target_family_ids: ["fam-002", "fam-005", "fam-008"],
          target_age_group: "kids",
          priority: "medium",
          impact: "medium",
          confidence: 0.75,
          cross_domain_signals: [
            "Cross-sell rate: 23% (benchmark: 40%)",
            "Sibling discount sub-utilizado",
          ],
          suggested_action: {
            action: "send_sibling_cross_sell",
            domain: "communication",
            params: { campaign_type: "sibling_expansion" },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "agp-003",
          proposal_type: "SENIOR_EXPANSION",
          title: "Expandir programas senior: alta satisfacción",
          description: "Seniors: satisfacción 4.5/5 y retención 88%. Hay demanda para nuevos programas.",
          target_family_ids: [],
          target_age_group: "seniors",
          priority: "medium",
          impact: "medium",
          confidence: 0.70,
          cross_domain_signals: [
            "Senior satisfaction: 4.5/5 (mejor del club)",
            "Senior retention: 88% (benchmark: 75%)",
          ],
          suggested_action: {
            action: "propose_senior_program_expansion",
            domain: "sports",
            params: { programs: ["wellness", "yoga", "aqua_fitness"] },
          },
          created_at: new Date().toISOString(),
        },
        {
          proposal_id: "agp-004",
          proposal_type: "NEW_PROGRAM_PROPOSAL",
          title: "Nuevo programa: STEM para kids 8-12",
          description: "6 familias mencionaron interés en STEM/robotics. Sin oferta actual.",
          target_family_ids: ["fam-001", "fam-004", "fam-006"],
          target_age_group: "kids",
          priority: "low",
          impact: "medium",
          confidence: 0.65,
          cross_domain_signals: [
            "6 menciones de STEM en feedback",
            "0 programas tech para <13 años",
          ],
          suggested_action: {
            action: "propose_stem_program",
            domain: "sports",
            params: { age_range: "8-12", program_type: "stem_robotics" },
          },
          created_at: new Date().toISOString(),
        },
      ],
      total: 4,
      high_priority_count: 1,
      cross_domain_count: 3,
      generated_at: new Date().toISOString(),
    },
  };
}
// ── Member Engagement — Insight & Feedback (F45-B2) ──────────────────────

export function createMockGetEngagementInsights(
  params?: Record<string, unknown>,
) {
  const familyId = (params?.family_id as string) ?? "fam-001";

  type InsightEntry = {
    family_name: string;
    engagement_level: string;
    score: number;
    trend: string;
    trend_pct: number;
    risk_level: string;
  };

  // Deterministic lookup for top 5 families
  const INSIGHTS_DB: Record<string, InsightEntry> = {
    "fam-001": {
      family_name: "Familia Montes", engagement_level: "at_risk",
      score: 42, trend: "declining", trend_pct: -8.5,
      risk_level: "critical",
    },
    "fam-002": {
      family_name: "Familia Brenes", engagement_level: "active",
      score: 78, trend: "stable", trend_pct: 1.2,
      risk_level: "low",
    },
    "fam-003": {
      family_name: "Familia Quesada", engagement_level: "dormant",
      score: 18, trend: "declining", trend_pct: -12.0,
      risk_level: "critical",
    },
    "fam-004": {
      family_name: "Familia Herrera", engagement_level: "champion",
      score: 94, trend: "improving", trend_pct: 5.3,
      risk_level: "healthy",
    },
    "fam-005": {
      family_name: "Familia Solano", engagement_level: "cooling",
      score: 55, trend: "declining", trend_pct: -6.1,
      risk_level: "high",
    },
  };

  const baseInsight = INSIGHTS_DB[familyId] ?? {
    family_name: "Familia Ejemplo", engagement_level: "moderate",
    score: 62, trend: "stable", trend_pct: 0.5,
    risk_level: "medium",
  };

  return {
    status: "success",
    message: `🔍 Insights para ${baseInsight.family_name}: score ${baseInsight.score}, risk ${baseInsight.risk_level}.`,
    data: {
      family_id: familyId,
      family_name: baseInsight.family_name,
      engagement_score: baseInsight.score,
      engagement_level: baseInsight.engagement_level,
      trend: baseInsight.trend,
      trend_pct: baseInsight.trend_pct,
      risk_level: baseInsight.risk_level,
      risk_factors: [
        {
          factor: "low_attendance",
          impact: baseInsight.score < 50 ? 0.8 : 0.3,
          direction: "negative" as const,
          detail: `${Math.floor(baseInsight.score < 50 ? 2 : 5)} actividades en 30d (promedio: 8)`,
        },
        {
          factor: "no_recent_activity",
          impact: baseInsight.trend_pct < -5 ? 0.6 : 0.1,
          direction: "negative" as const,
          detail: `Última visita hace ${baseInsight.score < 30 ? "21" : "8"} días`,
        },
        {
          factor: "communication_open_rate",
          impact: 0.2,
          direction: baseInsight.score > 70 ? "positive" as const : "negative" as const,
          detail: `Open rate: ${baseInsight.score > 70 ? "72%" : "28%"} (benchmark: 55%)`,
        },
      ],
      dimensions: [
        { dimension: "Visitas", score: baseInsight.score * 0.9, weight: 0.3, trend: baseInsight.trend as "improving" | "stable" | "declining" },
        { dimension: "Eventos", score: baseInsight.score * 1.1, weight: 0.25, trend: "stable" as const },
        { dimension: "Wellness", score: baseInsight.score * 0.7, weight: 0.2, trend: "declining" as const },
        { dimension: "Comunicación", score: baseInsight.score * 1.05, weight: 0.15, trend: baseInsight.trend as "improving" | "stable" | "declining" },
        { dimension: "Referidos", score: baseInsight.score * 0.5, weight: 0.1, trend: "stable" as const },
      ],
      recommended_actions: [
        {
          action: baseInsight.risk_level === "critical" || baseInsight.risk_level === "high"
            ? "Llamada personal del gerente"
            : "Invitación a próximo evento",
          priority: baseInsight.risk_level === "critical" ? "high" as const : "medium" as const,
          expected_impact: baseInsight.score < 50 ? "+15-20 pts engagement" : "+5-10 pts engagement",
          category: baseInsight.score < 50 ? "communication" as const : "activity" as const,
        },
        {
          action: "Activar programa de wellness personalizado",
          priority: "medium" as const,
          expected_impact: "+8-12 pts engagement",
          category: "activity" as const,
        },
      ],
      peer_comparison: {
        tier_avg: baseInsight.engagement_level === "champion" ? 88 : baseInsight.engagement_level === "at_risk" ? 55 : 68,
        club_avg: 67.4,
        percentile: Math.min(99, Math.max(1, Math.round(baseInsight.score * 1.02))),
      },
      last_activity_days_ago: baseInsight.score < 30 ? 21 : baseInsight.score < 50 ? 12 : 4,
      confidence: baseInsight.risk_level === "critical" ? 0.92 : 0.78,
    },
  };
}

export function createMockSubmitFeedback(
  params?: Record<string, unknown>,
) {
  return {
    status: "success",
    message: "✅ Feedback registrado exitosamente.",
    data: {
      feedback_id: `fb-${Date.now()}`,
      family_id: (params?.family_id as string) ?? "fam-001",
      channel: (params?.channel as string) ?? "in_app",
      category: (params?.category as string) ?? "general",
      rating: (params?.rating as number) ?? 4,
      sentiment: (params?.rating as number ?? 4) >= 4
        ? "positive"
        : (params?.rating as number ?? 4) >= 3
          ? "neutral"
          : "negative",
      text: (params?.text as string) ?? null,
      acknowledged: true,
      follow_up_required: (params?.rating as number ?? 4) <= 2,
      created_at: new Date().toISOString(),
    },
  };
}
