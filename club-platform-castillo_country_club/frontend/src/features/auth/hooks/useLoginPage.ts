/**
 * @hook useLoginPage (Fase 25)
 * @module features/auth/hooks
 * @note Form state, auth flow, time-aware branding, error classification,
 *       backend health. All logic centralized.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useBackendHealth } from "@/shared/hooks/useBackendHealth";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
type ErrorType = "credentials" | "network" | "timeout" | "unknown";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18) return "evening";
  return "night";
}

const GREETINGS: Record<TimeOfDay, string> = {
  morning: "Buenos días",
  afternoon: "Buenas tardes",
  evening: "Buenas noches",
  night: "Descanse bien",
};

function classifyError(error: string | null): ErrorType | null {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (
    lower.includes("credential") ||
    lower.includes("password") ||
    lower.includes("incorrect") ||
    lower.includes("invalid") ||
    lower.includes("credencial")
  )
    return "credentials";
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("conectar")
  )
    return "network";
  if (
    lower.includes("timeout") ||
    lower.includes("tardó") ||
    lower.includes("tardo")
  )
    return "timeout";
  return "unknown";
}

const ERROR_MESSAGES: Record<ErrorType, string> = {
  credentials:
    "Credenciales incorrectas. Verifique su email y contraseña.",
  network: "No se pudo conectar al servidor. Intente de nuevo.",
  timeout: "La conexión tardó demasiado. Intente de nuevo.",
  unknown: "Ocurrió un error inesperado. Intente de nuevo.",
};

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useLoginPage() {
  const navigate = useNavigate();
  const {
    login,
    isAuthenticated,
    isLoading,
    error,
  } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const backendStatus = useBackendHealth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const consecutiveFailures = useRef(0);

  const timeOfDay = getTimeOfDay();
  const greeting = GREETINGS[timeOfDay];

  const errorType = classifyError(error);
  const errorMessage = errorType
    ? ERROR_MESSAGES[errorType]
    : null;

  /* ── Shake reset ── */
  useEffect(() => {
    if (shakeCard) {
      const timer = setTimeout(
        () => setShakeCard(false),
        500,
      );
      return () => clearTimeout(timer);
    }
  }, [shakeCard]);

  /* ── Track consecutive failures ── */
  useEffect(() => {
    if (error) {
      consecutiveFailures.current += 1;
      setShakeCard(true);
    }
  }, [error]);

  /* ── Submit ── */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await login(email, password);
      if (useAuthStore.getState().isAuthenticated) {
        navigate("/admin/dashboard");
      }
    },
    [email, password, login, navigate],
  );

  /* ── Retry (no event) ── */
  const retryLogin = useCallback(async () => {
    await login(email, password);
    if (useAuthStore.getState().isAuthenticated) {
      navigate("/admin/dashboard");
    }
  }, [email, password, login, navigate]);

  /* ── Forgot ── */
  const onForgotClick = useCallback(() => {
    setShowForgotHelp(true);
  }, []);

  return {
    /* Form */
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    /* Auth */
    isAuthenticated,
    isLoading,
    error,
    /* Error classification */
    errorType,
    errorMessage,
    consecutiveFailures: consecutiveFailures.current,
    shakeCard,
    /* Forgot */
    showForgotHelp,
    onForgotClick,
    /* Actions */
    handleSubmit,
    retryLogin,
    /* Theme */
    theme,
    toggleTheme,
    /* Time-aware */
    timeOfDay,
    greeting,
    /* System */
    backendStatus,
  };
}