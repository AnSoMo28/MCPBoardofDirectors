/**
 * @hook useSettingsPage (Fase 25)
 * @module features/settings/hooks
 * @note Auth, theme, notifications, system health, session elapsed.
 *       All lógica de la página de settings centralizada.
 */

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useThemeStore } from "@/stores/theme.store";
import { useNotificationPrefsStore } from "@/stores/notifications.store";
import { useBackendHealth } from "@/shared/hooks/useBackendHealth";
import { roleLabel } from "@/shared/lib/utils";
import { SETTINGS_AGENT_NODES } from "../config";
import type { SettingAgentStatus, ProfileAIMetric } from "../types";

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

function getSessionElapsed(loginTimestamp: number | null): string {
  if (!loginTimestamp) return "Desconocido";
  const totalMinutes = Math.floor(
    (Date.now() - loginTimestamp) / 60_000,
  );
  if (totalMinutes < 1) return "Menos de 1 minuto";
  if (totalMinutes < 60)
    return `${totalMinutes} minuto${totalMinutes !== 1 ? "s" : ""}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0)
    return `${hours} hora${hours !== 1 ? "s" : ""}`;
  return `${hours}h ${minutes}m`;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const loginTimestamp = useAuthStore((s) => s.loginTimestamp);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const notifStore = useNotificationPrefsStore();
  const backendStatus = useBackendHealth();

  const [sessionElapsed, setSessionElapsed] = useState(() =>
    getSessionElapsed(loginTimestamp),
  );

  useEffect(() => {
    const interval = setInterval(
      () => setSessionElapsed(getSessionElapsed(loginTimestamp)),
      60_000,
    );
    return () => clearInterval(interval);
  }, [loginTimestamp]);

  /* ── Avatar ── */
  const avatarInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  /* ── Role display ── */
  const roleDisplay = roleLabel(user?.role || "");

  /* ── Agent statuses (all active by default in this phase) ── */
  const agentStatuses: SettingAgentStatus[] = useMemo(
    () =>
      SETTINGS_AGENT_NODES.map((node) => ({
        id: node.id,
        label: node.label,
        accent: node.accent,
        isActive: true,
        statusText: "Monitoreando",
      })),
    [],
  );

  /* ── Profile AI Metrics (derived from user) ── */
  const profileMetrics: ProfileAIMetric[] = useMemo(() => {
    const metrics: ProfileAIMetric[] = [];
    if (user?.role) {
      metrics.push({
        label: "Rol",
        value: roleDisplay,
        color: "var(--color-gold-400)",
      });
    }
    if (user?.familyId) {
      metrics.push({
        label: "Familia",
        value: user.familyName || user.familyId,
        color: "var(--color-emerald-400)",
      });
    }
    metrics.push({
      label: "Sesión",
      value: sessionElapsed,
      color: "var(--color-teal-400)",
    });
    return metrics;
  }, [user, roleDisplay, sessionElapsed]);

  return {
    /* User */
    user,
    avatarInitials,
    roleDisplay,
    profileMetrics,
    /* Theme */
    theme,
    toggleTheme,
    /* Notifications */
    notifPrefs: notifStore.prefs,
    setNotifEmail: notifStore.setEmail,
    setNotifPayments: notifStore.setPayments,
    setNotifAnnouncements: notifStore.setAnnouncements,
    setNotifRecommendations: notifStore.setRecommendations,
    setNotifWeeklyDigest: notifStore.setWeeklyDigest,
    setNotifSystemAlerts: notifStore.setSystemAlerts,
    /* System */
    backendStatus,
    sessionElapsed,
    agentStatuses,
  };
}