/**
 * @hook useAISystemPage (Fase 25)
 * @module features/ai-system/hooks
 * @exports useAISystemPage
 * @note Data fetching, system evolution, command interface, simulation state,
 *       section collapse persistence, keyboard shortcuts (1-4, R, Esc),
 *       system health derivation, recent activity aggregation.
 *       ~250 lines of logic out of the component.
 */

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { callMCPTool } from "@/shared/lib/api";
import { useSystemEvolution } from "@/shared/hooks/useSystemEvolution";
import { useCommandInterface } from "@/shared/hooks/useCommandInterface";
import type { DeltaScenario } from "@/shared/lib/advisor-engine/twin-types";
import type { ExecutiveSummaryData } from "@/features/dashboard/types";
import { buildAnalyzerDataSources } from "../buildDataSources";
import { AI_SECTIONS, getHealthLevel } from "../config";
import type {
  SystemHealthLevel,
  SectionId,
  RecentActivity,
  AwarenessDataPoint,
} from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ProposalRecord {
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  createdAt?: number;
  created_at?: string;
}

export interface UseAISystemPageReturn {
  /* Loading */
  isLoading: boolean;
  /* Errors */
  pageError: string | null;
  /* Data sources */
  dataSources: ReturnType<typeof buildAnalyzerDataSources>;
  summaryData: ExecutiveSummaryData | null;
  /* Evolution */
  evolution: ReturnType<typeof useSystemEvolution>;
  hasReport: boolean;
  proposalStats: { total: number; implemented: number };
  awarenessHistory: AwarenessDataPoint[];
  /* Command interface */
  commandInterface: ReturnType<typeof useCommandInterface>;
  /* Simulation */
  isSimulating: boolean;
  handleSimulate: (scenario: DeltaScenario) => void;
  /* Handlers */
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleImplement: (id: string) => void;
  handleRunAnalysis: () => void;
  /* Section UI */
  collapsedSections: Set<string>;
  toggleSection: (id: SectionId) => void;
  navigateToSection: (id: SectionId) => void;
  /* Derived */
  lastAnalyzedAt: string;
  systemHealthScore: number | null;
  systemHealthLevel: SystemHealthLevel;
  recentActivity: RecentActivity[];
}

/* ═══════════════════════════════════════
   LocalStorage helpers
   ═══════════════════════════════════════ */

const LS_PREFIX = "ai-section-";

function readCollapsedSections(): Set<string> {
  const initial = new Set<string>();
  for (const section of AI_SECTIONS) {
    try {
      if (localStorage.getItem(`${LS_PREFIX}${section.id}`) === "collapsed") {
        initial.add(section.id);
      }
    } catch {
      /* SSR or private browsing */
    }
  }
  return initial;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useAISystemPage(): UseAISystemPageReturn {
  /* ── Data fetching ── */
  const summaryQ = useQuery<ExecutiveSummaryData>({
    queryKey: ["executive-summary"],
    queryFn: () =>
      callMCPTool<ExecutiveSummaryData>("executive_dashboard", "get_executive_summary", {}),
    staleTime: 300_000,
  });

  /* ── Build data sources ── */
  const dataSources = useMemo(
    () => buildAnalyzerDataSources(),
    [],
  );

  /* ── System evolution ── */
  const evolution = useSystemEvolution({
    engineRules: dataSources.engineRules,
    calibrationData: dataSources.calibrationData,
    storedPredictions: dataSources.storedPredictions,
    commandHistory: dataSources.commandHistory,
    signalHistory: dataSources.signalHistory,
    coOccurrenceLog: dataSources.coOccurrenceLog,
    activeGoals: dataSources.activeGoals,
    completedGoals: dataSources.completedGoals,
    analysisOptions: {
      periodDays: 30,
      includeRedundancy: true,
      includeGaps: true,
      includePredictions: true,
      includeBehavior: true,
      autoSuppress: false,
      suppressionThreshold: 25,
      minEvaluationsForSuppression: 10,
    },
    autoRun: true,
    autoRunInterval: 0,
    onProposalsGenerated: (proposals) => {
      if (import.meta.env.DEV) {
        console.log(
          `[AISystemPage] ${proposals.length} new proposals`,
        );
      }
    },
  });

  /* ── Command interface ── */
  const commandInterface = useCommandInterface({
    advisorContext: (summaryQ.data ?? {}) as Record<string, unknown>,
    insights: evolution.state.latestReport?.proposals
      ? []
      : undefined,
    maxTurns: 20,
    onAction: (action, data) => {
      if (import.meta.env.DEV) {
        console.log(`[AISystemPage] Action: ${action}`, data);
      }
    },
  });

  /* ── UI State ── */
  const [collapsedSections, setCollapsedSections] =
    useState<Set<string>>(readCollapsedSections);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string>(
    new Date().toISOString(),
  );
  const [isSimulating, setIsSimulating] = useState(false);

  /* ── Derived ── */
  const hasReport = evolution.state.latestReport !== null;
  const awarenessHistory: AwarenessDataPoint[] =
    evolution.awarenessHistory ?? [];
  const proposalStats = evolution.proposalStats;

  const systemHealthScore = useMemo(() => {
    if (awarenessHistory.length === 0) return null;
    return awarenessHistory[0].score;
  }, [awarenessHistory]);

  const systemHealthLevel = useMemo(
    () => getHealthLevel(systemHealthScore),
    [systemHealthScore],
  );

  /* ── Recent activity aggregation ── */
  const recentActivity = useMemo<RecentActivity[]>(() => {
    const items: RecentActivity[] = [];

    /* Latest analysis */
    if (hasReport) {
      items.push({
        id: "latest-analysis",
        type: "analysis",
        message: "Análisis del sistema ejecutado",
        timestamp: lastAnalyzedAt, /* already string */
      });
    }

    /* Recent proposals */
    try {
      const report = evolution.state.latestReport as Record<
        string,
        unknown
      > | null;
      const proposals = report?.proposals as
        | ProposalRecord[]
        | undefined;
      if (Array.isArray(proposals)) {
        for (const p of proposals.slice(0, 3)) {
          const status = String(p.status ?? "pending");
          const title = String(
            p.title ?? p.name ?? "Propuesta",
          );
          items.push({
            id: `proposal-${String(p.id ?? Math.random())}`,
            type:
              status === "implemented"
                ? "implement"
                : status === "approved"
                  ? "approve"
                  : "proposal",
            message: title,
            timestamp: typeof p.created_at === "string"
              ? p.created_at
              : typeof p.createdAt === "number"
                ? new Date(p.createdAt).toISOString()
                : lastAnalyzedAt,
          });
        }
      }
    } catch {
      /* ignore shape mismatches */
    }

    /* Recent command turns */
    const turns = (
      (commandInterface.conversation?.turns ?? []) as unknown as Array<Record<string, unknown>>
    );
    const userTurns = turns
      .filter((t) => t.role === "user")
      .slice(-2);
    for (const t of userTurns) {
      items.push({
        id: `cmd-${String(t.id ?? Math.random())}`,
        type: "command",
        message: String(t.content ?? "").slice(0, 60),
        timestamp: typeof t.timestamp === "string"
          ? t.timestamp
          : new Date(Number(t.timestamp ?? Date.now())).toISOString(),
      });
    }

    return items
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      )
      .slice(0, 5);
  }, [
    hasReport,
    lastAnalyzedAt,
    evolution.state.latestReport,
    commandInterface.conversation?.turns,
  ]);

  /* ── Update lastAnalyzedAt when analysis completes ── */
  useEffect(() => {
    if (!evolution.state.isAnalyzing && hasReport) {
      setLastAnalyzedAt(new Date().toISOString());
    }
  }, [evolution.state.isAnalyzing, hasReport]);

  /* ── Handlers ── */
  const handleApprove = useCallback(
    (id: string) => {
      evolution.approve(id, "Aprobado desde System Health");
    },
    [evolution],
  );

  const handleReject = useCallback(
    (id: string) => {
      evolution.reject(id, "Rechazado desde System Health");
    },
    [evolution],
  );

  const handleImplement = useCallback(
    (id: string) => {
      const result = evolution.implement(id);
      if (import.meta.env.DEV) {
        console.log("[AISystemPage] Implement:", result);
      }
    },
    [evolution],
  );

  const handleRunAnalysis = useCallback(() => {
    evolution.runAnalysis();
  }, [evolution]);

  const handleSimulate = useCallback(
    (scenario: DeltaScenario) => {
      setIsSimulating(true);
      if (import.meta.env.DEV) {
        console.log(
          "[AISystemPage] Simulate:",
          scenario.name,
          scenario.deltas,
        );
      }
      /* TODO: Process through twin engine */
      setTimeout(() => setIsSimulating(false), 1500);
    },
    [],
  );

  const toggleSection = useCallback((id: SectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        try {
          localStorage.removeItem(`${LS_PREFIX}${id}`);
        } catch {
          /* ignore */
        }
      } else {
        next.add(id);
        try {
          localStorage.setItem(`${LS_PREFIX}${id}`, "collapsed");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  }, []);

  const navigateToSection = useCallback((id: SectionId) => {
    document
      .getElementById(`ai-section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return;

      /* 1-4: Jump to section */
      if (
        e.key >= "1" &&
        e.key <= "4" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const idx = parseInt(e.key) - 1;
        const section = AI_SECTIONS[idx];
        if (section) {
          e.preventDefault();
          navigateToSection(section.id);
        }
      }

      /* R: Re-analyze */
      if (
        (e.key === "r" || e.key === "R") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        evolution.runAnalysis();
      }

      /* Esc: Collapse all */
      if (e.key === "Escape") {
        const allIds = new Set(AI_SECTIONS.map((s) => s.id));
        setCollapsedSections(allIds);
        try {
          for (const id of allIds) {
            localStorage.setItem(`${LS_PREFIX}${id}`, "collapsed");
          }
        } catch {
          /* ignore */
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [evolution.runAnalysis, navigateToSection]);

  /* ── Loading ── */
  const isLoading = summaryQ.isLoading;
  const pageError =
    evolution.state.error ??
    (summaryQ.error as Error | null)?.message ??
    null;

  return {
    isLoading,
    pageError,
    dataSources,
    summaryData: summaryQ.data ?? null,
    evolution,
    hasReport,
    proposalStats,
    awarenessHistory,
    commandInterface,
    isSimulating,
    handleSimulate,
    handleApprove,
    handleReject,
    handleImplement,
    handleRunAnalysis,
    collapsedSections,
    toggleSection,
    navigateToSection,
    lastAnalyzedAt,
    systemHealthScore,
    systemHealthLevel,
    recentActivity,
  };
}