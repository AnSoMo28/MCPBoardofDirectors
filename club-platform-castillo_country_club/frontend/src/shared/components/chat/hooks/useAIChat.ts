// src/shared/components/chat/hooks/useAIChat.ts
// Fase 23 — AI Chat data hook
// Message state · Advisor routing · Conversation history · API
// ═══════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { callMCPTool } from "@/shared/lib/api";
import { useQueryClient } from "@tanstack/react-query";
/* ── Types ── */

export interface AdvisorSuggestedAction {
  label: string;
  server: string;
  tool: string;
  params: Record<string, unknown>;
  approval_level: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
  evidence?: string[];
  relatedInsights?: string[];
  suggestedAction?: AdvisorSuggestedAction | null;
  isAdvisor?: boolean;
}

interface ChatApiResponse {
  status: string;
  response: {
    content: string;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
    error?: string;
  };
}

/* ── API ── */

async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<ChatApiResponse> {
  const token = localStorage.getItem("access_token") || "";
  const res = await fetch("/api/chat/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_history: history }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.detail || `Error del servidor (${res.status})`);
  }
  return res.json();
}

/* ── Suggestions ── */

export const QUICK_SUGGESTIONS: Record<string, string[]> = {
  SOCIO: [
    "¿Cuál es el estado de mi cuenta?",
    "¿Qué eventos hay este fin de semana?",
    "Reservar cancha de tenis",
    "Registrar un invitado",
  ],
  STAFF: [
    "¿Cuántos check-ins hoy?",
    "Reservas pendientes",
    "Tareas de mantenimiento",
    "Alertas operativas",
  ],
  ADMIN: [
    "Resumen ejecutivo del mes",
    "Miembros en riesgo de churn",
    "Anomalías detectadas",
    "Reporte de satisfacción",
  ],
  JUNTA: [
    "Board report Q1 2026",
    "Resumen financiero",
    "Recomendaciones estratégicas",
    "Evaluación de riesgos",
  ],
};

export const ADVISOR_SUGGESTIONS = [
  "¿Cómo mejoro el margen operativo?",
  "¿Qué eventos debería crear este mes?",
  "¿Cuál es el riesgo financiero actual?",
  "¿Cómo reduzco el churn de socios?",
  "¿Qué oportunidades de revenue estoy perdiendo?",
];

/* ── Hook ── */

export function useAIChat() {
  const prefersReduced = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOpen = useChatStore((s) => s.isOpen);
  const setIsOpen = useChatStore((s) => s.setOpen);
  const advisorContext = useChatStore((s) => s.advisorContext);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isAdvisorMode = !!advisorContext;
  const suggestions = isAdvisorMode
    ? ADVISOR_SUGGESTIONS
    : QUICK_SUGGESTIONS[user?.role || "SOCIO"];

  const advisorExchangeCount = isAdvisorMode
    ? messages.filter((m) => m.isAdvisor && m.id !== "welcome").length
    : 0;

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [messages, isTyping, prefersReduced]);

  /* Welcome message */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const firstName = user?.name?.split(" ")[0] || "bienvenido";
      if (isAdvisorMode) {
        const riskText = advisorContext?.systemicRiskScore
          ? ` Riesgo sistémico: ${Math.round(advisorContext.systemicRiskScore)}/100.`
          : "";
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: `¡Hola ${firstName}! Soy tu Advisor inteligente. Tengo acceso a todos los datos operativos del club.${riskText} Preguntame lo que necesités — respondo con datos reales del Castillo.`,
          timestamp: new Date(),
          isAdvisor: true,
        }]);
      } else {
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: `¡Hola ${firstName}! Soy el asistente del Castillo Country Club. ¿En qué puedo ayudarte hoy?`,
          timestamp: new Date(),
        }]);
      }
    }
  }, [isOpen, user?.name, messages.length, isAdvisorMode, advisorContext?.systemicRiskScore]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, setIsOpen]);

  /* Build conversation history */
  const buildHistory = useCallback((msgs: ChatMessage[], newMsg: ChatMessage) => {
    return [...msgs, newMsg]
      .filter((m) => m.id !== "welcome")
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.isAdvisor && m.evidence?.length
          ? { evidence_summary: m.evidence.slice(0, 2) }
          : {}),
        ...(m.isAdvisor && m.relatedInsights?.length
          ? { related_insights: m.relatedInsights.slice(0, 2) }
          : {}),
      }));
  }, []);

  /* Send message */
  const handleSend = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setGlobalError(null);

    try {
      if (isAdvisorMode && advisorContext) {
        const dashboardContext = {
          insights: advisorContext.insights,
          period: advisorContext.period,
          systemic_risk_score: advisorContext.systemicRiskScore,
          role: user?.role?.toLowerCase() ?? "admin",
        };

        const conversationHistory = buildHistory(messages, userMsg);

        const result = await callMCPTool<{
          status: string;
          answer: {
            answer: string;
            evidence: string[];
            related_insights: string[];
            suggested_action: AdvisorSuggestedAction | null;
          };
        }>("advisor_intelligence", "ask_advisor", {
          question: messageText,
          dashboard_context: dashboardContext,
          role: user?.role?.toLowerCase() ?? "admin",
          conversation_history: conversationHistory,
        });

        const answer = result.answer;
        setMessages((prev) => [
          ...prev,
          {
            id: `advisor_${Date.now()}`,
            role: "assistant",
            content: answer?.answer || "No pude procesar tu pregunta con los datos disponibles.",
            timestamp: new Date(),
            isAdvisor: true,
            evidence: answer?.evidence ?? [],
            relatedInsights: answer?.related_insights ?? [],
            suggestedAction: answer?.suggested_action ?? null,
          },
        ]);
      } else {
        const history = buildHistory(messages, userMsg).map(
          ({ role, content }) => ({ role, content }),
        );
        const data = await sendChatMessage(messageText, history);
        setMessages((prev) => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: data.response?.content || "No pude generar una respuesta.",
            timestamp: new Date(),
            error: data.response?.stop_reason === "error",
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? `Error: ${err.message}` : "No se pudo conectar. Intentá de nuevo.",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, isAdvisorMode, advisorContext, user?.role, buildHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return {
    messages, input, setInput,
    isTyping, globalError,
    isOpen, setIsOpen,
    isAdvisorMode, advisorContext,
    suggestions, advisorExchangeCount,
    messagesEndRef,
    handleSend, handleKeyDown,
    prefersReduced, user,
  };
}