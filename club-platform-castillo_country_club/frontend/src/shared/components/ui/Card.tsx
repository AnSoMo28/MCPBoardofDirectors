/**
 * Card.tsx
 * src/shared/components/ui/Card.tsx
 *
 * @level       Level 6+ Agency · Apple Production Grade · 2027
 * @role        Senior Expert UI/UX, AI/ML, Architecture
 * @namespace   .ui-card (sub-components: .ui-card__header, .ui-card__title, etc.)
 * @keyframes   0 — aura keyframes live in globals.css §8 Group 2
 * @depends     globals.css §4 glass-card primitives, §8 aura keyframes, useTilt
 *
 * PRE-WRITE VERIFICATION:
 * [x] cn utility verified in shared/lib/utils
 * [x] useTilt verified in shared/hooks/useTilt
 * [x] glass-card classes verified in globals.css §4
 * [x] glass-card--aura classes verified in globals.css §4
 * [x] All aura keyframes verified in globals.css §8 Group 2
 * [x] CardTone values verified against globals.css data-tone selectors
 *
 * ANTI-PATTERNS REMOVED:
 * [x] Tailwind utilities in sub-components → BEM CSS (.ui-card__*)
 * [x] font-[family-name:var(--font-display)] → CSS font-family
 * [x] text-white/45 → var(--color-silver-400) in CSS
 * [x] text-[var(--color-pearl)] → var(--color-silver-100) in CSS
 * [x] hover:transform-none → .ui-card--static modifier
 * [x] space-y-1.5 → CSS gap
 * [x] mb-4, mt-4, pt-4 → CSS spacing
 * [x] p-5 → CSS padding
 * [x] Missing data-testid → added
 * [x] Missing light mode → added in CSS
 * [x] Mutable props → readonly
 * [x] Missing role logic → conditional role on interactive cards
 */

// ═══ React core ═══
import {
  useRef,
  useEffect,
  type ReactNode,
  type HTMLAttributes,
} from "react";

// ═══ Shared — values ═══
import { cn } from "../../lib/utils";
import { useTilt } from "../../hooks/useTilt";
import "./Card.css";


/* ═══════════════════════════════════════════════════════════════
   §1  TYPES
   ═══════════════════════════════════════════════════════════════ */

export type CardTone = "teal" | "gold" | "jade" | "aqua" | "deep" | "emerald" | "silver" | "rose";
export type AuraVariant = "gold" | "silver";
export type TrendDirection = "up" | "down" | "neutral";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly className?: string;
  readonly padding?: boolean;
  readonly hover?: boolean;
  readonly tone?: CardTone;
  readonly glowColor?: string;
  readonly tilt?: boolean;
  readonly aura?: AuraVariant;
  readonly trend?: TrendDirection;
  readonly trendStrength?: number;
}


/* ═══════════════════════════════════════════════════════════════
   §2  CONSTANTS — Aura + Trend config
   Aura hue/sat/light are applied via ref to avoid re-renders.
   Trend overrides aura when active + strength > 0.
   ═══════════════════════════════════════════════════════════════ */

const AURA_CONFIG: Record<AuraVariant, {
  readonly glowHue: number;
  readonly glowSat: string;
  readonly glowLight: string;
}> = {
  gold:   { glowHue: 42,  glowSat: "60%", glowLight: "55%" },
  silver: { glowHue: 220, glowSat: "15%", glowLight: "65%" },
};

const TREND_AURA: Record<TrendDirection, {
  readonly hue: number;
  readonly sat: string;
  readonly light: string;
  readonly pulseSpeed: string;
}> = {
  up:      { hue: 152, sat: "80%", light: "55%", pulseSpeed: "3s" },
  down:    { hue: 350, sat: "75%", light: "60%", pulseSpeed: "2s" },
  neutral: { hue: 0,   sat: "0%",  light: "0%",  pulseSpeed: "4s" },
};


/* ═══════════════════════════════════════════════════════════════
   §3  COMPONENT — Card (Root)
   Glass surface with optional aura, tilt, tone, and glow.
   Aura/trend CSS vars applied via ref (no re-render).
   ═══════════════════════════════════════════════════════════════ */

export function Card({
  children,
  className,
  padding = true,
  hover = true,
  tone,
  glowColor,
  tilt = false,
  aura,
  trend = "neutral",
  trendStrength = 0,
  style,
  ...rest
}: CardProps) {

  /* ─── §3.1  Refs ─────────────────────────────────────────── */

  const tiltRef = useTilt<HTMLDivElement>(tilt && hover);
  const auraRef = useRef<HTMLDivElement>(null);

  const hasAura = !!aura;
  const auraCfg = hasAura ? AURA_CONFIG[aura] : null;


  /* ─── §3.2  Effects — Aura CSS Variables ─────────────────── */

  useEffect(() => {
    const el = auraRef.current;
    if (!el || !hasAura) return;

    const trendCfg = TREND_AURA[trend];
    const clamped = Math.max(0, Math.min(1, trendStrength));
    const isTrendActive = trend !== "neutral" && clamped > 0;

    el.style.setProperty("--card-aura-hue",
      `${isTrendActive ? trendCfg.hue : auraCfg!.glowHue}`);
    el.style.setProperty("--card-aura-sat",
      isTrendActive ? trendCfg.sat : auraCfg!.glowSat);
    el.style.setProperty("--card-aura-light",
      isTrendActive ? trendCfg.light : auraCfg!.glowLight);
    el.style.setProperty("--card-aura-pulse-speed",
      isTrendActive ? trendCfg.pulseSpeed : "4s");
    el.style.setProperty("--card-aura-intensity",
      `${isTrendActive ? clamped : 0.15}`);
  }, [hasAura, auraCfg, trend, trendStrength]);


  /* ─── §3.3  Render ───────────────────────────────────────── */

  return (
    <div
      ref={(node) => {
        (auraRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (tiltRef && typeof tiltRef === "object") {
          (tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      data-testid="ui-card"
      data-tone={tone || undefined}
      data-glow={glowColor ? "custom" : undefined}
      className={cn(
        "ui-card",
        "glass-card",
        hasAura && "glass-card--aura",
        hasAura && aura === "gold" && "glass-card--aura-gold",
        hasAura && aura === "silver" && "glass-card--aura-silver",
        trend !== "neutral" && trendStrength > 0 && `glass-card--trend-${trend}`,
        padding && "ui-card--padded",
        !hover && "ui-card--static",
        glowColor && "glow-card",
        className,
      )}
      style={{
        ...(glowColor ? { "--glow-color": glowColor } as React.CSSProperties : {}),
        ...style,
      }}
      role={hasAura ? "button" : undefined}
      {...rest}
    >
      {/* Aura orb — rotating ambient glow */}
      {hasAura && (
        <span className="glass-card__aura-orb" aria-hidden="true" />
      )}

      {/* Inner surface */}
      <div className={cn(hasAura && "glass-card__aura-inner")}>
        {children}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   §4  SUB-COMPONENTS — Header, Title, Description, Content, Footer
   All BEM: .ui-card__header, .ui-card__title, etc.
   ═══════════════════════════════════════════════════════════════ */

export function CardHeader({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ui-card__header", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("ui-card__title", className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("ui-card__description", className)}
      {...rest}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ui-card__content", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ui-card__footer", className)}
      {...rest}
    >
      {children}
    </div>
  );
}