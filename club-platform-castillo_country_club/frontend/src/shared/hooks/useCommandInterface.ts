// src/shared/hooks/useCommandInterface.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — useCommandInterface Hook (F54)
//
// React hook for the NL Command Interface.
// Manages conversation state, parses commands via F54 parser,
// executes them via F54 executor, and maintains multi-turn context.
//
// Features:
//   - Submit commands → parse → execute → append turn
//   - Followup resolution (click chip → re-submit with context)
//   - Multi-turn context: activeMetric, activeDomain, lastSimulation
//   - Conversation history (last 20 turns)
//   - Action callbacks (approve, derive, simulate)
//   - LLM fallback typed but not wired (same as F52)
//
// Integration:
//   - F49: causalChains from advisor result
//   - F50: calibrationMap for calibrated confidence
//   - F52: NL rule creation via command
//   - F53: simulation via command
//
// Depends on:
//   ../lib/advisor-engine/command-parser (parseCommand)
//   ../lib/advisor-engine/command-executor (executeCommand, CommandExecutionContext)
//   ../lib/advisor-engine/command-types (ConversationState, ConversationTurn, etc.)
//   ../lib/advisor-engine/causal-chain (CausalChain)
//   ../lib/advisor-engine/types (BaseInsight, DomainSignal)
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";
import { parseCommand } from "@/shared/lib/advisor-engine/command-parser";
import { recordCommand } from "@/shared/lib/advisor-engine/learning-profile";
import {
  executeCommand,
  type CommandExecutionContext,
} from "@/shared/lib/advisor-engine/command-executor";
import type {
  ConversationState,
  ConversationTurn,
  CommandResponse
} from "@/shared/lib/advisor-engine/command-types";
import type { DomainSignal } from "@/shared/lib/advisor-engine/types";
import type { AdvisorInsightBase as BaseInsight } from "@/shared/types/ai-intelligence";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — OPTIONS
// ═══════════════════════════════════════════════════════════

interface UseCommandInterfaceOptions {
  /** Real advisor context */
  advisorContext: Record<string, unknown>;
  /** Active insights from the advisor engine */
  insights?: BaseInsight[];
  /** Active causal chains from F49 */
  causalChains?: CausalChain[];
  /** Active signals from Signal Bus */
  signals?: DomainSignal[];
  /** Calibration map from F50 */
  calibrationMap?: Map<string, unknown>;
  /** Baseline health scores per domain */
  healthScores?: Map<string, number>;
  /** Max conversation turns to keep */
  maxTurns?: number;
  /** Callback when a command triggers an action */
  onAction?: (action: string, data?: unknown) => void;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — HOOK RETURN TYPE
// ═══════════════════════════════════════════════════════════

interface UseCommandInterfaceReturn {
  /** Current conversation state */
  conversation: ConversationState;
  /** Submit a command text */
  submitCommand: (text: string) => void;
  /** Submit a followup (pre-formatted text from chip) */
  submitFollowup: (text: string) => void;
  /** Handle an action from a response card */
  handleAction: (action: string, data?: unknown) => void;
  /** Clear conversation history */
  clearConversation: () => void;
  /** Get the last N turns */
  getRecentTurns: (n?: number) => ConversationTurn[];
  /** Is there an active simulation context? */
  hasSimulationContext: boolean;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — HOOK
// ═══════════════════════════════════════════════════════════

export function useCommandInterface(
  options: UseCommandInterfaceOptions,
): UseCommandInterfaceReturn {
  const {
    advisorContext,
    insights,
    causalChains,
    signals,
    calibrationMap,
    healthScores,
    maxTurns = 20,
    onAction,
  } = options;

  const [conversation, setConversation] = useState<ConversationState>({
    turns: [],
    isProcessing: false,
  });

  // Stable refs to avoid stale closures
  const ctxRef = useRef(advisorContext);
  ctxRef.current = advisorContext;

  const insightsRef = useRef(insights);
  insightsRef.current = insights;

  const chainsRef = useRef(causalChains);
  chainsRef.current = causalChains;

  const signalsRef = useRef(signals);
  signalsRef.current = signals;

  const calMapRef = useRef(calibrationMap);
  calMapRef.current = calibrationMap;

  const healthRef = useRef(healthScores);
  healthRef.current = healthScores;

  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  // ── Core command processor ──
  const processCommand = useCallback(
    (text: string) => {
      setConversation((prev) => ({ ...prev, isProcessing: true }));

      // Build conversation state for parser (follow-up resolution)
      const parserConversation: ConversationState = {
        ...conversation,
        turns: conversation.turns,
      };

      // Step 1: Parse
      const parseResult = parseCommand(text, parserConversation);

      if (!parseResult.success || !parseResult.intent) {
        // Parse failed → error turn
        const errorResponse: CommandResponse = {
          id: `resp_err_${Date.now()}`,
          cardType: "error",
          intent: {
            type: "query",
            confidence: "low",
            confidenceScore: 0,
            domain: "global",
            metrics: [],
          },
          textSummary: parseResult.error ?? "No pude entender el comando.",
          data: {
            type: "error",
            errorMessage: parseResult.error ?? "No pude entender el comando.",
            errorCode: "parse_failed",
            suggestion: parseResult.suggestions?.[0] ?? "Intentá reformular.",
          },
          parseStrategy: parseResult.strategy,
          executionMs: 0,
          actionable: false,
          suggestedFollowups: parseResult.suggestions ?? [
            'Probá: "¿Cuál es el churn?"',
            'Probá: "Simula aumento de cuotas 10%"',
          ],
          timestamp: Date.now(),
        };

        const errorTurn: ConversationTurn = {
          id: `turn_${Date.now()}`,
          userText: text,
          intent: errorResponse.intent,
          response: errorResponse,
          timestamp: Date.now(),
        };

        setConversation((prev) => ({
          ...prev,
          isProcessing: false,
          turns: [...prev.turns, errorTurn].slice(-maxTurns),
        }));
        return;
      }

      // Step 2: Execute
      const execCtx: CommandExecutionContext = {
        advisorContext: ctxRef.current,
        insights: insightsRef.current,
        causalChains: chainsRef.current,
        signals: signalsRef.current,
        calibrationMap: calMapRef.current as Map<string, { accuracy: number; totalOutcomes: number }>,
        healthScores: healthRef.current,
        conversation: parserConversation,
      };

      const response = executeCommand(parseResult.intent, execCtx);

      // Step 2.5: Track command for learning profile (F57-B8)
      recordCommand({
        type: parseResult.intent.type,
        domain: parseResult.intent.domain,
        metrics: parseResult.intent.metrics,
      });

      // Step 3: Build turn
      const turn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        userText: text,
        intent: parseResult.intent,
        response,
        timestamp: Date.now(),
      };

      // Step 4: Update conversation context
      const activeMetric = parseResult.intent.metrics[0] ?? conversation.activeMetric;
      const activeDomain = parseResult.intent.domain ?? conversation.activeDomain;
      const activeTimeRange = parseResult.intent.timeRange ?? conversation.activeTimeRange;

      // Track simulation context for follow-ups
      let lastSimulation = conversation.lastSimulation;
      if (
        parseResult.intent.type === "simulation" &&
        parseResult.intent.scenario?.deltas
      ) {
        lastSimulation = {
          id: parseResult.intent.scenario.id ?? `sim_${Date.now()}`,
          name: parseResult.intent.scenario.name ?? "Escenario",
          description: parseResult.intent.scenario.description ?? "",
          deltas: parseResult.intent.scenario.deltas,
          createdAt: Date.now(),
          createdBy: "command",
        };
      }

      setConversation((prev) => ({
        ...prev,
        isProcessing: false,
        turns: [...prev.turns, turn].slice(-maxTurns),
        activeMetric,
        activeDomain,
        activeTimeRange,
        lastSimulation,
      }));

      if (import.meta.env.DEV) {
        console.log(
          `[CommandInterface] ${parseResult.intent.type} (${parseResult.strategy}, ${parseResult.confidence}%) → ${response.cardType} (${response.executionMs}ms)`,
        );
      }
    },
    [conversation, maxTurns],
  );

  // ── Public methods ──

  const submitCommand = useCallback(
    (text: string) => {
      processCommand(text);
    },
    [processCommand],
  );

  const submitFollowup = useCallback(
    (text: string) => {
      // Followups are submitted as regular commands
      // The parser's resolveFollowup() handles context-aware resolution
      processCommand(text);
    },
    [processCommand],
  );

  const handleAction = useCallback(
    (action: string, data?: unknown) => {
      switch (action) {
        case "approve_action": {
          // Trigger HITL approval via callback
          onActionRef.current?.("approve_action", data);
          // Add confirmation turn
          const confirmTurn: ConversationTurn = {
            id: `turn_action_${Date.now()}`,
            userText: `[Acción: aprobar]`,
            intent: {
              type: "action",
              confidence: "high",
              confidenceScore: 95,
              domain: "global",
              metrics: [],
            },
            response: {
              id: `resp_action_${Date.now()}`,
              cardType: "action_confirmation",
              intent: {
                type: "action",
                confidence: "high",
                confidenceScore: 95,
                domain: "global",
                metrics: [],
              },
              textSummary: "Acción aprobada. Ejecutando...",
              data: {
                type: "action_confirmation",
                actionDescription: "Aprobación ejecutada",
                server: (data as { server?: string })?.server ?? "hitl",
                tool: (data as { tool?: string })?.tool ?? "approve_request",
                approvalLevel: "hitl",
                status: "executed",
              },
              parseStrategy: "deterministic",
              executionMs: 0,
              actionable: false,
              suggestedFollowups: ["Verificar resultado", "Ver próximo pendiente"],
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          };
          setConversation((prev) => ({
            ...prev,
            turns: [...prev.turns, confirmTurn].slice(-maxTurns),
          }));
          break;
        }

        case "derive_goal": {
          onActionRef.current?.("derive_goal", data);
          // Submit as a goal command
          const goalData = data as { title?: string; metricName?: string; targetValue?: number; unit?: string };
          processCommand(
            `Meta: ${goalData.title ?? "Nueva meta"} — objetivo ${goalData.targetValue}${goalData.unit ?? ""}`,
          );
          break;
        }

        case "generate_report": {
          onActionRef.current?.("generate_report", data);
          const reportData = data as { toolServer?: string; toolName?: string; reportType?: string };
          processCommand(`Generar reporte ${reportData.reportType ?? "completo"}`);
          break;
        }

        case "simulate_full": {
          onActionRef.current?.("simulate_full", data);
          processCommand("Mostrar simulación completa");
          break;
        }

        default:
          onActionRef.current?.(action, data);
      }
    },
    [processCommand, maxTurns],
  );

  const clearConversation = useCallback(() => {
    setConversation({
      turns: [],
      isProcessing: false,
    });
  }, []);

  const getRecentTurns = useCallback(
    (n: number = 5) => {
      return conversation.turns.slice(-n);
    },
    [conversation.turns],
  );

  return {
    conversation,
    submitCommand,
    submitFollowup,
    handleAction,
    clearConversation,
    getRecentTurns,
    hasSimulationContext: !!conversation.lastSimulation,
  };
}