/**
 * Member360 — The Portrait Room
 * Phase 30 — Feature barrel export
 */

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════

export { default as Member360Dashboard } from "./Member360Dashboard";

// ═══════════════════════════════════════════════════════
// TYPES — for external consumers
// ═══════════════════════════════════════════════════════

export type {
  // Core member types
  MemberState,
  MemberTemperature,
  DashboardMode,
  VitalSign,
  DomainSignal,
  SignalResonance,
  EngagementDNAChannel,
  PredictiveWindow,

  // Narrative & Advisor
  MemberNarrative,
  Member360AdvisorInsight,

  // Journey
  JourneyMilestone,
  ActivityDomain,
} from "./types";

export type { PortraitRingProps } from "./lib/memberSignals";

export {
  // Display maps (used by external features)
  MEMBER_STATE_DISPLAY,
  ACTIVITY_DOMAIN_DISPLAY,
  VITAL_SIGN_DISPLAY,

  // Utility functions
  temperatureToState,
  temperatureToZone,
  getDomainColor,
  getDomainLabel,
  getDomainIcon,
} from "./types";

// ═══════════════════════════════════════════════════════
// HOOKS — for external consumers
// ═══════════════════════════════════════════════════════

export { useMember360Dashboard } from "./hooks/useMember360Dashboard";
export { useMember360Data } from "./hooks/useMember360Data";

// ═══════════════════════════════════════════════════════
// COMPONENTS — individual exports for advanced use
// ═══════════════════════════════════════════════════════

// Signature innovations (Bloque 3)
export { MemberPortrait } from "./components/MemberPortrait";
export { MemberTimeline } from "./components/MemberTimeline";
export { MemberRiskObservatory } from "./components/MemberRiskObservatory";
export { MemberCrossDomain } from "./components/MemberCrossDomain";
export { MemberLTVProphet } from "./components/MemberLTVProphet";
export { MemberEngagementDNA } from "./components/MemberEngagementDNA";
export { MemberChurnOracle } from "./components/MemberChurnOracle";
export { MemberSocialConstellation } from "./components/MemberSocialConstellation";

// Rewritten components (Bloque 4)
export { MemberIdentityCard } from "./components/MemberIdentityCard";
export { Member360HealthScore } from "./components/Member360HealthScore";
export { Member360AdvisorBanner } from "./components/Member360AdvisorBanner";
export { MemberJourneyTimeline } from "./components/MemberJourneyTimeline";
export { MemberFinancialSummary } from "./components/MemberFinancialSummary";
export { MemberEngagementProfile } from "./components/MemberEngagementProfile";
export { MemberSocialProfile } from "./components/MemberSocialProfile";
export { MemberRiskRadar } from "./components/MemberRiskRadar";
export { Member360IntelligencePanel } from "./components/Member360IntelligencePanel";
export { MemberEngagementMotor } from "./components/MemberEngagementMotor";

// Support components (Bloque 2)
export { MemberAmbientCanvas } from "./components/MemberAmbientCanvas";
export { MemberIntelligenceStream } from "./components/MemberIntelligenceStream";
export { MemberDecisionStage } from "./components/MemberDecisionStage";