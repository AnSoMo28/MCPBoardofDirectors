// src/features/communications/hooks/usePreferencesForm.ts
// ═══════════════════════════════════════════════════════════
// Preferences Form Hook — State, Queries, Mutations, Change Log
// Extracted from CommunicationPreferences.tsx V1 monolith
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";

import type {
  CommunicationPreferencesData,
  CommunicationPreferencesResponse,
  CommunicationAnalyticsData,
  CommunicationAnalyticsResponse,
  HistoryItem,
} from "../types";

import {
  PREFS_DEFAULT_FORM,
} from "../config";

import type {
  PreferencesForm,
  SessionChange,
} from "../config";

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function dataToForm(data: CommunicationPreferencesData): PreferencesForm {
  return {
    email_enabled: data.email_enabled,
    push_enabled: data.push_enabled,
    sms_enabled: data.sms_enabled,
    whatsapp_enabled: data.whatsapp_enabled,
    in_app_enabled: data.in_app_enabled,
    announcements: data.announcements,
    events: data.events,
    promotions: data.promotions,
    quiet_hours_start: data.quiet_hours_start,
    quiet_hours_end: data.quiet_hours_end,
  };
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function usePreferencesForm() {
  // ── Search state ────────────────────────────────
  const [memberSearch, setMemberSearch] = useState("");
  const [searchedMember, setSearchedMember] = useState<string | null>(null);

  // ── Form state ─────────────────────────────────
  const [form, setForm] = useState<PreferencesForm>(PREFS_DEFAULT_FORM);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [changeLog, setChangeLog] = useState<SessionChange[]>([]);
  const [originalQuality, setOriginalQuality] = useState(0);

  // ── Sync ref ───────────────────────────────────
  const syncedMemberRef = useRef<string | null>(null);

  // ── Analytics query (club-level, always on) ────
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period: "last_90_days" },
    { staleTime: 300_000 },
  );

  // ── Preferences query ─────────────────────────
  const prefsQ = useMCPQuery<CommunicationPreferencesResponse>(
    "communication",
    "manage_communication_preferences",
    { action: "get", member_id: searchedMember ?? "" },
    { enabled: !!searchedMember, staleTime: 60_000 },
  );

  // ── History query (for intelligence layer) ─────
  const historyQ = useMCPQuery<{ history: HistoryItem[] }>(
    "communication",
    "get_notification_history",
    { limit: 100 },
    { enabled: !!searchedMember, staleTime: 60_000 },
  );

  // ── Create mutation ────────────────────────────
  const createMut = useMCPMutation<CommunicationPreferencesResponse>(
    "communication",
    "manage_communication_preferences",
    {
      onSuccess: (data: CommunicationPreferencesResponse) => {
        showToast({
          type: "success",
          message: data.message ?? "Preferencias creadas",
        });
        if (data.preferences) {
          setExistingId(data.preferences.id);
          setHasChanges(false);
          setChangeLog([]);
        }
      },
      onError: (err: unknown) =>
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al crear",
        }),
    },
  );

  // ── Update mutation ────────────────────────────
  const updateMut = useMCPMutation<CommunicationPreferencesResponse>(
    "communication",
    "manage_communication_preferences",
    {
      onSuccess: (data: CommunicationPreferencesResponse) => {
        showToast({
          type: "success",
          message: data.message ?? "Preferencias actualizadas",
        });
        setHasChanges(false);
        setChangeLog([]);
        setOriginalQuality(computeCurrentQuality());
      },
      onError: (err: unknown) =>
        showToast({
          type: "error",
          message: err instanceof Error ? err.message : "Error al actualizar",
        }),
    },
  );

  // ── Sync form when search results arrive ──────
  useEffect(() => {
    const preferences = prefsQ.data?.preferences;
    if (preferences && syncedMemberRef.current !== searchedMember) {
      const newForm = dataToForm(preferences);
      setForm(newForm);
      setExistingId(preferences.id);
      setHasChanges(false);
      setChangeLog([]);
      syncedMemberRef.current = searchedMember;
    }
  }, [prefsQ.data?.preferences, searchedMember]);

  // ── Helpers ────────────────────────────────────
  function computeCurrentQuality(): number {
    // Lightweight inline — full computation is in usePreferenceIntelligence
    const activeCount = [form.email_enabled, form.push_enabled, form.sms_enabled, form.whatsapp_enabled, form.in_app_enabled]
      .filter(Boolean).length;
    return Math.min(100, activeCount * 15 + 25);
  }

  // ── Handlers ───────────────────────────────────
  const handleSearch = useCallback(() => {
    const trimmed = memberSearch.trim();
    if (!trimmed) {
      showToast({ type: "error", message: "Ingresá un ID de socio" });
      return;
    }
    syncedMemberRef.current = null;
    setSearchedMember(trimmed);
    setHasChanges(false);
    setChangeLog([]);
  }, [memberSearch]);

  const updateField = useCallback(
    <K extends keyof PreferencesForm>(key: K, value: PreferencesForm[K]) => {
      setForm((prev: PreferencesForm) => {
        setChangeLog((log: SessionChange[]) => [
          ...log,
          {
            timestamp: Date.now(),
            field: String(key),
            from: String(prev[key]),
            to: String(value),
          },
        ]);
        return { ...prev, [key]: value };
      });
      setHasChanges(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!searchedMember) return;
    const params = {
      ...form,
      member_id: searchedMember,
      ...(existingId ? { preferences_id: existingId } : {}),
    };
    if (existingId) {
      updateMut.mutate({ action: "update", ...params });
    } else {
      createMut.mutate({ action: "create", ...params });
    }
  }, [searchedMember, form, existingId, createMut, updateMut]);

  // ── Derived data ──────────────────────────────
  const preferences: CommunicationPreferencesData | undefined =
    prefsQ.data?.preferences;
  const analytics: CommunicationAnalyticsData | undefined =
    analyticsQ.data?.analytics;
  const history: HistoryItem[] | undefined = historyQ.data?.history;
  const isNotFound: boolean = prefsQ.data?.status === "not_found";
  const isSaving: boolean = createMut.isPending || updateMut.isPending;

  // ── Return ─────────────────────────────────────
  return {
    // Search
    memberSearch,
    setMemberSearch,
    searchedMember,
    setSearchedMember,
    handleSearch,
    // Form
    form,
    setForm,
    updateField,
    // Status
    hasChanges,
    setHasChanges,
    changeLog,
    setChangeLog,
    existingId,
    setExistingId,
    originalQuality,
    setOriginalQuality,
    // Save
    handleSave,
    isSaving,
    // Data
    preferences,
    analytics,
    history,
    isNotFound,
    isLoading: prefsQ.isLoading,
    isError: prefsQ.isError,
  };
}