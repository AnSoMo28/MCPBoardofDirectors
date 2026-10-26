// src/features/facilities/lib/optimalScheduling.ts
// ═══════════════════════════════════════════════════════════════
// OPTIMAL SCHEDULING ENGINE — "Time Intelligence"
//
// "When is the best time to book this facility?"
//
// Given a facility + date + guest count, finds the 3 best
// time slots based on:
//   - Crowd prediction (lower is better for comfort)
//   - Existing reservations (avoid double-booking)
//   - Maintenance conflicts
//   - Revenue optimization (higher-value time slots)
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityReservation,
  OccupancyPrediction,
  MaintenanceTask,
  OptimalSlot,
  MaintenanceConflict
} from "../types";

import { classifyCrowdLevel } from "../types";
// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseHour(time: string): number {
  return parseInt(time.split(":")[0], 10);
}

// ═══════════════════════════════════════════════════════════════
// DETECT MAINTENANCE CONFLICTS
//
// Checks if a facility has maintenance scheduled on a given date.
// ═══════════════════════════════════════════════════════════════

export function detectMaintenanceConflict(
  facilityId: string,
  date: string,
  maintenanceTasks: MaintenanceTask[],
  _allReservations?: FacilityReservation[],
): MaintenanceConflict {
  const conflicts = maintenanceTasks.filter(
    (t) =>
      t.facility_id === facilityId &&
      t.scheduled_date === date &&
      t.status !== "cancelled" &&
      t.status !== "completed",
  );

  if (conflicts.length === 0) {
    return {
      has_conflict: false,
      task_count: 0,
      task_descriptions: [],
      earliest_available_date: date,
    };
  }

  // Find earliest available date (next day without maintenance)
  const facilityTasks = maintenanceTasks.filter(
    (t) =>
      t.facility_id === facilityId &&
      t.status !== "cancelled" &&
      t.status !== "completed",
  );
  const busyDates = new Set(facilityTasks.map((t) => t.scheduled_date));

  let candidate = new Date(date);
  candidate.setDate(candidate.getDate() + 1);
  let attempts = 0;
  while (attempts < 30) {
    const candidateStr = candidate.toISOString().split("T")[0];
    if (!busyDates.has(candidateStr)) {
      return {
        has_conflict: true,
        task_count: conflicts.length,
        task_descriptions: conflicts.map(
          (t) => `${t.maintenance_type}: ${t.description} (${t.scheduled_time})`,
        ),
        earliest_available_date: candidateStr,
      };
    }
    candidate.setDate(candidate.getDate() + 1);
    attempts++;
  }

  return {
    has_conflict: true,
    task_count: conflicts.length,
    task_descriptions: conflicts.map(
      (t) => `${t.maintenance_type}: ${t.description}`,
    ),
    earliest_available_date: "No disponible en los próximos 30 días",
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE SLOT CROWD
//
// Estimates crowd at a specific time slot based on:
//   - Base occupancy prediction for this facility
//   - Existing reservations that overlap this time slot
//   - Time-of-day patterns
// ═══════════════════════════════════════════════════════════════

function computeSlotCrowd(
  facility: Facility,
  startTime: string,
  endTime: string,
  date: string,
  reservations: FacilityReservation[],
  prediction: OccupancyPrediction | undefined,
): number {
  const startH = parseHour(startTime);
  const endH = parseHour(endTime);
  const capacity = Math.max(facility.capacity, 1);

  // Count guests from overlapping reservations
  const overlapping = reservations.filter(
    (r) =>
      r.facility_id === facility.id &&
      r.date === date &&
      (r.status === "confirmed" || r.status === "pending") &&
      parseHour(r.start_time) < endH &&
      parseHour(r.end_time) > startH,
  );
  const reservedGuests = overlapping.reduce((s, r) => s + r.guest_count, 0);
  const reservedPct = (reservedGuests / capacity) * 100;

  // Base prediction (use predicted_1h as baseline)
  const basePct = prediction?.current_pct ?? 30;

  // Combine: take the higher of base and reserved
  const estimatedPct = Math.max(basePct, reservedPct);

  return clamp(Math.round(estimatedPct), 0, 150);
}

/**
 * Compute revenue delta for a time slot vs average.
 * Evening and weekend slots tend to have higher revenue.
 */
function computeRevenueDelta(
  startHour: number,
  date: string,
  facility: Facility,
): number {
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let multiplier = 1.0;

  // Time-of-day premium
  if (startHour >= 18 && startHour <= 21) multiplier += 0.2; // evening premium
  if (startHour >= 11 && startHour <= 14) multiplier += 0.1; // lunch premium
  if (startHour < 8 || startHour > 22) multiplier -= 0.15;  // off-hours discount

  // Weekend premium
  if (isWeekend) multiplier += 0.15;

  const avgRevenue = facility.base_rate;
  const slotRevenue = Math.round(avgRevenue * multiplier);

  return slotRevenue - avgRevenue;
}

// ═══════════════════════════════════════════════════════════════
// FIND OPTIMAL SLOTS — MAIN FUNCTION
//
// "When is the best time to book this facility?"
//
// Returns top 3 optimal time slots sorted by desirability.
// ═══════════════════════════════════════════════════════════════

export function findOptimalSlots(
  facility: Facility,
  date: string,
  _guestCount: number,
  reservations: FacilityReservation[],
  maintenanceTasks: MaintenanceTask[],
  prediction: OccupancyPrediction | undefined,
  slotDurationHours?: number,
): OptimalSlot[] {
  const duration = slotDurationHours ?? 2;
  const openH = parseHour(facility.opening_time);
  const closeH = parseHour(facility.closing_time);

  // Check maintenance conflict first
  const conflict = detectMaintenanceConflict(
    facility.id,
    date,
    maintenanceTasks,
  );
  if (conflict.has_conflict) {
    // Facility has maintenance — return empty with a note
    return [];
  }

  // Generate candidate slots
  const slots: OptimalSlot[] = [];

  for (let startH = openH; startH + duration <= closeH; startH++) {
    const startTime = `${String(startH).padStart(2, "0")}:00`;
    const endTime = `${String(startH + duration).padStart(2, "0")}:00`;

    const crowdPct = computeSlotCrowd(
      facility,
      startTime,
      endTime,
      date,
      reservations,
      prediction,
    );
    const crowdLevel = classifyCrowdLevel(crowdPct);
    const revenueDelta = computeRevenueDelta(startH, date, facility);

    // Desirability score (lower crowd = better, higher revenue delta = better)
    // Weight: 60% comfort (inverse crowd) + 40% revenue
    const comfortScore = Math.max(0, 100 - crowdPct);
    const revenueScore = clamp(50 + revenueDelta / 100, 0, 100);
    // Build reason
    let reason = "";
    if (crowdPct < 30) reason = `${startTime}: baja ocupación (${crowdPct}%)`;
    else if (crowdPct < 60) reason = `${startTime}: ocupación moderada (${crowdPct}%)`;
    else reason = `${startTime}: alta ocupación (${crowdPct}%)`;

    if (revenueDelta > 0) reason += `, +₡${Math.abs(revenueDelta).toLocaleString("es-CR")} vs promedio`;
    else if (revenueDelta < 0) reason += `, -₡${Math.abs(revenueDelta).toLocaleString("es-CR")} vs promedio`;

    slots.push({
      facility_id: facility.id,
      facility_name: facility.name,
      date,
      start_time: startTime,
      end_time: endTime,
      crowd_pct: crowdPct,
      crowd_level: crowdLevel,
      revenue_delta: revenueDelta,
      reason,
      is_recommended: false,
    });
  }

  // Sort by desirability descending
  slots.sort((a, b) => {
    const aScore = (100 - a.crowd_pct) * 0.6 + (50 + a.revenue_delta / 100) * 0.4;
    const bScore = (100 - b.crowd_pct) * 0.6 + (50 + b.revenue_delta / 100) * 0.4;
    return bScore - aScore;
  });

  // Take top 3
  const top3 = slots.slice(0, 3);

  // Mark the best as recommended
  if (top3.length > 0) {
    top3[0].is_recommended = true;
  }

  return top3;
}

// ═══════════════════════════════════════════════════════════════
// BATCH: findOptimalSlotsForAll
//
// Returns optimal slots for all operational facilities.
// Used for pre-computation when modal opens.
// ═══════════════════════════════════════════════════════════════

export function findOptimalSlotsForAll(
  facilities: Facility[],
  date: string,
  guestCount: number,
  reservations: FacilityReservation[],
  maintenanceTasks: MaintenanceTask[],
  occupancyPredictions: Record<string, OccupancyPrediction>,
): Record<string, OptimalSlot[]> {
  const result: Record<string, OptimalSlot[]> = {};

  for (const facility of facilities) {
    if (facility.status !== "operational") continue;

    result[facility.id] = findOptimalSlots(
      facility,
      date,
      guestCount,
      reservations,
      maintenanceTasks,
      occupancyPredictions[facility.id],
    );
  }

  return result;
}