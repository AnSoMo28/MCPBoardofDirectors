// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/__tests__/conversionChemistry.test.ts
// Phase 34 "The Gateway" — Conversion Chemistry Engine Tests
// Level 6+ Agency · Production Grade
//
// Tests ALL 7 exported functions against verified formulas.
// Exact numerical assertions where formulas are self-contained.
// Behavioral property assertions where config weights apply.
//
// Checklist: T1-T8
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  computeChemistry,
  computeChemistrySafe,
  matchSponsors,
  matchSponsorsSafe,
  analyzeFirstImpression,
  analyzeFirstImpressionSafe,
  predictConversion,
} from "../conversionChemistry";

import type {
  GuestChemistrySignals,
  SponsorSignals,
  ClubPersonality,
  FirstImpressionInput,
} from "../conversionChemistry";

import type {
  GuestId,
  ChemistryScore,
  FirstImpressionAnalysis,
  GuestEngineResult,
} from "../../types";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Create a branded GuestId without importing the constructor. */
function gid(raw: string): GuestId {
  return raw as unknown as GuestId;
}

/** Assert result.ok === true and return result.data. */
function assertOk<T>(result: GuestEngineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Unreachable");
  return result.data;
}

// ═══════════════════════════════════════════════════════════
// §2 — MOCK FACTORIES (exact field coverage)
// ═══════════════════════════════════════════════════════════

function makeGuest(overrides?: Partial<GuestChemistrySignals>): GuestChemistrySignals {
  return {
    guestId: gid("gst-001"),
    interests: ["sports", "dining", "pool"],
    visitCount: 8,
    avgDurationHours: 3.5,
    preferredTime: "evening",
    socialConnections: 2,
    feedbackScore: 85,
    ...overrides,
  };
}

function makeSponsor(overrides?: Partial<SponsorSignals>): SponsorSignals {
  return {
    memberId: "mbr-001",
    memberName: "Carlos Solano",
    interests: ["sports", "wellness"],
    availability: "evening",
    pastGuestsSponsored: 5,
    pastConversions: 3,
    avgGuestSatisfaction: 10, // Low to avoid clamping (see note below)
    ...overrides,
  };
}

function makeClub(overrides?: Partial<ClubPersonality>): ClubPersonality {
  return {
    strengths: ["sports", "social", "dining"],
    atmosphere: "relaxed",
    peakHours: "evening",
    avgGuestSatisfaction: 78,
    ...overrides,
  };
}

function makeImpression(overrides?: Partial<FirstImpressionInput>): FirstImpressionInput {
  return {
    guestId: gid("gst-001"),
    visitId: "visit-001",
    welcomeMinutes: 3,
    activityMatchScore: 85,
    socialInteractionCount: 4,
    environmentScore: 90,
    departureScore: 80,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — computeChemistry
// ═══════════════════════════════════════════════════════════

describe("computeChemistry", () => {
  // ── Formula verification: exact dimension values ──

  it("should compute guestClubFit from interest overlap", () => {
    // interests: ["sports","dining","pool"], strengths: ["sports","social","dining"]
    // shared: ["sports","dining"] → 2/3 * 100 = 66.67 → 67
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.dimensions.guestClubFit).toBe(67);
  });

  it("should compute guestClubFit = 100 when all interests match", () => {
    const result = assertOk(computeChemistry(
      makeGuest({ interests: ["sports", "dining"] }),
      makeClub({ strengths: ["sports", "dining", "wellness"] }),
    ));
    expect(result.dimensions.guestClubFit).toBe(100);
  });

  it("should compute guestClubFit = 0 when no interests match", () => {
    const result = assertOk(computeChemistry(
      makeGuest({ interests: ["cultural"] }),
      makeClub({ strengths: ["sports", "dining"] }),
    ));
    expect(result.dimensions.guestClubFit).toBe(0);
  });

  it("should compute guestClubFit = 50 when guest has no interests", () => {
    const result = assertOk(computeChemistry(
      makeGuest({ interests: [] }),
      makeClub(),
    ));
    expect(result.dimensions.guestClubFit).toBe(50);
  });

  it("should always set guestSponsorFit = 50 (placeholder)", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.dimensions.guestSponsorFit).toBe(50);
  });

  it("should compute activityAlignment = min(100, visitCount*12 + avgDurationHours*8)", () => {
    // 8*12 + 3.5*8 = 96 + 28 = 124 → min(100, 124) = 100
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.dimensions.activityAlignment).toBe(100);
  });

  it("should compute activityAlignment for low engagement", () => {
    // 2*12 + 1.5*8 = 24 + 12 = 36
    const result = assertOk(computeChemistry(
      makeGuest({ visitCount: 2, avgDurationHours: 1.5 }),
      makeClub(),
    ));
    expect(result.dimensions.activityAlignment).toBe(36);
  });

  it("should compute activityAlignment = 0 for zero engagement", () => {
    const result = assertOk(computeChemistry(
      makeGuest({ visitCount: 0, avgDurationHours: 0 }),
      makeClub(),
    ));
    expect(result.dimensions.activityAlignment).toBe(0);
  });

  it("should compute socialResonance with relaxed atmosphere bonus", () => {
    // 2*15 + 30 (visitCount>=3) + 15 (relaxed) = 30 + 30 + 15 = 75
    const result = assertOk(computeChemistry(makeGuest(), makeClub({ atmosphere: "relaxed" })));
    expect(result.dimensions.socialResonance).toBe(75);
  });

  it("should compute socialResonance with formal atmosphere", () => {
    // 2*15 + 30 + 5 (not relaxed) = 65
    const result = assertOk(computeChemistry(makeGuest(), makeClub({ atmosphere: "formal" })));
    expect(result.dimensions.socialResonance).toBe(65);
  });

  it("should compute socialResonance with no social connections", () => {
    // 0*15 + 0 (visitCount<3) + 5 (formal) = 5
    const result = assertOk(computeChemistry(
      makeGuest({ socialConnections: 0, visitCount: 1 }),
      makeClub({ atmosphere: "formal" }),
    ));
    expect(result.dimensions.socialResonance).toBe(5);
  });

  it("should clamp socialResonance at 100", () => {
    // 5*15 + 30 + 15 = 120 → 100
    const result = assertOk(computeChemistry(
      makeGuest({ socialConnections: 5, visitCount: 5 }),
      makeClub({ atmosphere: "relaxed" }),
    ));
    expect(result.dimensions.socialResonance).toBe(100);
  });

  it("should compute temporalFit with feedback (always high for realistic scores)", () => {
    // min(100, round(85*18 + 8*5)) = min(100, 1530+40) = 100
    const result = assertOk(computeChemistry(makeGuest({ feedbackScore: 85 }), makeClub()));
    expect(result.dimensions.temporalFit).toBe(100);
  });

  it("should compute temporalFit with low feedback", () => {
    // min(100, round(3*18 + 1*5)) = min(100, 54+5) = 59
    const result = assertOk(computeChemistry(
      makeGuest({ feedbackScore: 3, visitCount: 1 }),
      makeClub(),
    ));
    expect(result.dimensions.temporalFit).toBe(59);
  });

  it("should compute temporalFit without feedback (null)", () => {
    // min(100, round(30 + 4*8)) = min(100, 30+32) = 62
    const result = assertOk(computeChemistry(
      makeGuest({ feedbackScore: null, visitCount: 4 }),
      makeClub(),
    ));
    expect(result.dimensions.temporalFit).toBe(62);
  });

  it("should compute temporalFit without feedback and zero visits", () => {
    // min(100, round(30 + 0*8)) = 30
    const result = assertOk(computeChemistry(
      makeGuest({ feedbackScore: null, visitCount: 0 }),
      makeClub(),
    ));
    expect(result.dimensions.temporalFit).toBe(30);
  });

  // ── Confidence computation ──

  it("should compute confidence = 100 for complete data", () => {
    // 60 + 10 (visits>=3) + 15 (feedback) + 10 (social>0) + 5 (interests>=2) = 100
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.confidence).toBe(100);
  });

  it("should compute confidence = 60 for minimal data", () => {
    // 60 + 0 + 0 + 0 + 0 = 60
    const result = assertOk(computeChemistry(
      makeGuest({ visitCount: 1, feedbackScore: null, socialConnections: 0, interests: ["sports"] }),
      makeClub(),
    ));
    expect(result.confidence).toBe(60);
  });

  it("should add 15 to confidence when feedback is present", () => {
    const withFeedback = assertOk(computeChemistry(
      makeGuest({ feedbackScore: 50, visitCount: 1, socialConnections: 0, interests: ["sports"] }),
      makeClub(),
    ));
    const withoutFeedback = assertOk(computeChemistry(
      makeGuest({ feedbackScore: null, visitCount: 1, socialConnections: 0, interests: ["sports"] }),
      makeClub(),
    ));
    expect(withFeedback.confidence - withoutFeedback.confidence).toBe(15);
  });

  // ── Warnings ──

  it("should emit warning when feedbackScore is null", () => {
    const result = computeChemistry(
      makeGuest({ feedbackScore: null }),
      makeClub(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("Sin feedback del guest — temporalFit estimado");
    }
  });

  it("should emit no warnings when feedbackScore is present", () => {
    const result = computeChemistry(
      makeGuest({ feedbackScore: 80 }),
      makeClub(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── Structural integrity ──

  it("should include all required fields on ChemistryScore", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.guestId).toBe("gst-001");
    expect(typeof result.overall).toBe("number");
    expect(result.dimensions).toBeDefined();
    expect(result.topSponsor).toBeNull(); // Always null in computeChemistry
    expect(typeof result.confidence).toBe("number");
    expect(result.computedAt).toBeTruthy();
  });

  it("should return computedAt as valid ISO string", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    const parsed = new Date(result.computedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  // ── Range validation ──

  it("should clamp all dimension scores to [0, 100]", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    const dims = result.dimensions;
    expect(dims.guestClubFit).toBeGreaterThanOrEqual(0);
    expect(dims.guestClubFit).toBeLessThanOrEqual(100);
    expect(dims.guestSponsorFit).toBeGreaterThanOrEqual(0);
    expect(dims.guestSponsorFit).toBeLessThanOrEqual(100);
    expect(dims.activityAlignment).toBeGreaterThanOrEqual(0);
    expect(dims.activityAlignment).toBeLessThanOrEqual(100);
    expect(dims.socialResonance).toBeGreaterThanOrEqual(0);
    expect(dims.socialResonance).toBeLessThanOrEqual(100);
    expect(dims.temporalFit).toBeGreaterThanOrEqual(0);
    expect(dims.temporalFit).toBeLessThanOrEqual(100);
  });

  it("should clamp overall score to [0, 100]", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("should clamp confidence to [0, 100]", () => {
    const result = assertOk(computeChemistry(makeGuest(), makeClub()));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  // ── Behavioral properties ──

  it("should produce higher activityAlignment with more visits", () => {
    const low = assertOk(computeChemistry(makeGuest({ visitCount: 1 }), makeClub()));
    const high = assertOk(computeChemistry(makeGuest({ visitCount: 10 }), makeClub()));
    expect(high.dimensions.activityAlignment).toBeGreaterThan(low.dimensions.activityAlignment);
  });

  it("should produce higher socialResonance with more social connections", () => {
    const low = assertOk(computeChemistry(makeGuest({ socialConnections: 0 }), makeClub()));
    const high = assertOk(computeChemistry(makeGuest({ socialConnections: 4 }), makeClub()));
    expect(high.dimensions.socialResonance).toBeGreaterThan(low.dimensions.socialResonance);
  });

  it("should produce higher guestClubFit with more overlapping interests", () => {
    const low = assertOk(computeChemistry(
      makeGuest({ interests: ["cultural"] }),
      makeClub({ strengths: ["sports"] }),
    ));
    const high = assertOk(computeChemistry(
      makeGuest({ interests: ["sports", "dining"] }),
      makeClub({ strengths: ["sports", "dining"] }),
    ));
    expect(high.dimensions.guestClubFit).toBeGreaterThan(low.dimensions.guestClubFit);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => computeChemistry(
      makeGuest({ interests: [], visitCount: 0, feedbackScore: null, socialConnections: 0 }),
      makeClub({ strengths: [], atmosphere: "mixed" }),
    )).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 10ms", () => {
    const start = performance.now();
    computeChemistry(makeGuest(), makeClub());
    expect(performance.now() - start).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// §4 — computeChemistrySafe
// ═══════════════════════════════════════════════════════════

describe("computeChemistrySafe", () => {
  it("should return identical data to computeChemistry on success", () => {
    const guest = makeGuest();
    const club = makeClub();
    const raw = assertOk(computeChemistry(guest, club));
    const safe = computeChemistrySafe(guest, club);

    expect(safe.guestId).toBe(raw.guestId);
    expect(safe.overall).toBe(raw.overall);
    expect(safe.dimensions.guestClubFit).toBe(raw.dimensions.guestClubFit);
    expect(safe.confidence).toBe(raw.confidence);
  });

  it("should always return a valid ChemistryScore", () => {
    const result = computeChemistrySafe(makeGuest(), makeClub());
    expect(result).toBeDefined();
    expect(result.guestId).toBeTruthy();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.dimensions).toBeDefined();
    expect(result.computedAt).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════
// §5 — matchSponsors
// ═══════════════════════════════════════════════════════════

describe("matchSponsors", () => {
  // ── Empty candidates ──

  it("should return empty array for 0 candidates", () => {
    const result = assertOk(matchSponsors(makeGuest(), []));
    expect(result).toEqual([]);
  });

  it("should include warning when no candidates available", () => {
    const result = matchSponsors(makeGuest(), []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("No hay sponsors candidatos disponibles");
    }
  });

  // ── Schedule alignment formula (exact) ──

  it("should return 100 schedule alignment for exact time match", () => {
    // guest: evening, sponsor: evening → 100
    const result = assertOk(matchSponsors(
      makeGuest({ preferredTime: "evening" }),
      [makeSponsor({ availability: "evening", avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].scheduleAlignment).toBe(100);
  });

  it("should return 90 schedule alignment for flexible sponsor", () => {
    const result = assertOk(matchSponsors(
      makeGuest({ preferredTime: "morning" }),
      [makeSponsor({ availability: "flexible", avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].scheduleAlignment).toBe(90);
  });

  it("should return 50 schedule alignment for adjacent times", () => {
    // evening → afternoon is adjacent (adjacency["evening"] includes "afternoon")
    const result = assertOk(matchSponsors(
      makeGuest({ preferredTime: "evening" }),
      [makeSponsor({ availability: "afternoon", avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].scheduleAlignment).toBe(50);
  });

  it("should return 20 schedule alignment for non-adjacent times", () => {
    // morning → evening is NOT adjacent (adjacency["morning"] = ["afternoon"])
    const result = assertOk(matchSponsors(
      makeGuest({ preferredTime: "morning" }),
      [makeSponsor({ availability: "evening", avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].scheduleAlignment).toBe(20);
  });

  // ── Shared interests ──

  it("should compute shared interests correctly", () => {
    // guest: ["sports","dining","pool"], sponsor: ["sports","wellness"]
    // shared: ["sports"]
    const result = assertOk(matchSponsors(
      makeGuest(),
      [makeSponsor({ avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].sharedInterests).toEqual(["sports"]);
  });

  it("should return empty sharedInterests when no overlap", () => {
    const result = assertOk(matchSponsors(
      makeGuest({ interests: ["cultural"] }),
      [makeSponsor({ interests: ["sports"], avgGuestSatisfaction: 0, pastGuestsSponsored: 0 })],
    ));
    expect(result[0].sharedInterests).toEqual([]);
  });

  // ── Effectiveness ──

  it("should compute SponsorEffectiveness when pastGuestsSponsored > 0", () => {
    const result = assertOk(matchSponsors(
      makeGuest(),
      [makeSponsor({ pastGuestsSponsored: 10, pastConversions: 4, avgGuestSatisfaction: 0 })],
    ));
    expect(result[0].effectiveness).toBeDefined();
    expect(result[0].effectiveness!.totalGuestsSponsored).toBe(10);
    expect(result[0].effectiveness!.conversions).toBe(4);
    expect(result[0].effectiveness!.conversionRate).toBe(40); // round(4/10*100)
  });

  it("should set effectiveness to null when pastGuestsSponsored = 0", () => {
    const result = assertOk(matchSponsors(
      makeGuest(),
      [makeSponsor({ pastGuestsSponsored: 0, pastConversions: 0, avgGuestSatisfaction: 0 })],
    ));
    expect(result[0].effectiveness).toBeNull();
  });

  // ── Compatibility formula (exact, with low satisfaction to avoid clamping) ──

  it("should compute compatibility exactly for known inputs", () => {
    // guest interests: ["sports","dining","pool"], sponsor interests: ["sports","wellness"]
    // shared: ["sports"] → interestScore = 1/3 * 100 = 33.33... → used as float in formula
    //
    // schedule: evening vs evening → 100
    // effectiveness: pastGuestsSponsored=5, pastConversions=3 → conversionRate=60
    // avgGuestSatisfaction: 5 (low to avoid clamping)
    //
    // compatibility = round(33.33*0.40 + 100*0.25 + 60*0.25 + 5*20*0.10)
    //               = round(13.33 + 25 + 15 + 10)
    //               = round(63.33)
    //               = 63
    const result = assertOk(matchSponsors(
      makeGuest({ interests: ["sports", "dining", "pool"] }),
      [makeSponsor({
        interests: ["sports", "wellness"],
        availability: "evening",
        pastGuestsSponsored: 5,
        pastConversions: 3,
        avgGuestSatisfaction: 5,
      })],
    ));
    expect(result[0].compatibility).toBe(63);
  });

  it("should compute compatibility = 0 for no overlap, no schedule, no effectiveness", () => {
    // interestScore = 0/1*100 = 0
    // schedule: morning vs evening → 20
    // effectiveness: null → default 25
    // satisfaction: 0 → 0*20*0.10 = 0
    // compatibility = round(0*0.40 + 20*0.25 + 25 + 0) = round(0+5+25+0) = 30
    const result = assertOk(matchSponsors(
      makeGuest({ interests: ["cultural"], preferredTime: "morning" }),
      [makeSponsor({
        interests: ["sports"],
        availability: "evening",
        pastGuestsSponsored: 0,
        avgGuestSatisfaction: 0,
      })],
    ));
    expect(result[0].compatibility).toBe(30);
  });

  // ── Sorting ──

  it("should return matches sorted by compatibility descending", () => {
    const result = assertOk(matchSponsors(
      makeGuest({ interests: ["sports"], preferredTime: "evening" }),
      [
        makeSponsor({
          memberId: "mbr-low",
          interests: ["cultural"],
          availability: "morning",
          pastGuestsSponsored: 0,
          avgGuestSatisfaction: 0,
        }),
        makeSponsor({
          memberId: "mbr-high",
          interests: ["sports"],
          availability: "evening",
          pastGuestsSponsored: 10,
          pastConversions: 8,
          avgGuestSatisfaction: 0,
        }),
        makeSponsor({
          memberId: "mbr-mid",
          interests: ["sports"],
          availability: "afternoon",
          pastGuestsSponsored: 0,
          avgGuestSatisfaction: 0,
        }),
      ],
    ));

    expect(result.length).toBe(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].compatibility).toBeLessThanOrEqual(result[i - 1].compatibility);
    }
    expect(result[0].memberName).toBe("Carlos Solano"); // mbr-high
  });

  // ── TopN limiting ──

  it("should limit results to topN", () => {
    const result = assertOk(matchSponsors(
      makeGuest(),
      [
        makeSponsor({ memberId: "mbr-1" }),
        makeSponsor({ memberId: "mbr-2" }),
        makeSponsor({ memberId: "mbr-3" }),
        makeSponsor({ memberId: "mbr-4" }),
        makeSponsor({ memberId: "mbr-5" }),
      ],
      2,
    ));
    expect(result.length).toBe(2);
  });

  it("should default topN to 3", () => {
    const result = assertOk(matchSponsors(
      makeGuest(),
      Array.from({ length: 10 }, (_, i) => makeSponsor({ memberId: `mbr-${i}` })),
    ));
    expect(result.length).toBe(3);
  });

  // ── Range validation ──

  it("should clamp compatibility to [0, 100]", () => {
    // With high satisfaction, the formula can exceed 100 — verify clamping
    const result = assertOk(matchSponsors(
      makeGuest({ interests: ["sports", "dining", "pool"] }),
      [makeSponsor({
        interests: ["sports", "dining", "pool"],
        availability: "flexible",
        pastGuestsSponsored: 10,
        pastConversions: 10,
        avgGuestSatisfaction: 100, // 100*20*0.10 = 200 — way over 100
      })],
    ));
    expect(result[0].compatibility).toBeLessThanOrEqual(100);
    expect(result[0].compatibility).toBeGreaterThanOrEqual(0);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => matchSponsors(
      makeGuest({ interests: [] }),
      [],
    )).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §6 — matchSponsorsSafe
// ═══════════════════════════════════════════════════════════

describe("matchSponsorsSafe", () => {
  it("should return identical data to matchSponsors on success", () => {
    const guest = makeGuest();
    const candidates = [makeSponsor()];
    const raw = assertOk(matchSponsors(guest, candidates));
    const safe = matchSponsorsSafe(guest, candidates);

    expect(safe.length).toBe(raw.length);
    if (safe.length > 0 && raw.length > 0) {
      expect(safe[0].compatibility).toBe(raw[0].compatibility);
    }
  });

  it("should return empty array for 0 candidates", () => {
    expect(matchSponsorsSafe(makeGuest(), [])).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// §7 — analyzeFirstImpression
// ═══════════════════════════════════════════════════════════

describe("analyzeFirstImpression", () => {
  // ── Axis formula verification (exact) ──

  it("should compute welcomeLatency = 70 for 3 minutes", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression({ welcomeMinutes: 3 })));
    expect(result.axes.welcomeLatency).toBe(70);
  });

  it("should compute welcomeLatency for all tiers", () => {
    const cases: [number, number][] = [
      [1, 95],
      [2, 85],
      [3, 70],
      [5, 55],
      [8, 35],
      [15, 20],
    ];
    for (const [minutes, expected] of cases) {
      const result = assertOk(analyzeFirstImpression(makeImpression({ welcomeMinutes: minutes })));
      expect(result.axes.welcomeLatency).toBe(expected);
    }
  });

  it("should compute socialTemperature for all tiers", () => {
    const cases: [number, number][] = [
      [0, 25],
      [1, 55],
      [3, 75],
      [5, 90],
      [10, 90], // capped at 90
    ];
    for (const [count, expected] of cases) {
      const result = assertOk(analyzeFirstImpression(makeImpression({ socialInteractionCount: count })));
      expect(result.axes.socialTemperature).toBe(expected);
    }
  });

  it("should pass through activityMatchScore clamped to [0, 100]", () => {
    const high = assertOk(analyzeFirstImpression(makeImpression({ activityMatchScore: 150 })));
    const low = assertOk(analyzeFirstImpression(makeImpression({ activityMatchScore: -10 })));
    expect(high.axes.activityMatch).toBe(100);
    expect(low.axes.activityMatch).toBe(0);
  });

  it("should pass through environmentScore clamped to [0, 100]", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression({ environmentScore: 85 })));
    expect(result.axes.environmentalComfort).toBe(85);
  });

  it("should pass through departureScore clamped to [0, 100]", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression({ departureScore: 72 })));
    expect(result.axes.departureSentiment).toBe(72);
  });

  // ── Full axis verification for known input ──

  it("should compute all axes correctly for reference input", () => {
    // welcomeMinutes=3 → 70, activityMatchScore=85 → 85,
    // socialInteractionCount=4 → 75, environmentScore=90 → 90, departureScore=80 → 80
    const result = assertOk(analyzeFirstImpression(makeImpression()));
    expect(result.axes.welcomeLatency).toBe(70);
    expect(result.axes.activityMatch).toBe(85);
    expect(result.axes.socialTemperature).toBe(75);
    expect(result.axes.environmentalComfort).toBe(90);
    expect(result.axes.departureSentiment).toBe(80);
  });

  // ── Alert behavior ──

  it("should flag bad first impression as alert", () => {
    // All low scores → overall will be low
    const result = assertOk(analyzeFirstImpression(makeImpression({
      welcomeMinutes: 15,
      activityMatchScore: 10,
      socialInteractionCount: 0,
      environmentScore: 15,
      departureScore: 10,
    })));
    // Axes: 20, 10, 25, 15, 10 — overall will be very low
    expect(result.alertRequired).toBe(true);
    expect(result.alertMessage).toBeTruthy();
    expect(result.alertMessage).toContain("Primera impresión crítica");
  });

  it("should not flag good first impression as alert", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression({
      welcomeMinutes: 1,
      activityMatchScore: 95,
      socialInteractionCount: 5,
      environmentScore: 95,
      departureScore: 90,
    })));
    // Axes: 95, 95, 90, 95, 90 — overall will be very high
    expect(result.alertRequired).toBe(false);
    expect(result.alertMessage).toBeNull();
  });

  // ── Structural integrity ──

  it("should include all required fields", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression()));
    expect(result.guestId).toBe("gst-001");
    expect(result.visitId).toBe("visit-001");
    expect(typeof result.overall).toBe("number");
    expect(result.axes).toBeDefined();
    expect(typeof result.alertRequired).toBe("boolean");
    expect(result.computedAt).toBeTruthy();
  });

  it("should return computedAt as valid ISO string", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression()));
    expect(Number.isNaN(new Date(result.computedAt).getTime())).toBe(false);
  });

  // ── Range validation ──

  it("should clamp overall score to [0, 100]", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression()));
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("should clamp all axis scores to [0, 100]", () => {
    const result = assertOk(analyzeFirstImpression(makeImpression()));
    const axes = result.axes;
    expect(axes.welcomeLatency).toBeGreaterThanOrEqual(0);
    expect(axes.welcomeLatency).toBeLessThanOrEqual(100);
    expect(axes.activityMatch).toBeGreaterThanOrEqual(0);
    expect(axes.activityMatch).toBeLessThanOrEqual(100);
    expect(axes.socialTemperature).toBeGreaterThanOrEqual(0);
    expect(axes.socialTemperature).toBeLessThanOrEqual(100);
    expect(axes.environmentalComfort).toBeGreaterThanOrEqual(0);
    expect(axes.environmentalComfort).toBeLessThanOrEqual(100);
    expect(axes.departureSentiment).toBeGreaterThanOrEqual(0);
    expect(axes.departureSentiment).toBeLessThanOrEqual(100);
  });

  // ── Behavioral properties ──

  it("should produce lower welcomeLatency score for longer wait", () => {
    const fast = assertOk(analyzeFirstImpression(makeImpression({ welcomeMinutes: 1 })));
    const slow = assertOk(analyzeFirstImpression(makeImpression({ welcomeMinutes: 15 })));
    expect(fast.axes.welcomeLatency).toBeGreaterThan(slow.axes.welcomeLatency);
  });

  it("should produce higher socialTemperature for more interactions", () => {
    const low = assertOk(analyzeFirstImpression(makeImpression({ socialInteractionCount: 0 })));
    const high = assertOk(analyzeFirstImpression(makeImpression({ socialInteractionCount: 5 })));
    expect(high.axes.socialTemperature).toBeGreaterThan(low.axes.socialTemperature);
  });

  // ── Never throws ──

  it("should never throw with extreme inputs", () => {
    expect(() => analyzeFirstImpression(makeImpression({
      welcomeMinutes: 0,
      activityMatchScore: -100,
      socialInteractionCount: -5,
      environmentScore: 999,
      departureScore: -999,
    }))).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 5ms", () => {
    const start = performance.now();
    analyzeFirstImpression(makeImpression());
    expect(performance.now() - start).toBeLessThan(5);
  });
});

// ═══════════════════════════════════════════════════════════
// §8 — analyzeFirstImpressionSafe
// ═══════════════════════════════════════════════════════════

describe("analyzeFirstImpressionSafe", () => {
  it("should return identical data to analyzeFirstImpression on success", () => {
    const input = makeImpression();
    const raw = assertOk(analyzeFirstImpression(input));
    const safe = analyzeFirstImpressionSafe(input);

    expect(safe.guestId).toBe(raw.guestId);
    expect(safe.overall).toBe(raw.overall);
    expect(safe.axes.welcomeLatency).toBe(raw.axes.welcomeLatency);
    expect(safe.alertRequired).toBe(raw.alertRequired);
  });

  it("should always return valid FirstImpressionAnalysis", () => {
    const result = analyzeFirstImpressionSafe(makeImpression());
    expect(result).toBeDefined();
    expect(result.guestId).toBeTruthy();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════
// §9 — predictConversion (4 parameters, no Safe variant)
// ═══════════════════════════════════════════════════════════

describe("predictConversion", () => {
  // ── Exact probability computation ──

  it("should compute exact probability for known inputs", () => {
    // chemistry.overall = 80, firstImpression = null (→ uses 50)
    // visitCount = 8, daysSinceFirstVisit = 15
    //
    // probability = 80*0.35 + 50*0.25 + min(100,8*15)*0.20 + max(0,100-15*0.5)*0.20
    //             = 28 + 12.5 + 100*0.20 + 92.5*0.20
    //             = 28 + 12.5 + 20 + 18.5
    //             = 79
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 8, 15));
    expect(result.probability).toBe(79);
  });

  it("should compute exact probability with firstImpression present", () => {
    // chemistry.overall = 80, firstImpression.overall = 85
    // visitCount = 6, daysSinceFirstVisit = 10
    //
    // probability = 80*0.35 + 85*0.25 + min(100,6*15)*0.20 + max(0,100-10*0.5)*0.20
    //             = 28 + 21.25 + 100*0.20 + 95*0.20
    //             = 28 + 21.25 + 20 + 19
    //             = 88.25 → 88
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85,
      computedAt: new Date().toISOString(),
    };
    const impression: FirstImpressionAnalysis = {
      guestId: gid("gst-001"),
      visitId: "visit-001" as any,
      overall: 85,
      axes: { welcomeLatency: 85, activityMatch: 90, socialTemperature: 75, environmentalComfort: 88, departureSentiment: 82 },
      alertRequired: false,
      alertMessage: null,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, impression, 6, 10));
    expect(result.probability).toBe(88);
  });

  it("should use 50 as default when firstImpression is null", () => {
    // With impression.overall = 50 (default) vs explicit 90
    // The difference should be exactly 90*0.25 - 50*0.25 = 10
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };
    const highImpression: FirstImpressionAnalysis = {
      guestId: gid("gst-001"),
      visitId: "visit-001" as any,
      overall: 90,
      axes: { welcomeLatency: 90, activityMatch: 90, socialTemperature: 90, environmentalComfort: 90, departureSentiment: 90 },
      alertRequired: false,
      alertMessage: null,
      computedAt: new Date().toISOString(),
    };

    const withoutImpression = assertOk(predictConversion(chemistry, null, 4, 20));
    const withImpression = assertOk(predictConversion(chemistry, highImpression, 4, 20));

    // Difference should be (90-50)*0.25 = 10
    expect(withImpression.probability - withoutImpression.probability).toBe(10);
  });

  // ── Confidence interval ──

  it("should compute wider confidence interval with fewer data points", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 60,
      dimensions: { guestClubFit: 60, guestSponsorFit: 50, activityAlignment: 60, socialResonance: 50, temporalFit: 70 },
      topSponsor: null,
      confidence: 40, // Low confidence → dataPoints = 0
      computedAt: new Date().toISOString(),
    };

    // No impression, no visits, low confidence → 0 data points → intervalWidth = 30
    const result = assertOk(predictConversion(chemistry, null, 0, 30));
    const [low, high] = result.confidenceInterval;
    expect(high - low).toBe(60); // 2 * 30
  });

  it("should compute narrow confidence interval with all data present", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85, // > 50 → dataPoints +1
      computedAt: new Date().toISOString(),
    };
    const impression: FirstImpressionAnalysis = {
      guestId: gid("gst-001"),
      visitId: "visit-001" as any,
      overall: 80,
      axes: { welcomeLatency: 80, activityMatch: 80, socialTemperature: 80, environmentalComfort: 80, departureSentiment: 80 },
      alertRequired: false,
      alertMessage: null,
      computedAt: new Date().toISOString(),
    };

    // impression present (1) + visitCount>0 (1) + confidence>50 (1) = 3 data points → intervalWidth = 10
    const result = assertOk(predictConversion(chemistry, impression, 5, 10));
    const [low, high] = result.confidenceInterval;
    expect(high - low).toBe(20); // 2 * 10
  });

  it("should clamp confidence interval bounds to [0, 100]", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 10,
      dimensions: { guestClubFit: 10, guestSponsorFit: 50, activityAlignment: 10, socialResonance: 10, temporalFit: 10 },
      topSponsor: null,
      confidence: 30,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 0, 365));
    expect(result.confidenceInterval[0]).toBeGreaterThanOrEqual(0);
    expect(result.confidenceInterval[1]).toBeLessThanOrEqual(100);
  });

  // ── Estimated LTV ──

  it("should compute estimatedLTV = round(420000 * (probability/100) * 3)", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85,
      computedAt: new Date().toISOString(),
    };

    // probability = 79 (from first test)
    // estimatedLTV = round(420000 * 0.79 * 3) = round(995400) = 995400
    const result = assertOk(predictConversion(chemistry, null, 8, 15));
    expect(result.estimatedLTV).toBe(995400);
  });

  // ── Recommended action thresholds ──

  it("should recommend 'Programar propuesta' when probability >= 80", () => {
    // Use very high inputs to guarantee probability >= 80
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 100,
      dimensions: { guestClubFit: 100, guestSponsorFit: 50, activityAlignment: 100, socialResonance: 100, temporalFit: 100 },
      topSponsor: null,
      confidence: 100,
      computedAt: new Date().toISOString(),
    };
    const impression: FirstImpressionAnalysis = {
      guestId: gid("gst-001"),
      visitId: "v-001" as any,
      overall: 100,
      axes: { welcomeLatency: 100, activityMatch: 100, socialTemperature: 100, environmentalComfort: 100, departureSentiment: 100 },
      alertRequired: false,
      alertMessage: null,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, impression, 10, 5));
    expect(result.probability).toBeGreaterThanOrEqual(80);
    expect(result.recommendedAction).toBe("Programar propuesta de membresía inmediata");
  });

  it("should recommend 'Agendar visita' when probability in [60, 80)", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85,
      computedAt: new Date().toISOString(),
    };

    // probability = 79 (verified above)
    const result = assertOk(predictConversion(chemistry, null, 8, 15));
    expect(result.probability).toBe(79);
    expect(result.probability).toBeGreaterThanOrEqual(60);
    expect(result.probability).toBeLessThan(80);
    expect(result.recommendedAction).toBe("Agendar visita personalizada con sponsor asignado");
  });

  it("should recommend 'Evento exclusivo' when probability in [40, 60)", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 50,
      dimensions: { guestClubFit: 50, guestSponsorFit: 50, activityAlignment: 50, socialResonance: 50, temporalFit: 50 },
      topSponsor: null,
      confidence: 60,
      computedAt: new Date().toISOString(),
    };

    // probability = 50*0.35 + 50*0.25 + 0*0.20 + max(0,100-182.5)*0.20
    //             = 17.5 + 12.5 + 0 + 0 = 30
    // Hmm, that's < 40. Let me use visitCount > 0
    // probability = 50*0.35 + 50*0.25 + min(100,3*15)*0.20 + max(0,100-90*0.5)*0.20
    //             = 17.5 + 12.5 + 45*0.20 + 55*0.20
    //             = 17.5 + 12.5 + 9 + 11 = 50
    const result = assertOk(predictConversion(chemistry, null, 3, 90));
    expect(result.probability).toBe(50);
    expect(result.recommendedAction).toBe("Enviar invitación a evento exclusivo");
  });

  it("should recommend 'Mantener contacto' when probability < 40", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 10,
      dimensions: { guestClubFit: 10, guestSponsorFit: 50, activityAlignment: 10, socialResonance: 10, temporalFit: 10 },
      topSponsor: null,
      confidence: 30,
      computedAt: new Date().toISOString(),
    };

    // probability = 10*0.35 + 50*0.25 + 0*0.20 + max(0,100-182.5)*0.20
    //             = 3.5 + 12.5 + 0 + 0 = 16
    const result = assertOk(predictConversion(chemistry, null, 0, 365));
    expect(result.probability).toBeLessThan(40);
    expect(result.recommendedAction).toBe("Mantener contacto con contenido de valor");
  });

  // ── Key factors ──

  it("should return 4 key factors", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 4, 20));
    expect(result.keyFactors).toHaveLength(4);
  });

  it("should label factors correctly", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 4, 20));
    const labels = result.keyFactors.map((f) => f.factor);
    expect(labels).toContain("Química con el club");
    expect(labels).toContain("Primera impresión");
    expect(labels).toContain("Frecuencia de visitas");
    expect(labels).toContain("Recencia");
  });

  it("should mark high chemistry as positive impact", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 80,
      dimensions: { guestClubFit: 80, guestSponsorFit: 50, activityAlignment: 80, socialResonance: 70, temporalFit: 100 },
      topSponsor: null,
      confidence: 85,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 5, 10));
    const chemFactor = result.keyFactors.find((f) => f.factor === "Química con el club")!;
    expect(chemFactor.impact).toBe("positive"); // overall >= 70
  });

  it("should mark low chemistry as negative impact", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 25,
      dimensions: { guestClubFit: 25, guestSponsorFit: 50, activityAlignment: 25, socialResonance: 20, temporalFit: 30 },
      topSponsor: null,
      confidence: 50,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 1, 100));
    const chemFactor = result.keyFactors.find((f) => f.factor === "Química con el club")!;
    expect(chemFactor.impact).toBe("negative"); // overall < 40
  });

  it("should mark missing firstImpression as neutral", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 4, 20));
    const impFactor = result.keyFactors.find((f) => f.factor === "Primera impresión")!;
    expect(impFactor.impact).toBe("neutral");
    expect(impFactor.description).toContain("Sin datos");
  });

  it("should mark many visits as positive impact", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 8, 20));
    const visitFactor = result.keyFactors.find((f) => f.factor === "Frecuencia de visitas")!;
    expect(visitFactor.impact).toBe("positive"); // visitCount >= 5
  });

  // ── Structural integrity ──

  it("should include all required fields", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(chemistry, null, 4, 20));
    expect(result.guestId).toBe("gst-001");
    expect(typeof result.probability).toBe("number");
    expect(result.confidenceInterval).toHaveLength(2);
    expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.confidenceInterval[1]);
    expect(Array.isArray(result.keyFactors)).toBe(true);
    expect(typeof result.recommendedAction).toBe("string");
    expect(typeof result.estimatedLTV).toBe("number");
    expect(result.computedAt).toBeTruthy();
  });

  // ── Range validation ──

  it("should clamp probability to [0, 100]", () => {
    const maxChemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 100,
      dimensions: { guestClubFit: 100, guestSponsorFit: 50, activityAlignment: 100, socialResonance: 100, temporalFit: 100 },
      topSponsor: null,
      confidence: 100,
      computedAt: new Date().toISOString(),
    };

    const result = assertOk(predictConversion(maxChemistry, null, 100, 0));
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(result.probability).toBeGreaterThanOrEqual(0);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 0,
      dimensions: { guestClubFit: 0, guestSponsorFit: 0, activityAlignment: 0, socialResonance: 0, temporalFit: 0 },
      topSponsor: null,
      confidence: 0,
      computedAt: new Date().toISOString(),
    };

    expect(() => predictConversion(chemistry, null, 0, 9999)).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 5ms", () => {
    const chemistry: ChemistryScore = {
      guestId: gid("gst-001"),
      overall: 70,
      dimensions: { guestClubFit: 70, guestSponsorFit: 50, activityAlignment: 70, socialResonance: 60, temporalFit: 80 },
      topSponsor: null,
      confidence: 75,
      computedAt: new Date().toISOString(),
    };

    const start = performance.now();
    predictConversion(chemistry, null, 4, 20);
    expect(performance.now() - start).toBeLessThan(5);
  });
});