/**
 * @module features/approvals/paramsConfig (Fase 25 — NEW)
 * @note Tool field definitions, tier labels, value formatter.
 *       Extracted from ParamsPreview.tsx for separation of concerns.
 */

import { formatCurrency } from "@/shared/lib/utils";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type FieldFormat =
  | "currency"
  | "date"
  | "boolean"
  | "csv"
  | "delta";

export interface FieldDef {
  key: string;
  label: string;
  format?: FieldFormat;
  pairedWith?: string; /* for delta: "current_price → suggested_price" */
  priority?: number; /* lower = shown first when collapsed (default 99) */
}

/* ═══════════════════════════════════════
   Tool Field Maps
   ═══════════════════════════════════════ */

export const TOOL_FIELDS: Record<string, FieldDef[]> = {
  plan_private_event: [
    { key: "event_name", label: "Evento", priority: 1 },
    { key: "event_type", label: "Tipo", priority: 2 },
    { key: "venue", label: "Venue", priority: 3 },
    { key: "date", label: "Fecha", format: "date", priority: 4 },
    { key: "start_time", label: "Hora inicio" },
    { key: "end_time", label: "Hora fin" },
    { key: "guest_count", label: "Invitados", priority: 5 },
    { key: "budget", label: "Presupuesto", format: "currency", priority: 6 },
    { key: "coordinator_member_id", label: "Coordinador" },
    { key: "special_requirements", label: "Requisitos especiales" },
    { key: "catering_required", label: "Catering", format: "boolean" },
    { key: "decoration_required", label: "Decoración", format: "boolean" },
    { key: "entertainment_required", label: "Entretenimiento", format: "boolean" },
  ],
  finance_expense_create: [
    { key: "description", label: "Descripción", priority: 1 },
    { key: "amount", label: "Monto", format: "currency", priority: 2 },
    { key: "category", label: "Categoría", priority: 3 },
    { key: "date", label: "Fecha", format: "date", priority: 4 },
    { key: "vendor", label: "Proveedor" },
    { key: "payment_method", label: "Método de pago" },
  ],
  family_create_profile: [
    { key: "family_name", label: "Familia", priority: 1 },
    { key: "tier", label: "Tier", priority: 2 },
    { key: "email", label: "Email", priority: 3 },
    { key: "phone", label: "Teléfono" },
    { key: "primary_member_name", label: "Titular", priority: 4 },
    { key: "primary_member_dob", label: "Nacimiento", format: "date" },
    { key: "address", label: "Dirección" },
  ],
  family_update_members: [
    { key: "action", label: "Acción", priority: 1 },
    { key: "family_id", label: "Familia ID", priority: 2 },
    { key: "member_name", label: "Miembro", priority: 3 },
    { key: "member_dob", label: "Nacimiento", format: "date" },
    { key: "member_role", label: "Rol", priority: 4 },
  ],
  manage_trial_memberships: [
    { key: "guest_name", label: "Invitado", priority: 1 },
    { key: "trial_type", label: "Tipo de trial", priority: 2 },
    { key: "start_date", label: "Inicio", format: "date", priority: 3 },
    { key: "end_date", label: "Fin", format: "date" },
    { key: "referred_by_family_id", label: "Referido por" },
    { key: "privileges", label: "Privilegios", format: "csv" },
  ],
  create_event: [
    { key: "name", label: "Evento", priority: 1 },
    { key: "event_type", label: "Tipo", priority: 2 },
    { key: "date", label: "Fecha", format: "date", priority: 3 },
    { key: "venue", label: "Venue", priority: 4 },
    { key: "capacity", label: "Capacidad" },
    { key: "budget", label: "Presupuesto", format: "currency", priority: 5 },
  ],
  optimize_pricing: [
    { key: "service_name", label: "Servicio", priority: 1 },
    {
      key: "current_price",
      label: "Precio actual → Sugerido",
      format: "delta",
      pairedWith: "suggested_price",
      priority: 2,
    },
    { key: "strategy", label: "Estrategia", priority: 3 },
    { key: "risk_level", label: "Riesgo", priority: 4 },
    { key: "reasoning", label: "Justificación" },
  ],
  suggest_new_activities: [
    { key: "name", label: "Actividad", priority: 1 },
    { key: "description", label: "Descripción", priority: 2 },
    { key: "target_demographic", label: "Demografía" },
    { key: "estimated_cost", label: "Costo estimado", format: "currency", priority: 3 },
    { key: "estimated_interest", label: "Interés estimado" },
    { key: "member_requests_count", label: "Solicitudes", priority: 4 },
    { key: "tags", label: "Tags", format: "csv" },
  ],
  register_guest: [
    { key: "guest_name", label: "Invitado", priority: 1 },
    { key: "family_id", label: "Familia", priority: 2 },
    { key: "visit_date", label: "Fecha de visita", format: "date", priority: 3 },
    { key: "purpose", label: "Propósito" },
    { key: "privileges", label: "Privilegios", format: "csv" },
  ],
  manage_emergency_broadcast: [
    { key: "title", label: "Emergencia", priority: 1 },
    { key: "severity", label: "Severidad", priority: 2 },
    { key: "channels", label: "Canales", format: "csv", priority: 3 },
    { key: "target_audience", label: "Audiencia", format: "csv" },
    { key: "requires_acknowledgment", label: "Requiere acuse", format: "boolean" },
  ],
  communication_insights: [],
  communications_generate_personalized: [
    { key: "family_id", label: "Familia", priority: 1 },
    { key: "channel", label: "Canal", priority: 2 },
    { key: "tone", label: "Tono", priority: 3 },
    { key: "topic", label: "Tema" },
  ],
};

/* ═══════════════════════════════════════
   Tier Labels
   ═══════════════════════════════════════ */

export const TIER_LABELS: Record<string, string> = {
  platino: "Platino",
  oro: "Oro",
  plata: "Plata",
  bronce: "Bronce",
  basic: "Básico",
  premium: "Premium",
  vip: "VIP",
};

/* ═══════════════════════════════════════
   Value Formatter
   ═══════════════════════════════════════ */

export function formatValue(
  value: unknown,
  format?: FieldFormat,
  pairedValue?: unknown,
): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (format) {
    case "currency": {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num)) return String(value);
      return formatCurrency(num);
    }
    case "date": {
      if (
        typeof value === "string" &&
        value.match(/^\d{4}-\d{2}-\d{2}/)
      ) {
        return new Date(
          value + (value.length === 10 ? "T12:00:00" : ""),
        ).toLocaleDateString("es-CR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
      return String(value);
    }
    case "boolean":
      return value ? "Sí" : "No";
    case "csv":
      if (Array.isArray(value)) return value.join(", ");
      return String(value);
    case "delta": {
      const curr = typeof value === "number" ? value : Number(value);
      const next =
        typeof pairedValue === "number"
          ? pairedValue
          : Number(pairedValue);
      if (isNaN(curr) || isNaN(next)) return String(value);
      const diff = ((next - curr) / curr) * 100;
      return `${formatCurrency(curr)} → ${formatCurrency(next)} (${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%)`;
    }
    default:
      if (typeof value === "string" && value in TIER_LABELS) {
        return TIER_LABELS[value];
      }
      if (
        typeof value === "string" &&
        (value === "add" || value === "remove")
      ) {
        return value === "add" ? "Agregar" : "Remover";
      }
      return String(value);
  }
}

/* ═══════════════════════════════════════
   Delta Percentage Helper
   ═══════════════════════════════════════ */

export function getDeltaPercent(
  current: unknown,
  suggested: unknown,
): number | null {
  const curr = typeof current === "number" ? current : Number(current);
  const next =
    typeof suggested === "number" ? suggested : Number(suggested);
  if (isNaN(curr) || isNaN(next) || curr === 0) return null;
  return ((next - curr) / curr) * 100;
}

/* ═══════════════════════════════════════
   Collapsible Threshold
   ═══════════════════════════════════════ */

export const COLLAPSE_THRESHOLD = 5; /* show first N fields, collapse rest */