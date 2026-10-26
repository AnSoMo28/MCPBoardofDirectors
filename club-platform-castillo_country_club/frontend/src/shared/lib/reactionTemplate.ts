// src/shared/lib/reactionTemplate.ts
// ═══════════════════════════════════════════════════════════
// Advisor Reaction System — F22b
// Centralizes reaction insight generation for all domains.
//
// Single source of truth for: reaction text, next step,
// and confidence derivation after Advisor action execution.
//
// 0 API calls. Pure function: (action, insightId) → reaction.
// ═══════════════════════════════════════════════════════════

import type { AdvisorReactionInsight } from "@/features/dashboard/types";
import type { AdvisorCommand } from "@/shared/types/ai-intelligence";

// ── Domain Templates ─────────────────────────────────────

interface ReactionTemplate {
  reaction: (action: AdvisorCommand) => string;
  nextStep: (action: AdvisorCommand) => string;
  baseConfidence: number;
}

/**
 * Templates by MCP server.
 * Each server has domain-specific reaction text and next steps.
 * The `action` param provides: label, estimatedImpact, confirmMessage, tool.
 */
const TEMPLATES: Record<string, ReactionTemplate> = {
  // ── HITL: Approval system ─────────────────────────────
  hitl: {
    reaction: (action) => {
      const count = (action.params?.approve_all_pending as boolean)
        ? "todas las solicitudes pendientes"
        : action.label.toLowerCase();
      return `Se ejecutó la aprobación: ${count}. ${action.estimated_impact ? `Impacto estimado: ${action.estimated_impact}.` : "Las operaciones bloqueadas quedan liberadas."}`;
    },
    nextStep: (action) =>
      action.tool === "approve_request"
        ? "Verificar que los gastos y eventos aprobados se procesen correctamente en el sistema."
        : "Revisar la cola de aprobaciones para confirmar el resultado.",
    baseConfidence: 90,
  },

  // ── Advisor Intelligence: AI-powered analysis ─────────
  advisor_intelligence: {
    reaction: (action) => {
      if (action.tool === "generate_board_brief") {
        return `Briefing ejecutivo generado para el período actual. Incluye health score, anomalías, recomendaciones y Q&A preparado para la Junta Directiva. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "generate_action_plan") {
        return `Plan de acción generado con priorización por urgencia e impacto. Las acciones están organizadas en: hoy / esta semana / este mes. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "simulate_scenario") {
        return `Simulación completada con 3 escenarios (optimista, base, pesimista). Cada uno incluye probabilidades y métricas proyectadas. ${action.estimated_impact ?? ""}`;
      }
      return `Análisis AI completado: ${action.label}. ${action.estimated_impact ?? ""}`;
    },
    nextStep: (action) => {
      if (action.tool === "generate_board_brief") {
        return "Compartir el briefing con la Junta Directiva y agendar revisión antes de la próxima reunión.";
      }
      if (action.tool === "generate_action_plan") {
        return "Revisar las acciones priorizadas y ejecutar las de hoy primero. Las de esta semana pueden planificarse en el calendario.";
      }
      if (action.tool === "simulate_scenario") {
        return "Evaluar el escenario recomendado y tomar la decisión basada en la tolerancia al riesgo del club.";
      }
      return "Revisar el resultado en el dashboard correspondiente.";
    },
    baseConfidence: 80,
  },

  // ── Executive Dashboard: Reports & exports ────────────
  executive_dashboard: {
    reaction: (action) => {
      if (action.tool === "export_report") {
        return `Reporte ejecutivo exportado. Datos consolidados de todos los dominios del club listos para distribución. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "generate_quarterly_board_report") {
        return `Reporte trimestral generado para la Junta Directiva. Incluye análisis financiero, operacional y recomendaciones estratégicas. ${action.estimated_impact ?? ""}`;
      }
      return `Operación ejecutada: ${action.label}. ${action.estimated_impact ?? ""}`;
    },
    nextStep: (action) => {
      if (action.tool === "export_report") {
        return "Distribuir el reporte al equipo directivo y archivar en el repositorio de documentos.";
      }
      if (action.tool === "generate_quarterly_board_report") {
        return "Enviar el reporte a los miembros de la Junta con al menos 48 horas de anticipación a la reunión.";
      }
      return "Revisar el dashboard ejecutivo para ver los datos actualizados.";
    },
    baseConfidence: 90,
  },

  // ── Finance: Budget & accounting ──────────────────────
  finance: {
    reaction: (action) => {
      if (action.tool === "finance_category_update") {
        return `Categoría presupuestaria actualizada: "${String(action.params?.category ?? "seleccionada")}". El Advisor recalculó el impacto en el margen operativo. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "finance_report_generate") {
        return `Reporte financiero generado. Incluye análisis de anomalías, tendencias y recomendaciones. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "finance_expense_create") {
        return `Gasto registrado: ${action.label}. El presupuesto se actualizó automáticamente. ${action.estimated_impact ?? ""}`;
      }
      return `Operación financiera ejecutada: ${action.label}. ${action.estimated_impact ?? ""}`;
    },
    nextStep: (action) => {
      if (action.tool === "finance_category_update") {
        return "Monitorear el impacto real en el próximo cierre mensual y comparar con la estimación del Advisor.";
      }
      if (action.tool === "finance_report_generate") {
        return "Revisar el reporte con el equipo financiero y priorizar las recomendaciones de mayor impacto.";
      }
      return "Verificar el resultado en el dashboard financiero.";
    },
    baseConfidence: 85,
  },

  // ── Events: Calendar & event management ───────────────
  events: {
    reaction: (action) => {
      if (action.tool === "event_manage_capacity") {
        return `Capacidad del evento ajustada. ${action.estimated_impact ?? "El sistema optimizó la distribución de lugares."}`;
      }
      if (action.tool === "event_clone_template") {
        return `Evento clonado como template. El nuevo evento está listo para personalización. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "event_create") {
        return `Evento creado: "${String(action.params?.title ?? action.label)}". ${action.estimated_impact ?? ""}`;
      }
      return `Operación de eventos ejecutada: ${action.label}. ${action.estimated_impact ?? ""}`;
    },
    nextStep: (action) => {
      if (action.tool === "event_manage_capacity") {
        return "Notificar a los socios en lista de espera sobre la disponibilidad actualizada.";
      }
      if (action.tool === "event_clone_template") {
        return "Personalizar el nuevo evento: fecha, descripción, proveedores y enviar invitaciones.";
      }
      if (action.tool === "event_create") {
        return "Confirmar proveedores, configurar RSVPs y enviar invitaciones a los socios objetivo.";
      }
      return "Revisar el calendario de eventos para confirmar los cambios.";
    },
    baseConfidence: 85,
  },

  // ── Guest Management ──────────────────────────────────
  guest_management: {
    reaction: (action) => `Invitado registrado: ${action.label}. ${action.estimated_impact ?? ""}`,
    nextStep: () =>
      "Confirmar los privilegios del invitado y verificar las políticas del club para visitantes.",
    baseConfidence: 90,
  },

  // ── Communication ─────────────────────────────────────
  communication: {
    reaction: (action) => `Comunicación enviada: ${action.label}. ${action.estimated_impact ?? ""}`,
    nextStep: () =>
      "Monitorear la tasa de apertura y engagement de la comunicación en los próximos 48 horas.",
    baseConfidence: 80,
  },

  // ── Wellness: Fitness, spa, health ─────────────────────
  wellness: {
    reaction: (action) => {
      if (action.tool === "wellness_schedule_class") {
        return `Cita de bienestar registrada para ${String(action.params?.member_name ?? "el socio")}. ${action.estimated_impact ?? "La clase quedará pendiente de aprobación antes de confirmar."}`;
      }
      if (action.tool === "wellness_goal_set") {
        return `Meta de bienestar establecida: "${String(action.params?.title ?? "personalizada")}". El Advisor monitoreará el progreso semanalmente. ${action.estimated_impact ?? ""}`;
      }
      if (action.tool === "wellness_profile_update") {
        return `Perfil de bienestar actualizado para ${String(action.params?.family_name ?? "la familia")}. Las recomendaciones se recalcularán automáticamente. ${action.estimated_impact ?? ""}`;
      }
      return `Operación de bienestar ejecutada: ${action.label}. ${action.estimated_impact ?? ""}`;
    },
    nextStep: (action) => {
      if (action.tool === "wellness_schedule_class") {
        return "Confirmar la asistencia y preparar el equipamiento necesario. Verificar horario con la familia.";
      }
      if (action.tool === "wellness_goal_set") {
        return "Monitorear el progreso de la meta en la próxima semana. Si no hay actividad en 7 días, el Advisor sugerirá un ajuste.";
      }
      if (action.tool === "wellness_profile_update") {
        return "Revisar las recomendaciones actualizadas en la pestaña de Advisor del Wellness Dashboard.";
      }
      return "Revisar el dashboard de bienestar para ver los cambios reflejados.";
    },
    baseConfidence: 80,
  },

  // ── Proactive Recommendation ──────────────────────────
  proactive_recommendation: {
    reaction: (action) => `Recomendación ejecutada: ${action.label}. ${action.estimated_impact ?? ""}`,
    nextStep: () =>
      "El Advisor monitoreará el impacto de esta acción en los próximos 7 días.",
    baseConfidence: 75,
  },
};

/** Fallback template for unknown servers */
const DEFAULT_TEMPLATE: ReactionTemplate = {
  reaction: (action) =>
    `Acción ejecutada: ${action.label}. ${action.estimated_impact ?? "El Advisor actualizará los insights con los nuevos datos."}`,
  nextStep: () =>
    "Revisar el dashboard correspondiente para ver los cambios reflejados.",
  baseConfidence: 70,
};

// ── Main Export ──────────────────────────────────────────

/**
 * Generates an AdvisorReactionInsight after an action is executed.
 *
 * Uses the action's `server` field to route to domain-specific templates
 * for reaction text and next step. Falls back to a generic template
 * for unknown servers.
 *
 * @param action - The AdvisorAction that was executed
 * @param sourceInsightId - The ID of the insight that triggered this action
 * @returns AdvisorReactionInsight ready for display in the banner
 */
export function generateReactionInsight(
  action: AdvisorCommand,
  sourceInsightId: string,
): AdvisorReactionInsight {
  const template = TEMPLATES[action.server] ?? DEFAULT_TEMPLATE;

  return {
    id: `reaction_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceInsightId,
    sourceAction: action.label,
    status: "impact_measured",
    executedAt: new Date(),
    reaction: template.reaction(action),
    estimatedImpact: action.estimated_impact ?? "Impacto calculándose",
    nextStep: template.nextStep(action),
    confidence: template.baseConfidence,
    server: action.server,
    tool: action.tool,
  };
}

/**
 * Generates a "executing" state reaction for immediate UI feedback.
 * Shown while the mutation is in progress.
 *
 * @param action - The action being executed
 * @param sourceInsightId - The insight ID
 * @returns AdvisorReactionInsight with status "executing"
 */
export function generateExecutingReaction(
  action: AdvisorCommand,
  sourceInsightId: string,
): AdvisorReactionInsight {
  return {
    id: `reaction_exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceInsightId,
    sourceAction: action.label,
    status: "executing",
    executedAt: new Date(),
    reaction: `Ejecutando: ${action.label}...`,
    estimatedImpact: action.estimated_impact ?? "...",
    nextStep: "...",
    confidence: 0,
    server: action.server,
    tool: action.tool,
  };
}