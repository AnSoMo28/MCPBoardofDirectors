// src/shared/lib/advisor-engine/learning-profile.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Manager Learning Profile (F57-B8)
//
// Tracks how each manager uses the Command Interface.
// Stores in localStorage. Enables personalized suggestions
// based on usage patterns.
//
// What we track:
//   - Command types (query, analysis, simulation, etc.)
//   - Domains accessed (financial, events, engagement, etc.)
//   - Metrics queried (churn, revenue, satisfaction, etc.)
//   - Session depth (turns per session)
//
// Storage key: "ccc_learning_profile"
// Max entries: 500 (pruned FIFO)
//
// Rules: #9 defensive data
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";

// ── Types ──────────────────────────────────────────────────

export interface LearningProfile {
  totalCommands: number;
  commandsByType: Record<string, number>;
  commandsByDomain: Record<string, number>;
  metricFrequency: Record<string, number>;
  sessions: number;
  avgSessionDepth: number;
  lastActiveAt: number;
  createdAt: number;
}

interface LearningEntry {
  type: string;
  domain: string;
  metrics: string[];
  timestamp: number;
  sessionId: string;
}

// ── Constants ──────────────────────────────────────────────

const STORAGE_KEY = "ccc_learning_profile";
const ENTRIES_KEY = "ccc_learning_entries";
const MAX_ENTRIES = 500;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min = new session

// ── Session tracking ───────────────────────────────────────

let currentSessionId = `session_${Date.now()}`;
let lastActivityAt = 0;

function getSessionId(): string {
  const now = Date.now();
  if (now - lastActivityAt > SESSION_TIMEOUT_MS) {
    currentSessionId = `session_${now}`;
  }
  lastActivityAt = now;
  return currentSessionId;
}

// ── Record ─────────────────────────────────────────────────

/**
 * Record a command execution in the learning profile.
 * Call this AFTER a command is successfully parsed and executed.
 */
export function recordCommand(params: {
  type: string;
  domain: string | AIDomain;
  metrics: string[];
}): void {
  try {
    const entry: LearningEntry = {
      type: params.type,
      domain: params.domain,
      metrics: params.metrics,
      timestamp: Date.now(),
      sessionId: getSessionId(),
    };

    // Append entry
    const entries = loadEntries();
    entries.push(entry);
    pruneEntries(entries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

    // Rebuild profile
    const profile = buildProfile(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

    if (import.meta.env.DEV) {
      console.log(
        `[Learning] Recorded: ${params.type} → ${params.domain} (${params.metrics.length} metrics)`,
      );
    }
  } catch {
    // Graceful: don't crash the app for analytics
  }
}

// ── Read ───────────────────────────────────────────────────

/**
 * Get the current learning profile.
 * Returns a default empty profile if no data exists.
 */
export function getLearningProfile(): LearningProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LearningProfile;
  } catch {
    // Fall through to default
  }
  return getDefaultProfile();
}

/**
 * Get top N most-used command types.
 */
export function getTopCommandTypes(n: number = 3): Array<{ type: string; count: number }> {
  const profile = getLearningProfile();
  return Object.entries(profile.commandsByType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Get top N most-accessed domains.
 */
export function getTopDomains(n: number = 3): Array<{ domain: string; count: number }> {
  const profile = getLearningProfile();
  return Object.entries(profile.commandsByDomain)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Get top N most-queried metrics.
 */
export function getTopMetrics(n: number = 5): Array<{ metric: string; count: number }> {
  const profile = getLearningProfile();
  return Object.entries(profile.metricFrequency)
    .map(([metric, count]) => ({ metric, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Get feature adoption rate: what % of command types has the user tried?
 * Out of 7 possible types: query, analysis, simulation, action, rule, goal, report.
 */
export function getFeatureAdoption(): {
  tried: string[];
  missing: string[];
  rate: number;
} {
  const allTypes = ["query", "analysis", "simulation", "action", "rule", "goal", "report"];
  const profile = getLearningProfile();
  const tried = allTypes.filter((t) => (profile.commandsByType[t] ?? 0) > 0);
  const missing = allTypes.filter((t) => (profile.commandsByType[t] ?? 0) === 0);

  return {
    tried,
    missing,
    rate: Math.round((tried.length / allTypes.length) * 100),
  };
}

/**
 * Clear all learning data.
 */
export function clearLearningProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENTRIES_KEY);
  if (import.meta.env.DEV) {
    console.log("[Learning] Profile cleared");
  }
}

// ── Internal helpers ───────────────────────────────────────

function loadEntries(): LearningEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as LearningEntry[]) : [];
  } catch {
    return [];
  }
}

function pruneEntries(entries: LearningEntry[]): void {
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

function buildProfile(entries: LearningEntry[]): LearningProfile {
  const commandsByType: Record<string, number> = {};
  const commandsByDomain: Record<string, number> = {};
  const metricFrequency: Record<string, number> = {};
  const sessionIds = new Set<string>();

  for (const entry of entries) {
    commandsByType[entry.type] = (commandsByType[entry.type] ?? 0) + 1;
    commandsByDomain[entry.domain] = (commandsByDomain[entry.domain] ?? 0) + 1;
    sessionIds.add(entry.sessionId);

    for (const metric of entry.metrics) {
      metricFrequency[metric] = (metricFrequency[metric] ?? 0) + 1;
    }
  }

  const sessions = sessionIds.size || 1;
  const totalCommands = entries.length;

  return {
    totalCommands,
    commandsByType,
    commandsByDomain,
    metricFrequency,
    sessions,
    avgSessionDepth: Math.round((totalCommands / sessions) * 10) / 10,
    lastActiveAt: entries.length > 0 ? entries[entries.length - 1].timestamp : Date.now(),
    createdAt: entries.length > 0 ? entries[0].timestamp : Date.now(),
  };
}

function getDefaultProfile(): LearningProfile {
  return {
    totalCommands: 0,
    commandsByType: {},
    commandsByDomain: {},
    metricFrequency: {},
    sessions: 0,
    avgSessionDepth: 0,
    lastActiveAt: 0,
    createdAt: Date.now(),
  };
}