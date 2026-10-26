// ═══════════════════════════════════════════════════════════
// src/features/guests/schemas.ts
// Phase 34 "The Gateway" — Zod Runtime Validation Schemas
// Level 6+ Agency · Production Boundary Safety
//
// Every piece of external data (MCP, API, form input) is
// validated at the boundary BEFORE it enters the engine layer.
// Silent data corruption is the #1 production killer.
//
// §0  Imports
// §1  Utility Schemas
// §2  Entity Schemas (Phase 30a)
// §3  Form Input Schemas
// §4  MCP Response Envelope Schemas
// §5  Engine Output Schemas
// §6  Schema-First Type Inference
//
// Checklist: M2.5 (Zod schemas for external data)
// ═══════════════════════════════════════════════════════════

import { z } from "zod";

// ═══════════════════════════════════════════════════════════
// §1 — UTILITY SCHEMAS
// Reusable base schemas for common patterns.
// ═══════════════════════════════════════════════════════════

/** ISO datetime string (e.g., "2024-03-15T10:30:00Z"). */
const IsoDatetime = z.string().datetime();

/** ISO date string (e.g., "2024-03-15"). */
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Nullable ISO date. */
const NullableIsoDate = IsoDate.nullable();

/** Non-empty string. */
const NonEmptyString = z.string().min(1);

/** Positive integer. */
const PositiveInt = z.number().int().min(0);

/** Score in range 0-100. */
const Score0to100 = z.number().min(0).max(100);

z.number().min(-1).max(1);

/** Colones currency amount (non-negative). */
const Colones = z.number().min(0);

/**
 * MCP response envelope factory.
 * All MCP tools return { status, message, [dataKey]: data }.
 */
function mcpEnvelope<T extends z.ZodRawShape>(dataShape: T) {
  return z.object({
    status: z.string(),
    message: z.string(),
    ...dataShape,
  });
}

// ═══════════════════════════════════════════════════════════
// §2 — ENTITY SCHEMAS
// Runtime validation for backend entities.
// Used at MCP boundary to catch shape mismatches immediately.
// ═══════════════════════════════════════════════════════════

/** Guest entity — validated at MCP boundary. */
export const GuestSchema = z.object({
  id: z.string().min(1),
  first_name: NonEmptyString.max(100),
  last_name: NonEmptyString.max(100),
  id_number: NonEmptyString.max(30),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  photo_url: z.string().url().optional(),
  relationship: NonEmptyString,
  relationship_label: NonEmptyString,
  host_family_id: z.string().min(1),
  host_family_name: NonEmptyString,
  host_member_name: NonEmptyString,
  visits_count: PositiveInt,
  last_visit_date: NullableIsoDate,
  is_blacklisted: z.boolean(),
  blacklist_reason: z.string().optional(),
  notes: z.string().optional(),
  created_at: IsoDatetime,
});

/** GuestCheckIn entity. */
export const GuestCheckInSchema = z.object({
  id: z.string().min(1),
  guest_id: z.string().min(1),
  guest_name: NonEmptyString,
  guest_photo_url: z.string().url().optional(),
  host_family_id: z.string().min(1),
  host_family_name: NonEmptyString,
  host_member_name: NonEmptyString,
  facility_id: z.string().min(1),
  facility_name: NonEmptyString,
  check_in_time: IsoDatetime,
  check_out_time: IsoDatetime.nullable(),
  status: z.enum(["active", "departed", "no_show"]),
  purpose: NonEmptyString,
  purpose_label: NonEmptyString,
  notes: z.string().optional(),
  approved_by: z.string().min(1),
  approved_by_name: NonEmptyString,
});

/** TrialMembership entity. */
export const TrialMembershipSchema = z.object({
  id: z.string().min(1),
  guest_id: z.string().min(1),
  guest_name: NonEmptyString,
  guest_email: z.string().email(),
  guest_phone: NonEmptyString,
  host_family_id: z.string().min(1),
  host_family_name: NonEmptyString,
  start_date: IsoDate,
  end_date: IsoDate,
  status: z.enum(["active", "expired", "converted", "cancelled"]),
  trial_type: z.enum(["week", "two_weeks", "month"]),
  trial_type_label: NonEmptyString,
  facilities_access: z.array(z.string()),
  activities_attended: PositiveInt,
  feedback_score: z.number().min(1).max(5).nullable(),
  conversion_probability: Score0to100.nullable(),
  notes: z.string().optional(),
  created_at: IsoDatetime,
});

// ═══════════════════════════════════════════════════════════
// §3 — FORM INPUT SCHEMAS
// User-facing form validation.
// Stricter than entity schemas (e.g., phone format, email required).
// ═══════════════════════════════════════════════════════════

/** Guest check-in form validation. */
export const GuestCheckInFormSchema = z.object({
  first_name: NonEmptyString.max(100),
  last_name: NonEmptyString.max(100),
  id_number: NonEmptyString.max(30),
  phone: z
    .string()
    .regex(/^\+?\d{8,15}$/, "Número de teléfono inválido"),
  email: z.string().email("Email inválido").optional(),
  relationship: z.enum([
    "family",
    "friend",
    "colleague",
    "business",
    "other",
  ]),
  host_family_id: NonEmptyString,
  facility_id: NonEmptyString,
  purpose: z.enum([
    "social",
    "dining",
    "sports",
    "pool",
    "event",
    "meeting",
    "tour",
    "other",
  ]),
  notes: z.string().max(500).optional(),
});

/** Trial membership form validation. */
export const TrialFormSchema = z.object({
  guest_id: NonEmptyString,
  host_family_id: NonEmptyString,
  trial_type: z.enum(["week", "two_weeks", "month"]),
  facilities_access: z.array(z.string()).min(1, "Seleccionar al menos 1"),
  notes: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════════════════════
// §4 — MCP RESPONSE SCHEMAS
// Validates data coming from backend MCP tools.
// If the backend changes its response shape, this catches
// it at the boundary with a clear error, not a silent crash.
//
// Schema structure inferred from buildGuestCtx() field access.
// ═══════════════════════════════════════════════════════════

/** Health score response from get_guest_health_score MCP tool. */
export const HealthScoreMCPResponseSchema = mcpEnvelope({
  health_score: z
    .object({
      overall_score: Score0to100,
      grade: z.enum(["A", "B", "C", "D"]),
    })
    .passthrough(),
});

/**
 * Conversion funnel response from get_conversion_funnel MCP tool.
 *
 * Fields validated based on buildGuestCtx() usage:
 *   funnel.stages, funnel.overall_conversion_pct,
 *   funnel.overall_benchmark_pct, funnel.total_guests,
 *   funnel.total_converted, funnel.pipeline_value
 */
export const FunnelStageSchema = z.object({
  stage: NonEmptyString,
  label: NonEmptyString,
  count: PositiveInt,
  rate_pct: z.number().min(0).max(100),
  vs_benchmark: z.number(),
});

export const FunnelMCPResponseSchema = mcpEnvelope({
  funnel: z
    .object({
      stages: z.array(FunnelStageSchema),
      overall_conversion_pct: z.number().min(0).max(100),
      overall_benchmark_pct: z.number().min(0).max(100),
      total_guests: PositiveInt,
      total_converted: PositiveInt,
      pipeline_value: Colones,
    })
    .passthrough(),
});

/**
 * Analytics response from get_guest_analytics_enhanced MCP tool.
 *
 * Fields validated based on buildGuestCtx() usage:
 *   analytics.peak_visit_days, analytics.event_guest_correlation,
 *   analytics.total_guests, analytics.active_guests, etc.
 */
export const PeakDaySchema = z.object({
  day: NonEmptyString,
  visit_count: PositiveInt,
});

export const EventCorrelationSchema = z.object({
  event_type: NonEmptyString,
  avg_guests_generated: z.number().min(0),
});

export const PrivilegeUsageSchema = z.object({
  privilege_type: NonEmptyString,
  usage_count: PositiveInt,
});

export const AnalyticsMCPResponseSchema = mcpEnvelope({
  analytics: z
    .object({
      total_guests: PositiveInt,
      active_guests: PositiveInt,
      active_trials: PositiveInt,
      total_private_events: PositiveInt,
      upcoming_events: PositiveInt,
      trial_to_member_rate: z.number().min(0).max(100),
      peak_visit_days: z.array(PeakDaySchema),
      event_guest_correlation: z.array(EventCorrelationSchema),
      privilege_usage: z.array(PrivilegeUsageSchema),
    })
    .passthrough(),
});

/**
 * Forecast response from get_guest_forecast MCP tool.
 *
 * Fields validated based on buildGuestCtx() usage:
 *   forecast.forecasts[{metric, change_pct, factors}],
 *   forecast.seasonal_multiplier, forecast.peak_months
 */
export const ForecastItemSchema = z.object({
  metric: NonEmptyString,
  change_pct: z.number(),
  factors: z.array(z.string()),
});

export const ForecastMCPResponseSchema = mcpEnvelope({
  forecast: z
    .object({
      forecasts: z.array(ForecastItemSchema),
      seasonal_multiplier: z.number().positive(),
      peak_months: z.array(z.string()),
    })
    .passthrough(),
});

/**
 * Proposals response from generate_guest_engagement_proposals MCP tool.
 *
 * Fields validated based on buildGuestCtx() + useGuestAdvisor usage:
 *   proposals.proposals[{proposal_type}], proposals.high_priority_count,
 *   proposals.cross_domain_count
 */
export const ProposalItemSchema = z.object({
  proposal_type: NonEmptyString,
  title: NonEmptyString.optional(),
  description: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export const ProposalsMCPResponseSchema = mcpEnvelope({
  proposals: z
    .object({
      proposals: z.array(ProposalItemSchema),
      high_priority_count: PositiveInt,
      cross_domain_count: PositiveInt,
    })
    .passthrough(),
});

// ═══════════════════════════════════════════════════════════
// §5 — ENGINE OUTPUT VALIDATION
// Validates engine outputs before they enter the advisor layer.
// Catches engine bugs at the output boundary.
// ═══════════════════════════════════════════════════════════

/** Validates a GuestProfile produced by guestIntelligence engine. */
export const GuestProfileSchema = z.object({
  raw: GuestSchema,
  segment: z.enum([
    "vip",
    "high_potential",
    "active_trial",
    "warm",
    "cold",
    "dormant",
    "converted",
  ]),
  temperature: z.object({
    value: Score0to100,
    label: z.enum(["blazing", "hot", "warm", "cool", "cold", "frozen"]),
    color: NonEmptyString,
  }),
  visitPattern: z.enum([
    "regular",
    "exploratory",
    "sporadic",
    "first_time",
    "returning",
    "escalating",
  ]),
  interestMap: z.array(
    z.object({
      domain: z.enum([
        "sports",
        "dining",
        "wellness",
        "cultural",
        "social",
        "pool",
        "events",
      ]),
      score: Score0to100,
      activities: z.array(z.string()),
    }),
  ),
  vipScore: Score0to100,
  daysSinceLastVisit: PositiveInt,
  narrative: z.string(),
  computedAt: IsoDatetime,
});

/** Validates a ChemistryScore produced by conversionChemistry engine. */
export const ChemistryScoreSchema = z.object({
  guestId: z.string().min(1),
  overall: Score0to100,
  dimensions: z.object({
    guestClubFit: Score0to100,
    guestSponsorFit: Score0to100,
    activityAlignment: Score0to100,
    socialResonance: Score0to100,
    temporalFit: Score0to100,
  }),
  topSponsor: z
    .object({
      memberId: z.string().min(1),
      memberName: NonEmptyString,
      compatibility: Score0to100,
      sharedInterests: z.array(z.string()),
      scheduleAlignment: Score0to100,
      effectiveness: z
        .object({
          totalGuestsSponsored: PositiveInt,
          conversions: PositiveInt,
          conversionRate: z.number().min(0).max(100),
          avgGuestSatisfaction: z.number().min(1).max(5),
        })
        .nullable(),
    })
    .nullable(),
  confidence: Score0to100,
  computedAt: IsoDatetime,
});

// ═══════════════════════════════════════════════════════════
// §6 — SCHEMA-FIRST TYPE INFERENCE
// Derive TypeScript types from Zod schemas.
// This ensures types and runtime validators NEVER diverge.
//
// Usage:
//   import type { GuestValidated } from "./schemas";
//   const guest: GuestValidated = GuestSchema.parse(rawData);
// ═══════════════════════════════════════════════════════════

/** Validated Guest entity (runtime-verified). */
export type GuestValidated = z.infer<typeof GuestSchema>;

/** Validated GuestCheckIn entity (runtime-verified). */
export type GuestCheckInValidated = z.infer<typeof GuestCheckInSchema>;

/** Validated TrialMembership entity (runtime-verified). */
export type TrialMembershipValidated = z.infer<typeof TrialMembershipSchema>;

/** Validated GuestProfile engine output (runtime-verified). */
export type GuestProfileValidated = z.infer<typeof GuestProfileSchema>;

/** Validated ChemistryScore engine output (runtime-verified). */
export type ChemistryScoreValidated = z.infer<typeof ChemistryScoreSchema>;

// ═══════════════════════════════════════════════════════════
// BOUNDARY VALIDATION HELPERS
// Use these at MCP boundary to validate with graceful degradation.
// ═══════════════════════════════════════════════════════════

/**
 * Validate MCP response data with graceful fallback.
 * Returns parsed data on success, null on validation failure.
 * Logs validation errors for diagnostics.
 *
 * @example
 * const healthScore = validateMCPResponse(
 *   HealthScoreMCPResponseSchema,
 *   rawMcpData,
 *   "get_guest_health_score"
 * );
 * // healthScore is typed and validated, or null
 */
export function validateMCPResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
  toolName: string,
): z.infer<T> | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn(
    `[Guest] MCP validation failed for ${toolName}:`,
    result.error.issues,
  );
  return null;
}