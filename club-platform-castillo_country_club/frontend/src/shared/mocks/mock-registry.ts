// src/shared/mocks/mock-registry.ts
// ═══════════════════════════════════════════════════════════
// Mock Registry — Castillo Country Club
//
// Maps server.tool keys to typed factory functions.
// callMCPTool() looks up this registry before hitting the backend.
//
// To migrate a tool to backend real:
//   1. Delete the key from MOCK_REGISTRY
//   2. callMCPTool() will automatically fall through to /api/mcp
//   3. Verify backend response matches the contract in contracts.ts
//
// Auditado: Fase 14b — Mayo 2025
//   - Fix #35: Eliminada key duplicada get_financial_summary
//   - Fix #36: Agregado import faltante createMockFinancialSummary
//   - Fix #37: Agregados 13 imports faltantes de Fase 13
//   - Fix NEW-A: getMockResponse ahora pasa params a factories
//   - Fix NEW-B: Eliminados 4 imports muertos
//   - Fix NEW-C: Eliminado código comentado obsoleto
//   - Fix NEW-D: MockFactory type acepta params opcionales
//   - Fix NEW-E: Eliminada referencia obsoleta a mock-data.ts
// ═══════════════════════════════════════════════════════════
import { normalizeEnums } from "./normalizeEnums";

import {
  createFinancialAIReport,
  createEngagementAIReport,

  // ── Finance (Fase 7 + 13 + 14) ──
  createMockFinancialSummary,
  createMockFinanceExpenseCreate,
  createMockFinanceInvoiceCreate,
  createMockFinanceBudgetCheck,
  createMockFinancePaymentProcess,
  createMockFinanceReportGenerate,
  createMockFinanceAccountStatus,
  createMockFinanceCategoryUpdate,
  createMockGenerateAiAnalysis,
  createMockScenarioSimulation,
  createMockOpportunityScan,
  createMockBoardBriefing,
  createMockMemberProfitability,
  createMockStressTest,
  createMockSeasonalCalendar,

  // ── Member Engagement ──
  createEngagementDashboard,

  // ── Wellness (Fase 9) ──
  createWellnessReport,
  createMockWellnessProfile,
  createMockWellnessProfileUpdate,
  createMockWellnessActivityLog,
  createMockWellnessGoalSet,
  createMockWellnessRecommendations,
  createMockWellnessScheduleClass,
  createMockWellnessPredict,
  createMockWellnessAnomalies,
  createMockWellnessCorrelate,
  createMockWellnessInsights,

  // ── Satisfaction ──
  createSatisfactionTrends,

  // ── Proactive Recommendation (Fase 10) ──
  createMockPricingResponse,
  createMockSuggestionsResponse,
  createMockFamilyRecommendationsResponse,
  createMockPredictionResponse,
  createMockConflictsResponse,
  createMockPersonalizedCommunicationDraft,
  createMockClustersResponse,
  createMockInsightsResponse,

  // ── Communication (Fase 11) ──
  createBroadcastAnnouncement,
  createEmergencyBroadcast,
  createTemplateList,
  createScheduledList,
  createNotificationHistory,
  createAnnouncementList,
  createCommunicationAnalytics,
  createBoardPackage,
  createMockPreferencesResponse,
  createMockCommunicationInsightsResponse,

  // ── Guest Management (Fase 12) ──
  createMockRegisterGuestResponse,
  createMockPrivateEventResponse,
  createMockTrialMembershipsResponse,
  createMockGuestPrivilegesResponse,
  createMockGuestAnalyticsResponse,
  createMockGuestManagementInsightsResponse,

  // ── HITL ──
  createPendingApprovals,
  createApproveRequest,
  createRejectRequest,

  createMockNarrativeGenerate,
  createMockExportReport,

  createMockMembersHealthScore,
  createMockMembersSegmentation,
  createMockMembersLifetimeValue,
  createMockMembersChurnPrevention,

  createMockFinanceDecisionSimulate,
  createMockCommunicationsGeneratePersonalized,
  createMockCommunicationsCampaignGenerate,
  createMockCommunicationsSentimentAnalyze,
  
  createMockFamilyDetail,
  createMockFamilyList,
  createMockFamilyCreate,
  createMockFamilyUpdate,
  createMockActivityHistory,
  createMockSocialGraphEnriched,
  createMockFamilyChurnPrediction,
  createMockFamilyActivityRecommendations,
  createMockFamilySocialMatch,
  createMockFamilyEngagementPlan,
  createMockFamilySetPreferences,

  createMockEventList,
  createMockEventCreate,
  // ── Events Module (Fase 18) — NEW ──
  createMockEventGetCalendar,
  createMockEventBuildProgram,
  createMockEventManageRsvps,
  createMockEventCoordinateVendors,
  createMockEventManageCapacity,
  createMockEventGetAnalytics,
  createMockEventCloneTemplate,
  createMockEventGenerateReport,
  createMockEventPredictAttendance,
  createMockEventRecommendOptimization,
  createMockEventConflictDetection,
  createMockEventEngagementBoost,
  createMockEventGetDetail,
  createMockEventUpdateStatusNew,
  createMockExecutiveSummary,
  createMockOperationalPulse, 
  createMockComplianceAlertList,
  createMockComplianceReport,
  createMockDetectAnomalies,
  createMockFinancialOverview,
  createMockMembershipHealth,
  createMockAgeGroupBalance,
  createMockBoardReport,

  // ── Advisor Intelligence (Fase 21) ──
  createMockAdvisorNarrative,
  createMockAdvisorActionPlan,
  createMockAdvisorScenario,
  createMockAdvisorBoardBrief,
  createMockAdvisorAsk,
  createMockWellnessGoalList,

  createMockSearchDocuments,
  createMockKnowledgeQuery,
  createMockQueryDocuments,
  createMockSearchSimilar,
  createMockRepositoryStats,
  createMockIngestDocument,
  createMockKnowledgeReport,
  createMockManageDocumentAccess,
  createMockCommunicationInsights,
  createMockCommunicationHealth,
  createMockCampaignPerformance,
  createMockFamilyUpdateProfile,
  createMockFamilyLifecycleAnalysis,
  createMockFamily360Insight,
  createMockFamilyEnrichedGraph,
  createMockFamilyMilestoneTracker,
  createMockArtExhibitions,
  createMockCulturalAnalytics,
  createMockCulturalCalendar,
  createMockCulturalHITL,
  createMockCulturalPrograms,
  createMockCulturalProposals,
  createMockCulturalSummary,
  createMockEntertainmentActs,
  createMockSocialEvents,
  
  createMockManageCourtReservations,
  createMockOrganizeTournament,
  createMockManageFitnessClasses,
  createMockCoordinateCoaching,
  createMockManageSportLeagues,
  createMockGetEquipmentAvailability,
  createMockGetSportsRecommendations,
  createMockGetSportsAnalytics,
  createMockGetSportsHealthSummary,
  createMockGetSportsCalendar,
  createMockGenerateSportsProposals,

  createMockManageFacilities,
  createMockScheduleMaintenance,
  createMockCoordinateEventSetup,
  createMockGetFacilityOccupancy,
  createMockManageInspections,
  createMockReportFacilityIssue,
  createMockGetMaintenanceSchedule,
  createMockCreateFacilityReservation,
  createMockGetFacilityReservations,
  createMockGetFacilityAnalytics,
  createMockGetAmenityUtilization,
  createMockGetSpaceOptimization,
  createMockGetFacilityHealth,

  createMockGetMember360Profile,
  createMockGetMemberHealthScore,
  createMockGetMemberJourney,
  createMockGetMemberChurnPrediction,
  createMockGetMemberLTVAnalysis,
  createMockGetMemberActivitySummary,
  createMockGetMemberSocialProfile,
  createMockGenerateMemberEngagementProposals,
  createMockGetMemberRiskAssessment,
  createMockSearchMembers360,

  createMockGetActivityHealthScore,
  createMockGetAgeRecommendationEnhanced,
  createMockGetAgeGroupAnalyticsEnhanced,
  createMockGenerateAgeGroupEngagementProposals,

  // ── Guest Management Intelligence (F40) ──────────────
  createMockGetGuestHealthScore,
  createMockGetConversionFunnel,
  createMockGetGuestAnalyticsEnhanced,
  createMockGetGuestForecast,
  createMockGenerateGuestEngagementProposals,

  // ── Satisfaction Intelligence (F40) ──────────────────
  createMockGetSatisfactionHealthScore,
  createMockGetSatisfactionIntelligence,
  createMockGetSatisfactionBenchmark,
  createMockGenerateSatisfactionEngagementProposals,

  // ── ML Intelligence (F40) ────────────────────────────
  createMockGetDataQualityReport,
  createMockGetAnomalyReport,
  createMockGetDemandForecast,
  createMockGetRevenueForecast,
  createMockGetChurnMLScores,
  createMockGetMemberSegments,
  createMockGetModelHealth,
  createMockChatClubManager,
  createMockExplainPrediction,
  createMockSimulateHypothetical,
  createMockGetEngagementInsights,
  createMockSubmitFeedback,
  createExecutiveAiAnalysis,
  createMockIdentifySocialClusters,
} from "./factories";



// ── Types ──

type MockFactory = (params?: Record<string, unknown>) => unknown;

// ── Registry ──

/**
 * MOCK_REGISTRY[server][tool] = factory function
 *
 * Each factory returns typed data satisfying its contract.
 * The registry key format matches what callMCPTool() receives:
 *   server → tool
 *
 * To migrate a tool to backend real: delete the key.
 * callMCPTool() will fall through to /api/agents/{server}/{tool}.
 */
export const MOCK_REGISTRY: Record<string, Record<string, MockFactory>> = {

  // ── Executive Dashboard ──
  executive_dashboard: {
    export_report: (params) => createMockExportReport(params),
    get_executive_summary: () => createMockExecutiveSummary(),
    get_operational_pulse: () => createMockOperationalPulse(),
    detect_anomalies: (params) => createMockDetectAnomalies(params),
    get_financial_overview: () => createMockFinancialOverview(),
    get_membership_health: () => createMockMembershipHealth(),
    get_age_group_balance: () => createMockAgeGroupBalance(),
    generate_quarterly_board_report: (params) => createMockBoardReport(params),    
  },

  // ── Finance ──
  finance: {
    get_financial_summary: () =>
      createMockFinancialSummary(),
    finance_expense_create: (params) =>
      createMockFinanceExpenseCreate(params),

    finance_invoice_create: (params) =>
      createMockFinanceInvoiceCreate(params),
    finance_budget_check: (params) =>
      createMockFinanceBudgetCheck(params),
    finance_payment_process: (params) =>
      createMockFinancePaymentProcess(params),
    finance_report_generate: (params) =>
      createMockFinanceReportGenerate(params),
    finance_account_status: (params) =>
      createMockFinanceAccountStatus(params),
    finance_category_update: (params) =>
      createMockFinanceCategoryUpdate(params),
    generate_ai_analysis: (params) =>
      createMockGenerateAiAnalysis(params),
    finance_scenario_simulate: (params) =>
      createMockScenarioSimulation(params),
    finance_opportunities_scan: () =>
      createMockOpportunityScan(),
    finance_board_briefing: () =>
      createMockBoardBriefing(),
    finance_member_profitability: () =>
      createMockMemberProfitability(),
    finance_stress_test: (params) =>
      createMockStressTest(params),
    finance_seasonal_calendar: () =>
      createMockSeasonalCalendar(),
    finance_narrative_generate: (params) =>
      createMockNarrativeGenerate(params),
    finance_decision_simulate: (params) =>
      createMockFinanceDecisionSimulate(params),
  },

  // ── Member Engagement ──
  member_engagement: {
    get_engagement_dashboard: () => createEngagementDashboard(),
    get_engagement_insights: (params) => createMockGetEngagementInsights(params),
    submit_feedback: (params) => createMockSubmitFeedback(params),
    members_health_score: () => createMockMembersHealthScore(),
    members_segmentation: () => createMockMembersSegmentation(),
    members_lifetime_value: () => createMockMembersLifetimeValue(),
    members_churn_prevention: (params) => createMockMembersChurnPrevention(params),
  },

  // ── Wellness ──
  wellness: {
    wellness_report: () => createWellnessReport(),
    wellness_profile_get: () => createMockWellnessProfile(),
    wellness_profile_update: () =>
      createMockWellnessProfileUpdate(),
    wellness_activity_log: () =>
      createMockWellnessActivityLog(),
    wellness_goal_set: () =>
      createMockWellnessGoalSet(),
    wellness_recommendations: () =>
      createMockWellnessRecommendations(),
    wellness_schedule_class: () =>
      createMockWellnessScheduleClass(),
    wellness_goal_list: (params) =>
      createMockWellnessGoalList(params),
    wellness_predict: (params) =>
      createMockWellnessPredict(params),
    wellness_anomalies: (params) =>
      createMockWellnessAnomalies(params),
    wellness_correlate: () =>
      createMockWellnessCorrelate(),
    wellness_insights: () =>
      createMockWellnessInsights(),
  },

  // ── Compliance (Cross-agent, Phase 15) ──
  compliance: {
    compliance_alert_list: () => createMockComplianceAlertList(),
    compliance_report_generate: (params) => createMockComplianceReport(params),
  },
  // ── Facility Management (Cross-agent, Phase 15) ──
  facility_management: {
    // ── CRUD (7) ──
    manage_facilities: (params) => createMockManageFacilities(params),
    schedule_maintenance: () => createMockScheduleMaintenance(),
    coordinate_event_setup: () => createMockCoordinateEventSetup(),
    get_facility_occupancy: () => createMockGetFacilityOccupancy(),
    manage_inspections: (params) => createMockManageInspections(params),
    report_facility_issue: () => createMockReportFacilityIssue(),
    get_maintenance_schedule: () => createMockGetMaintenanceSchedule(),
    // ── Reservation (2) ──
    create_facility_reservation: () => createMockCreateFacilityReservation(),
    get_facility_reservations: () => createMockGetFacilityReservations(),
    // ── Intelligence (4) — on-demand (Rule #19) ──
    get_facility_analytics: () => createMockGetFacilityAnalytics(),
    get_amenity_utilization: () => createMockGetAmenityUtilization(),
    get_space_optimization: () => createMockGetSpaceOptimization(),
    get_facility_health: () => createMockGetFacilityHealth(),
  },


  // ── Proactive Recommendation ──
  proactive_recommendation: {
    optimize_pricing: () => createMockPricingResponse(),
    suggest_new_activities: () => createMockSuggestionsResponse(),
    generate_family_recommendations: (params) =>
      createMockFamilyRecommendationsResponse(params),
    predict_event_attendance: () =>
      createMockPredictionResponse(),
    detect_scheduling_conflicts: () =>
      createMockConflictsResponse(),
    personalize_communication: (params) =>
      createMockPersonalizedCommunicationDraft(params),
    identify_social_clusters: () =>
      createMockClustersResponse(),
    generate_quarterly_insights: () =>
      createMockInsightsResponse(),
  },

  // ── Communication ──
  communication: {
    broadcast_club_announcement: () =>
      createBroadcastAnnouncement(),
    manage_emergency_broadcast: () =>
      createEmergencyBroadcast(),
    manage_notification_templates: () =>
      createTemplateList(),
    schedule_notification: () => createScheduledList(),
    get_notification_history: () => createNotificationHistory(),
    list_announcements: () => createAnnouncementList(),
    get_communication_analytics: () =>
      createCommunicationAnalytics(),
    send_board_package: () => createBoardPackage(),
    manage_communication_preferences: (params) =>
      createMockPreferencesResponse(params),
    communication_insights: () =>
      createMockCommunicationInsightsResponse(),
    communications_generate_personalized: (params) =>
      createMockCommunicationsGeneratePersonalized(params),
    communications_campaign_generate: (params) =>
      createMockCommunicationsCampaignGenerate(params),
    communications_sentiment_analyze: (params) =>
      createMockCommunicationsSentimentAnalyze(params),
    generate_communication_insights: (params) =>
      createMockCommunicationInsights(params),
    get_communication_health: () =>
      createMockCommunicationHealth(),
    get_campaign_performance: (params) =>
      createMockCampaignPerformance(params),        
  },

  // ── Guest Management ──
  guest_management: {
    register_guest: (params) =>
      createMockRegisterGuestResponse(params),
    plan_private_event: (params) =>
      createMockPrivateEventResponse(params),
    manage_trial_memberships: (params) =>
      createMockTrialMembershipsResponse(params),
    manage_guest_privileges: (params) =>
      createMockGuestPrivilegesResponse(params),
    get_guest_analytics: () => createMockGuestAnalyticsResponse(),
    guest_management_insights: () =>
      createMockGuestManagementInsightsResponse(),

    // ── Guest Management Intelligence (F40) ──────────────
    get_guest_health_score: (params) =>
      createMockGetGuestHealthScore(params),
    get_conversion_funnel: (params) =>
      createMockGetConversionFunnel(params),
    get_guest_analytics_enhanced: (params) =>
      createMockGetGuestAnalyticsEnhanced(params),
    get_guest_forecast: (params) =>
      createMockGetGuestForecast(params),
    generate_guest_engagement_proposals: (params) =>
      createMockGenerateGuestEngagementProposals(params),
  },

  // ── Satisfaction Intelligence (F40) ──────────────────

  satisfaction: {
    get_satisfaction_trends: () => createSatisfactionTrends(),    
    get_satisfaction_health_score: (params) =>
      createMockGetSatisfactionHealthScore(params),
    get_satisfaction_intelligence: (params) =>
      createMockGetSatisfactionIntelligence(params),
    get_satisfaction_benchmark: (params) =>
      createMockGetSatisfactionBenchmark(params),
    generate_satisfaction_engagement_proposals: (params) =>
      createMockGenerateSatisfactionEngagementProposals(params),
  },

  // ── ML Intelligence (F40) — Club Brain ──────────────────
  ml_intelligence: {
    get_data_quality_report: (params) =>
      createMockGetDataQualityReport(params),
    get_anomaly_report: (params) =>
      createMockGetAnomalyReport(params),
    get_demand_forecast: (params) =>
      createMockGetDemandForecast(params),
    get_revenue_forecast: (params) =>
      createMockGetRevenueForecast(params),
    get_churn_ml_scores: (params) =>
      createMockGetChurnMLScores(params),
    get_member_segments: (params) =>
      createMockGetMemberSegments(params),
    get_model_health: (params) =>
      createMockGetModelHealth(params),
    chat_club_manager: (params) =>
      createMockChatClubManager(params),
    explain_prediction: (params) =>
      createMockExplainPrediction(params),
    simulate_hypothetical: (params) =>
      createMockSimulateHypothetical(params),
  },
  cultural_social: {
    organize_formal_gala: (params) =>
      createMockCulturalHITL(params),
    manage_entertainment_acts: (params) =>
      createMockEntertainmentActs(params),
    manage_social_events: (params) =>
      createMockSocialEvents(params),
    manage_cultural_program: (params) =>
      createMockCulturalPrograms(params),
    manage_art_exhibitions: (params) =>
      createMockArtExhibitions(params),
    get_cultural_calendar: () =>
      createMockCulturalCalendar(),
    get_cultural_analytics: () =>
      createMockCulturalAnalytics(),
    get_cultural_summary: () =>
      createMockCulturalSummary(),
    generate_cultural_proposals: () =>
      createMockCulturalProposals(),
  },

  // ── HITL ──
  hitl: {
    get_pending_approvals: () => createPendingApprovals(),
    approve_request: () => createApproveRequest(),
    reject_request: () => createRejectRequest(),
  },
  
  // ── Families — F29 Complete (16 tools) ──
  // Server name aligned with backend: family_profile
  family_profile: {
    // ── CRUD (8) ──
    family_get_profile: (params) => createMockFamilyDetail(params),
    family_search: () => createMockFamilyList(),
    family_create_profile: () => createMockFamilyCreate(),
    family_update_profile: (params) => createMockFamilyUpdateProfile(params),
    family_update_members: () => createMockFamilyUpdate(),
    family_get_activity_history: () => createMockActivityHistory(),
    family_get_social_graph: () => createMockSocialGraphEnriched(),
    family_set_preferences: () => createMockFamilySetPreferences(),
    // ── Intelligence (8) — on-demand (Rule #19) ──
    family_predict_churn: () => createMockFamilyChurnPrediction(),
    family_recommend_activities: () => createMockFamilyActivityRecommendations(),
    family_social_match: () => createMockFamilySocialMatch(),
    family_engagement_plan: () => createMockFamilyEngagementPlan(),
    family_lifecycle_analysis: (params) => createMockFamilyLifecycleAnalysis(params),
    family_360_insight: (params) => createMockFamily360Insight(params),
    family_social_graph_enriched: (params) => createMockFamilyEnrichedGraph(params),
    family_milestone_tracker: (params) => createMockFamilyMilestoneTracker(params),
    // ── Cross-family intelligence ──
    identify_social_clusters: (params) => createMockIdentifySocialClusters(params),

  },

  // ── Events (Fase 15 QA + Fase 18) ──
  events: {
    // Existing (Fase 15 QA)
    list_events: (params) => createMockEventList(params),
    get_event: (params) => createMockEventGetDetail(params),
    create_event: () => createMockEventCreate(),
    update_event_status: () => createMockEventUpdateStatusNew(),
    // NEW — Backend tools (Fase 18)
    event_get_calendar: () => createMockEventGetCalendar(),
    event_build_program: () => createMockEventBuildProgram(),
    event_manage_rsvps: (params) => createMockEventManageRsvps(params),
    event_coordinate_vendors: (params) => createMockEventCoordinateVendors(params),
    event_manage_capacity: () => createMockEventManageCapacity(),
    event_get_analytics: () => createMockEventGetAnalytics(),
    event_clone_template: () => createMockEventCloneTemplate(),
    event_generate_report: () => createMockEventGenerateReport(),
    // AI Intelligence (on-demand, mock-only)
    event_predict_attendance: () => createMockEventPredictAttendance(),
    event_recommend_optimization: () => createMockEventRecommendOptimization(),
    event_conflict_detection: () => createMockEventConflictDetection(),
    event_engagement_boost: () => createMockEventEngagementBoost(),
  },

  // ── Advisor Intelligence (Fase 21) ──
  advisor_intelligence: {
    generate_insight_narrative: (params) =>
      createMockAdvisorNarrative(params),
    generate_action_plan: (params) =>
      createMockAdvisorActionPlan(params),
    simulate_scenario: (params) =>
      createMockAdvisorScenario(params),
    generate_board_brief: (params) =>
      createMockAdvisorBoardBrief(params),
    ask_advisor: (params) =>
      createMockAdvisorAsk(params),
  },
  // ── Document Intelligence (RAG) — 8 tools ──
  document_intelligence: {
    search_documents: (params) => createMockSearchDocuments(params),
    knowledge_query: (params) => createMockKnowledgeQuery(params),
    query_documents: (params) => createMockQueryDocuments(params),
    search_similar: (params) => createMockSearchSimilar(params),
    get_repository_stats: () => createMockRepositoryStats(),
    ingest_document: (params) => createMockIngestDocument(params),
    generate_knowledge_report: () => createMockKnowledgeReport(),
    manage_document_access: (params) => createMockManageDocumentAccess(params),
  },

  // ═══ SPORTS & RECREATION (11 tools — F32) ═══
  sports_recreation: {
    // ── CRUD (7) ──
    manage_court_reservations: (params) => createMockManageCourtReservations(params),
    organize_tournament: (params) => createMockOrganizeTournament(params),
    manage_fitness_classes: (params) => createMockManageFitnessClasses(params),
    coordinate_coaching: (params) => createMockCoordinateCoaching(params),
    manage_sport_leagues: (params) => createMockManageSportLeagues(params),
    get_equipment_availability: (params) => createMockGetEquipmentAvailability(params),
    get_sports_recommendations: (params) => createMockGetSportsRecommendations(params),
    // ── Intelligence (4) — on-demand (Rule #19) ──
    get_sports_analytics: (params) => createMockGetSportsAnalytics(params),
    get_sports_health_summary: () => createMockGetSportsHealthSummary(),
    get_sports_calendar: (params) => createMockGetSportsCalendar(params),
    generate_sports_proposals: () => createMockGenerateSportsProposals(),
  },

  member_360: {
    get_member_360_profile: (params) => createMockGetMember360Profile(params),
    get_member_health_score: (params) => createMockGetMemberHealthScore(params),
    get_member_journey: (params) => createMockGetMemberJourney(params),
    get_member_churn_prediction: (params) => createMockGetMemberChurnPrediction(params),
    get_member_ltv_analysis: (params) => createMockGetMemberLTVAnalysis(params),
    get_member_activity_summary: (params) => createMockGetMemberActivitySummary(params),
    get_member_social_profile: (params) => createMockGetMemberSocialProfile(params),
    generate_member_engagement_proposals: (params) => createMockGenerateMemberEngagementProposals(params),
    get_member_risk_assessment: (params) => createMockGetMemberRiskAssessment(params),
    search_members_360: () => createMockSearchMembers360(),
  },
  age_group: {
    // ── AgeGroup Intelligence (F40) ───────────────────────

    get_activity_health_score: (params) =>
      createMockGetActivityHealthScore(params),
    get_age_recommendation_enhanced: (params) =>
      createMockGetAgeRecommendationEnhanced(params),
    get_age_group_analytics_enhanced: (params) =>
      createMockGetAgeGroupAnalyticsEnhanced(params),
    generate_age_group_engagement_proposals: (params) =>
      createMockGenerateAgeGroupEngagementProposals(params),

  }
};

// ── Lookup Function ──

/**
 * Get mock response for a server + tool combination.
 * Returns null if no mock exists (triggers real backend call).
 *
 * Special handling:
 * - generate_ai_analysis: routes by params.scope to dedicated factories
 *   (financial → createFinancialAIReport, engagement → createEngagementAIReport).
 *   Unknown scopes return null → caller falls through to backend.
 */
export function getMockResponse(
  server: string,
  tool: string,
  params?: Record<string, unknown>,
): unknown | null {
  // Scoped routing: tools that handle multiple data domains via params.scope
  // This is the ONLY place where scope routing happens — documented and typed.
  const SCOPED_TOOLS: Record<string, Record<string, () => unknown>> = {
    "executive_dashboard.generate_ai_analysis": {
      executive: createExecutiveAiAnalysis,
      financial: createFinancialAIReport,
      engagement: createEngagementAIReport,
    },
  };

  const scopedKey = `${server}.${tool}`;
  if (params?.scope && SCOPED_TOOLS[scopedKey]) {
    const scopeHandler = SCOPED_TOOLS[scopedKey][params.scope as string];
    if (scopeHandler) {
      try {
        return normalizeEnums(scopeHandler(), `${scopedKey}:${params.scope}`);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error(
            `[MockRegistry] Scoped factory failed for ${scopedKey} scope=${params.scope}:`,
            e,
          );
        }
        return null;
      }
    }
    // Unknown scope — fall through to normal registry lookup
  }

  const serverRegistry = MOCK_REGISTRY[server];
  if (!serverRegistry) return null;

  const factory = serverRegistry[tool];
  if (!factory) return null;

  return normalizeEnums(factory(params), `${server}.${tool}`);
}
