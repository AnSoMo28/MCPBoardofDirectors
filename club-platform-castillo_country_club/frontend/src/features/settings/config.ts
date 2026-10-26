/**
 * @module features/settings/config (Fase 25 — NEW)
 * @note Backend status display config, section IDs, notification descriptions.
 */

import {
  Clock,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { BackendStatus } from "@/shared/hooks/useBackendHealth";

/* ═══════════════════════════════════════
   Backend Status Display
   ═══════════════════════════════════════ */

export const BACKEND_STATUS_CONFIG: Record<
  BackendStatus,
  { label: string; color: string; bgColor: string; icon: LucideIcon }
> = {
  checking: {
    label: "Verificando\u2026",
    color: "var(--color-silver-400)",
    bgColor: "rgba(160, 154, 146, 0.1)",
    icon: Clock,
  },
  connected: {
    label: "Conectado (MCP)",
    color: "var(--color-emerald-400)",
    bgColor: "rgba(52, 211, 153, 0.1)",
    icon: Wifi,
  },
  error: {
    label: "Desconectado",
    color: "var(--color-rose-400)",
    bgColor: "rgba(251, 113, 133, 0.1)",
    icon: WifiOff,
  },
};

/* ═══════════════════════════════════════
   Notification Descriptions
   ═══════════════════════════════════════ */

export const NOTIFICATION_DESCRIPTIONS: Record<string, string> = {
  email: "Recibir resúmenes y alertas importantes por correo",
  payments: "Alertas sobre cargos, pagos y saldos pendientes",
  announcements: "Anuncios de la administración y la junta directiva",
  recommendations:
    "Sugerencias personalizadas generadas por los agentes de AI",
  weeklyDigest:
    "Resumen semanal de tu actividad, eventos y recomendaciones",
  systemAlerts:
    "Notificaciones críticas del sistema que requieren tu atención",
};

/* ═══════════════════════════════════════
   Agent Nodes for Settings
   ═══════════════════════════════════════ */

export const SETTINGS_AGENT_NODES = [
  {
    id: "finance",
    label: "Finanzas",
    accent: "var(--color-gold-400)",
  },
  {
    id: "events",
    label: "Eventos",
    accent: "var(--color-teal-400)",
  },
  {
    id: "engagement",
    label: "Engagement",
    accent: "var(--color-rose-400)",
  },
  {
    id: "family",
    label: "Familias",
    accent: "var(--color-emerald-400)",
  },
  {
    id: "communication",
    label: "Comunicación",
    accent: "var(--color-teal-400)",
  },
  {
    id: "satisfaction",
    label: "Satisfacción",
    accent: "var(--color-amber-400)",
  },
  {
    id: "wellness",
    label: "Bienestar",
    accent: "var(--color-teal-400)",
  },
  {
    id: "operations",
    label: "Operaciones",
    accent: "var(--color-silver-400)",
  },
] as const;

/* ═══════════════════════════════════════
   App Info Constants
   ═══════════════════════════════════════ */

export const APP_INFO = {
  name: "Castillo Country Club",
  version: "1.0.0-beta",
  framework: "React 18 + TypeScript",
  designSystem: "Silver Tide",
} as const;