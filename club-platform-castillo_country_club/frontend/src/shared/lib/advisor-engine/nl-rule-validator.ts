// src/shared/lib/advisor-engine/nl-rule-validator.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Natural Language Rule Validator (F52)
//
// Validates parsed NL rules before they become active
// RuleDefinitions in the Advisor Engine.
//
// Validation layers:
//   1. Structure: conditions exist, action exists, metrics resolve
//   2. Semantic: thresholds reasonable, operators make sense
//   3. Safety: no destructive actions without HITL, no extreme thresholds
//   4. Conflict: detect overlaps with existing engine rules
//   5. Duplicate: prevent identical rules
//
// Returns: NLRuleValidationResult with errors/warnings/suggestions
//
// Errors BLOCK saving. Warnings are informational.
// Suggestions offer auto-fixes.
//
// Depends on:
//   ./nl-rule-types (ParsedNLRule, NLRuleValidationResult, ValidationIssue)
//   ./nl-rule-parser (getMetricByPath)
//   ./mcp-tool-registry (hasTool, getToolDef)
// ═══════════════════════════════════════════════════════════

import type {
  ParsedNLRule,
  NLRuleValidationResult,
  ValidationIssue,
  NLAction,
  NLRuleTemplate,
} from "./nl-rule-types";
import { getMetricByPath, getAllMetrics } from "./nl-rule-parser";
import { hasTool, getToolDef } from "./mcp-tool-registry";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════

/**
 * Validate a parsed NL rule.
 * Runs all validation layers and returns a comprehensive result.
 */
export function validateNLRule(
  parsed: ParsedNLRule,
  existingRules: NLRuleTemplate[] = [],
): NLRuleValidationResult {
  const issues: ValidationIssue[] = [];

  // Layer 1: Structural validation
  validateStructure(parsed, issues);

  // Layer 2: Semantic validation
  validateSemantics(parsed, issues);

  // Layer 3: Safety validation
  validateSafety(parsed, issues);

  // Layer 4: Action validation
  validateAction(parsed.action, issues);

  // Layer 5: Duplicate detection
  validateDuplicate(parsed, existingRules, issues);

  // Layer 6: Conflict detection with engine rules
  validateEngineOverlap(parsed, issues);

  // Generate suggestions
  const suggestions = generateSuggestions(parsed, issues);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
    suggestions,
  };
}

/**
 * Quick check: is the text likely parseable?
 * Used BEFORE running the full parser to give early feedback.
 */
export function isLikelyParseable(text: string): {
  parseable: boolean;
  hints: string[];
} {
  const hints: string[] = [];
  const normalized = text.toLowerCase().trim();

  // Check for trigger word
  const hasTrigger = ["cuando", "si ", "cada vez que", "en caso de que"].some(
    (t) => normalized.includes(t),
  );
  if (!hasTrigger) {
    hints.push('Falta palabra clave: empezá con "Cuando" o "Si"');
  }

  // Check for a number
  const hasNumber = /\d/.test(normalized);
  if (!hasNumber) {
    hints.push("Falta un número (umbral). Ejemplo: 8%, ₡5M, 60 puntos");
  }

  // Check for known metric
  const metrics = getAllMetrics();
  const hasMetric = metrics.some((m) =>
    m.names.some((n) => normalized.includes(n.toLowerCase())),
  );
  if (!hasMetric) {
    hints.push("No se detectó métrica conocida. Probá: churn, ingresos, satisfacción...");
  }

  return {
    parseable: hasTrigger && hasNumber && hasMetric,
    hints,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — STRUCTURAL VALIDATION
// ═══════════════════════════════════════════════════════════

function validateStructure(
  parsed: ParsedNLRule,
  issues: ValidationIssue[],
): void {
  // Must have at least one condition
  if (parsed.conditions.length === 0) {
    issues.push({
      severity: "error",
      code: "NO_CONDITIONS",
      message: "No se detectó ninguna condición en la regla.",
      location: "condition",
    });
    return;
  }

  // Each condition must have a metric
  parsed.conditions.forEach((c, idx) => {
    if (!c.metric) {
      issues.push({
        severity: "error",
        code: "MISSING_METRIC",
        message: `Condición ${idx + 1}: no se detectó métrica.`,
        location: "condition",
        conditionIndex: idx,
      });
    }

    if (!c.operator) {
      issues.push({
        severity: "error",
        code: "MISSING_OPERATOR",
        message: `Condición ${idx + 1}: no se detectó operador.`,
        location: "condition",
        conditionIndex: idx,
      });
    }

    if (c.threshold === null || c.threshold === undefined) {
      issues.push({
        severity: "error",
        code: "MISSING_THRESHOLD",
        message: `Condición ${idx + 1}: no se detectó umbral numérico.`,
        location: "condition",
        conditionIndex: idx,
      });
    }
  });

  // Must have an action
  if (!parsed.action) {
    issues.push({
      severity: "error",
      code: "NO_ACTION",
      message: "No se detectó acción. Agregá qué hacer: alertar, crear, reportar...",
      location: "action",
    });
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — SEMANTIC VALIDATION
// ═══════════════════════════════════════════════════════════

function validateSemantics(
  parsed: ParsedNLRule,
  issues: ValidationIssue[],
): void {
  parsed.conditions.forEach((c, idx) => {
    const metric = getMetricByPath(c.metric);
    if (!metric) return; // Already caught by structural validation

    // Threshold below reasonable minimum
    if (c.threshold < metric.reasonableMin) {
      issues.push({
        severity: "warning",
        code: "THRESHOLD_BELOW_MIN",
        message: `Condición ${idx + 1}: ${c.threshold}${c.unit} está por debajo del mínimo razonable (${metric.reasonableMin}) para "${metric.names[0]}".`,
        location: "condition",
        conditionIndex: idx,
      });
    }

    // Threshold above reasonable maximum
    if (c.threshold > metric.reasonableMax) {
      issues.push({
        severity: "warning",
        code: "THRESHOLD_ABOVE_MAX",
        message: `Condición ${idx + 1}: ${c.threshold}${c.unit} está por encima del máximo razonable (${metric.reasonableMax}) para "${metric.names[0]}".`,
        location: "condition",
        conditionIndex: idx,
      });
    }

    // Percentage metrics: threshold > 100 is suspicious
    if (c.unit === "%" && c.threshold > 100) {
      issues.push({
        severity: "warning",
        code: "PERCENTAGE_OVER_100",
        message: `Condición ${idx + 1}: ${c.threshold}% es mayor a 100%. ¿Es correcto?`,
        location: "condition",
        conditionIndex: idx,
      });
    }

    // Low parse confidence
    if (c.parseConfidence < 0.7) {
      issues.push({
        severity: "warning",
        code: "LOW_PARSE_CONFIDENCE",
        message: `Condición ${idx + 1}: confianza de parseo baja (${Math.round(c.parseConfidence * 100)}%). Verificá que la métrica sea correcta.`,
        location: "condition",
        conditionIndex: idx,
      });
    }
  });

  // Check for contradictory operators in multi-condition rules
  if (parsed.conditions.length > 1) {
    for (let i = 0; i < parsed.conditions.length; i++) {
      for (let j = i + 1; j < parsed.conditions.length; j++) {
        if (parsed.conditions[i].metric === parsed.conditions[j].metric) {
          const op1 = parsed.conditions[i].operator;
          const op2 = parsed.conditions[j].operator;
          if (
            (op1 === ">" && op2 === "<") ||
            (op1 === "<" && op2 === ">") ||
            (op1 === ">=" && op2 === "<=")
          ) {
            issues.push({
              severity: "warning",
              code: "CONTRADICTORY_CONDITIONS",
              message: `Las condiciones ${i + 1} y ${j + 1} tienen operadores contradictorios sobre la misma métrica.`,
              location: "condition",
            });
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — SAFETY VALIDATION
// ═══════════════════════════════════════════════════════════

function validateSafety(
  parsed: ParsedNLRule,
  issues: ValidationIssue[],
): void {
  if (!parsed.action) return;

  // Destructive actions MUST have HITL approval
  const destructiveVerbs = ["restringir", "bloquear", "suspender", "eliminar", "cancelar"];
  if (
    destructiveVerbs.some((v) => parsed.action.verb.includes(v)) &&
    parsed.action.approvalLevel !== "hitl"
  ) {
    issues.push({
      severity: "error",
      code: "DESTRUCTIVE_WITHOUT_HITL",
      message: `La acción "${parsed.action.verb}" es destructiva y requiere aprobación humana (HITL). El sistema la ha marcado automáticamente.`,
      location: "action",
    });
  }

  // Financial thresholds that could mean huge money
  const financialConditions = parsed.conditions.filter(
    (c) => c.unit === "₡" && c.threshold > 50_000_000,
  );
  if (financialConditions.length > 0) {
    issues.push({
      severity: "warning",
      code: "HIGH_FINANCIAL_THRESHOLD",
      message: `Umbral financiero alto (${financialConditions[0].threshold.toLocaleString("es-CR")}₡). Verificá que sea correcto.`,
      location: "condition",
    });
  }

  // Very low confidence overall
  if (parsed.parseConfidence < 0.5) {
    issues.push({
      severity: "error",
      code: "VERY_LOW_CONFIDENCE",
      message: `Confianza de parseo muy baja (${Math.round(parsed.parseConfidence * 100)}%). Intentá reformular la regla.`,
      location: "general",
    });
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — ACTION VALIDATION
// ═══════════════════════════════════════════════════════════

function validateAction(
  action: NLAction,
  issues: ValidationIssue[],
): void {
  // Verify the MCP tool exists
  if (!hasTool(action.server, action.tool)) {
    issues.push({
      severity: "warning",
      code: "TOOL_NOT_CONFIRMED",
      message: `La herramienta ${action.server}.${action.tool} no está confirmada en el sistema. Puede funcionar pero no está verificada.`,
      location: "action",
    });
  }

  // Check if tool has appropriate approval level
  const toolDef = getToolDef(action.server, action.tool);
  if (toolDef) {
    if (
      toolDef.approvalLevel === "hitl" &&
      action.approvalLevel !== "hitl"
    ) {
      issues.push({
        severity: "warning",
        code: "APPROVAL_LEVEL_MISMATCH",
        message: `La herramienta ${action.tool} requiere aprobación HITL pero la regla la configura como ${action.approvalLevel}. Se usará HITL.`,
        location: "action",
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════

function validateDuplicate(
  parsed: ParsedNLRule,
  existingRules: NLRuleTemplate[],
  issues: ValidationIssue[],
): void {
  if (existingRules.length === 0) return;

  // Normalize the parsed text for comparison
  const normalizedNew = normalizeForComparison(parsed.originalText);

  for (const existing of existingRules) {
    if (existing.status === "errored") continue;

    const normalizedExisting = normalizeForComparison(existing.text);

    // Exact match
    if (normalizedNew === normalizedExisting) {
      issues.push({
        severity: "error",
        code: "EXACT_DUPLICATE",
        message: `Esta regla es idéntica a "${existing.text.slice(0, 50)}..." ya existente.`,
        location: "general",
      });
      return;
    }

    // Same condition + same action (semantic duplicate)
    const existingConditions = extractConditionSignature(existing.text);
    const newConditions = parsed.conditions
      .map((c) => `${c.metric}|${c.operator}|${c.threshold}`)
      .join(";");

    if (existingConditions === newConditions) {
      issues.push({
        severity: "warning",
        code: "SEMANTIC_DUPLICATE",
        message: `Esta regla tiene la misma condición que "${existing.text.slice(0, 50)}...". ¿Son duplicadas?`,
        location: "general",
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — ENGINE OVERLAP DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Check if a NL rule overlaps with existing engine rules.
 * Engine rules are hardcoded and take priority.
 *
 * This is a SOFT check — it warns but doesn't block.
 */
function validateEngineOverlap(
  parsed: ParsedNLRule,
  issues: ValidationIssue[],
): void {
  // Known engine rule patterns that NL rules might overlap with
  const enginePatterns = [
    {
      metric: "summary.membership.churn_rate",
      operator: ">",
      threshold: 5,
      ruleId: "global_churn_predictor",
      description: "Rule R13: churn predictor (threshold 5%)",
    },
    {
      metric: "summary.financial.total_revenue",
      operator: "<",
      threshold: 0,
      ruleId: "global_systemic_risk",
      description: "Rule R1: systemic risk (revenue decline detection)",
    },
    {
      metric: "summary.operational.satisfaction_score",
      operator: "<",
      threshold: 60,
      ruleId: "global_satisfaction_alert",
      description: "Rule R15: satisfaction alert (threshold 60)",
    },
  ];

  for (const condition of parsed.conditions) {
    for (const engine of enginePatterns) {
      if (
        condition.metric === engine.metric &&
        condition.operator === engine.operator
      ) {
        // Check if thresholds are close (within 30%)
        const thresholdDiff = Math.abs(condition.threshold - engine.threshold);
        const thresholdRange = Math.max(condition.threshold, engine.threshold);
        const pctDiff = thresholdRange > 0 ? thresholdDiff / thresholdRange : 0;

        if (pctDiff < 0.3) {
          issues.push({
            severity: "info",
            code: "ENGINE_RULE_OVERLAP",
            message: `Esta regla se solapa con ${engine.description}. Ambas se evaluarán. La del engine tiene prioridad.`,
            location: "condition",
          });
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — SUGGESTION GENERATOR
// ═══════════════════════════════════════════════════════════

function generateSuggestions(
  _parsed: ParsedNLRule,
  issues: ValidationIssue[],
): string[] {
  const suggestions: string[] = [];

  // Auto-fix: destructive actions → HITL
  if (issues.some((i) => i.code === "DESTRUCTIVE_WITHOUT_HITL")) {
    suggestions.push(
      "Se cambió automáticamente el nivel de aprobación a HITL para la acción destructiva.",
    );
  }

  // Low confidence → suggest reformulation
  if (issues.some((i) => i.code === "VERY_LOW_CONFIDENCE")) {
    suggestions.push(
      'Intentá una estructura más simple: "Cuando [métrica] [operador] [número], [acción]".',
    );
  }

  // Missing metric → suggest known metrics
  if (issues.some((i) => i.code === "MISSING_METRIC")) {
    const topMetrics = getAllMetrics().slice(0, 5);
    suggestions.push(
      `Métricas disponibles: ${topMetrics.map((m) => m.names[0]).join(", ")}`,
    );
  }

  // Percentage over 100 → suggest check
  if (issues.some((i) => i.code === "PERCENTAGE_OVER_100")) {
    suggestions.push(
      "Si realmente necesitás un valor >100%, considerá usar otra unidad (₡, pts, count).",
    );
  }

  // Engine overlap → explain priority
  if (issues.some((i) => i.code === "ENGINE_RULE_OVERLAP")) {
    suggestions.push(
      "Las reglas del engine tienen prioridad sobre las reglas custom. Ambas se evalúan pero el engine actúa primero.",
    );
  }

  // Approval level mismatch
  if (issues.some((i) => i.code === "APPROVAL_LEVEL_MISMATCH")) {
    suggestions.push(
      "Se usará el nivel de aprobación más restrictivo (HITL) automáticamente.",
    );
  }

  return suggestions;
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Normalize text for duplicate comparison.
 * Strips accents, extra spaces, punctuation.
 */
function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?¡¿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract a rough "condition signature" from raw text
 * for semantic duplicate detection.
 * This is a best-effort heuristic for when we don't have
 * the parsed form of the existing rule.
 */
function extractConditionSignature(text: string): string {
  const normalized = normalizeForComparison(text);

  // Try to find metric + operator + number pattern
  const metrics = getAllMetrics();
  let metricPath = "";
  for (const m of metrics) {
    if (m.names.some((n) => normalized.includes(n.toLowerCase()))) {
      metricPath = m.path;
      break;
    }
  }

  if (!metricPath) return "";

  // Find operator
  let op = "";
  if (normalized.includes("supere") || normalized.includes("mayor")) op = ">";
  else if (normalized.includes("baje") || normalized.includes("menor")) op = "<";
  else if (normalized.includes("al menos") || normalized.includes("minimo")) op = ">=";
  else if (normalized.includes("maximo") || normalized.includes("no supere")) op = "<=";

  // Find number
  const numMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  const num = numMatch ? numMatch[1] : "";

  return `${metricPath}|${op}|${num}`;
}