// ═══════════════════════════════════════════════════════════
// §1 — ENUMS (backend 1:1)
// ═══════════════════════════════════════════════════════════

// ── Existing (10) ─────────────────────────────────────────

export enum SportType {
  TENNIS = "tennis",
  GOLF = "golf",
  SWIMMING = "swimming",
  FITNESS = "fitness",
  BASKETBALL = "basketball",
  VOLLEYBALL = "volleyball",
  FOOTBALL = "football",
  SQUASH = "squash",
  PADEL = "padel",
  YOGA = "yoga",
  PILATES = "pilates",
}

export enum ReservationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  BLOCKED = "blocked",
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = "single_elimination",
  DOUBLE_ELIMINATION = "double_elimination",
  ROUND_ROBIN = "round_robin",
  GROUPS_THEN_KNOCKOUT = "groups_then_knockout",
}

export enum TournamentStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  CONFIRMED = "confirmed",
  REGISTRATION_OPEN = "registration_open",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ClassType {
  GROUP = "group",
  PRIVATE = "private",
  SEMI_PRIVATE = "semi_private",
  DROP_IN = "drop_in",
}

export enum SkillLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  ALL_LEVELS = "all_levels",
}

export enum EquipmentCondition {
  NEW = "new",
  GOOD = "good",
  FAIR = "fair",
  NEEDS_REPAIR = "needs_repair",
  RETIRED = "retired",
}

export enum LeagueFormat {
  ROUND_ROBIN = "round_robin",
  DOUBLE_ROUND_ROBIN = "double_round_robin",
  DIVISIONS = "divisions",
}

export enum LeagueStatus {
  PROPOSED = "proposed",
  ACTIVE = "active",
  PAUSED = "paused",
  COMPLETED = "completed",
}

export enum CalendarItemType {
  RESERVATION = "reservation",
  TOURNAMENT = "tournament",
  CLASS = "class",
  COACHING = "coaching",
  LEAGUE = "league",
}

// ── New (8) ───────────────────────────────────────────────

/** Individual athletic skill tier — for member profiles, NOT class enrollment */
export enum AthleticLevel {
  NOVICE = "novice",
  APPRENTICE = "apprentice",
  PRACTITIONER = "practitioner",
  EXPERT = "expert",
  MASTER = "master",
  LEGEND = "legend",
}

/** 6 axes of athletic ability — §S1 AthleticProfile */
export enum AthleticAxis {
  POWER = "power",
  SPEED = "speed",
  ENDURANCE = "endurance",
  TECHNIQUE = "technique",
  TACTICAL = "tactical",
  MENTAL = "mental",
}

/** Sport classification for cross-sport analysis */
export enum SportCategory {
  RACQUET = "racquet",
  WATER = "water",
  FITNESS = "fitness",
  TEAM = "team",
  INDIVIDUAL = "individual",
  WELLNESS = "wellness",
}

/** Real-time venue status — §S2 ArenaGrid */
export enum VenueLiveStatus {
  IDLE = "idle",
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  RESERVED = "reserved",
  PEAK = "peak",
}

/** Season narrative structure — §S8 SeasonEngine */
export enum SeasonAct {
  OPENING = "opening",
  RIVALRIES_EMERGE = "rivalries_emerge",
  CLIMAX = "climax",
  CHAMPIONSHIP = "championship",
  EPILOGUE = "epilogue",
}

/** Coach personality type — §S5 CoachingIntelligence */
export enum CoachingStyle {
  DRILL_SERGEANT = "drill_sergeant",
  NURTURER = "nurturer",
  TECHNICAL = "technical",
  MOTIVATIONAL = "motivational",
  ANALYTICAL = "analytical",
}

/** Athletic recovery state — §S9 SportWellness */
export enum RecoveryStatus {
  FULLY_RECOVERED = "fully_recovered",
  RECOVERING = "recovering",
  AT_RISK = "at_risk",
  INJURED = "injured",
}

/** Venue crowd level — §S2 ArenaStatus */
export enum CrowdLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  VERY_HIGH = "very_high",
}

// ═══════════════════════════════════════════════════════════
// §2 — CONFIG MAPS
// ═══════════════════════════════════════════════════════════

export interface SportConfigEntry {
  label: string;
  /** Legacy emoji — existing components use this. New components use lucideIcon. */
  icon: string;
  color: string;
  isOutdoor: boolean;
  isIndoor: boolean;
  category: SportCategory;
  /** Average session duration in minutes — fatigue/recovery calculations */
  avgSessionMinutes: number;
  /** Relative intensity 0-1 — wellness bridge calculations */
  intensityLevel: number;
  /** Lucide icon name — canonical for new components */
  lucideIcon: string;
}

export const SPORT_CONFIG: Record<SportType, SportConfigEntry> = {
  [SportType.TENNIS]:     { label: "Tennis",     icon: "🎾", color: "var(--color-teal-400)",       isOutdoor: true,  isIndoor: true,  category: SportCategory.RACQUET,    avgSessionMinutes: 90,  intensityLevel: 0.7, lucideIcon: "CircleDot" },
  [SportType.GOLF]:       { label: "Golf",       icon: "⛳", color: "var(--color-emerald-400)",    isOutdoor: true,  isIndoor: false, category: SportCategory.INDIVIDUAL,  avgSessionMinutes: 240, intensityLevel: 0.4, lucideIcon: "Flag" },
  [SportType.SWIMMING]:   { label: "Natación",   icon: "🏊", color: "var(--color-teal-300)",       isOutdoor: true,  isIndoor: true,  category: SportCategory.WATER,      avgSessionMinutes: 60,  intensityLevel: 0.8, lucideIcon: "Waves" },
  [SportType.FITNESS]:    { label: "Fitness",    icon: "🏋️", color: "var(--color-rose-400)",       isOutdoor: false, isIndoor: true,  category: SportCategory.FITNESS,    avgSessionMinutes: 60,  intensityLevel: 0.8, lucideIcon: "Dumbbell" },
  [SportType.BASKETBALL]: { label: "Basketball", icon: "🏀", color: "var(--color-amber-400)",      isOutdoor: true,  isIndoor: true,  category: SportCategory.TEAM,       avgSessionMinutes: 90,  intensityLevel: 0.9, lucideIcon: "Target" },
  [SportType.VOLLEYBALL]: { label: "Volleyball", icon: "🏐", color: "var(--color-emerald-300)",    isOutdoor: true,  isIndoor: true,  category: SportCategory.TEAM,       avgSessionMinutes: 75,  intensityLevel: 0.7, lucideIcon: "Circle" },
  [SportType.FOOTBALL]:   { label: "Fútbol",     icon: "⚽", color: "var(--color-sage-400)",       isOutdoor: true,  isIndoor: false, category: SportCategory.TEAM,       avgSessionMinutes: 90,  intensityLevel: 0.9, lucideIcon: "Circle" },
  [SportType.SQUASH]:     { label: "Squash",     icon: "🏸", color: "var(--color-terracotta-400)", isOutdoor: false, isIndoor: true,  category: SportCategory.RACQUET,    avgSessionMinutes: 60,  intensityLevel: 0.85,lucideIcon: "Zap" },
  [SportType.PADEL]:      { label: "Pádel",      icon: "🎾", color: "var(--color-gold-400)",       isOutdoor: true,  isIndoor: true,  category: SportCategory.RACQUET,    avgSessionMinutes: 75,  intensityLevel: 0.6, lucideIcon: "CircleDot" },
  [SportType.YOGA]:       { label: "Yoga",       icon: "🧘", color: "var(--color-teal-200)",       isOutdoor: false, isIndoor: true,  category: SportCategory.WELLNESS,   avgSessionMinutes: 60,  intensityLevel: 0.3, lucideIcon: "Heart" },
  [SportType.PILATES]:    { label: "Pilates",    icon: "🧘", color: "var(--color-sage-200)",       isOutdoor: false, isIndoor: true,  category: SportCategory.WELLNESS,   avgSessionMinutes: 50,  intensityLevel: 0.4, lucideIcon: "Heart" },
};

export const SPORT_LUCIDE_ICONS: Record<SportType, string> = Object.fromEntries(
  Object.entries(SPORT_CONFIG).map(([sport, cfg]) => [sport, cfg.lucideIcon]),
) as Record<SportType, string>;

export const SPORT_CATEGORY_CONFIG: Record<
  SportCategory,
  { label: string; color: string; lucideIcon: string }
> = {
  [SportCategory.RACQUET]:    { label: "Raqueta",   color: "var(--color-teal-400)",    lucideIcon: "CircleDot" },
  [SportCategory.WATER]:      { label: "Acuático",  color: "var(--color-blue-400)",    lucideIcon: "Waves" },
  [SportCategory.FITNESS]:    { label: "Fitness",   color: "var(--color-rose-400)",    lucideIcon: "Dumbbell" },
  [SportCategory.TEAM]:       { label: "Equipo",    color: "var(--color-emerald-400)", lucideIcon: "Users" },
  [SportCategory.INDIVIDUAL]: { label: "Individual", color: "var(--color-violet-400)", lucideIcon: "User" },
  [SportCategory.WELLNESS]:   { label: "Wellness",  color: "var(--color-teal-200)",    lucideIcon: "Heart" },
};

export const ATHLETIC_LEVEL_CONFIG: Record<
  AthleticLevel,
  { label: string; min: number; max: number; color: string }
> = {
  [AthleticLevel.NOVICE]:       { label: "Novato",      min: 0,  max: 15, color: "var(--color-silver-400)" },
  [AthleticLevel.APPRENTICE]:   { label: "Aprendiz",    min: 16, max: 30, color: "var(--color-teal-400)" },
  [AthleticLevel.PRACTITIONER]: { label: "Practicante", min: 31, max: 50, color: "var(--color-emerald-400)" },
  [AthleticLevel.EXPERT]:       { label: "Experto",     min: 51, max: 75, color: "var(--color-amber-400)" },
  [AthleticLevel.MASTER]:       { label: "Maestro",     min: 76, max: 90, color: "var(--color-gold-400)" },
  [AthleticLevel.LEGEND]:       { label: "Leyenda",     min: 91, max: 100,color: "var(--color-rose-400)" },
};

export const ATHLETIC_AXIS_CONFIG: Record<
  AthleticAxis,
  { label: string; description: string; color: string; lucideIcon: string }
> = {
  [AthleticAxis.POWER]:     { label: "Fuerza",      description: "Capacidad de generar fuerza máxima",     color: "var(--color-rose-400)",    lucideIcon: "Zap" },
  [AthleticAxis.SPEED]:     { label: "Velocidad",   description: "Rapidez de movimiento y reacción",       color: "var(--color-amber-400)",   lucideIcon: "Timer" },
  [AthleticAxis.ENDURANCE]: { label: "Resistencia", description: "Capacidad de mantener esfuerzo",         color: "var(--color-emerald-400)", lucideIcon: "Activity" },
  [AthleticAxis.TECHNIQUE]: { label: "Técnica",     description: "Ejecución mecánica y habilidad motora",  color: "var(--color-teal-400)",    lucideIcon: "Crosshair" },
  [AthleticAxis.TACTICAL]:  { label: "Táctica",     description: "Toma de decisiones y posicionamiento",   color: "var(--color-violet-400)",  lucideIcon: "Brain" },
  [AthleticAxis.MENTAL]:    { label: "Mental",      description: "Resiliencia, foco y fortaleza mental",   color: "var(--color-blue-400)",    lucideIcon: "Shield" },
};

export const RESERVATION_STATUS_CONFIG: Record<
  ReservationStatus,
  { label: string; color: string; bgColor: string }
> = {
  [ReservationStatus.PENDING]:   { label: "Pendiente",   color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)" },
  [ReservationStatus.CONFIRMED]: { label: "Confirmada",  color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  [ReservationStatus.CANCELLED]: { label: "Cancelada",   color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)" },
  [ReservationStatus.BLOCKED]:   { label: "Bloqueada",   color: "var(--color-silver-400)",  bgColor: "rgba(255,255,255,0.04)" },
};

export const TOURNAMENT_FORMAT_CONFIG: Record<
  TournamentFormat,
  { label: string; description: string; icon: string }
> = {
  [TournamentFormat.SINGLE_ELIMINATION]:   { label: "Eliminación Simple",   description: "Pierde y quedas fuera",     icon: "🏆" },
  [TournamentFormat.DOUBLE_ELIMINATION]:   { label: "Eliminación Doble",    description: "Segunda oportunidad",       icon: "🏆" },
  [TournamentFormat.ROUND_ROBIN]:          { label: "Todos contra Todos",   description: "Todos juegan contra todos", icon: "🔄" },
  [TournamentFormat.GROUPS_THEN_KNOCKOUT]: { label: "Grupos + Eliminación", description: "Fase de grupos + playoffs", icon: "🥇" },
};

export const TOURNAMENT_STATUS_CONFIG: Record<
  TournamentStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  [TournamentStatus.DRAFT]:             { label: "Borrador",              color: "var(--color-silver-400)",  bgColor: "rgba(255,255,255,0.04)",          icon: "📝" },
  [TournamentStatus.PENDING_APPROVAL]:  { label: "Pendiente Aprobación",  color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)",           icon: "⏳" },
  [TournamentStatus.CONFIRMED]:         { label: "Confirmado",            color: "var(--color-teal-400)",    bgColor: "var(--color-teal-bg)",            icon: "✅" },
  [TournamentStatus.REGISTRATION_OPEN]: { label: "Inscripciones Abiertas",color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)",         icon: "📋" },
  [TournamentStatus.IN_PROGRESS]:       { label: "En Curso",              color: "var(--color-gold-400)",    bgColor: "rgba(201,169,110,0.08)",          icon: "⚡" },
  [TournamentStatus.COMPLETED]:         { label: "Completado",            color: "var(--color-emerald-300)", bgColor: "var(--color-emerald-bg)",         icon: "🏆" },
  [TournamentStatus.CANCELLED]:         { label: "Cancelado",             color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)",            icon: "❌" },
};

export const CLASS_TYPE_CONFIG: Record<ClassType, { label: string; icon: string }> = {
  [ClassType.GROUP]:        { label: "Grupal",       icon: "👥" },
  [ClassType.PRIVATE]:      { label: "Privada",      icon: "👤" },
  [ClassType.SEMI_PRIVATE]: { label: "Semi-privada", icon: "👥" },
  [ClassType.DROP_IN]:      { label: "Drop-in",      icon: "🏃" },
};

export const SKILL_LEVEL_CONFIG: Record<
  SkillLevel,
  { label: string; color: string; icon: string }
> = {
  [SkillLevel.BEGINNER]:     { label: "Principiante",      color: "var(--color-teal-400)",    icon: "🌱" },
  [SkillLevel.INTERMEDIATE]: { label: "Intermedio",        color: "var(--color-amber-400)",   icon: "📈" },
  [SkillLevel.ADVANCED]:     { label: "Avanzado",          color: "var(--color-rose-400)",    icon: "🔥" },
  [SkillLevel.ALL_LEVELS]:   { label: "Todos los niveles", color: "var(--color-emerald-400)", icon: "🌐" },
};

export const EQUIPMENT_CONDITION_CONFIG: Record<
  EquipmentCondition,
  { label: string; color: string; urgencyBase: number }
> = {
  [EquipmentCondition.NEW]:          { label: "Nuevo",                color: "var(--color-emerald-400)", urgencyBase: 0 },
  [EquipmentCondition.GOOD]:         { label: "Bueno",                color: "var(--color-teal-400)",    urgencyBase: 10 },
  [EquipmentCondition.FAIR]:         { label: "Regular",              color: "var(--color-amber-400)",   urgencyBase: 40 },
  [EquipmentCondition.NEEDS_REPAIR]: { label: "Necesita Reparación",  color: "var(--color-rose-400)",    urgencyBase: 80 },
  [EquipmentCondition.RETIRED]:      { label: "Retirado",             color: "var(--color-silver-500)",  urgencyBase: 100 },
};

export const LEAGUE_FORMAT_CONFIG: Record<LeagueFormat, { label: string }> = {
  [LeagueFormat.ROUND_ROBIN]:        { label: "Todos contra Todos" },
  [LeagueFormat.DOUBLE_ROUND_ROBIN]: { label: "Doble Rueda" },
  [LeagueFormat.DIVISIONS]:          { label: "Divisiones" },
};

export const LEAGUE_STATUS_CONFIG: Record<
  LeagueStatus,
  { label: string; color: string; bgColor: string }
> = {
  [LeagueStatus.PROPOSED]:  { label: "Propuesta",   color: "var(--color-silver-400)",  bgColor: "rgba(255,255,255,0.04)" },
  [LeagueStatus.ACTIVE]:    { label: "Activa",      color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)" },
  [LeagueStatus.PAUSED]:    { label: "Pausada",     color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)" },
  [LeagueStatus.COMPLETED]: { label: "Completada",  color: "var(--color-teal-400)",    bgColor: "var(--color-teal-bg)" },
};

export const CALENDAR_ITEM_TYPE_CONFIG: Record<
  CalendarItemType,
  { label: string; color: string; borderColor: string; icon: string }
> = {
  [CalendarItemType.RESERVATION]: { label: "Reserva",  color: "var(--color-teal-400)",       borderColor: "var(--color-teal-400)",       icon: "📅" },
  [CalendarItemType.TOURNAMENT]:  { label: "Torneo",   color: "var(--color-gold-400)",        borderColor: "var(--color-gold-400)",        icon: "🏆" },
  [CalendarItemType.CLASS]:       { label: "Clase",    color: "var(--color-emerald-400)",     borderColor: "var(--color-emerald-400)",     icon: "🧘" },
  [CalendarItemType.COACHING]:    { label: "Coaching", color: "var(--color-teal-300)",        borderColor: "var(--color-teal-300)",        icon: "🎾" },
  [CalendarItemType.LEAGUE]:      { label: "Liga",     color: "var(--color-terracotta-400)",  borderColor: "var(--color-terracotta-400)",  icon: "⚽" },
};

export const HEALTH_LEVEL_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; min: number }
> = {
  excellent: { label: "Excepcional", color: "var(--color-emerald-400)", bgColor: "var(--color-emerald-bg)", min: 85 },
  good:      { label: "Saludable",   color: "var(--color-teal-400)",    bgColor: "var(--color-teal-bg)",    min: 65 },
  attention: { label: "Atención",    color: "var(--color-amber-400)",   bgColor: "var(--color-amber-bg)",   min: 45 },
  critical:  { label: "Crítico",     color: "var(--color-rose-400)",    bgColor: "var(--color-rose-bg)",    min: 0 },
};

export const VENUE_LIVE_STATUS_CONFIG: Record<
  VenueLiveStatus,
  { label: string; color: string; pulseSpeed: string; lucideIcon: string }
> = {
  [VenueLiveStatus.IDLE]:        { label: "Libre",        color: "var(--color-silver-400)",  pulseSpeed: "6s",   lucideIcon: "Moon" },
  [VenueLiveStatus.ACTIVE]:      { label: "Activo",       color: "var(--color-emerald-400)", pulseSpeed: "3s",   lucideIcon: "Activity" },
  [VenueLiveStatus.MAINTENANCE]: { label: "Mantenimiento",color: "var(--color-amber-400)",   pulseSpeed: "4s",   lucideIcon: "Wrench" },
  [VenueLiveStatus.RESERVED]:    { label: "Reservado",    color: "var(--color-teal-400)",    pulseSpeed: "5s",   lucideIcon: "Calendar" },
  [VenueLiveStatus.PEAK]:        { label: "Pico",         color: "var(--color-rose-400)",    pulseSpeed: "1.5s", lucideIcon: "Flame" },
};

export const CROWD_LEVEL_CONFIG: Record<
  CrowdLevel,
  { label: string; color: string; max: number }
> = {
  [CrowdLevel.LOW]:       { label: "Baja",      color: "var(--color-emerald-400)", max: 30 },
  [CrowdLevel.MEDIUM]:    { label: "Media",     color: "var(--color-teal-400)",    max: 60 },
  [CrowdLevel.HIGH]:      { label: "Alta",      color: "var(--color-amber-400)",   max: 85 },
  [CrowdLevel.VERY_HIGH]: { label: "Muy Alta",  color: "var(--color-rose-400)",    max: 100 },
};

export const RECOVERY_STATUS_CONFIG: Record<
  RecoveryStatus,
  { label: string; color: string; lucideIcon: string; actionRequired: boolean }
> = {
  [RecoveryStatus.FULLY_RECOVERED]: { label: "Recuperado",   color: "var(--color-emerald-400)", lucideIcon: "CheckCircle", actionRequired: false },
  [RecoveryStatus.RECOVERING]:      { label: "Recuperando",  color: "var(--color-teal-400)",    lucideIcon: "Clock",       actionRequired: false },
  [RecoveryStatus.AT_RISK]:         { label: "En Riesgo",    color: "var(--color-amber-400)",   lucideIcon: "AlertTriangle",actionRequired: true },
  [RecoveryStatus.INJURED]:         { label: "Lesionado",    color: "var(--color-rose-400)",    lucideIcon: "XCircle",     actionRequired: true },
};

export const SEASON_ACT_CONFIG: Record<
  SeasonAct,
  { label: string; color: string; narrative: string; lucideIcon: string }
> = {
  [SeasonAct.OPENING]:          { label: "Apertura",          color: "var(--color-teal-400)",    narrative: "La temporada comienza. Nuevos rostros, nuevas esperanzas.",       lucideIcon: "Sunrise" },
  [SeasonAct.RIVALRIES_EMERGE]: { label: "Rivalidades",       color: "var(--color-amber-400)",   narrative: "Las rivalidades se definen. Los contendientes se separan.",       lucideIcon: "Swords" },
  [SeasonAct.CLIMAX]:           { label: "Clímax",            color: "var(--color-rose-400)",    narrative: "Cada partido cuenta. La tensión alcanza su punto máximo.",        lucideIcon: "Flame" },
  [SeasonAct.CHAMPIONSHIP]:     { label: "Campeonato",        color: "var(--color-gold-400)",    narrative: "Los mejores se enfrentan. Solo uno será campeón.",               lucideIcon: "Trophy" },
  [SeasonAct.EPILOGUE]:         { label: "Epílogo",           color: "var(--color-emerald-300)", narrative: "La temporada cierra. Los números cuentan la historia.",           lucideIcon: "BookOpen" },
};

export const COACHING_STYLE_CONFIG: Record<
  CoachingStyle,
  { label: string; description: string; lucideIcon: string }
> = {
  [CoachingStyle.DRILL_SERGEANT]: { label: "Disciplinario",  description: "Estructura estricta, alto volumen, resultados primero",     lucideIcon: "Shield" },
  [CoachingStyle.NURTURER]:       { label: "Empático",       description: "Apoyo emocional, progreso gradual, confianza primero",      lucideIcon: "Heart" },
  [CoachingStyle.TECHNICAL]:      { label: "Técnico",        description: "Análisis biomecánico, corrección de forma, precisión",       lucideIcon: "Crosshair" },
  [CoachingStyle.MOTIVATIONAL]:   { label: "Motivacional",   description: "Energía alta, celebración de logros, mentalidad ganadora",   lucideIcon: "Zap" },
  [CoachingStyle.ANALYTICAL]:     { label: "Analítico",      description: "Datos y métricas, tracking de progreso, optimización",       lucideIcon: "BarChart3" },
};

// ── CR Weather Risk by Month ──
export const CR_WEATHER_RISK: Record<number, { label: string; level: string; color: string }> = {
  1:  { label: "Seco",       level: "low",    color: "var(--color-emerald-400)" },
  2:  { label: "Seco",       level: "low",    color: "var(--color-emerald-400)" },
  3:  { label: "Seco",       level: "low",    color: "var(--color-emerald-400)" },
  4:  { label: "Transición", level: "low",    color: "var(--color-emerald-300)" },
  5:  { label: "Lluvioso",   level: "medium", color: "var(--color-amber-400)" },
  6:  { label: "Lluvioso",   level: "medium", color: "var(--color-amber-400)" },
  7:  { label: "Veranillo",  level: "medium", color: "var(--color-amber-300)" },
  8:  { label: "Lluvioso",   level: "high",   color: "var(--color-rose-400)" },
  9:  { label: "Lluvioso",   level: "high",   color: "var(--color-rose-400)" },
  10: { label: "Lluvioso",   level: "high",   color: "var(--color-rose-400)" },
  11: { label: "Transición", level: "medium", color: "var(--color-amber-400)" },
  12: { label: "Seco",       level: "low",    color: "var(--color-emerald-400)" },
};

// ═══════════════════════════════════════════════════════════
// §3 — ENTITY TYPES (MCP data shapes)
// Engine inputs — useSportsData transforms MCP → these types
// ═══════════════════════════════════════════════════════════

export interface Venue {
  venueId: string;
  venueName: string;
  sport: SportType;
  isOutdoor: boolean;
  isIndoor: boolean;
  capacity: number;
  currentOccupancy: number;
  status: VenueLiveStatus;
  location: string;
  amenities: string[];
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
}

export interface SportSession {
  sessionId: string;
  memberId: string;
  memberName: string;
  venueId: string;
  sport: SportType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Performance data — if available from tracking systems */
  performance?: SessionPerformance;
  coachId?: string;
  companions: string[];
  satisfaction?: number;
}

export interface SessionPerformance {
  /** 0-100 per axis — computed from session data or coach assessment */
  axisScores?: Partial<Record<AthleticAxis, number>>;
  /** Perceived exertion 1-10 */
  perceivedExertion?: number;
  /** Heart rate data if available */
  avgHeartRate?: number;
  maxHeartRate?: number;
  /** Notes from coach or self-assessment */
  notes?: string;
}

export interface SportReservation {
  reservationId: string;
  memberId: string;
  venueId: string;
  sport: SportType;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  partySize: number;
  notes?: string;
  createdAt: string;
}

export interface Tournament {
  tournamentId: string;
  name: string;
  sport: SportType;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  totalRevenue: number;
  venueIds: string[];
  organizerId: string;
  description?: string;
}

export interface SportClass {
  classId: string;
  name: string;
  sport: SportType;
  classType: ClassType;
  skillLevel: SkillLevel;
  coachId: string;
  venueId: string;
  schedule: string;
  enrolled: number;
  capacity: number;
  fillRatePct: number;
  isUnderperforming: boolean;
  satisfactionAvg: number;
  revenuePerSession: number;
}

export interface CoachingSession {
  sessionId: string;
  coachId: string;
  memberId: string;
  sport: SportType;
  date: string;
  durationMinutes: number;
  skillLevel: SkillLevel;
  notes?: string;
  satisfaction?: number;
  improvementAssessment?: Partial<Record<AthleticAxis, number>>;
}

export interface Equipment {
  equipmentId: string;
  name: string;
  sport: SportType;
  venueId: string;
  condition: EquipmentCondition;
  purchaseDate: string;
  lastMaintenanceDate: string | null;
  daysSinceMaintenance: number | null;
  usageHours: number;
  urgencyScore: number;
  recommendedAction: string;
  needsAttention: boolean;
  replacementCost: number;
}

export interface Competition {
  competitionId: string;
  tournamentId?: string;
  leagueId?: string;
  sport: SportType;
  player1Id: string;
  player2Id: string;
  scheduledDate: string;
  completedDate?: string;
  winnerId?: string;
  score?: string;
  venueId?: string;
  round?: string;
  duration?: number;
}

export interface League {
  leagueId: string;
  name: string;
  sport: SportType;
  format: LeagueFormat;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  seasonNumber: number;
  participantCount: number;
  matchesCompleted: number;
  matchesTotal: number;
}

export interface Match {
  matchId: string;
  competitionId: string;
  sport: SportType;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  score?: string;
  date: string;
  venueId?: string;
  duration?: number;
  /** Match quality 0-100 — closeness, drama, skill level */
  qualityScore?: number;
}

export interface MatchHistory {
  memberId: string;
  sport: SportType;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  streakType: "win" | "loss" | "none";
  longestWinStreak: number;
  rivalIds: string[];
  lastMatchDate: string;
  recentMatches: Match[];
}

export interface MemberSportsProfile {
  memberId: string;
  memberName: string;
  sports: SportType[];
  preferredSports: SportType[];
  totalSessions: number;
  memberSince: string;
  age?: number;
  fitnessScore?: number;
}

// ═══════════════════════════════════════════════════════════
// §4 — ATHLETIC INTELLIGENCE TYPES (§S1 output)
// ═══════════════════════════════════════════════════════════

export type AthleticAxisRecord = Record<AthleticAxis, number>;

export interface AthleticProfile {
  memberId: string;
  /** 0-100 per axis */
  axes: AthleticAxisRecord;
  /** Weighted average across all axes */
  overallScore: number;
  /** Derived from overallScore */
  athleticLevel: AthleticLevel;
  /** Breakdown per sport */
  sportBreakdown: Record<SportType, SportSpecificProfile>;
  /** Times of day/week when performance peaks */
  peakWindows: PeakWindow[];
  /** Current fatigue state + recovery ETA */
  fatigueCycle: FatigueCycle;
  /** Historical progression — 1 point per session/week */
  trajectory: SkillTrajectoryPoint[];
  /** Future prediction with confidence bands */
  predictedTrajectory: SkillTrajectoryPoint[];
  /** 0-100 — likelihood of next breakthrough */
  breakthroughProbability: number;
  /** Weeks in current plateau (0 = not in plateau) */
  plateauDurationWeeks: number;
  /** Skills that transfer across sports */
  transferableSkills: CrossSportTransfer[];
  /** Total sessions across all sports */
  totalSessions: number;
  /** Last activity date */
  lastActiveDate: string | null;
}

export interface SportSpecificProfile {
  sport: SportType;
  level: AthleticLevel;
  sessionsCount: number;
  totalHours: number;
  /** Improvement per month (delta in overall score) */
  progressionRate: number;
  bestDiscipline: string;
  weakestDiscipline: string;
  /** Sport-specific axis scores */
  axisScores: AthleticAxisRecord;
}

export interface SkillTrajectoryPoint {
  date: string;
  overall: number;
  axes: AthleticAxisRecord;
  /** 0-100 — data completeness / prediction confidence */
  confidence: number;
  /** Optional event marker */
  event?: "breakthrough" | "plateau_start" | "plateau_end" | "injury" | "coaching_start" | "competition";
}

export interface CrossSportTransfer {
  fromSport: SportType;
  toSport: SportType;
  /** 0-1 — how much skill transfers (0.87 = 87%) */
  transferRate: number;
  /** Which axes transfer */
  transferredAxes: AthleticAxis[];
  /** Human-readable explanation */
  explanation: string;
}

export interface CrossSportBenefit {
  fromSport: SportType;
  toSport: SportType;
  benefitDescription: string;
  estimatedImprovementPct: number;
  timeWeeks: number;
}

export interface PeakWindow {
  /** Day of week 0-6 (0 = Sunday) */
  dayOfWeek: number;
  /** Hour of day 0-23 */
  startHour: number;
  endHour: number;
  /** Performance multiplier 1.0 = baseline */
  performanceMultiplier: number;
}

export interface FatigueCycle {
  /** Current fatigue 0-100 (0 = fresh, 100 = exhausted) */
  currentFatigue: number;
  /** Optimal rest days before next intense session */
  recommendedRestDays: number;
  /** Hours until fully recovered */
  hoursToRecovery: number;
  /** Whether athlete is in overtraining zone */
  isOvertraining: boolean;
  /** Fatigue trend over last 7 days */
  weeklyTrend: TrendDirection;
}

// ═══════════════════════════════════════════════════════════
// §5 — ARENA INTELLIGENCE TYPES (§S2 output)
// ═══════════════════════════════════════════════════════════

export interface ArenaStatus {
  venueId: string;
  venueName: string;
  sport: SportType;
  currentStatus: VenueLiveStatus;
  /** 0-100 */
  currentOccupancy: number;
  currentCrowdLevel: CrowdLevel;
  activeSessions: ActiveSession[];
  nextReservation: SportReservation | null;
  minutesUntilAvailable: number | null;
  /** Next 24h demand forecast */
  demandForecast: DemandForecastPoint[];
  optimalBookingWindows: BookingWindow[];
  weatherImpact: WeatherImpact | null;
  /** Last 7 days average utilization 0-100 */
  utilization7d: number;
  utilizationTrend: TrendDirection;
  revenuePerHour: number;
  satisfactionAvg: number;
}

export interface DemandForecastPoint {
  /** Hour label "08:00" */
  hour: string;
  /** 0-100 predicted demand */
  predictedDemand: number;
  /** 0-100 prediction confidence */
  confidence: number;
  /** Weather multiplier 0-1 (for outdoor venues) */
  weatherFactor?: number;
}

export interface BookingWindow {
  startTime: string;
  endTime: string;
  /** 0-100 — combination of demand, weather, availability */
  qualityScore: number;
  reason: string;
}

export interface WeatherImpact {
  condition: string;
  /** 0-100 impact severity */
  severity: number;
  affectedSports: SportType[];
  recommendation: string;
  optimalReschedule?: string;
}

export interface ActiveSession {
  sessionId: string;
  memberId: string;
  memberName: string;
  sport: SportType;
  startTime: string;
  minutesElapsed: number;
  estimatedEndTime: string;
  companionCount: number;
}

export interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
  label: string;
}

export interface BookingPreferences {
  preferredSports: SportType[];
  preferredTimes: string[];
  preferredDuration: number;
  /** Indoor preference 0-1 (1 = strongly prefers indoor) */
  indoorPreference: number;
  socialPreference: "solo" | "small_group" | "any";
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPETITION TYPES (§S3 output)
// ═══════════════════════════════════════════════════════════

export interface TournamentBracket {
  tournamentId: string;
  tournamentName: string;
  format: TournamentFormat;
  sport: SportType;
  rounds: BracketRound[];
  predictions: MatchPrediction[];
  /** matchId → upset probability 0-1 */
  upsetProbability: Record<string, number>;
  tournamentNarrative: string;
  favorites: BracketEntry[];
  darkHorses: BracketEntry[];
  rivalryMatchIds: string[];
  totalMatches: number;
  completedMatches: number;
}

export interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: BracketMatch[];
}

export interface BracketMatch {
  matchId: string;
  player1: BracketEntry;
  player2: BracketEntry;
  winner?: BracketEntry;
  score?: string;
  status: "scheduled" | "live" | "completed" | "walkover";
  prediction: MatchPrediction;
  isRivalry: boolean;
  upsetOccurred: boolean;
  /** 0-100 — how dramatic was this match */
  dramaScore: number;
  scheduledDate?: string;
  venueId?: string;
}

export interface MatchPrediction {
  player1WinProbability: number;
  player2WinProbability: number;
  predictedScore?: string;
  /** 0-100 */
  confidence: number;
  keyFactors: string[];
  /** 0-1 probability of lower-ranked player winning */
  upsetProbability: number;
}

export interface BracketEntry {
  memberId: string;
  memberName: string;
  seed: number;
  athleticLevel: AthleticLevel;
  overallScore: number;
  /** Current round reached (0 = eliminated) */
  currentRound: number;
  winCount: number;
  lossCount: number;
}

export interface Rivalry {
  member1Id: string;
  member2Id: string;
  sport: SportType;
  totalMatches: number;
  member1Wins: number;
  member2Wins: number;
  lastMatchDate: string;
  /** 0-100 — how intense is the rivalry */
  intensityScore: number;
  narrative: string;
}

export interface SeasonPrediction {
  memberId: string;
  sport: SportType;
  predictedFinalPosition: number;
  /** 0-1 */
  confidence: number;
  remainingMatches: number;
  /** "must-win" matches */
  criticalMatches: string[];
  scenarios: PlayoffScenario[];
}

export interface PlayoffScenario {
  scenarioId: string;
  description: string;
  /** 0-1 probability */
  probability: number;
  matchRequirements: string[];
  resultingPosition: number;
}

export interface ChampionshipContender {
  memberId: string;
  memberName: string;
  currentPoints: number;
  predictedPoints: number;
  /** 0-1 probability of winning championship */
  championshipProbability: number;
  remainingDifficulty: number;
  form: TrendDirection;
}

export interface Standing {
  memberId: string;
  memberName: string;
  position: number;
  played: number;
  won: number;
  lost: number;
  points: number;
  /** Points per match */
  rate: number;
  form: TrendDirection;
  streak: number;
  streakType: "win" | "loss" | "none";
}

// ═══════════════════════════════════════════════════════════
// §7 — SOCIAL SPORT TYPES (§S4 output)
// ═══════════════════════════════════════════════════════════

export interface SocialSportGraph {
  nodes: SocialSportNode[];
  edges: SocialSportEdge[];
  clusters: SportCluster[];
  /** Members who always play alone */
  isolatedMemberIds: string[];
  /** Members who bridge clusters */
  connectorMemberIds: string[];
  totalConnections: number;
  averageConnectionsPerMember: number;
}

export interface SocialSportNode {
  memberId: string;
  memberName: string;
  sports: SportType[];
  /** 0-100 — how social is this athlete */
  socialScore: number;
  connectionCount: number;
  /** 0-100 influence within the graph */
  influenceScore: number;
}

export interface SocialSportEdge {
  member1Id: string;
  member2Id: string;
  sharedSports: SportType[];
  sessionsTogether: number;
  /** 0-100 compatibility */
  compatibilityScore: number;
  relationshipType: "doubles_partner" | "training_buddy" | "rival" | "teammate" | "casual";
  /** 0-1 edge weight */
  strength: number;
  lastSessionDate: string;
}

export interface SportCluster {
  clusterId: string;
  sport: SportType;
  memberIds: string[];
  /** 0-100 group cohesion */
  cohesion: number;
  averageLevel: AthleticLevel;
  openSlots: number;
}

export interface DoublesPartnerMatch {
  memberId: string;
  partnerId: string;
  partnerName: string;
  sport: SportType;
  /** 0-100 */
  compatibilityScore: number;
  complementaryAxes: AthleticAxis[];
  /** 0-1 schedule overlap */
  scheduleOverlap: number;
  reason: string;
}

export interface TeamFormation {
  teamId: string;
  sport: SportType;
  memberIds: string[];
  /** 0-100 team balance score */
  balanceScore: number;
  averageLevel: number;
  complementaryStrengths: string[];
}

// ═══════════════════════════════════════════════════════════
// §8 — COACHING TYPES (§S5 output)
// ═══════════════════════════════════════════════════════════

export interface CoachingProfile {
  coachId: string;
  coachName: string;
  specializations: SportType[];
  style: CoachingStyle;
  athleteCount: number;
  /** % of athletes who improved */
  successRate: number;
  /** Average improvement in overall score per month */
  avgImprovementRate: number;
  /** memberId → compatibility 0-100 */
  compatibilityMap: Record<string, number>;
  yearsExperience: number;
  certifications: string[];
}

export interface TrainingPlan {
  planId: string;
  memberId: string;
  coachId: string;
  sport: SportType;
  weeks: TrainingWeek[];
  predictedOutcome: SkillTrajectoryPoint[];
  /** Total estimated overall score improvement */
  totalImprovementEstimate: number;
  /** 0-100 plan confidence */
  confidence: number;
  /** 0-1 — chance athlete abandons plan */
  abandonmentRisk: number;
  crossSportBenefits: CrossSportBenefit[];
}

export interface TrainingWeek {
  weekNumber: number;
  sessions: TrainingSessionPlan[];
  focusAxes: AthleticAxis[];
  intensity: "recovery" | "moderate" | "intense" | "peak";
  /** 0-100 predicted fatigue accumulation */
  predictedFatigue: number;
  /** Predicted delta in overall score */
  predictedImprovement: number;
}

export interface TrainingSessionPlan {
  dayOfWeek: number;
  durationMinutes: number;
  sport: SportType;
  focus: AthleticAxis[];
  description: string;
  drills: string[];
}

export interface PlateauDetection {
  memberId: string;
  sport: SportType;
  isPlateau: boolean;
  durationWeeks: number;
  stagnationAxes: AthleticAxis[];
  recommendedInterventions: string[];
  /** 0-100 probability of breaking through */
  breakthroughProbability: number;
  estimatedBreakthroughDate: string | null;
}

export interface CoachingOutcome {
  coachId: string;
  memberId: string;
  sport: SportType;
  startDate: string;
  endDate: string;
  startScore: number;
  endScore: number;
  improvement: number;
  axisImprovements: Partial<AthleticAxisRecord>;
  planAdherence: number;
  satisfaction: number;
}

// ═══════════════════════════════════════════════════════════
// §9 — CLASS INTELLIGENCE TYPES (§S6 output)
// ═══════════════════════════════════════════════════════════

export interface ClassIntelligence {
  classId: string;
  className: string;
  sport: SportType;
  enrollmentCurrent: number;
  enrollmentCapacity: number;
  /** Predicted enrollment next week */
  predictedEnrollmentNextWeek: number;
  waitlistCount: number;
  skillDistribution: Record<SkillLevel, number>;
  avgSatisfaction: number;
  /** % who return next week */
  retentionRate: number;
  /** AI-recommended max capacity */
  optimalCapacity: number;
  demandTrend: TrendDirection;
  revenuePerSession: number;
}

export interface EnrollmentHistory {
  classId: string;
  date: string;
  enrolled: number;
  capacity: number;
  fillRatePct: number;
  waitlistCount: number;
}

export interface WaitlistEntry {
  memberId: string;
  memberName: string;
  classId: string;
  joinedDate: string;
  position: number;
  skillLevel: SkillLevel;
  priority: number;
}

export interface SkillGroup {
  groupId: string;
  classId: string;
  skillLevel: SkillLevel;
  memberIds: string[];
  averageScore: number;
  /** 0-100 group homogeneity (higher = more similar skill levels) */
  homogeneity: number;
}

// ═══════════════════════════════════════════════════════════
// §10 — EQUIPMENT TYPES (§S7 output)
// ═══════════════════════════════════════════════════════════

export interface EquipmentLifecycle {
  equipmentId: string;
  name: string;
  sport: SportType;
  venueId: string;
  /** 0-100 condition score */
  conditionScore: number;
  usageHours: number;
  usageTrend: TrendDirection;
  predictedFailureDate: string | null;
  replacementUrgency: "immediate" | "soon" | "planned" | "none";
  costPerUse: number;
  remainingUsefulHours: number;
  maintenanceHistory: EquipmentMaintenanceEvent[];
}

export interface EquipmentMaintenanceEvent {
  eventId: string;
  equipmentId: string;
  date: string;
  type: "preventive" | "corrective" | "emergency" | "inspection";
  description: string;
  cost: number;
  downtimeHours: number;
}

export interface UsageLog {
  logId: string;
  equipmentId: string;
  memberId: string;
  date: string;
  durationMinutes: number;
  intensityLevel: number;
}

export interface ReplacementPlan {
  equipmentId: string;
  equipmentName: string;
  currentCondition: number;
  recommendedReplaceDate: string;
  estimatedCost: number;
  priority: number;
  alternativeOptions: string[];
}

// ═══════════════════════════════════════════════════════════
// §11 — SEASON TYPES (§S8 output)
// ═══════════════════════════════════════════════════════════

export interface SeasonNarrative {
  seasonId: string;
  sport: SportType;
  currentAct: SeasonAct;
  chapters: SeasonChapter[];
  rivalries: Rivalry[];
  championshipContenders: ChampionshipContender[];
  playoffScenarios: PlayoffScenario[];
  turningPoints: TurningPoint[];
  narrativeSummary: string;
  predictedChampion: { memberId: string; probability: number } | null;
  totalMatches: number;
  completedMatches: number;
  startDate: string;
  endDate: string;
}

export interface SeasonChapter {
  act: SeasonAct;
  title: string;
  startDate: string;
  endDate: string;
  highlights: string[];
  matchIds: string[];
  narrative: string;
  /** 0-100 drama intensity */
  dramaScore: number;
}

export interface TurningPoint {
  date: string;
  event: string;
  impact: string;
  beforeState: string;
  afterState: string;
  matchId?: string;
  memberIds: string[];
}

export interface SeasonMatch {
  matchId: string;
  round: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  score?: string;
  date: string;
  isRivalry: boolean;
  dramaScore: number;
  narrative?: string;
}

// ═══════════════════════════════════════════════════════════
// §12 — WELLNESS TYPES (§S9 output)
// ═══════════════════════════════════════════════════════════

export interface SportWellnessProfile {
  memberId: string;
  /** 0-100 */
  injuryRiskScore: number;
  /** 0-100 */
  overtrainingScore: number;
  recoveryStatus: RecoveryStatus;
  recommendedRestDays: number;
  sportSpecificRisks: SportRisk[];
  ageAppropriateSports: SportType[];
  wellnessCorrelation: WellnessCorrelation;
}

export interface SportRisk {
  sport: SportType;
  riskType: "overuse" | "acute" | "postural" | "cardiovascular";
  /** 0-100 */
  riskLevel: number;
  prevention: string;
}

export interface WellnessCorrelation {
  wellnessScore: number;
  sportParticipation: number;
  /** -1 to 1 */
  correlation: number;
  insight: string;
}

export interface WellnessScore {
  date: string;
  overallScore: number;
  physicalScore: number;
  mentalScore: number;
  sleepQuality: number;
  stressLevel: number;
}

// ═══════════════════════════════════════════════════════════
// §13 — FINANCIAL TYPES (§S10 output)
// ═══════════════════════════════════════════════════════════

export interface SportFinancialProfile {
  sport: SportType;
  revenuePerMonth: number;
  revenuePerVenue: Record<string, number>;
  revenuePerClass: Record<string, number>;
  tournamentRevenue: number;
  coachingRevenue: number;
  equipmentCosts: number;
  roi: number;
  revenueTrend: TrendDirection;
  /** 0-100 growth potential */
  growthPotential: number;
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface OptimizationSuggestion {
  area: string;
  currentValue: number;
  optimizedValue: number;
  improvementPct: number;
  action: string;
  /** 0-100 */
  confidence: number;
}

export interface RevenueHistory {
  date: string;
  revenue: number;
  sport: SportType;
  source: "reservations" | "classes" | "tournaments" | "coaching" | "equipment";
}

// ═══════════════════════════════════════════════════════════
// §14 — ADVISOR TYPES
// ═══════════════════════════════════════════════════════════

/** Dashboard state mode — 3-state adaptive morphism */
export type SportsDashboardMode = "calm" | "alert" | "critical";

export interface SportsAmbientState {
  mode: SportsDashboardMode;
  /** 0-1 ambient intensity */
  intensity: number;
  accentColor: string;
  pulseRate: "dormant" | "slow" | "elevated" | "rapid";
  /** Primary reason for current mode */
  trigger?: string;
}

// ═══════════════════════════════════════════════════════════
// §15 — DASHBOARD STATE TYPES
// ═══════════════════════════════════════════════════════════

/** 5 modes for SportsDecisionStage */
export type SportsDecisionStageMode =
  | "arena"
  | "trajectory"
  | "competition"
  | "team"
  | "business";

export interface SportsIntelligenceSummary {
  totalInsights: number;
  criticalCount: number;
  highCount: number;
  actionableCount: number;
  /** Insight counts per DecisionStage mode */
  byMode: Record<SportsDecisionStageMode, number>;
  /** Primary health score 0-100 */
  healthScore: number;
  /** Active cross-domain signals count */
  crossDomainSignalCount: number;
}

// ═══════════════════════════════════════════════════════════
// §16 — DISPLAY TYPES (existing, maintained)
// ═══════════════════════════════════════════════════════════

export interface SportsKPI {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  color?: string;
  icon?: string;
}

export interface EnrollmentBarData {
  id: string;
  name: string;
  sport: string;
  enrolled: number;
  capacity: number;
  fillRate: number;
  status: "full" | "healthy" | "low" | "critical";
  color: string;
}

export interface UtilizationBarData {
  court: string;
  sport: string;
  utilization: number;
  color: string;
  peakHours: string[];
  trend: string;
}

export interface SeasonalChartData {
  month: string;
  monthNum: number;
  total: number;
  reservations: number;
  classes: number;
  tournaments: number;
  isPeak: boolean;
  dominantSport: string;
}

export interface EquipmentUrgencyGroup {
  critical: Array<{ id: string; name: string; sport: string; urgency: number; action: string }>;
  warning: Array<{ id: string; name: string; sport: string; urgency: number; action: string }>;
  ok: Array<{ id: string; name: string; sport: string; urgency: number }>;
}

export interface HealthDisplay {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  status: string;
  detail: string;
  statusConfig: { label: string; color: string };
}

// ═══════════════════════════════════════════════════════════
// §17 — TRANSFORM HELPERS (existing, maintained)
// ═══════════════════════════════════════════════════════════

export function sportPopularityToKPIs(
  popularity: Array<{
    sport: string;
    total_activity: number;
    popularity_rank: number;
    activity_share_pct: number;
  }>,
): SportsKPI[] {
  return (popularity ?? []).slice(0, 4).map((p) => {
    const cfg = SPORT_CONFIG[p.sport as SportType];
    return {
      label: cfg?.label ?? p.sport,
      value: p.total_activity,
      subtitle: `#${p.popularity_rank} · ${p.activity_share_pct}%`,
      color: cfg?.color,
      icon: cfg?.icon,
    };
  });
}

export function tournamentMetricsToKPIs(metrics: {
  total_tournaments: number;
  upcoming_count: number;
  in_progress_count: number;
  avg_participation_rate: number;
  total_revenue: number;
}): SportsKPI[] {
  return [
    {
      label: "Torneos Totales",
      value: metrics.total_tournaments,
      subtitle: `${metrics.upcoming_count} próximos`,
      icon: "🏆",
    },
    {
      label: "En Curso",
      value: metrics.in_progress_count,
      icon: "⚡",
      color: "var(--color-gold-400)",
    },
    {
      label: "Participación Prom.",
      value: `${metrics.avg_participation_rate}%`,
      trend: metrics.avg_participation_rate >= 70 ? "up" : "down",
      icon: "📊",
    },
    {
      label: "Revenue Torneos",
      value: `₡${(metrics.total_revenue / 1_000_000).toFixed(1)}M`,
      icon: "💰",
      color: "var(--color-emerald-400)",
    },
  ];
}

export function healthFactorsToDisplay(
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    weighted_score: number;
    status: string;
    detail: string;
  }>,
): HealthDisplay[] {
  return (factors ?? []).map((f) => ({
    ...f,
    weightedScore: f.weighted_score,
    statusConfig: HEALTH_LEVEL_CONFIG[f.status] ?? HEALTH_LEVEL_CONFIG.good,
  }));
}

export function calendarItemsByDate(
  items: Array<{ date: string; [key: string]: unknown }>,
): Map<string, typeof items> {
  const grouped = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const existing = grouped.get(item.date) ?? [];
    existing.push(item);
    grouped.set(item.date, existing);
  }
  return grouped;
}

export function enrollmentToBarData(
  classes: Array<{
    class_id: string;
    name: string;
    sport: string;
    enrolled: number;
    capacity: number;
    fill_rate_pct: number;
    is_underperforming: boolean;
  }>,
): EnrollmentBarData[] {
  return (classes ?? [])
    .map((c) => {
      const sportCfg = SPORT_CONFIG[c.sport as SportType];
      let status: EnrollmentBarData["status"] = "healthy";
      if (c.fill_rate_pct >= 90) status = "full";
      else if (c.fill_rate_pct < 40) status = c.fill_rate_pct < 20 ? "critical" : "low";
      return {
        id: c.class_id,
        name: c.name,
        sport: sportCfg?.label ?? c.sport,
        enrolled: c.enrolled,
        capacity: c.capacity,
        fillRate: c.fill_rate_pct,
        status,
        color:
          status === "full" ? "var(--color-emerald-400)"
          : status === "healthy" ? "var(--color-teal-400)"
          : status === "low" ? "var(--color-amber-400)"
          : "var(--color-rose-400)",
      };
    })
    .sort((a, b) => a.fillRate - b.fillRate);
}

export function utilizationToBarData(
  courts: Array<{
    court_name: string;
    sport: string;
    utilization_pct: number;
    peak_hours: string[];
    trend: string;
  }>,
): UtilizationBarData[] {
  return (courts ?? [])
    .map((c) => {
      const sportCfg = SPORT_CONFIG[c.sport as SportType];
      return {
        court: c.court_name,
        sport: sportCfg?.label ?? c.sport,
        utilization: c.utilization_pct,
        color:
          c.utilization_pct >= 65 ? "var(--color-emerald-400)"
          : c.utilization_pct >= 40 ? "var(--color-teal-400)"
          : c.utilization_pct >= 25 ? "var(--color-amber-400)"
          : "var(--color-rose-400)",
        peakHours: c.peak_hours ?? [],
        trend: c.trend,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

export function equipmentUrgencyGroups(
  items: Array<{
    equipment_id: string;
    name: string;
    sport: string;
    urgency_score: number;
    recommended_action: string;
    needs_attention: boolean;
  }>,
): EquipmentUrgencyGroup {
  const groups: EquipmentUrgencyGroup = { critical: [], warning: [], ok: [] };
  for (const item of items ?? []) {
    const entry = {
      id: item.equipment_id,
      name: item.name,
      sport: item.sport,
      urgency: item.urgency_score,
      action: item.recommended_action,
    };
    if (item.urgency_score >= 70) groups.critical.push(entry);
    else if (item.needs_attention) groups.warning.push(entry);
    else groups.ok.push({ id: entry.id, name: entry.name, sport: entry.sport, urgency: entry.urgency });
  }
  return groups;
}

export function seasonalToChartData(
  patterns: Array<{
    month: number;
    month_name: string;
    activity_count: number;
    reservation_count: number;
    class_count: number;
    tournament_count: number;
    is_peak_season: boolean;
    dominant_sport: string | null;
  }>,
): SeasonalChartData[] {
  return (patterns ?? []).map((p) => ({
    month: p.month_name.substring(0, 3),
    monthNum: p.month,
    total: p.activity_count,
    reservations: p.reservation_count,
    classes: p.class_count,
    tournaments: p.tournament_count,
    isPeak: p.is_peak_season,
    dominantSport: p.dominant_sport ?? "—",
  }));
}

// ═══════════════════════════════════════════════════════════
// §18 — STATUS TRANSITIONS (existing, maintained)
// ═══════════════════════════════════════════════════════════

export const TOURNAMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  [TournamentStatus.DRAFT]: [TournamentStatus.CONFIRMED, TournamentStatus.CANCELLED],
  [TournamentStatus.PENDING_APPROVAL]: [TournamentStatus.CONFIRMED, TournamentStatus.CANCELLED],
  [TournamentStatus.CONFIRMED]: [TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED],
  [TournamentStatus.REGISTRATION_OPEN]: [TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED],
  [TournamentStatus.IN_PROGRESS]: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED],
  [TournamentStatus.COMPLETED]: [],
  [TournamentStatus.CANCELLED]: [],
};

export const LEAGUE_STATUS_TRANSITIONS: Record<string, string[]> = {
  [LeagueStatus.PROPOSED]: [LeagueStatus.ACTIVE],
  [LeagueStatus.ACTIVE]: [LeagueStatus.PAUSED, LeagueStatus.COMPLETED],
  [LeagueStatus.PAUSED]: [LeagueStatus.ACTIVE, LeagueStatus.COMPLETED],
  [LeagueStatus.COMPLETED]: [],
};

export const RESERVATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.CANCELLED],
  [ReservationStatus.BLOCKED]: [ReservationStatus.CANCELLED],
  [ReservationStatus.CANCELLED]: [],
};

// ═══════════════════════════════════════════════════════════
// §19 — DASHBOARD CONFIG (NEW)
// ═══════════════════════════════════════════════════════════

export const SPORTS_MCP_SERVER = "sports_recreation";

export const SPORTS_MCP_TOOLS = {
  get_sports_analytics:      { responseKey: "analytics",      freshness: 120_000 },
  get_sports_health_summary: { responseKey: "health_summary", freshness: 120_000 },
  get_sports_calendar:       { responseKey: "calendar",       freshness: 60_000 },
} as const;

export const SPORTS_FRESHNESS_TIERS = {
  realtime:  30_000,
  near_real: 60_000,
  session:   120_000,
  stable:    300_000,
  archive:   600_000,
} as const;

export const SPORTS_DASHBOARD_THRESHOLDS = {
  COURT_UTIL_LOW_PCT: 30,
  COURT_UTIL_SIGNAL_MIN: 2,
  PARTICIPATION_LOW_PCT: 50,
  CLASS_UNDERPERFORM_PCT: 40,
  COACHING_GAP_SESSIONS: 5,
  OUTDOOR_SHARE_MIN_PCT: 50,
  SPORT_CONCENTRATION_MAX_PCT: 60,
  PEAK_HOUR_SATURATION_COUNT: 20,
  EQUIPMENT_STALE_DAYS: 365,
  ENGAGEMENT_LOW_SCORE: 40,
  ATHLETIC_PLATEAU_WEEKS: 4,
  INJURY_RISK_HIGH_PCT: 70,
  OVERTRAINING_THRESHOLD: 75,
  SOCIAL_ISOLATION_SESSIONS: 10,
  STREAM_MAX_VISIBLE: 8,
} as const;

export const SPORTS_DASHBOARD_MODES: Array<{
  id: SportsDecisionStageMode;
  label: string;
  lucideIcon: string;
  description: string;
}> = [
  { id: "arena",       label: "La Arena",       lucideIcon: "Target",     description: "Vistas en vivo, estado de canchas, radar atlético" },
  { id: "trajectory",  label: "La Trayectoria", lucideIcon: "TrendingUp",  description: "Progresión de habilidad, coaching, wellness" },
  { id: "competition", label: "La Competencia", lucideIcon: "Trophy",      description: "Brackets, narrativa de temporada, standings" },
  { id: "team",        label: "El Equipo",      lucideIcon: "Users",       description: "Grafo social, parejas de dobles, formación de equipos" },
  { id: "business",    label: "El Negocio",     lucideIcon: "BarChart3",   description: "Revenue, inteligencia de clases, equipamiento" },
];

export const SPORTS_SEASON_CONFIG = {
  /** Costa Rica peak season: December–April (dry) */
  PEAK_MONTHS_START: 12,
  PEAK_MONTHS_END: 4,
  /** Minimum outdoor activity share during peak (%) */
  OUTDOOR_SHARE_TARGET: 50,
} as const;

/** Sport → category mapping for cross-sport analysis */
export const SPORT_CATEGORY_MAP: Record<SportType, SportCategory> = Object.fromEntries(
  Object.entries(SPORT_CONFIG).map(([sport, cfg]) => [sport, cfg.category]),
) as Record<SportType, SportCategory>;

/** Outdoor-only sports (for weather impact calculations) */
export const OUTDOOR_SPORTS: SportType[] = Object.entries(SPORT_CONFIG)
  .filter(([, cfg]) => cfg.isOutdoor && !cfg.isIndoor)
  .map(([sport]) => sport as SportType);

/** Indoor-only sports (weather-immune) */
export const INDOOR_SPORTS: SportType[] = Object.entries(SPORT_CONFIG)
  .filter(([, cfg]) => cfg.isIndoor && !cfg.isOutdoor)
  .map(([sport]) => sport as SportType);

// Legacy tab config — existing components use this
export const SPORTS_TABS = [
  { id: "courts",      label: "Canchas",       icon: "🎾" },
  { id: "tournaments", label: "Torneos",       icon: "🏆" },
  { id: "classes",     label: "Clases",        icon: "🧘" },
  { id: "equipment",   label: "Equipamiento",  icon: "📦" },
  { id: "intelligence",label: "Inteligencia",  icon: "🧠" },
] as const;

export type SportsTabId = (typeof SPORTS_TABS)[number]["id"];

// ═══════════════════════════════════════════════════════════
// §20 — UTILITY TYPES
// ═══════════════════════════════════════════════════════════

/** Direction of change over time */
export type TrendDirection = "improving" | "stable" | "declining";

/**
 * Confidence band for predictions.
 * Used by §S1 (skill progression), §S2 (demand forecast),
 * §S3 (match prediction), §S10 (revenue forecast).
 */
export interface ConfidenceBand {
  estimate: number;
  lower: number;
  upper: number;
  /** 0-100 confidence level */
  confidence: number;
  sampleSize?: number;
}

/** Render limits — prevent Canvas/SVG overload */
export const SPORTS_RENDER_LIMITS = {
  ARENA_GRID_MAX_VENUES: 50,
  SOCIAL_MAP_MAX_NODES: 100,
  SOCIAL_MAP_MAX_EDGES: 200,
  BRACKET_MAX_PARTICIPANTS: 64,
  TIMELINE_MAX_EVENTS: 200,
  HEATMAP_MAX_CELLS: 168,
  EQUIPMENT_MAX_ITEMS: 100,
  COACHING_MAX_PLANS: 50,
  SEASON_MAX_CHAPTERS: 20,
  TRAJECTORY_MAX_POINTS: 100,
} as const;