// src/features/facilities/lib/venueMatching.ts
// ═══════════════════════════════════════════════════════════════
// VENUE MATCHING ENGINE — "AI Booking Co-Designer"
//
// "Given a purpose and guest count, which venue is optimal?"
//
// Considers: capacity fit, purpose affinity, crowd availability,
// revenue optimization, maintenance conflicts, sensory profile,
// and personality alignment.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityType,
  OccupancyPrediction,
  RevenueModel,
  MaintenanceTask,
  VenueMatch,
  SensorySignature,
} from "../types";
import {
  FACILITY_TYPE_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ═══════════════════════════════════════════════════════════════
// SENSORY PROFILES — Facility Type → Sensory Signature
//
// Each facility type has a default sensory profile that the
// system uses for matching. In production, these could be
// customized per facility via sensor data.
// ═══════════════════════════════════════════════════════════════

const SENSORY_PROFILES: Record<FacilityType, SensorySignature> = {
  pool: {
    lighting: { type: "natural", intensity: 80, color_temp_k: 5500 },
    acoustics: { type: "social", target_db: 55, absorption_rating: 0.3 },
    temperature: { target_celsius: 28, humidity_pct: 65, airflow: "gentle" },
    aroma: { category: "fresh", intensity: 4 },
    texture: { primary: "smooth", comfort_rating: 70 },
  },
  gym: {
    lighting: { type: "cool", intensity: 70, color_temp_k: 5000 },
    acoustics: { type: "energetic", target_db: 60, absorption_rating: 0.4 },
    temperature: { target_celsius: 20, humidity_pct: 45, airflow: "strong" },
    aroma: { category: "neutral", intensity: 3 },
    texture: { primary: "industrial", comfort_rating: 50 },
  },
  tennis_court: {
    lighting: { type: "natural", intensity: 85, color_temp_k: 5500 },
    acoustics: { type: "energetic", target_db: 50, absorption_rating: 0.2 },
    temperature: { target_celsius: 24, humidity_pct: 50, airflow: "moderate" },
    aroma: { category: "natural", intensity: 3 },
    texture: { primary: "smooth", comfort_rating: 55 },
  },
  squash_court: {
    lighting: { type: "cool", intensity: 75, color_temp_k: 4800 },
    acoustics: { type: "energetic", target_db: 55, absorption_rating: 0.5 },
    temperature: { target_celsius: 22, humidity_pct: 50, airflow: "moderate" },
    aroma: { category: "neutral", intensity: 2 },
    texture: { primary: "smooth", comfort_rating: 50 },
  },
  golf_course: {
    lighting: { type: "natural", intensity: 90, color_temp_k: 5500 },
    acoustics: { type: "silent", target_db: 35, absorption_rating: 0.1 },
    temperature: { target_celsius: 25, humidity_pct: 55, airflow: "gentle" },
    aroma: { category: "natural", intensity: 5 },
    texture: { primary: "organic", comfort_rating: 80 },
  },
  restaurant: {
    lighting: { type: "warm", intensity: 50, color_temp_k: 2800 },
    acoustics: { type: "conversational", target_db: 48, absorption_rating: 0.6 },
    temperature: { target_celsius: 22, humidity_pct: 45, airflow: "gentle" },
    aroma: { category: "culinary", intensity: 6 },
    texture: { primary: "luxury", comfort_rating: 85 },
  },
  lounge: {
    lighting: { type: "ambient", intensity: 35, color_temp_k: 2700 },
    acoustics: { type: "intimate", target_db: 40, absorption_rating: 0.7 },
    temperature: { target_celsius: 22, humidity_pct: 45, airflow: "still" },
    aroma: { category: "luxury", intensity: 5 },
    texture: { primary: "luxury", comfort_rating: 90 },
  },
  ballroom: {
    lighting: { type: "dramatic", intensity: 60, color_temp_k: 3200 },
    acoustics: { type: "conversational", target_db: 50, absorption_rating: 0.5 },
    temperature: { target_celsius: 21, humidity_pct: 45, airflow: "moderate" },
    aroma: { category: "luxury", intensity: 5 },
    texture: { primary: "luxury", comfort_rating: 88 },
  },
  garden: {
    lighting: { type: "natural", intensity: 85, color_temp_k: 5500 },
    acoustics: { type: "social", target_db: 45, absorption_rating: 0.1 },
    temperature: { target_celsius: 25, humidity_pct: 60, airflow: "moderate" },
    aroma: { category: "natural", intensity: 6 },
    texture: { primary: "natural", comfort_rating: 75 },
  },
  parking: {
    lighting: { type: "cool", intensity: 40, color_temp_k: 4500 },
    acoustics: { type: "silent", target_db: 40, absorption_rating: 0.1 },
    temperature: { target_celsius: 28, humidity_pct: 50, airflow: "strong" },
    aroma: { category: "neutral", intensity: 1 },
    texture: { primary: "industrial", comfort_rating: 20 },
  },
  playground: {
    lighting: { type: "natural", intensity: 80, color_temp_k: 5500 },
    acoustics: { type: "energetic", target_db: 60, absorption_rating: 0.2 },
    temperature: { target_celsius: 25, humidity_pct: 55, airflow: "moderate" },
    aroma: { category: "fresh", intensity: 4 },
    texture: { primary: "organic", comfort_rating: 65 },
  },
  spa: {
    lighting: { type: "warm", intensity: 25, color_temp_k: 2600 },
    acoustics: { type: "intimate", target_db: 30, absorption_rating: 0.8 },
    temperature: { target_celsius: 24, humidity_pct: 55, airflow: "still" },
    aroma: { category: "luxury", intensity: 7 },
    texture: { primary: "organic", comfort_rating: 95 },
  },
  kids_area: {
    lighting: { type: "cool", intensity: 65, color_temp_k: 4500 },
    acoustics: { type: "social", target_db: 55, absorption_rating: 0.5 },
    temperature: { target_celsius: 22, humidity_pct: 45, airflow: "gentle" },
    aroma: { category: "fresh", intensity: 4 },
    texture: { primary: "smooth", comfort_rating: 60 },
  },
};

// ═══════════════════════════════════════════════════════════════
// PURPOSE → INTENT CLASSIFICATION
//
// Maps free-text purpose to structured intent categories.
// Used for purpose-affinity matching against facility types.
// ═══════════════════════════════════════════════════════════════

type PurposeIntent =
  | "corporate_dinner"
  | "party"
  | "meeting"
  | "sports_event"
  | "wedding"
  | "workshop"
  | "kids_party"
  | "romantic_dinner"
  | "casual_gathering"
  | "wellness"
  | "general";

interface IntentKeyword {
  intent: PurposeIntent;
  keywords: string[];
}

const INTENT_KEYWORDS: IntentKeyword[] = [
  { intent: "corporate_dinner", keywords: ["corporativ", "empresarial", "negocios", "gal", "gala", "cena de negocios", "corporate", "business dinner"] },
  { intent: "wedding", keywords: ["boda", "wedding", "ceremonia", "matrimonio", "novios"] },
  { intent: "party", keywords: ["fiesta", "party", "cumpleaños", "birthday", "celebración", "celebracion", "aniversario"] },
  { intent: "kids_party", keywords: ["infantil", "niños", "kids", "children", "infantil", "peques"] },
  { intent: "meeting", keywords: ["reunión", "reunion", "meeting", "junta", "consejo", "board", "directiva", "seminario"] },
  { intent: "sports_event", keywords: ["deportiv", "sport", "torneo", "tournament", "competencia", "match", "liga"] },
  { intent: "workshop", keywords: ["taller", "workshop", "capacitación", "capacitacion", "training", "seminario", "conferencia"] },
  { intent: "romantic_dinner", keywords: ["romantic", "romántic", "pareja", "couple", "san valentín", "valentine", "intimate dinner"] },
  { intent: "casual_gathering", keywords: ["casual", "social", "amigos", "friends", "familiar", "family", "reunión social", "happy hour"] },
  { intent: "wellness", keywords: ["wellness", "spa", "relajación", "relajacion", "masaje", "yoga", "meditación", "meditacion"] },
];

function classifyPurposeIntent(purpose: string): PurposeIntent {
  const lower = purpose.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const { intent, keywords } of INTENT_KEYWORDS) {
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(normalized)) {
        return intent;
      }
    }
  }

  return "general";
}

// ═══════════════════════════════════════════════════════════════
// PURPOSE AFFINITY MATRIX
//
// Maps intent → score per facility type (0-100).
// How well does each venue type serve each purpose?
// ═══════════════════════════════════════════════════════════════

const PURPOSE_AFFINITY: Record<PurposeIntent, Partial<Record<FacilityType, number>>> = {
  corporate_dinner: {
    ballroom: 95, restaurant: 85, lounge: 75, garden: 45,
    spa: 20, gym: 10, pool: 25,
  },
  wedding: {
    ballroom: 95, garden: 85, restaurant: 70, lounge: 60,
    pool: 30, gym: 5,
  },
  party: {
    ballroom: 90, garden: 80, lounge: 75, restaurant: 70,
    pool: 60, playground: 50, kids_area: 45,
  },
  kids_party: {
    kids_area: 95, playground: 90, garden: 80, pool: 65,
    ballroom: 50, restaurant: 40,
  },
  meeting: {
    lounge: 90, ballroom: 75, restaurant: 60, garden: 40,
    spa: 30,
  },
  sports_event: {
    tennis_court: 95, golf_course: 90, gym: 85, squash_court: 85,
    pool: 60, playground: 40,
  },
  workshop: {
    ballroom: 85, lounge: 80, restaurant: 60, garden: 50,
    kids_area: 40,
  },
  romantic_dinner: {
    lounge: 95, restaurant: 90, garden: 75, spa: 70,
    ballroom: 40,
  },
  casual_gathering: {
    garden: 85, lounge: 80, restaurant: 75, pool: 70,
    playground: 60, ballroom: 50,
  },
  wellness: {
    spa: 95, garden: 70, pool: 65, lounge: 50,
  },
  general: {
    // Neutral — all types score based on capacity fit only
  },
};

// ═══════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Capacity fit: how well does guest count match venue capacity?
 * Sweet spot: 40-75% of capacity (feels lively but not cramped).
 * Too empty (<20%): feels abandoned.
 * Too full (>90%): uncomfortable.
 */
function computeCapacityFit(guestCount: number, capacity: number): number {
  if (capacity <= 0) return 0;
  const pct = (guestCount / capacity) * 100;

  if (pct >= 40 && pct <= 75) return 90 + Math.round(10 * (1 - Math.abs(pct - 57.5) / 17.5));
  if (pct >= 25 && pct < 40) return 60 + Math.round(30 * ((pct - 25) / 15));
  if (pct > 75 && pct <= 90) return 70 - Math.round(30 * ((pct - 75) / 15));
  if (pct > 90) return Math.max(10, 40 - Math.round(30 * ((pct - 90) / 10)));
  if (pct < 25) return Math.max(10, 30 + Math.round(30 * (pct / 25)));

  return 30;
}

/**
 * Purpose affinity: how well does this venue type serve this purpose?
 */
function computePurposeAffinity(
  facilityType: FacilityType,
  intent: PurposeIntent,
): number {
  if (intent === "general") return 50; // neutral
  return PURPOSE_AFFINITY[intent]?.[facilityType] ?? 30;
}

/**
 * Crowd availability: how available is this venue at the preferred time?
 * Based on occupancy prediction.
 */
function computeCrowdAvailability(
  prediction: OccupancyPrediction | undefined,
  _preferredTime: string | undefined,
): number {
  if (!prediction) return 70; // no data → assume moderately available

  // If preferred time, estimate crowd at that time
  // For now, use predicted_1h as proxy
  const crowdPct = prediction.current_pct;

  // Sweet spot: 30-60% = high availability feeling
  if (crowdPct <= 30) return 95;
  if (crowdPct <= 60) return 80 - Math.round(20 * ((crowdPct - 30) / 30));
  if (crowdPct <= 80) return 60 - Math.round(30 * ((crowdPct - 60) / 20));
  return Math.max(10, 30 - Math.round(20 * ((crowdPct - 80) / 20)));
}

/**
 * Revenue potential: estimated revenue from this booking.
 */
function computeRevenuePotential(
  facility: Facility,
  guestCount: number,
  revenueModel: RevenueModel | undefined,
): number {
  if (revenueModel) {
    // Use actual revenue model
    const perEvent = revenueModel.current.revenue_per_event;
    // Scale by guest count vs average
    const avgGuests = Math.max(1, revenueModel.current.revenue_per_month / Math.max(revenueModel.current.revenue_per_event, 1));
    const guestRatio = guestCount / Math.max(avgGuests, 1);
    return Math.round(perEvent * guestRatio);
  }

  // Fallback: base_rate × (guest_count / capacity ratio)
  const capacity = Math.max(facility.capacity, 1);
  const ratio = Math.min(1.5, guestCount / capacity);
  return Math.round(facility.base_rate * ratio);
}

/**
 * Personality fit: how well does the venue's personality match the intent?
 * Based on facility-type config.
 */
function computePersonalityFit(
  facilityType: FacilityType,
  intent: PurposeIntent,
): number {
  const config = FACILITY_TYPE_CONFIG[facilityType];
  if (!config) return 50;

  // Map intents to preferred categories
  const intentCategoryPreference: Record<PurposeIntent, string[]> = {
    corporate_dinner: ["social", "service"],
    wedding: ["social"],
    party: ["social"],
    kids_party: ["service", "sport"],
    meeting: ["social", "admin"],
    sports_event: ["sport"],
    workshop: ["social", "admin"],
    romantic_dinner: ["social", "wellness"],
    casual_gathering: ["social", "wellness"],
    wellness: ["wellness"],
    general: ["social", "wellness", "sport", "service"],
  };

  const preferred = intentCategoryPreference[intent] ?? ["social"];
  if (preferred.includes(config.category)) return 80 + Math.round(Math.random() * 10);
  return 30 + Math.round(Math.random() * 20);
}

/**
 * Warnings: detect potential issues.
 */
function computeWarnings(
  facility: Facility,
  prediction: OccupancyPrediction | undefined,
  maintenanceTasks: MaintenanceTask[],
  guestCount: number,
  preferredDate?: string,
): string[] {
  const warnings: string[] = [];

  // Capacity warning
  if (guestCount > facility.capacity) {
    warnings.push(`Invitados (${guestCount}) exceden capacidad (${facility.capacity})`);
  } else if (guestCount > facility.capacity * 0.9) {
    warnings.push(`Cerca del límite de capacidad (${Math.round((guestCount / facility.capacity) * 100)}%)`);
  }

  // Crowd warning
  if (prediction && prediction.congestion_risk > 60) {
    warnings.push(`Alto riesgo de congestión (${prediction.congestion_risk}%)`);
  }

  // Maintenance conflict
  if (preferredDate) {
    const conflicts = maintenanceTasks.filter(
      (t) =>
        t.facility_id === facility.id &&
        t.scheduled_date === preferredDate &&
        t.status !== "cancelled" &&
        t.status !== "completed",
    );
    if (conflicts.length > 0) {
      warnings.push(`${conflicts.length} mantenimiento(s) programado(s) ese día`);
    }
  }

  // Facility not operational
  if (facility.status !== "operational") {
    warnings.push(`Espacio no operativo (status: ${facility.status})`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// matchVenues — MAIN FUNCTION
//
// "Given a purpose and guest count, which venue is optimal?"
//
// Returns VenueMatch[] sorted by match_score descending.
// ═══════════════════════════════════════════════════════════════

export function matchVenues(
  purpose: string,
  guestCount: number,
  facilities: Facility[],
  occupancyPredictions: Record<string, OccupancyPrediction>,
  revenueModels: Record<string, RevenueModel>,
  maintenanceTasks: MaintenanceTask[],
  preferredDate?: string,
  preferredTime?: string,
): VenueMatch[] {
  if (!purpose.trim() || guestCount <= 0) return [];

  const intent = classifyPurposeIntent(purpose);
  const operationalFacilities = facilities.filter(
    (f) => f.status === "operational" || f.status === "maintenance",
  );

  const matches: VenueMatch[] = operationalFacilities.map((facility) => {
    const prediction = occupancyPredictions[facility.id];
    const revenueModel = revenueModels[facility.id];

    const capacityFit = computeCapacityFit(guestCount, facility.capacity);
    const purposeAffinity = computePurposeAffinity(facility.facility_type, intent);
    const crowdAvailability = computeCrowdAvailability(prediction, preferredTime);
    const revenuePotential = computeRevenuePotential(facility, guestCount, revenueModel);
    const personalityFit = computePersonalityFit(facility.facility_type, intent);
    const warnings = computeWarnings(facility, prediction, maintenanceTasks, guestCount, preferredDate);
    const sensoryProfile = SENSORY_PROFILES[facility.facility_type] ?? SENSORY_PROFILES.restaurant;

    // Comfort prediction: weighted average of capacity fit and sensory match
    const comfortPrediction = Math.round(
      capacityFit * 0.4 + personalityFit * 0.3 + crowdAvailability * 0.3,
    );

    // Match score: weighted composite
    const matchScore = Math.round(
      capacityFit * 0.25 +
      purposeAffinity * 0.30 +
      crowdAvailability * 0.20 +
      personalityFit * 0.15 +
      (revenuePotential > 0 ? 10 : 0) * 0.10,
    );

    // Price estimate
    const priceEstimate = revenuePotential;

    return {
      facility_id: facility.id,
      facility_name: facility.name,
      match_score: clamp(matchScore, 0, 100),
      personality_fit: personalityFit,
      comfort_prediction: clamp(comfortPrediction, 0, 100),
      revenue_impact: revenuePotential,
      sensory_profile: sensoryProfile,
      warnings,
      price_estimate: priceEstimate,
    };
  });

  // Sort by match_score descending
  matches.sort((a, b) => b.match_score - a.match_score);

  return matches;
}

// ═══════════════════════════════════════════════════════════════
// classifyPurpose — Public helper for UI
// ═══════════════════════════════════════════════════════════════

export function classifyPurpose(purpose: string): {
  intent: PurposeIntent;
  label: string;
} {
  const intent = classifyPurposeIntent(purpose);
  const labels: Record<PurposeIntent, string> = {
    corporate_dinner: "Cena corporativa",
    party: "Fiesta / Celebración",
    meeting: "Reunión / Junta",
    sports_event: "Evento deportivo",
    wedding: "Boda / Ceremonia",
    workshop: "Taller / Capacitación",
    kids_party: "Fiesta infantil",
    romantic_dinner: "Cena romántica",
    casual_gathering: "Reunión social",
    wellness: "Bienestar / Spa",
    general: "Evento general",
  };
  return { intent, label: labels[intent] };
}