import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CR").format(n);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

// export function getAgeGroup(age: number): {
//   group: string;
//   label: string;
//   color: string;
// } {
//   if (age <= 12)
//     return { group: "children", label: "Niños (0-12)", color: "#5B8A6A" };
//   if (age <= 17)
//     return { group: "youth", label: "Jóvenes (13-17)", color: "#2A9AB5" };
//   if (age <= 35)
//     return {
//       group: "young_adult",
//       label: "Adultos (18-35)",
//       color: "#C9A96E",
//     };
//   if (age <= 55)
//     return {
//       group: "adult",
//       label: "Profesionales (36-55)",
//       color: "#D47A5A",
//     };
//   return { group: "senior", label: "Seniors (56+)", color: "#C46470" };
// }

// export function timeAgo(dateStr: string): string {
//   const now = new Date();
//   const date = new Date(dateStr);
//   const diff = now.getTime() - date.getTime();
//   const seconds = Math.floor(diff / 1000);
//   const minutes = Math.floor(seconds / 60);
//   const hours = Math.floor(minutes / 60);
//   const days = Math.floor(hours / 24);

//   if (seconds < 60) return "ahora mismo";
//   if (minutes < 60) return `hace ${minutes} min`;
//   if (hours < 24) return `hace ${hours}h`;
//   if (days < 7) return `hace ${days}d`;
//   return date.toLocaleDateString("es-CR");
// }

export function severityColor(severity: string): string {
  switch (severity) {
    case "high":
      return "var(--color-rose-400)";
    case "medium":
      return "var(--color-amber-400)";
    case "low":
      return "var(--color-teal-400)";
    default:
      return "var(--color-silver-400)";
  }
}

// export function roleLabel(role: string): string {
//   switch (role) {
//     case "SOCIO":
//       return "Miembro";
//     case "STAFF":
//       return "Equipo del Club";
//     case "ADMIN":
//       return "Gerencia";
//     case "JUNTA":
//       return "Junta Directiva";
//     default:
//       return role;
//   }
// }


export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Compact currency format for dashboards.
 * ₡45,200,000 → "₡45.2M", ₡1,200,000 → "₡1.2M", ₡850,000 → "₡850K"
 */
export function compactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₡${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}₡${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₡${(abs / 1_000).toFixed(0)}K`;
  return formatCurrency(amount);
}

/**
 * Month names in Spanish (abbreviated).
 * Used by: financial advisor, global advisor, seasonal calendar.
 */
export const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
] as const;

/**
 * Costa Rica seasonal classification for private clubs.
 *
 * High season (Jan-Apr, Dec): tourism + holidays → +8% activity
 * Low season (Jun-Sep): rainy → -8% activity
 * Transition (May, Oct-Nov): moderate
 *
 * Used by: financial advisor seasonal awareness, global advisor demand forecast,
 *          seasonal calendar, stress test scenarios.
 */
export function getCurrentSeason(): "high" | "low" | "transition" {
  const month = new Date().getMonth() + 1;
  // High: Jan, Feb, Mar, Apr, Dec
  if ([1, 2, 3, 4, 12].includes(month)) return "high";
  // Low: Jun, Jul, Aug, Sep
  if ([6, 7, 8, 9].includes(month)) return "low";
  // Transition: May, Oct, Nov
  return "transition";
}

// FIX U-01: getAgeGroup() — hex hardcoded → var(--color-*) tokens
// FIX U-03: Separated data from presentation

/**
 * Age group configuration — data only (no colors here).
 */
export const AGE_GROUP_CONFIG = {
  children:    { label: "Niños (0-12)",       tokenVar: "var(--color-sage-400)" },
  youth:       { label: "Jóvenes (13-17)",     tokenVar: "var(--color-teal-400)" },
  young_adult: { label: "Adultos (18-35)",     tokenVar: "var(--color-gold-400)" },
  adult:       { label: "Profesionales (36-55)", tokenVar: "var(--color-terracotta-400)" },
  senior:      { label: "Seniors (56+)",       tokenVar: "var(--color-rose-500)" },
} as const;

export type AgeGroupKey = keyof typeof AGE_GROUP_CONFIG;

export function getAgeGroup(age: number): {
  readonly group: AgeGroupKey;
  readonly label: string;
  readonly color: string;
} {
  let group: AgeGroupKey;
  if (age <= 12) group = "children";
  else if (age <= 17) group = "youth";
  else if (age <= 35) group = "young_adult";
  else if (age <= 55) group = "adult";
  else group = "senior";

  const cfg = AGE_GROUP_CONFIG[group];
  return { group, label: cfg.label, color: cfg.tokenVar };
}

// FIX U-05: roleLabel() → const map
export const ROLE_LABELS = {
  SOCIO: "Miembro",
  STAFF: "Equipo del Club",
  ADMIN: "Gerencia",
  JUNTA: "Junta Directiva",
} as const;

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

// FIX U-06: timeAgo() → Intl.RelativeTimeFormat
const RTF = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSec = Math.round((date - now) / 1000);

  if (Math.abs(diffSec) < 60) return "ahora mismo";
  if (Math.abs(diffSec) < 3600) return RTF.format(Math.round(diffSec / 60), "minute");
  if (Math.abs(diffSec) < 86400) return RTF.format(Math.round(diffSec / 3600), "hour");
  if (Math.abs(diffSec) < 604800) return RTF.format(Math.round(diffSec / 86400), "day");
  return new Date(dateStr).toLocaleDateString("es-CR");
}