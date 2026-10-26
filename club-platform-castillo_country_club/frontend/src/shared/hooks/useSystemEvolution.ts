// src/shared/hooks/useSystemEvolution.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — useSystemEvolution Hook (F55)
//
// React hook for the self-improving system.
// Manages analysis lifecycle, proposal management,
// awareness history, and evolution event tracking.
//
// Features:
//   - Run full system analysis → SystemHealthReport
//   - Generate proposals from report
//   - Approve/reject/implement proposals
//   - Track self-awareness score history
//   - Auto-run on mount (optional)
//   - Expire old proposals automatically
//   - Persist everything to localStorage
//
// Integration:
//   F49: signal history + causal chains
//   F50: calibration data for scoring
//   F51: goals for behavior analysis
//   F52: NL rules for performance scoring
//   F53: prediction history for accuracy tracking
//   F54: command history for behavior analysis
//
// Depends on:
//   ../lib/advisor-engine/system-analyzer (analyzeSystemHealth, AnalyzerDataSources)
//   ../lib/advisor-engine/evolution-proposer (generateProposals, approveProposal, rejectProposal, implementProposal, expireOldProposals, getStoredProposals, getStoredEvents, getAwarenessHistory, storeAwarenessHistory, getProposalStats)
//   ../lib/advisor-engine/evolution-types (SystemHealthReport, EvolutionState, AnalysisOptions, EvolutionProposal, EvolutionEvent, SelfAwarenessScore)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from "react";
import {
  analyzeSystemHealth,
  type AnalyzerDataSources,
  type RuleCalibrationData,
  type StoredPrediction,
  type CommandUsageRecord,
  type SignalHistoryEntry,
  type CoOccurrenceRecord,
} from "@/shared/lib/advisor-engine/system-analyzer";
import {
  generateProposals,
  approveProposal,
  rejectProposal,
  implementProposal,
  expireOldProposals,
  getStoredProposals,
  getStoredEvents,
  getAwarenessHistory,
  storeAwarenessHistory,
  getProposalStats,
  markProposalOutcome,
  clearEvolutionData,
} from "@/shared/lib/advisor-engine/evolution-proposer";
import type {
  EvolutionState,
  AnalysisOptions,
  EvolutionProposal,
  SelfAwarenessScore,
} from "@/shared/lib/advisor-engine/evolution-types";
import { DEFAULT_ANALYSIS_OPTIONS } from "@/shared/lib/advisor-engine/evolution-types";
import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — OPTIONS
// ═══════════════════════════════════════════════════════════

interface UseSystemEvolutionOptions {
  /** Engine rules metadata (from the 185 rules) */
  engineRules: Array<{
    id: string;
    title: string;
    domain: AIDomain | "global";
    metrics: string[];
  }>;
  /** Calibration data from F50 */
  calibrationData: Map<string, RuleCalibrationData>;
  /** Stored predictions from F53 */
  storedPredictions?: StoredPrediction[];
  /** Command usage from F54 */
  commandHistory?: CommandUsageRecord[];
  /** Signal history from F49 */
  signalHistory?: SignalHistoryEntry[];
  /** Co-occurrence log */
  coOccurrenceLog?: CoOccurrenceRecord[];
  /** Active goals from F51 */
  activeGoals?: Array<{ id: string; title: string; status: string; domain: string }>;
  /** Completed goals from F51 */
  completedGoals?: Array<{ id: string; title: string; completedAt: number }>;
  /** Analysis options override */
  analysisOptions?: Partial<AnalysisOptions>;
  /** Auto-run analysis on mount? */
  autoRun?: boolean;
  /** Auto-run interval in ms (0 = disabled) */
  autoRunInterval?: number;
  /** Callback when proposals are generated */
  onProposalsGenerated?: (proposals: EvolutionProposal[]) => void;
  /** Callback when self-awareness score changes significantly */
  onAwarenessChanged?: (score: SelfAwarenessScore, previousScore: number | null) => void;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════

interface UseSystemEvolutionReturn {
  /** Current evolution state */
  state: EvolutionState;
  /** Run a full system analysis */
  runAnalysis: () => void;
  /** Approve a proposal */
  approve: (proposalId: string, reason?: string) => boolean;
  /** Reject a proposal */
  reject: (proposalId: string, reason?: string) => boolean;
  /** Implement an approved proposal */
  implement: (proposalId: string) => { success: boolean; message: string };
  /** Mark proposal outcome (positive/negative/neutral) */
  markOutcome: (proposalId: string, outcome: "positive" | "neutral" | "negative") => boolean;
  /** Get proposal statistics */
  proposalStats: ReturnType<typeof getProposalStats>;
  /** Awareness score history */
  awarenessHistory: Array<{ score: number; timestamp: number }>;
  /** Refresh proposals from storage */
  refreshProposals: () => void;
  /** Refresh events from storage */
  refreshEvents: () => void;
  /** Clear all evolution data (testing) */
  clearAll: () => void;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — HOOK
// ═══════════════════════════════════════════════════════════

export function useSystemEvolution(
  options: UseSystemEvolutionOptions,
): UseSystemEvolutionReturn {
  const {
    engineRules,
    calibrationData,
    storedPredictions = [],
    commandHistory = [],
    signalHistory = [],
    coOccurrenceLog = [],
    activeGoals = [],
    completedGoals = [],
    analysisOptions,
    autoRun = false,
    autoRunInterval = 0,
    onProposalsGenerated,
    onAwarenessChanged,
  } = options;

  const [state, setState] = useState<EvolutionState>({
    latestReport: null,
    isAnalyzing: false,
    reportHistory: [],
    pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
    recentEvents: getStoredEvents().slice(0, 20),
    error: null,
  });

  const [awarenessHistory, setAwarenessHistory] = useState<
    Array<{ score: number; timestamp: number }>
  >(() => getAwarenessHistory());

  // Stable refs
  const dataRef = useRef({
    engineRules,
    calibrationData,
    storedPredictions,
    commandHistory,
    signalHistory,
    coOccurrenceLog,
    activeGoals,
    completedGoals,
  });
  dataRef.current = {
    engineRules,
    calibrationData,
    storedPredictions,
    commandHistory,
    signalHistory,
    coOccurrenceLog,
    activeGoals,
    completedGoals,
  };

  const optionsRef = useRef(analysisOptions);
  optionsRef.current = analysisOptions;

  const onProposalsRef = useRef(onProposalsGenerated);
  onProposalsRef.current = onProposalsGenerated;

  const onAwarenessRef = useRef(onAwarenessChanged);
  onAwarenessRef.current = onAwarenessChanged;

  // ── Core analysis runner ──
  const runAnalysis = useCallback(() => {
    setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const data = dataRef.current;

      // Build AnalyzerDataSources
      const dataSources: AnalyzerDataSources = {
        calibrationData: data.calibrationData,
        engineRules: data.engineRules,
        storedPredictions: data.storedPredictions,
        commandHistory: data.commandHistory,
        signalHistory: data.signalHistory,
        coOccurrenceLog: data.coOccurrenceLog,
        activeGoals: data.activeGoals,
        completedGoals: data.completedGoals,
        evolutionHistory: getStoredEvents(),
      };

      // Merge options
      const mergedOptions: AnalysisOptions = {
        ...DEFAULT_ANALYSIS_OPTIONS,
        ...optionsRef.current,
      };

      // Run analyzer
      const report = analyzeSystemHealth(dataSources, mergedOptions);

      // Generate proposals
      const newProposals = generateProposals(report);

      // Expire old proposals
      expireOldProposals();

      // Store awareness history
      storeAwarenessHistory(report.selfAwarenessScore.overall);
      const newHistory = getAwarenessHistory();

      // Check for significant awareness change
      const previousScore = awarenessHistory.length > 0
        ? awarenessHistory[0].score
        : null;
      const currentScore = report.selfAwarenessScore.overall;
      if (
        previousScore !== null &&
        Math.abs(currentScore - previousScore) >= 5
      ) {
        onAwarenessRef.current?.(report.selfAwarenessScore, previousScore);
      }

      // Notify about new proposals
      if (newProposals.length > 0) {
        onProposalsRef.current?.(newProposals);
      }

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        latestReport: report,
        reportHistory: [report, ...prev.reportHistory].slice(0, 10),
        pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
        recentEvents: getStoredEvents().slice(0, 20),
      }));

      setAwarenessHistory(newHistory);

      if (import.meta.env.DEV) {
        console.log(
          `[SystemEvolution] Analysis complete in ${report.executionMs}ms:`,
          `Score ${report.selfAwarenessScore.overall}/100 (${report.selfAwarenessScore.status})`,
          `${newProposals.length} new proposals`,
        );
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : "Error desconocido en el análisis";

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error,
      }));

      if (import.meta.env.DEV) {
        console.error("[SystemEvolution] Analysis error:", e);
      }
    }
  }, [awarenessHistory]);

  // ── Auto-run on mount ──
  useEffect(() => {
    if (autoRun) {
      // Small delay to let data sources initialize
      const timer = setTimeout(runAnalysis, 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-run interval ──
  useEffect(() => {
    if (autoRunInterval > 0) {
      const interval = setInterval(runAnalysis, autoRunInterval);
      return () => clearInterval(interval);
    }
  }, [autoRunInterval, runAnalysis]);

  // ── Proposal management ──

  const approve = useCallback(
    (proposalId: string, reason?: string): boolean => {
      const success = approveProposal(proposalId, reason);
      if (success) {
        setState((prev) => ({
          ...prev,
          pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
          recentEvents: getStoredEvents().slice(0, 20),
        }));
      }
      return success;
    },
    [],
  );

  const reject = useCallback(
    (proposalId: string, reason?: string): boolean => {
      const success = rejectProposal(proposalId, reason);
      if (success) {
        setState((prev) => ({
          ...prev,
          pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
          recentEvents: getStoredEvents().slice(0, 20),
        }));
      }
      return success;
    },
    [],
  );

  const implement = useCallback(
    (proposalId: string): { success: boolean; message: string } => {
      const result = implementProposal(proposalId);
      if (result.success) {
        setState((prev) => ({
          ...prev,
          pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
          recentEvents: getStoredEvents().slice(0, 20),
        }));
      }
      return result;
    },
    [],
  );

  const markOutcome = useCallback(
    (proposalId: string, outcome: "positive" | "neutral" | "negative"): boolean => {
      const success = markProposalOutcome(proposalId, outcome);
      if (success) {
        setState((prev) => ({
          ...prev,
          recentEvents: getStoredEvents().slice(0, 20),
        }));
      }
      return success;
    },
    [],
  );

  // ── Data accessors ──

  const proposalStats = getProposalStats();

  const refreshProposals = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingProposals: getStoredProposals().filter((p) => p.status === "pending"),
    }));
  }, []);

  const refreshEvents = useCallback(() => {
    setState((prev) => ({
      ...prev,
      recentEvents: getStoredEvents().slice(0, 20),
    }));
  }, []);

  const clearAll = useCallback(() => {
    clearEvolutionData();
    setState({
      latestReport: null,
      isAnalyzing: false,
      reportHistory: [],
      pendingProposals: [],
      recentEvents: [],
      error: null,
    });
    setAwarenessHistory([]);
  }, []);

  return {
    state,
    runAnalysis,
    approve,
    reject,
    implement,
    markOutcome,
    proposalStats,
    awarenessHistory,
    refreshProposals,
    refreshEvents,
    clearAll,
  };
}