/**
 * @hook useMiClubLanding (Fase 25)
 * @module features/mi-club/hooks
 * @note The brain of the socio landing. Composes contextual brief,
 *       predictive actions, adaptive section priority, agent activity,
 *       conversational seeds, club pulse, family stream.
 *       All derived data is memoized.
 */

import { useState, useMemo } from "react";
import {
  CreditCard,
  CalendarDays,
  Heart,
  Sparkles,
  Activity,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { getGreeting, formatCurrency } from "@/shared/lib/utils";
import type { Family, FamilyDetailResponse } from "@/features/families/types";
import type { EventListResponse } from "@/features/events/types";
import { AGENT_NODES, DEFAULT_SECTION_ORDER } from "../config";
import type {
  BriefSegment,
  PredictiveAction,
  AgentActivityItem,
  FamilyStreamItem,
  ClubPulseData,
  FamilyRecommendation,
  FamilyRecommendationsResponse,
  SectionId,
} from "../types";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function getEventTime(eventDate: string): string {
  const d = new Date(eventDate);
  const hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function getEventDateLabel(eventDate: string): string {
  const d = new Date(eventDate);
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth()
  )
    return "Hoy";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth()
  )
    return "Mañana";
  return d.toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
  });
}

/* ═══════════════════════════════════════
   Compose Contextual Brief
   ═══════════════════════════════════════ */

function composeBrief(
  userName: string,
  family: Family | undefined,
  eventCount: number,
): BriefSegment[] {
  const segments: BriefSegment[] = [];
  const firstName = userName.split(" ")[0];
  const greeting = getGreeting();

  /* Opening */
  segments.push({
    text: `${greeting}, ${firstName}.`,
    emphasis: "highlight",
  });

  /* Balance */
  if (family && family.totalBalance < 0) {
    segments.push({
      text: `Tenés un saldo pendiente de ${formatCurrency(Math.abs(family.totalBalance))} que requiere atención.`,
      emphasis: "urgent",
      icon: CreditCard,
    });
  }

  /* Events today */
  if (eventCount > 0) {
    segments.push({
      text: `Hoy hay ${eventCount} evento${eventCount > 1 ? "s" : ""} que podrían interesarte.`,
      emphasis: eventCount >= 2 ? "highlight" : "normal",
      icon: CalendarDays,
    });
  }

  /* Engagement */
  if (family && family.engagementScore < 40) {
    segments.push({
      text: "Tu actividad bajó esta semana. Hay actividades esperándote.",
      emphasis: "normal",
      icon: Heart,
    });
  }

  /* AI awareness */
  segments.push({
    text: "8 agentes están trabajando en tus recomendaciones.",
    emphasis: "normal",
    icon: Sparkles,
  });

  return segments;
}

/* ═══════════════════════════════════════
   Compute Predictive Actions
   ═══════════════════════════════════════ */

function computePredictiveActions(
  family: Family | undefined,
  events: ReadonlyArray<{ title: string; date_start: string }>,
  hasRecs: boolean,
): PredictiveAction[] {
  const actions: PredictiveAction[] = [];

  /* Balance due → urgent payment */
  if (family && family.totalBalance < 0) {
    actions.push({
      id: "pay-balance",
      icon: CreditCard,
      label: "Pagar saldo pendiente",
      description: `${formatCurrency(Math.abs(family.totalBalance))} — mantené tus beneficios activos`,
      color: "var(--color-gold-400)",
      priority: 1,
      route: "/mi-club/cuenta",
    });
  }

  /* Event today → featured */
  const today = new Date();
  const todayEvents = events.filter((e) => {
    const d = new Date(e.date_start);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth()
    );
  });
  if (todayEvents.length > 0) {
    actions.push({
      id: "event-today",
      icon: CalendarDays,
      label: todayEvents[0].title,
      description: `${todayEvents.length} evento${todayEvents.length > 1 ? "s" : ""} hoy — ${getEventTime(todayEvents[0].date_start)}`,
      color: "var(--color-teal-400)",
      priority: 2,
      route: "/mi-club/eventos",
    });
  }

  /* Low engagement → suggest activities */
  if (family && family.engagementScore < 40) {
    actions.push({
      id: "boost-engagement",
      icon: Heart,
      label: "Actividades para vos",
      description: "Explorá eventos y actividades para recuperar tu nivel",
      color: "var(--color-emerald-400)",
      priority: 3,
      route: "/mi-club/eventos",
    });
  }

  /* Fresh recommendations available */
  if (hasRecs) {
    actions.push({
      id: "new-recommendation",
      icon: Sparkles,
      label: "Nueva recomendación AI",
      description: "Tu advisor generó sugerencias personalizadas",
      color: "var(--color-gold-400)",
      priority: 4,
      route: "/mi-club#recommendations",
    });
  }

  /* Default: explore events */
  if (actions.length === 0) {
    actions.push({
      id: "explore-events",
      icon: CalendarDays,
      label: "Explorar eventos",
      description: "Descubrí actividades y experiencias en el club",
      color: "var(--color-teal-400)",
      priority: 10,
      route: "/mi-club/eventos",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

/* ═══════════════════════════════════════
   Compute Section Priority
   ═══════════════════════════════════════ */

function computeSectionOrder(
  family: Family | undefined,
  hasEventToday: boolean,
): SectionId[] {
  const order = [...DEFAULT_SECTION_ORDER];

  if (family && family.totalBalance < 0) {
    /* Payment urgent → move predictive right after brief */
    const idx = order.indexOf("predictive");
    if (idx > 1) {
      order.splice(idx, 1);
      order.splice(1, 0, "predictive");
    }
  } else if (hasEventToday) {
    /* Event today → move events up */
    const idx = order.indexOf("events");
    if (idx > 2) {
      order.splice(idx, 1);
      order.splice(2, 0, "events");
    }
  } else if (family && family.engagementScore < 40) {
    /* Low engagement → move stream up for visibility */
    const idx = order.indexOf("stream");
    if (idx > 3) {
      order.splice(idx, 1);
      order.splice(3, 0, "stream");
    }
  }

  return order;
}

/* ═══════════════════════════════════════
   Compute Agent Activity
   ═══════════════════════════════════════ */

function computeAgentActivity(
  family: Family | undefined,
  eventCount: number,
): AgentActivityItem[] {
  return AGENT_NODES.map((node) => {
    let isActive = false;
    let statusText = "En espera";

    switch (node.id) {
      case "finance":
        isActive = !!family;
        statusText = family
          ? family.totalBalance < 0
            ? "Saldo pendiente detectado"
            : "Cuenta al día"
          : "Cargando...";
        break;
      case "events":
        isActive = eventCount > 0;
        statusText =
          eventCount > 0
            ? `${eventCount} evento${eventCount > 1 ? "s" : ""} disponible${eventCount > 1 ? "s" : ""}`
            : "Sin eventos próximos";
        break;
      case "family":
        isActive = !!family;
        statusText = family
          ? `${family.memberCount} miembro${family.memberCount !== 1 ? "s" : ""}`
          : "Cargando...";
        break;
      case "engagement":
        isActive = !!family;
        statusText = family
          ? family.engagementScore >= 60
            ? "Nivel excelente"
            : family.engagementScore >= 40
              ? "Nivel bueno"
              : "Nivel bajo — activitate"
          : "Cargando...";
        break;
      case "communication":
        isActive = eventCount > 0;
        statusText = "Mensajes al día";
        break;
      case "satisfaction":
        isActive = !!family;
        statusText = "Monitoreando";
        break;
      case "wellness":
        isActive = false;
        statusText = "Próximamente";
        break;
      case "operations":
        isActive = !!family;
        statusText = "Operaciones normales";
        break;
    }

    return {
      id: node.id,
      label: node.label,
      accent: node.accent,
      isActive,
      statusText,
      route: node.route,
    };
  });
}

/* ═══════════════════════════════════════
   Compute Conversational Seeds
   ═══════════════════════════════════════ */

function computeSeeds(
  family: Family | undefined,
  eventCount: number,
): Array<{ prompt: string; route: string; icon: LucideIcon }> {
  const seeds: Array<{
    prompt: string;
    route: string;
    icon: LucideIcon;
  }> = [];

  if (family && family.totalBalance < 0) {
    seeds.push({
      prompt: "¿Cómo pago mi factura?",
      route: "/mi-club/cuenta",
      icon: CreditCard,
    });
  }

  if (eventCount > 0) {
    seeds.push({
      prompt: "¿Qué eventos hay hoy?",
      route: "/mi-club/eventos",
      icon: CalendarDays,
    });
  }

  if (family && family.engagementScore < 50) {
    seeds.push({
      prompt: "¿Qué actividades hay esta semana?",
      route: "/mi-club/eventos",
      icon: Activity,
    });
  }

  seeds.push({
    prompt: "¿Cómo está mi familia en el club?",
    route: "/mi-club/familia",
    icon: TrendingUp,
  });

  return seeds.slice(0, 3);
}

/* ═══════════════════════════════════════
   Compute Club Pulse
   ═══════════════════════════════════════ */

function computeClubPulse(
  family: Family | undefined,
  events: ReadonlyArray<{ title: string; date_start: string }>,
): ClubPulseData {
  const now = new Date();
  const todayEvents = events.filter((e) => {
    const d = new Date(e.date_start);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getHours() > now.getHours()
    );
  });
  const nextEvent = todayEvents[0]
    ? {
        title: todayEvents[0].title,
        time: getEventTime(todayEvents[0].date_start),
      }
    : events[0]
      ? {
          title: events[0].title,
          time: `${getEventDateLabel(events[0].date_start)} ${getEventTime(events[0].date_start)}`,
        }
      : null;

  return {
    nextEvent,
    familyPointsThisMonth: family?.engagementScore ?? 0,
    familyPointsDelta: null /* needs historical data endpoint */,
  };
}

/* ═══════════════════════════════════════
   Compute Family Stream
   ═══════════════════════════════════════ */

function computeStreamItems(
  familyData: FamilyDetailResponse | undefined,
): FamilyStreamItem[] {
  const activities = (familyData as unknown as Record<string, unknown>)
    ?.recentActivity as
    | Array<{ description?: string; timestamp?: string }>
    | undefined;

  if (!activities || activities.length === 0) return [];

  return activities.slice(0, 3).map((a, i) => ({
    id: `stream-${i}`,
    icon: Activity,
    description: a.description ?? "Actividad",
    color: "var(--color-silver-400)",
    timestamp: a.timestamp ?? new Date().toISOString(),
  }));
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useMiClubLanding() {
  const user = useAuthStore((s) => s.user);

  /* ── Family ── */
  const familyQ = useMCPQuery<FamilyDetailResponse>(
    "families",
    "get_family",
    { familyId: user?.familyId || "" },
    { enabled: !!user?.familyId },
  );

  /* ── Events ── */
  const eventsQ = useMCPQuery<EventListResponse>(
    "events",
    "list_events",
    { status: "published", limit: 10 },
  );

  /* ── Recommendations (on-demand) ── */
  const [showRecommendations, setShowRecommendations] =
    useState(false);
  const recsQ = useMCPQuery<FamilyRecommendationsResponse>(
    "proactive_recommendation",
    "generate_family_recommendations",
    { family_id: user?.familyId || "" },
    {
      enabled: showRecommendations && !!user?.familyId,
    },
  );

  /* ── Base data ── */
  const family = familyQ.data?.family;
  const allEvents = eventsQ.data?.events ?? [];
  const upcomingEvents = allEvents.slice(0, 3);
  const recommendations: FamilyRecommendation[] =
    recsQ.data?.recommendations ?? [];
  const isLoading = familyQ.isLoading || eventsQ.isLoading;

  const avatarInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  /* ── Derived: Contextual Brief ── */
  const contextualBrief = useMemo(
    () =>
      composeBrief(
        user?.name ?? "",
        family,
        upcomingEvents.length,
      ),
    [user?.name, family, upcomingEvents.length],
  );

  /* ── Derived: Predictive Actions ── */
  const predictiveActions = useMemo(
    () =>
      computePredictiveActions(
        family,
        allEvents,
        showRecommendations && recommendations.length > 0,
      ),
    [family, allEvents, showRecommendations, recommendations.length],
  );

  /* ── Derived: Section Order ── */
  const today = new Date();
  const hasEventToday = allEvents.some((e) => {
    const d = new Date(e.date_start);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth()
    );
  });

  const sectionOrder = useMemo(
    () => computeSectionOrder(family, hasEventToday),
    [family, hasEventToday],
  );

  /* ── Derived: Agent Activity ── */
  const agentActivity = useMemo(
    () => computeAgentActivity(family, upcomingEvents.length),
    [family, upcomingEvents.length],
  );

  /* ── Derived: Seeds ── */
  const conversationalSeeds = useMemo(
    () => computeSeeds(family, upcomingEvents.length),
    [family, upcomingEvents.length],
  );

  /* ── Derived: Club Pulse ── */
  const clubPulse = useMemo(
    () => computeClubPulse(family, allEvents),
    [family, allEvents],
  );

  /* ── Derived: Family Stream ── */
  const familyStreamItems = useMemo(
    () => computeStreamItems(familyQ.data),
    [familyQ.data],
  );

  return {
    /* Auth */
    user,
    /* Loading */
    isLoading,
    /* Family */
    family,
    familyLoading: familyQ.isLoading,
    familyError: familyQ.isError,
    refetchFamily: familyQ.refetch,
    /* Events */
    upcomingEvents,
    allEvents,
    eventsLoading: eventsQ.isLoading,
    eventsError: eventsQ.isError,
    refetchEvents: eventsQ.refetch,
    /* Recommendations */
    showRecommendations,
    setShowRecommendations,
    recommendations,
    recsLoading: recsQ.isLoading,
    recsError: recsQ.isError,
    refetchRecs: recsQ.refetch,
    /* Derived */
    avatarInitials,
    contextualBrief,
    predictiveActions,
    sectionOrder,
    agentActivity,
    conversationalSeeds,
    clubPulse,
    familyStreamItems,
  };
}