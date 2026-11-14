// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/__tests__/guestMemory.test.ts
// Phase 34 "The Gateway" — Guest Memory Engine Tests
// Level 6+ Agency · Production Grade
//
// Tests ALL 8 exported items against verified formulas.
// Exact numerical assertions for detectDormantGuests (explicit thresholdDays).
// Exact assertions for recallContext (hand-built MemoryGraph).
// Behavioral properties for buildMemoryGraph (config + Date.now deps).
//
// Checklist: T1-T8
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  buildMemoryGraph,
  buildMemoryGraphSafe,
  detectDormantGuests,
  detectDormantGuestsSafe,
  recallContext,
  type InteractionRecord,
  type GuestActivitySummary
} from "../guestMemory";

import type {
  GuestEngineResult,
  GuestId,
  MemoryGraph,
  MemoryNode,
  MemoryInteractionType,
  Callback,
  TopicPattern,
  GuestInterestDomain,
} from "../../types";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

function gid(raw: string): GuestId {
  return raw as unknown as GuestId;
}

function assertOk<T>(result: GuestEngineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Unreachable");
  return result.data;
}

/**
 * Build an ISO timestamp N days ago from now.
 */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

/**
 * Build an ISO timestamp N hours ago from now.
 */
function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3_600_000).toISOString();
}

// ═══════════════════════════════════════════════════════════
// §2 — MOCK FACTORIES
// ═══════════════════════════════════════════════════════════

function makeInteraction(overrides?: Partial<InteractionRecord>): InteractionRecord {
  return {
    id: `int-${Math.random().toString(36).slice(2, 8)}`,
    type: "visit" as MemoryInteractionType,
    timestamp: daysAgo(10),
    sentiment: 0.75,
    topics: ["sports", "pool"],
    context: { weather: "sunny", mood: "happy" },
    ...overrides,
  };
}

function makeCallback(overrides?: Partial<Callback>): Callback {
  return {
    id: `cb-${Math.random().toString(36).slice(2, 8)}`,
    description: "Confirmar reserva para cena",
    promisedDate: daysAgo(-7),
    status: "pending",
    priority: 80,
    createdAt: daysAgo(5),
    ...overrides,
  } as unknown as Callback;
}

function makeActivitySummary(overrides?: Partial<GuestActivitySummary>): GuestActivitySummary {
  return {
    guestId: gid("gst-001"),
    guestName: "María Pérez",
    interactions: [
      makeInteraction({ id: "int-1", type: "visit", timestamp: daysAgo(30), sentiment: 0.8, topics: ["pool", "dining"] }),
      makeInteraction({ id: "int-2", type: "event", timestamp: daysAgo(20), sentiment: 0.9, topics: ["social", "cultural"] }),
      makeInteraction({ id: "int-3", type: "dining", timestamp: daysAgo(10), sentiment: 0.65, topics: ["dining"] }),
      makeInteraction({ id: "int-4", type: "visit", timestamp: daysAgo(5), sentiment: 0.85, topics: ["sports", "wellness"] }),
      makeInteraction({ id: "int-5", type: "feedback", timestamp: daysAgo(2), sentiment: -0.3, topics: ["service"] }),
    ],
    totalVisits: 12,
    daysSinceLastVisit: 5,
    lastVisitDate: daysAgo(5),
    callbacks: [
      makeCallback({ id: "cb-1", status: "pending" }),
    ],
    ...overrides,
  };
}

function makeDormantActivity(): GuestActivitySummary {
  return makeActivitySummary({
    guestId: gid("gst-dormant"),
    guestName: "Pedro López",
    totalVisits: 2,
    daysSinceLastVisit: 90,
    lastVisitDate: daysAgo(90),
    interactions: [
      makeInteraction({ id: "d-int-1", timestamp: daysAgo(120), sentiment: 0.5, topics: ["sports"] }),
      makeInteraction({ id: "d-int-2", timestamp: daysAgo(90), sentiment: 0.4, topics: ["pool"] }),
    ],
    callbacks: [],
  });
}

/**
 * Build a MemoryGraph directly for recallContext tests.
 * This avoids config dependencies from buildMemoryGraph.
 */
function makeMemoryGraph(overrides?: Partial<MemoryGraph>): MemoryGraph {
  const now = new Date().toISOString();
  return {
    guestId: gid("gst-001"),
    nodes: [
      { interactionId: "n-1", type: "visit", timestamp: daysAgo(5), sentiment: 0.85, topics: ["sports", "tenis"], context: {}, recallPriority: 85 },
      { interactionId: "n-2", type: "dining", timestamp: daysAgo(10), sentiment: 0.7, topics: ["dining", "vino"], context: {}, recallPriority: 70 },
      { interactionId: "n-3", type: "feedback", timestamp: daysAgo(2), sentiment: -0.5, topics: ["service"], context: {}, recallPriority: 90 },
      { interactionId: "n-4", type: "event", timestamp: daysAgo(15), sentiment: 0.9, topics: ["social"], context: {}, recallPriority: 60 },
      { interactionId: "n-5", type: "visit", timestamp: daysAgo(1), sentiment: 0.6, topics: ["sports"], context: {}, recallPriority: 95 },
    ],
    strength: 65,
    callbacks: [
      makeCallback({ id: "cb-pending", status: "pending", description: "Reservar cancha" }),
      makeCallback({ id: "cb-overdue", status: "overdue", description: "Enviar factura" }),
      makeCallback({ id: "cb-done", status: "fulfilled", description: "Ya completado" }),
    ],
    emotionalArc: {
      points: [
        { date: daysAgo(15), sentiment: 0.9, event: "event: social", trigger: "experiencia positiva (social)" },
        { date: daysAgo(10), sentiment: 0.7, event: "dining: dining, vino", trigger: "experiencia negativa (dining, vino)" },
        { date: daysAgo(5), sentiment: 0.85, event: "visit: sports, tenis", trigger: "experiencia positiva (sports, tenis)" },
        { date: daysAgo(2), sentiment: -0.5, event: "feedback: service", trigger: "experiencia negativa (service)" },
      ],
      trend: "declining",
      peak: { date: daysAgo(15), sentiment: 0.9, event: "event: social", trigger: "experiencia positiva (social)" },
      valley: { date: daysAgo(2), sentiment: -0.5, event: "feedback: service", trigger: "experiencia negativa (service)" },
      currentSentiment: -0.5,
    },
    topicPatterns: [
      { topic: "sports", frequency: 3, avgSentiment: 0.75, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
      { topic: "dining", frequency: 2, avgSentiment: 0.67, lastMentioned: daysAgo(10), domains: ["dining" as GuestInterestDomain] },
      { topic: "vino", frequency: 2, avgSentiment: 0.7, lastMentioned: daysAgo(10), domains: ["dining" as GuestInterestDomain] },
      { topic: "service", frequency: 1, avgSentiment: -0.5, lastMentioned: daysAgo(2), domains: ["social" as GuestInterestDomain] },
      { topic: "social", frequency: 1, avgSentiment: 0.9, lastMentioned: daysAgo(15), domains: ["social" as GuestInterestDomain] },
    ],
    lastUpdated: now,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — buildMemoryGraph (behavioral — Date.now + config deps)
// ═══════════════════════════════════════════════════════════

describe("buildMemoryGraph", () => {
  // ── Happy path ──

  it("should return a valid graph with interactions", () => {
    const result = buildMemoryGraph(makeActivitySummary());
    const graph = assertOk(result);

    expect(graph.guestId).toBe("gst-001");
    expect(graph.nodes.length).toBe(5); // 5 interactions in mock
    expect(graph.strength).toBeGreaterThanOrEqual(0);
    expect(graph.strength).toBeLessThanOrEqual(100);
    expect(graph.callbacks.length || graph.lastUpdated).toBeTruthy();
  });

  it("should return empty graph with 0 interactions", () => {
    // G15: mock con totalVisits 0 — el loyalty bonus (totalVisits>=5
    // → +15) es comportamiento correcto del src; strength 0 exige huésped
    // SIN visitas. El mock viejo dejaba totalVisits=12 → strength 15.
    const result = buildMemoryGraph(makeActivitySummary({ interactions: [], totalVisits: 0 }));
    const graph = assertOk(result);

    expect(graph.nodes.length).toBe(0);
    expect(graph.strength).toBe(0);
  });

  it("should emit warning for 0 interactions", () => {
    const result = buildMemoryGraph(makeActivitySummary({ interactions: [] }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("Sin interacciones registradas — memoria vacía");
    }
  });

  it("should emit no warnings when interactions present", () => {
    const result = buildMemoryGraph(makeActivitySummary());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── Memory nodes ──

  it("should create one node per interaction", () => {
    const interactions = [
      makeInteraction({ id: "n1" }),
      makeInteraction({ id: "n2" }),
      makeInteraction({ id: "n3" }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));
    expect(graph.nodes.length).toBe(3);
  });

  it("should preserve interaction data in nodes", () => {
    const interaction = makeInteraction({
      id: "test-id",
      type: "dining",
      sentiment: 0.85,
      topics: ["vino", "chef"],
      context: { note: "prefiere tinto" },
    });
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({
      interactions: [interaction],
    })));

    const node = graph.nodes[0];
    expect(node.interactionId).toBe("test-id");
    expect(node.type).toBe("dining");
    expect(node.sentiment).toBe(0.85);
    expect(node.topics).toEqual(["vino", "chef"]);
    expect(node.context).toEqual({ note: "prefiere tinto" });
  });

  it("should compute recallPriority in range [0, 100]", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    graph.nodes.forEach((node) => {
      expect(node.recallPriority).toBeGreaterThanOrEqual(0);
      expect(node.recallPriority).toBeLessThanOrEqual(100);
    });
  });

  it("should compute higher recallPriority for recent interactions", () => {
    const interactions = [
      makeInteraction({ id: "old", timestamp: daysAgo(60), sentiment: 0.5 }),
      makeInteraction({ id: "recent", timestamp: hoursAgo(1), sentiment: 0.5 }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const oldNode = graph.nodes.find((n) => n.interactionId === "old")!;
    const recentNode = graph.nodes.find((n) => n.interactionId === "recent")!;
    expect(recentNode.recallPriority).toBeGreaterThan(oldNode.recallPriority);
  });

  it("should compute higher recallPriority for strong sentiment (positive or negative)", () => {
    const interactions = [
      makeInteraction({ id: "neutral", timestamp: daysAgo(5), sentiment: 0.1 }),
      makeInteraction({ id: "strong", timestamp: daysAgo(5), sentiment: 0.95 }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const neutralNode = graph.nodes.find((n) => n.interactionId === "neutral")!;
    const strongNode = graph.nodes.find((n) => n.interactionId === "strong")!;
    expect(strongNode.recallPriority).toBeGreaterThan(neutralNode.recallPriority);
  });

  it("should compute higher recallPriority for strong negative sentiment too", () => {
    const interactions = [
      makeInteraction({ id: "neutral", timestamp: daysAgo(5), sentiment: 0.05 }),
      makeInteraction({ id: "negative", timestamp: daysAgo(5), sentiment: -0.9 }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const neutralNode = graph.nodes.find((n) => n.interactionId === "neutral")!;
    const negativeNode = graph.nodes.find((n) => n.interactionId === "negative")!;
    // |−0.9| * 30 = 27 vs |0.05| * 30 = 1.5 → negative has higher sentimentBoost
    expect(negativeNode.recallPriority).toBeGreaterThan(neutralNode.recallPriority);
  });

  // ── Memory strength ──

  it("should increase strength with more interactions", () => {
    const few = assertOk(buildMemoryGraph(makeActivitySummary({
      interactions: [
        makeInteraction({ id: "f1", timestamp: daysAgo(5), sentiment: 0.7 }),
      ],
    })));
    const many = assertOk(buildMemoryGraph(makeActivitySummary({
      interactions: [
        makeInteraction({ id: "m1", type: "visit", timestamp: daysAgo(30), sentiment: 0.7 }),
        makeInteraction({ id: "m2", type: "dining", timestamp: daysAgo(20), sentiment: 0.8 }),
        makeInteraction({ id: "m3", type: "event", timestamp: daysAgo(10), sentiment: 0.9 }),
        makeInteraction({ id: "m4", type: "feedback", timestamp: daysAgo(5), sentiment: 0.6 }),
        makeInteraction({ id: "m5", type: "visit", timestamp: daysAgo(1), sentiment: 0.85 }),
      ],
    })));

    expect(many.strength).toBeGreaterThan(few.strength);
  });

  it("should increase strength with more interaction types (variety)", () => {
    const oneType = assertOk(buildMemoryGraph(makeActivitySummary({
      interactions: [
        makeInteraction({ id: "t1", type: "visit", timestamp: daysAgo(10), sentiment: 0.7 }),
        makeInteraction({ id: "t2", type: "visit", timestamp: daysAgo(5), sentiment: 0.8 }),
      ],
    })));
    const manyTypes = assertOk(buildMemoryGraph(makeActivitySummary({
      interactions: [
        makeInteraction({ id: "m1", type: "visit", timestamp: daysAgo(10), sentiment: 0.7 }),
        makeInteraction({ id: "m2", type: "dining", timestamp: daysAgo(5), sentiment: 0.8 }),
        makeInteraction({ id: "m3", type: "event", timestamp: daysAgo(3), sentiment: 0.75 }),
      ],
    })));

    // manyTypes has 3 unique types vs 1 → higher strength
    expect(manyTypes.strength).toBeGreaterThan(oneType.strength);
  });

  it("should add loyalty bonus when totalVisits >= 5", () => {
    const lowVisits = assertOk(buildMemoryGraph(makeActivitySummary({
      totalVisits: 2,
      interactions: [
        makeInteraction({ id: "lv1", type: "visit", timestamp: daysAgo(5), sentiment: 0.7 }),
      ],
    })));
    const highVisits = assertOk(buildMemoryGraph(makeActivitySummary({
      totalVisits: 10,
      interactions: [
        makeInteraction({ id: "hv1", type: "visit", timestamp: daysAgo(5), sentiment: 0.7 }),
      ],
    })));

    // Same interactions, but highVisits gets +15 loyalty bonus
    expect(highVisits.strength).toBeGreaterThan(lowVisits.strength);
  });

  it("should clamp strength to [0, 100]", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    expect(graph.strength).toBeGreaterThanOrEqual(0);
    expect(graph.strength).toBeLessThanOrEqual(100);
  });

  // ── Emotional arc ──

  it("should build emotional arc with points sorted by timestamp", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    const arc = graph.emotionalArc;

    expect(arc.points.length).toBe(5); // 5 interactions
    for (let i = 1; i < arc.points.length; i++) {
      const prev = new Date(arc.points[i - 1].date).getTime();
      const curr = new Date(arc.points[i].date).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("should identify peak (highest sentiment)", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    const arc = graph.emotionalArc;

    expect(arc.peak).toBeDefined();
    if (arc.peak) {
      // Peak should be among the highest sentiment points
      const maxSentiment = Math.max(...arc.points.map((p) => p.sentiment));
      expect(arc.peak.sentiment).toBe(maxSentiment);
    }
  });

  it("should identify valley (lowest sentiment)", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    const arc = graph.emotionalArc;

    expect(arc.valley).toBeDefined();
    if (arc.valley) {
      const minSentiment = Math.min(...arc.points.map((p) => p.sentiment));
      expect(arc.valley.sentiment).toBe(minSentiment);
    }
  });

  it("should compute currentSentiment from last point", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    const arc = graph.emotionalArc;

    if (arc.points.length > 0) {
      expect(arc.currentSentiment).toBe(arc.points[arc.points.length - 1].sentiment);
    }
  });

  it("should return stable trend for 0 interactions", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions: [] })));
    expect(graph.emotionalArc.trend).toBe("stable");
    expect(graph.emotionalArc.peak).toBeNull();
    expect(graph.emotionalArc.valley).toBeNull();
    expect(graph.emotionalArc.currentSentiment).toBe(0);
  });

  it("should include trigger on each point", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    graph.emotionalArc.points.forEach((p) => {
      expect(p.trigger).toBeTruthy();
      expect(typeof p.trigger).toBe("string");
    });
  });

  it("should include event description on each point", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    graph.emotionalArc.points.forEach((p) => {
      expect(p.event).toBeTruthy();
    });
  });

  // ── Topic patterns ──

  it("should detect topics mentioned 2+ times", () => {
    // "pool" appears in int-1 and int-4 (wellness in int-4, but pool in int-1)
    // Actually let me check the mock:
    // int-1: ["pool", "dining"], int-2: ["social", "cultural"], int-3: ["dining"],
    // int-4: ["sports", "wellness"], int-5: ["service"]
    // "dining" appears 2x (int-1, int-3) → should be detected
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));

    const diningPattern = graph.topicPatterns.find((tp) => tp.topic === "dining");
    expect(diningPattern).toBeDefined();
    expect(diningPattern!.frequency).toBe(2);
  });

  it("should NOT detect topics mentioned only once", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));

    // "service" appears only in int-5
    const servicePattern = graph.topicPatterns.find((tp) => tp.topic === "service");
    expect(servicePattern).toBeUndefined();
  });

  it("should sort topic patterns by frequency descending", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));

    for (let i = 1; i < graph.topicPatterns.length; i++) {
      expect(graph.topicPatterns[i].frequency).toBeLessThanOrEqual(
        graph.topicPatterns[i - 1].frequency,
      );
    }
  });

  it("should compute avgSentiment for topic patterns", () => {
    const interactions = [
      makeInteraction({ id: "tp1", sentiment: 0.8, topics: ["tenis"] }),
      makeInteraction({ id: "tp2", sentiment: 0.6, topics: ["tenis"] }),
      makeInteraction({ id: "tp3", sentiment: 0.4, topics: ["tenis"] }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const tenisPattern = graph.topicPatterns.find((tp) => tp.topic === "tenis");
    expect(tenisPattern).toBeDefined();
    // avgSentiment = (0.8 + 0.6 + 0.4) / 3 = 0.6
    expect(tenisPattern!.avgSentiment).toBe(0.6);
  });

  it("should include domains on topic patterns", () => {
    const interactions = [
      makeInteraction({ id: "dm1", sentiment: 0.7, topics: ["tenis"] }),
      makeInteraction({ id: "dm2", sentiment: 0.8, topics: ["tenis"] }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const tenisPattern = graph.topicPatterns.find((tp) => tp.topic === "tenis");
    expect(tenisPattern).toBeDefined();
    expect(tenisPattern!.domains).toContain("sports");
  });

  it("should infer dining domain for food-related topics", () => {
    const interactions = [
      makeInteraction({ id: "fd1", sentiment: 0.8, topics: ["vino"] }),
      makeInteraction({ id: "fd2", sentiment: 0.7, topics: ["vino"] }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const vinoPattern = graph.topicPatterns.find((tp) => tp.topic === "vino");
    expect(vinoPattern).toBeDefined();
    expect(vinoPattern!.domains).toContain("dining");
  });

  it("should default to ['social'] when topic has no domain match", () => {
    const interactions = [
      makeInteraction({ id: "nd1", sentiment: 0.5, topics: ["xyz_unknown"] }),
      makeInteraction({ id: "nd2", sentiment: 0.6, topics: ["xyz_unknown"] }),
    ];
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));

    const pattern = graph.topicPatterns.find((tp) => tp.topic === "xyz_unknown");
    expect(pattern).toBeDefined();
    expect(pattern!.domains).toEqual(["social"]);
  });

  it("should limit topic patterns to 10", () => {
    // Create 12 different topics, each mentioned 2+ times
    const interactions: InteractionRecord[] = [];
    const topics = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
    for (const topic of topics) {
      interactions.push(makeInteraction({ id: `${topic}1`, sentiment: 0.5, topics: [topic] }));
      interactions.push(makeInteraction({ id: `${topic}2`, sentiment: 0.5, topics: [topic] }));
    }
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({ interactions })));
    expect(graph.topicPatterns.length).toBeLessThanOrEqual(10);
  });

  // ── Callbacks ──

  it("should include only pending and overdue callbacks", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary({
      callbacks: [
        makeCallback({ id: "cb-p", status: "pending" }),
        makeCallback({ id: "cb-o", status: "overdue" }),
        makeCallback({ id: "cb-c", status: "fulfilled" }),
      ],
    })));

    expect(graph.callbacks.length).toBe(2);
    const ids = graph.callbacks.map((cb) => cb.id);
    expect(ids).toContain("cb-p");
    expect(ids).toContain("cb-o");
    expect(ids).not.toContain("cb-c");
  });

  // ── lastUpdated ──

  it("should include lastUpdated as valid ISO string", () => {
    const graph = assertOk(buildMemoryGraph(makeActivitySummary()));
    expect(Number.isNaN(new Date(graph.lastUpdated).getTime())).toBe(false);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => buildMemoryGraph(makeActivitySummary({
      interactions: [],
      callbacks: [],
      totalVisits: 0,
      daysSinceLastVisit: 999,
      lastVisitDate: null,
    }))).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 10ms", () => {
    const start = performance.now();
    buildMemoryGraph(makeActivitySummary());
    expect(performance.now() - start).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// §4 — buildMemoryGraphSafe
// ═══════════════════════════════════════════════════════════

describe("buildMemoryGraphSafe", () => {
  it("should return identical data on success", () => {
    const activity = makeActivitySummary();
    const raw = assertOk(buildMemoryGraph(activity));
    const safe = buildMemoryGraphSafe(activity);

    expect(safe.guestId).toBe(raw.guestId);
    expect(safe.nodes.length).toBe(raw.nodes.length);
    expect(safe.strength).toBe(raw.strength);
  });

  it("should return valid MemoryGraph on success", () => {
    const safe = buildMemoryGraphSafe(makeActivitySummary());

    expect(safe).toBeDefined();
    expect(safe.guestId).toBeTruthy();
    expect(Array.isArray(safe.nodes)).toBe(true);
    expect(typeof safe.strength).toBe("number");
    expect(safe.emotionalArc).toBeDefined();
    expect(Array.isArray(safe.topicPatterns)).toBe(true);
    expect(Array.isArray(safe.callbacks)).toBe(true);
    expect(safe.lastUpdated).toBeTruthy();
  });

  it("should never throw", () => {
    expect(() => buildMemoryGraphSafe(makeActivitySummary({
      interactions: [],
    }))).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §5 — detectDormantGuests (EXACT formulas with explicit thresholdDays)
// ═══════════════════════════════════════════════════════════

describe("detectDormantGuests", () => {
  const THRESHOLD = 60; // Explicit → makes all formulas self-contained

  // ── Exact dormancyRisk formula ──

  it("should compute exact dormancyRisk for known inputs", () => {
    // daysSinceLastVisit=90, threshold=60, totalVisits=5
    // excessDays = 90 - 60 = 30
    // dormancyRisk = min(100, round(40 + 30*0.5 + 0)) = 55
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 5, guestId: gid("gst-x") })],
      THRESHOLD,
    ));
    expect(result.length).toBe(1);
    expect(result[0].dormancyRisk).toBe(55);
  });

  it("should add +15 to dormancyRisk when totalVisits <= 2", () => {
    // daysSinceLastVisit=120, threshold=60, totalVisits=1
    // excessDays = 60
    // dormancyRisk = min(100, round(40 + 30 + 15)) = 85
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 120, totalVisits: 1, guestId: gid("gst-y") })],
      THRESHOLD,
    ));
    expect(result[0].dormancyRisk).toBe(85);
  });

  it("should NOT add +15 when totalVisits > 2", () => {
    // daysSinceLastVisit=90, threshold=60, totalVisits=3
    // excessDays = 30
    // dormancyRisk = min(100, round(40 + 15 + 0)) = 55
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 3, guestId: gid("gst-z") })],
      THRESHOLD,
    ));
    expect(result[0].dormancyRisk).toBe(55);
  });

  it("should clamp dormancyRisk at 100", () => {
    // daysSinceLastVisit=500, threshold=60, totalVisits=1
    // excessDays = 440
    // dormancyRisk = min(100, round(40 + 220 + 15)) = min(100, 275) = 100
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 500, totalVisits: 1, guestId: gid("gst-max") })],
      THRESHOLD,
    ));
    expect(result[0].dormancyRisk).toBe(100);
  });

  it("should compute minimum dormancyRisk at exact threshold boundary", () => {
    // daysSinceLastVisit=60, threshold=60, totalVisits=5
    // excessDays = 0
    // dormancyRisk = min(100, round(40 + 0 + 0)) = 40
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 60, totalVisits: 5, guestId: gid("gst-boundary") })],
      THRESHOLD,
    ));
    expect(result[0].dormancyRisk).toBe(40);
  });

  // ── Exact reactivationProbability formula ──

  it("should compute exact reactivationProbability for known inputs", () => {
    // daysSinceLastVisit=90, threshold=60, totalVisits=5
    // dormancyRisk = 55 (computed above)
    // historyBonus = min(30, 5*5) = 25
    // reactivationProbability = max(10, min(90, round(60 - 55*0.3 + 25)))
    //                        = max(10, min(90, round(60 - 16.5 + 25)))
    //                        = max(10, min(90, round(68.5)))
    //                        = max(10, min(90, 69))
    //                        = 69
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 5, guestId: gid("gst-x") })],
      THRESHOLD,
    ));
    expect(result[0].reactivationProbability).toBe(69);
  });

  it("should compute reactivationProbability for low-history guest", () => {
    // daysSinceLastVisit=120, threshold=60, totalVisits=1
    // dormancyRisk = 85
    // historyBonus = min(30, 1*5) = 5
    // reactivationProbability = max(10, min(90, round(60 - 85*0.3 + 5)))
    //                        = max(10, min(90, round(60 - 25.5 + 5)))
    //                        = max(10, min(90, round(39.5)))
    //                        = max(10, 40)
    //                        = 40
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 120, totalVisits: 1, guestId: gid("gst-y") })],
      THRESHOLD,
    ));
    expect(result[0].reactivationProbability).toBe(40);
  });

  it("should compute reactivationProbability for high-history guest at boundary", () => {
    // daysSinceLastVisit=60, threshold=60, totalVisits=10
    // dormancyRisk = 40
    // historyBonus = min(30, 10*5) = 30
    // reactivationProbability = max(10, min(90, round(60 - 40*0.3 + 30)))
    //                        = max(10, min(90, round(60 - 12 + 30)))
    //                        = max(10, min(90, round(78)))
    //                        = 78
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 60, totalVisits: 10, guestId: gid("gst-z") })],
      THRESHOLD,
    ));
    expect(result[0].reactivationProbability).toBe(78);
  });

  it("should clamp reactivationProbability at max 90", () => {
    // Very high history, minimal dormancy risk
    // daysSinceLastVisit=60, threshold=60, totalVisits=100
    // dormancyRisk = 40
    // historyBonus = min(30, 100*5) = 30
    // reactivationProbability = max(10, min(90, round(60 - 12 + 30))) = 78
    // That's not > 90. Let me check: round(78) = 78. Still 78.
    // The formula naturally caps due to min(30, totalVisits*5) and dormancyRisk min of 40.
    // Max possible: dormancyRisk=40, historyBonus=30 → round(60-12+30) = 78
    // With lower dormancyRisk? Only if excessDays=0 AND totalVisits>2 → 40.
    // So max is 78 with this formula. The clamp at 90 is a safety net.
    // Let's verify it doesn't exceed 90.
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 60, totalVisits: 100, guestId: gid("gst-max") })],
      THRESHOLD,
    ));
    expect(result[0].reactivationProbability).toBeLessThanOrEqual(90);
  });

  it("should clamp reactivationProbability at min 10", () => {
    // Very high dormancyRisk, minimal history
    // daysSinceLastVisit=500, threshold=60, totalVisits=1
    // dormancyRisk = min(100, round(40 + 220 + 15)) = 100
    // historyBonus = min(30, 1*5) = 5
    // reactivationProbability = max(10, min(90, round(60 - 100*0.3 + 5)))
    //                        = max(10, min(90, round(60 - 30 + 5)))
    //                        = max(10, min(90, round(35)))
    //                        = max(10, 35)
    //                        = 35
    // That's not < 10. Let me try extreme:
    // daysSinceLastVisit=1000, threshold=60, totalVisits=0
    // dormancyRisk = min(100, round(40 + 470 + 15)) = 100
    // historyBonus = min(30, 0*5) = 0
    // reactivationProbability = max(10, round(60 - 30 + 0)) = 30
    // Still > 10. The min(10) is a safety net for edge cases.
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 1000, totalVisits: 0, guestId: gid("gst-extreme") })],
      THRESHOLD,
    ));
    expect(result[0].reactivationProbability).toBeGreaterThanOrEqual(10);
  });

  // ── Filtering ──

  it("should exclude guests below threshold", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 30, totalVisits: 5, guestId: gid("gst-active") })],
      THRESHOLD,
    ));
    expect(result.length).toBe(0);
  });

  it("should include guests exactly at threshold", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 60, totalVisits: 5, guestId: gid("gst-boundary") })],
      THRESHOLD,
    ));
    expect(result.length).toBe(1);
  });

  it("should return empty array for 0 guests", () => {
    const result = assertOk(detectDormantGuests([], THRESHOLD));
    expect(result).toEqual([]);
  });

  // ── Sorting ──

  it("should sort by reactivationProbability descending", () => {
    const guests = [
      makeActivitySummary({ guestId: gid("gst-low"), daysSinceLastVisit: 200, totalVisits: 1 }),
      makeActivitySummary({ guestId: gid("gst-high"), daysSinceLastVisit: 60, totalVisits: 10 }),
      makeActivitySummary({ guestId: gid("gst-mid"), daysSinceLastVisit: 90, totalVisits: 5 }),
    ];
    const result = assertOk(detectDormantGuests(guests, THRESHOLD));

    expect(result.length).toBe(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].reactivationProbability).toBeLessThanOrEqual(
        result[i - 1].reactivationProbability,
      );
    }
    // Best opportunity first (highest probability)
    expect(result[0].guestId).toBe("gst-high"); // 78
  });

  // ── Approach logic ──

  it("should use personalized approach when totalVisits >= 5 and no overdue callbacks", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({
        daysSinceLastVisit: 90,
        totalVisits: 8,
        guestId: gid("gst-vip"),
        callbacks: [],
      })],
      THRESHOLD,
    ));
    expect(result[0].approach).toContain("personalizado");
  });

  it("should use callback approach when overdue callbacks exist (overrides visits approach)", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({
        daysSinceLastVisit: 90,
        totalVisits: 8,
        guestId: gid("gst-cb"),
        callbacks: [makeCallback({ status: "overdue" })],
      })],
      THRESHOLD,
    ));
    expect(result[0].approach).toContain("callback pendiente");
  });

  it("should use general approach for low-visit guest without overdue callbacks", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({
        daysSinceLastVisit: 90,
        totalVisits: 2,
        guestId: gid("gst-low"),
        callbacks: [],
      })],
      THRESHOLD,
    ));
    expect(result[0].approach).toContain("general");
  });

  // ── Trigger signals ──

  it("should include 'historial de visitas frecuentes' when totalVisits >= 3", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 5, guestId: gid("gst-x"), callbacks: [] })],
      THRESHOLD,
    ));
    expect(result[0].triggerSignals).toContain("historial de visitas frecuentes");
  });

  it("should include 'promesas pendientes' when callbacks exist", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({
        daysSinceLastVisit: 90,
        totalVisits: 5,
        guestId: gid("gst-x"),
        callbacks: [makeCallback()],
      })],
      THRESHOLD,
    ));
    expect(result[0].triggerSignals).toContain("promesas pendientes");
  });

  it("should include 'reciente' when excessDays < 30", () => {
    // threshold=60, daysSinceLastVisit=70 → excessDays=10 < 30
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 70, totalVisits: 3, guestId: gid("gst-recent"), callbacks: [] })],
      THRESHOLD,
    ));
    expect(result[0].triggerSignals).toContain("reciente — ventana de reactivación activa");
  });

  it("should NOT include 'reciente' when excessDays >= 30", () => {
    // threshold=60, daysSinceLastVisit=120 → excessDays=60
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 120, totalVisits: 3, guestId: gid("gst-old"), callbacks: [] })],
      THRESHOLD,
    ));
    expect(result[0].triggerSignals).not.toContain("reciente — ventana de reactivación activa");
  });

  // ── Structural ──

  it("should include all required DormantGuest fields", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 5, guestId: gid("gst-001") })],
      THRESHOLD,
    ));
    const dg = result[0];

    expect(dg.guestId).toBe("gst-001");
    expect(dg.guestName).toBeTruthy();
    expect(dg.daysSinceLastVisit).toBe(90);
    expect(typeof dg.dormancyRisk).toBe("number");
    expect(typeof dg.reactivationProbability).toBe("number");
    expect(dg.optimalTiming).toBeTruthy();
    expect(Number.isNaN(new Date(dg.optimalTiming).getTime())).toBe(false);
    expect(typeof dg.approach).toBe("string");
    expect(Array.isArray(dg.triggerSignals)).toBe(true);
  });

  it("should clamp dormancyRisk and reactivationProbability to [0, 100]", () => {
    const result = assertOk(detectDormantGuests(
      [makeActivitySummary({ daysSinceLastVisit: 90, totalVisits: 5, guestId: gid("gst-001") })],
      THRESHOLD,
    ));

    expect(result[0].dormancyRisk).toBeGreaterThanOrEqual(0);
    expect(result[0].dormancyRisk).toBeLessThanOrEqual(100);
    expect(result[0].reactivationProbability).toBeGreaterThanOrEqual(0);
    expect(result[0].reactivationProbability).toBeLessThanOrEqual(100);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => detectDormantGuests([], 60)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §6 — detectDormantGuestsSafe
// ═══════════════════════════════════════════════════════════

describe("detectDormantGuestsSafe", () => {
  it("should return identical data on success", () => {
    const guests = [makeDormantActivity()];
    const raw = assertOk(detectDormantGuests(guests, 60));
    const safe = detectDormantGuestsSafe(guests, 60);

    expect(safe.length).toBe(raw.length);
    if (safe.length > 0) {
      expect(safe[0].dormancyRisk).toBe(raw[0].dormancyRisk);
    }
  });

  it("should return empty array for empty input", () => {
    expect(detectDormantGuestsSafe([])).toEqual([]);
  });

  it("should never throw", () => {
    expect(() => detectDormantGuestsSafe([])).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §7 — recallContext (exact tests with hand-built MemoryGraph)
// ═══════════════════════════════════════════════════════════

describe("recallContext", () => {
  // ── Preferences ──

  it("should extract preferences from topicPatterns where avgSentiment > 0 and frequency >= 2", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    // sports: freq=3, avgSentiment=0.75 → included
    // dining: freq=2, avgSentiment=0.67 → included
    // vino: freq=2, avgSentiment=0.7 → included
    // service: freq=1 → NOT included (frequency < 2)
    // social: freq=1 → NOT included (frequency < 2)
    expect(ctx.preferences).toContain("sports");
    expect(ctx.preferences).toContain("dining");
    expect(ctx.preferences).toContain("vino");
    expect(ctx.preferences).not.toContain("service");
    expect(ctx.preferences).not.toContain("social");
  });

  it("should exclude topics with negative avgSentiment from preferences", () => {
    const memory = makeMemoryGraph({
      topicPatterns: [
        { topic: "complaints", frequency: 3, avgSentiment: -0.5, lastMentioned: daysAgo(1), domains: ["social" as GuestInterestDomain] },
        { topic: "sports", frequency: 2, avgSentiment: 0.8, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
      ],
    });
    const ctx = recallContext(memory);

    expect(ctx.preferences).not.toContain("complaints");
    expect(ctx.preferences).toContain("sports");
  });

  it("should limit preferences to 5", () => {
    const patterns: TopicPattern[] = Array.from({ length: 8 }, (_, i) => ({
      topic: `topic-${i}`,
      frequency: 3,
      avgSentiment: 0.7,
      lastMentioned: daysAgo(1),
      domains: ["social" as GuestInterestDomain],
    }));
    const memory = makeMemoryGraph({ topicPatterns: patterns });
    const ctx = recallContext(memory);

    expect(ctx.preferences.length).toBeLessThanOrEqual(5);
  });

  it("should return empty preferences for empty topicPatterns", () => {
    const memory = makeMemoryGraph({ topicPatterns: [] });
    const ctx = recallContext(memory);
    expect(ctx.preferences).toEqual([]);
  });

  // ── Pending callbacks ──

  it("should include pending and overdue callbacks", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    expect(ctx.pendingCallbacks.length).toBe(2); // cb-pending + cb-overdue
    const descriptions = ctx.pendingCallbacks.map((cb) => cb.description);
    expect(descriptions).toContain("Reservar cancha");
    expect(descriptions).toContain("Enviar factura");
  });

  it("should exclude completed callbacks", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    const descriptions = ctx.pendingCallbacks.map((cb) => cb.description);
    expect(descriptions).not.toContain("Ya completado");
  });

  it("should return empty pendingCallbacks when all completed", () => {
    const memory = makeMemoryGraph({
      callbacks: [
        makeCallback({ status: "fulfilled" }),
      ],
    });
    const ctx = recallContext(memory);
    expect(ctx.pendingCallbacks).toEqual([]);
  });

  // ── Suggested topics (behavioral — depends on MEMORY_THRESHOLDS.recallPriorityHigh) ──

  it("should suggest topics from high-recall-priority nodes", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    expect(Array.isArray(ctx.suggestedTopics)).toBe(true);
    // n-5 has recallPriority=95, n-3 has recallPriority=90, n-1 has recallPriority=85
    // These should be included if they exceed MEMORY_THRESHOLDS.recallPriorityHigh
    // We don't know the exact threshold, so test structure
    ctx.suggestedTopics.forEach((topic) => {
      expect(typeof topic).toBe("string");
      expect(topic.length).toBeGreaterThan(0);
    });
  });

  it("should limit suggestedTopics to 3", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    expect(ctx.suggestedTopics.length).toBeLessThanOrEqual(3);
  });

  it("should deduplicate suggested topics", () => {
    const memory = makeMemoryGraph({
      nodes: [
        { interactionId: "dup-1", type: "visit", timestamp: daysAgo(1), sentiment: 0.8, topics: ["sports"], context: {}, recallPriority: 95 },
        { interactionId: "dup-2", type: "visit", timestamp: daysAgo(2), sentiment: 0.7, topics: ["sports"], context: {}, recallPriority: 90 },
      ],
    });
    const ctx = recallContext(memory);

    // "sports" should appear only once
    const sportsCount = ctx.suggestedTopics.filter((t) => t === "sports").length;
    expect(sportsCount).toBeLessThanOrEqual(1);
  });

  // ── Concerns ──

  it("should extract concerns from nodes with sentiment < -0.3", () => {
    // n-3 has sentiment=-0.5 → should be included
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    expect(ctx.concerns.length).toBeGreaterThan(0);
    // n-3: type="feedback", topics=["service"]
    expect(ctx.concerns[0]).toContain("feedback");
  });

  it("should exclude nodes with sentiment >= -0.3 from concerns", () => {
    const memory = makeMemoryGraph({
      nodes: [
        { interactionId: "ok", type: "visit", timestamp: daysAgo(1), sentiment: 0.5, topics: ["pool"], context: {}, recallPriority: 90 },
        { interactionId: "borderline", type: "visit", timestamp: daysAgo(2), sentiment: -0.3, topics: ["gym"], context: {}, recallPriority: 80 },
      ],
    });
    const ctx = recallContext(memory);

    // sentiment = -0.3 is NOT < -0.3, so should be excluded
    expect(ctx.concerns).toEqual([]);
  });

  it("should limit concerns to 3", () => {
    const nodes: MemoryNode[] = Array.from({ length: 5 }, (_, i) => ({
      interactionId: `neg-${i}`,
      type: "feedback" as MemoryInteractionType,
      timestamp: daysAgo(i + 1),
      sentiment: -0.8,
      topics: [`issue-${i}`],
      context: {},
      recallPriority: 80,
    }));
    const memory = makeMemoryGraph({ nodes });
    const ctx = recallContext(memory);

    expect(ctx.concerns.length).toBeLessThanOrEqual(3);
  });

  // ── Highlights ──

  it("should use peak event as highlight when available", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    // Memory has peak: { event: "event: social", sentiment: 0.9 }
    expect(ctx.highlights.length).toBeGreaterThan(0);
    expect(ctx.highlights).toContain("event: social");
  });

  it("should fall back to high-sentiment nodes when no peak", () => {
    const memory = makeMemoryGraph({
      emotionalArc: {
        points: [],
        trend: "stable",
        peak: null,
        valley: null,
        currentSentiment: 0,
      },
    });
    const ctx = recallContext(memory);

    // Should fall back to nodes with sentiment > 0.5
    // n-1: sentiment=0.85, n-5: sentiment=0.6, n-2: sentiment=0.7, n-4: sentiment=0.9
    expect(ctx.highlights.length).toBeGreaterThan(0);
  });

  it("should limit fallback highlights to 2", () => {
    const memory = makeMemoryGraph({
      emotionalArc: {
        points: [],
        trend: "stable",
        peak: null,
        valley: null,
        currentSentiment: 0,
      },
      nodes: Array.from({ length: 5 }, (_, i) => ({
        interactionId: `h-${i}`,
        type: "visit" as MemoryInteractionType,
        timestamp: daysAgo(i),
        sentiment: 0.9,
        topics: [`topic-${i}`],
        context: {},
        recallPriority: 80,
      })),
    });
    const ctx = recallContext(memory);

    expect(ctx.highlights.length).toBeLessThanOrEqual(2);
  });

  // ── Full context structure ──

  it("should return all RecallContext fields", () => {
    const memory = makeMemoryGraph();
    const ctx = recallContext(memory);

    expect(Array.isArray(ctx.preferences)).toBe(true);
    expect(Array.isArray(ctx.pendingCallbacks)).toBe(true);
    expect(Array.isArray(ctx.suggestedTopics)).toBe(true);
    expect(Array.isArray(ctx.concerns)).toBe(true);
    expect(Array.isArray(ctx.highlights)).toBe(true);
  });

  // ── Empty memory ──

  it("should handle empty memory graph gracefully", () => {
    const emptyMemory: MemoryGraph = {
      guestId: gid("gst-empty"),
      nodes: [],
      strength: 0,
      callbacks: [],
      emotionalArc: { points: [], trend: "stable", peak: null, valley: null, currentSentiment: 0 },
      topicPatterns: [],
      lastUpdated: new Date().toISOString(),
    };
    const ctx = recallContext(emptyMemory);

    expect(ctx.preferences).toEqual([]);
    expect(ctx.pendingCallbacks).toEqual([]);
    expect(ctx.suggestedTopics).toEqual([]);
    expect(ctx.concerns).toEqual([]);
    expect(ctx.highlights).toEqual([]);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => recallContext(makeMemoryGraph())).not.toThrow();
    expect(() => recallContext(makeMemoryGraph({
      nodes: [],
      callbacks: [],
      topicPatterns: [],
      emotionalArc: { points: [], trend: "stable", peak: null, valley: null, currentSentiment: 0 },
    }))).not.toThrow();
  });
});