/**
 * normalizeEnums — Runtime auto-fixer for mock enum mismatches.
 *
 * Wraps factory output and corrects known invalid enum values
 * to their valid equivalents. Logs corrections in DEV mode.
 *
 * Convention: values normalized to UPPERCASE → the canonical form.
 */

/* ═══ CORRECTION MAPS ═════════════════════════════════════════ */

/** Family-level status corrections */
const FAMILY_STATUS_MAP: Record<string, string> = {
  pending: "pending_approval",
  cancelled: "inactive",
  active: "active",
  inactive: "inactive",
  suspended: "suspended",
};

/** Churn risk — normalize edge cases */
const CHURN_RISK_MAP: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
  none: "low",
  moderate: "medium",
};

/** Member tier — catch typos and legacy values */
const TIER_MAP: Record<string, string> = {
  platino: "platino",
  platina: "platino",
  platinum: "platino",
  oro: "oro",
  gold: "oro",
  plata: "plata",
  silver: "plata",
  bronce: "bronce",
  bronze: "bronce",
  basic: "basic",
  basico: "basic",
  premium: "premium",
  vip: "vip",
};

/** Generic enum field definitions: field name → correction map */
const ENUM_FIELDS: Record<string, Record<string, string>> = {
  tier: TIER_MAP,
  churnRisk: CHURN_RISK_MAP,
  churn_risk: CHURN_RISK_MAP,
};

/* ═══ CONTEXT-AWARE STATUS HANDLER ════════════════════════════ */

/**
 * Determines which status correction map to use
 * based on sibling fields in the object.
 */
function correctStatus(
  value: string,
  obj: Record<string, unknown>,
): { corrected: string; map: string } | null {
  // If object has family-specific fields → family status
  if (
    "tier" in obj ||
    "churnRisk" in obj ||
    "churn_risk" in obj ||
    "memberCount" in obj ||
    "familyName" in obj ||
    "family_name" in obj
  ) {
    const corrected = FAMILY_STATUS_MAP[value];
    if (corrected && corrected !== value) {
      return { corrected, map: "family" };
    }
    return null;
  }

  return null;
}

/* ═══ DEEP NORMALIZER ═════════════════════════════════════════ */

interface Correction {
  path: string;
  field: string;
  from: string;
  to: string;
  map: string;
}

function normalizeDeep(
  obj: unknown,
  path: string,
  corrections: Correction[],
): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, i) =>
      normalizeDeep(item, `${path}[${i}]`, corrections),
    );
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === "string") {
        // Check generic enum fields
        if (ENUM_FIELDS[key]) {
          const map = ENUM_FIELDS[key];
          const corrected = map[value];
          if (corrected && corrected !== value) {
            corrections.push({
              path: currentPath,
              field: key,
              from: value,
              to: corrected,
              map: key,
            });
            result[key] = corrected;
            continue;
          }
        }

        // Check status field (context-aware)
        if (key === "status") {
          const fix = correctStatus(value, obj as Record<string, unknown>);
          if (fix) {
            corrections.push({
              path: currentPath,
              field: key,
              from: value,
              to: fix.corrected,
              map: fix.map,
            });
            result[key] = fix.corrected;
            continue;
          }
        }

        result[key] = value;
      } else {
        result[key] = normalizeDeep(value, currentPath, corrections);
      }
    }
    return result;
  }

  return obj;
}

/* ═══ PUBLIC API ═══════════════════════════════════════════════ */

export function normalizeEnums<T>(data: T, label?: string): T {
  const corrections: Correction[] = [];
  const normalized = normalizeDeep(data, "", corrections) as T;

  if (import.meta.env.DEV && corrections.length > 0) {
    console.group(
      `%c[NormalizeEnums] Fixed ${corrections.length} value(s)${label ? ` in ${label}` : ""}`,
      "color: #f59e0b; font-weight: bold;",
    );

    const deduped = new Map<string, Correction>();
    for (const c of corrections) {
      const key = `${c.field}:${c.from}`;
      if (!deduped.has(key)) deduped.set(key, c);
    }

    for (const c of deduped.values()) {
      console.warn(
        `  %c${c.field}%c: "%c${c.from}%c" → "%c${c.to}%c" (${c.map} map)`,
        "font-weight: bold",
        "",
        "color: #f43f5e",
        "",
        "color: #34d399",
        "",
      );
    }

    console.groupEnd();
  }

  return normalized;
}
