/**
 * @component SettingsPage (Fase 25 — REWRITE)
 * @namespace .glass-settings
 * @depends useSettingsPage, SettingSection, ProfileCard,
 *          ThemeSelector, NotificationPrefs, SystemHealth,
 *          SettingsPage.css
 * @note Settings page reimagined as "configurá tu relación con el AI system".
 *       Profile shows AI perception, notifications are AI-aware,
 *       system health shows 8-agent awareness.
 *       Backward-compatible: same default export, same route.
 * @import import './SettingsPage.css';
 */

import {
  User,
  Palette,
  Bell,
  Info,
} from "lucide-react";
import { PageContainer } from "@/shared/components/layout/PageContainer";
import { useSettingsPage } from "./hooks/useSettingsPage";
import { SettingSection } from "./components/SettingSection";
import { ProfileCard } from "./components/ProfileCard";
import { ThemeSelector } from "./components/ThemeSelector";
import { NotificationPrefs } from "./components/NotificationPrefs";
import { SystemHealth } from "./components/SystemHealth";
import "./SettingsPage.css";

/* ═══════════════════════════════════════
   Keyboard Shortcuts
   ═══════════════════════════════════════ */

/* Registered in hook or here — minimal for settings page */
import { useEffect } from "react";

function useSettingsKeyboard(toggleTheme: () => void) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
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
    return () => document.removeEventListener("keydown", handler);
  }, [toggleTheme]);
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */

export function SettingsPage() {
  const h = useSettingsPage();
  useSettingsKeyboard(h.toggleTheme);

  return (
    <PageContainer
      title="Configuración"
      subtitle="Preferencias de tu cuenta y del sistema"
    >
      <main
        className="glass-settings"
        role="main"
        aria-label="Configuración"
      >
        {/* ═══ Profile ═══ */}
        <SettingSection
          icon={User}
          title="Perfil"
          description="Tu información y cómo el AI te percibe"
        >
          <ProfileCard
            user={h.user}
            avatarInitials={h.avatarInitials}
            roleDisplay={h.roleDisplay}
            profileMetrics={h.profileMetrics}
          />
        </SettingSection>

        {/* ═══ Theme ═══ */}
        <SettingSection
          icon={Palette}
          title="Apariencia"
          description="Personalizá la apariencia de la aplicación"
        >
          <ThemeSelector
            theme={h.theme}
            onToggle={h.toggleTheme}
          />
        </SettingSection>

        {/* ═══ Notifications ═══ */}
        <SettingSection
          icon={Bell}
          title="Notificaciones"
          description="Controlá qué notificaciones y alertas AI recibís"
        >
          <NotificationPrefs
            prefs={h.notifPrefs}
            setEmail={h.setNotifEmail}
            setPayments={h.setNotifPayments}
            setAnnouncements={h.setNotifAnnouncements}
            setRecommendations={h.setNotifRecommendations}
            setWeeklyDigest={h.setNotifWeeklyDigest}
            setSystemAlerts={h.setNotifSystemAlerts}
          />
        </SettingSection>

        {/* ═══ System ═══ */}
        <SettingSection
          icon={Info}
          title="Sistema"
          description="Estado del backend y agentes de inteligencia"
        >
          <SystemHealth
            backendStatus={h.backendStatus}
            sessionElapsed={h.sessionElapsed}
            agentStatuses={h.agentStatuses}
          />
        </SettingSection>
      </main>
    </PageContainer>
  );
}

export default SettingsPage;