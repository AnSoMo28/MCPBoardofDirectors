// src/shared/lib/analytics.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Lightweight Analytics
// Fase 24 — Client-side event tracking
//
// localStorage-based tracking for AI tool engagement.
// Prepared for future backend endpoint (F26+).
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "ccc_analytics_events";
const MAX_EVENTS = 200;

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  timestamp: number;
  role?: string;
}

function getStoredEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  try {
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full — silently ignore
  }
}

/**
 * Track an analytics event.
 * Stores in localStorage. Prepared for backend POST in future.
 *
 * @example
 * trackEvent("board_brief", "pdf_exported")
 * trackEvent("advisor_narrative", "expanded", "revenue_concentration_001")
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
): void {
  const event: AnalyticsEvent = {
    category,
    action,
    label,
    timestamp: Date.now(),
  };

  const events = getStoredEvents();
  events.push(event);
  saveEvents(events);
}

/**
 * Get stored analytics events.
 * Useful for debugging and future dashboard.
 */
export function getAnalyticsEvents(): AnalyticsEvent[] {
  return getStoredEvents();
}

/**
 * Get event counts grouped by category.
 */
export function getAnalyticsSummary(): Record<string, number> {
  const events = getStoredEvents();
  const counts: Record<string, number> = {};
  for (const event of events) {
    const key = `${event.category}:${event.action}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Clear all stored analytics events.
 */
export function clearAnalytics(): void {
  localStorage.removeItem(STORAGE_KEY);
}
