/**
 * useCulturalDashboard — Neural Hub Hook (Hook 2 of Two-Hook Pattern)
 *
 * Consumes data from useCulturalData and runs ALL engines + advisor rules
 * to produce the complete intelligence state for the Cultural Dashboard.
 *
 * @module cultural/hooks/useCulturalDashboard
 */

import { useMemo } from 'react';

import { useCulturalData } from './useCulturalData';
import { useCulturalAdvisor } from './useCulturalAdvisor';

import type {
  CulturalAmbientState,
  CulturalStreamSignal,
  CulturalProposal,
  CulturalGenreExtended,
  DemandForecast,
  VenueType,
} from '../types';
import type {
  TasteProfile,
  CulturalDNA,
  ResonanceScore,
  TasteMutation,
  CulturalJourney,
  CulturalSocialGraph,
  VenuePersonality,
} from '../types';
import {
  type CulturalDashboardMode,
  CULTURAL_MCP_SERVER,
  CULTURAL_MCP_TOOLS,
  deriveCulturalDashboardMode,
  CULTURAL_GENRE_EXTENDED,
} from '../config';

// ── Engines ──
import {
  buildTasteProfile,
  type MemberEventFeedback,
  type MemberCulturalPreferences,
} from '../lib/tasteProfile';
import {
  computeBatchResonance,
  type ResonanceInput,
} from '../lib/culturalResonance';
import {
  buildAllVenuePersonalities,
  type VenueUsageRecord,
  type VenueFeedbackRecord,
} from '../lib/venueIntelligence';
import {
  enrichProposal,
  assessProposal,
  type EnrichedProposal,
  type ProposalAssessment,
} from '../lib/proposalEnricher';
import {
      type CulturalAdvisorInsight,
} from '../lib/advisor/types';

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════

/** Total cultural categories for exploration rate computation. */
const TOTAL_CULTURAL_CATEGORIES = Object.keys(CULTURAL_GENRE_EXTENDED).length;

/** Default CulturalDNA when no member data is available. */
const DEFAULT_CULTURAL_DNA: CulturalDNA = {
  openness: 50,
  depth: 50,
  sociality: 50,
  adventurousness: 50,
  ritualism: 50,
  aesthetic_sensitivity: 50,
  cultural_maturity: 50,
  engagement_intensity: 50,
};

// ══════════════════════════════════════════════════════════
//  RETURN TYPE
// ══════════════════════════════════════════════════════════

export interface CulturalDashboardReturn {
  // ── Loading state ──
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;

  // ── Data ──
  summary: ReturnType<typeof useCulturalData>['summary'];
  analytics: ReturnType<typeof useCulturalData>['analytics'];
  calendar: ReturnType<typeof useCulturalData>['calendar'];
  events: ReturnType<typeof useCulturalData>['events'];
  proposals: CulturalProposal[];

  // ── Intelligence: Taste ──
  tasteProfile: TasteProfile | null;
  culturalDNA: CulturalDNA | null;

  // ── Intelligence: Resonance ──
  resonanceScores: ResonanceScore[];
  avgResonance: number;

  // ── Intelligence: Mutations ──
  tasteMutations: TasteMutation[];

  // ── Intelligence: Social ──
  socialGraph: CulturalSocialGraph | null;

  // ── Intelligence: Journey ──
  culturalJourney: CulturalJourney | null;

  // ── Intelligence: Venues ──
  venuePersonalities: VenuePersonality[];

  // ── Intelligence: Demand ──
  demandForecasts: DemandForecast[];

  // ── Intelligence: Proposals ──
  enrichedProposals: EnrichedProposal[];

  // ── Dashboard State ──
  dashboardMode: CulturalDashboardMode;
  ambientState: CulturalAmbientState;
  intelligencePanelOrder: CulturalStreamSignal['priority'][];
  crossDomainSignals: CulturalStreamSignal[];

  // ── Advisor ──
  advisorInsights: CulturalAdvisorInsight[];

  // ── Actions ──
  refetchAll: () => void;
  assessNewProposal: (proposal: CulturalProposal) => ProposalAssessment | null;
}

// ══════════════════════════════════════════════════════════
//  HOOK
// ══════════════════════════════════════════════════════════

/**
 * useCulturalDashboard — The complete Cultural intelligence layer.
 *
 * @param memberId — Target member for taste/resonance/journey engines.
 * @returns CulturalDashboardReturn with ~25 typed properties.
 */
export function useCulturalDashboard(memberId?: string): CulturalDashboardReturn {
  // ── Step 1: Fetch all data ──
  const data = useCulturalData(memberId);

  // ── Step 2: Build taste profile (§C1 + §C2) ──
  const tasteProfile = useMemo((): TasteProfile | null => {
    if (!data.memberHistory || !memberId) return null;

    const history = Array.isArray(data.memberHistory) ? data.memberHistory : [];
    const feedback: MemberEventFeedback[] = [];
    const preferences = data.memberPreferences as MemberCulturalPreferences | undefined;

    return buildTasteProfile(memberId, history, feedback, preferences);
  }, [data.memberHistory, data.memberPreferences, memberId]);

  const culturalDNA = useMemo((): CulturalDNA | null => {
    return tasteProfile?.culturalDNA ?? null;
  }, [tasteProfile]);

  // ── Step 3: Compute resonance (§C3) ──
  const resonanceScores = useMemo((): ResonanceScore[] => {
    if (!data.memberHistory || !memberId) return [];

    const history = Array.isArray(data.memberHistory) ? data.memberHistory : [];
    const inputs: ResonanceInput[] = history.map((record) => ({
      eventId: record.event_id,
      memberId,
      eventTitle: record.event_name,
      category: record.category,
      date: record.date,
      satisfactionScore: record.satisfaction_score,
    }));

    return computeBatchResonance(inputs);
  }, [data.memberHistory, memberId]);

  const avgResonance = useMemo((): number => {
    if (resonanceScores.length === 0) return 0;
    return Math.round(
      resonanceScores.reduce((s, r) => s + r.totalResonance, 0) /
        resonanceScores.length,
    );
  }, [resonanceScores]);

  // ── Step 4: Build cross-domain signals ──
  // NOTE: defined BEFORE ambientState because ambientState needs activeSignals count
  const crossDomainSignals = useMemo((): CulturalStreamSignal[] => {
    if (!data.analytics) return [];

    const signals: CulturalStreamSignal[] = [];
    const rawSignals = data.analytics.cross_domain_signals ?? [];

    for (let i = 0; i < rawSignals.length; i++) {
      signals.push({
        id: `signal-crossdomain-${i}`,
        source: 'cross_domain',
        priority: i === 0 ? 'high' : 'medium',
        title: `Oportunidad cross-domain ${i + 1}`,
        description: rawSignals[i],
        timestamp: new Date().toISOString(),
        action: {
          label: 'Explorar',
          server: CULTURAL_MCP_SERVER,
          tool: CULTURAL_MCP_TOOLS.GENERATE_PROPOSALS,
          params: {},
        },
      });
    }

    // Resonance-based signal
    if (avgResonance > 0 && avgResonance < 40) {
      signals.push({
        id: 'signal-resonance-low',
        source: 'resonance',
        priority: 'high',
        title: 'Resonancia experiencial baja',
        description: `Promedio: ${avgResonance}/100. Los eventos recientes no están teniendo el impacto esperado.`,
        timestamp: new Date().toISOString(),
      });
    }

    return signals;
  }, [data.analytics, avgResonance]);

  // ── Step 5: Derive dashboard mode + ambient state ──
  const dashboardMode = useMemo((): CulturalDashboardMode => {
    if (!data.analytics) return 'calm';

    return deriveCulturalDashboardMode({
      highSeverityCount: 0,
      totalInsightCount: data.analytics.cross_domain_signals?.length ?? 0,
      healthScore: data.summary?.cultural_health_score ?? 0,
      attendanceTrend: data.analytics.attendance_trend,
      upcomingEvents: data.summary?.upcoming_events_30d ?? 0,
      hasHighConfidenceMutations: false,
    });
  }, [data.analytics, data.summary]);

  const ambientState = useMemo((): CulturalAmbientState => {
    const mode = dashboardMode;
    const activityLevel = avgResonance > 70
      ? 'vibrant'
      : avgResonance > 40
        ? 'active'
        : avgResonance > 15
          ? 'calm'
          : 'dormant';
    const dominantGenre = (data.analytics?.category_performance?.[0]?.category as CulturalGenreExtended | undefined) ?? null;

    return {
      mode,
      activityLevel,
      intensity: Math.min(100, Math.max(0, avgResonance + crossDomainSignals.length * 5)),
      dominantGenre,
    };
  }, [dashboardMode, avgResonance, crossDomainSignals.length, data.analytics]);

  // ── Step 6: Detect taste mutations ──
  const tasteMutations = useMemo((): TasteMutation[] => {
    if (!data.analytics) return [];

    const signals = data.analytics.cross_domain_signals ?? [];
    const mutations: TasteMutation[] = [];

    for (const signal of signals) {
      const lower = signal.toLowerCase();
      if (
        lower.includes('nuevo') ||
        lower.includes('descubr') ||
        lower.includes('cambio')
      ) {
        mutations.push({
        id: `mutation-${mutations.length}`,
        detectedDate: new Date().toISOString(),
        type: 'shift',
        fromGenre: 'music' as CulturalGenreExtended,
        toGenre: 'visual_arts' as CulturalGenreExtended,
        trigger: signal,
        confidence: 0.65,
        magnitude: 45,
        predictedStability: 'emerging_interest',
        });
      }
    }

    return mutations;
  }, [data.analytics, memberId]);

  // Merge mutation-based signals into cross-domain signals
  const allSignals = useMemo((): CulturalStreamSignal[] => {
    const mutationSignals: CulturalStreamSignal[] = tasteMutations.map((mutation, idx) => ({
      id: `signal-mutation-${idx}`,
      source: 'mutation' as const,
      priority: mutation.confidence > 0.8 ? 'high' as const : 'medium' as const,
      title: `Mutación de gusto: ${mutation.type}`,
      description: `Cambio de ${mutation.fromGenre} a ${mutation.toGenre} (confianza: ${(mutation.confidence * 100).toFixed(0)}%)`,
      timestamp: mutation.detectedDate,
    }));

    return [...crossDomainSignals, ...mutationSignals];
  }, [crossDomainSignals, tasteMutations]);

  // ── Step 7: Build social graph (§C4 companion data) ──
  const socialGraph = useMemo((): CulturalSocialGraph | null => {
    if (!data.memberHistory || !memberId) return null;

    const history = Array.isArray(data.memberHistory) ? data.memberHistory : [];
    const connections: Array<{
      memberId: string;
      sharedEvents: number;
      affinityScore: number;
      lastInteraction: string;
      relationship: string;
    }> = [];
    const companionCounts: Record<string, number> = {};

    for (const record of history) {
      if (record.attended_with) {
        for (const companion of record.attended_with) {
          companionCounts[companion] = (companionCounts[companion] ?? 0) + 1;
        }
      }
    }

    for (const [companionId, count] of Object.entries(companionCounts)) {
      connections.push({
        memberId: companionId,
        sharedEvents: count,
        affinityScore: Math.min(100, count * 20),
        lastInteraction: history[history.length - 1]?.date ?? '',
        relationship:
          count >= 5 ? 'frequent_companion' :
          count >= 2 ? 'acquaintance' :
          'occasional',
      });
    }

    connections.sort((a, b) => b.affinityScore - a.affinityScore);

    return {
      memberId,
      connections,
      networkSize: connections.length,
      avgAffinity: connections.length > 0
        ? Math.round(
            connections.reduce((s, c) => s + c.affinityScore, 0) / connections.length,
          )
        : 0,
      socialInfluenceScore: Math.min(100, connections.length * 15),
      isolationRisk: connections.length === 0 ? 80 : connections.length === 1 ? 50 : 10,
      preferredCompanions: [],
      soloPreference: history.some((record) => record.was_solo) ? 70 : 40,
      socialAmplification: Math.min(100, connections.length * 15 + 20),
      culturalInfluence: Math.min(100, connections.length * 10 + 25),
      groupDynamics: [],
    };
  }, [data.memberHistory, memberId]);

  // ── Step 8: Build cultural journey ──
  const culturalJourney = useMemo((): CulturalJourney | null => {
    if (!data.memberHistory || !memberId) return null;

    const history = Array.isArray(data.memberHistory) ? data.memberHistory : [];
    if (history.length === 0) return null;

    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const firstEvent = sorted[0];
    const lastEvent = sorted[sorted.length - 1];

    const uniqueCategories = new Set(history.map((h) => h.category));
    const phases: CulturalJourney['phases'] = [];
    const eventsPerPhase = Math.max(1, Math.ceil(sorted.length / 3));

    for (let i = 0; i < sorted.length; i += eventsPerPhase) {
      const phaseEvents = sorted.slice(i, i + eventsPerPhase);
      const dominantCategory = phaseEvents[0]?.category ?? 'music';

      phases.push({
        startDate: phaseEvents[0].date,
        phaseIndex: phases.length + 1,
        theme: dominantCategory,
        duration: `${phaseEvents.length} eventos`,
        events: phaseEvents.map((e) => ({
          eventId: e.event_id,
          title: e.event_name,
          date: e.date,
          matchScore: tasteProfile?.genrePreferences[e.category]?.affinityScore ?? 50,
          genre: e.category,
          reason: 'Member attendance history',
          riskLevel: 'safe',
          expectedResonance: tasteProfile?.genrePreferences[e.category]?.affinityScore ?? 50,
          socialContext: 'historical',
          venueFit: tasteProfile?.genrePreferences[e.category]?.affinityScore ?? 50,
        })),
        purpose: 'comfort',
        expectedOutcome: 'Consolidar continuidad cultural y reforzar afinidad por el género dominante.',
      });
    }

    const horizonDays = Math.floor(
      (new Date(lastEvent.date).getTime() - new Date(firstEvent.date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const horizon: CulturalJourney['horizon'] =
      horizonDays > 365 ? '1_year' :
      horizonDays > 180 ? '6_months' :
      horizonDays > 90 ? '3_months' :
      '1_month';

    const explorationRate = TOTAL_CULTURAL_CATEGORIES > 0
      ? Math.round((uniqueCategories.size / TOTAL_CULTURAL_CATEGORIES) * 100)
      : 0;

    return {
    memberId,
    horizon,
    purpose: 'exploration',
    phases,
    startDate: firstEvent.date,
    endDate: lastEvent.date,
    expansionRate: explorationRate,
    keyMoments: sorted.slice(0, 3).map((e) => ({
        date: e.date,
        event: e.event_name,
        type: 'celebration' as const,
        significance: 'engagement_peak' as const,
        description: `Asistió a ${e.event_name}`,
    })),
    totalExperiences: 0,
    diversityTarget: 0,
    predictedSatisfaction: 0,
    predictedExplorationIndex: 0,
};
  }, [data.memberHistory, memberId, tasteProfile]);

  // ── Step 9: Build venue personalities (§C4) ──
  const venuePersonalities = useMemo((): VenuePersonality[] => {
    if (!data.analytics) return [];

    const venueData = (data.analytics.venue_utilization ?? []) as VenueUsageRecord[];
    const feedbackData: VenueFeedbackRecord[] = [];

    const venueTypes: Record<string, VenueType> = {};
    for (const v of venueData) {
      venueTypes[v.venue] = v.venue_type as VenueType;
    }

    return buildAllVenuePersonalities(venueData, feedbackData, venueTypes);
  }, [data.analytics]);

  // ── Step 10: Generate demand forecasts ──
  const demandForecasts = useMemo((): DemandForecast[] => {
    if (!data.events || data.events.length === 0) return [];

    return data.events.slice(0, 10).map((event) => ({
      eventTemplateId: event.id,
      predictedAttendance: {
        estimate: 30,
        lower: 20,
        upper: 40,
        confidence: 0.6,
      },
      predictedSatisfaction: {
        estimate: 70,
        lower: 55,
        upper: 85,
        confidence: 0.5,
      },
      predictedRevenue: {
        estimate: 0,
        lower: 0,
        upper: 0,
        confidence: 0.5,
      },
      optimalDate: event.date,
      optimalVenue: event.venue,
      optimalCapacity: 60,
      riskFactors: [],
      demandDrivers: [],
      seasonalMultiplier: 1.0,
      competitiveEvents: [],
    }));
  }, [data.events]);

  // ── Step 11: Enrich proposals (§C7) ──
  const enrichedProposals = useMemo((): EnrichedProposal[] => {
    if (!data.proposals || data.proposals.length === 0) return [];

    const dna = culturalDNA ?? DEFAULT_CULTURAL_DNA;
    const profiles = tasteProfile ? [tasteProfile] : [];

    return data.proposals.map((proposal) =>
      enrichProposal(proposal, profiles, venuePersonalities, dna),
    );
  }, [data.proposals, tasteProfile, venuePersonalities, culturalDNA]);

  // ── Step 12: Run advisor (R1-R20) ──
  const advisorInsights = useCulturalAdvisor({
    summary: data.summary,
    analytics: data.analytics,
    intelligence: {
      tasteMutations,
      resonanceScores,
      culturalJourney: culturalJourney ?? null,
      venuePersonalities,
      crossDomainSignals: allSignals,
    },
  });

  // ── Step 13: assessNewProposal action ──
  const assessNewProposal = useMemo(() => {
    return (proposal: CulturalProposal): ProposalAssessment | null => {
      if (!data.analytics) return null;

      const dna = culturalDNA ?? DEFAULT_CULTURAL_DNA;
      const profiles = tasteProfile ? [tasteProfile] : [];

      return assessProposal(proposal, profiles, venuePersonalities, dna);
    };
  }, [data.analytics, tasteProfile, venuePersonalities, culturalDNA]);

  // ── Static values ──
  const intelligencePanelOrder = useMemo(
    (): CulturalStreamSignal['priority'][] => ['critical', 'high', 'medium', 'low'],
    [],
  );

  // ── Return ──
  return {
    isLoading: data.isLoading,
    isReady: data.isReady,
    error: data.error,

    summary: data.summary,
    analytics: data.analytics,
    calendar: data.calendar,
    events: data.events,
    proposals: data.proposals ?? [],

    tasteProfile,
    culturalDNA,
    resonanceScores,
    avgResonance,
    tasteMutations,
    socialGraph,
    culturalJourney,
    venuePersonalities,
    demandForecasts,
    enrichedProposals,

    dashboardMode,
    ambientState,
    intelligencePanelOrder,
    crossDomainSignals: allSignals,

    advisorInsights,

    refetchAll: data.refetchAll,
    assessNewProposal,
  };
}
