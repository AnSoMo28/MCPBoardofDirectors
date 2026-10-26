// src/features/events/index.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Public API
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     All events sub-modules
//
// Single import point for all Events domain functionality.
//
// QUICK START — What most consumers need:
//
//   import {
//     useEventData,
//     useEventCalendar,
//     useEventDetail,
//     useEventForm,
//     EVENT_ROUTES,
//     EVENTS_MCP_AGENT,
//   } from "@/features/events";
//
// ADVANCED — Domain intelligence:
//
//   import {
//     getDayIntelligence,
//     getDensityLevel,
//     findConflicts,
//   } from "@/features/events";
//
// ANTI-PATTERNS REMOVED:
// [x] No barrel existed → created with organized sections
// [x] All type-only exports use `export type`
// [x] § section markers → §0-§5
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §1 TYPES
//
// Domain types, enums, interfaces, and config maps.
// ═══════════════════════════════════════════════════════════

export type {
  // Domain enums
  EventAccessType,
  RecurrencePattern,
  EventPricingModel,
  VendorContractStatus,
  // Sub-models
  ProgramItem,
  RsvpRecord,
  VendorRecord,
  // Response types
  EventResponse,
  EventBrief,
  EventListResponse,
  CalendarDay,
  CalendarMonth,
  EventFilters,
  // Analytics
  CapacityInfo,
  EventAnalytics,
  EventReport,
  // AI Intelligence
  AttendancePrediction,
  RecommendationItem,
  OptimizationRecommendations,
  ConflictItem,
  ConflictAnalysis,
  StrategyItem,
  EngagementBoostStrategy,
  // Advisor
  EventAdvisorLayer,
  EventAdvisorInsight,
} from "./types";

// Config maps (const objects)
export {
  EVENT_CATEGORY_CONFIG,
  EVENT_STATUS_CONFIG,
  RSVP_STATUS_CONFIG,
  PRICING_MODEL_CONFIG,
  RECURRENCE_CONFIG,
  VENDOR_STATUS_CONFIG,
  ACCESS_TYPE_CONFIG,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §2 CONFIGURATION
//
// MCP config, routes, constants, feature metadata.
// ═══════════════════════════════════════════════════════════

export {
  EVENTS_MCP_AGENT,
  EVENTS_MCP_TOOLS,
  EVENTS_QUERY_DEFAULTS,
  EVENT_ROUTES,
  EVENTS_FEATURE,
  SUPPORTED_CATEGORIES,
  SUPPORTED_STATUSES,
  DEFAULT_CAPACITY,
  DEFAULT_EVENT_VALUES,
  MAX_TAGS,
  MAX_PROGRAM_ITEMS,
  DEFAULT_PAGE_SIZE,
  CALENDAR_GRID_CELLS,
  LARGE_EVENT_LEAD_DAYS,
  LARGE_EVENT_CAPACITY,
  CAPACITY_RISK_THRESHOLD,
  MONETIZATION_MIN_ATTENDANCE,
  VENUE_OPEN_HOUR,
  VENUE_CLOSE_HOUR,
} from "./config";

// ═══════════════════════════════════════════════════════════
// §3 HOOKS
//
// Data, advisor, calendar, detail, and form hooks.
// ═══════════════════════════════════════════════════════════

export { useEventAdvisor } from "./hooks/useEventAdvisor";

export { useEventData } from "./hooks/useEventData";
export type {
  UseEventDataOptions,
  UseEventDataReturn,
} from "./hooks/useEventData";

export { useEventCalendar } from "./hooks/useEventCalendar";
export type {
  CalendarGridDay,
  QuickAddData,
  UseEventCalendarOptions,
} from "./hooks/useEventCalendar";

export { useEventDetail } from "./hooks/useEventDetail";
export type { DetailTab } from "./hooks/useEventDetail";
export { TAB_ORDER } from "./hooks/useEventDetail";

export { useEventForm } from "./hooks/useEventForm";
export type {
  WizardStep,
  EventFormData,
} from "./hooks/useEventForm";
export { STEPS, EMPTY_FORM } from "./hooks/useEventForm";

// ═══════════════════════════════════════════════════════════
// §4 CALENDAR INTELLIGENCE
//
// Pure utility functions for calendar enrichment.
// No hooks, no React, no side effects.
// ═══════════════════════════════════════════════════════════

export type {
  DensityLevel,
  LoadAssessment,
  VenueSlot,
  AvailableSlot,
  ConflictPair,
  DayIntelligence,
} from "./lib/calendarSignals";

export {
  extractTime,
  getDensityLevel,
  getDensityCssClass,
  getDensityColor,
  getLoadAssessment,
  getVenueDistribution,
  findAvailableSlots,
  findConflicts,
  getDayIntelligence,
  formatSlotDuration,
} from "./lib/calendarSignals";

// ═══════════════════════════════════════════════════════════
// §5 PAGES (lazy-loaded)
//
// TODO: Add lazy imports when pages are migrated.
// Pattern:
//   export const EventCalendarPage = lazy(() => import("./EventCalendar"));
//   export const EventDetailPage = lazy(() => import("./EventDetail"));
//   export const EventFormPage = lazy(() => import("./EventForm"));
//
// Deferred until page rewrite is complete.
// ═══════════════════════════════════════════════════════════