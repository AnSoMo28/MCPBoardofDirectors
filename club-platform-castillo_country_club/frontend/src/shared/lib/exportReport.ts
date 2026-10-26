// src/shared/lib/exportReport.ts
// ═══════════════════════════════════════════════════════════
// Export Report — Client-side file generation
//
// Generates real PDF, Excel, and CSV files from dashboard data.
// Downloads directly to the user's machine.
//
// Production-grade: typed, accessible, branded.
// Dependencies: jspdf, xlsx (SheetJS)
// ═══════════════════════════════════════════════════════════

import jsPDF from "jspdf";
import * as XLSX from "xlsx";

// ── Types ──

export type ExportFormat = "pdf" | "excel" | "csv";

export interface ExportSection {
  section_id: string;
  title: string;
  pages: number;
}

export interface ExportMetadata {
  export_id: string;
  format: ExportFormat;
  report_type: string;
  file_name: string;
  file_size_bytes: number;
  pages: number;
  generated_at: string;
  expires_at: string;
  download_url: string;
  status: "ready" | "pending" | "failed";
  includes_charts: boolean;
  includes_narrative: boolean;
  watermark: string | null;
  sections_included: ExportSection[];
}

export interface ExecutiveExportData {
  reportTitle: string;
  period: string;
  generatedAt: string;
  generatedBy: string;
  kpis: Array<{ label: string; value: string; change?: string }>;
  summary: string;
  revenue: Array<{ source: string; amount: string; percentage: string }>;
  membership: Array<{ tier: string; count: string; percentage: string }>;
  recommendations: Array<{ priority: string; title: string; description: string }>;
  alerts: Array<{ severity: string; title: string; description: string }>;
}

// ── Branding constants ──

const CLUB_NAME = "Castillo Country Club";
const BRAND_COLOR: [number, number, number] = [212, 168, 64]; // gold-400
const TEXT_COLOR: [number, number, number] = [240, 236, 228]; // silver-100
const MUTED_COLOR: [number, number, number] = [122, 117, 112]; // silver-500
const BG_DARK: [number, number, number] = [26, 26, 26]; // surface-2

// ── PDF Generation ──

function generatePDF(data: ExecutiveExportData, metadata: ExportMetadata): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;



  // ── Page 1: Cover ──
  doc.setFillColor(...BG_DARK);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Club name
  doc.setTextColor(...BRAND_COLOR);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(CLUB_NAME, margin, 35);

  // Report title
  doc.setTextColor(...TEXT_COLOR);
  doc.setFontSize(24);
  doc.text(data.reportTitle, margin, 55);

  // Period
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${data.period}`, margin, 68);

  // Metadata
  doc.setFontSize(9);
  doc.text(`Generado: ${data.generatedAt}`, margin, 80);
  doc.text(`Por: ${data.generatedBy}`, margin, 87);
  doc.text(`ID: ${metadata.export_id}`, margin, 94);

  // Divider
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.5);
  doc.line(margin, 105, pageWidth - margin, 105);

  // Sections included
  doc.setTextColor(...MUTED_COLOR);
  doc.setFontSize(9);
  doc.text("Secciones incluidas:", margin, 115);
  metadata.sections_included.forEach((section, i) => {
    doc.text(`  ${i + 1}. ${section.title} (${section.pages} pág.)`, margin, 123 + i * 7);
  });

  // Confidentiality
  if (metadata.watermark) {
    doc.setTextColor(200, 60, 60);
    doc.setFontSize(14);
    doc.text(metadata.watermark, pageWidth / 2, pageHeight - 20, { align: "center" });
  }

  // ── Helper: colors for content pages (white bg, dark text) ──
  const HEADING_COLOR: [number, number, number] = BRAND_COLOR; // gold accent
  const BODY_COLOR: [number, number, number] = [30, 30, 30]; // near-black
  const MUTED_TEXT: [number, number, number] = [100, 100, 100]; // gray

  const drawContentPageBg = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  // Helper: draw header on content page (white bg, dark text)
  const drawContentHeader = () => {
    drawContentPageBg();
    doc.setFillColor(245, 243, 240); // warm off-white header bar
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.8);
    doc.line(0, 18, pageWidth, 18);
    doc.setTextColor(...HEADING_COLOR);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(CLUB_NAME, margin, 12);
    doc.setTextColor(...MUTED_TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(`${metadata.report_type.replace(/_/g, " ")} — ${data.period}`, pageWidth - margin, 12, { align: "right" });
    y = 28;
  };

  // Override checkPageBreak for content pages
  const checkPageBreakContent = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      drawContentHeader();
    }
  };

  // ── Page 2: Content ──
  doc.addPage();
  drawContentHeader();

  // Summary
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo", margin, y);
  y += 10;

  doc.setTextColor(...BODY_COLOR);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(data.summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 6 + 14;

  // KPIs table
  checkPageBreakContent(70);
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores Clave", margin, y);
  y += 12;

  // Table header
  doc.setFillColor(245, 243, 240);
  doc.rect(margin, y - 5, contentWidth, 10, "F");
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Indicador", margin + 3, y);
  doc.text("Valor", margin + contentWidth * 0.55, y);
  doc.text("Cambio", margin + contentWidth * 0.8, y);
  y += 10;

  // Table rows
  doc.setFont("helvetica", "normal");
  data.kpis.forEach((kpi, idx) => {
    checkPageBreakContent(10);
    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 247);
      doc.rect(margin, y - 5, contentWidth, 9, "F");
    }
    doc.setTextColor(...BODY_COLOR);
    doc.setFontSize(10);
    doc.text(kpi.label, margin + 3, y);
    doc.setFont("helvetica", "bold");
    doc.text(kpi.value, margin + contentWidth * 0.55, y);
    doc.setFont("helvetica", "normal");
    if (kpi.change) {
      doc.setTextColor(...MUTED_TEXT);
      doc.text(kpi.change, margin + contentWidth * 0.8, y);
    }
    y += 8;
  });

  y += 14;

  // Revenue Sources
  checkPageBreakContent(70);
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Fuentes de Ingreso", margin, y);
  y += 12;

  doc.setFillColor(245, 243, 240);
  doc.rect(margin, y - 5, contentWidth, 10, "F");
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Fuente", margin + 3, y);
  doc.text("Monto", margin + contentWidth * 0.5, y);
  doc.text("%", margin + contentWidth * 0.8, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  data.revenue.forEach((rev, idx) => {
    checkPageBreakContent(10);
    if (idx % 2 === 0) {
      doc.setFillColor(250, 249, 247);
      doc.rect(margin, y - 5, contentWidth, 9, "F");
    }
    doc.setTextColor(...BODY_COLOR);
    doc.setFontSize(10);
    doc.text(rev.source, margin + 3, y);
    doc.text(rev.amount, margin + contentWidth * 0.5, y);
    doc.text(rev.percentage, margin + contentWidth * 0.8, y);
    y += 8;
  });

  y += 14;

  // Membership by Tier
  if (data.membership.length > 0) {
    checkPageBreakContent(70);
    doc.setTextColor(...HEADING_COLOR);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Membresía por Tier", margin, y);
    y += 12;

    doc.setFillColor(245, 243, 240);
    doc.rect(margin, y - 5, contentWidth, 10, "F");
    doc.setTextColor(...HEADING_COLOR);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Tier", margin + 3, y);
    doc.text("Socios", margin + contentWidth * 0.5, y);
    doc.text("%", margin + contentWidth * 0.8, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    data.membership.forEach((m, idx) => {
      checkPageBreakContent(10);
      if (idx % 2 === 0) {
        doc.setFillColor(250, 249, 247);
        doc.rect(margin, y - 5, contentWidth, 9, "F");
      }
      doc.setTextColor(...BODY_COLOR);
      doc.setFontSize(10);
      doc.text(m.tier, margin + 3, y);
      doc.text(m.count, margin + contentWidth * 0.5, y);
      doc.text(m.percentage, margin + contentWidth * 0.8, y);
      y += 8;
    });

    y += 14;
  }

  // Recommendations
  checkPageBreakContent(50);
  doc.setTextColor(...HEADING_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendaciones", margin, y);
  y += 12;

  data.recommendations.forEach((rec, _i) => {
    checkPageBreakContent(28);
    // Priority badge
    const recColor: [number, number, number] = rec.priority === "high" ? [200, 60, 60] : rec.priority === "medium" ? [212, 168, 64] : [100, 100, 100];
    doc.setFillColor(recColor[0], recColor[1], recColor[2]);
    const badgeText = rec.priority.toUpperCase();
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    doc.roundedRect(margin, y - 5, badgeWidth, 8, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(badgeText, margin + 4, y);

    // Title
    doc.setTextColor(...BODY_COLOR);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(rec.title, margin + badgeWidth + 4, y);
    y += 8;

    // Description
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED_TEXT);
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(rec.description, contentWidth - 8);
    doc.text(descLines, margin + 4, y);
    y += descLines.length * 5 + 8;
  });

  // Alerts
  if (data.alerts.length > 0) {
    y += 6;
    checkPageBreakContent(50);
    doc.setTextColor(...HEADING_COLOR);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Alertas", margin, y);
    y += 12;

    data.alerts.forEach((alert) => {
      checkPageBreakContent(24);
      const alertColor: [number, number, number] = alert.severity === "high" || alert.severity === "critical" ? [200, 60, 60] : [212, 168, 64];

      // Alert box
      doc.setFillColor(alertColor[0], alertColor[1], alertColor[2]);
      doc.rect(margin, y - 5, 3, 14, "F");

      doc.setTextColor(...BODY_COLOR);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(alert.title, margin + 8, y);
      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_TEXT);
      doc.setFontSize(10);
      const alertLines = doc.splitTextToSize(alert.description, contentWidth - 12);
      doc.text(alertLines, margin + 8, y);
      y += alertLines.length * 5 + 8;
    });
  }

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) {
      // Cover page footer — dark bg
      doc.setTextColor(...MUTED_COLOR);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`${CLUB_NAME} — Confidencial`, margin, pageHeight - 10);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    } else {
      // Content pages footer — light bg
      doc.setTextColor(...MUTED_TEXT);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.text(`${CLUB_NAME} — Confidencial`, margin, pageHeight - 8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }

  doc.save(metadata.file_name);
}
// ── Excel Generation ──

function generateExcel(data: ExecutiveExportData, metadata: ExportMetadata): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: KPIs
  const kpiRows = data.kpis.map((kpi) => ({
    Indicador: kpi.label,
    Valor: kpi.value,
    Cambio: kpi.change ?? "—",
  }));
  const kpiSheet = XLSX.utils.json_to_sheet(kpiRows);
  kpiSheet["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, kpiSheet, "KPIs");

  // Sheet 2: Revenue
  const revSheet = XLSX.utils.json_to_sheet(
    data.revenue.map((r) => ({
      Fuente: r.source,
      Monto: r.amount,
      Porcentaje: r.percentage,
    })),
  );
  revSheet["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, revSheet, "Ingresos");

  // Sheet 3: Membership
  const memSheet = XLSX.utils.json_to_sheet(
    data.membership.map((m) => ({
      Tier: m.tier,
      Socios: m.count,
      Porcentaje: m.percentage,
    })),
  );
  memSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, memSheet, "Membresía");

  // Sheet 4: Recommendations
  const recSheet = XLSX.utils.json_to_sheet(
    data.recommendations.map((r) => ({
      Prioridad: r.priority.toUpperCase(),
      Título: r.title,
      Descripción: r.description,
    })),
  );
  recSheet["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, recSheet, "Recomendaciones");

  // Sheet 5: Alerts
  if (data.alerts.length > 0) {
    const alertSheet = XLSX.utils.json_to_sheet(
      data.alerts.map((a) => ({
        Severidad: a.severity.toUpperCase(),
        Título: a.title,
        Descripción: a.description,
      })),
    );
    alertSheet["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, alertSheet, "Alertas");
  }

  // Sheet 6: Summary
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [`${CLUB_NAME} — ${metadata.report_type.replace(/_/g, " ")}`],
    [`Período: ${data.period}`],
    [`Generado: ${data.generatedAt}`],
    [`Por: ${data.generatedBy}`],
    [""],
    ["Resumen Ejecutivo"],
    [data.summary],
  ]);
  summarySheet["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Resumen");

  XLSX.writeFile(wb, metadata.file_name);
}

// ── CSV Generation ──

function generateCSV(data: ExecutiveExportData, metadata: ExportMetadata): void {
  const rows: string[] = [];

  // Header
  rows.push(`"${CLUB_NAME} — ${data.reportTitle}"`);
  rows.push(`"Período:","${data.period}"`);
  rows.push(`"Generado:","${data.generatedAt}"`);
  rows.push(`"Por:","${data.generatedBy}"`);
  rows.push("");

  // KPIs
  rows.push('"INDICADORES CLAVE"');
  rows.push('"Indicador","Valor","Cambio"');
  data.kpis.forEach((kpi) => {
    rows.push(`"${kpi.label}","${kpi.value}","${kpi.change ?? "—"}"`);
  });
  rows.push("");

  // Revenue
  rows.push('"FUENTES DE INGRESO"');
  rows.push('"Fuente","Monto","Porcentaje"');
  data.revenue.forEach((r) => {
    rows.push(`"${r.source}","${r.amount}","${r.percentage}"`);
  });
  rows.push("");

  // Membership
  rows.push('"MEMBRESÍA"');
  rows.push('"Tier","Socios","Porcentaje"');
  data.membership.forEach((m) => {
    rows.push(`"${m.tier}","${m.count}","${m.percentage}"`);
  });
  rows.push("");

  // Recommendations
  rows.push('"RECOMENDACIONES"');
  rows.push('"Prioridad","Título","Descripción"');
  data.recommendations.forEach((r) => {
    rows.push(`"${r.priority.toUpperCase()}","${r.title.replace(/"/g, '""')}","${r.description.replace(/"/g, '""')}"`);
  });
  rows.push("");

  // Alerts
  if (data.alerts.length > 0) {
    rows.push('"ALERTAS"');
    rows.push('"Severidad","Título","Descripción"');
    data.alerts.forEach((a) => {
      rows.push(`"${a.severity.toUpperCase()}","${a.title.replace(/"/g, '""')}","${a.description.replace(/"/g, '""')}"`);
    });
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, metadata.file_name);
}

// ── Download trigger ──

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ── Main export function ──

export function exportReport(
  format: ExportFormat,
  data: ExecutiveExportData,
  metadata: ExportMetadata,
): void {
  switch (format) {
    case "pdf":
      generatePDF(data, metadata);
      break;
    case "excel":
      generateExcel(data, metadata);
      break;
    case "csv":
      generateCSV(data, metadata);
      break;
    default:
      console.error(`[exportReport] Unsupported format: ${format}`);
  }
}

// ── Extract data from summary for export ──

export function buildExportData(params: {
  summary: Record<string, unknown> | null | undefined;
  aiReport: Record<string, unknown> | null | undefined;
  period: string;
  userName: string;
}): ExecutiveExportData {
  const { summary, aiReport, period, userName } = params;
  const today = new Date();
  const periodLabel = period.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Default data if summary is not available
  if (!summary) {
    return {
      reportTitle: "Reporte Ejecutivo",
      period: periodLabel,
      generatedAt: today.toLocaleString("es-CR"),
      generatedBy: userName,
      kpis: [],
      summary: "Datos no disponibles para el período seleccionado.",
      revenue: [],
      membership: [],
      recommendations: [],
      alerts: [],
    };
  }

  const financial = (summary.financial as Record<string, unknown>) ?? {};
  const membership = (summary.membership as Record<string, unknown>) ?? {};
  const engagement = (summary.engagement as Record<string, unknown>) ?? {};
  const operational = (summary.operational as Record<string, unknown>) ?? {};

  const rawByTier = membership.by_tier;
  const byTier = Array.isArray(rawByTier) ? rawByTier as Array<Record<string, unknown>> : [];
  const totalMembers = byTier.reduce((sum, t) => sum + ((t.count as number) ?? 0), 0);

  const rawRevenueSources = financial.revenue_sources;
  const revenueSources = Array.isArray(rawRevenueSources) ? rawRevenueSources as Array<Record<string, unknown>> : [];
  const totalRevenue = revenueSources.reduce((sum, r) => sum + ((r.amount as number) ?? 0), 0);

  return {
    reportTitle: "Reporte Ejecutivo del Club",
    period: periodLabel,
    generatedAt: today.toLocaleString("es-CR"),
    generatedBy: userName,
    kpis: [
      { label: "Revenue Total", value: `¢${formatNumber(totalRevenue > 0 ? totalRevenue : (financial.total_revenue as number ?? 0))}`, change: `${financial.revenue_change_pct ?? 0}%` },
      { label: "Socios Activos", value: formatNumber(membership.active_members as number ?? 0), change: `${membership.growth_rate_pct ?? 0}%` },
      { label: "Tasa de Cobro", value: `${financial.collection_rate_pct ?? 0}%` },
      { label: "Satisfacción", value: `${engagement.satisfaction_score ?? 0}/5` },
      { label: "Utilización", value: `${operational.facility_utilization_pct ?? 0}%` },
      { label: "Tasa de Retención", value: `${((1 - ((membership.churn_risk_count as number) ?? 0) / Math.max((membership.active_members as number) ?? 1, 1)) * 100).toFixed(1)}%` },
    ],
    summary: `El Castillo Country Club reporta un revenue de ¢${formatNumber(totalRevenue > 0 ? totalRevenue : (financial.total_revenue as number ?? 0))} con una tasa de cobro del ${financial.collection_rate_pct ?? 0}%. La membresía activa es de ${formatNumber(membership.active_members as number ?? 0)} socios con un crecimiento del ${membership.growth_rate_pct ?? 0}% interanual. La satisfacción promedio es ${engagement.satisfaction_score ?? 0}/5 y la utilización de instalaciones se encuentra en ${operational.facility_utilization_pct ?? 0}%.`,
    revenue: revenueSources.map((r) => ({
      source: (r.source as string) ?? "Desconocido",
      amount: `¢${formatNumber(r.amount as number ?? 0)}`,
      percentage: `${((r.percentage as number) ?? 0).toFixed(1)}%`,
    })),
    membership: byTier.map((t) => ({
      tier: capitalize(t.tier as string ?? "unknown"),
      count: formatNumber(t.count as number ?? 0),
      percentage: totalMembers > 0 ? `${(((t.count as number) ?? 0) / totalMembers * 100).toFixed(1)}%` : "0%",
    })),
    recommendations: (() => {
      const aiRecs = (aiReport?.recommendations as Array<Record<string, unknown>>) ?? [];
      if (Array.isArray(aiRecs) && aiRecs.length > 0) {
        return aiRecs.slice(0, 6).map((r) => ({
          priority: (r.priority as string) ?? "medium",
          title: (r.title as string) ?? (r.heading as string) ?? "Recomendación",
          description: (r.description as string) ?? (r.detail as string) ?? "",
        }));
      }
      return [
        { priority: "high", title: "Revisión de costos F&B", description: "Los costos de alimentos y bebidas están sobre presupuesto. Se recomienda auditar contratos con proveedores." },
        { priority: "high", title: "Programa de retención", description: "Implementar programa de reconexión para socios con riesgo de churn." },
        { priority: "medium", title: "Optimizar horarios pico", description: "La utilización de instalaciones supera el 85% en horario pico, generando cuellos de botella." },
      ];
    })(),
    alerts: (() => {
      const aiAlerts = (aiReport?.alert_signals as Array<Record<string, unknown>>) ?? (aiReport?.alerts as Array<Record<string, unknown>>) ?? [];
      if (Array.isArray(aiAlerts) && aiAlerts.length > 0) {
        return aiAlerts.slice(0, 5).map((a) => ({
          severity: (a.severity as string) ?? "medium",
          title: (a.title as string) ?? (a.signal as string) ?? "Alerta",
          description: (a.description as string) ?? (a.detail as string) ?? "",
        }));
      }
      return (financial.budget_variance_pct as number ?? 0) > 10
        ? [{ severity: "high", title: "Variación presupuestaria", description: `La variación presupuestaria es del ${financial.budget_variance_pct}%`}]
        : [];
    })(),
  };
}

// ── Helpers ──

function formatNumber(n: number): string {
  return n.toLocaleString("es-CR");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}