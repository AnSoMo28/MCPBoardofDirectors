/**
 * @component LoginBranding (Fase 25)
 * @namespace .glass-login__left
 * @depends LoginPage.css, MarbleCanvas
 * @note Left panel: marble canvas, logo with golden aura, shimmer title,
 *       time-aware greeting, club pulse preview.
 * @import import '../LoginPage.css';
 */

import MarbleCanvas from "@/shared/components/layout/MarbleCanvas";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface LoginBrandingProps {
  greeting: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  backendStatus: "checking" | "connected" | "error";
}

/* ═══════════════════════════════════════
   Pulse config
   ═══════════════════════════════════════ */

const PULSE_CONFIG = {
  checking: {
    label: "Verificando sistema\u2026",
    dotClass: "glass-login__club-pulse-dot--checking",
  },
  connected: {
    label: "8 agentes activos",
    dotClass: "",
  },
  error: {
    label: "Sistema en mantenimiento",
    dotClass: "glass-login__club-pulse-dot--error",
  },
} as const;

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function LoginBranding({
  greeting,
  timeOfDay,
  backendStatus,
}: LoginBrandingProps) {
  const pulse = PULSE_CONFIG[backendStatus];

  return (
    <div
      className={`glass-login__left glass-login__left--${timeOfDay}`}
      aria-hidden="true"
    >
      {/* z-0: Marble canvas */}
      <div className="glass-login__left-marble">
        <MarbleCanvas />
      </div>

      {/* z-1: Dark tint overlay */}
      <div className="glass-login__left-overlay" />

      {/* z-1: Time-aware tint */}
      <div className="glass-login__left-tint" />

      {/* z-2: Vignette */}
      <div className="glass-login__left-vignette" />

      {/* z-3: Particles (CSS-only, no inline styles) */}
      <div className="glass-login__left-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="glass-login__left-particle" />
        ))}
      </div>

      {/* z-10: Content */}
      <div className="glass-login__left-content">
        {/* Logo with golden glow */}
        <div className="glass-login__logo-wrap">
          <div
            className="glass-login__logo-glow"
            aria-hidden="true"
          />
          <img
            src="/CCC.png"
            alt="Castillo Country Club"
            className="glass-login__logo"
          />
        </div>

        {/* Title shimmer */}
        <h1 className="glass-login__title">Castillo</h1>
        <h2 className="glass-login__subtitle">Country Club</h2>

        {/* Gold divider */}
        <div className="glass-login__divider-line" />

        {/* Greeting (time-aware) */}
        <p className="glass-login__greeting">{greeting}</p>

        {/* Tagline shimmer */}
        <p className="glass-login__tagline">
          La familia por excelencia
        </p>

        {/* Club Pulse — system alive indicator */}
        <div className="glass-login__club-pulse">
          <span
            className={`glass-login__club-pulse-dot ${pulse.dotClass}`}
          />
          <span className="glass-login__club-pulse-text">
            {pulse.label}
          </span>
        </div>
      </div>

      {/* Location */}
      <p className="glass-login__location">Escazú, Costa Rica</p>
    </div>
  );
}