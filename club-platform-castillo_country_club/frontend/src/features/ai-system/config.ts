/**
 * @module features/ai-system/config (Fase 25 — NEW)
 * @note Section definitions, health thresholds, activity icon maps.
 *       Imports lucide-react icons for runtime use.
 */

import {
  Brain,
  Settings2,
  Sparkles,
  Check,
  CheckCircle2,
  MessageSquare,
  Play,
  type LucideIcon,
} from "lucide-react";
import type {
  SystemHealthLevel,
  SectionId,
  ActivityType,
} from "./types";

/* ═══════════════════════════════════════
   Section Config
   ═══════════════════════════════════════ */

export interface SectionConfig {
  id: SectionId;
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
}

export const AI_SECTIONS: readonly SectionConfig[] = [
  {
    id: "dashboard",
    icon: Brain,
    title: "Dashboard de salud",
    description:
      "Vista general del estado del sistema de IA",
    accentColor: "var(--color-gold-400)",
  },
  {
    id: "commands",
    icon: Brain,
    title: "Comandos de inteligencia",
    description:
      "Consultá, analizá y simulá en español",
    accentColor: "var(--color-gold-400)",
  },
  {
    id: "rules",
    icon: Settings2,
    title: "Autoría de reglas",
    description:
      "Creá reglas de negocio en español — el sistema las convierte en lógica",
    accentColor: "var(--color-teal-400)",
  },
  {
    id: "simulator",
    icon: Sparkles,
    title: "Simulador digital",
    description:
      "Simulá escenarios what-if antes de tomar decisiones",
    accentColor: "var(--color-amber-400)",
  },
] as const;

/* ═══════════════════════════════════════
   System Health Thresholds
   ═══════════════════════════════════════ */

export const SYSTEM_HEALTH_THRESHOLDS: Record<
  SystemHealthLevel,
  { min: number; max: number; label: string; color: string }
> = {
  healthy: {
    min: 80,
    max: 100,
    label: "Saludable",
    color: "var(--color-emerald-400)",
  },
  good: {
    min: 65,
    max: 79,
    label: "Bueno",
    color: "var(--color-teal-400)",
  },
  warning: {
    min: 45,
    max: 64,
    label: "Atención",
    color: "var(--color-amber-400)",
  },
  critical: {
    min: 0,
    max: 44,
    label: "Crítico",
    color: "var(--color-rose-400)",
  },
};

export function getHealthLevel(
  score: number | null,
): SystemHealthLevel {
  if (score === null) return "warning";
  if (score >= 80) return "healthy";
  if (score >= 65) return "good";
  if (score >= 45) return "warning";
  return "critical";
}

/* ═══════════════════════════════════════
   Activity Type Config
   ═══════════════════════════════════════ */

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { icon: LucideIcon; color: string; label: string }
> = {
  analysis: {
    icon: Brain,
    color: "var(--color-gold-400)",
    label: "Análisis",
  },
  proposal: {
    icon: Sparkles,
    color: "var(--color-teal-400)",
    label: "Propuesta",
  },
  approve: {
    icon: CheckCircle2,
    color: "var(--color-emerald-400)",
    label: "Aprobación",
  },
  implement: {
    icon: Check,
    color: "var(--color-emerald-400)",
    label: "Implementación",
  },
  command: {
    icon: MessageSquare,
    color: "var(--color-silver-400)",
    label: "Comando",
  },
  simulation: {
    icon: Play,
    color: "var(--color-amber-400)",
    label: "Simulación",
  },
};

/* ═══════════════════════════════════════
   Awareness Chart Constants
   ═══════════════════════════════════════ */

export const AWARENESS_CHART = {
  width: 400,
  height: 130,
  padding: { top: 12, right: 12, bottom: 26, left: 32 },
  zones: [
    { from: 80, to: 100, level: "healthy" as SystemHealthLevel },
    { from: 65, to: 80, level: "good" as SystemHealthLevel },
    { from: 45, to: 65, level: "warning" as SystemHealthLevel },
    { from: 0, to: 45, level: "critical" as SystemHealthLevel },
  ],
};

/* ═══════════════════════════════════════
   Ring Constants
   ═══════════════════════════════════════ */

export const READINESS_RING = {
  radius: 34,
  strokeWidth: 5,
  size: 76,
};