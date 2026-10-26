/**
 * @store useNotificationPrefsStore (Fase 25 — EXTRAÍDO)
 * @module stores/notifications.store
 * @note Notification preferences with AI-aware types.
 *       Persisted via Zustand persist middleware.
 *       Extracted from SettingsPage inline store.
 *       TODO: Sync with FamilyProfileAgent.family_set_preferences
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface NotificationPrefs {
  /* Core */
  email: boolean;
  payments: boolean;
  announcements: boolean;
  /* AI-aware */
  recommendations: boolean;
  weeklyDigest: boolean;
  systemAlerts: boolean;
}

export interface NotificationStore {
  prefs: NotificationPrefs;
  setPref: (key: keyof NotificationPrefs, value: boolean) => void;
  setEmail: (v: boolean) => void;
  setPayments: (v: boolean) => void;
  setAnnouncements: (v: boolean) => void;
  setRecommendations: (v: boolean) => void;
  setWeeklyDigest: (v: boolean) => void;
  setSystemAlerts: (v: boolean) => void;
}

/* ═══════════════════════════════════════
   Store
   ═══════════════════════════════════════ */

export const useNotificationPrefsStore = create<NotificationStore>()(
  persist(
    (set) => ({
      prefs: {
        email: true,
        payments: true,
        announcements: true,
        recommendations: true,
        weeklyDigest: true,
        systemAlerts: true,
      },
      setPref: (key, value) =>
        set((s) => ({ prefs: { ...s.prefs, [key]: value } })),
      setEmail: (v) =>
        set((s) => ({ prefs: { ...s.prefs, email: v } })),
      setPayments: (v) =>
        set((s) => ({ prefs: { ...s.prefs, payments: v } })),
      setAnnouncements: (v) =>
        set((s) => ({ prefs: { ...s.prefs, announcements: v } })),
      setRecommendations: (v) =>
        set((s) => ({ prefs: { ...s.prefs, recommendations: v } })),
      setWeeklyDigest: (v) =>
        set((s) => ({ prefs: { ...s.prefs, weeklyDigest: v } })),
      setSystemAlerts: (v) =>
        set((s) => ({ prefs: { ...s.prefs, systemAlerts: v } })),
    }),
    { name: "castillo-notifications" },
  ),
);