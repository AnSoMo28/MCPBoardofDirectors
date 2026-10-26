// ═══════════════════════════════════════════════════════════
// Financial Command Registry
// Provides context-aware commands for CommandPalette.
// Wire into CommandPalette with: useFinancialCommands(ctx)
// ═══════════════════════════════════════════════════════════

import {
  BarChart3, BrainCircuit, Lightbulb, CreditCard,
  Receipt, Wrench, FileText, Calculator,
  TrendingUp, Shield, Download, Gauge,
  type LucideIcon,
} from "lucide-react";

/* ── Types ── */

export interface FinancialCommand {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: "navigate" | "action" | "report" | "analysis";
  keywords: string[];
  shortcut?: string;
  action: () => void;
}

export interface FinancialCommandContext {
  navigateToTab: (tab: string) => void;
  navigateToToolTab: (tab: string) => void;
  generateReport?: () => void;
  openScenarioSimulator?: () => void;
  openStressTest?: () => void;
  exportData?: (format: "pdf" | "excel" | "csv") => void;
}

/* ── Builder ── */

export function buildFinancialCommands(
  ctx: FinancialCommandContext,
): FinancialCommand[] {
  return [
    // ── Navigation ──
    {
      id: "nav-overview",
      label: "Ir a Resumen",
      description: "Vista general financiera del club",
      icon: BarChart3,
      category: "navigate",
      keywords: ["resumen", "overview", "general", "dashboard"],
      shortcut: "g r",
      action: () => ctx.navigateToTab("overview"),
    },
    {
      id: "nav-analytics",
      label: "Ir a Análisis",
      description: "Analytics y tendencias financieras",
      icon: BrainCircuit,
      category: "navigate",
      keywords: ["analytics", "análisis", "tendencias", "charts"],
      shortcut: "g a",
      action: () => ctx.navigateToTab("analytics"),
    },
    {
      id: "nav-intelligence",
      label: "Ir a Inteligencia",
      description: "Motor de inteligencia financiera AI",
      icon: Lightbulb,
      category: "navigate",
      keywords: ["inteligencia", "intelligence", "ai", "insights"],
      shortcut: "g i",
      action: () => ctx.navigateToTab("intelligence"),
    },
    {
      id: "nav-billing",
      label: "Ir a Facturación",
      description: "Centro de facturación y cobros",
      icon: CreditCard,
      category: "navigate",
      keywords: ["facturación", "billing", "cobros", "facturas"],
      shortcut: "g f",
      action: () => ctx.navigateToTab("billing"),
    },
    {
      id: "nav-expenses",
      label: "Ir a Gastos",
      description: "Gestión de gastos operativos",
      icon: Receipt,
      category: "navigate",
      keywords: ["gastos", "expenses", "costos", "operativos"],
      shortcut: "g e",
      action: () => ctx.navigateToTab("expenses"),
    },
    {
      id: "nav-tools",
      label: "Ir a Herramientas",
      description: "Presupuestos y reportes",
      icon: Wrench,
      category: "navigate",
      keywords: ["herramientas", "tools", "utilidades"],
      shortcut: "g h",
      action: () => ctx.navigateToTab("tools"),
    },
    {
      id: "nav-budget",
      label: "Ir a Presupuesto",
      description: "Gestión de presupuestos",
      icon: Calculator,
      category: "navigate",
      keywords: ["presupuesto", "budget", "planificación"],
      action: () => {
        ctx.navigateToTab("tools");
        ctx.navigateToToolTab("budget");
      },
    },
    {
      id: "nav-reports",
      label: "Ir a Reportes",
      description: "Generador de reportes ejecutivos",
      icon: FileText,
      category: "navigate",
      keywords: ["reportes", "reports", "documentos"],
      action: () => {
        ctx.navigateToTab("tools");
        ctx.navigateToToolTab("reports");
      },
    },

    // ── Analysis ──
    {
      id: "analysis-health",
      label: "Ver Salud Financiera",
      description: "Health score y factores de riesgo",
      icon: Gauge,
      category: "analysis",
      keywords: ["health", "salud", "score", "riesgo"],
      action: () => ctx.navigateToTab("overview"),
    },
    {
      id: "analysis-forecast",
      label: "Ver Flujo de Caja",
      description: "Proyección de cash flow a 12 meses",
      icon: TrendingUp,
      category: "analysis",
      keywords: ["cash", "flujo", "forecast", "proyección"],
      action: () => ctx.navigateToTab("analytics"),
    },
    {
      id: "analysis-risk",
      label: "Evaluar Riesgo",
      description: "Stress test y análisis de escenarios",
      icon: Shield,
      category: "analysis",
      keywords: ["riesgo", "risk", "stress", "escenarios"],
      action: () => {
        ctx.navigateToTab("intelligence");
        ctx.openStressTest?.();
      },
    },

    // ── Reports ──
    {
      id: "report-generate",
      label: "Generar Reporte AI",
      description: "Narrativa financiera con AI",
      icon: FileText,
      category: "report",
      keywords: ["generar", "reporte", "ai", "narrativa"],
      action: () => {
        ctx.navigateToTab("tools");
        ctx.navigateToToolTab("reports");
        ctx.generateReport?.();
      },
    },
    {
      id: "report-export-pdf",
      label: "Exportar PDF",
      description: "Exportar estado financiero en PDF",
      icon: Download,
      category: "report",
      keywords: ["exportar", "pdf", "descargar"],
      action: () => ctx.exportData?.("pdf"),
    },
    {
      id: "report-export-excel",
      label: "Exportar Excel",
      description: "Exportar datos financieros en Excel",
      icon: Download,
      category: "report",
      keywords: ["exportar", "excel", "csv", "datos"],
      action: () => ctx.exportData?.("excel"),
    },
  ];
}