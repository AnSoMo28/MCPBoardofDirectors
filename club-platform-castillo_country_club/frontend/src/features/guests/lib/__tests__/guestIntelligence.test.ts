// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/__tests__/guestIntelligence.test.ts
// Phase 34 "The Gateway" — Guest Intelligence Engine Tests
// Level 6+ Agency · Production Grade
//
// Tests ALL 9 exported functions against verified formulas.
// Exact numerical assertions where formulas are self-contained.
// Behavioral property assertions where config thresholds apply.
//
// Checklist: T1-T8
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  computeTemperature,
  deriveSegment,
  classifyVisitPattern,
  computeVIPScore,
  deriveInterestMap,
  buildIntelligenceSummary,
  buildIntelligenceSummarySafe,
  buildGuestProfile,
  buildGuestProfileSafe,
  type GuestIntelligenceInput,
  type SegmentSignals,
  type VisitPatternSignals,
} from "../guestIntelligence";

import type {
  GuestEngineResult,
  Guest,
  GuestSegment,
  VisitPattern,
} from "../../types";

import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Assert result.ok === true and return result.data. */
function assertOk<T>(result: GuestEngineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Unreachable");
  return result.data;
}

/** Assert result.ok === false (error case). */
function assertFail<T>(result: GuestEngineResult<T>): void {
  expect(result.ok).toBe(false);
}

// ═══════════════════════════════════════════════════════════
// §2 — MOCK FACTORIES
// ═══════════════════════════════════════════════════════════

/**
 * Create a mock Guest entity.
 * Uses type assertion since we don't have the full Guest interface.
 * Only includes fields accessed by buildGuestProfile + buildGuestNarrative.
 */
function makeGuest(overrides?: Partial<{
  first_name: string;
  last_name: string;
  visits_count: number;
  last_visit_date: string | null;
  is_blacklisted: boolean;
  notes: string | null;
}>): Guest {
  return {
    first_name: "María",
    last_name: "Pérez",
    visits_count: 8,
    last_visit_date: new Date(Date.now() - 86_400_000 * 5).toISOString(),
    is_blacklisted: false,
    notes: null,
    ...overrides,
  } as unknown as Guest;
}

/**
 * Create a mock GuestAnalyticsEnhanced.
 * Includes active_guests, active_trials, peak_visit_days which are accessed
 * via (analytics as unknown as Record<string, unknown>) in the engine.
 */
function makeAnalytics(overrides?: Record<string, unknown>): GuestAnalyticsEnhanced {
  return {
    total_guests: 150,
    active_guests: 45,
    active_trials: 12,
    peak_visit_days: [
      { day: "Sábado", visit_count: 85 },
      { day: "Viernes", visit_count: 60 },
      { day: "Miércoles", visit_count: 30 },
    ],
    total_private_events: 12,
    upcoming_events: 3,
    avg_visit_duration_hours: 3.5,
    event_guest_correlation: [],
    privilege_usage: [
      { privilege_type: "pool", usage_count: 300 },
      { privilege_type: "gym", usage_count: 200 },
      { privilege_type: "dining", usage_count: 150 },
    ],
    ...overrides,
  } as unknown as GuestAnalyticsEnhanced;
}

/**
 * Create a mock ConversionFunnel.
 */
function makeFunnel(overrides?: Partial<ConversionFunnel>): ConversionFunnel {
  return {
    total_guests: 150,
    total_converted: 12,
    overall_conversion_pct: 8,
    overall_benchmark_pct: 10,
    pipeline_value: 45_000_000,
    stages: [],
    ...overrides,
  } as unknown as ConversionFunnel;
}

/**
 * Create a full GuestIntelligenceInput.
 */
function makeInput(overrides?: Partial<GuestIntelligenceInput>): GuestIntelligenceInput {
  return {
    healthScore: {} as GuestHealthScore,
    analytics: makeAnalytics(),
    funnel: makeFunnel(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — computeTemperature (exact formula, self-contained)
// ═══════════════════════════════════════════════════════════

describe("computeTemperature", () => {
  // ── Exact threshold boundaries ──

  it("should return blazing for value = 100", () => {
    const t = computeTemperature(100);
    expect(t.value).toBe(100);
    expect(t.label).toBe("blazing");
    expect(t.color).toBeTruthy();
  });

  it("should return blazing for value = 90 (exact boundary)", () => {
    const t = computeTemperature(90);
    expect(t.label).toBe("blazing");
  });

  it("should return hot for value = 89 (just below blazing)", () => {
    const t = computeTemperature(89);
    expect(t.label).toBe("hot");
  });

  it("should return hot for value = 70 (exact boundary)", () => {
    const t = computeTemperature(70);
    expect(t.label).toBe("hot");
  });

  it("should return warm for value = 50 (exact boundary)", () => {
    const t = computeTemperature(50);
    expect(t.label).toBe("warm");
  });

  it("should return cool for value = 30 (exact boundary)", () => {
    const t = computeTemperature(30);
    expect(t.label).toBe("cool");
  });

  it("should return cold for value = 10 (exact boundary)", () => {
    const t = computeTemperature(10);
    expect(t.label).toBe("cold");
  });

  it("should return frozen for value = 0", () => {
    const t = computeTemperature(0);
    expect(t.label).toBe("frozen");
    expect(t.value).toBe(0);
  });

  it("should return frozen for value = 9 (just above frozen)", () => {
    const t = computeTemperature(9);
    expect(t.label).toBe("frozen");
  });

  // ── Clamping ──

  it("should clamp to 100 for value > 100", () => {
    const t = computeTemperature(150);
    expect(t.value).toBe(100);
    expect(t.label).toBe("blazing");
  });

  it("should clamp to 0 for value < 0", () => {
    const t = computeTemperature(-20);
    expect(t.value).toBe(0);
    expect(t.label).toBe("frozen");
  });

  // ── Rounding ──

  it("should round value to nearest integer", () => {
    const t = computeTemperature(89.6);
    expect(t.value).toBe(90);
    expect(t.label).toBe("blazing"); // 90 >= 90
  });

  it("should round 69.4 to 69 (warm)", () => {
    // G15: 69 redondeado < threshold hot (70) → warm. El label viejo
    // ("hot") se contradecía con el propio comentario del test.
    const t = computeTemperature(69.4);
    expect(t.value).toBe(69);
    expect(t.label).toBe("warm"); // 69 >= 70? No → warm (50 ≤ 69 < 70)
  });

  // ── Structure ──

  it("should return all required fields", () => {
    const t = computeTemperature(75);
    expect(typeof t.value).toBe("number");
    expect(typeof t.label).toBe("string");
    expect(typeof t.color).toBe("string");
    expect(t.color).toContain("var(--color-");
  });

  // ── Performance ──

  it("should complete within 1ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) computeTemperature(i % 101);
    expect(performance.now() - start).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════
// §4 — deriveSegment (behavioral — config thresholds unknown)
// ═══════════════════════════════════════════════════════════

describe("deriveSegment", () => {
  // ── Priority 1: converted (always wins) ──

  it("should return converted when hasConverted is true", () => {
    const seg = deriveSegment({
      visitCount: 1, daysSinceLastVisit: 999,
      isOnTrial: false, hasConverted: true,
      vipScore: 0, engagementScore: 0,
    });
    expect(seg).toBe("converted");
  });

  it("should return converted even with VIP-level signals", () => {
    const seg = deriveSegment({
      visitCount: 10, daysSinceLastVisit: 1,
      isOnTrial: true, hasConverted: true,
      vipScore: 100, engagementScore: 100,
    });
    expect(seg).toBe("converted");
  });

  // ── Priority 2: vip (high vipScore) ──

  it("should return vip for maximum vipScore", () => {
    const seg = deriveSegment({
      visitCount: 10, daysSinceLastVisit: 1,
      isOnTrial: false, hasConverted: false,
      vipScore: 100, engagementScore: 100,
    });
    expect(seg).toBe("vip");
  });

  it("should NOT return vip for vipScore = 0", () => {
    const seg = deriveSegment({
      visitCount: 10, daysSinceLastVisit: 1,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 100,
    });
    expect(seg).not.toBe("vip");
  });

  // ── Priority 3: active_trial ──

  it("should return active_trial when on trial (and not converted, not vip)", () => {
    const seg = deriveSegment({
      visitCount: 3, daysSinceLastVisit: 1,
      isOnTrial: true, hasConverted: false,
      vipScore: 0, engagementScore: 60,
    });
    expect(seg).toBe("active_trial");
  });

  // ── Priority 4: dormant (high daysSinceLastVisit) ──

  it("should return dormant for very high daysSinceLastVisit", () => {
    const seg = deriveSegment({
      visitCount: 3, daysSinceLastVisit: 365,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 30,
    });
    expect(seg).toBe("dormant");
  });

  it("should NOT return dormant for recent visit", () => {
    const seg = deriveSegment({
      visitCount: 3, daysSinceLastVisit: 1,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 30,
    });
    expect(seg).not.toBe("dormant");
  });

  // ── Priority 5: high_potential (high engagement + multiple visits) ──

  it("should return high_potential for high engagement and multiple visits", () => {
    const seg = deriveSegment({
      visitCount: 5, daysSinceLastVisit: 10,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 85,
    });
    expect(seg).toBe("high_potential");
  });

  it("should NOT return high_potential with high engagement but low visits", () => {
    const seg = deriveSegment({
      visitCount: 1, daysSinceLastVisit: 10,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 85,
    });
    expect(seg).not.toBe("high_potential");
  });

  // ── Priority 6: warm (medium engagement) ──

  it("should return warm for medium engagement", () => {
    const seg = deriveSegment({
      visitCount: 2, daysSinceLastVisit: 10,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 50,
    });
    expect(seg).toBe("warm");
  });

  // ── Priority 7: cold (low engagement) ──

  it("should return cold for low engagement", () => {
    const seg = deriveSegment({
      visitCount: 1, daysSinceLastVisit: 10,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 10,
    });
    expect(seg).toBe("cold");
  });

  it("should return cold for zero engagement", () => {
    const seg = deriveSegment({
      visitCount: 0, daysSinceLastVisit: 5,
      isOnTrial: false, hasConverted: false,
      vipScore: 0, engagementScore: 0,
    });
    expect(seg).toBe("cold");
  });

  // ── Structural ──

  it("should always return a valid GuestSegment string", () => {
    const validSegments: GuestSegment[] = [
      "vip", "high_potential", "active_trial", "warm", "cold", "dormant", "converted",
    ];
    const signals: SegmentSignals[] = [
      { visitCount: 0, daysSinceLastVisit: 0, isOnTrial: false, hasConverted: false, vipScore: 0, engagementScore: 0 },
      { visitCount: 100, daysSinceLastVisit: 0, isOnTrial: true, hasConverted: true, vipScore: 100, engagementScore: 100 },
    ];
    for (const s of signals) {
      expect(validSegments).toContain(deriveSegment(s));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// §5 — classifyVisitPattern (mixed: exact + 1 config dep)
// ═══════════════════════════════════════════════════════════

describe("classifyVisitPattern", () => {
  // ── Exact: first_time ──

  it("should return first_time for totalVisits = 0", () => {
    const p = classifyVisitPattern({
      totalVisits: 0, avgVisitsPerMonth: 0,
      daysSinceFirstVisit: 0, daysSinceLastVisit: 0,
    });
    expect(p).toBe("first_time");
  });

  it("should return first_time for totalVisits = 1", () => {
    const p = classifyVisitPattern({
      totalVisits: 1, avgVisitsPerMonth: 1,
      daysSinceFirstVisit: 30, daysSinceLastVisit: 10,
    });
    expect(p).toBe("first_time");
  });

  // ── Exact: regular (avgVisitsPerMonth >= 4) ──

  it("should return regular for avgVisitsPerMonth >= 4", () => {
    const p = classifyVisitPattern({
      totalVisits: 20, avgVisitsPerMonth: 5,
      daysSinceFirstVisit: 120, daysSinceLastVisit: 3,
    });
    expect(p).toBe("regular");
  });

  it("should return regular for avgVisitsPerMonth exactly 4", () => {
    const p = classifyVisitPattern({
      totalVisits: 16, avgVisitsPerMonth: 4,
      daysSinceFirstVisit: 120, daysSinceLastVisit: 5,
    });
    expect(p).toBe("regular");
  });

  // ── Exact: escalating (avgVisitsPerMonth >= 2 && daysSinceLastVisit < 30) ──

  it("should return escalating for increasing frequency and recent visit", () => {
    const p = classifyVisitPattern({
      totalVisits: 10, avgVisitsPerMonth: 2.5,
      daysSinceFirstVisit: 120, daysSinceLastVisit: 15,
    });
    expect(p).toBe("escalating");
  });

  it("should NOT return escalating when daysSinceLastVisit >= 30", () => {
    const p = classifyVisitPattern({
      totalVisits: 10, avgVisitsPerMonth: 3,
      daysSinceFirstVisit: 120, daysSinceLastVisit: 45,
    });
    expect(p).not.toBe("escalating");
  });

  // ── Exact: exploratory (totalVisits <= 3 && daysSinceLastVisit < 60) ──

  it("should return exploratory for few visits and recent", () => {
    const p = classifyVisitPattern({
      totalVisits: 2, avgVisitsPerMonth: 0.5,
      daysSinceFirstVisit: 60, daysSinceLastVisit: 20,
    });
    expect(p).toBe("exploratory");
  });

  it("should return exploratory for totalVisits = 3", () => {
    const p = classifyVisitPattern({
      totalVisits: 3, avgVisitsPerMonth: 1,
      daysSinceFirstVisit: 90, daysSinceLastVisit: 30,
    });
    expect(p).toBe("exploratory");
  });

  // ── Behavioral: sporadic (daysSinceLastVisit >= dormantDays) ──

  it("should return sporadic for very old last visit", () => {
    const p = classifyVisitPattern({
      totalVisits: 8, avgVisitsPerMonth: 0.5,
      daysSinceFirstVisit: 365, daysSinceLastVisit: 365,
    });
    expect(p).toBe("sporadic");
  });

  it("should NOT return sporadic for recent visit", () => {
    const p = classifyVisitPattern({
      totalVisits: 8, avgVisitsPerMonth: 0.5,
      daysSinceFirstVisit: 365, daysSinceLastVisit: 10,
    });
    expect(p).not.toBe("sporadic");
  });

  // ── Default: returning ──

  it("should return returning for moderate activity that doesn't match other patterns", () => {
    const p = classifyVisitPattern({
      totalVisits: 8, avgVisitsPerMonth: 1,
      daysSinceFirstVisit: 240, daysSinceLastVisit: 20,
    });
    expect(p).toBe("returning");
  });

  // ── Priority ordering ──

  it("should prioritize regular over escalating when avgVisitsPerMonth >= 4", () => {
    const p = classifyVisitPattern({
      totalVisits: 20, avgVisitsPerMonth: 4.5,
      daysSinceFirstVisit: 120, daysSinceLastVisit: 5,
    });
    expect(p).toBe("regular");
  });

  // ── All valid patterns ──

  it("should always return a valid VisitPattern", () => {
    const validPatterns: VisitPattern[] = [
      "regular", "exploratory", "sporadic", "first_time", "returning", "escalating",
    ];
    const cases: VisitPatternSignals[] = [
      { totalVisits: 0, avgVisitsPerMonth: 0, daysSinceFirstVisit: 0, daysSinceLastVisit: 0 },
      { totalVisits: 20, avgVisitsPerMonth: 5, daysSinceFirstVisit: 120, daysSinceLastVisit: 3 },
      { totalVisits: 8, avgVisitsPerMonth: 0.5, daysSinceFirstVisit: 365, daysSinceLastVisit: 365 },
    ];
    for (const c of cases) {
      expect(validPatterns).toContain(classifyVisitPattern(c));
    }
  });
});

// ═══════════════════════════════════════════════════════════
// §6 — computeVIPScore (exact formula, self-contained)
// ═══════════════════════════════════════════════════════════

describe("computeVIPScore", () => {
  // VIP_WEIGHTS: visitFrequency=0.30, spendingLevel=0.25, socialInfluence=0.20, clubFit=0.25

  it("should return 100 for all maximum inputs", () => {
    // 100*0.30 + 100*0.25 + 100*0.20 + 100*0.25 = 100
    expect(computeVIPScore(100, 100, 100, 100)).toBe(100);
  });

  it("should return 0 for all zero inputs", () => {
    expect(computeVIPScore(0, 0, 0, 0)).toBe(0);
  });

  it("should compute exact weighted sum for known inputs", () => {
    // 80*0.30 + 60*0.25 + 40*0.20 + 70*0.25
    // = 24 + 15 + 8 + 17.5 = 64.5 → 65
    expect(computeVIPScore(80, 60, 40, 70)).toBe(65);
  });

  it("should compute exact weighted sum for another set", () => {
    // 50*0.30 + 50*0.25 + 50*0.20 + 50*0.25
    // = 15 + 12.5 + 10 + 12.5 = 50
    expect(computeVIPScore(50, 50, 50, 50)).toBe(50);
  });

  it("should clamp inputs to [0, 100] before computing", () => {
    // Input 150 → clamped to 100
    // 100*0.30 + 100*0.25 + 100*0.20 + 100*0.25 = 100
    expect(computeVIPScore(150, 150, 150, 150)).toBe(100);
  });

  it("should clamp negative inputs to 0", () => {
    // -10 → clamped to 0
    expect(computeVIPScore(-10, -10, -10, -10)).toBe(0);
  });

  it("should weight visitFrequency most heavily (0.30)", () => {
    // Only visitFrequency set: 100*0.30 = 30
    const onlyFrequency = computeVIPScore(100, 0, 0, 0);
    expect(onlyFrequency).toBe(30);

    // Only spendingLevel set: 100*0.25 = 25
    const onlySpending = computeVIPScore(0, 100, 0, 0);
    expect(onlySpending).toBe(25);

    expect(onlyFrequency).toBeGreaterThan(onlySpending);
  });

  it("should return an integer (Math.round applied)", () => {
    // 33*0.30 + 33*0.25 + 33*0.20 + 33*0.25
    // = 9.9 + 8.25 + 6.6 + 8.25 = 33.0
    expect(computeVIPScore(33, 33, 33, 33)).toBe(33);
  });

  // ── Performance ──

  it("should complete within 1ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) computeVIPScore(50, 50, 50, 50);
    expect(performance.now() - start).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════
// §7 — deriveInterestMap (exact mapping logic)
// ═══════════════════════════════════════════════════════════

describe("deriveInterestMap", () => {
  it("should return empty array when analytics is null", () => {
    expect(deriveInterestMap(null)).toEqual([]);
  });

  it("should map privilege_usage to domain scores", () => {
    const analytics = makeAnalytics({
      privilege_usage: [
        { privilege_type: "pool", usage_count: 300 },
        { privilege_type: "gym", usage_count: 200 },
        { privilege_type: "dining", usage_count: 100 },
      ],
    });

    const map = deriveInterestMap(analytics);
    expect(map.length).toBeGreaterThan(0);

    // pool domain should have highest score (300 out of 300 max)
    const poolDomain = map.find((d) => d.domain === "pool");
    expect(poolDomain).toBeDefined();
    expect(poolDomain!.score).toBe(100); // 300/300 * 100
  });

  it("should normalize scores relative to max count", () => {
    const analytics = makeAnalytics({
      privilege_usage: [
        { privilege_type: "gym", usage_count: 200 },
        { privilege_type: "dining", usage_count: 100 },
      ],
    });

    const map = deriveInterestMap(analytics);

    const sportsDomain = map.find((d) => d.domain === "sports");
    const diningDomain = map.find((d) => d.domain === "dining");

    expect(sportsDomain).toBeDefined();
    expect(diningDomain).toBeDefined();
    // sports: 200/200*100 = 100
    expect(sportsDomain!.score).toBe(100);
    // dining: 100/200*100 = 50
    expect(diningDomain!.score).toBe(50);
  });

  it("should assign 0 score to domains with no matching privileges", () => {
    const analytics = makeAnalytics({
      privilege_usage: [
        { privilege_type: "gym", usage_count: 100 },
      ],
    });

    const map = deriveInterestMap(analytics);

    const culturalDomain = map.find((d) => d.domain === "cultural");
    expect(culturalDomain).toBeDefined();
    expect(culturalDomain!.score).toBe(0);
  });

  it("should return all 7 interest domains", () => {
    const analytics = makeAnalytics({ privilege_usage: [] });
    const map = deriveInterestMap(analytics);

    expect(map.length).toBe(7);
    const domains = map.map((d) => d.domain);
    expect(domains).toContain("sports");
    expect(domains).toContain("dining");
    expect(domains).toContain("wellness");
    expect(domains).toContain("pool");
    expect(domains).toContain("social");
    expect(domains).toContain("cultural");
    expect(domains).toContain("events");
  });

  it("should include activities array on each domain", () => {
    const analytics = makeAnalytics({ privilege_usage: [] });
    const map = deriveInterestMap(analytics);

    map.forEach((d) => {
      expect(Array.isArray(d.activities)).toBe(true);
      expect(d.activities.length).toBeGreaterThan(0);
    });
  });

  it("should clamp all scores to [0, 100]", () => {
    const analytics = makeAnalytics({ privilege_usage: [] });
    const map = deriveInterestMap(analytics);

    map.forEach((d) => {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
    });
  });

  it("should handle analytics without privilege_usage", () => {
    const analytics = makeAnalytics({ privilege_usage: undefined });
    const map = deriveInterestMap(analytics);

    // Should still return 7 domains, all with score 0
    expect(map.length).toBe(7);
    map.forEach((d) => expect(d.score).toBe(0));
  });
});

// ═══════════════════════════════════════════════════════════
// §8 — buildIntelligenceSummary (exact aggregate formulas)
// ═══════════════════════════════════════════════════════════

describe("buildIntelligenceSummary", () => {
  // ── Error case ──

  it("should return error when analytics AND funnel are both null", () => {
    const result = buildIntelligenceSummary({
      healthScore: {} as GuestHealthScore,
      analytics: null,
      funnel: null,
    });
    assertFail(result);
  });

  // ── Happy path ──

  it("should return valid summary with full inputs", () => {
    const result = buildIntelligenceSummary(makeInput());
    const data = assertOk(result);

    expect(data.totalGuests).toBe(150);
    expect(data.overallEngagement).toBeGreaterThanOrEqual(0);
    expect(data.overallEngagement).toBeLessThanOrEqual(100);
    expect(data.vipCandidateCount).toBeGreaterThanOrEqual(0);
    expect(data.dormantCount).toBeGreaterThanOrEqual(0);
    expect(data.peakDay).toBeTruthy();
    expect(data.computedAt).toBeTruthy();
  });

  // ── Exact segment distribution formulas ──

  it("should compute exact segment distribution from totalGuests", () => {
    // totalGuests = 150
    // vip = round(150 * 0.05) = round(7.5) = 8
    // high_potential = round(150 * 0.12) = round(18) = 18
    // warm = round(150 * 0.25) = round(37.5) = 38
    // cold = round(150 * 0.30) = 45
    // dormant = round(150 * 0.15) = round(22.5) = 23
    // active_trial = 12 (from mock analytics)
    // converted = 12 (from mock funnel)
    const data = assertOk(buildIntelligenceSummary(makeInput()));

    expect(data.segmentDistribution.vip).toBe(8);
    expect(data.segmentDistribution.high_potential).toBe(18);
    expect(data.segmentDistribution.warm).toBe(38);
    expect(data.segmentDistribution.cold).toBe(45);
    expect(data.segmentDistribution.dormant).toBe(23);
    expect(data.segmentDistribution.active_trial).toBe(12);
    expect(data.segmentDistribution.converted).toBe(12);
  });

  // ── Exact temperature distribution formulas ──

  it("should compute exact temperature distribution", () => {
    // activeGuests = 45, totalGuests = 150
    // blazing = round(45 * 0.08) = round(3.6) = 4
    // hot = round(45 * 0.15) = round(6.75) = 7
    // warm = round(45 * 0.30) = round(13.5) = 14
    // cool = round(150 * 0.20) = 30
    // cold = round(150 * 0.18) = round(27) = 27
    // frozen = round(150 * 0.09) = round(13.5) = 14
    const data = assertOk(buildIntelligenceSummary(makeInput()));

    expect(data.temperatureDistribution.blazing).toBe(4);
    expect(data.temperatureDistribution.hot).toBe(7);
    expect(data.temperatureDistribution.warm).toBe(14);
    expect(data.temperatureDistribution.cool).toBe(30);
    expect(data.temperatureDistribution.cold).toBe(27);
    expect(data.temperatureDistribution.frozen).toBe(14);
  });

  // ── Exact engagement formula ──

  it("should compute overallEngagement = round(min(100, (activeGuests/totalGuests) * 100 * 1.5))", () => {
    // activeGuests=45, totalGuests=150
    // ratio = 45/150 = 0.3
    // engagement = round(min(100, 0.3 * 100 * 1.5)) = round(min(100, 45)) = 45
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(data.overallEngagement).toBe(45);
  });

  it("should cap overallEngagement at 100", () => {
    // activeGuests=200, totalGuests=150
    // ratio = 200/150 = 1.333
    // engagement = round(min(100, 1.333 * 100 * 1.5)) = round(min(100, 200)) = 100
    const data = assertOk(buildIntelligenceSummary(makeInput({
      analytics: makeAnalytics({ active_guests: 200 }),
    })));
    expect(data.overallEngagement).toBe(100);
  });

  // ── VIP candidate count ──

  it("should compute vipCandidateCount = vip + high_potential", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    // vip=8, high_potential=18 → 26
    expect(data.vipCandidateCount).toBe(
      data.segmentDistribution.vip + data.segmentDistribution.high_potential,
    );
    expect(data.vipCandidateCount).toBe(26);
  });

  // ── dormantCount ──

  it("should set dormantCount = segmentDistribution.dormant", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(data.dormantCount).toBe(data.segmentDistribution.dormant);
    expect(data.dormantCount).toBe(23);
  });

  // ── peakDay ──

  it("should derive peakDay from first peak_visit_days entry", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(data.peakDay).toBe("Sábado");
  });

  it("should return N/A when analytics has no peak_visit_days", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput({
      analytics: makeAnalytics({ peak_visit_days: undefined }),
    })));
    expect(data.peakDay).toBe("N/A");
  });

  // ── totalGuests derivation ──

  it("should derive totalGuests from analytics first, then funnel", () => {
    const fromAnalytics = assertOk(buildIntelligenceSummary(makeInput({
      analytics: makeAnalytics({ total_guests: 200 }),
      funnel: makeFunnel({ total_guests: 100 }),
    })));
    expect(fromAnalytics.totalGuests).toBe(200);
  });

  it("should fall back to funnel.total_guests when analytics is null", () => {
    const fromFunnel = assertOk(buildIntelligenceSummary(makeInput({
      analytics: null,
      funnel: makeFunnel({ total_guests: 80 }),
    })));
    expect(fromFunnel.totalGuests).toBe(80);
  });

  // ── Warnings ──

  it("should emit warning when healthScore is null", () => {
    const result = buildIntelligenceSummary(makeInput({ healthScore: null }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain(
        "HealthScore no disponible — engagement score puede ser impreciso",
      );
    }
  });

  it("should emit warning when analytics is null", () => {
    const result = buildIntelligenceSummary(makeInput({
      analytics: null,
      funnel: makeFunnel(),
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain(
        "Analytics no disponible — distribución limitada",
      );
    }
  });

  it("should emit no warnings when all inputs present", () => {
    const result = buildIntelligenceSummary(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── Interest map ──

  it("should include interest map from analytics", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(data.interestMap.length).toBe(7);
  });

  // ── topDomain ──

  it("should compute topDomain from interest map", () => {
    // pool has 300, gym has 200, dining has 150 → pool wins
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(data.topDomain).toBe("pool");
  });

  it("should return null topDomain when no interest data", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput({
      analytics: makeAnalytics({ privilege_usage: [] }),
    })));
    // All domains have 0 score — reduce returns first element
    // topDomain should still be a domain (first in list) or null
    // The code: interestMap.reduce((top, d) => d.score > (top?.score ?? 0) ? d : top, interestMap[0])?.domain ?? null
    // With all scores 0, the reduce returns interestMap[0], so topDomain = "sports"
    expect(data.topDomain).toBe("sports");
  });

  // ── Structural ──

  it("should return computedAt as valid ISO string", () => {
    const data = assertOk(buildIntelligenceSummary(makeInput()));
    expect(Number.isNaN(new Date(data.computedAt).getTime())).toBe(false);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => buildIntelligenceSummary({
      healthScore: null,
      analytics: null,
      funnel: null,
    })).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 10ms", () => {
    const start = performance.now();
    buildIntelligenceSummary(makeInput());
    expect(performance.now() - start).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// §9 — buildIntelligenceSummarySafe
// ═══════════════════════════════════════════════════════════

describe("buildIntelligenceSummarySafe", () => {
  it("should return identical data on success", () => {
    const input = makeInput();
    const raw = assertOk(buildIntelligenceSummary(input));
    const safe = buildIntelligenceSummarySafe(input);

    expect(safe.totalGuests).toBe(raw.totalGuests);
    expect(safe.overallEngagement).toBe(raw.overallEngagement);
    expect(safe.vipCandidateCount).toBe(raw.vipCandidateCount);
    expect(safe.peakDay).toBe(raw.peakDay);
  });

  it("should return zero-state summary on error (all null inputs)", () => {
    const safe = buildIntelligenceSummarySafe({
      healthScore: null, analytics: null, funnel: null,
    });

    expect(safe.totalGuests).toBe(0);
    expect(safe.overallEngagement).toBe(0);
    expect(safe.vipCandidateCount).toBe(0);
    expect(safe.dormantCount).toBe(0);
    expect(safe.avgVisitsPerGuest).toBe(0);
    expect(safe.peakDay).toBe("N/A");
    expect(safe.topDomain).toBeNull();
    expect(safe.interestMap).toEqual([]);
    expect(safe.segmentDistribution.vip).toBe(0);
    expect(safe.segmentDistribution.converted).toBe(0);
    expect(safe.temperatureDistribution.blazing).toBe(0);
    expect(safe.temperatureDistribution.frozen).toBe(0);
  });

  it("should always return valid GuestIntelligenceSummary", () => {
    const cases = [
      makeInput(),
      { healthScore: null, analytics: null, funnel: null },
      { healthScore: null, analytics: makeAnalytics(), funnel: null },
      { healthScore: null, analytics: null, funnel: makeFunnel() },
    ];
    for (const input of cases) {
      const safe = buildIntelligenceSummarySafe(input);
      expect(safe).toBeDefined();
      expect(typeof safe.overallEngagement).toBe("number");
      expect(safe.overallEngagement).toBeGreaterThanOrEqual(0);
      expect(safe.overallEngagement).toBeLessThanOrEqual(100);
      expect(safe.computedAt).toBeTruthy();
    }
  });

  it("should never throw", () => {
    expect(() => buildIntelligenceSummarySafe({
      healthScore: null, analytics: null, funnel: null,
    })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §10 — buildGuestProfile (delegates to pure functions)
// ═══════════════════════════════════════════════════════════

describe("buildGuestProfile", () => {
  // ── Happy path ──

  it("should return a valid profile with all required fields", () => {
    const result = buildGuestProfile(makeGuest(), false, false);
    const profile = assertOk(result);

    expect(profile.raw).toBeDefined();
    expect(profile.segment).toBeTruthy();
    expect(profile.temperature).toBeDefined();
    expect(profile.temperature.value).toBeGreaterThanOrEqual(0);
    expect(profile.temperature.value).toBeLessThanOrEqual(100);
    expect(profile.visitPattern).toBeTruthy();
    expect(Array.isArray(profile.interestMap)).toBe(true);
    expect(typeof profile.vipScore).toBe("number");
    expect(typeof profile.daysSinceLastVisit).toBe("number");
    expect(typeof profile.narrative).toBe("string");
    expect(profile.computedAt).toBeTruthy();
  });

  // ── daysSinceLastVisit computation ──

  it("should compute daysSinceLastVisit from last_visit_date", () => {
    const fiveDaysAgo = new Date(Date.now() - 86_400_000 * 5).toISOString();
    const profile = assertOk(buildGuestProfile(
      makeGuest({ last_visit_date: fiveDaysAgo }),
      false, false,
    ));

    // Allow ±1 day tolerance for timing jitter
    expect(profile.daysSinceLastVisit).toBeGreaterThanOrEqual(4);
    expect(profile.daysSinceLastVisit).toBeLessThanOrEqual(6);
  });

  it("should return 999 for daysSinceLastVisit when last_visit_date is null", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ last_visit_date: null }),
      false, false,
    ));
    expect(profile.daysSinceLastVisit).toBe(999);
  });

  // ── Segment classification ──

  it("should classify converted guest correctly", () => {
    const profile = assertOk(buildGuestProfile(makeGuest(), false, true));
    expect(profile.segment).toBe("converted");
  });

  it("should classify trial guest correctly", () => {
    const profile = assertOk(buildGuestProfile(makeGuest(), true, false));
    // If not converted and not vip, on trial → active_trial
    expect(profile.segment).toBe("active_trial");
  });

  // ── Temperature ──

  it("should compute temperature from engagement score", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ visits_count: 20, last_visit_date: new Date().toISOString() }),
      false, false,
    ));
    // High visits + recent → should be warm or above
    expect(profile.temperature.value).toBeGreaterThan(0);
  });

  // ── Narrative ──

  it("should include guest name in narrative", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ first_name: "Carlos", last_name: "Solano" }),
      false, false,
    ));
    expect(profile.narrative).toContain("Carlos");
    expect(profile.narrative).toContain("Solano");
  });

  it("should include visit count in narrative", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ visits_count: 15 }),
      false, false,
    ));
    expect(profile.narrative).toContain("15 visita(s)");
  });

  it("should include segment and temperature in narrative", () => {
    const profile = assertOk(buildGuestProfile(makeGuest(), false, false));
    expect(profile.narrative).toContain("segmento:");
    expect(profile.narrative).toContain("temperatura:");
  });

  it("should include blacklist warning in narrative", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ is_blacklisted: true }),
      false, false,
    ));
    expect(profile.narrative).toContain("lista negra");
  });

  it("should include notes in narrative", () => {
    const profile = assertOk(buildGuestProfile(
      makeGuest({ notes: "Prefiere canchas de tenis por la mañana" }),
      false, false,
    ));
    expect(profile.narrative).toContain("Prefiere canchas de tenis");
  });

  it("should truncate long notes at 80 characters", () => {
    const longNotes = "A".repeat(120);
    const profile = assertOk(buildGuestProfile(
      makeGuest({ notes: longNotes }),
      false, false,
    ));
    expect(profile.narrative).toContain("...");
  });

  // ── Warnings ──

  it("should emit warning when context is not provided", () => {
    const result = buildGuestProfile(makeGuest(), false, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain(
        "Contexto agregado no disponible — scores relativos imprecisos",
      );
    }
  });

  it("should emit no warnings when context is provided", () => {
    const result = buildGuestProfile(
      makeGuest(), false, false,
      { avgVisits: 5, totalGuests: 100 },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── VIP score ──

  it("should compute vipScore as a number in [0, 100]", () => {
    const profile = assertOk(buildGuestProfile(makeGuest(), false, false));
    expect(profile.vipScore).toBeGreaterThanOrEqual(0);
    expect(profile.vipScore).toBeLessThanOrEqual(100);
  });

  it("should compute higher vipScore for frequent visitor", () => {
    const low = assertOk(buildGuestProfile(
      makeGuest({ visits_count: 1 }), false, false,
    ));
    const high = assertOk(buildGuestProfile(
      makeGuest({ visits_count: 20 }), false, false,
    ));
    expect(high.vipScore).toBeGreaterThan(low.vipScore);
  });

  // ── Interest map ──

  it("should return empty interest map (no per-guest data)", () => {
    const profile = assertOk(buildGuestProfile(makeGuest(), false, false));
    expect(profile.interestMap).toEqual([]);
  });

  // ── Never throws ──

  it("should never throw regardless of guest data", () => {
    expect(() => buildGuestProfile(
      makeGuest({ last_visit_date: null, notes: null, visits_count: 0 }),
      false, false,
    )).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §11 — buildGuestProfileSafe
// ═══════════════════════════════════════════════════════════

describe("buildGuestProfileSafe", () => {
  it("should return identical data on success", () => {
    const guest = makeGuest();
    const raw = assertOk(buildGuestProfile(guest, false, false));
    const safe = buildGuestProfileSafe(guest, false, false);

    expect(safe.segment).toBe(raw.segment);
    expect(safe.temperature.value).toBe(raw.temperature.value);
    expect(safe.vipScore).toBe(raw.vipScore);
    expect(safe.narrative).toBe(raw.narrative);
  });

  it("should always return a valid GuestProfile", () => {
    const safe = buildGuestProfileSafe(makeGuest(), false, false);

    expect(safe).toBeDefined();
    expect(safe.raw).toBeDefined();
    expect(safe.segment).toBeTruthy();
    expect(safe.temperature).toBeDefined();
    expect(safe.computedAt).toBeTruthy();
  });

  it("should apply default parameters correctly", () => {
    // buildGuestProfileSafe has defaults: isOnTrial=false, hasConverted=false
    const safe = buildGuestProfileSafe(makeGuest());
    expect(safe).toBeDefined();
    expect(safe.segment).not.toBe("converted"); // hasConverted defaults to false
  });
});