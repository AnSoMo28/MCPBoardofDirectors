/**
 * @component KnowledgeQuery (Fase 25 — REWRITE)
 * @namespace .glass-knowledge
 * @depends useKnowledgeChat, MessageBubble, ChatInput, TypingIndicator,
 *          KnowledgeQuery.css
 * @note Full rewrite from 300-line monolith to orchestrator with hook + 4 sub-components.
 *       Suggested prompts, source chips, copy/regenerate/feedback, markdown rendering,
 *       "new messages below" indicator, Ctrl+K focus, smart timestamps.
 *       Backward-compatible: same default export, same route.
 * @import import './KnowledgeQuery.css';
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, Bot, AlertCircle, ChevronDown } from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { Button } from "@/shared/components/ui/Button";
import {
  useKnowledgeChat,
  SUGGESTED_PROMPTS,
} from "./hooks/useKnowledgeChat";
import { MessageBubble } from "./knowledge/MessageBubble";
import { ChatInput } from "./knowledge/ChatInput";
import { TypingIndicator } from "./knowledge/TypingIndicator";
import "./KnowledgeQuery.css";

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function KnowledgeQuery() {
  const chat = useKnowledgeChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  /* ── IntersectionObserver: "new messages below" ── */
  useEffect(() => {
    const sentinel = chat.messagesEndRef.current;
    const container = messagesContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollBtn(!entry.isIntersecting && chat.messageCount > 0);
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [chat.messagesEndRef, chat.messageCount]);

  /* ── Track if we should show timestamp ── */
  const shouldShowTimestamp = useCallback(
    (index: number): boolean => {
      if (index === 0) return true;
      const current = new Date(chat.messages[index].timestamp).getTime();
      const prev = new Date(chat.messages[index - 1].timestamp).getTime();
      return current - prev > 5 * 60 * 1000; /* 5 minutes */
    },
    [chat.messages],
  );

  /* ── Suggested prompt click ── */
  const handlePrompt = (query: string) => {
    chat.setInput(query);
    /* Small delay so input updates before submit */
    setTimeout(() => chat.sendMessage(query), 50);
  };

  return (
    <PageContainer
      title="Consultar Base de Conocimiento"
      subtitle="Preguntá sobre estatutos, reglamentos, actas y documentos del club"
      breadcrumbs={[
        { label: "Dashboard", href: "/admin/dashboard" },
        { label: "Documentación", href: "/admin/documents" },
        { label: "Consultar" },
      ]}
      actions={
        chat.messageCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={chat.clearChat}
            icon={<Trash2 size={16} />}
          >
            Limpiar
          </Button>
        ) : undefined
      }
    >
      <div className="glass-knowledge">
        {/* ── Messages area ── */}
        <div
          ref={messagesContainerRef}
          className="glass-knowledge__messages"
        >
          {/* Welcome (no messages) */}
          {chat.messageCount === 0 && !chat.isPending && (
            <div className="glass-knowledge__welcome">
              <Bot className="glass-knowledge__welcome-icon" />
              <h2 className="glass-knowledge__welcome-title">
                Consultá la documentación del Castillo
              </h2>
              <p className="glass-knowledge__welcome-desc">
                Hacé una pregunta sobre los estatutos, reglamentos, actas o
                cualquier documento del club. La IA buscará en toda la
                documentación y te dará una respuesta respaldada por fuentes.
              </p>

              {/* Suggested prompts */}
              <div className="glass-knowledge__prompts-label">
                💡 Sugerencias
              </div>
              <div className="glass-knowledge__prompts-grid">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <Button
                    variant="unstyled"
                    key={prompt.id}
                    type="button"
                    className="glass-knowledge__prompt-btn"
                    onClick={() => handlePrompt(prompt.query)}
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation meta */}
          {chat.conversationId && chat.messageCount > 0 && (
            <div className="glass-knowledge__conv-meta">
              Conversación · {chat.messageCount} mensajes
            </div>
          )}

          {/* Messages */}
          <div className="glass-knowledge__messages-inner">
            {chat.messages.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onCopy={() => chat.copyMessage(msg.id)}
                onRegenerate={() => chat.regenerate(msg.id)}
                onFeedback={(v) => chat.sendFeedback(msg.id, v)}
                feedbackGiven={
                  /* We track this via the hook's internal state, but
                     expose it as a no-op for simplicity */
                  false
                }
                showTimestamp={shouldShowTimestamp(i)}
              />
            ))}

            {chat.isPending && <TypingIndicator />}
          </div>

          {/* Error banner */}
          {chat.isError &&
            !chat.messages.some((m) => m.confidence === 0) && (
              <div className="glass-knowledge__error-banner">
                <AlertCircle />
                <span className="glass-knowledge__error-banner-text">
                  Error al consultar. Intentá de nuevo.
                </span>
              </div>
            )}

          {/* Scroll anchor */}
          <div ref={chat.messagesEndRef} />
        </div>

        {/* "New messages below" button */}
        {showScrollBtn && (
          <Button
            variant="unstyled"
            type="button"
            className="glass-knowledge__scroll-btn"
            onClick={() => {
              chat.scrollToBottom();
              chat.setAutoScrollEnabled(true);
            }}
          >
            <ChevronDown size={14} />
            Nuevos mensajes
          </Button>
        )}

        {/* Input */}
        <ChatInput
          input={chat.input}
          onInputChange={chat.setInput}
          onSubmit={() => chat.sendMessage()}
          isPending={chat.isPending}
          inputRef={inputRef}
        />
      </div>
    </PageContainer>
  );
}

export default KnowledgeQuery;