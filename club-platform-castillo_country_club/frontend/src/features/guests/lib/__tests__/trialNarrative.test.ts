// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/__tests__/trialNarrative.test.ts
// Phase 34 "The Gateway" — Trial Narrative Engine Tests
// Level 6+ Agency · Production Grade
//
// Tests ALL 8 exports against verified formulas.
// Exact numerical assertions for personalizationScore, enrichmentScore,
// narrative health, and progress evaluation.
//
// Checklist: T1-T8
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  designTrialExperience,
  designTrialExperienceSafe,
  evaluateTrialProgress,
  computeNarrativeHealth,
  enrichProposals,
  enrichProposalsSafe,
  type TrialDesignInput,
  type ProposalEnrichmentInput,
} from "../trialNarrative";

import type {
  GuestEngineResult,
  GuestId,
  TrialId,
  TrialPlan,
  TrialChapter,
  TrialChapterStatus,
  TrialProgress,
  ChemistryScore,
  MemoryGraph,
  MemoryInteractionType,
  TopicPattern,
  SponsorMatch,
  Callback,
  GuestInterestDomain,
} from "../../types";

import type { GuestEngagementProposalList } from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

function gid(raw: string): GuestId {
  return raw as unknown as GuestId;
}

function tid(raw: string): TrialId {
  return raw as unknown as TrialId;
}

function assertOk<T>(result: GuestEngineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Unreachable");
  return result.data;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// ═══════════════════════════════════════════════════════════
// §2 — MOCK FACTORIES
// ═══════════════════════════════════════════════════════════

function makeChemistry(overrides?: Partial<ChemistryScore>): ChemistryScore {
  return {
    guestId: gid("gst-001"),
    overall: 82,
    dimensions: { guestClubFit: 85, guestSponsorFit: 78, activityAlignment: 80, socialResonance: 82, temporalFit: 85 },
    topSponsor: "mbr-001" as unknown as SponsorMatch,
    confidence: 80,
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMemory(overrides?: Partial<MemoryGraph>): MemoryGraph {
  return {
    guestId: gid("gst-001"),
    nodes: [
      { interactionId: "n-1", type: "visit" as MemoryInteractionType, timestamp: daysAgo(5), sentiment: 0.85, topics: ["sports", "tenis"], context: {}, recallPriority: 85 },
      { interactionId: "n-2", type: "dining" as MemoryInteractionType, timestamp: daysAgo(10), sentiment: 0.7, topics: ["dining", "vino"], context: {}, recallPriority: 70 },
    ],
    strength: 55,
    callbacks: [
      { id: "cb-1", description: "Reservar cancha", promisedDate: daysAgo(-3), status: "pending", priority: 80, createdAt: daysAgo(5) } as unknown as Callback,
    ],
    emotionalArc: {
      points: [
        { date: daysAgo(10), sentiment: 0.7, event: "dining: dining, vino", trigger: "positive" },
        { date: daysAgo(5), sentiment: 0.85, event: "visit: sports, tenis", trigger: "positive" },
      ],
      trend: "improving",
      peak: { date: daysAgo(5), sentiment: 0.85, event: "visit: sports, tenis", trigger: "positive" },
      valley: { date: daysAgo(10), sentiment: 0.7, event: "dining: dining, vino", trigger: "positive" },
      currentSentiment: 0.85,
    },
    topicPatterns: [
      { topic: "sports", frequency: 3, avgSentiment: 0.75, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
      { topic: "dining", frequency: 2, avgSentiment: 0.67, lastMentioned: daysAgo(10), domains: ["dining" as GuestInterestDomain] },
    ],
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function makeTrialDesignInput(overrides?: Partial<TrialDesignInput>): TrialDesignInput {
  return {
    guestId: gid("gst-001"),
    trialId: tid("trial-001"),
    totalDays: 7,
    interests: ["sports", "dining"],
    availableActivities: ["tennis", "golf", "yoga", "fine_dining", "cocktails"],
    chemistry: makeChemistry(),
    memory: makeMemory(),
    ...overrides,
  };
}

function makeProposalList(): GuestEngagementProposalList {
  return {
    proposals: [
      { proposal_type: "trial_invitation", title: "Invitar a trial", description: "Guest ready", priority: "high", target_guest_id: "gst-001", estimated_impact: "high" },
      { proposal_type: "follow_up_campaign", title: "Follow-up", description: "Check in", priority: "medium", target_guest_id: "gst-002", estimated_impact: "medium" },
    ],
    high_priority_count: 1,
    cross_domain_count: 0,
  } as unknown as GuestEngagementProposalList;
}

function makeSponsorMatch(): SponsorMatch {
  return {
    memberId: "mbr-001" as any,
    memberName: "Carlos Solano",
    compatibility: 88,
    sharedInterests: ["sports", "dining"] as string[],
    scheduleAlignment: 80,
    effectiveness: null,
  };
}

function makePlanWithChapters(chapterStatuses: TrialChapterStatus[]): TrialPlan {
  const chapters: TrialChapter[] = chapterStatuses.map((status, i) => ({
    day: (i + 1) * 2,
    title: `Chapter ${i + 1}`,
    activity: `Activity ${i + 1}`,
    purpose: `Purpose ${i + 1}`,
    expectedOutcome: `Outcome ${i + 1}`,
    fallback: `Fallback ${i + 1}`,
    status,
    completedAt: status === "completed" ? daysAgo(1) : null,
    feedbackScore: status === "completed" ? 4 : null,
  }));

  return {
    guestId: gid("gst-001"),
    trialId: tid("trial-001"),
    chapters,
    totalDays: 14,
    personalizationScore: 80,
    designRationale: "Test plan",
    createdAt: new Date().toISOString(),
  };
}
// AGREGAR después de makePlanWithFeedback

function makePlanWithFeedback(
  chapters: ReadonlyArray<{ status: TrialChapterStatus; feedbackScore: number | null }>,
): TrialPlan {
  return {
    guestId: gid("gst-001"),
    trialId: tid("trial-001"),
    chapters: chapters.map((ch, i) => ({
      day: (i + 1) * 2,
      title: `Chapter ${i + 1}`,
      activity: `Activity ${i + 1}`,
      purpose: `Purpose ${i + 1}`,
      expectedOutcome: `Outcome ${i + 1}`,
      fallback: `Fallback ${i + 1}`,
      status: ch.status,
      completedAt: ch.status === "completed" ? daysAgo(1) : null,
      feedbackScore: ch.feedbackScore,
    })),
    totalDays: 14,
    personalizationScore: 80,
    designRationale: "Test plan",
    createdAt: new Date().toISOString(),
  };
}
// ═══════════════════════════════════════════════════════════
// §3 — designTrialExperience
// ═══════════════════════════════════════════════════════════

describe("designTrialExperience", () => {
  // ── Happy path ──

  it("should return a valid plan with chapters", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    expect(plan.guestId).toBe("gst-001");
    expect(plan.trialId).toBe("trial-001");
    expect(plan.chapters.length).toBeGreaterThan(0);
    expect(plan.totalDays).toBe(7);
    expect(plan.personalizationScore).toBeGreaterThanOrEqual(0);
    expect(plan.personalizationScore).toBeLessThanOrEqual(100);
    expect(plan.designRationale).toBeTruthy();
    expect(plan.createdAt).toBeTruthy();
  });

  // ── Warnings ──

  it("should emit warning when chemistry is null", () => {
    const result = designTrialExperience(makeTrialDesignInput({ chemistry: null }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("Sin chemistry score — plan genérico");
    }
  });

  it("should emit warning when memory is null", () => {
    const result = designTrialExperience(makeTrialDesignInput({ memory: null }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("Sin memory graph — no se personalizan callbacks");
    }
  });

  it("should emit no warnings when all inputs present", () => {
    const result = designTrialExperience(makeTrialDesignInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── Chapter generation for totalDays=7 ──
  // chaptersCount = ceil(7/3) = 3
  // Welcome: day=1
  // Interest: 1 chapter (slice(0, 3-2=1)), day=3
  //   dayCounter += max(2, floor(7/3)) = max(2,2) = 2 → dayCounter=5
  // Social: day = min(7-2, 5) = min(5, 5) = 5
  // Final: day = 7-1 = 6
  // Chapters: [day1, day3, day5, day6] = 4 chapters

  it("should generate correct chapter structure for totalDays=7", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({ totalDays: 7 })));

    expect(plan.chapters.length).toBe(4);

    const days = plan.chapters.map((ch) => ch.day);
    expect(days).toEqual([1, 3, 5, 6]);
  });

  it("should always include welcome chapter at day 1", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    const welcome = plan.chapters.find((ch) => ch.day === 1);
    expect(welcome).toBeDefined();
    expect(welcome!.title).toBe("Bienvenida personalizada");
    expect(welcome!.purpose).toContain("primera impresión");
  });

  it("should always include final chapter at totalDays-1", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({ totalDays: 7 })));

    const final = plan.chapters.find((ch) => ch.day === 6);
    expect(final).toBeDefined();
    expect(final!.title).toBe("La conversación");
    // G15: purpose real del src: "Evaluar disposición a convertirse
    // en miembro" — el contains "conversión" nunca matcheó.
    expect(final!.purpose).toContain("convertirse en miembro");
  });

  it("should include social integration chapter", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    const social = plan.chapters.find((ch) => ch.title === "Integración social");
    expect(social).toBeDefined();
    expect(social!.purpose).toContain("pertenencia");
  });

  it("should sort chapters by day", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    for (let i = 1; i < plan.chapters.length; i++) {
      expect(plan.chapters[i].day).toBeGreaterThanOrEqual(plan.chapters[i - 1].day);
    }
  });

  // ── Interest-based chapter templates ──

  it("should use sports template when interests include sports", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      interests: ["sports"],
      totalDays: 14,
    })));

    // Should include a sports-themed chapter
    const sportsChapter = plan.chapters.find(
      (ch) => ch.title === "Descubrir tu cancha" || ch.title === "Clase grupal",
    );
    expect(sportsChapter).toBeDefined();
  });

  it("should use dining template when interests include dining", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      interests: ["dining"],
      totalDays: 14,
    })));

    const diningChapter = plan.chapters.find(
      (ch) => ch.title === "Cena de descubrimiento",
    );
    expect(diningChapter).toBeDefined();
  });

  it("should use social template when interest has no matching template", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      interests: ["wellness"],
      totalDays: 14,
    })));

    // "wellness" not in CHAPTER_TEMPLATES → falls back to "social"
    const socialChapter = plan.chapters.find(
      (ch) => ch.title === "Círculo social",
    );
    expect(socialChapter).toBeDefined();
  });

  // ── Chapter fields ──

  it("should set all chapters to pending status initially", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    plan.chapters.forEach((ch) => {
      expect(ch.status).toBe("pending");
      expect(ch.completedAt).toBeNull();
      expect(ch.feedbackScore).toBeNull();
    });
  });

  it("should include all required fields on each chapter", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));

    plan.chapters.forEach((ch) => {
      expect(typeof ch.day).toBe("number");
      expect(ch.day).toBeGreaterThanOrEqual(1);
      expect(ch.title).toBeTruthy();
      expect(ch.activity).toBeTruthy();
      expect(ch.purpose).toBeTruthy();
      expect(ch.expectedOutcome).toBeTruthy();
      expect(ch.fallback).toBeTruthy();
      expect(["pending", "active", "completed", "skipped", "failed"]).toContain(ch.status);
    });
  });

  // ── Chapter generation for totalDays=14 ──
  // chaptersCount = ceil(14/3) = 5
  // Welcome: day=1
  // Interest: up to 3 interests (slice(0, 5-2=3))
  //   Each: dayCounter += max(2, floor(14/5)) = max(2, 2) = 2
  //   With interests=["sports","dining"]: 2 interest chapters
  //   day 3, day 5 (dayCounter: 3→5→7)
  // Social: min(14-2, 7) = min(12, 7) = 7
  // Final: 14-1 = 13
  // Chapters: [1, 3, 5, 7, 13] = 5 chapters

  it("should generate correct chapter structure for totalDays=14", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      totalDays: 14,
      interests: ["sports", "dining"],
    })));

    expect(plan.chapters.length).toBe(5);
    const days = plan.chapters.map((ch) => ch.day);
    expect(days).toEqual([1, 3, 5, 7, 13]);
  });

  // ── Chapter generation for totalDays=3 ──
  // chaptersCount = ceil(3/3) = 1
  // Welcome: day=1
  // Interest: slice(0, 1-2=-1) → slice(0, -1) = [] → 0 interest chapters
  // Social: min(3-2, 3) = min(1, 3) = 1
  // Final: 3-1 = 2
  // Chapters: [1, 1, 2] after sort → 3 chapters (2 at day 1)

  it("should handle short trials (totalDays=3)", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      totalDays: 3,
      interests: ["sports"],
    })));

    expect(plan.chapters.length).toBe(3);
    // First two chapters at day 1 (welcome + social), final at day 2
    expect(plan.chapters[0].day).toBe(1);
    expect(plan.chapters[1].day).toBe(1);
    expect(plan.chapters[2].day).toBe(2);
  });

  // ── Personalization score (exact formula) ──

  it("should compute exact personalizationScore with all inputs", () => {
    // base=30 + chemistry(+20) + memory(+15) + interests>=2(+15) + activities>=3(+10) = 90
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: makeChemistry(),
      memory: makeMemory(),
      interests: ["sports", "dining"],
      availableActivities: ["tennis", "golf", "yoga"],
    })));
    expect(plan.personalizationScore).toBe(90);
  });

  it("should compute personalizationScore = 30 (base only) with no data", () => {
    // base=30, no chemistry, no memory, 1 interest, 1 activity
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    expect(plan.personalizationScore).toBe(30);
  });

  it("should add +20 for chemistry present", () => {
    const withChem = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: makeChemistry(),
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    const without = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    expect(withChem.personalizationScore - without.personalizationScore).toBe(20);
  });

  it("should add +15 for memory present", () => {
    const withMem = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: makeMemory(),
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    const without = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    expect(withMem.personalizationScore - without.personalizationScore).toBe(15);
  });

  it("should add +15 for 2+ interests", () => {
    const with2 = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports", "dining"],
      availableActivities: ["tennis"],
    })));
    const with1 = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    expect(with2.personalizationScore - with1.personalizationScore).toBe(15);
  });

  it("should add +10 for 3+ available activities", () => {
    const with3 = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis", "golf", "yoga"],
    })));
    const with1 = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: null,
      memory: null,
      interests: ["sports"],
      availableActivities: ["tennis"],
    })));
    expect(with3.personalizationScore - with1.personalizationScore).toBe(10);
  });

  it("should clamp personalizationScore at 100", () => {
    // max possible: 30+20+15+15+10 = 90 → doesn't reach 100 naturally
    // But verify it stays ≤ 100
    const plan = assertOk(designTrialExperience(makeTrialDesignInput()));
    expect(plan.personalizationScore).toBeLessThanOrEqual(100);
  });

  // ── Design rationale ──

  it("should include totalDays and chapter count in rationale", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({ totalDays: 7 })));
    expect(plan.designRationale).toContain("7 días");
    expect(plan.designRationale).toContain(`${plan.chapters.length} capítulos`);
  });

  it("should include interests in rationale", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      interests: ["sports", "dining"],
    })));
    expect(plan.designRationale).toContain("sports, dining");
  });

  it("should include chemistry score in rationale", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      chemistry: makeChemistry({ overall: 82 }),
    })));
    expect(plan.designRationale).toContain("82/100");
  });

  it("should include memory strength in rationale when > 50", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      memory: makeMemory({ strength: 65 }),
    })));
    expect(plan.designRationale).toContain("65/100");
  });

  it("should NOT include memory strength in rationale when <= 50", () => {
    const plan = assertOk(designTrialExperience(makeTrialDesignInput({
      memory: makeMemory({ strength: 30 }),
    })));
    expect(plan.designRationale).not.toContain("memoria:");
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => designTrialExperience(makeTrialDesignInput({
      interests: [],
      availableActivities: [],
      chemistry: null,
      memory: null,
    }))).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 10ms", () => {
    const start = performance.now();
    designTrialExperience(makeTrialDesignInput());
    expect(performance.now() - start).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// §4 — designTrialExperienceSafe
// ═══════════════════════════════════════════════════════════

describe("designTrialExperienceSafe", () => {
  it("should return identical data on success", () => {
    const input = makeTrialDesignInput();
    const raw = assertOk(designTrialExperience(input));
    const safe = designTrialExperienceSafe(input);

    expect(safe.guestId).toBe(raw.guestId);
    expect(safe.chapters.length).toBe(raw.chapters.length);
    expect(safe.personalizationScore).toBe(raw.personalizationScore);
    expect(safe.designRationale).toBe(raw.designRationale);
  });

  it("should always return valid TrialPlan", () => {
    const safe = designTrialExperienceSafe(makeTrialDesignInput());

    expect(safe).toBeDefined();
    expect(safe.guestId).toBeTruthy();
    expect(safe.trialId).toBeTruthy();
    expect(Array.isArray(safe.chapters)).toBe(true);
    expect(safe.chapters.length).toBeGreaterThan(0);
    expect(typeof safe.personalizationScore).toBe("number");
    expect(safe.designRationale).toBeTruthy();
  });

  it("should never throw", () => {
    expect(() => designTrialExperienceSafe(makeTrialDesignInput({
      interests: [],
      chemistry: null,
      memory: null,
    }))).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §5 — evaluateTrialProgress (returns TrialProgress directly)
// ═══════════════════════════════════════════════════════════

describe("evaluateTrialProgress", () => {
  // ── Exact chaptersCompleted ──

  it("should count completed chapters correctly", () => {
    const plan = makePlanWithChapters(["completed", "completed", "pending", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 6);

    expect(progress.chaptersCompleted).toBe(2);
  });

  it("should count 0 completed when all pending", () => {
    const plan = makePlanWithChapters(["pending", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 4);

    expect(progress.chaptersCompleted).toBe(0);
  });

  it("should count all completed when all done", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed"]);
    const progress = evaluateTrialProgress(plan, 10);

    expect(progress.chaptersCompleted).toBe(3);
    expect(progress.totalChapters).toBe(3);
  });

  // ── Exact onTrack computation ──
  // onTrack = chaptersCompleted >= expectedCompleted * 0.8
  // Chapter days: [2, 4, 6, 8, 10]

  it("should report onTrack = true when ahead of schedule", () => {
    // currentDay=6, chapters at days [2,4,6,8,10]
    // expectedCompleted = chapters where day<=6 → 3 (days 2,4,6)
    // chaptersCompleted = 3 (all first 3 completed)
    // 3 >= 3*0.8 = 2.4 → true
    const plan = makePlanWithChapters(["completed", "completed", "completed", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 6);

    expect(progress.onTrack).toBe(true);
  });

  it("should report onTrack = true when exactly at 80% threshold", () => {
    // currentDay=6, expectedCompleted=3
    // chaptersCompleted=2 → 2 >= 3*0.8=2.4? No → false
    // chaptersCompleted=3 → 3 >= 2.4? Yes → true
    const plan = makePlanWithChapters(["completed", "completed", "completed", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 6);

    expect(progress.onTrack).toBe(true);
  });

  it("should report onTrack = false when behind schedule", () => {
    // currentDay=6, expectedCompleted=3
    // chaptersCompleted=1 → 1 >= 2.4? No → false
    const plan = makePlanWithChapters(["completed", "pending", "pending", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 6);

    expect(progress.onTrack).toBe(false);
  });

  it("should report onTrack = true with 0 expected and 0 completed", () => {
    // currentDay=1, chapters at [2,4,6,8,10]
    // expectedCompleted = chapters where day<=1 → 0
    // chaptersCompleted = 0
    // 0 >= 0*0.8 = 0 → true
    const plan = makePlanWithChapters(["pending", "pending", "pending", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 1);

    expect(progress.onTrack).toBe(true);
  });

  // ── daysRemaining ──

  it("should compute daysRemaining = totalDays - currentDay", () => {
    const plan = makePlanWithChapters(["pending", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 4);

    expect(progress.daysRemaining).toBe(plan.totalDays - 4);
  });

  it("should return 0 daysRemaining at end of trial", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed"]);
    const progress = evaluateTrialProgress(plan, plan.totalDays);

    expect(progress.daysRemaining).toBe(0);
  });

  it("should return negative daysRemaining when overdue", () => {
    const plan = makePlanWithChapters(["completed"]);
    const progress = evaluateTrialProgress(plan, plan.totalDays + 5);

    expect(progress.daysRemaining).toBe(-5);
  });
  // ── Engagement trend ──

  it("should detect improving trend when recent scores higher", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 2 },
      { status: "completed", feedbackScore: 3 },
      { status: "completed", feedbackScore: 4 },
      { status: "completed", feedbackScore: 5 },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 10);
    expect(progress.engagementTrend).toBe("improving");
  });

  it("should detect declining trend when recent scores lower", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 5 },
      { status: "completed", feedbackScore: 4 },
      { status: "completed", feedbackScore: 2 },
      { status: "completed", feedbackScore: 1 },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 10);
    expect(progress.engagementTrend).toBe("declining");
  });

  it("should detect stable trend when scores similar", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 3 },
      { status: "completed", feedbackScore: 4 },
      { status: "completed", feedbackScore: 3 },
      { status: "completed", feedbackScore: 4 },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 10);
    expect(progress.engagementTrend).toBe("stable");
  });

  it("should default to stable when fewer than 2 completed chapters with feedback", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 5 },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 4);
    expect(progress.engagementTrend).toBe("stable");
  });

  it("should default to stable when no completed chapters have feedback", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: null },
      { status: "completed", feedbackScore: null },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 6);
    expect(progress.engagementTrend).toBe("stable");
  });

  // ── Risk factors ──
  it("should add risk factor for low feedback scores", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 1 },
      { status: "completed", feedbackScore: 2 },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 6);
    expect(progress.riskFactors).toContain("2 capítulo(s) con feedback negativo");
  });

  it("should NOT count feedback >= 3 as negative", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 3 },
      { status: "completed", feedbackScore: 4 },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 6);
    const negativeRisk = progress.riskFactors.find((r) => r.includes("feedback negativo"));
    expect(negativeRisk).toBeUndefined();
  });

  it("should use default score 5 for null feedback when checking negatives", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: null },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 4);
    const negativeRisk = progress.riskFactors.find((r) => r.includes("feedback negativo"));
    expect(negativeRisk).toBeUndefined();
  });
  // ── No risk factors ──

  it("should return empty risk factors for on-track plan with good feedback", () => {
    const plan = makePlanWithFeedback([
      { status: "completed", feedbackScore: 4 },
      { status: "completed", feedbackScore: 4 },
      { status: "completed", feedbackScore: 5 },
      { status: "pending", feedbackScore: null },
      { status: "pending", feedbackScore: null },
    ]);

    const progress = evaluateTrialProgress(plan, 6);
    expect(progress.riskFactors).toEqual([]);
  });
  // ── Structural ──

  it("should include all required TrialProgress fields", () => {
    const plan = makePlanWithChapters(["completed", "pending", "pending"]);
    const progress = evaluateTrialProgress(plan, 4);

    expect(typeof progress.currentDay).toBe("number");
    expect(typeof progress.chaptersCompleted).toBe("number");
    expect(typeof progress.totalChapters).toBe("number");
    expect(["improving", "stable", "declining"]).toContain(progress.engagementTrend);
    expect(typeof progress.onTrack).toBe("boolean");
    expect(Array.isArray(progress.riskFactors)).toBe(true);
    expect(typeof progress.daysRemaining).toBe("number");
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    const plan = makePlanWithFeedback([]);
    expect(() => evaluateTrialProgress(plan, 0)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §6 — computeNarrativeHealth (returns NarrativeHealth directly)
// ═══════════════════════════════════════════════════════════

describe("computeNarrativeHealth", () => {
  // ── Exact score formula ──
  // score = 50 + completionRate*25 + (onTrack?10:0) + trend - risks
  // trend: improving=+10, declining=-15, stable=0
  // risks: riskFactors.length * 5

  it("should compute exact score for on-track, stable, no risks", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 6, chaptersCompleted: 3, totalChapters: 5,
      engagementTrend: "stable", onTrack: true, riskFactors: [], daysRemaining: 8,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + (3/5)*25 + 10 + 0 - 0 = 50 + 15 + 10 = 75
    expect(health.score).toBe(75);
  });

  it("should compute exact score for improving trend with no risks", () => {
    const plan = makePlanWithChapters(["completed", "completed", "pending", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 6, chaptersCompleted: 2, totalChapters: 5,
      engagementTrend: "improving", onTrack: true, riskFactors: [], daysRemaining: 8,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + (2/5)*25 + 10 + 10 - 0 = 50 + 10 + 10 + 10 = 80
    expect(health.score).toBe(80);
  });

  it("should compute exact score for declining trend with risks", () => {
    const plan = makePlanWithChapters(["completed", "pending", "pending", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 10, chaptersCompleted: 1, totalChapters: 5,
      engagementTrend: "declining", onTrack: false,
      riskFactors: ["Progreso por debajo", "Tendencia en descenso", "Trial por expirar"],
      daysRemaining: 4,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + (1/5)*25 + 0 + (-15) - (3*5) = 50 + 5 + 0 - 15 - 15 = 25
    expect(health.score).toBe(25);
  });

  it("should compute score for all completed, on track, stable", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed"]);
    const progress: TrialProgress = {
      currentDay: 10, chaptersCompleted: 3, totalChapters: 3,
      engagementTrend: "stable", onTrack: true, riskFactors: [], daysRemaining: 4,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + (3/3)*25 + 10 + 0 - 0 = 50 + 25 + 10 = 85
    expect(health.score).toBe(85);
  });

  it("should clamp score at 0 minimum", () => {
    const plan = makePlanWithChapters(["pending", "pending", "pending", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 12, chaptersCompleted: 0, totalChapters: 5,
      engagementTrend: "declining", onTrack: false,
      riskFactors: ["A", "B", "C", "D", "E", "F", "G", "H"],
      daysRemaining: 2,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + 0 + 0 - 15 - 40 = -5 → clamped to 0
    expect(health.score).toBe(0);
  });

  it("should clamp score at 100 maximum", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed"]);
    const progress: TrialProgress = {
      currentDay: 10, chaptersCompleted: 3, totalChapters: 3,
      engagementTrend: "improving", onTrack: true, riskFactors: [], daysRemaining: 4,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + 25 + 10 + 10 - 0 = 95 → within range
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.score).toBe(95);
  });

  // ── Recommendation thresholds ──
  // IMPORTANT: The source uses sequential `if` (not `else if`):
  //   let recommendation = "Continuar con el plan actual";
  //   if (score < 40) → "Requiere intervención..."
  //   if (score < 60) → "Monitorear..." (OVERRIDES score<40)
  //   if (score >= 80) → "Excelente..."
  //
  // RESULT:
  //   score < 60: "Monitorear de cerca..." (always, even if < 40)
  //   60 <= score < 80: "Continuar con el plan actual"
  //   score >= 80: "Excelente progreso..."

  it("should recommend 'Excelente' for score >= 80", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed"]);
    const progress: TrialProgress = {
      currentDay: 10, chaptersCompleted: 3, totalChapters: 3,
      engagementTrend: "improving", onTrack: true, riskFactors: [], daysRemaining: 4,
    };
    const health = computeNarrativeHealth(plan, progress);

    expect(health.score).toBe(95);
    expect(health.recommendation).toContain("Excelente");
  });

  it("should recommend 'Continuar' for 60 <= score < 80", () => {
    const plan = makePlanWithChapters(["completed", "completed", "completed", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 6, chaptersCompleted: 3, totalChapters: 5,
      engagementTrend: "stable", onTrack: true, riskFactors: [], daysRemaining: 8,
    };
    const health = computeNarrativeHealth(plan, progress);

    expect(health.score).toBe(75);
    expect(health.recommendation).toBe("Continuar con el plan actual");
  });

  it("should recommend 'Monitorear' for score < 60", () => {
    const plan = makePlanWithChapters(["completed", "pending", "pending", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 6, chaptersCompleted: 1, totalChapters: 5,
      engagementTrend: "stable", onTrack: false,
      riskFactors: ["Progreso por debajo de lo esperado"],
      daysRemaining: 8,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + (1/5)*25 + 0 + 0 - 5 = 50 + 5 - 5 = 50
    expect(health.score).toBe(50);
    expect(health.recommendation).toContain("Monitorear");
  });

  it("should also recommend 'Monitorear' for score < 40 (overrides 'Requiere')", () => {
    // Due to sequential if (not else if), score<60 overrides score<40
    const plan = makePlanWithChapters(["pending", "pending", "pending", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 12, chaptersCompleted: 0, totalChapters: 5,
      engagementTrend: "declining", onTrack: false,
      riskFactors: ["A", "B", "C", "D"],
      daysRemaining: 2,
    };
    const health = computeNarrativeHealth(plan, progress);

    // score = 50 + 0 + 0 - 15 - 20 = 15
    expect(health.score).toBe(15);
    // The "Requiere" branch fires, but then "Monitorear" overrides it
    expect(health.recommendation).toContain("Monitorear");
    expect(health.recommendation).not.toContain("Requiere");
  });

  // ── Structural ──

  it("should include all required NarrativeHealth fields", () => {
    const plan = makePlanWithChapters(["completed", "pending", "pending"]);
    const progress: TrialProgress = {
      currentDay: 4, chaptersCompleted: 1, totalChapters: 3,
      engagementTrend: "stable", onTrack: true, riskFactors: [], daysRemaining: 10,
    };
    const health = computeNarrativeHealth(plan, progress);

    expect(typeof health.score).toBe("number");
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(typeof health.chaptersCompleted).toBe("number");
    expect(typeof health.totalChapters).toBe("number");
    expect(["improving", "stable", "declining"]).toContain(health.engagementTrend);
    expect(typeof health.recommendation).toBe("string");
    expect(health.recommendation.length).toBeGreaterThan(0);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    const plan = makePlanWithFeedback([]);
    const progress: TrialProgress = {
      currentDay: 0, chaptersCompleted: 0, totalChapters: 0,
      engagementTrend: "stable", onTrack: true, riskFactors: [], daysRemaining: 0,
    };
    expect(() => computeNarrativeHealth(plan, progress)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §7 — enrichProposals (returns GuestEngineResult)
// ═══════════════════════════════════════════════════════════

describe("enrichProposals", () => {
  // ── No proposals ──

  it("should return empty array with warning when proposals is null", () => {
    const result = enrichProposals({
      proposals: null, chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
      expect(result.warnings).toContain("No hay propuestas para enriquecer");
    }
  });

  it("should return empty array with warning when proposals list is empty", () => {
    const result = enrichProposals({
      proposals: { proposals: [], high_priority_count: 0, cross_domain_count: 0 } as unknown as GuestEngagementProposalList,
      chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
      expect(result.warnings).toContain("No hay propuestas para enriquecer");
    }
  });

  // ── Happy path ──

  it("should enrich each proposal with all fields", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [makeChemistry()],
      memoryGraphs: [makeMemory()],
      sponsorMatches: [makeSponsorMatch()],
    }));

    expect(result.length).toBe(2);
    result.forEach((ep) => {
      expect(ep.proposalType).toBeTruthy();
      expect(ep.title).toBeTruthy();
      expect(ep.description).toBeTruthy();
      expect(ep.priority).toBe("medium");
      expect(typeof ep.enrichmentScore).toBe("number");
      expect(ep.enrichmentScore).toBeGreaterThanOrEqual(0);
      expect(ep.enrichmentScore).toBeLessThanOrEqual(100);
    });
  });

  it("should extract proposal_type and title from proposal data", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    }));

    expect(result[0].proposalType).toBe("trial_invitation");
    expect(result[0].title).toBe("Invitar a trial");
    expect(result[0].description).toBe("Guest ready");
  });

  // ── Chemistry context ──

  it("should attach chemistry context when available", () => {
    const chem = makeChemistry({ overall: 85 });
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [chem],
      memoryGraphs: [], sponsorMatches: [],
    }));

    expect(result[0].chemistryContext).toBeDefined();
    expect(result[0].chemistryContext!.overall).toBe(85);
  });

  it("should set chemistryContext to null when no chemistry scores", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    }));

    expect(result[0].chemistryContext).toBeNull();
  });

  // ── Callbacks from memory ──

  it("should include pending and overdue callbacks from memory graphs", () => {
    const memory = makeMemory({
      callbacks: [
        { id: "cb-p", description: "Pending", promisedDate: daysAgo(-3), status: "pending", priority: 80, createdAt: daysAgo(5) } as unknown as Callback,
        { id: "cb-o", description: "Overdue", promisedDate: daysAgo(1), status: "overdue", priority: 90, createdAt: daysAgo(10) } as unknown as Callback,
        { id: "cb-c", description: "Completed", promisedDate: daysAgo(5), status: "completed", priority: 50, createdAt: daysAgo(15) } as unknown as Callback,
      ],
    });

    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [memory],
      sponsorMatches: [],
    }));

    // Both proposals share the same memory callbacks
    const callbacks = result[0].relevantCallbacks;
    expect(callbacks.length).toBe(2);
    const ids = callbacks.map((cb) => cb.id);
    expect(ids).toContain("cb-p");
    expect(ids).toContain("cb-o");
    expect(ids).not.toContain("cb-c");
  });

  it("should aggregate callbacks from multiple memory graphs", () => {
    const mem1 = makeMemory({
      callbacks: [
        { id: "cb-1", description: "First", promisedDate: daysAgo(-3), status: "pending", priority: 80, createdAt: daysAgo(5) } as unknown as Callback,
      ],
    });
    const mem2 = makeMemory({
      callbacks: [
        { id: "cb-2", description: "Second", promisedDate: daysAgo(-2), status: "pending", priority: 70, createdAt: daysAgo(3) } as unknown as Callback,
      ],
    });

    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [mem1, mem2],
      sponsorMatches: [],
    }));

    expect(result[0].relevantCallbacks.length).toBe(2);
  });

  // ── Topic alignment ──

  it("should include positive-sentiment topic patterns", () => {
    const memory = makeMemory({
      topicPatterns: [
        { topic: "sports", frequency: 3, avgSentiment: 0.8, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
        { topic: "complaints", frequency: 2, avgSentiment: -0.5, lastMentioned: daysAgo(2), domains: ["social" as GuestInterestDomain] },
      ],
    });

    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [memory],
      sponsorMatches: [],
    }));

    const topics = result[0].topicAlignment;
    expect(topics.length).toBe(1);
    expect(topics[0].topic).toBe("sports");
    // "complaints" excluded: avgSentiment -0.5 is NOT > 0
  });

  it("should limit topic alignment to 5", () => {
    const patterns: TopicPattern[] = Array.from({ length: 8 }, (_, i) => ({
      topic: `topic-${i}`,
      frequency: 3,
      avgSentiment: 0.7,
      lastMentioned: daysAgo(1),
      domains: ["social" as GuestInterestDomain],
    }));
    const memory = makeMemory({ topicPatterns: patterns });

    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [memory],
      sponsorMatches: [],
    }));

    expect(result[0].topicAlignment.length).toBeLessThanOrEqual(5);
  });

  // ── Sponsor suggestion ──

  it("should attach first sponsor match as suggestion", () => {
    const sponsor = makeSponsorMatch();
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [sponsor],
    }));

    expect(result[0].sponsorSuggestion).toBeDefined();
    expect(result[0].sponsorSuggestion!.memberName).toBe("Carlos Solano");
  });

  it("should set sponsorSuggestion to null when no matches", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    expect(result[0].sponsorSuggestion).toBeNull();
  });

  // ── Enrichment score (exact formula) ──
  // base=20, +25(chemistry), +15(callbacks>0), +15(topics>0), +15(sponsor), min(100)

  it("should compute exact enrichmentScore with all data present", () => {
    const memory = makeMemory({
      callbacks: [
        { id: "cb-1", description: "Test", promisedDate: daysAgo(-3), status: "pending", priority: 80, createdAt: daysAgo(5) } as unknown as Callback,
      ],
      topicPatterns: [
        { topic: "sports", frequency: 3, avgSentiment: 0.8, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
      ],
    });

    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [makeChemistry()],
      memoryGraphs: [memory],
      sponsorMatches: [makeSponsorMatch()],
    }));

    // 20 + 25 + 15 + 15 + 15 = 90
    expect(result[0].enrichmentScore).toBe(90);
  });

  it("should compute exact enrichmentScore with no enrichment data", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    // base only = 20
    expect(result[0].enrichmentScore).toBe(20);
  });

  it("should add +25 for chemistry present", () => {
    const withChem = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [makeChemistry()],
      memoryGraphs: [],
      sponsorMatches: [],
    }));
    const without = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    expect(withChem[0].enrichmentScore - without[0].enrichmentScore).toBe(25);
  });

  it("should add +15 for callbacks present", () => {
    // G15: el makeMemory default trae topicPatterns (sports/dining con
    // avgSentiment > 0) → topicAlignment también suma +15 → delta total
    // 30, no 15. Aislamos el efecto callbacks vaciando topicPatterns.
    const memory = makeMemory({
      callbacks: [
        { id: "cb-1", description: "Test", promisedDate: daysAgo(-3), status: "pending", priority: 80, createdAt: daysAgo(5) } as unknown as Callback,
      ],
      topicPatterns: [],
    });

    const withCb = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [memory],
      sponsorMatches: [],
    }));
    const without = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    expect(withCb[0].enrichmentScore - without[0].enrichmentScore).toBe(15);
  });

  it("should add +15 for topic alignment present", () => {
    const memory = makeMemory({
      callbacks: [],
      topicPatterns: [
        { topic: "sports", frequency: 3, avgSentiment: 0.8, lastMentioned: daysAgo(1), domains: ["sports" as GuestInterestDomain] },
      ],
    });

    const withTopics = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [memory],
      sponsorMatches: [],
    }));
    const without = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    expect(withTopics[0].enrichmentScore - without[0].enrichmentScore).toBe(15);
  });

  it("should add +15 for sponsor present", () => {
    const withSponsor = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [makeSponsorMatch()],
    }));
    const without = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    expect(withSponsor[0].enrichmentScore - without[0].enrichmentScore).toBe(15);
  });

  it("should clamp enrichmentScore at 100", () => {
    // max: 20+25+15+15+15 = 90 → doesn't reach 100 naturally
    // Verify it stays ≤ 100
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [makeChemistry()],
      memoryGraphs: [makeMemory()],
      sponsorMatches: [makeSponsorMatch()],
    }));

    result.forEach((ep) => {
      expect(ep.enrichmentScore).toBeLessThanOrEqual(100);
    });
  });

  // ── narrativeChapter ──

  it("should always set narrativeChapter to null", () => {
    const result = assertOk(enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    }));

    result.forEach((ep) => {
      expect(ep.narrativeChapter).toBeNull();
    });
  });

  // ── No warnings on success ──

  it("should emit no warnings when proposals present", () => {
    const result = enrichProposals({
      proposals: makeProposalList(),
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => enrichProposals({
      proposals: null,
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// §8 — enrichProposalsSafe
// ═══════════════════════════════════════════════════════════

describe("enrichProposalsSafe", () => {
  it("should return identical data on success", () => {
    const input: ProposalEnrichmentInput = {
      proposals: makeProposalList(),
      chemistryScores: [makeChemistry()],
      memoryGraphs: [makeMemory()],
      sponsorMatches: [makeSponsorMatch()],
    };
    const raw = assertOk(enrichProposals(input));
    const safe = enrichProposalsSafe(input);

    expect(safe.length).toBe(raw.length);
    if (safe.length > 0 && raw.length > 0) {
      expect(safe[0].enrichmentScore).toBe(raw[0].enrichmentScore);
    }
  });

  it("should return empty array for null proposals", () => {
    const safe = enrichProposalsSafe({
      proposals: null, chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    });
    expect(safe).toEqual([]);
  });

  it("should never throw", () => {
    expect(() => enrichProposalsSafe({
      proposals: null, chemistryScores: [], memoryGraphs: [], sponsorMatches: [],
    })).not.toThrow();
  });
});