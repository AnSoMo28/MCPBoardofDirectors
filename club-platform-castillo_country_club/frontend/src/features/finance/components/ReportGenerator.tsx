// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Report Generator
// Fase 19q REWRITE
//
// 6 innovations:
//   1. Live Preview Canvas (real-time report skeleton)
//   2. Smart Section Advisor (AI suggests sections)
//   3. One-Page Executive Brief (distilled single-page)
//   4. Period Comparison Overlay (delta vs previous)
//   5. Distribution Pipeline (configure recipients)
//   6. Report Timeline (historical archive)
//
// Rules: #1 tokens, #8 formatCurrency, #11 focus-visible,
//   #12 touch, #15 toast, #17 Button, #18 reducedMotion,
//   #22 cn
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, RefreshCw, TrendingUp, TrendingDown, Send,
  Eye, Lightbulb, Mail, Archive, MessageSquare,
  Clock, Sparkles, BarChart3, Monitor,
} from "lucide-react";
import { Button, showToast } from "@/shared/components/ui";
import { useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { formatCurrency, formatPercent, cn } from "@/shared/lib/utils";
import { CHART_PALETTE } from "@/shared/lib/chartTheme";
import type { FinanceReportGenerateResponse } from "@/shared/mocks/contracts";
import ExportButton from "@/shared/components/export/ExportButton";
import './ReportGenerator.css';

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

interface ReportSection {
  id: string;
  label: string;
  description: string;
  included: boolean;
  suggested: boolean;
  suggestion?: string;
}

interface DistributionChannel {
  id: string;
  label: string;
  icon: typeof Mail;
  enabled: boolean;
}

interface SavedReport {
  id: string;
  type: string;
  label: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  income: number;
  expenses: number;
  net: number;
}

/* ══════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════ */

const REPORT_TYPES = [
  { value: "income_expense", label: "Ingresos vs Gastos", icon: BarChart3 },
  { value: "budget_variance", label: "Variación presupuestaria", icon: TrendingUp },
  { value: "cash_flow", label: "Flujo de caja", icon: Activity },
  { value: "member_revenue", label: "Revenue por socio", icon: Users },
];

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: "summary", label: "Resumen ejecutivo", description: "Narrativa AI con hallazgos clave", included: true, suggested: false },
  { id: "kpis", label: "KPIs principales", description: "Ingresos, gastos, resultado neto", included: true, suggested: false },
  { id: "income_detail", label: "Detalle de ingresos", description: "Desglose por categoría con tendencias", included: true, suggested: false },
  { id: "expense_detail", label: "Detalle de gastos", description: "Desglose por categoría con tendencias", included: true, suggested: false },
  { id: "budget_comparison", label: "vs Presupuesto", description: "Variación real vs planificado", included: false, suggested: false },
  { id: "yoy_comparison", label: "vs Año anterior", description: "Comparativa interanual", included: false, suggested: false },
  { id: "cash_position", label: "Posición de caja", description: "Saldo actual y proyección", included: false, suggested: false },
  { id: "risk_alerts", label: "Alertas de riesgo", description: "Áreas que requieren atención", included: false, suggested: false },
  { id: "recommendations", label: "Recomendaciones", description: "Acciones sugeridas por la AI", included: false, suggested: false },
];

const DEFAULT_CHANNELS: DistributionChannel[] = [
  { id: "email_junta", label: "Junta Directiva (email)", icon: Mail, enabled: false },
  { id: "email_gerencia", label: "Gerencia (email)", icon: Mail, enabled: false },
  { id: "archive_drive", label: "Archivar en Drive", icon: Archive, enabled: false },
  { id: "notify_slack", label: "Notificar equipo", icon: MessageSquare, enabled: false },
];

// Mock history for timeline (Propuesta 6)
const MOCK_HISTORY: SavedReport[] = [
  { id: "r1", type: "income_expense", label: "Ingresos vs Gastos", date: "2026-04-01", periodStart: "2026-01-01", periodEnd: "2026-03-31", income: 48_500_000, expenses: 38_200_000, net: 10_300_000 },
  { id: "r2", type: "income_expense", label: "Ingresos vs Gastos", date: "2026-01-02", periodStart: "2025-10-01", periodEnd: "2025-12-31", income: 52_100_000, expenses: 41_800_000, net: 10_300_000 },
  { id: "r3", type: "cash_flow", label: "Flujo de caja", date: "2025-10-01", periodStart: "2025-07-01", periodEnd: "2025-09-30", income: 38_900_000, expenses: 35_600_000, net: 3_300_000 },
];

// Inline icon since Activity wasn't in original imports
function Activity({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

function Users({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function useMotion() {
  const reduced = useReducedMotion();
  return {
    container: reduced
      ? undefined
      : ({ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const),
    item: reduced
      ? undefined
      : ({ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } } } as const),
  };
}

function getDefaultDates(): { from: string; to: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const to = new Date(now.getFullYear(), q * 3 + 3, 0);
  return {
    from: from.toISOString().split("T")[0]!,
    to: to.toISOString().split("T")[0]!,
  };
}

function getQuarterLabel(from: string): string {
  const d = new Date(from);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

/* ══════════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════════ */

/** Live Preview Canvas (Propuesta 1) */
function LivePreviewCanvas({ reportType, sections, dateFrom, dateTo }: {
  reportType: string;
  sections: ReportSection[];
  dateFrom: string;
  dateTo: string;
}) {
  const typeLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? reportType;
  const includedSections = sections.filter((s) => s.included);

  return (
    <div className="glass-report-panel p-5">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={14} className="text-[var(--color-gold-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Vista previa
          </h3>
        </div>

        {/* Report title skeleton */}
        <div className="mb-4 pb-3 border-b border-white/[0.04]">
          <p className="text-xs font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)] uppercase tracking-wider mb-1">
            Castillo Country Club
          </p>
          <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] font-medium">
            {typeLabel}
          </p>
          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mt-0.5">
            {dateFrom} — {dateTo} · {getQuarterLabel(dateFrom)}
          </p>
        </div>

        {/* Section previews */}
        <div className="space-y-3">
          {includedSections.map((section) => (
            <div key={section.id} className="flex items-start gap-3">
              <div className="w-1 h-full rounded-full bg-[var(--color-gold-400)] opacity-30 flex-shrink-0 min-h-[24px]" />
              <div className="flex-1">
                <p className="text-xs font-medium text-[var(--color-silver-300)] font-[family-name:var(--font-ui)] mb-1">
                  {section.label}
                </p>
                {/* Content preview lines */}
                <div className="space-y-1.5">
                  {Array.from({ length: section.id === "summary" ? 3 : 2 }).map((_, i) => (
                    <div key={i} className="glass-report-preview-line"
                      style={{ width: `${85 - i * 15}%`, animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {includedSections.length === 0 && (
          <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] text-center py-4">
            Seleccioná al menos una sección
          </p>
        )}
      </div>
    </div>
  );
}

/** Smart Section Advisor (Propuesta 2) */
function SmartSectionAdvisor({ sections, onToggle }: {
  sections: ReportSection[];
  onToggle: (id: string) => void;
}) {
  const suggested = sections.filter((s) => s.suggested);
  const included = sections.filter((s) => s.included && !s.suggested);
  const available = sections.filter((s) => !s.included && !s.suggested);

  return (
    <div className="glass-report-panel p-4">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-[var(--color-teal-400)]" />
          <h3 className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
            Secciones del reporte
          </h3>
        </div>

        {/* AI suggested */}
        {suggested.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-[var(--color-teal-400)] font-[family-name:var(--font-ui)] mb-2 flex items-center gap-1">
              <Lightbulb size={10} />
              Sugerido por AI:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onToggle(s.id)}
                  className={cn(
                    "glass-report-section-chip glass-report-section-chip--suggested",
                    s.included && "glass-report-section-chip--included",
                  )}
                  title={s.suggestion}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal-400)]" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Included */}
        <div className="mb-3">
          <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-2">
            Incluidas:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {included.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className="glass-report-section-chip glass-report-section-chip--included"
              >
                {s.label}
                <span className="text-[var(--color-silver-500)]">✓</span>
              </button>
            ))}
            {available.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className="glass-report-section-chip"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Distribution Pipeline (Propuesta 5) */
function DistributionPipeline({ channels, onToggle }: {
  channels: DistributionChannel[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="glass-report-panel p-4">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-3">
          <Send size={14} className="text-[var(--color-silver-400)]" />
          <h3 className="text-xs font-semibold text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] uppercase tracking-wider">
            Distribución
          </h3>
        </div>
        <div className="space-y-2">
          {channels.map((ch) => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onToggle(ch.id)}
                className={cn(
                  "glass-report-channel",
                  ch.enabled && "glass-report-channel--active",
                )}
                aria-pressed={ch.enabled}
              >
                <Icon size={14} className={ch.enabled ? "text-[var(--color-gold-400)]" : "text-[var(--color-silver-500)]"} />
                <span className="text-xs font-[family-name:var(--font-ui)]" style={{ color: ch.enabled ? "var(--color-silver-200)" : "var(--color-silver-400)" }}>
                  {ch.label}
                </span>
                <span className="ml-auto">
                  {ch.enabled
                    ? <span className="text-[10px] text-[var(--color-gold-400)] font-[family-name:var(--font-mono)]">✓</span>
                    : <span className="w-3 h-3 rounded border border-white/[0.1]" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Report Timeline (Propuesta 6) */
function ReportTimeline({ reports }: { reports: SavedReport[] }) {
  if (reports.length === 0) return null;

  return (
    <div className="glass-report-panel p-5">
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-[var(--color-silver-400)]" />
          <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
            Historial de reportes
          </h3>
        </div>
        <div className="glass-report-timeline">
          {reports.map((r) => {
            const trend = r.net >= 0;
            return (
              <div key={r.id} className="glass-report-timeline__node">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                      {r.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mt-0.5">
                      {r.periodStart} — {r.periodEnd}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold font-[family-name:var(--font-mono)]"
                      style={{ color: trend ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                      {formatCurrency(r.net)}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)]">
                      {new Date(r.date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export default function ReportGenerator() {
  const motionV = useMotion();
  const defaults = getDefaultDates();

  const [reportType, setReportType] = useState("income_expense");
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [showBrief, setShowBrief] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [channels, setChannels] = useState<DistributionChannel[]>(DEFAULT_CHANNELS);

  // ── Simulate AI suggestions when report type changes (Propuesta 2) ──
  useEffect(() => {
    const suggestions: Record<string, Array<{ id: string; suggestion: string }>> = {
      income_expense: [
        { id: "yoy_comparison", suggestion: "Ingresos altos temporada — comparar con Q anterior" },
        { id: "risk_alerts", suggestion: "Gastos mantenimiento +18% — incluir alertas" },
      ],
      budget_variance: [
        { id: "recommendations", suggestion: "3 categorías sobre presupuesto — sugerir acciones" },
      ],
      cash_flow: [
        { id: "cash_position", suggestion: "Meses críticos detectados — mostrar posición" },
        { id: "risk_alerts", suggestion: "Reserva bajo mínimo — alertar" },
      ],
      member_revenue: [
        { id: "yoy_comparison", suggestion: "50 nuevos socios este trimestre — comparar" },
      ],
    };

    setSections((prev) =>
      prev.map((s) => ({
        ...s,
        suggested: suggestions[reportType]?.some((sg) => sg.id === s.id) ?? false,
        suggestion: suggestions[reportType]?.find((sg) => sg.id === s.id)?.suggestion,
        // Auto-include suggested sections
        included: s.included || (suggestions[reportType]?.some((sg) => sg.id === s.id) ?? false),
      })),
    );
  }, [reportType]);

  // ── Toggle section (Propuesta 2) ──
  const toggleSection = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((s) => s.id === id ? { ...s, included: !s.included } : s),
    );
  }, []);

  // ── Toggle channel (Propuesta 5) ──
  const toggleChannel = useCallback((id: string) => {
    setChannels((prev) =>
      prev.map((ch) => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch),
    );
  }, []);

  // ── Mutation ──
  const reportMut = useMCPMutation<FinanceReportGenerateResponse>(
    "finance",
    "finance_report_generate",
    {
      onSuccess: () => {
        showToast({ type: "success", message: "Reporte generado exitosamente" });
        // Simulate distribution
        const activeChannels = channels.filter((ch) => ch.enabled);
        if (activeChannels.length > 0) {
          setTimeout(() => {
            showToast({ type: "info", message: `Distribuido a ${activeChannels.length} canal(es)` });
          }, 1500);
        }
      },
      onError: (err) => {
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al generar reporte" });
      },
    },
  );

  const report = reportMut.data?.data;

  // ── Period comparison (Propuesta 4) ──
  const prevPeriodData = useMemo(() => {
    if (!report) return null;
    // Find previous quarter report from history
    const prev = MOCK_HISTORY.find((h) => h.type === report.report_type && h.id !== "current");
    if (!prev) return null;
    return {
      income: prev.income,
      expenses: prev.expenses,
      net: prev.net,
      incomeDelta: report.total_income - prev.income,
      expenseDelta: report.total_expenses - prev.expenses,
      netDelta: report.net_result - prev.net,
    };
  }, [report]);

  // ── Submit ──
  const handleGenerate = useCallback(() => {
    if (!dateFrom || !dateTo) {
      showToast({ type: "error", message: "Seleccioná ambas fechas" });
      return;
    }
    if (dateFrom > dateTo) {
      showToast({ type: "error", message: "La fecha de inicio debe ser anterior a la de fin" });
      return;
    }
    reportMut.mutate({ report_type: reportType, date_from: dateFrom, date_to: dateTo });
  }, [reportType, dateFrom, dateTo, reportMut]);

  // ── Generate brief (Propuesta 3) ──
  const handleBrief = useCallback(() => {
    if (!report) {
      showToast({ type: "error", message: "Generá el reporte primero" });
      return;
    }
    setShowBrief(true);
  }, [report]);

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */

  return (
    <motion.div variants={motionV.container} initial={false} animate="visible" className="space-y-6">

      {/* ── Generator Form + Preview (Propuestas 1+2) ── */}
      <motion.div variants={motionV.item}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 glass-report-panel p-5">
            <div className="relative z-[1]">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                  Generador de Reporte
                </h3>
                <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                  Configurá tipo, periodo y secciones del reporte financiero
                </p>
              </div>

              {/* Report Type */}
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-2 font-[family-name:var(--font-ui)]">
                  Tipo de reporte
                </p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    return (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => setReportType(rt.value)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px]",
                          "font-[family-name:var(--font-ui)] border",
                          reportType === rt.value
                            ? "border-[var(--color-gold-400)] bg-[var(--color-surface-2)] text-[var(--color-silver-200)]"
                            : "border-white/[0.06] bg-[var(--color-surface-1)] text-[var(--color-silver-400)] hover:bg-[var(--color-surface-2)]",
                        )}
                        aria-pressed={reportType === rt.value}
                      >
                        <Icon size={14} />
                        {rt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="rpt-from" className="block text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5 font-[family-name:var(--font-ui)]">
                    Desde
                  </label>
                  <input
                    id="rpt-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                      "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                      "min-h-[48px]",
                    )}
                  />
                </div>
                <div>
                  <label htmlFor="rpt-to" className="block text-[10px] font-semibold text-[var(--color-silver-500)] uppercase tracking-wider mb-1.5 font-[family-name:var(--font-ui)]">
                    Hasta
                  </label>
                  <input
                    id="rpt-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-sm font-[family-name:var(--font-ui)]",
                      "bg-[var(--color-surface-1)] text-[var(--color-silver-200)] border-white/[0.06]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]",
                      "min-h-[48px]",
                    )}
                  />
                </div>
              </div>

              {/* Smart Sections (Propuesta 2) */}
              <div className="mb-5">
                <SmartSectionAdvisor sections={sections} onToggle={toggleSection} />
              </div>

              {/* Distribution (Propuesta 5) */}
              <div className="mb-5">
                <DistributionPipeline channels={channels} onToggle={toggleChannel} />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={reportMut.isPending}
                  icon={reportMut.isPending ? undefined : <FileText size={16} />}
                  className="bg-[var(--color-gold-400)] text-[var(--color-abyss)] hover:brightness-110"
                >
                  {reportMut.isPending ? "Generando…" : "Generar Reporte"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleBrief}
                  icon={<Monitor size={14} />}
                  className="text-xs"
                >
                  Brief Ejecutivo
                </Button>
                <ExportButton module="reportes" onPrint={() => window.print()} />
              </div>
            </div>
          </div>

          {/* Live Preview (Propuesta 1) */}
          <div className="lg:col-span-1">
            <LivePreviewCanvas
              reportType={reportType}
              sections={sections}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {reportMut.isPending && (
        <motion.div variants={motionV.item}>
          <div className="glass-report-panel p-8">
            <div className="relative z-[1] flex flex-col items-center justify-center py-6">
              <div className="relative w-16 h-16 mb-3">
                <FileText className="w-6 h-6 text-[var(--color-gold-400)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full border border-[rgba(201,169,110,0.25)]"
                    style={{ animation: `intel-loading-ring 2.4s ease-out infinite`, animationDelay: `${i * 0.8}s` }} />
                ))}
              </div>
              <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)]">
                Generando reporte...
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Error ── */}
      {reportMut.isError && !reportMut.isPending && (
        <motion.div variants={motionV.item}>
          <div className="glass-report-panel p-6 text-center">
            <div className="relative z-[1]">
              <p className="text-sm text-[var(--color-silver-400)] font-[family-name:var(--font-ui)] mb-3">
                Error al generar reporte. Intentá de nuevo.
              </p>
              <Button variant="secondary" onClick={handleGenerate} icon={<RefreshCw className="w-4 h-4" />}>
                Reintentar
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Executive Brief (Propuesta 3) ── */}
      <AnimatePresence>
        {report && showBrief && (
          <motion.div
            variants={motionV.item}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="glass-report-brief p-6 sm:p-8">
              <div className="relative z-[1]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[var(--color-gold-400)]" />
                    <h3 className="text-sm font-bold text-[var(--color-gold-400)] font-[family-name:var(--font-display)]">
                      Brief Ejecutivo
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBrief(false)}
                    className="text-[var(--color-silver-500)] hover:text-[var(--color-silver-200)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Cerrar brief"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] uppercase tracking-wider mb-3">
                  Castillo Country Club · {getQuarterLabel(dateFrom)}
                </p>

                {/* The 3 key numbers */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-gold-400)]">
                      {formatCurrency(report.total_income)}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">Ingresos</p>
                    {prevPeriodData && (
                      <p className="text-[10px] font-[family-name:var(--font-mono)] mt-0.5"
                        style={{ color: prevPeriodData.incomeDelta >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                        {prevPeriodData.incomeDelta >= 0 ? "+" : ""}{formatPercent((prevPeriodData.incomeDelta / (prevPeriodData.income || 1)) * 100, 1)} vs Q ant.
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold font-[family-name:var(--font-display)] text-[var(--color-rose-400)]">
                      {formatCurrency(report.total_expenses)}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">Gastos</p>
                    {prevPeriodData && (
                      <p className="text-[10px] font-[family-name:var(--font-mono)] mt-0.5"
                        style={{ color: prevPeriodData.expenseDelta <= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                        {prevPeriodData.expenseDelta >= 0 ? "+" : ""}{formatPercent((prevPeriodData.expenseDelta / (prevPeriodData.expenses || 1)) * 100, 1)} vs Q ant.
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold font-[family-name:var(--font-display)]"
                      style={{ color: report.net_result >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                      {formatCurrency(report.net_result)}
                    </p>
                    <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mt-1">Resultado</p>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] mt-0.5 text-[var(--color-silver-400)]">
                      Margen {report.total_income > 0 ? formatPercent((report.net_result / report.total_income) * 100, 1) : "—"}
                    </p>
                  </div>
                </div>

                {/* AI narrative — 3 lines max */}
                <p className="text-sm text-[var(--color-silver-200)] font-[family-name:var(--font-body)] leading-relaxed">
                  {report.summary}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report Results (Propuesta 4: Period Comparison Overlay) ── */}
      {report && !reportMut.isPending && (
        <>
          {/* Summary + KPIs */}
          <motion.div variants={motionV.item}>
            <div className="glass-report-panel p-5">
              <div className="relative z-[1]">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-display)]">
                      {`Reporte: ${REPORT_TYPES.find((r) => r.value === report.report_type)?.label ?? report.report_type}`}
                    </h3>
                    <p className="text-xs text-[var(--color-silver-400)] font-[family-name:var(--font-mono)]">
                      {report.period_start} a {report.period_end}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm"
                      onClick={() => showToast({ type: "info", message: "Exportación PDF en desarrollo" })}
                      icon={<Download className="w-4 h-4" />}>
                      Exportar
                    </Button>
                    <Button variant="secondary" size="sm"
                      onClick={() => showToast({ type: "info", message: "Envío en desarrollo" })}
                      icon={<Send className="w-4 h-4" />}>
                      Enviar
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-sm text-[var(--color-silver-300)] font-[family-name:var(--font-body)] leading-relaxed mb-5 p-4 rounded-xl bg-[var(--color-surface-2)]">
                  {report.summary}
                </p>

                {/* KPI cards with comparison (Propuesta 4) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Ingresos",
                      value: report.total_income,
                      color: CHART_PALETTE.gold,
                      delta: prevPeriodData?.incomeDelta,
                      deltaLabel: "vs Q ant.",
                    },
                    {
                      label: "Gastos",
                      value: report.total_expenses,
                      color: CHART_PALETTE.terracotta,
                      delta: prevPeriodData?.expenseDelta,
                      deltaLabel: "vs Q ant.",
                      invertDelta: true,
                    },
                    {
                      label: "Resultado Neto",
                      value: report.net_result,
                      color: report.net_result >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)",
                      delta: prevPeriodData?.netDelta,
                      deltaLabel: "vs Q ant.",
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="glass-report-card p-4">
                      <div className="relative z-[1]">
                        <p className="text-xs text-[var(--color-silver-500)] font-[family-name:var(--font-ui)] mb-1">{kpi.label}</p>
                        <p className="text-xl font-bold font-[family-name:var(--font-display)]" style={{ color: kpi.color }}>
                          {formatCurrency(kpi.value)}
                        </p>
                        {kpi.label === "Resultado Neto" && report.total_income > 0 && (
                          <p className="text-xs font-[family-name:var(--font-mono)] mt-0.5"
                            style={{ color: report.net_result >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                            Margen: {formatPercent((report.net_result / report.total_income) * 100, 1)}
                          </p>
                        )}
                        {/* Period comparison delta (Propuesta 4) */}
                        {kpi.delta !== undefined && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/[0.04]">
                            {kpi.delta >= 0
                              ? <TrendingUp size={10} className={kpi.invertDelta ? "text-[var(--color-rose-400)]" : "text-[var(--color-emerald-400)]"} />
                              : <TrendingDown size={10} className={kpi.invertDelta ? "text-[var(--color-emerald-400)]" : "text-[var(--color-rose-400)]"} />}
                            <span className="text-[10px] font-[family-name:var(--font-mono)]"
                              style={{
                                color: kpi.invertDelta
                                  ? (kpi.delta <= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)")
                                  : (kpi.delta >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)"),
                              }}>
                              {kpi.delta >= 0 ? "+" : ""}{formatCurrency(Math.abs(kpi.delta))}
                            </span>
                            <span className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-ui)]">
                              {kpi.deltaLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Income Breakdown — Glass (Propuesta 4: trend comparison) */}
          {report.income_breakdown.length > 0 && (
            <motion.div variants={motionV.item}>
              <div className="glass-report-panel p-5">
                <div className="relative z-[1]">
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-4">
                    Desglose de Ingresos
                  </h3>
                  <div className="space-y-3">
                    {report.income_breakdown.map((item: Record<string, unknown>, idx: number) => {
                      const amount = Number(item.amount ?? 0);
                      const share = report.total_income > 0 ? (amount / report.total_income) * 100 : 0;
                      const trend = Number(item.trend_pct ?? 0);
                      return (
                        <div key={idx} className="glass-report-card p-3">
                          <div className="relative z-[1]">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                                {String(item.label ?? item.category ?? "Sin nombre")}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                                  {formatCurrency(amount)}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-[family-name:var(--font-mono)]"
                                  style={{ color: trend >= 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" }}>
                                  {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-surface-3)]">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${share}%`, backgroundColor: "var(--color-gold-400)" }} />
                            </div>
                            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mt-1">
                              {share.toFixed(1)}% del total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Expense Breakdown — Glass (Propuesta 4: trend comparison) */}
          {report.expense_breakdown.length > 0 && (
            <motion.div variants={motionV.item}>
              <div className="glass-report-panel p-5">
                <div className="relative z-[1]">
                  <h3 className="text-sm font-semibold text-[var(--color-silver-200)] font-[family-name:var(--font-ui)] mb-4">
                    Desglose de Gastos
                  </h3>
                  <div className="space-y-3">
                    {report.expense_breakdown.map((item: Record<string, unknown>, idx: number) => {
                      const amount = Number(item.amount ?? 0);
                      const share = report.total_expenses > 0 ? (amount / report.total_expenses) * 100 : 0;
                      const trend = Number(item.trend_pct ?? 0);
                      return (
                        <div key={idx} className="glass-report-card p-3">
                          <div className="relative z-[1]">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-medium text-[var(--color-silver-200)] font-[family-name:var(--font-ui)]">
                                {String(item.label ?? item.category ?? "Sin nombre")}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--color-silver-200)]">
                                  {formatCurrency(amount)}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-[family-name:var(--font-mono)]"
                                  style={{ color: trend > 15 ? "var(--color-rose-400)" : trend >= 0 ? "var(--color-amber-400)" : "var(--color-emerald-400)" }}>
                                  {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                  {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-surface-3)]">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${share}%`, backgroundColor: trend > 15 ? "var(--color-rose-400)" : "var(--color-terracotta-400)" }} />
                            </div>
                            <p className="text-[10px] text-[var(--color-silver-500)] font-[family-name:var(--font-mono)] mt-1">
                              {share.toFixed(1)}% del total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Report Timeline (Propuesta 6) ── */}
      <motion.div variants={motionV.item}>
        <ReportTimeline reports={MOCK_HISTORY} />
      </motion.div>
    </motion.div>
  );
}