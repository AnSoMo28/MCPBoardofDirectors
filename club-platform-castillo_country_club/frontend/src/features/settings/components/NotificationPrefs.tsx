/**
 * @component NotificationPrefs (Fase 25)
 * @namespace (no standalone namespace — uses toggle-row styles)
 * @depends NotificationPrefs.css, ToggleRow
 * @note AI-aware notification preferences. Explains that preferences
 *       feed the AI system.
 * @import import './NotificationPrefs.css';
 */
import "./NotificationPrefs.css";

import { ToggleRow } from "./ToggleRow";
import type { NotificationPrefs as PrefsType } from "@/stores/notifications.store";
import { NOTIFICATION_DESCRIPTIONS } from "../config";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface NotificationPrefsProps {
  prefs: PrefsType;
  setEmail: (v: boolean) => void;
  setPayments: (v: boolean) => void;
  setAnnouncements: (v: boolean) => void;
  setRecommendations: (v: boolean) => void;
  setWeeklyDigest: (v: boolean) => void;
  setSystemAlerts: (v: boolean) => void;
}

/* ═══════════════════════════════════════
   Config: Notification Toggles
   ═══════════════════════════════════════ */

const CORE_TOGGLES: Array<{
  key: keyof PrefsType;
  label: string;
}> = [
  { key: "email", label: "Notificaciones por email" },
  { key: "payments", label: "Pagos y facturación" },
  { key: "announcements", label: "Comunicados oficiales" },
];

const AI_TOGGLES: Array<{
  key: keyof PrefsType;
  label: string;
}> = [
  { key: "recommendations", label: "Recomendaciones personalizadas" },
  { key: "weeklyDigest", label: "Resumen semanal" },
  { key: "systemAlerts", label: "Alertas del sistema" },
];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function NotificationPrefs({
  prefs,
  setEmail,
  setPayments,
  setAnnouncements,
  setRecommendations,
  setWeeklyDigest,
  setSystemAlerts,
}: NotificationPrefsProps) {
  const setters: Record<
    keyof PrefsType,
    (v: boolean) => void
  > = {
    email: setEmail,
    payments: setPayments,
    announcements: setAnnouncements,
    recommendations: setRecommendations,
    weeklyDigest: setWeeklyDigest,
    systemAlerts: setSystemAlerts,
  };

  return (
    <div>
      {/* Core notifications */}
      <span className="glass-settings__notif-group-label">
        Comunicación
      </span>
      {CORE_TOGGLES.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={toggle.label}
          description={NOTIFICATION_DESCRIPTIONS[toggle.key]}
          checked={prefs[toggle.key]}
          onChange={setters[toggle.key]}
        />
      ))}

      {/* AI-aware notifications */}
      <span className="glass-settings__notif-group-label">
        Inteligencia artificial
      </span>
      {AI_TOGGLES.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={toggle.label}
          description={NOTIFICATION_DESCRIPTIONS[toggle.key]}
          checked={prefs[toggle.key]}
          onChange={setters[toggle.key]}
        />
      ))}

      {/* AI education note */}
      <div className="glass-settings__notif-ai-note">
        Los agentes del club aprenden de tus preferencias para
        mejorar tus recomendaciones. Cuanto más preciso seas, mejor
        será la experiencia.
      </div>
    </div>
  );
}