/**
 * FrostedGlassCard.tsx
 * src/shared/components/ui/FrostedGlassCard.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .frost-card
 * @keyframes   4 (ui-frostcard-hueCycle, ui-frostcard-rotate,
 *                 ui-frostcard-rotateBg, ui-frostcard-shadowPulse)
 * @depends     globals.css §1 tokens, FrostedGlassCard.css (@property Houdini)
 *
 * SIGNATURE COMPONENT — The frost canvas, rotating glow orb,
 * and metric-aware aura are the visual identity of this system.
 * Inspired by @LukyVj Glowing Shadows, adapted to Castillo palette.
 *
 * PRE-WRITE VERIFICATION:
 * [x] Canvas 2D API verified (getContext("2d"))
 * [x] All tokens verified against globals.css §1
 * [x] @property Houdini declarations verified (Chrome 85+, graceful degradation)
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Default export → named export
 * [x] Tailwind on canvas (absolute inset-0 w-full h-full block) → BEM CSS
 * [x] style={{ zIndex: 0 }} → CSS z-index
 * [x] className concatenation → cn()
 * [x] Sub-components concatenation → cn()
 * [x] role="button" without onClick → removed
 * [x] Material var(--ease-apple) → Apple easing in CSS
 * [x] Missing data-testid → added
 * [x] Missing aria-hidden on glow → added
 * [x] Missing readonly → added
 * [x] Missing reduced motion → added in CSS
 * [x] Missing print → added in CSS
 * [x] Missing responsive → added in CSS
 * [x] Keyframes not namespaced → ui-frostcard-*
 */

// ═══ React core ═══
import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ═══ Shared — values ═══
import { cn } from "@/shared/lib/utils";
import "./FrostedGlassCard.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type TrendDirection = "up" | "down" | "neutral";

export interface FrostedGlassCardProps {
  readonly seed: number;
  readonly tone?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly badge?: ReactNode;
  readonly trend?: TrendDirection;
  readonly trendStrength?: number;
  readonly onClick?: () => void;
}

export interface FrostSubComponentProps {
  readonly children: ReactNode;
  readonly className?: string;
}


/* ═══════════════════════════════════════════════════════════════
   §2  SEEDED RNG — Deterministic frost pattern
   ═══════════════════════════════════════════════════════════════ */

function createRng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}


/* ═══════════════════════════════════════════════════════════════
   §3  CONSTANTS — Tone + Trend maps
   ═══════════════════════════════════════════════════════════════ */

/** Tone → frost gradient colors (canvas context, hex acceptable). */
const TONES: Record<string, readonly [string, string, string]> = {
  default:    ["#c0ccd8", "#a8b4c0", "#909ca8"],
  gold:       ["#d4c8b8", "#c0b4a4", "#ac9c8c"],
  teal:       ["#b4c8d4", "#9cb0c0", "#8498a8"],
  emerald:    ["#b0c8bc", "#98b0a4", "#80988c"],
  terracotta: ["#ccbcb0", "#b4a494", "#9c8c7c"],
  silver:     ["#c0c4c8", "#a8acb0", "#909498"],
  rose:       ["#c8b8bc", "#b0a0a4", "#98888c"],
};

/** Trend → aura CSS custom properties. */
const TREND_AURA: Record<TrendDirection, {
  readonly hue: number;
  readonly sat: string;
  readonly light: string;
  readonly pulseSpeed: string;
}> = {
  up:      { hue: 152, sat: "80%", light: "55%", pulseSpeed: "3s" },
  down:    { hue: 350, sat: "75%", light: "60%", pulseSpeed: "2s" },
  neutral: { hue: 42,  sat: "60%", light: "55%", pulseSpeed: "4s" },
};


/* ═══════════════════════════════════════════════════════════════
   §4  FROST CANVAS RENDERER — One-shot deterministic render
   Generates procedural frost texture via seeded RNG.
   Canvas hex colors are acceptable (not CSS context).
   ═══════════════════════════════════════════════════════════════ */

function renderFrost(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  seed: number,
  tone: string,
) {
  const r = createRng(seed);
  const colors = TONES[tone] ?? TONES.default;

  /* Base gradient */
  const bg = ctx.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(0.5, colors[1]);
  bg.addColorStop(1, colors[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Frost patches — large blurred ellipses */
  ctx.save();
  ctx.filter = "blur(40px)";
  const pCount = 8 + Math.floor(r() * 5);
  for (let i = 0; i < pCount; i++) {
    const x = r() * W;
    const y = r() * H;
    const rx = 30 + r() * 80;
    const ry = 20 + r() * 60;
    const angle = r() * Math.PI;
    const alpha = 0.04 + r() * 0.10;
    ctx.fillStyle = `rgba(220,230,240,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* Wavy frost lines */
  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.lineCap = "round";
  const lCount = 3 + Math.floor(r() * 3);
  for (let i = 0; i < lCount; i++) {
    ctx.strokeStyle = `rgba(210,220,235,${(0.03 + r() * 0.05).toFixed(3)})`;
    ctx.lineWidth = 25 + r() * 45;
    ctx.beginPath();
    let px = -20;
    let py = r() * H;
    ctx.moveTo(px, py);
    const segs = 4 + Math.floor(r() * 3);
    for (let j = 0; j < segs; j++) {
      const cpx = px + (W + 40) / segs * (0.3 + r() * 0.4);
      const cpy = py + (r() - 0.5) * H * 0.6;
      px += (W + 40) / segs;
      py += (r() - 0.5) * H * 0.3;
      ctx.quadraticCurveTo(cpx, cpy, px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  /* Secondary patches — depth */
  ctx.save();
  ctx.filter = "blur(60px)";
  for (let i = 0; i < 4; i++) {
    const x = r() * W;
    const y = r() * H;
    const rx = 50 + r() * 100;
    const ry = 40 + r() * 80;
    ctx.fillStyle = `rgba(200,215,230,${(0.02 + r() * 0.04).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}


/* ═══════════════════════════════════════════════════════════════
   §5  COMPONENT — FrostedGlassCard
   Canvas-generated frost texture + CSS Houdini glow orb +
   metric-aware aura. The signature visual of the system.
   ═══════════════════════════════════════════════════════════════ */

export function FrostedGlassCard({
  seed,
  tone = "default",
  children,
  className,
  badge,
  trend = "neutral",
  trendStrength = 0,
  onClick,
}: FrostedGlassCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /* ── §5.1  Frost canvas — render once ── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || doneRef.current) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const rect = cvs.parentElement?.getBoundingClientRect();
    const W = Math.round(rect?.width || 280);
    const H = Math.round(rect?.height || 252);
    cvs.width = W;
    cvs.height = H;

    renderFrost(ctx, W, H, seed, tone);
    doneRef.current = true;
  }, [seed, tone]);

  /* ── §5.2  Trend aura — apply CSS vars via ref ── */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const aura = TREND_AURA[trend];
    const clamped = Math.max(0, Math.min(1, trendStrength));

    el.style.setProperty("--aura-hue", `${aura.hue}`);
    el.style.setProperty("--aura-sat", aura.sat);
    el.style.setProperty("--aura-light", aura.light);
    el.style.setProperty("--aura-pulse-speed", aura.pulseSpeed);
    el.style.setProperty("--aura-intensity", `${clamped}`);
  }, [trend, trendStrength]);

  /* ── §5.3  Render ── */
  return (
    <div
      ref={cardRef}
      data-testid="ui-frostcard"
      data-trend={trend}
      className={cn(
        "frost-card",
        trend !== "neutral" && `frost-card--trend-${trend}`,
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Glow orb — rotating ambient aura */}
      <span className="frost-card__glow" aria-hidden="true" />

      {/* Inner glass surface */}
      <div className="frost-card__inner">
        {/* Frost canvas */}
        <canvas
          ref={canvasRef}
          className="frost-card__canvas"
          aria-hidden="true"
        />

        {/* Badge */}
        {badge && (
          <div className="frost-card__badge">
            {badge}
          </div>
        )}

        {/* Content overlay */}
        <div className="frost-card__content">
          {children}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   §6  SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

export function FrostCategory({ children, className }: FrostSubComponentProps) {
  return (
    <div className={cn("frost-card__category", className)}>
      {children}
    </div>
  );
}

export function FrostTitle({ children, className }: FrostSubComponentProps) {
  return (
    <div className={cn("frost-card__title", className)}>
      {children}
    </div>
  );
}

export function FrostDescription({ children, className }: FrostSubComponentProps) {
  return (
    <div className={cn("frost-card__desc", className)}>
      {children}
    </div>
  );
}