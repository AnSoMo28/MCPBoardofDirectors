// src/shared/lib/advisor-engine/index.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Public API
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.1  (G10-MC04: alineado a VERSION_SYNC 2.1.0 — drift v2.0↔2.1.0 desde G8 detectado por verify-master-consistency)
// @namespace   N/A — barrel re-export
// @keyframes   0
// @depends     All advisor-engine sub-modules
//
// Single import point for all Advisor Engine functionality.
//
// QUICK START — What most consumers need:
//
//   import {
//     type AdvisorConfig,
//     type RuleDefinition,
//     type BaseContext,
//     type AdvisorInsightBase,
//     useAdvisorEngine,
//     buildInsight,
//     computeHealthScore,
//   } from "@/shared/lib/advisor-engine";
//
// ADVANCED — Domain-specific subsystems:
//
//   // Signal Bus (cross-domain communication)
//   import { signalBus, useSignalBus } from "@/shared/lib/advisor-engine";
//
//   // Confidence calibration
//   import { computeConfidence, CONFIDENCE_PRESETS } from "@/shared/lib/advisor-engine";
//
//   // NL Rule Authoring (admin UI)
//   import { parseNLRule, validateNLRule } from "@/shared/lib/advisor-engine";
//
//   // Digital Twin Simulation
//   import { simulateScenario } from "@/shared/lib/advisor-engine";
//
//   // NL Command Interface (CommandPalette)
//   import { parseCommand, executeCommand } from "@/shared/lib/advisor-engine";
//
//   // System Evolution (self-improving)
//   import { analyzeSystemHealth, generateProposals } from "@/shared/lib/advisor-engine";
//
// ANTI-PATTERNS REMOVED (v1):
// [x] Flat ~120 exports → organized by § sections
// [x] TrendDirection re-export from domain-enums → removed (import directly)
// [x] Phase comments ("F49 — The Synapses") → clean § structure
// [x] Inconsistent quote style → double quotes throughout
//
// FIXES APPLIED (v2):
// [x] I-01: AdvisorInsightBase + core ai-intelligence types re-exported
// [x] I-02: EventsContext, EventHealthFactorStatic, EVENTS_HEALTH_FACTORS,
//           EVENTS_CAUSAL_PATTERNS added (they exist in ./types but weren't exported)
// [x] I-03: RAGContext moved from §5 (signals) to §1 (core context types)
// [x] I-04: Manifest type name mapping documented (see §0 below)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 TYPE NAME MAPPING — Manifest ↔ Code
// ═══════════════════════════════════════════════════════════
//
// The architecture.manifest.ts lists conceptual type names.
// The actual exported names differ. Use this mapping:
//
//   Manifest "Insight"          → AdvisorInsightBase (from ai-intelligence)
//   Manifest "ConfidenceScore"  → ConfidenceBreakdown (from ./confidence)
//   Manifest "AdvisorCommand"   → CommandIntent (from ./command-types)
//
// These aliases are NOT created (R-05: no type redefinition).
// Consumers import the canonical names below.

// ═══════════════════════════════════════════════════════════
// §1 CORE — Engine + Hook + Types
// What 90% of consumers need to build a domain advisor.
// ═══════════════════════════════════════════════════════════

// ── Engine class + React hook ──
export { AdvisorEngine, useAdvisorEngine } from "./engine";

// ── Engine convenience helpers ──
export {
  getInsightsAboveImpact,
  hasHighSeverity,
  getTopInsights,
  getActionableInsights,
  getEvaluationStats,
} from "./engine";

// ── Core ai-intelligence types (re-exported for convenience) ──
// These originate from @shared/types/ai-intelligence but are used in
// nearly every advisor-engine type signature (RuleDefinition.evaluate,
// helper return types, AdvisorEngineEvent). Re-exporting here lets
// consumers type their code with a single import from this barrel.
export type {
  AdvisorInsightBase,
  AdvisorImpactLevel,
  AdvisorLayer,
  AIDomain,
} from "../../types/ai-intelligence";

// ── Core engine types ──
export type {
  BaseContext,
  EventsContext,
  RAGContext,
  RuleDefinition,
  SignalDefinition,
  AdvisorConfig,
  AdvisorResult,
  DomainSignal,
  HealthFactorDef,
  HealthFactorResult,
  HealthFactorStatus,
  HealthScoreResult,
  AdvisorEngineEvent,
  AdvisorEngineEventListener,
} from "./types";

// ── Core type helpers ──
export {
  isSignalExpired,
  createSignal,
  HEALTH_STATUS_LABELS,
} from "./types";

// ── Domain-specific: Events (from ./types — used by events feature) ──
export type { EventHealthFactorStatic } from "./types";
export { EVENTS_HEALTH_FACTORS } from "./types";

// ═══════════════════════════════════════════════════════════
// §2 EVALUATION — Rule evaluation pipeline
// buildInsight is the primary way to construct insights.
// ═══════════════════════════════════════════════════════════

export {
  evaluateRule,
  evaluateRules,
  sortInsights,
  deduplicateInsights,
  extractSignals,
  consumeSignals,
  buildInsight,
  runPipeline,
} from "./evaluate";

// ═══════════════════════════════════════════════════════════
// §3 CONFIDENCE — Scoring + display + presets
// ═══════════════════════════════════════════════════════════

export type {
  ConfidenceLevel,
  ConfidenceFactor,
  ConfidenceBreakdown,
} from "./confidence";

export {
  getConfidenceLevel,
  CONFIDENCE_DISPLAY,
  getConfidenceDisplay,
  computeConfidence,
  combineConfidences,
  CONFIDENCE_PRESETS,
} from "./confidence";

// ═══════════════════════════════════════════════════════════
// §4 HEALTH SCORE — Composite scoring + formatting
// ═══════════════════════════════════════════════════════════

export {
  computeHealthScore,
  formatHealthSummary,
  compareHealthScores,
  getCriticalFactors,
} from "./health-score";

// ═══════════════════════════════════════════════════════════
// §5 SIGNALS — Cross-domain communication bus
// Signal Bus routes signals between domain engines.
// ═══════════════════════════════════════════════════════════

export type { SignalName } from "./types";
export { SIGNAL_NAMES, isSignalName } from "./types";

export { SignalBus, signalBus, useSignalBus } from "./signal-bus";

// ═══════════════════════════════════════════════════════════
// §6 CAUSAL CHAINS — Cross-domain cascade detection
// Detects cause-and-effect patterns between domain signals.
// Used primarily by the Global Advisor.
// ═══════════════════════════════════════════════════════════

export type {
  CausalChain,
  CausalPattern,
  ChainDetectionResult,
  DirtyFlagSet,
  EvaluationMode,
  CachedRuleResult,
  EvaluationCache,
} from "./types";

// ── Domain-specific: Events causal patterns ──
export { EVENTS_CAUSAL_PATTERNS } from "./types";

export {
  computeSignalDecay,
  computeEffectiveSeverity,
  applyDecayToSignal,
  applyDecayToSignals,
  detectCausalChains,
  getChainShortDescription,
  findChainWithRootCause,
  findChainWithFinalEffect,
  getStrongestChain,
  CAUSAL_PATTERNS,
} from "./causal-chain";

// ═══════════════════════════════════════════════════════════
// §7 CALIBRATION — Confidence calibration feedback loop
// Records outcomes to improve rule confidence over time.
// Used by: ML Dashboard, Global Advisor, Autonomous Advisor.
// ═══════════════════════════════════════════════════════════

export type {
  RuleOutcome,
  OutcomeStatus,
  CalibrationResult,
  CalibrationReport,
  CausalChainOutcome,
} from "./calibration-types";

export {
  recordOutcome,
  getOutcomesForRule,
  getAllOutcomes,
  getOutcomeCount,
  clearAllOutcomes,
  recordChainOutcome,
  getChainOutcomes,
  validateChainOutcome,
} from "./calibration-storage";

export {
  calibrateRule,
  calibrateAllRules,
  computeCalibratedConfidence,
  getConfidenceDelta,
  isCalibrationReady,
  computeCausalChainAccuracy,
  getCalibrationReport,
} from "./calibration";

// ═══════════════════════════════════════════════════════════
// §8 GOALS + PLANS — Autonomous advisor intent engine
// Derives goals from insights, builds action plans.
// Used by: useAutonomousAdvisor hook, HITL dashboard.
// ═══════════════════════════════════════════════════════════

export type {
  GoalStatus,
  GoalPriority,
  AdvisorGoal,
  PlanStepStatus,
  PlanStep,
  ActionPlan,
  PlanExecutionResult,
  AutonomousAdvisorState,
} from "./intent-types";

export {
  GOAL_PRIORITY_CONFIG,
  GOAL_STATUS_CONFIG,
  STEP_STATUS_CONFIG,
} from "./intent-types";

export {
  deriveGoals,
  computeGoalGap,
  isGoalAchieved,
  updateGoalProgress,
  prioritizeGoals,
} from "./goal-engine";

export {
  buildPlan,
  buildPlansForGoals,
  resolveStepDependencies,
  getNextExecutableStep,
  getPendingApprovalSteps,
  computePlanProgress,
  stepToMCPAction,
} from "./plan-builder";

// ═══════════════════════════════════════════════════════════
// §9 NL RULES — Natural language rule authoring
// Lets admins create business rules in English/Spanish.
// Used by: NL Rule Author UI (shared/components/ai/NLRuleAuthor).
// ═══════════════════════════════════════════════════════════

export type {
  NLRuleStatus,
  ParseStrategy,
  NLRuleTemplate,
  NLCondition,
  NLAction,
  ParsedNLRule,
  NLRuleValidationResult,
  ValidationSeverity,
  ValidationIssue,
  MetricDefinition,
  MetricResolver,
  LLMParseRequest,
  LLMParseResponse,
} from "./nl-rule-types";

export {
  NL_RULE_STATUS_CONFIG,
  PARSE_STRATEGY_CONFIG,
} from "./nl-rule-types";

export {
  parseNLRule,
  resolveMetric,
  getAllMetrics,
  searchMetrics,
  getMetricByPath,
} from "./nl-rule-parser";

export {
  validateNLRule,
  isLikelyParseable,
} from "./nl-rule-validator";

export {
  saveCustomRule,
  getCustomRules,
  getActiveRules,
  getRulesForDomain,
  getRuleById,
  deleteCustomRule,
  toggleCustomRule,
  updateRuleStatus,
  recordEvaluation,
  recordTrigger,
  getTriggerRate,
  isRuleCalibratable,
  exportCustomRules,
  importCustomRules,
  clearCustomRules,
  getRuleStoreSummary,
} from "./nl-rule-store";

export {
  parseAndValidate,
  evaluateCustomRules,
  getGoalCandidatesFromNLRules,
  getNLEvaluationStats,
} from "./nl-rule-engine";

// ═══════════════════════════════════════════════════════════
// §10 DIGITAL TWIN — Scenario simulation
// Simulates "what happens if" scenarios against the engine.
// Used by: ScenarioBuilder, TwinResults UI.
// ═══════════════════════════════════════════════════════════

export type {
  MetricDelta,
  DeltaScenario,
  ScenarioTemplate,
  TwinSnapshot,
  RuleActivationDelta,
  CascadePrediction,
  CascadeStep,
  TwinPrediction,
  HealthScoreDelta,
  SimulatedGoalCandidate,
  TwinSimulationResult,
  TwinVerdict,
  TwinSimulationState,
} from "./twin-types";

export {
  SCENARIO_TEMPLATES,
  TEMPLATE_CATEGORY_CONFIG,
  VERDICT_CONFIG,
  RECOMMENDATION_CONFIG,
} from "./twin-types";

export {
  simulateScenario,
  simulateFromTemplate,
} from "./delta-simulator";

// ═══════════════════════════════════════════════════════════
// §11 COMMANDS — Natural language command interface
// Parses and executes natural language commands from the
// CommandPalette and AI Chat Widget.
// Used by: CommandPalette, CommandInterface UI.
// ═══════════════════════════════════════════════════════════

export type {
  CommandType,
  CommandIntent,
  CommandResponse,
  CommandResponseData,
  ResponseCardType,
  ConversationTurn,
  ConversationState,
  CommandParseResult,
  CommandPattern,
  TimeRange,
  MetricValueData,
  InsightListData,
  SimulationResultData,
  ActionConfirmationData,
  RuleCreatedData,
  GoalCreatedData,
  ReportPreviewData,
  ErrorData,
  ClarificationData,
} from "./command-types";

export {
  COMMAND_TYPE_CONFIG,
} from "./command-types";

export {
  parseCommand,
  isLikelyCommand,
} from "./command-parser";

export {
  executeCommand,
  type CommandExecutionContext,
} from "./command-executor";

// ═══════════════════════════════════════════════════════════
// §12 EVOLUTION — Self-improving system analysis
// Analyzes system health, detects drift, proposes improvements.
// Used by: SystemHealthDashboard, EvolutionProposer UI.
// ═══════════════════════════════════════════════════════════

export type {
  RulePerformanceScore,
  RedundantPair,
  CoverageGap,
  ConfidenceDrift,
  MetricCoverage,
  DomainCoverage,
  CoverageMatrix,
  PredictionAccuracy,
  PredictionAccuracySummary,
  FeatureUsage,
  ManagerBehaviorAnalysis,
  EvolutionActionType,
  EvolutionEvent,
  SuppressionDecision,
  ProposalType,
  EvolutionProposal,
  SelfAwarenessScore,
  SystemHealthReport,
  EvolutionState,
  AnalysisOptions,
} from "./evolution-types";

export {
  TIER_CONFIG,
  DRIFT_TYPE_CONFIG,
  EVOLUTION_ACTION_CONFIG,
  AWARENESS_STATUS_CONFIG,
  PROPOSAL_STATUS_CONFIG,
  DEFAULT_ANALYSIS_OPTIONS,
} from "./evolution-types";

export {
  analyzeSystemHealth,
  type AnalyzerDataSources,
  type RuleCalibrationData,
  type StoredPrediction,
  type CommandUsageRecord,
  type SignalHistoryEntry,
  type CoOccurrenceRecord,
} from "./system-analyzer";

export {
  generateProposals,
  approveProposal,
  rejectProposal,
  implementProposal,
  markProposalOutcome,
  expireOldProposals,
  getStoredProposals,
  getStoredEvents,
  getAwarenessHistory,
  storeAwarenessHistory,
  getProposalStats,
  clearEvolutionData,
} from "./evolution-proposer";