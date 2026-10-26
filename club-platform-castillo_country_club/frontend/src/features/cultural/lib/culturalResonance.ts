/**
 * Cultural Resonance Engine — §C3
 *
 * Computes how much an event REVERBERATED in a member.
 * Not "did they like it?" but "did it CHANGE them?"
 *
 * Resonance measures the lasting emotional and behavioral impact
 * of a cultural experience:
 * — Immediate: satisfaction at the event
 * — Short-term: talk about it, recommend it, seek repeat
 * — Long-term: identity integration, preference changes
 *
 * The difference between satisfaction and resonance:
 * A member can rate an event 8/10 (satisfied) but forget about
 * it in a week (low resonance). Another event might rate 7/10
 * but the member keeps talking about it for months (high resonance).
 * Resonance is what separates "nice evening" from "life experience."
 *
 * Pure functions only — no hooks, no state, no side effects.
 *
 * Engine: §C3 computeExperientialResonance
 *
 * @module cultural/lib/culturalResonance
 */

import type { CulturalCategory } from '../types';
import type {
  ResonanceScore
} from '../types';
import { CULTURAL_RESONANCE_THRESHOLDS } from '../config';

// ══════════════════════════════════════════════════════════
//  RAW INPUT TYPES (from MCP backend)
// ══════════════════════════════════════════════════════════

/**
 * Raw event attendance record for resonance computation.
 * Combines attendance data with optional feedback.
 */
export interface ResonanceInput {
  eventId: string;
  memberId: string;
  eventTitle: string;
  category: CulturalCategory;
  date: string;
  /** Satisfaction score from feedback (0-100). */
  satisfactionScore?: number;
  /** Whether the member would attend a similar event. */
  wouldRepeat?: boolean;
  /** Whether the member recommended the event to others. */
  recommended?: boolean;
  /** Written feedback comment (used for sentiment depth). */
  comment?: string;
  /** Social media post about the event. */
  socialPost?: boolean;
}

/**
 * Aggregated behavior data after an event.
 * Collected from subsequent member activity in the system.
 */
export interface PostEventData {
  /** Days since the event until next cultural activity. */
  daysToNextCulturalActivity?: number;
  /** Whether the member mentioned the event in conversations. */
  mentionedInConversation?: boolean;
  /** Whether the member attended a similar event afterward. */
  attendedSimilarAfter?: boolean;
  /** Whether the member's genre preferences changed after. */
  preferencesChangedAfter?: boolean;
  /** Whether the member brought someone to a similar event. */
  broughtSomeoneAfter?: boolean;
  /** Number of times the event was referenced in the system. */
  referenceCount?: number;
}

// ══════════════════════════════════════════════════════════
//  §C3: COMPUTE EXPERIENTIAL RESONANCE
// ══════════════════════════════════════════════════════════

/**
 * §C3 — Computes the experiential resonance of an event for a member.
 *
 * Resonance is a weighted composite of 7 signals:
 *
 * 1. immediateScore    (weight 0.25) — Did they enjoy it right now?
 * 2. talkAboutIt       (weight 0.15) — Did they mention it afterward?
 * 3. recommendToOthers (weight 0.15) — Did they recommend it?
 * 4. seekRepeat        (weight 0.10) — Did they look for similar events?
 * 5. shareOnSocial     (weight 0.10) — Did they share it online?
 * 6. identityIntegration (weight 0.15) — Did it change who they are?
 * 7. resonanceDuration (weight 0.10) — How long did the effect last?
 *
 * @param input — Event attendance + feedback data.
 * @param postEvent — Subsequent behavioral data (optional, enhances accuracy).
 * @returns ResonanceScore with all dimensions + total composite.
 */
export function computeExperientialResonance(
  input: ResonanceInput,
  postEvent?: PostEventData,
): ResonanceScore {
  // ── 1. Immediate Score ──
  // Direct satisfaction from feedback, normalized to 0-100
  const immediateScore = normalizeSatisfaction(input.satisfactionScore);

  // ── 2. Talk About It ──
  // Did the member reference the event afterward?
  const talkAboutIt = postEvent?.mentionedInConversation ?? false;
  // Additional signal: written comment suggests they had something to say
  const commentSignal = (input.comment?.length ?? 0) > 20;

  // ── 3. Recommend To Others ──
  const recommendToOthers = input.recommended ?? postEvent?.broughtSomeoneAfter ?? false;

  // ── 4. Seek Repeat ──
  // Would they attend again? Or did they attend a similar event after?
  const seekRepeat = input.wouldRepeat ?? postEvent?.attendedSimilarAfter ?? false;

  // ── 5. Share On Social ──
  const shareOnSocial = input.socialPost ?? false;

  // ── 6. Identity Integration ──
  // Did the experience change their preferences or behavior patterns?
  // This is the deepest signal — it means the event became part of who they are.
  const identityIntegration = computeIdentityIntegration(
    immediateScore,
    postEvent,
    input,
  );

  // ── 7. Resonance Duration ──
  // How long did the effect last? Measured by time to next cultural activity.
  const resonanceDuration = computeResonanceDuration(postEvent);

  // ── Echo Count ──
  const echoCount = computeEchoCount(postEvent, input);

  // ── Weighted Composite ──
  const W = {
    immediate:    0.25,
    talk:         0.15,
    recommend:    0.15,
    seekRepeat:   0.10,
    social:       0.10,
    identity:     0.15,
    duration:     0.10,
  };

  const totalResonance = clamp(
    Math.round(
      immediateScore              * W.immediate +
      (talkAboutIt ? 100 : commentSignal ? 50 : 0) * W.talk +
      (recommendToOthers ? 100 : 0)                 * W.recommend +
      (seekRepeat ? 100 : 0)                        * W.seekRepeat +
      (shareOnSocial ? 100 : 0)                     * W.social +
      identityIntegration                           * W.identity +
      resonanceDuration                             * W.duration
    ),
    0,
    100,
  );

  return {
    eventId: input.eventId,
    memberId: input.memberId,
    immediateScore: clamp(immediateScore, 0, 100),
    talkAboutIt: talkAboutIt || commentSignal,
    recommendToOthers,
    seekRepeat,
    shareOnSocial,
    identityIntegration: clamp(identityIntegration, 0, 100),
    resonanceDuration,
    echoCount,
    totalResonance,
  };
}

// ══════════════════════════════════════════════════════════
//  BATCH PROCESSING
// ══════════════════════════════════════════════════════════

/**
 * Computes resonance scores for multiple events at once.
 * Useful for building the resonance map component.
 *
 * @param inputs — Array of event inputs.
 * @param postEvents — Optional map of post-event data by eventId.
 * @returns Array of resonance scores, sorted by totalResonance desc.
 */
export function computeBatchResonance(
  inputs: ResonanceInput[],
  postEvents?: Record<string, PostEventData>,
): ResonanceScore[] {
  const scores = inputs.map((input) =>
    computeExperientialResonance(
      input,
      postEvents?.[input.eventId],
    ),
  );

  // Sort by total resonance descending — most impactful first
  return [...scores].sort((a, b) => b.totalResonance - a.totalResonance);
}

/**
 * Computes average resonance across all events for a member.
 * Used by the advisor R17 (resonance drop detection).
 *
 * @param scores — Array of individual resonance scores.
 * @returns Average totalResonance, or 0 if empty.
 */
export function computeAverageResonance(scores: ResonanceScore[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((s, r) => s + r.totalResonance, 0);
  return Math.round(sum / scores.length);
}

/**
 * Splits resonance scores into recent vs older halves and
 * computes the drop (if any). Used by advisor R17.
 *
 * @param scores — Resonance scores with eventId containing sortable dates.
 * @param splitRatio — How much of the data is "recent" (0-1, default 0.5).
 * @returns Object with older average, recent average, and drop value.
 */
export function computeResonanceDrop(
  scores: ResonanceScore[],
  splitRatio: number = 0.5,
): { olderAvg: number; recentAvg: number; drop: number } {
  if (scores.length < 2) {
    return { olderAvg: 0, recentAvg: 0, drop: 0 };
  }

  // Sort by eventId (which corresponds to event date in most cases)
  const sorted = [...scores].sort((a, b) =>
    a.eventId.localeCompare(b.eventId),
  );

  const splitIndex = Math.floor(sorted.length * splitRatio);
  const olderHalf = sorted.slice(0, splitIndex);
  const recentHalf = sorted.slice(splitIndex);

  const olderAvg = computeAverageResonance(olderHalf);
  const recentAvg = computeAverageResonance(recentHalf);

  return {
    olderAvg,
    recentAvg,
    drop: olderAvg - recentAvg,
  };
}

/**
 * Classifies a resonance score into a human-readable level.
 * Uses thresholds from config.ts.
 *
 * @param score — Total resonance score (0-100).
 * @returns Level label.
 */
export function classifyResonanceLevel(
  score: number,
): 'transformative' | 'strong' | 'moderate' | 'minimal' | 'negligible' {
  const T = CULTURAL_RESONANCE_THRESHOLDS;
  if (score >= T.TRANSFORMATIVE) return 'transformative';
  if (score >= T.STRONG)         return 'strong';
  if (score >= T.MODERATE)       return 'moderate';
  if (score >= T.MINIMAL)        return 'minimal';
  return 'negligible';
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Normalizes satisfaction score to 0-100.
 * Handles both 1-5 rating and 0-100 scale inputs.
 */
function normalizeSatisfaction(score?: number): number {
  if (score === undefined || score === null) return 50; // neutral default
  if (score <= 5) return score * 20; // 1-5 → 20-100
  return clamp(score, 0, 100);
}

/**
 * Computes identity integration — the deepest resonance signal.
 *
 * Identity integration means the experience changed who the member is:
 * — Their preferences shifted after the event
 * — They started attending new types of events
 * — The experience became a reference point in their cultural journey
 *
 * @param immediateScore — How much they enjoyed it.
 * @param postEvent — Behavioral data after the event.
 * @param input — Original event data.
 * @returns Identity integration score 0-100.
 */
function computeIdentityIntegration(
  immediateScore: number,
  postEvent?: PostEventData,
  _input?: ResonanceInput,
): number {
  let score = 0;

  // High satisfaction is a prerequisite (but not sufficient)
  if (immediateScore >= 80) score += 30;
  else if (immediateScore >= 60) score += 15;

  // Preferences changed = strong identity signal
  if (postEvent?.preferencesChangedAfter) score += 35;

  // Attending similar events = the experience opened a door
  if (postEvent?.attendedSimilarAfter) score += 20;

  // Bringing someone = sharing the identity
  if (postEvent?.broughtSomeoneAfter) score += 15;

  return clamp(score, 0, 100);
}

/**
 * Computes resonance duration in days.
 *
 * Measures how long the event's effect lasted by looking at
 * the gap to the next cultural activity. Paradoxically, a SHORT
 * gap means the event motivated more engagement (high resonance),
 * while a LONG gap means they disengaged (low resonance).
 *
 * @param postEvent — Post-event behavioral data.
 * @returns Duration score 0-100 (higher = longer positive effect).
 */
function computeResonanceDuration(postEvent?: PostEventData): number {
  if (!postEvent?.daysToNextCulturalActivity) return 30; // neutral default

  const days = postEvent.daysToNextCulturalActivity;

  // Quick return to cultural activity = high resonance
  if (days <= 7) return 100;
  if (days <= 14) return 80;
  if (days <= 30) return 60;
  if (days <= 60) return 40;
  if (days <= 90) return 20;
  return 10; // More than 3 months = minimal resonance
}

/**
 * Computes echo count — how many times the event was referenced.
 *
 * Echoes come from:
 * — Direct references in conversation (postEvent.referenceCount)
 * — Written feedback (comment = 1 echo)
 * — Social sharing (socialPost = 2 echoes)
 * — Recommendation (recommended = 1 echo)
 *
 * @param postEvent — Post-event data.
 * @param input — Original event input.
 * @returns Total echo count.
 */
function computeEchoCount(
  postEvent?: PostEventData,
  input?: ResonanceInput,
): number {
  let count = 0;

  count += postEvent?.referenceCount ?? 0;
  if (input?.comment && input.comment.length > 10) count += 1;
  if (input?.socialPost) count += 2;
  if (input?.recommended) count += 1;
  if (postEvent?.mentionedInConversation) count += 1;

  return count;
}

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}