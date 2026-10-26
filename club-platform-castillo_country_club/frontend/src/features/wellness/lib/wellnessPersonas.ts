/* ═══════════════════════════════════════════════════════════════
   features/wellness/lib/wellnessPersonas.ts
   v36 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Personas Engine
   Fase 23 — Member classification by activity patterns

   Classifies members into behavioral wellness personas based on
   activity breakdown, fitness level, and engagement metrics.

   Each persona maps to cross-domain opportunities:
   - Events: what events to suggest
   - Finance: what premium services to offer
   - Communications: what messaging resonates

   0 API calls. Pure function.

   Changes v36:
     P1: SOCIAL_TYPES, RECOVERY_TYPES, HIGH_INTENSITY_TYPES
         eliminated — derived from ACTIVITY_TYPE_CONFIG via
         isSocial, isRecovery, isHighIntensity predicates
     P10: All classification uses config-derived helpers
   ═══════════════════════════════════════════════════════════════ */

import type {
  WellnessReport,
  WellnessProfile,
  WellnessPersona,
  WellnessPersonaId,
  ActivityType,
} from "../types";
import { isHighIntensity, isRecovery, isSocial } from "../types";

// ── Persona Definitions ──────────────────────────────────

const PERSONAS: Record<WellnessPersonaId, WellnessPersona> = {
  athlete: {
    id: "athlete",
    label: "El Atleta",
    description:
      "Alta frecuencia en gimnasio y deporte, baja recuperación",
    icon: "Dumbbell",
    crossDomain: {
      events: [
        "Torneos deportivos internos",
        "Clínicas de técnica deportiva",
        "Competencias inter-clubs",
      ],
      finance: [
        "Paquete premium de entrenamiento personal",
        "Membresía deportiva VIP",
      ],
      communications: [
        "Newsletters deportivos con tips de rendimiento",
        "Invitaciones a eventos competitivos",
      ],
    },
    riskFactors: [
      "Sobreentrenamiento y lesión por falta de recuperación",
      "Burnout deportivo",
      "Abandono si no hay desafíos nuevos",
    ],
  },

  zen_seeker: {
    id: "zen_seeker",
    label: "El Zen",
    description: "Enfocado en yoga, meditación y bienestar holístico",
    icon: "Flower2",
    crossDomain: {
      events: [
        "Retiros de mindfulness",
        "Talleres de nutrición consciente",
        "Sesiones de meditación al aire libre",
      ],
      finance: [
        "Paquetes de spa y bienestar premium",
        "Programas de retiro personalizado",
      ],
      communications: [
        "Contenido de bienestar holístico",
        "Guías de mindfulness y meditación",
      ],
    },
    riskFactors: [
      "Plateau de progreso sin variedad",
      "Desconexión del componente social del club",
      "Búsqueda de experiencias fuera del club",
    ],
  },

  social_butterfly: {
    id: "social_butterfly",
    label: "El Social",
    description: "Actividades grupales y sociales como motor principal",
    icon: "Users",
    crossDomain: {
      events: [
        "Eventos sociales del club",
        "Actividades familiares grupales",
        "Cenas temáticas y networking",
      ],
      finance: [
        "Membresía familiar premium con beneficios sociales",
        "Paquetes de eventos grupales",
      ],
      communications: [
        "Invitaciones a actividades sociales",
        "Highlight de comunidad y conexiones",
      ],
    },
    riskFactors: [
      "Abandono si sus conexiones sociales se van del club",
      "Dependencia de un grupo específico de socios",
      "Disengagement en temporada baja con menos socios activos",
    ],
  },

  weekend_warrior: {
    id: "weekend_warrior",
    label: "El Finde",
    description: "Actividad concentrada en fines de semana",
    icon: "Calendar",
    crossDomain: {
      events: [
        "Eventos de fin de semana familiares",
        "Torneos sabatinos",
        "Brunch deportivo dominical",
      ],
      finance: [
        "Paquete fin de semana premium",
        "Descuentos para actividades mid-week",
      ],
      communications: [
        "Calendario de actividades de fin de semana",
        "Promociones para diversificar a días laborales",
      ],
    },
    riskFactors: [
      "Progreso inconsistente por concentración de esfuerzo",
      "Mayor riesgo de lesión por esfuerzo concentrado",
      "Cancelación si un fin de semana se pierde",
    ],
  },

  recoverer: {
    id: "recoverer",
    label: "El Recuperador",
    description:
      "Enfocado en spa y recuperación, posible lesión o transición",
    icon: "Heart",
    crossDomain: {
      events: [
        "Talleres de recuperación y prevención",
        "Sesiones de fisioterapia grupal",
        "Charlas de salud y bienestar",
      ],
      finance: [
        "Paquete de rehabilitación personalizado",
        "Servicios de fisioterapia premium",
      ],
      communications: [
        "Seguimiento personalizado de recuperación",
        "Contenido de prevención de lesiones",
      ],
    },
    riskFactors: [
      "Disengagement si la recuperación se estanca",
      "Abandono completo si no se siente apoyado",
      "Transición fallida de vuelta a actividad intensa",
    ],
  },

  explorer: {
    id: "explorer",
    label: "El Explorador",
    description:
      "Alta variedad de actividades, busca experiencias nuevas",
    icon: "Compass",
    crossDomain: {
      events: [
        "Workshops de nuevas disciplinas",
        "Días de prueba de actividades",
        "Eventos temáticos rotativos",
      ],
      finance: [
        "Paquete todo-incluido de actividades",
        "Membresía flexible con acceso múltiple",
      ],
      communications: [
        "Novedades y lanzamientos de actividades",
        "Highlight de actividades poco exploradas",
      ],
    },
    riskFactors: [
      "Engagement superficial sin profundización",
      "Abandono si se agotan las novedades",
      "Dificultad para establecer rutina consistente",
    ],
  },

  dormant: {
    id: "dormant",
    label: "El Dormido",
    description:
      "Actividad mínima o nula — riesgo de churn activo",
    icon: "Moon",
    crossDomain: {
      events: [
        "Evento de bienvenida/reactivación personalizado",
        "Tour de instalaciones con instructor",
        "Actividad de baja barrera de entrada",
      ],
      finance: [
        "Oferta de reactivación con descuento",
        "Paquete de reintroducción al club",
      ],
      communications: [
        "Llamada personalizada de reactivación",
        "Encuesta de satisfacción y motivación",
        "Invitación a evento exclusivo de reintegración",
      ],
    },
    riskFactors: [
      "Churn inminente — cada día de inactividad aumenta la probabilidad",
      "Costo de retención crece exponencialmente con el tiempo",
      "Posible insatisfacción no expresada",
    ],
  },

  newcomer: {
    id: "newcomer",
    label: "El Nuevo",
    description:
      "Perfil reciente con pocos datos — primera impresión crítica",
    icon: "Sparkles",
    crossDomain: {
      events: [
        "Tour de bienvenida con orientación",
        "Actividad introductoria con otros nuevos",
        "Sesión gratuita de entrenamiento personal",
      ],
      finance: [
        "Paquete de onboarding con valor agregado",
        "Trial de servicios premium",
      ],
      communications: [
        "Serie de onboarding (Día 1, 3, 7, 14)",
        "Guía de actividades recomendadas para nuevos",
      ],
    },
    riskFactors: [
      "Primera impresión define retención a 90 días",
      "Desconocimiento de servicios disponibles",
      "Sin conexiones sociales aún",
    ],
  },
};

// ── Classification Engine ────────────────────────────────
// P1: No more local arrays — uses predicates from types.ts

function countByFilter(
  breakdown: WellnessReport["activity_breakdown"],
  predicate: (type: ActivityType) => boolean,
): number {
  return breakdown
    .filter((b) => predicate(b.activity_type))
    .reduce((s, b) => s + b.count, 0);
}

/**
 * Classifies a member into a wellness persona based on activity
 * patterns, fitness level, and engagement metrics.
 *
 * Priority order:
 * 1. Dormant — very low activity + no streak
 * 2. Newcomer — insufficient data (<5 activities)
 * 3. Athlete — high intensity dominant, low recovery
 * 4. Recoverer — spa/meditation dominant
 * 5. Social Butterfly — social activities > 50%
 * 6. Zen Seeker — yoga/meditation primary
 * 7. Weekend Warrior — advanced + intermittent streak + high volume
 * 8. Explorer — high variety (5+ types)
 * 9. Default → Explorer
 */
export function classifyWellnessPersona(
  report: WellnessReport,
  profile?: WellnessProfile | null,
): WellnessPersona {
  const { activity_breakdown, total_activities, streak_days } = report;

  // ── Dormant: very low activity ──
  if (total_activities < 3 && streak_days === 0) {
    return PERSONAS.dormant;
  }

  // ── Newcomer: not enough data ──
  if (total_activities < 5) {
    return PERSONAS.newcomer;
  }

  // ── Activity ratios (P1: config-derived predicates) ──
  const socialCount = countByFilter(activity_breakdown, isSocial);
  const recoveryCount = countByFilter(activity_breakdown, isRecovery);
  const highIntensityCount = countByFilter(
    activity_breakdown,
    isHighIntensity,
  );

  const socialRatio = socialCount / total_activities;
  const recoveryRatio = recoveryCount / total_activities;
  const highIntensityRatio = highIntensityCount / total_activities;

  const sorted = [...activity_breakdown].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const topPct = top ? top.count / total_activities : 0;
  const uniqueTypes = activity_breakdown.length;

  // ── Athlete: high intensity dominant, low recovery ──
  if (highIntensityRatio > 0.65 && recoveryRatio < 0.15) {
    return PERSONAS.athlete;
  }

  // ── Recoverer: spa/meditation dominant ──
  if (recoveryRatio > 0.5) {
    return PERSONAS.recoverer;
  }

  // ── Social Butterfly: social > 50% ──
  if (socialRatio > 0.5) {
    return PERSONAS.social_butterfly;
  }

  // ── Zen Seeker: yoga/meditation primary ──
  if (
    top &&
    (top.activity_type === "yoga" || top.activity_type === "meditation") &&
    topPct > 0.4
  ) {
    return PERSONAS.zen_seeker;
  }

  // ── Weekend Warrior: advanced + intermittent + high volume ──
  if (
    profile?.fitness_level === "advanced" &&
    streak_days >= 1 &&
    streak_days <= 3 &&
    total_activities >= 8
  ) {
    return PERSONAS.weekend_warrior;
  }

  // ── Explorer: high variety ──
  if (uniqueTypes >= 5) {
    return PERSONAS.explorer;
  }

  // ── Default ──
  return PERSONAS.explorer;
}

/** Get a persona by ID */
export function getPersona(id: WellnessPersonaId): WellnessPersona {
  return PERSONAS[id];
}

/** Get all persona definitions */
export function getAllPersonas(): WellnessPersona[] {
  return Object.values(PERSONAS);
}