// src/features/operations/components/ComplianceCheck.tsx
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Compliance Check
// Fase 15ext, B2
//
// Pattern: Auto-load with staleTime 300s
//
// Tools:
//   operations_compliance_check (auto, staleTime 300s)
//
// Rules: #1 tokens, #2 no blur, #3 chartTheme, #6 RC,
//   #11 focus-visible, #12 touch, #14 EmptyState,
//   #15 toast, #17 Button, #18 reducedMotion,
//   #20 breakpoint, #21 responsive, #22 cn
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, CheckCircle2,
  AlertCircle, Clock, ChevronDown, ChevronUp,
  Scale, DollarSign, Sparkles,
  PlusCircle, FileText, RefreshCw,
  Target, Lightbulb,
  Brain, ArrowRight, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Card, Button, Skeleton, showToast } from "@/shared/components/ui";
import { SectionError } from "@/shared/components/layout/SectionError";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { useDataFreshness } from "@/shared/hooks/useDataFreshness";
import { StaleDataBanner } from "@/shared/components/ui/StaleDataBanner";
import { formatCurrency, cn, formatNumber } from "@/shared/lib/utils";
import {
  TOOLTIP_STYLE, AXIS_TICK,
} from "@/shared/lib/chartTheme";
import type {
  ComplianceReportResponse,
  ComplianceReportData,
  ComplianceReportItem,
  ComplianceReportAreaSummary,
  ComplianceReportRiskItem,
  ComplianceAlertListResponse,
  ComplianceAlert,
  DetectAnomaliesResponse,
  AnomalyItem,
  QuarterlyInsightGetResponse as QuarterlyInsightsResponse,
} from "@/shared/mocks/contracts";
import ExportButton from "@/shared/components/export/ExportButton";
import { getScoreColor, SCORE_PRESETS } from "@/shared/lib/score-utils";
/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } },
    item: reduced
      ? undefined
      : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
  };
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  compliant: { label: "Cumple", color: "var(--color-emerald-400)", bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)", icon: CheckCircle2 },
  warning: { label: "Alerta", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)", icon: AlertTriangle },
  non_compliant: { label: "No cumple", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)", icon: AlertCircle },
  pending_review: { label: "Pendiente", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)", icon: Clock },
};

const RISK_LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: "Crítico", color: "var(--color-rose-400)", bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)" },
  high: { label: "Alto", color: "var(--color-amber-400)", bgColor: "color-mix(in srgb, var(--color-amber-400) 15%, transparent)" },
  medium: { label: "Medio", color: "var(--color-teal-400)", bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)" },
  low: { label: "Bajo", color: "var(--color-silver-400)", bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)" },
};

const OVERALL_STATUS_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  compliant: { label: "Cumplimiento total", color: "var(--color-emerald-400)", emoji: "✅" },
  needs_attention: { label: "Requiere atención", color: "var(--color-amber-400)", emoji: "⚠️" },
  critical: { label: "Crítico", color: "var(--color-rose-400)", emoji: "🔴" },
};


function scoreColor(pct: number): string {
  return getScoreColor(pct, SCORE_PRESETS.complianceSimple);
}
/* ══════════════════════════════════════════════════════════
   Compliance Health Context
   ══════════════════════════════════════════════════════════ */

function buildComplianceContextLine(
  data: ComplianceReportData,
  alerts: ComplianceAlertListResponse | undefined,
): string {
  const parts: string[] = [];

  const atRisk = data.at_risk_items.length;
  if (atRisk > 0) parts.push(`${atRisk} item${atRisk > 1 ? "s" : ""} en riesgo`);

  const openAlerts = alerts?.open_count ?? 0;
  if (openAlerts > 0) parts.push(`${openAlerts} alerta${openAlerts > 1 ? "s" : ""} abierta${openAlerts > 1 ? "s" : ""}`);

  const nonCompliant = data.items.filter((i) => i.status === "non_compliant").length;
  if (nonCompliant > 0) parts.push(`${nonCompliant} no cumple`);

  const pending = data.items.filter((i) => i.status === "pending_review").length;
  if (pending > 0) parts.push(`${pending} pendiente${pending > 1 ? "s" : ""}`);

  return parts.length > 0 ? parts.join(" · ") : "Todo al día";
}

function buildComplianceInsight(
  data: ComplianceReportData,
  alerts: ComplianceAlertListResponse | undefined,
): string {
  const criticalAlerts = (alerts?.data ?? []).filter(
    (a) => a.status === "open" && (a.risk_level === "critical" || a.risk_level === "high"),
  );
  const urgentItems = data.at_risk_items.filter((r) => r.days_until_deadline <= 7);

  if (criticalAlerts.length === 0 && urgentItems.length === 0) {
    return "El cumplimiento está dentro de parámetros normales. No hay alertas críticas ni vencimientos urgentes.";
  }

  let text = "";
  if (urgentItems.length > 0) {
    text += `${urgentItems.length} item${urgentItems.length > 1 ? "s" : ""} con vencimiento en menos de 7 días requiere atención inmediata. `;
  }
  if (criticalAlerts.length > 0) {
    text += `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} de riesgo alto/crítico abierta${criticalAlerts.length > 1 ? "s" : ""}. `;
  }

  const totalFine = data.at_risk_items.reduce((s, r) => s + r.potential_fine_crc, 0);
  if (totalFine > 0) {
    text += `Multas potenciales: ${formatCurrency(totalFine)}.`;
  }

  return text.trim();
}

function getQuarterDates(): { date_from: string; date_to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3);
  const monthStart = q * 3 + 1;
  const monthEnd = q * 3 + 3;
  const date_from = `${year}-${String(monthStart).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthEnd, 0).getDate();
  const date_to = `${year}-${String(monthEnd).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { date_from, date_to };
}

/* ══════════════════════════════════════════════════════════
   Anomaly Intelligence config (Cross-agent, C2)
   ══════════════════════════════════════════════════════════ */

const ANOMALY_SEV: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  critical: {
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    label: "Crítico",
  },
  high: {
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    label: "Alto",
  },
  medium: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    label: "Medio",
  },
  low: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
    label: "Bajo",
  },
};

const ANOMALY_DOMAIN_LABELS: Record<string, string> = {
  membership: "Membresía",
  financial: "Finanzas",
  operational: "Operaciones",
  engagement: "Engagement",
};

function buildComplianceAnomalyInsight(
  anomalies: AnomalyItem[],
  complianceData: ComplianceReportData,
  alerts: ComplianceAlertListResponse | undefined,
): string {
  if (anomalies.length === 0) {
    return "No se detectaron anomalías que puedan afectar el cumplimiento regulatorio.";
  }

  const critical = anomalies.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );
  const financial = anomalies.filter((a) => a.domain === "financial");
  const operational = anomalies.filter((a) => a.domain === "operational");
  const openAlerts = (alerts?.data ?? []).filter(
    (a) => a.status === "open",
  );
  const atRisk = complianceData.at_risk_items;

  let text = `${anomalies.length} anomalía${anomalies.length > 1 ? "s" : ""} detectada${anomalies.length > 1 ? "s" : ""}`;
  if (critical.length > 0) {
    text += ` (${critical.length} de alta severidad)`;
  }
  text += ". ";

  if (financial.length > 0 && openAlerts.length > 0) {
    text += `Las anomalías financieras podrían impactar la resolución de ${openAlerts.length} alerta${openAlerts.length > 1 ? "s" : ""} de cumplimiento. `;
  }
  if (operational.length > 0 && atRisk.length > 0) {
    text += `Las anomalías operativas podrían retrasar la remediación de ${atRisk.length} item${atRisk.length > 1 ? "s" : ""} en riesgo. `;
  }
  if (critical.length === 0 && openAlerts.length === 0 && atRisk.length === 0) {
    text += "Sin impacto inmediato en el cumplimiento actual. ";
  }

  const totalFine = atRisk.reduce((s, r) => s + r.potential_fine_crc, 0);
  if (totalFine > 0 && critical.length > 0) {
    text += `Multas potenciales en riesgo: ${formatCurrency(totalFine)}.`;
  }

  return text.trim();
}

/* ══════════════════════════════════════════════════════════
   AI Compliance Advisor — Recommendation Engine (C3)
   ══════════════════════════════════════════════════════════ */

interface ComplianceRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low" | "positive";
  icon: typeof ShieldCheck;
  category: string;
  title: string;
  description: string;
  metric?: string;
  action?: {
    label: string;
    toast: string;
  };
}

const COMPLIANCE_RECO_PRIORITY: Record<
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

function generateComplianceRecommendations(
  data: ComplianceReportData,
  alerts: ComplianceAlertListResponse | undefined,
): ComplianceRecommendation[] {
  const recs: ComplianceRecommendation[] = [];

  /* ── CRITICAL: Overdue at-risk items ── */
  const overdue = data.at_risk_items.filter((r) => r.days_until_deadline < 0);
  if (overdue.length > 0) {
    const totalFine = overdue.reduce((s, r) => s + r.potential_fine_crc, 0);
    const worst = overdue.sort(
      (a, b) => a.days_until_deadline - b.days_until_deadline,
    )[0];
    recs.push({
      id: "reco_overdue",
      priority: "critical",
      icon: AlertTriangle,
      category: "Vencimiento",
      title: `${overdue.length} item${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""}`,
      description: `"${worst.requirement}" venció hace ${Math.abs(worst.days_until_deadline)} días. Multas potenciales: ${formatCurrency(totalFine)}.`,
      metric: `${Math.abs(worst.days_until_deadline)}d vencido`,
      action: {
        label: "Resolver ahora",
        toast: `Resolviendo: "${worst.requirement}" — siga los pasos de remediación en la sección de Items en Riesgo`,
      },
    });
  }

  /* ── CRITICAL: Non-compliant items ── */
  const nonCompliant = data.items.filter((i) => i.status === "non_compliant");
  if (nonCompliant.length > 0) {
    recs.push({
      id: "reco_non_compliant",
      priority: "critical",
      icon: AlertCircle,
      category: "No Conforme",
      title: `${nonCompliant.length} item${nonCompliant.length > 1 ? "s" : ""} no conforme${nonCompliant.length > 1 ? "s" : ""}`,
      description: `"${nonCompliant[0].requirement}" requiere acción correctiva inmediata. Responsable: ${nonCompliant[0].responsible}.`,
      metric: `${nonCompliant.length} item${nonCompliant.length > 1 ? "s" : ""}`,
      action: {
        label: "Crear alerta",
        toast: "Crear alerta — funcionalidad de mutación disponible próximamente (C4)",
      },
    });
  }

  /* ── HIGH: Upcoming deadlines (≤14 days) ── */
  const upcoming = data.at_risk_items.filter(
    (r) => r.days_until_deadline >= 0 && r.days_until_deadline <= 14,
  );
  if (upcoming.length > 0) {
    const nearest = upcoming.sort(
      (a, b) => a.days_until_deadline - b.days_until_deadline,
    )[0];
    recs.push({
      id: "reco_upcoming",
      priority: "high",
      icon: Clock,
      category: "Vencimiento Próximo",
      title: `"${nearest.requirement}" vence en ${nearest.days_until_deadline} días`,
      description: `${upcoming.length} item${upcoming.length > 1 ? "s" : ""} con deadline en los próximos 14 días. Priorice la remediación.`,
      metric: `${nearest.days_until_deadline}d`,
      action: {
        label: "Ver pasos",
        toast: `Revise los pasos de remediación para "${nearest.requirement}" en la sección de Items en Riesgo`,
      },
    });
  }

  /* ── HIGH: Critical/high alerts ── */
  const criticalAlerts = (alerts?.data ?? []).filter(
    (a) =>
      a.status === "open" &&
      (a.risk_level === "critical" || a.risk_level === "high"),
  );
  if (criticalAlerts.length > 0) {
    recs.push({
      id: "reco_critical_alerts",
      priority: "high",
      icon: ShieldCheck,
      category: "Alertas",
      title: `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} de riesgo alto/crítico`,
      description: `"${criticalAlerts[0].title}" — ${criticalAlerts[0].area}. Asignada a: ${criticalAlerts[0].responsible}.`,
      metric: `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""}`,
      action: {
        label: "Ver alertas",
        toast: "Revise las alertas activas en la sección superior para más detalles",
      },
    });
  }

  /* ── MEDIUM: Warning items ── */
  const warnings = data.items.filter((i) => i.status === "warning");
  if (warnings.length > 0) {
    recs.push({
      id: "reco_warnings",
      priority: "medium",
      icon: AlertTriangle,
      category: "En Alerta",
      title: `${warnings.length} item${warnings.length > 1 ? "s" : ""} en estado de alerta`,
      description: `Items como "${warnings[0].requirement}" requieren monitoreo. ${warnings[0].notes ? `Nota: ${warnings[0].notes}` : ""}`,
      metric: `${warnings.length} item${warnings.length > 1 ? "s" : ""}`,
    });
  }

  /* ── MEDIUM: Pending review ── */
  const pending = data.items.filter((i) => i.status === "pending_review");
  if (pending.length > 0) {
    recs.push({
      id: "reco_pending",
      priority: "medium",
      icon: FileText,
      category: "Pendiente",
      title: `${pending.length} item${pending.length > 1 ? "s" : ""} pendiente${pending.length > 1 ? "s" : ""} de revisión`,
      description: `Items como "${pending[0].requirement}" esperan revisión o documentación para completar.`,
      metric: `${pending.length} item${pending.length > 1 ? "s" : ""}`,
      action: {
        label: "Registrar documento",
        toast: "Registrar documento — funcionalidad de mutación disponible próximamente (C4)",
      },
    });
  }

  /* ── MEDIUM: Potential fines ── */
  const totalFines = data.at_risk_items.reduce(
    (s, r) => s + r.potential_fine_crc,
    0,
  );
  if (totalFines > 2_000_000) {
    recs.push({
      id: "reco_fines",
      priority: "medium",
      icon: DollarSign,
      category: "Exposición Financiera",
      title: `Multas potenciales de ${formatCurrency(totalFines)}`,
      description:
        "La suma de multas potenciales por incumplimiento supera los ₡2M. Resuelva los items vencidos para eliminar la exposición.",
      metric: formatCurrency(totalFines),
    });
  }

  /* ── LOW: Score below 80 ── */
  if (data.overall_score_pct < 80 && data.overall_score_pct >= 60) {
    recs.push({
      id: "reco_score_medium",
      priority: "low",
      icon: Scale,
      category: "Score",
      title: `Score de cumplimiento al ${data.overall_score_pct}%`,
      description:
        "El score general está por debajo del objetivo del 80%. Enfoque en resolver los items de alta prioridad para elevarlo.",
      metric: `${data.overall_score_pct}%`,
    });
  }

  /* ── POSITIVE: Score >= 80 ── */
  if (data.overall_score_pct >= 80) {
    recs.push({
      id: "reco_score_ok",
      priority: "positive",
      icon: Trophy,
      category: "Score",
      title: `Cumplimiento sólido: ${data.overall_score_pct}/100`,
      description:
        "El score general de cumplimiento supera el objetivo del 80%. Mantenga el monitoreo de los items en alerta.",
      metric: `${data.overall_score_pct}%`,
    });
  }

  /* ── POSITIVE: Areas at 100% ── */
  const perfectAreas = data.area_summaries.filter(
    (a) => a.score_pct === 100,
  );
  if (perfectAreas.length > 0) {
    recs.push({
      id: "reco_perfect_areas",
      priority: "positive",
      icon: CheckCircle2,
      category: "Áreas Ejemplares",
      title: `${perfectAreas.length} área${perfectAreas.length > 1 ? "s" : ""} al 100% de cumplimiento`,
      description: `${perfectAreas.map((a) => a.area).join(", ")}. Excelente gestión regulatoria en estas áreas.`,
      metric: `${perfectAreas.length} área${perfectAreas.length > 1 ? "s" : ""}`,
    });
  }

  /* ── POSITIVE: All open alerts have low risk ── */
  const openAlerts = (alerts?.data ?? []).filter((a) => a.status === "open");
  const lowRiskAlerts = openAlerts.filter((a) => a.risk_level === "low");
  if (
    openAlerts.length > 0 &&
    lowRiskAlerts.length === openAlerts.length
  ) {
    recs.push({
      id: "reco_alerts_low",
      priority: "positive",
      icon: ShieldCheck,
      category: "Alertas",
      title: "Todas las alertas abiertas son de bajo riesgo",
      description:
        "No hay alertas críticas o de alto riesgo pendientes. Las alertas actuales son de bajo impacto.",
      metric: `${openAlerts.length} baja`,
    });
  }

  return recs;
}

function generateComplianceAdvisorNarrative(
  data: ComplianceReportData,
  alerts: ComplianceAlertListResponse | undefined,
): string {
  const parts: string[] = [];

  const score = data.overall_score_pct;
  if (score >= 80) {
    parts.push(
      `El cumplimiento general es sólido con un score de ${score}/100.`,
    );
  } else if (score >= 60) {
    parts.push(
      `El cumplimiento requiere atención con un score de ${score}/100.`,
    );
  } else {
    parts.push(
      `El cumplimiento está en estado crítico con un score de ${score}/100.`,
    );
  }

  const overdue = data.at_risk_items.filter((r) => r.days_until_deadline < 0);
  if (overdue.length > 0) {
    parts.push(
      `Hay ${overdue.length} item${overdue.length > 1 ? "s" : ""} vencido${overdue.length > 1 ? "s" : ""} que requiere${overdue.length === 1 ? "" : "n"} acción inmediata.`,
    );
  }

  const openAlerts = (alerts?.data ?? []).filter((a) => a.status === "open");
  if (openAlerts.length > 0) {
    const criticalAlerts = openAlerts.filter(
      (a) => a.risk_level === "critical" || a.risk_level === "high",
    );
    if (criticalAlerts.length > 0) {
      parts.push(
        `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} de riesgo alto requiere${criticalAlerts.length === 1 ? "" : "n"} gestión.`,
      );
    }
  }

  const perfectAreas = data.area_summaries.filter(
    (a) => a.score_pct === 100,
  );
  if (perfectAreas.length > 0) {
    parts.push(
      `${perfectAreas.length} área${perfectAreas.length > 1 ? "s" : ""} cumple${perfectAreas.length === 1 ? "" : "n"} al 100%: ${perfectAreas.map((a) => a.area).join(", ")}.`,
    );
  }

  return parts.join(" ");
}

/* ══════════════════════════════════════════════════════════
   Custom Tooltip — Area Compliance Chart (Rule #9)
   ══════════════════════════════════════════════════════════ */

interface AreaTooltipPayload {
  payload: ComplianceReportAreaSummary;
}

function AreaComplianceTooltip({ active, payload }: { active?: boolean; payload?: AreaTooltipPayload[] }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE} className="rounded-lg p-3 border border-white/[0.08] shadow-lg min-w-[160px]">
      <p className="text-xs font-bold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-1.5">
        {d.area}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--color-emerald-400)]">Cumple</span>
          <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{d.compliant}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--color-amber-400)]">Alerta</span>
          <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{d.warnings}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--color-rose-400)]">No cumple</span>
          <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{d.non_compliant}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--color-teal-400)]">Pendiente</span>
          <span className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">{d.pending}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
          <span className="text-[10px] text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">Score</span>
          <span className="text-[11px] font-bold font-[family-name:var(--font-mono)]" style={{ color: scoreColor(d.score_pct) }}>
            {d.score_pct}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Cross-Agent Sub-Component: Anomaly Intelligence for Compliance
   ══════════════════════════════════════════════════════════ */

function AnomalySectionForCompliance({
  complianceData,
  alerts,
}: {
  complianceData: ComplianceReportData;
  alerts: ComplianceAlertListResponse | undefined;
}) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const query = useMCPQuery<DetectAnomaliesResponse>(
    "executive_dashboard",
    "detect_anomalies",
    {},
    { enabled: shouldFetch, staleTime: 0 },
  );

  const anomalies = query.data?.anomalies;
  const insight = useMemo(
    () =>
      anomalies
        ? buildComplianceAnomalyInsight(anomalies, complianceData, alerts)
        : "",
    [anomalies, complianceData, alerts],
  );

  /* ── CTA ── */
  if (!shouldFetch) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target size={18} className="text-[var(--color-teal-400)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                Anomalías que Afectan Cumplimiento
              </h3>
              <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
                Detectar desviaciones financieras y operativas que podrían impactar el estado regulatorio
              </p>
            </div>
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
      </Card>
    );
  }

  /* ── Loading ── */
  if (query.isLoading && !anomalies) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  /* ── Error ── */
  if (query.isError || !anomalies) {
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

  /* ── Clean bill ── */
  if (anomalies.length === 0) {
    return (
      <Card className="p-5 border-l-4 border-l-[var(--color-emerald-400)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={14}
              className="text-[var(--color-emerald-400)]"
            />
            <h3 className="text-sm font-semibold text-[var(--color-emerald-400)] font-[family-name:var(--font-ui)]">
              Sin anomalías detectadas
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
        <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)]">
          {insight}
        </p>
      </Card>
    );
  }

  /* ── Results ── */
  const sevCounts: Record<string, number> = {};
  for (const a of anomalies) {
    sevCounts[a.severity] = (sevCounts[a.severity] || 0) + 1;
  }
  const sevOrder = ["critical", "high", "medium", "low"];

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-teal-400)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Anomalías Detectadas
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
            {anomalies.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            icon={<RefreshCw className="w-3 h-3" />}
            className="min-h-[44px] text-xs"
          >
            Re-analizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShouldFetch(false)}
            className="min-h-[44px] text-xs"
          >
            Nueva búsqueda
          </Button>
        </div>
      </div>

      {/* Severity summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sevOrder.map((sev) => {
          const count = sevCounts[sev];
          if (!count) return null;
          const cfg = ANOMALY_SEV[sev] ?? ANOMALY_SEV.medium;
          return (
            <span
              key={sev}
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

      {/* Compact anomaly list */}
      <div className="space-y-2 mb-4">
        {anomalies.map((anomaly) => {
          const sevCfg = ANOMALY_SEV[anomaly.severity] ?? ANOMALY_SEV.medium;
          const domainLabel =
            ANOMALY_DOMAIN_LABELS[anomaly.domain] ?? anomaly.domain;
          return (
            <div
              key={anomaly.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-2)] border border-white/[0.04]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                    style={{
                      color: sevCfg.color,
                      backgroundColor: sevCfg.bgColor,
                    }}
                  >
                    {sevCfg.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                    {domainLabel}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-0.5">
                  {anomaly.title}
                </p>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] line-clamp-1">
                  {anomaly.description}
                </p>
              </div>
            </div>
          );
        })}
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
   AI Compliance Advisor — Deep Insights Sub-Component
   ══════════════════════════════════════════════════════════ */

function ComplianceDeepInsights() {
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
      {/* Summary */}
      <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed">
        {insight.summary}
      </p>

      {/* 3-column grid */}
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
          { label: "Socios activos", value: formatNumber(insight.total_members_active) },
          { label: "Eventos", value: String(insight.events_held) },
          { label: "Asist. promedio", value: formatNumber(Math.round(insight.avg_event_attendance)) },
          { label: "Revenue", value: `$${(insight.revenue_total / 1000).toFixed(0)}K` },
          { label: "Satisfacción", value: `${insight.member_satisfaction_avg}/5.0` },
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
   Main Sub-Component: AI Compliance Advisor
   ══════════════════════════════════════════════════════════ */

function AIComplianceAdvisor({
  complianceData,
  alerts,
}: {
  complianceData: ComplianceReportData;
  alerts: ComplianceAlertListResponse | undefined;
}) {
  const { isMobile } = useBreakpoint();
  const [showDeepInsights, setShowDeepInsights] = useState(false);

  const recommendations = useMemo(
    () => generateComplianceRecommendations(complianceData, alerts),
    [complianceData, alerts],
  );
  const narrative = useMemo(
    () => generateComplianceAdvisorNarrative(complianceData, alerts),
    [complianceData, alerts],
  );

  const criticalRecs = recommendations.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  );
  const mediumRecs = recommendations.filter((r) => r.priority === "medium");
  const positiveRecs = recommendations.filter(
    (r) => r.priority === "positive" || r.priority === "low",
  );

  const handleAction = (rec: ComplianceRecommendation) => {
    if (rec.action?.toast) {
      showToast({ type: "info", message: rec.action.toast });
    }
  };

  return (
    <Card className="p-5 border-l-4 border-l-[var(--color-gold-400)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-[var(--color-gold-400)]" />
        <h3 className="text-sm font-semibold text-[var(--color-gold-400)] font-[family-name:var(--font-ui)]">
          Asistente de Cumplimiento AI
        </h3>
      </div>

      {/* Narrative — uses ai_summary as base + dynamic context */}
      <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed mb-5">
        {narrative}
      </p>

      {/* ── Critical / High priority ── */}
      {criticalRecs.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-semibold text-[var(--color-rose-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} />
            Requiere Atención Inmediata
          </p>
          <div className="space-y-2">
            {criticalRecs.map((rec) => {
              const cfg = COMPLIANCE_RECO_PRIORITY[rec.priority];
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
            <Scale size={10} />
            Recomendaciones
          </p>
          <div className="space-y-2">
            {mediumRecs.map((rec) => {
              const cfg = COMPLIANCE_RECO_PRIORITY[rec.priority];
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
            Positivo
          </p>
          <div className="flex flex-wrap gap-2">
            {positiveRecs.map((rec) => {
              const cfg = COMPLIANCE_RECO_PRIORITY[rec.priority];
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.id}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-xl border border-white/[0.06]",
                    "bg-[var(--color-surface-2)] max-w-xs",
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
                </div>
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
            <ComplianceDeepInsights />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function ComplianceCheck() {
  const reduced = useReducedMotion();
  const motionV = useMotion();
  const { isMobile } = useBreakpoint();

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  /* ── Quarter dates ── */
  const { date_from, date_to } = useMemo(() => getQuarterDates(), []);

  /* ── Queries ── */
  const reportQ = useMCPQuery<ComplianceReportResponse>(
    "compliance",
    "compliance_report_generate",
    { date_from, date_to },
    { staleTime: 300_000 },
  );

  const alertsQ = useMCPQuery<ComplianceAlertListResponse>(
    "compliance",
    "compliance_alert_list",
    {},
    { staleTime: 300_000 },
  );

  /* ── Freshness ── */
  const freshness = useDataFreshness(reportQ);

  /* ── Derived ── */
  const data = reportQ.data?.data;
  const alerts = alertsQ.data;
  const contextLine = useMemo(
    () => (data ? buildComplianceContextLine(data, alerts) : ""),
    [data, alerts],
  );
  useMemo(
        () => (data ? buildComplianceInsight(data, alerts) : ""),
        [data, alerts],
      );

  /* ── Refresh ── */
  const handleRefresh = () => {
    setRefreshing(true);
    reportQ.refetch();
    alertsQ.refetch();
    showToast({ type: "info", message: "Datos de cumplimiento actualizados" });
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (reportQ.isLoading && !data) {
    return (
      <div className="space-y-4 mt-6">
        {/* Overall score card skeleton */}
        <div className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] border-l-4 border-l-[var(--color-silver-600)] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.04]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Chart skeleton */}
        <div className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
        {/* Checklist skeleton */}
        <div className="bg-[var(--color-surface-2)] border border-white/[0.08] shadow-[var(--shadow-card)] rounded-xl p-5">
          <Skeleton className="h-4 w-56 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20 hidden sm:block" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reportQ.isError) {
    return (
      <div className="mt-6">
        <SectionError
          title="Error al cargar cumplimiento"
          description="No se pudo obtener el reporte de cumplimiento regulatorio. Intentá de nuevo."
          onRetry={() => reportQ.refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  const overallCfg = OVERALL_STATUS_CONFIG[data.overall_status] ?? OVERALL_STATUS_CONFIG.needs_attention;

  const filteredItems = statusFilter
    ? data.items.filter((i) => i.status === statusFilter)
    : data.items;

  const statusCounts = {
    compliant: data.items.filter((i) => i.status === "compliant").length,
    warning: data.items.filter((i) => i.status === "warning").length,
    non_compliant: data.items.filter((i) => i.status === "non_compliant").length,
    pending_review: data.items.filter((i) => i.status === "pending_review").length,
  };

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */
  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6 mt-6">

      {/* ── Overall Score ── */}
      <motion.div variants={motionV.item}>
        <Card className="p-5 border-l-4" style={{ borderLeftColor: overallCfg.color }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} style={{ color: overallCfg.color }} />
                <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-[var(--color-silver-100)]">
                  Estado de Cumplimiento
                </h2>
              </div>
              <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                Última auditoría: {new Date(data.last_full_audit).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}Próxima: {new Date(data.next_full_audit).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold font-[family-name:var(--font-display)]"
                  style={{ color: scoreColor(data.overall_score_pct) }}>
                  {data.overall_score_pct}
                </span>
                <span className="text-sm text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mb-1">/100</span>
              </div>
              <p className="text-xs font-medium font-[family-name:var(--font-ui)] mt-0.5" style={{ color: overallCfg.color }}>
                {overallCfg.label}
              </p>
            </div>
          </div>

          {/* Context line + quick actions */}
          <div className="flex items-center justify-between gap-3 mt-3 mb-1">
            <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] flex items-center gap-1">
              <Scale size={10} className="text-[var(--color-gold-400)]" />
              {contextLine}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                icon={<RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />}
                className="min-h-[44px] text-xs"
              >
                {isMobile ? "" : "Actualizar"}
              </Button>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => showToast({ type: "info", message: "Crear alerta — funcionalidad de mutación disponible próximamente" })}
              icon={<PlusCircle className="w-3.5 h-3.5" />}
              className="min-h-[44px] text-xs"
            >
              Crear Alerta
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => showToast({ type: "info", message: "Registrar documento — funcionalidad de mutación disponible próximamente" })}
              icon={<FileText className="w-3.5 h-3.5" />}
              className="min-h-[44px] text-xs"
            >
              Registrar Documento
            </Button>
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.04]">
            <Button
              variant={statusFilter ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter("")}
              className={cn(
                "min-h-[44px] text-xs",
                !statusFilter && "border border-[var(--color-gold-400)]",
              )}
            >
              Todos ({data.total_items})
            </Button>
            {(["compliant", "warning", "non_compliant", "pending_review"] as const).map((status) => {
              const cfg = ITEM_STATUS_CONFIG[status];
              const count = statusCounts[status];
              if (count === 0) return null;
              return (
                <Button
                  key={status}
                  variant={statusFilter === status ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                  className="min-h-[44px] text-xs"
                  style={
                    statusFilter === status
                      ? { borderColor: cfg.color, color: cfg.color }
                      : undefined
                  }
                >
                  {cfg.label} ({count})
                </Button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ── Area Score Chart ── */}
      <motion.div variants={motionV.item}>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-4">
            Cumplimiento por Área
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.area_summaries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="area" tick={AXIS_TICK} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={AXIS_TICK} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip content={<AreaComplianceTooltip />} />
              <Bar dataKey="score_pct" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.area_summaries.map((area: ComplianceReportAreaSummary, idx: number) => (
                  <Cell key={idx} fill={scoreColor(area.score_pct)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* ── Stale Data ── */}
      {freshness.isStale && (
        <motion.div variants={motionV.item}>
          <StaleDataBanner age={freshness.label} onRefresh={handleRefresh} />
        </motion.div>
      )}

      {/* ── Active Alerts (cross-agent compliance) ── */}
      {alerts && alerts.open_count > 0 && (
        <motion.div variants={motionV.item}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[var(--color-amber-400)]" />
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                  Alertas Activas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--color-surface-3)] text-[var(--color-silver-300)]">
                  {alerts.open_count}
                </span>
              </div>
              {alertsQ.isLoading && (
                <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-silver-500)]" />
              )}
            </div>

            {/* Desktop list */}
            <div className="hidden sm:block space-y-2">
              {alerts.data.filter((a) => a.status === "open").map((alert: ComplianceAlert) => {
                const riskCfg = RISK_LEVEL_CONFIG[alert.risk_level] ?? RISK_LEVEL_CONFIG.medium;
                const dueDate = alert.due_date ? new Date(alert.due_date) : null;
                const daysLeft = dueDate
                  ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const urgent = daysLeft !== null && daysLeft <= 7;

                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-xl border-l-3"
                    style={{
                      borderLeftColor: riskCfg.color,
                      backgroundColor: riskCfg.bgColor,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: riskCfg.color, backgroundColor: riskCfg.bgColor }}
                        >
                          {riskCfg.label}
                        </span>
                        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                          {alert.area}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                        {alert.title}
                      </p>
                      <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-body)] line-clamp-1 mt-0.5">
                        {alert.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {daysLeft !== null && (
                        <p
                          className="text-xs font-bold font-[family-name:var(--font-mono)]"
                          style={{ color: urgent ? "var(--color-rose-400)" : riskCfg.color }}
                        >
                          {daysLeft < 0
                            ? `Vencida ${Math.abs(daysLeft)}d`
                            : daysLeft === 0
                              ? "Vence hoy"
                              : `${daysLeft}d`}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                        {alert.responsible}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile compact list */}
            <div className="sm:hidden space-y-1.5">
              {alerts.data.filter((a) => a.status === "open").map((alert: ComplianceAlert) => {
                const riskCfg = RISK_LEVEL_CONFIG[alert.risk_level] ?? RISK_LEVEL_CONFIG.medium;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: riskCfg.color }}
                    />
                    <span className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] flex-1 truncate">
                      {alert.title}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0"
                      style={{ color: riskCfg.color, backgroundColor: riskCfg.bgColor }}
                    >
                      {riskCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── CROSS-AGENT: Anomaly Intelligence (C2) ── */}
      <motion.div variants={motionV.item}>
        <AnomalySectionForCompliance complianceData={data} alerts={alerts} />
      </motion.div>

      {/* ── At-Risk Items ── */}
      {data.at_risk_items.length > 0 && (
        <motion.div variants={motionV.item}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-[var(--color-rose-400)]" />
              <h3 className="text-sm font-semibold text-[var(--color-rose-400)] font-[family-name:var(--font-ui)]">
                Items en Riesgo ({data.at_risk_items.length})
              </h3>
            </div>

            <div className="space-y-3">
              {data.at_risk_items.map((risk: ComplianceReportRiskItem) => {
                const rCfg = RISK_LEVEL_CONFIG[risk.risk_level] ?? RISK_LEVEL_CONFIG.medio;
                const expanded = expandedRisk === risk.id;

                return (
                  <div
                    key={risk.id}
                    className="p-4 rounded-xl border-l-4 bg-[var(--color-surface-2)]"
                    style={{ borderLeftColor: rCfg.color }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRisk(expanded ? null : risk.id)}
                      className="w-full flex items-start justify-between gap-3 min-h-[44px]
                                 focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
                      aria-expanded={expanded}
                    >
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                            {risk.requirement}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                            style={{ color: rCfg.color, backgroundColor: rCfg.bgColor }}>
                            {rCfg.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                          {risk.area}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-[var(--color-amber-400)]" />
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)]"
                              style={{ color: risk.days_until_deadline <= 20 ? "var(--color-rose-400)" : "var(--color-amber-400)" }}>
                              {risk.days_until_deadline}d
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">deadline</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <DollarSign size={10} className="text-[var(--color-rose-400)]" />
                            <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--color-rose-400)]">
                              {formatCurrency(risk.potential_fine_crc)}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">multa</p>
                        </div>
                        {expanded ? <ChevronUp size={14} className="text-[var(--color-silver-500)]" /> : <ChevronDown size={14} className="text-[var(--color-silver-500)]" />}
                      </div>
                    </button>

                    {/* Expanded: Remediation steps */}
                    {expanded && (
                      <motion.div
                        initial={reduced ? false : { opacity: 0, height: 0 }}
                        animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                        transition={{ duration: reduced ? 0 : 0.2 }}
                        className="mt-3 pt-3 border-t border-white/[0.04]"
                      >
                        <p className="text-[10px] font-semibold text-[var(--color-gold-400)] uppercase tracking-wider font-[family-name:var(--font-ui)] mb-2">
                          Pasos de remediación
                        </p>
                        <ol className="space-y-2">
                          {risk.remediation_steps.map((step: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-body)]">
                              <span className="flex items-center justify-center flex-shrink-0
                                             text-[9px] font-bold bg-[var(--color-gold-400)] text-[var(--color-abyss)]
                                             font-[family-name:var(--font-mono)] rounded-full"
                                style={{ width: 18, height: 18 }}>
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Full Compliance Checklist ── */}
      <motion.div variants={motionV.item}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={14} className="text-[var(--color-silver-300)]" />
            <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
              Checklist Completo ({filteredItems.length} items)
            </h3>
          </div>

          {/* Desktop table (Rule #21) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-3 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Estado</th>
                  <th className="text-left py-2 pr-3 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Requisito</th>
                  <th className="text-left py-2 pr-3 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Área</th>
                  <th className="text-left py-2 pr-3 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Responsable</th>
                  <th className="text-left py-2 pr-3 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Próximo vencimiento</th>
                  <th className="text-left py-2 text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: ComplianceReportItem) => {
                  const cfg = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.pending_review;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={item.id} className="border-b border-white/[0.04] hover:bg-[var(--color-surface-1)] transition-colors">
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)]"
                          style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] font-medium max-w-[260px]">
                        {item.requirement}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                        {item.area}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                        {item.responsible}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                        {new Date(item.next_due_date).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] max-w-[200px] truncate">
                        {item.regulation_reference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (Rule #21) */}
          <div className="sm:hidden space-y-2">
            {filteredItems.map((item: ComplianceReportItem) => {
              const cfg = ITEM_STATUS_CONFIG[item.status] ?? ITEM_STATUS_CONFIG.pending_review;
              const StatusIcon = cfg.icon;
              const expanded = expandedItem === item.id;

              return (
                <div key={item.id} className="p-3 rounded-lg bg-[var(--color-surface-2)] border border-white/[0.04]">
                  <button
                    type="button"
                    onClick={() => setExpandedItem(expanded ? null : item.id)}
                    className={cn(
                      "w-full flex items-start justify-between gap-2 min-h-[44px]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                      "transition-colors",
                    )}
                    aria-expanded={expanded}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-[family-name:var(--font-mono)] flex-shrink-0 mt-0.5"
                        style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                      <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] leading-tight">
                        {item.requirement}
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={14} className="text-[var(--color-silver-500)] flex-shrink-0" /> : <ChevronDown size={14} className="text-[var(--color-silver-500)] flex-shrink-0" />}
                  </button>

                  {expanded && (
                    <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Área</span>
                        <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">{item.area}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Responsable</span>
                        <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-ui)]">{item.responsible}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">Vencimiento</span>
                        <span className="text-xs text-[var(--color-silver-300)] font-[family-name:var(--font-mono)]">
                          {new Date(item.next_due_date).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-[var(--color-silver-400)] font-[family-name:var(--font-body)] italic pt-1">
                          {item.notes}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--color-silver-600)] font-[family-name:var(--font-ui)] pt-1">
                        {item.regulation_reference}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* ── AI COMPLIANCE ADVISOR (C3) ── */}
      <motion.div variants={motionV.item}>
        <AIComplianceAdvisor complianceData={data} alerts={alerts} />
      </motion.div>

      {/* ── Export ── */}
      <motion.div variants={motionV.item}>
        <div className="flex items-center justify-between">
          {freshness.isStale && (
            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
              Datos: {freshness.label}
            </p>
          )}
          <div className="flex justify-end flex-1">
            <ExportButton
              module="compliance-check"
              onPrint={() => showToast({ type: "info", message: "Vista de impresión disponible — use Ctrl+P" })}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
