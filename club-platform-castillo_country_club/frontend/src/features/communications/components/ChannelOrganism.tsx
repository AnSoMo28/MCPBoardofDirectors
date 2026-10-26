// src/features/communications/components/ChannelOrganism.tsx
// ═══════════════════════════════════════════════════════════
// Channel Organism — Living Channel Visualization
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a bar chart. Not a table. An ORGANISM.
//
// Each communication channel is a living form that:
//   - Grows when it receives positive engagement
//   - Shrinks when it's ignored
//   - Pulses when there's real-time activity
//   - Changes color based on effectiveness
//   - Has a fatigue gauge (vasija) that fills up
//
// Pure SVG. Zero dependencies beyond React + types.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  CommunicationFingerprint,
  NotificationChannel,
  MessageFatigue,
  FatigueLevel,
} from "../types";

import {
  getChannelLabel,
  deriveFatigueLevel
} from "../types";

import {
  deriveChannelEffectiveness,
} from "../config";

import "./ChannelOrganism.css";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ChannelOrganismProps {
  fingerprint: CommunicationFingerprint | null;
  fatigue: MessageFatigue | null;
}

interface OrganismData {
  channel: NotificationChannel;
  label: string;
  effectiveness: number;
  fatigueLevel: FatigueLevel;
  fatigueValue: number;
  isPreferred: boolean;
  size: number;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  whatsapp: "W",
  email: "@",
  push: "P",
  sms: "S",
  in_app: "A",
};

const ALL_CHANNELS: NotificationChannel[] = [
  "whatsapp", "push", "sms", "email", "in_app",
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ChannelOrganism({
  fingerprint,
  fatigue,
}: ChannelOrganismProps) {
  const organisms: OrganismData[] = useMemo(() => {
    if (!fingerprint) {
      return ALL_CHANNELS.map((ch: NotificationChannel) => ({
        channel: ch,
        label: getChannelLabel(ch),
        effectiveness: 0.5,
        fatigueLevel: "fresh" as FatigueLevel,
        fatigueValue: 0,
        isPreferred: false,
        size: 40,
      }));
    }

    return ALL_CHANNELS.map((ch: NotificationChannel) => {
      const effectiveness = deriveChannelEffectiveness(
        ch,
        fingerprint.channel_scores,
      );
      const isPreferred = ch === fingerprint.preferred_channel;

      // Size scales with effectiveness: 28px (min) to 64px (max)
      const size = 28 + Math.round(effectiveness * 36);

      return {
        channel: ch,
        label: getChannelLabel(ch),
        effectiveness: Math.round(effectiveness * 100) / 100,
        fatigueLevel: fatigue
          ? deriveFatigueLevel(fatigue.current_level)
          : ("fresh" as FatigueLevel),
        fatigueValue: fatigue?.current_level ?? 0,
        isPreferred,
        size,
      };
    });
  }, [fingerprint, fatigue]);

  // Sort: preferred first, then by effectiveness descending
  const sorted = useMemo(
    () =>
      [...organisms].sort(
        (a: OrganismData, b: OrganismData) => {
          if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
          return b.effectiveness - a.effectiveness;
        },
      ),
    [organisms],
  );

  return (
    <div className="glass-comm-organisms">
      <div className="organisms__header">
        <span className="organisms__title">Canales</span>
        {fingerprint && (
          <span className="organisms__subtitle">
            Efectividad y fatiga por canal
          </span>
        )}
      </div>

      <div className="organisms__grid">
        {sorted.map((org: OrganismData, i: number) => {
          const effectivenessPct = Math.round(org.effectiveness * 100);

          return (
            <div
              key={org.channel}
              className="organism-card"
              data-channel={org.channel}
              data-preferred={org.isPreferred}
              data-fatigue={org.fatigueLevel}
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              {/* Organism SVG */}
              <svg
                viewBox="0 0 100 100"
                className="organism-svg"
                role="img"
                aria-label={`${org.label}: ${effectivenessPct}% efectividad`}
              >
                {/* Background glow */}
                <circle
                  cx="50"
                  cy="50"
                  r={org.size / 2 + 8}
                  className="organism-glow"
                  data-channel={org.channel}
                />

                {/* Main organism body */}
                <circle
                  cx="50"
                  cy="50"
                  r={org.size / 2}
                  className="organism-body"
                  data-channel={org.channel}
                  data-preferred={org.isPreferred}
                />

                {/* Channel icon */}
                <text
                  x="50"
                  y="50"
                  className="organism-icon"
                  textAnchor="middle"
                  dominantBaseline="central"
                  data-channel={org.channel}
                >
                  {CHANNEL_ICONS[org.channel]}
                </text>

                {/* Fatigue ring (vasija) */}
                <circle
                  cx="50"
                  cy="50"
                  r={org.size / 2 + 3}
                  className="organism-fatigue-ring"
                  fill="none"
                  strokeDasharray={`${org.fatigueValue * 100} 100`}
                  data-fatigue={org.fatigueLevel}
                />
              </svg>

              {/* Info strip */}
              <div className="organism-info">
                <span className="organism-label">{org.label}</span>
                <span
                  className="organism-effectiveness"
                  data-channel={org.channel}
                >
                  {effectivenessPct}%
                </span>
              </div>

              {/* AI recommendation */}
              {org.isPreferred && fingerprint && (
                <span className="organism-preferred-badge">
                  Preferido
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Channel Intelligence */}
      {fingerprint && (
        <div className="organisms__intelligence">
          <span className="organisms__intel-label">
            Inteligencia de canales
          </span>
          <span className="organisms__intel-text">
            {getChannelLabel(fingerprint.preferred_channel)} es el canal
            óptimo — {Math.round(
              deriveChannelEffectiveness(
                fingerprint.preferred_channel,
                fingerprint.channel_scores,
              ) * 100,
            )}% de efectividad.
            {fatigue && fatigue.current_level > 0.5
              ? ` Fatiga elevada (${Math.round(fatigue.current_level * 100)}%) — reducir frecuencia.`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}