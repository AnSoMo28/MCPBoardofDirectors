// src/features/events/config.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Configuration
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/types/domain-enums, ../types
//
// Centralized configuration for the Events domain.
// Single source of truth for: MCP agent/tools, routes,
// query defaults, feature metadata, and domain constants.
//
// Architecture:
//   config.ts is consumed by hooks, pages, and components.
//   It does NOT import from hooks (prevents circular deps).
//   It imports only from types.ts and shared/.
//
// MCP Tools Used (aggregated from all hooks):
//   event_get_calendar     — useEventData, useEventCalendar
//   get_event              — useEventDetail, useEventForm
//   event_create           — useEventForm, useEventCalendar
//   update_event           — useEventForm
//   update_event_status    — useEventDetail
//   event_manage_capacity  — useEventCalendar (advisor action)
//   event_clone_template   — useEventDetail, useEventCalendar
//   event_generate_report  — useEventDetail
//
// ANTI-PATTERNS REMOVED:
// [x] No config file existed → created from scratch
// [x] All config objects: readonly fields + as const
// [x] Magic strings (MCP tools, routes) → named constants
// [x] Default staleTime scattered across hooks → centralized
// [x] Missing § section markers → §0-§4
// [x] Missing file header → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import type { EventCategory, EventStatus } from "@/shared/types/domain-enums";
import type {
  EventAccessType,
  EventPricingModel,
  RecurrencePattern,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §1 MCP CONFIGURATION
//
// Agent name, tool names, and query defaults.
// Consumed by useMCPQuery and useMCPMutation calls.
// ═══════════════════════════════════════════════════════════

/** MCP agent name for the Events domain. */
export const EVENTS_MCP_AGENT = "events" as const;

/** MCP tool names used by the Events domain. */
export const EVENTS_MCP_TOOLS = {
  getCalendar: "event_get_calendar",
  getEvent: "get_event",
  createEvent: "event_create",
  updateEvent: "update_event",
  updateStatus: "update_event_status",
  manageCapacity: "event_manage_capacity",
  cloneTemplate: "event_clone_template",
  generateReport: "event_generate_report",
} as const;

/** React Query defaults for event data fetching. */
export const EVENTS_QUERY_DEFAULTS = {
  /** Calendar data: 1 minute stale time */
  staleTime: 60_000,

  /** Calendar data: no garbage collection (keep cached) */
  gcTime: 5 * 60_000,

  /** Don't refetch on window focus (calendar is heavy) */
  refetchOnWindowFocus: false,

  /** Retry once on failure */
  retry: 1,
} as const;

// ═══════════════════════════════════════════════════════════
// §2 ROUTES
//
// All routes for the Events domain.
// Single source of truth — pages and navigation use these.
// ═══════════════════════════════════════════════════════════

export const EVENT_ROUTES = {
  list: "/admin/events",
  detail: (id: string) => `/admin/events/${id}`,
  create: "/admin/events/new",
  edit: (id: string) => `/admin/events/${id}/edit`,
} as const;

// ═══════════════════════════════════════════════════════════
// §3 DOMAIN CONSTANTS
//
// Feature-level constants used across hooks and components.
// ═══════════════════════════════════════════════════════════

/** Maximum tags per event */
export const MAX_TAGS = 10;

/** Maximum program items per event */
export const MAX_PROGRAM_ITEMS = 20;

/** Default page size for event list */
export const DEFAULT_PAGE_SIZE = 20;

/** Calendar grid always renders 6 rows × 7 days */
export const CALENDAR_GRID_CELLS = 42;

/** Minimum days of lead time for large events (100+ capacity) */
export const LARGE_EVENT_LEAD_DAYS = 14;

/** Capacity threshold for "large" events */
export const LARGE_EVENT_CAPACITY = 100;

/** Occupancy threshold for capacity risk alerts (0-1) */
export const CAPACITY_RISK_THRESHOLD = 0.85;

/** Minimum attendance rate for monetization opportunity */
export const MONETIZATION_MIN_ATTENDANCE = 15;

/** Default event form capacity */
export const DEFAULT_CAPACITY = 50;

/** Venue operating hours */
export const VENUE_OPEN_HOUR = "08:00";
export const VENUE_CLOSE_HOUR = "22:00";

/**
 * Default form values for new events.
 * Imported by useEventForm for EMPTY_FORM.
 */
export const DEFAULT_EVENT_VALUES = {
  capacity: DEFAULT_CAPACITY,
  pricingModel: "free" as EventPricingModel,
  pricePerPerson: 0,
  accessType: "open" as EventAccessType,
  recurrence: "none" as RecurrencePattern,
  requiresRsvp: true,
  isMembersOnly: true,
  allowGuests: false,
  maxGuestsPerFamily: 0,
} as const;

// ═══════════════════════════════════════════════════════════
// §4 FEATURE METADATA
//
// Feature identification for shared/ systems.
// Used by: sidebar, router, permission checks, analytics.
// ═══════════════════════════════════════════════════════════

export const EVENTS_FEATURE = {
  id: "events",
  domain: "events" as const,
  name: "Eventos",
  description: "Gestión de eventos, calendario, RSVPs y proveedores",
  icon: "calendar",
  routes: EVENT_ROUTES,
  mcpAgent: EVENTS_MCP_AGENT,
} as const;

/**
 * Supported event categories for filtering.
 * Subset of EventCategory — only categories that have events.
 * Used by filter dropdowns.
 */
export const SUPPORTED_CATEGORIES: readonly EventCategory[] = [
  "sports",
  "cultural",
  "social",
  "private",
  "festive",
  "children",
  "family",
  "corporate",
] as const;

/**
 * Supported event statuses for filtering.
 * Used by status filter dropdowns and status badge rendering.
 */
export const SUPPORTED_STATUSES: readonly EventStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "in_progress",
  "completed",
  "cancelled",
] as const;