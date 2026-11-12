/**
 * @component ProfileCard (Fase 25)
 * @namespace .glass-settings__profile
 * @depends ProfileCard.css
 * @note Profile with avatar, role, meta rows, and AI perception block.
 *       "Así te ve el club" — shows how the AI system perceives the socio.
 * @import import './ProfileCard.css';
 */
import "./ProfileCard.css";

import { User, Mail, Shield } from "lucide-react";
import type { User as UserType } from "@/stores/auth.store";
import type { ProfileAIMetric } from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface ProfileCardProps {
  user: UserType | null;
  avatarInitials: string;
  roleDisplay: string;
  profileMetrics: ProfileAIMetric[];
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function ProfileCard({
  user,
  avatarInitials,
  roleDisplay,
  profileMetrics,
}: ProfileCardProps) {
  return (
    <div>
      {/* Avatar + Name */}
      <div className="glass-settings__profile">
        <div className="glass-settings__profile-avatar">
          {avatarInitials}
        </div>
        <div className="glass-settings__profile-info">
          <h4>{user?.name || "Usuario"}</h4>
          <p>{user?.email || ""}</p>
          <span className="glass-settings__profile-role">
            <Shield size={11} />
            {roleDisplay}
          </span>
        </div>
      </div>

      {/* Meta rows */}
      <div className="glass-settings__profile-meta">
        <div className="glass-settings__profile-meta-row">
          <Mail size={14} />
          <span>{user?.email || "Sin email"}</span>
        </div>
        {user?.familyId && (
          <div className="glass-settings__profile-meta-row">
            <User size={14} />
            <span>
              Familia: {user.familyName || user.familyId}
            </span>
          </div>
        )}
      </div>

      {/* AI Perception */}
      <div className="glass-settings__profile-ai">
        <span className="glass-settings__profile-ai-title">
          Así te ve el club
        </span>
        {profileMetrics.map((metric) => (
          <div
            key={metric.label}
            className="glass-settings__profile-ai-metric"
          >
            <span className="glass-settings__profile-ai-metric-label">
              {metric.label}
            </span>
            <span
              className="glass-settings__profile-ai-metric-value"
              style={{ color: metric.color }}
            >
              {metric.value}
            </span>
          </div>
        ))}
        <p className="glass-settings__profile-ai-note">
          Los agentes usan este perfil para personalizar tus
          recomendaciones.
        </p>
      </div>
    </div>
  );
}