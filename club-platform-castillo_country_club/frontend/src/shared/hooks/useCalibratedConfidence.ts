// src/shared/hooks/useCalibratedConfidence.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Calibrated Confidence Hook (F50)
//
// Provides calibrated confidence scores based on historical
// outcome tracking. Replaces hardcoded confidence with
// data-driven adjustments.
//
// Flow:
//   1. Load outcomes from localStorage
//   2. Compute calibration map (ruleId → CalibrationResult)
//   3. Expose getCalibratedConfidence(ruleId, originalConfidence)
//   4. Expose recordInsightOutcome() to track new outcomes
//
// Performance: calibration map is memoized — recomputes only
// when outcome count changes.
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback, useState } from "react";
import {
  calibrateAllRules,
  computeCalibratedConfidence,
  isCalibrationReady,
  getCalibrationReport,
} from "@/shared/lib/advisor-engine/calibration";
import {
  recordOutcome,
  getOutcomeCount,
  clearAllOutcomes,
} from "@/shared/lib/advisor-engine/calibration-storage";
import type {
  OutcomeStatus,
  CalibrationReport,
  CalibrationResult,
} from "@/shared/lib/advisor-engine/calibration-types";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

export function useCalibratedConfidence() {
  // Trigger for recalculating when outcomes change
  const [outcomeVersion, setOutcomeVersion] = useState(0);

  // Calibration map: ruleId → CalibrationResult
  const calibrationMap = useMemo(() => {
    return calibrateAllRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeVersion]);

  // Full report
  const report = useMemo<CalibrationReport>(() => {
    return getCalibrationReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeVersion]);

  /**
   * Get calibrated confidence for a rule.
   * Falls back to originalConfidence if no calibration data.
   */
  const getCalibratedConfidence = useCallback(
    (ruleId: string, originalConfidence: number): number => {
      return computeCalibratedConfidence(
        originalConfidence,
        ruleId,
        calibrationMap,
      );
    },
    [calibrationMap],
  );

  /**
   * Check if a rule has enough outcomes for calibration.
   */
  const isReady = useCallback(
    (ruleId: string): boolean => {
      return isCalibrationReady(ruleId, calibrationMap);
    },
    [calibrationMap],
  );

  /**
   * Get the CalibrationResult for a specific rule.
   */
  const getCalibration = useCallback(
    (ruleId: string): CalibrationResult | undefined => {
      return calibrationMap.get(ruleId);
    },
    [calibrationMap],
  );

  /**
   * Record an outcome for a tracked insight.
   * Triggers recalculation of calibration map.
   */
  const recordInsightOutcome = useCallback(
    (params: {
      ruleId: string;
      domain: AIDomain;
      impact: AdvisorImpactLevel;
      originalConfidence: number;
      outcome: OutcomeStatus;
      feedback?: string;
      metricDelta?: number;
    }) => {
      recordOutcome(params);
      setOutcomeVersion((v) => v + 1);
    },
    [],
  );

  /**
   * Clear all outcomes and reset calibration.
   */
  const resetCalibration = useCallback(() => {
    clearAllOutcomes();
    setOutcomeVersion((v) => v + 1);
  }, []);

  const totalOutcomes = useMemo(() => getOutcomeCount(), [outcomeVersion]);

  return {
    getCalibratedConfidence,
    isReady,
    getCalibration,
    recordInsightOutcome,
    resetCalibration,
    report,
    totalOutcomes,
    calibrationMap,
  };
}