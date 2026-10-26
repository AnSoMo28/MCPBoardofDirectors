/**
 * FreshnessBadge.tsx
 * src/shared/components/ui/FreshnessBadge.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-freshness
 * @keyframes   3 (ui-freshness-pulse-fresh, ui-freshness-pulse-stale,
 *                 ui-freshness-stale-glow) — in FreshnessBadge.css
 * @depends     globals.css §1 tokens, useDataFreshness hook
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] useDataFreshness type verified via ReturnType
 * [x] All tokens verified against globals.css §1
 *
 * ANTI-PATTERNS REMOVED:
 * [x] glass-freshness-badge namespace → ui-freshness
 * [x] Non-namespaced keyframes → ui-freshness-*
 * [x] Font weight 500 → 700 per D4-05
 * [x] isFresh logic bug (operator precedence) → proper word boundary check
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden on dot → added
 * [x] Missing reduced motion → CSS
 * [x] Missing print → CSS
 * [x] Mutable props → readonly
 *
 * FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #2):
 * [x] G9-04 (P1) `/[hd]/` sin fronteras de palabra clasificaba como "stale"
 *     cualquier etiqueta que contuviera las letras 'h' o 'd' en CUALQUIER
 *     posición (p.ej. "hace 45 seg" → stale falso). AHORA patrones con
 *     word-boundaries + forma compacta (\d\s*h), verificados contra el set
 *     de etiquetas del hook: "45 seg" · "5 min" · "2 h" · "3 d" · "5s" ·
 *     "horas" · "días" · "hace 5 min" · "un momento".
 * [x] G9-05 (P3) Rama muerta `/\ds$/` (subconjunto estricto de `/\ds\b/`
 *     ya evaluado en la rama fresh) eliminada; FreshnessData exportado
 *     (API pública del paquete); JSDoc con "día, día" corregido.
 */

// ═══ React core ═══
import type { CSSProperties } from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./FreshnessBadge.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

/** Contrato del hook useDataFreshness (label humana + color CSS). */
export interface FreshnessData {
  readonly label: string;
  readonly color: string;
}

export interface FreshnessBadgeProps {
  readonly freshness: FreshnessData;
  readonly className?: string;
}


/* ═══════════════════════════════════════════════════════════════
   §2  HELPERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * G9-04: unidades con fronteras de palabra + forma compacta.
 * - Stale:  h | hs | hora(s) | d | ds | día(s)  | "2h" | "3d"
 * - Fresh:  s | seg(s) | segundo(s) | min(s) | minuto(s) | "5s" | "12m"
 * - Neutral: todo lo demás ("un momento", "ayer", vacío…)
 * "hace 45 seg" ya NO colisiona: la 'h' de "hace" no tiene \b tras ella.
 */
const STALE_PATTERN = /\b(?:h|hs|horas?|d|ds|días?)\b|\d\s*(?:h|d)\b/;
const FRESH_PATTERN =
  /\b(?:s|seg|segs|segundos?|min|mins|minutos?)\b|\d\s*(?:s|m)\b/;

function classifyFreshness(label: string): "fresh" | "stale" | "neutral" {
  const lower = label.toLowerCase().trim();
  if (STALE_PATTERN.test(lower)) return "stale";
  if (FRESH_PATTERN.test(lower)) return "fresh";
  return "neutral";
}


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — FreshnessBadge
   Compact mono badge with live pulse dot for fresh data
   and warning glow for stale data.
   ═══════════════════════════════════════════════════════════════ */

export function FreshnessBadge({ freshness, className }: FreshnessBadgeProps) {
  const status = classifyFreshness(freshness.label);

  return (
    <span
      data-testid="ui-freshness"
      className={cn(
        "ui-freshness",
        status === "stale" && "ui-freshness--stale",
        className,
      )}
      style={{ "--badge-color": freshness.color } as CSSProperties}
      title={`Datos actualizados hace ${freshness.label}`}
    >
      <span
        className={cn(
          "ui-freshness__dot",
          status === "fresh" && "ui-freshness__dot--fresh",
          status === "stale" && "ui-freshness__dot--stale",
        )}
        aria-hidden="true"
      />
      {freshness.label}
    </span>
  );
}
