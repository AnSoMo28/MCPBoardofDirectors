/**
 * useEventDesigner — Shared hook for all 5 AI Creation Modals
 *
 * Orchestrates the event design pipeline:
 * 1. Operator enters intention (free text + eventType)
 * 2. Engine parses intent → generates proposal → enriches → assesses
 * 3. Operator refines → engine recalculates impact in real time
 * 4. Operator confirms → proposal ready for MCP submission
 *
 * Each modal calls this hook with a different eventType:
 * — EntertainmentFormModal  → useEventDesigner('entertainment')
 * — ExhibitionFormModal     → useEventDesigner('exhibition')
 * — GalaFormModal           → useEventDesigner('gala')
 * — ProgramFormModal        → useEventDesigner('program')
 * — SocialEventFormModal    → useEventDesigner('social')
 *
 * @module cultural/hooks/useEventDesigner
 */

import { useState, useCallback, useMemo } from 'react';

import { useCulturalData } from './useCulturalData';
import type {
  TasteProfile,
  CulturalDNA,
} from '../types';
import type {
  ProposalChange,
  ImpactDelta
} from '../lib/proposalEnricher';
import type {
  DesignIntent,
  DesignContext,
  DesignResult,
  DesignerEventType,
} from '../lib/eventDesigner';
import {
  captureIntention,
  generateEventProposal,
  computeRealTimeImpact as engineComputeImpact
} from '../lib/eventDesigner';
import {
  buildAllVenuePersonalities,
  type VenueUsageRecord,
  type VenueFeedbackRecord,
} from '../lib/venueIntelligence';
import {
  buildTasteProfile,
  type MemberAttendanceRecord,
  type MemberEventFeedback,
  type MemberCulturalPreferences,
} from '../lib/tasteProfile';
import type { VenueType } from '../types';

// ══════════════════════════════════════════════════════════
//  RETURN TYPE
// ══════════════════════════════════════════════════════════

export interface UseEventDesignerReturn {
  // ── State ──
  /** Current design phase. */
  phase: 'idle' | 'intention' | 'designing' | 'refining' | 'confirmed';
  /** Whether the engine is computing. */
  isDesigning: boolean;

  // ── Intent ──
  /** Current parsed intent (null if not yet captured). */
  intent: DesignIntent | null;
  /** Set the operator's raw intention text. */
  setIntention: (rawInput: string) => void;

  // ── Proposal ──
  /** Current design result with enriched proposal + variants + risks. */
  design: DesignResult | null;
  /** Generate a new proposal from current intent. */
  generate: () => void;

  // ── Refinement ──
  /** Refine the proposal by changing a field. Returns impact delta. */
  refine: (change: ProposalChange) => ImpactDelta | null;
  /** Impact history from all refinements made. */
  impactHistory: ImpactDelta[];
  /** Select a variant as the new primary proposal. */
  selectVariant: (variantIndex: number) => void;

  // ── Confirmation ──
  /** Whether the proposal is ready to execute. */
  readyToExecute: boolean;
  /** Blocking issues preventing execution. */
  blockers: string[];
  /** Confirm the proposal (transitions to 'confirmed' phase). */
  confirm: () => void;

  // ── Reset ──
  /** Reset the entire designer to idle state. */
  reset: () => void;

  // ── Context (for modal UI) ──
  /** Taste profile of the current member (if available). */
  tasteProfile: TasteProfile | null;
  /** Dominant DNA of the target audience. */
  dominantDNA: CulturalDNA;
}

// ══════════════════════════════════════════════════════════
//  DEFAULTS
// ══════════════════════════════════════════════════════════

const DEFAULT_DNA: CulturalDNA = {
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
//  HOOK
// ══════════════════════════════════════════════════════════

/**
 * useEventDesigner — Shared hook for AI Creation Modals.
 *
 * @param eventType — Which modal is using this hook.
 * @param memberId — Optional. Target member for personalization.
 * @returns UseEventDesignerReturn with full design pipeline.
 */
export function useEventDesigner(
  eventType: DesignerEventType,
  memberId?: string,
): UseEventDesignerReturn {
  // ── Data fetching ──
  const data = useCulturalData(memberId);

  // ── Local state ──
  const [phase, setPhase] = useState<UseEventDesignerReturn['phase']>('idle');
  const [, setRawInput] = useState<string>('');
  const [intent, setIntentState] = useState<DesignIntent | null>(null);
  const [design, setDesign] = useState<DesignResult | null>(null);
  const [impactHistory, setImpactHistory] = useState<ImpactDelta[]>([]);

  // ── Build taste profile (same logic as useCulturalDashboard) ──
  const tasteProfile = useMemo((): TasteProfile | null => {
    if (!data.memberHistory || !memberId) return null;

    const history = data.memberHistory as MemberAttendanceRecord[];
    const feedback: MemberEventFeedback[] = [];
    const preferences = data.memberPreferences as MemberCulturalPreferences | undefined;

    return buildTasteProfile(memberId, history, feedback, preferences);
  }, [data.memberHistory, data.memberPreferences, memberId]);

  const dominantDNA = useMemo((): CulturalDNA => {
    return tasteProfile?.culturalDNA ?? DEFAULT_DNA;
  }, [tasteProfile]);

  // ── Build venue personalities ──
  const venuePersonalities = useMemo(() => {
    if (!data.analytics) return [];

    const venueData = (data.analytics.venue_utilization ?? []) as VenueUsageRecord[];
    const feedbackData: VenueFeedbackRecord[] = [];
    const venueTypes: Record<string, VenueType> = {};

    for (const v of venueData) {
      venueTypes[v.venue] = v.venue_type as VenueType;
    }

    return buildAllVenuePersonalities(venueData, feedbackData, venueTypes);
  }, [data.analytics]);

  // ── Build design context ──
  const context = useMemo((): DesignContext => ({
    tasteProfiles: tasteProfile ? [tasteProfile] : [],
    dominantDNA,
    venuePersonalities,
    demandForecasts: [],
    clubId: '',
  }), [tasteProfile, dominantDNA, venuePersonalities]);

  // ── Actions ──

  /** Set the operator's raw intention text. */
  const setIntention = useCallback((input: string) => {
    setRawInput(input);
    const parsed = captureIntention(input, eventType);
    setIntentState(parsed);
    setPhase('intention');
    setDesign(null);
    setImpactHistory([]);
  }, [eventType]);

  /** Generate a proposal from current intent. */
  const generate = useCallback(() => {
    if (!intent) return;

    setPhase('designing');

    // Pure function — synchronous, no loading needed
    const result = generateEventProposal(intent, context);
    setDesign(result);
    setPhase('refining');
  }, [intent, context]);

  /** Refine the proposal by changing a field. Returns impact delta. */
  const refine = useCallback((change: ProposalChange): ImpactDelta | null => {
    if (!design) return null;

    const delta = engineComputeImpact(design.enriched, change, context);

    setImpactHistory((prev) => [...prev, delta]);

    return delta;
  }, [design, context]);

  /** Select a variant as the new primary proposal. */
  const selectVariant = useCallback((variantIndex: number) => {
    if (!design || !design.variants[variantIndex]) return;

    // TODO: Apply variant changes to the enriched proposal.
    // For now, the variant selection is tracked but the enriched
    // proposal stays as-is. The modal UI shows the variant details
    // and the operator can manually apply changes via refine().
  }, [design]);

  /** Confirm the proposal. */
  const confirm = useCallback(() => {
    if (!design?.readyToExecute) return;
    setPhase('confirmed');
  }, [design]);

  /** Reset the entire designer. */
  const reset = useCallback(() => {
    setPhase('idle');
    setRawInput('');
    setIntentState(null);
    setDesign(null);
    setImpactHistory([]);
  }, []);

  // ── Computed state ──
  const isDesigning = phase === 'designing';
  const readyToExecute = design?.readyToExecute ?? false;
  const blockers = design?.blockers ?? [];

  return {
    phase,
    isDesigning,

    intent,
    setIntention,

    design,
    generate,

    refine,
    impactHistory,
    selectVariant,

    readyToExecute,
    blockers,
    confirm,

    reset,

    tasteProfile,
    dominantDNA,
  };
}