// src/shared/lib/financial/format.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Shared Financial Formatters
//
// Centralized formatting utilities for currency (CRC),
// percentages, and numeric display across the platform.
//
// Rule #8: formatters
// ═══════════════════════════════════════════════════════════

/**
 * Format a number as Costa Rican colones (₡).
 * Smart abbreviation: M for millions, K for thousands.
 *
 * @example formatCRC(1500000) → "₡1.5M"
 * @example formatCRC(45000) → "₡45K"
 * @example formatCRC(500) → "₡500"
 * @example formatCRC(-3000) → "-₡3K"
 */
export function formatCRC(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)
    return `${value < 0 ? "-" : ""}₡${(abs / 1_000).toFixed(0)}K`;
  return `${value < 0 ? "-" : ""}₡${abs}`;
}

/**
 * Format a number as a percentage string.
 * Handles both decimal (0.08 → "8.0%") and whole (8 → "8.0%") inputs.
 *
 * @example formatPct(0.085) → "8.5%"
 * @example formatPct(42) → "42.0%"
 * @example formatPct(100) → "100.0%"
 */
export function formatPct(value: number): string {
  // If value looks like a ratio (0–1 range), multiply by 100
  const pct = value > 0 && value < 1 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/**
 * Format a number with locale-aware thousands separators.
 *
 * @example formatNumber(1234567) → "1,234,567" (es-CR)
 */
export function formatNumber(value: number): string {
  return value.toLocaleString("es-CR");
}
