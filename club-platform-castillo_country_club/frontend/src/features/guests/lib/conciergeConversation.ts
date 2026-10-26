// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/conciergeConversation.ts
// Phase 34 "The Gateway" — Concierge Conversation Engine
// Level 6+ Agency · Production Grade
//
// Handles natural language queries from the AskBar component.
// Pattern-matches queries to intent, extracts data from
// the concierge input, and generates specific, data-driven
// responses with citations.
//
// NOT an LLM — this is a deterministic query→response engine
// that references real engine data. No hallucination.
//
// Supports 12+ query categories in Spanish.
// Each response cites specific numbers, names, and sources.
//
// Depends on: conciergeNarrative.ts (ConciergeAction, ConciergeInput)
// Budget: 5ms (pure function)
// ═══════════════════════════════════════════════════════════

import type {
  ConciergeAction,
  ConciergeInput,
} from "./conciergeNarrative";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

/** A single exchange in the conversation history. */
export interface ConversationExchange {
  /** The staff's original query. */
  readonly query: string;
  /** The concierge's response. */
  readonly response: ConversationResponse;
  /** ISO timestamp of the exchange. */
  readonly timestamp: string;
}

/** The concierge's response to a query. */
export interface ConversationResponse {
  /** Natural language answer — specific, data-driven. */
  readonly text: string;
  /** Actionable buttons backed by MCP tool calls. */
  readonly actions: readonly ConciergeAction[];
  /** Which engine data sources were referenced (for transparency). */
  readonly dataSources: readonly string[];
}

// ═══════════════════════════════════════════════════════════
// §2 — THRESHOLDS
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  HEALTH_EXCELLENT: 85,
  HEALTH_GOOD: 70,
} as const;

// ═══════════════════════════════════════════════════════════
// §3 — QUERY HANDLERS
// Each handler is a pure function: ConciergeInput → response.
// ═══════════════════════════════════════════════════════════

function handleConversionReady(input: ConciergeInput): ConversationResponse {
  if (input.quickWinCount === 0) {
    return {
      text: "No hay invitados en etapa de conversión en este momento. El pipeline necesita más flujo hacia la etapa final.",
      actions: [],
      dataSources: ["pipelineEcosystem"],
    };
  }

  return {
    text: `Hay ${input.quickWinCount} invitado(s) en etapa 'listo' que pueden convertirse en miembros. Están a un paso — solo necesitan una propuesta formal o una reunión con el director de membresía.`,
    actions: [{
      label: "Preparar propuestas de membresía",
      server: "guest_management",
      tool: "generate_guest_engagement_proposals",
      params: { proposal_type: "conversion_nudge" },
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["pipelineEcosystem"],
  };
}

function handlePipelineStatus(input: ConciergeInput): ConversationResponse {
  const healthDesc = input.pipelineHealth >= 80
    ? "saludable"
    : input.pipelineHealth >= 50
      ? "necesita atención"
      : "en riesgo";

  const bottleneckText = input.bottleneckStage
    ? ` Presenta un bloqueo en '${input.bottleneckStage}'.`
    : " No hay bloqueos detectados.";

  return {
    text: `El pipeline tiene salud ${input.pipelineHealth}/100 (${healthDesc}).${bottleneckText} Hay ${input.quickWinCount} quick win(s) disponibles.`,
    actions: input.bottleneckStage
      ? [{
          label: "Revisar bloqueo",
          server: "guest_management",
          tool: "get_conversion_funnel",
          params: {},
          approvalLevel: "auto",
          variant: "primary",
        }]
      : [],
    dataSources: ["pipelineEcosystem"],
  };
}

function handleVIPCandidates(input: ConciergeInput): ConversationResponse {
  if (input.vipCount === 0) {
    return {
      text: "No hay candidatos VIP identificados en este momento. Los VIPs se detectan cuando el score de influencia, gasto y compatibilidad supera el umbral.",
      actions: [],
      dataSources: ["guestIntelligence"],
    };
  }

  return {
    text: `Hay ${input.vipCount} candidato(s) VIP en el pipeline. Estos invitados tienen alto potencial de membresía y deben recibir atención prioritaria con sponsors de alto perfil.`,
    actions: [{
      label: "Ver detalles de invitados",
      server: "guest_management",
      tool: "get_guest_analytics_enhanced",
      params: {},
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["guestIntelligence"],
  };
}

function handleDormantGuests(input: ConciergeInput): ConversationResponse {
  if (input.dormantCount === 0) {
    return {
      text: "No hay invitados dormientes detectados. Todos los invitados tienen actividad reciente.",
      actions: [],
      dataSources: ["guestMemory"],
    };
  }

  return {
    text: `Hay ${input.dormantCount} invitado(s) dormiente(s) — sin actividad reciente. No están perdidos: son semillas que esperan las condiciones correctas para reactivarse. El engine de memoria sugiere contacto personalizado basado en su historial de intereses.`,
    actions: [{
      label: "Reactivar dormientes",
      server: "guest_management",
      tool: "generate_guest_engagement_proposals",
      params: { proposal_type: "reactivation_campaign" },
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["guestMemory"],
  };
}

function handleTrialStatus(input: ConciergeInput): ConversationResponse {
  const trialInsights = input.insights.filter(
    (i) =>
      i.title.toLowerCase().includes("trial") ||
      i.description.toLowerCase().includes("trial") ||
      i.title.toLowerCase().includes("seguimiento"),
  );

  if (trialInsights.length === 0) {
    return {
      text: "No hay alertas activas sobre trials. Los trials están funcionando dentro de los parámetros esperados.",
      actions: [],
      dataSources: ["trialNarrative"],
    };
  }

  const top = trialInsights[0];
  return {
    text: `Hay ${trialInsights.length} alerta(s) relacionada(s) con trials. La más relevante: "${top.title}".`,
    actions: top.action
      ? [{
          label: top.action.label,
          server: top.action.server,
          tool: top.action.tool,
          params: top.action.params,
          approvalLevel: "auto",
          variant: "primary",
        }]
      : [],
    dataSources: ["trialNarrative"],
  };
}

function handleProposals(input: ConciergeInput): ConversationResponse {
  const proposalInsights = input.insights.filter(
    (i) =>
      i.title.toLowerCase().includes("follow") ||
      i.title.toLowerCase().includes("seguimiento") ||
      i.title.toLowerCase().includes("campaign") ||
      i.title.toLowerCase().includes("comunicación") ||
      i.title.toLowerCase().includes("propuest"),
  );

  if (proposalInsights.length === 0) {
    return {
      text: "No hay propuestas de alta prioridad pendientes en este momento.",
      actions: [],
      dataSources: ["trialNarrative"],
    };
  }

  return {
    text: `Hay ${proposalInsights.length} propuesta(s) pendiente(s). La más relevante: "${proposalInsights[0].title}".`,
    actions: [{
      label: "Generar propuestas de engagement",
      server: "guest_management",
      tool: "generate_guest_engagement_proposals",
      params: {},
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["trialNarrative"],
  };
}

function handleEvents(input: ConciergeInput): ConversationResponse {
  const eventInsights = input.insights.filter(
    (i) =>
      i.title.toLowerCase().includes("evento") ||
      i.title.toLowerCase().includes("event"),
  );

  if (eventInsights.length === 0) {
    return {
      text: "No hay alertas sobre eventos privados. Los eventos están generando invitados dentro de lo esperado.",
      actions: [],
      dataSources: ["guestIntelligence"],
    };
  }

  return {
    text: `Alerta de eventos: "${eventInsights[0].title}". Los eventos privados son el motor principal de captación de nuevos invitados.`,
    actions: [],
    dataSources: ["guestIntelligence"],
  };
}

function handleCriticalIssues(input: ConciergeInput): ConversationResponse {
  const criticalInsights = input.insights.filter(
    (i) => i.severity === "critical" || i.severity === "high",
  );

  if (criticalInsights.length === 0) {
    return {
      text: "No hay problemas críticos en este momento. El ecosistema está estable.",
      actions: [],
      dataSources: ["advisor"],
    };
  }

  const top = criticalInsights[0];
  const additional = criticalInsights.length > 1
    ? ` Además, hay ${criticalInsights.length - 1} alerta(s) más pendiente(s).`
    : "";

  return {
    text: `Problema principal: "${top.title}". ${top.description.substring(0, 150)}.${additional}`,
    actions: top.action
      ? [{
          label: top.action.label,
          server: top.action.server,
          tool: top.action.tool,
          params: top.action.params,
          approvalLevel: "auto",
          variant: "primary",
        }]
      : [],
    dataSources: ["advisor"],
  };
}

function handleBenchmark(input: ConciergeInput): ConversationResponse {
  if (input.healthScore >= THRESHOLDS.HEALTH_EXCELLENT) {
    return {
      text: `La salud general es ${input.healthScore}/100 — supera los estándares. El pipeline está a ${input.pipelineHealth}/100.`,
      actions: [],
      dataSources: ["guestIntelligence", "pipelineEcosystem"],
    };
  }

  if (input.healthScore >= THRESHOLDS.HEALTH_GOOD) {
    return {
      text: `La salud general es ${input.healthScore}/100 — dentro del rango aceptable. Hay oportunidades de mejora en conversión y retención.`,
      actions: [],
      dataSources: ["guestIntelligence"],
    };
  }

  return {
    text: `La salud general es ${input.healthScore}/100 — por debajo del benchmark. Se necesitan acciones correctivas en el pipeline.`,
    actions: [{
      label: "Ver pipeline detallado",
      server: "guest_management",
      tool: "get_conversion_funnel",
      params: {},
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["guestIntelligence"],
  };
}

function handleDailySummary(input: ConciergeInput): ConversationResponse {
  const parts: string[] = [];

  parts.push(`Resumen del día — ${input.totalGuests} invitados en el ecosistema.`);
  parts.push(`Salud del pipeline: ${input.pipelineHealth}/100.`);

  if (input.quickWinCount > 0) parts.push(`${input.quickWinCount} quick wins.`);
  if (input.vipCount > 0) parts.push(`${input.vipCount} VIPs.`);
  if (input.dormantCount > 0) parts.push(`${input.dormantCount} dormientes.`);

  const topInsight = input.insights[0];
  if (topInsight) {
    parts.push(`Prioridad: ${topInsight.title}.`);
  }

  return {
    text: parts.join(" "),
    actions: topInsight?.action
      ? [{
          label: topInsight.action.label,
          server: topInsight.action.server,
          tool: topInsight.action.tool,
          params: topInsight.action.params,
          approvalLevel: "auto",
          variant: "primary",
        }]
      : [],
    dataSources: ["all"],
  };
}

function handleHealthScore(input: ConciergeInput): ConversationResponse {
  return {
    text: `Salud general: ${input.healthScore}/100 (${input.healthLevel}). Salud del pipeline: ${input.pipelineHealth}/100. ${input.hasCritical ? "Hay factores críticos activos." : "Sin factores críticos."}`,
    actions: [],
    dataSources: ["guestIntelligence", "pipelineEcosystem"],
  };
}

function handlePrepareProposals(input: ConciergeInput): ConversationResponse {
  return {
    text: `Preparando propuestas de engagement para ${input.totalGuests} invitados. Se incluirán acciones para ${input.quickWinCount} quick wins, reactivación de ${input.dormantCount} dormientes y seguimiento de trials.`,
    actions: [{
      label: "Ejecutar propuestas",
      server: "guest_management",
      tool: "generate_guest_engagement_proposals",
      params: {},
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["trialNarrative", "pipelineEcosystem"],
  };
}

function handleChemistry(input: ConciergeInput): ConversationResponse {
  const chemInsights = input.insights.filter(
    (i) =>
      i.title.toLowerCase().includes("química") ||
      i.title.toLowerCase().includes("sponsor") ||
      i.title.toLowerCase().includes("impresión"),
  );

  if (chemInsights.length === 0) {
    return {
      text: "No hay alertas de química o compatibilidad en este momento. Los scores de afinidad guest-club están dentro de parámetros normales.",
      actions: [],
      dataSources: ["conversionChemistry"],
    };
  }

  return {
    text: `${chemInsights.length} alerta(s) de compatibilidad: "${chemInsights[0].title}". El engine de química detecta oportunidades de mejora en la asignación de sponsors.`,
    actions: [{
      label: "Ver detalles de química",
      server: "guest_management",
      tool: "get_guest_analytics_enhanced",
      params: {},
      approvalLevel: "auto",
      variant: "primary",
    }],
    dataSources: ["conversionChemistry"],
  };
}

function handleHelp(): ConversationResponse {
  return {
    text: "Puedo ayudarte con estas consultas:\n" +
      "- Estado del pipeline o funnel\n" +
      "- Invitados listos para membresía\n" +
      "- Candidatos VIP\n" +
      "- Invitados dormientes\n" +
      "- Trials activos\n" +
      "- Propuestas pendientes\n" +
      "- Eventos privados\n" +
      "- Problemas o alertas críticas\n" +
      "- Comparación con benchmark\n" +
      "- Salud del ecosistema\n" +
      "- Química y compatibilidad\n" +
      "- Resumen del día\n" +
      "Escribe tu consulta o elige una sugerencia.",
    actions: [{
      label: "Ver resumen del día",
      server: "guest_management",
      tool: "get_guest_health_score",
      params: {},
      approvalLevel: "auto",
      variant: "secondary",
    }],
    dataSources: [],
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — QUERY REGISTRY
// Ordered by specificity (most specific patterns first).
// The first match wins.
// ═══════════════════════════════════════════════════════════

interface QueryPattern {
  readonly patterns: readonly RegExp[];
  readonly handler: (input: ConciergeInput) => ConversationResponse;
  readonly description: string;
}

const QUERY_REGISTRY: readonly QueryPattern[] = [
  {
    patterns: [/ayuda/i, /help/i, /qué puedo/i, /opciones/i, /qué hay/i],
    handler: () => handleHelp(),
    description: "Ayuda — lista de consultas disponibles",
  },
  {
    patterns: [/preparar/i, /ejecutar/i, /acción/i, /generar propuest/i],
    handler: handlePrepareProposals,
    description: "Preparar/ejecutar acciones",
  },
  {
    patterns: [/resumen/i, /summary/i, /\bhoy\b/i, /breviario/i],
    handler: handleDailySummary,
    description: "Resumen del día",
  },
  {
    patterns: [/listo/i, /convertir/i, /members[íi]a/i, /\bready\b/i, /\bconvert\b/i],
    handler: handleConversionReady,
    description: "Invitados listos para membresía",
  },
  {
    patterns: [/pipeline/i, /funnel/i, /embudo/i, /flujo/i],
    handler: handlePipelineStatus,
    description: "Estado del pipeline",
  },
  {
    patterns: [/\bvip\b/i],
    handler: handleVIPCandidates,
    description: "Candidatos VIP",
  },
  {
    patterns: [/dormant/i, /inactivo/i, /dorm/i, /reactiv/i],
    handler: handleDormantGuests,
    description: "Invitados dormientes",
  },
  {
    patterns: [/qu[ií]mica/i, /compatib/i, /sponsor/i, /impresi[oó]n/i],
    handler: handleChemistry,
    description: "Química y compatibilidad",
  },
  {
    patterns: [/trial/i, /prueba/i],
    handler: handleTrialStatus,
    description: "Estado de trials",
  },
  {
    patterns: [/propuest/i, /proposal/i, /seguimiento/i, /follow.?up/i],
    handler: handleProposals,
    description: "Propuestas pendientes",
  },
  {
    patterns: [/evento/i, /event/i, /privado/i],
    handler: handleEvents,
    description: "Eventos privados",
  },
  {
    patterns: [/problema/i, /riesgo/i, /alerta/i, /cr[ií]tic/i, /urgente/i],
    handler: handleCriticalIssues,
    description: "Problemas críticos",
  },
  {
    patterns: [/benchmark/i, /compar/i, /est[aá]ndar/i],
    handler: handleBenchmark,
    description: "Comparación con benchmark",
  },
  {
    patterns: [/salud/i, /health/i, /score/i],
    handler: handleHealthScore,
    description: "Salud del ecosistema",
  },
];

// ═══════════════════════════════════════════════════════════
// §5 — FALLBACK
// ═══════════════════════════════════════════════════════════

function handleUnsupported(): ConversationResponse {
  return {
    text: "No entendí tu consulta. Puedo ayudarte con: estado del pipeline, invitados listos para membresía, trials activos, invitados dormientes, eventos privados, candidatos VIP, y más. Escribe 'ayuda' para ver todas las opciones.",
    actions: [{
      label: "Ver opciones disponibles",
      server: "guest_management",
      tool: "get_guest_health_score",
      params: {},
      approvalLevel: "auto",
      variant: "secondary",
    }],
    dataSources: [],
  };
}

// ═══════════════════════════════════════════════════════════
// §6 — EXPORTS
// ═══════════════════════════════════════════════════════════

/**
 * Respond to a natural language query from the staff.
 * Pattern-matches the query to an intent, extracts data from
 * the concierge input, and generates a specific, data-driven
 * response with citations.
 *
 * @param query - The staff's natural language query (Spanish)
 * @param input - Enriched dashboard data for response generation
 * @returns ConversationResponse with text, actions, and data sources
 *
 * @example
 * const response = respondToQuery(
 *   "¿Qué guests están listos para membresía?",
 *   conciergeInput,
 * );
 * // response.text → "Hay 3 invitado(s) en etapa 'listo'..."
 * // response.actions → [{ label: "Preparar propuestas", ... }]
 * // response.dataSources → ["pipelineEcosystem"]
 */
export function respondToQuery(
  query: string,
  input: ConciergeInput,
): ConversationResponse {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return handleUnsupported();
  }

  for (const entry of QUERY_REGISTRY) {
    if (entry.patterns.some((p) => p.test(normalizedQuery))) {
      return entry.handler(input);
    }
  }

  return handleUnsupported();
}

/**
 * Create a new conversation exchange with timestamp.
 * Used by the AskBar to build conversation history.
 *
 * @param query - Original query string
 * @param response - The concierge's response
 * @returns ConversationExchange with ISO timestamp
 */
export function createExchange(
  query: string,
  response: ConversationResponse,
): ConversationExchange {
  return {
    query,
    response,
    timestamp: new Date().toISOString(),
  };
}