// src/features/operations/components/DailyBriefing.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Daily Briefing (Operations Command Center)
// Phase 15 — B1: Foundation Rewrite
//
// Architecture: 2 auto-load queries, differentiated staleTime
//   executive_dashboard/get_executive_summary  (120s) → KPIs + health score
//   executive_dashboard/get_operational_pulse  (60s)  → ops metrics + activities
//
// Health Score: composite metric from 5 weighted factors
//   membership growth · financial · utilization · satisfaction · risk
//
// Upcoming blocks:
//   B2: Cross-agent (compliance alerts + facility health)
//   B3: Anomaly Intelligence (on-demand)
//   B4: AI Operations Advisor (on-demand)
//
// Rules: #1 #2 #4 #5 #7 #11 #12 #14 #15 #17 #18 #20 #21 #22
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Wrench,
  Zap,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Brain,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { Card, Button, Skeleton, showToast } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useDataFreshness } from "@/shared/hooks/useDataFreshness";
import { StaleDataBanner } from "@/shared/components/ui/StaleDataBanner";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { cn, formatNumber, getGreeting } from "@/shared/lib/utils";
import ExportButton from "@/shared/components/export/ExportButton";
import type {
  ExecutiveSummaryResponse,
  ExecutiveSummaryData,
  OperationalPulseResponse,
  ComplianceAlertListResponse,
  ComplianceAlert,
  FacilityOccupancyItem,
  get_facility_occupancy_Contract,
  DetectAnomaliesResponse,
  AnomalyItem,
  QuarterlyInsightGetResponse as QuarterlyInsightsResponse,
} from "@/shared/mocks/contracts";
import type { AnomalyData } from "@/features/dashboard/types";
import './DailyBriefing.css';
/* ══════════════════════════════════════════════════════════
   Health Score — Composite metric (0–100)
   ══════════════════════════════════════════════════════════ */

interface HealthScore {
  score: number;
  level: string;
  color: string;
}

function calculateHealthScore(s: ExecutiveSummaryData): HealthScore {
  const m = s.membership;
  const f = s.financial;
  const o = s.operational;
  const e = s.engagement;

  // Factor 1: Membership growth (0–20)
  //   positive growth ≥ 3% → full marks; negative → near 0
  const growth = Math.min(20, Math.max(0, (m.growth_rate_pct + 2) * 4));

  // Factor 2: Financial health (0–25)
  //   collection rate (0–15) + budget discipline (0–10)
  const collection = f.collection_rate_pct * 0.15;
  const budget = Math.max(0, 10 - Math.abs(f.budget_variance_pct));
  const financial = collection + budget;

  // Factor 3: Facility utilization sweet spot 60–85% (0–15)
  const util =
    o.facility_utilization_pct >= 60 && o.facility_utilization_pct <= 85
      ? 15
      : o.facility_utilization_pct > 85
        ? 10
        : o.facility_utilization_pct * 0.2;

  // Factor 4: Satisfaction — scale 5.0 → 20 (0–20)
  const satisfaction = e.satisfaction_score * 4;

  // Factor 5: Risk management — penalize each at-risk member (0–20)
  const risk = Math.max(0, 20 - m.churn_risk_count * 0.7);

  const total = growth + financial + util + satisfaction + risk;
  const score = Math.round(Math.min(100, Math.max(0, total)));

  if (score >= 85) return { score, level: "Excepcional", color: "var(--color-emerald-400)" };
  if (score >= 65) return { score, level: "Saludable", color: "var(--color-teal-400)" };
  if (score >= 45) return { score, level: "Atención", color: "var(--color-amber-400)" };
  return { score, level: "Crítico", color: "var(--color-rose-400)" };
}

/* ══════════════════════════════════════════════════════════
   Context builder — "3 eventos · 5 mant. · 23 en riesgo"
   ══════════════════════════════════════════════════════════ */

function buildContextLine(s: ExecutiveSummaryData): string {
  const parts: string[] = [];
  const ev = s.operational.events_upcoming;
  const mt = s.operational.maintenance_pending;
  const rk = s.engagement.at_risk_members;

  if (ev > 0) parts.push(`${ev} evento${ev > 1 ? "s" : ""} programado${ev > 1 ? "s" : ""}`);
  if (mt > 0) parts.push(`${mt} mantenimiento${mt > 1 ? "s" : ""} pendiente${mt > 1 ? "s" : ""}`);
  if (rk > 0) parts.push(`${rk} socio${rk > 1 ? "s" : ""} en riesgo`);

  return parts.length > 0 ? parts.join(" · ") : "Todo en orden";
}

/* ══════════════════════════════════════════════════════════
   Trend config
   ══════════════════════════════════════════════════════════ */

const TREND_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  improving:  { label: "Mejorando",    icon: TrendingUp,   color: "var(--color-emerald-400)" },
  stable:     { label: "Estable",      icon: Minus,        color: "var(--color-silver-400)" },
  declining:  { label: "Descendiendo", icon: TrendingDown, color: "var(--color-rose-400)" },
};

const TREND_LABELS: Record<string, string> = {
  membership_growth: "Membresía",
  revenue_trend: "Revenue",
  engagement_trend: "Engagement",
  attendance_trend: "Asistencia",
  satisfaction_trend: "Satisfacción",
};

/* ══════════════════════════════════════════════════════════
   Cross-Agent: Compliance config
   ══════════════════════════════════════════════════════════ */

const RISK_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  medium: {
    label: "Medio",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

const COMPLIANCE_AREA_LABELS: Record<string, string> = {
  safety: "Seguridad",
  health: "Salud",
  legal: "Legal",
  environmental: "Ambiental",
  financial: "Financiero",
  labor: "Laboral",
  food_safety: "Inocuidad",
};

function formatDueDate(dateStr: string): string {
  if (!dateStr) return "Sin fecha";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Vence mañana";
  if (diffDays <= 7) return `Vence en ${diffDays}d`;
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function buildComplianceInsight(
  alerts: ComplianceAlert[],
  summary: ExecutiveSummaryData,
): string {
  const open = alerts.filter((a) => a.status === "open");
  const critical = open.filter((a) => a.risk_level === "critical");
  const high = open.filter((a) => a.risk_level === "high");

  if (open.length === 0) {
    return "Todas las alertas de cumplimiento están resueltas. Operaciones normales.";
  }

  let text = `Hay ${open.length} alerta${open.length > 1 ? "s" : ""} de cumplimiento abierta${open.length > 1 ? "s" : ""}`;

  if (critical.length > 0) {
    text += `, ${critical.length} crítica${critical.length > 1 ? "s" : ""}`;
    if (summary.operational.events_upcoming > 0) {
      text += `. Con ${summary.operational.events_upcoming} evento${summary.operational.events_upcoming > 1 ? "s" : ""} programado${summary.operational.events_upcoming > 1 ? "s" : ""}, recomendamos resolver las alertas críticas antes del próximo evento.`;
    } else {
      text += ". Recomendamos atención inmediata.";
    }
  } else if (high.length > 0) {
    text += `, ${high.length} de prioridad alta. Recomendamos resolverlas esta semana.`;
  } else {
    text += ". Todas de prioridad media o baja — sin urgencia operativa.";
  }

  return text;
}

/* ══════════════════════════════════════════════════════════
   Cross-Agent: Facility config
   ══════════════════════════════════════════════════════════ */

const FACILITY_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  operational: {
    label: "Operativa",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  maintenance: {
    label: "Mantenimiento",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  reserved: {
    label: "Reservada",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  closed: {
    label: "Cerrada",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
};

function buildFacilityInsight(
  facilities: FacilityOccupancyItem[],
  summary: ExecutiveSummaryData,
): string {
  const total = facilities.length;
  const operational = facilities.filter(
    (f) => f.status === "operational",
  ).length;
  const inMaintenance = facilities.filter(
    (f) => f.status === "maintenance",
  ).length;
  const util = summary.operational.facility_utilization_pct;

  let text = `De ${total} instalaciones, ${operational} están operativas`;
  if (inMaintenance > 0) {
    text += ` y ${inMaintenance} en mantenimiento`;
  }
  text += ". ";

  if (util < 60) {
    text += `La utilización del ${util}% está por debajo del objetivo del 65%. Considere promociones especiales.`;
  } else if (util > 85) {
    text += `La utilización del ${util}% está cerca del límite. Considere expandir horarios o agregar actividades.`;
  } else {
    text += `La utilización del ${util}% está en el rango óptimo.`;
  }

  return text;
}
/* ══════════════════════════════════════════════════════════
   Anomaly Intelligence config
   ══════════════════════════════════════════════════════════ */

const ANOMALY_SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: LucideIcon }
> = {
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    borderColor: "var(--color-rose-400)",
    icon: AlertTriangle,
  },
  high: {
    label: "Alto",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    borderColor: "var(--color-amber-400)",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medio",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    borderColor: "var(--color-teal-400)",
    icon: AlertCircle,
  },
  low: {
    label: "Bajo",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    borderColor: "var(--color-silver-400)",
    icon: AlertCircle,
  },
};

const ANOMALY_DOMAIN_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  membership:  { label: "Membresía",  icon: Users,    color: "var(--color-gold-400)" },
  financial:   { label: "Finanzas",   icon: Activity, color: "var(--color-teal-400)" },
  operational: { label: "Operaciones", icon: Wrench,  color: "var(--color-emerald-400)" },
  engagement:  { label: "Engagement", icon: Sparkles, color: "var(--color-amber-400)" },
};
/* ══════════════════════════════════════════════════════════
   AI Operations Advisor — Recommendation Engine
   ══════════════════════════════════════════════════════════ */

interface AdvisorRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low" | "positive";
  icon: LucideIcon;
  category: string;
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    route?: string;
    toast?: string;
  };
}

const RECO_PRIORITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  critical: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
    borderColor: "var(--color-rose-400)",
    label: "Crítico",
  },
  high: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    borderColor: "var(--color-amber-400)",
    label: "Alta",
  },
  medium: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    borderColor: "var(--color-teal-400)",
    label: "Media",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    borderColor: "var(--color-silver-400)",
    label: "Baja",
  },
  positive: {
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    borderColor: "var(--color-emerald-400)",
    label: "Positivo",
  },
};

function generateRecommendations(
  s: ExecutiveSummaryData,
): AdvisorRecommendation[] {
  const recs: AdvisorRecommendation[] = [];
  const m = s.membership;
  const f = s.financial;
  const o = s.operational;
  const e = s.engagement;

  // ── CRITICAL: High churn risk ──
  if (m.churn_risk_count > 15) {
    recs.push({
      id: "rec_churn",
      priority: "critical",
      icon: Users,
      category: "Membresía",
      title: `${m.churn_risk_count} socios en riesgo de cancelación`,
      description:
        "El segmento básico concentra la mayoría del riesgo. Una campaña de retención personalizada puede reducir el churn hasta un 40%.",
      metric: `${m.churn_risk_count} socios`,
      action: {
        label: "Gestionar retención",
        route: "/admin/members",
        toast: "Abriendo gestión de socios — filtre por riesgo de churn",
      },
    });
  }

  // ── HIGH: Collection rate low ──
  if (f.collection_rate_pct < 93) {
    recs.push({
      id: "rec_collection",
      priority: "high",
      icon: Activity,
      category: "Finanzas",
      title: "Cobranza por debajo del objetivo",
      description: `La tasa de cobro es ${f.collection_rate_pct}% (objetivo: 95%). $${formatNumber(f.outstanding_dues)} pendientes de cobro.`,
      metric: `{f.collection_rate_pct}%`,
      action: {
        label: "Gestionar cobranza",
        route: "/admin/finance",
        toast: "Abriendo finanzas — revise facturas pendientes",
      },
    });
  }

  // ── HIGH: NPS below target ──
  if (e.nps_score < 38) {
    recs.push({
      id: "rec_nps",
      priority: "high",
      icon: Sparkles,
      category: "Engagement",
      title: `NPS de +${e.nps_score} requiere atención`,
      description:
        "El NPS está por debajo del objetivo de +40. Identifique los principales detractores y lance una encuesta focalizada.",
      metric: `+${e.nps_score}`,
      action: {
        label: "Ver satisfacción",
        route: "/admin/engagement",
        toast: "Abriendo dashboard de engagement — revise tendencias NPS",
      },
    });
  }

  // ── MEDIUM: Budget overrun ──
  if (f.budget_variance_pct > 8) {
    recs.push({
      id: "rec_budget",
      priority: "medium",
      icon: Activity,
      category: "Finanzas",
      title: `Desviación presupuestaria del ${f.budget_variance_pct}%`,
      description:
        "Los gastos superan el presupuesto. Revise las categorías con mayor desviación y ajuste proyecciones.",
      metric: `${f.budget_variance_pct}%`,
      action: {
        label: "Revisar presupuesto",
        route: "/admin/finance",
        toast: "Abriendo finanzas — revise presupuestos y gastos",
      },
    });
  }

  // ── MEDIUM: Maintenance backlog ──
  if (o.maintenance_pending > 3) {
    recs.push({
      id: "rec_maintenance",
      priority: "medium",
      icon: Wrench,
      category: "Operaciones",
      title: `${o.maintenance_pending} tareas de mantenimiento pendientes`,
      description:
        "El backlog de mantenimiento está creciendo. Priorice las tareas de alta urgencia antes del próximo evento grande.",
      metric: `${o.maintenance_pending} pendientes`,
      action: {
        label: "Ver mantenimiento",
        route: "/operaciones/centro-operaciones",
        toast: "Consulte la sección de Compliance para detalles de mantenimiento",
      },
    });
  }

  // ── MEDIUM: Low facility utilization ──
  if (o.facility_utilization_pct < 65) {
    recs.push({
      id: "rec_utilization",
      priority: "medium",
      icon: Building2,
      category: "Operaciones",
      title: `Utilización de instalaciones al ${o.facility_utilization_pct}%`,
      description:
        "Por debajo del objetivo del 70%. Considere promociones especiales o nuevos horarios para actividades populares.",
      metric: `${o.facility_utilization_pct}%`,
      action: {
        label: "Ver instalaciones",
        route: "/operaciones/centro-operaciones",
        toast: "Consulte la sección de Instalaciones para estado detallado",
      },
    });
  }

  // ── LOW: At-risk members moderate ──
  if (m.churn_risk_count > 5 && m.churn_risk_count <= 15) {
    recs.push({
      id: "rec_churn_moderate",
      priority: "low",
      icon: Users,
      category: "Membresía",
      title: `${m.churn_risk_count} socios en monitoreo de riesgo`,
      description:
        "Nivel de riesgo moderado. Un seguimiento proactivo puede prevenir cancelaciones futuras.",
      metric: `${m.churn_risk_count} socios`,
      action: {
        label: "Ver socios",
        route: "/admin/members",
        toast: "Abriendo gestión de socios",
      },
    });
  }

  // ── POSITIVE: Strong growth ──
  if (m.growth_rate_pct >= 3) {
    recs.push({
      id: "rec_growth_ok",
      priority: "positive",
      icon: Trophy,
      category: "Membresía",
      title: `Crecimiento sólido del ${m.growth_rate_pct}%`,
      description: `+${m.new_this_period} nuevos socios este período, ${m.departures} salidas. Net growth: +${m.net_growth}.`,
      metric: `+${m.growth_rate_pct}%`,
    });
  }

  // ── POSITIVE: Strong revenue ──
  if (f.revenue_growth_pct >= 5) {
    recs.push({
      id: "rec_revenue_ok",
      priority: "positive",
      icon: TrendingUp,
      category: "Finanzas",
      title: `Revenue creciendo al ${f.revenue_growth_pct}%`,
      description: `Ingresos de $$$${(f.revenue / 1_000_000).toFixed(1)}M con margen neto del ${((f.net_income / f.revenue) * 100).toFixed(0)}%. Excelente salud financiera.`,
      metric: `+${f.revenue_growth_pct}%`,
    });
  }

  // ── POSITIVE: High satisfaction ──
  if (e.satisfaction_score >= 4.2) {
    recs.push({
      id: "rec_satisfaction_ok",
      priority: "positive",
      icon: Sparkles,
      category: "Engagement",
      title: `Satisfacción en ${e.satisfaction_score}/5.0`,
      description: `${e.highly_engaged_pct}% de socios altamente comprometidos. ${e.referrals_this_period} referidos este período.`,
      metric: `${e.satisfaction_score}/5.0`,
    });
  }

  // ── OPPORTUNITY: Top growing activity ──
  const topGrower = [...o.top_activities].sort(
    (a, b) => b.change_pct - a.change_pct,
  )[0];
  if (topGrower && topGrower.change_pct > 10) {
    recs.push({
      id: "rec_top_activity",
      priority: "low",
      icon: Zap,
      category: "Oportunidad",
      title: `${topGrower.name} creciendo ${topGrower.change_pct}%`,
      description: `Es la actividad con mayor crecimiento (${formatNumber(topGrower.participation)} participantes). Considere expandir horarios o crear programas avanzados.`,
      metric: `+${topGrower.change_pct}%`,
      action: {
        label: "Ver recomendaciones",
        route: "/admin/recommendations",
        toast: "Abriendo recomendaciones — explore oportunidades de expansión",
      },
    });
  }

  return recs;
}

function generateAdvisorNarrative(s: ExecutiveSummaryData): string {
  const m = s.membership;
  const f = s.financial;
  const o = s.operational;
  const e = s.engagement;

  const parts: string[] = [];

  // Opening — events context
  if (o.events_upcoming > 0) {
    parts.push(
      `Hay ${o.events_upcoming} evento${o.events_upcoming > 1 ? "s" : ""} programado${o.events_upcoming > 1 ? "s" : ""} para hoy.`,
    );
  }

  // Financial health
  if (f.collection_rate_pct >= 94 && f.revenue_growth_pct > 5) {
    parts.push(
      "La salud financiera es sólida con buen crecimiento de ingresos.",
    );
  } else if (f.collection_rate_pct < 93) {
    parts.push(
      "La cobranza necesita atención para mantener el flujo de caja.",
    );
  }

  // Membership
  if (m.churn_risk_count > 15) {
    parts.push(
      `Hay ${m.churn_risk_count} socios en riesgo que requieren acción inmediata.`,
    );
  } else if (m.growth_rate_pct >= 3) {
    parts.push(
      `El crecimiento de membresía de +${m.growth_rate_pct}% es positivo.`,
    );
  }

  // Engagement
  if (e.nps_score >= 40) {
    parts.push(
      `El NPS de +${e.nps_score} refleja buena satisfacción general.`,
    );
  } else if (e.nps_score < 35) {
    parts.push(
      "El NPS sugiere que hay áreas de experiencia del socio que mejorar.",
    );
  }

  // Operational
  if (o.maintenance_pending > 5) {
    parts.push(
      "El backlog de mantenimiento requiere gestión priorizada.",
    );
  }

  return parts.length > 0
    ? parts.join(" ")
    : "Las operaciones del club están dentro de parámetros normales. Revise las recomendaciones abajo para oportunidades de mejora.";
}

function formatContextKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatContextValue(value: number | string): string {
  if (typeof value === "number") {
    if (value >= 10000) return `$${formatNumber(value)}`;
    if (Number.isInteger(value)) return formatNumber(value);
    return value.toFixed(1);
  }
  return String(value);
}

function buildAnomalyInsight(
  anomalies: AnomalyData[],
  summary: ExecutiveSummaryData,
): string {
  const critical = anomalies.filter((a) => a.severity === "critical");
  const high = anomalies.filter((a) => a.severity === "high");
  const domains = [...new Set(anomalies.map((a) => a.domain))];

  if (anomalies.length === 0) {
    return "No se detectaron anomalías significativas. Todas las métricas operan dentro de rangos normales.";
  }

  let text = `Se detectaron ${anomalies.length} anomalía${anomalies.length > 1 ? "s" : ""}`;

  if (critical.length > 0) {
    text += `, ${critical.length} crítica${critical.length > 1 ? "s" : ""}`;
  }
  if (high.length > 0) {
    text += `, ${high.length} de severidad alta`;
  }

  text += ` en ${domains.length} área${domains.length > 1 ? "s" : ""} `;

  const domainLabels = domains
    .map((d) => ANOMALY_DOMAIN_CONFIG[d]?.label ?? d)
    .join(", ");
  text += `(${domainLabels}). `;

  // Cross-reference with summary
  if (critical.length > 0 && summary.operational.events_upcoming > 0) {
    text += `Con ${summary.operational.events_upcoming} evento${summary.operational.events_upcoming > 1 ? "s" : ""} próximo${summary.operational.events_upcoming > 1 ? "s" : ""}, las anomalías críticas requieren atención inmediata.`;
  } else if (high.length > 0) {
    text += "Las anomalías de alta severidad se recomiendan resolver esta semana.";
  } else {
    text += "Todas de severidad media o baja — monitorear evolución.";
  }

  return text;
}


/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

function HealthScoreRing({
  score, level, color, reduced,
}: {
  score: number; level: string; color: string; reduced: boolean;
}) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div
      className="daily-briefing relative w-[108px] h-[108px] flex-shrink-0"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Salud operativa: ${score} de 100, ${level}`}
    >
      <svg viewBox="0 0 108 108" className="w-full h-full -rotate-90">
        <circle cx="54" cy="54" r={r} fill="none"
          stroke="var(--color-surface-3)" strokeWidth="6" />
        <circle cx="54" cy="54" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: reduced ? "none" : "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
          {score}
        </span>
        <span
          className="text-[9px] font-medium font-[family-name:var(--font-ui)] uppercase tracking-wider"
          style={{ color }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

function PulseCard({
  icon: Icon, label, value, subtext, accent,
}: {
  icon: LucideIcon; label: string; value: string;
  subtext: string; accent: string;
}) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-[0.06] -translate-y-3 translate-x-3"
        style={{ backgroundColor: accent }}
      />
      <Icon size={16} className="mb-2" style={{ color: accent }} />
      <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
        {label}
      </p>
      <p className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
        {value}
      </p>
      <p className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] mt-0.5">
        {subtext}
      </p>
    </Card>
  );
}

function ActivityBar({
  name, participation, changePct, max,
}: {
  name: string; participation: number; changePct: number; max: number;
}) {
  const pct = max > 0 ? (participation / max) * 100 : 0;
  const pos = changePct >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
          {name}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
            {formatNumber(participation)}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium font-[family-name:var(--font-mono)]",
              pos ? "text-[var(--color-emerald-400)]" : "text-[var(--color-rose-400)]",
            )}
          >
            {pos ? "+" : ""}{changePct}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-teal-400)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Cross-Agent Sub-Component: Compliance Status
   ══════════════════════════════════════════════════════════ */

function ComplianceStatus({
  summary,
}: {
  summary: ExecutiveSummaryData;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const query = useMCPQuery<ComplianceAlertListResponse>(
    "compliance",
    "compliance_alert_list",
    {},
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const data = query.data;

  /* ── CTA (never fetched) ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-amber-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-[var(--color-amber-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Estado de Cumplimiento
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Ver alertas regulatorias y de cumplimiento que afectan la operación de hoy
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShouldFetch(true)}
            icon={<ShieldCheck className="w-4 h-4" />}
            className="min-h-[44px] flex-shrink-0"
          >
            Verificar
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-amber-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al verificar cumplimiento"
          description="No se pudieron obtener las alertas de cumplimiento."
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  const alerts = data.data;
  const openAlerts = alerts.filter((a) => a.status === "open");
  const criticalCount = openAlerts.filter(
    (a) => a.risk_level === "critical",
  ).length;
  const insight = buildComplianceInsight(alerts, summary);

  /* ── All clear ── */
  if (openAlerts.length === 0) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-emerald-400)]">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={14} className="text-[var(--color-emerald-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
            Cumplimiento al día
          </h3>
        </div>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
          {insight}
        </p>
      </Card>
    );
  }

  /* ── Results ── */
  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-amber-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {criticalCount > 0 ? (
            <ShieldAlert size={14} className="text-[var(--color-rose-400)]" />
          ) : (
            <ShieldCheck size={14} className="text-[var(--color-amber-400)]" />
          )}
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Cumplimiento
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {openAlerts.length} abierta{openAlerts.length > 1 ? "s" : ""}
          </span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[color-mix(in srgb,var(--color-rose-400)15%,transparent)] text-[var(--color-rose-400)]">
              {criticalCount} crítica{criticalCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => query.refetch()}
          className="min-h-[44px] text-xs"
        >
          Refrescar
        </Button>
      </div>

      {/* Alert list — desktop */}
      <div className="hidden sm:block space-y-2 mb-4">
        {openAlerts.map((alert) => {
          const risk = RISK_CONFIG[alert.risk_level] ?? RISK_CONFIG.medium;
          const areaLabel = COMPLIANCE_AREA_LABELS[alert.area] ?? alert.area;
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-xl border-l-3"
              style={{
                borderLeftColor: risk.color,
                backgroundColor: risk.bgColor,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                    style={{ color: risk.color, backgroundColor: risk.bgColor }}
                  >
                    {risk.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    {areaLabel}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
                  {alert.title}
                </p>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] line-clamp-2">
                  {alert.description}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="text-[10px] font-medium font-[family-name:var(--font-mono)] mb-0.5"
                  style={{ color: risk.color }}
                >
                  {formatDueDate(alert.due_date)}
                </p>
                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                  {alert.responsible}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert list — mobile (Rule #21) */}
      <div className="sm:hidden space-y-2 mb-4">
        {openAlerts.map((alert) => {
          const risk = RISK_CONFIG[alert.risk_level] ?? RISK_CONFIG.medium;
          return (
            <div
              key={alert.id}
              className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                  style={{ color: risk.color, backgroundColor: risk.bgColor }}
                >
                  {risk.label}
                </span>
                <span
                  className="text-[10px] font-[family-name:var(--font-mono)]"
                  style={{ color: risk.color }}
                >
                  {formatDueDate(alert.due_date)}
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                {alert.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)]">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={12}
            className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Cross-Agent Sub-Component: Facility Health
   ══════════════════════════════════════════════════════════ */

function FacilityHealth({
  summary,
}: {
  summary: ExecutiveSummaryData;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);
  useBreakpoint();

  const query = useMCPQuery<get_facility_occupancy_Contract["data"]>(
    "facility_management",
    "get_facility_occupancy",
    {},
    { enabled: shouldFetch, staleTime: 120_000 },
  );

  const data = query.data;

  /* ── CTA (never fetched) ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-[var(--color-teal-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Salud de Instalaciones
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Consultar estado operativo, mantenimiento y disponibilidad de todas las instalaciones
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShouldFetch(true)}
            icon={<Building2 className="w-4 h-4" />}
            className="min-h-[44px] flex-shrink-0"
          >
            Consultar
          </Button>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al consultar instalaciones"
          description="No se pudo obtener el estado de las instalaciones."
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  const facilities = data.facilities;
  const insight = buildFacilityInsight(facilities, summary);

  /* ── Status counts ── */
  const statusCounts = facilities.reduce(
    (acc: Record<string, number>, f: FacilityOccupancyItem) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusOrder = ["operational", "reserved", "maintenance", "closed"];
  const withMaintenance = facilities.filter(
    (f: FacilityOccupancyItem) => f.active_maintenance > 0,
  );

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Instalaciones
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {facilities.length} total
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => query.refetch()}
          className="min-h-[44px] text-xs"
        >
          Refrescar
        </Button>
      </div>

      {/* Status overview badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusOrder.map((status) => {
          const count = statusCounts[status];
          if (!count) return null;
          const cfg = FACILITY_STATUS_CONFIG[status] ?? FACILITY_STATUS_CONFIG.operational;
          return (
            <span
              key={status}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium font-[family-name:var(--font-mono)]"
              style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              {count} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Facility grid — desktop (Rule #21) */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
        {facilities.map((f: FacilityOccupancyItem) => {
          const cfg = FACILITY_STATUS_CONFIG[f.status] ?? FACILITY_STATUS_CONFIG.operational;
          return (
            <div
              key={f.facility_id}
              className={cn(
                "p-3 rounded-xl border border-white/[0.06] bg-[var(--color-surface-2)]",
                f.active_maintenance > 0 && "ring-1 ring-[var(--color-amber-400)]/30",
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                  style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] truncate mb-1">
                {f.facility_name}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                <span>{f.capacity} cap.</span>
                {f.active_maintenance > 0 && (
                  <span className="text-[var(--color-amber-400)]">
                    {f.active_maintenance} mant.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Facility list — mobile (Rule #21) */}
      <div className="sm:hidden space-y-1.5 mb-4">
        {facilities.map((f: FacilityOccupancyItem) => {
          const cfg = FACILITY_STATUS_CONFIG[f.status] ?? FACILITY_STATUS_CONFIG.operational;
          return (
            <div
              key={f.facility_id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex-1 truncate">
                {f.facility_name}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0"
                style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active maintenance highlight */}
      {withMaintenance.length > 0 && (
        <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-amber-400)8%,transparent)] border border-[var(--color-amber-400)]/[0.15] mb-4">
          <p className="text-[10px] font-semibold text-[var(--color-amber-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-1">
            Mantenimiento activo
          </p>
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
            {withMaintenance.map((f: FacilityOccupancyItem) => f.facility_name).join(", ")}
            {withMaintenance.length === 1 ? " tiene" : " tienen"}{" "}
            {withMaintenance.reduce((s: number, f: FacilityOccupancyItem) => s + f.active_maintenance, 0)}{" "}
            tarea{withMaintenance.length !== 1 ? "s" : ""} de mantenimiento en curso.
          </p>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)]">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={12}
            className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-component: AnomalyCard (expandable)
   ══════════════════════════════════════════════════════════ */

function AnomalyCard({ anomaly }: { anomaly: AnomalyItem }) {
  const [expanded, setExpanded] = useState(false);
  const sevCfg = ANOMALY_SEVERITY_CONFIG[anomaly.severity] ?? ANOMALY_SEVERITY_CONFIG.medium;
  const domCfg = ANOMALY_DOMAIN_CONFIG[anomaly.domain] ?? { label: anomaly.domain, icon: AlertCircle, color: "var(--color-silver-400)" };
  const DomainIcon = domCfg.icon;
  const SevIcon = sevCfg.icon;
  const contextEntries = Object.entries(anomaly.context);

  return (
    <div
      className="rounded-xl border-l-3 overflow-hidden"
      style={{ borderLeftColor: sevCfg.borderColor }}
    >
      {/* Header — always visible */}
      <Button
        variant="unstyled"
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full p-3.5 flex items-start gap-3 text-left",
          "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
          "min-h-[44px] transition-colors",
        )}
        aria-expanded={expanded}
      >
        <SevIcon
          size={14}
          className="flex-shrink-0 mt-0.5"
          style={{ color: sevCfg.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
              style={{ color: sevCfg.color, backgroundColor: sevCfg.bgColor }}
            >
              {sevCfg.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
              <DomainIcon size={10} style={{ color: domCfg.color }} />
              {domCfg.label}
            </span>
          </div>
          <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
            {anomaly.title}
          </p>
          <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] line-clamp-2">
            {anomaly.description}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--color-silver-500)] flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown size={14} className="text-[var(--color-silver-500)] flex-shrink-0 mt-1" />
        )}
      </Button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3.5 pt-0 bg-[var(--color-surface-2)] space-y-3">
          {/* Context data as mini-metrics */}
          {contextEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-[var(--color-surface-1)] border border-white/[0.04]">
              {contextEntries.map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-0.5">
                    {formatContextKey(key)}
                  </p>
                  <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                    {formatContextValue(value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Suggested action */}
          <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)] border border-[var(--color-gold-400)]/[0.1]">
            <div className="flex items-start gap-2">
              <Lightbulb
                size={12}
                className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-[9px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-0.5">
                  Acción sugerida
                </p>
                <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
                  {anomaly.suggested_action}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ══════════════════════════════════════════════════════════
   Cross-Agent Sub-Component: Anomaly Intelligence
   ══════════════════════════════════════════════════════════ */

const ANOMALY_DOMAINS = [
  { value: "", label: "Todos los dominios" },
  { value: "membership", label: "Membresía" },
  { value: "financial", label: "Finanzas" },
  { value: "operational", label: "Operaciones" },
  { value: "engagement", label: "Engagement" },
];

function AnomalyIntelligence({
  summary,
}: {
  summary: ExecutiveSummaryData;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [showDomainPicker, setShowDomainPicker] = useState(false);

  const query = useMCPQuery<DetectAnomaliesResponse>(
    "executive_dashboard",
    "detect_anomalies",
    { domain: selectedDomain || undefined, sensitivity: "medium" },
    { enabled: shouldFetch, staleTime: 0 },
  );

  const data = query.data;

  /* ── CTA (never fetched) ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target size={18} className="text-[var(--color-rose-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Inteligencia de Anomalías
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Detectar desviaciones en membresía, finanzas, operaciones y engagement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Domain picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDomainPicker(!showDomainPicker)}
                icon={<ChevronDown className="w-3 h-3" />}
                className="text-xs min-h-[44px] hidden sm:inline-flex"
              >
                {selectedDomain
                  ? ANOMALY_DOMAINS.find((d) => d.value === selectedDomain)?.label
                  : "Todos"}
              </Button>
              {showDomainPicker && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--color-surface-1)] border border-white/[0.08] rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[160px]">
                  {ANOMALY_DOMAINS.map((d) => (
                    <Button
                      variant="unstyled"
                      key={d.value}
                      type="button"
                      onClick={() => {
                        setSelectedDomain(d.value);
                        setShowDomainPicker(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs font-[family-name:var(--font-ui)]",
                        "hover:bg-[var(--color-surface-2)] min-h-[44px]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                        selectedDomain === d.value
                          ? "text-[var(--color-gold-400)]"
                          : "text-[var(--color-silver-300)]",
                      )}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => setShouldFetch(true)}
              icon={<Target className="w-4 h-4" />}
              className="min-h-[44px] flex-shrink-0"
            >
              Analizar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !data) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
        <SectionError
          title="Error al analizar anomalías"
          description="No se pudo ejecutar la detección de anomalías."
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  const anomalies = data.anomalies;
  const insight = buildAnomalyInsight(anomalies, summary);

  /* ── Clean bill ── */
  if (anomalies.length === 0) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-emerald-400)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[var(--color-emerald-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
              Sin anomalías detectadas
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Domain picker inline for re-analysis */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDomainPicker(!showDomainPicker)}
                icon={<ChevronDown className="w-3 h-3" />}
                className="text-xs min-h-[44px] hidden sm:inline-flex"
              >
                {selectedDomain
                  ? ANOMALY_DOMAINS.find((d) => d.value === selectedDomain)?.label
                  : "Todos"}
              </Button>
              {showDomainPicker && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--color-surface-1)] border border-white/[0.08] rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[160px]">
                  {ANOMALY_DOMAINS.map((d) => (
                    <Button
                      variant="unstyled"
                      key={d.value}
                      type="button"
                      onClick={() => {
                        setSelectedDomain(d.value);
                        setShowDomainPicker(false);
                        setShouldFetch(true);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs font-[family-name:var(--font-ui)]",
                        "hover:bg-[var(--color-surface-2)] min-h-[44px]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                        selectedDomain === d.value
                          ? "text-[var(--color-gold-400)]"
                          : "text-[var(--color-silver-300)]",
                      )}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShouldFetch(false);
                setSelectedDomain("");
              }}
              className="min-h-[44px] text-xs"
            >
              Nueva búsqueda
            </Button>
          </div>
        </div>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
          {insight}
        </p>
      </Card>
    );
  }

  /* ── Results ── */
  const sevEntries = Object.entries(data.severity_counts).sort(
    ([a], [b]) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (order[a as keyof typeof order] ?? 4) -
        (order[b as keyof typeof order] ?? 4)
      );
    },
  );

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-rose-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--color-rose-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Anomalías Detectadas
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {data.total_anomalies}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Domain filter for re-analysis */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDomainPicker(!showDomainPicker)}
              icon={<ChevronDown className="w-3 h-3" />}
              className="text-xs min-h-[44px] hidden sm:inline-flex"
            >
              {selectedDomain
                ? ANOMALY_DOMAINS.find((d) => d.value === selectedDomain)?.label
                : "Todos"}
            </Button>
            {showDomainPicker && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--color-surface-1)] border border-white/[0.08] rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[160px]">
                {ANOMALY_DOMAINS.map((d) => (
                  <Button
                    variant="unstyled"
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setSelectedDomain(d.value);
                      setShowDomainPicker(false);
                      setShouldFetch(true);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs font-[family-name:var(--font-ui)]",
                      "hover:bg-[var(--color-surface-2)] min-h-[44px]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                      selectedDomain === d.value
                        ? "text-[var(--color-gold-400)]"
                        : "text-[var(--color-silver-300)]",
                    )}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            icon={<RefreshCw className={cn("w-3 h-3", query.isLoading && "animate-spin")} />}
            className="min-h-[44px] text-xs"
          >
            Re-analizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShouldFetch(false);
              setSelectedDomain("");
            }}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
      </div>

      {/* Severity summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sevEntries.map(([severity, count]) => {
          const cfg = ANOMALY_SEVERITY_CONFIG[severity] ?? ANOMALY_SEVERITY_CONFIG.medium;
          return (
            <span
              key={severity}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium font-[family-name:var(--font-mono)]"
              style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              {count} {cfg.label}
            </span>
          );
        })}
      </div>

      {/* Anomaly cards */}
      <div className="space-y-2 mb-4">
        {anomalies.map((anomaly) => (
          <AnomalyCard key={anomaly.id} anomaly={anomaly as unknown as AnomalyItem} />
        ))}
      </div>

      {/* Cross-reference insight */}
      <div className="p-3 rounded-lg bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)]">
        <div className="flex items-start gap-2">
          <Lightbulb
            size={12}
            className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </Card>
  );
}
/* ══════════════════════════════════════════════════════════
   AI Operations Advisor — Deep Insights Sub-Component
   ══════════════════════════════════════════════════════════ */

function DeepInsightsPanel() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  const query = useMCPQuery<QuarterlyInsightsResponse>(
    "proactive_recommendation",
    "generate_quarterly_insights",
    { action: "generate", year: currentYear, period: currentQuarter },
    { staleTime: 0 },
  );

  const insight = query.data?.insight;

  if (query.isLoading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError || !insight) {
    return (
      <div className="mt-4">
        <SectionError
          title="Error al generar insights"
          description="No se pudo obtener el análisis trimestral profundo."
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Summary narrative */}
      <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
        {insight.summary}
      </p>

      {/* 3-column grid: Achievements / Improvements / Recommendations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Key Achievements */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-emerald-400)6%,transparent)] border border-[var(--color-emerald-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={12} className="text-[var(--color-emerald-400)]" />
            <p className="text-[9px] font-semibold text-[var(--color-emerald-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Logros Clave
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.key_achievements.map((a: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2
                  size={10}
                  className="text-[var(--color-emerald-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-amber-400)6%,transparent)] border border-[var(--color-amber-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-[var(--color-amber-400)]" />
            <p className="text-[9px] font-semibold text-[var(--color-amber-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Áreas de Mejora
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.areas_for_improvement.map((a: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertCircle
                  size={10}
                  className="text-[var(--color-amber-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Strategic Recommendations */}
        <div className="p-3 rounded-xl bg-[color-mix(in srgb,var(--color-gold-400)6%,transparent)] border border-[var(--color-gold-400)]/[0.1]">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb size={12} className="text-[var(--color-gold-400)]" />
            <p className="text-[9px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)]">
              Recomendaciones Estratégicas
            </p>
          </div>
          <ul className="space-y-1.5">
            {insight.recommendations.map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <Sparkles
                  size={10}
                  className="text-[var(--color-gold-400)] flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                  {r}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 p-3 rounded-lg bg-[var(--color-surface-1)] border border-white/[0.04]">
        {[
          {
            label: "Socios activos",
            value: formatNumber(insight.total_members_active),
          },
          { label: "Eventos", value: String(insight.events_held) },
          {
            label: "Asist. promedio",
            value: formatNumber(Math.round(insight.avg_event_attendance)),
          },
          {
            label: "Revenue",
            value: `$${(insight.revenue_total / 1000).toFixed(0)}K`,
          },
          {
            label: "Satisfacción",
            value: `${insight.member_satisfaction_avg}/5.0`,
          },
        ].map((stat) => (
          <div key={stat.label} className="text-center px-3">
            <p className="text-[9px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Sub-Component: AI Operations Advisor
   ══════════════════════════════════════════════════════════ */

function AIOperationsAdvisor({
  summary,
}: {
  summary: ExecutiveSummaryData;
}) {

  const { isMobile } = useBreakpoint();
  const [showDeepInsights, setShowDeepInsights] = useState(false);

  const recommendations = useMemo(
    () => generateRecommendations(summary),
    [summary],
  );
  const narrative = useMemo(
    () => generateAdvisorNarrative(summary),
    [summary],
  );

  const criticalRecs = recommendations.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  );
  const mediumRecs = recommendations.filter((r) => r.priority === "medium");
  const positiveRecs = recommendations.filter(
    (r) => r.priority === "positive" || r.priority === "low",
  );

  const handleAction = (rec: AdvisorRecommendation) => {
    if (rec.action?.toast) {
      showToast({ type: "info", message: rec.action.toast });
    }
    if (rec.action?.route) {
      window.location.assign(rec.action.route);
    }
  };

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-[var(--color-gold-400)]" />
        <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
          Asistente Operativo AI
        </h3>
      </div>

      {/* Narrative */}
      <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-5">
        {narrative}
      </p>

      {/* ── Critical / High priority ── */}
      {criticalRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-rose-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} />
            Requiere Atención
          </p>
          <div className="space-y-2">
            {criticalRecs.map((rec) => {
              const cfg = RECO_PRIORITY_CONFIG[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl border-l-3"
                  style={{
                    borderLeftColor: cfg.borderColor,
                    backgroundColor: cfg.bgColor,
                  }}
                >
                  <RecIcon
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                        style={{
                          color: cfg.color,
                          backgroundColor: cfg.bgColor,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        {rec.category}
                      </span>
                      {rec.metric && (
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                          {rec.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
                      {rec.title}
                    </p>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      {rec.description}
                    </p>
                  </div>
                  {rec.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(rec)}
                      icon={<ArrowRight className="w-3 h-3" />}
                      className="flex-shrink-0 min-h-[44px] text-xs hidden sm:inline-flex"
                    >
                      {rec.action.label}
                    </Button>
                  )}
                  {/* Mobile action */}
                  {rec.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(rec)}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="flex-shrink-0 min-h-[44px] sm:hidden"
                      aria-label={rec.action.label}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Medium priority ── */}
      {mediumRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-teal-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <Target size={10} />
            Recomendaciones
          </p>
          <div className="space-y-2">
            {mediumRecs.map((rec) => {
              const cfg = RECO_PRIORITY_CONFIG[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]"
                >
                  <RecIcon
                    size={14}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        {rec.title}
                      </p>
                      {rec.metric && (
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-400)]">
                          {rec.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                      {rec.description}
                    </p>
                  </div>
                  {rec.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(rec)}
                      icon={<ArrowRight className="w-3 h-3" />}
                      className="flex-shrink-0 min-h-[44px] text-xs"
                    >
                      {isMobile ? "" : rec.action.label}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Positive / Opportunities ── */}
      {positiveRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-emerald-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <Trophy size={10} />
            Positivo y Oportunidades
          </p>
          <div className="flex flex-wrap gap-2">
            {positiveRecs.map((rec) => {
              const cfg = RECO_PRIORITY_CONFIG[rec.priority];
              const RecIcon = rec.icon;
              return (
                <Button
                  variant="unstyled"
                  key={rec.id}
                  type="button"
                  onClick={() => rec.action && handleAction(rec)}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-xl border border-white/[0.06]",
                    "bg-[var(--color-surface-2)] max-w-xs",
                    rec.action && "cursor-pointer hover:bg-[var(--color-surface-3)]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                    "min-h-[44px]",
                  )}
                >
                  <RecIcon
                    size={12}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: cfg.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] text-left">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)] text-left line-clamp-1">
                      {rec.metric} — {rec.category}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Deep Insights CTA ── */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        {!showDeepInsights ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                ¿Querés un análisis más profundo?
              </p>
              <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-body)]">
                Insights trimestrales con logros, áreas de mejora y recomendaciones estratégicas
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDeepInsights(true)}
              icon={<Brain className="w-4 h-4" />}
              className="min-h-[44px] flex-shrink-0"
            >
              {isMobile ? "Insights" : "Insights Trimestrales"}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                Insights Trimestrales Profundos
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeepInsights(false)}
                className="min-h-[44px] text-xs"
              >
                Colapsar
              </Button>
            </div>
            <DeepInsightsPanel />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Skeleton
   ══════════════════════════════════════════════════════════ */

function BriefingSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-5 flex items-start gap-5">
        <Skeleton className="w-[108px] h-[108px] rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-4">
            <Skeleton className="h-4 w-4 mb-2" />
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-6 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* Activities */}
      <div className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-3">
            <Skeleton className="h-3 w-full mb-1.5" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function DailyBriefing() {
  const reduced = useReducedMotion();
  const { isMobile } = useBreakpoint();
  const [refreshing, setRefreshing] = useState(false);

  /* ── Queries ── */
  const summaryQ = useMCPQuery<ExecutiveSummaryResponse>(
    "executive_dashboard",
    "get_executive_summary",
    { period: "current_quarter" },
    { staleTime: 120_000 },
  );

  const pulseQ = useMCPQuery<OperationalPulseResponse>(
    "executive_dashboard",
    "get_operational_pulse",
    { period: "current_quarter" },
    { staleTime: 60_000 },
  );

  /* ── Freshness ── */
  const summaryFreshness = useDataFreshness(summaryQ);

  /* ── Derived ── */
  const summary = summaryQ.data?.summary;
  const pulse = pulseQ.data?.operational;

  /* ── Health Score ── */
  const health = useMemo(
    () => (summary ? calculateHealthScore(summary) : null),
    [summary],
  );

  /* ── Motion ── */
  const container = reduced
    ? undefined
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const item = reduced
    ? undefined
    : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  /* ── Refresh ── */
  const handleRefresh = () => {
    setRefreshing(true);
    summaryQ.refetch();
    pulseQ.refetch();
    showToast({ type: "info", message: "Briefing actualizado" });
    setTimeout(() => setRefreshing(false), 1000);
  };

  /* ── Loading ── */
  if (summaryQ.isLoading && !summary) return <BriefingSkeleton />;

  /* ── Error ── */
  if (summaryQ.isError) {
    return (
      <div className="mt-6">
        <SectionError
          title="Error al cargar el briefing"
          description="No se pudo obtener el resumen ejecutivo. Intentá de nuevo."
          onRetry={() => summaryQ.refetch()}
        />
      </div>
    );
  }

  if (!summary || !health) return null;

  /* ── Activities data (prefer pulse, fallback to summary) ── */
  const activities = pulse?.top_activities ?? summary.operational.top_activities;
  const maxPart = Math.max(...activities.map((a) => a.participation), 1);

  /* ── Greeting ── */
  const dateStr = new Date().toLocaleDateString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      variants={container}
      initial={false}
      animate="visible"
      className="space-y-6 mt-6"
    >
      {/* ══════════════════════════════════════════════════════
          1. HEADER — Health Score + Greeting + Summary
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
          <div className="flex items-start gap-5">
            <HealthScoreRing
              score={health.score}
              level={health.level}
              color={health.color}
              reduced={reduced}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)] mb-1">
                {getGreeting()}
              </h2>
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mb-2">
                {dateStr}
              </p>
              <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-2">
                {summaryQ.data?.message}
              </p>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] flex items-center gap-1">
                <Zap size={10} className="text-[var(--color-gold-400)]" />
                {buildContextLine(summary)}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={handleRefresh}
              disabled={refreshing}
              icon={<RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />}
              className="text-xs flex-shrink-0 min-h-[44px]"
            >
              {isMobile ? "" : "Actualizar"}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ── Stale Data ── */}
      {summaryFreshness.isStale && (
        <motion.div variants={item}>
          <StaleDataBanner
            age={summaryFreshness.label}
            onRefresh={handleRefresh}
          />
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════
          2. KPI GRID — 4 executive summary cards
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Membership */}
          <Card className="p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.07] -translate-y-4 translate-x-4 bg-[var(--color-gold-400)]" />
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
              Membresía
            </p>
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
              {formatNumber(summary.membership.total_families)}
            </p>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] mt-1">
              familias · {formatNumber(summary.membership.total_members)} socios
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp size={10} className="text-[var(--color-emerald-400)]" />
              <span className="text-[10px] font-medium text-[var(--color-emerald-400)] font-[family-name:var(--font-mono)]">
                +{summary.membership.growth_rate_pct}%
              </span>
              {summary.membership.churn_risk_count > 0 && (
                <span className="text-[10px] text-[var(--color-amber-400)] font-[family-name:var(--font-mono)] ml-2">
                  {summary.membership.churn_risk_count} en riesgo
                </span>
              )}
            </div>
          </Card>

          {/* Financial */}
          <Card className="p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.07] -translate-y-4 translate-x-4 bg-[var(--color-teal-400)]" />
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
              Revenue
            </p>
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
              ${(summary.financial.revenue / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] mt-1">
              ${(summary.financial.net_income / 1_000_000).toFixed(1)}M neto
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] font-medium text-[var(--color-teal-400)] font-[family-name:var(--font-mono)]">
                {summary.financial.collection_rate_pct}% cobro
              </span>
              <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] ml-2">
                +{summary.financial.revenue_growth_pct}%
              </span>
            </div>
          </Card>

          {/* Operational */}
          <Card className="p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.07] -translate-y-4 translate-x-4 bg-[var(--color-emerald-400)]" />
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
              Operaciones
            </p>
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
              {summary.operational.events_held}
            </p>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] mt-1">
              eventos · {summary.operational.facility_utilization_pct}% utilización
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                {summary.operational.avg_event_attendance} asist. prom.
              </span>
            </div>
          </Card>

          {/* Engagement */}
          <Card className="p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-[0.07] -translate-y-4 translate-x-4 bg-[var(--color-amber-400)]" />
            <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">
              Satisfacción
            </p>
            <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
              {summary.engagement.satisfaction_score}/5.0
            </p>
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)] mt-1">
              NPS {summary.engagement.nps_score > 0 ? "+" : ""}
              {summary.engagement.nps_score}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] font-medium text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                {summary.engagement.highly_engaged_pct}% altamente comprometidos
              </span>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          3. OPERATIONAL PULSE — realtime ops metrics
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        {pulseQ.isError ? (
          <SectionError
            title="Error al cargar pulso operativo"
            description="No se pudieron obtener las métricas operativas."
            onRetry={() => pulseQ.refetch()}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PulseCard
              icon={CalendarDays}
              label="Eventos Próximos"
              value={formatNumber(pulse?.events_upcoming ?? summary.operational.events_upcoming)}
              subtext={`${pulse?.events_held ?? summary.operational.events_held} realizados este período`}
              accent="var(--color-gold-400)"
            />
            <PulseCard
              icon={Activity}
              label="Utilización"
              value={`${pulse?.facility_utilization_pct ?? summary.operational.facility_utilization_pct}%`}
              subtext="de capacidad total"
              accent="var(--color-teal-400)"
            />
            <PulseCard
              icon={Users}
              label="Visitas"
              value={formatNumber(pulse?.guest_visits ?? summary.operational.guest_visits)}
              subtext={`${pulse?.active_trial_memberships ?? summary.operational.active_trial_memberships} trials activos`}
              accent="var(--color-emerald-400)"
            />
            <PulseCard
              icon={Wrench}
              label="Mantenimiento"
              value={formatNumber(pulse?.maintenance_pending ?? summary.operational.maintenance_pending)}
              subtext="tareas pendientes"
              accent="var(--color-amber-400)"
            />
          </div>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          4. TOP ACTIVITIES — participation bars
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[var(--color-teal-400)]" />
            <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Actividades Top
            </h3>
          </div>

          {/* Desktop: horizontal bars */}
          <div className="hidden sm:block space-y-3">
            {activities.map((a) => (
              <ActivityBar
                key={a.name}
                name={a.name}
                participation={a.participation}
                changePct={a.change_pct}
                max={maxPart}
              />
            ))}
          </div>

          {/* Mobile: compact cards (Rule #21) */}
          <div className="sm:hidden space-y-2">
            {activities.map((a) => {
              const pos = a.change_pct >= 0;
              return (
                <div
                  key={a.name}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
                >
                  <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                    {a.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--color-silver-300)]">
                      {formatNumber(a.participation)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium font-[family-name:var(--font-mono)]",
                        pos
                          ? "text-[var(--color-emerald-400)]"
                          : "text-[var(--color-rose-400)]",
                      )}
                    >
                      {pos ? "+" : ""}{a.change_pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          5. TRENDS — directional badges
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider mb-3">
            Tendencias del Período
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.trends).map(([key, value]) => {
              const cfg = TREND_CONFIG[value] ?? TREND_CONFIG.stable;
              const TrendIcon = cfg.icon;
              const label = TREND_LABELS[key] ?? key;
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.06]"
                >
                  <TrendIcon size={10} style={{ color: cfg.color }} />
                  <span className="text-[10px] font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">
                    {label}
                  </span>
                  <span
                    className="text-[10px] font-[family-name:var(--font-mono)]"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          B2 PLACEMENT: Cross-agent (compliance + facilities)
          B3 PLACEMENT: Anomaly Intelligence
          B4 PLACEMENT: AI Operations Advisor
          ══════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════
          AI OPERATIONS ADVISOR
          Client-side intelligence + deep insights on-demand
          Agent: proactive_recommendation · Tool: generate_quarterly_insights
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <AIOperationsAdvisor summary={summary} />
      </motion.div>


      {/* ══════════════════════════════════════════════════════
          CROSS-AGENT: Compliance Status (O3)
          Agent: compliance · Tool: compliance_alert_list
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <ComplianceStatus summary={summary} />
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          CROSS-AGENT: Facility Health
          Agent: facility_management · Tool: get_facility_occupancy
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <FacilityHealth summary={summary} />
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          B3: Anomaly Intelligence (pending)
          B4: AI Operations Advisor (pending)
          ══════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════
          ANOMALY INTELLIGENCE (On-demand AI — Rule #19)
          Agent: executive_dashboard · Tool: detect_anomalies
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <AnomalyIntelligence summary={summary} />
      </motion.div>

      {/* ══════════════════════════════════════════════════════
          B4: AI Operations Advisor (pending)
          ══════════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════════
          6. EXPORT
          ══════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="flex justify-end">
          <ExportButton
            module="daily-briefing"
            onPrint={() =>
              showToast({ type: "info", message: "Vista de impresión disponible — use Ctrl+P" })
            }
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
