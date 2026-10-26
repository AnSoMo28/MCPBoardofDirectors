/**
 * @component LoginPage (Fase 25 — REWRITE)
 * @namespace .glass-login
 * @depends useLoginPage, LoginBranding, GlassLoginCard, LoginPage.css
 * @note Split-panel login with time-aware branding, glass card,
 *       smart error recovery, club pulse preview.
 *       Backward-compatible: same named + default export, same route.
 * @import import './LoginPage.css';
 */

import { useEffect } from "react";
import { Navigate } from "react-router";
import { Sun, Moon } from "lucide-react";
import { useLoginPage } from "./hooks/useLoginPage";
import { LoginBranding } from "./components/LoginBranding";
import { GlassLoginCard } from "./components/GlassLoginCard";
import "./LoginPage.css";

/* ═══════════════════════════════════════
   Keyboard
   ═══════════════════════════════════════ */

function useLoginKeyboard(
  toggleTheme: () => void,
) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;

      /* Esc: blur focused input */
      if (e.key === "Escape") {
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          target.blur();
        }
        return;
      }

      /* Skip if typing in form field */
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;

      /* T: Toggle theme */
      if (
        (e.key === "t" || e.key === "T") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        toggleTheme();
      }
    };

    document.addEventListener("keydown", handler);
    return () =>
      document.removeEventListener("keydown", handler);
  }, [toggleTheme]);
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function LoginPage() {
  const h = useLoginPage();
  useLoginKeyboard(h.toggleTheme);

  /* ── Redirect if authenticated ── */
  if (h.isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="glass-login">
      {/* Skip link (keyboard only) */}
      <a href="#login-form" className="glass-login__skip-link">
        Saltar al formulario
      </a>

      {/* ═══ Left Panel — Branding ═══ */}
      <LoginBranding
        greeting={h.greeting}
        timeOfDay={h.timeOfDay}
        backendStatus={h.backendStatus}
      />

      {/* ═══ Panel Divider ═══ */}
      <div
        className="glass-login__panel-divider"
        aria-hidden="true"
      />

      {/* ═══ Right Panel — Login ═══ */}
      <div className="glass-login__right">
        {/* Background layers */}
        <div
          className="glass-login__right-noise"
          aria-hidden="true"
        />
        <div
          className="glass-login__right-vignette"
          aria-hidden="true"
        />

        {/* Theme toggle */}
        <button
          onClick={h.toggleTheme}
          className="glass-login__theme"
          aria-label={
            h.theme === "light"
              ? "Cambiar a modo oscuro"
              : "Cambiar a modo claro"
          }
        >
          {h.theme === "light" ? (
            <Moon size={18} strokeWidth={1.5} />
          ) : (
            <Sun size={18} strokeWidth={1.5} />
          )}
        </button>

        {/* Mobile logo */}
        <div className="glass-login__mobile-logo">
          <img src="/CCC.png" alt="Castillo Country Club" />
          <h1 className="glass-login__mobile-title">Castillo</h1>
          <p className="glass-login__mobile-subtitle">
            Country Club
          </p>
        </div>

        {/* Login Card */}
        <GlassLoginCard
          email={h.email}
          setEmail={h.setEmail}
          password={h.password}
          setPassword={h.setPassword}
          showPassword={h.showPassword}
          setShowPassword={h.setShowPassword}
          error={h.error}
          errorType={h.errorType}
          errorMessage={h.errorMessage}
          consecutiveFailures={h.consecutiveFailures}
          isLoading={h.isLoading}
          handleSubmit={h.handleSubmit}
          retryLogin={h.retryLogin}
          onForgotClick={h.onForgotClick}
          showForgotHelp={h.showForgotHelp}
          shakeCard={h.shakeCard}
        />

        {/* Footer */}
        <p className="glass-login__footer">
          Sistema de Gestión Inteligente
        </p>
      </div>
    </main>
  );
}

export default LoginPage;