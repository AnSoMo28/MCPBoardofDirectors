// src/shared/components/ml/hooks/useHypotheticalSimulator.ts
// Fase 23 — Hypothetical Simulator data hook
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { SimulationResponse } from "@/shared/mocks/contracts";

const MAX_RECENT = 3;

export function useHypotheticalSimulator() {
  const [question, setQuestion] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  const simQuery = useMCPQuery<SimulationResponse>(
    "advisor_intelligence",
    "simulate_scenario",
    { question },
    { enabled: shouldFetch && question.length > 5, staleTime: 300_000 },
  );

  const handleSimulate = useCallback(() => {
    if (!question.trim()) return;
    setShouldFetch(true);
    setExpandedScenario(null);
    setRecentQuestions((prev) => {
      const next = [question, ...prev.filter((q) => q !== question)];
      return next.slice(0, MAX_RECENT);
    });
  }, [question]);

  const handleSuggestion = useCallback((q: string) => {
    setQuestion(q);
    setShouldFetch(true);
    setExpandedScenario(null);
    setRecentQuestions((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)];
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  const handleToggleExpand = useCallback((scenarioType: string) => {
    setExpandedScenario((prev) => (prev === scenarioType ? null : scenarioType));
  }, []);

  const handleRetry = useCallback(() => {
    setShouldFetch(true);
  }, []);

  return {
    question,
    setQuestion,
    shouldFetch,
    setShouldFetch,
    expandedScenario,
    recentQuestions,
    simQuery,
    handleSimulate,
    handleSuggestion,
    handleToggleExpand,
    handleRetry,
  };
}