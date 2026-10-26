// src/features/sports/index.ts
// ═══════════════════════════════════════════════════════════════
// SPORTS & RECREATION — Barrel Export
// "The Arena" · Phase 33 · Level 5+ Agency
//
// Single entry point for the Sports feature.
// Every consumer imports from here — never from internal paths.
//
// Sections:
//   1. Hooks
//   2. Main Dashboard
//   3. Dashboard Infrastructure
//   4. Stage Content Components
//   5. Data Display & Forms
//   6. Types
//   7. Config
//   8. Advisor Integration
//
// @version 2.0.0
// @phase   33 — "The Arena"
// ═══════════════════════════════════════════════════════════════

// ═══ §1: HOOKS ════════════════════════════════════════════════

export { useSportsDashboard } from "./hooks/useSportsDashboard";
export { useSportsData } from "./hooks/useSportsData";
export { useSportsAdvisor } from "./hooks/useSportsAdvisor";

// ═══ §2: MAIN DASHBOARD ══════════════════════════════════════

export { SportsDashboard } from "./SportsDashboard";

// ═══ §3: DASHBOARD INFRASTRUCTURE ════════════════════════════

export { SportsPulse } from "./components/SportsPulse";
export { SportsAmbientCanvas } from "./components/SportsAmbientCanvas";
export { BriefingOverlay } from "./components/BriefingOverlay";
export { HeroInsight } from "./components/HeroInsight";
export { SportsDecisionStage } from "./components/SportsDecisionStage";
export { SportsIntelligenceStream } from "./components/SportsIntelligenceStream";

// ═══ §4: STAGE CONTENT COMPONENTS ════════════════════════════
// Components used INSIDE SportsDecisionStage for each of the 5 lenses.
// Exported here so external consumers can use them independently.

// La Arena — courts, live grid, heatmaps
export { LiveArenaGrid } from "./components/LiveArenaGrid";
export { CourtHeatmap } from "./components/CourtHeatmap";
export { AthleticRadar } from "./components/AthleticRadar";
export { WeatherOracle } from "./components/WeatherOracle";

// La Trayectoria — skills, coaching, progression
export { SkillProgression } from "./components/SkillProgression";
export { CoachingCanvas } from "./components/CoachingCanvas";
export { CoachingPanel } from "./components/CoachingPanel";

// La Competencia — tournaments, leagues, brackets
export { BracketView } from "./components/BracketView";
export { TournamentPanel } from "./components/TournamentPanel";
export { LeaguePanel } from "./components/LeaguePanel";
export { SeasonNarrative } from "./components/SeasonNarrative";

// El Equipo — social dynamics
export { SocialSportMap } from "./components/SocialSportMap";

// El Negocio — equipment, classes, bookings, finance
export { EquipmentPanel } from "./components/EquipmentPanel";
export { ClassesPanel } from "./components/ClassesPanel";
export { CourtBookingPanel } from "./components/CourtBookingPanel";

// ═══ §5: DATA DISPLAY & FORMS ════════════════════════════════

export { SportsCalendar } from "./components/SportsCalendar";
export { SportsHealthScore } from "./components/SportsHealthScore";
export { SportsAdvisorBanner } from "./components/SportsAdvisorBanner";
export { SportsIntelligencePanel } from "./components/SportsIntelligencePanel";

// Modals
export { TournamentFormModal } from "./components/TournamentFormModal";
export { LeagueFormModal } from "./components/LeagueFormModal";
export { ClassFormModal } from "./components/ClassFormModal";
export { CoachingFormModal } from "./components/CoachingFormModal";
export { ReservationFormModal } from "./components/ReservationFormModal";

// ═══ §6: TYPES ════════════════════════════════════════════════

export type {
  SportType,
  SportsHealthSummary_Contract,
  SportsHealthFactor_Contract,
  SportsCalendarItem_Contract,
  SportsProposal_Contract,
  SportsAnalytics_Contract,
  SportPopularity_Contract,
  CourtUtilization_Contract,
  ClassEnrollment_Contract,
  TournamentMetrics_Contract,
  EquipmentLifecycle_Contract,
  CoachingEffectiveness_Contract,
  SeasonalPattern_Contract,
} from "@/shared/mocks/contracts";

export type {
  SportsDashboardMode,
  SportsDecisionStageMode,
  SportsAmbientState,
  SportsIntelligenceSummary,
  CalendarItemType,
} from "./types";

// ═══ §7: CONFIG ═══════════════════════════════════════════════

export {
  CALENDAR_ITEM_TYPE_CONFIG,
  CR_WEATHER_RISK,
  SPORT_CONFIG,
} from "./types";

export {
  SPORTS_DASHBOARD_THRESHOLDS,
  SPORTS_AMBIENT_CONFIG,
  SPORTS_ADVISOR_THRESHOLDS,
} from "./config";

// ═══ §8: ADVISOR INTEGRATION ══════════════════════════════════

export { buildSportsCtx, SPORTS_RULES } from "@/shared/lib/advisor-engine/rules/sports";