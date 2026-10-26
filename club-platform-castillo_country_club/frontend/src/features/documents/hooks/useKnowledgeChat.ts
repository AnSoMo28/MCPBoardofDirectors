/**
 * @hook useKnowledgeChat (Fase 25)
 * @module features/documents/hooks
 * @exports useKnowledgeChat, SUGGESTED_PROMPTS
 * @note Conversation state, MCP mutation, send/clear, auto-scroll logic,
 *       suggested prompts, feedback, regeneration.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui/Toast";
import type {
  KnowledgeQueryParams,
  KnowledgeResponse,
  ConversationMessage,
} from "@/features/documents/types";

/* ═══════════════════════════════════════
   Suggested Prompts
   ═══════════════════════════════════════ */

export const SUGGESTED_PROMPTS = [
  {
    id: "rights",
    label: "Derechos de socios",
    query: "¿Cuáles son los derechos principales de los socios del club?",
  },
  {
    id: "events",
    label: "Reglamento de eventos",
    query: "¿Qué reglamentos aplican para la organización de eventos en el club?",
  },
  {
    id: "minutes",
    label: "Último acta de junta",
    query: "Dame un resumen del acta más reciente de la junta directiva.",
  },
  {
    id: "cancel",
    label: "Política de cancelaciones",
    query: "¿Cuál es la política de cancelación de reservas del club?",
  },
  {
    id: "pool",
    label: "Horarios piscina",
    query: "¿Cuáles son los horarios de la piscina y las reglas de uso?",
  },
  {
    id: "fees",
    label: "Cuotas y pagos",
    query: "¿Cómo funcionan las cuotas mensuales y los métodos de pago?",
  },
] as const;

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type FeedbackValue = "positive" | "negative";

export interface UseKnowledgeChatReturn {
  /* Messages */
  messages: ConversationMessage[];
  /* Input */
  input: string;
  setInput: (v: string) => void;
  /* Mutation state */
  isPending: boolean;
  isError: boolean;
  /* Actions */
  sendMessage: (text?: string) => Promise<void>;
  clearChat: () => void;
  regenerate: (messageId: string) => Promise<void>;
  sendFeedback: (messageId: string, value: FeedbackValue) => void;
  copyMessage: (messageId: string) => Promise<void>;
  /* Conversation */
  conversationId: string | null;
  messageCount: number;
  /* Scroll */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  autoScrollEnabled: boolean;
  setAutoScrollEnabled: (v: boolean) => void;
  scrollToBottom: () => void;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useKnowledgeChat(): UseKnowledgeChatReturn {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const queryMutation = useMCPMutation<
    KnowledgeResponse,
    KnowledgeQueryParams
  >("document_intelligence", "knowledge_query");

  /* ── Auto-scroll ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom();
    }
  }, [messages, queryMutation.isPending, autoScrollEnabled, scrollToBottom]);

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (text?: string) => {
      const question = (text ?? input).trim();
      if (!question || queryMutation.isPending) return;

      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setAutoScrollEnabled(true);

      try {
        const response = await queryMutation.mutateAsync({
          question,
          conversation_id: conversationId ?? undefined,
          max_sources: 5,
        });

        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        const assistantMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          confidence: response.confidence,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        showToast({
          type: "error",
          message: "Error al consultar la base de conocimiento",
        });
        const errorMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Lo siento, no pude procesar tu consulta en este momento. Por favor, intentá de nuevo.",
          confidence: 0,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [input, queryMutation, conversationId],
  );

  /* ── Clear chat ── */
  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setFeedbackGiven(new Set());
    inputRef.current?.focus();
  }, []);

  /* ── Regenerate last response ── */
  const regenerate = useCallback(
    async (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx < 1) return;

      /* Find the user question that preceded this assistant message */
      const userMsg = messages
        .slice(0, idx)
        .reverse()
        .find((m) => m.role === "user");
      if (!userMsg) return;

      /* Remove the assistant message */
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setAutoScrollEnabled(true);

      /* Re-send with same conversation context */
      try {
        const response = await queryMutation.mutateAsync({
          question: userMsg.content,
          conversation_id: conversationId ?? undefined,
          max_sources: 5,
        });

        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        const newMessage: ConversationMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          confidence: response.confidence,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMessage]);
      } catch {
        showToast({
          type: "error",
          message: "Error al regenerar la respuesta",
        });
      }
    },
    [messages, queryMutation, conversationId],
  );

  /* ── Feedback ── */
  const sendFeedback = useCallback(
    (messageId: string, value: FeedbackValue) => {
      if (feedbackGiven.has(messageId)) return;
      setFeedbackGiven((prev) => new Set(prev).add(messageId));
      /* In production: send to MCP feedback endpoint */
      showToast({
        type: "success",
        message:
          value === "positive"
            ? "Gracias por tu feedback positivo"
            : "Feedback registrado. Trabajaremos en mejorar.",
      });
    },
    [feedbackGiven],
  );

  /* ── Copy message ── */
  const copyMessage = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      try {
        await navigator.clipboard.writeText(msg.content);
        showToast({ type: "success", message: "Respuesta copiada" });
      } catch {
        showToast({
          type: "error",
          message: "No se pudo copiar al portapapeles",
        });
      }
    },
    [messages],
  );

  return {
    messages,
    input,
    setInput,
    isPending: queryMutation.isPending,
    isError: queryMutation.isError,
    sendMessage,
    clearChat,
    regenerate,
    sendFeedback,
    copyMessage,
    conversationId,
    messageCount: messages.length,
    messagesEndRef,
    autoScrollEnabled,
    setAutoScrollEnabled,
    scrollToBottom,
  };
}