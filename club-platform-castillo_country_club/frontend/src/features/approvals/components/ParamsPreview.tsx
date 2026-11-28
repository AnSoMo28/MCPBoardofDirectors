/**
 * @component ParamsPreview (Fase 25 — REWRITE)
 * @namespace .glass-params
 * @depends ParamsPreview.css, paramsConfig
 * @note Smart formatted params view with expand/collapse, delta visual bar,
 *       copy JSON button, fallback JSON view.
 *       Backward-compatible: same named export, same props interface.
 * @import import './ParamsPreview.css';
 */

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { showToast } from "@/shared/components/ui";
import {
  TOOL_FIELDS,
  formatValue,
  getDeltaPercent,
  COLLAPSE_THRESHOLD
} from "../paramsConfig";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ParamsPreviewProps {
  tool: string;
  params: Record<string, unknown>;
}

/* ═══════════════════════════════════════
   Copy Button
   ═══════════════════════════════════════ */

function CopyButton({ params }: { params: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(params, null, 2),
      );
      setCopied(true);
      showToast({ type: "success", message: "Parámetros copiados" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({
        type: "error",
        message: "No se pudo copiar al portapapeles",
      });
    }
  }, [params]);

  return (
    <Button
      variant="unstyled"
      type="button"
      className={`glass-params__copy-btn${copied ? " glass-params__copy-btn--copied" : ""}`}
      onClick={handleCopy}
      aria-label="Copiar parámetros como JSON"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : "Copiar JSON"}
    </Button>
  );
}

/* ═══════════════════════════════════════
   Delta Bar
   ═══════════════════════════════════════ */

function DeltaBar({
  current,
  suggested,
}: {
  current: unknown;
  suggested: unknown;
}) {
  const pct = getDeltaPercent(current, suggested);
  if (pct === null) return null;

  const isPositive = pct >= 0;
  const absPct = Math.abs(pct);
  const barWidth = Math.min(absPct * 2, 100); /* scale: 50% change = 100% bar */
  const level = isPositive ? "positive" : "negative";

  return (
    <div className="glass-params__delta-bar-wrap">
      <div className="glass-params__delta-bar">
        <div
          className={`glass-params__delta-bar-fill glass-params__delta-bar-fill--${level}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span
        className={`glass-params__delta-label glass-params__delta-label--${level}`}
      >
        {isPositive ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Fallback Preview
   ═══════════════════════════════════════ */

function FallbackPreview({
  params,
}: {
  params: Record<string, unknown>;
}) {
  const displayParams = Object.entries(params).filter(
    ([key]) => key !== "action" && key !== "requested_by",
  );

  if (displayParams.length === 0) {
    return <p className="glass-params__empty">Sin parámetros.</p>;
  }

  return (
    <div className="glass-params__fallback">
      {displayParams.map(([key, value]) => (
        <div key={key} className="glass-params__fallback-row">
          <span className="glass-params__fallback-key">{key}</span>
          <span className="glass-params__fallback-value">
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value ?? "—")}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ParamsPreview({ tool, params }: ParamsPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const fields = TOOL_FIELDS[tool];

  /* ── Known tool: no fields (e.g. communication_insights) ── */
  if (fields && fields.length === 0) {
    return (
      <div className="glass-params">
        <CopyButton params={params} />
        <p className="glass-params__empty">
          Sin parámetros requeridos — ejecución directa.
        </p>
      </div>
    );
  }

  /* ── Known tool: formatted fields ── */
  if (fields && fields.length > 0) {
    /* Filter to visible fields (non-empty, non-false) */
    const visibleFields = fields.filter((f) => {
      const val = params[f.key];
      return val !== undefined && val !== null && val !== "" && val !== false;
    });

    /* Paired (delta) keys — skip as standalone rows */
    const deltaKeys = new Set(
      fields.filter((f) => f.format === "delta").map((f) => f.pairedWith),
    );

    if (visibleFields.length === 0) {
      return (
        <div className="glass-params">
          <CopyButton params={params} />
          <FallbackPreview params={params} />
        </div>
      );
    }

    /* Sort by priority for collapse: lower priority value = shown first */
    const sorted = [...visibleFields].sort(
      (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
    );

    const needsCollapse = sorted.length > COLLAPSE_THRESHOLD;
    const primaryFields = needsCollapse
      ? sorted.slice(0, COLLAPSE_THRESHOLD)
      : sorted;
    const extraFields = needsCollapse ? sorted.slice(COLLAPSE_THRESHOLD) : [];
    const displayFields = expanded
      ? [...primaryFields, ...extraFields]
      : primaryFields;

    return (
      <div className="glass-params">
        <CopyButton params={params} />

        <div className="glass-params__fields">
          {displayFields.map((field) => {
            const value = params[field.key];
            const pairedValue = field.pairedWith
              ? params[field.pairedWith]
              : undefined;

            /* Skip paired delta keys as standalone rows */
            if (deltaKeys.has(field.key)) return null;

            /* Boolean false already filtered, but double-check */
            if (field.format === "boolean" && !value) return null;

            /* Delta rendering */
            if (field.format === "delta") {
              const deltaText = formatValue(
                value,
                "delta",
                pairedValue,
              );
              return (
                <div key={field.key} className="glass-params__field">
                  <span className="glass-params__field-label">
                    {field.label}
                  </span>
                  <div className="glass-params__field-value glass-params__delta">
                    <span className="glass-params__delta-text">
                      {deltaText}
                    </span>
                    <DeltaBar
                      current={value}
                      suggested={pairedValue}
                    />
                  </div>
                </div>
              );
            }

            /* Standard field rendering */
            const displayValue = formatValue(value, field.format);
            const valueClass =
              field.format === "currency"
                ? "glass-params__field-value glass-params__field-value--currency"
                : field.format === "date"
                  ? "glass-params__field-value glass-params__field-value--date"
                  : field.format === "boolean"
                    ? "glass-params__field-value glass-params__field-value--boolean"
                    : "glass-params__field-value";

            return (
              <div key={field.key} className="glass-params__field">
                <span className="glass-params__field-label">
                  {field.label}
                </span>
                <span className={valueClass}>{displayValue}</span>
              </div>
            );
          })}
        </div>

        {/* Expand / collapse button */}
        {needsCollapse && (
          <Button
            variant="unstyled"
            type="button"
            className="glass-params__expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp size={12} />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown size={12} />
                Ver {extraFields.length} más{" "}
                {extraFields.length === 1 ? "campo" : "campos"}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  /* ── Unknown tool: fallback ── */
  return (
    <div className="glass-params">
      <CopyButton params={params} />
      <FallbackPreview params={params} />
    </div>
  );
}