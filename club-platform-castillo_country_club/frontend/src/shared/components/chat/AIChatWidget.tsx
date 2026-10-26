// src/shared/components/chat/AIChatWidget.tsx
// Fase 23 — Silver Tide AI Chat Neural Console
// Glass · Advisor encoding · Neural typing · Message entrance · Gold ambient
// ═══════════════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Sparkles, AlertCircle,
  ChevronRight, Brain,
} from "lucide-react";
import { ChatActionCard } from "@/shared/components/ml/ChatActionCard";
import { callMCPTool } from "@/shared/lib/api";
import { showToast } from "@/shared/components/ui";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/shared/lib/utils";
import { useAIChat } from "./hooks/useAIChat";
import type { ChatMessage } from "./hooks/useAIChat";
import './AIChatWidget.css';

/* ──────────────────────────────────────
   Helpers
   ────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
}

function renderContent(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : <span key={j}>{part}</span>,
    );

    if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ")) {
      return (
        <div key={i} className="glass-chat-bullet">
          <span className="glass-chat-bullet__dot" />
          <span>{rendered}</span>
        </div>
      );
    }
    return (
      <span key={i}>
        {rendered}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

/* ──────────────────────────────────────
   Animation variants
   ────────────────────────────────────── */

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const },
  },
  exit: {
    opacity: 0, scale: 0.97, y: 8,
    transition: { duration: 0.15 },
  },
};

const messageVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};
/* ──────────────────────────────────────
   Neural Typing Indicator
   ────────────────────────────────────── */

function NeuralTypingIndicator({ isAdvisor }: { isAdvisor: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-start"
    >
      <div className="glass-chat-typing">
        <div className="glass-chat-typing__pulse">
          <span className="glass-chat-typing__ring glass-chat-typing__ring--1" />
          <span className="glass-chat-typing__ring glass-chat-typing__ring--2" />
          <span className="glass-chat-typing__ring glass-chat-typing__ring--3" />
          <Brain className="glass-chat-typing__icon" size={14} />
        </div>
        <span className="glass-chat-typing__text">
          {isAdvisor ? "Analizando datos..." : "Pensando..."}
        </span>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Chat Bubble — Glass Message
   ────────────────────────────────────── */

function ChatBubble({ msg, queryClient, reduced }: {
  msg: ChatMessage;
  onExecute: (action: ChatMessage["suggestedAction"]) => Promise<void>;
  queryClient: ReturnType<typeof useQueryClient>;
  reduced: boolean;
}) {
  const isUser = msg.role === "user";
  const isAdvisor = msg.isAdvisor && !msg.error;

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "glass-chat-bubble",
          isUser && "glass-chat-bubble--user",
          msg.error && "glass-chat-bubble--error",
          isAdvisor && "glass-chat-bubble--advisor",
        )}
      >
        {/* Advisor header badge */}
        {isAdvisor && (
          <div className="glass-chat-bubble__advisor-badge">
            <Sparkles className="w-3 h-3" />
            <span>Advisor Inteligente</span>
          </div>
        )}

        {/* Error icon */}
        {msg.error && msg.role === "assistant" && (
          <AlertCircle size={14} className="inline-block mr-1.5 -mt-0.5 text-[var(--color-rose-400)]" />
        )}

        {/* Content */}
        {renderContent(msg.content)}

        {/* Advisor: Evidence */}
        {msg.evidence && msg.evidence.length > 0 && (
          <div className="glass-chat-section glass-chat-section--evidence">
            <p className="glass-chat-section__title glass-chat-section__title--evidence">Evidencia</p>
            {msg.evidence.map((ev, idx) => (
              <motion.p
                key={idx}
                className="glass-chat-section__item"
                initial={reduced ? undefined : { opacity: 0, x: -4 }}
                animate={reduced ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
              >
                <span className="glass-chat-section__dot glass-chat-section__dot--evidence" />
                {ev}
              </motion.p>
            ))}
          </div>
        )}

        {/* Advisor: Related Insights */}
        {msg.relatedInsights && msg.relatedInsights.length > 0 && (
          <div className="glass-chat-section glass-chat-section--insights">
            <p className="glass-chat-section__title glass-chat-section__title--insights">Insights relacionados</p>
            {msg.relatedInsights.map((ri, idx) => (
              <motion.p
                key={idx}
                className="glass-chat-section__item"
                initial={reduced ? undefined : { opacity: 0, x: -4 }}
                animate={reduced ? undefined : { opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
              >
                <ChevronRight className="w-3 h-3 text-[var(--color-amber-400)] flex-shrink-0" />
                {ri}
              </motion.p>
            ))}
          </div>
        )}

        {/* Advisor: Suggested Action */}
        {msg.suggestedAction && (
          <div className="glass-chat-action-wrap">
            <ChatActionCard
              action={{
                id: msg.id,
                label: msg.suggestedAction.label,
                description: `Ejecutar: ${msg.suggestedAction.label}`,
                server: msg.suggestedAction.server,
                tool: msg.suggestedAction.tool,
                params: msg.suggestedAction.params,
                approval_level: (msg.suggestedAction.approval_level as "auto" | "semi" | "hitl") ?? "auto",
              }}
              onExecute={async (action) => {
                try {
                  await callMCPTool(action.server, action.tool, action.params);
                  queryClient.invalidateQueries();
                  showToast({ type: "success", message: `Acción ejecutada: ${action.label}` });
                } catch {
                  showToast({ type: "error", message: `Error al ejecutar: ${action.label}` });
                }
              }}
              compact
            />
          </div>
        )}

        {/* Timestamp */}
        <p className={cn(
          "glass-chat-bubble__time",
          isUser && "glass-chat-bubble__time--user",
        )}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────
   Main Orchestrator
   ────────────────────────────────────── */

export function AIChatWidget() {
  const queryClient = useQueryClient();
  const {
    messages, input, setInput,
    isTyping, isOpen, setIsOpen,
    isAdvisorMode, suggestions, advisorExchangeCount,
    messagesEndRef, handleSend, handleKeyDown,
    prefersReduced, user,
  } = useAIChat();

  return (
    <>
      {/* ═══ Toggle FAB ═══ */}
      <div className="glass-chat-fab-wrap">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn("glass-chat-fab", isOpen && "glass-chat-fab--open")}
          aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente AI"}
          aria-expanded={isOpen}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Sparkles className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Pulse ring (only when closed) */}
          {!isOpen && <span className="glass-chat-fab__pulse" />}
        </button>
      </div>

      {/* ═══ Chat Panel ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-chat-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-label="Asistente AI del Castillo"
          >
            {/* Ambient glow */}
            <span className="glass-chat-panel__glow" aria-hidden="true" />

            {/* ── Header ── */}
            <div className="glass-chat-header">
              <div className="glass-chat-header__avatar">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="glass-chat-header__name">Asistente Castillo</p>
                <p className="glass-chat-header__mode">
                  {isAdvisorMode
                    ? `Advisor Inteligente — ${user?.role || "ADMIN"}`
                    : `Potenciado por IA — ${user?.role || "SOCIO"}`}
                </p>
                {isAdvisorMode && advisorExchangeCount > 0 && (
                  <p className="glass-chat-header__memory">
                    Recordando {advisorExchangeCount} intercambio{advisorExchangeCount !== 1 ? "s" : ""} previo{advisorExchangeCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="glass-chat-header__close"
                aria-label="Cerrar chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Messages ── */}
            <div className="glass-chat-messages" aria-live="polite" aria-label="Mensajes del chat">
              <AnimatePresence>
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    msg={msg}
                    onExecute={async (action) => {
                      if (!action) return;
                      try {
                        await callMCPTool(action.server, action.tool, action.params);
                        queryClient.invalidateQueries();
                        showToast({ type: "success", message: `Acción ejecutada: ${action.label}` });
                      } catch {
                        showToast({ type: "error", message: `Error al ejecutar: ${action.label}` });
                      }
                    }}
                    queryClient={queryClient}
                    reduced={prefersReduced}
                  />
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <NeuralTypingIndicator isAdvisor={isAdvisorMode} />
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Suggestions (first load only) ── */}
            {messages.length <= 1 && (
              <motion.div
                className="glass-chat-suggestions"
                initial={prefersReduced ? undefined : { opacity: 0, y: 4 }}
                animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="glass-chat-suggestions__label">Sugerencias:</p>
                <div className="glass-chat-suggestions__list">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="glass-chat-suggestions__chip"
                      initial={prefersReduced ? undefined : { opacity: 0, scale: 0.95 }}
                      animate={prefersReduced ? undefined : { opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.04 }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Input ── */}
            <div className="glass-chat-input-wrap">
              <div className="glass-chat-input-container">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAdvisorMode ? "Preguntale al Advisor..." : "Pregúntale al asistente..."}
                  disabled={isTyping}
                  aria-label="Mensaje para el asistente"
                  className="glass-chat-input"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="glass-chat-send"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="glass-chat-input-hint">
                Enter para enviar · Shift+Enter nueva línea
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}