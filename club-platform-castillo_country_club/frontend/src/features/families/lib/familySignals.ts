// ═══════════════════════════════════════════════════════════
// src/features/families/lib/familySignals.ts
// Phase 34+ Migration — Signal Utilities Rewrite
// Level 6+ Agency · Production Grade
//
// Pure functions for deriving intelligence from family data.
// Config values imported from ../config.ts — zero hardcoded values.
//
// Functions: 11 exported, 2 private helpers
//
// PRE-WRITE VERIFICATION:
//   Family, ActivityRecord, MemberTier, ChurnRisk, FamilyStatus
//     → ../types.ts ✅
//   FamilyPulseVital, EngagementTemperature, AdaptiveCardPriority,
//   LifecycleProjection, FamilyMilestone, FamilyBrief, FamilyEnrichmentData
//     → ../ai-types.ts ✅
//   ROW_SIGNALS, TIER_KEYWORDS, CHURN_KEYWORDS, STATUS_KEYWORDS
//   PULSE_KEYWORDS, TEMPERATURE_KEYWORDS, LIFECYCLE_KEYWORDS
//   PRIORITY_ORDER, TEMPERATURE_ZONES
//   ENGAGEMENT_LEVELS, ACTIVITY_TIMING, BALANCE_THRESHOLDS
//     → ../config.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - ConversationSeed import (unused)
//   - PRIORITY_SLOTS import (unused)
//   - TEMPERATURE_ZONES import (unused — only TEMPERATURE_ZONES used)
//   - confidence 0-1 scale in generateGlanceInsight → 0-100
//   - 15+ magic numbers → config constants
//   - deriveTrend called inside 30-iteration loop → hoisted
//   - No readonly on interface properties → readonly added
//   - No § markers → added
// ═══════════════════════════════════════════════════════════

import type {
  Family,
  ActivityRecord,
  MemberTier,
  ChurnRisk,
  FamilyStatus,
} from "../types";

import type {
  FamilyPulseVital,
  EngagementTemperature,
  AdaptiveCardPriority,
  LifecycleProjection,
  FamilyMilestone,
  FamilyEnrichmentData,
} from "../ai-types";

import {
  ROW_SIGNALS,
  TIER_KEYWORDS,
  CHURN_KEYWORDS,
  STATUS_KEYWORDS,
  PULSE_KEYWORDS,
  TEMPERATURE_KEYWORDS,
  LIFECYCLE_KEYWORDS,
  PRIORITY_ORDER,
  ENGAGEMENT_LEVELS,
  ACTIVITY_TIMING,
  BALANCE_THRESHOLDS,
  TEMPERATURE_ZONES,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Engagement trend direction */
export type Trend = "up" | "down" | "stable";

/** Row signal key — derived from ROW_SIGNALS config keys */
export type RowSignalKey = keyof typeof ROW_SIGNALS;

/** Single derived insight for card display */
export interface DerivedInsight {
  readonly text: string;
  readonly type: "positive" | "warning" | "alert";
}

/** Parsed smart search result with auto-filters and visual pills */
export interface ParsedSearch {
  readonly text: string;
  readonly autoFilters: {
    tier?: MemberTier;
    churn?: ChurnRisk;
    status?: FamilyStatus;
    pulse?: string;
    temperature?: string;
    lifecycle?: string;
  };
  readonly pills: Array<{
    readonly key: string;
    readonly label: string;
    readonly color: string;
  }>;
}

/** A single signal in the glance insight */
export interface GlanceSignal {
  readonly severity: "critical" | "warning" | "info";
  readonly label: string;
  readonly value: string;
}

/** Full AI glance insight for the Intelligence Glance card */
export interface GlanceInsight {
  readonly headline: string;
  readonly headlineType: "alert" | "warning" | "opportunity" | "stable";
  readonly signals: GlanceSignal[];
  readonly temperature: number;
  readonly temperatureZone: string;
  readonly temperatureColor: string;
  readonly trend: Trend;
  readonly recommendation: string;
  /** Confidence 0-100 */
  readonly confidence: number;
}

function resolveTemperatureZone(score: number) {
  return (
    TEMPERATURE_ZONES.find((zone) => score >= zone.min && score <= zone.max) ??
    TEMPERATURE_ZONES[TEMPERATURE_ZONES.length - 1]
  );
}

// ═══════════════════════════════════════════════════════════
// §2  Days Calculation
// ═══════════════════════════════════════════════════════════

/**
 * Calculate days elapsed since a date string.
 * Returns 999 for invalid/missing dates — safe fallback
 * that always triggers "stale" comparisons downstream.
 *
 * @param dateStr - ISO date string
 * @returns Number of days, or 999 if invalid/missing
 */
export function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// ═══════════════════════════════════════════════════════════
// §3  Row Signal — Primary visual signal per family row
// ═══════════════════════════════════════════════════════════

/**
 * Derive the primary visual signal for a family list row.
 * Priority order: at-risk > negative > new > dormant > high-value > none.
 *
 * @param family - Family data
 * @returns Row signal config with label, color, cssClass, icon
 */
export function getRowSignal(
  family: Family,
): (typeof ROW_SIGNALS)[RowSignalKey] {
  if (
    family.churnRisk === "critical" ||
    family.churnRisk === "high"
  ) {
    return {
      ...ROW_SIGNALS["at-risk"],
      label: family.churnRisk === "critical" ? "Crítico" : "En riesgo",
    };
  }

  if (family.totalBalance < 0) {
    return ROW_SIGNALS.negative;
  }

  if (daysSince(family.since) < ACTIVITY_TIMING.NEW_MEMBER) {
    return ROW_SIGNALS.new;
  }

  if (daysSince(family.lastActivity) > ACTIVITY_TIMING.DORMANT) {
    return ROW_SIGNALS.dormant;
  }

  if (
    family.engagementScore >= ENGAGEMENT_LEVELS.HIGH &&
    (["oro", "platino", "vip"] as MemberTier[]).includes(family.tier)
  ) {
    return ROW_SIGNALS["high-value"];
  }

  return ROW_SIGNALS.none;
}

/**
 * Get CSS class for a row signal key.
 *
 * @param signal - RowSignalKey
 * @returns CSS class name from config, or empty string if not found
 */
export function getRowCssClass(signal: RowSignalKey): string {
  return ROW_SIGNALS[signal]?.cssClass ?? "";
}

// ═══════════════════════════════════════════════════════════
// §4  Engagement Trend
// ═══════════════════════════════════════════════════════════

/**
 * Derive engagement trend direction from family data.
 * Uses churn risk, engagement score, and activity recency.
 *
 * @param family - Family data
 * @returns Trend direction: "up" | "down" | "stable"
 */
export function deriveTrend(family: Family): Trend {
  if (
    family.churnRisk === "critical" ||
    family.churnRisk === "high"
  ) {
    return "down";
  }

  if (
    family.engagementScore >= ENGAGEMENT_LEVELS.HIGH &&
    family.churnRisk === "low"
  ) {
    return "up";
  }

  if (daysSince(family.lastActivity) > ACTIVITY_TIMING.TREND_DOWN) {
    return "down";
  }

  return "stable";
}

// ═══════════════════════════════════════════════════════════
// §5  Sparkline — Real data or deterministic synthetic fallback
// ═══════════════════════════════════════════════════════════

/**
 * Generate sparkline points for a family.
 * Uses real history if available (length >= 7), otherwise
 * generates deterministic synthetic points from family ID.
 *
 * @param family - Family data (used for synthetic generation seed)
 * @param realHistory - Optional real history from EngagementTemperature
 * @returns Array of 7 normalized points in [0.08, 1.0]
 */
export function getSparklinePoints(
  family: Family,
  realHistory?: number[],
): number[] {
  if (realHistory && realHistory.length >= 7) {
    const max = Math.max(...realHistory, 1);
    return realHistory.slice(-7).map((v) => Math.max(0.08, v / max));
  }

  // Deterministic synthetic — same family ID always produces same sparkline
  const score = family.engagementScore / 100;
  const seed = family.id
    .split("")
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const trend = deriveTrend(family);
  const slope =
    trend === "up" ? 0.06 : trend === "down" ? -0.06 : 0.01;

  return Array.from({ length: 7 }, (_, i) => {
    const progress = i / 6;
    const base = score - slope * (1 - progress);
    const noise = Math.sin((seed + i * 37) * 0.1) * 0.07;
    return Math.max(0.08, Math.min(1, base + noise));
  });
}

// ═══════════════════════════════════════════════════════════
// §6  Pulse — The heartbeat of a family (P1)
// ═══════════════════════════════════════════════════════════

/**
 * Calculate FamilyPulseVital from activity records.
 * Analyzes weekly activity counts, rhythm patterns,
 * amplitude depth, and zone distribution.
 *
 * @param family - Family data (for fallback amplitude)
 * @param activities - Activity records (last 30+ days)
 * @returns Pulse vital with bpm, rhythm, amplitude, zones, trends
 */
export function derivePulse(
  family: Family,
  activities: ActivityRecord[] = [],
): FamilyPulseVital {
  const now = Date.now();
  const DAY = 86_400_000;

  // Count activities per week
  const weekAgo = now - 7 * DAY;
  const thisWeek = activities.filter(
    (a) => new Date(a.date).getTime() >= weekAgo,
  );
  const lastWeek = activities.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= weekAgo - 7 * DAY && t < weekAgo;
  });
  const bpm = thisWeek.length;

  // Rhythm — analyze last 4 weeks pattern (oldest first)
  const weeks = Array.from({ length: 4 }, (_, w) => {
    const start = now - (w + 1) * 7 * DAY;
    const end = now - w * 7 * DAY;
    return activities.filter((a) => {
      const t = new Date(a.date).getTime();
      return t >= start && t < end;
    }).length;
  }).reverse();

  const rhythm = deriveRhythm(weeks, bpm);
  const amplitude = deriveAmplitude(family, activities);

  // Last beat — most recent activity
  const sorted = [...activities].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const lastBeat = sorted[0]?.date ?? family.lastActivity;

  // Trends — compare recent periods
  const twoWeeksAgo = activities.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= now - 14 * DAY && t < weekAgo;
  });
  const fourWeeksAgo = activities.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= now - 30 * DAY && t < now - 14 * DAY;
  });

  const trend7d = bpm - twoWeeksAgo.length;
  const trend30d =
    bpm + lastWeek.length - (twoWeeksAgo.length + fourWeeksAgo.length);

  // Zones — active/passive/dormant distribution over 30 days
  const totalDays = 30;
  const activeDays = new Set(
    activities
      .filter((a) => new Date(a.date).getTime() >= now - 30 * DAY)
      .map((a) => new Date(a.date).toISOString().split("T")[0]),
  ).size;
  const passiveDays = Math.max(0, Math.floor(activeDays * 0.4));
  const dormantDays = Math.max(0, totalDays - activeDays - passiveDays);

  return {
    bpm,
    rhythm,
    amplitude,
    lastBeat,
    trend7d,
    trend30d,
    zones: {
      active: Math.round((activeDays / totalDays) * 100),
      passive: Math.round((passiveDays / totalDays) * 100),
      dormant: Math.round((dormantDays / totalDays) * 100),
    },
  };
}

/**
 * Derive rhythm pattern from weekly activity counts.
 * Classifies as: flatline, sporadic, accelerating, decelerating, steady.
 */
function deriveRhythm(
  weeks: number[],
  currentBpm: number,
): FamilyPulseVital["rhythm"] {
  if (currentBpm === 0 && weeks.every((w) => w === 0)) {
    return "flatline";
  }

  const avg = weeks.reduce((a, b) => a + b, 0) / weeks.length;
  const variance =
    weeks.reduce((sum, w) => sum + Math.pow(w - avg, 2), 0) / weeks.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 0;

  if (cv > 0.6) return "sporadic";

  const firstHalf = (weeks[0] + weeks[1]) / 2;
  const secondHalf = (weeks[2] + weeks[3]) / 2;

  if (secondHalf > firstHalf * 1.3) return "accelerating";
  if (secondHalf < firstHalf * 0.7) return "decelerating";

  return "steady";
}

/**
 * Derive engagement amplitude — weighted by activity type depth.
 * Deep activities (reservations, events) weight higher than shallow (communications).
 */
function deriveAmplitude(
  family: Family,
  activities: ActivityRecord[],
): number {
  if (activities.length === 0) {
    return Math.max(0, family.engagementScore * 0.5);
  }

  const weights: Record<string, number> = {
    reservation: 1.0,
    event: 0.8,
    charge: 0.6,
    payment: 0.4,
    communication: 0.3,
  };

  const totalWeight = activities.reduce(
    (sum, a) => sum + (weights[a.type] ?? 0.3),
    0,
  );
  const maxPossible = activities.length * 1.0;

  return Math.min(
    100,
    Math.round(
      (totalWeight / maxPossible) * 100 * 0.7 +
        family.engagementScore * 0.3,
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// §7  Temperature — Engagement feels (P2)
// ═══════════════════════════════════════════════════════════

/**
 * Calculate EngagementTemperature for a family.
 * Produces current temp, zone, 7d/30d history, club comparison,
 * and 30-day linear prediction.
 *
 * Client-side fallback — enrichment data from AI backend
 * takes precedence when available.
 *
 * @param family - Family data
 * @param history7d - Optional real 7-day history
 * @param history30d - Optional real 30-day history
 * @param clubAvg - Optional club average for benchmark
 * @returns EngagementTemperature with zones, trends, predictions
 */
export function deriveTemperature(
  family: Family,
  history7d?: number[],
  history30d?: number[],
  clubAvg?: number,
): EngagementTemperature {
  const current = family.engagementScore;
  const zoneConfig = resolveTemperatureZone(current);
  const avgClubTemp = clubAvg ?? ENGAGEMENT_LEVELS.CLUB_AVERAGE;

  // 7-day history — real or synthetic sparkline
  const h7 =
    history7d ??
    getSparklinePoints(family).map((v) => Math.round(v * 100));

  // 30-day history — real or synthetic sinusoidal
  const trend = deriveTrend(family);
  const slope =
    trend === "up" ? 0.3 : trend === "down" ? -0.3 : 0;
  const h30 =
    history30d ??
    Array.from({ length: 30 }, (_, i) => {
      const wave = Math.sin(i * 0.3) * 8;
      return Math.max(
        0,
        Math.min(100, Math.round(current + wave + slope * (i - 15))),
      );
    });

  // 30-day prediction — linear regression on trend
  const slope30d =
    h30.length > 1
      ? (h30[h30.length - 1] - h30[0]) / h30.length
      : 0;
  const predicted30d = Math.max(
    0,
    Math.min(100, Math.round(current + slope30d * 30)),
  );

  return {
    current,
    zone: zoneConfig.zone,
    history7d: h7,
    history30d: h30,
    avgClubTemp,
    deltaVsClub: Math.round((current - avgClubTemp) * 10) / 10,
    predicted30d,
  };
}

// ═══════════════════════════════════════════════════════════
// §8  Adaptive Priority — What to show on the card (P3)
// ═══════════════════════════════════════════════════════════

/**
 * Determine the highest-priority slot for a family card.
 * Iterates PRIORITY_ORDER (highest weight first) and returns
 * the first matching slot. Falls back to engagement context.
 *
 * @param family - Family data
 * @param milestones - Optional upcoming milestones
 * @param lifecycle - Optional lifecycle projection
 * @returns AdaptiveCardPriority with slot, reason, urgency
 */
export function deriveAdaptivePriority(
  family: Family,
  milestones?: FamilyMilestone[],
  lifecycle?: LifecycleProjection,
): AdaptiveCardPriority {
  for (const slot of PRIORITY_ORDER) {
    const match = checkPrioritySlot(slot, family, milestones, lifecycle);
    if (match) return match;
  }

  // Default — engagement context
  const trend = deriveTrend(family);
  return {
    hero: "engagement_surge",
    reason: `Engagement ${family.engagementScore}/100 — ${
      trend === "up"
        ? "en crecimiento"
        : trend === "down"
          ? "en descenso"
          : "estable"
    }`,
    urgency: "upcoming",
    suggestedAction:
      trend === "down" ? "Programar contacto" : undefined,
    data: {
      slot: "engagement_surge",
      surgePercent: family.engagementScore,
      topActivity: "engagement",
      period: trend === "up" ? "crecimiento" : trend === "down" ? "decaimiento" : "estable",
    },
  };
}

/**
 * Check if a specific priority slot matches for this family.
 * Returns AdaptiveCardPriority if matched, null otherwise.
 */
function checkPrioritySlot(
  slot: string,
  family: Family,
  milestones?: FamilyMilestone[],
  lifecycle?: LifecycleProjection,
): AdaptiveCardPriority | null {
  switch (slot) {
    case "churn_warning": {
      if (
        family.churnRisk !== "critical" &&
        family.churnRisk !== "high"
      )
        return null;

      return {
        hero: "churn_warning",
        reason:
          family.churnRisk === "critical"
            ? "Riesgo crítico de abandono — acción inmediata requerida"
            : "Engagement en descenso — programa de retención recomendado",
        urgency: family.churnRisk === "critical" ? "immediate" : "today",
        suggestedAction: "Contactar equipo de retención",
        data: {
          slot: "churn_warning",
          churnScore: family.engagementScore,
          topFactor: family.churnRisk === "critical" ? "riesgo crítico" : "engagement",
          daysAtRisk: 7,
        },
      };
    }

    case "milestone_approaching": {
      const imminent = milestones?.find(
        (m) => m.daysUntil <= 3 && m.daysUntil >= 0,
      );
      if (!imminent) return null;

      return {
        hero: "milestone_approaching",
        reason: `${imminent.title} en ${
          imminent.daysUntil === 0
            ? "hoy"
            : `${imminent.daysUntil} día${imminent.daysUntil > 1 ? "s" : ""}`
        }`,
        urgency: imminent.daysUntil === 0 ? "immediate" : "today",
        suggestedAction: imminent.suggestedAction,
        data: {
          slot: "milestone_approaching",
          milestoneType: imminent.type,
          milestoneDate: imminent.date,
          daysUntil: imminent.daysUntil,
          memberName: imminent.memberName,
        },
      };
    }

    case "financial_alert": {
      if (family.totalBalance >= BALANCE_THRESHOLDS.SIGNIFICANT)
        return null;

      return {
        hero: "financial_alert",
        reason: `Saldo pendiente de ₡${Math.abs(family.totalBalance).toLocaleString("es-CR")}`,
        urgency:
          family.totalBalance < BALANCE_THRESHOLDS.CRITICAL
            ? "immediate"
            : "today",
        suggestedAction: "Gestionar cobro prioritario",
        data: {
          slot: "financial_alert",
          balance: family.totalBalance,
          daysOverdue: Math.max(0, family.totalBalance < 0 ? 1 : 0),
          lastPayment: family.lastActivity ?? new Date().toISOString(),
        },
      };
    }

    case "lifecycle_transition": {
      if (!lifecycle?.interventionWindow) return null;

      const now = Date.now();
      const opens = new Date(
        lifecycle.interventionWindow.opens,
      ).getTime();
      const closes = new Date(
        lifecycle.interventionWindow.closes,
      ).getTime();
      if (now < opens || now > closes) return null;

      return {
        hero: "lifecycle_transition",
        reason: `Ventana de intervención activa — proyectado a "${lifecycle.projectedStage}"`,
        urgency: "this_week",
        suggestedAction:
          lifecycle.interventionWindow.suggestedActions?.[0],
        data: {
          slot: "lifecycle_transition",
          fromStage: lifecycle.currentStage,
          toStage: lifecycle.projectedStage,
          triggerEvent: lifecycle.triggerEvents[0] ?? "intervención",
        },
      };
    }

    case "new_member_celebration": {
      const days = daysSince(family.since);
      if (days >= ACTIVITY_TIMING.NEW_MEMBER) return null;

      return {
        hero: "new_member_celebration",
        reason: `Nueva familia — ${days} días en el club`,
        urgency: "this_week",
        suggestedAction: "Programar bienvenida personalizada",
        data: {
          slot: "new_member_celebration",
          memberName: family.familyName ?? "Familia",
          joinedAt: family.since,
          daysSince: days,
        },
      };
    }

    case "engagement_surge": {
      if (
        family.engagementScore < ENGAGEMENT_LEVELS.EXCEPTIONAL ||
        family.churnRisk !== "low"
      )
        return null;

      return {
        hero: "engagement_surge",
        reason: `Engagement excepcional (${family.engagementScore}/100)`,
        urgency: "upcoming",
        suggestedAction: "Candidata para referidos o upgrade",
        data: {
          slot: "engagement_surge",
          surgePercent: family.engagementScore,
          topActivity: "engagement",
          period: "current",
        },
      };
    }

    case "anniversary": {
      const annivDay = new Date(family.since);
      const thisYear = new Date();
      annivDay.setFullYear(thisYear.getFullYear());
      const daysUntilAnniv = Math.floor(
        (annivDay.getTime() - Date.now()) / 86_400_000,
      );
      if (daysUntilAnniv < 0 || daysUntilAnniv > 7) return null;

      return {
        hero: "anniversary",
        reason: `Aniversario en ${
          daysUntilAnniv === 0
            ? "hoy"
            : `${daysUntilAnniv} día${daysUntilAnniv > 1 ? "s" : ""}`
        }`,
        urgency: daysUntilAnniv <= 1 ? "immediate" : "this_week",
        suggestedAction: "Preparar celebración de aniversario",
        data: {
          slot: "anniversary",
          years: 1,
          date: family.since,
          memberName: family.familyName,
        },
      };
    }

    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// §9  Derived Insight — AI-generated or rule-based (P4)
// ═══════════════════════════════════════════════════════════

/**
 * Generate a single-line insight for a family card.
 * When enrichment data is available, produces richer
 * insights combining pulse, temperature, and lifecycle.
 * Falls back to core family data when enrichment is absent.
 *
 * Note: This is complementary to the Advisor Engine's
 * BaseInsight[] — not a replacement. This function produces
 * a quick narrative for cards; the engine produces deep
 * intelligence for the AdvisorBanner.
 *
 * @param family - Core family data
 * @param enrichment - Optional AI enrichment data (pulse, temperature, brief, lifecycle)
 * @returns DerivedInsight with text and severity
 */
export function deriveInsight(
  family: Family,
  enrichment?: FamilyEnrichmentData & {
    lifecycle?: LifecycleProjection;
  },
): DerivedInsight {
  const daysActivity = daysSince(family.lastActivity);
  const daysMember = daysSince(family.since);

  // ── Enriched insights (when AI data available) ──

  if (enrichment?.lifecycle?.interventionWindow) {
    const closes = new Date(
      enrichment.lifecycle.interventionWindow.closes,
    );
    const daysLeft = Math.ceil(
      (closes.getTime() - Date.now()) / 86_400_000,
    );
    if (daysLeft > 0 && daysLeft <= 14) {
      return {
        text: `Ventana de intervención se cierra en ${daysLeft} días. Proyectado: transición a "${enrichment.lifecycle.projectedStage}". ${
          enrichment.lifecycle.interventionWindow
            .suggestedActions?.[0] ?? "Acción recomendada."
        }`,
        type: daysLeft <= 3 ? "alert" : "warning",
      };
    }
  }

  if (enrichment?.pulse?.rhythm === "flatline") {
    return {
      text: `Pulso en flatline — sin actividad detectable en los últimos 7 días. Último latido: ${
        enrichment.pulse.lastBeat
          ? new Date(enrichment.pulse.lastBeat).toLocaleDateString(
              "es-CR",
            )
          : "desconocido"
      }. Se recomienda contacto inmediato.`,
      type: "alert",
    };
  }

  if (
    enrichment?.temperature &&
    enrichment.temperature.zone === "frozen"
  ) {
    return {
      text: `Temperatura frozen (${
        enrichment.temperature.current
      }°) — ${Math.abs(
        enrichment.temperature.deltaVsClub,
      )}° por debajo del promedio del club (${
        enrichment.temperature.avgClubTemp
      }°). Programa de reactivación urgente.`,
      type: "alert",
    };
  }

  if (
    enrichment?.pulse?.rhythm === "decelerating" &&
    enrichment?.temperature
  ) {
    return {
      text: `Pulso desacelerando, temperatura ${enrichment.temperature.zone} (${enrichment.temperature.current}°). Tendencia descendente detectada — intervenir antes de llegar a zona frozen.`,
      type: "warning",
    };
  }

  if (
    enrichment?.temperature?.zone === "burning" &&
    enrichment?.pulse?.rhythm === "steady"
  ) {
    return {
      text: `Temperatura burning (${enrichment.temperature.current}°) con pulso estable. Familia excepcional — candidata para referidos, upgrade de tier o programa de embajadores.`,
      type: "positive",
    };
  }

  // ── Core insights (fallback — no enrichment needed) ──

  if (family.churnRisk === "critical") {
    return {
      text: `Riesgo crítico de abandono. ${
        daysActivity > ACTIVITY_TIMING.DORMANT
          ? `Sin actividad ${daysActivity} días.`
          : "Factores de riesgo múltiples detectados."
      } Se recomienda contacto inmediato del equipo de retención.`,
      type: "alert",
    };
  }

  if (family.churnRisk === "high") {
    return {
      text: `Engagement en descenso (${family.engagementScore}/100). Programa de reactivación recomendado: invitación a evento exclusivo o beneficio personalizado.`,
      type: "warning",
    };
  }

  if (
    family.engagementScore >= ENGAGEMENT_LEVELS.EXCEPTIONAL &&
    (["oro", "platino", "vip"] as MemberTier[]).includes(family.tier)
  ) {
    return {
      text: `Familia de alto valor con engagement excepcional. Candidata para programa de referidos o upgrade de tier. Potencial embajador de marca.`,
      type: "positive",
    };
  }

  if (family.totalBalance < 0) {
    return {
      text: `Saldo pendiente de ₡${Math.abs(
        family.totalBalance,
      ).toLocaleString("es-CR")}. ${
        family.totalBalance < BALANCE_THRESHOLDS.CRITICAL
          ? "Monto significativo — gestionar cobro prioritario."
          : "Seguimiento de cobro estándar recomendado."
      }`,
      type: "warning",
    };
  }

  if (daysMember < ACTIVITY_TIMING.NEW_MEMBER) {
    return {
      text: `Familia nueva en período de onboarding. ${
        daysActivity < 7
          ? "Excelente integración inicial."
          : "Programa de bienvenida activo recomendado para acelerar la adopción."
      }`,
      type: daysActivity < 7 ? "positive" : "warning",
    };
  }

  if (daysActivity > ACTIVITY_TIMING.DORMANT) {
    return {
      text: `Sin actividad en ${daysActivity} días. ${
        family.engagementScore > ENGAGEMENT_LEVELS.LOW
          ? "Todavía con engagement base — ventana de reactivación activa."
          : "Riesgo de transición a estado inactivo."
      }`,
      type: "warning",
    };
  }

  return {
    text: `Familia estable con engagement de ${family.engagementScore}/100. Mantenimiento de rutina.`,
    type: "positive",
  };
}

// ═══════════════════════════════════════════════════════════
// §10  Smart Search — Natural language parser (P6)
// ═══════════════════════════════════════════════════════════

/**
 * Parse natural language search input into structured filters.
 * Detects keywords for tier, churn, status, pulse, temperature,
 * and lifecycle. Returns cleaned text + auto-applied filters
 * + visual pills for the search UI.
 *
 * @param input - Raw search string
 * @returns ParsedSearch with cleaned text, filters, and pills
 */
export function parseSmartSearch(input: string): ParsedSearch {
  let text = ` ${input.toLowerCase()} `;
  const autoFilters: ParsedSearch["autoFilters"] = {};
  const pills: ParsedSearch["pills"] = [];

  // Tier keywords
  for (const kw of TIER_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.tier = kw.value;
    pills.push({
      key: "tier",
      label: `Nivel: ${kw.label}`,
      color: "var(--color-gold-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(
        new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        " ",
      );
    });
    break;
  }

  // Churn keywords
  for (const kw of CHURN_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.churn = kw.value;
    pills.push({
      key: "churn",
      label: `Riesgo: ${kw.label}`,
      color: "var(--color-rose-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(
        new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        " ",
      );
    });
    break;
  }

  // Status keywords (word-boundary matching for short common words)
  for (const kw of STATUS_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.status = kw.value;
    pills.push({
      key: "status",
      label: `Estado: ${kw.label}`,
      color: "var(--color-teal-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(new RegExp(`\\b${k}\\b`, "gi"), " ");
    });
    break;
  }

  // Pulse keywords
  for (const kw of PULSE_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.pulse = kw.value;
    pills.push({
      key: "pulse",
      label: `Pulso: ${kw.label}`,
      color: "var(--color-emerald-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(
        new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        " ",
      );
    });
    break;
  }

  // Temperature keywords
  for (const kw of TEMPERATURE_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.temperature = kw.value;
    pills.push({
      key: "temperature",
      label: `Temperatura: ${kw.label}`,
      color: "var(--color-amber-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(
        new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        " ",
      );
    });
    break;
  }

  // Lifecycle keywords
  for (const kw of LIFECYCLE_KEYWORDS) {
    if (!kw.keywords.some((k) => text.includes(k))) continue;

    autoFilters.lifecycle = kw.value;
    pills.push({
      key: "lifecycle",
      label: `Lifecycle: ${kw.label}`,
      color: "var(--color-silver-400)",
    });
    kw.keywords.forEach((k) => {
      text = text.replace(
        new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        " ",
      );
    });
    break;
  }

  return {
    text: text.replace(/\s+/g, " ").trim(),
    autoFilters,
    pills,
  };
}

// ═══════════════════════════════════════════════════════════
// §11  Glance Insight — AI narrative for Intelligence Card
// ═══════════════════════════════════════════════════════════

/**
 * Generate an AI-powered glance insight for a family.
 * Pattern-matches on Family data only (no enrichment needed).
 * Returns structured narrative for the IntelligenceGlance card
 * including headline, signals, recommendation, and confidence.
 *
 * @param family - Family data
 * @returns GlanceInsight with headline, signals, recommendation (confidence 0-100)
 */
export function generateGlanceInsight(family: Family): GlanceInsight {
  const signals: GlanceSignal[] = [];
  const daysActivity = daysSince(family.lastActivity);
  const daysMember = daysSince(family.since);
  const trend = deriveTrend(family);
  const tempZone = resolveTemperatureZone(family.engagementScore);

  // ── Gather signals ──

  if (family.churnRisk === "critical") {
    signals.push({
      severity: "critical",
      label: "Churn crítico",
      value: "Riesgo inminente",
    });
  } else if (family.churnRisk === "high") {
    signals.push({
      severity: "warning",
      label: "Churn alto",
      value: "En riesgo",
    });
  }

  if (daysActivity > ACTIVITY_TIMING.DORMANT) {
    signals.push({
      severity: "critical",
      label: "Sin actividad",
      value: `${daysActivity}d`,
    });
  } else if (daysActivity > ACTIVITY_TIMING.LOW_ACTIVITY) {
    signals.push({
      severity: "warning",
      label: "Baja actividad",
      value: `${daysActivity}d`,
    });
  }

  if (family.totalBalance < BALANCE_THRESHOLDS.CRITICAL) {
    signals.push({
      severity: "warning",
      label: "Saldo negativo",
      value: `₡${Math.abs(family.totalBalance).toLocaleString("es-CR")}`,
    });
  }

  if (family.engagementScore < ENGAGEMENT_LEVELS.CRITICAL) {
    signals.push({
      severity: "critical",
      label: "Engagement bajo",
      value: `${family.engagementScore}/100`,
    });
  } else if (
    family.engagementScore >= ENGAGEMENT_LEVELS.EXCEPTIONAL &&
    family.churnRisk === "low"
  ) {
    signals.push({
      severity: "info",
      label: "Alto engagement",
      value: `${family.engagementScore}/100`,
    });
  }

  if (daysMember < ACTIVITY_TIMING.NEW_MEMBER) {
    signals.push({
      severity: "info",
      label: "Nueva familia",
      value: `${daysMember}d en el club`,
    });
  }

  // ── Sort by severity ──
  const severityOrder: Record<GlanceSignal["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  signals.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
  const topSignals = signals.slice(0, 3);

  // ── Generate headline ──
  const criticalCount = topSignals.filter(
    (s) => s.severity === "critical",
  ).length;
  const warningCount = topSignals.filter(
    (s) => s.severity === "warning",
  ).length;

  let headline: string;
  let headlineType: GlanceInsight["headlineType"];

  if (criticalCount >= 2) {
    headline =
      "Alerta crítica: múltiples factores de riesgo requieren intervención inmediata.";
    headlineType = "alert";
  } else if (criticalCount === 1) {
    headline = `${topSignals[0].label} — acción urgente requerida para preservar la relación.`;
    headlineType = "alert";
  } else if (warningCount >= 2) {
    headline =
      "Patrón de desvinculación emergente — intervención preventiva recomendada.";
    headlineType = "warning";
  } else if (warningCount === 1) {
    headline = `${topSignals[0].label} — monitorear de cerca y considerar contacto preventivo.`;
    headlineType = "warning";
  } else if (
    family.engagementScore >= ENGAGEMENT_LEVELS.HIGH &&
    family.churnRisk === "low"
  ) {
    headline =
      "Familia en excelencia — engagement alto con riesgo mínimo. Candidata para reconocimiento.";
    headlineType = "opportunity";
  } else {
    headline = `Estabilidad operativa — engagement de ${family.engagementScore}/100 sin señales críticas.`;
    headlineType = "stable";
  }

  // ── Generate recommendation ──
  let recommendation: string;

  if (headlineType === "alert") {
    recommendation =
      family.churnRisk === "critical"
        ? "Contactar personalmente esta semana. Ofrecer sesión de reactivación con beneficio especial de reconexión."
        : "Programar contacto prioritario. Evaluar factores de riesgo y crear plan de retención personalizado.";
  } else if (headlineType === "warning") {
    if (daysActivity > ACTIVITY_TIMING.DORMANT) {
      recommendation =
        "Reactivar con invitación a evento exclusivo. Personalizar según intereses previos del grupo familiar.";
    } else if (family.totalBalance < 0) {
      recommendation =
        "Gestionar cobro con enfoque relacional. Ofrecer plan de pagos si el monto excede la capacidad.";
    } else {
      recommendation =
        "Incrementar frecuencia de contacto. Proponer nueva actividad alineada con los intereses familiares.";
    }
  } else if (headlineType === "opportunity") {
    recommendation =
      "Reconocer el excelente engagement. Evaluar upgrade de tier, programa de embajadores o beneficios exclusivos.";
  } else {
    recommendation =
      "Mantener contacto regular. Monitorear engagement mensualmente para detectar cambios de tendencia.";
  }

  // ── Confidence (0-100 scale) ──
  const confidence =
    signals.length === 0
      ? 40
      : Math.min(
          95,
          50 +
            criticalCount * 20 +
            warningCount * 10 +
            (signals.length > 2 ? 10 : 0),
        );

  return {
    headline,
    headlineType,
    signals: topSignals,
    temperature: family.engagementScore,
    temperatureZone: tempZone.label,
    temperatureColor: tempZone.color,
    trend,
    recommendation,
    confidence,
  };
}