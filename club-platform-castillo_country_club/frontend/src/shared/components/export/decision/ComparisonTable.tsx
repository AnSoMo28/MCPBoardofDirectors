/**
 * @component ComparisonTable (Fase 24)
 * @namespace .glass-print__table
 * @depends PrintView.css
 * @note Config-driven comparison table. Renders NarrativeComparison data
 *       with delta coloring. Works in screen preview and print.
 * @import import '../PrintView.css';
 */

import type { ComparisonTableRow } from "../hooks/usePrintNarrative";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ComparisonTableProps {
  rows: ComparisonTableRow[];
}

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function deltaClass(val: number, invert: boolean): string {
  if (val === 0) return "";
  const positive = invert ? val < 0 : val > 0;
  return positive ? "glass-print__delta--positive" : "glass-print__delta--negative";
}

/* ═══════════════════════════════════════
   Column Config
   ═══════════════════════════════════════ */

const COLUMNS = [
  { key: "metric", label: "Métrica", align: "left" as const, bold: true },
  { key: "currentFormatted", label: "Actual", align: "right" as const, mono: true, bold: true },
  { key: "previousFormatted", label: "Anterior", align: "right" as const, mono: true },
  { key: "budgetFormatted", label: "Presupuesto", align: "right" as const, mono: true },
  {
    key: "yoy",
    label: "Δ YoY",
    align: "right" as const,
    mono: true,
    isDelta: true,
    accessor: (row: ComparisonTableRow) => row.yoy_change_pct,
    render: (row: ComparisonTableRow) =>
      `${row.yoy_change_pct > 0 ? "+" : ""}${row.yoy_change_pct.toFixed(1)}%`,
  },
  {
    key: "vsBudget",
    label: "vs Presup.",
    align: "right" as const,
    mono: true,
    isDelta: true,
    accessor: (row: ComparisonTableRow) => row.vs_budget_pct,
    render: (row: ComparisonTableRow) =>
      `${row.vs_budget_pct > 0 ? "+" : ""}${row.vs_budget_pct.toFixed(1)}%`,
  },
];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ComparisonTable({ rows }: ComparisonTableProps) {
  if (rows.length === 0) return null;

  return (
    <table className="glass-print__table">
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              className="glass-print__table-header"
              style={{ textAlign: col.align }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="glass-print__table-row">
            {COLUMNS.map((col) => {
              let content: React.ReactNode;
              let extraClass = "";

              if (col.render && col.accessor) {
                const val = col.accessor(row);
                content = col.render(row);
                if (col.isDelta) {
                  extraClass = deltaClass(val, row.isExpense);
                }
              } else {
                content = row[col.key as keyof ComparisonTableRow] as string;
              }

              return (
                <td
                  key={col.key}
                  className={`glass-print__table-cell ${
                    col.mono ? "glass-print__table-cell--mono" : ""
                  } ${col.bold ? "glass-print__table-cell--bold" : ""} ${
                    col.align === "right" ? "glass-print__table-cell--right" : ""
                  } ${extraClass}`}
                >
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}