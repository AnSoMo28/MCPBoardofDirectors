/**
 * @component GlassLoginCard (Fase 25)
 * @namespace .glass-login__card
 * @depends LoginPage.css
 * @note Glass login card with form, smart error recovery, forgot help.
 *       Focus handled via CSS :focus-visible, no JS handlers.
 * @import import '../LoginPage.css';
 */

import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface GlassLoginCardProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  errorType: "credentials" | "network" | "timeout" | "unknown" | null;
  errorMessage: string | null;
  consecutiveFailures: number;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  retryLogin: () => void;
  onForgotClick: () => void;
  showForgotHelp: boolean;
  shakeCard: boolean;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function GlassLoginCard({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  errorType,
  errorMessage,
  consecutiveFailures,
  isLoading,
  handleSubmit,
  retryLogin,
  onForgotClick,
  showForgotHelp,
  shakeCard,
}: GlassLoginCardProps) {
  return (
    <div className="glass-login__card-container">
      <div
        className={cn(
          "glass-login__card",
          shakeCard && "glass-login__card--shake",
        )}
      >
        {/* Top light catch */}
        <div className="glass-login__card-light" aria-hidden="true" />

        <h2 className="glass-login__card-heading">Bienvenido</h2>
        <p className="glass-login__card-subheading">
          Ingrese sus credenciales para acceder al sistema.
        </p>

        <form
          id="login-form"
          className="glass-login__form"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div className="glass-login__field">
            <label htmlFor="login-email" className="glass-login__label">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@castillo.cr"
              required
              autoComplete="email"
              className="glass-login__input"
            />
          </div>

          {/* Password */}
          <div className="glass-login__field">
            <label
              htmlFor="login-password"
              className="glass-login__label"
            >
              Contraseña
            </label>
            <div className="glass-login__input-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="glass-login__input glass-login__input-password"
              />
              <Button
                variant="unstyled"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="glass-login__toggle-pwd"
                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </Button>
            </div>
          </div>

          {/* Error — smart recovery */}
          {errorMessage && (
            <div
              className="glass-login__error"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="glass-login__error-icon" />
              <div>
                <p className="glass-login__error-text">
                  {errorMessage}
                </p>
                {(errorType === "network" ||
                  errorType === "timeout") && (
                  <Button
                    variant="unstyled"
                    type="button"
                    onClick={retryLogin}
                    className="glass-login__error-retry"
                  >
                    Reintentar
                  </Button>
                )}
                {consecutiveFailures >= 3 && (
                  <p className="glass-login__error-help">
                    ¿Necesita ayuda? Contacte al club para asistencia.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            variant="unstyled"
            type="submit"
            disabled={isLoading}
            className="glass-login__submit"
          >
            {isLoading ? (
              <span className="glass-login__submit-content">
                <svg
                  className="glass-login__submit-spinner"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Ingresando…
              </span>
            ) : (
              <span className="glass-login__submit-content">
                Ingresar al Club
              </span>
            )}
          </Button>
        </form>

        {/* Forgot password */}
        <div className="glass-login__forgot-container">
          <Button
            variant="unstyled"
            type="button"
            className={cn(
              "glass-login__forgot",
              errorType === "credentials" &&
                "glass-login__forgot--highlight",
            )}
            onClick={onForgotClick}
          >
            ¿Olvidó su contraseña?
          </Button>
          {showForgotHelp && (
            <p className="glass-login__forgot-help">
              Contacte a recepción del club para recuperar su
              contraseña.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}