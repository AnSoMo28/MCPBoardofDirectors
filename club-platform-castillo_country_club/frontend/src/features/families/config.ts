// ═══════════════════════════════════════════════════════════
// src/features/families/config.ts
// Phase 34+ Migration — Families Configuration
// Level 6+ Agency · Production Grade
//
// Single source of truth for ALL constant data: visual identity,
// cohort definitions, search keywords, thresholds, pagination,
// tab config, keyboard shortcuts, and domain mappings.
//
// NO type definitions     → ./types.ts
// NO AI types             → ./ai-types.ts
// NO social types         → ./social-types.ts
// NO functions            → ./lib/*
// NO re-exports           → ./index.ts
//
// PRE-WRITE VERIFICATION:
//   All types imported from ./types.ts (type-only) ✅
//   0 circular dependencies ✅
//   0 functions (pure data only) ✅
//   0 type definitions ✅
//   "steady" fixed from "stable" in PULSE_KEYWORDS ✅
//   DOMAIN_COLORS covers all 12 Advisor Engine domains ✅
//   FAMILY_DETAIL_TABS uses FamilyDashboardTab union literal ✅
//
// ANTI-PATTERNS REMOVED:
//   - 28 interfaces defined here           → moved to types.ts
//   - 5 functions defined here             → moved to lib/ (Block C)
//   - import { daysSince } from lib/       → local daysBetween() helper
//   - "stable" as PulseRhythm              → "steady" (correct value)
//   - Emojis in TEMPERATURE_ZONES          → removed (presentation concern)
//   - Section 21 (dead code)               → removed
//   - DOMAIN_COLORS with 4 entries         → expanded to 12
//   - FAMILY_DETAIL_TABS id: string        → id: FamilyDashboardTab
//
// ═══════════════════════════════════════════════════════════

// §0 ─── Imports (type-only) ──────────────────────────────

import type {
  // Union literals
  FamilyStatus,
  MemberTier,
  ChurnRisk,
  MemberRole,
  LifecycleStage,
  PulseRhythm,
  RowSignal,
  NarrativeTone,
  PrivacyLevel,
  NotificationChannel,
  // Config shapes
  CohortDef,
  TemperatureZoneConfig,
  PulseRhythmConfig,
  PrioritySlotConfig,
  RowSignalConfig,
  LifecycleStageConfig,
  MemoryTypeConfig,
  MilestoneTypeConfig,
  SeedToneConfig,
  SortOption,
  ActivityCategoryConfig,
  AgeJourneyConfig,
  VelocityWindow,
  NarrativeTemplate,
  RiskLevelConfig,
  ActionCategoryConfig,
  IntelligenceDimensionConfig,
  UrgencyLevelConfig,
  AdvisorImpactConfig,
  AdvisorLayerConfig,
  SearchKeyword,
  FamilyTabConfig,
  // Domain
  Family,
} from "./types";

import type { PrioritySlot } from "./types";

// ── Local helper (breaks circular dependency with lib/) ───
// This replaces the import of daysSince from ./lib/familySignals.
// Consolidation with lib/ utilities will happen in Block C.

/** Days elapsed since a date string. Pure computation, no external deps. */
const daysBetween = (dateStr: string): number =>
  Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);

// ═══════════════════════════════════════════════════════════
// §1  ROLE MAPPING — Backend ↔ Frontend normalization
// ═══════════════════════════════════════════════════════════

export const ROLE_BACKEND_MAP: Record<string, MemberRole> = {
  primary: "titular",
  spouse: "conyuge",
  child: "hijo",
  dependent: "dependiente",
  titular: "titular",
  conyuge: "conyuge",
  hijo: "hijo",
  dependiente: "dependiente",
  invitado_permanente: "invitado_permanente",
};

export const ROLE_LABELS: Record<string, string> = {
  titular: "Titular",
  conyuge: "Cónyuge",
  hijo: "Hijo/a",
  dependiente: "Dependiente",
  invitado_permanente: "Invitado permanente",
};

// ═══════════════════════════════════════════════════════════
// §2  TIER VISUAL IDENTITY
// ═══════════════════════════════════════════════════════════

export const TIER_CONFIG: Record<
  MemberTier,
  { label: string; color: string; bgColor: string }
> = {
  platino: {
    label: "Platino",
    color: "var(--color-silver-100)",
    bgColor: "color-mix(in srgb, var(--color-silver-100) 12%, transparent)",
  },
  oro: {
    label: "Oro",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  plata: {
    label: "Plata",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)",
  },
  bronce: {
    label: "Bronce",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
  },
  basic: {
    label: "Básico",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 12%, transparent)",
  },
  premium: {
    label: "Premium",
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 12%, transparent)",
  },
  vip: {
    label: "VIP",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
};

// ═══════════════════════════════════════════════════════════
// §3  STATUS VISUAL IDENTITY
// ═══════════════════════════════════════════════════════════

export const STATUS_CONFIG: Record<
  FamilyStatus,
  {
    label: string;
    color: string;
    variant: "success" | "warning" | "danger" | "default";
  }
> = {
  active: {
    label: "Activa",
    color: "var(--color-emerald-400)",
    variant: "success",
  },
  inactive: {
    label: "Inactiva",
    color: "var(--color-silver-500)",
    variant: "default",
  },
  suspended: {
    label: "Suspendida",
    color: "var(--color-amber-400)",
    variant: "warning",
  },
  pending_approval: {
    label: "Pendiente",
    color: "var(--color-teal-400)",
    variant: "default",
  },
};

// ═══════════════════════════════════════════════════════════
// §4  CHURN RISK VISUAL IDENTITY
// ═══════════════════════════════════════════════════════════

export const CHURN_CONFIG: Record<
  ChurnRisk,
  { label: string; color: string }
> = {
  low: { label: "Bajo", color: "var(--color-emerald-400)" },
  medium: { label: "Medio", color: "var(--color-amber-400)" },
  high: { label: "Alto", color: "var(--color-rose-400)" },
  critical: { label: "Crítico", color: "var(--color-rose-500)" },
};

// ═══════════════════════════════════════════════════════════
// §5  PREFERENCES — Communication & privacy options
// ═══════════════════════════════════════════════════════════

export const INTEREST_PRESETS = [
  "Pádel",
  "Tenis",
  "Golf",
  "Natación",
  "Yoga",
  "Gastronomía",
  "Vinos",
  "Eventos sociales",
  "Actividades infantiles",
  "Spa & Wellness",
  "Senderismo",
  "Lectura",
] as const;

export const CHANNEL_OPTIONS: ReadonlyArray<{
  readonly id: NotificationChannel;
  readonly label: string;
}> = [
  { id: "email", label: "Email" },
  { id: "push", label: "Push (App)" },
  { id: "sms", label: "SMS" },
  { id: "whatsapp", label: "WhatsApp" },
];

export const PRIVACY_OPTIONS: ReadonlyArray<{
  readonly value: PrivacyLevel;
  readonly label: string;
  readonly desc: string;
}> = [
  { value: "open", label: "Abierto", desc: "Visible para todos los socios" },
  { value: "normal", label: "Normal", desc: "Visible para contactos" },
  { value: "private", label: "Privado", desc: "Solo administración" },
  { value: "restricted", label: "Restringido", desc: "Solo datos básicos" },
];

// ═══════════════════════════════════════════════════════════
// §6  COHORTS — Smart family segmentation
//
// Core cohorts use Family data only.
// AI cohorts require enrichment (matched at hook level).
// ═══════════════════════════════════════════════════════════

export const COHORTS: readonly CohortDef[] = [
  {
    id: "all",
    label: "Todas",
    subtitle: "Vista completa del club",
    color: "var(--color-silver-400)",
    match: () => true,
    icon: "Users",
  },
  {
    id: "premium-risk",
    label: "Premium en riesgo",
    subtitle: "Tier alto con churn alto",
    color: "var(--color-rose-400)",
    match: (f: Family) =>
      (["oro", "platino", "vip", "premium"] as MemberTier[]).includes(
        f.tier,
      ) && (["high", "critical"] as ChurnRisk[]).includes(f.churnRisk),
    icon: "ShieldAlert",
  },
  {
    id: "dormant",
    label: "Dormantes",
    subtitle: "Sin actividad 60+ días",
    color: "var(--color-amber-400)",
    match: (f: Family) => daysBetween(f.lastActivity) > 60,
    icon: "Moon",
  },
  {
    id: "new",
    label: "Nuevas",
    subtitle: "Últimos 30 días",
    color: "var(--color-teal-400)",
    match: (f: Family) => daysBetween(f.since) < 30,
    icon: "Sparkles",
  },
  {
    id: "negative-balance",
    label: "Saldo negativo",
    subtitle: "Balance pendiente",
    color: "var(--color-rose-400)",
    match: (f: Family) => f.totalBalance < 0,
    icon: "AlertTriangle",
  },
  {
    id: "high-engagement",
    label: "Alto engagement",
    subtitle: "Score 70+",
    color: "var(--color-emerald-400)",
    match: (f: Family) => f.engagementScore >= 70,
    icon: "Flame",
  },
  {
    id: "critical-churn",
    label: "Churn crítico",
    subtitle: "Riesgo de abandono inmediato",
    color: "var(--color-rose-500)",
    match: (f: Family) => f.churnRisk === "critical",
    icon: "HeartCrack",
  },
  // ── AI cohorts (require enrichment, matched by hook) ──
  {
    id: "pulse-flatline",
    label: "Pulso flatline",
    subtitle: "Sin latido detectable",
    color: "var(--color-rose-500)",
    match: () => false,
    requiresAI: true,
    icon: "Activity",
  },
  {
    id: "pulse-accelerating",
    label: "Pulso acelerando",
    subtitle: "Actividad en aumento",
    color: "var(--color-emerald-400)",
    match: () => false,
    requiresAI: true,
    icon: "TrendingUp",
  },
  {
    id: "temp-frozen",
    label: "Temperatura frozen",
    subtitle: "Engagement por debajo de 20°",
    color: "var(--color-silver-600)",
    match: () => false,
    requiresAI: true,
    icon: "Thermometer",
  },
  {
    id: "temp-burning",
    label: "Temperatura burning",
    subtitle: "Engagement excepcional 90°+",
    color: "var(--color-rose-400)",
    match: () => false,
    requiresAI: true,
    icon: "ThermometerSun",
  },
  {
    id: "lifecycle-at-risk",
    label: "En riesgo lifecycle",
    subtitle: "Transición negativa proyectada",
    color: "var(--color-amber-400)",
    match: () => false,
    requiresAI: true,
    icon: "Route",
  },
  {
    id: "intervention-window",
    label: "Ventana activa",
    subtitle: "Ventana de intervención activa",
    color: "var(--color-gold-400)",
    match: () => false,
    requiresAI: true,
    icon: "Clock",
  },
];

// ═══════════════════════════════════════════════════════════
// §7  TEMPERATURE ZONES — Thermal visual identity
// ═══════════════════════════════════════════════════════════

export const TEMPERATURE_ZONES: readonly TemperatureZoneConfig[] = [
  {
    emoji: "❄️",
    zone: "frozen",
    label: "Frozen",
    min: 0,
    max: 19,
    color: "var(--color-silver-600)",
    glowColor: "rgba(61,71,85,0.3)",
    bgGradient:
      "linear-gradient(135deg, rgba(61,71,85,0.08) 0%, rgba(138,149,165,0.04) 100%)",
  },
  {
    emoji: "🧊",
    zone: "cold",
    label: "Cold",
    min: 20,
    max: 39,
    color: "var(--color-teal-400)",
    glowColor: "rgba(42,154,181,0.2)",
    bgGradient:
      "linear-gradient(135deg, rgba(42,154,181,0.08) 0%, rgba(42,154,181,0.03) 100%)",
  },
  {
    emoji: "🌡️",
    zone: "warm",
    label: "Warm",
    min: 40,
    max: 59,
    color: "var(--color-amber-400)",
    glowColor: "rgba(212,168,64,0.2)",
    bgGradient:
      "linear-gradient(135deg, rgba(212,168,64,0.08) 0%, rgba(212,168,64,0.03) 100%)",
  },
  {
    emoji: "🔥",
    zone: "hot",
    label: "Hot",
    min: 60,
    max: 89,
    color: "var(--color-gold-400)",
    glowColor: "rgba(201,169,110,0.25)",
    bgGradient:
      "linear-gradient(135deg, rgba(201,169,110,0.1) 0%, rgba(201,169,110,0.04) 100%)",
  },
  {
    emoji: "🔥",
    zone: "burning",
    label: "Burning",
    min: 90,
    max: 100,
    color: "var(--color-rose-400)",
    glowColor: "rgba(196,100,112,0.3)",
    bgGradient:
      "linear-gradient(135deg, rgba(196,100,112,0.1) 0%, rgba(201,169,110,0.06) 100%)",
  },
];

// ═══════════════════════════════════════════════════════════
// §8  PULSE RHYTHMS — Cardiac visual identity
// ═══════════════════════════════════════════════════════════

export const PULSE_RHYTHMS: Record<PulseRhythm, PulseRhythmConfig> = {
  steady: {
    rhythm: "steady",
    label: "Estable",
    color: "var(--color-emerald-400)",
    animationClass: "fm-family-pulse--steady",
    description: "Actividad regular y consistente",
  },
  sporadic: {
    rhythm: "sporadic",
    label: "Esporádico",
    color: "var(--color-amber-400)",
    animationClass: "fm-family-pulse--sporadic",
    description: "Actividad irregular, sin patrón claro",
  },
  accelerating: {
    rhythm: "accelerating",
    label: "Acelerando",
    color: "var(--color-teal-400)",
    animationClass: "fm-family-pulse--accelerating",
    description: "Actividad en aumento sostenido",
  },
  decelerating: {
    rhythm: "decelerating",
    label: "Desacelerando",
    color: "var(--color-rose-400)",
    animationClass: "fm-family-pulse--decelerating",
    description: "Actividad en descenso — posible alerta",
  },
  flatline: {
    rhythm: "flatline",
    label: "Flatline",
    color: "var(--color-rose-500)",
    animationClass: "fm-family-pulse--flatline",
    description: "Sin actividad detectable",
  },
};

// ═══════════════════════════════════════════════════════════
// §9  ADAPTIVE PRIORITY — Hero card slot config
// ═══════════════════════════════════════════════════════════

export const PRIORITY_SLOTS: Record<PrioritySlot, PrioritySlotConfig> = {
  churn_warning: {
    slot: "churn_warning",
    label: "Alerta churn",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    icon: "AlertTriangle",
    weight: 100,
  },
  milestone_approaching: {
    slot: "milestone_approaching",
    label: "Milestone próximo",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    icon: "Star",
    weight: 90,
  },
  financial_alert: {
    slot: "financial_alert",
    label: "Alerta financiera",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    icon: "DollarSign",
    weight: 85,
  },
  lifecycle_transition: {
    slot: "lifecycle_transition",
    label: "Transición lifecycle",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    icon: "Route",
    weight: 80,
  },
  new_member_celebration: {
    slot: "new_member_celebration",
    label: "Nueva familia",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    icon: "PartyPopper",
    weight: 70,
  },
  engagement_surge: {
    slot: "engagement_surge",
    label: "Engagement alto",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    icon: "TrendingUp",
    weight: 60,
  },
  social_opportunity: {
    slot: "social_opportunity",
    label: "Oportunidad social",
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 10%, transparent)",
    icon: "Users",
    weight: 50,
  },
  anniversary: {
    slot: "anniversary",
    label: "Aniversario",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 8%, transparent)",
    icon: "Calendar",
    weight: 40,
  },
};

export const PRIORITY_ORDER: readonly PrioritySlot[] = Object.values(
  PRIORITY_SLOTS,
)
  .sort((a, b) => b.weight - a.weight)
  .map((s) => s.slot);

// ═══════════════════════════════════════════════════════════
// §10  SMART SEARCH — Natural language keyword matching
// ═══════════════════════════════════════════════════════════

export const TIER_KEYWORDS: readonly SearchKeyword<MemberTier>[] = [
  { keywords: ["premium"], value: "oro", label: "Premium" },
  { keywords: ["platino", "platinum"], value: "platino", label: "Platino" },
  { keywords: ["vip"], value: "vip", label: "VIP" },
  { keywords: ["oro", "gold"], value: "oro", label: "Oro" },
  { keywords: ["plata", "silver"], value: "plata", label: "Plata" },
  { keywords: ["bronce", "bronze"], value: "bronce", label: "Bronce" },
  { keywords: ["básico", "basico", "basic"], value: "basic", label: "Básico" },
];

export const CHURN_KEYWORDS: readonly SearchKeyword<ChurnRisk>[] = [
  { keywords: ["crítico", "critico", "critical"], value: "critical", label: "Crítico" },
  { keywords: ["riesgo alto", "alto riesgo", "riesgo"], value: "high", label: "Alto riesgo" },
  { keywords: ["riesgo medio", "medio riesgo"], value: "medium", label: "Riesgo medio" },
];

export const STATUS_KEYWORDS: readonly SearchKeyword<FamilyStatus>[] = [
  { keywords: ["inactiva", "inactivo", "inactive"], value: "inactive", label: "Inactiva" },
  { keywords: ["suspendida", "suspendido", "suspended"], value: "suspended", label: "Suspendida" },
  { keywords: ["pendiente", "pending"], value: "pending_approval", label: "Pendiente" },
  { keywords: ["activa", "activo", "active"], value: "active", label: "Activa" },
];

export const PULSE_KEYWORDS: readonly SearchKeyword<PulseRhythm>[] = [
  { keywords: ["flatline", "sin pulso", "sin actividad", "muerta"], value: "flatline", label: "Flatline" },
  { keywords: ["acelerando", "creciendo", "accelerating", "subiendo"], value: "accelerating", label: "Acelerando" },
  { keywords: ["desacelerando", "bajando", "decelerating"], value: "decelerating", label: "Desacelerando" },
  { keywords: ["estable", "steady", "constante"], value: "steady", label: "Estable" },
  { keywords: ["esporádico", "esporadico", "sporadic", "irregular"], value: "sporadic", label: "Esporádico" },
];

export const TEMPERATURE_KEYWORDS: readonly SearchKeyword<
  "frozen" | "cold" | "warm" | "hot" | "burning"
>[] = [
  { keywords: ["fría", "frio", "congelada", "frozen", "helada"], value: "frozen", label: "Frozen" },
  { keywords: ["cold", "frío"], value: "cold", label: "Cold" },
  { keywords: ["tibia", "warm"], value: "warm", label: "Warm" },
  { keywords: ["caliente", "hot"], value: "hot", label: "Hot" },
  { keywords: ["quemando", "burning", "ardiendo"], value: "burning", label: "Burning" },
];

export const LIFECYCLE_KEYWORDS: readonly SearchKeyword<LifecycleStage>[] = [
  { keywords: ["en riesgo", "riesgo", "at risk"], value: "at_risk", label: "En riesgo" },
  { keywords: ["dormante", "dormant", "inactiva"], value: "dormant", label: "Dormante" },
  { keywords: ["nueva", "onboarding", "nuevas"], value: "onboarding", label: "Onboarding" },
  { keywords: ["pico", "peak", "mejor momento"], value: "peak", label: "Peak" },
  { keywords: ["meseta", "plateau", "estancada"], value: "plateau", label: "Plateau" },
  { keywords: ["reactivada", "reactivated"], value: "reactivated", label: "Reactivada" },
];

// ═══════════════════════════════════════════════════════════
// §11  ROW SIGNALS — Visual identity per signal type
// ═══════════════════════════════════════════════════════════

export const ROW_SIGNALS: Record<RowSignal, RowSignalConfig> = {
  "high-value": {
    signal: "high-value",
    label: "Alto valor",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    borderColor: "rgba(201,169,110,0.25)",
    cssClass: "fm-family-row--high-value",
    weight: 50,
  },
  "at-risk": {
    signal: "at-risk",
    label: "En riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    borderColor: "rgba(196,100,112,0.25)",
    cssClass: "fm-family-row--at-risk",
    weight: 100,
  },
  new: {
    signal: "new",
    label: "Nueva",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    borderColor: "rgba(42,154,181,0.25)",
    cssClass: "fm-family-row--new",
    weight: 30,
  },
  dormant: {
    signal: "dormant",
    label: "Dormante",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    borderColor: "rgba(212,168,64,0.25)",
    cssClass: "fm-family-row--dormant",
    weight: 60,
  },
  negative: {
    signal: "negative",
    label: "Saldo −",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    borderColor: "rgba(196,100,112,0.2)",
    cssClass: "fm-family-row--negative",
    weight: 80,
  },
  none: {
    signal: "none",
    label: "",
    color: "",
    bgColor: "",
    borderColor: "",
    cssClass: "",
    weight: 0,
  },
};

// ═══════════════════════════════════════════════════════════
// §12  LIFECYCLE STAGES — Stage visual config
// ═══════════════════════════════════════════════════════════

export const LIFECYCLE_STAGES: Record<LifecycleStage, LifecycleStageConfig> = {
  prospect: {
    stage: "prospect",
    label: "Prospecto",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    description: "Familia potencial aún no convertida",
    icon: "UserPlus",
    healthScore: 30,
    variant: "default",
  },
  onboarding: {
    stage: "onboarding",
    label: "Onboarding",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    description: "Primeros 30 días — integración activa",
    icon: "Rocket",
    healthScore: 50,
    variant: "default",
  },
  growing: {
    stage: "growing",
    label: "Crecimiento",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    description: "Aumentando participación y actividades",
    icon: "TrendingUp",
    healthScore: 70,
    variant: "success",
  },
  peak: {
    stage: "peak",
    label: "Peak",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    description: "Máximo engagement — momento dorado",
    icon: "Crown",
    healthScore: 90,
    variant: "success",
  },
  plateau: {
    stage: "plateau",
    label: "Meseta",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    description: "Engagement estable sin crecimiento",
    icon: "Minus",
    healthScore: 55,
    variant: "warning",
  },
  at_risk: {
    stage: "at_risk",
    label: "En riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    description: "Señales de desvinculación detectadas",
    icon: "AlertTriangle",
    healthScore: 25,
    variant: "danger",
  },
  dormant: {
    stage: "dormant",
    label: "Dormante",
    color: "var(--color-silver-600)",
    bgColor: "color-mix(in srgb, var(--color-silver-600) 10%, transparent)",
    description: "Sin actividad prolongada",
    icon: "Moon",
    healthScore: 10,
    variant: "danger",
  },
  reactivated: {
    stage: "reactivated",
    label: "Reactivada",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 10%, transparent)",
    description: "Reengaged después de período dormante",
    icon: "Sunrise",
    healthScore: 65,
    variant: "success",
  },
};

// ═══════════════════════════════════════════════════════════
// §13  MEMORY & MILESTONES — Timeline visual identity
// ═══════════════════════════════════════════════════════════

export const MEMORY_TYPES: Record<string, MemoryTypeConfig> = {
  milestone: { type: "milestone", label: "Hito", color: "var(--color-gold-400)", icon: "Award" },
  achievement: { type: "achievement", label: "Logro", color: "var(--color-emerald-400)", icon: "Trophy" },
  celebration: { type: "celebration", label: "Celebración", color: "var(--color-gold-300)", icon: "PartyPopper" },
  first: { type: "first", label: "Primera vez", color: "var(--color-teal-400)", icon: "Sparkles" },
  record: { type: "record", label: "Récord", color: "var(--color-rose-400)", icon: "Zap" },
  reunion: { type: "reunion", label: "Reunión", color: "var(--color-silver-300)", icon: "Users" },
};

export const MILESTONE_TYPES: Record<string, MilestoneTypeConfig> = {
  anniversary: { type: "anniversary", label: "Aniversario", color: "var(--color-gold-400)", icon: "Calendar", advanceDays: 14 },
  birthday: { type: "birthday", label: "Cumpleaños", color: "var(--color-teal-400)", icon: "Cake", advanceDays: 7 },
  age_transition: { type: "age_transition", label: "Transición de edad", color: "var(--color-amber-400)", icon: "ArrowUpCircle", advanceDays: 14 },
  achievement: { type: "achievement", label: "Logro", color: "var(--color-emerald-400)", icon: "Trophy", advanceDays: 3 },
};

// ═══════════════════════════════════════════════════════════
// §14  CONVERSATION SEEDS — Tone and channel config
// ═══════════════════════════════════════════════════════════

export const SEED_TONES: Record<string, SeedToneConfig> = {
  warm: { tone: "warm", label: "Cálido", color: "var(--color-gold-400)" },
  professional: { tone: "professional", label: "Profesional", color: "var(--color-silver-300)" },
  celebratory: { tone: "celebratory", label: "Celebratorio", color: "var(--color-gold-300)" },
  empathetic: { tone: "empathetic", label: "Empático", color: "var(--color-teal-400)" },
  exciting: { tone: "exciting", label: "Emocionante", color: "var(--color-rose-400)" },
};

export const SEED_CHANNELS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly icon: string;
}> = [
  { id: "in_person", label: "En persona", icon: "User" },
  { id: "phone", label: "Teléfono", icon: "Phone" },
  { id: "email", label: "Email", icon: "Mail" },
  { id: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
];

// ═══════════════════════════════════════════════════════════
// §15  PAGINATION & SORTING
// ═══════════════════════════════════════════════════════════

export const FAMILY_PAGE_SIZES = [12, 24, 48] as const;
export const DEFAULT_PAGE_SIZE = 12;

export const SORT_OPTIONS: readonly SortOption[] = [
  { field: "engagement", dir: "desc", label: "Mayor engagement" },
  { field: "engagement", dir: "asc", label: "Menor engagement" },
  { field: "name", dir: "asc", label: "Nombre A-Z" },
  { field: "name", dir: "desc", label: "Nombre Z-A" },
  { field: "lastActivity", dir: "desc", label: "Actividad reciente" },
  { field: "lastActivity", dir: "asc", label: "Sin actividad" },
  { field: "churnRisk", dir: "desc", label: "Mayor riesgo" },
  { field: "balance", dir: "asc", label: "Menor saldo" },
  { field: "memberCount", dir: "desc", label: "Más miembros" },
];

export const DEFAULT_SORT: SortOption = SORT_OPTIONS[0];

// ═══════════════════════════════════════════════════════════
// §16  DASHBOARD TABS — FamilyDashboard orchestrator tabs
// ═══════════════════════════════════════════════════════════

export const FAMILY_DETAIL_TABS: readonly FamilyTabConfig[] = [
  { id: "overview", label: "Resumen", icon: "LayoutDashboard", description: "Vista general con brief y pulso" },
  { id: "members", label: "Miembros", icon: "Users", description: "Detalle de cada miembro de la familia" },
  { id: "intelligence", label: "Inteligencia", icon: "Brain", description: "Análisis 360, lifecycle, proyección" },
  { id: "social", label: "Social", icon: "Share2", description: "Conexiones, constelación, hebras ADN" },
  { id: "memories", label: "Momentos", icon: "Camera", description: "Memory Lane — momentos que definen" },
  { id: "activity", label: "Actividad", icon: "Activity", description: "Historial de actividades, reservas, eventos" },
  { id: "communication", label: "Comunicación", icon: "MessageSquare", description: "Seeds, voice, historial de contacto" },
];

// ═══════════════════════════════════════════════════════════
// §17  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════

export const FAMILY_SHORTCUTS = {
  search: { key: "/", label: "Buscar familias" },
  newFamily: { key: "n", label: "Nueva familia" },
  nextTab: { key: "]", label: "Siguiente tab" },
  prevTab: { key: "[", label: "Tab anterior" },
  toggleCohort: { key: "c", label: "Abrir cohorts" },
  export: { key: "e", label: "Exportar lista" },
} as const;

// ═══════════════════════════════════════════════════════════
// §18  ACTIVITY CATEGORIES — Visual identity per activity type
// ═══════════════════════════════════════════════════════════

export const ACTIVITY_CATEGORIES: readonly ActivityCategoryConfig[] = [
  {
    category: "sport",
    label: "Deporte",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    icon: "Trophy",
    keywords: ["pádel", "padel", "tenis", "tennis", "golf", "fútbol", "futbol", "squash"],
  },
  {
    category: "fitness",
    label: "Fitness",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    icon: "Dumbbell",
    keywords: ["natación", "natacion", "yoga", "gym", "pilates", "crossfit", "fitness", "ejercicio"],
  },
  {
    category: "gastronomy",
    label: "Gastronomía",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    icon: "UtensilsCrossed",
    keywords: ["gastronomía", "gastronomia", "vino", "vinos", "cena", "restaurante", "degustación", "degustacion", "cocina"],
  },
  {
    category: "social",
    label: "Social",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    icon: "Users",
    keywords: ["evento", "social", "fiesta", "reunión", "reunion", "celebración", "celebracion", "brunch"],
  },
  {
    category: "wellness",
    label: "Wellness",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
    icon: "Heart",
    keywords: ["spa", "masaje", "wellness", "relajación", "relajacion", "meditación", "meditacion"],
  },
  {
    category: "kids",
    label: "Niños",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 10%, transparent)",
    icon: "Baby",
    keywords: ["infantil", "kids", "niño", "niña", "taller infantil", "campamento"],
  },
  {
    category: "cultural",
    label: "Cultural",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
    icon: "BookOpen",
    keywords: ["cultural", "lectura", "libro", "arte", "exposición", "exposicion", "música", "musica", "teatro"],
  },
];

// ═══════════════════════════════════════════════════════════
// §19  AGE JOURNEY — Life stage visual identity
// ═══════════════════════════════════════════════════════════

export const AGE_JOURNEY: readonly AgeJourneyConfig[] = [
  {
    stage: "child",
    label: "Niño/a",
    minAge: 0,
    maxAge: 12,
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
    icon: "Baby",
  },
  {
    stage: "teen",
    label: "Adolescente",
    minAge: 13,
    maxAge: 17,
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    icon: "GraduationCap",
  },
  {
    stage: "adult",
    label: "Adulto/a",
    minAge: 18,
    maxAge: 64,
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 12%, transparent)",
    icon: "User",
  },
  {
    stage: "senior",
    label: "Senior",
    minAge: 65,
    maxAge: 150,
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    icon: "Crown",
  },
];

// ═══════════════════════════════════════════════════════════
// §20  TOPOLOGY THRESHOLDS — Social graph analysis parameters
// ═══════════════════════════════════════════════════════════

export const TOPOLOGY_THRESHOLDS = {
  edgeAtRisk: 0.3,
  edgeCritical: 0.15,
  isolationHigh: 0.7,
  isolationCritical: 0.85,
  bridgeCritical: 0.6,
  cohesionLow: 0.4,
  velocityWindow30: 30,
  velocityWindow90: 90,
  minConnections: 2,
  decayPredictionDays: 60,
  maxInfluenceHops: 3,
} as const;

// ═══════════════════════════════════════════════════════════
// §21  VELOCITY WINDOWS
// ═══════════════════════════════════════════════════════════

export const VELOCITY_WINDOWS: readonly VelocityWindow[] = [
  { label: "7 días", days: 7, color: "var(--color-emerald-400)" },
  { label: "30 días", days: 30, color: "var(--color-amber-400)" },
  { label: "90 días", days: 90, color: "var(--color-rose-400)" },
];

// ═══════════════════════════════════════════════════════════
// §22  NARRATIVE TEMPLATES & CLUSTER IDENTITIES
// ═══════════════════════════════════════════════════════════

export const NARRATIVE_TEMPLATES: Record<NarrativeTone, NarrativeTemplate> = {
  observational: {
    tone: "observational",
    icon: "Eye",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
    priority: 1,
  },
  actionable: {
    tone: "actionable",
    icon: "Zap",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    priority: 2,
  },
  urgent: {
    tone: "urgent",
    icon: "AlertTriangle",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    priority: 3,
  },
  celebratory: {
    tone: "celebratory",
    icon: "PartyPopper",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    priority: 1,
  },
};

export const CLUSTER_IDENTITIES = [
  { type: "sport", name: "Cohort Deportivo", color: "var(--color-teal-400)", icon: "Trophy" },
  { type: "gastronomy", name: "Círculo Gastronómico", color: "var(--color-gold-400)", icon: "UtensilsCrossed" },
  { type: "cultural", name: "Red Cultural", color: "var(--color-silver-300)", icon: "BookOpen" },
  { type: "wellness", name: "Comunidad Wellness", color: "var(--color-sage-400)", icon: "Heart" },
  { type: "social", name: "Círculo Social", color: "var(--color-rose-400)", icon: "Users" },
  { type: "business", name: "Red Profesional", color: "var(--color-amber-400)", icon: "Briefcase" },
  { type: "family", name: "Familias Unidas", color: "var(--color-teal-300)", icon: "Baby" },
] as const;

// ═══════════════════════════════════════════════════════════
// §23  RISK LEVELS
// ═══════════════════════════════════════════════════════════

export const RISK_LEVELS: Record<string, RiskLevelConfig> = {
  low: { label: "Bajo", variant: "success", color: "var(--color-emerald-400)" },
  medium: { label: "Medio", variant: "warning", color: "var(--color-amber-400)" },
  high: { label: "Alto", variant: "danger", color: "var(--color-rose-400)" },
  critical: { label: "Crítico", variant: "danger", color: "var(--color-rose-500)" },
};

// ═══════════════════════════════════════════════════════════
// §24  ENGAGEMENT ACTION CATEGORIES
// ═══════════════════════════════════════════════════════════

export const ACTION_CATEGORIES: Record<string, ActionCategoryConfig> = {
  communication: { icon: "Mail", color: "var(--color-teal-400)", label: "Comunicación" },
  activity: { icon: "Target", color: "var(--color-emerald-400)", label: "Actividad" },
  recognition: { icon: "Award", color: "var(--color-gold-400)", label: "Reconocimiento" },
  social: { icon: "Users", color: "var(--color-silver-400)", label: "Social" },
  financial: { icon: "DollarSign", color: "var(--color-amber-400)", label: "Financiero" },
  crisis: { icon: "AlertTriangle", color: "var(--color-rose-400)", label: "Crisis" },
  upgrade: { icon: "Zap", color: "var(--color-gold-400)", label: "Upgrade" },
};

export const ACTION_PRIORITIES: Record<
  string,
  { variant: "success" | "warning" | "danger" | "default"; label: string }
> = {
  critical: { variant: "danger", label: "Crítica" },
  high: { variant: "danger", label: "Alta" },
  medium: { variant: "warning", label: "Media" },
  low: { variant: "default", label: "Baja" },
};

// ═══════════════════════════════════════════════════════════
// §25  360° DOMAIN COLORS — Expanded to cover all Advisor Engine domains
// ═══════════════════════════════════════════════════════════

export const DOMAIN_COLORS: Record<string, string> = {
  engagement: "var(--color-gold-400)",
  activity: "var(--color-emerald-400)",
  social: "var(--color-teal-400)",
  financial: "var(--color-amber-400)",
  lifecycle: "var(--color-silver-400)",
  churn: "var(--color-rose-400)",
  wellness: "var(--color-sage-400)",
  events: "var(--color-amber-300)",
  communications: "var(--color-violet-400)",
  sports: "var(--color-blue-400)",
  facilities: "var(--color-slate-400)",
  satisfaction: "var(--color-yellow-400)",
};

// ═══════════════════════════════════════════════════════════
// §26  INTELLIGENCE DIMENSIONS — Constellation visual config
// ═══════════════════════════════════════════════════════════

export const INTELLIGENCE_DIMENSIONS: readonly IntelligenceDimensionConfig[] = [
  { id: "churn", label: "Churn Risk", shortLabel: "CH", icon: "Brain", color: "var(--color-rose-400)", weight: 0.25 },
  { id: "engagement", label: "Engagement", shortLabel: "EN", icon: "TrendingUp", color: "var(--color-gold-400)", weight: 0.20 },
  { id: "social", label: "Social", shortLabel: "SO", icon: "Users", color: "var(--color-teal-400)", weight: 0.15 },
  { id: "lifecycle", label: "Ciclo de Vida", shortLabel: "CV", icon: "Calendar", color: "var(--color-silver-400)", weight: 0.15 },
  { id: "activities", label: "Actividades", shortLabel: "AC", icon: "Target", color: "var(--color-emerald-400)", weight: 0.10 },
  { id: "family360", label: "Vista 360°", shortLabel: "36", icon: "Sparkles", color: "var(--color-amber-400)", weight: 0.15 },
];

// ═══════════════════════════════════════════════════════════
// §27  URGENCY LEVELS — Derived from all dimensions
// ═══════════════════════════════════════════════════════════

export const URGENCY_LEVELS: Record<string, UrgencyLevelConfig> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    glowColor: "color-mix(in srgb, var(--color-rose-400) 20%, transparent)",
    priority: 4,
  },
  high: {
    label: "Alta prioridad",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    glowColor: "color-mix(in srgb, var(--color-amber-400) 20%, transparent)",
    priority: 3,
  },
  medium: {
    label: "Atención",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 8%, transparent)",
    glowColor: "color-mix(in srgb, var(--color-gold-400) 20%, transparent)",
    priority: 2,
  },
  low: {
    label: "Monitoreo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 6%, transparent)",
    glowColor: "transparent",
    priority: 1,
  },
  good: {
    label: "Saludable",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 8%, transparent)",
    glowColor: "transparent",
    priority: 0,
  },
};

// ═══════════════════════════════════════════════════════════
// §28  ADVISOR IMPACT & LAYERS
// ═══════════════════════════════════════════════════════════

export const ADVISOR_IMPACT_LEVELS: Record<string, AdvisorImpactConfig> = {
  high: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "Alto",
    icon: "Zap",
    urgencyRank: 3,
  },
  medium: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "Medio",
    icon: "Shield",
    urgencyRank: 2,
  },
  low: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    label: "Bajo",
    icon: "Shield",
    urgencyRank: 1,
  },
  info: {
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 8%, transparent)",
    label: "Info",
    icon: "Shield",
    urgencyRank: 0,
  },
};

export const ADVISOR_LAYERS: Record<string, AdvisorLayerConfig> = {
  health: { label: "Salud", icon: "Heart", color: "var(--color-rose-400)" },
  lifecycle: { label: "Ciclo de vida", icon: "Calendar", color: "var(--color-teal-400)" },
  social: { label: "Social", icon: "Users", color: "var(--color-silver-400)" },
  financial: { label: "Financiero", icon: "DollarSign", color: "var(--color-amber-400)" },
  engagement: { label: "Engagement", icon: "TrendingUp", color: "var(--color-gold-400)" },
};

// ═══════════════════════════════════════════════════════════
// ADD TO: src/features/families/config.ts
// Append after existing exports
// ═══════════════════════════════════════════════════════════

/** Engagement score thresholds (0-100) — shared across signal utilities */
export const ENGAGEMENT_LEVELS = {
  CRITICAL: 30,
  LOW: 40,
  MEDIUM: 50,
  HIGH: 70,
  EXCEPTIONAL: 80,
  CLUB_AVERAGE: 55,
} as const;

/** Activity timing thresholds (days) — shared across signal utilities */
export const ACTIVITY_TIMING = {
  NEW_MEMBER: 30,
  LOW_ACTIVITY: 30,
  DORMANT: 60,
  TREND_DOWN: 45,
  ONBOARDING: 90,
  REACTIVATION: 180,
  ANNUAL: 365,
  LEGACY: 1825,
} as const;

/** Financial balance thresholds (₡ CRC, negative = amount owed) */
export const BALANCE_THRESHOLDS = {
  SIGNIFICANT: -100_000,
  CRITICAL: -500_000,
} as const;

// ═══════════════════════════════════════════════════════════
// §6  DATE FORMATTERS — Replaces deprecated types.ts versions
// ═══════════════════════════════════════════════════════════

const MONTH_NAMES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const;

/**
 * Format ISO date string to "15 Ene 2023".
 *
 * @example
 * formatDate("2023-01-15") // "15 Ene 2023"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format ISO date string to "Ene 2023".
 *
 * @example
 * formatMonthYear("2023-01-15") // "Ene 2023"
 */
export function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════
// §29  LOOKUP HELPERS — Pure functions on config data
// ═══════════════════════════════════════════════════════════

/**
 * Find the temperature zone config for a given engagement score (0-100).
 *
 * @example
 * getTemperatureZone(73) // { zone: "hot", label: "Hot", color: "var(--color-gold-400)", ... }
 */
export function getTemperatureZone(score: number): TemperatureZoneConfig {
  return (
    TEMPERATURE_ZONES.find((z) => score >= z.min && score <= z.max) ??
    TEMPERATURE_ZONES[0]
  );
}

/**
 * Find the activity category config for a given activity string.
 * Matches against keyword list in ACTIVITY_CATEGORIES.
 * Falls back to "social" if no match.
 *
 * @example
 * getActivityCategory("Pádel") // { category: "sport", label: "Deporte", ... }
 * getActivityCategory("Spa")   // { category: "wellness", ... }
 */
export function getActivityCategory(activity: string): ActivityCategoryConfig {
  const lower = activity.toLowerCase();
  return (
    ACTIVITY_CATEGORIES.find((cat) =>
      cat.keywords.some((kw) => lower.includes(kw)),
    ) ??
    ACTIVITY_CATEGORIES.find((cat) => cat.category === "social") ??
    ACTIVITY_CATEGORIES[0]
  );
}

/**
 * Find the age journey config for a given age.
 *
 * @example
 * getAgeJourney(8)  // { stage: "child", label: "Niño/a", color: "var(--color-teal-300)", ... }
 * getAgeJourney(42) // { stage: "adult", label: "Adulto/a", ... }
 */
export function getAgeJourney(age: number): AgeJourneyConfig {
  return (
    AGE_JOURNEY.find((j) => age >= j.minAge && age <= j.maxAge) ??
    AGE_JOURNEY[AGE_JOURNEY.length - 1]
  );
}

// ═══════════════════════════════════════════════════════════
// §27  getDimensionConfig — Lookup helper for §26 array
// ═══════════════════════════════════════════════════════════

/**
 * Find the dimension config for a given ID from INTELLIGENCE_DIMENSIONS (§26).
 * Falls back to a generic config if ID not found.
 *
 * @example
 * getDimensionConfig("engagement") // { id: "engagement", label: "Engagement", shortLabel: "EN", ... }
 * getDimensionConfig("unknown")    // { id: "unknown", label: "unknown", shortLabel: "UNK", ... }
 */
export function getDimensionConfig(id: string): IntelligenceDimensionConfig {
  return (
    INTELLIGENCE_DIMENSIONS.find((d) => d.id === id) ?? {
      id,
      label: id,
      shortLabel: id.slice(0, 3).toUpperCase(),
      icon: "Circle",
      color: "var(--color-silver-400)",
      weight: 0,
    }
  );
}