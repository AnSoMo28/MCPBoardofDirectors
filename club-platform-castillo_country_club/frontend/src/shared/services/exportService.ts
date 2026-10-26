// src/shared/services/exportService.ts
// ═══════════════════════════════════════════════════════════
// Export Intelligence Service — Castillo Country Club
// Fase 14b
//
// Client-side export utilities:
//   - generateFilename: intelligent naming convention
//   - downloadBlob: trigger browser download
//   - formatNarrativeAsText: clipboard-ready plain text
//   - formatNarrativeAsCSV: structured CSV with sections
//   - escapeCSV: CSV value escaping
//
// PDF generation deferred to B2 (react-pdf integration).
// ═══════════════════════════════════════════════════════════

import type {
  NarrativeInsight,
  NarrativeRecommendation,
  NarrativeComparison,
  NarrativeRiskAlert,
} from "@/shared/mocks/contracts";

// ── Types ──

export interface NarrativeExportData {
  period: string;
  audience: string;
  executive_summary: string;
  insights: NarrativeInsight[];
  recommendations: NarrativeRecommendation[];
  comparisons: NarrativeComparison[];
  risk_alerts: NarrativeRiskAlert[];
}

// ── Filename ──

export function generateFilename(module: string, format: string): string {
  const date = new Date().toISOString().split("T")[0];
  const ext = format === "excel" ? "xlsx" : format;
  return `castillo-${module}-${date}.${ext}`;
}

// ── CSV Helpers ──

export function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Download ──

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Narrative → Plain Text ──

export function formatNarrativeAsText(data: NarrativeExportData): string {
  const lines: string[] = [];
  const sep = "═".repeat(60);
  const thin = "─".repeat(60);

  lines.push(sep);
  lines.push("CASTILLO COUNTRY CLUB — NARRATIVA EJECUTIVA");
  lines.push(`Período: ${data.period} | Audiencia: ${data.audience}`);
  lines.push(`Generado: ${new Date().toLocaleDateString("es-CR")}`);
  lines.push(sep);
  lines.push("");
  lines.push("RESUMEN EJECUTIVO");
  lines.push(thin);
  lines.push(data.executive_summary);
  lines.push("");

  if (data.insights.length > 0) {
    lines.push("INSIGHTS CLAVE");
    lines.push(thin);
    data.insights.forEach((insight, i) => {
      const icon =
        insight.type === "positive"
          ? "✅"
          : insight.type === "negative"
            ? "⚠️"
            : insight.type === "alert"
              ? "🔴"
              : "◉";
      lines.push(`${i + 1}. ${icon} ${insight.title}`);
      lines.push(`   ${insight.body}`);
      if (insight.impact_estimate !== 0) {
        const sign = insight.impact_estimate > 0 ? "+" : "";
        lines.push(
          `   Impacto estimado: ${sign}₡${Math.abs(insight.impact_estimate).toLocaleString("es-CR")}`,
        );
      }
      lines.push("");
    });
  }

  if (data.recommendations.length > 0) {
    lines.push("RECOMENDACIONES");
    lines.push(thin);
    data.recommendations.forEach((rec, i) => {
      const priLabel =
        rec.priority === "high"
          ? "ALTA"
          : rec.priority === "medium"
            ? "MEDIA"
            : "BAJA";
      lines.push(`${i + 1}. [${priLabel}] ${rec.title}`);
      lines.push(`   ${rec.description}`);
      lines.push(
        `   Impacto: ₡${rec.estimated_impact.toLocaleString("es-CR")} | Plazo: ${rec.timeframe}`,
      );
      lines.push("");
    });
  }

  if (data.comparisons.length > 0) {
    lines.push("COMPARATIVAS");
    lines.push(thin);
    lines.push(
      "Métrica".padEnd(14) +
        "Actual".padStart(14) +
        "Anterior".padStart(14) +
        "Presupuesto".padStart(14) +
        "YoY".padStart(10) +
        "vs Budg.".padStart(10),
    );
    data.comparisons.forEach((c) => {
      lines.push(
        c.metric.padEnd(14) +
          c.current.toLocaleString("es-CR").padStart(14) +
          c.previous.toLocaleString("es-CR").padStart(14) +
          c.budget.toLocaleString("es-CR").padStart(14) +
          `${c.yoy_change_pct > 0 ? "+" : ""}${c.yoy_change_pct.toFixed(1)}%`.padStart(10) +
          `${c.vs_budget_pct > 0 ? "+" : ""}${c.vs_budget_pct.toFixed(1)}%`.padStart(10),
      );
    });
    lines.push("");
  }

  if (data.risk_alerts.length > 0) {
    lines.push("ALERTAS DE RIESGO");
    lines.push(thin);
    data.risk_alerts.forEach((alert) => {
      const sevLabel =
        alert.severity === "high"
          ? "ALTO"
          : alert.severity === "medium"
            ? "MEDIO"
            : "BAJO";
      lines.push(`⚠ [${sevLabel}] ${alert.title}`);
      lines.push(`  ${alert.description}`);
      lines.push(`  Acción: ${alert.suggested_action}`);
      lines.push("");
    });
  }

  lines.push(sep);
  lines.push(
    "Generado por Castillo Country Club — AI Intelligence Platform",
  );

  return lines.join("\n");
}

// ── Narrative → CSV ──

export function formatNarrativeAsCSV(data: NarrativeExportData): string {
  const lines: string[] = [];

  // Header
  lines.push("CASTILLO COUNTRY CLUB — NARRATIVA EJECUTIVA");
  lines.push(`Período,${escapeCSV(data.period)}`);
  lines.push(`Audiencia,${escapeCSV(data.audience)}`);
  lines.push(`Generado,${new Date().toISOString()}`);
  lines.push("");

  // Insights
  lines.push("INSIGHTS");
  lines.push("Tipo,Título,Descripción,Impacto (CRC),Confianza (%)");
  data.insights.forEach((i) => {
    lines.push(
      [
        i.type,
        escapeCSV(i.title),
        escapeCSV(i.body),
        i.impact_estimate,
        i.confidence,
      ].join(","),
    );
  });
  lines.push("");

  // Recommendations
  lines.push("RECOMENDACIONES");
  lines.push("Prioridad,Categoría,Título,Descripción,Impacto (CRC),Plazo,Esfuerzo");
  data.recommendations.forEach((r) => {
    lines.push(
      [
        r.priority,
        r.category,
        escapeCSV(r.title),
        escapeCSV(r.description),
        r.estimated_impact,
        escapeCSV(r.timeframe),
        r.effort,
      ].join(","),
    );
  });
  lines.push("");

  // Comparisons
  lines.push("COMPARATIVAS");
  lines.push(
    "Métrica,Actual,Anterior,Presupuesto,Δ YoY (%),vs Presupuesto (%)",
  );
  data.comparisons.forEach((c) => {
    lines.push(
      [
        escapeCSV(c.metric),
        c.current,
        c.previous,
        c.budget,
        c.yoy_change_pct,
        c.vs_budget_pct,
      ].join(","),
    );
  });
  lines.push("");

  // Risk Alerts
  lines.push("ALERTAS DE RIESGO");
  lines.push("Severidad,Título,Descripción,Acción sugerida,Área,Deadline");
  data.risk_alerts.forEach((r) => {
    lines.push(
      [
        r.severity,
        escapeCSV(r.title),
        escapeCSV(r.description),
        escapeCSV(r.suggested_action),
        escapeCSV(r.affected_area),
        r.deadline,
      ].join(","),
    );
  });

  return lines.join("\n");
}
