/**
 * @module features/ai-system/buildDataSources (Fase 25 — MINOR REWRITE)
 * @note Gathers data from all intelligence layers into AnalyzerDataSources.
 *       Gracefully handles missing data — empty arrays/Maps are valid.
 *       Changes: removed unused params, extracted calibration types/constants,
 *       documented evolutionHistory.
 */

import type {
  AnalyzerDataSources,
  RuleCalibrationData,
  StoredPrediction,
  CommandUsageRecord,
  SignalHistoryEntry,
  CoOccurrenceRecord,
} from "@/shared/lib/advisor-engine/system-analyzer";
import { ENGINE_RULES } from "@/shared/lib/advisor-engine/rule-registry";

/* ═══════════════════════════════════════
   Storage Keys
   ═══════════════════════════════════════ */

const KEYS = {
  CALIBRATION: "ccc_calibration_outcomes",
  PREDICTIONS: "ccc_twin_predictions",
  COMMANDS: "ccc_command_history",
  SIGNALS: "ccc_signal_history",
  CO_OCCURRENCE: "ccc_co_occurrence_log",
  GOALS_ACTIVE: "ccc_goals_active",
  GOALS_COMPLETED: "ccc_goals_completed",
} as const;

/* ═══════════════════════════════════════
   Calibration Constants
   ═══════════════════════════════════════ */

const CALIBRATION = {
  WARMING_THRESHOLD: 3,
  CALIBRATED_THRESHOLD: 10,
  RECENT_WINDOW: 20,
} as const;

/* ═══════════════════════════════════════
   Calibration Types
   ═══════════════════════════════════════ */

interface RawCalibrationOutcome {
  success: boolean;
  timestamp: number;
}

type RawCalibrationData = Record<string, RawCalibrationOutcome[]>;

/* ═══════════════════════════════════════
   Main Builder
   ═══════════════════════════════════════ */

/**
 * Gathers all analyzer data sources from localStorage and
 * the engine rule registry. Params removed (unused) — summary
 * and approvals are consumed directly by useAISystemPage hook.
 */
export function buildAnalyzerDataSources(): AnalyzerDataSources {
  return {
    engineRules: ENGINE_RULES,
    calibrationData: loadCalibrationData(),
    storedPredictions: loadFromStorage<StoredPrediction[]>(
      KEYS.PREDICTIONS,
      [],
    ),
    commandHistory: loadFromStorage<CommandUsageRecord[]>(
      KEYS.COMMANDS,
      [],
    ),
    signalHistory: loadFromStorage<SignalHistoryEntry[]>(
      KEYS.SIGNALS,
      [],
    ),
    coOccurrenceLog: loadFromStorage<CoOccurrenceRecord[]>(
      KEYS.CO_OCCURRENCE,
      [],
    ),
    activeGoals: loadFromStorage(KEYS.GOALS_ACTIVE, []),
    completedGoals: loadFromStorage(KEYS.GOALS_COMPLETED, []),
    evolutionHistory: [] /* Populated by useSystemEvolution after analysis runs */,
  };
}

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

/**
 * Parse JSON from localStorage with generic type and fallback.
 * Returns fallback on missing key, parse error, or SSR/private browsing.
 */
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Load calibration outcomes from localStorage and compute
 * per-rule accuracy metrics with calibration readiness status.
 * Returns empty Map on missing data or parse error.
 */
function loadCalibrationData(): Map<string, RuleCalibrationData> {
  const map = new Map<string, RuleCalibrationData>();

  try {
    const raw = localStorage.getItem(KEYS.CALIBRATION);
    if (!raw) return map;

    const data = JSON.parse(raw) as RawCalibrationData;

    for (const [ruleId, outcomes] of Object.entries(data)) {
      const total = outcomes.length;
      const successes = outcomes.filter((o) => o.success).length;
      const accuracy = total > 0 ? successes / total : 0.5;

      let calibrationReady: RuleCalibrationData["calibrationReady"] =
        "cold";
      if (total >= CALIBRATION.CALIBRATED_THRESHOLD)
        calibrationReady = "calibrated";
      else if (total >= CALIBRATION.WARMING_THRESHOLD)
        calibrationReady = "warming";

      map.set(ruleId, {
        ruleId,
        accuracy,
        totalOutcomes: total,
        recentOutcomes: outcomes.slice(-CALIBRATION.RECENT_WINDOW),
        calibrationReady,
      });
    }
  } catch {
    /* Graceful: empty map */
  }

  return map;
}