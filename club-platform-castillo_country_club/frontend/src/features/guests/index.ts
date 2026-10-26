// ═══════════════════════════════════════════════════════════
// src/features/guests/index.ts
// Phase 34 "The Gateway" — Barrel
// Level 6+ Agency · Production Grade
//
// Public API surface for the Guest Intelligence feature.
//
// Export strategy:
//   - Types: type-only re-exports (verbatimModuleSyntax safe)
//   - Constants: value re-exports from ./types
//   - Pages: default → named (router uses direct lazy imports)
//   - Components: re-export verified signatures only
//   - Hooks: re-export public hooks
//
// NOT exported (internal):
//   ./lib/*, ./advisor/*, ./config, ./constants, ./schemas
//   Components with unverified export signatures
// ═══════════════════════════════════════════════════════════

// ── Types ──
export type {
  GuestCheckInForm,
  GuestRegistryItem,
  TrialMembershipItem,
  PrivateEventItem,
  GuestDashboardMode,
  GuestPipelineStage,
  GuestManagementInsight,
} from "./types";

// ── Constants / Config (values) ──
export {
  RELATIONSHIP_OPTIONS,
  GUEST_PURPOSE_OPTIONS,
  GUEST_REGISTRY_STATUS_CONFIG,
  PRIVILEGE_CONFIG,
  TRIAL_TYPE_CONFIG,
  TRIAL_STATUS_CONFIG_BACKEND,
  PRIVATE_EVENT_TYPE_CONFIG,
  PRIVATE_EVENT_STATUS_CONFIG,
  EVENT_PIPELINE_STEPS,
} from "./types";

// ── Pages (default → named) ──
export { default as GuestManagementDashboard } from "./GuestManagementDashboard";
export { default as GuestRegistration } from "./GuestRegistration";
export { default as GuestList } from "./GuestList";

// ── Dashboard Components (named exports) ──
export { GuestHealthScoreCard } from "./components/GuestHealthScoreCard";
export { ConversionFunnelViz } from "./components/ConversionFunnelViz";
export { PipelinePredictorCard } from "./components/PipelinePredictorCard";
export { GuestAdvisorBanner } from "./components/GuestAdvisorBanner";
export { GuestIntelligencePanel } from "./components/GuestIntelligencePanel";

// ── Concierge Layers (named exports) ──
export { GuestAmbientCanvas } from "./components/GuestAmbientCanvas";
export { GuestConciergeVoice } from "./components/GuestConciergeVoice";
export { GuestPipelineRiver } from "./components/GuestPipelineRiver";
export { GuestMemoryStarMap } from "./components/GuestMemoryStarMap";
export { GuestAskBar } from "./components/GuestAskBar";

// ── Tab Panel Components (default → named) ──
export { default as GuestAnalytics } from "./components/GuestAnalytics";
export { default as GuestRegistry } from "./components/GuestRegistry";
export { default as PrivateEventPlanner } from "./components/PrivateEventPlanner";
export { default as TrialMembershipManager } from "./components/TrialMembershipManager";

// ── Hooks ──
export { useGuestDashboard } from "./hooks/useGuestDashboard";
export { useGuestAdvisor } from "./hooks/useGuestAdvisor";
export { useGuestData } from "./hooks/useGuestData";