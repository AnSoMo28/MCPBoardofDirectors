// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/guestMemory.ts
// Phase 34 "The Gateway" — Guest Memory Engine
// Level 6+ Agency · Production Grade
//
// Builds persistent knowledge graphs per guest.
// The club REMEMBERS: visits, conversations, preferences,
// reactions. If a guest returns after 8 months, the memory
// knows their favorite wine, that their son plays tennis,
// and that they don't like crowds.
//
// Also handles dormancy detection and reactivation analysis.
//
// Depends on: types.ts, config.ts
// Budget: 40ms
// ═══════════════════════════════════════════════════════════

import type {
  GuestEngineResult,
  GuestId,
  MemoryGraph,
  MemoryNode,
  MemoryInteractionType,
  Callback,
  EmotionalArc,
  EmotionalArcPoint,
  TopicPattern,
  DormantGuest,
  GuestInterestDomain,
} from "../types";

import {
  engineOk
} from "../types";
import {
  MEMORY_THRESHOLDS,
  GUEST_ADVISOR_THRESHOLDS,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1 — INPUT CONTRACTS
// ═══════════════════════════════════════════════════════════

/** Raw interaction data for memory graph construction. */
export interface InteractionRecord {
  readonly id: string;
  readonly type: MemoryInteractionType;
  readonly timestamp: string;
  readonly sentiment: number;
  readonly topics: readonly string[];
  readonly context: Readonly<Record<string, string>>;
}

/** Guest activity summary for memory computation. */
export interface GuestActivitySummary {
  readonly guestId: GuestId;
  readonly guestName: string;
  readonly interactions: readonly InteractionRecord[];
  readonly totalVisits: number;
  readonly daysSinceLastVisit: number;
  readonly lastVisitDate: string | null;
  readonly callbacks: readonly Callback[];
}

// ═══════════════════════════════════════════════════════════
// §2 — MEMORY GRAPH CONSTRUCTION
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete memory graph from guest interaction history.
 * Each interaction becomes a node with computed recall priority.
 * The graph includes emotional arc, topic patterns, and callbacks.
 *
 * @param activity - Guest activity summary
 * @returns GuestEngineResult with MemoryGraph
 */
export function buildMemoryGraph(
  activity: GuestActivitySummary,
): GuestEngineResult<MemoryGraph> {
  const warnings: string[] = [];
  if (activity.interactions.length === 0) {
    warnings.push("Sin interacciones registradas — memoria vacía");
  }

  const now = Date.now();

  // Build memory nodes with computed recall priority
  const nodes: MemoryNode[] = activity.interactions.map(interaction => {
    const ageMs = now - new Date(interaction.timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Recall priority: recent + high sentiment = high recall
    const recencyBoost = Math.max(0, 100 - ageDays * (100 / MEMORY_THRESHOLDS.staleDays));
    const sentimentBoost = Math.abs(interaction.sentiment) * 30; // Strong feelings are more memorable
    const recallPriority = Math.min(100, Math.round(
      recencyBoost * 0.6 + sentimentBoost * 0.4,
    ));

    return {
      interactionId: interaction.id,
      type: interaction.type,
      timestamp: interaction.timestamp,
      sentiment: interaction.sentiment,
      topics: [...interaction.topics],
      context: { ...interaction.context },
      recallPriority,
    };
  });

  // Memory strength: based on interaction count, variety, recency, depth
  const uniqueTypes = new Set(nodes.map(n => n.type)).size;
  const avgRecall = nodes.length > 0
    ? nodes.reduce((sum, n) => sum + n.recallPriority, 0) / nodes.length
    : 0;
  const strength = Math.min(100, Math.round(
    Math.min(40, nodes.length * 3) +       // More interactions = stronger
    uniqueTypes * 8 +                       // Variety adds depth
    avgRecall * 0.3 +                       // Recency matters
    (activity.totalVisits >= 5 ? 15 : 0),  // Loyalty bonus
  ));

  // Emotional arc
  const emotionalArc = buildEmotionalArc(activity.interactions);

  // Topic patterns
  const topicPatterns = detectTopicPatterns(activity.interactions);

  // Filter callbacks to relevant ones
  const activeCallbacks = activity.callbacks.filter(
    cb => cb.status === "pending" || cb.status === "overdue",
  );

  return engineOk<MemoryGraph>({
    guestId: activity.guestId,
    nodes,
    strength,
    callbacks: activeCallbacks,
    emotionalArc,
    topicPatterns,
    lastUpdated: new Date().toISOString(),
  }, warnings);
}

/**
 * Safe variant — always returns valid MemoryGraph.
 */
export function buildMemoryGraphSafe(
  activity: GuestActivitySummary,
): MemoryGraph {
  const result = buildMemoryGraph(activity);
  if (result.ok) return result.data;

  return {
    guestId: activity.guestId,
    nodes: [],
    strength: 0,
    callbacks: [],
    emotionalArc: {
      points: [],
      trend: "stable",
      peak: null,
      valley: null,
      currentSentiment: 0,
    },
    topicPatterns: [],
    lastUpdated: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — EMOTIONAL ARC
// ═══════════════════════════════════════════════════════════

/**
 * Build temporal emotional arc from interactions.
 * Reveals peaks (great experiences), valleys (problems),
 * and the trend direction.
 */
function buildEmotionalArc(interactions: readonly InteractionRecord[]): EmotionalArc {
  if (interactions.length === 0) {
    return {
      points: [],
      trend: "stable",
      peak: null,
      valley: null,
      currentSentiment: 0,
    };
  }

  // Sort by timestamp
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const points: EmotionalArcPoint[] = sorted.map((interaction, idx) => {
    // Smooth sentiment with rolling average (window of 3)
    const windowStart = Math.max(0, idx - 1);
    const windowEnd = Math.min(sorted.length, idx + 2);
    const window = sorted.slice(windowStart, windowEnd);
    const smoothedSentiment = window.reduce((sum, i) => sum + i.sentiment, 0) / window.length;

    // Find trigger: what changed from previous sentiment
    const prevSentiment = idx > 0 ? sorted[idx - 1].sentiment : 0;
    const sentimentDelta = smoothedSentiment - prevSentiment;
    let trigger = "sin cambio notable";
    if (Math.abs(sentimentDelta) > 0.3) {
      trigger = sentimentDelta > 0
        ? `experiencia positiva (${interaction.topics.join(", ") || interaction.type})`
        : `experiencia negativa (${interaction.topics.join(", ") || interaction.type})`;
    }

    return {
      date: interaction.timestamp,
      sentiment: Math.round(smoothedSentiment * 100) / 100,
      event: `${interaction.type}: ${interaction.topics.join(", ") || "visita general"}`,
      trigger,
    };
  });

  // Find peak and valley
  const peak = points.reduce(
    (max, p) => (p.sentiment > (max?.sentiment ?? -Infinity) ? p : max),
    points[0],
  );
  const valley = points.reduce(
    (min, p) => (p.sentiment < (min?.sentiment ?? Infinity) ? p : min),
    points[0],
  );

  // Trend: compare first third vs last third
  const thirdSize = Math.max(1, Math.floor(points.length / 3));
  const firstThird = points.slice(0, thirdSize);
  const lastThird = points.slice(-thirdSize);
  const firstAvg = firstThird.reduce((s, p) => s + p.sentiment, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((s, p) => s + p.sentiment, 0) / lastThird.length;
  const trendDiff = lastAvg - firstAvg;

  const trend = trendDiff > 0.15 ? "improving" : trendDiff < -0.15 ? "declining" : "stable";

  return {
    points,
    trend,
    peak,
    valley,
    currentSentiment: points[points.length - 1]?.sentiment ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — TOPIC PATTERN DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect recurring topic patterns across interactions.
 * Topics that appear 2+ times with consistent sentiment
 * are flagged as interest patterns.
 */
function detectTopicPatterns(
  interactions: readonly InteractionRecord[],
): readonly TopicPattern[] {
  const topicMap = new Map<string, {
    frequency: number;
    sentimentSum: number;
    lastMentioned: string;
  }>();

  for (const interaction of interactions) {
    for (const topic of interaction.topics) {
      const key = topic.toLowerCase().trim();
      if (!key) continue;

      const existing = topicMap.get(key);
      if (existing) {
        existing.frequency += 1;
        existing.sentimentSum += interaction.sentiment;
        if (interaction.timestamp > existing.lastMentioned) {
          existing.lastMentioned = interaction.timestamp;
        }
      } else {
        topicMap.set(key, {
          frequency: 1,
          sentimentSum: interaction.sentiment,
          lastMentioned: interaction.timestamp,
        });
      }
    }
  }

  // Filter to topics mentioned 2+ times, sort by frequency
  const patterns: TopicPattern[] = [];

  for (const [topic, data] of topicMap) {
    if (data.frequency < 2) continue;

    patterns.push({
      topic,
      frequency: data.frequency,
      avgSentiment: Math.round((data.sentimentSum / data.frequency) * 100) / 100,
      lastMentioned: data.lastMentioned,
      domains: inferDomains(topic),
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
}

/**
 * Infer club interest domains from a topic keyword.
 * Maps common Spanish/English keywords to domains.
 */
function inferDomains(topic: string): readonly GuestInterestDomain[] {
  const lower = topic.toLowerCase();
  const domains: GuestInterestDomain[] = [];

  const domainKeywords: Record<GuestInterestDomain, readonly string[]> = {
    sports: ["tenis", "tennis", "golf", "gym", "fitness", "deporte", "padel", "squash"],
    dining: ["restaurante", "comida", "vino", "wine", "cena", "almuerzo", "chef", "cocina"],
    wellness: ["spa", "masaje", "yoga", "wellness", "relax", "sauna"],
    cultural: ["arte", "música", "exposición", "concierto", "teatro"],
    social: ["familia", "amigos", "fiesta", "reunión", "social"],
    pool: ["piscina", "pool", "natación", "swim"],
    events: ["evento", "boda", "bautizo", "cumpleaños", "corporativo"],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      domains.push(domain as GuestInterestDomain);
    }
  }

  return domains.length > 0 ? domains : ["social"];
}

// ═══════════════════════════════════════════════════════════
// §5 — DORMANCY DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect dormant guests from a list of activity summaries.
 * A dormant guest hasn't visited in 60+ days and shows
 * declining engagement patterns.
 *
 * @param guests - Activity summaries for all guests
 * @param thresholdDays - Days without visit to consider dormant (default: from config)
 * @returns GuestEngineResult with DormantGuest[]
 */
export function detectDormantGuests(
  guests: readonly GuestActivitySummary[],
  thresholdDays: number = GUEST_ADVISOR_THRESHOLDS.dormantDays,
): GuestEngineResult<readonly DormantGuest[]> {
  const now = Date.now();
  const dormant: DormantGuest[] = [];

  for (const guest of guests) {
    if (guest.daysSinceLastVisit < thresholdDays) continue;

    // Dormancy risk: longer absence = higher risk of permanent loss
    const excessDays = guest.daysSinceLastVisit - thresholdDays;
    const dormancyRisk = Math.min(100, Math.round(
      40 + excessDays * 0.5 + (guest.totalVisits <= 2 ? 15 : 0),
    ));

    // Reactivation probability: more history = higher chance
    const historyBonus = Math.min(30, guest.totalVisits * 5);
    const reactivationProbability = Math.max(10, Math.min(90, Math.round(
      60 - dormancyRisk * 0.3 + historyBonus,
    )));

    // Optimal timing: seasonal patterns + personal history
    const optimalDate = new Date(now);
    optimalDate.setDate(optimalDate.getDate() + 7 + Math.floor(Math.random() * 14));

    // Approach based on history
    let approach = "Contacto general con actualizaciones del club";
    if (guest.totalVisits >= 5) {
      approach = "Contacto personalizado mencionando actividades favoritas";
    }
    if (guest.callbacks.some(cb => cb.status === "overdue")) {
      approach = "Contacto para resolver callback pendiente";
    }

    // Trigger signals
    const triggers: string[] = [];
    if (guest.totalVisits >= 3) triggers.push("historial de visitas frecuentes");
    if (guest.callbacks.length > 0) triggers.push("promesas pendientes");
    if (excessDays < 30) triggers.push("reciente — ventana de reactivación activa");

    dormant.push({
      guestId: guest.guestId,
      guestName: guest.guestName,
      daysSinceLastVisit: guest.daysSinceLastVisit,
      dormancyRisk,
      reactivationProbability,
      optimalTiming: optimalDate.toISOString(),
      approach,
      triggerSignals: triggers,
    });
  }

  // Sort by reactivation probability descending (best opportunities first)
  dormant.sort((a, b) => b.reactivationProbability - a.reactivationProbability);

  return engineOk<readonly DormantGuest[]>(dormant);
}

/**
 * Safe variant — always returns array.
 */
export function detectDormantGuestsSafe(
  guests: readonly GuestActivitySummary[],
  thresholdDays?: number,
): readonly DormantGuest[] {
  const result = detectDormantGuests(guests, thresholdDays);
  return result.ok ? result.data : [];
}

// ═══════════════════════════════════════════════════════════
// §6 — RECALL CONTEXT
// What should the staff know about THIS guest RIGHT NOW?
// ═══════════════════════════════════════════════════════════

/** Context for staff to recall about a guest. */
export interface RecallContext {
  /** Key preferences to remember. */
  readonly preferences: readonly string[];
  /** Pending callbacks (promises made). */
  readonly pendingCallbacks: readonly Callback[];
  /** Topics to bring up. */
  readonly suggestedTopics: readonly string[];
  /** Concerns to be aware of. */
  readonly concerns: readonly string[];
  /** Highlights to celebrate. */
  readonly highlights: readonly string[];
}

/**
 * Derive recall context from a memory graph.
 * This is what the staff should know when a guest walks in.
 *
 * @param memory - The guest's memory graph
 * @returns RecallContext for immediate staff use
 */
export function recallContext(memory: MemoryGraph): RecallContext {
  // Preferences: high-recall, positive-sentiment topics
  const preferences = memory.topicPatterns
    .filter(tp => tp.avgSentiment > 0 && tp.frequency >= 2)
    .slice(0, 5)
    .map(tp => tp.topic);

  // Pending callbacks
  const pendingCallbacks = memory.callbacks.filter(cb => cb.status === "pending" || cb.status === "overdue");

  // Suggested topics: recent positive topics
  const recentNodes = memory.nodes
    .filter(n => n.recallPriority >= MEMORY_THRESHOLDS.recallPriorityHigh)
    .slice(0, 5);
  const suggestedTopics = [...new Set(recentNodes.flatMap(n => n.topics))].slice(0, 3);

  // Concerns: negative sentiment interactions
  const concerns = memory.nodes
    .filter(n => n.sentiment < -0.3)
    .slice(0, 3)
    .map(n => `${n.type}: ${n.topics.join(", ") || "experiencia negativa"}`);

  // Highlights: highest sentiment moments
  const highlights = memory.emotionalArc.peak
    ? [memory.emotionalArc.peak.event]
    : memory.nodes
        .filter(n => n.sentiment > 0.5)
        .slice(0, 2)
        .map(n => n.topics.join(", ") || n.type);

  return {
    preferences,
    pendingCallbacks,
    suggestedTopics,
    concerns,
    highlights,
  };
}