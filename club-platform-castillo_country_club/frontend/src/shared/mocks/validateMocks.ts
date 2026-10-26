/**
 * Mock Validator — dev-only runtime check for enum mismatches.
 *
 * Import and call once from main.tsx or App.tsx in DEV mode.
 * Outputs a table of all invalid enum values found in mock factories.
 */

/* ═══ VALID ENUM SETS ════════════════════════════════════════ */

const VALID_FAMILY_STATUS = new Set([
  "active",
  "inactive",
  "suspended",
  "pending_approval",
]);

const VALID_MEMBER_TIER = new Set([
  "platino",
  "oro",
  "plata",
  "bronce",
  "basic",
  "premium",
  "vip",
]);

const VALID_CHURN_RISK = new Set([
  "low",
  "medium",
  "high",
  "critical",
]);

const VALID_EVENT_STATUS = new Set([
  "draft",
  "published",
  "cancelled",
  "completed",
]);

const VALID_RSVP_STATUS = new Set([
  "confirmed",
  "pending",
  "declined",
  "waitlisted",
]);

/* ═══ FIELD → VALID SET MAPPING ══════════════════════════════ */

const FIELD_VALIDATORS: Record<string, Set<string>> = {
  status: new Set([
    ...VALID_FAMILY_STATUS,
    ...VALID_EVENT_STATUS,
    ...VALID_RSVP_STATUS,
    // Shared status values
    "success",
    "error",
    "pending_approval",
  ]),
  tier: VALID_MEMBER_TIER,
  churnRisk: VALID_CHURN_RISK,
  churn_risk: VALID_CHURN_RISK,
  rsvpStatus: VALID_RSVP_STATUS,
  rsvp_status: VALID_RSVP_STATUS,
};

/* ═══ DEEP TRAVERSER ═════════════════════════════════════════ */

interface Violation {
  path: string;
  field: string;
  value: string;
  expectedOneOf: string[];
}

function traverse(
  obj: unknown,
  violations: Violation[],
  path: string,
): void {
  if (obj === null || obj === undefined) return;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      traverse(item, violations, `${path}[${i}]`);
    });
    return;
  }

  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check if this key is a known enum field with a string value
      if (typeof value === "string" && FIELD_VALIDATORS[key]) {
        const validSet = FIELD_VALIDATORS[key];
        if (!validSet.has(value)) {
          violations.push({
            path: currentPath,
            field: key,
            value,
            expectedOneOf: [...validSet],
          });
        }
      }

      traverse(value, violations, currentPath);
    }
  }
}

/* ═══ MAIN VALIDATOR ═════════════════════════════════════════ */

export function validateMockFactories(factories: Record<string, () => unknown>): void {
  if (!import.meta.env.DEV) return;

  const allViolations: Violation[] = [];

  for (const [factoryName, factoryFn] of Object.entries(factories)) {
    try {
      const result = factoryFn();
      const violations: Violation[] = [];
      traverse(result, violations, factoryName);

      for (const v of violations) {
        allViolations.push(v);
      }
    } catch {
      // Skip factories that throw — they may need params
    }
  }

  if (allViolations.length === 0) {
    console.log(
      "%c[MockValidator] ✅ All enum values valid",
      "color: #34d399; font-weight: bold;",
    );
    return;
  }

  console.group(
    `%c[MockValidator] ❌ ${allViolations.length} invalid enum value(s) found`,
    "color: #f43f5e; font-weight: bold; font-size: 14px;",
  );

  console.table(
    allViolations.map((v) => ({
      factory: v.path.split(".")[0],
      path: v.path,
      field: v.field,
      invalid: v.value,
      expected: v.expectedOneOf.join(" | "),
    })),
  );

  // Grouped by factory for easy fixing
  const byFactory = new Map<string, Violation[]>();
  for (const v of allViolations) {
    const factory = v.path.split(".")[0];
    if (!byFactory.has(factory)) byFactory.set(factory, []);
    byFactory.get(factory)!.push(v);
  }

  for (const [factory, viols] of byFactory) {
    console.group(`📦 ${factory}`);
    for (const v of viols) {
      console.warn(
        `  %c${v.field}%c = "%c${v.value}%c" → expected one of: %c${v.expectedOneOf.join(", ")}`,
        "font-weight: bold",
        "",
        "color: #f43f5e",
        "",
        "color: #34d399",
      );
    }
    console.groupEnd();
  }

  console.groupEnd();
}
