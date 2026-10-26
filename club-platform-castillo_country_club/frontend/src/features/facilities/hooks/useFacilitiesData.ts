// src/features/facilities/hooks/useFacilitiesData.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES DATA ORCHESTRATOR — Hook 1 of Two-Hook Pattern
//
// Manages all MCP queries with proper freshness tiers.
// Replaces useFacilitiesMCP.ts V1 with a single orchestrated hook.
//
// Each query maps to a tier from FACILITIES_FRESHNESS_TIERS:
//   LIVE (30s)            → reservations
//   NEAR_REAL_TIME (60s)  → occupancy, maintenance, utilization
//   DASHBOARD (120s)      → facilities, inspections, health
//   ENTITIES (300s)       → analytics, optimization
//
// Returns: flat object with all data + loading states + refetchAll.
// Zero computation — pure data fetching.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useMemo } from "react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";

import {
  FACILITIES_MCP_SERVER,
  FACILITIES_MCP_TOOLS,
  FACILITIES_FRESHNESS_TIERS,
} from "../config";

import type {
  Facility,
  FacilityReservation,
  MaintenanceTask,
  Inspection,
  FacilityAnalyticsResponse,
  AmenityUtilizationResponse,
  SpaceOptimizationResponse,
  FacilityHealthResponse,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// CONTRACT TYPES — from shared/mocks/contracts
// Mirrors the V1 import structure for MCP contract alignment.
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// SERVER CONSTANT
// ═══════════════════════════════════════════════════════════════

const SERVER = FACILITIES_MCP_SERVER;

// ═══════════════════════════════════════════════════════════════
// RETURN TYPE
// ═══════════════════════════════════════════════════════════════

export interface UseFacilitiesDataReturn {
  // ── Raw data ──
  facilities: Facility[];
  reservations: FacilityReservation[];
  maintenanceTasks: MaintenanceTask[];
  inspections: Inspection[];
  analytics: FacilityAnalyticsResponse | null;
  amenityUtilization: AmenityUtilizationResponse | null;
  spaceOptimization: SpaceOptimizationResponse | null;
  healthResponse: FacilityHealthResponse | null;

  // ── Loading states ──
  isLoading: boolean;
  isReady: boolean;
  error: string | null;

  // ── Individual loading (for progressive rendering) ──
  isFacilitiesLoading: boolean;
  isReservationsLoading: boolean;
  isMaintenanceLoading: boolean;
  isHealthLoading: boolean;
  isAnalyticsLoading: boolean;
  isUtilizationLoading: boolean;
  isOptimizationLoading: boolean;

  // ── Actions ──
  refetchAll: () => void;

  // ── Mutations ──
  scheduleMaintenance: (params: Record<string, unknown>) => Promise<unknown>;
  createReservation: (params: Record<string, unknown>) => Promise<unknown>;
  reportIssue: (params: Record<string, unknown>) => Promise<unknown>;
  coordinateEventSetup: (params: Record<string, unknown>) => Promise<unknown>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export function useFacilitiesData(options?: {
  enabled?: boolean;
  /** Enable analytics query (expensive, only when intelligence tab active). */
  analyticsEnabled?: boolean;
  /** Enable optimization query (expensive). */
  optimizationEnabled?: boolean;
  /** Enable utilization query. */
  utilizationEnabled?: boolean;
}): UseFacilitiesDataReturn {
  const enabled = options?.enabled ?? true;
  const analyticsEnabled = options?.analyticsEnabled ?? false;
  const optimizationEnabled = options?.optimizationEnabled ?? false;
  const utilizationEnabled = options?.utilizationEnabled ?? true;

  // ═══ QUERIES — DASHBOARD TIER (120s) ═══════════════════════

  const facilitiesQuery = useMCPQuery<ManageFacilities_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.MANAGE_FACILITIES,
    { action: "list" },
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
    },
  );

  const healthQuery = useMCPQuery<GetFacilityHealth_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_FACILITY_HEALTH,
    {},
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
    },
  );

  const inspectionsQuery = useMCPQuery<ManageInspections_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.MANAGE_INSPECTIONS,
    { action: "list" },
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
    },
  );

  // ═══ QUERIES — NEAR REAL-TIME TIER (60s) ═══════════════════

  const occupancyQuery = useMCPQuery<GetFacilityOccupancy_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_FACILITY_OCCUPANCY,
    {},
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
    },
  );

  const maintenanceQuery = useMCPQuery<GetMaintenanceSchedule_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_MAINTENANCE_SCHEDULE,
    {},
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
    },
  );

  const utilizationQuery = useMCPQuery<GetAmenityUtilization_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_AMENITY_UTILIZATION,
    {},
    {
      enabled: enabled && utilizationEnabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
    },
  );

  // ═══ QUERIES — LIVE TIER (30s) ═════════════════════════════

  const reservationsQuery = useMCPQuery<GetFacilityReservations_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_FACILITY_RESERVATIONS,
    {},
    {
      enabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.LIVE,
    },
  );

  // ═══ QUERIES — ENTITIES TIER (300s, on-demand) ═════════════

  const analyticsQuery = useMCPQuery<GetFacilityAnalytics_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_FACILITY_ANALYTICS,
    {},
    {
      enabled: enabled && analyticsEnabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.ENTITIES,
    },
  );

  const optimizationQuery = useMCPQuery<GetSpaceOptimization_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.GET_SPACE_OPTIMIZATION,
    {},
    {
      enabled: enabled && optimizationEnabled,
      staleTime: FACILITIES_FRESHNESS_TIERS.ENTITIES,
    },
  );

  // ═══ MUTATIONS ══════════════════════════════════════════════

  const scheduleMaintMutation = useMCPMutation<ScheduleMaintenance_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.SCHEDULE_MAINTENANCE,
  );

  const createReservationMutation = useMCPMutation<CreateFacilityReservation_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.CREATE_FACILITY_RESERVATION,
  );

  const reportIssueMutation = useMCPMutation<ReportFacilityIssue_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.REPORT_FACILITY_ISSUE,
  );

  const coordinateSetupMutation = useMCPMutation<CoordinateEventSetup_Contract>(
    SERVER,
    FACILITIES_MCP_TOOLS.COORDINATE_EVENT_SETUP,
  );

  // ═══ EXTRACT DATA ═══════════════════════════════════════════

  const facilities: Facility[] = useMemo(
    () => ((facilitiesQuery.data as ManageFacilities_Contract | undefined)?.facilities as Facility[]) ?? [],
    [facilitiesQuery.data],
  );

  const reservations: FacilityReservation[] = useMemo(
    () => ((reservationsQuery.data as GetFacilityReservations_Contract | undefined)?.reservations as FacilityReservation[]) ?? [],
    [reservationsQuery.data],
  );

  const maintenanceTasks: MaintenanceTask[] = useMemo(
    () => ((maintenanceQuery.data as GetMaintenanceSchedule_Contract | undefined)?.schedule as MaintenanceTask[]) ?? [],
    [maintenanceQuery.data],
  );

  const inspections: Inspection[] = useMemo(
    () => ((inspectionsQuery.data as ManageInspections_Contract | undefined)?.inspections as Inspection[]) ?? [],
    [inspectionsQuery.data],
  );

  const analytics = (analyticsQuery.data as GetFacilityAnalytics_Contract | undefined) ?? null;
  const amenityUtilization = (utilizationQuery.data as GetAmenityUtilization_Contract | undefined) ?? null;
  const spaceOptimization = (optimizationQuery.data as GetSpaceOptimization_Contract | undefined) ?? null;
  const healthResponse = (healthQuery.data as GetFacilityHealth_Contract | undefined) ?? null;

  // ═══ LOADING STATES ═════════════════════════════════════════

  const isFacilitiesLoading = facilitiesQuery.isLoading;
  const isReservationsLoading = reservationsQuery.isLoading;
  const isMaintenanceLoading = maintenanceQuery.isLoading;
  const isHealthLoading = healthQuery.isLoading;
  const isAnalyticsLoading = analyticsQuery.isLoading;
  const isUtilizationLoading = utilizationQuery.isLoading;
  const isOptimizationLoading = optimizationQuery.isLoading;

  const isLoading = isFacilitiesLoading || isHealthLoading;

  const isReady =
    !isLoading &&
    facilities.length > 0;

  const error =
    (facilitiesQuery.error as Error)?.message ??
    (healthQuery.error as Error)?.message ??
    null;

  // ═══ REFETCH ALL ════════════════════════════════════════════

  const refetchAll = useCallback(() => {
    facilitiesQuery.refetch();
    healthQuery.refetch();
    occupancyQuery.refetch();
    maintenanceQuery.refetch();
    reservationsQuery.refetch();
    inspectionsQuery.refetch();
    if (analyticsEnabled) analyticsQuery.refetch();
    if (utilizationEnabled) utilizationQuery.refetch();
    if (optimizationEnabled) optimizationQuery.refetch();
  }, [
    facilitiesQuery,
    healthQuery,
    occupancyQuery,
    maintenanceQuery,
    reservationsQuery,
    inspectionsQuery,
    analyticsQuery,
    utilizationQuery,
    optimizationQuery,
    analyticsEnabled,
    utilizationEnabled,
    optimizationEnabled,
  ]);

  // ═══ MUTATION WRAPPERS ══════════════════════════════════════

  const scheduleMaintenance = useCallback(
    async (params: Record<string, unknown>) => {
      const result = await scheduleMaintMutation.mutateAsync(params);
      maintenanceQuery.refetch();
      return result;
    },
    [scheduleMaintMutation, maintenanceQuery],
  );

  const createReservation = useCallback(
    async (params: Record<string, unknown>) => {
      const result = await createReservationMutation.mutateAsync(params);
      reservationsQuery.refetch();
      return result;
    },
    [createReservationMutation, reservationsQuery],
  );

  const reportIssue = useCallback(
    async (params: Record<string, unknown>) => {
      const result = await reportIssueMutation.mutateAsync(params);
      maintenanceQuery.refetch();
      return result;
    },
    [reportIssueMutation, maintenanceQuery],
  );

  const coordinateEventSetup = useCallback(
    async (params: Record<string, unknown>) => {
      const result = await coordinateSetupMutation.mutateAsync(params);
      return result;
    },
    [coordinateSetupMutation],
  );

  return {
    facilities,
    reservations,
    maintenanceTasks,
    inspections,
    analytics: (analytics as unknown as FacilityAnalyticsResponse) ?? null,
    amenityUtilization: (amenityUtilization as unknown as AmenityUtilizationResponse) ?? null,
    spaceOptimization: (spaceOptimization as unknown as SpaceOptimizationResponse) ?? null,
    healthResponse: (healthResponse as unknown as FacilityHealthResponse) ?? null,

    isLoading,
    isReady,
    error,

    isFacilitiesLoading,
    isReservationsLoading,
    isMaintenanceLoading,
    isHealthLoading,
    isAnalyticsLoading,
    isUtilizationLoading,
    isOptimizationLoading,

    refetchAll,

    scheduleMaintenance,
    createReservation,
    reportIssue,
    coordinateEventSetup,
  };
}