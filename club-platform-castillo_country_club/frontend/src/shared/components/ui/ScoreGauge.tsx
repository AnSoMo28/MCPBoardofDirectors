/**
 * ScoreGauge.tsx
 * src/shared/components/ui/ScoreGauge.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-gauge
 * @keyframes   0
 * @depends     globals.css §1 tokens, useReducedMotion
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] useReducedMotion verified in shared/hooks/useReducedMotion
 * [x] All tokens verified against globals.css §1
 * [x] emerald-400, teal-400, amber-400, rose-400 verified
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind wrapper (inline-flex flex-col items-center gap-1) → BEM
 * [x] Tailwind SVG rotation (transform -rotate-90) → BEM CSS
 * [x] style={{ width, height }} → CSS custom property --gauge-size
 * [x] style={{ color }} on number → CSS custom property --gauge-color
 * [x] style={{ filter: drop-shadow(...) }} → CSS using --gauge-color
 * [x] glass-gauge namespace → ui-gauge (consistent)
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden on endpoint → added
 * [x] Missing readonly → added
 * [x] Missing reduced motion → CSS
 * [x] Missing responsive → CSS
 * [x] Missing print → CSS
 *
 * FIXES v2.1 — Auditoría G9 (Paquete 1 · REQUEST 1 §13 #1):
 * [x] G9-01 (P0) Hook condicional `reducedMotion ? score : useAnimatedCounter(score)`
 *     violaba las Reglas de Hooks: al togglear prefers-reduced-motion en caliente
 *     cambia el número de hooks invocados → crash "Rendered fewer hooks than
 *     expected" + estado corrupto. AHORA el hook se invoca SIEMPRE; el
 *     reduced-motion se resuelve por VALOR (duration 0 + selección de valor),
 *     nunca por rama.
 * [x] G9-02 (P1) Ángulo del endpoint `pct * 360 - 90` doble-compensaba el
 *     `rotate(-90deg)` de .ui-gauge__svg → punto desfasado 90° respecto del
 *     fin real del arco (p.ej. pct=0.25: punto visual a las 12, arco terminando
 *     a las 3). AHORA el ángulo comparte base con el arco (0° = 3 en punto,
 *     sentido horario) y el -90° lo aporta exclusivamente el CSS.
 * [x] Constantes mágicas extraídas (ANIMATION_DURATION_MS, ENDPOINT_MIN_RATIO).
 */

// ═══ React core ═══
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import "./ScoreGauge.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export interface ScoreGaugeProps {
  readonly score: number;
  readonly maxScore?: number;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly color?: string;
  readonly label?: string;
  readonly className?: string;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS + HELPERS
   ═══════════════════════════════════════════════════════════════ */

/** Duración del contador animado (ms). 0 = valor final inmediato. */
const ANIMATION_DURATION_MS = 700;

/** Ratio mínimo para renderizar el punto final (evita dot pegado al inicio). */
const ENDPOINT_MIN_RATIO = 0.02;

/** Threshold auto-color: ratio → semantic token. */
function getThresholdColor(ratio: number): string {
  if (ratio >= 0.8) return "var(--color-emerald-400)";
  if (ratio >= 0.6) return "var(--color-teal-400)";
  if (ratio >= 0.3) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

/**
 * rAF-based animated counter with ease-out cubic.
 *
 * G9-01: `duration <= 0` (reduced motion) asienta el valor final de
 * inmediato sin programar rAF — el hook se invoca SIEMPRE desde el
 * componente; la condición vive DENTRO del efecto, no en la call-site.
 */
function useAnimatedCounter(target: number, duration: number): number {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (duration <= 0) {
      setDisplay(target);
      return;
    }

    fromRef.current = display;
    startRef.current = null;

    let fid: number;
    function tick(now: number): void {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
      setDisplay(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) fid = requestAnimationFrame(tick);
    }
    fid = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(fid);
    // 'display' se excluye A PROPÓSITO: cada animación parte del valor
    // actualmente mostrado (fromRef), no re-lee el estado del render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — ScoreGauge
   SVG circular gauge with glass track, animated counter,
   threshold auto-color, and glow endpoint dot.
   ═══════════════════════════════════════════════════════════════ */

export function ScoreGauge({
  score,
  maxScore = 100,
  size = 80,
  strokeWidth = 6,
  color: colorProp,
  label,
  className,
}: ScoreGaugeProps) {
  const reducedMotion = useReducedMotion();

  /* ── Geometry ── */
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / maxScore, 0), 1);
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  /* ── Color (explicit or auto-threshold) ── */
  const color = colorProp ?? getThresholdColor(pct);

  /* ── Animated counter ──
     G9-01: hook INCONDICIONAL. El reduced-motion entra como valor
     (duration 0) y se selecciona el resultado — jamás por rama. */
  const animatedScore = useAnimatedCounter(
    score,
    reducedMotion ? 0 : ANIMATION_DURATION_MS,
  );
  const displayScore = reducedMotion ? score : animatedScore;

  /* ── Endpoint dot position ──
     G9-02: base angular compartida con el arco (0° = 3 en punto,
     horario). El offset -90° lo aporta .ui-gauge__svg (rotate), NO aquí. */
  const angle = pct * 360;
  const angleRad = (angle * Math.PI) / 180;
  const dotX = center + radius * Math.cos(angleRad);
  const dotY = center + radius * Math.sin(angleRad);

  return (
    <div
      data-testid="ui-gauge"
      className={cn("ui-gauge", className)}
      style={{
        "--gauge-size": `${size}px`,
        "--gauge-color": color,
      } as CSSProperties}
    >
      {/* SVG gauge */}
      <div className="ui-gauge__ring">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="ui-gauge__svg"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={maxScore}
          aria-label={label ?? `Score: ${score} de ${maxScore}`}
        >
          {/* Track (glass) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="ui-gauge__track"
            strokeWidth={strokeWidth}
          />

          {/* Fill arc — strokeDashoffset kept inline for CSS transition */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="ui-gauge__fill"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset } as CSSProperties}
          />

          {/* Endpoint dot */}
          {pct > ENDPOINT_MIN_RATIO && (
            <circle
              cx={dotX}
              cy={dotY}
              r={strokeWidth * 0.7}
              className="ui-gauge__endpoint"
              aria-hidden="true"
            />
          )}
        </svg>

        {/* Centered score text */}
        <div className="ui-gauge__value">
          <span className="ui-gauge__number">
            {displayScore}
          </span>
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className="ui-gauge__label">
          {label}
        </span>
      )}
    </div>
  );
}
