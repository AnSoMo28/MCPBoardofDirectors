// src/features/facilities/index.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES — Barrel Export
//
// Single entry point for the Facilities feature.
// Every consumer imports from here — never from internal paths.
//
// Sections:
//   1. Hooks (data + intelligence + advisor)
//   2. Main Dashboard
//   3. Infrastructure UI
//   4. Signature Innovations
//   5. V2 Rewrites (add as completed)
//   6. Types (re-export for external consumers)
//   7. Config (re-export for external consumers)
//   8. Advisor integration
// ═══════════════════════════════════════════════════════════════

// ═══ §1: HOOKS ════════════════════════════════════════════════

export { useFacilitiesData } from "./hooks/useFacilitiesData";
export type { UseFacilitiesDataReturn } from "./hooks/useFacilitiesData";

export { useFacilitiesDashboard } from "./hooks/useFacilitiesDashboard";

export { useFacilitiesAdvisor } from "./hooks/useFacilitiesAdvisor";
export type {
  FacilitiesAdvisorInput,
  FacilitiesAdvisorOutput,
} from "./hooks/useFacilitiesAdvisor";

// ═══ §2: MAIN DASHBOARD ══════════════════════════════════════

export { FacilitiesDashboard } from "./FacilitiesDashboard";

// ═══ §3: INFRASTRUCTURE UI ═══════════════════════════════════

export { FacilityAmbientCanvas } from "./components/FacilityAmbientCanvas";
export { FacilityPulse } from "./components/FacilityPulse";
export { FacilityDecisionStage } from "./components/FacilityDecisionStage";
export type { StageMode } from "./components/FacilityDecisionStage";
export { FacilityIntelligenceStream } from "./components/FacilityIntelligenceStream";

// ═══ §4: SIGNATURE INNOVATIONS ═══════════════════════════════

export { SpatialGraphView } from "./components/SpatialGraphView";
export { FacilityPersonalityRadar } from "./components/FacilityPersonalityRadar";
export { OccupancyField } from "./components/OccupancyField";
export { MaintenanceOracle } from "./components/MaintenanceOracle";
export { WhatIfPlannerPanel } from "./components/WhatIfPlannerPanel";
export { SpatialStoryView } from "./components/SpatialStoryView";
export { MemoryJournalView } from "./components/MemoryJournalView";

// ═══ §5: V2 REWRITES ═════════════════════════════════════════
// Uncomment as each rewrite is completed:
//
// export { AmenityHeatmap } from "./components/AmenityHeatmap";
// export { BookingFormModal } from "./components/BookingFormModal";
// export { EventSetupPanel } from "./components/EventSetupPanel";
// export { FacilitiesAdvisorBanner } from "./components/FacilitiesAdvisorBanner";
// export { FacilitiesHealthScore } from "./components/FacilitiesHealthScore";
// export { FacilityBookingPanel } from "./components/FacilityBookingPanel";
// export { FacilityDetail } from "./components/FacilityDetail";
// export { FacilityMap } from "./components/FacilityMap";
// export { InspectionPanel } from "./components/InspectionPanel";
// export { LiveOccupancyBoard } from "./components/LiveOccupancyBoard";
// export { MaintenanceCalendar } from "./components/MaintenanceCalendar";
// export { MaintenanceScoring } from "./components/MaintenanceScoring";
// export { ReservationCalendar } from "./components/ReservationCalendar";
// export { SpaceROICalculator } from "./components/SpaceROICalculator";

// ═══ §6: TYPES ════════════════════════════════════════════════
// Re-export commonly used types for external consumers.

export type {
  // Core domain
  Facility,
  FacilityType,
  FacilityStatus,
  FacilityReservation,
  MaintenanceTask,
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
  Inspection,
  EventSetup,
  AmenityUtilizationItem,

  // Intelligence
  SpatialGraph,
  SpatialNode,
  SpatialEdge,
  FacilityPersonality,
  ComfortScore,
  DeteriorationModel,
  DeteriorationComponent,
  OccupancyPrediction,
  RevenueModel,
  WhatIfScenario,
  FacilityMemory,
  FacilityNarrative,
  NarrativeChapter,
  EventRipple,
  ResonancePattern,
  TemporalGraphFrame,
  CrossDomainSignal,

  // System
  FacilitiesDashboardMode,
  FacilitiesAmbientState,
  FacilitiesAdvisorInsight,
  MaintenancePrediction,
  MaintenancePriorityAction,

  // Dashboard return
  FacilitiesDashboardReturn,
} from "./types";

// ═══ §7: CONFIG ═══════════════════════════════════════════════

export {
  FACILITIES_MCP_SERVER,
  FACILITIES_MCP_TOOLS,
  FACILITIES_FRESHNESS_TIERS,
  FACILITIES_DASHBOARD_THRESHOLDS,
  FACILITIES_ADVISOR_THRESHOLDS,
} from "./config";

// ═══ §8: ADVISOR INTEGRATION ══════════════════════════════════

export { FACILITIES_ADVISOR_CONFIG } from "./lib/advisor/facilitiesAdvisorConfig";
export { buildFacilitiesCtx } from "./lib/advisor/facilitiesContext";