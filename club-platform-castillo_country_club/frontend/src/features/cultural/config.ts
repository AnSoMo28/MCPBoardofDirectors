/**
 * Cultural & Social — Configuration Module
 *
 * All behavioral constants, thresholds, MCP routing, and config-derived
 * helpers for the Cultural domain.
 *
 * RULES:
 * — No magic numbers in components/hooks/engines. ALL thresholds live here.
 * — Every constant has JSDoc explaining WHY, not just WHAT.
 * — Pure helper functions only. No hooks, no state, no side effects.
 * — Visual configs (icons, colors, labels) live in types.ts.
 *   Behavioral configs (thresholds, weights, routing) live HERE.
 *
 * @module cultural/config
 */

import type {
  VenueType,
  CulturalCategory,
  FormalityLevel,
} from './types';

// ══════════════════════════════════════════════════════════
//  1. MCP ROUTING
// ══════════════════════════════════════════════════════════

/** Primary MCP server for cultural operations. */
export const CULTURAL_MCP_SERVER = 'cultural_social' as const;

/** MCP server for advisor intelligence (narrative generation). */
export const ADVISOR_MCP_SERVER = 'advisor_intelligence' as const;

/**
 * All MCP tool identifiers for the Cultural domain.
 *
 * READ tools — data retrieval
 * WRITE tools — CRUD mutations
 * AI tools — proposal generation, narrative, HITL
 */
export const CULTURAL_MCP_TOOLS = {
  // ── Read ──
  SUMMARY:              'get_cultural_summary',
  ANALYTICS:            'get_cultural_analytics',
  CALENDAR:             'get_cultural_calendar',
  EVENTS_LIST:          'get_cultural_events',
  EVENT_DETAIL:         'get_cultural_event_detail',
  ENTERTAINMENT_LIST:   'get_entertainment_acts',
  PROGRAMS_LIST:        'get_cultural_programs',
  EXHIBITIONS_LIST:     'get_art_exhibitions',
  MEMBER_HISTORY:       'get_member_cultural_history',
  MEMBER_PREFERENCES:   'get_member_cultural_preferences',
  PROPOSALS_LIST:       'get_cultural_proposals',

  // ── Write (CRUD) ──
  MANAGE_EVENTS:        'manage_social_events',
  MANAGE_ENTERTAINMENT: 'manage_entertainment_acts',
  MANAGE_PROGRAMS:      'manage_cultural_program',
  MANAGE_EXHIBITIONS:   'manage_art_exhibitions',
  ORGANIZE_GALA:        'organize_formal_gala',

  // ── AI ──
  GENERATE_PROPOSALS:   'generate_cultural_proposals',
  INSIGHT_NARRATIVE:    'generate_insight_narrative',

  // ── HITL ──
  HITL_RESPONSE:        'cultural_hitl_response',
} as const;

// ══════════════════════════════════════════════════════════
//  2. DATA FRESHNESS TIERS
// ══════════════════════════════════════════════════════════

/**
 * Freshness tiers (in milliseconds) per data category.
 *
 * Summary and calendar change frequently → short staleTime.
 * Analytics are expensive and slow-changing → longer staleTime.
 * Proposals are AI-generated and costly → longest staleTime.
 */
export const CULTURAL_FRESHNESS_TIERS = {
  /** Summary KPIs — fast-changing operational data. */
  SUMMARY:       120_000,    // 2 min
  /** Calendar events — changes when events are added/modified. */
  CALENDAR:      180_000,    // 3 min
  /** Entity lists — CRUD operations can change these. */
  ENTITIES:      120_000,    // 2 min
  /** Analytics — expensive computation, slower change. */
  ANALYTICS:     300_000,    // 5 min
  /** AI Proposals — costly generation, cache aggressively. */
  PROPOSALS:     600_000,    // 10 min
  /** Member-specific data — personal, moderate freshness. */
  MEMBER:        180_000,    // 3 min
} as const;

// ══════════════════════════════════════════════════════════
//  3. DASHBOARD MODE THRESHOLDS
// ══════════════════════════════════════════════════════════

/**
 * Thresholds that determine the Adaptive Morphism mode.
 *
 * calm    → Everything healthy, show full overview.
 * alert   → Signals need attention, prioritize intelligence.
 * critical → Immediate action required, focus mode.
 */
export const CULTURAL_DASHBOARD_MODE_THRESHOLDS = {
  /** Number of high-severity advisor insights to trigger critical. */
  CRITICAL_HIGH_SEVERITY:  3,
  /** Number of total advisor insights to trigger alert. */
  ALERT_INSIGHT_COUNT:     5,
  /** Health score below this triggers alert. */
  ALERT_HEALTH_SCORE:      65,
  /** Health score below this triggers critical. */
  CRITICAL_HEALTH_SCORE:   40,
  /** Attendance trend 'down' with this many upcoming events → critical. */
  CRITICAL_OVERSATURATION:  8,
  /** Any active taste mutation with confidence > this → alert. */
  ALERT_MUTATION_CONFIDENCE: 0.7,
} as const;

export type CulturalDashboardMode = 'calm' | 'alert' | 'critical';

/**
 * Derives the dashboard mode from current system state.
 * Pure function — no hooks, no side effects.
 */
export function deriveCulturalDashboardMode(params: {
  highSeverityCount: number;
  totalInsightCount: number;
  healthScore: number;
  attendanceTrend: 'up' | 'stable' | 'down';
  upcomingEvents: number;
  hasHighConfidenceMutations: boolean;
}): CulturalDashboardMode {
  const T = CULTURAL_DASHBOARD_MODE_THRESHOLDS;

  // Critical conditions
  if (params.highSeverityCount >= T.CRITICAL_HIGH_SEVERITY) return 'critical';
  if (params.healthScore < T.CRITICAL_HEALTH_SCORE) return 'critical';
  if (
    params.attendanceTrend === 'down' &&
    params.upcomingEvents >= T.CRITICAL_OVERSATURATION
  ) return 'critical';

  // Alert conditions
  if (params.totalInsightCount >= T.ALERT_INSIGHT_COUNT) return 'alert';
  if (params.healthScore < T.ALERT_HEALTH_SCORE) return 'alert';
  if (params.hasHighConfidenceMutations) return 'alert';

  return 'calm';
}

// ══════════════════════════════════════════════════════════
//  4. ADVISOR THRESHOLDS (20 rules × 5 layers)
// ══════════════════════════════════════════════════════════

/**
 * Every threshold that the advisor rules use to decide whether
 * to fire an insight. Organized by layer. Rule IDs reference
 * the original useCulturalAdvisor.ts rules R1-R15 plus new R16-R20.
 *
 * Naming: LAYER_RULEID_CONDITION
 */
export const CULTURAL_ADVISOR_THRESHOLDS = {

  // ── Layer 1: Cultural Health (R1-R4) ──

  /** R1 — Shannon entropy minimum for category diversity (0-100 scale). Below = concentrated. */
  R1_DIVERSITY_MIN_SCORE:         60,
  /** R1 — Below this, severity escalates to 'high'. */
  R1_DIVERSITY_HIGH_THRESHOLD:    40,

  /** R2 — Average venue utilization rate minimum (0-100). Below = underused. */
  R2_VENUE_UTIL_MIN:              40,
  /** R2 — Individual venue below this is "underused". */
  R2_VENUE_UTIL_UNDERUSED:        30,
  /** R2 — Average below this escalates severity. */
  R2_VENUE_UTIL_HIGH:             25,

  /** R3 — Minimum unique entertainment types expected (of 7 total). */
  R3_ENTERTAINMENT_MIN_TYPES:     4,
  /** R3 — Below this many types triggers diversity insight. */
  R3_ENTERTAINMENT_DIVERSITY_MIN: 3,
  /** R3 — Minimum average contracted rate (0-100). */
  R3_ENTERTAINMENT_MIN_CONTRACTED: 50,
  /** R3 — Below this contracted rate escalates severity. */
  R3_ENTERTAINMENT_CONTRACTED_HIGH: 30,

  /** R4 — Events per week above this = overload. */
  R4_CALENDAR_OVERLOAD:           5,
  /** R4 — Upcoming 30d events below this = empty. */
  R4_CALENDAR_EMPTY:              2,
  /** R4 — Upcoming 30d events below this = light (opportunity). */
  R4_CALENDAR_LIGHT:              6,
  /** R4 — Optimal range for premium clubs (upcoming 30d). */
  R4_CALENDAR_OPTIMAL_RANGE:      [8, 16] as readonly [number, number],

  // ── Layer 2: Engagement (R5-R8) ──

  /** R5 — Average attendance per event below this = stagnant. */
  R5_ATTENDANCE_STAGNANT:         30,

  /** R6 — Average enrollment percentage below this = low. */
  R6_ENROLLMENT_MIN:              30,
  /** R6 — Below this escalates to 'high'. */
  R6_ENROLLMENT_CRITICAL:         25,

  /** R7 — Reception percentage below this = opportunity. */
  R7_RECEPTION_MIN:               30,
  /** R7 — Minimum exhibitions to evaluate reception rate. */
  R7_RECEPTION_MIN_EXHIBITIONS:   2,

  /** R8 — Gala guest count below this = undersized. */
  R8_GALA_MIN_GUESTS:             60,
  /** R8 — Optimal gala guest range for premium clubs. */
  R8_GALA_OPTIMAL_RANGE:          [100, 200] as readonly [number, number],

  // ── Layer 3: Strategy (R9-R12) ──

  /** R9 — Season enrollment rate below this = low. */
  R9_SEASON_ENROLLMENT_MIN:       40,

  /** R10 — Two-week event total above this = saturation. */
  R10_SATURATION_2WEEK:           10,

  /** R11 — Cost per minute (₡) above this = expensive. */
  R11_COST_PER_MINUTE_MAX:        15_000,

  /** R12 — Shannon entropy minimum for budget diversification (0-100). */
  R12_REVENUE_DIVERSITY_MIN:      55,

  // ── Layer 4: Prediction (R13-R14) ──

  /** R13 — Upcoming events with declining attendance above this = oversaturation risk. */
  R13_OVERSATURATION_UPCOMING:    6,
  /** R13 — Upcoming events below this with rising attendance = expansion opportunity. */
  R13_EXPANSION_UPCOMING:         6,

  /** R14 — Budget utilization above this = nearly exhausted. */
  R14_BUDGET_EXHAUSTED:           90,
  /** R14 — Budget variance above this = significant deviation. */
  R14_BUDGET_VARIANCE_MAX:        20,

  // ── Layer 5: Innovation (R15) ──
  // R15 has no threshold — it fires whenever cross_domain_signals exist.

  // ── Layer 6: Intelligence (R16-R20 — NEW) ──

  /** R16 — Taste mutation confidence above this triggers alert. */
  R16_MUTATION_CONFIDENCE:        0.7,
  /** R16 — Mutation magnitude above this is significant. */
  R16_MUTATION_MAGNITUDE:         40,

  /** R17 — Resonance score drop (points) over lookback period to trigger alert. */
  R17_RESONANCE_DROP:             15,
  /** R17 — Lookback period in days for resonance comparison. */
  R17_RESONANCE_LOOKBACK_DAYS:    30,

  /** R18 — Days without cultural attendance to flag journey stall. */
  R18_JOURNEY_STALL_DAYS:         21,
  /** R18 — Journey phase progress (%) below this = stalled. */
  R18_JOURNEY_STALL_PROGRESS:     10,

  /** R19 — Venue personality match (%) below this = mismatch. */
  R19_VENUE_MISMATCH_SCORE:       60,
  /** R19 — Event-genre alignment (%) below this = mismatch. */
  R19_GENRE_MISMATCH_SCORE:       50,

  /** R20 — Minimum cross-domain signals to fire opportunity insight. */
  R20_CROSS_DOMAIN_MIN_SIGNALS:   1,

} as const;

// ══════════════════════════════════════════════════════════
//  5. ADVISOR TRIGGER CONFIGURATION
// ══════════════════════════════════════════════════════════

/**
 * MCP routing for advisor trigger actions.
 * When an insight fires, it can optionally trigger an AI narrative
 * generation call via this configuration.
 */
export const ADVISOR_TRIGGER_CONFIG = {
  server: ADVISOR_MCP_SERVER,
  tool: CULTURAL_MCP_TOOLS.INSIGHT_NARRATIVE,
  context: 'cultural',
  role: 'admin',
} as const;

// ══════════════════════════════════════════════════════════
//  6. ENGAGEMENT SCORE WEIGHTS
// ══════════════════════════════════════════════════════════

/**
 * Dimension weights for the cultural engagement score calculation.
 * Referenced by `calculateEngagementScore()` in types.ts.
 *
 * Weights must sum to 1.0.
 * Shift weights to prioritize dimensions that matter most to the club.
 */
export const CULTURAL_ENGAGEMENT_WEIGHTS = {
  category:      0.15,  // Diversity of cultural categories
  venue:         0.10,  // Venue utilization efficiency
  entertainment: 0.10,  // Entertainment booking effectiveness
  attendance:    0.25,  // Event attendance trend (highest weight)
  budget:        0.10,  // Budget discipline
  programs:      0.15,  // Program enrollment health
  exhibitions:   0.15,  // Exhibition engagement + reception rate
} as const;

/** Total weight — should always be 1.0. Useful for validation. */
export const ENGAGEMENT_WEIGHTS_TOTAL = Object.values(
  CULTURAL_ENGAGEMENT_WEIGHTS,
).reduce((s, w) => s + w, 0);

// ══════════════════════════════════════════════════════════
//  7. EXTENDED GENRE TAXONOMY
// ══════════════════════════════════════════════════════════

/**
 * Extended genre taxonomy for client-side taste profiling.
 *
 * The backend uses CulturalCategory (7 values) for CRUD operations.
 * This taxonomy extends to 15 values for richer intelligence modeling.
 *
 * Maps 1:1 with CulturalCategory for the first 7, then adds
 * 8 genres that exist in member behavior but not in the backend schema.
 */
export interface CulturalGenreConfig {
  label: string;
  emoji: string;
  color: string;
  /** Is this a backend CulturalCategory? If false, it's client-side only. */
  isBackendCategory: boolean;
  /** Which CulturalCategory maps to this genre (for backend operations). */
  backendMapping?: CulturalCategory;
}

export const CULTURAL_GENRE_EXTENDED: Record<string, CulturalGenreConfig> = {
  // ── Backend categories (1:1 with CulturalCategory) ──
  music:             { label: 'Música',            emoji: '🎵', color: 'var(--color-teal-400)',        isBackendCategory: true },
  visual_arts:       { label: 'Artes Visuales',     emoji: '🎨', color: 'var(--color-sage-400)',        isBackendCategory: true },
  theater:           { label: 'Teatro',             emoji: '🎭', color: 'var(--color-gold-400)',        isBackendCategory: true },
  dance:             { label: 'Danza',              emoji: '💃', color: 'var(--color-emerald-400)',     isBackendCategory: true },
  literature:        { label: 'Literatura',         emoji: '📚', color: 'var(--color-amber-400)',       isBackendCategory: true },
  gastronomy:        { label: 'Gastronomía',        emoji: '🍽️', color: 'var(--color-terracotta-400)', isBackendCategory: true },
  heritage:          { label: 'Patrimonio',         emoji: '🏛️', color: 'var(--color-silver-400)',     isBackendCategory: true },

  // ── Extended genres (client-side intelligence) ──
  wine_spirits:      { label: 'Vinos y Destilados', emoji: '🍷', color: 'var(--color-rose-400)',       isBackendCategory: false, backendMapping: 'gastronomy' },
  lectures:          { label: 'Conferencias',       emoji: '🎓', color: 'var(--color-silver-300)',      isBackendCategory: false, backendMapping: 'literature' },
  workshops:         { label: 'Talleres',           emoji: '🔧', color: 'var(--color-teal-300)',        isBackendCategory: false, backendMapping: 'visual_arts' },
  family:            { label: 'Familiar',           emoji: '👨‍👩‍👧‍👦', color: 'var(--color-emerald-300)', isBackendCategory: false },
  seasonal:          { label: 'Estacional',         emoji: '🎄', color: 'var(--color-amber-300)',       isBackendCategory: false },
  wellness_cultural: { label: 'Bienestar Cultural',  emoji: '🧘', color: 'var(--color-sage-300)',       isBackendCategory: false },
  contemporary:      { label: 'Contemporáneo',      emoji: '🔮', color: 'var(--color-gold-300)',        isBackendCategory: false, backendMapping: 'visual_arts' },
} as const;

// ══════════════════════════════════════════════════════════
//  8. SENSORY DEFAULTS PER VENUE TYPE
// ══════════════════════════════════════════════════════════

/**
 * Default sensory profiles per venue type.
 *
 * Each venue has a "sensory personality" — the default lighting,
 * acoustics, temperature, and atmosphere that suit it best.
 * The event designer engine uses these as baselines when
 * designing an experience for a specific venue.
 */
export interface VenueSensoryDefaults {
  lighting: {
    baseLevel: number;      // 0-100 (normalized)
    mood: 'bright' | 'ambient' | 'dramatic' | 'intimate';
    colorTemperature: 'warm' | 'neutral' | 'cool';
  };
  acoustics: {
    ambientNoise: number;   // 0-100 (normalized)
    reverberation: 'dead' | 'intimate' | 'moderate' | 'cathedral';
    musicCapability: boolean;
  };
  temperature: {
    ideal: number;          // °C
    range: number;          // ±°C
  };
  formality: FormalityLevel;
  flowPattern: 'linear' | 'circular' | 'open' | 'tiered';
}

export const SENSORY_DEFAULTS: Record<VenueType, VenueSensoryDefaults> = {
  ballroom: {
    lighting: { baseLevel: 60, mood: 'dramatic', colorTemperature: 'warm' },
    acoustics: { ambientNoise: 30, reverberation: 'moderate', musicCapability: true },
    temperature: { ideal: 21, range: 1.5 },
    formality: 'formal',
    flowPattern: 'circular',
  },
  garden: {
    lighting: { baseLevel: 80, mood: 'bright', colorTemperature: 'warm' },
    acoustics: { ambientNoise: 45, reverberation: 'dead', musicCapability: false },
    temperature: { ideal: 24, range: 3 },
    formality: 'casual',
    flowPattern: 'open',
  },
  terrace: {
    lighting: { baseLevel: 65, mood: 'ambient', colorTemperature: 'warm' },
    acoustics: { ambientNoise: 40, reverberation: 'dead', musicCapability: true },
    temperature: { ideal: 23, range: 2 },
    formality: 'semi_formal',
    flowPattern: 'open',
  },
  lounge: {
    lighting: { baseLevel: 35, mood: 'intimate', colorTemperature: 'warm' },
    acoustics: { ambientNoise: 25, reverberation: 'intimate', musicCapability: true },
    temperature: { ideal: 22, range: 1 },
    formality: 'casual',
    flowPattern: 'circular',
  },
  auditorium: {
    lighting: { baseLevel: 40, mood: 'dramatic', colorTemperature: 'neutral' },
    acoustics: { ambientNoise: 15, reverberation: 'cathedral', musicCapability: true },
    temperature: { ideal: 21, range: 1 },
    formality: 'formal',
    flowPattern: 'tiered',
  },
  poolside: {
    lighting: { baseLevel: 85, mood: 'bright', colorTemperature: 'neutral' },
    acoustics: { ambientNoise: 55, reverberation: 'dead', musicCapability: true },
    temperature: { ideal: 26, range: 3 },
    formality: 'casual',
    flowPattern: 'open',
  },
};

// ══════════════════════════════════════════════════════════
//  9. JOURNEY CURATION CONFIGURATION
// ══════════════════════════════════════════════════════════

/**
 * Configuration for cultural journey curation.
 *
 * The journey composer designs multi-phase experiences for members.
 * Each journey has a horizon, and each phase has a purpose
 * that determines the ratio of comfort vs adventure events.
 */

export interface JourneyHorizonConfig {
  label: string;
  /** Approximate number of experiences in this horizon. */
  experienceCount: number;
  /** Number of phases in the journey. */
  phaseCount: number;
}

export const JOURNEY_HORIZON_CONFIG: Record<string, JourneyHorizonConfig> = {
  '1_month':  { label: '1 Mes',     experienceCount: 4,  phaseCount: 2 },
  '3_months': { label: '3 Meses',   experienceCount: 10, phaseCount: 3 },
  '6_months': { label: '6 Meses',   experienceCount: 18, phaseCount: 4 },
  '1_year':   { label: '1 Año',     experienceCount: 30, phaseCount: 5 },
} as const;

export interface JourneyPurposeConfig {
  label: string;
  emoji: string;
  color: string;
  /** Percentage of journey events that should be this purpose. */
  ratio: number;
}

/**
 * The 5 journey purposes and their target ratios.
 * Ratios should sum to 1.0.
 *
 * comfort=40%, introduction=20%, deepening=20%, exploration=15%, challenge=5%
 */
export const JOURNEY_PURPOSE_CONFIG: Record<string, JourneyPurposeConfig> = {
  comfort:      { label: 'Confort',      emoji: '🏠', color: 'var(--color-teal-400)',     ratio: 0.40 },
  introduction: { label: 'Introducción', emoji: '🌱', color: 'var(--color-emerald-400)',  ratio: 0.20 },
  deepening:    { label: 'Profundizar',  emoji: '🔬', color: 'var(--color-sage-400)',     ratio: 0.20 },
  exploration:  { label: 'Exploración',  emoji: '🧭', color: 'var(--color-amber-400)',    ratio: 0.15 },
  challenge:    { label: 'Desafío',      emoji: '⚡', color: 'var(--color-terracotta-400)', ratio: 0.05 },
} as const;

/**
 * Exploration index thresholds for adjusting journey expansion rate.
 *
 * Members with low explorationIndex get more comfort events.
 * Members with high explorationIndex get more adventure events.
 */
export const JOURNEY_EXPANSION_THRESHOLDS = {
  /** Below this index: very conservative, mostly comfort. */
  CONSERVATIVE: 30,
  /** Above this index: actively exploring, can handle stretch. */
  OPEN:         60,
  /** Above this index: true explorer, can handle challenge. */
  ADVENTUROUS:  80,
  /** Maximum expansion rate adjustment (multiplier). */
  MAX_EXPANSION: 1.5,
  /** Minimum expansion rate adjustment (multiplier). */
  MIN_EXPANSION: 0.5,
} as const;

// ══════════════════════════════════════════════════════════
//  10. RESONANCE SCORING THRESHOLDS
// ══════════════════════════════════════════════════════════

/**
 * Thresholds for classifying experiential resonance.
 *
 * Resonance measures how much an event REVERBERATES in a member —
 * not just whether they attended, but whether it changed them.
 */
export const CULTURAL_RESONANCE_THRESHOLDS = {
  /** Total resonance above this = transformative experience. */
  TRANSFORMATIVE:    80,
  /** Total resonance above this = strong resonance. */
  STRONG:            60,
  /** Total resonance above this = moderate resonance. */
  MODERATE:          40,
  /** Total resonance below this = minimal impact. */
  MINIMAL:           20,

  /** Identity integration above this = became part of who they are. */
  IDENTITY_INTEGRATION_HIGH: 70,
  /** Echo count above this = they keep talking about it. */
  ECHO_SIGNIFICANT:          3,
  /** Days the effect lasted above this = lasting impact. */
  DURATION_SIGNIFICANT:      14,
} as const;

// ══════════════════════════════════════════════════════════
//  11. TASTE MUTATION DETECTION THRESHOLDS
// ══════════════════════════════════════════════════════════

/**
 * Thresholds for detecting when a member's cultural taste MUTATES.
 *
 * A mutation is a discontinuity — not gradual change, but a sudden
 * shift in behavior (new genre, abandoned genre, changed style).
 */
export const CULTURAL_MUTATION_THRESHOLDS = {
  /** Default lookback period in months for mutation detection. */
  DEFAULT_LOOKBACK_MONTHS:    12,

  /** Minimum events in a genre before we can detect a shift. */
  MIN_EVENTS_FOR_BASELINE:    3,

  /** Confidence above this = reliable detection. */
  CONFIDENCE_RELIABLE:        0.7,
  /** Confidence above this = emerging signal. */
  CONFIDENCE_EMERGING:        0.4,

  /** Magnitude above this = significant mutation. */
  MAGNITUDE_SIGNIFICANT:      50,
  /** Magnitude above this = minor adjustment. */
  MAGNITUDE_MINOR:            25,

  /** Stability classification — months of consistent behavior. */
  STABILITY_PERMANENT_MONTHS: 6,
  STABILITY_EMERGING_MONTHS:  3,
  // Below 3 months → classified as 'fad'

  /** Affinity score sudden change (points) to detect discontinuity. */
  DISCONTINUITY_THRESHOLD:    30,
} as const;

// ══════════════════════════════════════════════════════════
//  12. EVENT DESIGNER CONFIGURATION
// ══════════════════════════════════════════════════════════

/**
 * Configuration for the AI Event Designer engine.
 *
 * Controls how the system designs, enriches, and variants events
 * when an operator uses the AI Creation Modals.
 */
export const EVENT_DESIGNER_CONFIG = {
  /** Maximum number of variants to generate per proposal. */
  MAX_VARIANTS:               3,

  /** Match score below this triggers venue mismatch warning. */
  VENUE_MATCH_WARNING:        60,
  /** Match score below this blocks the proposal. */
  VENUE_MATCH_BLOCK:          30,

  /** Resonance prediction below this triggers quality warning. */
  RESONANCE_WARNING:          50,

  /** Capacity sweet spot: venues perform best at this occupancy. */
  OPTIMAL_CAPACITY_RATIO:     0.70,
  /** Capacity above this ratio triggers overcrowding warning. */
  OVERCROWDING_RATIO:         0.90,

  /** Confidence band width for demand predictions (±%). */
  DEMAND_CONFIDENCE_BAND:     15,

  /**
   * Variant optimization strategies.
   * Each variant optimizes for a different outcome.
   */
  VARIANT_STRATEGIES: [
    { id: 'max_attendance',  label: 'Máxima Asistencia',   optimize: 'attendance',  emoji: '👥' },
    { id: 'max_resonance',   label: 'Máxima Resonancia',   optimize: 'resonance',   emoji: '💫' },
    { id: 'max_revenue',     label: 'Máximo Revenue',      optimize: 'revenue',     emoji: '💰' },
  ] as const,

  /**
   * Risk assessment thresholds.
   * If any risk factor exceeds these, the proposal gets a warning.
   */
  RISK_THRESHOLDS: {
    /** Budget exceedance (%) above this = budget risk. */
    BUDGET_EXCEEDANCE:        15,
    /** Days until event below this with low confidence = timing risk. */
    TIMING_TIGHT_DAYS:        7,
    /** Competitive events on same date above this = cannibalization risk. */
    COMPETITIVE_EVENTS_MAX:   2,
    /** Historical no-show rate above this = attendance risk. */
    NOSHOW_RATE_WARNING:      25,
  },
} as const;

// ══════════════════════════════════════════════════════════
//  13. HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════

/**
 * Classifies a resonance score into a level label.
 * Pure function — no hooks, no side effects.
 */
export function classifyResonanceLevel(
  score: number,
): 'transformative' | 'strong' | 'moderate' | 'minimal' | 'negligible' {
  const T = CULTURAL_RESONANCE_THRESHOLDS;
  if (score >= T.TRANSFORMATIVE) return 'transformative';
  if (score >= T.STRONG)         return 'strong';
  if (score >= T.MODERATE)       return 'moderate';
  if (score >= T.MINIMAL)        return 'minimal';
  return 'negligible';
}

/**
 * Classifies a mutation confidence into a reliability label.
 * Pure function.
 */
export function classifyMutationConfidence(
  confidence: number,
): 'reliable' | 'emerging' | 'noise' {
  const T = CULTURAL_MUTATION_THRESHOLDS;
  if (confidence >= T.CONFIDENCE_RELIABLE) return 'reliable';
  if (confidence >= T.CONFIDENCE_EMERGING) return 'emerging';
  return 'noise';
}

/**
 * Classifies a mutation stability based on how many months
 * the behavior has been consistent.
 * Pure function.
 */
export function classifyMutationStability(
  consistentMonths: number,
): 'permanent' | 'emerging_interest' | 'fad' {
  const T = CULTURAL_MUTATION_THRESHOLDS;
  if (consistentMonths >= T.STABILITY_PERMANENT_MONTHS) return 'permanent';
  if (consistentMonths >= T.STABILITY_EMERGING_MONTHS)  return 'emerging_interest';
  return 'fad';
}

/**
 * Computes the journey expansion rate based on a member's exploration index.
 *
 * Low explorationIndex → more comfort events (expansion < 1)
 * High explorationIndex → more adventure events (expansion > 1)
 *
 * Pure function. Returns a multiplier for the journey composer.
 */
export function computeJourneyExpansionRate(explorationIndex: number): number {
  const T = JOURNEY_EXPANSION_THRESHOLDS;
  const clamped = Math.max(0, Math.min(100, explorationIndex));

  if (clamped <= T.CONSERVATIVE) return T.MIN_EXPANSION;
  if (clamped >= T.ADVENTUROUS)  return T.MAX_EXPANSION;

  // Linear interpolation between conservative and adventurous
  const ratio = (clamped - T.CONSERVATIVE) / (T.ADVENTUROUS - T.CONSERVATIVE);
  return T.MIN_EXPANSION + ratio * (T.MAX_EXPANSION - T.MIN_EXPANSION);
}

/**
 * Computes venue match score between a venue personality and event requirements.
 *
 * Higher score = better fit. Returns 0-100.
 * Pure function.
 */
export function computeVenueMatchScore(params: {
  venueFormality: FormalityLevel;
  eventFormality: FormalityLevel;
  venueCapacity: number;
  expectedAttendance: number;
  venueBestGenres: string[];
  eventGenre: string;
}): number {
  const formalityOrder: FormalityLevel[] = [
    'casual', 'semi_formal', 'formal', 'black_tie', 'white_tie',
  ];
  const venueIdx = formalityOrder.indexOf(params.venueFormality);
  const eventIdx = formalityOrder.indexOf(params.eventFormality);
  const formalityDelta = Math.abs(venueIdx - eventIdx);
  const formalityScore = Math.max(0, 100 - formalityDelta * 25);

  // Capacity fit: ideal is 70-90% of venue capacity
  const capacityRatio = params.expectedAttendance / Math.max(1, params.venueCapacity);
  const capacityScore = capacityRatio >= 0.7 && capacityRatio <= 0.9
    ? 100
    : capacityRatio < 0.7
      ? Math.round(capacityRatio / 0.7 * 100)
      : Math.max(0, 100 - (capacityRatio - 0.9) * 500);

  // Genre alignment
  const genreMatch = params.venueBestGenres.includes(params.eventGenre) ? 100 : 40;

  // Weighted composite
  return Math.round(
    formalityScore * 0.35 +
    capacityScore  * 0.30 +
    genreMatch     * 0.35
  );
}

/**
 * Derives sensory adjustments needed when event type diverges
 * from the venue's default sensory profile.
 *
 * Returns a partial sensory override — only the fields that need changing.
 * Pure function.
 */
export function deriveSensoryAdjustments(
  venueType: VenueType,
  _eventType: string,
  formality: FormalityLevel,
): Partial<VenueSensoryDefaults> {
  const defaults = SENSORY_DEFAULTS[venueType];
  const overrides: Partial<VenueSensoryDefaults> = {};

  // Formal events in casual venues → upgrade lighting mood
  const formalLevels: FormalityLevel[] = ['formal', 'black_tie', 'white_tie'];
  if (formalLevels.includes(formality) && defaults.formality === 'casual') {
    overrides.lighting = {
      ...defaults.lighting,
      mood: 'dramatic',
      baseLevel: Math.min(80, defaults.lighting.baseLevel + 20),
    };
    overrides.formality = formality;
  }

  // Intimate events in large venues → reduce lighting, tighten acoustics
  if (defaults.flowPattern === 'open' && formality !== 'casual') {
    overrides.lighting = {
      ...defaults.lighting,
      mood: 'intimate',
      baseLevel: Math.max(25, defaults.lighting.baseLevel - 30),
    };
  }

  return overrides;
}