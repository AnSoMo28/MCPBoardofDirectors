// ═══════════════════════════════════════════════════════════
// src/features/guests/types.ts
// Phase 34 "The Gateway" — Type Definitions
// Level 6+ Agency · Apple/Xiaomi Production Grade
//
// §0  Imports
// §1  Branded ID Types
// §2  Error & Result Types
// §3  State Machine Types
// §4  Existing Entity Types (Phase 30a) — preserved
// §5  Existing Entity Types (Phase 12) — preserved
// §6  Guest Intelligence Types (Phase 34)
// §7  Conversion Chemistry Types (Phase 34)
// §8  Guest Memory Types (Phase 34)
// §9  Pipeline Ecosystem Types (Phase 34)
// §10 Trial Narrative Types (Phase 34)
// §11 Signal Contracts
// §12 Dashboard State
// §13 MCP Integration Contracts
// §14 Theme & Accessibility Contracts
// §15 Backward Compatibility Re-exports
//
// Checklist items applied: M1.1-15, M2.1-12, M8.1-10
// ═══════════════════════════════════════════════════════════
import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";
import type {
  HealthScoreResult,
  DomainSignal,
} from "@/shared/lib/advisor-engine/types";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";

// ═══════════════════════════════════════════════════════════
// §1 — BRANDED ID TYPES
// Nominal typing prevents ID mixups at compile time.
// processGuest(guestId, familyId) — swapping args = compile error.
//
// Checklist: M2.3 (branded types for IDs)
// ═══════════════════════════════════════════════════════════

declare const __brand: unique symbol;

/** Creates a branded string type that prevents ID interchange. */
type Brand<T extends string> = { readonly [__brand]: T };

/** Runtime constructor — casts raw string to branded type. */
function brandId<T extends string>(raw: string): string & Brand<T> {
  return raw as string & Brand<T>;
}

/** Guest unique identifier. */
export type GuestId = string & Brand<"GuestId">;
/** Create a GuestId from a raw string. */
export const GuestId = (raw: string) => brandId<"GuestId">(raw);

/** Host family unique identifier. */
export type FamilyId = string & Brand<"FamilyId">;
/** Create a FamilyId from a raw string. */
export const FamilyId = (raw: string) => brandId<"FamilyId">(raw);

/** Member unique identifier. */
export type MemberId = string & Brand<"MemberId">;
/** Create a MemberId from a raw string. */
export const MemberId = (raw: string) => brandId<"MemberId">(raw);

/** Trial membership unique identifier. */
export type TrialId = string & Brand<"TrialId">;
/** Create a TrialId from a raw string. */
export const TrialId = (raw: string) => brandId<"TrialId">(raw);

/** Private event unique identifier. */
export type EventId = string & Brand<"EventId">;
/** Create an EventId from a raw string. */
export const EventId = (raw: string) => brandId<"EventId">(raw);

/** Guest check-in unique identifier. */
export type CheckInId = string & Brand<"CheckInId">;
/** Create a CheckInId from a raw string. */
export const CheckInId = (raw: string) => brandId<"CheckInId">(raw);

/** Facility unique identifier. */
export type FacilityId = string & Brand<"FacilityId">;
/** Create a FacilityId from a raw string. */
export const FacilityId = (raw: string) => brandId<"FacilityId">(raw);

/** Advisor insight unique identifier. */
export type InsightId = string & Brand<"InsightId">;
/** Create an InsightId from a raw string. */
export const InsightId = (raw: string) => brandId<"InsightId">(raw);

// ═══════════════════════════════════════════════════════════
// §2 — ERROR & RESULT TYPES
// Every engine returns Result<T>, never throws.
// Callers handle success/failure explicitly.
//
// Checklist: M2.17 (discriminated unions for state)
// ═══════════════════════════════════════════════════════════

/**
 * Discriminated union for engine execution results.
 * Engines never throw — they return Result<T>.
 *
 * @template T - The success data type
 *
 * @example
 * const result = buildProfile(mcpData);
 * if (result.ok) {
 *   renderProfile(result.data);
 *   if (result.warnings.length) logWarnings(result.warnings);
 * } else {
 *   renderError(result.error);
 *   if (result.fallback) renderDegraded(result.fallback);
 * }
 */
export type GuestEngineResult<T> =
  | { readonly ok: true; readonly data: T; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly error: GuestEngineError; readonly fallback: T | null };

/** Successful result factory. */
export function engineOk<T>(data: T, warnings: string[] = []): GuestEngineResult<T> {
  return { ok: true, data, warnings };
}

/** Failed result factory with optional fallback for graceful degradation. */
export function engineFail<T>(
  error: GuestEngineError,
  fallback: T | null = null,
): GuestEngineResult<T> {
  return { ok: false, error, fallback };
}

/** Error codes for guest engine failures. Exhaustive — every failure has a code. */
export type GuestErrorCode =
  | "MCP_UNAVAILABLE"
  | "MCP_TIMEOUT"
  | "MCP_INVALID_SHAPE"
  | "ENGINE_OVERRUN"
  | "INSUFFICIENT_DATA"
  | "CROSS_DOMAIN_CONFLICT"
  | "STALE_DATA"
  | "CALIBRATION_MISSING";

/** Structured error from a guest engine. */
export interface GuestEngineError {
  /** Which engine produced this error. */
  readonly engine: EngineName;
  /** Machine-readable error code. */
  readonly code: GuestErrorCode;
  /** Human-readable description (Spanish, for UI). */
  readonly message: string;
  /** Whether retrying might succeed. */
  readonly retryable: boolean;
  /** Additional diagnostic context. */
  readonly context?: Readonly<Record<string, unknown>>;
  /** ISO timestamp of the error. */
  readonly timestamp: string;
}

// ═══════════════════════════════════════════════════════════
// §3 — STATE MACHINE TYPES
// Valid transitions prevent illegal state changes.
//
// Checklist: M2.17 (discriminated unions for state)
// ═══════════════════════════════════════════════════════════

/**
 * Valid dashboard mode transitions.
 * "calm" → "alert" (health drops)
 * "alert" → "calm" (health recovers) | "critical" (worsens)
 * "critical" → "alert" (partial recovery)
 * "celebration" → "calm" (normal) | "alert" (new issue)
 */
export const DASHBOARD_TRANSITIONS: Record<GuestDashboardMode, readonly GuestDashboardMode[]> = {
  calm: ["alert", "celebration"],
  alert: ["calm", "critical"],
  critical: ["alert"],
  celebration: ["calm", "alert"],
} as const;

/**
 * Pipeline stage forward transitions (guest can also go to "dormant" from any stage).
 *
 * registered  → first_visit
 * first_visit → trial_active | dormant
 * trial_active → ready | dormant
 * ready → converted | dormant
 * converted → (terminal)
 * dormant → first_visit (reactivation)
 */
export const PIPELINE_TRANSITIONS: Record<GuestPipelineStage, readonly GuestPipelineStage[]> = {
  registered: ["first_visit"],
  first_visit: ["trial_active", "dormant"],
  trial_active: ["ready", "dormant"],
  ready: ["converted", "dormant"],
  converted: [],
  dormant: ["first_visit"],
} as const;

/** Validate a dashboard mode transition. */
export function isValidDashboardTransition(
  from: GuestDashboardMode,
  to: GuestDashboardMode,
): boolean {
  return (DASHBOARD_TRANSITIONS[from] as readonly string[]).includes(to);
}

/** Validate a pipeline stage transition. */
export function isValidPipelineTransition(
  from: GuestPipelineStage,
  to: GuestPipelineStage,
): boolean {
  return (PIPELINE_TRANSITIONS[from] as readonly string[]).includes(to);
}

// ═══════════════════════════════════════════════════════════
// §4 — EXISTING ENTITY TYPES (Phase 30a)
// Preserved exactly for backward compatibility.
// Runtime validation via schemas.ts.
//
// Checklist: M8.1 (JSDoc on all exported types)
// ═══════════════════════════════════════════════════════════

/**
 * Core guest entity — raw backend data, never modified by engines.
 * Validated at MCP boundary by GuestSchema (schemas.ts).
 */
export interface Guest {
  /** Unique guest identifier. */
  readonly id: GuestId;
  readonly first_name: string;
  readonly last_name: string;
  /** National ID number (cédula). */
  readonly id_number: string;
  readonly phone: string;
  readonly email?: string;
  readonly photo_url?: string;
  /** Relationship to the host family (e.g., "family", "friend"). */
  readonly relationship: string;
  /** Human-readable relationship label. */
  readonly relationship_label: string;
  /** The family that hosts/sponsors this guest. */
  readonly host_family_id: FamilyId;
  readonly host_family_name: string;
  readonly host_member_name: string;
  /** Total number of visits to the club. */
  readonly visits_count: number;
  /** ISO date of most recent visit, null if never visited. */
  readonly last_visit_date: string | null;
  readonly is_blacklisted: boolean;
  readonly blacklist_reason?: string;
  readonly notes?: string;
  /** ISO datetime of guest registration. */
  readonly created_at: string;
}

/**
 * A specific guest check-in record.
 * Represents a single visit event at the club.
 */
export interface GuestCheckIn {
  readonly id: CheckInId;
  readonly guest_id: GuestId;
  readonly guest_name: string;
  readonly guest_photo_url?: string;
  readonly host_family_id: FamilyId;
  readonly host_family_name: string;
  readonly host_member_name: string;
  readonly facility_id: FacilityId;
  readonly facility_name: string;
  /** ISO datetime of check-in. */
  readonly check_in_time: string;
  /** ISO datetime of check-out, null if still at club. */
  readonly check_out_time: string | null;
  readonly status: "active" | "departed" | "no_show";
  readonly purpose: string;
  readonly purpose_label: string;
  readonly notes?: string;
  readonly approved_by: MemberId;
  readonly approved_by_name: string;
}

/**
 * Form data for registering a new guest check-in.
 * Validated at form boundary by GuestCheckInFormSchema (schemas.ts).
 */
export type GuestCheckInForm = {
  first_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  email?: string;
  relationship: string;
  host_family_id: string;
  facility_id: string;
  purpose: string;
  notes?: string;
}

/** Paginated guest check-in list response from MCP. */
export interface GuestListResponse {
  readonly checkins: readonly GuestCheckIn[];
  readonly total: number;
  readonly date: string;
  readonly active_count: number;
  readonly departed_count: number;
  readonly total_count: number;
}

/** Historical visit data for a specific guest. */
export interface GuestHistoryResponse {
  readonly guest_id: GuestId;
  readonly visits: readonly GuestVisit[];
  readonly total_visits: number;
  readonly first_visit: string;
  readonly last_visit: string;
  readonly avg_visits_per_month: number;
}

/** A single historical visit record. */
export interface GuestVisit {
  readonly date: string;
  readonly facility_name: string;
  readonly purpose: string;
  /** Duration in hours, null if check-out time not recorded. */
  readonly duration_hours: number | null;
}

/**
 * Trial membership — the guest's trial period before conversion.
 * Validated at MCP boundary by TrialMembershipSchema (schemas.ts).
 */
export interface TrialMembership {
  readonly id: TrialId;
  readonly guest_id: GuestId;
  readonly guest_name: string;
  readonly guest_email: string;
  readonly guest_phone: string;
  readonly host_family_id: FamilyId;
  readonly host_family_name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: "active" | "expired" | "converted" | "cancelled";
  readonly trial_type: "week" | "two_weeks" | "month";
  readonly trial_type_label: string;
  readonly facilities_access: readonly string[];
  readonly activities_attended: number;
  /** Guest satisfaction feedback (1-5), null if not yet provided. */
  readonly feedback_score: number | null;
  /** Model-predicted conversion probability (0-100), null if insufficient data. */
  readonly conversion_probability: number | null;
  readonly notes?: string;
  readonly created_at: string;
}

/** Paginated trial list response from MCP. */
export interface TrialListResponse {
  readonly trials: readonly TrialMembership[];
  readonly total: number;
  readonly active_count: number;
  readonly conversion_rate: number;
}

/** Form data for creating a new trial membership. */
export interface TrialForm {
  guest_id: string;
  host_family_id: string;
  trial_type: "week" | "two_weeks" | "month";
  facilities_access: string[];
  notes?: string;
}

/** Summary of today's guest activity. */
export interface GuestTodaySummary {
  readonly date: string;
  readonly total_expected: number;
  readonly checked_in: number;
  readonly departed: number;
  readonly currently_present: number;
  readonly by_facility: readonly FacilityGuestCount[];
  readonly by_purpose: readonly PurposeGuestCount[];
}

/** Guest count breakdown by facility. */
export interface FacilityGuestCount {
  readonly facility_id: FacilityId;
  readonly facility_name: string;
  readonly count: number;
}

/** Guest count breakdown by visit purpose. */
export interface PurposeGuestCount {
  readonly purpose: string;
  readonly label: string;
  readonly count: number;
}

// ═══════════════════════════════════════════════════════════
// §5 — EXISTING ENTITY TYPES (Phase 12)
// Preserved exactly for backward compatibility.
// ═══════════════════════════════════════════════════════════

/** Status of a guest registry entry. */
export type GuestRegistryStatus =
  | "registered"
  | "checked_in"
  | "completed"
  | "cancelled";

/** Type of private event hosted at the club. */
export type PrivateEventType =
  | "wedding"
  | "baptism"
  | "birthday"
  | "anniversary"
  | "corporate"
  | "quinceanera"
  | "other";

/** Status of a private event booking. */
export type PrivateEventStatus =
  | "inquiry"
  | "quoted"
  | "approved"
  | "contracted"
  | "deposit_paid"
  | "confirmed"
  | "completed"
  | "cancelled";

/** Trial membership duration type (backend enum). */
export type TrialType = "day_pass" | "week_trial" | "month_trial";

/** Trial membership status (backend enum, includes approval workflow). */
export type TrialStatus =
  | "pending_approval"
  | "approved"
  | "active"
  | "expired"
  | "converted"
  | "cancelled";

/** Club facility privileges available to guests. */
export type GuestPrivilege =
  | "pool"
  | "gym"
  | "dining"
  | "tennis"
  | "golf"
  | "spa"
  | "kids_area"
  | "social_events";

/** A guest registry entry — pre-registration before visit. */
export interface GuestRegistryItem {
  readonly id: string;
  readonly family_id: FamilyId;
  readonly host_member_id: MemberId;
  readonly guest_name: string;
  readonly guest_email: string;
  readonly guest_phone: string;
  readonly visit_date: string;
  readonly purpose: string;
  readonly status: GuestRegistryStatus;
  readonly privileges: readonly string[];
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Private event booking entity. */
export interface PrivateEventItem {
  readonly id: EventId;
  readonly family_id: FamilyId;
  readonly event_name: string;
  readonly event_type: PrivateEventType;
  readonly venue: string;
  readonly date: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly guest_count: number;
  /** Budget in ₡ colones. */
  readonly budget: number;
  /** Estimated cost in ₡ colones. */
  readonly estimated_cost: number;
  readonly status: PrivateEventStatus;
  readonly coordinator_member_id: MemberId;
  readonly description: string;
  readonly special_requirements: string;
  readonly catering_required: boolean;
  readonly decoration_required: boolean;
  readonly entertainment_required: boolean;
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Trial membership item (Phase 12 backend variant with approval workflow). */
export interface TrialMembershipItem {
  readonly id: TrialId;
  readonly guest_name: string;
  readonly guest_email: string;
  readonly guest_phone: string;
  readonly referred_by_family_id: FamilyId;
  readonly trial_type: TrialType;
  readonly start_date: string;
  readonly end_date: string;
  readonly status: TrialStatus;
  readonly privileges: readonly string[];
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Aggregated analytics data for the guest management dashboard. */
export interface GuestAnalyticsData {
  readonly total_guests: number;
  readonly total_private_events: number;
  readonly total_trial_memberships: number;
  readonly guests_by_status: Readonly<Record<string, number>>;
  readonly guests_by_privilege: readonly { privilege: string; count: number }[];
  readonly events_by_type: readonly { type: string; count: number }[];
  readonly events_by_status: readonly { status: string; count: number }[];
  readonly trials_by_status: readonly { status: string; count: number }[];
  readonly trials_by_type: readonly { type: string; count: number }[];
  readonly guests_by_day_of_week: readonly { day: string; count: number }[];
  readonly top_host_families: readonly {
    family_id: FamilyId;
    family_name: string;
    guest_count: number;
  }[];
  readonly trial_conversion_rate: number;
  readonly avg_guests_per_event: number;
  /** Average event budget in ₡ colones. */
  readonly avg_event_budget: number;
  readonly upcoming_events: number;
  readonly active_trials: number;
  readonly trials_expiring_soon: number;
}

/** MCP response wrapper for analytics. */
export interface GuestAnalyticsResponse {
  readonly status: string;
  readonly message: string;
  readonly analytics: GuestAnalyticsData;
}

/** Category of guest management insight. */
export type GuestInsightCategory =
  | "conversion"
  | "event"
  | "privilege"
  | "frequency"
  | "risk"
  | "opportunity";

/** Priority level for guest insights. */
export type GuestInsightPriority = "high" | "medium" | "low";

/** A guest management insight (Phase 12 mock-compatible). */
export interface GuestManagementInsight {
  readonly id: string;
  readonly category: GuestInsightCategory;
  readonly priority: GuestInsightPriority;
  readonly title: string;
  readonly description: string;
  /** Confidence in this insight (0-100). */
  readonly confidence: number;
  readonly metric?: string;
  readonly recommendation: string;
  readonly action_label?: string;
}

/** MCP response wrapper for insights. */
export interface GuestInsightsResponse {
  readonly status: string;
  readonly message: string;
  readonly insights: readonly GuestManagementInsight[];
  readonly summary: string;
  readonly generated_at: string;
}

// ═══════════════════════════════════════════════════════════
// §6 — GUEST INTELLIGENCE TYPES (Phase 34)
// Engine: guestIntelligence.ts
// Builds: GuestProfile from MCP health + analytics + funnel
// ═══════════════════════════════════════════════════════════

/**
 * Behavioral segment classification.
 * Derived from visit frequency, spending, engagement depth.
 *
 * Segments are mutually exclusive — a guest belongs to exactly one.
 */
export type GuestSegment =
  | "vip"
  | "high_potential"
  | "active_trial"
  | "warm"
  | "cold"
  | "dormant"
  | "converted";

/**
 * Visit cadence pattern derived from historical visits.
 * Used to predict future behavior and timing interventions.
 */
export type VisitPattern =
  | "regular"
  | "exploratory"
  | "sporadic"
  | "first_time"
  | "returning"
  | "escalating";

/** Club activity domains for interest mapping. */
export type GuestInterestDomain =
  | "sports"
  | "dining"
  | "wellness"
  | "cultural"
  | "social"
  | "pool"
  | "events";

/** Temperature label for engagement heat. Maps to visual rendering. */
export type GuestTemperatureLabel =
  | "blazing"
  | "hot"
  | "warm"
  | "cool"
  | "cold"
  | "frozen";

/**
 * Per-domain interest score.
 * Each domain has a 0-100 score and list of specific activities.
 */
export interface DomainInterestScore {
  readonly domain: GuestInterestDomain;
  /** Interest strength (0-100). */
  readonly score: number;
  /** Specific activities the guest has engaged in within this domain. */
  readonly activities: readonly string[];
}

/** Interest map across all club domains. */
export type InterestMap = readonly DomainInterestScore[];

/**
 * Engagement temperature reading.
 * Derived from visit recency, frequency, and engagement depth.
 *
 * Temperature determines visual treatment:
 *   blazing/hot → warm accent, prominent display
 *   warm/cool   → neutral accent, standard display
 *   cold/frozen → muted accent, recovery mode
 */
export interface GuestTemperature {
  /** Heat value (0=frozen, 100=blazing). */
  readonly value: number;
  readonly label: GuestTemperatureLabel;
  /** CSS custom property token for rendering (e.g., "var(--color-amber-400)"). */
  readonly color: string;
}

/**
 * Enriched guest profile — intelligence layer on top of raw Guest entity.
 *
 * Built by guestIntelligence engine from MCP data.
 * Components access profile.raw for backend data,
 * top-level fields for computed intelligence.
 *
 * @example
 * const profile = buildProfile(guest, healthScore, analytics);
 * if (profile.ok && profile.data.vipScore > 80) {
 *   renderVIPBadge(profile.data);
 * }
 */
export interface GuestProfile {
  /** Original backend entity — immutable, never modified by engines. */
  readonly raw: Guest;
  readonly segment: GuestSegment;
  readonly temperature: GuestTemperature;
  readonly visitPattern: VisitPattern;
  readonly interestMap: InterestMap;
  /** VIP detection score (0-100). Based on spending, influence, fit. */
  readonly vipScore: number;
  /** Computed days since last visit. 0 if currently at club. */
  readonly daysSinceLastVisit: number;
  /** AI-generated narrative summary for staff context. */
  readonly narrative: string;
  /** ISO timestamp of profile computation. */
  readonly computedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §7 — CONVERSION CHEMISTRY TYPES (Phase 34)
// Engine: conversionChemistry.ts
// Measures: guest↔club↔sponsor compatibility
// ═══════════════════════════════════════════════════════════

/**
 * 5-dimensional chemistry measurement.
 * Each dimension scores 0-100.
 * Weighted average produces the overall ChemistryScore.
 */
export interface ChemistryDimensions {
  /** How well the club fits what the guest is looking for. */
  readonly guestClubFit: number;
  /** How compatible the sponsor is with the guest. */
  readonly guestSponsorFit: number;
  /** Alignment of club activities with guest interests. */
  readonly activityAlignment: number;
  /** How well the guest fits the club's social fabric. */
  readonly socialResonance: number;
  /** Whether this is the right moment in the guest's life for membership. */
  readonly temporalFit: number;
}

/**
 * Multi-dimensional compatibility score between guest, club, and sponsor.
 * Not a single number — a vector that reveals WHY chemistry exists or doesn't.
 *
 * @example
 * if (score.overall > 80 && score.dimensions.guestSponsorFit > 70) {
 *   proposeConversion(score.topSponsor);
 * }
 */
export interface ChemistryScore {
  readonly guestId: GuestId;
  /** Weighted average of all dimensions (0-100). */
  readonly overall: number;
  readonly dimensions: ChemistryDimensions;
  /** Best-matching sponsor for this guest, null if no candidates. */
  readonly topSponsor: SponsorMatch | null;
  /** Confidence in the score based on data completeness (0-100). */
  readonly confidence: number;
  readonly computedAt: string;
}

/**
 * Sponsor-guest compatibility match result.
 * Generated by the chemistry engine when matching sponsors to guests.
 */
export interface SponsorMatch {
  readonly memberId: MemberId;
  readonly memberName: string;
  /** Overall compatibility score (0-100). */
  readonly compatibility: number;
  /** Interests shared between guest and sponsor. */
  readonly sharedInterests: readonly string[];
  /** Schedule availability alignment (0-100). */
  readonly scheduleAlignment: number;
  /** Historical effectiveness as sponsor. Null if never sponsored. */
  readonly effectiveness: SponsorEffectiveness | null;
}

/** Track record of a member as guest sponsor. */
export interface SponsorEffectiveness {
  readonly totalGuestsSponsored: number;
  readonly conversions: number;
  /** Conversion rate (0-100). */
  readonly conversionRate: number;
  /** Average satisfaction score from sponsored guests (1-5). */
  readonly avgGuestSatisfaction: number;
}

/**
 * 5-axis first visit scoring.
 * The first 30 seconds of a visit determine 80% of conversion probability.
 * Score below 40 triggers real-time service recovery alert.
 */
export interface FirstImpressionAxes {
  /** How quickly the staff welcomed the guest (0-100). */
  readonly welcomeLatency: number;
  /** How well the assigned activity matched interests (0-100). */
  readonly activityMatch: number;
  /** How welcome the guest felt socially (0-100). */
  readonly socialTemperature: number;
  /** Physical environment comfort — temperature, noise, ambiance (0-100). */
  readonly environmentalComfort: number;
  /** Satisfaction at departure (0-100). */
  readonly departureSentiment: number;
}

/**
 * First impression analysis for a specific visit.
 * When overall < 40, alertRequired is true and an alert message
 * is generated for real-time staff intervention.
 */
export interface FirstImpressionAnalysis {
  readonly guestId: GuestId;
  readonly visitId: CheckInId;
  /** Weighted average of all axes (0-100). */
  readonly overall: number;
  readonly axes: FirstImpressionAxes;
  /** True when overall < 40 — triggers service recovery. */
  readonly alertRequired: boolean;
  /** Specific intervention message, null when no alert. */
  readonly alertMessage: string | null;
  readonly computedAt: string;
}

/** A single factor influencing conversion probability. */
export interface ConversionFactor {
  readonly factor: string;
  readonly impact: "positive" | "negative" | "neutral";
  /** Relative weight of this factor (0-1). */
  readonly weight: number;
  readonly description: string;
}

/**
 * Conversion probability prediction with explainability.
 * Not a black-box number — every prediction includes the factors
 * that contributed to it, with confidence intervals.
 */
export interface ConversionPrediction {
  readonly guestId: GuestId;
  /** Predicted conversion probability (0-100). */
  readonly probability: number;
  /** Confidence interval [low, high]. */
  readonly confidenceInterval: readonly [number, number];
  readonly keyFactors: readonly ConversionFactor[];
  readonly recommendedAction: string;
  /** Estimated lifetime value in ₡ colones. */
  readonly estimatedLTV: number;
  readonly computedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §8 — GUEST MEMORY TYPES (Phase 34)
// Engine: guestMemory.ts
// Builds: persistent knowledge graph per guest
//
// The club REMEMBERS everything: visits, conversations,
// preferences, reactions. If a guest returns after 8 months,
// the memory graph knows their favorite wine, that their son
// plays tennis, and that they don't like crowds.
// ═══════════════════════════════════════════════════════════

/** Types of interactions stored in guest memory. */
export type MemoryInteractionType =
  | "visit"
  | "event"
  | "dining"
  | "conversation"
  | "feedback"
  | "trial"
  | "communication";

/**
 * Single interaction node in the memory graph.
 * Each interaction is a fact the club knows about the guest.
 */
export interface MemoryNode {
  readonly interactionId: string;
  readonly type: MemoryInteractionType;
  /** ISO datetime of the interaction. */
  readonly timestamp: string;
  /** Sentiment score (-1 very negative to +1 very positive). */
  readonly sentiment: number;
  /** Topics discussed or experienced during this interaction. */
  readonly topics: readonly string[];
  /** Additional context (e.g., { "wine": "Malbec", "companion": "spouse" }). */
  readonly context: Readonly<Record<string, string>>;
  /** How important it is for staff to recall this (0-100). */
  readonly recallPriority: number;
}

/**
 * A promise or follow-up pending from a past interaction.
 * Staff should address these on the guest's next visit.
 */
export interface Callback {
  readonly id: string;
  readonly description: string;
  /** ISO date when it was promised. Null if open-ended. */
  readonly promisedDate: string | null;
  readonly status: "pending" | "fulfilled" | "overdue";
  readonly priority: "high" | "medium" | "low";
  readonly createdAt: string;
}

/** Single point in the emotional timeline. */
export interface EmotionalArcPoint {
  readonly date: string;
  /** Sentiment at this point (-1 to +1). */
  readonly sentiment: number;
  readonly event: string;
  readonly trigger: string;
}

/**
 * Temporal map of guest satisfaction over time.
 * Reveals peaks (great experiences), valleys (problems),
 * and the triggers that caused sentiment changes.
 */
export interface EmotionalArc {
  readonly points: readonly EmotionalArcPoint[];
  readonly trend: "improving" | "stable" | "declining";
  readonly peak: EmotionalArcPoint | null;
  readonly valley: EmotionalArcPoint | null;
  /** Current sentiment (-1 to +1). */
  readonly currentSentiment: number;
}

/**
 * Recurring interest pattern detected across interactions.
 * When a guest mentions tennis 3 times with positive sentiment,
 * the system flags it as a strong interest pattern.
 */
export interface TopicPattern {
  readonly topic: string;
  /** How many times this topic appeared. */
  readonly frequency: number;
  /** Average sentiment when this topic comes up (-1 to +1). */
  readonly avgSentiment: number;
  readonly lastMentioned: string;
  /** Which club domains this topic relates to. */
  readonly domains: readonly GuestInterestDomain[];
}

/**
 * Complete memory graph for a single guest.
 * The club's persistent, structured knowledge about this person.
 *
 * @example
 * const recall = recallContext(memoryGraph, currentVisit);
 * // "Welcome back, señor Rodríguez. Last time you mentioned
 * //  your son's tennis tournament — how did it go?"
 */
export interface MemoryGraph {
  readonly guestId: GuestId;
  readonly nodes: readonly MemoryNode[];
  /** How well the club knows this guest (0-100). */
  readonly strength: number;
  readonly callbacks: readonly Callback[];
  readonly emotionalArc: EmotionalArc;
  readonly topicPatterns: readonly TopicPattern[];
  readonly lastUpdated: string;
}

/**
 * Dormant guest detected by the memory engine.
 * A dormant guest is not "lost" — they're a seed waiting
 * for the right conditions to reactivate.
 */
export interface DormantGuest {
  readonly guestId: GuestId;
  readonly guestName: string;
  readonly daysSinceLastVisit: number;
  /** Probability of never returning (0-100). */
  readonly dormancyRisk: number;
  /** Probability that reactivation will succeed (0-100). */
  readonly reactivationProbability: number;
  /** ISO date — optimal moment to reach out. */
  readonly optimalTiming: string;
  /** Suggested reactivation approach description. */
  readonly approach: string;
  /** External signals suggesting good timing (e.g., "upcoming tennis tournament"). */
  readonly triggerSignals: readonly string[];
}

// ═══════════════════════════════════════════════════════════
// §9 — PIPELINE ECOSYSTEM TYPES (Phase 34)
// Engine: pipelineEcosystem.ts
// Wraps: ConversionFunnel (MCP) with flow analysis
//
// The pipeline is not a funnel. It's a living ecosystem.
// Guests enter, circulate, some thrive, some hibernate,
// some leave, some return. Model as ecosystem, not tube.
// ═══════════════════════════════════════════════════════════

/** A pipeline stage identifier. */
export type GuestPipelineStage =
  | "registered"
  | "first_visit"
  | "trial_active"
  | "ready"
  | "converted"
  | "dormant";

/** Pipeline stage enriched with flow and trend data. */
export interface EnrichedPipelineStage {
  readonly id: GuestPipelineStage;
  readonly label: string;
  readonly count: number;
  /** Conversion rate at this stage (0-100). */
  readonly rate: number;
  /** Benchmark conversion rate for this stage. */
  readonly benchmark: number;
  /** Difference from benchmark (positive = above target). */
  readonly vsBenchmark: number;
  /** Average days guests spend in this stage. */
  readonly avgDays: number;
  readonly color: string;
  readonly trend: "improving" | "stable" | "declining";
}

/** Movement between two pipeline stages. */
export interface StageFlow {
  readonly fromStage: GuestPipelineStage;
  readonly toStage: GuestPipelineStage;
  readonly count: number;
  /** Average days for this transition. */
  readonly velocity: number;
  readonly trend: "increasing" | "stable" | "decreasing";
}

/**
 * A bottleneck where guests get stuck.
 * Bottlenecks are the #1 priority for conversion improvement.
 */
export interface Bottleneck {
  readonly stageId: GuestPipelineStage;
  readonly stageLabel: string;
  readonly stuckCount: number;
  readonly avgDaysStuck: number;
  readonly severity: "critical" | "high" | "medium" | "low";
  /** Root cause analysis. */
  readonly cause: string;
}

/** A guest one step away from conversion who needs a nudge. */
export interface QuickWin {
  readonly guestId: GuestId;
  readonly guestName: string;
  readonly currentStage: GuestPipelineStage;
  /** Specific action needed to trigger conversion. */
  readonly actionNeeded: string;
  /** Expected probability increase from this action. */
  readonly estimatedImpact: number;
  readonly confidence: number;
}

/** Forecast data point for pipeline prediction. */
export interface PipelineForecast {
  readonly metric: string;
  readonly currentValue: number;
  readonly forecastValue: number;
  /** Percentage change forecast. */
  readonly changePct: number;
  /** Contributing factors. */
  readonly factors: readonly string[];
  readonly confidence: number;
}

/**
 * Pipeline as a living ecosystem — not a mechanical funnel.
 * Wraps the backend ConversionFunnel with:
 *   - Stage flow analysis (who's moving where)
 *   - Bottleneck detection (where guests get stuck)
 *   - Quick-win identification (one-step conversions)
 *   - Forecast overlay (what's coming)
 *   - Composite health score
 */
export interface PipelineEcosystem {
  readonly stages: readonly EnrichedPipelineStage[];
  readonly flows: readonly StageFlow[];
  readonly bottlenecks: readonly Bottleneck[];
  readonly quickWins: readonly QuickWin[];
  readonly forecasts: readonly PipelineForecast[];
  /** Composite pipeline health (0-100). */
  readonly health: number;
  /** Average days from first visit to conversion. */
  readonly velocity: number;
  readonly totalGuests: number;
  /** Estimated pipeline value in ₡ colones. */
  readonly pipelineValue: number;
  readonly computedAt: string;
}

// ═══════════════════════════════════════════════════════════
// §10 — TRIAL NARRATIVE TYPES (Phase 34)
// Engine: trialNarrative.ts
// Transforms: generic trial membership → personalized story
//
// The trial is not "30 days of access." It's a story
// the club co-writes with the guest.
// ═══════════════════════════════════════════════════════════

/** Status of an individual chapter in the trial narrative. */
export type TrialChapterStatus =
  | "pending"
  | "active"
  | "completed"
  | "skipped"
  | "failed";

/** A single chapter in the trial story. */
export interface TrialChapter {
  readonly day: number;
  readonly title: string;
  readonly activity: string;
  /** What this chapter is designed to evaluate about the guest. */
  readonly purpose: string;
  readonly expectedOutcome: string;
  /** Alternative if the guest doesn't enjoy this activity. */
  readonly fallback: string;
  readonly status: TrialChapterStatus;
  /** ISO datetime when completed. Null if not yet completed. */
  readonly completedAt: string | null;
  /** Guest feedback for this chapter (1-5). Null if not yet rated. */
  readonly feedbackScore: number | null;
}

/**
 * Personalized trial membership as a narrative journey.
 *
 * @example
 * const plan = designTrialExperience(guest, clubCapabilities, 30);
 * plan.chapters[0] = { day: 1, title: "Descubrir tu cancha", ... }
 * plan.chapters[1] = { day: 3, title: "Tennis trial con coach", ... }
 */
export interface TrialPlan {
  readonly guestId: GuestId;
  readonly trialId: TrialId;
  readonly chapters: readonly TrialChapter[];
  readonly totalDays: number;
  /** How personalized this plan is (0-100). */
  readonly personalizationScore: number;
  /** Rationale for why this plan was designed this way. */
  readonly designRationale: string;
  readonly createdAt: string;
}

/** Current progress through the trial narrative. */
export interface TrialProgress {
  readonly currentDay: number;
  readonly chaptersCompleted: number;
  readonly totalChapters: number;
  readonly engagementTrend: "improving" | "stable" | "declining";
  readonly onTrack: boolean;
  readonly riskFactors: readonly string[];
  readonly daysRemaining: number;
}

/** Health of the trial narrative — is the story unfolding well? */
export interface NarrativeHealth {
  /** Overall narrative health (0-100). */
  readonly score: number;
  readonly chaptersCompleted: number;
  readonly totalChapters: number;
  readonly engagementTrend: "improving" | "stable" | "declining";
  readonly recommendation: string;
}

/** Post-trial analysis summary. */
export interface TrialSummary {
  readonly guestId: GuestId;
  readonly trialId: TrialId;
  readonly outcome: "converted" | "expired" | "cancelled";
  readonly chaptersCompleted: number;
  readonly totalChapters: number;
  readonly highlights: readonly string[];
  readonly conversionFactors: readonly string[];
  readonly recommendation: string;
  readonly feedbackScore: number | null;
}

/**
 * Backend proposal enriched with engine intelligence.
 * The backend generates generic proposals.
 * This engine enriches them with chemistry, memory, and narrative context.
 */
export interface EnrichedProposal {
  /** Original proposal type from MCP (e.g., "trial_invitation"). */
  readonly proposalType: string;
  readonly title: string;
  readonly description: string;
  readonly priority: "high" | "medium" | "low";
  /** Chemistry context if relevant to this proposal. */
  readonly chemistryContext: ChemistryScore | null;
  /** Relevant callbacks from guest memory. */
  readonly relevantCallbacks: readonly Callback[];
  /** Topics that align with this proposal. */
  readonly topicAlignment: readonly TopicPattern[];
  /** Suggested sponsor if applicable. */
  readonly sponsorSuggestion: SponsorMatch | null;
  /** Narrative chapter context if part of a trial plan. */
  readonly narrativeChapter: {
    readonly title: string;
    readonly purpose: string;
    readonly trialDay: number;
  } | null;
  /** How much enrichment was added to the original proposal (0-100). */
  readonly enrichmentScore: number;
}

// ═══════════════════════════════════════════════════════════
// §11 — SIGNAL CONTRACTS
// Type-safe cross-domain communication.
// These signal names will be added to SIGNAL_NAMES registry.
// ═══════════════════════════════════════════════════════════

/** Signals that the guest module emits to other domains. */
export type GuestEmitSignal =
  | "guest_pipeline_alert"
  | "gst_vip_detected"
  | "gst_conversion_ready"
  | "gst_trial_expiring"
  | "gst_dormant_detected"
  | "gst_feedback_negative"
  | "gst_first_impression_alert";

/** Signals that the guest module can receive from other domains. */
export type GuestConsumeSignal =
  | "mbr_member_referral"
  | "fin_spending_detected"
  | "sat_critical_decline"
  | "rec_pending_actions"
  | "evt_low_engagement";

/** All guest-related signals (emit + consume). */
export type GuestSignal = GuestEmitSignal | GuestConsumeSignal;

// ═══════════════════════════════════════════════════════════
// §12 — DASHBOARD STATE
// Derived from HealthScoreResult + AdvisorResult.
// Not a separate system — pure derivation of existing data.
// ═══════════════════════════════════════════════════════════

/**
 * Dashboard operational mode.
 * Derived from health score level + active insight severity.
 * Controls visual treatment: accent color, glow, pulse rate, spacing.
 *
 * Transitions defined in DASHBOARD_TRANSITIONS (§3).
 */
export type GuestDashboardMode =
  | "calm"
  | "alert"
  | "critical"
  | "celebration";

/**
 * Contextual stage auto-selected based on the most urgent insight layer.
 * The dashboard shows the most relevant view by default.
 * Users can override, but the default is intelligent.
 */
export type GuestContextualStage =
  | "overview"
  | "journey"
  | "optimization"
  | "intelligence";

/**
 * Aggregated intelligence summary for the dashboard header.
 * Pre-computed by useGuestDashboard for instant rendering.
 */
export interface GuestIntelligenceSummary {
  readonly totalInsights: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly topInsight: { readonly title: string; readonly severity: string } | null;
  /** Pipeline health score (0-100). */
  readonly pipelineHealth: number;
  readonly quickWinCount: number;
  readonly vipCount: number;
  readonly dormantCount: number;
}

// ═══════════════════════════════════════════════════════════
// §13 — MCP INTEGRATION CONTRACTS
// Data flow between MCP layer, engine layer, and UI layer.
// ═══════════════════════════════════════════════════════════

/** All guest engine identifiers. */
export type EngineName =
  | "guestIntelligence"
  | "conversionChemistry"
  | "guestMemory"
  | "pipelineEcosystem"
  | "trialNarrative";

/**
 * Combined output from all 5 guest engines.
 * Each engine writes to its designated fields.
 * useGuestDashboard aggregates all outputs after execution.
 */
export interface GuestEngineOutputs {
  // ── guestIntelligence ──
  readonly profiles: readonly GuestProfile[];
  readonly topVipGuests: readonly GuestProfile[];
  // ── conversionChemistry ──
  readonly chemistryScores: readonly ChemistryScore[];
  readonly firstImpressions: readonly FirstImpressionAnalysis[];
  // ── guestMemory ──
  readonly memoryGraphs: readonly MemoryGraph[];
  readonly dormantGuests: readonly DormantGuest[];
  // ── pipelineEcosystem ──
  readonly pipeline: PipelineEcosystem | null;
  readonly quickWins: readonly QuickWin[];
  // ── trialNarrative ──
  readonly enrichedProposals: readonly EnrichedProposal[];
  readonly trialPlans: readonly TrialPlan[];
}

/**
 * Complete enriched data structure returned by useGuestDashboard.
 * Single source of truth for ALL guest dashboard components.
 *
 * Components should destructure from this object, not make
 * their own data calls. This ensures:
 *   1. Single render cycle (no waterfall)
 *   2. Consistent state across all components
 *   3. Engine outputs available to all siblings
 */
export interface GuestEnrichedData {
  // ── MCP Raw Data ──
  readonly healthScore: GuestHealthScore | null;
  readonly funnel: ConversionFunnel | null;
  readonly analytics: GuestAnalyticsEnhanced | null;
  readonly forecast: GuestDemandForecast | null;
  readonly proposals: GuestEngagementProposalList | null;

  // ── Engine Outputs ──
  readonly engines: GuestEngineOutputs | null;

  // ── Derived Dashboard State ──
  readonly dashboardMode: GuestDashboardMode;
  readonly contextualStage: GuestContextualStage;
  readonly intelligenceSummary: GuestIntelligenceSummary | null;

  // ── Advisor Layer ──
  readonly insights: readonly BaseInsight[];
  readonly healthScoreResult: HealthScoreResult | null;
  readonly signals: readonly DomainSignal[];
}

// ═══════════════════════════════════════════════════════════
// §14 — THEME & ACCESSIBILITY CONTRACTS
// Semantic tokens that CSS must implement.
// Ensures every visual config has an accessible alternative.
// ═══════════════════════════════════════════════════════════

/**
 * Theme token contract for the guest module.
 * CSS custom properties MUST implement these tokens.
 * Components reference tokens, not raw color values.
 */
export interface GuestThemeTokens {
  readonly accent: {
    readonly calm: string;
    readonly alert: string;
    readonly critical: string;
    readonly celebration: string;
  };
  readonly glow: Record<GuestDashboardMode, string>;
  readonly surface: {
    readonly primary: string;
    readonly elevated: string;
    readonly glass: string;
  };
  readonly text: {
    readonly primary: string;
    readonly muted: string;
    readonly inverse: string;
  };
}

/**
 * Accessibility descriptor for visual config entries.
 * Every config map entry that renders visually MUST have
 * an ariaLabel for screen readers.
 */
export interface AccessibleConfigEntry {
  /** Visual label (Spanish). */
  readonly label: string;
  /** i18n message key for label. */
  readonly labelKey: string;
  /** CSS color token. */
  readonly color: string;
  /** CSS background color token with alpha. */
  readonly bgColor: string;
  /** Screen reader announcement. */
  readonly ariaLabel: string;
}

/**
 * Motion configuration for dashboard animations.
 * Respects prefers-reduced-motion.
 */
export interface GuestMotionConfig {
  /** Entrance stagger delay between elements (ms). */
  readonly staggerMs: number;
  /** Base animation duration (ms). */
  readonly durationMs: number;
  /** CSS easing function. */
  readonly easing: string;
  /** Whether reduced motion is active. */
  readonly reducedMotion: boolean;
}

// ═══════════════════════════════════════════════════════════
// §15 — BACKWARD COMPATIBILITY RE-EXPORTS
// Config maps moved to constants.ts.
// Re-exported here so existing imports don't break.
// ═══════════════════════════════════════════════════════════

export {
  RELATIONSHIP_OPTIONS,
  GUEST_PURPOSE_OPTIONS,
  GUEST_STATUS_CONFIG,
  TRIAL_STATUS_CONFIG,
  TRIAL_TYPE_OPTIONS,
  GUEST_REGISTRY_STATUS_CONFIG,
  PRIVATE_EVENT_TYPE_CONFIG,
  PRIVATE_EVENT_STATUS_CONFIG,
  TRIAL_TYPE_CONFIG,
  TRIAL_STATUS_CONFIG_BACKEND,
  PRIVILEGE_CONFIG,
  GUEST_INSIGHT_CATEGORY_CONFIG,
  GUEST_INSIGHT_PRIORITY_CONFIG,
  EVENT_PIPELINE_STEPS,
} from "./constants";