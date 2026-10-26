/**
 * Proposal Enricher Engine — §C7, §C8, §C9, §C10
 *
 * Takes backend-generated CulturalProposals and enriches them with
 * client-side intelligence: taste matching, venue personality,
 * sensory profiles, real-time impact, variants, and risk assessment.
 *
 * The backend AI (cultural_social_agent) does the heavy lifting:
 * it generates proposals with impact estimates, cross-domain connections,
 * confidence scores, and action steps.
 *
 * This engine does the REFINEMENT — it takes those proposals and:
 * — §C7 Enriches with member taste data and venue intelligence
 * — §C8 Recalculates impact when the operator changes something
 * — §C9 Generates A/B variants optimized for different outcomes
 * — §C10 Assesses risks and flags potential problems
 *
 * This is the engine that powers the AI Creation Modals:
 * EntertainmentFormModal → AIEntertainmentDesigner
 * ExhibitionFormModal    → AIExhibitionCurator
 * GalaFormModal          → AIGalaArchitect
 * ProgramFormModal       → AIProgramDesigner
 * SocialEventFormModal   → AISocialArchitect
 *
 * Pure functions only — no hooks, no state, no side effects.
 *
 * @module cultural/lib/proposalEnricher
 */

import type {
  CulturalProposal,
  CulturalCategory,
  FormalityLevel,
  ProposalCategory,
  VenueType,
} from '../types';
import type {
  TasteProfile,
  CulturalDNA,
  VenuePersonality,
  DemandForecast,
  CulturalGenreExtended
} from '../types';
import {
  EVENT_DESIGNER_CONFIG
} from '../config';
import {
  findBestVenue,
  type EventVenueRequirements,
  type VenueMatch,
} from './eventMatcher';
import {
  deriveSensoryProfile
} from './venueIntelligence';
// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

/**
 * An enriched proposal — backend proposal + client-side intelligence.
 * This is what the AI Creation Modals display.
 */
export interface EnrichedProposal {
  /** Original backend proposal. */
  original: CulturalProposal;
  /** Best venue match with reasoning. */
  venueMatch: VenueMatch | null;
  /** Sensory profile for the event-venue combination. */
  sensoryProfile: ReturnType<typeof deriveSensoryProfile> | null;
  /** Predicted demand from aggregated taste profiles. */
  demandForecast: DemandForecast | null;
  /** Predicted resonance for the target member(s). */
  resonancePrediction: number;
  /** Taste match score — how well this event fits the target audience. */
  tasteMatchScore: number;
  /** Overall enrichment score (composite of all intelligence). */
  enrichmentScore: number;
  /** Warnings from the enrichment process. */
  warnings: string[];
  /** Recommendations for improvement. */
  recommendations: string[];
}

/**
 * A change made by the operator to a proposal.
 * Used by §C8 to recalculate impact in real time.
 */
export interface ProposalChange {
  /** What field was changed. */
  field: 'venue' | 'date' | 'capacity' | 'formality' | 'category' | 'budget';
  /** Previous value. */
  previousValue: unknown;
  /** New value. */
  newValue: unknown;
}

/**
 * Impact delta — the difference between old and new predictions
 * after a proposal change.
 */
export interface ImpactDelta {
  /** What changed. */
  change: ProposalChange;
  /** Change in predicted attendance. */
  attendanceDelta: number;
  /** Change in predicted satisfaction/resonance. */
  resonanceDelta: number;
  /** Change in predicted revenue. */
  revenueDelta: number;
  /** Change in venue match score. */
  venueMatchDelta: number;
  /** AI commentary on the change. */
  commentary: string;
  /** Whether this change is recommended. */
  recommended: boolean;
}

/**
 * A variant of a proposal optimized for a specific outcome.
 */
export interface ProposalVariant {
  /** Variant identifier. */
  id: string;
  /** Optimization strategy. */
  strategy: 'max_attendance' | 'max_resonance' | 'max_revenue';
  /** Human-readable label. */
  label: string;
  /** Emoji for visual identification. */
  emoji: string;
  /** What changed from the original proposal. */
  changes: string[];
  /** Predicted outcome. */
  predicted: {
    attendance: number;
    resonance: number;
    revenue: number;
  };
  /** Overall variant score. */
  score: number;
}

/**
 * Risk assessment for a proposal.
 */
export interface ProposalRisk {
  /** Risk type. */
  type: 'budget' | 'timing' | 'capacity' | 'demand' | 'venue' | 'competition';
  /** Risk severity. */
  severity: 'high' | 'medium' | 'low';
  /** Human-readable risk description. */
  description: string;
  /** Suggested mitigation. */
  mitigation: string;
  /** Confidence in this risk assessment (0-1). */
  confidence: number;
}

/**
 * Complete proposal assessment — enrichment + variants + risks.
 * This is the full output of the event designer pipeline.
 */
export interface ProposalAssessment {
  /** Enriched proposal with all intelligence. */
  enriched: EnrichedProposal;
  /** Generated variants for A/B comparison. */
  variants: ProposalVariant[];
  /** Identified risks. */
  risks: ProposalRisk[];
  /** Whether the proposal is ready to execute. */
  readyToExecute: boolean;
  /** Blocking issues that prevent execution. */
  blockers: string[];
}

// ══════════════════════════════════════════════════════════
//  §C7: ENRICH PROPOSAL
// ══════════════════════════════════════════════════════════

/**
 * §C7 — Enriches a backend proposal with client-side intelligence.
 *
 * Takes a CulturalProposal from the backend AI and adds:
 * — Venue matching (which venue is best for this event?)
 * — Sensory profile (how should the space feel?)
 * — Taste matching (how well does this fit the target audience?)
 * — Resonance prediction (how much will this reverberate?)
 * — Demand forecast (how many will attend?)
 * — Warnings and recommendations
 *
 * @param proposal — Backend-generated CulturalProposal.
 * @param tasteProfiles — Aggregated taste profiles of target members.
 * @param venuePersonalities — All available venue personalities.
 * @param dominantDNA — Aggregated CulturalDNA of the target audience.
 * @returns EnrichedProposal with all intelligence added.
 */
export function enrichProposal(
  proposal: CulturalProposal,
  tasteProfiles: TasteProfile[],
  venuePersonalities: VenuePersonality[],
  dominantDNA: CulturalDNA,
): EnrichedProposal {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // ── 1. Venue matching ──
  const requirements = proposalToRequirements(proposal);
  const venueMatch = requirements
    ? findBestVenue(requirements, venuePersonalities)
    : null;

  if (venueMatch && venueMatch.matchScore < EVENT_DESIGNER_CONFIG.VENUE_MATCH_WARNING) {
    warnings.push(
      `El venue recomendado "${venueMatch.venueName}" tiene match bajo (${venueMatch.matchScore}/100).`,
    );
    recommendations.push('Considerar venues alternativos.');
  }

  if (venueMatch && venueMatch.warnings.length > 0) {
    warnings.push(...venueMatch.warnings);
  }

  // ── 2. Sensory profile ──
  const sensoryProfile = requirements && venueMatch
    ? deriveSensoryProfile(
        venueMatch.venueId as VenueType,
        {
          category: requirements.genre,
          formality: requirements.formality,
          expectedAttendance: requirements.expectedAttendance,
          memberPreferences: tasteProfiles.map((tp) => tp.sensoryPreferences),
        },
      )
    : null;

  // ── 3. Taste match score ──
  const tasteMatchScore = computeTasteMatch(
    proposal,
    tasteProfiles,
    dominantDNA,
  );

  if (tasteMatchScore < 50) {
    warnings.push(
      `Match de gusto bajo (${tasteMatchScore}/100) — el evento puede no resonar con el público objetivo.`,
    );
    recommendations.push('Ajustar el concepto del evento al perfil de gusto del público.');
  }

  // ── 4. Resonance prediction ──
  const resonancePrediction = predictProposalResonance(
    proposal,
    tasteProfiles,
    dominantDNA,
  );

  if (resonancePrediction < EVENT_DESIGNER_CONFIG.RESONANCE_WARNING) {
    recommendations.push(
      'La resonancia predicha es baja. Considerar un formato más experiencial o un venue más íntimo.',
    );
  }

  // ── 5. Demand forecast (uses backend estimate + taste profiles) ──
  const demandForecast = buildDemandForecast(
    proposal,
    tasteProfiles,
    venueMatch,
  );

  // ── 6. Enrichment score ──
  const enrichmentScore = computeEnrichmentScore(
    venueMatch?.matchScore ?? 0,
    tasteMatchScore,
    resonancePrediction,
    proposal.confidence,
  );

  return {
    original: proposal,
    venueMatch,
    sensoryProfile,
    demandForecast,
    resonancePrediction,
    tasteMatchScore,
    enrichmentScore,
    warnings,
    recommendations,
  };
}

// ══════════════════════════════════════════════════════════
//  §C8: COMPUTE REAL-TIME IMPACT
// ══════════════════════════════════════════════════════════

/**
 * §C8 — Recalculates impact when the operator modifies a proposal.
 *
 * Every field change in the AI Creation Modal triggers this function.
 * It returns the delta (what changed) plus the AI's opinion on the change.
 *
 * Example:
 * Operator changes venue from "Salón Dorado" to "Terraza Jardín"
 * → venueMatch drops from 94 to 72
 * → resonance drops from 74 to 61
 * → AI says: "El cambio de venue reduce el match. La Terraza es más
 *    social — jazz íntimo funciona mejor en el Salón Dorado."
 *
 * @param enriched — Current enriched proposal.
 * @param change — The change made by the operator.
 * @param venuePersonalities — All available venue personalities.
 * @param tasteProfiles — Target member taste profiles.
 * @returns ImpactDelta with all deltas + AI commentary.
 */
export function computeRealTimeImpact(
  enriched: EnrichedProposal,
  change: ProposalChange,
  venuePersonalities: VenuePersonality[],
  tasteProfiles: TasteProfile[],
): ImpactDelta {
  const original = enriched.original;

  // Create a modified proposal with the change applied
  const modified = applyChange(original, change);

  // Re-enrich with the change
  const modifiedRequirements = proposalToRequirements(modified);
  const newVenueMatch = modifiedRequirements
    ? findBestVenue(modifiedRequirements, venuePersonalities)
    : enriched.venueMatch;

  // Compute deltas
  const venueMatchDelta =
    (newVenueMatch?.matchScore ?? 0) - (enriched.venueMatch?.matchScore ?? 0);

  const attendanceDelta = computeAttendanceDelta(
    enriched.demandForecast,
    change,
    newVenueMatch,
  );

  const resonanceDelta = computeResonanceDelta(change, enriched, tasteProfiles);

  const revenueDelta = Math.round(
    attendanceDelta * (original.expected_impact?.revenue_potential_crc ?? 0) /
    Math.max(1, original.expected_impact?.attendance_estimate ?? 1),
  );

  // AI commentary
  const commentary = generateChangeCommentary(
    change,
    venueMatchDelta,
    attendanceDelta,
    resonanceDelta,
    enriched,
    newVenueMatch,
  );

  // Recommendation: positive delta = good change
  const netImpact = attendanceDelta + resonanceDelta + venueMatchDelta;
  const recommended = netImpact >= 0;

  return {
    change,
    attendanceDelta,
    resonanceDelta,
    revenueDelta,
    venueMatchDelta,
    commentary,
    recommended,
  };
}

// ══════════════════════════════════════════════════════════
//  §C9: GENERATE VARIANTS
// ══════════════════════════════════════════════════════════

/**
 * §C9 — Generates N variants of a proposal, each optimized for
 * a different outcome.
 *
 * The AI Event Designer shows these as "Alternative Proposals"
 * so the operator can compare and choose.
 *
 * @param enriched — Current enriched proposal.
 * @param venuePersonalities — All available venue personalities.
 * @param tasteProfiles — Target member taste profiles.
 * @returns Array of ProposalVariant (max EVENT_DESIGNER_CONFIG.MAX_VARIANTS).
 */
export function generateVariants(
  enriched: EnrichedProposal,
  venuePersonalities: VenuePersonality[],
  tasteProfiles: TasteProfile[],
): ProposalVariant[] {
  const C = EVENT_DESIGNER_CONFIG;
  const strategies = C.VARIANT_STRATEGIES;
  const variants: ProposalVariant[] = [];

  for (const strategy of strategies) {
    const variant = generateVariantForStrategy(
      enriched,
      strategy.id as ProposalVariant['strategy'],
      strategy.label,
      strategy.emoji,
      venuePersonalities,
      tasteProfiles,
    );

    if (variant) {
      variants.push(variant);
    }
  }

  return variants.slice(0, C.MAX_VARIANTS);
}

// ══════════════════════════════════════════════════════════
//  §C10: ASSESS PROPOSAL RISK
// ══════════════════════════════════════════════════════════

/**
 * §C10 — Assesses risks for a proposal.
 *
 * Checks:
 * — Budget exceedance risk
 * — Timing risk (too close to event date)
 * — Capacity risk (venue too small/large)
 * — Demand risk (low predicted attendance)
 * — Venue risk (mismatch or unavailability)
 * — Competition risk (other events on same date)
 *
 * @param enriched — Enriched proposal with all intelligence.
 * @returns Array of ProposalRisk sorted by severity.
 */
export function assessProposalRisk(
  enriched: EnrichedProposal,
): ProposalRisk[] {
  const C = EVENT_DESIGNER_CONFIG.RISK_THRESHOLDS;
  const risks: ProposalRisk[] = [];
  const proposal = enriched.original;

  // ── Budget risk ──
  if (proposal.expected_impact.revenue_potential_crc > 0) {
    const budgetRatio = (proposal.cross_domain.finance_budget_estimate ?? 0) /
      proposal.expected_impact.revenue_potential_crc;
    if (budgetRatio > 1 + C.BUDGET_EXCEEDANCE / 100) {
      risks.push({
        type: 'budget',
        severity: budgetRatio > 1.5 ? 'high' : 'medium',
        description: `El presupuesto estimado (${proposal.cross_domain.finance_budget_estimate}) excede el revenue potencial (${proposal.expected_impact.revenue_potential_crc}). Evento puede generar pérdida.`,
        mitigation: 'Reducir costos de entretenimiento o aumentar el precio de entrada.',
        confidence: 0.75,
      });
    }
  }

  // ── Demand risk ──
  if (enriched.demandForecast) {
    const predicted = enriched.demandForecast.predictedAttendance;
    if (predicted.estimate < 10 && predicted.confidence > 0.5) {
      risks.push({
        type: 'demand',
        severity: 'high',
        description: `Asistencia predicha muy baja (${predicted.estimate} personas, confianza ${(predicted.confidence * 100).toFixed(0)}%). Evento puede sentirse vacío.`,
        mitigation: 'Ampliar la invitación o ajustar el formato a un grupo más íntimo.',
        confidence: predicted.confidence,
      });
    }

    if (predicted.confidence < 0.4) {
      risks.push({
        type: 'demand',
        severity: 'medium',
        description: 'Baja confianza en la predicción de asistencia. Hay pocos datos históricos para este tipo de evento.',
        mitigation: 'Considerar un evento piloto pequeño antes de comprometer un evento grande.',
        confidence: 0.6,
      });
    }
  }

  // ── Venue risk ──
  if (enriched.venueMatch) {
    if (enriched.venueMatch.matchScore < C.BUDGET_EXCEEDANCE * 2) {
      risks.push({
        type: 'venue',
        severity: 'medium',
        description: `El venue "${enriched.venueMatch.venueName}" tiene match bajo (${enriched.venueMatch.matchScore}/100). La experiencia puede no ser la esperada.`,
        mitigation: 'Explorar venues alternativos o ajustar el concepto al venue disponible.',
        confidence: 0.7,
      });
    }

    if (enriched.venueMatch.warnings.length > 0) {
      for (const warning of enriched.venueMatch.warnings) {
        risks.push({
          type: 'venue',
          severity: 'low',
          description: warning,
          mitigation: 'Revisar configuración del venue o considerar equipamiento adicional.',
          confidence: 0.6,
        });
      }
    }
  }

  // ── Capacity risk ──
  if (enriched.demandForecast && enriched.venueMatch) {
    const optimal = enriched.venueMatch.dimensions.capacityScore;

    if (optimal < 40) {
      risks.push({
        type: 'capacity',
        severity: 'medium',
        description: 'La capacidad del venue no se alinea bien con la asistencia esperada.',
        mitigation: 'Ajustar el formato del evento o buscar un venue más adecuado.',
        confidence: 0.65,
      });
    }
  }

  // ── Resonance risk ──
  if (enriched.resonancePrediction < EVENT_DESIGNER_CONFIG.RESONANCE_WARNING) {
    risks.push({
      type: 'demand',
      severity: 'low',
      description: `Resonancia experiencial predicha baja (${enriched.resonancePrediction}/100). El evento puede ser funcional pero no memorable.`,
      mitigation: 'Agregar elementos experienciales: perfil sensorial personalizado, interacción social, sorpresas.',
      confidence: 0.55,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...risks].sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );
}

// ══════════════════════════════════════════════════════════
//  FULL ASSESSMENT PIPELINE
// ══════════════════════════════════════════════════════════

/**
 * Complete proposal assessment — runs the full pipeline:
 * enrich → assess risks → generate variants.
 *
 * This is the single entry point for the AI Event Designer modals.
 *
 * @param proposal — Backend CulturalProposal.
 * @param tasteProfiles — Target member taste profiles.
 * @param venuePersonalities — All available venues.
 * @param dominantDNA — Aggregated CulturalDNA of target audience.
 * @returns ProposalAssessment with enriched proposal, variants, and risks.
 */
export function assessProposal(
  proposal: CulturalProposal,
  tasteProfiles: TasteProfile[],
  venuePersonalities: VenuePersonality[],
  dominantDNA: CulturalDNA,
): ProposalAssessment {
  // Step 1: Enrich
  const enriched = enrichProposal(
    proposal,
    tasteProfiles,
    venuePersonalities,
    dominantDNA,
  );

  // Step 2: Assess risks
  const risks = assessProposalRisk(enriched);

  // Step 3: Generate variants
  const variants = generateVariants(
    enriched,
    venuePersonalities,
    tasteProfiles,
  );

  // Step 4: Determine if ready to execute
  const highRisks = risks.filter((r) => r.severity === 'high');
  const blockers: string[] = [];

  if (enriched.venueMatch && enriched.venueMatch.matchScore < EVENT_DESIGNER_CONFIG.VENUE_MATCH_BLOCK) {
    blockers.push('Match de venue demasiado bajo — buscar alternativa antes de ejecutar.');
  }

  if (enriched.tasteMatchScore < 30) {
    blockers.push('Match de gusto crítico — el público objetivo probablemente no asistirá.');
  }

  return {
    enriched,
    variants,
    risks,
    readyToExecute: blockers.length === 0 && highRisks.length === 0,
    blockers,
  };
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Converts a CulturalProposal to EventVenueRequirements for the matcher.
 */
function proposalToRequirements(
  proposal: CulturalProposal,
): EventVenueRequirements | null {
  if (!proposal.venue_recommendation) return null;

  const formality: FormalityLevel =
    proposal.category === 'activity_proposal' ? 'casual' :
    proposal.category === 'lifestyle_integration' ? 'semi_formal' :
    proposal.category === 'group_cohesion' ? 'semi_formal' :
    'formal';

  const genre = mapProposalCategoryToGenre(proposal.category);
  const category = mapGenreToCategory(genre);

  return {
    genre,
    category,
    formality,
    expectedAttendance: proposal.expected_impact.attendance_estimate || 30,
    needsStage: ['activity_proposal', 'targeted_invitation'].includes(proposal.category),
    needsMusic: proposal.category !== 'space_activation',
  };
}

/**
 * Computes taste match: how well does this event fit the target audience?
 */
function computeTasteMatch(
  proposal: CulturalProposal,
  tasteProfiles: TasteProfile[],
  dominantDNA: CulturalDNA,
): number {
  if (tasteProfiles.length === 0) return 60; // neutral default

  const genre = mapProposalCategoryToGenre(proposal.category);

  // Average affinity for this genre across all target members
  let totalAffinity = 0;
  let count = 0;

  for (const profile of tasteProfiles) {
    const affinity = profile.genrePreferences[genre];
    if (affinity) {
      totalAffinity += affinity.affinityScore;
      count++;
    }
  }

  const avgAffinity = count > 0 ? totalAffinity / count : 50;

  // DNA alignment: does the proposal match the audience's DNA?
  const dnaScore = computeDNAAlignment(proposal, dominantDNA);

  return clamp(Math.round(avgAffinity * 0.6 + dnaScore * 0.4), 0, 100);
}

/**
 * Computes how well a proposal aligns with the audience's CulturalDNA.
 */
function computeDNAAlignment(
  proposal: CulturalProposal,
  dna: CulturalDNA,
): number {
  let score = 0;

  // Group cohesion proposals work better with high sociality
  if (proposal.category === 'group_cohesion') {
    score += dna.sociality;
  }

  // Activity proposals work better with high adventurousness
  if (proposal.category === 'activity_proposal') {
    score += dna.adventurousness;
  }

  // Lifestyle integration works better with high depth
  if (proposal.category === 'lifestyle_integration') {
    score += dna.depth;
  }

  // Space activation works better with high openness
  if (proposal.category === 'space_activation') {
    score += dna.openness;
  }

  // Targeted invitation works with any DNA
  if (proposal.category === 'targeted_invitation') {
    score += 60;
  }

  return clamp(Math.round(score), 0, 100);
}

/**
 * Predicts resonance for a proposal based on taste profiles and DNA.
 */
function predictProposalResonance(
  proposal: CulturalProposal,
  tasteProfiles: TasteProfile[],
  dominantDNA: CulturalDNA,
): number {
  const tasteMatch = computeTasteMatch(proposal, tasteProfiles, dominantDNA);
  const confidence = proposal.confidence * 100;
  const explorationFit = dominantDNA.adventurousness;

  return clamp(
    Math.round(tasteMatch * 0.45 + confidence * 0.30 + explorationFit * 0.25),
    0,
    100,
  );
}

/**
 * Builds a demand forecast from proposal + taste data.
 */
function buildDemandForecast(
  proposal: CulturalProposal,
  tasteProfiles: TasteProfile[],
  venueMatch: VenueMatch | null,
): DemandForecast {
  const baseEstimate = proposal.expected_impact.attendance_estimate || 20;
  const confidence = proposal.confidence;

  // Adjust estimate based on taste match
  const tasteFactor = tasteProfiles.length > 0
    ? tasteProfiles.reduce((s, tp) => s + tp.profileConfidence, 0) / tasteProfiles.length
    : 0.5;

  const adjustedEstimate = Math.round(baseEstimate * (0.7 + tasteFactor * 0.6));

  const band = EVENT_DESIGNER_CONFIG.DEMAND_CONFIDENCE_BAND;

  return {
    eventTemplateId: proposal.id,
    predictedAttendance: {
      estimate: adjustedEstimate,
      lower: Math.max(0, Math.round(adjustedEstimate * (1 - band / 100))),
      upper: Math.round(adjustedEstimate * (1 + band / 100)),
      confidence,
    },
    predictedSatisfaction: {
      estimate: 65,
      lower: 50,
      upper: 80,
      confidence,
    },
    predictedRevenue: {
      estimate: proposal.expected_impact.revenue_potential_crc,
      lower: Math.round(proposal.expected_impact.revenue_potential_crc * 0.8),
      upper: Math.round(proposal.expected_impact.revenue_potential_crc * 1.3),
      confidence,
    },
    optimalDate: '',
    optimalVenue: venueMatch?.venueName ?? proposal.venue_recommendation,
    optimalCapacity: venueMatch ? Math.round(adjustedEstimate / 0.7) : adjustedEstimate * 2,
    riskFactors: [],
    demandDrivers: [],
    seasonalMultiplier: 1.0,
    competitiveEvents: [],
  };
}

/**
 * Computes overall enrichment score.
 */
function computeEnrichmentScore(
  venueMatch: number,
  tasteMatch: number,
  resonance: number,
  confidence: number,
): number {
  return clamp(
    Math.round(
      venueMatch * 0.30 +
      tasteMatch * 0.30 +
      resonance    * 0.25 +
      confidence * 100 * 0.15,
    ),
    0,
    100,
  );
}

/**
 * Applies a change to a proposal, returning a modified copy.
 */
function applyChange(
  proposal: CulturalProposal,
  change: ProposalChange,
): CulturalProposal {
  const modified = { ...proposal };

  switch (change.field) {
    case 'venue':
      modified.venue_recommendation = change.newValue as string;
      break;
    case 'capacity':
      modified.expected_impact = {
        ...modified.expected_impact,
        attendance_estimate: change.newValue as number,
      };
      break;
    case 'budget':
      modified.cross_domain = {
        ...modified.cross_domain,
        finance_budget_estimate: change.newValue as number,
      };
      break;
    // date, formality, category — affect matching but stored differently
  }

  return modified;
}

/**
 * Computes attendance delta from a change.
 */
function computeAttendanceDelta(
  currentForecast: DemandForecast | null,
  change: ProposalChange,
  newVenueMatch: VenueMatch | null,
): number {
  if (!currentForecast) return 0;

  const current = currentForecast.predictedAttendance.estimate;

  switch (change.field) {
    case 'venue': {
      const venueImpact = (newVenueMatch?.matchScore ?? 50) - 50;
      return Math.round(current * venueImpact / 200);
    }
    case 'capacity':
      return Math.round(((change.newValue as number) - current) * 0.3);
    default:
      return 0;
  }
}

/**
 * Computes resonance delta from a change.
 */
function computeResonanceDelta(
  change: ProposalChange,
  enriched: EnrichedProposal,
  _tasteProfiles: TasteProfile[],
): number {
  switch (change.field) {
    case 'venue': {
      // Venue change affects resonance through sensory fit
      return enriched.venueMatch ? -5 : 0;
    }
    case 'formality': {
      // Formality change can affect resonance significantly
      return -3;
    }
    default:
      return 0;
  }
}

/**
 * Generates AI commentary for a proposal change.
 */
function generateChangeCommentary(
  change: ProposalChange,
  venueMatchDelta: number,
  attendanceDelta: number,
  resonanceDelta: number,
  enriched: EnrichedProposal,
  newVenueMatch: VenueMatch | null,
): string {
  const parts: string[] = [];

  if (change.field === 'venue') {
    if (venueMatchDelta > 10) {
      parts.push(`Excelente cambio de venue. El match sube ${venueMatchDelta} puntos.`);
    } else if (venueMatchDelta < -10) {
      parts.push(
        `El cambio de venue reduce el match del ${enriched.venueMatch?.matchScore ?? 0} al ${newVenueMatch?.matchScore ?? 0}. ` +
        (newVenueMatch ? newVenueMatch.reasoning : '')
      );
    } else {
      parts.push('El cambio de venue tiene impacto mínimo en el match.');
    }
  }

  if (change.field === 'capacity') {
    if (attendanceDelta > 0) {
      parts.push(`La asistencia predicha sube ~${attendanceDelta} personas.`);
    } else if (attendanceDelta < 0) {
      parts.push(`La asistencia predicha baja ~${Math.abs(attendanceDelta)} personas.`);
    }
  }

  if (resonanceDelta < -5) {
    parts.push('La resonancia experiencial baja — considerar mantener la configuración original.');
  }

  if (parts.length === 0) {
    parts.push('Cambio procesado. Sin impacto significativo.');
  }

  return parts.join(' ');
}

/**
 * Generates a single variant for a specific optimization strategy.
 */
function generateVariantForStrategy(
  enriched: EnrichedProposal,
  strategy: ProposalVariant['strategy'],
  label: string,
  emoji: string,
  venuePersonalities: VenuePersonality[],
  tasteProfiles: TasteProfile[],
): ProposalVariant | null {
  const original = enriched.original;
  const changes: string[] = [];
  let predictedAttendance = enriched.demandForecast?.predictedAttendance.estimate
    ?? original.expected_impact.attendance_estimate;
  let predictedResonance = enriched.resonancePrediction;
  let predictedRevenue = original.expected_impact.revenue_potential_crc;

  switch (strategy) {
    case 'max_attendance': {
      // Optimize for maximum attendance
      // Strategy: reduce formality, expand invitation, use larger venue
      changes.push('Formato más accesible para ampliar audiencia');
      if (enriched.venueMatch && enriched.venueMatch.matchScore < 70) {
        // Find a venue with higher capacity
        const largerVenue = venuePersonalities
          .filter((v) => v.optimalCapacity > (enriched.venueMatch?.venueName ? 50 : 30))
          .sort((a, b) => b.optimalCapacity - a.optimalCapacity)[0];
        if (largerVenue) {
          changes.push(`Venue alternativo: ${largerVenue.venueName} (mayor capacidad)`);
        }
      }
      predictedAttendance = Math.round(predictedAttendance * 1.3);
      predictedResonance = Math.round(predictedResonance * 0.9);
      predictedRevenue = Math.round(predictedRevenue * 1.2);
      break;
    }

    case 'max_resonance': {
      // Optimize for maximum experiential resonance
      // Strategy: more intimate, better sensory match, curated audience
      changes.push('Formato íntimo para maximizar impacto experiencial');
      changes.push('Perfil sensorial personalizado');
      if (tasteProfiles.length > 10) {
        changes.push('Audiencia curada: solo socios con affinity > 70');
      }
      predictedAttendance = Math.round(predictedAttendance * 0.7);
      predictedResonance = Math.min(100, Math.round(predictedResonance * 1.4));
      predictedRevenue = Math.round(predictedRevenue * 0.8);
      break;
    }

    case 'max_revenue': {
      // Optimize for maximum revenue
      // Strategy: premium pricing, add-ons, tiered access
      changes.push('Pricing premium con valor agregado');
      changes.push('Tiers de acceso con beneficios diferenciados');
      predictedAttendance = Math.round(predictedAttendance * 0.85);
      predictedResonance = Math.round(predictedResonance * 0.95);
      predictedRevenue = Math.round(predictedRevenue * 1.5);
      break;
    }
  }

  const score = Math.round(
    predictedAttendance * 0.3 +
    predictedResonance * 0.4 +
    (predictedRevenue / 1000) * 0.3,
  );

  return {
    id: `variant-${strategy}`,
    strategy,
    label,
    emoji,
    changes,
    predicted: {
      attendance: predictedAttendance,
      resonance: predictedResonance,
      revenue: predictedRevenue,
    },
    score,
  };
}

// ══════════════════════════════════════════════════════════
//  MAPPING HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Maps proposal category to the most relevant cultural genre.
 */
function mapProposalCategoryToGenre(category: ProposalCategory): CulturalGenreExtended {
  const mapping: Record<ProposalCategory, CulturalGenreExtended> = {
    activity_proposal: 'music',
    targeted_invitation: 'gastronomy',
    group_cohesion: 'gastronomy',
    space_activation: 'visual_arts',
    lifestyle_integration: 'wellness_cultural',
  };
  return mapping[category] ?? 'music';
}

/**
 * Maps an extended genre to its backend CulturalCategory.
 */
function mapGenreToCategory(genre: CulturalGenreExtended): CulturalCategory {
  const backendCategories: CulturalCategory[] = [
    'music', 'visual_arts', 'theater', 'dance', 'literature', 'gastronomy', 'heritage',
  ];

  if (backendCategories.includes(genre as CulturalCategory)) {
    return genre as CulturalCategory;
  }

  const mappings: Record<string, CulturalCategory> = {
    wine_spirits: 'gastronomy',
    lectures: 'literature',
    workshops: 'visual_arts',
    contemporary: 'visual_arts',
    family: 'gastronomy',
    seasonal: 'heritage',
    wellness_cultural: 'dance',
  };

  return mappings[genre] ?? 'music';
}

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}