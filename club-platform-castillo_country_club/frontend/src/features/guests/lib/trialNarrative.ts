// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/trialNarrative.ts
// Phase 34 "The Gateway" — Trial Narrative Engine
// Level 6+ Agency · Production Grade
//
// Transforms generic trial memberships into personalized stories.
// The trial is not "30 days of access." It's a story the club
// co-writes with the guest. Each chapter has a purpose.
//
// Depends on: types.ts, config.ts
// Budget: 30ms
// ═══════════════════════════════════════════════════════════

import type {
  GuestEngineResult,
  GuestId,
  TrialId,
  TrialPlan,
  TrialChapter,
  TrialChapterStatus,
  TrialProgress,
  NarrativeHealth,
  EnrichedProposal,
  ChemistryScore,
  MemoryGraph,
  Callback,
  TopicPattern,
  SponsorMatch,
} from "../types";

import {
  engineOk
} from "../types";
import type {
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// §1 — INPUT CONTRACTS
// ═══════════════════════════════════════════════════════════

export interface TrialDesignInput {
  readonly guestId: GuestId;
  readonly trialId: TrialId;
  readonly totalDays: number;
  readonly interests: readonly string[];
  readonly availableActivities: readonly string[];
  readonly chemistry: ChemistryScore | null;
  readonly memory: MemoryGraph | null;
}

export interface ProposalEnrichmentInput {
  readonly proposals: GuestEngagementProposalList | null;
  readonly chemistryScores: readonly ChemistryScore[];
  readonly memoryGraphs: readonly MemoryGraph[];
  readonly sponsorMatches: readonly SponsorMatch[];
}

// ═══════════════════════════════════════════════════════════
// §2 — TRIAL PLAN DESIGN
// ═══════════════════════════════════════════════════════════

/** Chapter templates by interest domain. */
const CHAPTER_TEMPLATES: Record<string, readonly {
  readonly title: string;
  readonly activity: string;
  readonly purpose: string;
  readonly expectedOutcome: string;
  readonly fallback: string;
}[]> = {
  sports: [
    {
      title: "Descubrir tu cancha",
      activity: "Sesión de tennis o golf con coach",
      purpose: "Evaluar interés en deportes de raqueta",
      expectedOutcome: "Guest prueba deporte y descubre nivel",
      fallback: "Si no le gusta → probar gym o piscina",
    },
    {
      title: "Clase grupal",
      activity: "Participar en clase grupal de fitness",
      purpose: "Evaluar componente social del deporte",
      expectedOutcome: "Guest conoce otros miembros activos",
      fallback: "Si prefiere solo → sesión personal",
    },
  ],
  dining: [
    {
      title: "Cena de descubrimiento",
      activity: "Cena en el restaurante principal",
      purpose: "Evaluar afinidad gastronómica con el club",
      expectedOutcome: "Guest disfruta experiencia gastronómica",
      fallback: "Si tiene restricciones → menú especial",
    },
  ],
  social: [
    {
      title: "Círculo social",
      activity: "Asistir a evento social del club",
      purpose: "Evaluar integración social del guest",
      expectedOutcome: "Guest forma conexiones con miembros",
      fallback: "Si es introvertido → evento más íntimo",
    },
  ],
};

/**
 * Design a personalized trial experience as a narrative journey.
 * Each chapter is a day with purpose, activity, and fallback.
 *
 * @param input - Guest profile + available activities
 * @returns GuestEngineResult with TrialPlan
 */
export function designTrialExperience(
  input: TrialDesignInput,
): GuestEngineResult<TrialPlan> {
  const warnings: string[] = [];
  if (!input.chemistry) warnings.push("Sin chemistry score — plan genérico");
  if (!input.memory) warnings.push("Sin memory graph — no se personalizan callbacks");

  const chapters: TrialChapter[] = [];
  const chaptersCount = Math.ceil(input.totalDays / 3); // One chapter every 3 days

  // Build chapters based on interests
  let dayCounter = 1;

  // Chapter 1: Always welcome + discovery
  chapters.push({
    day: 1,
    title: "Bienvenida personalizada",
    activity: "Tour por las instalaciones + primera actividad",
    purpose: "Crear primera impresión excepcional",
    expectedOutcome: "Guest se siente bienvenido y descubre posibilidades",
    fallback: "Adaptar tour a nivel de comodidad del guest",
    status: "pending",
    completedAt: null,
    feedbackScore: null,
  });
  dayCounter = 3;

  // Interest-based chapters
  for (const interest of input.interests.slice(0, chaptersCount - 2)) {
    const templates = CHAPTER_TEMPLATES[interest] ?? CHAPTER_TEMPLATES["social"];
    const template = templates[chapters.length % templates.length];

    chapters.push({
      day: dayCounter,
      title: template.title,
      activity: template.activity,
      purpose: template.purpose,
      expectedOutcome: template.expectedOutcome,
      fallback: template.fallback,
      status: "pending",
      completedAt: null,
      feedbackScore: null,
    });
    dayCounter += Math.max(2, Math.floor(input.totalDays / chaptersCount));
  }

  // Add social integration chapter
  chapters.push({
    day: Math.min(input.totalDays - 2, dayCounter),
    title: "Integración social",
    activity: "Evento exclusivo para trial members",
    purpose: "Evaluar pertenencia al club",
    expectedOutcome: "Guest se visualiza como miembro",
    fallback: "Si no asiste → invitación a próxima cena exclusiva",
    status: "pending",
    completedAt: null,
    feedbackScore: null,
  });

  // Final chapter: conversion conversation
  chapters.push({
    day: input.totalDays - 1,
    title: "La conversación",
    activity: "Reunión con director de membresía",
    purpose: "Evaluar disposición a convertirse en miembro",
    expectedOutcome: "Guest acepta propuesta de membresía",
    fallback: "Si necesita más tiempo → extender trial 2 semanas",
    status: "pending",
    completedAt: null,
    feedbackScore: null,
  });

  // Sort by day
  chapters.sort((a, b) => a.day - b.day);

  // Personalization score
  let personalizationScore = 30; // base
  if (input.chemistry) personalizationScore += 20;
  if (input.memory) personalizationScore += 15;
  if (input.interests.length >= 2) personalizationScore += 15;
  if (input.availableActivities.length >= 3) personalizationScore += 10;
  personalizationScore = Math.min(100, personalizationScore);

  // Design rationale
  const rationale = buildDesignRationale(input, chapters.length);

  return engineOk<TrialPlan>({
    guestId: input.guestId,
    trialId: input.trialId,
    chapters,
    totalDays: input.totalDays,
    personalizationScore,
    designRationale: rationale,
    createdAt: new Date().toISOString(),
  }, warnings);
}

/**
 * Safe variant — always returns a valid TrialPlan.
 */
export function designTrialExperienceSafe(
  input: TrialDesignInput,
): TrialPlan {
  const result = designTrialExperience(input);
  return result.ok ? result.data : {
    guestId: input.guestId,
    trialId: input.trialId,
    chapters: [{
      day: 1,
      title: "Bienvenida",
      activity: "Tour por instalaciones",
      purpose: "Primera impresión",
      expectedOutcome: "Guest se siente bienvenido",
      fallback: "Adaptar según comodidad",
      status: "pending" as TrialChapterStatus,
      completedAt: null,
      feedbackScore: null,
    }],
    totalDays: input.totalDays,
    personalizationScore: 0,
    designRationale: "Plan de emergencia — datos insuficientes para personalización",
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — TRIAL PROGRESS EVALUATION
// ═══════════════════════════════════════════════════════════

/**
 * Evaluate current progress through a trial plan.
 * Determines if the guest is on track, behind, or ahead.
 *
 * @param plan - The active trial plan
 * @param currentDay - Current day in the trial
 * @returns TrialProgress evaluation
 */
export function evaluateTrialProgress(
  plan: TrialPlan,
  currentDay: number,
): TrialProgress {
  const chaptersCompleted = plan.chapters.filter(
    ch => ch.status === "completed",
  ).length;

  const expectedCompleted = plan.chapters.filter(
    ch => ch.day <= currentDay,
  ).length;

  const onTrack = chaptersCompleted >= expectedCompleted * 0.8;
  const daysRemaining = plan.totalDays - currentDay;

  // Engagement trend based on feedback scores
  const completedWithFeedback = plan.chapters.filter(
    ch => ch.status === "completed" && ch.feedbackScore !== null,
  );
  let engagementTrend: "improving" | "stable" | "declining" = "stable";

  if (completedWithFeedback.length >= 2) {
    const recent = completedWithFeedback.slice(-2);
    const early = completedWithFeedback.slice(0, 2);
    const recentAvg = recent.reduce((s, ch) => s + (ch.feedbackScore ?? 0), 0) / recent.length;
    const earlyAvg = early.reduce((s, ch) => s + (ch.feedbackScore ?? 0), 0) / early.length;
    engagementTrend = recentAvg > earlyAvg + 0.5 ? "improving"
      : recentAvg < earlyAvg - 0.5 ? "declining"
      : "stable";
  }

  // Risk factors
  const riskFactors: string[] = [];
  if (!onTrack) riskFactors.push("Progreso por debajo de lo esperado");
  if (engagementTrend === "declining") riskFactors.push("Tendencia de engagement en descenso");
  if (daysRemaining <= 7 && chaptersCompleted < plan.chapters.length * 0.6) {
    riskFactors.push("Trial por expirar con bajo avance");
  }
  const lowScores = completedWithFeedback.filter(ch => (ch.feedbackScore ?? 5) < 3);
  if (lowScores.length > 0) {
    riskFactors.push(`${lowScores.length} capítulo(s) con feedback negativo`);
  }

  return {
    currentDay,
    chaptersCompleted,
    totalChapters: plan.chapters.length,
    engagementTrend,
    onTrack,
    riskFactors,
    daysRemaining,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — NARRATIVE HEALTH
// ═══════════════════════════════════════════════════════════

/**
 * Compute health of the trial narrative.
 * Is the story unfolding well?
 */
export function computeNarrativeHealth(
  _plan: TrialPlan,
  progress: TrialProgress,
): NarrativeHealth {
  let score = 50; // base

  // Completion rate bonus
  const completionRate = progress.totalChapters > 0
    ? progress.chaptersCompleted / progress.totalChapters
    : 0;
  score += completionRate * 25;

  // On track bonus
  if (progress.onTrack) score += 10;

  // Engagement trend
  if (progress.engagementTrend === "improving") score += 10;
  if (progress.engagementTrend === "declining") score -= 15;

  // Risk penalty
  score -= progress.riskFactors.length * 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let recommendation = "Continuar con el plan actual";
  if (score < 40) recommendation = "Requiere intervención inmediata — reconsiderar plan";
  if (score < 60) recommendation = "Monitorear de cerca — posible ajuste necesario";
  if (score >= 80) recommendation = "Excelente progreso — mantener momentum hacia conversión";

  return {
    score,
    chaptersCompleted: progress.chaptersCompleted,
    totalChapters: progress.totalChapters,
    engagementTrend: progress.engagementTrend,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════
// §5 — PROPOSAL ENRICHMENT
// ═══════════════════════════════════════════════════════════

/**
 * Enrich backend proposals with chemistry, memory, and sponsor context.
 * The backend generates generic proposals.
 * This engine adds personalized intelligence.
 *
 * @param input - Proposals from MCP + engine outputs
 * @returns GuestEngineResult with enriched proposals
 */
export function enrichProposals(
  input: ProposalEnrichmentInput,
): GuestEngineResult<readonly EnrichedProposal[]> {
  const { proposals, chemistryScores, memoryGraphs, sponsorMatches } = input;

  if (!proposals?.proposals?.length) {
    return engineOk<readonly EnrichedProposal[]>([], ["No hay propuestas para enriquecer"]);
  }

  const enriched: EnrichedProposal[] = proposals.proposals.map(proposal => {
    const proposalType = (proposal as unknown as Record<string, unknown>).proposal_type as string ?? "unknown";
    const title = (proposal as unknown as Record<string, unknown>).title as string ?? proposalType;
    const description = (proposal as unknown as Record<string, unknown>).description as string ?? "";

    // Find relevant chemistry (use first available for now)
    const chemistry = chemistryScores[0] ?? null;

    // Find relevant callbacks
    const relevantCallbacks: Callback[] = [];
    for (const graph of memoryGraphs) {
      relevantCallbacks.push(
        ...graph.callbacks.filter(cb => cb.status === "pending" || cb.status === "overdue"),
      );
    }

    // Find relevant topic patterns
    const topicAlignment: TopicPattern[] = [];
    for (const graph of memoryGraphs) {
      topicAlignment.push(
        ...graph.topicPatterns.filter(tp => tp.avgSentiment > 0),
      );
    }

    // Sponsor suggestion
    const sponsorSuggestion = sponsorMatches[0] ?? null;

    // Enrichment score
    let enrichmentScore = 20; // base
    if (chemistry) enrichmentScore += 25;
    if (relevantCallbacks.length > 0) enrichmentScore += 15;
    if (topicAlignment.length > 0) enrichmentScore += 15;
    if (sponsorSuggestion) enrichmentScore += 15;
    enrichmentScore = Math.min(100, enrichmentScore);

    return {
      proposalType,
      title,
      description,
      priority: "medium" as const,
      chemistryContext: chemistry,
      relevantCallbacks,
      topicAlignment: topicAlignment.slice(0, 5),
      sponsorSuggestion,
      narrativeChapter: null,
      enrichmentScore,
    };
  });

  return engineOk<readonly EnrichedProposal[]>(enriched);
}

/**
 * Safe variant — always returns array.
 */
export function enrichProposalsSafe(
  input: ProposalEnrichmentInput,
): readonly EnrichedProposal[] {
  const result = enrichProposals(input);
  return result.ok ? result.data : [];
}

// ═══════════════════════════════════════════════════════════
// §6 — HELPERS
// ═══════════════════════════════════════════════════════════

function buildDesignRationale(
  input: TrialDesignInput,
  chapterCount: number,
): string {
  const parts: string[] = [];

  parts.push(`Plan de ${input.totalDays} días con ${chapterCount} capítulos`);

  if (input.interests.length > 0) {
    parts.push(`personalizado para intereses: ${input.interests.join(", ")}`);
  }

  if (input.chemistry) {
    parts.push(`química con el club: ${input.chemistry.overall}/100`);
  }

  if (input.memory && input.memory.strength > 50) {
    parts.push(`el club conoce bien a este guest (memoria: ${input.memory.strength}/100)`);
  }

  return parts.join(". ") + ".";
}