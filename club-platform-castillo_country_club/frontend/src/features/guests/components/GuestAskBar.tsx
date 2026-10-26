// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestAskBar.tsx
// Phase 34 "The Gateway" — Capa 5: Conversation Intelligence
// Level 6+ Agency · Production Grade
//
// Natural language conversation interface for the staff.
// Staff asks a question, the concierge responds with
// specific data from the engines.
//
// NOT a chatbot. Not an LLM. A pattern-matched query→response
// engine backed by real pipeline, analytics, and proposal data.
//
// Depends on: conciergeConversation.ts, conciergeNarrative.ts,
//             useGuestDashboard hook
// Budget: renders < 30 conversation exchanges
// Checklist: TSX-1-40, CSS-1-40, D3.3-6, D4.1-13
//
// PRE-WRITURE VERIFICATION:
//   ConversationExchange { query, response, timestamp }  ← conciergeConversation.ts §1 ✅
//   ConversationResponse { text, actions, dataSources }  ← conciergeConversation.ts §1 ✅
//   ConciergeAction { label, server, tool, params,
//     approvalLevel, variant }                            ← conciergeNarrative.ts §1 ✅
//   respondToQuery(query, input) → ConversationResponse  ← conciergeConversation.ts §6 ✅
//   createExchange(query, response) → ConversationExchange ← conciergeConversation.ts §6 ✅
//   ConciergeInput { mode, insights, healthScore, ... }  ← conciergeNarrative.ts §1 ✅
//   UseGuestDashboardReturn extends GuestEnrichedData     ← hooks/useGuestDashboard.ts ✅
//   dashboard.dashboardMode → GuestDashboardMode          ← GuestEnrichedData ✅
//   dashboard.insights → BaseInsight[]                    ← GuestEnrichedData ✅
//   dashboard.healthScoreResult → HealthScoreResult | null ← GuestEnrichedData ✅
//   dashboard.engines → object with pipeline, quickWins   ← GuestEnrichedData ✅
//   dashboard.intelligenceSummary → object with vipCount  ← GuestEnrichedData ✅
//   pipeline.health → number                              ← types.ts §9 ✅
//   pipeline.bottlenecks[0]?.stageLabel → string | undef  ← types.ts §9 ✅
// ═══════════════════════════════════════════════════════════

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import type {
  ConciergeInput,
  ConciergeAction
} from "../lib/conciergeNarrative";

import type {
  ConversationExchange,
  ConversationResponse,
} from "../lib/conciergeConversation";

import {
  respondToQuery,
  createExchange,
} from "../lib/conciergeConversation";

import type { UseGuestDashboardReturn } from "../hooks/useGuestDashboard";

import "./GuestAskBar.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestAskBarProps {
  /** Full dashboard data from useGuestDashboard. */
  readonly dashboard: UseGuestDashboardReturn;
  /** Called when user clicks an action button. */
  readonly onAction?: (action: ConciergeAction) => void;
}

interface SuggestedQuery {
  readonly label: string;
  readonly labelKey: string;
  readonly query: string;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAX_EXCHANGES = 30;

const SUGGESTED_QUERIES: readonly SuggestedQuery[] = [
  {
    label: "¿Qué guests están listos para membresía?",
    labelKey: "guest.askbar.suggest.conversion_ready",
    query: "¿Qué guests están listos para membresía?",
  },
  {
    label: "¿Cómo va el pipeline?",
    labelKey: "guest.askbar.suggest.pipeline",
    query: "¿Cómo va el pipeline?",
  },
  {
    label: "¿Hay candidatos VIP?",
    labelKey: "guest.askbar.suggest.vip",
    query: "¿Hay candidatos VIP?",
  },
  {
    label: "Resumen del día",
    labelKey: "guest.askbar.suggest.daily",
    query: "Resumen del día",
  },
  {
    label: "¿Hay problemas?",
    labelKey: "guest.askbar.suggest.critical",
    query: "¿Hay problemas críticos?",
  },
  {
    label: "Ayuda",
    labelKey: "guest.askbar.suggest.help",
    query: "Ayuda",
  },
] as const;

const TYPING_SPEED_MS = 18;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  const attr = document.documentElement.getAttribute("data-prefers-reduced");
  if (attr === "true") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Build ConciergeInput from dashboard data.
 * Same logic as GuestConciergeVoice's internal builder.
 * TODO: Extract to shared conciergeHelpers.ts to avoid duplication.
 */
function buildConciergeInput(dashboard: UseGuestDashboardReturn): ConciergeInput {
  const hs = dashboard.healthScoreResult;
  const engines = dashboard.engines;
  const intel = dashboard.intelligenceSummary;

  return {
    mode: dashboard.dashboardMode,
    insights: dashboard.insights.map((i) => ({
      id: i.id,
      severity: i.severity,
      title: i.title,
      description: i.description,
      impact: i.impact,
      confidence: i.confidence,
      action: i.action
        ? {
            label: i.action.label,
            server: i.action.server ?? "guest_management",
            tool: i.action.tool ?? "",
            params: i.action.params ?? {},
            approval: i.action.approval ?? "auto",
          }
        : undefined,
      metric: i.metric,
      metricValue: i.metricValue,
    })),
    healthScore: hs?.score ?? 0,
    healthLevel: hs?.level ?? "sin datos",
    hasCritical: hs?.hasCritical ?? false,
    pipelineHealth: intel?.pipelineHealth ?? engines?.pipeline?.health ?? 0,
    quickWinCount: intel?.quickWinCount ?? engines?.pipeline?.quickWins?.length ?? 0,
    vipCount: intel?.vipCount ?? 0,
    dormantCount: intel?.dormantCount ?? 0,
    totalGuests: engines?.pipeline?.totalGuests ?? dashboard.analytics?.total_guests ?? 0,
    bottleneckStage: engines?.pipeline?.bottlenecks[0]?.stageLabel ?? null,
  };
}
// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Conversation intelligence interface — ask the concierge.
 * Staff types a natural language query, receives a data-driven
 * response with specific citations and actionable buttons.
 *
 * @example
 * <GuestAskBar
 *   dashboard={dashboard}
 *   onAction={(action) => executeMCPTool(action)}
 * />
 */
export function GuestAskBar({
  dashboard,
  onAction,
}: GuestAskBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [exchanges, setExchanges] = useState<readonly ConversationExchange[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [pendingFullText, setPendingFullText] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // ── Build concierge input from dashboard data ──
  const conciergeInput: ConciergeInput | null = useMemo(() => {
    if (dashboard.isLoading || dashboard.isError) return null;
    return buildConciergeInput(dashboard);
  }, [dashboard]);

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    const container = messagesRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [exchanges.length, typingText]);

  // ── Typewriter effect for new responses ──
  useEffect(() => {
    if (pendingFullText === null) return;

    if (reducedMotion) {
      setTypingText(pendingFullText);
      setIsTyping(false);
      setPendingFullText(null);
      return;
    }

    setIsTyping(true);
    setTypingText("");
    let charIndex = 0;

    if (typingRef.current) clearInterval(typingRef.current);

    typingRef.current = setInterval(() => {
      charIndex++;
      if (charIndex >= pendingFullText.length) {
        setTypingText(pendingFullText);
        setIsTyping(false);
        setPendingFullText(null);
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }
        return;
      }
      setTypingText(pendingFullText.substring(0, charIndex));
    }, TYPING_SPEED_MS);

    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    };
  }, [pendingFullText, reducedMotion]);

  // ── Submit handler ──
  const handleSubmit = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !conciergeInput) return;

      const response: ConversationResponse = respondToQuery(trimmed, conciergeInput);
      const exchange = createExchange(trimmed, response);

      setExchanges((prev) => {
        const next = [...prev, exchange];
        // Truncate to MAX_EXCHANGES
        return next.length > MAX_EXCHANGES ? next.slice(-MAX_EXCHANGES) : next;
      });

      // Start typewriter for the new response
      setPendingFullText(response.text);
      setInputValue("");
      inputRef.current?.focus();
    },
    [conciergeInput],
  );

  // ── Form submit ──
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(inputValue);
    },
    [inputValue, handleSubmit],
  );

  // ── Suggestion click ──
  const handleSuggestion = useCallback(
    (query: string) => {
      handleSubmit(query);
    },
    [handleSubmit],
  );

  // ── Skip typing ──
  const handleSkipTyping = useCallback(() => {
    if (isTyping && pendingFullText) {
      if (typingRef.current) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
      setTypingText(pendingFullText);
      setIsTyping(false);
      setPendingFullText(null);
    }
  }, [isTyping, pendingFullText]);

  // ── Loading state ──
  if (dashboard.isLoading) {
    return (
      <div
        className="gst-askbar"
        data-state="loading"
        role="region"
        aria-label="Conversación con la concierge"
        data-testid="guest-askbar"
      >
        <div className="gst-askbar__loading">
          <span className="gst-askbar__loading-text">
            Preparando inteligencia de conversación...
          </span>
        </div>
      </div>
    );
  }

  const hasMessages = exchanges.length > 0;

  return (
    <div
      className="gst-askbar"
      data-state={hasMessages ? "conversation" : "empty"}
      data-mode={dashboard.dashboardMode}
      role="region"
      aria-label="Conversación con la concierge"
      data-testid="guest-askbar"
    >
      {/* ── Header ── */}
      <div className="gst-askbar__header">
        <h3 className="gst-askbar__title">Preguntale a la Concierge</h3>
        {hasMessages && (
          <span className="gst-askbar__exchange-count">
            {exchanges.length} consulta{exchanges.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Messages Area ── */}
      <div
        ref={messagesRef}
        className="gst-askbar__messages"
        role="log"
        aria-label="Historial de conversación"
        aria-live="polite"
      >
        {exchanges.map((exchange, i) => {
          const isLast = i === exchanges.length - 1;
          const showTypingForThis = isLast && isTyping;
          const displayText = showTypingForThis ? typingText : exchange.response.text;
          const isComplete = !showTypingForThis;

          return (
            <div key={`exchange-${i}`} className="gst-askbar__exchange">
              {/* User message */}
              <div className="gst-askbar__message" data-role="user">
                <p className="gst-askbar__message-text">{exchange.query}</p>
              </div>

              {/* Concierge response */}
              <div
                className="gst-askbar__message"
                data-role="concierge"
                onClick={isLast ? handleSkipTyping : undefined}
                onKeyDown={isLast ? (e) => { if (e.key === "Enter") handleSkipTyping(); } : undefined}
                tabIndex={isLast && isTyping ? 0 : -1}
              >
                <p className="gst-askbar__message-text">
                  {displayText}
                  {showTypingForThis && (
                    <span className="gst-askbar__cursor" aria-hidden="true" />
                  )}
                </p>

                {/* Data sources */}
                {isComplete && exchange.response.dataSources.length > 0 && (
                  <div className="gst-askbar__sources" aria-label="Fuentes de datos">
                    {exchange.response.dataSources.map((source) => (
                      <span key={source} className="gst-askbar__source-tag">
                        {source}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {isComplete && exchange.response.actions.length > 0 && (
                  <div className="gst-askbar__actions" role="group" aria-label="Acciones disponibles">
                    {exchange.response.actions.map((action, ai) => (
                      <button
                        key={`${action.tool}-${ai}`}
                        className="gst-askbar__action"
                        data-variant={action.variant}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction?.(action);
                        }}
                        aria-label={action.label}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Suggestions (shown when empty) ── */}
      {!hasMessages && (
        <div className="gst-askbar__suggestions" role="list" aria-label="Consultas sugeridas">
          {SUGGESTED_QUERIES.map((sq) => (
            <button
              key={sq.labelKey}
              className="gst-askbar__suggestion"
              onClick={() => handleSuggestion(sq.query)}
              role="listitem"
              aria-label={sq.label}
              data-testid={`askbar-suggest-${sq.labelKey.split(".").pop()}`}
            >
              {sq.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Area ── */}
      <form
        className="gst-askbar__input-area"
        onSubmit={handleFormSubmit}
        role="search"
        aria-label="Hacer una consulta"
      >
        <input
          ref={inputRef}
          className="gst-askbar__input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribí tu consulta..."
          aria-label="Consulta"
          disabled={!conciergeInput}
          data-testid="askbar-input"
          autoComplete="off"
        />
        <button
          className="gst-askbar__send"
          type="submit"
          disabled={!inputValue.trim() || !conciergeInput}
          aria-label="Enviar consulta"
          data-testid="askbar-send"
        >
          Enviar
        </button>
      </form>

      {/* ── Error state ── */}
      {dashboard.isError && (
        <p className="gst-askbar__error">
          No se pudieron cargar los datos de inteligencia. La conversación no está disponible.
        </p>
      )}
    </div>
  );
}