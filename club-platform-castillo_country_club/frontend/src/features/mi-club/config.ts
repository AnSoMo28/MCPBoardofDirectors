/**
 * @module features/mi-club/config (Fase 25 — NEW)
 * @note Icon map, priority config, agent constellation config,
 *       quick links, section priority rules.
 */

import {
  Activity,
  CalendarDays,
  CreditCard,
  ClipboardList,
  MapPin,
  Users,
  Heart,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { SectionId } from "./types";

/* ═══════════════════════════════════════
   Recommendation Icon Map
   ═══════════════════════════════════════ */

export const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  event: CalendarDays,
  social: Users,
  wellness: Heart,
  financial: CreditCard,
  engagement: TrendingUp,
  target: Target,
};

/* ═══════════════════════════════════════
   Priority Config
   ═══════════════════════════════════════ */

export const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  high: {
    label: "Alta",
    color: "var(--color-amber-400)",
    bgColor: "rgba(251, 191, 36, 0.1)",
  },
  medium: {
    label: "Media",
    color: "var(--color-teal-400)",
    bgColor: "rgba(45, 212, 191, 0.1)",
  },
  low: {
    label: "Baja",
    color: "var(--color-silver-400)",
    bgColor: "rgba(160, 154, 146, 0.08)",
  },
};

/* ═══════════════════════════════════════
   Agent Constellation Config
   ═══════════════════════════════════════ */

export const AGENT_NODES = [
  {
    id: "finance",
    label: "Finanzas",
    accent: "var(--color-gold-400)",
    route: "/mi-club/cuenta",
  },
  {
    id: "events",
    label: "Eventos",
    accent: "var(--color-teal-400)",
    route: "/mi-club/eventos",
  },
  {
    id: "family",
    label: "Familias",
    accent: "var(--color-emerald-400)",
    route: "/mi-club/familia",
  },
  {
    id: "engagement",
    label: "Engagement",
    accent: "var(--color-rose-400)",
    route: "/mi-club/eventos",
  },
  {
    id: "communication",
    label: "Comunicación",
    accent: "var(--color-teal-400)",
    route: "/mi-club/eventos",
  },
  {
    id: "satisfaction",
    label: "Satisfacción",
    accent: "var(--color-amber-400)",
    route: "/mi-club/encuestas",
  },
  {
    id: "wellness",
    label: "Bienestar",
    accent: "var(--color-teal-400)",
    route: "/mi-club/eventos",
  },
  {
    id: "operations",
    label: "Operaciones",
    accent: "var(--color-silver-400)",
    route: "/mi-club/reservas",
  },
] as const;

/* ═══════════════════════════════════════
   Quick Links (static, never recreated)
   ═══════════════════════════════════════ */

export const QUICK_LINKS: Array<{
  icon: LucideIcon;
  label: string;
  description: string;
  route: string;
  color: string;
}> = [
  {
    icon: Users,
    label: "Mi Familia",
    description: "Perfil, miembros y actividad familiar",
    route: "/mi-club/familia",
    color: "var(--color-gold-400)",
  },
  {
    icon: CalendarDays,
    label: "Eventos",
    description: "Próximos eventos y actividades",
    route: "/mi-club/eventos",
    color: "var(--color-teal-400)",
  },
  {
    icon: MapPin,
    label: "Mis Reservas",
    description: "Reservas activas y pasadas",
    route: "/mi-club/reservas",
    color: "var(--color-emerald-400)",
  },
  {
    icon: CreditCard,
    label: "Mi Cuenta",
    description: "Saldo, movimientos y estado",
    route: "/mi-club/cuenta",
    color: "var(--color-amber-400)",
  },
  {
    icon: ClipboardList,
    label: "Encuestas",
    description: "Encuestas de satisfacción",
    route: "/mi-club/encuestas",
    color: "var(--color-silver-400)",
  },
];

/* ═══════════════════════════════════════
   Default Section Order
   ═══════════════════════════════════════ */

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "brief",
  "predictive",
  "stats",
  "events",
  "recommendations",
  "stream",
  "pulse",
  "seed",
  "links",
];