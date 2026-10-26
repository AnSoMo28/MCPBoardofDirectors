// ═══════════════════════════════════════════════════════════
// useFinancialCommands — Command Palette Integration Hook
// Returns memoized command list for current finance context.
// Wire into CommandPalette: commands={useFinancialCommands(ctx)}
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  buildFinancialCommands,
  type FinancialCommandContext,
} from "../lib/financialCommands";

export function useFinancialCommands(ctx: FinancialCommandContext) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildFinancialCommands(ctx), [
    ctx.navigateToTab,
    ctx.navigateToToolTab,
    ctx.generateReport,
    ctx.openScenarioSimulator,
    ctx.openStressTest,
    ctx.exportData,
  ]);
}