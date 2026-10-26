// src/shared/lib/advisor-engine/rule-registry.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Centralized Rule Registry (F57-B2)
//
// 185 deterministic rules across 10 domains.
// Single source of truth for System Analyzer (F55).
//
// Used by:
//   - buildDataSources.ts → engineRules for analyzer
//   - system-analyzer.ts → coverage/gap/redundancy analysis
//   - B3 (threshold expansion) → shared metric paths
//
// Rules: #26 (cross-domain enums), #28 (domain-specific types)
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";

// ── Types ──────────────────────────────────────────────────

export interface RuleRegistryEntry {
  id: string;
  title: string;
  domain: AIDomain;
  metrics: string[];
}

// ── Metric Paths (from NL Metric Dictionary §8) ────────────

const M = {
  revenue:      "summary.financial.total_revenue",
  expenses:     "summary.financial.total_expenses",
  margin:       "summary.financial.margin_pct",
  churn:        "summary.membership.churn_rate",
  retention:    "summary.membership.retention_rate",
  members:      "summary.membership.total_members",
  guests:       "summary.membership.guest_visits",
  occupancy:    "summary.operational.occupancy_rate",
  attendance:   "summary.operational.attendance_rate",
  events:       "summary.operational.total_events",
  satisfaction: "summary.operational.satisfaction_score",
  wellness:     "summary.operational.wellness_score",
  approvals:    "pendingApprovals",
  risk:         "_computed.systemic_risk",
  anomalies:    "_computed.anomaly_count",
  dataQuality:  "_computed.data_quality",
} as const;

// ── Compact constructor ────────────────────────────────────

function r(id: string, title: string, domain: AIDomain, metrics: string[] = []): RuleRegistryEntry {
  return { id, title, domain, metrics };
}

// ═══════════════════════════════════════════════════════════
// FINANCIAL — 25 rules (useFinancialAdvisor: 3 layers)
// ═══════════════════════════════════════════════════════════

const FINANCIAL_RULES: RuleRegistryEntry[] = [
  // ── Macro: Health & Trends ──
  r("fin_revenue_decline",          "Caída de ingresos",                   "financial", [M.revenue]),
  r("fin_margin_pressure",          "Presión en margen",                   "financial", [M.margin]),
  r("fin_expense_spike",            "Pico de gastos",                      "financial", [M.expenses]),
  r("fin_budget_overrun",           "Sobrepresupuesto",                    "financial", [M.expenses, M.revenue]),
  r("fin_seasonal_risk",            "Riesgo estacional",                   "financial", [M.revenue]),
  r("fin_collection_lag",           "Rezago de cobros",                    "financial", [M.revenue]),
  r("fin_margin_critical",          "Margen crítico",                      "financial", [M.margin]),
  r("fin_cashflow_warning",         "Alerta de flujo de caja",             "financial", [M.revenue, M.expenses]),
  r("fin_revenue_trend_negative",   "Tendencia de ingresos negativa",      "financial", [M.revenue]),
  // ── Micro: Detail & Ratios ──
  r("fin_concentration_risk",       "Riesgo de concentración de ingresos", "financial", [M.revenue]),
  r("fin_member_ltv_decline",       "Caída en LTV de miembros",            "financial", [M.revenue, M.members]),
  r("fin_cac_inefficiency",         "Ineficiencia en costo de adquisición","financial", [M.expenses, M.members]),
  r("fin_overdue_payments",         "Pagos vencidos acumulados",           "financial", [M.revenue]),
  r("fin_refund_spike",             "Pico de reembolsos",                  "financial", [M.expenses]),
  r("fin_pricing_below_market",     "Precios por debajo del mercado",      "financial", [M.revenue]),
  r("fin_cost_per_member_high",     "Costo por miembro elevado",           "financial", [M.expenses, M.members]),
  r("fin_revenue_per_event_low",    "Ingreso por evento bajo",             "financial", [M.revenue, M.events]),
  // ── Fusion: Cross-Domain ──
  r("fin_events_revenue_mismatch",  "Desalineación eventos-ingresos",      "financial", [M.revenue, M.events]),
  r("fin_membership_financial_health","Salud financiera de membresías",    "financial", [M.revenue, M.churn]),
  r("fin_wellness_cost_benefit",    "Costo-beneficio de bienestar",        "financial", [M.expenses, M.wellness]),
  r("fin_guest_conversion_roi",     "ROI de conversión de invitados",      "financial", [M.revenue, M.guests]),
  r("fin_seasonal_planning_gap",    "Brecha en planificación estacional",  "financial", [M.revenue]),
  r("fin_budget_variance_critical", "Varianza presupuestaria crítica",     "financial", [M.expenses, M.revenue]),
  r("fin_revenue_forecast_divergence","Divergencia en pronóstico de ingresos","financial", [M.revenue]),
  r("fin_financial_risk_score",     "Puntuación de riesgo financiero",     "financial", [M.margin, M.revenue]),
];

// ═══════════════════════════════════════════════════════════
// EVENTS — 25 rules (useEventAdvisor: 3 layers)
// ═══════════════════════════════════════════════════════════

const EVENT_RULES: RuleRegistryEntry[] = [
  // ── Macro: Capacity & Calendar ──
  r("evt_capacity_alert",            "Alerta de capacidad",                "events", [M.occupancy]),
  r("evt_low_engagement",            "Bajo engagement en eventos",          "events", [M.attendance]),
  r("evt_calendar_conflict",         "Conflicto de calendario",             "events", [M.events]),
  r("evt_venue_underutilized",       "Venue subutilizado",                  "events", [M.occupancy]),
  r("evt_low_rsvp",                  "RSVP bajo",                           "events", [M.attendance]),
  r("evt_seasonal_peak",             "Pico estacional de eventos",          "events", [M.events]),
  r("evt_attendance_forecast_low",   "Pronóstico de asistencia bajo",       "events", [M.attendance]),
  r("evt_holiday_planning_late",     "Planificación de feriados tardía",    "events", [M.events]),
  r("evt_rsvp_deadline_pressure",    "Presión en fecha límite de RSVP",     "events", [M.attendance]),
  // ── Micro: Operations & Cost ──
  r("evt_pricing_optimization",      "Oportunidad de optimización de precios","events", [M.revenue, M.events]),
  r("evt_category_imbalance",        "Desequilibrio de categorías",         "events", [M.events]),
  r("evt_sponsorship_opportunity",   "Oportunidad de patrocinio",           "events", [M.revenue]),
  r("evt_catering_cost_alert",       "Alerta de costos de catering",        "events", [M.expenses]),
  r("evt_venue_maintenance_conflict","Conflicto venue-mantenimiento",       "events", [M.occupancy]),
  r("evt_repeat_event_performance",  "Rendimiento de eventos recurrentes",  "events", [M.attendance, M.events]),
  r("evt_guest_event_conversion",    "Conversión de invitados en eventos",  "events", [M.guests, M.attendance]),
  r("evt_budget_per_event_high",     "Presupuesto por evento elevado",      "events", [M.expenses, M.events]),
  r("evt_setup_time_exceeded",       "Tiempo de preparación excedido",      "events", []),
  r("evt_vendor_cost_increase",      "Aumento de costos de proveedores",    "events", [M.expenses]),
  // ── Fusion: Cross-Domain ──
  r("evt_member_preferred_times",    "Horarios preferidos de miembros",     "events", [M.attendance, M.members]),
  r("evt_family_event_gap",          "Brecha en eventos familiares",        "events", [M.attendance, M.members]),
  r("evt_cultural_program_demand",   "Demanda de programas culturales",     "events", [M.attendance]),
  r("evt_weather_risk_outdoor",      "Riesgo climático para eventos al aire libre", "events", [M.occupancy]),
  r("evt_cross_promotion_missing",   "Falta de cross-promoción",            "events", [M.attendance]),
  r("evt_event_roi_tracking",        "Seguimiento de ROI de eventos",       "events", [M.revenue, M.events]),
];

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT — 30 rules (15 core + 15 guest pipeline)
// ═══════════════════════════════════════════════════════════

const ENGAGEMENT_RULES: RuleRegistryEntry[] = [
  // ── Core Engagement (15) ──
  r("eng_churn_predictor",           "Predictor de churn",                  "engagement", [M.churn]),
  r("eng_churn_critical",            "Churn crítico",                       "engagement", [M.churn]),
  r("eng_retention_warning",         "Advertencia de retención",            "engagement", [M.retention]),
  r("eng_member_inactive",           "Miembro inactivo",                    "engagement", [M.retention]),
  r("eng_reengagement",              "Re-engagement necesario",             "engagement", [M.retention]),
  r("eng_engagement_score_drop",     "Caída en score de engagement",        "engagement", [M.retention]),
  r("eng_activity_participation_low","Participación en actividades baja",   "engagement", [M.attendance]),
  r("eng_dormant_member_spike",      "Pico de miembros dormidos",           "engagement", [M.retention]),
  r("eng_cross_sell_opportunity",    "Oportunidad de cross-sell",           "engagement", [M.revenue, M.members]),
  r("eng_loyalty_program_underused", "Programa de lealtad subutilizado",    "engagement", [M.retention]),
  r("eng_member_satisfaction_gap",   "Brecha de satisfacción de miembros",  "engagement", [M.satisfaction]),
  r("eng_social_isolation_detected", "Aislamiento social detectado",        "engagement", [M.retention]),
  r("eng_family_engagement_decline", "Caída en engagement familiar",        "engagement", [M.retention, M.members]),
  r("eng_new_member_integration",    "Integración de nuevos miembros",      "engagement", [M.retention]),
  r("eng_anniversary_opportunity",   "Oportunidad de aniversario",          "engagement", [M.members]),
  // ── Guest Pipeline (15) — domain: engagement ──
  r("guest_pipeline_weak",           "Pipeline de invitados débil",         "engagement", [M.guests]),
  r("guest_conversion_low",          "Conversión baja",                     "engagement", [M.guests, M.members]),
  r("guest_repeat_rate",             "Tasa de repetición de invitados",     "engagement", [M.guests]),
  r("guest_satisfaction_low",        "Satisfacción de invitados baja",      "engagement", [M.guests, M.satisfaction]),
  r("guest_event_affinity",          "Afinidad de invitados a eventos",     "engagement", [M.guests, M.events]),
  r("guest_sport_interest",          "Interés deportivo de invitados",      "engagement", [M.guests]),
  r("guest_wellness_interest",       "Interés en bienestar de invitados",   "engagement", [M.guests, M.wellness]),
  r("guest_family_fit",              "Ajuste familiar de invitados",        "engagement", [M.guests, M.members]),
  r("guest_trial_conversion",        "Conversión de prueba de invitados",   "engagement", [M.guests]),
  r("guest_referral_opportunity",    "Oportunidad de referidos",            "engagement", [M.guests]),
  r("guest_duration_optimal",        "Duración óptima de visita",           "engagement", [M.guests]),
  r("guest_peak_timing",             "Horario pico de visitas",             "engagement", [M.guests]),
  r("guest_pricing_sensitivity",     "Sensibilidad al precio de invitados", "engagement", [M.guests]),
  r("guest_cultural_interest",       "Interés cultural de invitados",       "engagement", [M.guests]),
  r("guest_network_effect",          "Efecto de red de invitados",          "engagement", [M.guests, M.members]),
];

// ═══════════════════════════════════════════════════════════
// COMMUNICATION — 15 rules (useCommunicationAdvisor: 2 layers)
// ═══════════════════════════════════════════════════════════

const COMMUNICATION_RULES: RuleRegistryEntry[] = [
  r("comm_critical_open_rate",       "Tasa de apertura crítica",            "communication", [M.attendance]),
  r("comm_channel_optimize",         "Optimizar canal de comunicación",     "communication", [M.attendance]),
  r("comm_frequency_too_high",       "Frecuencia de comunicación excesiva", "communication", []),
  r("comm_frequency_too_low",        "Frecuencia de comunicación insuficiente","communication", []),
  r("comm_unsubscribe_spike",        "Pico de desuscripciones",             "communication", [M.retention]),
  r("comm_content_relevance_low",    "Relevancia de contenido baja",        "communication", [M.attendance]),
  r("comm_delivery_failure",         "Falla en entrega de comunicaciones",  "communication", []),
  r("comm_segment_targeting_poor",   "Segmentación deficiente",             "communication", [M.members]),
  r("comm_personalization_missing",  "Falta de personalización",            "communication", [M.satisfaction]),
  r("comm_event_promotion_weak",     "Promoción de eventos débil",          "communication", [M.attendance, M.events]),
  r("comm_engagement_drop",          "Caída en engagement de comunicaciones","communication", [M.attendance]),
  r("comm_sms_preferred",            "Preferencia de SMS detectada",        "communication", []),
  r("comm_email_bounce_rate",        "Tasa de rebote de emails",            "communication", []),
  r("comm_notification_timing",      "Timing de notificaciones subóptimo",  "communication", [M.attendance]),
  r("comm_campaign_roi_low",         "ROI de campañas bajo",                "communication", [M.revenue]),
];

// ═══════════════════════════════════════════════════════════
// SPORTS — 15 rules (useSportsAdvisor: 5 layers)
// ═══════════════════════════════════════════════════════════

const SPORTS_RULES: RuleRegistryEntry[] = [
  r("spt_utilization_drop",          "Caída en utilización deportiva",      "sports", [M.occupancy]),
  r("spt_capacity_warning",          "Advertencia de capacidad deportiva",  "sports", [M.occupancy]),
  r("spt_class_underfill",           "Clases con baja inscripción",         "sports", [M.attendance]),
  r("spt_coaching_satisfaction",     "Satisfacción con entrenadores",       "sports", [M.satisfaction]),
  r("spt_equipment_maintenance",     "Mantenimiento de equipos",            "sports", []),
  r("spt_court_utilization_low",     "Utilización de canchas baja",         "sports", [M.occupancy]),
  r("spt_program_diversity_gap",     "Brecha en diversidad de programas",   "sports", [M.events]),
  r("spt_peak_hour_congestion",      "Congestión en horas pico",            "sports", [M.occupancy]),
  r("spt_youth_program_demand",      "Demanda de programas juveniles",      "sports", [M.attendance]),
  r("spt_tournament_engagement",     "Engagement en torneos",               "sports", [M.attendance]),
  r("spt_member_skill_stagnation",   "Estancamiento de habilidades",        "sports", [M.satisfaction]),
  r("spt_cross_sport_interest",      "Interés cross-deportivo",             "sports", [M.attendance]),
  r("spt_seasonal_activity_shift",   "Cambio estacional de actividades",    "sports", [M.occupancy]),
  r("spt_injury_prevention_alert",   "Alerta de prevención de lesiones",    "sports", []),
  r("spt_facility_upgrade_need",     "Necesidad de mejora de instalaciones","sports", [M.satisfaction]),
];

// ═══════════════════════════════════════════════════════════
// FAMILY / AGE GROUP — 15 rules
// ═══════════════════════════════════════════════════════════

const FAMILY_RULES: RuleRegistryEntry[] = [
  r("age_imbalance",                 "Desequilibrio etario",                "family", [M.members]),
  r("age_youth_decline",             "Caída en jóvenes",                    "family", [M.members]),
  r("age_senior_growth",             "Crecimiento senior",                  "family", [M.members]),
  r("fam_engagement_decline",        "Caída en engagement familiar",        "family", [M.retention]),
  r("fam_youth_program_gap",         "Brecha en programas juveniles",       "family", [M.attendance]),
  r("fam_senior_activity_demand",    "Demanda de actividades para seniors", "family", [M.attendance]),
  r("fam_family_event_attendance",   "Asistencia a eventos familiares",     "family", [M.attendance, M.events]),
  r("fam_childcare_need",            "Necesidad de cuidado infantil",       "family", [M.satisfaction]),
  r("fam_intergenerational_program", "Oportunidad de programa intergeneracional","family", [M.members]),
  r("fam_family_wellness_trend",     "Tendencia de bienestar familiar",     "family", [M.wellness]),
  r("fam_membership_lifecycle",      "Ciclo de vida de membresía familiar", "family", [M.retention]),
  r("fam_family_financial_health",   "Salud financiera familiar",           "family", [M.revenue]),
  r("fam_social_connection_weak",    "Conexión social débil",               "family", [M.retention]),
  r("fam_milestone_celebration",     "Celebración de hitos familiares",     "family", [M.members]),
  r("fam_cross_family_network",      "Red inter-familiar",                  "family", [M.members]),
];

// ═══════════════════════════════════════════════════════════
// SATISFACTION — 15 rules (useSatisfactionAdvisor: 4 layers)
// ═══════════════════════════════════════════════════════════

const SATISFACTION_RULES: RuleRegistryEntry[] = [
  r("sat_critical_decline",          "Caída crítica de satisfacción",       "satisfaction", [M.satisfaction]),
  r("sat_below_target",              "Satisfacción bajo objetivo",          "satisfaction", [M.satisfaction]),
  r("sat_recovery_opportunity",      "Oportunidad de recuperación",         "satisfaction", [M.satisfaction]),
  r("sat_service_quality_drop",      "Caída en calidad de servicio",        "satisfaction", [M.satisfaction]),
  r("sat_facility_maintenance_complaint","Queja por mantenimiento",         "satisfaction", [M.satisfaction]),
  r("sat_staff_performance",         "Rendimiento del personal",            "satisfaction", [M.satisfaction]),
  r("sat_food_beverage_quality",     "Calidad de alimentos y bebidas",      "satisfaction", [M.satisfaction]),
  r("sat_pricing_perception",        "Percepción de precios",               "satisfaction", [M.satisfaction, M.revenue]),
  r("sat_wait_time_exceeded",        "Tiempo de espera excedido",           "satisfaction", [M.satisfaction]),
  r("sat_amenity_gap",               "Brecha en amenidades",                "satisfaction", [M.satisfaction]),
  r("sat_cleanliness_issue",         "Problema de limpieza",                "satisfaction", [M.satisfaction]),
  r("sat_noise_complaint",           "Queja de ruido",                      "satisfaction", [M.satisfaction]),
  r("sat_parking_satisfaction",      "Satisfacción con estacionamiento",    "satisfaction", [M.satisfaction]),
  r("sat_digital_experience",        "Experiencia digital",                 "satisfaction", [M.satisfaction]),
  r("sat_recommendation_score_low",  "NPS bajo",                            "satisfaction", [M.satisfaction]),
];

// ═══════════════════════════════════════════════════════════
// GLOBAL — 30 rules (useGlobalAdvisor: 5 layers)
// ═══════════════════════════════════════════════════════════

const GLOBAL_RULES: RuleRegistryEntry[] = [
  // ── Diagnostic ──
  r("global_systemic_risk",              "Riesgo sistémico",                    "global", [M.risk]),
  r("global_data_quality",               "Calidad de datos",                    "global", [M.dataQuality]),
  r("global_anomaly_cluster",            "Cluster de anomalías",                "global", [M.anomalies]),
  r("global_cross_domain_cascade",       "Cascada cross-domain",                "global", [M.revenue, M.satisfaction]),
  r("global_approval_backlog",           "Backlog de aprobaciones",             "global", [M.approvals]),
  r("global_operational_efficiency",     "Eficiencia operativa",                "global", [M.occupancy, M.attendance]),
  r("global_kpi_dashboard_health",       "Salud del dashboard de KPIs",         "global", [M.dataQuality]),
  r("global_alert_response_time",        "Tiempo de respuesta a alertas",       "global", [M.anomalies]),
  // ── Strategy ──
  r("global_member_growth_stagnation",   "Estancamiento de crecimiento",        "global", [M.members]),
  r("global_competitive_position",       "Posición competitiva",                "global", [M.members, M.satisfaction]),
  r("global_brand_health",               "Salud de marca",                      "global", [M.satisfaction]),
  r("global_revenue_diversification",    "Diversificación de ingresos",         "global", [M.revenue]),
  r("global_cost_optimization",          "Optimización de costos",              "global", [M.expenses]),
  r("global_risk_concentration",         "Concentración de riesgo",             "global", [M.risk]),
  r("global_talent_retention",           "Retención de talento",                "global", []),
  r("global_stakeholder_alignment",      "Alineación de stakeholders",          "global", []),
  // ── Prediction ──
  r("global_member_lifetime_value",      "Valor de vida de miembro",            "global", [M.revenue, M.members]),
  r("global_operational_resilience",     "Resiliencia operativa",               "global", [M.anomalies]),
  r("global_financial_sustainability",   "Sostenibilidad financiera",           "global", [M.revenue, M.expenses]),
  r("global_systemic_risk_trend",        "Tendencia de riesgo sistémico",       "global", [M.risk]),
  r("global_insight_actionability",      "Accionabilidad de insights",          "global", []),
  r("global_strategic_initiative_progress","Progreso de iniciativas estratégicas","global", []),
  // ── Innovation ──
  r("global_technology_adoption",        "Adopción tecnológica",                "global", []),
  r("global_sustainability_initiative",  "Iniciativa de sostenibilidad",        "global", []),
  r("global_innovation_index",           "Índice de innovación",                "global", []),
  r("global_digital_transformation",     "Transformación digital",              "global", []),
  r("global_community_engagement",       "Engagement comunitario",              "global", [M.satisfaction]),
  // ── Execution ──
  r("global_governance_compliance",      "Cumplimiento de gobernanza",          "global", [M.approvals]),
  r("global_market_positioning",         "Posicionamiento de mercado",          "global", [M.members, M.revenue]),
  r("global_service_excellence",         "Excelencia de servicio",              "global", [M.satisfaction]),
];

// ═══════════════════════════════════════════════════════════
// ML INTELLIGENCE — 15 rules (useMLAdvisor: 3 layers)
// ═══════════════════════════════════════════════════════════

const ML_RULES: RuleRegistryEntry[] = [
  r("ml_churn_model_accuracy",       "Precisión del modelo de churn",       "ml_intelligence", [M.churn]),
  r("ml_revenue_forecast_drift",     "Deriva en pronóstico de ingresos",    "ml_intelligence", [M.revenue]),
  r("ml_anomaly_detection_rate",     "Tasa de detección de anomalías",      "ml_intelligence", [M.anomalies]),
  r("ml_data_freshness",             "Frescura de datos",                   "ml_intelligence", [M.dataQuality]),
  r("ml_feature_importance_shift",   "Cambio en importancia de features",   "ml_intelligence", []),
  r("ml_prediction_confidence_drop", "Caída en confianza de predicciones",  "ml_intelligence", []),
  r("ml_model_staleness",            "Obsolescencia del modelo",            "ml_intelligence", [M.dataQuality]),
  r("ml_segmentation_quality",       "Calidad de segmentación",             "ml_intelligence", [M.members]),
  r("ml_recommendation_relevance",   "Relevancia de recomendaciones",       "ml_intelligence", [M.satisfaction]),
  r("ml_outlier_detection_sensitivity","Sensibilidad de detección de outliers","ml_intelligence", [M.anomalies]),
  r("ml_pattern_recognition_gap",    "Brecha en reconocimiento de patrones", "ml_intelligence", []),
  r("ml_data_completeness",          "Completitud de datos",                "ml_intelligence", [M.dataQuality]),
  r("ml_model_bias_alert",           "Alerta de sesgo del modelo",          "ml_intelligence", []),
  r("ml_cross_validation_score",     "Score de cross-validation",           "ml_intelligence", []),
  r("ml_ensemble_diversity",         "Diversidad del ensemble",             "ml_intelligence", []),
];

// ═══════════════════════════════════════════════════════════
// COMBINED EXPORT
// ═══════════════════════════════════════════════════════════

export const ENGINE_RULES: RuleRegistryEntry[] = [
  ...FINANCIAL_RULES,
  ...EVENT_RULES,
  ...ENGAGEMENT_RULES,
  ...COMMUNICATION_RULES,
  ...SPORTS_RULES,
  ...FAMILY_RULES,
  ...SATISFACTION_RULES,
  ...GLOBAL_RULES,
  ...ML_RULES,
];

// ── Convenience exports ────────────────────────────────────

/** Rules grouped by domain */
export const RULES_BY_DOMAIN: Record<string, RuleRegistryEntry[]> =
  ENGINE_RULES.reduce<Record<string, RuleRegistryEntry[]>>((acc, rule) => {
    (acc[rule.domain] ??= []).push(rule);
    return acc;
  }, {});

/** Set of all rule IDs for validation */
export const RULE_IDS = new Set(ENGINE_RULES.map((rule) => rule.id));

/** Total count — should be 185 */
export const RULE_COUNT = ENGINE_RULES.length;

/** Per-domain counts for quick reference */
export const RULE_COUNTS_BY_DOMAIN: Record<string, number> =
  ENGINE_RULES.reduce<Record<string, number>>((acc, rule) => {
    acc[rule.domain] = (acc[rule.domain] ?? 0) + 1;
    return acc;
  }, {});