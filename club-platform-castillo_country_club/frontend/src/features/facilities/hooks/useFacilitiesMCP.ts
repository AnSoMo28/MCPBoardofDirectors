// src/features/facilities/hooks/useFacilitiesMCP.ts
// ═══════════════════════════════════════════════════════════
// FACILITY MANAGEMENT — Typed MCP Hooks (F33)
// ═══════════════════════════════════════════════════════════

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import type {
  ManageFacilities_Contract,
  GetFacilityOccupancy_Contract,
  GetMaintenanceSchedule_Contract,
  ManageInspections_Contract,
  GetFacilityReservations_Contract,
  GetFacilityAnalytics_Contract,
  GetAmenityUtilization_Contract,
  GetSpaceOptimization_Contract,
  GetFacilityHealth_Contract,
  ScheduleMaintenance_Contract,
  CreateFacilityReservation_Contract,
  ReportFacilityIssue_Contract,
  CoordinateEventSetup_Contract,
} from "@/shared/mocks/contracts";

const SERVER = "facility_management" as const;

// ── Data hooks (useMCPQuery) ─────────────────────────────────────────────────

export function useFacilities(options?: { enabled?: boolean }) {
  return useMCPQuery<ManageFacilities_Contract>(
    SERVER, "manage_facilities", { action: "list" },
    { enabled: options?.enabled ?? true, staleTime: 120_000 },
  );
}

export function useFacility(facilityId: string, options?: { enabled?: boolean }) {
  return useMCPQuery<ManageFacilities_Contract>(
    SERVER, "manage_facilities", { action: "get", facility_id: facilityId },
    { enabled: (options?.enabled ?? true) && !!facilityId, staleTime: 120_000 },
  );
}

export function useFacilityOccupancy(options?: { enabled?: boolean }) {
  return useMCPQuery<GetFacilityOccupancy_Contract>(
    SERVER, "get_facility_occupancy", {},
    { enabled: options?.enabled ?? true, staleTime: 60_000 },
  );
}

export function useMaintenanceSchedule(params?: { facility_id?: string; status?: string }, options?: { enabled?: boolean }) {
  return useMCPQuery<GetMaintenanceSchedule_Contract>(
    SERVER, "get_maintenance_schedule", params ?? {},
    { enabled: options?.enabled ?? true, staleTime: 60_000 },
  );
}

export function useInspections(params?: { facility_id?: string }, options?: { enabled?: boolean }) {
  return useMCPQuery<ManageInspections_Contract>(
    SERVER, "manage_inspections", { action: "list", ...(params ?? {}) },
    { enabled: options?.enabled ?? true, staleTime: 120_000 },
  );
}

export function useFacilityReservations(params?: { facility_id?: string; date_from?: string; date_to?: string }, options?: { enabled?: boolean }) {
  return useMCPQuery<GetFacilityReservations_Contract>(
    SERVER, "get_facility_reservations", params ?? {},
    { enabled: options?.enabled ?? true, staleTime: 30_000 },
  );
}

export function useFacilityAnalytics(options?: { enabled?: boolean }) {
  return useMCPQuery<GetFacilityAnalytics_Contract>(
    SERVER, "get_facility_analytics", {},
    { enabled: options?.enabled ?? false, staleTime: 300_000 },
  );
}

export function useAmenityUtilization(options?: { enabled?: boolean }) {
  return useMCPQuery<GetAmenityUtilization_Contract>(
    SERVER, "get_amenity_utilization", {},
    { enabled: options?.enabled ?? false, staleTime: 60_000 },
  );
}

export function useSpaceOptimization(options?: { enabled?: boolean }) {
  return useMCPQuery<GetSpaceOptimization_Contract>(
    SERVER, "get_space_optimization", {},
    { enabled: options?.enabled ?? false, staleTime: 300_000 },
  );
}

export function useFacilityHealth(options?: { enabled?: boolean }) {
  return useMCPQuery<GetFacilityHealth_Contract>(
    SERVER, "get_facility_health", {},
    { enabled: options?.enabled ?? true, staleTime: 120_000 },
  );
}

// ── Action hooks (useMCPMutation) ────────────────────────────────────────────

export function useScheduleMaintenance() {
  return useMCPMutation<ScheduleMaintenance_Contract>(SERVER, "schedule_maintenance");
}

export function useCreateFacilityReservation() {
  return useMCPMutation<CreateFacilityReservation_Contract>(SERVER, "create_facility_reservation");
}

export function useReportFacilityIssue() {
  return useMCPMutation<ReportFacilityIssue_Contract>(SERVER, "report_facility_issue");
}

export function useCoordinateEventSetup() {
  return useMCPMutation<CoordinateEventSetup_Contract>(SERVER, "coordinate_event_setup");
}
