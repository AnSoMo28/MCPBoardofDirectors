// ═══════════════════════════════════════════════════════════
// src/features/guests/constants.ts
// Phase 34 "The Gateway" — Display Constants
// Level 6+ Agency · Production Grade
//
// All visual configuration: labels, colors, backgrounds.
// Every entry has: label, labelKey (i18n), color, bgColor, ariaLabel.
// Extracted from types.ts for clean separation of concerns.
// Re-exported from types.ts for backward compatibility.
//
// §0  Imports
// §1  Phase 30a Display Maps (legacy, backward-compat)
// §2  Phase 12 Display Maps (legacy, backward-compat)
// §3  Phase 34 — Pipeline Stage Display
// §4  Phase 34 — Segment & Temperature Display
// §5  Phase 34 — Dashboard Mode Display
// §6  Phase 34 — Chapter Status Display
// §7  Phase 34 — Signal Display
//
// Checklist: M6.1-10 (accessibility), i18n keys, theme-aware
// ═══════════════════════════════════════════════════════════

import {
  TRIAL_TYPE_DISPLAY,
  TRIAL_STATUS_DISPLAY,
} from "@/shared/types/domain-enums";

import type {
  GuestSegment,
  GuestTemperatureLabel,
  GuestDashboardMode,
  GuestInterestDomain,
  GuestPipelineStage,
  GuestEmitSignal,
  GuestConsumeSignal,
  TrialChapterStatus,
  PrivateEventType,
  PrivateEventStatus,
  GuestPrivilege,
  GuestInsightCategory,
  GuestInsightPriority,
  AccessibleConfigEntry,
} from "./types";

// ═══════════════════════════════════════════════════════════
// §1 — PHASE 30a DISPLAY MAPS (backward-compat preserved)
// ═══════════════════════════════════════════════════════════

export const RELATIONSHIP_OPTIONS = [
  { value: "family", label: "Familiar" },
  { value: "friend", label: "Amigo/a" },
  { value: "colleague", label: "Colega" },
  { value: "business", label: "Contacto comercial" },
  { value: "other", label: "Otro" },
] as const;

export const GUEST_PURPOSE_OPTIONS = [
  { value: "social", label: "Social" },
  { value: "dining", label: "Gastronomía" },
  { value: "sports", label: "Deportes" },
  { value: "pool", label: "Piscina" },
  { value: "event", label: "Evento especial" },
  { value: "meeting", label: "Reunión" },
  { value: "tour", label: "Visita guiada" },
  { value: "other", label: "Otro" },
] as const;

/** Legacy status config — preserved for backward compatibility. */
export const GUEST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "En el club",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  departed: {
    label: "Salió",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  no_show: {
    label: "No se presentó",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const TRIAL_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: "Activo",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  expired: {
    label: "Expirado",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  converted: {
    label: "Convertido",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const TRIAL_TYPE_OPTIONS = [
  { value: "week", label: "1 semana", days: 7 },
  { value: "two_weeks", label: "2 semanas", days: 14 },
  { value: "month", label: "1 mes", days: 30 },
] as const;

// ═══════════════════════════════════════════════════════════
// §2 — PHASE 12 DISPLAY MAPS (backward-compat preserved)
// ═══════════════════════════════════════════════════════════

export const GUEST_REGISTRY_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  registered: {
    label: "Registrado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  checked_in: {
    label: "En el club",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  completed: {
    label: "Completado",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const PRIVATE_EVENT_TYPE_CONFIG: Record<
  PrivateEventType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  wedding: {
    label: "Boda",
    icon: "heart",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  baptism: {
    label: "Bautizo",
    icon: "droplets",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  birthday: {
    label: "Cumpleaños",
    icon: "cake",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  anniversary: {
    label: "Aniversario",
    icon: "gem",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  corporate: {
    label: "Corporativo",
    icon: "briefcase",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  quinceanera: {
    label: "Quinceañera",
    icon: "sparkles",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  other: {
    label: "Otro",
    icon: "calendar",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

export const PRIVATE_EVENT_STATUS_CONFIG: Record<
  PrivateEventStatus,
  { label: string; color: string; bgColor: string; step: number }
> = {
  inquiry: {
    label: "Consulta",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    step: 0,
  },
  quoted: {
    label: "Cotizado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    step: 1,
  },
  approved: {
    label: "Aprobado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    step: 2,
  },
  contracted: {
    label: "Contratado",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    step: 3,
  },
  deposit_paid: {
    label: "Depósito pagado",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    step: 4,
  },
  confirmed: {
    label: "Confirmado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    step: 5,
  },
  completed: {
    label: "Completado",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
    step: 6,
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    step: -1,
  },
};

/** Trial type display — re-exported from domain-enums master. */
export const TRIAL_TYPE_CONFIG = TRIAL_TYPE_DISPLAY;

/** Trial status display — re-exported from domain-enums master. */
export const TRIAL_STATUS_CONFIG_BACKEND = TRIAL_STATUS_DISPLAY;

export const PRIVILEGE_CONFIG: Record<
  GuestPrivilege,
  { label: string; color: string; bgColor: string }
> = {
  pool: {
    label: "Piscina",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  gym: {
    label: "Gimnasio",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  dining: {
    label: "Gastronomía",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  tennis: {
    label: "Tenis",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  golf: {
    label: "Golf",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 10%, transparent)",
  },
  spa: {
    label: "Spa",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  kids_area: {
    label: "Área infantil",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 10%, transparent)",
  },
  social_events: {
    label: "Eventos sociales",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
};

export const GUEST_INSIGHT_CATEGORY_CONFIG: Record<
  GuestInsightCategory,
  { label: string; color: string; bgColor: string }
> = {
  conversion: {
    label: "Conversión",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  event: {
    label: "Eventos",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  privilege: {
    label: "Privilegios",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  frequency: {
    label: "Frecuencia",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  risk: {
    label: "Riesgo",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  opportunity: {
    label: "Oportunidad",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
};

export const GUEST_INSIGHT_PRIORITY_CONFIG: Record<
  GuestInsightPriority,
  { label: string; color: string; bgColor: string; sortOrder: number }
> = {
  high: {
    label: "Alta",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    sortOrder: 0,
  },
  medium: {
    label: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    sortOrder: 1,
  },
  low: {
    label: "Baja",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    sortOrder: 2,
  },
};

export const EVENT_PIPELINE_STEPS: PrivateEventStatus[] = [
  "inquiry",
  "quoted",
  "approved",
  "contracted",
  "deposit_paid",
  "confirmed",
  "completed",
];

// ═══════════════════════════════════════════════════════════
// §3 — PHASE 34: PIPELINE STAGE DISPLAY
// Full AccessibleConfigEntry with i18n keys + aria labels.
// ═══════════════════════════════════════════════════════════

export const GUEST_PIPELINE_STAGE_CONFIG: Record<
  GuestPipelineStage,
  AccessibleConfigEntry & { readonly step: number }
> = {
  registered: {
    label: "Registrado",
    labelKey: "guest.pipeline.registered",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: registrado, pendiente primera visita",
    step: 0,
  },
  first_visit: {
    label: "Primera visita",
    labelKey: "guest.pipeline.first_visit",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: primera visita completada",
    step: 1,
  },
  trial_active: {
    label: "Trial activo",
    labelKey: "guest.pipeline.trial_active",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: período de prueba activo",
    step: 2,
  },
  ready: {
    label: "Listo para propuesta",
    labelKey: "guest.pipeline.ready",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: listo para propuesta de membresía",
    step: 3,
  },
  converted: {
    label: "Convertido",
    labelKey: "guest.pipeline.converted",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: convertido en miembro",
    step: 4,
  },
  dormant: {
    label: "Dormiente",
    labelKey: "guest.pipeline.dormant",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    ariaLabel: "Etapa del pipeline: dormiente, sin actividad reciente",
    step: -1,
  },
};

export const GUEST_PIPELINE_STEPS: readonly GuestPipelineStage[] = [
  "registered",
  "first_visit",
  "trial_active",
  "ready",
  "converted",
];

// ═══════════════════════════════════════════════════════════
// §4 — PHASE 34: SEGMENT & TEMPERATURE DISPLAY
// ═══════════════════════════════════════════════════════════

export const GUEST_SEGMENT_CONFIG: Record<
  GuestSegment,
  AccessibleConfigEntry & { readonly icon: string }
> = {
  vip: {
    label: "VIP",
    labelKey: "guest.segment.vip",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 15%, transparent)",
    ariaLabel: "Segmento VIP: alto valor e influencia",
    icon: "crown",
  },
  high_potential: {
    label: "Alto potencial",
    labelKey: "guest.segment.high_potential",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    ariaLabel: "Segmento alto potencial: visitas frecuentes, interés creciente",
    icon: "trending-up",
  },
  active_trial: {
    label: "Trial activo",
    labelKey: "guest.segment.active_trial",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    ariaLabel: "Segmento trial activo: en período de prueba",
    icon: "flask",
  },
  warm: {
    label: "Tibio",
    labelKey: "guest.segment.warm",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    ariaLabel: "Segmento tibio: interés moderado",
    icon: "thermometer",
  },
  cold: {
    label: "Frío",
    labelKey: "guest.segment.cold",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    ariaLabel: "Segmento frío: bajo interés actual",
    icon: "snowflake",
  },
  dormant: {
    label: "Dormiente",
    labelKey: "guest.segment.dormant",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    ariaLabel: "Segmento dormiente: sin actividad reciente",
    icon: "moon",
  },
  converted: {
    label: "Convertido",
    labelKey: "guest.segment.converted",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    ariaLabel: "Segmento convertido: se convirtió en miembro",
    icon: "check-circle",
  },
};

export const GUEST_TEMPERATURE_CONFIG: Record<
  GuestTemperatureLabel,
  { color: string; bgColor: string; ariaDescription: string; range: readonly [number, number] }
> = {
  blazing: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
    ariaDescription: "Temperatura máxima: altamente interesado y activo",
    range: [90, 100],
  },
  hot: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    ariaDescription: "Temperatura alta: muy interesado",
    range: [70, 89],
  },
  warm: {
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    ariaDescription: "Temperatura tibia: interés moderado",
    range: [50, 69],
  },
  cool: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    ariaDescription: "Temperatura fresca: interés bajo",
    range: [30, 49],
  },
  cold: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    ariaDescription: "Temperatura fría: interés mínimo",
    range: [10, 29],
  },
  frozen: {
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 8%, transparent)",
    ariaDescription: "Temperatura congelada: sin interés detectable",
    range: [0, 9],
  },
};

export const GUEST_INTEREST_DOMAIN_CONFIG: Record<
  GuestInterestDomain,
  AccessibleConfigEntry
> = {
  sports: {
    label: "Deportes",
    labelKey: "guest.interest.sports",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: deportes",
  },
  dining: {
    label: "Gastronomía",
    labelKey: "guest.interest.dining",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: gastronomía",
  },
  wellness: {
    label: "Bienestar",
    labelKey: "guest.interest.wellness",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: bienestar y spa",
  },
  cultural: {
    label: "Cultural",
    labelKey: "guest.interest.cultural",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: actividades culturales",
  },
  social: {
    label: "Social",
    labelKey: "guest.interest.social",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: eventos sociales",
  },
  pool: {
    label: "Piscina",
    labelKey: "guest.interest.pool",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    ariaLabel: "Dominio de interés: piscina",
  },
  events: {
    label: "Eventos",
    labelKey: "guest.interest.events",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
    ariaLabel: "Dominio de interés: eventos privados",
  },
};

// ═══════════════════════════════════════════════════════════
// §5 — PHASE 34: DASHBOARD MODE DISPLAY
// ═══════════════════════════════════════════════════════════

export const GUEST_DASHBOARD_MODE_CONFIG: Record<
  GuestDashboardMode,
  {
    readonly accent: string;
    readonly glowColor: string;
    readonly pulseMs: number;
    readonly gap: string;
    readonly pad: string;
    readonly ariaAnnouncement: string;
  }
> = {
  calm: {
    accent: "var(--color-teal-400)",
    glowColor: "rgba(42, 154, 181, 0.12)",
    pulseMs: 6000,
    gap: "24px",
    pad: "20px",
    ariaAnnouncement: "Panel de invitados: estado normal, sin alertas",
  },
  alert: {
    accent: "var(--color-amber-400)",
    glowColor: "rgba(212, 160, 23, 0.15)",
    pulseMs: 3000,
    gap: "16px",
    pad: "16px",
    ariaAnnouncement: "Panel de invitados: alerta activa, requiere atención",
  },
  critical: {
    accent: "var(--color-rose-400)",
    glowColor: "rgba(229, 77, 77, 0.18)",
    pulseMs: 1500,
    gap: "8px",
    pad: "12px",
    ariaAnnouncement: "Panel de invitados: estado crítico, acción inmediata requerida",
  },
  celebration: {
    accent: "var(--color-emerald-400)",
    glowColor: "rgba(42, 181, 100, 0.12)",
    pulseMs: 8000,
    gap: "24px",
    pad: "20px",
    ariaAnnouncement: "Panel de invitados: excelente rendimiento",
  },
};

// ═══════════════════════════════════════════════════════════
// §6 — PHASE 34: CHAPTER STATUS DISPLAY
// ═══════════════════════════════════════════════════════════

export const TRIAL_CHAPTER_STATUS_CONFIG: Record<
  TrialChapterStatus,
  AccessibleConfigEntry
> = {
  pending: {
    label: "Pendiente",
    labelKey: "guest.chapter.pending",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    ariaLabel: "Capítulo de trial: pendiente",
  },
  active: {
    label: "En progreso",
    labelKey: "guest.chapter.active",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    ariaLabel: "Capítulo de trial: en progreso",
  },
  completed: {
    label: "Completado",
    labelKey: "guest.chapter.completed",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    ariaLabel: "Capítulo de trial: completado exitosamente",
  },
  skipped: {
    label: "Omitido",
    labelKey: "guest.chapter.skipped",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 8%, transparent)",
    ariaLabel: "Capítulo de trial: omitido",
  },
  failed: {
    label: "No completado",
    labelKey: "guest.chapter.failed",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    ariaLabel: "Capítulo de trial: no completado",
  },
};

// ═══════════════════════════════════════════════════════════
// §7 — PHASE 34: SIGNAL DISPLAY
// Human-readable labels for cross-domain signals.
// Used by intelligence stream and advisor banner.
// ═══════════════════════════════════════════════════════════

export const GUEST_SIGNAL_DISPLAY: Record<
  GuestEmitSignal | GuestConsumeSignal,
  { readonly label: string; readonly color: string; readonly icon: string }
> = {
  guest_pipeline_alert: {
    label: "Pipeline en riesgo",
    color: "var(--color-rose-400)",
    icon: "alert-triangle",
  },
  gst_vip_detected: {
    label: "VIP detectado",
    color: "var(--color-gold-400)",
    icon: "crown",
  },
  gst_conversion_ready: {
    label: "Listo para conversión",
    color: "var(--color-emerald-400)",
    icon: "check-circle",
  },
  gst_trial_expiring: {
    label: "Trial por expirar",
    color: "var(--color-amber-400)",
    icon: "clock",
  },
  gst_dormant_detected: {
    label: "Guest dormiente",
    color: "var(--color-silver-400)",
    icon: "moon",
  },
  gst_feedback_negative: {
    label: "Feedback negativo",
    color: "var(--color-rose-400)",
    icon: "thumbs-down",
  },
  gst_first_impression_alert: {
    label: "Primera impresión negativa",
    color: "var(--color-rose-400)",
    icon: "alert-circle",
  },
  mbr_member_referral: {
    label: "Referido de miembro",
    color: "var(--color-emerald-400)",
    icon: "user-plus",
  },
  fin_spending_detected: {
    label: "Patrón de gasto detectado",
    color: "var(--color-gold-400)",
    icon: "credit-card",
  },
  sat_critical_decline: {
    label: "Caída de satisfacción",
    color: "var(--color-rose-400)",
    icon: "trending-down",
  },
  rec_pending_actions: {
    label: "Acciones recomendadas",
    color: "var(--color-amber-400)",
    icon: "list",
  },
  evt_low_engagement: {
    label: "Baja asistencia a eventos",
    color: "var(--color-teal-400)",
    icon: "calendar-x",
  },
};